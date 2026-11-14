/**
 * GRADE A BOARD AGAINST ITS INTENT, THROUGH A RESOLVE THAT CANNOT BE SKIPPED.
 *
 * The engine's grader takes the board and the resolved intent as two separate
 * arguments and does not check that they belong together:
 * `check_floorplan.py <board> --intent <resolved>` reads the zone rects and the
 * keepout circles out of that file and never re-derives them from the board. A
 * resolved intent left on disk from before an outline change therefore grades
 * the OLD rectangle against the NEW board and can report a pass - the exact
 * staleness the approved intent's fraction construct exists to prevent,
 * reintroduced one level down where nothing was looking for it.
 *
 * **THE ENGINE IS PINNED AND NOT OURS TO CHANGE, so the binding is on this
 * side**, in two parts that are both needed:
 *
 *  1. `./resolved-intent.ts` stamps every resolved file with the outline, the
 *     declared size and a **sha256 of the board's bytes**, and
 *     `verifyResolvedIntent` refuses a mismatch. That makes a stale file
 *     detectable.
 *  2. This CLI resolves FIRST and grades second, in one command, so the stale
 *     file cannot be the one that gets used. That makes it unreachable rather
 *     than merely detectable - and `make grade-pt2399-core` is the documented
 *     grading path for that reason.
 *
 * **WHAT REMAINS UNGUARDED, said plainly rather than implied:** running
 * `check_floorplan.py` by hand against a resolved file nobody re-resolved. The
 * digest makes that checkable - `bun tools/pcb/grade-cli.ts` is one command and
 * `verifyResolvedIntent` is exported for anyone driving the engine themselves -
 * but nothing can stop a hand-run of a third-party tool, and this file does not
 * pretend to.
 */
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { builtCommit, engineDir, engineEnv, venvPython } from "../krt/acquire.ts"
import { resolveToFile, verifyResolvedIntent } from "./resolved-intent.ts"

export const GRADER = "py_tools/check_floorplan.py"

/** Exit codes `check_floorplan.py` documents, so a caller can tell them apart. */
export const GRADER_EXITS: Readonly<Record<number, string>> = {
  0: "graded, no error-severity violations",
  1: "the grader crashed",
  2: "argparse, or an unreadable intent file",
  3: "the board is not in a state the grader can work on",
  4: "graded successfully, error-severity violations found",
}

export interface GradeResult {
  readonly status: number | null
  readonly output: string
  readonly resolved: string
}

export function grade(
  repoRoot: string,
  boardPath: string,
  intentPath: string,
  rulesPath: string,
  outDir: string,
  extraArgs: readonly string[] = [],
): GradeResult {
  const python = venvPython(repoRoot)
  if (builtCommit(repoRoot) === undefined || !fs.existsSync(python)) {
    throw new Error(
      `the pinned routing engine is not built at ${engineDir(repoRoot)} (no stamp, or no venv ` +
        `interpreter at ${python}). Run \`make krt\`. This refuses rather than grading with ` +
        "something else: a grade is only worth the grader that produced it.",
    )
  }
  fs.mkdirSync(outDir, { recursive: true })
  const resolved = path.join(outDir, "resolved-intent.json")
  // RESOLVE FIRST, EVERY TIME. Not "if it is missing" and not "if it looks
  // stale": re-deriving it costs milliseconds, and a conditional resolve is how
  // the stale file survives.
  resolveToFile(boardPath, intentPath, resolved, rulesPath)
  // And then check the stamp anyway, so the one command that writes it also
  // proves the binding it just wrote.
  verifyResolvedIntent(resolved, boardPath)

  const result = spawnSync(
    python,
    [GRADER, boardPath, "--intent", resolved, "--require-rules", "1", ...extraArgs],
    { cwd: engineDir(repoRoot), encoding: "utf8", env: { ...engineEnv(process.env) } },
  )
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
    resolved,
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const [board, intent, rules, outDir] = args
  if (board === undefined || intent === undefined || rules === undefined || outDir === undefined) {
    throw new Error(
      "usage: bun tools/pcb/grade-cli.ts <board.kicad_pcb> <intent.json> <placement-rules.json> " +
        "<out-dir> [-- <extra grader args>]\n" +
        "  Resolves the intent against the board, verifies the binding, and grades. The resolve " +
        "is not optional: a resolved intent from before an outline change grades the wrong " +
        "rectangle and can report a pass.",
    )
  }
  const separator = args.indexOf("--")
  const extra = separator === -1 ? [] : args.slice(separator + 1)
  const repoRoot = path.resolve(import.meta.dir, "../..")
  const result = grade(repoRoot, board, intent, rules, outDir, extra)
  console.log(result.output.trimEnd())
  const meaning = result.status === null ? "the grader did not run" : GRADER_EXITS[result.status] ?? "unknown exit"
  console.log(`check_floorplan exit ${String(result.status)}: ${meaning}`)
  process.exit(result.status ?? 1)
}
