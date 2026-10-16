/**
 * `V4`: every hard constraint has a negative fixture it rejects BY NAME, and no
 * row of that table is satisfied by the constraint's own PASSING detail.
 *
 * **ITS OWN FILE BECAUSE IT IS ONE SUBJECT WITH ONE TABLE AND TWO TESTS**, and
 * because `./grade.test.ts` passed the 500-line ceiling when the table was
 * strengthened. The seam is real rather than a line count: everything there
 * grades a board and asserts what a constraint SAYS about it; this asserts that
 * the eleven fixtures each trip the constraint they were built for and that the
 * clauses the table requires DISCRIMINATE a failure from a pass.
 *
 * `tools/stripboard/constraints.ts` states the claim this file is the evidence
 * for: *"Every one of the ten has a fixture under
 * tests/fixtures/stripboard/negative/ that it rejects by name, and
 * tests/stripboard/grade.test.ts asserts that THAT constraint failed and that
 * its detail names the offending thing - not merely that something failed."*
 */
import { test, expect } from "bun:test"
import { gradeHardConstraints } from "../../tools/stripboard/grade.ts"
import type { ConstraintId } from "../../tools/stripboard/constraints-model.ts"
import { healthyInput, negativeInput } from "./grade-fixtures.ts"

/**
 * The V4 table: one row per negative fixture, naming the constraint it must fail
 * and the clauses that constraint's FAILING branch alone emits.
 *
 * **ONE TABLE, READ BY TWO TESTS.** The test below asserts every row's clauses
 * are in the failing detail; the one after it asserts none of them is in any
 * PASSING detail. A copy per test would be two tables that could drift, which
 * for a table whose whole subject is "does this clause discriminate" would be
 * exactly backwards.
 */
const V4_CASES: readonly (readonly [ConstraintId, string, readonly string[]])[] = [
  ["HC1", "incomplete-net", ["is not whole", "incomplete net(s): bottom"]],
  ["HC2", "cuts-unresolved", ["UNRESOLVED is not COMPUTED", "ABSENT rather than empty"]],
  ["HC3", "floated-part", ["read FLOATING (C19)"]],
  ["HC4", "span-above-tool-range", ["outside the tool's own span range", "R1 spans 17 holes"]],
  ["HC5", "span-above-reach", [
    "stretched past the family's own reach",
    "C1 spans 5 holes against maxSpanHoles 4",
  ]],
  ["HC6", "over-stock", ["does not fit the stock", "29 columns needed against 27"]],
  ["HC7", "schematic-delta", ["non-empty Schematic delta section", "R3 added"]],
  ["HC8", "two-nets-shorted", [
    "does not partition the pins",
    'SHORT: reference nets "mid" and "other"',
  ]],
  ["HC9", "span-below-minimum", [
    "compressed below the family's own minimum",
    "C2 spans 2 holes against minSpanHoles 3",
  ]],
  ["HC10", "round-pin-pattern", ["the footprint half refuses part SW1"]],
  // THE PLACEMENT HALF'S FIXTURE CHANGED ON 2026-10-13, with the owner's
  // amendment to HC10. `rows-along-a-strip` was a DIP-16 with one eight-pin row
  // along one strip and every pin of it on ONE NET, which the amended rule
  // ADMITS: shared copper is a fault only when nothing separates pins that must
  // not be joined, and pins of one net need no cut. That board is now
  // `row-along-a-strip-one-net` and is a POSITIVE control (grade.test.ts). This
  // fixture is the same geometry with the row's pins split across two reference
  // nets and nothing dividing them, which is genuinely unbuildable.
  ["HC10", "row-along-a-strip-two-nets", ["the placement half refuses part U1"]],
]

test("V4: each constraint has a fixture it rejects by name", () => {
  // The parent's gate-9 discipline: a grader that cannot fail proves nothing.
  // Each row is a fixture and the constraint it must fail, and the assertion is
  // that THAT constraint failed and that its detail names the offending thing.
  //
  // **SIX OF THESE ELEVEN ROWS USED TO VERIFY THE EXPLANATORY WORDING AND NOT
  // THE VERDICT**, which is the whole-branch review's finding and the fourth
  // recurrence of this defect class on this branch. The patterns were regexes,
  // and HC4's `/16|range/`, HC5's `/maxSpanHoles|reach/`, HC6's `/34|27|stock/`,
  // HC8's `/short|mid|out/`, HC9's `/minSpanHoles|minimum/` and HC10's `/strip/`
  // are each satisfied VERBATIM by the PASSING detail of the same constraint -
  // "every measurable lead span is inside the tool's **range** of 2-**16**
  // holes", "at or below its family's **maxSpanHoles**", "fits the **stock** 34
  // x 27", "no open, no **short**", "at or above its family's
  // **minSpanHoles**", "each row crosses the **strips**". Only HC1, HC2 and HC3
  // discriminated a failure from a pass, and only HC3 named an offending thing.
  // So a refactor that replaced a `broken()` detail with its `holds()` wording,
  // or dropped the designators from HC4/HC5/HC9 - the only thing that tells a
  // reader which part to go and fix - kept this table green.
  //
  // **THE STRONG FORM: SUBSTRINGS ONLY THE FAILING BRANCH EMITS, AND THE
  // OFFENDING IDENTIFIER BESIDE EACH.** Each row below names the failing
  // branch's own clause AND the designator, net or part the fixture offends
  // with. Every one was checked against the passing detail printed above it in
  // this file's own probe: none of them appears in a `holds()` wording.
  for (const [id, fixture, required] of V4_CASES) {
    const results = gradeHardConstraints(negativeInput(fixture))
    const failed = results.filter((result) => !result.held).map((result) => result.id)
    expect(failed, fixture).toContain(id)
    const detail = results.find((result) => result.id === id)?.detail ?? ""
    for (const clause of required) expect(detail, `${fixture}: ${clause}`).toContain(clause)
  }
})

test("V4: no row of the table above is satisfied by the constraint's PASSING detail", () => {
  // THE GUARD ON THE GUARD, and it is what makes the strengthening above a
  // demand rather than an assertion. The six weak rows were weak because the
  // passing wording matched them, so the property worth holding is exactly
  // that: no clause the table requires may appear in a detail where the
  // constraint HELD. This fails the day somebody weakens a row back to a token
  // the healthy board also prints - which no amount of care in a review can
  // prevent and this can.
  //
  // DRIVEN AGAINST THE OLD TABLE: with HC4's row restored to "range" and "16",
  // both appear in "every measurable lead span is inside the tool's range of
  // 2-16 holes" and this test fails on them.
  const weak = ["range", "16", "maxSpanHoles", "reach", "34", "27", "stock", "short", "out",
    "minSpanHoles", "minimum", "strip", "incomplete"]
  const healthy = gradeHardConstraints(healthyInput())
  const held = healthy.filter((result) => result.held).map((result) => result.detail).join("\n")
  // THE COMPLETENESS CLAIM, ASSERTED RATHER THAN IMPLIED BY A NON-EMPTY STRING.
  // "every constraint holds" is what makes this corpus the full set of passing
  // wordings; `held !== ""` holds of one passing constraint out of ten. If one
  // ever stopped holding, its passing wording would silently leave the corpus
  // and that constraint's row could regress to a weak token with nothing to
  // notice. Measured: all ten hold today.
  expect(healthy.length).toBeGreaterThanOrEqual(10)
  expect(
    healthy.filter((result) => !result.held).map((result) => result.id),
    "the healthy board must hold EVERY constraint, or this corpus is incomplete",
  ).toEqual([])
  expect(held).not.toBe("")
  // The old table's tokens ARE in the passing corpus - this states the defect
  // rather than describing it - and the new table's are not.
  const alsoPassing = weak.filter((token) => held.includes(token))
  expect(alsoPassing.length, `${alsoPassing.join(", ")} appear in passing details`)
    .toBeGreaterThan(0)
  for (const [, fixture, required] of V4_CASES) {
    for (const clause of required) {
      expect(held, `${fixture}: "${clause}" must not be a passing detail's wording`)
        .not.toContain(clause)
    }
  }
})
