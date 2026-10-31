/**
 * A resistor power rating derived from a RAIL BOUND rather than from a simulated
 * operating point - the narrower claim a board on a single low-voltage rail can make,
 * and the check that holds it to being true.
 *
 * **WHY THIS EXISTS, WHICH IS A QUESTION ABOUT WHAT THE GATE IS FOR.** `deriveNeeds`
 * requires a dissipation figure for every resistor and refuses by name without one.
 * `resistorDissipation` supplies that figure by solving a DC operating point, which
 * needs a SPICE model for every active device and a source and a load for the board.
 * `pt2399-core` has none of those: the PT2399 has no SPICE emission rule and no model
 * in `lib/sim/models/`, and nothing in this repository records what drives its INPUT
 * or loads its OUTPUT. **But a dissipation figure is not what a parts list needs - a
 * wattage to order is**, and on a single rail that wattage follows from arithmetic:
 * the worst case for any resistor is the whole rail across it, so `P <= V^2 / R` with
 * no operating point involved. `docs/research/2026-10-30-rail-bound-power.md` records
 * the reasoning and the owner's judgement it rests on.
 *
 * **THIS IS NOT AN ESCAPE FROM SIMULATION AND MUST NOT BECOME ONE.** The bound is
 * looser than an operating point everywhere, so a board that CAN be simulated is
 * strictly better served by simulating: `tools/bom/run.ts` takes this path only for a
 * board whose `bomConditions()` declares `railBound`, and declaring it means claiming
 * a rating for every resistor on the board and having that claim checked. Where the
 * claim fails, this module refuses by name rather than widening the rating.
 *
 * **WHAT IT DELIBERATELY DOES NOT DO.** It does not resolve the network through a
 * control state and it runs no simulation, so it says nothing about a potentiometer -
 * whose section resistance is a function of its control and can reach 0 ohms, where
 * `V^2/R` is unbounded. A network carrying one is refused rather than passed over in
 * silence.
 */
import type { Component, Network, ResistorComponent } from "../../lib/model/types.ts"
import type { SupplyModel } from "../../lib/sim/netlist.ts"
import { railBoundMinimumOhms } from "./ratings.ts"

/**
 * A board's declaration that its resistor power rating follows from its rail rather
 * than from an operating point.
 *
 * It carries NO source and NO load, and that absence is the point: a rail bound needs
 * neither, so a board taking this path never has to invent them. It is also why this
 * is a separate arm of `BomConditions` rather than a flag on the simulated one.
 */
export interface RailBoundPower {
  /**
   * The rails the bound is taken from, each on a port the CIRCUIT declares -
   * `railBoundResistorWatts` refuses a port the circuit does not have, so the rail is
   * attached to the model rather than floating beside it.
   */
  readonly supplies: readonly SupplyModel[]
  /** The power rating claimed for every resistor on the board, in watts. */
  readonly ratedWatts: number
  /** Whose engineering judgement this is, in their own words. Quoted in every refusal,
   * so the thing being contradicted is named and not merely the number. */
  readonly basis: string
}

function isResistor(component: Component): component is ResistorComponent {
  return component.kind === "resistor"
}

/** Three significant figures, for a refusal a person reads. A bound is a quotient and
 * prints as 0.5319148936170213 otherwise, which buries the number in its own digits. */
function wattsText(watts: number): string {
  return String(Number(watts.toPrecision(3)))
}

/** The rail the bound is taken from: the declared supply furthest from ground, by
 * magnitude, so a negative rail counts by how far it sits from ground and not by its
 * sign. Refuses an empty list and a non-positive magnitude rather than returning a
 * bound of zero watts, which every resistance would satisfy. */
function boundingRailVolts(railBound: RailBoundPower, where: string): number {
  if (railBound.supplies.length === 0) {
    throw new Error(
      `${where}: bomConditions().railBound declares no supplies, so there is no rail to bound any ` +
        "resistor's dissipation by. Declare the rail the board runs on, on a port the circuit " +
        "declares.",
    )
  }
  const volts = Math.max(...railBound.supplies.map((supply) => Math.abs(supply.volts)))
  if (!(volts > 0)) {
    throw new Error(
      `${where}: bomConditions().railBound's largest declared rail is ${volts} V, which bounds ` +
        "nothing - every resistance dissipates at most zero watts across it, including ones no " +
        "part could survive. Declare the rail's magnitude.",
    )
  }
  return volts
}

/** Each declared supply sits on a port the circuit declares. This is what ties the
 * declared voltage to the model: `{ port: "vcc", volts: 5 }` is a claim about the net
 * `vcc` names, and a circuit that stops declaring that port stops satisfying it. */
function assertSuppliesAreOnDeclaredPorts(network: Network, railBound: RailBoundPower, where: string): void {
  const declared = Object.keys(network.ports).sort()
  for (const supply of railBound.supplies) {
    if (network.ports[supply.port] === undefined) {
      throw new Error(
        `${where}: bomConditions().railBound declares a supply on port "${supply.port}", which is ` +
          `not a port this circuit declares. The circuit declares: ${declared.join(", ")}. A rail ` +
          "bound is a claim about a net the circuit has, so the port is not defaulted or guessed.",
      )
    }
  }
}

/** A potentiometer has no rail bound, and saying so loudly is the only honest option:
 * its section resistance is a function of its control state and reaches 0 ohms at a
 * taper extreme (lib/model/control-state.ts's `expandPot`), where `V^2/R` is
 * unbounded. The operating-point path handles this because the simulator reports the
 * voltage actually across the section; arithmetic over a declared rail cannot. */
function assertNoVariableResistance(network: Network, where: string): void {
  for (const component of network.components) {
    if (component.kind !== "potentiometer") continue
    throw new Error(
      `${where}: this circuit carries potentiometer "${component.id}", and a rail bound says ` +
        "nothing about it: a wiper reaches 0 ohms at a taper extreme, where the whole rail across " +
        "the section is unbounded power. What would settle it: derive this board's dissipation " +
        "from an operating point (declare bomConditions().environment instead), or add a rule " +
        "here for a pot whose end-to-end resistance bounds every section, with a test, if that " +
        "is the claim intended.",
    )
  }
}

/**
 * Resistor component id -> the WORST-CASE dissipation the declared rail allows,
 * `railVolts^2 / R`, for every resistor the circuit carries - the map
 * `deriveNeeds` requires, filled from arithmetic rather than from a simulation.
 *
 * **IT REFUSES BEFORE IT RETURNS, and that refusal is the whole value of the
 * declaration.** `railBoundMinimumOhms` turns the claimed rating and the declared rail
 * into the smallest resistance that rating covers; any resistor below it is refused by
 * name, with its value, the threshold, the rail, the rating and the basis quoted. So
 * the claim fails loudly when a small resistor is added to the circuit AND when the
 * rail is raised enough to move the threshold past the smallest resistor already on
 * it - the two ways a true declaration becomes a false one.
 */
export function railBoundResistorWatts(
  network: Network,
  railBound: RailBoundPower,
  where: string,
): ReadonlyMap<string, number> {
  assertSuppliesAreOnDeclaredPorts(network, railBound, where)
  assertNoVariableResistance(network, where)

  const railVolts = boundingRailVolts(railBound, where)
  const minimumOhms = railBoundMinimumOhms(railVolts, railBound.ratedWatts)

  const watts = new Map<string, number>()
  for (const component of network.components) {
    if (!isResistor(component)) continue
    const { ohms } = component.parameters
    if (ohms < minimumOhms) {
      throw new Error(
        `${where}: the declared rail bound does NOT cover this circuit. resistor ` +
          `"${component.id}" is ${ohms} ohms, below the ${minimumOhms} ohms a ` +
          `${railBound.ratedWatts} W part covers with the whole ${railVolts} V rail across it ` +
          `(worst case ${wattsText((railVolts ** 2) / ohms)} W, and requiredResistorWatts doubles a ` +
          "dissipation figure before it becomes a rating to order). The basis for the claimed " +
          `rating was ${railBound.basis}. Either raise the resistor's value, raise ` +
          "bomConditions().railBound.ratedWatts to a rating that covers it - with a basis for " +
          "that rating - or derive this board's dissipation from an operating point instead.",
      )
    }
    watts.set(component.id, (railVolts ** 2) / ohms)
  }
  return watts
}
