/**
 * Transistor preamp, loop board: the brief's Build 4, first step.
 *
 * The buffered board (./buffered-board.ts) with one feedback loop around both
 * stages: from the follower's emitter back to the input stage's base, through
 * a DC-blocking cap and a trimmable resistance, with a series input resistor
 * as the other half of the gain-setting pair. Stage 1 inverts and the follower
 * does not, so the loop is negative feedback. One loop now sets the gain of
 * the whole amplifier, trading gain for control.
 *
 * THIS IS A DESIGN, NOT A TRANSCRIPTION. The authority for every part and
 * value below is docs/superpowers/specs/2026-09-25-transistor-preamp-loop-design.md.
 *
 * THE LOOP. C6 (10uF; + terminal on Q2's emitter, about 3.1 V, - toward the
 * base side, about 1.2-1.5 V) blocks DC, so the loop acts on the signal only
 * and both stages keep the bias the operator tuned. R9 22k and RV5 200k (a
 * rheostat, like every leg) set the amount of feedback: turning RV5 up raises
 * the gain toward the open-loop value. The chain has little gain to trade
 * (R8 roughly halves it), so the loop gain is modest - itself the lesson.
 *
 * OPENING THE LOOP: lift C6. There are no jumpers.
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
import { formatOhms, legPosition, trimOnlyOhms } from "./leg-values.ts"
import { HEADER_2, RESISTOR, addLeg, electrolytic } from "./parts.ts"
import type { Leg } from "./parts.ts"

export { PIN_NUMBERS } from "./parts.ts"

const GND = "GND"
const IN_SOURCE = "IN_SOURCE"

export const LOOP_LEG: Leg = {
  floor: { id: "loop_feedback_floor", value: "22k" },
  trimId: "loop_feedback_trim", trim: "200k",
}

export function transistorPreampLoop(): Network {
  const builder = circuit()
  builder
    .connector("input_header", { "1": IN_SOURCE, "2": GND }, HEADER_2)
    .port("input", IN_SOURCE)
    .resistor("input_resistor", "4.7k", { a: IN_SOURCE, b: "IN_EXT" }, RESISTOR)
  addFeedbackStage(builder, "BUFFER_BASE")
  addFollower(builder)
  builder.capacitor("loop_feedback_cap", "10uF", { a: "BUFFER_EMITTER", b: "LOOP_CAP" },
    electrolytic("CP_Radial_D5.0mm_P2.00mm"))
  addLeg(builder, LOOP_LEG, "LOOP", "LOOP_CAP", "BASE")
  return builder.done()
}

/** Semantic id -> KiCad reference designator: the buffered board's, then the loop's. */
export const DESIGNATORS: Readonly<Record<string, string>> = {
  ...buffered.DESIGNATORS,
  input_resistor: "R8", loop_feedback_floor: "R9", loop_feedback_trim: "RV5",
  loop_feedback_cap: "C6",
}

/** Stage 1's legs plus the loop leg's total resistance, each a value string. */
export type LoopSetting = FeedbackSetting & { readonly loop: string }

/** Stage 1 as on the feedback board's START, and the loop leg at 68k. */
export const START: LoopSetting = { ...feedbackBoard.START, loop: "68k" }

export function controlStateFor(setting: LoopSetting): ControlState {
  const stage = feedbackBoard.controlStateFor(setting)
  return {
    potPositions: { ...stage.potPositions, [LOOP_LEG.trimId]: legPosition(LOOP_LEG, parseValue(setting.loop)) },
    switchPositions: stage.switchPositions,
  }
}

/** Stage 1's and the follower's notes, then the loop's starting setting and how to open it. */
export function schematicNotes(): readonly string[] {
  const trimOhms = formatOhms(trimOnlyOhms(LOOP_LEG, parseValue(START.loop)))
  return [
    ...bufferedNotes(),
    `LOOP: RV5 leg ${START.loop} (trim ${trimOhms}); turn RV5 up for more gain and less feedback.`,
    "Open the loop for comparisons: lift C6. Check the output on a scope for",
    "high-frequency oscillation at power-up, at both ends of RV5's travel.",
  ]
}
