/**
 * Check one declared layout against the circuit it was built from.
 *
 * THE REPORT IS CARRIED VERBATIM AND PARSED NOWHERE. `ok` comes from the exit
 * code alone. That matters more than it looks: a board whose circuit matches
 * has no `Schematic delta` section AT ALL - the heading is omitted, not left
 * empty - so any rule reading ok-ness out of the body would call a
 * not-fully-routed board clean, and would equally call a report that was never
 * produced clean.
 *
 * Exit 1 is deliberately ambiguous in the binary (unreadable board,
 * unparseable netlist, structural problem, circuit mismatch, or matching but
 * unrouted) and all five are not-ok. Anything other than 0 or 1 throws rather
 * than being mapped, because the one verdict a broken run must never produce is
 * a clean board.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { writeLegacyNetlist } from "../../lib/kicad/legacy-netlist.ts"
import { checkBoardBom, type BomCheck } from "../bom/run.ts"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import { resolveBinary } from "./acquire.ts"
import { foldCutState } from "./cut-state.ts"
import type { PerfboardDeclaration } from "./declaration.ts"
import { isRecord } from "./guards.ts"
import { assertDesignators, assertPinNumbers } from "./circuit-exports.ts"
import { loadCircuit } from "./load.ts"
import { moduleRepoRoot } from "./repo-root.ts"

/**
 * Where to find the forked VeroRoute, and why there is no hardcoded default
 * here.
 *
 * A literal $HOME/src/... would be right on exactly one machine and wrong
 * everywhere else, and this module's whole job is to fail when something is
 * wrong. `VEROROUTE` set to a real path (`resolveBinary`'s "explicit" mode)
 * is returned unchanged, with no existence check: that is the operator
 * pointing at their own checkout, and this module has no business judging
 * it. Unset, this resolves to the path this repository acquires and builds
 * under `.tools/` (`resolveBinary`'s "acquired" mode) - but RESOLVING that
 * path is not ACQUIRING it: this checks whether a binary already sits
 * there, and if not, refuses naming the "veroroute" verb rather than
 * building one itself. Only that verb ever acquires.
 */
export type Env = Readonly<Record<string, string | undefined>>

export function verorouteBinary(env: Env, repoRoot: string): string {
  const resolution = resolveBinary(env, repoRoot)
  if (resolution.mode === "explicit") return resolution.path
  if (fs.existsSync(resolution.path)) return resolution.path
  throw new Error(
    `${resolution.path}: no veroroute binary built yet. Run the "veroroute" verb ` +
      '(`bun run perfboard veroroute`) to build the pinned one, or set VEROROUTE to point at ' +
      "your own checkout.",
  )
}

/** The exit status and the report text, as `checkPerfboard` consumes them. */
export interface CheckRun {
  readonly status: number
  readonly output: string
}

/**
 * Run `--check BOARD --netlist NETLIST`.
 *
 * `--netlist` is not optional and has no code path that omits it. Without it,
 * `--check` reads the board, compares nothing, and EXITS 0 with a warning on
 * stderr - a gate wired to that form is permanently green while looking
 * exactly like a passing one.
 *
 * stdout and stderr are concatenated because the two carry different halves of
 * the answer: the report body is on stdout, but an unreadable board writes an
 * empty report and puts the only diagnostic on stderr.
 */
export function runVerorouteCheck(
  vrtPath: string,
  netPath: string,
  repoRoot: string,
  env: Env = process.env,
): CheckRun {
  return spawnVeroroute(["--check", vrtPath, "--netlist", netPath], repoRoot, env)
}

/**
 * `--check`, then - when it passed - the board's cut state folded in
 * (`./cut-state.ts`): `--check` can exit 0 with every net complete on a strip
 * board whose cuts cannot be worked out, and a check that passes there would
 * send an unbuildable board to the bench.
 */
export function runVerorouteCheckWithCuts(
  vrtPath: string,
  netPath: string,
  repoRoot: string,
  env: Env = process.env,
): CheckRun {
  const check = runVerorouteCheck(vrtPath, netPath, repoRoot, env)
  if (check.status !== 0) return check
  const dump = spawnVeroroute(["--dump-board", vrtPath], repoRoot, env)
  if (dump.status !== 0) {
    throw new Error(
      `veroroute --dump-board ${vrtPath} exited ${dump.status}, so this board's cuts could not ` +
        `be read and the check has no verdict.\n${dump.output}`,
    )
  }
  return foldCutState(check, dump.output, vrtPath)
}

function spawnVeroroute(args: readonly string[], repoRoot: string, env: Env): CheckRun {
  const binary = verorouteBinary(env, repoRoot)
  const result = spawnSync(binary, [...args], { encoding: "utf8" })
  if (result.error) {
    throw new Error(
      `could not run veroroute at ${binary}: ${result.error.message}. Rebuild it with the ` +
        '"veroroute" verb (`bun run perfboard veroroute`), or check that VEROROUTE points at a ' +
        "real executable.",
    )
  }
  if (result.status === null) {
    throw new Error(
      `veroroute at ${binary} did not exit with a status (killed by a signal). ` +
        "Nothing was checked; this is not a board verdict.",
    )
  }
  const stdout = typeof result.stdout === "string" ? result.stdout : ""
  const stderr = typeof result.stderr === "string" ? result.stderr : ""
  return { status: result.status, output: `${stdout}${stderr}` }
}

export interface CheckDeps {
  /** Injected so no test needs a circuit module on disk. */
  readonly exportNetlist?: (declaration: PerfboardDeclaration) => Promise<string>
  /** Injected so no test needs the veroroute binary. */
  readonly runCheck?: (vrtPath: string, netPath: string) => CheckRun
  /** Injected so no test resolves against this repository's own root. Only consulted when `runCheck` or `checkBom` is not injected. */
  readonly repoRoot?: string
  /** Injected so no test needs a circuit module, bom.json or catalog on disk. */
  readonly checkBom?: (declaration: PerfboardDeclaration) => Promise<BomCheck>
}

export interface PerfboardResult {
  readonly declaration: PerfboardDeclaration
  readonly ok: boolean
  /** veroroute's own report, verbatim. */
  readonly report: string
}

/**
 * Load the declared circuit and lower it to an EESchema v1.1 netlist.
 *
 * Exported so the binary-backed write verbs (`tools/perfboard/verbs.ts`) can
 * reuse this exact lowering path rather than duplicating it. Two netlist
 * export paths that could disagree - one used to check a board, another used
 * to rewrite it - is exactly the defect class this module exists to remove.
 */
export async function exportNetlistFor(declaration: PerfboardDeclaration): Promise<string> {
  const network = await loadCircuit(declaration)
  const imported: unknown = await import(declaration.circuitPath)
  if (!isRecord(imported)) {
    throw new Error(
      `${declaration.file}: the module at ${declaration.circuitPath} did not import as an object`,
    )
  }
  const designators = assertDesignators(imported["DESIGNATORS"], declaration)
  const pinNumbers = assertPinNumbers(imported["PIN_NUMBERS"], declaration)
  const lowered = toImportedNetlist(network, designators, pinNumbers)
  return writeLegacyNetlist(lowered, { createdAt: new Date().toISOString().slice(0, 19) })
}

export async function checkPerfboard(
  declaration: PerfboardDeclaration,
  deps: CheckDeps = {},
): Promise<PerfboardResult> {
  const exportNetlist = deps.exportNetlist ?? exportNetlistFor
  const runCheck = deps.runCheck ??
    ((vrt, net) => runVerorouteCheckWithCuts(vrt, net, deps.repoRoot ?? moduleRepoRoot()))

  // Export BEFORE opening anything: a circuit that cannot be lowered - an
  // unmapped footprint, an unformattable value - must stop the run rather than
  // let the binary compare the board against a half-built netlist.
  const text = await exportNetlist(declaration)

  if (!fs.existsSync(declaration.vrtPath)) {
    throw new Error(
      `${declaration.vrtPath}: layout not found. The perfboard declaration names a .vrt that is not there.`,
    )
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-check-"))
  let run: CheckRun
  try {
    const netPath = path.join(dir, `${path.basename(declaration.vrtPath, ".vrt")}.net`)
    fs.writeFileSync(netPath, text)
    run = runCheck(declaration.vrtPath, netPath)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }

  if (run.status !== 0 && run.status !== 1) {
    throw new Error(
      `veroroute exited with unexpected exit code ${run.status} checking ` +
        `${declaration.vrtPath}: ${run.output}`,
    )
  }

  // The parts-list hook (tools/bom/run.ts): only for a board with a bom.json, and it
  // compares a fresh in-memory rendering with the committed BOM.md - it never writes.
  const checkBom = deps.checkBom ?? ((board) => checkBoardBom(board, { repoRoot: deps.repoRoot }))
  const bom = await checkBom(declaration)
  const layoutOk = run.status === 0
  if (!bom.applies || bom.ok) return { declaration, ok: layoutOk, report: run.output }
  return { declaration, ok: false, report: `${run.output}\nParts list (bom.json)\n${bom.report}\n` }
}
