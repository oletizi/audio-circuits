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
 *
 * **THE MATERIALISATION ITSELF NOW LIVES IN `./materialize-low-boost.ts`.**
 * `./materialize-net-names.test.ts` reads the net names off the same board, and
 * one more copy of the candidate assembly would have been a second place
 * stating which seed, which base and which ordering this pipeline is measured
 * at. Nothing in it changed in the move; the two-lead reading stayed here.
 */
import { afterAll, expect, test } from "bun:test"
import { OFF_BOARD_TERMINAL, type Candidate } from "../../lib/stripboard/board.ts"
import { derivedCuts, type ReferenceNets } from "../../lib/stripboard/cuts.ts"
import type { BoardDump } from "../../tools/guide/dump.ts"
import { fabricationExtent } from "../../tools/stripboard/extent.ts"
import { materialisedLowBoost } from "./materialize-low-boost.ts"
import { cleanUpTempScratch } from "../support/temp-scratch.ts"

/** How many of low-boost's placements have exactly two leads. See the premise assertion. */
const TWO_LEAD_PARTS = 15

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
 * The materialised board, plus every two-lead placement the document declared.
 *
 * The materialisation itself is `./materialize-low-boost.ts` - shared with
 * `./materialize-net-names.test.ts`, which reads the same board for its net
 * names. What stays here is the two-lead reading, which is this file's subject.
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
  const { dump, candidate, reference } = await materialisedLowBoost(
    "stripboard-materialize-span-",
  )
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
  return { dump, declared, candidate, reference }
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
