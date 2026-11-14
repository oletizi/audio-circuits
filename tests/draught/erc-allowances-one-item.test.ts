/**
 * The one-item ERC allowance (`draughting/pages/erc-allowances.ts`, ONE_ITEM_TYPES; h7 pedal pages plan
 * Task 9c, ruling CR-PEDAL-CODEC-VIN-AWAITING-ERC, drafted, awaiting the controller).
 *
 * - The matcher (`erc_match.py`) excuses a one-item `pin_not_driven` violation only on exactly the
 *   allowance's pin: not another pin, not a two-item violation, not another sheet.
 * - The pedal's committed table passes the model check, and a one-item allowance naming a PWR_FLAG
 *   partner is refused.
 * - The staleness guard the pedal's table points at: every allowance under the ruling names a net still
 *   in `AWAITING_NETS`. When the task that builds adc_drv takes VINL and VINR out of that list, this
 *   fails, naming the allowance to delete.
 */
import { expect, test } from "bun:test"
import { join, resolve } from "node:path"
import { AWAITING_NETS } from "../../circuits/h7-platform/pedal-board.ts"
import { loadBoard } from "../../draughting/pages/board.ts"
import { checkErcAllowances, committedErcAllowances, type ErcAllowance } from "../../draughting/pages/erc-allowances.ts"
import { flagHomes } from "../../draughting/pages/flag-homes.ts"

const ROOT = resolve(import.meta.dir, "..", "..")
const PAGES = join(ROOT, "draughting", "pages")
const PEDAL = join(ROOT, "drafted", "h7-platform", "h7-pedal")
const RULING = "CR-PEDAL-CODEC-VIN-AWAITING-ERC"

const VINL: ErcAllowance = {
  ruling: "test", sheet: "/codec/", type: "pin_not_driven", pins: [{ designator: "U9", pin: "25" }],
  net: "VINL", symbolPinType: "input", source: "test",
}

function matches(path: string, items: readonly string[]): boolean {
  const violation = { type: "pin_not_driven", items: items.map((description) => ({ description })) }
  const code = [
    "import json, sys",
    "from erc_match import matches",
    "a, p, v = json.loads(sys.argv[1]), sys.argv[2], json.loads(sys.argv[3])",
    "print('yes' if matches(a, p, v) else 'no')",
  ].join("\n")
  const r = Bun.spawnSync(["python3", "-c", code, JSON.stringify(VINL), path, JSON.stringify(violation)],
    { cwd: PAGES, stdout: "pipe", stderr: "pipe" })
  if (r.exitCode !== 0) throw new Error(`erc_match.py failed: ${r.stderr.toString()}`)
  return r.stdout.toString().trim() === "yes"
}

test("a one-item allowance matches exactly its one pin on its sheet", () => {
  expect(matches("/codec/", ["Symbol U9 Pin 25 [V_{IN}L, Input, Line]"])).toBe(true)
})

test("control: another pin, a second item, or another sheet is not matched", () => {
  expect(matches("/codec/", ["Symbol U9 Pin 26 [V_{IN}R, Input, Line]"])).toBe(false)
  expect(matches("/codec/", ["Symbol U9 Pin 25 [V_{IN}L, Input, Line]", "Symbol U9 Pin 26 [V_{IN}R, Input, Line]"])).toBe(false)
  expect(matches("/codec_sup/", ["Symbol U9 Pin 25 [V_{IN}L, Input, Line]"])).toBe(false)
})

test("the pedal's committed table passes; a one-item PWR_FLAG partner is refused", async () => {
  const board = await loadBoard(PEDAL)
  const table = await committedErcAllowances(board)
  const homes = await flagHomes(board)
  expect(() => checkErcAllowances(table, board, homes)).not.toThrow()
  const flag: ErcAllowance = { ...VINL, net: "GND", pins: [{ designator: "PWR_FLAG", pin: "1" }] }
  expect(() => checkErcAllowances([flag], board, homes)).toThrow("a PWR_FLAG partner is one of two items")
})

test(`every ${RULING} allowance names a net still awaiting its driving block`, async () => {
  const table = await committedErcAllowances(await loadBoard(PEDAL))
  const awaiting = table.filter((e) => e.ruling === RULING)
  expect(awaiting.map((e) => e.net).sort()).toEqual(["VINL", "VINR"])
  for (const entry of awaiting) {
    if (!AWAITING_NETS.includes(entry.net)) {
      throw new Error(
        `${entry.net} is no longer in AWAITING_NETS (circuits/h7-platform/pedal-board.ts): its driving block is built, so delete ` +
          `its ${RULING} allowance from drafted/h7-platform/h7-pedal/repair/tools/erc-allowances.ts, and give it a cross-page ` +
          "driver entry if the codec page's ERC then reports it",
      )
    }
  }
})
