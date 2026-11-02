/**
 * The subset mechanism `make check` admits its four verifiers through, and the
 * two ways a subset could quietly become a gate that checks nothing.
 *
 * `tests/perfboard/check.test.ts` drives the four over their negative fixtures
 * through `checkPerfboard`. What is left to establish is about the SELECTION
 * rather than about any constraint: that an empty or repeated set refuses, that
 * the unadmitted six really are not run, that a subset's results can never be
 * folded as `A1`, and that the admission wording is four distinct statements
 * rather than one generic line copied four times.
 */
import { test, expect } from "bun:test"
import {
  ADMITTED,
  ADMITTED_IDS,
  BUILDABILITY_HEADING,
  gradeBuildability,
  refusedBuildability,
} from "../../tools/stripboard/buildability.ts"
import { CONSTRAINT_IDS, a1, gradeConstraints } from "../../tools/stripboard/grade.ts"
import { healthyInput, inputWithoutBounds } from "./grade-fixtures.ts"

test("gradeConstraints refuses an empty set, because the conjunction of nothing is true", () => {
  expect(() => gradeConstraints(healthyInput(), [])).toThrow(
    /no constraints at all/,
  )
})

test("gradeConstraints refuses a repeated id, so a duplicate pass cannot stand in for a missing one", () => {
  expect(() => gradeConstraints(healthyInput(), ["HC5", "HC9", "HC5"])).toThrow(
    /asked for HC5 twice/,
  )
})

test("gradeConstraints returns CRITERIA's order and not the caller's", () => {
  // The report's ordering is then a fact about CRITERIA rather than about an
  // argument list, so two callers naming the same four print the same section.
  const results = gradeConstraints(healthyInput(), ["HC10", "HC5", "HC9", "HC8"])
  expect(results.map((result) => result.id)).toEqual(["HC5", "HC8", "HC9", "HC10"])
})

test("the admitted subset does not RUN the six it leaves out - HC6's own refusal never fires", () => {
  // THE BEHAVIOURAL PROOF, and it is the one that matters: a `gradeConstraints`
  // that graded all ten and then filtered the results would pass every test
  // above and still refuse this input, because HC6 refuses a dump with no
  // BOUNDS line by name. `tests/stripboard/grade.test.ts` asserts the full
  // grade DOES throw on it, so the two tests together pin the behaviour from
  // both sides rather than asserting an absence.
  const bare = inputWithoutBounds()
  expect(() => gradeConstraints(bare, ADMITTED_IDS)).not.toThrow()
  const verdict = gradeBuildability(bare)
  expect(verdict.graded).toBe(true)
  expect(verdict.results.map((result) => result.id)).toEqual([...ADMITTED_IDS])
})

test("a subset's results can never be folded as A1 - a1 refuses them naming the six it did not get", () => {
  // A1 IS ALL TEN AND NOTHING IS TRADEABLE. The risk a subset introduces is a
  // later caller handing four results to `a1` and reading "admissible" off
  // them; `a1`'s coverage assertion is what forecloses it, and this is the test
  // that says so where the subset is declared.
  const four = gradeConstraints(healthyInput(), ADMITTED_IDS)
  expect(() => a1(four)).toThrow(/HC1, HC2, HC3, HC4, HC6, HC7/)
})

test("every admitted id is one of CRITERIA's ten, and each carries its own distinct reason", () => {
  // ONE GENERIC SENTENCE COPIED FOUR TIMES WOULD PASS A LENGTH CHECK AND SAY
  // NOTHING. The `why` text is printed beside a failure, so a reader handed a
  // red board learns what was being required of it; four identical lines would
  // make that output decoration.
  expect(ADMITTED.length).toBe(4)
  expect(ADMITTED.map((entry) => entry.id)).toEqual([...ADMITTED_IDS])
  for (const entry of ADMITTED) {
    expect(CONSTRAINT_IDS).toContain(entry.id)
    expect(entry.why.length).toBeGreaterThan(40)
  }
  expect(new Set(ADMITTED.map((entry) => entry.why)).size).toBe(4)
})

test("a refusal reports graded:false, ok:false and no results, and says it is not a verdict", () => {
  const refusal = refusedBuildability('no lead span is recorded for footprint "X:Y"')
  expect(refusal.graded).toBe(false)
  expect(refusal.ok).toBe(false)
  expect(refusal.results).toEqual([])
  expect(refusal.report).toStartWith(BUILDABILITY_HEADING)
  expect(refusal.report).toContain("NOT GRADED")
  expect(refusal.report).toContain("REFUSAL TO GRADE")
  // The detail is carried verbatim: a refusal summarised is a refusal that no
  // longer names what is missing or where to fix it.
  expect(refusal.report).toContain('no lead span is recorded for footprint "X:Y"')
  // AND IT CANNOT BE MISTAKEN FOR A BROKEN CONSTRAINT: the two point at
  // different remedies, so the two wordings are kept apart.
  expect(refusal.report).not.toContain("NOT HELD")
})

test("a graded pass carries every admitted constraint's figures, not a bare verdict", () => {
  // ConstraintResult's own contract: *"a pass that says nothing is
  // indistinguishable from a pass that checked nothing, and this pipeline has
  // shipped the latter before."*
  const verdict = gradeBuildability(healthyInput())
  expect(verdict.ok).toBe(true)
  expect(verdict.graded).toBe(true)
  for (const result of verdict.results) {
    expect(result.detail.length).toBeGreaterThan(0)
    expect(verdict.report).toContain(`  ${result.id} held - ${result.detail}`)
  }
})
