/**
 * Transistor preamp, buffered board: the brief's Build 3.
 *
 * The collector-feedback gain stage the operator built and tuned
 * (./feedback-board.ts), AC-coupled into a separately biased 2N3904 emitter
 * follower that drives the output. The principle: stop asking one stage to
 * provide voltage gain and drive whatever load follows it at the same time.
 *
 * THIS IS A DESIGN, NOT A TRANSCRIPTION. The authority for every part and
 * value below is docs/superpowers/specs/2026-09-24-transistor-preamp-buffered-design.md.
 *
 * STAGE 1 is built by the feedback board's own addFeedbackStage, so its parts,
 * trim ranges, ids and designators are identical and tuned settings carry
 * across; only its output coupling cap (C3) now lands on the follower's base.
 *
 * THE FOLLOWER'S BIAS IS SOFT ON PURPOSE. R5/R6 (100k/100k) present a light
 * load to stage 1, so Q2's base current pulls its base below the naive 4.5 V:
 * I_E ~= 3.8 V / (1.5k + 50k/(beta+1)), about 1.5-2.2 mA over beta 50-200. The
 * follower has ample headroom, so no precise operating point is needed; the
 * sag is worth measuring on the bench. Do not stiffen the divider - that would
 * load stage 1 far harder. C5's + terminal (pin a) faces the emitter.
 */
import { circuit } from "../../lib/model/index.ts"
import type { Builder, Network } from "../../lib/model/index.ts"
import { addFeedbackStage, schematicNotes as feedbackNotes } from "./feedback-board.ts"
import * as feedbackBoard from "./feedback-board.ts"
import { HEADER_2, RESISTOR, electrolytic, transistor2N3904 } from "./parts.ts"

export { PIN_NUMBERS } from "./parts.ts"
export { START, controlStateFor } from "./feedback-board.ts"

const VCC = "VCC"
const GND = "GND"
const COLLECTOR_COUPLED = "BUFFER_BASE"
const BUFFER_EMITTER = "BUFFER_EMITTER"
const OUT = "OUT"

export function transistorPreampBuffered(): Network {
  const builder = circuit()
  builder
    .connector("input_header", { "1": "IN_EXT", "2": GND }, HEADER_2)
    .port("input", "IN_EXT")
  addFeedbackStage(builder, COLLECTOR_COUPLED)
  addFollower(builder)
  return builder.done()
}

/** The emitter follower from its base (where stage 1's C3 lands) to the output
 * header, and the "output" port. Shared with the loop board (./loop-board.ts). */
export function addFollower(builder: Builder): void {
  builder
    .resistor("buffer_bias_upper", "100k", { a: VCC, b: COLLECTOR_COUPLED }, RESISTOR)
    .resistor("buffer_bias_lower", "100k", { a: COLLECTOR_COUPLED, b: GND }, RESISTOR)
    .add(transistor2N3904("buffer_transistor", COLLECTOR_COUPLED, VCC, BUFFER_EMITTER))
    .resistor("buffer_emitter_resistor", "1.5k", { a: BUFFER_EMITTER, b: GND }, RESISTOR)
    .capacitor("buffer_output_cap", "10uF", { a: BUFFER_EMITTER, b: OUT },
      electrolytic("CP_Radial_D5.0mm_P2.00mm"))
    .connector("output_header", { "1": OUT, "2": GND }, HEADER_2)
    .port("output", OUT)
}

/** Semantic id -> KiCad reference designator: stage 1's exactly as on the
 * feedback board, then the follower's. */
export const DESIGNATORS: Readonly<Record<string, string>> = {
  ...feedbackBoard.DESIGNATORS,
  buffer_bias_upper: "R5", buffer_bias_lower: "R6", buffer_emitter_resistor: "R7",
  buffer_transistor: "Q2", buffer_output_cap: "C5",
}

/** Stage 1's starting settings, then what the follower is and what to measure on it. */
export function schematicNotes(): readonly string[] {
  return [
    ...feedbackNotes(),
    "OUTPUT: Q2 is an emitter follower (no trim). R5/R6 bias its base below the",
    "naive 4.5 V by an amount that depends on beta - measure Q2's base and emitter",
    "voltages, V_BE and I_E = V_E / 1.5k.",
  ]
}
