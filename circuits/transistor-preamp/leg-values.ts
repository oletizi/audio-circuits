/**
 * Converting a leg's total resistance (floor + trim, which is what the brief
 * talks about) into what a board needs: a wiper position for simulation, and
 * the pot-only value to dial the trim itself to on the bench.
 */
import { parseValue } from "../../lib/model/units.ts"
import type { Leg } from "./parts.ts"

function floorOhmsOf(leg: Leg): number {
  return leg.floor === undefined ? 0 : parseValue(leg.floor.value)
}

/** Wiper position giving `ohms` of total leg resistance. Throws, never clamps. */
export function legPosition(leg: Leg, ohms: number): number {
  const floorOhms = floorOhmsOf(leg)
  const trimOhms = parseValue(leg.trim)
  const position = (ohms - floorOhms) / trimOhms
  if (!Number.isFinite(position) || position < 0 || position > 1) {
    throw new Error(
      `${leg.trimId}: ${ohms} ohms is outside this leg's range, ${floorOhms} to ` +
        `${floorOhms + trimOhms} ohms. Swap the fixed resistor or the trim-pot rather than ` +
        "asking for a setting the board cannot reach.",
    )
  }
  return position
}

/**
 * A resistance in ohms, spelled the way the settings tables want it: "0",
 * "800R" below 1k, "33k"/"5.3k" at or above it. This is deliberately a small
 * local formatter rather than a reuse of lib/kicad/value-notation.ts's
 * resistor formatter, which refuses below 1000 ohms and at 0 - exactly the
 * range a pot-only trim value (leg total minus its floor) needs, since a
 * leg's floor can already supply most of a small total.
 */
export function formatOhms(ohms: number): string {
  if (!Number.isFinite(ohms) || ohms < 0 || ohms > 1_500_000) {
    throw new Error(`${ohms} ohms is outside the range this table's formatter covers (0 to 1.5M)`)
  }
  const spelled = (n: number): string => {
    const text = String(Number(n.toFixed(4)))
    return text.startsWith("0.") ? text.slice(1) : text
  }
  if (ohms === 0) return "0"
  return ohms < 1000 ? `${spelled(ohms)}R` : `${spelled(ohms / 1000)}k`
}

/** The pot-only resistance a leg's trim must be set to, for a total of `ohms`:
 * the leg total minus its fixed floor (0 where the leg has none). */
export function trimOnlyOhms(leg: Leg, ohms: number): number {
  return ohms - floorOhmsOf(leg)
}
