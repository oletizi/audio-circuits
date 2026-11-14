/**
 * `draughting/pages/erc-allowances.ts` refuses an allowance whose `PWR_FLAG` partner sits on a net with
 * no declared flag home: no flag is on that net to be the partner (h7 pedal pages plan Task 9b, fix
 * round 1, review M2). The pedal's committed allowance (CR-PEDAL-LM66100-ST-ERC, GND) passes with the
 * board's committed flag homes, and the same allowance is refused when the homes lack GND.
 */
import { expect, test } from "bun:test"
import { join, resolve } from "node:path"
import { loadBoard } from "../../draughting/pages/board.ts"
import { checkErcAllowances, committedErcAllowances, isRootLabelAllowance } from "../../draughting/pages/erc-allowances.ts"
import { flagHomes } from "../../draughting/pages/flag-homes.ts"

const PEDAL = join(resolve(import.meta.dir, "..", ".."), "drafted", "h7-platform", "h7-pedal")

test("the pedal's PWR_FLAG-partner allowance passes with GND's flag home and is refused without it", async () => {
  const board = await loadBoard(PEDAL)
  const table = await committedErcAllowances(board)
  const homes = await flagHomes(board)
  expect(table.some((e) => !isRootLabelAllowance(e) && e.pins.some((p) => p.designator === "PWR_FLAG") && e.net === "GND")).toBe(true)
  expect(() => checkErcAllowances(table, board, homes)).not.toThrow()
  const shared = Object.fromEntries(Object.entries(homes.shared).filter(([net]) => net !== "GND"))
  expect(() => checkErcAllowances(table, board, { ...homes, shared })).toThrow(
    "net GND has no declared PWR_FLAG home in pwr-flag-homes.ts, so no flag on it can be the PWR_FLAG partner",
  )
})
