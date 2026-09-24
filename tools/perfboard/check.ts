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
import { resolveBinary } from "./acquire.ts"
import type { PerfboardDeclaration } from "./declaration.ts"
import { isRecord } from "./guards.ts"
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
  const binary = verorouteBinary(env, repoRoot)
  const result = spawnSync(binary, ["--check", vrtPath, "--netlist", netPath], { encoding: "utf8" })
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
  /** Injected so no test resolves against this repository's own root. Only consulted when `runCheck` is not injected. */
  readonly repoRoot?: string
}

export interface PerfboardResult {
  readonly declaration: PerfboardDeclaration
  readonly ok: boolean
  /** veroroute's own report, verbatim. */
  readonly report: string
}

/**
 * Validate `DESIGNATORS`: every value must be a string designator.
 *
 * The container check alone is not enough - `typeof {} === "object"` is true
 * of `{ delay_ic: 42 }` too - and this module's whole job is to fail loudly, so
 * a numeric or otherwise non-string designator must throw naming the id it
 * came from, not get lowered into a netlist as a wrong value.
 */
function assertDesignators(
  value: unknown,
  declaration: PerfboardDeclaration,
): Readonly<Record<string, string>> {
  if (!isRecord(value)) {
    throw new Error(`${declaration.file}: ${declaration.circuitPath} does not export a DESIGNATORS map`)
  }
  const designators: Record<string, string> = {}
  for (const [id, designator] of Object.entries(value)) {
    if (typeof designator !== "string") {
      throw new Error(
        `${declaration.file}: DESIGNATORS["${id}"] must be a string designator, got ${typeof designator}`,
      )
    }
    designators[id] = designator
  }
  return designators
}

/** Validate `PIN_NUMBERS`: every entry must be a map of canonical pin -> string pin number. */
function assertPinNumbers(
  value: unknown,
  declaration: PerfboardDeclaration,
): Readonly<Record<string, Readonly<Record<string, string>>>> {
  if (!isRecord(value)) {
    throw new Error(`${declaration.file}: ${declaration.circuitPath} does not export a PIN_NUMBERS map`)
  }
  const pinNumbers: Record<string, Record<string, string>> = {}
  for (const [kind, mapping] of Object.entries(value)) {
    if (!isRecord(mapping)) {
      throw new Error(
        `${declaration.file}: PIN_NUMBERS["${kind}"] must be an object mapping canonical pins to ` +
          `footprint pin numbers, got ${mapping === null ? "null" : typeof mapping}`,
      )
    }
    const pins: Record<string, string> = {}
    for (const [pin, number] of Object.entries(mapping)) {
      if (typeof number !== "string") {
        throw new Error(
          `${declaration.file}: PIN_NUMBERS["${kind}"]["${pin}"] must be a string pin number, got ${typeof number}`,
        )
      }
      pins[pin] = number
    }
    pinNumbers[kind] = pins
  }
  return pinNumbers
}

/**
 * Validate `OFF_BOARD_IDS`: absent means none, otherwise a Set of strings.
 *
 * Absent is legitimate and common - `pt2399-core` has no off-board parts - so
 * it defaults to empty. An export of the WRONG SHAPE does not: an array here
 * would pass an `in`-style membership test nowhere and silently put every
 * off-board part back on the board, demanding footprints nobody chose.
 */
export function assertOffBoardIds(
  value: unknown,
  declaration: PerfboardDeclaration,
): ReadonlySet<string> {
  if (value === undefined) return new Set()
  if (!(value instanceof Set)) {
    throw new Error(
      `${declaration.file}: ${declaration.circuitPath} exports OFF_BOARD_IDS, but it must be a ` +
        `Set of component ids, got ${Array.isArray(value) ? "an array" : typeof value}.`,
    )
  }
  const ids = new Set<string>()
  for (const id of value) {
    if (typeof id !== "string") {
      throw new Error(
        `${declaration.file}: OFF_BOARD_IDS contains a ${typeof id}, but every entry must be a ` +
          "component id string.",
      )
    }
    ids.add(id)
  }
  return ids
}

/** Validate `PAD_ORDER`: absent means none, otherwise id -> array of pin names. */
export function assertPadOrder(
  value: unknown,
  declaration: PerfboardDeclaration,
): Readonly<Record<string, readonly string[]>> {
  if (value === undefined) return {}
  if (!isRecord(value)) {
    throw new Error(
      `${declaration.file}: ${declaration.circuitPath} exports PAD_ORDER, but it must be an ` +
        `object mapping component ids to pin names, got ${typeof value}.`,
    )
  }
  const orders: Record<string, readonly string[]> = {}
  for (const [id, order] of Object.entries(value)) {
    if (!Array.isArray(order) || order.some((pin) => typeof pin !== "string")) {
      throw new Error(
        `${declaration.file}: PAD_ORDER["${id}"] must be an array of pin-name strings.`,
      )
    }
    orders[id] = order
  }
  return orders
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
  const offBoard = assertOffBoardIds(imported["OFF_BOARD_IDS"], declaration)
  const padOrder = assertPadOrder(imported["PAD_ORDER"], declaration)
  const lowered = toImportedNetlist(network, designators, pinNumbers, offBoard, padOrder)
  return writeLegacyNetlist(lowered, { createdAt: new Date().toISOString().slice(0, 19) })
}

export async function checkPerfboard(
  declaration: PerfboardDeclaration,
  deps: CheckDeps = {},
): Promise<PerfboardResult> {
  const exportNetlist = deps.exportNetlist ?? exportNetlistFor
  const runCheck = deps.runCheck ?? ((vrt, net) => runVerorouteCheck(vrt, net, deps.repoRoot ?? moduleRepoRoot()))

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
