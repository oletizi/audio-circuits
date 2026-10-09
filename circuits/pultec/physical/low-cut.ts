/**
 * The low cut section on stripboard.
 *
 * Seven capacitors on the board; the 470K level pot and the six-position
 * selector are panel-mount and appear as PADS landings.
 *
 * THE EXPORTED NETWORK IS THE MAXIMAL ONE: this section's own parts, the
 * stand-in groups for all four other sections, and the junction. That is what
 * the VeroRoute layout is checked against, because the layout holds every
 * position and never varies - a build configures the board by populating those
 * positions or leaving them empty. See `circuits/pultec/physical/board.ts` for
 * the maximal-versus-configuration distinction, and `boardNetwork` there for
 * what a particular build realises.
 *
 * NO LADDER NET IS A SINGLETON ON THIS BOARD any more. Standalone, the four
 * stand-in groups between them touch all five junction nets, so `in` and
 * `lo_boost_in` - which this section's own circuit never names - carry real
 * parts rather than a lone junction pin. `DECLARED_OPENS` is empty as a
 * consequence, and that emptiness is an assertion rather than an absence: a
 * singleton reappearing means a group lost a part.
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
import { sharedByFor, PASSIVE_PIN_NUMBERS } from "./parts.ts"
import { sectionBoard } from "./board.ts"
import type { Network } from "../../../lib/model/types.ts"

const BOARD = sectionBoard("low-cut")

export function pultecLowCut(): Network {
  return BOARD.network
}

export const DESIGNATORS = BOARD.designators
export const PIN_NUMBERS = PASSIVE_PIN_NUMBERS
export const PAD_ORDER = BOARD.padOrders
export const OFF_BOARD_IDS: ReadonlySet<string> = BOARD.offBoardIds
/** Crossing net -> the other boards that touch it, for the wiring guide. */
export const SHARED_BY = sharedByFor("low-cut")

/** See the module comment: the maximal board has no singleton nets at all. */
export const DECLARED_OPENS: readonly string[] = []
