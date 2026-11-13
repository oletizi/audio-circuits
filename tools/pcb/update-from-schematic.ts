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
 * updated and the result verified, or an `UpdateRefusal` names the guard. The
 * eight the plan requires live here and in `./update-instructions.ts`, which
 * holds the three that are about resolving a component (R3, R4, R5) and was
 * split out for length alone.
 *
 * NOTHING IS WRITTEN TO THE DESTINATION UNTIL IT PASSES. Python saves to a
 * scratch file; the destination is replaced only after R7 and R8 both hold, so
 * a refusal never leaves a half-updated board behind.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { importNetlist, KICAD_CLI } from "../../lib/kicad/netlist.ts"
import type { ImportedNetlist } from "../../lib/kicad/netlist.ts"
import { defaultKicadPython } from "../../lib/kicad/install.ts"
import { defaultKicadCliExists, defaultRunExport } from "../perfboard/netlist-sync.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { surveyBoard } from "./board-survey.ts"
import { planNets, planPlacement } from "./update-instructions.ts"
import { UpdateRefusal } from "./update-refusal.ts"

export { UpdateRefusal } from "./update-refusal.ts"
export type { UpdateGuard } from "./update-refusal.ts"
export { PLACEMENT } from "./update-instructions.ts"

/** Runs the KiCad Python interpreter against a script and an instruction file. Injected for tests. */
export type PythonRunner = (
  interpreter: string,
  script: string,
  instructions: string,
) => { readonly status: number | null; readonly stdout: string; readonly stderr: string }

/** Exports `schPath`'s netlist to `outPath`. Injected so a test can drive the parse without kicad-cli. */
export type NetlistExporter = (schPath: string, outPath: string) => void

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

export const PYTHON_SCRIPT = path.join(path.dirname(new URL(import.meta.url).pathname), "update-from-schematic.py")

function defaultExportNetlist(schPath: string, outPath: string): void {
  if (!defaultKicadCliExists(KICAD_CLI)) {
    throw new UpdateRefusal(
      "invocation",
      `kicad-cli is not executable at ${KICAD_CLI}. It is not on PATH here; set KICAD_CLI or install KiCad ` +
        "(lib/kicad/install.ts holds the per-platform candidates).",
    )
  }
  // defaultRunExport pins kicad-cli's cwd to the repository root on purpose -
  // read its comment. Reused rather than re-spelled here so there is one place
  // that knows how this export is invoked.
  defaultRunExport(KICAD_CLI, schPath, outPath, moduleRepoRoot())
}

function defaultRunPython(
  interpreter: string,
  script: string,
  instructions: string,
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(interpreter, [script, instructions], { encoding: "utf8" })
  if (result.error !== undefined) {
    throw new UpdateRefusal("invocation", `could not run ${interpreter}: ${result.error.message}`)
  }
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
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

/** The import, with the one error it raises that is really a net-member problem re-raised as one. */
function parseNetlist(netlistPath: string): ImportedNetlist {
  const text = fs.readFileSync(netlistPath, "utf8")
  try {
    return importNetlist(text)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // lib/kicad/netlist.ts refuses an undeclared designator itself, before this
    // tool can see the net, so R5's designator half arrives as that module's
    // error. Classified by its message - OUR module's wording, pinned by
    // tests/pcb/update-from-schematic.test.ts, not a third party's - so it
    // reaches the caller under the same guard as the pad half. The pad cannot be
    // named: a designator no component declares has no footprint, so there is no
    // pad list to check a number against.
    if (/is not declared in \(components\)/.test(message)) {
      throw new UpdateRefusal(
        "net-member",
        `${message}. Every (node) must name a component the netlist declares; no pad can be reported for this ` +
          "one, because an undeclared designator has no footprint to have pads.",
      )
    }
    throw new UpdateRefusal("invocation", `could not read the netlist at ${netlistPath}: ${message}`)
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

  // R2, and the (setup) key set R8 compares against, both read off the input
  // board before anything else runs.
  const before = surveyBoard(boardPath)
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
  const netlistPath = path.join(scratch, "netlist.net")
  exportNetlist(opts.schematicPath, netlistPath)
  if (!fs.existsSync(netlistPath)) {
    throw new UpdateRefusal("invocation", `the netlist export of ${opts.schematicPath} wrote no file at ${netlistPath}.`)
  }
  const netlist = parseNetlist(netlistPath)
  if (netlist.components.length === 0) {
    throw new UpdateRefusal(
      "netlist-components",
      `${opts.schematicPath} exports a netlist with no components, and kicad-cli EXITS 0 on that - requiring a ` +
        "successful exit does not catch it. There is nothing to put on the board. Check that the schematic " +
        "named is the one you meant.",
    )
  }

  const plan = planPlacement(netlist.components, path.dirname(path.resolve(boardPath)))
  const nets = planNets(netlist.nets, plan.padNumbers)
  const nodes = nets.reduce((total, net) => total + net.members.length, 0)

  const written = path.join(scratch, path.basename(outputPath))
  const instructions = path.join(scratch, "instructions.json")
  fs.writeFileSync(
    instructions,
    JSON.stringify({ boardIn: path.resolve(boardPath), boardOut: written, footprints: plan.placed, nets }, null, 2),
  )

  const run = runPython(interpreter, PYTHON_SCRIPT, instructions)
  if (run.status !== 0) {
    throw new UpdateRefusal(
      "invocation",
      `${interpreter} ${PYTHON_SCRIPT} exited ${run.status}. Nothing was written to ${outputPath}.\n${run.stderr.trim()}`,
    )
  }
  if (!fs.existsSync(written)) {
    throw new UpdateRefusal("invocation", `${PYTHON_SCRIPT} exited 0 but wrote no board at ${written}.`)
  }
  // STDERR IS NOT A FAILURE SIGNAL: KiCad's bundled interpreter writes a wxApp
  // assertion, and kicad-cli writes Fontconfig warnings, on every run here. The
  // two checks below are the signal.
  const pythonSummary = run.stdout.trim().split("\n").filter((line) => line.trim() !== "").at(-1) ?? ""

  const after = surveyBoard(written)
  // R7. A tool that exits 0 having written nothing is this repository's
  // most-repeated failure; these two counts are what make that impossible.
  if (after.footprints !== netlist.components.length || after.nettedPads !== nodes) {
    throw new UpdateRefusal(
      "post-run-counts",
      `the written board does not match the netlist: ${after.footprints} footprint(s) on the board against ` +
        `${netlist.components.length} component(s) in the netlist, and ${after.nettedPads} netted pad(s) ` +
        `against ${nodes} node(s). Both board figures are read off the file at ${written}, not taken from the ` +
        `writer. Nothing was written to ${outputPath}. (Python reported: ${pythonSummary})`,
    )
  }
  // R8, the false-green guard. LoadBoard + SaveBoard rewrites the ENTIRE file,
  // so it could silently drop the board's configuration while parity still
  // passes. ADDITIONS ARE EXPECTED and allowed: KiCad writes out values it
  // previously left implicit (measured on this board: 186 -> 1193 bytes, gaining
  // tenting, covering, plugging and the pcbplotparams defaults, with nothing
  // removed), so this compares key SETS - never bytes, and never sizes.
  const lost = before.setupKeys.filter((key) => !after.setupKeys.includes(key))
  if (lost.length > 0) {
    throw new UpdateRefusal(
      "setup-block",
      `loading and saving the board dropped ${lost.length} key(s) from its (setup) block: ${lost.join(", ")}. ` +
        "That block is the board's configuration - DRC floors, plot parameters - and schematic parity would " +
        `still pass without it, which is why this is checked by key and not by size. Nothing was written to ` +
        `${outputPath}.`,
    )
  }

  fs.copyFileSync(written, outputPath)
  return {
    outputPath,
    components: netlist.components.length,
    nodes,
    librariesResolved: plan.librariesResolved,
    footprints: after.footprints,
    nettedPads: after.nettedPads,
    pythonSummary,
  }
}
