/**
 * The hi cut section on stripboard.
 *
 * The Ccut bank and the 430R series resistor are on the board; the 4K7 level
 * pot and its selector are panel-mount and appear as PADS landings. Ground is a
 * chassis/shield landing here, so net "0" has no other member on this board and
 * that singleton is declared.
 */
import { designatorsFor, padOrdersFor, physicalizedBoard, PASSIVE_PIN_NUMBERS } from "./parts.ts"
import { OFF_BOARD } from "../../reference/pultec/off-board.ts"
import type { Network } from "../../lib/model/types.ts"

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
/** Ground is physical-only here, so it has one member and is an intended open. */
export const DECLARED_OPENS: readonly string[] = ["0"]
