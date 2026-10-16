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
 * **THE HOLES ARE WHAT IS COMPARED, NOT THE SPAN AND NOT EVEN THE SEPARATION.**
 * A part's separation is the distance in holes between its two leads and the
 * footprint's span is one hole more, so comparing either would need a convention
 * restated on both sides - and a separation is a Manhattan distance, which a
 * diagonal displacement of the same total would satisfy. Both sides are read for
 * the two HOLES instead, as an unordered pair, and the separation is carried only
 * so a failure says by how much.
 *
 * **IT DOES NOT SKIP WHEN THE FORK IS UNAVAILABLE.** `spawnSync` failing is a
 * loud throw naming the binary, because a skipped check that looks like a
 * passing one is the failure mode the whole stripboard workflow exists to
 * prevent. Nothing under `boards/` is written: the document and the output board
 * are both in a registered scratch directory.
 *
 * **THE BASE IS NO LONGER THE COMMITTED `.vrt`.** It was, when this file was
 * written for the span fix above - a convenience named inline, not a rule.
 * `tools/stripboard/materialize-base.ts` states the rule a later task made of
 * that choice (a base built fresh by `--import` from the circuit, never the
 * committed file, which is adoption's OUTPUT), and this file's base was moved
 * onto it rather than left as the exception the rule forgot.
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
import { exportNetlistFor, verorouteBinary } from "../../tools/perfboard/check.ts"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { fabricationExtent } from "../../tools/stripboard/extent.ts"
import { freshImportBase } from "../../tools/stripboard/materialize-base.ts"
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
 * What a two-lead placement declares: the two holes, and how far apart they are.
 *
 * **THE HOLES ARE WHAT IS COMPARED, AND THE SEPARATION IS ONLY REPORTED.** A
 * separation is a Manhattan distance, which does not distinguish a diagonal
 * displacement of the same total from the arrangement the document asked for -
 * so asserting it alone would be a weaker claim than this test's name. The holes
 * are compared as an unordered pair (two holes, not pin 1 and pin 2: which pin
 * of a two-terminal passive sits in which end is a fact about the fitted part's
 * polarity, which the fork's own facing solve is entitled to choose), and the
 * separation is carried alongside so a failure message says by how much.
 *
 * Refuses a placement that is not two-lead rather than answering for it: the
 * caller filters on the lead count, so reaching here with another count would
 * mean the filter and this function disagree.
 */
interface TwoLead {
  readonly holes: readonly string[]
  readonly separation: number
}

function twoLeadOf(ref: string, holes: readonly { strip: number; column: number }[]): TwoLead {
  const [a, b] = holes
  if (a === undefined || b === undefined || holes.length !== 2) {
    throw new Error(
      `${ref} reached twoLeadOf with ${holes.length} declared leads, and this is a fact about ` +
        "exactly two. The caller filters on the lead count, so this is a defect in that filter " +
        "rather than in the candidate; nothing is substituted.",
    )
  }
  return {
    holes: [`${a.strip},${a.column}`, `${b.strip},${b.column}`].sort(),
    separation: Math.abs(a.strip - b.strip) + Math.abs(a.column - b.column),
  }
}

/**
 * Materialise low-boost onto a base built fresh by `--import` from the
 * circuit, then dump what was written.
 *
 * **NEVER THE COMMITTED `.vrt`** - `tools/stripboard/materialize-base.ts`
 * states the rule and the reasons for it. `--import` reads the SAME circuit
 * export (`boards/pultec-low-boost/perfboard.json`'s declared module) that
 * `lowBoostCandidate` above read through `sectionBoard`, so the two agree on
 * which components exist; building the base this way is what this test is
 * now itself a measurement of.
 *
 * The declared separations come from the candidate rather than from the document
 * text, because the candidate is what the document is generated from and
 * re-parsing the generated text here would compare the exporter with itself.
 */
async function materializeLowBoost(): Promise<{
  readonly dump: BoardDump
  readonly declared: ReadonlyMap<string, TwoLead>
  readonly candidate: Candidate
  readonly reference: ReferenceNets
}> {
  const { candidate, reference } = lowBoostCandidate()
  const scratch = freshTempScratch("stripboard-materialize-span-")
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
  // **THE MAP REFUSES A COLLISION RATHER THAN COLLAPSING INTO ONE ENTRY.** The
  // premise below asserts a COUNT, and keying by ref without this check would let
  // two placements sharing a ref under-count it - a quieter failure than the one
  // the premise exists to catch, and the one spot in this file that was out of
  // step with the rest of it. `vero-import.ts`'s pads are the real case where one
  // ref carries several placements, so this is not hypothetical, only filtered
  // out above.
  const declared = new Map<string, TwoLead>()
  for (const placement of candidate.placements) {
    if (placement.footprint === OFF_BOARD_TERMINAL) continue
    if (placement.pins.size !== 2) continue
    if (declared.has(placement.ref)) {
      throw new Error(
        `the candidate carries two two-lead placements both called "${placement.ref}", so the ` +
          "separations below cannot be keyed by ref and the count asserted as the premise " +
          "would silently be one short. Nothing is merged: two placements with one ref is a " +
          "statement about the candidate that this test is not the place to resolve.",
      )
    }
    declared.set(placement.ref, twoLeadOf(placement.ref, [...placement.pins.values()]))
  }
  return { dump: parseBoardDump(run.stdout), declared, candidate, reference }
}

test("every two-lead part materialises at the separation the document declares", async () => {
  const { dump, declared } = await materializeLowBoost()
  expect(declared.size, "the premise: low-boost places fifteen two-lead parts").toBe(
    TWO_LEAD_PARTS,
  )
  for (const [ref, lead] of declared) {
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
    const onBoard = [`${a.row},${a.col}`, `${b.row},${b.col}`].sort()
    expect(
      onBoard,
      `${ref} is in the two holes the document declares, ${lead.separation} apart`,
    ).toEqual([...lead.holes])
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
test("the materialised low-boost board is the board the model asked for", async () => {
  const { dump, candidate, reference } = await materializeLowBoost()
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
