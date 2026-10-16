/**
 * `--materialize` sets each part's span from the document it is materialising,
 * and this reads every two-lead part's separation back off the board.
 *
 * **WHAT WAS HERE BEFORE, AND WHY IT IS GONE.** This file was written as the
 * witness for the gap `docs/known-gaps.md` carried as G12 until this change
 * deleted that entry (the register deletes a gap rather than marking it, so
 * there is nothing left there to look up): `--materialize` solved each part's
 * facing against whatever span the base `.vrt` happened to be left at, nothing
 * reconciled that with the separation the candidate declared, and low-boost
 * refused on its first capacitor. That test asserted the refusal and passed
 * while the gap was open. The gap is closed - the fork's turn search now derives
 * the required footprint length from the declared leads and stretches to it - so
 * the witness was DELETED rather than inverted, exactly as its own header said
 * it would be. A test that says "this refuses" is worthless the moment it does
 * not, and an inverted one would assert the absence of a message instead of the
 * presence of a board.
 *
 * **WHAT IT ASSERTS INSTEAD.** That low-boost materialises at all, and that
 * every one of its FIFTEEN two-lead parts comes back off the board at the
 * separation the candidate declared - read from the materialised board's own
 * `--dump-board` `PIN` lines, not from the fork's exit status. The fork's
 * PHASE 7 already reads every declared lead back off its grid, so a passing
 * `--materialize` is itself a claim about the leads; dumping the written `.vrt`
 * and measuring it is the independent half, because it measures the FILE a later
 * step consumes rather than the in-memory board the verb verified.
 *
 * **THE SEPARATION, NOT THE SPAN, IS WHAT IS COMPARED.** A part's separation is
 * the distance in holes between its two leads; the footprint's span is one hole
 * more. The candidate and the dump are both read for separations here, so no
 * conversion is done in this file and neither side's convention has to be
 * restated.
 *
 * **IT DOES NOT SKIP WHEN THE FORK IS UNAVAILABLE.** `spawnSync` failing is a
 * loud throw naming the binary, because a skipped check that looks like a
 * passing one is the failure mode the whole stripboard workflow exists to
 * prevent. Nothing under `boards/` is written: the document and the output board
 * are both in a registered scratch directory.
 */
import { afterAll, expect, test } from "bun:test"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { sectionBoard } from "../../circuits/pultec/physical/board.ts"
import { LEAD_SPANS } from "../../lib/kicad/lead-span.ts"
import { PIN_PATTERNS } from "../../lib/kicad/pin-pattern.ts"
import { OFF_BOARD_TERMINAL, type Candidate } from "../../lib/stripboard/board.ts"
import { derivedCuts, type ReferenceNets } from "../../lib/stripboard/cuts.ts"
import { seedPartsFrom } from "../../lib/stripboard/seed-parts.ts"
import { seedsFrom } from "../../lib/stripboard/seed.ts"
import { parseBoardDump, type BoardDump } from "../../tools/guide/dump.ts"
import { verorouteBinary } from "../../tools/perfboard/check.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { fabricationExtent } from "../../tools/stripboard/extent.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { assignStrips, referenceNetsFor } from "../../tools/stripboard/seed-arrangement.ts"
import { deriveTargets } from "../../tools/stripboard/targets.ts"
import { materialize } from "../../tools/stripboard/vero-export.ts"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"

const REPO = moduleRepoRoot()
const SECTION = "low-boost"
const BOARD = `pultec-${SECTION}`

/**
 * The seed whose ordering this test materialises.
 *
 * `rcm s0` is the ordering the end-to-end run of this board used, and it is the
 * ordering the span disagreement was measured against, so the separations asserted
 * below are the ones that disagreement was recorded over. It is taken from
 * `stripboard/rules.json`'s own reviewed seed list through `loadRules`, not
 * written here, so there is one place that says which restarts the pipeline
 * takes.
 */
const SEED = 0

/** How many of low-boost's placements have exactly two leads. See the premise assertion. */
const TWO_LEAD_PARTS = 15

/**
 * The low-boost candidate and its reference nets, by the route the capability
 * test already uses (`tests/stripboard/model/pultec-capability.test.ts`).
 *
 * A test may import `tools/` and `lib/stripboard/` may not, which is why the
 * assembly is here: `deriveTargets` and `referenceNetsFor` read the circuit.
 * Residency is DECLARED through `sectionBoard`'s `offBoardIds` rather than
 * inferred from which refs have a footprint - `seedPartsFrom` refuses the
 * disagreement by name, and collapsing the two claims into one would remove
 * that refusal's reason to exist.
 */
function lowBoostCandidate(): { readonly candidate: Candidate; readonly reference: ReferenceNets } {
  const board = sectionBoard(SECTION)
  const rules = loadRules()
  if (!rules.seeds.includes(SEED)) {
    throw new Error(
      `stripboard/rules.json's seed list is [${rules.seeds.join(", ")}] and this test ` +
        `materialises seed ${SEED}, which is not in it. The seed is not defaulted to the ` +
        "first entry: which ordering these separations were measured against is the fact that " +
        "makes them reproducible, and silently taking another one would assert one candidate's " +
        "spans under another candidate's name. Either restore the seed to rules.json or " +
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
        "candidate to materialise and this test cannot establish anything about " +
        "--materialize. Fix seedsFrom or the ordering; nothing is substituted, because a " +
        "stand-in candidate would make the assertions below statements about the stand-in.",
    )
  }
  return { candidate, reference }
}

/** Run the pinned fork, or throw naming the binary. Never skips. */
function runFork(args: readonly string[]): { status: number; stdout: string; stderr: string } {
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
 * The separation in holes between a placement's two declared leads.
 *
 * Refuses a placement that is not two-lead rather than returning a number for
 * it: the caller filters on the lead count, so reaching here with another count
 * would mean the filter and this function disagree, and a Chebyshev-like
 * fallback over three holes would quietly answer a question nobody asked.
 */
function declaredSeparation(ref: string, holes: readonly { strip: number; column: number }[]): number {
  const [a, b] = holes
  if (a === undefined || b === undefined) {
    throw new Error(
      `${ref} reached declaredSeparation with ${holes.length} declared leads, and a separation ` +
        "is a fact about exactly two. The caller filters on the lead count, so this is a defect " +
        "in that filter rather than in the candidate; nothing is substituted.",
    )
  }
  return Math.abs(a.strip - b.strip) + Math.abs(a.column - b.column)
}

/**
 * Materialise low-boost onto its committed board, then dump what was written.
 *
 * The declared separations come from the candidate rather than from the document
 * text, because the candidate is what the document is generated from and
 * re-parsing the generated text here would compare the exporter with itself.
 */
function materializeLowBoost(): {
  readonly dump: BoardDump
  readonly declared: ReadonlyMap<string, number>
  readonly candidate: Candidate
  readonly reference: ReferenceNets
} {
  const { candidate, reference } = lowBoostCandidate()
  const scratch = freshTempScratch("stripboard-materialize-span-")
  const outPath = path.join(scratch, "materialized.vrt")
  materialize(
    {
      candidate,
      reference,
      base: path.join(REPO, "boards", BOARD, `${BOARD}.perfboard.vrt`),
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
  const declared = new Map<string, number>()
  for (const placement of candidate.placements) {
    if (placement.footprint === OFF_BOARD_TERMINAL) continue
    if (placement.pins.size !== 2) continue
    declared.set(placement.ref, declaredSeparation(placement.ref, [...placement.pins.values()]))
  }
  return { dump: parseBoardDump(run.stdout), declared, candidate, reference }
}

test("every two-lead part materialises at the separation the document declares", () => {
  const { dump, declared } = materializeLowBoost()
  expect(declared.size, "the premise: low-boost places fifteen two-lead parts").toBe(
    TWO_LEAD_PARTS,
  )
  for (const [ref, separation] of declared) {
    const pins = dump.pins[ref]
    if (pins === undefined || pins.length !== 2) {
      throw new Error(
        `the materialised board's dump carries ${pins === undefined ? "no" : String(pins.length)} ` +
          `PIN lines for the two-lead part ${ref}, so the separation it was placed at cannot be ` +
          "read. A part with no PIN lines is floating (tools/guide/dump-model.ts), which is the " +
          "one outcome that looks like a board and is not one.",
      )
    }
    const [a, b] = pins
    if (a === undefined || b === undefined) {
      throw new Error(`${ref} reported two PIN lines and one of them could not be read back.`)
    }
    expect(
      Math.abs(a.row - b.row) + Math.abs(a.col - b.col),
      `${ref} is on the board at the separation the document declares`,
    ).toBe(separation)
  }
})

/**
 * The board the model asked for, counted.
 *
 * **WHY THIS IS A SEPARATE CLAIM FROM THE SPANS.** Every lead being in its
 * declared hole says the parts went down as asked; it says nothing about whether
 * the COPPER the document partitioned is the copper on the board, and a
 * materialisation that got the parts right and the partition wrong would pass
 * the test above. The cut and wire counts are compared against the model's OWN
 * derivation over the same candidate rather than against literals, so the two
 * sides are the two things that have to agree.
 *
 * **THE TWO LITERALS ARE THE PLAN'S RECORDED FIGURES**, and they are literals
 * because nothing in `lib/` predicts them: the fabrication extent is measured
 * off the board by `fabricationExtent`, and a solder bridge is the fork's own
 * `CalcSolder` derivation. `19 x 23` and five bridges are what this candidate
 * was recorded at, so a change in either is a change in the board this pipeline
 * produces and should be read rather than accommodated.
 */
test("the materialised low-boost board is the board the model asked for", () => {
  const { dump, candidate, reference } = materializeLowBoost()
  expect(dump.cutState, "the fork computed the partition rather than giving up on it").toBe(
    "COMPUTED",
  )
  expect(dump.cuts.length, "the cuts on the board are the cuts the model derived").toBe(
    derivedCuts(candidate, reference).length,
  )
  expect(dump.wires.length, "the wires on the board are the candidate's own wires").toBe(
    candidate.wires.length,
  )
  expect(dump.bridges.length, "the solder bridges this candidate was recorded at").toBe(5)
  const extent = fabricationExtent(dump)
  expect(
    [extent.rows, extent.cols],
    "the fabrication extent this candidate was recorded at",
  ).toEqual([19, 23])
})

/**
 * The shape `tests/stripboard/temp-scratch.test.ts` requires, and nothing
 * fancier: that guard matches `afterAll(cleanUpTempScratch)` or
 * `afterAll(() => cleanUpTempScratch...)` literally, so a wrapper that also
 * asserted the removed count would read to it as a file that never armed the
 * hook at all. One shape for every file is the point of that guard.
 */
afterAll(cleanUpTempScratch)
