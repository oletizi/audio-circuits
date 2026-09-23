/**
 * The perfboard verbs.
 *
 * THE DIRECTORY YOU ARE STANDING IN IS THE CONTEXT. A directory holding a
 * perfboard.json is a BOARD and the verbs act on it; any other directory is an
 * aggregate and `check` walks down from there. There is deliberately no
 * BOARD=<name> flag: two ways to say which board is two places for one fact to
 * be wrong. To act on a board from elsewhere, cd to it.
 *
 * WHAT WRITES: `check`, `cuts`, `board-info` and `boards` write nothing.
 * `update` and `stripboard` write the declared layout IN PLACE, because git is
 * the undo and a verb that wrote a copy somewhere else and told you to move it
 * into position would hand you the one step that can go wrong.
 */
import path from "node:path"
import { isMain } from "./entrypoint.ts"
import { checkPerfboard, type PerfboardResult } from "../perfboard/check.ts"
import {
  boardName, discoverDeclarations, loadDeclaration, type PerfboardDeclaration,
} from "../perfboard/declaration.ts"

const VERBS = [
  ["check", "check this layout against the circuit it was built from"],
  ["cuts", "print the cut list and solder bridges"],
  ["update", "apply the circuit to this layout, in place"],
  ["stripboard", "convert this layout to strip mode, in place"],
  ["edit", "open this layout in the forked VeroRoute"],
  ["board-info", "what this directory declares"],
  ["boards", "every declared board under this directory"],
  ["veroroute", "acquire and build the pinned VeroRoute fork"],
] as const

const USAGE = [
  "perfboard - keep a hand-built stripboard layout in step with its circuit.",
  "",
  "Usage: bun run perfboard <verb>",
  "",
  "The directory you are standing in is the context: run a verb inside a board's",
  "directory to act on that board, or higher up to walk down to every board.",
  "",
  "Verbs:",
  ...VERBS.map(([name, description]) => `  ${name.padEnd(12)} ${description}`),
  "",
  "Environment:",
  "  VEROROUTE    the binary built from the perfboard fork. A check that cannot",
  "               find it stops the run naming the variable, rather than passing",
  "               a board nothing was run against.",
  "",
  "Exit codes:",
  "  0  every declared layout checked clean (or --help was given)",
  "  1  an unknown verb, or a layout that was not shown to be in sync. A board",
  "     that could not be checked at all is a failure here and never a skip.",
].join("\n")

export interface RunCliOptions {
  readonly cwd?: string
  readonly log?: (line: string) => void
  readonly error?: (line: string) => void
  /** Injected so the CLI is testable without a veroroute binary. */
  readonly check?: (declaration: PerfboardDeclaration) => Promise<PerfboardResult>
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * The report as veroroute wrote it, indented. Nothing is parsed, dropped,
 * reordered or summarized: the body is the only place the distinction between
 * exit-1 causes lives.
 */
function reportLines(report: string): string[] {
  const body = report.endsWith("\n") ? report.slice(0, -1) : report
  if (body.trim() === "") return ["  (no report text was produced for this board)"]
  return body.split("\n").map((line) => `  ${line}`)
}

/** The declaration in `dir` if there is one, otherwise every one beneath it. */
function targets(cwd: string): string[] {
  const here = path.join(cwd, "perfboard.json")
  const all = discoverDeclarations(cwd)
  return all.includes(here) ? [here] : all
}

async function runCheck(
  cwd: string,
  check: (declaration: PerfboardDeclaration) => Promise<PerfboardResult>,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  const files = targets(cwd)
  if (files.length === 0) {
    // NOT exit 0. A discovery that finds nothing and succeeds is a gate that is
    // permanently green while looking exactly like a passing one.
    error(`no perfboard.json found in or under ${cwd}; nothing was checked.`)
    return 1
  }

  let failed = false
  for (const file of files) {
    let declaration: PerfboardDeclaration | null = null
    let result: PerfboardResult
    try {
      declaration = loadDeclaration(file)
      result = await check(declaration)
    } catch (caught) {
      failed = true
      // A failing check names the layout; a failing load has no layout path to
      // name, because reading one out of the declaration is what just failed.
      error(`FAIL ${declaration === null ? file : declaration.vrtPath}`)
      for (const line of reportLines(errorMessage(caught))) error(line)
      continue
    }
    if (result.ok) {
      log(`ok ${result.declaration.vrtPath}`)
      continue
    }
    failed = true
    error(`FAIL ${result.declaration.vrtPath}`)
    for (const line of reportLines(result.report)) error(line)
  }
  return failed ? 1 : 0
}

export async function runCli(argv: string[], opts: RunCliOptions = {}): Promise<number> {
  const cwd = opts.cwd ?? process.cwd()
  const log = opts.log ?? ((line: string) => console.log(line))
  const error = opts.error ?? ((line: string) => console.error(line))
  const check = opts.check ?? ((declaration: PerfboardDeclaration) => checkPerfboard(declaration))

  const verb = argv[0]
  if (verb === undefined || verb === "--help" || verb === "-h" || verb === "help") {
    log(USAGE)
    return 0
  }

  if (verb === "check") return runCheck(cwd, check, log, error)

  if (verb === "boards") {
    const files = targets(cwd)
    if (files.length === 0) {
      error(`no perfboard.json found in or under ${cwd}`)
      return 1
    }
    for (const file of files) log(boardName(loadDeclaration(file)))
    return 0
  }

  if (verb === "board-info") {
    const here = path.join(cwd, "perfboard.json")
    if (!targets(cwd).includes(here)) {
      error(`${cwd} declares no board. Run this from a directory holding a perfboard.json.`)
      return 1
    }
    const declaration = loadDeclaration(here)
    log(`board:   ${boardName(declaration)}`)
    log(`circuit: ${declaration.circuitPath} (${declaration.exportName})`)
    log(`layout:  ${declaration.vrtPath}`)
    return 0
  }

  if (VERBS.some(([name]) => name === verb)) {
    error(
      `the "${verb}" verb needs the VeroRoute fork and is not wired up yet. ` +
        "It arrives with the fork acquisition.",
    )
    return 1
  }

  error(`unknown verb "${verb}". Run with --help to see the verbs.`)
  return 1
}

if (isMain(import.meta.url)) {
  process.exit(await runCli(process.argv.slice(2)))
}
