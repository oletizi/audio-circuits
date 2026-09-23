/**
 * Small helpers shared between `tools/cli/perfboard.ts` (the `check`,
 * `boards`, `board-info` and `veroroute` dispatch) and
 * `tools/cli/perfboard-binary-verbs.ts` (the `cuts`, `update`, `stripboard`
 * and `edit` dispatch). Split out so neither of those two files needs to
 * import the other just to reach `boardHere` or `reportLines`.
 */
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
