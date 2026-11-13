/**
 * The shared page tools (`draughting/pages/`, H7 pedal plan Task 4) read a board's declared tables
 * from `<board-dir>/repair/tools/`, and a board directory missing one is REFUSED, naming the file and
 * why it is not defaulted - never run as if the table were empty.
 *
 * Positive: the h7 module's own directory loads all three. Negative controls: a scratch copy of the
 * module's directory (named `h7-module`, so it reaches the module's model through
 * `boards/h7-module/perfboard.json`) with one table removed is refused by `tables.ts`, the first step of
 * `verify.sh` and `verify-root.sh`, and by the tool that reads that table, each naming the file.
 */
import { afterAll, expect, test } from "bun:test"
import { cpSync, mkdirSync, rmSync } from "node:fs"
import { join, resolve } from "node:path"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"

const ROOT = resolve(import.meta.dir, "..", "..")
const MODULE = join(ROOT, "drafted", "h7-platform", "h7-module")
const scratch = freshTempScratch("pages-tables-")
afterAll(cleanUpTempScratch)

function run(args: readonly string[]): { status: number; out: string } {
  const result = Bun.spawnSync(["bun", ...args], { cwd: ROOT, stdout: "pipe", stderr: "pipe" })
  return { status: result.exitCode, out: result.stdout.toString() + result.stderr.toString() }
}

/** A copy of the module's tables directory, under `<scratch>/<name>/h7-module`, without `missing`. */
function boardWithout(name: string, missing: string): string {
  const dir = join(scratch, name, "h7-module")
  mkdirSync(join(dir, "repair"), { recursive: true })
  cpSync(join(MODULE, "repair", "tools"), join(dir, "repair", "tools"), { recursive: true })
  rmSync(join(dir, "repair", "tools", missing))
  return dir
}

test("the module's own directory: tables.ts reads all three tables", () => {
  const { status, out } = run(["draughting/pages/tables.ts", MODULE])
  expect(out).toContain("tables.ts: h7-module's declared tables: 4 shared flag home(s), 25 cross-page driver(s), 1 ERC allowance(s)")
  expect(status).toBe(0)
})

for (const table of ["pwr-flag-homes.ts", "cross-page-drivers.ts", "erc-allowances.ts"]) {
  test(`a board directory without ${table} is refused by tables.ts, naming the file and why it is not defaulted`, () => {
    const dir = boardWithout(table.replace(".ts", ""), table)
    const { status, out } = run(["draughting/pages/tables.ts", dir])
    expect(status).not.toBe(0)
    expect(out).toContain(`${join(dir, "repair", "tools", table)} does not exist. ${table} is board h7-module's declared table of`)
    expect(out).toContain("It is not defaulted")
  })
}

test("without pwr-flag-homes.ts, the tool that reads it (flag-check.ts) refuses too, naming the file", () => {
  const dir = boardWithout("flag-check", "pwr-flag-homes.ts")
  const { status, out } = run(["draughting/pages/flag-check.ts", dir, "power", join(scratch, "unread.net"), "0"])
  expect(status).not.toBe(0)
  expect(out).toContain(`${join(dir, "repair", "tools", "pwr-flag-homes.ts")} does not exist`)
})

test("without erc-allowances.ts, the CLI the shell scripts run (erc-allowances.ts <board-dir> <out>) refuses, naming the file", () => {
  const dir = boardWithout("erc-allowances-cli", "erc-allowances.ts")
  const { status, out } = run(["draughting/pages/erc-allowances.ts", dir, join(scratch, "unwritten.json")])
  expect(status).not.toBe(0)
  expect(out).toContain(`${join(dir, "repair", "tools", "erc-allowances.ts")} does not exist. erc-allowances.ts is board h7-module's declared table of`)
  expect(out).toContain("It is not defaulted")
})

test("a directory with no boards/<name>/perfboard.json is refused, naming the declaration", () => {
  const dir = join(scratch, "no-board", "not-a-board")
  mkdirSync(dir, { recursive: true })
  const { status, out } = run(["draughting/pages/tables.ts", dir])
  expect(status).not.toBe(0)
  expect(out).toContain(join(ROOT, "boards", "not-a-board", "perfboard.json"))
})
