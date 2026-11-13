/**
 * The input side every board table shares: `pwr-flag-homes.ts`, `cross-page-drivers.ts` and
 * `erc-allowances.ts`, each in `<board-dir>/repair/tools/`. One copy of the JSON shape checks, the
 * table importer, the announced test-override reader and the designator resolver, so a fix to how
 * any table is read or held to the model lands in all of them (H7 module plan, final review M6).
 *
 * A MISSING TABLE REFUSES, naming the file and why it is not defaulted (`importTable`). An empty
 * table would be a claim - no net is flagged, no driver is off-page, no ERC error is excused - that
 * nobody made for that board.
 *
 * THE TEST OVERRIDES. The driver and allowance tables can each be replaced, for a board's negative
 * controls, by a JSON file named in an environment variable (`PAGES_CROSS_PAGE_DRIVERS_TABLE`,
 * `PAGES_ERC_ALLOWANCES_TABLE`); `overrideOr` announces that on stderr. The variable replaces a
 * table's CONTENTS for one run; it never names the board, which is always the command-line argument.
 * Known limitation (H7 module plan, Task 7b review): nothing refuses an override outside the
 * controls, and the run's closing verdict does not repeat it, so a run with one set passes on the
 * stderr line alone. At the root, `root_erc.py`'s rule that the `.kicad_pro` exclusions equal the
 * allowances bounds the ERC table's effect. Refuse an override unless a control variable is also
 * set, if one is ever left set.
 *
 * Moved from `drafted/h7-platform/h7-module/repair/tools/table-input.ts` (H7 pedal plan Task 4).
 */
import fs from "node:fs"
import path from "node:path"
import { isRecord } from "../../lib/guards.ts"
import type { PageBoard } from "./board.ts"

export { isRecord }

/** `entry[key]` as a non-empty string, or a refusal naming the key, the entry and what was there. */
export function requiredString(entry: Record<string, unknown>, key: string, where: string): string {
  const value = entry[key]
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${where}: "${key}" must be a non-empty string; got ${JSON.stringify(value)}`)
  }
  return value
}

/**
 * Import `<board-dir>/repair/tools/<file>`, refusing when it is absent, naming the file, what it
 * declares (`what`) and why it is not defaulted.
 */
export async function importTable(board: PageBoard, file: string, what: string): Promise<Record<string, unknown>> {
  const abs = path.join(board.tablesDir, file)
  if (!fs.existsSync(abs)) {
    throw new Error(
      `draughting/pages: ${abs} does not exist. ${file} is board ${board.name}'s declared table of ${what}; ` +
        "every board checked through draughting/pages declares its own, in <board-dir>/repair/tools/. It is not defaulted: " +
        "an empty table is a claim about the board that nobody made, and a page would pass or fail on it.",
    )
  }
  const module: unknown = await import(abs)
  if (!isRecord(module)) throw new Error(`draughting/pages: ${abs} did not load as a module`)
  return module
}

/** `module[key]`, refusing - naming the table file - when it is not exported. */
export function exported(module: Record<string, unknown>, key: string, board: PageBoard, file: string): unknown {
  const value = module[key]
  if (value === undefined) throw new Error(`draughting/pages: ${path.join(board.tablesDir, file)} exports no ${key}`)
  return value
}

/** Each entry of an exported array table, parsed by `parse` (given the entry and a `where` naming the file and index). */
export function parsedArray<T>(value: unknown, where: string, parse: (entry: Record<string, unknown>, where: string) => T): readonly T[] {
  if (!Array.isArray(value)) throw new Error(`${where}: the table must be an array of entries`)
  return value.map((entry: unknown, i): T => {
    const at = `${where}, entry ${i}`
    if (!isRecord(entry)) throw new Error(`${at}: not an object`)
    return parse(entry, at)
  })
}

/**
 * The committed table, or, when `env` names a JSON file, that file's entries, each parsed by `parse`
 * (given the entry as a record and a `where` naming the file and index). Announced on stderr as a
 * TEST OVERRIDE, by `tool`, so a control can require that the override was read.
 */
export function overrideOr<T>(
  env: string,
  committed: readonly T[],
  tool: string,
  committedName: string,
  parse: (entry: Record<string, unknown>, where: string) => T,
): readonly T[] {
  const file = process.env[env]
  if (file === undefined || file === "") return committed
  console.error(`${tool}: TEST OVERRIDE - the table is read from ${file}, not the committed ${committedName}`)
  const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"))
  if (!Array.isArray(parsed)) throw new Error(`${env}=${file}: the table must be a JSON array of entries`)
  return parsedArray(parsed, `${env}=${file}`, parse)
}

/** The model id a reference designator names in the board's `DESIGNATORS`, or the problem when it names not exactly one. */
export function componentIdFor(board: PageBoard, designator: string): { readonly id: string } | { readonly problem: string } {
  const ids = Object.entries(board.designators).filter(([, d]) => d === designator).map(([id]) => id)
  const id = ids[0]
  if (ids.length !== 1 || id === undefined) {
    return { problem: `designator ${designator} names ${ids.length} components in DESIGNATORS (${path.basename(board.circuitRel)}); expected exactly one` }
  }
  return { id }
}
