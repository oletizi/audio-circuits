/**
 * Materialise `pultec-low-boost` onto a base built fresh by `--import` from the
 * circuit, and hand back both the board's dump text and its parsed form.
 *
 * **ITS OWN MODULE BECAUSE TWO TEST FILES NOW MATERIALISE THE SAME BOARD FOR
 * DIFFERENT REASONS.** `./materialize-span.test.ts` measures every two-lead
 * part's separation off the result; `./materialize-net-names.test.ts` reads the
 * net names off it. The assembly they share - the candidate, the fork runner,
 * the fresh base, the spawn and the dump - is around a hundred lines, and a
 * second copy of it would be a second place where "which seed, which base,
 * which ordering" is stated. It was lifted out of `materialize-span.test.ts`
 * unchanged apart from the split; what stayed there is the two-lead reading,
 * which is that file's own subject.
 *
 * **NEVER THE COMMITTED `.vrt`** - `tools/stripboard/materialize-base.ts`
 * states the rule and the reasons for it. `--import` reads the SAME circuit
 * export (`boards/pultec-low-boost/perfboard.json`'s declared module) that
 * `lowBoostCandidate` reads through `sectionBoard`, so the two agree on which
 * components exist.
 *
 * **NOTHING UNDER `boards/` IS WRITTEN.** The layout document, the fresh base
 * and the materialised board are all in a registered scratch directory, which
 * is why every caller arms `afterAll(cleanUpTempScratch)` -
 * `./temp-scratch.test.ts` holds that, and this module is declared in its
 * `REGISTERING` table.
 *
 * **IT DOES NOT SKIP WHEN THE FORK IS UNAVAILABLE.** `spawnSync` failing is a
 * loud throw naming the binary, because a skipped check that looks like a
 * passing one is the failure mode the whole stripboard workflow exists to
 * prevent.
 */
import path from "node:path"
import { spawnSync } from "node:child_process"
import { sectionBoard } from "../../circuits/pultec/physical/board.ts"
import { LEAD_SPANS } from "../../lib/kicad/lead-span.ts"
import { PIN_PATTERNS } from "../../lib/kicad/pin-pattern.ts"
import type { Candidate } from "../../lib/stripboard/board.ts"
import type { ReferenceNets } from "../../lib/stripboard/cuts.ts"
import { seedPartsFrom } from "../../lib/stripboard/seed-parts.ts"
import { seedsFrom } from "../../lib/stripboard/seed.ts"
import { parseBoardDump, type BoardDump } from "../../tools/guide/dump.ts"
import { exportNetlistFor, verorouteBinary } from "../../tools/perfboard/check.ts"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { freshImportBase } from "../../tools/stripboard/materialize-base.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { assignStrips, referenceNetsFor } from "../../tools/stripboard/seed-arrangement.ts"
import { deriveTargets } from "../../tools/stripboard/targets.ts"
import { materialize } from "../../tools/stripboard/vero-export.ts"
import { freshTempScratch } from "../support/temp-scratch.ts"

export const REPO = moduleRepoRoot()
export const SECTION = "low-boost"
export const BOARD = `pultec-${SECTION}`

/**
 * The seed whose ordering this materialises.
 *
 * `rcm s0` is the ordering the end-to-end run of this board used, and it is the
 * ordering the span disagreement was measured against, so the separations
 * `./materialize-span.test.ts` asserts are the ones that disagreement was
 * recorded over. It is taken from `stripboard/rules.json`'s own reviewed seed
 * list through `loadRules`, not written here, so there is one place that says
 * which restarts the pipeline takes.
 */
export const SEED = 0

/** Run the pinned fork, or throw naming the binary. Never skips. */
export function runFork(args: readonly string[]): {
  status: number
  stdout: string
  stderr: string
} {
  const binary = verorouteBinary(process.env, REPO)
  const run = spawnSync(binary, [...args], { encoding: "utf8" })
  if (run.error !== undefined) {
    throw new Error(
      `could not run ${binary} ${args.join(" ")}: ${run.error.message}. This test does not ` +
        "skip when the fork is unavailable: a skipped check that looks like a passing one is " +
        "the failure mode the whole stripboard workflow exists to prevent. " +
        "tools/perfboard/acquire.ts names the rebuild and veroroute.pin names the commit.",
    )
  }
  return { status: run.status ?? -1, stdout: run.stdout ?? "", stderr: run.stderr ?? "" }
}

/**
 * The low-boost candidate and its reference nets, by the route the capability
 * test already uses (`./model/pultec-capability.test.ts`).
 *
 * A test may import `tools/` and `lib/stripboard/` may not, which is why the
 * assembly is here: `deriveTargets` and `referenceNetsFor` read the circuit.
 * Residency is DECLARED through `sectionBoard`'s `offBoardIds` rather than
 * inferred from which refs have a footprint - `seedPartsFrom` refuses the
 * disagreement by name, and collapsing the two claims into one would remove
 * that refusal's reason to exist.
 */
export function lowBoostCandidate(): {
  readonly candidate: Candidate
  readonly reference: ReferenceNets
} {
  const board = sectionBoard(SECTION)
  const rules = loadRules()
  if (!rules.seeds.includes(SEED)) {
    throw new Error(
      `stripboard/rules.json's seed list is [${rules.seeds.join(", ")}] and this fixture ` +
        `materialises seed ${SEED}, which is not in it. The seed is not defaulted to the ` +
        "first entry: which ordering a measurement was taken against is the fact that makes " +
        "it reproducible, and silently taking another one would assert one candidate's " +
        "figures under another candidate's name. Either restore the seed to rules.json or " +
        "re-measure against a seed that is in it.",
    )
  }
  const targets = deriveTargets(board.network, rules.stockRows, BOARD)
  const reference = referenceNetsFor(targets)
  const footprints = new Map<string, string>()
  const offBoard = new Set<string>()
  for (const component of board.network.components) {
    const ref = board.designators[component.id]
    if (ref === undefined) continue
    const footprint = component.part?.footprint
    if (footprint !== undefined) footprints.set(ref, footprint)
    if (board.offBoardIds.has(component.id)) offBoard.add(ref)
  }
  const netlist = seedPartsFrom(
    reference,
    footprints,
    { patterns: PIN_PATTERNS, spans: LEAD_SPANS },
    offBoard,
  )
  const ordering = { name: `rcm s${SEED}`, homes: assignStrips(targets, SEED) }
  const candidate = seedsFrom(
    netlist,
    { strips: rules.stockRows, columns: rules.stockCols },
    LEAD_SPANS,
    [ordering],
  )[0]
  if (candidate === undefined) {
    throw new Error(
      `seedsFrom returned no candidate for ordering "${ordering.name}", so there is no ` +
        "candidate to materialise and no test using this fixture can establish anything " +
        "about --materialize. Fix seedsFrom or the ordering; nothing is substituted, because " +
        "a stand-in candidate would make every assertion a statement about the stand-in.",
    )
  }
  return { candidate, reference }
}

/** A materialised low-boost board: its dump text, its parsed dump, and what it was built from. */
export interface MaterialisedLowBoost {
  /** `--dump-board`'s own text, for the lines `parseBoardDump` does not model. */
  readonly text: string
  readonly dump: BoardDump
  readonly candidate: Candidate
  readonly reference: ReferenceNets
}

/**
 * Materialise low-boost and dump what was written.
 *
 * The FILE is dumped, not the in-memory board the verb verified: the fork's
 * PHASE 7 already reads every declared lead back off its grid, so a passing
 * `--materialize` is itself a claim about the board - dumping the written
 * `.vrt` is the independent half, because it measures what a later step
 * consumes.
 */
export async function materialisedLowBoost(prefix: string): Promise<MaterialisedLowBoost> {
  const { candidate, reference } = lowBoostCandidate()
  const scratch = freshTempScratch(prefix)
  const outPath = path.join(scratch, "materialized.vrt")
  const declaration = loadDeclaration(path.join(REPO, "boards", BOARD, "perfboard.json"))
  const netlist = await exportNetlistFor(declaration)
  const base = freshImportBase({ netlist, outPath: path.join(scratch, "fresh-base.vrt") }, runFork)
  materialize(
    {
      candidate,
      reference,
      base,
      layoutPath: path.join(scratch, "low-boost-layout.txt"),
      outPath,
    },
    runFork,
  )
  const run = runFork(["--dump-board", outPath])
  if (run.status !== 0) {
    throw new Error(
      `veroroute --dump-board ${outPath} exited ${run.status} on the board --materialize had ` +
        `just written, so what went onto it cannot be read back.\n${run.stderr}${run.stdout}`,
    )
  }
  return { text: run.stdout, dump: parseBoardDump(run.stdout), candidate, reference }
}
