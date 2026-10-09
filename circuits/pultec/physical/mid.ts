/**
 * The mid section on stripboard.
 *
 * The mid resistors and the per-tap capacitor banks are on the board; the
 * level pot, the two selectors and the tapped inductors are panel-mount /
 * off-board and appear as PADS landings. Net "0" is genuinely part of this
 * section's signal topology, and the junction adds six more ground pins
 * regardless, so "0" is never a singleton. `lo_boost_in` and `out` are: this
 * board's own circuit never names them, so the junction's one pin for each is
 * the only member.
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

const CROSSING_NETS: readonly string[] = ["hi_boost_out", "in", "0"]

export function pultecMid(): Network {
  return physicalizedBoard("mid", CROSSING_NETS)
}

const BOARD = pultecMid()

export const DESIGNATORS = designatorsFor(BOARD)
export const PIN_NUMBERS = PASSIVE_PIN_NUMBERS
export const PAD_ORDER = padOrdersFor(BOARD)
export const OFF_BOARD_IDS: ReadonlySet<string> = new Set(
  BOARD.components.filter((c) => OFF_BOARD.has(c.id)).map((c) => c.id),
)
/** Crossing net -> the other boards that touch it, for the wiring guide. */
export const SHARED_BY = sharedByFor("mid")

/**
 * `lo_boost_in` and `out` are the ladder nets this board's own circuit does
 * not touch - the junction's single pin for each is their only member.
 */
export const DECLARED_OPENS: readonly string[] = ["lo_boost_in", "out"]
