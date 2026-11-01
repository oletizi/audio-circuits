/**
 * Component rating rules.
 *
 * A capacitor's required voltage rating is the smallest standard rating at or
 * above the board's highest supply rail TIMES A MARGIN: at power-up a
 * coupling capacitor can briefly see nearly the whole rail, and the supply
 * itself has tolerance, so the operating-point voltage alone understates
 * what the part must survive. A resistor's required power is its
 * dissipation doubled, never less than 1/4 W (the smallest
 * size the layouts assume). Both rules are Decisions in
 * docs/superpowers/specs/2026-09-30-bom-design.md.
 *
 * `railBoundMinimumOhms` is the same resistor rule read backwards, for a board that
 * declares a rail bound instead of simulating an operating point: given a rail and a
 * claimed rating, the resistance below which that rating would not be enough.
 */

/** The standard capacitor voltage ratings a part search chooses among. */
export const STANDARD_CAPACITOR_VOLTS: readonly number[] = [
  6.3, 10, 16, 25, 35, 50, 63, 100, 160, 200, 250, 350, 400, 450,
]

/**
 * Headroom above the highest rail a capacitor's rating must cover: power-up
 * transients (a coupling capacitor can briefly see nearly the whole rail
 * before the circuit settles) and ordinary supply tolerance. A rail-rated
 * part with no margin is not acceptable - e.g. a 25 V part on a 24 V rail.
 */
const CAPACITOR_VOLTAGE_MARGIN_FACTOR = 1.2

/** The smallest standard capacitor voltage rating at or above `highestRailVolts x CAPACITOR_VOLTAGE_MARGIN_FACTOR`. */
export function requiredCapacitorVolts(highestRailVolts: number): number {
  const minimumVolts = highestRailVolts * CAPACITOR_VOLTAGE_MARGIN_FACTOR
  const rating = STANDARD_CAPACITOR_VOLTS.find((volts) => volts >= minimumVolts)
  if (rating === undefined) {
    const highest = STANDARD_CAPACITOR_VOLTS[STANDARD_CAPACITOR_VOLTS.length - 1]
    throw new Error(
      `a rail of ${highestRailVolts} V (x${CAPACITOR_VOLTAGE_MARGIN_FACTOR} margin = ${minimumVolts} V) ` +
        `exceeds every standard capacitor voltage rating this table knows (up to ${highest} V). Extend ` +
        "STANDARD_CAPACITOR_VOLTS in tools/bom/ratings.ts, with a test, before deriving needs for a " +
        "board with a rail this high.",
    )
  }
  return rating
}

const MINIMUM_RESISTOR_WATTS = 0.25
const RESISTOR_DERATING_FACTOR = 2

/** A resistor's required power rating: dissipation doubled, never less than 1/4 W.
 * The dissipation figure may come from an operating point (tools/bom/dissipation.ts)
 * or from a declared rail bound (tools/bom/rail-bound.ts); this rule does not care
 * which, and applies the same derating either way. */
export function requiredResistorWatts(dissipationWatts: number): number {
  return Math.max(MINIMUM_RESISTOR_WATTS, RESISTOR_DERATING_FACTOR * dissipationWatts)
}

/**
 * The smallest resistance a `ratedWatts` part still covers on a `railVolts` rail,
 * worst case - the THRESHOLD a declared rail bound is checked against.
 *
 * The worst case for a resistor on a single rail is the whole rail across it, so its
 * dissipation is bounded by `railVolts^2 / R` with no operating point needed. This
 * function is the INVERSE of `requiredResistorWatts` at that bound: the resistance at
 * which `requiredResistorWatts(railVolts^2 / R)` is exactly `ratedWatts`. Below it,
 * `deriveNeeds` would ask for a bigger part than the board claims to need, which is a
 * declaration contradicting itself rather than a part being marginal.
 *
 * **IT IS NOT `railVolts^2 / ratedWatts`, AND THE FACTOR OF 2 IS THIS REPOSITORY'S OWN
 * RULE RATHER THAN A SECOND OPINION ABOUT THE PHYSICS.** The bare `V^2/P` reaches
 * 1/4 W at 100 ohms on a 5 V rail. `requiredResistorWatts` doubles every dissipation
 * figure before it becomes a rating to order (its Decision in
 * docs/superpowers/specs/2026-09-30-bom-design.md), so a 150-ohm resistor on a 5 V
 * rail would have `deriveNeeds` ask for 0.333 W while the declaration said 1/4 W was
 * enough. Taking the stricter threshold is what keeps the declared rating and the
 * derived line from disagreeing silently. `tests/bom/rail-bound.test.ts` proves the
 * inversion is exact rather than restating this formula.
 */
export function railBoundMinimumOhms(railVolts: number, ratedWatts: number): number {
  if (!(railVolts > 0)) {
    throw new Error(
      `railBoundMinimumOhms: a rail of ${railVolts} V bounds nothing - the worst case for a ` +
        "resistor is the whole rail across it, and a rail of zero or less gives a bound of zero " +
        "watts for every resistance, including ones no part could survive. Declare the rail's " +
        "magnitude.",
    )
  }
  if (ratedWatts < MINIMUM_RESISTOR_WATTS) {
    throw new Error(
      `railBoundMinimumOhms: a claimed rating of ${ratedWatts} W is below the ` +
        `${MINIMUM_RESISTOR_WATTS} W floor requiredResistorWatts applies to every resistor line, ` +
        "so no resistance would satisfy it and the threshold is not defined. Claim " +
        `${MINIMUM_RESISTOR_WATTS} W or more, or lower MINIMUM_RESISTOR_WATTS in ` +
        "tools/bom/ratings.ts with a test and a reason.",
    )
  }
  return (RESISTOR_DERATING_FACTOR * railVolts ** 2) / ratedWatts
}
