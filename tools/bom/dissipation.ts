/**
 * Resistor dissipation at a board's declared operating point.
 *
 * Walks the RESOLVED network's components directly - never `twoPinElements`
 * (lib/model/resolved-two-pin.ts), which supports networks of two-terminal passives
 * only and throws on the first transistor, so it cannot run on any preamp board. A
 * potentiometer resolves into two resistor sections (control-state.ts's `expandPot`),
 * with ids `<pot id>.<section>`; those pass through the same "kind === resistor" rule
 * as any other resistor and appear in the returned map under their section ids.
 *
 * Design: docs/superpowers/specs/2026-09-30-bom-design.md
 */
import { resolveNetwork } from "../../lib/model/control-state.ts"
import type { ResolvedComponent } from "../../lib/model/control-state.ts"
import type { Network, Parameters } from "../../lib/model/types.ts"
import { spiceNodeName, toSpiceOperatingPointNetlist } from "../../lib/sim/netlist.ts"
import { runOperatingPoint } from "../../lib/sim/operating-point.ts"
import type { BomConditions } from "./conditions.ts"

interface ResistorTerminals {
  readonly id: string
  readonly ohms: number
  readonly netA: string
  readonly netB: string
}

function requireOhms(parameters: Parameters, id: string): number {
  if (!("ohms" in parameters)) {
    throw new Error(
      `resistor "${id}": resolved parameters carry no "ohms" field, so its dissipation cannot be ` +
        'computed. Give it a ResistorParameters shape ({ ohms: number }) at resolution.',
    )
  }
  return parameters.ohms
}

/** A resolved resistor's two terminal nets. Requires exactly one unit whose resolved
 * pins are exactly `a` and `b` - the two-terminal resistor pin vocabulary every
 * resistor (and every expanded pot section) uses - and throws, naming the component,
 * for anything else rather than silently reading the wrong pins. */
function requireResistorTerminals(component: ResolvedComponent): ResistorTerminals {
  if (component.units.length !== 1) {
    throw new Error(
      `resistor "${component.id}" resolved to ${component.units.length} units; resistorDissipation ` +
        "requires exactly one unit per resolved resistor.",
    )
  }
  const unit = component.units[0]
  const pins = Object.keys(unit.pins).sort()
  if (pins.length !== 2 || pins[0] !== "a" || pins[1] !== "b") {
    throw new Error(
      `resistor "${component.id}" has resolved pins [${pins.join(", ")}], not exactly "a" and "b"; ` +
        "resistorDissipation only handles the two-terminal resistor pin vocabulary.",
    )
  }
  return {
    id: component.id,
    ohms: requireOhms(component.parameters, component.id),
    netA: unit.pins["a"],
    netB: unit.pins["b"],
  }
}

/**
 * Resolved component id -> operating-point dissipation in watts, `(V_a - V_b)^2 / R`.
 * Every kind but "resistor" is ignored (this includes the transistors, op-amps and
 * anything else an active board carries). A network with no resistors returns an
 * empty map without running a simulation at all.
 *
 * The ground net (`conditions.environment.groundPort`, resolved through the same
 * control state) reads as 0 V directly, rather than asked of the simulator: SPICE
 * reserves node 0 for the reference node and does not report a voltage for it.
 */
export async function resistorDissipation(
  network: Network,
  conditions: BomConditions,
): Promise<ReadonlyMap<string, number>> {
  const resolved = resolveNetwork(network, conditions.controlState)
  const resistors = resolved.components
    .filter((component) => component.kind === "resistor")
    .map(requireResistorTerminals)

  if (resistors.length === 0) return new Map()

  const groundNet = resolved.ports[conditions.environment.groundPort]
  if (groundNet === undefined) {
    throw new Error(
      `resistorDissipation: ground port "${conditions.environment.groundPort}" is not present in the ` +
        "resolved network's ports.",
    )
  }

  const nonGroundNets = new Set<string>()
  for (const resistor of resistors) {
    if (resistor.netA !== groundNet) nonGroundNets.add(resistor.netA)
    if (resistor.netB !== groundNet) nonGroundNets.add(resistor.netB)
  }

  let readings: Readonly<Record<string, number>> = {}
  if (nonGroundNets.size > 0) {
    const deck = toSpiceOperatingPointNetlist(resolved, conditions.environment)
    readings = await runOperatingPoint({ netlist: deck, nodes: [...nonGroundNets].map(spiceNodeName) })
  }

  const voltageAt = (net: string): number => {
    if (net === groundNet) return 0
    const value = readings[spiceNodeName(net)]
    if (value === undefined) {
      throw new Error(`resistorDissipation: no operating-point reading for net "${net}".`)
    }
    return value
  }

  const dissipation = new Map<string, number>()
  for (const resistor of resistors) {
    // A zero-ohm resistor - legal and reachable from a pot section at a taper extreme
    // (control-state.ts's expandPot: "a zero-ohm section is legal and is still
    // emitted") - dissipates exactly 0 W: P = I^2 R is 0 for any current when R = 0.
    // Computing (Va - Vb)^2 / R for it would instead divide 0 by 0 (an ideal short
    // has no voltage across it either), giving NaN - a silent numeric landmine in a
    // map typed `number`, not the physically correct answer this case already knows.
    const watts = resistor.ohms === 0
      ? 0
      : ((voltageAt(resistor.netA) - voltageAt(resistor.netB)) ** 2) / resistor.ohms
    if (!Number.isFinite(watts)) {
      throw new Error(
        `resistor "${resistor.id}": computed dissipation is ${watts}, not a finite number ` +
          `(ohms=${resistor.ohms}). Check its resolved "ohms" and the operating-point readings ` +
          "at its terminal nets.",
      )
    }
    dissipation.set(resistor.id, watts)
  }
  return dissipation
}
