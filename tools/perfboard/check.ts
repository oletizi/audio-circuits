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
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import type { PerfboardDeclaration } from "./declaration.ts"
import { loadCircuit } from "./load.ts"

/**
 * Where to find the forked VeroRoute, and why there is no default here.
 *
 * A hardcoded $HOME/src/... is right on exactly one machine and wrong
 * everywhere else, and this module's whole job is to fail when something is
 * wrong. A binary the check cannot find has to stop the run naming what to set,
 * because a spawn that quietly fails is the shape that reads as a clean board.
 * The CLI supplies a default it is itself responsible for building; this module
 * does not.
 */
const BINARY_HINT =
  "Point it at the veroroute binary built from the perfboard fork, or run " +
  "`bun run perfboard veroroute` to build the pinned one."

export type Env = Readonly<Record<string, string | undefined>>

export function verorouteBinary(env: Env = process.env): string {
  const value = env["VEROROUTE"]
  if (value === undefined) {
    throw new Error(`VEROROUTE is not set, and this check has no default binary path. ${BINARY_HINT}`)
  }
  if (value.trim() === "") throw new Error(`VEROROUTE is set but empty. ${BINARY_HINT}`)
  return value
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
export function runVerorouteCheck(vrtPath: string, netPath: string, env: Env = process.env): CheckRun {
  const binary = verorouteBinary(env)
  const result = spawnSync(binary, ["--check", vrtPath, "--netlist", netPath], { encoding: "utf8" })
  if (result.error) {
    throw new Error(`could not run veroroute at ${binary}: ${result.error.message}. ${BINARY_HINT}`)
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
}

export interface PerfboardResult {
  readonly declaration: PerfboardDeclaration
  readonly ok: boolean
  /** veroroute's own report, verbatim. */
  readonly report: string
}

/** Load the declared circuit and lower it to an EESchema v1.1 netlist. */
async function exportNetlistFor(declaration: PerfboardDeclaration): Promise<string> {
  const network = await loadCircuit(declaration)
  const module = (await import(declaration.circuitPath)) as Record<string, unknown>
  const designators = module["DESIGNATORS"]
  const pinNumbers = module["PIN_NUMBERS"]
  if (typeof designators !== "object" || designators === null) {
    throw new Error(`${declaration.circuitPath} does not export a DESIGNATORS map`)
  }
  if (typeof pinNumbers !== "object" || pinNumbers === null) {
    throw new Error(`${declaration.circuitPath} does not export a PIN_NUMBERS map`)
  }
  const lowered = toImportedNetlist(
    network,
    designators as Readonly<Record<string, string>>,
    pinNumbers as Readonly<Record<string, Readonly<Record<string, string>>>>,
  )
  return writeLegacyNetlist(lowered, { createdAt: new Date().toISOString().slice(0, 19) })
}

export async function checkPerfboard(
  declaration: PerfboardDeclaration,
  deps: CheckDeps = {},
): Promise<PerfboardResult> {
  const exportNetlist = deps.exportNetlist ?? exportNetlistFor
  const runCheck = deps.runCheck ?? ((vrt, net) => runVerorouteCheck(vrt, net))

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

  if (run.status === 0) return { declaration, ok: true, report: run.output }
  if (run.status === 1) return { declaration, ok: false, report: run.output }
  throw new Error(
    `veroroute exited with unexpected exit code ${run.status} checking ` +
      `${declaration.vrtPath}: ${run.output}`,
  )
}
