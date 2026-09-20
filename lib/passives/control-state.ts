import type { PassiveElement, PassiveNetwork } from "./topology.ts"
import type { CapacitorParameters, InductorParameters, ResistorParameters, Taper } from "./parameters.ts"
import { UnionFind } from "./union-find.ts"
import { netPreference } from "./net-preference.ts"

export interface ControlState {
  /** Pot reference to wiper fraction, 0 at ccw and 1 at cw. */
  readonly potPositions: Readonly<Record<string, number>>
  /** Switch reference to selected position name. */
  readonly switchPositions: Readonly<Record<string, string>>
}

type ResolvedBase<K extends string, P> = {
  readonly ref: string
  readonly kind: K
  /** Every resolved element has exactly two pins: a later SPICE emitter requires it. */
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
function validateControlState(network: PassiveNetwork, state: ControlState): void {
  const pots = network.elements.filter((e): e is Extract<PassiveElement, { kind: "potentiometer" }> =>
    e.kind === "potentiometer")
  const switches = network.elements.filter((e): e is Extract<PassiveElement, { kind: "switch" }> =>
    e.kind === "switch")

  for (const pot of pots) {
    if (!Object.prototype.hasOwnProperty.call(state.potPositions, pot.ref)) {
      throw new Error(`Missing control setting: ${pot.ref}`)
    }
    const fraction = state.potPositions[pot.ref]
    if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
      throw new Error(`Pot position out of range: ${pot.ref}`)
    }
  }
  for (const sw of switches) {
    if (!Object.prototype.hasOwnProperty.call(state.switchPositions, sw.ref)) {
      throw new Error(`Missing control setting: ${sw.ref}`)
    }
    const position = state.switchPositions[sw.ref]
    if (!sw.parameters.positions.includes(position)) {
      throw new Error(`Unknown switch position: ${sw.ref}=${position}`)
    }
    if (!Object.prototype.hasOwnProperty.call(sw.parameters.contacts, position)) {
      throw new Error(`Missing switch contacts: ${sw.ref}=${position}`)
    }
  }

  const potRefs = new Set(pots.map(p => p.ref))
  const switchRefs = new Set(switches.map(s => s.ref))
  for (const ref of Object.keys(state.potPositions)) {
    if (!potRefs.has(ref)) throw new Error(`Unknown control reference: ${ref}`)
  }
  for (const ref of Object.keys(state.switchPositions)) {
    if (!switchRefs.has(ref)) throw new Error(`Unknown control reference: ${ref}`)
  }
}

/** Pass 2: switches sharing a `gang` must select the same position. */
function checkGangs(
  switches: readonly Extract<PassiveElement, { kind: "switch" }>[],
  state: ControlState,
): void {
  const byGang = new Map<string, string[]>()
  for (const sw of switches) {
    const gang = sw.parameters.gang
    if (!gang) continue
    ;(byGang.get(gang) ?? byGang.set(gang, []).get(gang)!).push(state.switchPositions[sw.ref])
  }
  for (const [gang, positions] of byGang) {
    if (positions.some(p => p !== positions[0])) throw new Error(`Ganged switches disagree: ${gang}`)
  }
}

/** Pass 3: builds a union-find over net names, merging nets shorted by each switch's
 * selected contacts. Throws if a contact pair names a pin the switch does not declare.
 */
function mergeShortedNets(
  network: PassiveNetwork,
  switches: readonly Extract<PassiveElement, { kind: "switch" }>[],
  state: ControlState,
): UnionFind {
  const nets = new Set(network.elements.flatMap(e => Object.values(e.pins)))
  const uf = new UnionFind(nets, netPreference(network.ports))
  for (const sw of switches) {
    const position = state.switchPositions[sw.ref]
    const pairs = sw.parameters.contacts[position]
    for (const [pinA, pinB] of pairs) {
      const netA = sw.pins[pinA]
      const netB = sw.pins[pinB]
      if (!netA) throw new Error(`Unknown switch pin: ${sw.ref}.${pinA}`)
      if (!netB) throw new Error(`Unknown switch pin: ${sw.ref}.${pinB}`)
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
  pot: Extract<PassiveElement, { kind: "potentiometer" }>,
  pin: "ccw" | "wiper" | "cw",
): string {
  const net = pot.pins[pin]
  if (!net) throw new Error(`Unknown pot pin: ${pot.ref}.${pin}`)
  return net
}

/** Pass 4: replaces each pot with two resistors, ccw-to-wiper and wiper-to-cw.
 * A zero-ohm section is legal and is still emitted, so element counts stay stable
 * across a sweep.
 */
function expandPot(pot: Extract<PassiveElement, { kind: "potentiometer" }>, fraction: number): ResolvedElement[] {
  const ccw = requirePotPin(pot, "ccw")
  const wiper = requirePotPin(pot, "wiper")
  const cw = requirePotPin(pot, "cw")
  const lowerFraction = taperFraction(pot.parameters.taper, fraction)
  return [
    {
      ref: `${pot.ref}.ccw-wiper`,
      kind: "resistor",
      pins: { a: ccw, b: wiper },
      parameters: { ohms: pot.parameters.ohms * lowerFraction },
    },
    {
      ref: `${pot.ref}.wiper-cw`,
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
function requireTwoPin(
  element: { readonly ref: string; readonly pins: Readonly<Record<string, string>> },
): { readonly a: string; readonly b: string } {
  const keys = Object.keys(element.pins)
  if (keys.length !== 2 || !("a" in element.pins) || !("b" in element.pins)) {
    throw new Error(`Element does not have exactly two pins keyed a and b: ${element.ref}`)
  }
  return { a: element.pins.a, b: element.pins.b }
}

/** Passes a resistor, capacitor or inductor through unchanged apart from enforcing the
 * two-pin invariant. Narrows on `kind` explicitly (rather than spreading the union)
 * so `parameters` stays tied to the correct member of `ResolvedElement`.
 */
function toResolvedPassthrough(
  element: Extract<PassiveElement, { kind: "resistor" | "capacitor" | "inductor" }>,
): ResolvedElement {
  const pins = requireTwoPin(element)
  if (element.kind === "resistor") return { ref: element.ref, kind: "resistor", pins, parameters: element.parameters }
  if (element.kind === "capacitor") return { ref: element.ref, kind: "capacitor", pins, parameters: element.parameters }
  return { ref: element.ref, kind: "inductor", pins, parameters: element.parameters }
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
 */
export function resolveNetwork(physical: PassiveNetwork, state: ControlState): ResolvedNetwork {
  validateControlState(physical, state)

  const switches = physical.elements.filter((e): e is Extract<PassiveElement, { kind: "switch" }> =>
    e.kind === "switch")
  checkGangs(switches, state)

  const uf = mergeShortedNets(physical, switches, state)

  const expanded: ResolvedElement[] = []
  for (const element of physical.elements) {
    if (element.kind === "switch") continue
    if (element.kind === "potentiometer") {
      expanded.push(...expandPot(element, state.potPositions[element.ref]))
      continue
    }
    expanded.push(toResolvedPassthrough(element))
  }

  const elements = expanded.map(element => ({ ...element, pins: rewritePins(element.pins, uf) }))
  const ports = rewritePorts(physical.ports, uf)

  return { ports, elements }
}
