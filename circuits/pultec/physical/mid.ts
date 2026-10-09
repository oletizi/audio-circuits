/**
 * The mid section on stripboard.
 *
 * The mid resistors and the per-tap capacitor banks are on the board; the
 * level pot, the two selectors and the tapped inductors are panel-mount /
 * off-board and appear as PADS landings.
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
 * stand-in groups between them touch all five junction nets, so `lo_boost_in`
 * and `out` - which this section's own circuit never names - carry real parts
 * rather than a lone junction pin. `DECLARED_OPENS` is empty as a consequence,
 * and the both-directions singleton test in
 * `tests/circuits/pultec-boards.test.ts` holds it that way.
 *
 * THAT EMPTINESS IS NOT A COMPLETENESS GUARD, and an earlier revision of this
 * comment claimed it was. Every junction net here carries between three and
 * fourteen pins, so losing a stand-in part - or a whole group - generally leaves
 * no singleton behind and would pass unnoticed. Group completeness is asserted
 * directly instead, over all five boards, in
 * `tests/pultec/scaffold-boards.test.ts`.
 *
 * THIS IS THE BUSIEST OF THE FIVE: 28 of its own components plus nine stand-in
 * parts and the junction's two rows. The other four boards carry more
 * scaffolding than this one precisely because mid's own group is the largest,
 * so mid is the section they most need standing in for.
 */
import { sharedByFor, PASSIVE_PIN_NUMBERS } from "./parts.ts"
import { sectionBoard } from "./board.ts"
import type { Network } from "../../../lib/model/types.ts"

const BOARD = sectionBoard("mid")

export function pultecMid(): Network {
  return BOARD.network
}

export const DESIGNATORS = BOARD.designators
export const PIN_NUMBERS = PASSIVE_PIN_NUMBERS
export const PAD_ORDER = BOARD.padOrders
export const OFF_BOARD_IDS: ReadonlySet<string> = BOARD.offBoardIds
/** Crossing net -> the other boards that touch it, for the wiring guide. */
export const SHARED_BY = sharedByFor("mid")

/** See the module comment: the maximal board has no singleton nets at all. */
export const DECLARED_OPENS: readonly string[] = []
