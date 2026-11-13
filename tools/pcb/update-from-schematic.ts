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
 * REFUSAL IS THE ONLY FAILURE MODE, as in `./drc.ts`: either the board was
 * updated and the result verified, or an `UpdateRefusal` names the guard. That
 * includes the edges a first pass left raw - an unparseable board file and an
 * output directory that does not exist, which used to throw a bare `parseSexpr`
 * error and a bare ENOENT, the second AFTER a wholly successful run. The eight
 * refusals the plan requires live here and in two modules split out for length
 * alone: `./update-instructions.ts` holds the three that are about resolving a
 * component (R3, R4, R5), and `./update-io.ts` holds the two subprocess
 * invocations and the three reads, so each one's failure arrives as a refusal
 * rather than as a raw reader or filesystem error.
 *
 * NOTHING IS WRITTEN TO THE DESTINATION UNTIL IT PASSES. Python saves to a
 * scratch file; the destination is replaced only after R7 and R8 both hold, so
 * a refusal never leaves a half-updated board behind.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { defaultKicadPython } from "../../lib/kicad/install.ts"
import type { BoardSurvey } from "./board-survey.ts"
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

/** R6. The interpreter must exist AND be executable. */
function requireInterpreter(interpreter: string): void {
  try {
    fs.accessSync(interpreter, fs.constants.X_OK)
  } catch {
    throw new UpdateRefusal(
      "python-interpreter",
      `no executable KiCad Python interpreter at ${interpreter}. pcbnew ships only inside KiCad's own bundled ` +
        "interpreter, so no system or uv-managed python3 can stand in for it. Set KICAD_PYTHON to the " +
        "interpreter that can import pcbnew.",
    )
  }
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
    throw new UpdateRefusal("invocation", `the netlist export of ${run.schematicPath} wrote no file at ${netlistPath}.`)
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
    )
  }

  const plan = planPlacement(netlist.components, path.dirname(path.resolve(run.boardPath)))
  const nets = planNets(netlist.nets, plan.padNumbers)

  const written = path.join(run.scratch, path.basename(run.outputPath))
  const instructions = path.join(run.scratch, "instructions.json")
  fs.writeFileSync(
    instructions,
    JSON.stringify(
      { boardIn: path.resolve(run.boardPath), boardOut: written, footprints: plan.placed, nets },
      null,
      2,
    ),
  )

  const result = run.runPython(run.interpreter, PYTHON_SCRIPT, instructions)
  if (result.status !== 0) {
    throw new UpdateRefusal(
      "invocation",
      `${run.interpreter} ${PYTHON_SCRIPT} exited ${result.status}. Nothing was written to ${run.outputPath}.\n` +
        result.stderr.trim(),
    )
  }
  if (!fs.existsSync(written)) {
    throw new UpdateRefusal("invocation", `${PYTHON_SCRIPT} exited 0 but wrote no board at ${written}.`)
  }
  // STDERR IS NOT A FAILURE SIGNAL: KiCad's bundled interpreter writes a wxApp
  // assertion, and kicad-cli writes Fontconfig warnings, on every run here. The
  // two checks below are the signal.
  const pythonSummary = result.stdout.trim().split("\n").filter((line) => line.trim() !== "").at(-1) ?? ""

  const after = readBoard(written, "written")
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
    )
  }
  // R8, the false-green guard. LoadBoard + SaveBoard rewrites the ENTIRE file,
  // so it could silently drop the board's configuration while parity still
  // passes. ADDITIONS ARE EXPECTED and allowed: KiCad writes out values it
  // previously left implicit (measured on this board: 186 -> 1193 bytes, gaining
  // tenting, covering, plugging and the pcbplotparams defaults, with nothing
  // removed), so this compares keys - never bytes, and never sizes.
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

  fs.copyFileSync(written, run.outputPath)
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

  if (!fs.existsSync(boardPath)) {
    throw new UpdateRefusal("invocation", `no board at ${boardPath}.`)
  }
  if (!fs.existsSync(opts.schematicPath)) {
    throw new UpdateRefusal("invocation", `no schematic at ${opts.schematicPath}: there is nothing to update from.`)
  }
  // CHECKED BEFORE ANY WORK, not at the copy: an output directory that does not
  // exist used to surface as a bare ENOENT from the final copyFileSync, which
  // stranded a wholly successful update - every check passed, the board was
  // written in scratch, and the caller got a raw filesystem error.
  const outputDir = path.dirname(path.resolve(outputPath))
  if (!fs.existsSync(outputDir)) {
    throw new UpdateRefusal(
      "invocation",
      `the output directory ${outputDir} does not exist, so ${outputPath} could not be written. It is not ` +
        "created here: a board written into a directory this tool invented is a board nobody will find, and " +
        "the schematic, project and board belong side by side under one basename.",
    )
  }

  // R2, and the (setup) keys R8 compares against, both read off the input board
  // before anything else runs.
  const before = readBoard(boardPath, "input")
  if (before.footprints !== 0) {
    throw new UpdateRefusal(
      "board-not-empty",
      `${boardPath} already holds ${before.footprints} footprint(s), and this tool does not do incremental ` +
        "updates: the real updater matches existing footprints by UUID path, and reproducing that is out of " +
        "scope, so updating here would half-update or duplicate instead. The board must be empty of " +
        "footprints. Placement is regenerated from the schematic on every run, so re-deriving it costs a tool " +
        "run and not a person's work.",
    )
  }

  const interpreter = opts.kicadPython ?? defaultKicadPython()
  requireInterpreter(interpreter)

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
    // THE SCRATCH DIRECTORY IS KEPT ONLY WHEN IT IS EVIDENCE, and that is
    // decided from the thrown message itself rather than from a list of guards:
    // a refusal that names a path inside the scratch is pointing at something a
    // person will open (the export, the instruction file, the board Python
    // wrote), and three of the nine guards do. The other six name nothing in
    // there, and keeping it for them leaked eight directories per run of the
    // test file - which tests/stripboard/temp-scratch.ts's audit cannot see,
    // because it scans tests/ and this leak comes from tools/. Deciding from the
    // message means a new refusal cannot drift out of step with this.
    if (!(error instanceof Error) || !error.message.includes(scratch)) {
      fs.rmSync(scratch, { recursive: true, force: true })
    }
    throw error
  }
}
