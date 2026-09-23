/**
 * The perfboard verbs.
 *
 * THE DIRECTORY YOU ARE STANDING IN IS THE CONTEXT. A directory holding a
 * perfboard.json is a BOARD and the verbs act on it; any other directory is an
 * aggregate and `check` walks down from there. There is deliberately no
 * BOARD=<name> flag: two ways to say which board is two places for one fact to
 * be wrong. To act on a board from elsewhere, cd to it - or, when that is not
 * possible (`bun run` chdirs to the package root before running any script,
 * so `cd boards/x && bun run perfboard board-info` never sees boards/x), pass
 * `-C <dir>`. That is a PATH, not a second way to name a board: see
 * `resolveDirectoryFlag` in `./perfboard-support.ts`.
 *
 * WHAT WRITES: `check`, `cuts`, `board-info` and `boards` write nothing.
 * `update` and `stripboard` write the declared layout IN PLACE, because git is
 * the undo and a verb that wrote a copy somewhere else and told you to move it
 * into position would hand you the one step that can go wrong.
 *
 * `cuts`, `update`, `stripboard`, `edit` and `veroroute` dispatch through
 * `./perfboard-binary-verbs.ts` - the coherent, binary-backed half of this
 * CLI, split out to keep this file under the repository's size ceiling.
 */
import path from "node:path"
import { isMain } from "./entrypoint.ts"
import { checkPerfboard, type PerfboardResult, type Env } from "../perfboard/check.ts"
import {
  boardName, loadDeclaration, type PerfboardDeclaration,
} from "../perfboard/declaration.ts"
import {
  readPin as defaultReadPin,
  resolveBinary as defaultResolveBinary,
  acquire as defaultAcquire,
  type Pin,
  type BinaryResolution,
  type AcquireOptions,
} from "../perfboard/acquire.ts"
import type { VerbDeps } from "../perfboard/verbs.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { errorMessage, reportLines, resolveDirectoryFlag, safeTargets } from "./perfboard-support.ts"
import {
  dispatchCuts, dispatchEdit, dispatchUpdate, dispatchStripboard, dispatchVerorouteVerb,
  defaultBinaryExists,
} from "./perfboard-binary-verbs.ts"
import { dispatchNetlistSync } from "./perfboard-netlist-verb.ts"
import type { NetlistSyncDeps } from "../perfboard/netlist-sync.ts"
import { schematicNoticeLines } from "../perfboard/schematic-notice.ts"

const VERBS = [
  ["check", "check this layout against the circuit it was built from"],
  ["cuts", "print the cut list and solder bridges"],
  ["update", "apply the circuit to this layout, in place"],
  ["stripboard", "convert this layout to strip mode, in place"],
  ["edit", "open this layout in the forked VeroRoute"],
  ["board-info", "what this directory declares"],
  ["boards", "every declared board under this directory"],
  ["veroroute", "acquire the pinned VeroRoute fork (a no-op if already built)"],
  ["netlist-sync", "regenerate a netlist export and reconcile it with its fixture (used by make)"],
  ["schematic-notice", "print the no-schematic-declared notice (used by make)"],
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
  "`bun run perfboard` runs from the REPOSITORY ROOT, not the directory you",
  "typed it in: `bun run <script>` chdirs there before running anything, for",
  "every package.json script. `cd boards/x && bun run perfboard board-info`",
  "therefore acts on the repo root, not boards/x. Direct invocation",
  '(`bun tools/cli/perfboard.ts board-info`) genuinely runs from where you',
  "stand; through bun run, use -C to say where from:",
  "",
  "  bun run perfboard -C boards/pt2399-core board-info",
  "",
  "Verbs:",
  ...VERBS.map(([name, description]) => `  ${name.padEnd(12)} ${description}`),
  "",
  "Flags:",
  "  -C <dir>, --directory <dir>",
  "                           act as though standing in <dir> instead of the",
  "                           process's own directory. A path, never a board",
  "                           name - there is deliberately no BOARD=<name>",
  "                           lookup. Refuses if <dir> does not exist or is not",
  "                           a directory, rather than falling back to cwd.",
  "  --allow-dirty            update, stripboard: accept that this write cannot",
  "                           be undone through git.",
  "  --strips horizontal|vertical",
  "                           stripboard: which way the strips run. There is no",
  "                           default; it is a fact about the board in hand.",
  "  --paths                  boards: print each declared board's own directory",
  "                           instead of its name, for a caller that acts on",
  "                           every discovered board (e.g. `make -C <dir>`).",
  "  --force                  veroroute: rebuild even if a binary already exists",
  "                           at the resolved path.",
  "  --sch, --netlist, --kicad-cli <path>",
  "                           netlist-sync: the resolved schematic, netlist fixture and kicad-cli",
  "                           paths. make/board.mk passes all three - this verb never re-derives",
  "                           them from a directory, so it is not meant to be typed by hand.",
  "  --field sch|netlist      board-info: print only that resolved path (or an",
  "                           empty line if it was not declared), for scripts.",
  "",
  "Environment:",
  "  This tool needs no configuration to find its own veroroute binary: run",
  "  \"bun run perfboard veroroute\" once (it clones and builds the pinned fork",
  "  under .tools/, locating Homebrew's qt@5 itself), and every other verb",
  "  finds it with nothing set. A run that cannot find it stops naming the",
  "  \"veroroute\" verb, rather than passing a board nothing was run against.",
  "",
  "  VEROROUTE    override: point at your OWN veroroute-perfboard checkout",
  "               instead of the one this repository builds and manages. Set",
  "               only when you are developing against your own build; leave",
  "               it unset for the normal, zero-configuration road above.",
  "  QMAKE        override: point at your OWN qmake instead of the one the",
  "               \"veroroute\" verb locates via \"brew --prefix qt@5\". Set only",
  "               when you have a non-Homebrew Qt5 you want the build to use.",
  "",
  "Exit codes:",
  "  0  every declared layout checked clean (or --help was given)",
  "  1  an unknown verb, or a layout that was not shown to be in sync. A board",
  "     that could not be checked at all is a failure here and never a skip.",
].join("\n")

export interface RunCliOptions {
  /**
   * The process's own directory: `process.cwd()` in production, an injected
   * stand-in for it in tests. `-C`/`--directory` on the command line, when
   * given, WINS over this for the effective directory every verb treats as
   * its context - `cwd` only anchors a relative `-C` (see
   * `resolveDirectoryFlag` in `./perfboard-support.ts`). Without `-C`, this
   * is exactly the directory every verb acts on, as always.
   */
  readonly cwd?: string
  readonly log?: (line: string) => void
  readonly error?: (line: string) => void
  /** Injected so the CLI is testable without a veroroute binary. */
  readonly check?: (declaration: PerfboardDeclaration) => Promise<PerfboardResult>
  /** Injected so `cuts`, `update`, `stripboard` and `edit` never touch a real spawn or git checkout in tests. */
  readonly verbDeps?: VerbDeps
  /** Injected so `veroroute` never reads the real process environment in tests. */
  readonly env?: Env
  /**
   * Injected so `veroroute` and `check` never resolve against this
   * repository's own root in tests. Also flows into `verbDeps.repoRoot` for
   * `cuts`, `update`, `stripboard` and `edit` (see `./perfboard-binary-verbs.ts`)
   * when the caller did not already set one there directly.
   */
  readonly repoRoot?: string
  /** Injected so `veroroute` never reads a real veroroute.pin in tests. */
  readonly readPin?: (file: string) => Pin
  /** Injected so `veroroute` never touches the real filesystem layout in tests. */
  readonly resolveBinary?: (env: Env, repoRoot: string) => BinaryResolution
  /** Injected so `veroroute` never checks the real filesystem for a binary in tests. */
  readonly binaryExists?: (binaryPath: string) => boolean
  /** Injected so no test ever clones or builds the real fork. */
  readonly acquire?: (pin: Pin, opts: AcquireOptions) => string
  /** Injected so no test spawns the real kicad-cli for `netlist-sync`. */
  readonly netlistSyncDeps?: NetlistSyncDeps
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
  const baseCwd = opts.cwd ?? process.cwd()
  const log = opts.log ?? ((line: string) => console.log(line))
  const error = opts.error ?? ((line: string) => console.error(line))

  // -C/--directory, if given, wins over baseCwd as the effective directory
  // every verb below treats as its context; baseCwd is only the anchor a
  // relative -C resolves against. See resolveDirectoryFlag's doc comment.
  const directory = resolveDirectoryFlag(argv, baseCwd, error)
  if (directory === null) return 1
  const cwd = directory.cwd
  const args = directory.rest

  const check =
    opts.check ??
    ((declaration: PerfboardDeclaration) => checkPerfboard(declaration, { repoRoot: opts.repoRoot }))

  const verb = args[0]
  if (verb === undefined || verb === "--help" || verb === "-h" || verb === "help") {
    log(USAGE)
    return 0
  }

  if (verb === "check") return runCheck(cwd, check, log, error)

  if (verb === "boards") {
    const flags = args.slice(1)
    const unknownFlag = flags.find((flag) => flag !== "--paths")
    if (unknownFlag !== undefined) {
      error(`unknown flag "${unknownFlag}" for "boards". Run with --help to see the flags this verb accepts.`)
      return 1
    }
    // --paths prints each board's own directory instead of its name, so a
    // caller that needs to ACT on every discovered board (make/aggregate.mk's
    // `check`, recursing as `make -C <dir> check`) can do that without
    // reimplementing the discovery walk itself. The plain name stays the
    // default because it is what an operator reads.
    const emitPaths = flags.includes("--paths")
    const files = safeTargets(cwd, error)
    if (files === null) return 1
    if (files.length === 0) {
      error(`no perfboard.json found in or under ${cwd}`)
      return 1
    }
    let failed = false
    for (const file of files) {
      try {
        const declaration = loadDeclaration(file)
        log(emitPaths ? declaration.dir : boardName(declaration))
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

    // `--field <name>` is the machine-readable form make/board.mk uses to
    // pull SCH and NETLIST out of the declaration without reimplementing
    // this module's JSON parsing. It prints exactly one line - the resolved
    // path, or nothing when the field was not declared - and nothing else,
    // so `$(shell ...)` can capture it directly as a make variable.
    const fieldIndex = args.indexOf("--field")
    if (fieldIndex !== -1) {
      const field = args[fieldIndex + 1]
      if (field === "sch") {
        log(declaration.schPath ?? "")
        return 0
      }
      if (field === "netlist") {
        log(declaration.netlistPath ?? "")
        return 0
      }
      error(`--field "${field ?? ""}" is not a known field. Valid fields: sch, netlist.`)
      return 1
    }

    log(`board:   ${boardName(declaration)}`)
    log(`circuit: ${declaration.circuitPath} (${declaration.exportName})`)
    log(`layout:  ${declaration.vrtPath}`)
    if (declaration.schPath !== undefined) log(`sch:     ${declaration.schPath}`)
    if (declaration.netlistPath !== undefined) log(`netlist: ${declaration.netlistPath}`)
    return 0
  }

  if (verb === "cuts") return dispatchCuts(cwd, args.slice(1), opts.verbDeps, opts.repoRoot, log, error)
  if (verb === "edit") return dispatchEdit(cwd, args.slice(1), opts.verbDeps, opts.repoRoot, log, error)
  if (verb === "update") return dispatchUpdate(cwd, args.slice(1), opts.verbDeps, opts.repoRoot, log, error)
  if (verb === "stripboard") {
    return dispatchStripboard(cwd, args.slice(1), opts.verbDeps, opts.repoRoot, log, error)
  }

  if (verb === "netlist-sync") return dispatchNetlistSync(args.slice(1), opts.netlistSyncDeps, log, error)

  if (verb === "schematic-notice") {
    for (const line of schematicNoticeLines(path.join(cwd, "perfboard.json"))) log(line)
    return 0
  }

  if (verb === "veroroute") {
    const env = opts.env ?? process.env
    const repoRoot = opts.repoRoot ?? moduleRepoRoot()
    return dispatchVerorouteVerb(
      args.slice(1),
      repoRoot,
      env,
      {
        readPin: opts.readPin ?? defaultReadPin,
        resolveBinary: opts.resolveBinary ?? defaultResolveBinary,
        binaryExists: opts.binaryExists ?? defaultBinaryExists,
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
