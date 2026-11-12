/**
 * The input side the two declared h7-module tables share: `erc-allowances.ts` (ERC_ALLOWANCES) and
 * `cross-page-drivers.ts` (CROSS_PAGE_DRIVERS). One copy of the JSON shape checks, the announced
 * test-override reader and the designator resolver, so a fix to how either table is read or held to
 * the model lands in both (H7 module plan, final review M6).
 *
 * THE TEST OVERRIDES. Each table can be replaced, for its controls in `./erc-control.sh`, by a JSON
 * file named in an environment variable; `overrideOr` announces that on stderr. Known limitation
 * (H7 module plan, Task 7b review): nothing refuses an override outside the controls, and the run's
 * closing verdict does not repeat it, so a run with one set passes on the stderr line alone. At the
 * module root, `root_erc.py`'s rule that the `.kicad_pro` exclusions equal the allowances bounds the
 * ERC table's effect. Refuse an override unless a control variable is also set, if one is ever left set.
 */
import { readFileSync } from "node:fs"
import { DESIGNATORS } from "../../../../../circuits/h7-platform/module-board.ts"

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** `entry[key]` as a non-empty string, or a refusal naming the key, the entry and what was there. */
export function requiredString(entry: Record<string, unknown>, key: string, where: string): string {
  const value = entry[key]
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${where}: "${key}" must be a non-empty string; got ${JSON.stringify(value)}`)
  }
  return value
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
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"))
  if (!Array.isArray(parsed)) throw new Error(`${env}=${file}: the table must be a JSON array of entries`)
  return parsed.map((entry: unknown, i): T => {
    const where = `${env}=${file}, entry ${i}`
    if (!isRecord(entry)) throw new Error(`${where}: not an object`)
    return parse(entry, where)
  })
}

/** The model id a reference designator names in `DESIGNATORS`, or the problem when it names not exactly one. */
export function componentIdFor(designator: string): { readonly id: string } | { readonly problem: string } {
  const ids = Object.entries(DESIGNATORS).filter(([, d]) => d === designator).map(([id]) => id)
  const id = ids[0]
  if (ids.length !== 1 || id === undefined) {
    return { problem: `designator ${designator} names ${ids.length} components in DESIGNATORS (module-board.ts); expected exactly one` }
  }
  return { id }
}
