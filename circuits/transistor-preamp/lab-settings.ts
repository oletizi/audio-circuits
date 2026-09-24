/**
 * The lab board's named bench settings: which jumpers are fitted and where
 * each trim-pot starts. Each is a ControlState over transistorPreampLab(), so
 * one board serves the simulations, the schematic's settings table and the
 * bench.
 *
 * Settings are written as each leg's TOTAL resistance (floor + trim), which is
 * what the brief talks about, and converted to wiper positions here. Values
 * are starting points to dial in from, not predictions.
 */
import type { ControlState } from "../../lib/model/control-state.ts"
import { parseValue } from "../../lib/model/units.ts"
import { DESIGNATORS, LEGS } from "./lab-board.ts"
import type { Leg, LegName } from "./lab-board.ts"

/** A leg setting meaning "jumper removed: this leg is out of circuit". */
export const REMOVED = "removed"

export interface LabSetting {
  readonly name: string
  readonly summary: string
  /** Each leg's total resistance as a value string, or REMOVED. */
  readonly legs: Readonly<Record<LegName, string>>
}

const LEG_NAMES: readonly LegName[] = [
  "upper", "feedback", "lowerA", "lowerB", "collector", "emitterBypass",
]

/** Position given to a trim-pot on a leg that is out of circuit. Its value is
 * irrelevant there; resolveNetwork requires every pot to have one. */
const PARKED = 0.5

export const SETTINGS: readonly LabSetting[] = [
  {
    name: "nominal",
    summary: "divider bias, the brief's Build 0",
    legs: { upper: "80k", feedback: REMOVED, lowerA: "10k", lowerB: REMOVED, collector: "1.8k", emitterBypass: "0" },
  },
  {
    name: "dividerWithFeedback",
    summary: "divider plus collector-to-base feedback, Build 2A (DC-coupled)",
    legs: { upper: "80k", feedback: "1M", lowerA: "10k", lowerB: REMOVED, collector: "1.8k", emitterBypass: "0" },
  },
  {
    name: "collectorFeedback",
    summary: "collector-feedback bias with a base-to-ground leg, Build 2B",
    legs: { upper: REMOVED, feedback: "470k", lowerA: REMOVED, lowerB: "150k", collector: "1.8k", emitterBypass: "0" },
  },
  {
    name: "collectorFeedbackOnly",
    summary: "collector-feedback bias alone, Build 2B",
    legs: { upper: REMOVED, feedback: "1.3M", lowerA: REMOVED, lowerB: REMOVED, collector: "1.8k", emitterBypass: "0" },
  },
]

/** Wiper position giving `ohms` of total leg resistance. Throws, never clamps. */
export function legPosition(leg: Leg, ohms: number): number {
  const floorOhms = leg.floor === undefined ? 0 : parseValue(leg.floor.value)
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

export function controlStateFor(setting: LabSetting): ControlState {
  const potPositions: Record<string, number> = {}
  const switchPositions: Record<string, string> = {}
  for (const name of LEG_NAMES) {
    const leg = LEGS[name]
    const value = setting.legs[name]
    if (value === REMOVED) {
      if (leg.jumperId === undefined) {
        throw new Error(
          `setting "${setting.name}" takes out leg "${name}", which has no jumper and is always in circuit`,
        )
      }
      switchPositions[leg.jumperId] = "removed"
      potPositions[leg.trimId] = PARKED
      continue
    }
    if (leg.jumperId !== undefined) switchPositions[leg.jumperId] = "fitted"
    potPositions[leg.trimId] = legPosition(leg, parseValue(value))
  }
  return { potPositions, switchPositions }
}

function designatorOf(id: string): string {
  const designator = DESIGNATORS[id]
  if (designator === undefined) throw new Error(`"${id}" has no designator in DESIGNATORS`)
  return designator
}

/**
 * A resistance in ohms, spelled the way this table wants it: "0", "800R" below
 * 1k, "33k"/"5.3k" at or above it. This is deliberately a small local
 * formatter rather than a reuse of lib/kicad/value-notation.ts's resistor
 * formatter, which refuses below 1000 ohms and at 0 - exactly the range a
 * pot-only trim value (leg total minus its floor) needs, since a leg's floor
 * can already supply most of a small total.
 */
function formatOhms(ohms: number): string {
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
function trimOnlyOhms(leg: Leg, ohms: number): number {
  const floorOhms = leg.floor === undefined ? 0 : parseValue(leg.floor.value)
  return ohms - floorOhms
}

/** The bench-settings table carried as text on the generated schematic stub. */
export function schematicNotes(): readonly string[] {
  const lines = [
    "BENCH SETTINGS (circuits/transistor-preamp/lab-settings.ts)",
    "Jumpers: F = fitted, - = removed. Trim lines show each leg's total " +
      "resistance and, in parens, what to dial the pot itself to (the leg " +
      "total minus its fixed floor resistor, where it has one).",
  ]
  for (const setting of SETTINGS) {
    const jumpers: string[] = []
    const trims: string[] = []
    for (const name of LEG_NAMES) {
      const leg = LEGS[name]
      const value = setting.legs[name]
      if (leg.jumperId !== undefined) {
        jumpers.push(`${designatorOf(leg.jumperId)} ${value === REMOVED ? "-" : "F"}`)
      }
      if (value !== REMOVED) {
        const trimOhms = formatOhms(trimOnlyOhms(leg, parseValue(value)))
        trims.push(`${designatorOf(leg.trimId)} leg ${value} (trim ${trimOhms})`)
      }
    }
    jumpers.sort()
    lines.push(`${setting.name}: ${setting.summary}`)
    lines.push(`  ${jumpers.join("  ")}`)
    lines.push(`  ${trims.join("  ")}`)
  }
  return lines
}
