/**
 * CHECKPOINT 1: the grader pointed at boards a person built, rather than at its
 * own fixtures.
 *
 * WHY IT EXISTS. Every negative fixture under
 * `tests/fixtures/stripboard/negative/` is hand-written dump text or a single
 * capture, and a grader graded only against those is a grader graded against
 * its author's beliefs. Committed, hand-laid layouts are the closest thing this
 * plan has to ground truth, so the ten constraints are run over them and the
 * verdicts READ rather than merely asserted.
 *
 * THE SET IS TWO BOARDS, NOT THE PLAN'S THREE, AND THE REASON IS NOT THAT A
 * BOARD FAILED. The plan's table names `pultec-low-boost`,
 * `transistor-preamp-feedback`, `transistor-preamp-staged` and `pt2399-core`.
 *
 *   - `transistor-preamp-staged` is OUT. Its footprint data is being authored
 *     **on another branch**, where the board is active work - it is not retired
 *     and nothing about it is superseded. Two of the footprints it places,
 *     `Capacitor_THT:CP_Radial_D10.0mm_P5.00mm` and
 *     `Connector_PinHeader_2.54mm:PinHeader_1x03_P2.54mm_Vertical`, are in
 *     neither `LEAD_SPANS`, `UNSOURCED` nor `PIN_PATTERNS`, so `PAR2` refuses
 *     the board by name. **This branch neither supplies that data nor guesses
 *     it**: guessing would invent a datasheet value, and supplying it would
 *     collide with the other branch's work on the same tables. Its dump stays a
 *     geometry fixture for `HC8` (`tests/fixtures/stripboard/
 *     transistor-preamp-staged.dump` and `tests/stripboard/agreement.test.ts`),
 *     which is a different role and is unaffected: the reconstruction either
 *     partitions those pins correctly or it does not, whatever branch owns the
 *     design.
 *   - `pultec-low-boost` is OUT, and this one IS a measured obstruction rather
 *     than a decision. The frozen benchmark's reference export is EESchema v1.1,
 *     which carries NO footprint field, so the four footprint-keyed constraints
 *     have nothing to read; and the frozen board places `board_terminals`
 *     (`BLOCK_200MIL3`, three pins), which today's low-boost model no longer
 *     has at all - `--check` reports it as removed. Reading footprints from
 *     today's model would grade a 9-net hand layout against a 14-net circuit,
 *     which is exactly what that fixture's provenance forbids. Recorded as a
 *     finding rather than worked around.
 *
 * So the set is `transistor-preamp-feedback`, which is expected to have all ten
 * hold, and `pt2399-core`, which is expected to REFUSE - and the refusal is the
 * checkpoint passing, on two conflicts the criteria already record from the
 * owner himself.
 *
 * IT SPAWNS THE BINARY, like `tools/perfboard/check.ts` does, and fails rather
 * than skips when it is absent. The committed `.dump` fixtures cannot serve
 * here: every one predates the `BOUNDS` line, and `HC6` refuses a dump without
 * one.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { referenceNetsFromExport } from "../../tools/stripboard/equivalence.ts"
import { parseCheckReport, type CheckInput } from "../../tools/stripboard/constraints.ts"
import { stockFor } from "../../tools/stripboard/grade.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { exportNetlistFor, runVerorouteCheck, verorouteBinary } from "../../tools/perfboard/check.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"

/** One checkpoint board: where its layout, its footprints and its reference are. */
interface CheckpointBoard {
  readonly declaration: string
  /** The export the footprints are read from - must be the modern s-expression grammar. */
  readonly footprintSource: string
  /** The export `HC8`'s reference nets come from. */
  readonly reference: string
}

export const CHECKPOINT_BOARDS: Readonly<Record<string, CheckpointBoard>> = {
  "transistor-preamp-feedback": {
    declaration: "boards/transistor-preamp-feedback/perfboard.json",
    footprintSource: "tests/fixtures/transistor-preamp-feedback.net",
    reference: "tests/fixtures/transistor-preamp-feedback.net",
  },
  "pt2399-core": {
    declaration: "boards/pt2399-core/perfboard.json",
    footprintSource: "tests/fixtures/pt2399-core.net",
    // The plan's own column for this board: the committed VeroRoute-grammar
    // export, so the checkpoint needs no live one.
    reference: "tests/fixtures/pt2399-core-veroroute.net",
  },
}

function dumpOf(vrtPath: string): string {
  const binary = verorouteBinary(process.env, moduleRepoRoot())
  const run = spawnSync(binary, ["--dump-board", vrtPath], { encoding: "utf8" })
  if (run.status !== 0) {
    throw new Error(
      `veroroute --dump-board ${vrtPath} exited ${String(run.status)}, so this board could not ` +
        `be read and no verdict may be concluded from it.\n${run.stderr ?? ""}`,
    )
  }
  return run.stdout
}

/** Every designator's footprint, from the board's own committed export. */
function footprintsOf(netPath: string): ReadonlyMap<string, string> {
  const imported = importNetlist(fs.readFileSync(netPath, "utf8"))
  const map = new Map<string, string>()
  for (const component of imported.components) {
    if (component.footprint !== undefined) map.set(component.designator, component.footprint)
  }
  if (map.size === 0) {
    throw new Error(
      `${netPath} names no footprints at all. HC4, HC5, HC9 and HC10 are keyed by the footprint ` +
        "name, so a grade over this export would skip four hard constraints on every part. " +
        "This export is EESchema v1.1, which has no footprint field; use a modern " +
        "s-expression export.",
    )
  }
  return map
}

/** A `CheckInput` for one checkpoint board, built from the live binary. */
export function checkpointInput(board: string): CheckInput {
  const entry = CHECKPOINT_BOARDS[board]
  if (entry === undefined) {
    throw new Error(
      `"${board}" is not a checkpoint board. The set is ` +
        `${Object.keys(CHECKPOINT_BOARDS).join(", ")} - see this module's comment for why it is ` +
        "two rather than the plan's four.",
    )
  }
  const root = moduleRepoRoot()
  const declaration = loadDeclaration(path.join(root, entry.declaration))
  const dumpText = dumpOf(declaration.vrtPath)
  const rules = loadRules()
  return {
    dumpText,
    dump: parseBoardDump(dumpText),
    reference: referenceNetsFromExport(fs.readFileSync(path.join(root, entry.reference), "utf8")),
    footprints: footprintsOf(path.join(root, entry.footprintSource)),
    checkReport: parseCheckReport(checkRunFor(entry.declaration)),
    stock: stockFor(path.join(root, entry.declaration), rules),
    rules,
  }
}

/** `--check` on one checkpoint board, exported through the repository's own lowering path. */
function checkRunFor(declarationPath: string): { readonly status: number; readonly output: string } {
  const root = moduleRepoRoot()
  const declaration = loadDeclaration(path.join(root, declarationPath))
  // The SAME lowering `make check` and the write verbs use, so there is no
  // second export path here.
  const text = exportedNetlist.get(declarationPath)
  if (text === undefined) {
    throw new Error(
      `the netlist for ${declarationPath} has not been exported yet. checkpointInputAsync must ` +
        "be awaited before checkpointInput is called for this board.",
    )
  }
  // REMOVED HERE AND NOT BY A HOOK, because the fork reads the netlist during
  // `runVerorouteCheck` and nothing reads it afterwards: the directory's
  // lifetime is this call. Leaving it behind cost **8** directories in `TMPDIR`
  // a run - see `../support/temp-scratch.ts` for why that matters and for the
  // registry the fixtures whose scratch outlives one call use instead.
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "checkpoint-"))
  try {
    const netPath = path.join(scratch, "board.net")
    fs.writeFileSync(netPath, text)
    return runVerorouteCheck(declaration.vrtPath, netPath, root)
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
}

const exportedNetlist = new Map<string, string>()

/**
 * Export every checkpoint board's netlist once, so `checkpointInput` can stay
 * synchronous.
 *
 * `exportNetlistFor` imports the circuit module, which is async; the grader's
 * own surface is not, and threading a promise through every helper for one
 * setup step would make the tests read worse than they check.
 */
export async function primeCheckpointNetlists(): Promise<void> {
  const root = moduleRepoRoot()
  for (const [, entry] of Object.entries(CHECKPOINT_BOARDS)) {
    if (exportedNetlist.has(entry.declaration)) continue
    const declaration = loadDeclaration(path.join(root, entry.declaration))
    exportedNetlist.set(entry.declaration, await exportNetlistFor(declaration))
  }
}
