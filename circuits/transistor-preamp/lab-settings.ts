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
import type { LegName } from "./lab-board.ts"
import { formatOhms, legPosition, trimOnlyOhms } from "./leg-values.ts"

export { legPosition }

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
