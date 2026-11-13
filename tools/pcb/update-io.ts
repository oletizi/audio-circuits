/**
 * What the headless update READS and what it RUNS, with the refusal for each
 * thing it could not read or could not start.
 *
 * SPLIT OUT OF `./update-from-schematic.ts` for length, not for layering - the
 * guards here are that tool's own (`invocation`, `board-unreadable`,
 * `netlist-nodes`'s input, and R5's designator half re-raised as
 * `net-member`). The orchestrator keeps the decisions; this file keeps the two
 * subprocess invocations and the three reads, so that each one's failure arrives
 * as an `UpdateRefusal` rather than as a raw reader or filesystem error.
 */
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { importNetlist, isUndeclaredRefMessage, KICAD_CLI } from "../../lib/kicad/netlist.ts"
import type { ImportedNetlist } from "../../lib/kicad/netlist.ts"
import { defaultKicadCliExists, defaultRunExport } from "../perfboard/netlist-sync.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { surveyBoard } from "./board-survey.ts"
import type { BoardSurvey } from "./board-survey.ts"
import { UpdateRefusal } from "./update-refusal.ts"

/** Runs the KiCad Python interpreter against a script and an instruction file. Injected for tests. */
export type PythonRunner = (
  interpreter: string,
  script: string,
  instructions: string,
) => { readonly status: number | null; readonly stdout: string; readonly stderr: string }

/** Exports `schPath`'s netlist to `outPath`. Injected so a test can drive the parse without kicad-cli. */
export type NetlistExporter = (schPath: string, outPath: string) => void

export const PYTHON_SCRIPT = path.join(path.dirname(new URL(import.meta.url).pathname), "update-from-schematic.py")

export function defaultExportNetlist(schPath: string, outPath: string): void {
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

export function defaultRunPython(
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

/** A board read, with an unparseable file inside the refusal vocabulary rather than raw from the reader. */
export function readBoard(boardPath: string, role: string): BoardSurvey {
  try {
    return surveyBoard(boardPath)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new UpdateRefusal(
      "board-unreadable",
      `the ${role} board at ${boardPath} could not be read as a KiCad s-expression: ${message}. Nothing is ` +
        "guessed from a file this tool cannot parse - a partially understood board is how a footprint lands " +
        "on a board whose configuration was silently discarded.",
    )
  }
}

/** The import, with the one error it raises that is really a net-member problem re-raised as one. */
export function parseNetlist(text: string, netlistPath: string): ImportedNetlist {
  try {
    return importNetlist(text)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // lib/kicad/netlist.ts refuses an undeclared designator itself, before this
    // tool can see the net, so R5's designator half arrives as that module's
    // error. isUndeclaredRefMessage is exported BESIDE the throw that produces
    // it, so the wording lives in one file rather than two. The pad cannot be
    // named: a designator no component declares has no footprint, so there is
    // no pad list to check a number against.
    if (isUndeclaredRefMessage(message)) {
      throw new UpdateRefusal(
        "net-member",
        `${message}. Every (node) must name a component the netlist declares; no pad can be reported for this ` +
          "one, because an undeclared designator has no footprint to have pads.",
      )
    }
    throw new UpdateRefusal("invocation", `could not read the netlist at ${netlistPath}: ${message}`)
  }
}

/**
 * `(node ...)` forms in the EXPORTED TEXT - R7's right-hand side, and the one
 * number in this tool that does not come through `importNetlist`'s map.
 *
 * WHY IT IS COUNTED FROM THE TEXT. `importNetlist` keys nets in a
 * `Record<string, readonly string[]>`, so a repeated `(net (name ...))`
 * LAST-WINS and silently discards the earlier net's nodes. A node total summed
 * from that map is the collapsed total, and comparing the board's netted pads
 * against it would agree with a board that lost half a net - the false green R7
 * exists to make impossible. Counted from the text, the collapse is visible, and
 * `update-from-schematic.ts` refuses on the disagreement.
 *
 * THE UPSTREAM OPTION, recorded so nobody re-derives it: `importNetlist` could
 * refuse a repeated net name outright. That is a behaviour change for about
 * twenty call sites and six round-trip tests, for a case nothing here has
 * evidenced, so this detects it at the point that already claims to verify
 * counts instead. If evidence turns up, the refusal belongs there and this check
 * becomes its corroboration.
 */
export function exportedNodeCount(text: string): number {
  return (text.match(/\(node\b/g) ?? []).length
}

/**
 * Keys present in `before` and missing from `after`, WITH MULTIPLICITY: a key
 * written twice before and once after has lost one, which is what "any key
 * present before is absent after" says and what a set comparison would miss.
 */
export function lostSetupKeys(before: readonly string[], after: readonly string[]): readonly string[] {
  const remaining = [...after]
  const lost: string[] = []
  for (const key of before) {
    const at = remaining.indexOf(key)
    if (at === -1) lost.push(key)
    else remaining.splice(at, 1)
  }
  return lost
}
