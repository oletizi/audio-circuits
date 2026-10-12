/**
 * Task 17: THE ACCEPTANCE RULE, on hand-built `Evaluation`s and no spawn at all.
 *
 * **SPLIT FROM `./climb.test.ts` FOR THE LINE CEILING, at the seam the brief
 * itself draws**: *"`accepts` is exported so the acceptance rule is testable
 * without a spawn"*. Everything here is a pure comparison of two records; every
 * test that drives a climb against an injected fork is in `./climb.test.ts`.
 *
 * **THE FIRST TEST IS THE ONE THIS WHOLE DESIGN RESTS ON.** A ranking term
 * cannot make the climb accept a worse `F`. If it ever passes while `F` rose,
 * `A_occ` - the occupied board area - has become an objective nobody
 * authorised, and every later run's number would be about a different quantity
 * than the one `OBJ1` names.
 *
 * Nothing here calls `evaluate`, so these test `accepts` against hand-written
 * numbers rather than `accepts` against the rest of its own module.
 */
import { expect, test } from "bun:test"
import { accepts } from "../../tools/stripboard/climb.ts"
import {
  BETTER_TUPLE,
  evaluation,
  rulesWithoutWorseAcceptance,
  rulesWithWorseAcceptance,
} from "./climb-fixtures.ts"

function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

const base = evaluation()

test("a ranking term cannot make the climb accept a worse F", () => {
  // OBJ3. The candidate below has a strictly better ranking tuple - zero in
  // every one of RANKING's five positions against the base's ones - and a worse
  // F. It must be rejected. If this test ever passes while F rose, the search is
  // optimising something nobody authorised.
  const worseF = {
    ...base,
    score: { ...base.score, objective: base.score.objective + 1 },
    ranking: [0, 0, 0, 0, 0],
  }
  expect(accepts(base, worseF, rulesWithoutWorseAcceptance())).toBe(false)
})

test("a strictly better F is accepted", () => {
  const better = { ...base, score: { ...base.score, objective: base.score.objective - 1 } }
  expect(accepts(base, better, rulesWithoutWorseAcceptance())).toBe(true)
})

test("an equal F with a strictly better ranking is accepted, and an equal tuple is not", () => {
  const plateauBetter = { ...base, ranking: BETTER_TUPLE }
  const plateauSame = { ...base }
  expect(accepts(base, plateauBetter, rulesWithoutWorseAcceptance())).toBe(true)
  expect(accepts(base, plateauSame, rulesWithoutWorseAcceptance())).toBe(false)
})

test("a candidate failing any hard constraint is rejected whatever its F", () => {
  // The base board holds all ten, so HC1 failing here is a REGRESSION this
  // move caused, and no F is cheap enough to buy it.
  const cheapAndBroken = {
    ...base,
    admissibleA1: false,
    score: { ...base.score, objective: 0 },
    results: base.results.map((result) =>
      result.id === "HC1" ? { ...result, held: false } : result,
    ),
  }
  expect(accepts(base, cheapAndBroken, rulesWithoutWorseAcceptance())).toBe(false)
})

test("a constraint already broken before the move does not by itself reject the candidate", () => {
  // THE DEADLOCK THIS RULE EXISTS TO BREAK. Every starting arm begins from a
  // board with incomplete nets, so HC1 fails on the start; under an
  // A1-gates-every-step rule no single gesture could ever be accepted, because
  // no one gesture flips the conjunction of ten. Here HC1 is broken on BOTH
  // sides and the candidate is strictly cheaper, so it is accepted.
  const brokenBefore = {
    ...base,
    admissibleA1: false,
    results: base.results.map((result) =>
      result.id === "HC1" ? { ...result, held: false } : result,
    ),
  }
  const stillBrokenButCheaper = {
    ...brokenBefore,
    score: { ...brokenBefore.score, objective: brokenBefore.score.objective - 1 },
  }
  expect(accepts(brokenBefore, stillBrokenButCheaper, rulesWithoutWorseAcceptance())).toBe(true)
  // And it is still rejected if it breaks a SECOND constraint on the way.
  const alsoBreaksHC3 = {
    ...stillBrokenButCheaper,
    results: stillBrokenButCheaper.results.map((result) =>
      result.id === "HC3" ? { ...result, held: false } : result,
    ),
  }
  expect(accepts(brokenBefore, alsoBreaksHC3, rulesWithoutWorseAcceptance())).toBe(false)
})

test("repairing a constraint is not an acceptance of its own: F and the ranking still decide", () => {
  // HC1 holding is not itself a cheaper board. A candidate that repairs it
  // while F rises is rejected like any other worse candidate - otherwise
  // "repair" would be a second objective nobody declared.
  const brokenBefore = {
    ...base,
    admissibleA1: false,
    results: base.results.map((result) =>
      result.id === "HC1" ? { ...result, held: false } : result,
    ),
  }
  const repairedButDearer = {
    ...base,
    score: { ...base.score, objective: brokenBefore.score.objective + 1 },
  }
  expect(accepts(brokenBefore, repairedButDearer, rulesWithoutWorseAcceptance())).toBe(false)
  const repairedAndCheaper = {
    ...base,
    score: { ...base.score, objective: brokenBefore.score.objective - 1 },
  }
  expect(accepts(brokenBefore, repairedAndCheaper, rulesWithoutWorseAcceptance())).toBe(true)
})

test("a regression is matched by constraint id, never by position in the list", () => {
  // Comparing the two result lists index by index would be a claim about
  // gradeHardConstraints' ordering rather than about the constraints, and would
  // compare HC3 against HC4 the moment anything reordered the table.
  //
  // THE FIXTURE HAS TO DISCRIMINATE IN THE ACCEPT DIRECTION, and the first
  // version of this test did not - a survivor in the mutation run proved it.
  // It reversed the candidate's ten with HC10 broken, where the positional
  // reading finds HC1 held in the base at that index and rejects too: both
  // readings said no, for different reasons, and the test passed either way.
  //
  // So: HC1 is broken on BOTH sides, the candidate's ten are REVERSED (HC1 now
  // last), and the candidate is cheaper. By id this is no regression and the
  // move is accepted. By POSITION the candidate's index 9 is broken HC1 against
  // the base's index 9, held HC10 - so a positional reading invents a
  // regression and rejects.
  const brokenBefore = {
    ...base,
    admissibleA1: false,
    results: base.results.map((result) =>
      result.id === "HC1" ? { ...result, held: false } : result,
    ),
  }
  const reversedAndCheaper = {
    ...brokenBefore,
    results: [...brokenBefore.results].reverse(),
    score: { ...brokenBefore.score, objective: brokenBefore.score.objective - 1 },
  }
  expect(reversedAndCheaper.results[9]?.id).toBe("HC1")
  expect(reversedAndCheaper.results[9]?.held).toBe(false)
  expect(brokenBefore.results[9]?.id).toBe("HC10")
  expect(brokenBefore.results[9]?.held).toBe(true)
  expect(accepts(brokenBefore, reversedAndCheaper, rulesWithoutWorseAcceptance())).toBe(true)
})

test("a move that newly breaks HC6 is rejected, however much cheaper the board is", () => {
  // HC6 IS THE ONE WHOSE REGRESSION WOULD BE EASIEST TO MISS AND WORST TO SHIP:
  // it is "does this fit the stock the owner owns", so a candidate that broke it
  // would be a board that cannot be cut at all. The raw-import climb ends with
  // HC6 already failing, which the no-regression rule permits; what it must
  // never permit is a climb that had HC6 and spent it.
  //
  // It is asserted on HC6 BY NAME rather than left to the generic clause,
  // because the generic clause is tested on HC1 and a reader checking "is the
  // stock protected" should find the answer rather than infer it.
  const spendsTheStock = {
    ...base,
    admissibleA1: false,
    score: { ...base.score, objective: base.score.objective - 100 },
    ranking: [0, 0, 0, 0, 0],
    results: base.results.map((result) =>
      result.id === "HC6" ? { ...result, held: false } : result,
    ),
  }
  expect(accepts(base, spendsTheStock, rulesWithoutWorseAcceptance())).toBe(false)
  // And the other side of it: a board that ALREADY did not fit is not forbidden
  // from moving, which is the raw-import climb's own case.
  const neverFitted = {
    ...base,
    admissibleA1: false,
    results: base.results.map((result) =>
      result.id === "HC6" ? { ...result, held: false } : result,
    ),
  }
  const stillDoesNotFitButCheaper = {
    ...neverFitted,
    score: { ...neverFitted.score, objective: neverFitted.score.objective - 1 },
  }
  expect(accepts(neverFitted, stillDoesNotFitButCheaper, rulesWithoutWorseAcceptance())).toBe(true)
})

test("a configured worseAcceptance refuses rather than being climbed without", () => {
  // E3 is Task 18's. A bound present in the rules and ignored here would make
  // the run record claim a search behaviour that did not happen.
  const refusal = refusalFrom(() => accepts(base, base, rulesWithWorseAcceptance(2)))
  expect(refusal).toContain("worseAcceptance = 2")
  expect(refusal).toContain("Task 18")
})

test("an Evaluation whose admissibleA1 disagrees with its own results refuses", () => {
  // Neither field is preferred: admissibleA1 true beside a broken constraint
  // would certify a board against a check that failed.
  const forged = {
    ...base,
    admissibleA1: true,
    results: base.results.map((result) =>
      result.id === "HC8" ? { ...result, held: false } : result,
    ),
  }
  const refusal = refusalFrom(() => accepts(base, forged, rulesWithoutWorseAcceptance()))
  expect(refusal).toContain("records admissibleA1 = true")
  expect(refusal).toContain("comes to false")
})

