/**
 * `F = C + ρ_w·W + ρ_s·B`: the objective, and the two weights it is the only
 * consumer of.
 *
 * `OBJ1` and `PAR1`. `./score-fixtures.ts` says where every expectation here
 * comes from and why none of them is the code's own expression re-evaluated;
 * read that first. The other three checks are in `./score-counts.test.ts`
 * (`V1`), `./score-identity.test.ts` (`V2`) and `./score-floor.test.ts`
 * (`K5`).
 */
import { test, expect } from "bun:test"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { objectiveOf, scoreDumpText } from "../../tools/stripboard/score.ts"
import { BOARDS } from "./targets-oracle.ts"
import { FIXTURE_TARGETS, PT2399_DUMP, TEXT, grepCount } from "./score-fixtures.ts"

test("F is C + rho_w*W + rho_s*B over the dump's own line counts", () => {
  // The counts are hand-read off TEXT: one CUT, one WIRE, one SOLDER line.
  //
  // 2.25 IS HAND ARITHMETIC AND NOT THE CODE'S EXPRESSION RE-EVALUATED:
  // 1 + 0.25 + 1, written as the one number it comes to. The two guards above
  // it say which rules values it is right at, so a change to either weight
  // fails by naming the weight rather than by leaving 2.25 unexplained.
  //
  // WHAT THIS FIXTURE CANNOT SEE, AND IT IS NO LONGER A GAP A TEST CAN CLOSE:
  // the two weights are now EQUAL - the owner builds a solder blob as a wire
  // and the price follows the artifact (stripboard/rules.json's rhoSolder note)
  // - so no fixture anywhere can distinguish a swapped pair, because there is
  // nothing left to swap. The test below is what remains of the asymmetric
  // case: that the solder term is still in F at all.
  //
  // MUTATION RUN: with the solder term dropped from `objectiveOf` this failed
  // with 'Expected: 1.5 / Received: 1.25'. Reverted.
  const rules = loadRules()
  expect([rules.rhoWire, rules.rhoSolder], "1.5 below is right only at these weights")
    .toEqual([0.25, 0.25])
  const score = scoreDumpText(TEXT, FIXTURE_TARGETS, rules)
  expect([score.cuts, score.wires, score.solder]).toEqual([1, 1, 1])
  expect(score.objective).toBe(1.5)
})

test("a wire and a solder bridge are priced the SAME, and both are still in F", async () => {
  // **THIS TEST ASSERTED THE OPPOSITE UNTIL 2026-10-12, AND IT IS REWRITTEN
  // RATHER THAN DELETED SO THE CHANGE IS VISIBLE.** It read "a wire and a
  // solder bridge are priced differently, which W = B cannot show", and its
  // whole content was that a SWAP of the two weights is detectable on an
  // asymmetric board: pt2399-core's committed dump has four WIRE lines and six
  // SOLDER lines, so 12 + 0.25*4 + 1*6 = 19 against the swap's
  // 12 + 1*4 + 0.25*6 = 17.5.
  //
  // The owner's instruction removed the asymmetry rather than the test's
  // subject: "A solder blob will turn into a wire on my bench", so a blob is
  // priced as a wire (stripboard/rules.json's rhoSolder note, and the deviation
  // recorded in docs/superpowers/plans/2026-10-10-stripboard-pipeline.md). At
  // equal weights a swap is UNDETECTABLE BY CONSTRUCTION and no fixture can
  // change that, so what this test holds now is the half that still has teeth:
  // the solder count is still a term of F and is not silently folded into W or
  // dropped. 12 + 0.25*4 + 0.25*6 = 14.5, hand-added.
  //
  // THE THREE COUNTS ARE grep-COUNTED off the fixture here rather than
  // restated, so the 14.5 is the only number written.
  //
  // MUTATION RUN: with the solder term dropped from `objectiveOf` this failed
  // with 'error: pt2399-core / Expected: 14.5 / Received: 13'. With the two
  // weights swapped it PASSED, which is the construction above and not a gap.
  // Reverted.
  const text = await Bun.file(PT2399_DUMP).text()
  const counts = {
    cuts: grepCount(text, "CUT "),
    wires: grepCount(text, "WIRE "),
    solder: grepCount(text, "SOLDER "),
  }
  expect(counts).toEqual({ cuts: 12, wires: 4, solder: 6 })
  const rules = loadRules()
  expect(rules.rhoSolder, "a blob is built as a wire, so it is priced as one").toBe(rules.rhoWire)
  expect(objectiveOf(counts, rules), "pt2399-core").toBe(14.5)
})

test("F reproduces COST section 2.2's recorded objective on all five Pultec boards", () => {
  // EVERY INPUT IS COST's, carried in ./targets-oracle.ts with its provenance:
  // §1.6's cut count and §2.2's wire and solder columns.
  //
  // **COST'S RECORDED OBJECTIVE IS A FIGURE AT `ρ_s = 1`, AND IT IS CHECKED AT
  // THAT WEIGHT RATHER THAN RESTATED AT TODAY'S.** The committed `rhoSolder` is
  // now 0.25 on the owner's instruction - a blob is built as a wire
  // (stripboard/rules.json's note, and the deviation recorded in
  // docs/superpowers/plans/2026-10-10-stripboard-pipeline.md) - so the spec's
  // own numbers no longer reproduce under `loadRules()`. The spec is left as
  // written and both columns are asserted: the recorded figure at the weight it
  // was recorded at, which is what keeps COST an oracle over this scorer, and
  // the figure at the committed weights, hand-added from the same three counts.
  //
  //   board      C   W   B    at ρ_s = 1        at the committed ρ_s = 0.25
  //   mid        65   0   3   65 + 3    = 68    65 + 0.75 = 65.75
  //   hi-boost   40   0   0   40        = 40    40        = 40
  //   hi-cut     32   0   3   32 + 3    = 35    32 + 0.75 = 32.75
  //   low-cut    23   0   0   23        = 23    23        = 23
  //   low-boost   5   0   1    5 + 1    =  6     5 + 0.25 =  5.25
  //
  // All five have W = 0, which is why the two tests above exist: this oracle
  // cannot see rho_w on its own.
  //
  // MUTATION RUN: with `objectiveOf` dropping the solder term this failed with
  // 'error: mid at COST's rho_s = 1 / Expected: 68 / Received: 65'. A SWAP of
  // the two weights now passes here and everywhere, because the committed
  // weights are equal - see the test above, which carries that whole argument.
  // Reverted.
  const rules = loadRules()
  const atCostWeight = { ...rules, rhoSolder: 1 }
  const recorded: readonly (readonly [string, number, number])[] = [
    ["mid", 68, 65.75],
    ["hi-boost", 40, 40],
    ["hi-cut", 35, 32.75],
    ["low-cut", 23, 23],
    ["low-boost", 6, 5.25],
  ]
  for (const [section, costF, committedF] of recorded) {
    const board = BOARDS.find((measured) => measured.section === section)
    if (board === undefined) {
      throw new Error(`no measured board named "${section}" in ./targets-oracle.ts`)
    }
    const counts = { cuts: board.cuts, wires: board.wires, solder: board.solder }
    expect(objectiveOf(counts, atCostWeight), `${section} at COST's rho_s = 1`).toBe(costF)
    expect(objectiveOf(counts, rules), `${section} at the committed weights`).toBe(committedF)
  }
})

test("the scorer carries no threshold of its own: every weight comes from the rules", () => {
  // PAR3: nothing the pipeline is graded against is written in the code that
  // grades. Doubling and quadrupling the two weights moves F by exactly the
  // two terms, so 1 + 2 + 4 = 7 - hand arithmetic again.
  //
  // MUTATION RUN: with `rhoWire` replaced by a literal 0.25 in `objectiveOf`
  // this failed with 'Expected: 7 / Received: 5.25'. Reverted.
  const doubled = { ...loadRules(), rhoWire: 2, rhoSolder: 4 }
  expect(scoreDumpText(TEXT, FIXTURE_TARGETS, doubled).objective).toBe(7)
})

test("the Score reports nine counts and no verdict, because tau is unset", () => {
  // K4: tau is null in the committed rules, so Q2 and A3 do not fire and
  // there is no tolerance for the scorer to report. The shape is pinned so a
  // later `withinTolerance` or `verdict` field cannot arrive here unnoticed -
  // the scorer is the search's number, and the grader is the product.
  expect(loadRules().tau).toBeNull()
  expect(Object.keys(scoreDumpText(TEXT, FIXTURE_TARGETS, loadRules())).sort()).toEqual([
    "clustering", "cuts", "joins", "netCount", "objective", "occupied", "pinCount",
    "solder", "wires",
  ])
})
