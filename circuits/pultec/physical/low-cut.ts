/**
 * The low cut section on stripboard.
 *
 * Seven capacitors on the board; the 470K level pot and the six-position
 * selector are panel-mount and appear as PADS landings. Ground is a
 * chassis/shield landing here - the low cut section returns through its pot, so
 * net "0" has no other member on this board, and that singleton is declared.
 *
 * SW_LO_CUT'S PADS LANDING IS ONE POLE OF A TWO-POLE ROTARY SHARED WITH THE
 * low-boost BOARD (SW_LO_BOOST there). `circuits/pultec/electrical/controls.ts` models
 * both under `LO_FREQUENCY_GANG`, and `docs/pultec/unresolved.md` calls
 * this pairing "the thing most likely to be broken by a well-meaning
 * refactor". Physicalization does not carry the gang across board boundaries
 * - each board sees only its own pole, valued `SW_Rotary` like any other - so
 * this landing is NOT an independent switch to buy: it is one physical
 * 6-position rotary whose other pole lives on the low-boost board, and the
 * two poles must always be wired to move together.
 */
import {
  designatorsFor,
  padOrdersFor,
  physicalizedBoard,
  sharedByFor,
  PASSIVE_PIN_NUMBERS,
} from "./parts.ts"
import { OFF_BOARD } from "../off-board.ts"
import type { Network } from "../../../lib/model/types.ts"

const CROSSING_NETS: readonly string[] = ["hi_boost_out", "out", "0"]

export function pultecLowCut(): Network {
  return physicalizedBoard("low-cut", CROSSING_NETS)
}

const BOARD = pultecLowCut()

export const DESIGNATORS = designatorsFor(BOARD)
export const PIN_NUMBERS = PASSIVE_PIN_NUMBERS
export const PAD_ORDER = padOrdersFor(BOARD)
export const OFF_BOARD_IDS: ReadonlySet<string> = new Set(
  BOARD.components.filter((c) => OFF_BOARD.has(c.id)).map((c) => c.id),
)
/** Crossing net -> the other boards that touch it, for the wiring guide. */
export const SHARED_BY = sharedByFor("low-cut", CROSSING_NETS)

/** Ground is physical-only here, so it has one member and is an intended open. */
export const DECLARED_OPENS: readonly string[] = ["0"]
