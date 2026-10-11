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
  // WHAT THIS FIXTURE CANNOT SEE, worked out rather than discovered by
  // mutation: at `W = B = 1` the two weights are interchangeable, so swapping
  // them leaves 1 + 1 + 0.25 = 2.25 unchanged. The asymmetric case is the
  // test below, and it is a separate test for that reason.
  //
  // MUTATION RUN: with the solder term dropped from `objectiveOf` this failed
  // with 'Expected: 2.25 / Received: 1.25'. Reverted.
  const rules = loadRules()
  expect([rules.rhoWire, rules.rhoSolder], "2.25 below is right only at these weights")
    .toEqual([0.25, 1])
  const score = scoreDumpText(TEXT, FIXTURE_TARGETS, rules)
  expect([score.cuts, score.wires, score.solder]).toEqual([1, 1, 1])
  expect(score.objective).toBe(2.25)
})

test("a wire and a solder bridge are priced differently, which W = B cannot show", async () => {
  // THE ASYMMETRIC CASE, and the reason it is a separate test: at W = B the
  // two weights are interchangeable and a swapped pair passes. pt2399-core's
  // committed dump has four WIRE lines and six SOLDER lines, so
  // 12 + 0.25*4 + 1*6 = 19 while the swap gives 12 + 1*4 + 0.25*6 = 17.5.
  //
  // THE THREE COUNTS ARE grep-COUNTED off the fixture here rather than
  // restated, so the 19 is the only number written, and it is hand-added.
  //
  // MUTATION RUN: with the weights swapped in `objectiveOf` this failed with
  // 'error: pt2399-core / Expected: 19 / Received: 17.5'. Reverted.
  const text = await Bun.file(PT2399_DUMP).text()
  const counts = {
    cuts: grepCount(text, "CUT "),
    wires: grepCount(text, "WIRE "),
    solder: grepCount(text, "SOLDER "),
  }
  expect(counts).toEqual({ cuts: 12, wires: 4, solder: 6 })
  expect(objectiveOf(counts, loadRules()), "pt2399-core").toBe(19)
})

test("F reproduces COST section 2.2's recorded objective on all five Pultec boards", () => {
  // EVERY INPUT IS COST's, carried in ./targets-oracle.ts with its provenance:
  // §1.6's cut count and §2.2's wire and solder columns. The expected F is
  // hand-added from them at the committed weights, one line per board:
  //
  //   mid       65 + 0.25*0 + 1*3 = 68
  //   hi-boost  40 + 0.25*0 + 1*0 = 40
  //   hi-cut    32 + 0.25*0 + 1*3 = 35
  //   low-cut   23 + 0.25*0 + 1*0 = 23
  //   low-boost  5 + 0.25*0 + 1*1 = 6
  //
  // All five have W = 0, which is why the two tests above exist: this oracle
  // cannot see rho_w on its own.
  //
  // MUTATION RUN: with `objectiveOf` dropping the solder term this failed with
  // 'error: mid / Expected: 68 / Received: 65'. With the two weights swapped it
  // failed with 'error: mid / Expected: 68 / Received: 65.75' - so W = 0 does
  // not make this oracle blind to the swap, it makes it blind only to rho_w's
  // VALUE. Both runs stop at mid, the first board in the loop, so nothing may
  // be concluded here about the other four. Reverted.
  const rules = loadRules()
  const recorded: readonly (readonly [string, number])[] = [
    ["mid", 68], ["hi-boost", 40], ["hi-cut", 35], ["low-cut", 23], ["low-boost", 6],
  ]
  for (const [section, expectedF] of recorded) {
    const board = BOARDS.find((measured) => measured.section === section)
    if (board === undefined) {
      throw new Error(`no measured board named "${section}" in ./targets-oracle.ts`)
    }
    const counts = { cuts: board.cuts, wires: board.wires, solder: board.solder }
    expect(objectiveOf(counts, rules), section).toBe(expectedF)
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
