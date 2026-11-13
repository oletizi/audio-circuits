/**
 * The fail-closed schematic-parity and DRC check: `runDrc(boardPath, opts)`
 * returns a `DrcReport` or throws a `DrcRefusal` naming the guard that refused.
 * `verdictOf` (drc-policy.ts) turns a report into pass/fail.
 *
 * THE TRAP THIS MODULE EXISTS FOR. Run against a board whose schematic cannot
 * be fetched, `kicad-cli pcb drc --schematic-parity` prints
 * `Failed to fetch schematic netlist for parity tests` to stderr, EXITS 0, and
 * writes `"schematic_parity": []` - an empty array, not a missing key. A check
 * that only refuses an absent key reads "zero parity violations" off a parity
 * test that never ran. Requiring a successful exit does not catch it.
 *
 * KiCad offers no affirmative "parity ran" signal, so one is built from two
 * independent legs, each exercised separately by tests/pcb/drc.test.ts against
 * the real pinned kicad-cli:
 *
 *  LEG 1, independent of any message text. Before DRC, export the NAMED
 *  schematic's netlist and require at least one component. That export exits 0
 *  even on an empty schematic, so the component count is the check, not the
 *  exit code.
 *
 *  LEG 2, a diagnostic, and version-coupled: the stderr line above is KiCad's
 *  wording and a release could change it. It is pinned by a test that runs the
 *  real tool, so a reworded message fails that test instead of silently
 *  disabling the guard. Leg 1 names the schematic explicitly while DRC finds the
 *  board's schematic by project/basename convention, so a basename mismatch
 *  passes leg 1 and fires leg 2 - the only way to reach it.
 *
 * `--exit-code-violations` IS DELIBERATELY NOT USED. This module reads the
 * report, because the exit code cannot tell the classes of finding apart. That
 * omission is also what makes "exit 0" mean "ran to completion": adding the
 * flag later would make an ordinary violation exit non-zero and silently invert
 * the process check into a refusal. Do not "simplify" it back in.
 *
 * The report goes to a FRESH directory per run: a stale report at a reused path
 * is readable, self-consistent and wrong.
 *
 * Before any result is read, the project file beside the board must still equal
 * the fabrication standard (fab-standard.ts), because the autorouter rewrites
 * it and relaxes floors.
 */

import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { defaultKicadCli } from "../../lib/kicad/install.ts"
import { DrcRefusal } from "./drc-refusal.ts"
import { parseReport } from "./drc-report.ts"
import type { ParsedReport } from "./drc-report.ts"
import { verifyFabStandard } from "./fab-standard.ts"

export { DrcRefusal } from "./drc-refusal.ts"
export type { DrcGuard } from "./drc-refusal.ts"
export { verdictOf } from "./drc-policy.ts"

/** The wording is KiCad's (10.0.5), not ours; see LEG 2 above. */
export const PARITY_FETCH_DIAGNOSTIC = "Failed to fetch schematic netlist for parity tests"

export interface KicadResult {
  readonly status: number | null
  readonly stderr: string
}

/** Runs kicad-cli with the given arguments. Injectable so report handling can be tested without the tool. */
export type KicadInvoker = (args: readonly string[]) => KicadResult

export interface RunDrcOptions {
  /** The schematic this board is meant to match. Named, never inferred from the board. */
  readonly schematicPath: string
  readonly invoke?: KicadInvoker
}

export interface DrcReport extends ParsedReport {
  readonly reportPath: string
  /** Components in the named schematic's netlist: leg 1's evidence. */
  readonly netlistComponents: number
  readonly counts: {
    readonly schematicParity: number
    readonly violations: number
    readonly unconnectedItems: number
  }
}

function realInvoker(args: readonly string[]): KicadResult {
  const cli = defaultKicadCli()
  if (!fs.existsSync(cli)) {
    throw new DrcRefusal(
      "invocation",
      `kicad-cli not found at ${cli}. It is not on PATH; set KICAD_CLI or install KiCad (lib/kicad/install.ts).`,
    )
  }
  const result = spawnSync(cli, [...args], { encoding: "utf8" })
  if (result.error !== undefined) {
    throw new DrcRefusal("invocation", `could not run ${cli}: ${result.error.message}`)
  }
  return { status: result.status, stderr: result.stderr }
}

/** Leg 1: the number of components in the named schematic's exported netlist. */
function netlistComponentCount(schematicPath: string, scratch: string, invoke: KicadInvoker): number {
  if (!fs.existsSync(schematicPath)) {
    throw new DrcRefusal(
      "leg1-netlist-components",
      `no schematic at ${schematicPath}: there is nothing to export, so parity has nothing to compare against.`,
    )
  }
  const netlist = path.join(scratch, "netlist.xml")
  const result = invoke(["sch", "export", "netlist", "--format", "kicadxml", "-o", netlist, schematicPath])
  if (result.status !== 0 || !fs.existsSync(netlist)) {
    throw new DrcRefusal(
      "leg1-netlist-components",
      `exporting the netlist of ${schematicPath} failed (exit ${result.status}): ${result.stderr.trim()}`,
    )
  }
  const count = (fs.readFileSync(netlist, "utf8").match(/<comp /g) ?? []).length
  if (count === 0) {
    throw new DrcRefusal(
      "leg1-netlist-components",
      `${schematicPath} exports a netlist with no components (kicad-cli exits 0 on that). ` +
        "Parity against an empty schematic is not a parity check.",
    )
  }
  return count
}

export function runDrc(boardPath: string, opts: RunDrcOptions): DrcReport {
  const invoke = opts.invoke ?? realInvoker
  if (!fs.existsSync(boardPath)) {
    throw new DrcRefusal("invocation", `no board at ${boardPath}.`)
  }

  verifyFabStandard(boardPath.replace(/\.kicad_pcb$/, ".kicad_pro"))

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "pcb-drc-"))
  const netlistComponents = netlistComponentCount(opts.schematicPath, scratch, invoke)

  const reportPath = path.join(scratch, "drc.json")
  const result = invoke([
    "pcb", "drc", "--schematic-parity", "--format", "json", "--severity-all", "-o", reportPath, boardPath,
  ])
  if (result.status !== 0) {
    throw new DrcRefusal(
      "process-exit",
      `kicad-cli pcb drc exited ${result.status}. Any report at ${reportPath} is not read.\n${result.stderr.trim()}`,
    )
  }
  if (result.stderr.includes(PARITY_FETCH_DIAGNOSTIC)) {
    throw new DrcRefusal(
      "leg2-parity-fetch-diagnostic",
      `kicad-cli reported "${PARITY_FETCH_DIAGNOSTIC}" for ${boardPath} (it still exited 0 and wrote an empty ` +
        `schematic_parity). It found no schematic by the board's project/basename convention, although ` +
        `${opts.schematicPath} has ${netlistComponents} component(s). Name them alike beside the board.`,
    )
  }
  if (!fs.existsSync(reportPath)) {
    throw new DrcRefusal("report-unreadable", `kicad-cli exited 0 but wrote no report at ${reportPath}.`)
  }

  const parsed = parseReport(fs.readFileSync(reportPath, "utf8"), reportPath)
  return {
    ...parsed,
    reportPath,
    netlistComponents,
    counts: {
      schematicParity: parsed.schematicParity.length,
      violations: parsed.violations.length,
      unconnectedItems: parsed.unconnectedItems.length,
    },
  }
}
