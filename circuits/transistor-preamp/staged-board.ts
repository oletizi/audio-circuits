/**
 * Transistor preamp, staged board: a second gain stage with panel controls.
 *
 * The operator's buffered board (./buffered-board.ts) with a second
 * voltage-gain stage, Q3, between its collector-feedback stage (Q1) and its
 * emitter-follower output (Q2), and three front-panel controls:
 *
 *   DRIVE (RV5)             between Q1 and Q3: how hard Q3 is driven - the
 *                           amount of saturation
 *   CHARACTER (RV6)         in Q3's emitter bypass branch: the shape of the
 *                           onset - toward 0, early and gradual saturation at
 *                           high gain; toward 1k, cleaner for longer
 *   TRANSFORMER DRIVE (RV7) between Q3 and Q2: how hard Q2 and the output
 *                           transformer are driven
 *
 * THIS IS A DESIGN, NOT A TRANSCRIPTION. The authority for every part and
 * value below, and the decisions behind them, is
 * docs/superpowers/specs/2026-09-28-transistor-preamp-staged-design.md.
 *
 * Q1 and Q2 are the buffered board's, built by the same shared functions, so
 * their parts, ids and designators are unchanged; only C3 now lands on
 * DRIVE's top instead of Q2's base.
 *
 * Q3 IS DIVIDER-BIASED WITH EMITTER DEGENERATION, so it saturates under the
 * operator's control and does not depend on the particular transistor: the
 * stiff 100k/15k divider sets its base, R11 alone carries its emitter DC
 * (about 1.9 mA), and its collector sits centred (about 13.4 V at 24 V). Its
 * gain is R10 over the unbypassed emitter resistance plus r_e - resistors and
 * a stable current, not beta. No matching.
 *
 * Each attenuator is cap - pot - cap, so no pot carries DC or moves a bias.
 * Every electrolytic's + terminal (pin a) faces the higher DC node. The
 * panel pots are off-board on 3-pin headers (./parts.ts panelPot).
 */
import { circuit } from "../../lib/model/index.ts"
import type { ControlState } from "../../lib/model/control-state.ts"
import type { Network } from "../../lib/model/index.ts"
import { parseValue } from "../../lib/model/units.ts"
import { addFollower, schematicNotes as bufferedNotes } from "./buffered-board.ts"
import * as buffered from "./buffered-board.ts"
import { addFeedbackStage } from "./feedback-board.ts"
import * as feedbackBoard from "./feedback-board.ts"
import type { FeedbackSetting } from "./feedback-board.ts"
import { legPosition } from "./leg-values.ts"
import { HEADER_2, RESISTOR, electrolytic, panelPot, transistor2N3904 } from "./parts.ts"
import type { Leg } from "./parts.ts"

export { PIN_NUMBERS } from "./parts.ts"

const VCC = "VCC"
const GND = "GND"
const IN_EXT = "IN_EXT"

/** CHARACTER's branch as a leg (floor R12 plus the panel pot), for legPosition.
 * Built explicitly below, because addLeg builds trim-pots, not panel pots. */
export const CHARACTER_LEG: Leg = {
  floor: { id: "character_floor", value: "22" },
  trimId: "character_pot", trim: "1k",
}

export function transistorPreampStaged(): Network {
  const builder = circuit()
  builder
    .connector("input_header", { "1": IN_EXT, "2": GND }, HEADER_2)
    .port("input", IN_EXT)
  addFeedbackStage(builder, "DRIVE_TOP")

  builder
    // DRIVE: C3 (from stage 1) -> pot -> C6 -> Q3's base.
    .add(panelPot("drive_pot", "25k", GND, "DRIVE_WIPER", "DRIVE_TOP"))
    .capacitor("drive_coupling_cap", "22uF", { a: "Q3_BASE", b: "DRIVE_WIPER" },
      electrolytic("CP_Radial_D5.0mm_P2.00mm"))
    // Q3: divider-biased common emitter.
    .resistor("q3_bias_upper", "100k", { a: VCC, b: "Q3_BASE" }, RESISTOR)
    .resistor("q3_bias_lower", "15k", { a: "Q3_BASE", b: GND }, RESISTOR)
    .resistor("q3_collector_resistor", "5.6k", { a: VCC, b: "Q3_COLLECTOR" }, RESISTOR)
    .resistor("q3_emitter_resistor", "1.2k", { a: "Q3_EMITTER", b: GND }, RESISTOR)
    .add(transistor2N3904("second_gain_transistor", "Q3_BASE", "Q3_COLLECTOR", "Q3_EMITTER"))
    // CHARACTER: the bypass branch beside R11 - C7, then the 22R floor, then the
    // panel pot as a rheostat (wiper strapped to cw, on the board).
    .capacitor("character_bypass_cap", "470uF", { a: "Q3_EMITTER", b: "CHARACTER_CAP" },
      electrolytic("CP_Radial_D10.0mm_P5.00mm"))
    .resistor("character_floor", "22", { a: "CHARACTER_CAP", b: "CHARACTER_FLOOR" }, RESISTOR)
    .add(panelPot("character_pot", "1k", "CHARACTER_FLOOR", GND, GND))
    // TRANSFORMER DRIVE: C8 -> pot -> C9 -> Q2's base.
    .capacitor("q3_output_cap", "10uF", { a: "Q3_COLLECTOR", b: "TRANSFORMER_DRIVE_TOP" },
      electrolytic("CP_Radial_D5.0mm_P2.00mm"))
    .add(panelPot("transformer_drive_pot", "25k", GND, "TRANSFORMER_DRIVE_WIPER", "TRANSFORMER_DRIVE_TOP"))
    .capacitor("buffer_input_cap", "10uF", { a: "BUFFER_BASE", b: "TRANSFORMER_DRIVE_WIPER" },
      electrolytic("CP_Radial_D5.0mm_P2.00mm"))

  addFollower(builder)
  return builder.done()
}

/** Semantic id -> KiCad reference designator: the buffered board's, then Q3's. */
export const DESIGNATORS: Readonly<Record<string, string>> = {
  ...buffered.DESIGNATORS,
  second_gain_transistor: "Q3",
  q3_bias_upper: "R8", q3_bias_lower: "R9", q3_collector_resistor: "R10",
  q3_emitter_resistor: "R11", character_floor: "R12",
  drive_coupling_cap: "C6", character_bypass_cap: "C7", q3_output_cap: "C8", buffer_input_cap: "C9",
  drive_pot: "RV5", character_pot: "RV6", transformer_drive_pot: "RV7",
}

/** Stage 1's legs, plus DRIVE and TRANSFORMER DRIVE as wiper positions (0 to 1)
 * and CHARACTER as its branch's total resistance (floor plus pot). */
export type StagedSetting = FeedbackSetting & {
  readonly drive: number
  readonly character: string
  readonly transformerDrive: number
}

/** Stage 1 as on the feedback board's START; the panel controls mid-way. */
export const START: StagedSetting = {
  ...feedbackBoard.START, drive: 0.5, character: "272", transformerDrive: 0.5,
}

function position(control: string, value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${control}: position ${value} is outside 0 to 1 (0 is fully down, 1 fully up)`)
  }
  return value
}

export function controlStateFor(setting: StagedSetting): ControlState {
  const stage = feedbackBoard.controlStateFor(setting)
  return {
    potPositions: {
      ...stage.potPositions,
      drive_pot: position("DRIVE", setting.drive),
      transformer_drive_pot: position("TRANSFORMER DRIVE", setting.transformerDrive),
      [CHARACTER_LEG.trimId]: legPosition(CHARACTER_LEG, parseValue(setting.character)),
    },
    switchPositions: stage.switchPositions,
  }
}

/** Stage 1's and the follower's notes, then the three panel controls. */
export function schematicNotes(): readonly string[] {
  return [
    ...bufferedNotes(),
    "PANEL CONTROLS (off-board pots on headers):",
    "  DRIVE (RV5) sets how hard Q3 is driven - the amount of saturation.",
    "  CHARACTER (RV6) shapes it: toward 0, early and gradual; toward 1k, cleaner for longer.",
    "  TRANSFORMER DRIVE (RV7) sets how hard Q2 and the output transformer are driven.",
  ]
}
