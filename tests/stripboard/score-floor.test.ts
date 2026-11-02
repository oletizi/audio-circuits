/**
 * `K5`: `F ≥ F_floor` on every candidate, and a candidate below the declared
 * floor is a VERIFICATION FAILURE rather than an unexpectedly good result.
 *
 * `./score-fixtures.ts` says where every expectation here comes from. The
 * other two checks are in `./score-counts.test.ts` (`V1`) and
 * `./score-identity.test.ts` (`V2`), and the objective itself in
 * `./score-objective.test.ts`.
 */
import { test, expect } from "bun:test"
import { boardGeometry } from "../../tools/stripboard/copper.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { countLines, scoreDump, scoreDumpText } from "../../tools/stripboard/score.ts"
import { refusalFrom } from "./targets-oracle.ts"
import { FIXTURE_TARGETS, FROZEN_DUMP, TEXT, lowBoostTargets } from "./score-fixtures.ts"

test("K5: a candidate scoring below its declared floor refuses, naming both numbers", () => {
  // F_floor is a LOWER bound, so a candidate beneath it proves one of the two
  // numbers is not the quantity it claims. The alternative is a pipeline that
  // reports beating a bound it derived itself, which is the most convincing
  // wrong answer available to it: (F - F_floor)/max(1, F_0 - F_floor) goes
  // negative and Q2 and A3 both pass with room to spare.
  //
  // MUTATION RUN: with the floor comparison deleted this failed with 'Expected
  // to start with: "score-below-floor:" / Received: ""', and so did the two K5
  // tests below it - three failures and sixteen passes across the four score
  // files. Reverted.
  const overstated = { ...FIXTURE_TARGETS, cutFloor: 99 }
  const message = refusalFrom(() => scoreDumpText(TEXT, overstated, loadRules()))
  expect(message).toStartWith("score-below-floor:")
  expect(message).toContain("99")
  expect(message).toContain("fixture")
  expect(message).toContain("1.5")
  expect(message).toContain("floor")
})

test("K5 compares F against the floor, so a candidate AT its floor is kept", async () => {
  // THE BOUNDARY, which `F < F_floor` and `F <= F_floor` disagree about and
  // which a single overstated-floor test cannot see. low-boost's F is 5.25 -
  // COST §2.2's `C = 5` and `B = 1` at the committed `rhoSolder` of 0.25 - so a
  // declared floor of 5.25 is met and 6 is not.
  //
  // **THE FLOOR IS WRITTEN AT `F` RATHER THAN AT AN INTEGER, AND THAT IS WHAT
  // THE BOUNDARY CASE COSTS NOW.** A derived `C_floor = max(0, N - R)` is an
  // integer, so `F = F_floor` is only reachable on a board with no wire and no
  // blob once a blob is priced at a quarter; 5.25 is this fixture's way of
  // putting a candidate exactly AT a declared floor, which is the only
  // candidate `K5` must not reject and the only one `Q1` may report as
  // `at-floor`. The 6 on the other side was the figure this test used until
  // `rhoSolder` moved, and it is now the REFUSING case rather than the met one.
  //
  // MUTATION RUN: with the comparison written `objective <= targets.cutFloor`
  // the at-floor case failed with 'Expected: "" / Received: "score-below-
  // floor: pultec-low-boost scores F = 5.25, below its declared floor of 5.25
  // (C = 5, W = 0, B = 1). ..."' - a board provably AT its floor refused as
  // impossible. Reverted.
  const text = await Bun.file(FROZEN_DUMP).text()
  const targets = lowBoostTargets()
  const rules = loadRules()
  expect(refusalFrom(() => scoreDumpText(text, { ...targets, cutFloor: 5.25 }, rules))).toBe("")
  expect(refusalFrom(() => scoreDumpText(text, { ...targets, cutFloor: 6 }, rules)))
    .toStartWith("score-below-floor:")
})

test("K5's refusal fires rather than a negative gap reaching the report", () => {
  // The distinction the whole check exists for: a below-floor score is a
  // VERIFICATION FAILURE, not an unexpectedly good result. Nothing is
  // returned, so there is no Score carrying a negative gap for a report to
  // present as success. Both entry points are driven, because K5 lives in
  // `scoreDump` and `scoreDumpText` must not be able to route around it.
  //
  // MUTATION RUN: with the floor comparison deleted this failed with
  // 'expect(received).toThrow() / Received function did not throw / Received
  // value: {' followed by the Score it should never have produced. Reverted.
  const overstated = { ...FIXTURE_TARGETS, cutFloor: 99 }
  expect(() => scoreDumpText(TEXT, overstated, loadRules())).toThrow()
  expect(() => scoreDump(boardGeometry(TEXT), overstated, loadRules(), countLines(TEXT)))
    .toThrow()
})

test("the floor is read from the targets and no floor is defaulted when scoring", () => {
  // P0 derives the floor; the scorer only compares against it. Every Pultec
  // section's floor is zero at HC6's 34 strips (COST §2.3), so the fixture's
  // own zero is the realistic case rather than a convenience, and F = 2.25
  // clears it.
  expect(lowBoostTargets().cutFloor).toBe(0)
  expect(scoreDumpText(TEXT, FIXTURE_TARGETS, loadRules()).objective).toBeGreaterThan(0)
})
