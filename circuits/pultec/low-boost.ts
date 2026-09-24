/**
 * The low boost section on stripboard.
 *
 * The Cboost bank and R2 are on the board; the 47K level pot and its selector
 * are panel-mount and appear as PADS landings. Net "0" is genuinely part of
 * this section's signal topology, so it has a second member on this board and
 * no singleton is declared.
 */
import { designatorsFor, padOrdersFor, physicalizedBoard, PASSIVE_PIN_NUMBERS } from "./parts.ts"
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
export const DECLARED_OPENS: readonly string[] = []
