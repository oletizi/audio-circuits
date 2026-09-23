/**
 * The binary-backed perfboard verbs: cuts, update, stripboard, edit.
 *
 * These are the four verbs the CLI has, until now, refused to wire up. Each
 * either reads or rewrites the operator's `.vrt` layout by shelling out to
 * the forked VeroRoute binary, so each takes an injected spawn -
 * `tools/perfboard/check.ts` already established the shape, and no test here
 * needs the real binary.
 *
 * `runUpdate` and `runStripboard` route every write through
 * `assertLayoutRecoverable` and `replaceAtomically` (`./mutate.ts`). The fork
 * saves nothing on any failure path and writes through a plain QDataStream
 * rather than a QSaveFile, so atomicity is this module's job, not the
 * binary's. Every write also lowers the netlist through `exportNetlistFor`
 * (`./check.ts`) rather than a second lowering path: two paths that could
 * disagree about the same board is exactly the defect class this branch
 * already spent a fix wave removing.
 */
import { spawn, spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { assertLayoutRecoverable, replaceAtomically } from "./mutate.ts"
import type { GitRunner } from "./mutate.ts"
import { exportNetlistFor, verorouteBinary } from "./check.ts"
import type { Env } from "./check.ts"
import type { PerfboardDeclaration } from "./declaration.ts"

const BINARY_HINT =
  "Point it at the veroroute binary built from the perfboard fork, or run " +
  "`bun run perfboard veroroute` to build the pinned one."

/** One spawn's exit status and its combined stdout+stderr. */
export interface VerbRun {
  readonly status: number
  readonly output: string
}

export interface VerbDeps {
  /** Injected so no test needs a circuit module on disk. */
  readonly exportNetlist?: (declaration: PerfboardDeclaration) => Promise<string>
  /** Injected so no test needs the veroroute binary. */
  readonly runVeroroute?: (args: readonly string[]) => VerbRun
  /** Injected so no test needs a real git checkout. */
  readonly git?: GitRunner
  /** Injected so no test needs VEROROUTE set in the real environment. */
  readonly env?: Env
  /** Injected so `runEdit`'s executable check needs no real binary on disk. */
  readonly isExecutable?: (binaryPath: string) => boolean
  /** Injected so `runEdit` needs no real GUI process. */
  readonly launchEditor?: (binary: string, vrtPath: string) => void
}

function defaultRunVeroroute(env: Env): (args: readonly string[]) => VerbRun {
  return (args) => {
    const binary = verorouteBinary(env)
    const result = spawnSync(binary, [...args], { encoding: "utf8" })
    if (result.error) {
      throw new Error(`could not run veroroute at ${binary}: ${result.error.message}. ${BINARY_HINT}`)
    }
    if (result.status === null) {
      throw new Error(
        `veroroute at ${binary} did not exit with a status (killed by a signal). Nothing was done.`,
      )
    }
    const stdout = typeof result.stdout === "string" ? result.stdout : ""
    const stderr = typeof result.stderr === "string" ? result.stderr : ""
    return { status: result.status, output: `${stdout}${stderr}` }
  }
}

/**
 * A same-directory temp path to pass as `-o`.
 *
 * `rename` is only atomic within one filesystem, so the produced file has to
 * land beside the layout it will replace, never in the system tmpdir.
 */
function tempPathAlongside(vrtPath: string, tag: string): string {
  const dir = path.dirname(vrtPath)
  const base = path.basename(vrtPath, ".vrt")
  return path.join(dir, `.${base}.${tag}-${process.pid}-${Date.now()}.vrt`)
}

// ---------------------------------------------------------------------------
// cuts
// ---------------------------------------------------------------------------

const CUT_LINE_KEYWORDS = new Set([
  "CUT_STATE",
  "CUT",
  "CUT_CONFLICT",
  "SOLDER",
  "CUT_UNCONNECTED_PIN",
])

/**
 * Report the cuts and solder points `--dump-board` found.
 *
 * Read-only: no guard, no replace. The one refusal that matters is a dump
 * with no `CUT_STATE` line at all - that means this code no longer
 * understands what `--dump-board` prints, and reporting an empty list on a
 * board that may need cuts would read as "no cuts needed."
 * `CUT_STATE NOT_APPLICABLE` means isolated-hole mode: there are no strips to
 * cut, and that is reported as the fact it is, naming the verb that changes
 * it, rather than as an empty cut list.
 */
export function runCuts(declaration: PerfboardDeclaration, deps: VerbDeps = {}): string {
  const runVeroroute = deps.runVeroroute ?? defaultRunVeroroute(deps.env ?? process.env)
  const run = runVeroroute(["--dump-board", declaration.vrtPath])
  if (run.status !== 0) {
    throw new Error(
      `veroroute --dump-board ${declaration.vrtPath} exited ${run.status}; nothing was reported.\n` +
        run.output,
    )
  }

  const relevant = run.output.split("\n").filter((line) => {
    const first = line.trim().split(/\s+/)[0]
    return first !== undefined && CUT_LINE_KEYWORDS.has(first)
  })
  const cutState = relevant.find((line) => line.trim().startsWith("CUT_STATE"))

  if (cutState === undefined) {
    throw new Error(
      `${declaration.vrtPath}: --dump-board produced no CUT_STATE line. This tool no longer ` +
        'understands what --dump-board prints (it expects a line beginning "CUT_STATE"), and ' +
        'reporting an empty cut list on a board that may need cuts would read as "no cuts needed." ' +
        `Raw output:\n${run.output}`,
    )
  }

  if (cutState.trim() === "CUT_STATE NOT_APPLICABLE") {
    return (
      `${declaration.vrtPath} is in isolated-hole mode (CUT_STATE NOT_APPLICABLE): there are no ` +
      'strips on this board to cut. Run the "stripboard" verb to convert it to strip mode first.'
    )
  }

  return relevant.join("\n")
}

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

export interface UpdateOptions {
  /** The operator's explicit statement that this run cannot be undone. */
  readonly allowDirty: boolean
}

/**
 * Re-run auto-routing from the current netlist and rewrite the layout.
 *
 * The guard runs BEFORE anything else, including the netlist export: a run
 * that cannot be undone must never get far enough to spend the cost of
 * exporting or spawning. `-o` names a same-directory temp path because
 * rename is only atomic within one filesystem, and the produced file
 * replaces the original only after veroroute exits 0. On any other exit, the
 * layout is reported unchanged and nothing is replaced.
 */
export async function runUpdate(
  declaration: PerfboardDeclaration,
  opts: UpdateOptions,
  deps: VerbDeps = {},
): Promise<string> {
  assertLayoutRecoverable(declaration.vrtPath, { allowDirty: opts.allowDirty, git: deps.git })

  const exportNetlist = deps.exportNetlist ?? exportNetlistFor
  const runVeroroute = deps.runVeroroute ?? defaultRunVeroroute(deps.env ?? process.env)
  const producedPath = tempPathAlongside(declaration.vrtPath, "update")

  const text = await exportNetlist(declaration)

  const netDir = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-update-"))
  let run: VerbRun
  try {
    const netPath = path.join(netDir, `${path.basename(declaration.vrtPath, ".vrt")}.net`)
    fs.writeFileSync(netPath, text)
    run = runVeroroute(["--update", declaration.vrtPath, "--netlist", netPath, "-o", producedPath])
  } finally {
    fs.rmSync(netDir, { recursive: true, force: true })
  }

  if (run.status !== 0) {
    return (
      `veroroute --update on ${declaration.vrtPath} exited ${run.status}; the layout is unchanged.\n` +
      run.output
    )
  }

  replaceAtomically(declaration.vrtPath, producedPath)

  if (opts.allowDirty) {
    return (
      `${declaration.vrtPath} was rewritten in place. This ran with --allow-dirty, so there may be ` +
      "no clean prior version in git to fall back to."
    )
  }
  return (
    `${declaration.vrtPath} was rewritten in place. Run \`git checkout -- ${declaration.vrtPath}\` ` +
    "to undo."
  )
}

// ---------------------------------------------------------------------------
// stripboard
// ---------------------------------------------------------------------------

export interface StripboardOptions {
  /**
   * The strip direction, or `undefined` when the operator did not supply
   * one. There is no default: which way the strips run is a fact about the
   * board in the operator's hand, not a preference this tool can hold.
   */
  readonly strips: "horizontal" | "vertical" | undefined
  readonly allowDirty: boolean
}

/**
 * Convert an isolated-hole layout to strips, then immediately fill them.
 *
 * `--set-strips` alone leaves the new strips EMPTY - converting without
 * filling is half a conversion - so this always finishes by running the
 * update path. That second write happens under `allowDirty: true`
 * unconditionally: the `--set-strips` write this function just made is
 * itself what left the layout dirty, and the guard that write already
 * satisfied (or was told to ignore) must not turn around and refuse the
 * write that completes it.
 */
export async function runStripboard(
  declaration: PerfboardDeclaration,
  opts: StripboardOptions,
  deps: VerbDeps = {},
): Promise<string> {
  if (opts.strips === undefined) {
    throw new Error(
      'stripboard needs a strip direction ("horizontal" or "vertical"); this is a fact about the ' +
        "board in your hand, not a preference this tool can default. Pass --strips horizontal or " +
        "--strips vertical.",
    )
  }

  assertLayoutRecoverable(declaration.vrtPath, { allowDirty: opts.allowDirty, git: deps.git })

  const runVeroroute = deps.runVeroroute ?? defaultRunVeroroute(deps.env ?? process.env)
  const producedPath = tempPathAlongside(declaration.vrtPath, "strips")
  const run = runVeroroute([
    "--set-strips", declaration.vrtPath, "--strips", opts.strips, "-o", producedPath,
  ])

  if (run.status !== 0) {
    return (
      `veroroute --set-strips on ${declaration.vrtPath} exited ${run.status}; the layout is ` +
      `unchanged.\n${run.output}`
    )
  }

  replaceAtomically(declaration.vrtPath, producedPath)

  const updateReport = await runUpdate(declaration, { allowDirty: true }, deps)
  return `${declaration.vrtPath} was converted to ${opts.strips} strips.\n${updateReport}`
}

// ---------------------------------------------------------------------------
// edit
// ---------------------------------------------------------------------------

function defaultIsExecutable(binaryPath: string): boolean {
  try {
    fs.accessSync(binaryPath, fs.constants.X_OK)
    return true
  } catch {
    return false
  }
}

function defaultLaunchEditor(binary: string, vrtPath: string): void {
  const child = spawn(binary, [vrtPath], { detached: true, stdio: "ignore" })
  child.unref()
}

/**
 * Hand the layout to the forked binary's GUI and return.
 *
 * Deliberately NOT a generic "open this file" mechanism (`open`,
 * `xdg-open`): those consult the desktop's file association for `.vrt`,
 * which could launch a stock VeroRoute - a build that opens the board
 * perfectly well and silently lacks every verb this workflow depends on.
 */
export function runEdit(declaration: PerfboardDeclaration, deps: VerbDeps = {}): string {
  const binary = verorouteBinary(deps.env ?? process.env)
  const isExecutable = deps.isExecutable ?? defaultIsExecutable
  if (!isExecutable(binary)) {
    throw new Error(
      `${binary} is not executable. Build it with the "veroroute" verb (bun run perfboard ` +
        "veroroute) before trying to edit a layout with it.",
    )
  }
  const launchEditor = deps.launchEditor ?? defaultLaunchEditor
  launchEditor(binary, declaration.vrtPath)
  return `Opened ${declaration.vrtPath} in ${binary}.`
}
