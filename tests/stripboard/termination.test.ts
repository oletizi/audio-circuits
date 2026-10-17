/**
 * `tools/stripboard/termination.ts`: that a run which performed no search can
 * say so, and that saying so licenses nothing.
 *
 * **THE PROPERTY UNDER TEST IS AN ABSENCE, WHICH IS WHY MOST OF IT IS CHECKED
 * BY THE COMPILER AND THE REST IS CHECKED HERE.** `NO_SEARCH` cannot be handed
 * to `boundFor`, `runFailedOn`, `exitCodeFor` or `renderReport` because each of
 * those takes a `StoppingRule` - that is a typecheck failure, not an assertion -
 * and what this file holds is the runtime half: that the two vocabularies share
 * no spelling, that `isStoppingRule` is false for the one member the compiler
 * cannot see through a `string`, and that `assertDistinct` fires when they are
 * collapsed.
 *
 * **`assertDistinct` IS DRIVEN WITH LISTS OF ITS CALLER'S RATHER THAN BY
 * EDITING EITHER TAXONOMY**, which is the device `./report.test.ts` uses on
 * `assertEnumerated` and `./stop.test.ts` on `assertOrderCoversTable`: the
 * module-load call passes the real two, and a guard reachable only by editing
 * its own constants is a guard no test covers.
 */
import { expect, test } from "bun:test"
import { BOUND_STATUSES, boundFor, exitCodeFor } from "../../tools/stripboard/report.ts"
import { STOPPING_RULES } from "../../tools/stripboard/stop.ts"
import {
  assertDistinct,
  boundOf,
  isStoppingRule,
  NO_BOUND,
  NO_SEARCH,
  NO_SEARCH_NOTE,
} from "../../tools/stripboard/termination.ts"

test("no-search is not a seventh stopping rule and no-bound is not a sixth bound", () => {
  expect(STOPPING_RULES, "the six are the six").toEqual(["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"])
  expect(STOPPING_RULES.map(String)).not.toContain(NO_SEARCH)
  expect(BOUND_STATUSES.map(String)).not.toContain(NO_BOUND)
  // AND NEITHER VALUE IS Q-SHAPED, which is the half a reader of run.json meets:
  // "Q0" or "Q7" would read as one more entry of the same taxonomy.
  expect(NO_SEARCH).not.toMatch(/^Q\d+$/)
  expect(NO_SEARCH).toBe("no-search")
  expect(NO_BOUND).toBe("no-bound")
})

test("isStoppingRule is true for exactly the six", () => {
  for (const rule of STOPPING_RULES) {
    expect(isStoppingRule(rule), rule).toBe(true)
  }
  expect(isStoppingRule(NO_SEARCH)).toBe(false)
})

test("boundOf is boundFor on the six and no bound at all on the seventh state", () => {
  for (const rule of STOPPING_RULES) {
    // RE-DERIVED FROM `boundFor` RATHER THAN RE-TABLED HERE, so this is an
    // agreement check rather than a second specification of REP1's pairing.
    expect(boundOf(rule), rule).toBe(boundFor(rule))
  }
  expect(boundOf(NO_SEARCH)).toBe(NO_BOUND)
  expect(BOUND_STATUSES.map(String)).not.toContain(boundOf(NO_SEARCH))
})

test("the note states the gap rather than resolving it", () => {
  // THE SENTENCE IS THE ONE PLACE *why a no-search run is not adopted* IS
  // WRITTEN, and what it must not do is answer the question: whether such a run
  // may be adopted is a criteria decision, and an agent may not author one.
  expect(NO_SEARCH_NOTE).toContain("NO CLAUSE OF CRITERIA SAYS WHAT A NO-SEARCH RUN MAY BE")
  expect(NO_SEARCH_NOTE).toMatch(/REPORTED and NOT ADOPTED/)
  expect(NO_SEARCH_NOTE, "the owner's decision is named as what would change it").toMatch(
    /owner's decision/,
  )
  expect(NO_SEARCH_NOTE, "and the entries that carry the state").toMatch(/G21 and G25/)
  // AND IT CLAIMS NOTHING ABOUT THE LAYOUT'S COST. `WORDING`'s five entries are
  // the only quality claims this pipeline makes and this is not one of them.
  expect(NO_SEARCH_NOTE).not.toMatch(/optimal|minimal|lowest possible|cannot be improved/i)
})

test("assertDistinct refuses a stopping-rule list that has absorbed no-search", () => {
  // THE EDIT THIS CATCHES is somebody adding the state to `StoppingRule` so that
  // the existing tables accept it - after which `isStoppingRule` is true for it,
  // `boundOf` calls `boundFor`, and a run that swept no move set acquires
  // whatever that entry licenses.
  expect(() => assertDistinct([...STOPPING_RULES, NO_SEARCH], BOUND_STATUSES)).toThrow(
    /^termination-not-distinct: the stopping rules are \[Q1, Q2, Q3, Q4, Q5, Q6, no-search\]/,
  )
  expect(() => assertDistinct([...STOPPING_RULES, NO_SEARCH], BOUND_STATUSES)).toThrow(
    /isStoppingRule returns false for NO_SEARCH/,
  )
})

test("assertDistinct refuses a bound list that has absorbed no-bound", () => {
  expect(() => assertDistinct(STOPPING_RULES, [...BOUND_STATUSES, NO_BOUND])).toThrow(
    /^termination-not-distinct: the bound statuses are \[.*, no-bound\]/,
  )
})

test("assertDistinct passes the two taxonomies as they stand", () => {
  // THE CALL THE MODULE MAKES AT IMPORT, asserted here as well so that a reader
  // of a red perturbation above knows the healthy case is the real lists and not
  // a pair constructed to pass.
  expect(() => assertDistinct(STOPPING_RULES, BOUND_STATUSES)).not.toThrow()
})

test("the no-search state reaches no exit code, because exitCodeFor takes a rule", () => {
  // WHAT THIS HOLDS IS THE SHAPE OF THE ONE FUNCTION G2.5 ADMITS THROUGH: every
  // argument it accepts is one of the six, and each of those pairs an admissible
  // candidate to a zero exit except the demoted Q5. So a no-search run has no
  // path to a zero exit at all - not a weaker one.
  for (const rule of STOPPING_RULES) {
    expect(exitCodeFor("admissible", rule), rule).toBe(rule === "Q5" ? 1 : 0)
  }
})
