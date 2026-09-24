/**
 * The hi boost section on stripboard.
 *
 * The Cboost bank and R3 (Qmax) are on the board; the tapped inductors, the
 * level and Q pots, and the selector are panel-mount / off-board and appear as
 * PADS landings. Ground is a chassis/shield landing here, so net "0" has no
 * other member on this board and that singleton is declared.
 */
import { designatorsFor, padOrdersFor, physicalizedBoard, PASSIVE_PIN_NUMBERS } from "./parts.ts"
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
/** Ground is physical-only here, so it has one member and is an intended open. */
export const DECLARED_OPENS: readonly string[] = ["0"]
