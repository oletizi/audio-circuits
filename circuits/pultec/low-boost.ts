/**
 * The low boost section on stripboard.
 *
 * The Cboost bank and R2 are on the board; the 47K level pot and its selector
 * are panel-mount and appear as PADS landings. Net "0" is genuinely part of
 * this section's signal topology, so it has a second member on this board and
 * no singleton is declared.
 *
 * SW_LO_BOOST'S PADS LANDING IS ONE POLE OF A TWO-POLE ROTARY SHARED WITH THE
 * low-cut BOARD (SW_LO_CUT there). `reference/pultec/controls.ts` models both
 * under `LO_FREQUENCY_GANG`, and `reference/pultec/unresolved.md` calls this
 * pairing "the thing most likely to be broken by a well-meaning refactor" -
 * the builder states it "is a critical part of the pultec low cut + boost
 * sound". Physicalization does not carry the gang across board boundaries -
 * each board sees only its own pole, valued `SW_Rotary` like any other - so
 * this landing is NOT an independent switch to buy: it is one physical
 * 6-position rotary whose other pole lives on the low-cut board, and the two
 * poles must always be wired to move together.
 */
import {
  designatorsFor,
  padOrdersFor,
  physicalizedBoard,
  sharedByFor,
  PASSIVE_PIN_NUMBERS,
} from "./parts.ts"
import { OFF_BOARD } from "../../reference/pultec/off-board.ts"
import type { Network } from "../../lib/model/types.ts"

const CROSSING_NETS: readonly string[] = ["lo_boost_in", "out", "0"]

export function pultecLowBoost(): Network {
  return physicalizedBoard("low-boost", CROSSING_NETS)
}

const BOARD = pultecLowBoost()

export const DESIGNATORS = designatorsFor(BOARD)
export const PIN_NUMBERS = PASSIVE_PIN_NUMBERS
export const PAD_ORDER = padOrdersFor(BOARD)
export const OFF_BOARD_IDS: ReadonlySet<string> = new Set(
  BOARD.components.filter((c) => OFF_BOARD.has(c.id)).map((c) => c.id),
)
/** Crossing net -> the other boards that touch it, for the wiring guide. */
export const SHARED_BY = sharedByFor("low-boost", CROSSING_NETS)

export const DECLARED_OPENS: readonly string[] = []
