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
export const OUT = "out"

export interface LabSetting {
  readonly name: string
  readonly summary: string
  /** Each leg's total resistance as a value string, or OUT. */
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
    legs: { upper: "80k", feedback: OUT, lowerA: "10k", lowerB: OUT, collector: "1.8k", emitterBypass: "0" },
  },
  {
    name: "dividerWithFeedback",
    summary: "divider plus collector-to-base feedback, Build 2A (DC-coupled)",
    legs: { upper: "80k", feedback: "1M", lowerA: "10k", lowerB: OUT, collector: "1.8k", emitterBypass: "0" },
  },
  {
    name: "collectorFeedback",
    summary: "collector-feedback bias with a base-to-ground leg, Build 2B",
    legs: { upper: OUT, feedback: "470k", lowerA: OUT, lowerB: "150k", collector: "1.8k", emitterBypass: "0" },
  },
  {
    name: "collectorFeedbackOnly",
    summary: "collector-feedback bias alone, Build 2B",
    legs: { upper: OUT, feedback: "1.3M", lowerA: OUT, lowerB: OUT, collector: "1.8k", emitterBypass: "0" },
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
    if (value === OUT) {
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
    "Jumpers: F = fitted, - = removed. Trim values are each leg's total resistance.",
  ]
  for (const setting of SETTINGS) {
    const jumpers: string[] = []
    const trims: string[] = []
    for (const name of LEG_NAMES) {
      const leg = LEGS[name]
      const value = setting.legs[name]
      if (leg.jumperId !== undefined) {
        jumpers.push(`${designatorOf(leg.jumperId)} ${value === OUT ? "-" : "F"}`)
      }
      if (value !== OUT) trims.push(`${designatorOf(leg.trimId)} ${value}`)
    }
    jumpers.sort()
    lines.push(`${setting.name}: ${setting.summary}`)
    lines.push(`  ${jumpers.join("  ")}`)
    lines.push(`  ${trims.join("  ")}`)
  }
  return lines
}
