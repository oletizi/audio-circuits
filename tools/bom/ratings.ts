/**
 * Component rating rules.
 *
 * A capacitor's required voltage rating is the board's highest supply rail,
 * rounded up to the next standard rating: at power-up a coupling capacitor
 * can briefly see nearly the whole rail, so the operating-point voltage
 * understates it. A resistor's required power is its operating-point
 * dissipation doubled, never less than 1/4 W (the smallest size the layouts
 * assume). Both rules are Decisions in
 * docs/superpowers/specs/2026-09-30-bom-design.md.
 */

/** The standard capacitor voltage ratings a part search chooses among. */
export const STANDARD_CAPACITOR_VOLTS: readonly number[] = [
  6.3, 10, 16, 25, 35, 50, 63, 100, 160, 200, 250, 350, 400, 450,
]

/** The next standard capacitor voltage rating at or above `highestRailVolts`. */
export function requiredCapacitorVolts(highestRailVolts: number): number {
  const rating = STANDARD_CAPACITOR_VOLTS.find((volts) => volts >= highestRailVolts)
  if (rating === undefined) {
    const highest = STANDARD_CAPACITOR_VOLTS[STANDARD_CAPACITOR_VOLTS.length - 1]
    throw new Error(
      `a rail of ${highestRailVolts} V exceeds every standard capacitor voltage rating this table ` +
        `knows (up to ${highest} V). Extend STANDARD_CAPACITOR_VOLTS in tools/bom/ratings.ts, with a ` +
        "test, before deriving needs for a board with a rail this high.",
    )
  }
  return rating
}

const MINIMUM_RESISTOR_WATTS = 0.25
const RESISTOR_DERATING_FACTOR = 2

/** A resistor's required power rating: dissipation doubled, never less than 1/4 W. */
export function requiredResistorWatts(dissipationWatts: number): number {
  return Math.max(MINIMUM_RESISTOR_WATTS, RESISTOR_DERATING_FACTOR * dissipationWatts)
}
