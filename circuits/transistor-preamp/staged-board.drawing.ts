/**
 * The staged board's drawing inputs: what copperhead needs that the circuit
 * model does not hold.
 *
 * ONE GROUP, the owner's decision (docs/superpowers/specs/
 * 2026-11-01-staged-preamp-copperhead-drawing-design.md): the staged preamp is
 * one signal chain, and copperhead draws a net as wire only when every
 * endpoint is in one group. The caption is the only free text copperhead
 * places.
 *
 * Everything else in the intent - refs, symbols, values, pins - is derived
 * from staged-board.ts by tools/draught/intent-from-network.ts.
 */
import { intentFromNetwork } from "../../tools/draught/intent-from-network.ts"
import type { CopperheadIntent, DrawingInputs } from "../../tools/draught/intent-from-network.ts"
import { PIN_NUMBERS } from "./parts.ts"
import { DESIGNATORS, transistorPreampStaged } from "./staged-board.ts"

export const STAGED_DRAWING: DrawingInputs = {
  group: "Transistor preamp - staged",
  netKinds: { GND: "ground", VCC: "power" },
}

/** The copperhead intent `make draw` drafts this board from. */
export function drawingIntent(): CopperheadIntent {
  return intentFromNetwork(transistorPreampStaged(), DESIGNATORS, PIN_NUMBERS, STAGED_DRAWING)
}
