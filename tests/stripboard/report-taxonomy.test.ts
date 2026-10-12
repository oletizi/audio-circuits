/**
 * `REP1`, `REP3` and `REP5`'s vocabulary: the three outcomes, the five bound
 * statuses, the exit codes and the two phrasing tables.
 *
 * SPLIT FROM `./report.test.ts` BY CONCERN - that file drives `renderReport`
 * and this one drives the taxonomy it selects from - over the shared
 * `./report-fixtures.ts`. The split is this repository's converged shape and it
 * is also what keeps each file inside the line ceiling.
 *
 * **THE ASSERTION THIS FILE EXISTS FOR** is the one the three-valued `A3`
 * forces: what `outcomeOf` does with a condition that was never graded. It is
 * tested against `K4`'s own two clauses rather than against what the
 * implementation happens to return, and the test says which clauses.
 */
import { expect, test } from "bun:test"
import {
  BOUND_STATUSES,
  OUTCOMES,
  OUTCOME_WORDING,
  WORDING,
  assertEnumerated,
  boundFor,
  exitCodeFor,
  outcomeOf,
  runFailedOn,
} from "../../tools/stripboard/report.ts"
import { CONSTRAINT_IDS, broken, holds } from "../../tools/stripboard/constraints-model.ts"
import {
  admissible,
  type AdmissibilityInput,
  type ConditionThree,
} from "../../tools/stripboard/verdict.ts"
import { LOW_BOOST, admissibilityInput, evaluation, failedResults } from "./stop-fixtures.ts"
import { RULES, TOLERANCE_RULES, ruleFor } from "./report-fixtures.ts"

/** The four conditions, so a loop over them cannot lose one silently. */
const CONDITIONS = ["a1", "a2", "a3", "a4"] as const
type Condition = (typeof CONDITIONS)[number]

/** The score of a candidate `cuts` above a floor of zero, with the clustering stated. */
function scoreWith(cuts: number, clustering: number) {
  return evaluation({ cuts, wires: 0, joins: 1, occupied: 9, clustering }).score
}

/** All four conditions as healthy as the committed rules allow: `A3` does not fire. */
function healthy() {
  return admissible(admissibilityInput())
}

/** One input per condition, spoiling that condition and leaving the other three held. */
const SPOILED: Readonly<Record<Condition, AdmissibilityInput>> = {
  a1: admissibilityInput({ results: failedResults() }),
  a2: admissibilityInput({ score: scoreWith(1, 0.2) }),
  a3: admissibilityInput({ rules: TOLERANCE_RULES, initialObjective: 2 }),
  a4: admissibilityInput({ targets: LOW_BOOST, frozen: true, score: scoreWith(6, 0) }),
}

/** What a spoiled condition reads as. `A3` is three-valued, so its failure is a word. */
const FAILED: Readonly<Record<Condition, boolean | ConditionThree>> = {
  a1: false,
  a2: false,
  a3: "failed",
  a4: false,
}

test("all four held is admissible, and each condition spoiled alone is not", () => {
  expect(outcomeOf(healthy())).toBe("admissible")
  for (const key of CONDITIONS) {
    const result = admissible(SPOILED[key])
    expect(result[key], key).toBe(FAILED[key])
    expect(result.detail[key], key).not.toBe("")
    expect(outcomeOf(result), key).not.toBe("admissible")
  }
})

test("A1 failing is invalid; A2, A3 or A4 failing alone is valid-below-target", () => {
  expect(outcomeOf(admissible(admissibilityInput({ results: failedResults() })))).toBe("invalid")
  expect(outcomeOf(admissible(admissibilityInput({ score: scoreWith(1, 0.2) })))).toBe(
    "valid-below-target",
  )
  expect(
    outcomeOf(admissible(admissibilityInput({ rules: TOLERANCE_RULES, initialObjective: 2 }))),
  ).toBe("valid-below-target")
  expect(
    outcomeOf(
      admissible(admissibilityInput({ targets: LOW_BOOST, frozen: true, score: scoreWith(6, 0) })),
    ),
  ).toBe("valid-below-target")
})

test("A1 decides alone: a candidate failing A1 AND A2 is invalid, not below target", () => {
  // REP5 keys the taxonomy on A1 - "fails a hard electrical or physical
  // constraint, i.e. A1" - and the middle outcome's FIRST clause is "A1 holds".
  // A conjunction tested only through one spoiled condition at a time would
  // pass with the two cases ordered the other way round, and the owner's
  // question is whether he can build it.
  const both = admissible(admissibilityInput({ results: failedResults(), score: scoreWith(1, 0.2) }))
  expect([both.a1, both.a2]).toEqual([false, false])
  expect(outcomeOf(both)).toBe("invalid")
})

test("an A3 that never fired is admissible, on K4's two clauses, and is not collapsed", () => {
  // THE LIVE PATH, not a corner: tau is unset in the committed rules, so every
  // run today reaches here. K4 settles it in two clauses and this test is
  // against those rather than against what the code returns:
  //   "An outcome of 'valid, below target' cannot be reported against an unset
  //    target" - so the middle outcome is ruled out explicitly, and
  //   "the admissibility verdict rests on A1, A2 and A4" - which names the
  //    three conditions that decide while tau is unset, all three held here.
  expect(RULES.tau).toBeNull()
  const unset = healthy()
  expect(unset.a3).toBe("not-evaluated")
  expect(outcomeOf(unset)).toBe("admissible")
  // AND THE THIRD STATE SURVIVES THE MAPPING. A genuinely held A3 reaches the
  // same outcome, which is the point of the two clauses above - but the two
  // verdicts remain distinguishable without reading a string, so the report can
  // and does say which it was. Collapsing "not-evaluated" to true on the way
  // out would make these two indistinguishable here.
  const held = admissible(admissibilityInput({ rules: TOLERANCE_RULES, initialObjective: 40 }))
  expect(held.a3).toBe("held")
  expect(outcomeOf(held)).toBe("admissible")
  expect(unset.a3).not.toBe(held.a3)
})

test("the bound maps as REP1's fires-under column says, and Q4 and Q5 share one", () => {
  // REP1's table, row by row: at-floor fires under Q1, within-tolerance under
  // Q2, search-exhausted under Q3, budget-exhausted under "Q4, Q5", and
  // systematic-cause under Q6. The expectations below are that column read
  // backwards, and nothing here is derived from the module's own table.
  expect(boundFor("Q1")).toBe("at-floor")
  expect(boundFor("Q2")).toBe("within-tolerance")
  expect(boundFor("Q3")).toBe("search-exhausted")
  expect(boundFor("Q4")).toBe("budget-exhausted")
  expect(boundFor("Q5")).toBe("budget-exhausted")
  expect(boundFor("Q6")).toBe("systematic-cause")
})

test("both non-admissible outcomes exit non-zero, and admissible exits zero", () => {
  // REP5's exit column, on a rule that leaves the outcome to decide.
  expect(exitCodeFor("invalid", "Q3")).toBe(1)
  expect(exitCodeFor("valid-below-target", "Q3")).toBe(1)
  expect(exitCodeFor("admissible", "Q3")).toBe(0)
})

test("a Q5 run exits non-zero on every outcome, including an admissible candidate", () => {
  // CRITERIA says it twice - section 5's Q5 row, "a run that stops on it is
  // REPORTED AS A FAILURE", and the paragraph under it, "a run that stops on Q5
  // is reported as a failure rather than as a result". Q5 is a backstop against
  // a bug looping forever and "not a measure of anything", so it says nothing
  // about the candidate and everything about the run - which is why the exit
  // code takes the rule as well as the outcome.
  for (const outcome of OUTCOMES) {
    expect(exitCodeFor(outcome, "Q5"), outcome).toBe(1)
  }
  expect(runFailedOn("Q5")).toBe(true)
  // AND NO OTHER RULE DOES THIS. Q6 was considered: REP1 calls it "a cause to
  // fix", but no clause of CRITERIA says a Q6 RUN is reported as a failure, and
  // extending the table past the text would be this module authoring a
  // criterion. So an admissible candidate under every other rule exits zero.
  for (const rule of ["Q1", "Q2", "Q3", "Q4", "Q6"] as const) {
    expect(runFailedOn(rule), rule).toBe(false)
    expect(exitCodeFor("admissible", rule), rule).toBe(0)
  }
})

test("V10: only at-floor may be worded as a lower bound met, and nothing else claims optimality", () => {
  for (const status of [
    "search-exhausted",
    "budget-exhausted",
    "systematic-cause",
    "within-tolerance",
  ] as const) {
    expect(WORDING[status], status).not.toMatch(/optimal|minimal|lowest possible|cannot be improved/i)
  }
  expect(WORDING["at-floor"]).toMatch(/floor/)
  expect(WORDING["at-floor"]).toMatch(/unconstrained/)
})

test("the two non-admissible wordings are not interchangeable, and all three differ", () => {
  expect(OUTCOME_WORDING["invalid"]).not.toBe(OUTCOME_WORDING["valid-below-target"])
  expect(new Set(Object.values(OUTCOME_WORDING)).size).toBe(OUTCOMES.length)
  // The middle one says what the layout IS before what it is not (V12), and
  // neither says a bound should move (K3 admits a stopped search as evidence
  // for nothing).
  expect(OUTCOME_WORDING["valid-below-target"]).toMatch(/BUILDABLE/)
  for (const wording of Object.values(OUTCOME_WORDING)) {
    expect(wording).not.toMatch(/loosen|relax the bound|kappa_bench should/i)
  }
})

test("the admissible wording does not claim a target that may never have been graded", () => {
  // The one sentence that could erase the third state: "A1-A4 all hold" read
  // off a run where A3 never fired. It says which conditions instead.
  expect(OUTCOME_WORDING["admissible"]).toMatch(/A3 holds or did not fire/)
})

test("the two unions are enumerated exhaustively, so nothing escapes REP3's loop", () => {
  expect(Object.keys(OUTCOME_WORDING).sort()).toEqual([...OUTCOMES].sort())
  expect(Object.keys(WORDING).sort()).toEqual([...BOUND_STATUSES].sort())
  expect(OUTCOMES.length).toBe(3)
  expect(BOUND_STATUSES.length).toBe(5)
})

test("assertEnumerated refuses a short array and an unbacked member, naming both", () => {
  // IT TAKES BOTH LISTS AS ARGUMENTS so it can be shown to fail. A member in
  // the table and not in the array is a status nothing ever renders in a test.
  expect(() => assertEnumerated(["invalid"], ["invalid", "admissible"], "outcome")).toThrow(
    /1 missing from the array/,
  )
  expect(() => assertEnumerated(["invalid", "wat"], ["invalid"], "outcome")).toThrow(
    /1 in the array with no table entry/,
  )
  expect(() => assertEnumerated(["a"], ["b"], "bound status")).toThrow(/bound status/)
})

test("every bound status has a fixture rule that really produces it", () => {
  // The fixture's status-to-rule map is checked against boundFor rather than
  // trusted: a fixture naming the wrong rule would render the wrong wording and
  // REP3's loop would still pass, because it only checks the line is SOME table
  // entry.
  for (const status of BOUND_STATUSES) {
    expect(boundFor(ruleFor(status)), status).toBe(status)
  }
})

test("a result set that is not the ten is refused rather than folded into an outcome", () => {
  // outcomeOf reads A1, which is the grader's, so an incomplete grade cannot
  // reach a verdict at all.
  const short = CONSTRAINT_IDS.slice(0, CONSTRAINT_IDS.length - 1).map((id) =>
    id === "HC4" ? broken(id, "fixture: a net is incomplete") : holds(id, "fixture: held"),
  )
  expect(() => outcomeOf(admissible(admissibilityInput({ results: short })))).toThrow(/hard/)
})
