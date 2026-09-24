/**
 * The hi boost section on stripboard.
 *
 * The Cboost bank and R3 (Qmax) are on the board; the tapped inductors, the
 * level and Q pots, and the selector are panel-mount / off-board and appear as
 * PADS landings. Ground is a chassis/shield landing here, so net "0" has no
 * other member on this board and that singleton is declared.
 *
 * SW_HI_BOOST'S PADS LANDING IS ONE POLE OF A TWO-POLE ROTARY SHARED WITH THE
 * hi-cut BOARD (SW_HI_CUT there). `reference/pultec/controls.ts` models both
 * under `HI_FREQUENCY_GANG`, and `reference/pultec/unresolved.md` calls this
 * pairing "the thing most likely to be broken by a well-meaning refactor".
 * Physicalization does not carry the gang across board boundaries - each
 * board sees only its own pole, valued `SW_Rotary` like any other - so this
 * landing is NOT an independent switch to buy: it is one physical 6-position
 * rotary whose other pole lives on the hi-cut board, and the two poles must
 * always be wired to move together.
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

const CROSSING_NETS: readonly string[] = ["hi_boost_out", "in", "0"]

export function pultecHiBoost(): Network {
  return physicalizedBoard("hi-boost", CROSSING_NETS)
}

const BOARD = pultecHiBoost()

export const DESIGNATORS = designatorsFor(BOARD)
export const PIN_NUMBERS = PASSIVE_PIN_NUMBERS
export const PAD_ORDER = padOrdersFor(BOARD)
export const OFF_BOARD_IDS: ReadonlySet<string> = new Set(
  BOARD.components.filter((c) => OFF_BOARD.has(c.id)).map((c) => c.id),
)
/** Crossing net -> the other boards that touch it, for the wiring guide. */
export const SHARED_BY = sharedByFor("hi-boost", CROSSING_NETS)

/** Ground is physical-only here, so it has one member and is an intended open. */
export const DECLARED_OPENS: readonly string[] = ["0"]
