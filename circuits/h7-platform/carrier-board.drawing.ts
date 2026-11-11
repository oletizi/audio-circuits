/**
 * The bring-up carrier's drawing inputs: what copperhead needs that the circuit model does not
 * hold. One group (H7 carrier plan, Task 5). Everything else in the intent - refs, symbols,
 * values, pins - is derived from carrier-board.ts by tools/draught/intent-from-network.ts.
 *
 * The intent names `h7-platform:TS3USB221RSER`, a project symbol (spec C4), so a draft of it must
 * pass `PROJECT_SYMBOL_LIBRARY` to `draftWithCopperhead`'s `projectSymbolLibraries`.
 */
import { intentFromNetwork } from "../../tools/draught/intent-from-network.ts"
import type { CopperheadIntent, DrawingInputs } from "../../tools/draught/intent-from-network.ts"
import { DESIGNATORS, PIN_NUMBERS, h7Carrier } from "./carrier-board.ts"

export const CARRIER_DRAWING: DrawingInputs = {
  group: "H7 bring-up carrier",
  netKinds: { GND: "ground", VIN_MOD: "power", "3V3_D": "power", VREF_A: "power", VBUS: "power" },
}

/** The copperhead intent a draw of this board drafts from. */
export function drawingIntent(): CopperheadIntent {
  return intentFromNetwork(h7Carrier(), DESIGNATORS, PIN_NUMBERS, CARRIER_DRAWING)
}
