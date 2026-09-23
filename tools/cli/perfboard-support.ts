/**
 * Small helpers shared between `tools/cli/perfboard.ts` (the `check`,
 * `boards`, `board-info` and `veroroute` dispatch) and
 * `tools/cli/perfboard-binary-verbs.ts` (the `cuts`, `update`, `stripboard`
 * and `edit` dispatch). Split out so neither of those two files needs to
 * import the other just to reach `boardHere` or `reportLines`.
 */
import fs from "node:fs"
import path from "node:path"
import {
  discoverDeclarations, loadDeclaration, type PerfboardDeclaration,
} from "../perfboard/declaration.ts"

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * The report as veroroute wrote it, indented. Nothing is parsed, dropped,
 * reordered or summarized: the body is the only place the distinction between
 * exit-1 causes lives.
 */
export function reportLines(report: string): string[] {
  const body = report.endsWith("\n") ? report.slice(0, -1) : report
  if (body.trim() === "") return ["  (no report text was produced for this board)"]
  return body.split("\n").map((line) => `  ${line}`)
}

/** The declaration in `dir` if there is one, otherwise every one beneath it. */
export function targets(cwd: string): string[] {
  const here = path.join(cwd, "perfboard.json")
  const all = discoverDeclarations(cwd)
  return all.includes(here) ? [here] : all
}

/**
 * `targets` in a try/catch, for every call site.
 *
 * `discoverDeclarations` reads the filesystem (`fs.readdirSync`) with nothing
 * between it and this CLI's callers - a nonexistent `cwd` throws `ENOENT`
 * outside every other try/catch here, which would break `runCli`'s documented
 * `Promise<number>` contract exactly the way an unhandled `loadDeclaration`
 * throw once did. Returns `null` on failure after reporting it, so every verb
 * can treat "could not even look" the same as any other refusal: return 1,
 * never let the exception escape.
 */
export function safeTargets(cwd: string, error: (line: string) => void): string[] | null {
  try {
    return targets(cwd)
  } catch (caught) {
    error(`FAIL ${cwd}`)
    for (const line of reportLines(errorMessage(caught))) error(line)
    return null
  }
}

/**
 * Load exactly one declared board from `cwd`, for the verbs that act on one
 * board only, never a batch.
 *
 * `cuts`, `update`, `stripboard` and `edit` each shell out to (or rewrite) a
 * single `.vrt`; there is no sensible "run this over every board beneath me"
 * form of any of them, unlike `check`'s deliberate walk-down. A directory
 * that declares no board here refuses naming the verb, so the operator knows
 * to `cd` into the board rather than reading this as "not implemented."
 */
export function boardHere(
  cwd: string,
  verb: string,
  error: (line: string) => void,
): PerfboardDeclaration | null {
  const here = path.join(cwd, "perfboard.json")
  const files = safeTargets(cwd, error)
  if (files === null) return null
  if (!files.includes(here)) {
    error(
      `${cwd} declares no board. The "${verb}" verb acts on exactly one declared board, never a ` +
        "batch - run it from a directory holding a perfboard.json.",
    )
    return null
  }
  try {
    return loadDeclaration(here)
  } catch (caught) {
    error(`FAIL ${here}`)
    for (const line of reportLines(errorMessage(caught))) error(line)
    return null
  }
}

/** Parsed command-line flags shared by the four binary-backed verbs. */
export interface ParsedFlags {
  readonly allowDirty: boolean
  readonly strips: string | undefined
  readonly force: boolean
}

/**
 * Parse `args` against the flags a given verb allows, rejecting anything
 * else so a typo never silently does nothing.
 */
export function parseFlags(
  args: readonly string[],
  allowed: ReadonlySet<string>,
  error: (line: string) => void,
): ParsedFlags | null {
  let allowDirty = false
  let strips: string | undefined
  let force = false
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === "--allow-dirty" && allowed.has("--allow-dirty")) {
      allowDirty = true
      continue
    }
    if (arg === "--force" && allowed.has("--force")) {
      force = true
      continue
    }
    if (arg === "--strips" && allowed.has("--strips")) {
      const value = args[i + 1]
      // A missing value and a NEXT FLAG look the same at args[i + 1] === undefined,
      // but so does a next flag that just happens to be there: "--strips
      // --allow-dirty" must not silently consume "--allow-dirty" as the strip
      // direction, or the operator sees "invalid --strips value
      // \"--allow-dirty\"" instead of the much clearer "needs a value."
      if (value === undefined || value.startsWith("--")) {
        error('--strips needs a value: "horizontal" or "vertical".')
        return null
      }
      strips = value
      i += 1
      continue
    }
    error(`unknown flag "${arg}" for this verb. Run with --help to see the flags this verb accepts.`)
    return null
  }
  return { allowDirty, strips, force }
}

export function isStripsDirection(value: string): value is "horizontal" | "vertical" {
  return value === "horizontal" || value === "vertical"
}

const DIRECTORY_FLAGS = new Set(["-C", "--directory"])

/** `resolveDirectoryFlag`'s result: the effective cwd, and every argument that was not `-C`/`--directory` and its value. */
export interface DirectoryResolution {
  readonly cwd: string
  readonly rest: string[]
}

/**
 * Pull `-C <dir>` / `--directory <dir>` out of `argv`, wherever it appears,
 * and resolve it against `baseCwd`.
 *
 * `bun run <script>` chdirs to the package root before running the script -
 * bun's documented behaviour, not something a script can opt out of - which
 * breaks the documented invocation `cd boards/x && bun run perfboard
 * board-info`: the process is standing in the repo root by the time this
 * ever runs. `-C` is the escape hatch, spelled the same as make's own flag on
 * purpose: the spec forbids a `BOARD=<name>` indirection ("two ways to say
 * which board is two places for one fact to be wrong") but names `make -C`
 * as "the same mechanism driven from elsewhere, not a second one." This is a
 * PATH, never a board name - no lookup, no fuzzy matching, no search.
 *
 * Precedence between `-C` and `baseCwd` (production: `process.cwd()`; tests:
 * `RunCliOptions.cwd`): an explicit `-C`, when given, always wins as the
 * effective directory every verb treats as its context. `baseCwd` is only
 * the anchor a RELATIVE `-C` resolves against (`path.resolve` ignores it
 * entirely for an absolute `-C`) - it never competes with `-C` for the final
 * answer. That is what lets a test inject `cwd` as a stand-in for the repo
 * root `bun run` leaves the process in, and pass a relative `-C` under it,
 * reproducing the exact shape of the defect this flag exists to fix.
 *
 * Refuses - naming the path, never falling through to `baseCwd` - when `-C`
 * is missing its value, or names something that does not exist or is not a
 * directory. Silently acting on a different board than the one named is the
 * failure shape this whole tool exists to prevent.
 */
export function resolveDirectoryFlag(
  argv: readonly string[],
  baseCwd: string,
  error: (line: string) => void,
): DirectoryResolution | null {
  const rest: string[] = []
  let directory: string | undefined
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg !== undefined && DIRECTORY_FLAGS.has(arg)) {
      const value = argv[i + 1]
      if (value === undefined || DIRECTORY_FLAGS.has(value) || value.startsWith("--")) {
        error('-C/--directory needs a value: a path to the board or aggregate directory to act on.')
        return null
      }
      directory = value
      i += 1
      continue
    }
    if (arg !== undefined) rest.push(arg)
  }

  if (directory === undefined) return { cwd: baseCwd, rest }

  const resolved = path.resolve(baseCwd, directory)
  if (!fs.existsSync(resolved)) {
    error(
      `-C ${directory} names ${resolved}, which does not exist. Check the path - this refuses ` +
        "rather than falling back to the current directory, so it never silently acts on a different board.",
    )
    return null
  }
  if (!fs.statSync(resolved).isDirectory()) {
    error(`-C ${directory} names ${resolved}, which is not a directory. -C takes the path to a board or aggregate directory.`)
    return null
  }
  return { cwd: resolved, rest }
}
