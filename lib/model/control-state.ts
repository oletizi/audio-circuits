import type { Taper } from "./parameters.ts"
import { UnionFind } from "./union-find.ts"
import { GROUND_PORT_KEY, netPreference } from "./net-preference.ts"
import { assertNoPackagePinShadowing } from "./pin-collision.ts"
import type {
  Component, ComponentKind, Connection, Network, Parameters, PartSpec,
  PotentiometerComponent, SwitchComponent,
} from "./types.ts"

function isPotentiometer(component: Component): component is PotentiometerComponent {
  return component.kind === "potentiometer"
}
function isSwitch(component: Component): component is SwitchComponent {
  return component.kind === "switch"
}

export interface ControlState {
  /** Pot reference to wiper fraction, 0 at ccw and 1 at cw. */
  readonly potPositions: Readonly<Record<string, number>>
  /** Switch reference to selected position name. */
  readonly switchPositions: Readonly<Record<string, string>>
}

/** Mirrors `Unit`, but every pin is resolved to a net name rather than a `Connection`.
 * A no-connect pin is ABSENT, not present as a name: an unconnected pin must never
 * appear in a SPICE netlist as a node.
 */
export interface ResolvedUnit {
  readonly name: string
  readonly pins: Readonly<Record<string, string>>
  readonly spiceModel?: string
}

/** Mirrors `Component`: resolution resolves control state, nothing more. It does NOT
 * flatten package pins into units and does NOT split a multi-unit package into
 * separate elements - both are SPICE-shaped lowerings, owned by the SPICE emitter
 * (a later task), not by resolution. A consumer's needs never reshape this type.
 */
export interface ResolvedComponent {
  readonly id: string
  readonly kind: ComponentKind
  readonly parameters: Parameters
  readonly part?: PartSpec
  readonly pins: Readonly<Record<string, string>>
  readonly units: readonly ResolvedUnit[]
}

export interface ResolvedNetwork {
  readonly ports: Readonly<Record<string, string>>
  readonly components: readonly ResolvedComponent[]
}

/** A pot or switch component's single "MAIN" unit, merged with its (normally empty)
 * package pins into one pin-name -> Connection map. Pots and switches keep the
 * two-terminal / open-vocabulary convention that predates active devices - that is
 * what `requirePotPin` and `mergeShortedNets` read pins through - and this merge is
 * exactly what lets them address a pin by name without caring whether it came from
 * the package or the unit. Throws if the component was built with more than one
 * unit, which that convention never produces.
 *
 * THE COLLISION CHECK BELOW IS A DELIBERATE BACKSTOP, NOT DUPLICATION - and its status
 * is worth stating exactly, because it changed. `validatePhysicalNetwork` now runs
 * `assertNoPackagePinShadowing` over every component before any of this executes, so on
 * the `resolveNetwork` path this check is UNREACHABLE: it cannot fire, because the
 * network was already refused. Verified by mutation - with the
 * `validatePhysicalNetwork` call deleted from `resolveNetwork`, the switch-collision
 * test in tests/control-state.test.ts still passes, which it can only do if the throw
 * came from here; with that call in place, this line is dead.
 *
 * It stays because `terminals()` is reached from three module-private helpers
 * (`mergeShortedNets`, `requirePotPin`) whose only current entry point is
 * `resolveNetwork`, and a future caller that skips the input contract would otherwise
 * silently shadow a package pin again. Keeping a cheap per-component loop is the right
 * trade against re-opening a defect this project has now had to close twice.
 */
function terminals(component: Component): Readonly<Record<string, Connection>> {
  if (component.units.length !== 1) {
    throw new Error(`Physical network component must have exactly one unit: ${component.id}`)
  }
  const unit = component.units[0]
  for (const pin of Object.keys(unit.pins)) {
    if (Object.prototype.hasOwnProperty.call(component.pins, pin)) {
      throw new Error(
        `Component "${component.id}" unit "${unit.name}": pin "${pin}" collides with a package pin of the same name`,
      )
    }
  }
  return { ...component.pins, ...unit.pins }
}

/** Every connection a component declares, across its package pins and every unit's
 * pins - unlike `terminals`, this does not assume (or require) exactly one unit, so
 * it works uniformly for a two-terminal passive and a multi-unit active device alike.
 */
function connectionsOf(component: Component): readonly Connection[] {
  const connections: Connection[] = [...Object.values(component.pins)]
  for (const unit of component.units) connections.push(...Object.values(unit.pins))
  return connections
}

/** Every net a component's pins name, across package and unit pins. A no-connect
 * contributes nothing.
 */
function netsOf(component: Component): readonly string[] {
  const nets: string[] = []
  for (const connection of connectionsOf(component)) {
    if (connection.kind === "net") nets.push(connection.net)
  }
  return nets
}

/** A terminal's net name, or the given message if the pin is absent or a no-connect.
 * A physical network's required terminals are always wired; an open one there is a
 * defect, not the deliberate no-connect a package pin on an authored circuit can be.
 */
function requireNet(connection: Connection | undefined, message: string): string {
  if (!connection || connection.kind !== "net") throw new Error(message)
  return connection.net
}

/** Structural well-formedness of a physical network, before control-state resolution:
 * unique non-empty component ids, at least one unit per component, at least two pins
 * per component (package pins plus every unit's pins, combined), no empty pin key or
 * net name, and every declared port landing on a net some component actually touches.
 *
 * Deliberately separate from `validate.ts`'s `validateNetwork`, and NOT because that
 * check cannot cope with a physical network. It can: `kinds.ts` puts `switch` in
 * `OPEN_VOCABULARY`, so a rotary selector's throw names are anticipated, and
 * `validateNetwork(THREE_BAND_REFERENCE)` - 76 components, six pots, six rotaries -
 * accepts it (asserted at `tests/reference/three-band.test.ts:45`). An earlier version
 * of this comment claimed the opposite; it was true before `switch` joined the open
 * vocabulary and is not true now.
 *
 * The real reason is that NEITHER RULE SET CONTAINS THE OTHER, measured in both
 * directions:
 *
 *  - only here: at least two pins per component, across package and unit pins combined.
 *    A `connector` declaring a single pin on a net two other pins already sit on is
 *    ACCEPTED by `validateNetwork` and refused here ("Missing pins: j1").
 *  - only there: the per-kind pin vocabulary and the per-kind required parameters. A
 *    resistor with pins named `x`/`y`, and a capacitor declaring no `farads`, both reach
 *    resolution unchallenged and are refused by `validateNetwork`.
 *
 * And they answer to different producers. `validateNetwork` is the AUTHORED-CIRCUIT
 * check, run from `Builder.done()` on every circuit this repository writes. This one is
 * `resolveNetwork`'s INPUT CONTRACT, and it runs on every network reaching resolution
 * including literals that never went through the builder - `THREE_BAND_REFERENCE`,
 * assembled from a KiCad netlist by `reference/pultec/from-netlist.ts`, is one.
 * Collapsing the two would either impose an authored circuit's vocabulary rules on an
 * imported network or drop the pin-count rule from the resolution path.
 */
function validatePhysicalNetwork(network: Network): void {
  const ids = new Set<string>()
  for (const component of network.components) {
    if (!component.id || ids.has(component.id)) {
      throw new Error(`Duplicate or empty reference: ${component.id}`)
    }
    ids.add(component.id)
    if (component.units.length === 0) {
      throw new Error(`Component declares no units: ${component.id}`)
    }
    const pinEntries: (readonly [string, Connection])[] = [
      ...Object.entries(component.pins),
      ...component.units.flatMap(unit => Object.entries(unit.pins)),
    ]
    // The floor exists to catch a component that silently lost a net (a pin present on
    // the symbol but absent here). A terminal whose only job is to be a place a wire or
    // probe lands - a test point - has no electrical relationship to lose, and the spec
    // (docs/superpowers/specs/2026-09-23-transistor-preamp-lab-design.md sec 3.2) mandates
    // single-pin test points, matching KiCad's own Connector:TestPoint. So the one
    // component this repository ever declares with a single pin - an electrically inert
    // connector - is exempted down to a floor of 1. Zero pins still throws for everyone,
    // inert connector included.
    const minPins = component.kind === "connector" && component.part?.electricallyInert === true ? 1 : 2
    if (pinEntries.length < minPins) throw new Error(`Missing pins: ${component.id}`)
    // THIS is the enforcement that closes the silent net loss, for every kind and
    // every unit count. `validateNetwork` carries the same rule for authored
    // circuits, but it runs from `Builder.done()`, and a hand-built `Network`
    // literal never reaches it - which is how most of this repository's tests, and
    // any non-builder caller, construct one. Measured before this call existed: an
    // op-amp whose unit re-declared `v+` resolved and emitted
    // `Xu1 IN OUT OUT LOST 0 GENERIC_OPAMP`, the package's net absent from the line.
    // One shared helper (`pin-collision.ts`), so the two validators cannot drift.
    assertNoPackagePinShadowing(component)
    for (const [pin, connection] of pinEntries) {
      if (!pin) throw new Error(`Empty pin/net: ${component.id}`)
      if (connection.kind === "net" && !connection.net) throw new Error(`Empty pin/net: ${component.id}`)
    }
  }
  const nets = new Set(network.components.flatMap(netsOf))
  for (const [port, portNet] of Object.entries(network.ports)) {
    if (!port || !nets.has(portNet)) throw new Error(`Unconnected port: ${port}`)
  }
}

/** Fraction of total resistance between ccw and wiper at position `f`. */
function taperFraction(taper: Taper, f: number): number {
  if (taper.type === "linear") return f
  const k = taper.curveConstant
  return (Math.exp(k * f) - 1) / (Math.exp(k) - 1)
}

/** Pass 1: validates every pot and switch setting against the network. Throws on the
 * first problem found, naming the offending reference. Runs to completion before any
 * expansion so error messages describe the input, not a half-built network.
 */
function validateControlState(network: Network, state: ControlState): void {
  const pots = network.components.filter(isPotentiometer)
  const switches = network.components.filter(isSwitch)

  for (const pot of pots) {
    if (!Object.prototype.hasOwnProperty.call(state.potPositions, pot.id)) {
      throw new Error(`Missing control setting: ${pot.id}`)
    }
    const fraction = state.potPositions[pot.id]
    if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
      throw new Error(`Pot position out of range: ${pot.id}`)
    }
  }
  for (const sw of switches) {
    if (!Object.prototype.hasOwnProperty.call(state.switchPositions, sw.id)) {
      throw new Error(`Missing control setting: ${sw.id}`)
    }
    const position = state.switchPositions[sw.id]
    if (!sw.parameters.positions.includes(position)) {
      throw new Error(`Unknown switch position: ${sw.id}=${position}`)
    }
    if (!Object.prototype.hasOwnProperty.call(sw.parameters.contacts, position)) {
      throw new Error(`Missing switch contacts: ${sw.id}=${position}`)
    }
  }

  const potIds = new Set(pots.map(p => p.id))
  const switchIds = new Set(switches.map(s => s.id))
  for (const id of Object.keys(state.potPositions)) {
    if (!potIds.has(id)) throw new Error(`Unknown control reference: ${id}`)
  }
  for (const id of Object.keys(state.switchPositions)) {
    if (!switchIds.has(id)) throw new Error(`Unknown control reference: ${id}`)
  }
}

/** Pass 2: switches sharing a `gang` must select the same position. */
function checkGangs(
  switches: readonly SwitchComponent[],
  state: ControlState,
): void {
  const byGang = new Map<string, string[]>()
  for (const sw of switches) {
    const gang = sw.parameters.gang
    if (!gang) continue
    ;(byGang.get(gang) ?? byGang.set(gang, []).get(gang)!).push(state.switchPositions[sw.id])
  }
  for (const [gang, positions] of byGang) {
    if (positions.some(p => p !== positions[0])) throw new Error(`Ganged switches disagree: ${gang}`)
  }
}

/** Pass 3: builds a union-find over net names, merging nets shorted by each switch's
 * selected contacts. Throws if a contact pair names a pin the switch does not declare.
 */
function mergeShortedNets(
  network: Network,
  switches: readonly SwitchComponent[],
  state: ControlState,
): UnionFind {
  const nets = new Set(network.components.flatMap(netsOf))
  const uf = new UnionFind(nets, netPreference(network.ports, GROUND_PORT_KEY))
  for (const sw of switches) {
    const position = state.switchPositions[sw.id]
    const pairs = sw.parameters.contacts[position]
    const pins = terminals(sw)
    for (const [pinA, pinB] of pairs) {
      const netA = requireNet(pins[pinA], `Unknown switch pin: ${sw.id}.${pinA}`)
      const netB = requireNet(pins[pinB], `Unknown switch pin: ${sw.id}.${pinB}`)
      uf.union(netA, netB)
    }
  }
  return uf
}

/** A pot with a missing ccw/wiper/cw pin names the offending terminal, mirroring the
 * pin check `mergeShortedNets` performs for switch contacts, rather than letting an
 * undefined net silently flow into the resolved network.
 */
function requirePotPin(
  pot: PotentiometerComponent,
  pin: "ccw" | "wiper" | "cw",
): string {
  return requireNet(terminals(pot)[pin], `Unknown pot pin: ${pot.id}.${pin}`)
}

/** Pass 4: replaces each pot with two resolved resistor components, ccw-to-wiper and
 * wiper-to-cw. A zero-ohm section is legal and is still emitted, so component counts
 * stay stable across a sweep. Pots legitimately keep the two-terminal `a`/`b` resistor
 * shape here - that is the kind's own vocabulary (see `kinds.ts`), not a SPICE-shaped
 * lowering imposed by resolution.
 */
function expandPot(pot: PotentiometerComponent, fraction: number, uf: UnionFind): ResolvedComponent[] {
  const ccw = requirePotPin(pot, "ccw")
  const wiper = requirePotPin(pot, "wiper")
  const cw = requirePotPin(pot, "cw")
  const lowerFraction = taperFraction(pot.parameters.taper, fraction)
  const section = (suffix: string, a: string, b: string, ohms: number): ResolvedComponent => ({
    id: `${pot.id}.${suffix}`,
    kind: "resistor",
    parameters: { ohms },
    pins: {},
    units: [{ name: "MAIN", pins: { a: uf.find(a), b: uf.find(b) } }],
  })
  return [
    section("ccw-wiper", ccw, wiper, pot.parameters.ohms * lowerFraction),
    section("wiper-cw", wiper, cw, pot.parameters.ohms * (1 - lowerFraction)),
  ]
}

/** A pin map reduced to net names, canonicalized through the union-find. A no-connect
 * pin is OMITTED, not rewritten to some placeholder: an unconnected pin must never
 * appear in a resolved network, and so never reach a SPICE netlist as a node.
 */
function reducePins(pins: Readonly<Record<string, Connection>>, uf: UnionFind): Record<string, string> {
  const resolved: Record<string, string> = {}
  for (const [pin, connection] of Object.entries(pins)) {
    if (connection.kind === "net") resolved[pin] = uf.find(connection.net)
  }
  return resolved
}

/** Every kind but potentiometer and switch passes through with its component/unit
 * structure intact: package pins stay on the component, each unit keeps its own pin
 * map and its own name, and every `Connection` is reduced to its canonical net name.
 * This is exactly resolving control state - nothing here reshapes the component for
 * any particular downstream consumer.
 */
function toResolvedComponent(component: Component, uf: UnionFind): ResolvedComponent {
  return {
    id: component.id,
    kind: component.kind,
    parameters: component.parameters,
    part: component.part,
    pins: reducePins(component.pins, uf),
    units: component.units.map(unit => ({
      name: unit.name,
      pins: reducePins(unit.pins, uf),
      spiceModel: unit.spiceModel,
    })),
  }
}

/** Pass 5: rewrites the network's arbitrary-keyed ports to each net's canonical
 * union-find representative.
 */
function rewritePorts(ports: Readonly<Record<string, string>>, uf: UnionFind): Record<string, string> {
  const rewritten: Record<string, string> = {}
  for (const [key, net] of Object.entries(ports)) rewritten[key] = uf.find(net)
  return rewritten
}

/** Produces the network simulation and lint consume, from the physical network (which
 * keeps every pot terminal and switch contact) and a control-state vector. No control
 * setting is ever defaulted, inferred, or silently tolerated.
 *
 * Input contract. `physical` must be structurally well-formed (`validatePhysicalNetwork`,
 * run first here so a structural defect is diagnosed by the module that owns the rule
 * rather than surfacing later as an unrelated union-find lookup failure) and it must
 * declare a `ground` port. Pots and switches keep their own two-terminal / open-vocabulary
 * pin conventions; every other kind's pins pass through unconstrained, since resolution
 * does not police a kind's vocabulary - `validate.ts` does that for authored circuits.
 */
export function resolveNetwork(physical: Network, state: ControlState): ResolvedNetwork {
  validatePhysicalNetwork(physical)
  validateControlState(physical, state)

  const switches = physical.components.filter(isSwitch)
  checkGangs(switches, state)

  const uf = mergeShortedNets(physical, switches, state)

  const components: ResolvedComponent[] = []
  for (const component of physical.components) {
    if (isSwitch(component)) continue
    if (isPotentiometer(component)) {
      components.push(...expandPot(component, state.potPositions[component.id], uf))
      continue
    }
    components.push(toResolvedComponent(component, uf))
  }

  const ports = rewritePorts(physical.ports, uf)

  return { ports, components }
}
