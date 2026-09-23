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
import fs from "node:fs"
import path from "node:path"
import { isMain } from "./entrypoint.ts"
import { checkPerfboard, type PerfboardResult, type Env } from "../perfboard/check.ts"
import {
  boardName, discoverDeclarations, loadDeclaration, type PerfboardDeclaration,
} from "../perfboard/declaration.ts"
import {
  readPin as defaultReadPin,
  resolveBinary as defaultResolveBinary,
  acquire as defaultAcquire,
  type Pin,
  type BinaryResolution,
  type AcquireOptions,
} from "../perfboard/acquire.ts"
import {
  runCuts, runUpdate, runStripboard, runEdit, type VerbDeps,
} from "../perfboard/verbs.ts"

const VERBS = [
  ["check", "check this layout against the circuit it was built from"],
  ["cuts", "print the cut list and solder bridges"],
  ["update", "apply the circuit to this layout, in place"],
  ["stripboard", "convert this layout to strip mode, in place"],
  ["edit", "open this layout in the forked VeroRoute"],
  ["board-info", "what this directory declares"],
  ["boards", "every declared board under this directory"],
  ["veroroute", "acquire the pinned VeroRoute fork (a no-op if already built)"],
] as const

const USAGE = [
  "perfboard - keep a hand-built stripboard layout in step with its circuit.",
  "",
  "Usage: bun run perfboard <verb> [flags]",
  "",
  "The directory you are standing in is the context: run a verb inside a board's",
  "directory to act on that board, or higher up to walk down to every board.",
  "cuts, update, stripboard and edit act on exactly one declared board, never a",
  "batch: run them from that board's directory.",
  "",
  "Verbs:",
  ...VERBS.map(([name, description]) => `  ${name.padEnd(12)} ${description}`),
  "",
  "Flags:",
  "  --allow-dirty            update, stripboard: accept that this write cannot",
  "                           be undone through git.",
  "  --strips horizontal|vertical",
  "                           stripboard: which way the strips run. There is no",
  "                           default; it is a fact about the board in hand.",
  "  --force                  veroroute: rebuild even if a binary already exists",
  "                           at the resolved path.",
  "",
  "Environment:",
  "  VEROROUTE    the binary built from the perfboard fork. A check that cannot",
  "               find it stops the run naming the variable, rather than passing",
  "               a board nothing was run against. Set it to your own checkout",
  "               to skip acquisition entirely, or leave it unset and run the",
  "               \"veroroute\" verb to build the pinned one under .tools/.",
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
  /** Injected so `cuts`, `update`, `stripboard` and `edit` never touch a real spawn or git checkout in tests. */
  readonly verbDeps?: VerbDeps
  /** Injected so `veroroute` never reads the real process environment in tests. */
  readonly env?: Env
  /** Injected so `veroroute` never resolves against this repository's own root in tests. */
  readonly repoRoot?: string
  /** Injected so `veroroute` never reads a real veroroute.pin in tests. */
  readonly readPin?: (file: string) => Pin
  /** Injected so `veroroute` never touches the real filesystem layout in tests. */
  readonly resolveBinary?: (env: Env, repoRoot: string) => BinaryResolution
  /** Injected so `veroroute` never checks the real filesystem for a binary in tests. */
  readonly binaryExists?: (binaryPath: string) => boolean
  /** Injected so no test ever clones or builds the real fork. */
  readonly acquire?: (pin: Pin, opts: AcquireOptions) => string
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
function safeTargets(cwd: string, error: (line: string) => void): string[] | null {
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
function boardHere(
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
interface ParsedFlags {
  readonly allowDirty: boolean
  readonly strips: string | undefined
  readonly force: boolean
}

/**
 * Parse `args` against the flags a given verb allows, rejecting anything
 * else so a typo never silently does nothing.
 */
function parseFlags(
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
      if (value === undefined) {
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

function isStripsDirection(value: string): value is "horizontal" | "vertical" {
  return value === "horizontal" || value === "vertical"
}

/** This repository's own root, derived from where this module lives on disk. */
function moduleRepoRoot(): string {
  const moduleDir = path.dirname(new URL(import.meta.url).pathname)
  return path.resolve(moduleDir, "..", "..")
}

const PIN_FILE_NAME = "veroroute.pin"

interface VerorouteDeps {
  readonly readPin: (file: string) => Pin
  readonly resolveBinary: (env: Env, repoRoot: string) => BinaryResolution
  readonly binaryExists: (binaryPath: string) => boolean
  readonly acquire: (pin: Pin, opts: AcquireOptions) => string
}

/**
 * Acquire (or report) the pinned VeroRoute fork.
 *
 * `acquire()` is NOT idempotent - it re-runs checkout, qmake and make on
 * every call, skipping only the clone, and a Qt5 build takes many minutes.
 * So this checks whether a binary already exists at the resolved path
 * FIRST, and only builds when there is none (or `--force` was passed). When
 * `VEROROUTE` points at the operator's own checkout ("explicit" mode), this
 * never acquires at all: that is a build this tool does not own, and cloning
 * or rebuilding over it would be this tool destroying work that is not its
 * to destroy.
 */
function dispatchVeroroute(
  repoRoot: string,
  env: Env,
  force: boolean,
  deps: VerorouteDeps,
  log: (line: string) => void,
  error: (line: string) => void,
): number {
  try {
    const resolution = deps.resolveBinary(env, repoRoot)

    if (resolution.mode === "explicit") {
      log(
        `${resolution.path} (VEROROUTE is set, so acquisition was skipped: this points at your own ` +
          "checkout, and this tool will not clone or rebuild over work it does not own.)",
      )
      return 0
    }

    const pin = deps.readPin(path.join(repoRoot, PIN_FILE_NAME))

    if (!force && deps.binaryExists(resolution.path)) {
      log(`${resolution.path} (already built, pinned at commit ${pin.commit})`)
      return 0
    }

    const builtPath = deps.acquire(pin, { repoRoot })
    log(`${builtPath} (built from ${pin.repo} at commit ${pin.commit})`)
    return 0
  } catch (caught) {
    error(`FAIL veroroute`)
    for (const line of reportLines(errorMessage(caught))) error(line)
    return 1
  }
}

async function runCheck(
  cwd: string,
  check: (declaration: PerfboardDeclaration) => Promise<PerfboardResult>,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  const files = safeTargets(cwd, error)
  if (files === null) return 1
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
    const files = safeTargets(cwd, error)
    if (files === null) return 1
    if (files.length === 0) {
      error(`no perfboard.json found in or under ${cwd}`)
      return 1
    }
    let failed = false
    for (const file of files) {
      try {
        log(boardName(loadDeclaration(file)))
      } catch (caught) {
        failed = true
        error(`FAIL ${file}`)
        for (const line of reportLines(errorMessage(caught))) error(line)
      }
    }
    return failed ? 1 : 0
  }

  if (verb === "board-info") {
    const here = path.join(cwd, "perfboard.json")
    const files = safeTargets(cwd, error)
    if (files === null) return 1
    if (!files.includes(here)) {
      error(`${cwd} declares no board. Run this from a directory holding a perfboard.json.`)
      return 1
    }
    let declaration: PerfboardDeclaration
    try {
      declaration = loadDeclaration(here)
    } catch (caught) {
      error(`FAIL ${here}`)
      for (const line of reportLines(errorMessage(caught))) error(line)
      return 1
    }
    log(`board:   ${boardName(declaration)}`)
    log(`circuit: ${declaration.circuitPath} (${declaration.exportName})`)
    log(`layout:  ${declaration.vrtPath}`)
    return 0
  }

  if (verb === "cuts") {
    if (parseFlags(argv.slice(1), new Set(), error) === null) return 1
    const declaration = boardHere(cwd, verb, error)
    if (declaration === null) return 1
    try {
      log(runCuts(declaration, opts.verbDeps ?? {}))
      return 0
    } catch (caught) {
      error(`FAIL ${declaration.vrtPath}`)
      for (const line of reportLines(errorMessage(caught))) error(line)
      return 1
    }
  }

  if (verb === "edit") {
    if (parseFlags(argv.slice(1), new Set(), error) === null) return 1
    const declaration = boardHere(cwd, verb, error)
    if (declaration === null) return 1
    try {
      log(runEdit(declaration, opts.verbDeps ?? {}))
      return 0
    } catch (caught) {
      error(`FAIL ${declaration.vrtPath}`)
      for (const line of reportLines(errorMessage(caught))) error(line)
      return 1
    }
  }

  if (verb === "update") {
    const flags = parseFlags(argv.slice(1), new Set(["--allow-dirty"]), error)
    if (flags === null) return 1
    const declaration = boardHere(cwd, verb, error)
    if (declaration === null) return 1
    try {
      log(await runUpdate(declaration, { allowDirty: flags.allowDirty }, opts.verbDeps ?? {}))
      return 0
    } catch (caught) {
      error(`FAIL ${declaration.vrtPath}`)
      for (const line of reportLines(errorMessage(caught))) error(line)
      return 1
    }
  }

  if (verb === "stripboard") {
    const flags = parseFlags(argv.slice(1), new Set(["--allow-dirty", "--strips"]), error)
    if (flags === null) return 1
    const declaration = boardHere(cwd, verb, error)
    if (declaration === null) return 1

    let strips: "horizontal" | "vertical" | undefined
    if (flags.strips !== undefined) {
      if (!isStripsDirection(flags.strips)) {
        error(`invalid --strips value "${flags.strips}"; must be "horizontal" or "vertical".`)
        return 1
      }
      strips = flags.strips
    }

    try {
      log(await runStripboard(declaration, { strips, allowDirty: flags.allowDirty }, opts.verbDeps ?? {}))
      return 0
    } catch (caught) {
      error(`FAIL ${declaration.vrtPath}`)
      for (const line of reportLines(errorMessage(caught))) error(line)
      return 1
    }
  }

  if (verb === "veroroute") {
    const flags = parseFlags(argv.slice(1), new Set(["--force"]), error)
    if (flags === null) return 1
    const env = opts.env ?? process.env
    const repoRoot = opts.repoRoot ?? moduleRepoRoot()
    return dispatchVeroroute(
      repoRoot,
      env,
      flags.force,
      {
        readPin: opts.readPin ?? defaultReadPin,
        resolveBinary: opts.resolveBinary ?? defaultResolveBinary,
        binaryExists: opts.binaryExists ?? ((binaryPath: string) => fs.existsSync(binaryPath)),
        acquire: opts.acquire ?? defaultAcquire,
      },
      log,
      error,
    )
  }

  error(`unknown verb "${verb}". Run with --help to see the verbs.`)
  return 1
}

if (isMain(import.meta.url)) {
  process.exit(await runCli(process.argv.slice(2)))
}
