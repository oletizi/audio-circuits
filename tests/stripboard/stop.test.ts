/**
 * `Q1`-`Q6`, and the thing CRITERIA section 5 exists to keep apart: **a stop is
 * not a pass.**
 *
 * TWO RULES ARE SUCCESSFUL TERMINATIONS AND FOUR ARE NOT, so every test below
 * that drives `Q1` or `Q2` drives it twice - once where admissibility holds and
 * once where it does not - and the second half is the half that matters.
 *
 * BOTH REQUIRE ALL FOUR ADMISSIBILITY CONDITIONS, through
 * `tools/stripboard/verdict.ts`'s `admissible` - which `tests/stripboard/
 * verdict.test.ts` drives directly. The case that makes the difference visible
 * from here is CRITERIA's worked one: the tolerance holds, `A1` holds and `A2`
 * fails, and `Q2` must not fire. A `Q2` guarded by `A1` alone fires on it.
 *
 * `tau` IS `null` IN THE COMMITTED RULES by the owner's decision (`K4`), so
 * `Q2` does not fire at all there - CRITERIA's own stated behaviour. The
 * `tau`-bearing fixture below is what reaches it.
 */
import { expect, test } from "bun:test"
import path from "node:path"
import { CONSTRAINT_IDS } from "../../tools/stripboard/constraints-model.ts"
import { loadRules, type StripboardRules } from "../../tools/stripboard/rules.ts"
import {
  STOPPING_RULES,
  assertOrderCoversTable,
  evaluateStop,
  floorNote,
  signatureOf,
} from "../../tools/stripboard/stop.ts"
import { clustering } from "../../tools/stripboard/targets.ts"
import {
  LOW_BOOST,
  TARGETS,
  admissibleCandidate,
  atFloorEvaluation,
  candidate,
  evaluation,
  failedResults,
  floatedDump,
  freshState,
  healthyDump,
  heldResults,
  slowState,
  twoFailures,
  unresolvedDump,
  withinToleranceState,
} from "./stop-fixtures.ts"

const rules = loadRules()
const targets = TARGETS

/**
 * The committed rules with a `tau`, used ONLY to reach `Q2`'s arithmetic.
 *
 * **THIS IS NOT A DEFAULT AND NEVER REACHES `stripboard/rules.json`.** `tau` is
 * unset by the owner's decision (`K4`) and the `0.05` once carried for it was
 * PIPELINE's withdrawn proposal. It is used here because it is the figure
 * CRITERIA section 5's worked case argues with, so the arithmetic under test is
 * the arithmetic in the document - and what the test then asserts is that `Q2`
 * still does not fire.
 */
const toleranceRules: StripboardRules = { ...rules, tau: 0.05 }

test("Q1 fires at the floor, admissibly, and B = 0 follows rather than being assumed", () => {
  // The fixture is at the floor by every clause CRITERIA Q1 states: C = 0 =
  // max(0, 9 - 34), W = 0, J = 0 (so kappa = 0), S_occ = 9 = min(9, 34).
  expect(evaluateStop(freshState(), atFloorEvaluation(), targets, rules)).toBe("Q1")
  // And B = 0 is READ rather than assumed: the same board with one solder
  // bridge and no join to supply is refused, not reported as an at-floor stop.
  const bridged = evaluation({ cuts: 0, wires: 0, solder: 1, joins: 0, occupied: 9, objective: 1 })
  expect(() => evaluateStop(freshState(), bridged, targets, rules)).toThrow(
    /stop-bridge-without-join/,
  )
})

test("Q1 does not fire when the arithmetic holds and admissibility does not", () => {
  // THE BRIEF'S FIXTURE WAS `{ ...atFloor, admissibleA1: false }` AND IS NOT
  // USED, because this module calls a1 over the ten results rather than reading
  // the cached flag - a boolean carries no proof that ten constraints were
  // checked, and a1 refuses a set that is not the ten. So the fixture here
  // fails A1 the way a real candidate does: one broken constraint result.
  const atFloorButInvalid = evaluation(
    { cuts: 0, wires: 0, solder: 0, joins: 0, occupied: 9 },
    failedResults(),
  )
  expect(atFloorButInvalid.admissibleA1).toBe(false)
  expect(evaluateStop(freshState(), atFloorButInvalid, targets, rules)).not.toBe("Q1")
  // Nothing else fires either, so the search continues rather than stopping on
  // a weaker rule it has not earned.
  expect(evaluateStop(freshState(), atFloorButInvalid, targets, rules)).toBeNull()
})

test("Q1 reads the ten results and refuses a candidate carrying fewer", () => {
  const short = evaluation({ cuts: 0, wires: 0, solder: 0, joins: 0, occupied: 9 }, heldResults()
    .slice(0, CONSTRAINT_IDS.length - 1))
  expect(() => evaluateStop(freshState(), short, targets, rules)).toThrow(/hard/)
})

test("Q2's worked case: the tolerance holds, A2 fails, and Q2 does NOT fire", () => {
  // P - N = 10 and one unit of J is kappa = 0.1, twice the 0.05 bound, while
  // F0 - F_floor = 40 makes the same unit a gap of 1/40 = 0.025, inside
  // tau = 0.05. The two are differently normalised, which is the whole point.
  const board = { ...targets, netCount: 10, pinCount: 20, cutFloor: 0 }
  const state = { ...freshState(), climbHistory: [40, 1], climbEvaluations: [100, 100] }
  // `clustering` is stated as the figure, 1/(20 - 10), rather than computed
  // here: the assertion below proves the repository's own kappa agrees with it,
  // and A2 reads the Score's field.
  const worked = evaluation({
    cuts: 1,
    wires: 0,
    solder: 0,
    joins: 1,
    occupied: 10,
    clustering: 0.1,
  })
  expect(clustering(1, 20, 10)).toBeCloseTo(0.1, 10)
  expect(worked.score.clustering).toBeCloseTo(clustering(1, 20, 10), 10)
  // A2 fails on it: kappa is above the committed bound.
  expect(clustering(1, 20, 10)).toBeGreaterThan(rules.kappaBench)
  // A1 holds on it, so A1 alone would have let Q2 stop the run here.
  expect(worked.admissibleA1).toBe(true)
  // Under the committed rules Q2 cannot fire at all: tau is unset (K4).
  expect(evaluateStop(state, worked, board, rules)).not.toBe("Q2")
  expect(evaluateStop(state, worked, board, rules)).toBeNull()
  // AND WITH A TAU SET IT STILL DOES NOT FIRE, which is the whole point: A3
  // holds on this candidate and A2 does not, so admissibility fails and the
  // search continues to the rules that report a weaker bound.
  expect(evaluateStop(state, worked, board, toleranceRules)).not.toBe("Q2")
  expect(evaluateStop(state, worked, board, toleranceRules)).toBeNull()
  // The same candidate with its clustering inside the bound DOES stop: the only
  // thing that changed is A2.
  const clustered = evaluation({
    cuts: 1,
    wires: 0,
    solder: 0,
    joins: 1,
    occupied: 10,
    clustering: 0.01,
  })
  expect(evaluateStop(state, clustered, board, toleranceRules)).toBe("Q2")
})

test("Q1 fires on a first-climb at-floor candidate with a tau set", () => {
  // THE BEST OUTCOME THIS PIPELINE HAS, AND IT USED TO RAISE. Reaching the
  // floor during the FIRST climb leaves no earlier climb to take F_0 from, so
  // A3's denominator was missing and verdict-no-initial-objective fired where
  // Q1 should have. At the floor the gap's NUMERATOR is zero, so the tolerance
  // is zero for any F_0 at all and none is needed.
  const firstClimb = { ...freshState(), climbHistory: [], climbEvaluations: [] }
  expect(evaluateStop(firstClimb, atFloorEvaluation(), targets, toleranceRules)).toBe("Q1")
  // Including on low-boost's frozen fixture, which is where V3 wants it.
  expect(
    evaluateStop({ ...firstClimb, frozen: true }, atFloorEvaluation(), LOW_BOOST, toleranceRules),
  ).toBe("Q1")
})

test("Q2 does not fire while tau is unset, which is CRITERIA K4 and not a missing branch", () => {
  // A candidate well inside any plausible tolerance, under the committed rules.
  expect(rules.tau).toBeNull()
  expect(evaluateStop(withinToleranceState(), admissibleCandidate(), targets, rules)).toBeNull()
})

test("Q2 fires when the tolerance holds AND the candidate is admissible", () => {
  expect(evaluateStop(withinToleranceState(), admissibleCandidate(), targets, toleranceRules))
    .toBe("Q2")
  // A1 failing: Q2 does not fire whatever the arithmetic says.
  const inadmissible = evaluation({ cuts: 1, joins: 0, occupied: 9 }, failedResults())
  expect(evaluateStop(withinToleranceState(), inadmissible, targets, toleranceRules)).toBeNull()
  // Outside the tolerance, so A3 fails: likewise.
  const far = evaluation({ cuts: 30, joins: 0, occupied: 9 })
  expect(evaluateStop(withinToleranceState(), far, targets, toleranceRules)).toBeNull()
})

test("Q1 and Q2 refuse on low-boost when the run has not said which board it ran", () => {
  // A4 reads differently on the frozen fixture and the scaffolded board, so
  // neither clause is picked - see verdict.ts's verdict-board-unstated.
  const unstated = { ...freshState(), frozen: undefined }
  expect(() => evaluateStop(unstated, atFloorEvaluation(), LOW_BOOST, rules)).toThrow(
    /verdict-board-unstated/,
  )
  expect(() =>
    evaluateStop({ ...withinToleranceState(), frozen: undefined }, admissibleCandidate(),
      LOW_BOOST, toleranceRules),
  ).toThrow(/verdict-board-unstated/)
  // Stated, and at the floor with no cuts and no wires, the frozen clause is
  // met (B1-frozen allows up to five cuts) and Q1 fires.
  expect(
    evaluateStop({ ...freshState(), frozen: true }, atFloorEvaluation(), LOW_BOOST, rules),
  ).toBe("Q1")
})

test("Q3 fires only when the round accepted nothing AND the seed list is spent", () => {
  const stalled = { ...freshState(), acceptedThisRound: 0, seedsRemaining: 2 }
  expect(evaluateStop(stalled, candidate(), targets, rules)).not.toBe("Q3")
  expect(evaluateStop({ ...stalled, seedsRemaining: 0 }, candidate(), targets, rules)).toBe("Q3")
  // And the other half of the conjunction: a spent seed list on a round that
  // DID accept something is a live search, not an exhausted one.
  const accepting = { ...freshState(), acceptedThisRound: 1, seedsRemaining: 0 }
  expect(evaluateStop(accepting, candidate(), targets, rules)).not.toBe("Q3")
  expect(evaluateStop(accepting, candidate(), targets, rules)).toBeNull()
})

test("Q4 is per climb, and the run-level total is reported rather than resetting it", () => {
  // A restart legitimately resumes progress, so resetting the yield counter is
  // correct; hiding that the run as a whole has stalled is not.
  const collapsed = {
    ...freshState(),
    climbHistory: [10, 10, 10],
    climbEvaluations: [4000, 4000, 4000],
    seedsRemaining: 0,
  }
  expect(evaluateStop(collapsed, candidate(), targets, rules)).toBe("Q4")
  // Two CONSECUTIVE steps are required, so one is not enough - and the second
  // state below WOULD fire on its arithmetic alone: one step of 0.1 over 4000
  // evaluations against g = 5 projects 200000 against a budget of 8000.
  const oneStepOnly = {
    ...collapsed,
    climbHistory: [10, 9.9],
    climbEvaluations: [4000, 4000],
  }
  expect(evaluateStop(oneStepOnly, candidate(), targets, rules)).not.toBe("Q4")
  expect(evaluateStop(oneStepOnly, candidate(), targets, rules)).toBeNull()
})

test("Q4's e is the run's spend, not the last climb's", () => {
  // slowState: r = 2/1000 per step and g = 5, so g/r = 2500 against k*e of
  // 1 x 3000. A Q4 measuring one climb would see 1000 and fire.
  expect(evaluateStop(slowState(), candidate(), targets, rules)).toBeNull()
})

test("Q4 holds for nothing once the gap is closed, and refuses a gap below the floor", () => {
  const collapsed = {
    ...freshState(),
    climbHistory: [10, 10, 10],
    climbEvaluations: [4000, 4000, 4000],
  }
  // g = 0: there is no remaining gap to project a cost against, so the rule
  // that stops BECAUSE finishing is expensive holds for nothing.
  const closed = evaluation({ cuts: 0, wires: 0, solder: 0, joins: 1, occupied: 8 })
  expect(evaluateStop(collapsed, closed, targets, rules)).toBeNull()
  // g < 0 is a verification failure (K5), not a stop.
  const impossible = evaluation({ cuts: 0, joins: 0, occupied: 9 })
  expect(() =>
    evaluateStop(collapsed, impossible, { ...targets, cutFloor: 3 }, rules),
  ).toThrow(/stop-negative-gap/)
})

test("Q5's cap is run-level, so a restart cannot grant itself more", () => {
  const spent = { ...freshState(), runEvaluations: rules.evaluationCap, seedsRemaining: 3 }
  expect(evaluateStop(spent, candidate(), targets, rules)).toBe("Q5")
  // One evaluation short of the cap, with seeds still unspent, is a live run.
  const nearly = { ...spent, runEvaluations: rules.evaluationCap - 1 }
  expect(evaluateStop(nearly, candidate(), targets, rules)).toBeNull()
})

test("Q6 compares signatures within and across restarts", () => {
  // Three sharing a signature across two seeds is stronger evidence than
  // three within one, so the comparison spans restarts.
  const repeated = { ...freshState(), signatures: ["s", "s", "s"] }
  expect(evaluateStop(repeated, candidate(), targets, rules)).toBe("Q6")
  const mixed = { ...freshState(), signatures: ["s", "t", "s"] }
  expect(evaluateStop(mixed, candidate(), targets, rules)).not.toBe("Q6")
  expect(evaluateStop(mixed, candidate(), targets, rules)).toBeNull()
  // The window is the END of the run's whole sequence: an earlier climb's
  // different signature does not mask three consecutive matching ones, which is
  // what a comparison confined to one climb's slice would do.
  const afterEarlier = { ...freshState(), signatures: ["x", "s", "s", "s"] }
  expect(evaluateStop(afterEarlier, candidate(), targets, rules)).toBe("Q6")
  // And a matching pair at the head followed by a different one does not fire.
  const broken = { ...freshState(), signatures: ["s", "s", "t"] }
  expect(evaluateStop(broken, candidate(), targets, rules)).toBeNull()
})

test("Q6 reports the cause and does not retry", () => {
  const repeated = { ...freshState(), signatures: ["s", "s", "s"] }
  expect(evaluateStop(repeated, candidate(), targets, rules)).toBe("Q6")
  const results = failedResults()
  const dump = floatedDump()
  expect(signatureOf(results, dump)).toBe(signatureOf(results, dump))
  expect(signatureOf(results, dump)).toMatch(/C19/)
  // It names the failing check too, so two boards failing differently cannot
  // share a signature and read as one systematic cause.
  expect(signatureOf(results, dump)).toMatch(/HC4/)
  const otherFailure = results.map((result) =>
    result.id === "HC4"
      ? { id: result.id, held: true, detail: "fixture: held" }
      : result.id === "HC6"
        ? { id: result.id, held: false, detail: "fixture: over stock" }
        : result,
  )
  expect(signatureOf(otherFailure, dump)).not.toBe(signatureOf(results, dump))
})

test("a signature is sorted, so a grader's result order is not part of how a board failed", () => {
  // TWO failing checks, because reversing a list with one failure in it changes
  // nothing and a test built that way passes with the sort deleted. Measured:
  // it did.
  const forward = twoFailures()
  const reversed = [...forward].reverse()
  expect(signatureOf(forward, floatedDump())).toMatch(/HC4,HC6/)
  expect(signatureOf(reversed, floatedDump())).toBe(signatureOf(forward, floatedDump()))
})

test("signatureOf refuses a candidate with no failure to sign", () => {
  // Three consecutive SUCCESSES would otherwise share one empty signature and
  // stop the run reporting a systematic cause.
  expect(() => signatureOf(heldResults(), healthyDump())).toThrow(/stop-nothing-to-sign/)
})

test("signatureOf refuses a dump whose cut conflicts it cannot read", () => {
  expect(() => signatureOf(failedResults(), unresolvedDump())).toThrow(
    /stop-cut-conflicts-unavailable/,
  )
})

test("a malformed counter set is refused rather than skipped", () => {
  // MORE EVALUATION COUNTS THAN OBJECTIVES, and that direction is deliberate:
  // the other direction leaves a missing count reading as zero, which the
  // no-rate refusal catches on its own - so a test written that way passes with
  // the length check deleted. Measured: it did.
  const lengths = {
    ...freshState(),
    climbHistory: [10, 10],
    climbEvaluations: [4000, 4000, 4000],
  }
  expect(() => evaluateStop(lengths, candidate(), targets, rules)).toThrow(
    /stop-counters-malformed/,
  )
  const noRate = {
    ...freshState(),
    climbHistory: [10, 10, 10],
    climbEvaluations: [4000, 0, 4000],
  }
  expect(() => evaluateStop(noRate, candidate(), targets, rules)).toThrow(
    /stop-counters-malformed/,
  )
  // And A3's denominator, which is verdict.ts's refusal rather than this
  // module's: with a tau set and no climb recorded there is no F_0.
  expect(() =>
    evaluateStop(freshState(), admissibleCandidate(), targets, toleranceRules),
  ).toThrow(/verdict-no-initial-objective/)
})

test("a Q6 run length below two is refused rather than clamped", () => {
  const single: StripboardRules = { ...rules, signatureRun: 1 }
  expect(() => evaluateStop(freshState(), candidate(), targets, single)).toThrow(
    /stop-rules-malformed/,
  )
})

test("the stopping order and the rule table are checked against each other", () => {
  expect(() => assertOrderCoversTable(STOPPING_RULES, [...STOPPING_RULES])).not.toThrow()
  expect(() => assertOrderCoversTable(STOPPING_RULES, ["Q1", "Q2", "Q3", "Q4", "Q5"])).toThrow(
    /the rule table is/,
  )
  expect(() =>
    assertOrderCoversTable(STOPPING_RULES, ["Q2", "Q1", "Q3", "Q4", "Q5", "Q6"]),
  ).toThrow(/STOP AT THE FIRST OF/)
})

test("the first rule in Q1..Q6 order wins when several hold", () => {
  const both = { ...withinToleranceState(), runEvaluations: toleranceRules.evaluationCap }
  expect(evaluateStop(both, admissibleCandidate(), targets, toleranceRules)).toBe("Q2")
  const atFloorAndSpent = { ...freshState(), runEvaluations: rules.evaluationCap }
  expect(evaluateStop(atFloorAndSpent, atFloorEvaluation(), targets, rules)).toBe("Q1")
  const stalledAndSpent = {
    ...freshState(),
    acceptedThisRound: 0,
    seedsRemaining: 0,
    runEvaluations: rules.evaluationCap,
  }
  expect(evaluateStop(stalledAndSpent, candidate(), targets, rules)).toBe("Q3")
})

test("no rule fires on a healthy mid-run state, so the search continues", () => {
  expect(evaluateStop(freshState(), candidate(), targets, rules)).toBeNull()
})

test("floorNote records that the floor is a function of today's stock", () => {
  const note = floorNote(targets)
  expect(note).toContain("R = 34 strips")
  expect(note).toContain("PROVISIONAL")
  expect(note).toContain("The dimensions are ALWAYS provisional")
  expect(note).toContain("CRITERIA")
})

test("every rule this module applies moves when its rules-file value moves", async () => {
  // The behavioural claim, which is what the scan's name used to assert. A
  // threshold hard-coded here would not follow the parameter, whatever it was
  // spelled as - so this catches what no scan can.
  // `tau` is `number | null` and is null by the owner's decision (K4), so
  // arithmetic on it does not compile. A strict variant tightens only what HAS
  // a value; an unset tau stays unset, because Q2 does not fire without one and
  // inventing a strict value here would manufacture the threshold the owner
  // declined to set.
  const strict: StripboardRules = {
    ...rules,
    tau: rules.tau === null ? null : rules.tau / 10,
    evaluationCap: 1,
    yieldFloor: rules.yieldFloor / 10,
    signatureRun: 2,
  }
  expect(evaluateStop(withinToleranceState(), admissibleCandidate(), targets, strict)).not.toBe(
    "Q2",
  )
  expect(
    evaluateStop({ ...freshState(), runEvaluations: 1, seedsRemaining: 3 }, candidate(), targets,
      strict),
  ).toBe("Q5")
  // Q4's k: the same state that does not stop at the committed k stops at a
  // tenth of it.
  expect(evaluateStop(slowState(), candidate(), targets, rules)).toBeNull()
  expect(evaluateStop(slowState(), candidate(), targets, { ...rules, yieldFloor:
    rules.yieldFloor / 10 })).toBe("Q4")
  // Q6's run length: two matching signatures are not three.
  const pair = { ...freshState(), signatures: ["s", "s"] }
  expect(evaluateStop(pair, candidate(), targets, rules)).toBeNull()
  expect(evaluateStop(pair, candidate(), targets, { ...rules, signatureRun: 2 })).toBe("Q6")
  // And tau, through A3: set, the gap of 1/40 is inside it and Q2 fires; at a
  // tenth of it the same gap is outside and Q2 does not.
  expect(evaluateStop(withinToleranceState(), admissibleCandidate(), targets, toleranceRules))
    .toBe("Q2")
  expect(
    evaluateStop(withinToleranceState(), admissibleCandidate(), targets, {
      ...toleranceRules,
      tau: toleranceRules.tau === null ? null : toleranceRules.tau / 10,
    }),
  ).toBeNull()
  // And kappa_bench, through A2: the same admissible candidate stops under the
  // committed bound and does not under a bound below its clustering.
  const clustered = evaluation({ cuts: 1, joins: 1, occupied: 9, clustering: 0.02 })
  expect(evaluateStop(withinToleranceState(), clustered, targets, toleranceRules)).toBe("Q2")
  expect(
    evaluateStop(withinToleranceState(), clustered, targets, {
      ...toleranceRules,
      kappaBench: 0.01,
    }),
  ).toBeNull()
})
