/**
 * THE HEADLESS "Update PCB from Schematic". `updateBoardFromSchematic(board,
 * opts)` puts every schematic component on an empty board, with its fields, its
 * schematic link and its nets, and verifies what landed - or throws an
 * `UpdateRefusal` naming the guard that refused.
 *
 * WHY THIS EXISTS. The GUI menu item of that name has no headless equivalent:
 * `kicad-cli pcb` offers only `{drc,export,import,render,upgrade}`, jobsets
 * offer only export/drc/erc jobs plus `special_copyfiles`/`special_execute`,
 * the IPC API's `RunAction` for `common.Control.updatePcbFromSchematic` opens a
 * MODAL DIALOG and needs a running GUI, and the SWIG bindings do not expose
 * `BOARD_NETLIST_UPDATER`, the class that menu item drives. So this tool does
 * that class's job out of the primitives the bindings DO expose, and KiCad
 * writes the board file - no footprint s-expression is hand-authored anywhere
 * here. Nobody clicks that menu item in this repository.
 *
 * THE SPLIT, and why it is where it is. TypeScript resolves the interpreter,
 * exports and parses the netlist, resolves footprint libraries, validates
 * everything, writes ONE JSON instruction file, invokes
 * `./update-from-schematic.py`, and then verifies the result by re-reading the
 * written file. Python exists only because `pcbnew` lives in KiCad's bundled
 * interpreter; it validates nothing. Python's printed summary is diagnostics -
 * R7 below is satisfied by `./board-survey.ts`'s independent read of the bytes
 * on disk, because a tool that asks the thing it is checking has not checked it.
 *
 * REFUSAL IS THE FAILURE MODE EVERYWHERE THIS TOOL REACHES, WITH ONE NAMED
 * EXCEPTION, which is stated rather than papered over: `defaultRunExport` in
 * `tools/perfboard/netlist-sync.ts` throws a raw `Error` when `kicad-cli` will
 * not spawn or exits non-zero, and it is left alone deliberately - it is shared
 * with the perfboard workflow, which has its own expectations of it, and an
 * accurate claim with a named exception is worth more than a tidy claim that is
 * false. Everything else here either returns a verified board or throws an
 * `UpdateRefusal` naming the guard, including the edges earlier passes left raw:
 * an unparseable board file, an output directory that does not exist, the
 * instruction-file write, and the final copy - the last two because a raw error
 * there strands a wholly successful update behind a bare filesystem message.
 *
 * THE REFUSALS LIVE HERE AND IN THREE MODULES SPLIT OUT FOR LENGTH ALONE, each
 * on a boundary worth stating: `./update-preconditions.ts` holds the phase in
 * which nothing has run yet, so none of its refusals can keep evidence;
 * `./update-instructions.ts` holds the ones about resolving a component (R3, R4,
 * R5); and `./update-io.ts` holds the subprocess invocations and the reads, so
 * each one's failure arrives as a refusal rather than as a raw reader or
 * filesystem error. The guards themselves are enumerated at runtime in
 * `./update-refusal.ts`, which is what lets a test iterate every one of them.
 *
 * NOTHING IS WRITTEN TO THE DESTINATION UNTIL IT PASSES. Python saves to a
 * scratch file; the destination is replaced only after R7 and R8 both hold, so
 * a refusal never leaves a half-updated board behind.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { BoardSurvey } from "./board-survey.ts"
import { checkPreconditions } from "./update-preconditions.ts"
import { planNets, planPlacement } from "./update-instructions.ts"
import { UpdateRefusal } from "./update-refusal.ts"
import {
  defaultExportNetlist,
  defaultRunPython,
  exportedNodeCount,
  lostSetupKeys,
  parseNetlist,
  readBoard,
  PYTHON_SCRIPT,
} from "./update-io.ts"
import type { NetlistExporter, PythonRunner } from "./update-io.ts"

export { UpdateRefusal } from "./update-refusal.ts"
export type { UpdateGuard } from "./update-refusal.ts"
export { PLACEMENT } from "./update-instructions.ts"
export { PYTHON_SCRIPT, lostSetupKeys } from "./update-io.ts"
export type { NetlistExporter, PythonRunner } from "./update-io.ts"

export interface UpdateOptions {
  readonly schematicPath: string
  /** Where the updated board is written. Defaults to the input board - an in-place update. */
  readonly outputPath?: string
  readonly exportNetlist?: NetlistExporter
  readonly runPython?: PythonRunner
  /** The interpreter to use. Defaults to `lib/kicad/install.ts`'s derived one. */
  readonly kicadPython?: string
}

export interface UpdateResult {
  readonly outputPath: string
  readonly components: number
  readonly nodes: number
  readonly librariesResolved: number
  /** From the WRITTEN file, not from Python. */
  readonly footprints: number
  readonly nettedPads: number
  /** Python's own summary line, kept for diagnostics only. */
  readonly pythonSummary: string
}

/**
 * Passed as `UpdateRefusal`'s third argument by every throw below whose message
 * embeds a path inside the run's scratch directory, which is what makes that
 * directory evidence rather than litter. Named rather than written as a bare
 * `true` so the call site says what it is asserting, and read by the cleanup in
 * `updateBoardFromSchematic` - never inferred from the message text, for the
 * reason `./update-refusal.ts` gives on the field itself.
 */
const KEEPS_EVIDENCE = true

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Everything one run needs after the input checks have passed and the scratch directory exists. */
interface Run {
  readonly boardPath: string
  readonly outputPath: string
  readonly schematicPath: string
  readonly scratch: string
  readonly before: BoardSurvey
  readonly interpreter: string
  readonly exportNetlist: NetlistExporter
  readonly runPython: PythonRunner
}

function buildBoard(run: Run): UpdateResult {
  const netlistPath = path.join(run.scratch, "netlist.net")
  run.exportNetlist(run.schematicPath, netlistPath)
  if (!fs.existsSync(netlistPath)) {
    throw new UpdateRefusal(
      "invocation",
      `the netlist export of ${run.schematicPath} wrote no file at ${netlistPath}.`,
      KEEPS_EVIDENCE,
    )
  }
  const netlistSource = fs.readFileSync(netlistPath, "utf8")
  const netlist = parseNetlist(netlistSource, netlistPath)
  // R1.
  if (netlist.components.length === 0) {
    throw new UpdateRefusal(
      "netlist-components",
      `${run.schematicPath} exports a netlist with no components, and kicad-cli EXITS 0 on that - requiring a ` +
        "successful exit does not catch it. There is nothing to put on the board. Check that the schematic " +
        "named is the one you meant.",
    )
  }
  const exportedNodes = exportedNodeCount(netlistSource)
  const parsedNodes = Object.values(netlist.nets).reduce((total, members) => total + members.length, 0)
  if (exportedNodes !== parsedNodes) {
    throw new UpdateRefusal(
      "netlist-nodes",
      `the export at ${netlistPath} has ${exportedNodes} (node) form(s) but parses to ${parsedNodes} - ${exportedNodes - parsedNodes} ` +
        "connection(s) went missing in the parse. A REPEATED (net (name ...)) is the known cause: the parsed " +
        "form keys nets by name, so a second net of the same name discards the first one's nodes. Nothing is " +
        "placed from a netlist whose connections this tool cannot account for; give the nets distinct names in " +
        "the schematic. See exportedNodeCount in ./update-io.ts for why the count is taken from the text.",
      KEEPS_EVIDENCE,
    )
  }

  const plan = planPlacement(netlist.components, path.dirname(path.resolve(run.boardPath)))
  const nets = planNets(netlist.nets, plan.padNumbers)

  const written = path.join(run.scratch, path.basename(run.outputPath))
  const instructions = path.join(run.scratch, "instructions.json")
  const spec = JSON.stringify(
    { boardIn: path.resolve(run.boardPath), boardOut: written, footprints: plan.placed, nets },
    null,
    2,
  )
  try {
    fs.writeFileSync(instructions, spec)
  } catch (error) {
    throw new UpdateRefusal(
      "invocation",
      `could not write the instruction file at ${instructions}: ${messageOf(error)}. It is the only thing the ` +
        "pcbnew half reads, so nothing was run and nothing was written to " +
        `${run.outputPath}.`,
    )
  }

  const result = run.runPython(run.interpreter, PYTHON_SCRIPT, instructions)
  if (result.status !== 0) {
    throw new UpdateRefusal(
      "invocation",
      `${run.interpreter} ${PYTHON_SCRIPT} exited ${result.status} on ${instructions}. Nothing was written to ` +
        `${run.outputPath}.\n${result.stderr.trim()}`,
      KEEPS_EVIDENCE,
    )
  }
  if (!fs.existsSync(written)) {
    throw new UpdateRefusal(
      "invocation",
      `${PYTHON_SCRIPT} exited 0 but wrote no board at ${written}, although it read ${instructions}.`,
      KEEPS_EVIDENCE,
    )
  }
  // STDERR IS NOT A FAILURE SIGNAL: KiCad's bundled interpreter writes a wxApp
  // assertion, and kicad-cli writes Fontconfig warnings, on every run here. The
  // two checks below are the signal.
  const pythonSummary = result.stdout.trim().split("\n").filter((line) => line.trim() !== "").at(-1) ?? ""

  const after = readBoard(written, "written", KEEPS_EVIDENCE)
  // R7. A tool that exits 0 having written nothing is this repository's
  // most-repeated failure; these two counts are what make that impossible. The
  // netted-pad side is compared against the EXPORT's node count, not the parsed
  // map's - see exportedNodeCount.
  if (after.footprints !== netlist.components.length || after.nettedPads !== exportedNodes) {
    throw new UpdateRefusal(
      "post-run-counts",
      `the written board does not match the netlist: ${after.footprints} footprint(s) on the board against ` +
        `${netlist.components.length} component(s) in the netlist, and ${after.nettedPads} netted pad(s) ` +
        `against ${exportedNodes} node(s). Both board figures are read off the file at ${written}, not taken ` +
        `from the writer. Nothing was written to ${run.outputPath}. (Python reported: ${pythonSummary})`,
      KEEPS_EVIDENCE,
    )
  }
  // R8, the false-green guard. LoadBoard + SaveBoard rewrites the ENTIRE file,
  // so it could silently drop the board's configuration while parity still
  // passes. ADDITIONS ARE EXPECTED and allowed: KiCad writes out values it
  // previously left implicit - tenting, covering, plugging and the pcbplotparams
  // defaults, on this board - so this compares keys, never bytes and never
  // sizes. tests/pcb/update-from-schematic.test.ts asserts the growth and the
  // absence of any loss on a real run; no figure for it belongs here.
  const lost = lostSetupKeys(run.before.setupKeys, after.setupKeys)
  if (lost.length > 0) {
    throw new UpdateRefusal(
      "setup-block",
      `loading and saving the board dropped ${lost.length} key(s) from its (setup) block: ${lost.join(", ")}. ` +
        "That block is the board's configuration - DRC floors, plot parameters - and schematic parity would " +
        `still pass without it, which is why this is checked by key and not by size. Nothing was written to ` +
        `${run.outputPath}.`,
    )
  }

  try {
    fs.copyFileSync(written, run.outputPath)
  } catch (error) {
    throw new UpdateRefusal(
      "invocation",
      `every check passed, but the verified board at ${written} could not be copied to ${run.outputPath}: ` +
        `${messageOf(error)}. The update itself succeeded - this is the last step, so the result is the file ` +
        "named here and copying it by hand loses nothing.",
      KEEPS_EVIDENCE,
    )
  }
  return {
    outputPath: run.outputPath,
    components: netlist.components.length,
    nodes: exportedNodes,
    librariesResolved: plan.librariesResolved,
    footprints: after.footprints,
    nettedPads: after.nettedPads,
    pythonSummary,
  }
}

export function updateBoardFromSchematic(boardPath: string, opts: UpdateOptions): UpdateResult {
  const exportNetlist = opts.exportNetlist ?? defaultExportNetlist
  const runPython = opts.runPython ?? defaultRunPython
  const outputPath = opts.outputPath ?? boardPath

  const { before, interpreter } = checkPreconditions({
    boardPath,
    outputPath,
    schematicPath: opts.schematicPath,
    ...(opts.kicadPython !== undefined ? { kicadPython: opts.kicadPython } : {}),
  })

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "pcb-update-"))
  const run: Run = {
    boardPath,
    outputPath,
    schematicPath: opts.schematicPath,
    scratch,
    before,
    interpreter,
    exportNetlist,
    runPython,
  }
  try {
    const result = buildBoard(run)
    fs.rmSync(scratch, { recursive: true, force: true })
    return result
  } catch (error) {
    // THE SCRATCH DIRECTORY IS KEPT ONLY WHEN THE REFUSAL SAYS IT IS EVIDENCE -
    // a flag the thrower sets, read here as a fact. It is NOT inferred from the
    // message: an earlier version searched the message for the scratch path,
    // which meant rewording any refusal silently changed whether its evidence
    // survived. Keeping it for refusals that point at nothing in there leaked a
    // directory per run, which the mkdtemp audit in
    // tests/stripboard/temp-scratch.test.ts cannot see, because it scans tests/
    // and this leak comes from tools/. The contract over every guard is
    // tests/pcb/update-scratch-retention.test.ts; the helper that keeps a test's
    // own scratch registered is tests/support/temp-scratch.ts.
    if (!(error instanceof UpdateRefusal) || !error.keepsEvidence) {
      fs.rmSync(scratch, { recursive: true, force: true })
    }
    throw error
  }
}
