import type { CapacitorParameters, InductorParameters, ResistorParameters, Taper } from "./parameters.ts"
import { UnionFind } from "./union-find.ts"
import { GROUND_PORT_KEY, netPreference } from "./net-preference.ts"
import type {
  Component, Connection, Network, PotentiometerComponent, SwitchComponent,
} from "./types.ts"

interface ResistorComponent extends Component {
  readonly kind: "resistor"
  readonly parameters: ResistorParameters
}
interface CapacitorComponent extends Component {
  readonly kind: "capacitor"
  readonly parameters: CapacitorParameters
}
interface InductorComponent extends Component {
  readonly kind: "inductor"
  readonly parameters: InductorParameters
}
/** The kinds `toResolvedPassthrough` accepts: `resolveNetwork` only ever expects
 * resistors, capacitors, inductors, pots and switches on its input (Ruling A's
 * two-terminal convention). A genuine discriminated union - unlike `Component` itself,
 * where `kind` and `parameters` are independent fields - so narrowing on `kind` inside
 * `toResolvedPassthrough` narrows `parameters` with it. */
type PassthroughComponent = ResistorComponent | CapacitorComponent | InductorComponent

function isPotentiometer(component: Component): component is PotentiometerComponent {
  return component.kind === "potentiometer"
}
function isSwitch(component: Component): component is SwitchComponent {
  return component.kind === "switch"
}
function isPassthroughKind(component: Component): component is PassthroughComponent {
  return component.kind === "resistor" || component.kind === "capacitor" || component.kind === "inductor"
}

export interface ControlState {
  /** Pot reference to wiper fraction, 0 at ccw and 1 at cw. */
  readonly potPositions: Readonly<Record<string, number>>
  /** Switch reference to selected position name. */
  readonly switchPositions: Readonly<Record<string, string>>
}

type ResolvedBase<K extends string, P> = {
  readonly ref: string
  readonly kind: K
  /** Every resolved element has exactly two pins, keyed `a` and `b`: the SPICE emitter
   * reads `pins.a`/`pins.b` directly and must never meet a surprise third terminal.
   * This is also the key contract a producer of the INPUT `Network` must satisfy
   * for its two-terminal passives - `requireTwoPin` below rejects any other keying.
   */
  readonly pins: { readonly a: string; readonly b: string }
  readonly parameters: P
}

export type ResolvedElement =
  | ResolvedBase<"resistor", ResistorParameters>
  | ResolvedBase<"capacitor", CapacitorParameters>
  | ResolvedBase<"inductor", InductorParameters>

export interface ResolvedNetwork {
  readonly ports: Readonly<Record<string, string>>
  readonly elements: readonly ResolvedElement[]
}

/** A physical network's components are single-unit: one "MAIN" unit carries every
 * terminal (a two-terminal passive's `a`/`b`, a pot's `ccw`/`wiper`/`cw`, a switch's
 * `common` and its throws), and package pins stay empty. This flattens a component's
 * package pins and its one unit's pins into the single pin-name -> Connection map every
 * pass below reasons about. Throws if a component was built with more than one unit,
 * which the physical-network convention never produces.
 */
function terminals(component: Component): Readonly<Record<string, Connection>> {
  if (component.units.length !== 1) {
    throw new Error(`Physical network component must have exactly one unit: ${component.id}`)
  }
  return { ...component.pins, ...component.units[0].pins }
}

/** Every net a component's terminals name. A no-connect contributes nothing. */
function netsOf(component: Component): readonly string[] {
  const nets: string[] = []
  for (const connection of Object.values(terminals(component))) {
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
 * unique non-empty component ids, at least two pins per component, no empty pin key or
 * net name, and every declared port landing on a net some component actually touches.
 *
 * Deliberately separate from `validate.ts`'s `validateNetwork`: that check enforces a
 * closed per-kind pin vocabulary meant for authored circuits, while a physical network's
 * pots and switches declare their own open vocabularies (a rotary selector's throw names,
 * for instance) that a closed vocabulary does not anticipate.
 */
function validatePhysicalNetwork(network: Network): void {
  const ids = new Set<string>()
  for (const component of network.components) {
    if (!component.id || ids.has(component.id)) {
      throw new Error(`Duplicate or empty reference: ${component.id}`)
    }
    ids.add(component.id)
    const pinEntries = Object.entries(terminals(component))
    if (pinEntries.length < 2) throw new Error(`Missing pins: ${component.id}`)
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

/** Pass 4: replaces each pot with two resistors, ccw-to-wiper and wiper-to-cw.
 * A zero-ohm section is legal and is still emitted, so element counts stay stable
 * across a sweep.
 */
function expandPot(pot: PotentiometerComponent, fraction: number): ResolvedElement[] {
  const ccw = requirePotPin(pot, "ccw")
  const wiper = requirePotPin(pot, "wiper")
  const cw = requirePotPin(pot, "cw")
  const lowerFraction = taperFraction(pot.parameters.taper, fraction)
  return [
    {
      ref: `${pot.id}.ccw-wiper`,
      kind: "resistor",
      pins: { a: ccw, b: wiper },
      parameters: { ohms: pot.parameters.ohms * lowerFraction },
    },
    {
      ref: `${pot.id}.wiper-cw`,
      kind: "resistor",
      pins: { a: wiper, b: cw },
      parameters: { ohms: pot.parameters.ohms * (1 - lowerFraction) },
    },
  ]
}

/** Every resolved element carries exactly two pins keyed `a` and `b` (Ruling A) so a
 * later SPICE emitter never has to handle a surprise third terminal. Resistors,
 * capacitors and inductors pass through from the physical network unchanged except for
 * this check; a tapped inductor's extra tap, if it ever reached this path, would fail
 * here rather than reaching the emitter.
 */
function requireTwoPin(component: Component): { readonly a: string; readonly b: string } {
  const pins = terminals(component)
  const keys = Object.keys(pins)
  if (keys.length !== 2 || !("a" in pins) || !("b" in pins)) {
    throw new Error(`Element does not have exactly two pins keyed a and b: ${component.id}`)
  }
  return {
    a: requireNet(pins.a, `Unknown pin: ${component.id}.a`),
    b: requireNet(pins.b, `Unknown pin: ${component.id}.b`),
  }
}

/** Passes a resistor, capacitor or inductor through unchanged apart from enforcing the
 * two-pin invariant. Narrows on `kind` explicitly (rather than spreading the union)
 * so `parameters` stays tied to the correct member of `ResolvedElement`.
 */
function toResolvedPassthrough(component: PassthroughComponent): ResolvedElement {
  const pins = requireTwoPin(component)
  if (component.kind === "resistor") return { ref: component.id, kind: "resistor", pins, parameters: component.parameters }
  if (component.kind === "capacitor") return { ref: component.id, kind: "capacitor", pins, parameters: component.parameters }
  return { ref: component.id, kind: "inductor", pins, parameters: component.parameters }
}

/** Pass 5: rewrites a resolved element's two pins, or the network's arbitrary-keyed
 * ports, to each net's canonical union-find representative.
 */
function rewritePins(pins: { readonly a: string; readonly b: string }, uf: UnionFind): { a: string; b: string } {
  return { a: uf.find(pins.a), b: uf.find(pins.b) }
}

function rewritePorts(ports: Readonly<Record<string, string>>, uf: UnionFind): Record<string, string> {
  const rewritten: Record<string, string> = {}
  for (const [key, net] of Object.entries(ports)) rewritten[key] = uf.find(net)
  return rewritten
}

/** Produces the simplified network simulation and lint consume, from the physical
 * network (which keeps every pot terminal and switch contact) and a control-state
 * vector. No control setting is ever defaulted, inferred, or silently tolerated.
 *
 * Input contract. `physical` must be structurally well-formed (`validatePhysicalNetwork`,
 * run first here so a structural defect is diagnosed by the module that owns the rule
 * rather than surfacing later as an unrelated union-find lookup failure), it must declare
 * a `ground` port, and every resistor, capacitor and inductor in it must key its two pins
 * `a` and `b`. Pots and switches keep their own terminal vocabularies; only the
 * two-terminal passives are constrained. A producer whose source names pins otherwise -
 * tscircuit's `pin1`/`pin2`, for instance - must rekey them before calling this.
 */
export function resolveNetwork(physical: Network, state: ControlState): ResolvedNetwork {
  validatePhysicalNetwork(physical)
  validateControlState(physical, state)

  const switches = physical.components.filter(isSwitch)
  checkGangs(switches, state)

  const uf = mergeShortedNets(physical, switches, state)

  const expanded: ResolvedElement[] = []
  for (const component of physical.components) {
    if (isSwitch(component)) continue
    if (isPotentiometer(component)) {
      expanded.push(...expandPot(component, state.potPositions[component.id]))
      continue
    }
    if (!isPassthroughKind(component)) {
      throw new Error(`Component kind not supported by resolveNetwork: ${component.kind} (${component.id})`)
    }
    expanded.push(toResolvedPassthrough(component))
  }

  const elements = expanded.map(element => ({ ...element, pins: rewritePins(element.pins, uf) }))
  const ports = rewritePorts(physical.ports, uf)

  return { ports, elements }
}
