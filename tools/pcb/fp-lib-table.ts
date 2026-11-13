/**
 * Resolve a KiCad footprint library NICKNAME to the directory holding its
 * `.kicad_mod` files, by reading `fp-lib-table` files the way KiCad does.
 *
 * A netlist names a footprint as `Nickname:Name`. The nickname is meaningless
 * without the table that defines it, and `pcbnew.FootprintLoad` takes a
 * DIRECTORY, not a nickname - so something has to do this lookup, and doing it
 * here keeps it in TypeScript where this repository's tests run.
 *
 * SEARCH ORDER, first definition winning, which is KiCad's own precedence:
 *   1. a project-local `fp-lib-table` beside the board
 *   2. the user table in KiCad's per-user configuration directory
 *
 * An entry whose `(type ...)` is `Table` is a NESTED TABLE - its `uri` names
 * another `fp-lib-table` to read in place of a library directory, and it is how
 * one line of user configuration can reach every installed library. NO COUNT OF
 * THEM BELONGS HERE: how many a machine resolves is a property of that machine,
 * and a figure in a comment is a transcription with a date on it.
 * `tests/pcb/update-from-schematic.test.ts` asserts that the end-to-end run
 * resolves some, which is the part that must not silently become zero.
 * Recursion is guarded by a visited set of REAL paths, so a table that includes
 * itself (directly or through a symlink) terminates instead of looping.
 *
 * This reader is GENERIC over the table's contents. It must not special-case,
 * depend on, or reproduce any particular entry: the user table here also names
 * libraries outside this repository, and a resolver that knew about them would
 * be a resolver that stops working on anybody else's machine.
 *
 * NOTHING HERE REFUSES. It returns what resolved and every table it looked in;
 * the refusals (`library-nickname`, `footprint-not-in-library`) belong to the
 * caller that knows which nickname it actually needs - see
 * `./update-from-schematic.ts`.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { attr, children, parseSexpr } from "../../lib/kicad/sexpr.ts"

/**
 * The variable KiCad 10 writes into a stock table entry's `uri` for the
 * installed footprint root. The DEFAULT is derived from the resolved
 * `kicad-cli` by `lib/kicad/install.ts`, never a literal here.
 */
export const FOOTPRINT_DIR_VAR = "KICAD10_FOOTPRINT_DIR"

/** KiCad's own name for "the directory holding the project", used in project-local tables. */
export const PROJECT_DIR_VAR = "KIPRJMOD"

export interface ResolvedLibraries {
  /** nickname -> the directory its `.kicad_mod` files live in. */
  readonly directories: Readonly<Record<string, string>>
  /** Every table path attempted, in order, nested tables included - what a refusal names. */
  readonly tablesSearched: readonly string[]
}

export interface ResolveOptions {
  /** The directory holding the board, for the project-local table and `KIPRJMOD`. */
  readonly projectDir: string
  /** The installed footprint root, for `KICAD10_FOOTPRINT_DIR` when the environment does not set it. */
  readonly footprintRoot: string
  readonly platform?: string
  readonly env?: Readonly<Record<string, string | undefined>>
  /** The user configuration directory holding `fp-lib-table`; defaults to the platform's own. */
  readonly userConfigDir?: string
}

/**
 * KiCad's per-user configuration directory for the 10.0 series. The darwin
 * entry is the one measured on this machine; the other two are KiCad's
 * documented locations and are **UNVERIFIED here**, in the same sense
 * `lib/kicad/install.ts` means it - no Linux or Windows machine has exercised
 * them. An unknown platform throws rather than guessing one.
 */
export function kicadUserConfigDir(
  platform: string = process.platform,
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  if (platform === "darwin") return path.join(os.homedir(), "Library", "Preferences", "kicad", "10.0")
  if (platform === "linux") {
    const base = env["XDG_CONFIG_HOME"] ?? path.join(os.homedir(), ".config")
    return path.join(base, "kicad", "10.0")
  }
  if (platform === "win32") {
    const appData = env["APPDATA"]
    if (appData === undefined) {
      throw new Error("APPDATA is not set, so KiCad's user configuration directory cannot be located on win32.")
    }
    return path.join(appData, "kicad", "10.0")
  }
  throw new Error(
    `no known KiCad user configuration directory for platform "${platform}" ` +
      "(tools/pcb/fp-lib-table.ts has no candidate for it).",
  )
}

/**
 * `uri` with `${VAR}` and `$(VAR)` expanded. `KICAD10_FOOTPRINT_DIR` and
 * `KIPRJMOD` have the defaults this run derived; any other variable is taken
 * from the environment and, when unset, LEFT UNEXPANDED - so the nickname it
 * belongs to fails to resolve loudly rather than resolving to a path with a
 * `$` in it.
 */
export function expandUri(uri: string, defaults: Readonly<Record<string, string>>, env: Readonly<Record<string, string | undefined>>): string {
  return uri.replace(/\$[{(]([A-Za-z0-9_]+)[})]/g, (whole, name: string) => env[name] ?? defaults[name] ?? whole)
}

function readTable(
  tablePath: string,
  directories: Record<string, string>,
  tablesSearched: string[],
  visited: Set<string>,
  defaults: Readonly<Record<string, string>>,
  env: Readonly<Record<string, string | undefined>>,
): void {
  tablesSearched.push(tablePath)
  if (!fs.existsSync(tablePath)) return
  const real = fs.realpathSync(tablePath)
  if (visited.has(real)) return
  visited.add(real)

  const table = parseSexpr(fs.readFileSync(tablePath, "utf8"))
  for (const lib of children(table, "lib")) {
    const name = attr(lib, "name")
    const rawUri = attr(lib, "uri")
    if (name === undefined || rawUri === undefined) continue
    const uri = expandUri(rawUri, defaults, env)
    if (attr(lib, "type") === "Table") {
      readTable(uri, directories, tablesSearched, visited, defaults, env)
      continue
    }
    // First definition wins: a project-local entry shadows the user table's.
    if (!(name in directories)) directories[name] = uri
  }
}

export function resolveFootprintLibraries(opts: ResolveOptions): ResolvedLibraries {
  const env = opts.env ?? process.env
  const defaults: Record<string, string> = {
    [FOOTPRINT_DIR_VAR]: opts.footprintRoot,
    [PROJECT_DIR_VAR]: opts.projectDir,
  }
  const userConfigDir = opts.userConfigDir ?? kicadUserConfigDir(opts.platform ?? process.platform, env)
  const directories: Record<string, string> = {}
  const tablesSearched: string[] = []
  const visited = new Set<string>()
  for (const candidate of [path.join(opts.projectDir, "fp-lib-table"), path.join(userConfigDir, "fp-lib-table")]) {
    readTable(candidate, directories, tablesSearched, visited, defaults, env)
  }
  return { directories, tablesSearched }
}
