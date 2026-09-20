import type { PassiveElement, PassiveNetwork } from "./topology.ts"
import type { CapacitorParameters, InductorParameters, ResistorParameters, Taper } from "./parameters.ts"
import { UnionFind } from "./union-find.ts"

export interface ControlState {
  /** Pot reference to wiper fraction, 0 at ccw and 1 at cw. */
  readonly potPositions: Readonly<Record<string, number>>
  /** Switch reference to selected position name. */
  readonly switchPositions: Readonly<Record<string, string>>
}

type ResolvedBase<K extends string, P> = {
  readonly ref: string
  readonly kind: K
  readonly pins: Readonly<Record<string, string>>
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
    if (fraction < 0 || fraction > 1) throw new Error(`Pot position out of range: ${pot.ref}`)
  }
  for (const sw of switches) {
    if (!Object.prototype.hasOwnProperty.call(state.switchPositions, sw.ref)) {
      throw new Error(`Missing control setting: ${sw.ref}`)
    }
    const position = state.switchPositions[sw.ref]
    if (!sw.parameters.positions.includes(position)) {
      throw new Error(`Unknown switch position: ${sw.ref}=${position}`)
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
  const uf = new UnionFind(nets)
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

/** Pass 4: replaces each pot with two resistors, ccw-to-wiper and wiper-to-cw.
 * A zero-ohm section is legal and is still emitted, so element counts stay stable
 * across a sweep.
 */
function expandPot(pot: Extract<PassiveElement, { kind: "potentiometer" }>, fraction: number): ResolvedElement[] {
  const lowerFraction = taperFraction(pot.parameters.taper, fraction)
  return [
    {
      ref: `${pot.ref}.ccw-wiper`,
      kind: "resistor",
      pins: { a: pot.pins.ccw, b: pot.pins.wiper },
      parameters: { ohms: pot.parameters.ohms * lowerFraction },
    },
    {
      ref: `${pot.ref}.wiper-cw`,
      kind: "resistor",
      pins: { a: pot.pins.wiper, b: pot.pins.cw },
      parameters: { ohms: pot.parameters.ohms * (1 - lowerFraction) },
    },
  ]
}

/** Pass 5: rewrites an element's pins (or the network's ports) to each net's
 * canonical union-find representative.
 */
function rewriteNets(pins: Readonly<Record<string, string>>, uf: UnionFind): Record<string, string> {
  const rewritten: Record<string, string> = {}
  for (const [key, net] of Object.entries(pins)) rewritten[key] = uf.find(net)
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
    expanded.push(element)
  }

  const elements = expanded.map(element => ({ ...element, pins: rewriteNets(element.pins, uf) }))
  const ports = rewriteNets(physical.ports, uf)

  return { ports, elements }
}
