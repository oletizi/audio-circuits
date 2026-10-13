/**
 * `V2`: `C = N + J − S_occ` on every candidate, its `J ≥ 0` reading, and
 * where `N` and `P` come from.
 *
 * `./score-fixtures.ts` says where every expectation here comes from. The
 * other two checks are in `./score-counts.test.ts` (`V1`) and
 * `./score-floor.test.ts` (`K5`), and the objective itself in
 * `./score-objective.test.ts`.
 */
import { test, expect } from "bun:test"
import { boardGeometry, copperGraph } from "../../tools/stripboard/copper.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { necessaryCuts } from "../../tools/stripboard/cut-necessity.ts"
import { countLines, scoreDump, scoreDumpText } from "../../tools/stripboard/score.ts"
import { refusalFrom } from "./targets-oracle.ts"
import {
  FIXTURE_REFERENCE,
  FIXTURE_TARGETS,
  FROZEN_DUMP,
  NINE_NETS,
  TEXT,
  frozenReference,
  lowBoostTargets,
} from "./score-fixtures.ts"

test("V2: the identity closes on the frozen dump with COST section 1.6's own terms", async () => {
  // COST §1.6 derives low-boost BY HAND from its forty-line dump: nets on
  // rows 3, 5, 7, 9 and 10 give S_occ = 5, only `lo_boost_in` occupies two
  // segments so J = 1, and N + J - S_occ = 9 + 1 - 5 = 5 is the reported cut
  // count. §5 records κ = 1/18. Every one of those four figures is COST's,
  // and the objective 6 = 5 + 0.25*0 + 1*1 is hand-added from §2.2's row.
  //
  // THIS TEST IS ALSO THE PROOF THAT N AND P ARE DUMP-SOURCED. low-boost's
  // model-sourced targets carry N = 14 (COST §2.3) and P = 50 (§2.3's forty
  // on-board pins plus the fixture's ten PAD lines), while the stale frozen
  // layout has nine NODE and twenty-seven PIN lines. Were the scorer to take
  // the identity's N from the targets it would compute J = 5 - 14 + 5 = -4
  // and REFUSE this board, and at the targets' P it would report κ = 1/41
  // rather than §5's 1/18.
  //
  // MUTATION RUN, WHICH IS WHERE THE PREVIOUS PARAGRAPH'S FIGURES COME FROM
  // rather than from reasoning: with `netCount` taken from the targets this
  // failed with 'error: negative-joins: C = 5, N = 14, S_occ = 5 gives
  // J = C - N + S_occ = -4. J = sum over nets of (segments - 1) and every term
  // is at least zero, so a negative J describes no layout whatsoever. ...' -
  // a board COST §1.6 derives by hand, refused as impossible. With `pinCount`
  // taken from them instead it failed on the first assertion, 'expect(received)
  // .toEqual(expected) / - Expected - 1 / + Received + 1'. Both reverted.
  const targets = lowBoostTargets()
  const score = scoreDumpText(
    await Bun.file(FROZEN_DUMP).text(),
    targets,
    loadRules(),
    await frozenReference(),
  )
  expect([score.netCount, score.pinCount, score.occupied, score.cuts]).toEqual([9, 27, 5, 5])
  expect(score.joins).toBe(1)
  expect(score.clustering).toBeCloseTo(1 / 18, 10)
  // 5.25, NOT COST §2.2's 6: this board carries one SOLDER line, and the
  // committed `rhoSolder` is 0.25 rather than PAR1's 1 on the owner's
  // instruction that a blob is built as a wire. The spec's figure is checked at
  // the spec's own weight in `./score-objective.test.ts`; here the committed
  // weights are what the scorer is handed, so this is `5 + 0.25*1`.
  expect(score.objective).toBe(5.25)
  expect([targets.netCount, targets.pinCount], "the model's N and P, which are NOT these")
    .toEqual([14, 50])
})

test("N is the NODE count and not the copper graph's component count", async () => {
  // THE NAMED HAZARD: `copperGraph(...).componentCount` counts connected
  // regions of the WHOLE CANVAS - every empty strip is one - so it is a fact
  // about the drawing area and not about the circuit. On the frozen dump the
  // canvas is fourteen rows by thirty-two columns and its component count is
  // nowhere near the nine nets the board has.
  //
  // MUTATION RUN: with `netCount` taken from the targets this failed with
  // 'error: negative-joins: C = 5, N = 14, S_occ = 5 gives J = C - N + S_occ =
  // -4. ...' before reaching either assertion. Reverted.
  const text = await Bun.file(FROZEN_DUMP).text()
  const dump = boardGeometry(text)
  const score = scoreDump(
    dump,
    lowBoostTargets(),
    loadRules(),
    countLines(text),
    necessaryCuts(text, await frozenReference()),
  )
  expect(score.netCount, "COST §1.6's N for low-boost").toBe(9)
  expect(copperGraph(dump).componentCount).toBeGreaterThan(score.netCount)
})

test("the identity's terms come off the dump, not off the model-sourced targets", () => {
  // Changing the targets' N and P to numbers the dump contradicts changes
  // NOTHING in the Score. Only `board` and `cutFloor` are read from it.
  //
  // MUTATION RUN: with `netCount` taken from the targets this failed with
  // 'error: negative-joins: C = 1, N = 7, S_occ = 2 gives J = C - N + S_occ =
  // -4. ...' - the lying N is impossible against this dump's own cuts and
  // strips, so it does not even reach the assertion. With `pinCount` taken
  // from them it failed with 'error: pinCount / Expected: 4 / Received: 99'.
  // Both reverted.
  const rules = loadRules()
  const honest = scoreDumpText(TEXT, FIXTURE_TARGETS, rules, FIXTURE_REFERENCE)
  const lying = scoreDumpText(
    TEXT,
    { ...FIXTURE_TARGETS, netCount: 7, pinCount: 99 },
    rules,
    FIXTURE_REFERENCE,
  )
  expect(lying.netCount, "netCount").toBe(2)
  expect(lying.pinCount, "pinCount").toBe(4)
  expect(lying).toEqual(honest)
  expect(honest.joins).toBe(1)
  expect(honest.clustering).toBe(1 / 2)
})

test("V2: a dump whose CUT_STATE is not COMPUTED refuses before it scores", () => {
  // HC2 and COST H2: under UNRESOLVED the cut list is ABSENT rather than
  // empty, so C is not the count a derivation produced and the identity
  // cannot describe the board. `transistor-preamp-lab` is this case live, and
  // it is the board whose J = -1 the refusal below was modelled on.
  //
  // MUTATION RUN, AND IT SETTLES WHETHER THIS CHECK IS REDUNDANT: with the
  // cutState clause deleted this failed with 'Expected to start with:
  // "score-cuts-not-computed:" / Received: ""' - NO refusal at all, the board
  // scoring happily. The negative-J reading did not catch it, because this
  // fixture's C, N and S_occ still give J = 1 - 2 + 2 = 1 under UNRESOLVED;
  // what CRITERIA HC2 calls the cheap second reading of the same condition
  // only fires when the absent cut list happens to make J negative, as it does
  // on transistor-preamp-lab. So the state is read directly. Reverted.
  //
  // AND HC2 IS READ FIRST ON BOTH ENTRY POINTS, which is checkable rather than
  // asserted: with the parser made to drop a `CUT` line - so this fixture is
  // both UNRESOLVED and mis-parsed, and has a count disagreement as well -
  // twelve tests failed on `score-count-disagreement` and THIS ONE PASSED,
  // because `scoreDumpText` does no checking of its own and `scoreDump` reads
  // `cutState` before it compares. Reverted.
  const unresolved = TEXT.replace("CUT_STATE COMPUTED", "CUT_STATE UNRESOLVED")
  const message = refusalFrom(() => scoreDumpText(unresolved, FIXTURE_TARGETS, loadRules(), FIXTURE_REFERENCE))
  expect(message).toStartWith("score-cuts-not-computed:")
  expect(message).toContain("CUT_STATE")
  expect(message).toContain("UNRESOLVED")
  expect(message).toContain("H2")
})

test("V2: a negative J refuses, for a different reason, and says which", () => {
  // Nine nets declared over one cut and two occupied strips gives
  // J = 1 - 9 + 2 = -6, and J = sum(k - 1) cannot be below zero. The refusal
  // is `targets.ts`'s, which is the point: the identity has ONE
  // implementation, and a second copy here would make V2 a comparison of a
  // module against a copy of itself.
  //
  // MUTATION RUN: with `scoreDump` computing `Math.max(0, C - N + S_occ)`
  // inline instead of calling `segmentJoins` this failed with 'Expected to
  // start with: "negative-joins:" / Received: "clustering-undefined: J = 0,
  // P = 4, N = 9 gives P - N = -5. ..."' - the clamp does not score happily,
  // it lands on a NEIGHBOURING refusal that names the wrong term and points at
  // the wrong fix. That is why the assertion is anchored on the opening clause
  // rather than written `toThrow(/J/)`, which this mutant passes. Reverted.
  const message = refusalFrom(() => scoreDumpText(NINE_NETS, FIXTURE_TARGETS, loadRules(), FIXTURE_REFERENCE))
  expect(message).toStartWith("negative-joins:")
  expect(message).toContain("J = C - N + S_occ = -6")
})
