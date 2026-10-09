/**
 * The hi cut section on stripboard.
 *
 * The Ccut bank and the 430R series resistor are on the board; the 4K7 level
 * pot and its selector are panel-mount and appear as PADS landings. Ground is a
 * chassis/shield landing here, but the junction's six ground pins mean "0" is
 * never a singleton regardless. `in` and `out` are: this board's own circuit
 * never names them, so the junction's one pin for each is the only member.
 *
 * SW_HI_CUT'S PADS LANDING IS ONE POLE OF A TWO-POLE ROTARY SHARED WITH THE
 * hi-boost BOARD (SW_HI_BOOST there). `circuits/pultec/electrical/controls.ts` models
 * both under `HI_FREQUENCY_GANG`, and `docs/pultec/unresolved.md` calls
 * this pairing "the thing most likely to be broken by a well-meaning
 * refactor". Physicalization does not carry the gang across board boundaries
 * - each board sees only its own pole, valued `SW_Rotary` like any other - so
 * this landing is NOT an independent switch to buy: it is one physical
 * 6-position rotary whose other pole lives on the hi-boost board, and the two
 * poles must always be wired to move together.
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

const CROSSING_NETS: readonly string[] = ["hi_boost_out", "lo_boost_in", "0"]

export function pultecHiCut(): Network {
  return physicalizedBoard("hi-cut", CROSSING_NETS)
}

const BOARD = pultecHiCut()

export const DESIGNATORS = designatorsFor(BOARD)
export const PIN_NUMBERS = PASSIVE_PIN_NUMBERS
export const PAD_ORDER = padOrdersFor(BOARD)
export const OFF_BOARD_IDS: ReadonlySet<string> = new Set(
  BOARD.components.filter((c) => OFF_BOARD.has(c.id)).map((c) => c.id),
)
/** Crossing net -> the other boards that touch it, for the wiring guide. */
export const SHARED_BY = sharedByFor("hi-cut")

/**
 * `in` and `out` are the ladder nets this board's own circuit does not touch -
 * the junction's single pin for each is their only member. Ground is NOT
 * here: the junction's six ground pins always outnumber one.
 */
export const DECLARED_OPENS: readonly string[] = ["in", "out"]
