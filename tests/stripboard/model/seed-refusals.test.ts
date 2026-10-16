/**
 * THE REFUSAL CENSUS: every key `seedsFrom` can refuse under, which ones a test
 * drives, and which ones nothing drives at all.
 *
 * **IT IS AN INVENTORY AND THAT IS ITS JOB.** *"A skipped check must never look
 * like a passing one"*, and the way this plan has repeatedly caught a check that
 * could never fire is by counting the refusals and asking which have a test. A
 * census that is out of date is that instrument reading wrong, so the arithmetic
 * below is counted from the modules rather than remembered, and every key it
 * leaves uncovered is named in full - so that a grep for one key lands here.
 *
 * **WHAT THE TESTS HERE ESTABLISH.** That thirteen refusals fire, each on its
 * own leading key: the eight an INPUT can cause (no orderings, no parts, four
 * ordering faults, a stride that is not a stride, an unrecorded span) and the
 * five a NETLIST can (a repeated ref, a field off the grid, and the three
 * reference-versus-parts disagreements). And that one shape which used to refuse
 * no longer does - a field with two pins on one strip.
 *
 * **WHAT THEY DO NOT ESTABLISH.** They assert the leading KEY and, where a fact
 * is load-bearing, that the message carries it - never its prose. A message
 * rewritten keeps passing, which is intended; a message that stops naming the
 * part or the net does not. Nor does a key firing say the refusal is RIGHT to
 * exist: that argument lives in the refusing module's own comment.
 *
 * **TEN OF THE TWENTY-THREE KEYS ARE NOT ASSERTED IN THIS FILE** (`seed.ts` 5,
 * `seed-place.ts` 2, `seed-model.ts` 1, `seed-homes.ts` 8, `seed-validate.ts` 7
 * - 23 refusal sites under 23 distinct keys). **SIX of the ten are asserted in
 * another file:**
 *
 *   - `stripboard-seed-no-column-to-join` - `./seed.test.ts`, beside the
 *     placement refusals it belongs with;
 *   - `stripboard-seed-repeated-pad` - `./seed-off-board.test.ts`, beside the
 *     positive case it is the negative of;
 *   - `stripboard-seed-body-margin-not-whole` - `./seed-room.test.ts`, which
 *     owns the clearance rules;
 *   - `stripboard-seed-home-not-a-strip`,
 *     `stripboard-seed-ordering-states-both-forms` and
 *     `stripboard-seed-ordering-net-has-no-home` - `./seed-homes.test.ts`,
 *     which owns the per-net map form of an ordering.
 *
 * **THE OTHER FOUR ARE UNREACHABLE BY INPUT, which is the accurate word and not
 * "untested":** `stripboard-seed-holes-shared`, `stripboard-seed-unsound`,
 * `stripboard-seed-net-has-no-home` and `stripboard-seed-routed-under-rigid`.
 * All four are internal-defect guards - reachable only if the placer's hole set,
 * its interleaving rejection, `chooseColumn`'s rigid rejection or
 * `homeStripsFor`'s own completeness check has a bug - so no well-formed call
 * fires them, and a fixture that forced one would be testing a board this
 * construction cannot produce. They are the self-checks `seedsFrom` runs over
 * every seed it returns, so they EXECUTE on every seed any test builds; what no
 * input can reach is their refusal branch, not the check.
 *
 * **WHY `routed-under-rigid` IS UNREACHABLE AND NOT MERELY UNVISITED, since it
 * is the one of the four whose argument is not already written at its own site.**
 * `workspace.areas` is appended only in `commit`; every route to `commit` passes
 * `chooseColumn`; `chooseColumn` already rejects any position where
 * `routedUnderRigid` fires, checked in BOTH directions over the same rectangle
 * and the same lead holes as the post-check; and `joinNets` adds no part and
 * moves no lead. So the post-check's input is a set of areas each of which was
 * cleared against all its predecessors, and no input can make it fire. It stays
 * anyway, on the same footing as `holes-shared`, `unsound` and
 * `net-has-no-home` - `seed.ts`'s own header makes exactly this argument for the
 * other hard rule, `rigidOverlap`, and there concludes the opposite (no
 * post-check at all), so the asymmetry is deliberate: that check predates the
 * reasoning and removing it is not this plan's business.
 *
 * **`stripboard-seed-routed-under-rigid` WAS MISSING FROM THIS CENSUS
 * ALTOGETHER UNTIL 2026-10-16**, and it was then one of two keys no test file so
 * much as mentioned. The other, `stripboard-seed-pad-cannot-be-seated`, is now
 * driven by `./seed-off-board.test.ts`; this one is not and will not be. **The
 * count has been wrong twice** - it read four, then five, and is ten - which is
 * the argument for keeping the census in one place with the assertions that make
 * it up, rather than as a paragraph in a file whose own line budget kept
 * squeezing it.
 *
 * **THE SCOPE IS FIVE MODULES, AND THE TWO IT LEAVES OUT ARE NAMED RATHER THAN
 * LEFT TO BE NOTICED.** `seed-fit.ts` and `seed-field.ts` carry three keys
 * between them, which are facts about PLACEMENT rather than about an input:
 * `stripboard-seed-leads-cannot-reach` and
 * `stripboard-seed-field-cannot-be-seated` are driven by `./seed.test.ts` (the
 * first also by `./seed-room.test.ts` and `./seed-shared-strip.test.ts`), and
 * **`stripboard-seed-pad-cannot-be-seated` is driven by
 * `./seed-off-board.test.ts`** - it was driven by nothing, found while
 * recounting on 2026-10-16 as the second of the two keys no test mentioned, and
 * closed in that same review's fix wave with a rigid field whose area blankets
 * the pad's home strip across every column. Widening the census to all seven
 * modules is still to do; what it must not do is leave the finding unwritten in
 * the meantime.
 *
 * **ITS OWN FILE** rather than three sections of `./seed.test.ts`: that file
 * reached this repository's 500-line ceiling when the census was corrected, and
 * the seam is the one its header already draws - what `seedsFrom` BUILDS there,
 * what it REFUSES here.
 */
import { expect, test } from "bun:test"
import { seedsFrom } from "../../../lib/stripboard/seed.ts"
import { validateNetlist } from "../../../lib/stripboard/seed-validate.ts"
import type { LeadSpan } from "../../../lib/kicad/lead-span-model.ts"
import {
  fixedField,
  netlistOf,
  ordering,
  refusalFrom,
  syntheticSpan,
  twoLead,
} from "./seed-fixtures.ts"

/** A two-lead fixture part that reaches 2 to 6 holes. */
const WIDE = "SYNTHETIC:Refusal_TwoLead_Wide"
/** A three-terminal fixture part whose row is three holes long. */
const TRIPLE = "SYNTHETIC:Refusal_Triple_Row"
/** A two-row fixture footprint, for a field whose pins share an `alongSteps`. */
const TWO_ROW = "SYNTHETIC:Refusal_TwoRow"

const SPANS: ReadonlyMap<string, LeadSpan> = new Map([
  [WIDE, syntheticSpan(WIDE, 2, 6)],
  [TRIPLE, syntheticSpan(TRIPLE, 3, 3)],
])

const SMALL = { strips: 8, columns: 8 } as const

test("every input refusal fires on its own leading key", () => {
  const netlist = netlistOf([twoLead("R1", WIDE, ["1", "A"], ["2", "B"])])
  const good = ordering("abc", ["A", "B"], 1)

  expect(refusalFrom(() => seedsFrom(netlist, SMALL, SPANS, []))).toStartWith(
    "stripboard-seed-no-orderings",
  )
  expect(
    refusalFrom(() => seedsFrom({ nets: new Map(), parts: [] }, SMALL, SPANS, [good])),
  ).toStartWith("stripboard-seed-no-parts")
  expect(
    refusalFrom(() => seedsFrom(netlist, SMALL, SPANS, [ordering("x", ["A", "B", "Z"], 1)])),
  ).toStartWith("stripboard-seed-ordering-unknown-net")
  expect(
    refusalFrom(() => seedsFrom(netlist, SMALL, SPANS, [ordering("x", ["A"], 1)])),
  ).toStartWith("stripboard-seed-ordering-missing-net")
  expect(
    refusalFrom(() => seedsFrom(netlist, SMALL, SPANS, [ordering("x", ["A", "A", "B"], 1)])),
  ).toStartWith("stripboard-seed-ordering-repeated-net")
  expect(
    refusalFrom(() => seedsFrom(netlist, SMALL, SPANS, [ordering("x", ["A", "B"], 0)])),
  ).toStartWith("stripboard-seed-ordering-stride-not-positive")
  expect(
    refusalFrom(() => seedsFrom(netlist, { strips: 2, columns: 8 }, SPANS, [
      ordering("x", ["A", "B"], 2),
    ])),
  ).toStartWith("stripboard-seed-ordering-off-board")
  expect(refusalFrom(() => seedsFrom(netlist, SMALL, new Map(), [good]))).toStartWith(
    "stripboard-seed-no-span-recorded",
  )
})

test("every netlist refusal fires on its own leading key", () => {
  const good = ordering("abc", ["A", "B"], 1)
  const twice = netlistOf([
    twoLead("R1", WIDE, ["1", "A"], ["2", "B"]),
    twoLead("R1", WIDE, ["1", "A"], ["2", "B"]),
  ])
  expect(refusalFrom(() => seedsFrom(twice, SMALL, SPANS, [good]))).toStartWith(
    "stripboard-seed-repeated-ref",
  )

  // **THE OLD FIXTURE REFUSED FOR A REASON THAT NO LONGER EXISTS**, recorded
  // rather than quietly dropped: two pins at the same `alongSteps` used to
  // refuse outright under `stripboard-seed-field-shares-a-strip`, on the
  // premise that *"the along axis is laid across the strips...so two pins
  // sharing it would share a strip, and a strip carrying two nets' leads is
  // the interleaved OPEN."* That conflated "shares a strip" with
  // "interleaves" - a correctly quarter-turned DIP puts pin 1 and pin 16 on
  // one strip with a cut down the middle, which is buildable. Whether a
  // placed field's shared strip interleaves is now answered on the PLACED
  // board by `interleavingOn` (lib/stripboard/separable.ts); see
  // "a field with two pins on one strip is no longer refused outright" below
  // for the input-layer half of this.

  const fractional = netlistOf([
    fixedField("Q1", TRIPLE, [
      { pin: "1", net: "A", alongSteps: 0, acrossSteps: 0 },
      { pin: "2", net: "B", alongSteps: 0.5, acrossSteps: 0 },
    ]),
  ])
  expect(refusalFrom(() => seedsFrom(fractional, SMALL, SPANS, [good]))).toStartWith(
    "stripboard-seed-field-off-grid",
  )

  const base = netlistOf([twoLead("R1", WIDE, ["1", "A"], ["2", "B"])])
  const extra = {
    nets: new Map([...base.nets, ["C", ["R9.1"]]]),
    parts: base.parts,
  }
  expect(
    refusalFrom(() => seedsFrom(extra, SMALL, SPANS, [ordering("x", ["A", "B", "C"], 1)])),
  ).toStartWith("stripboard-seed-reference-pin-not-a-part")

  const missing = { nets: new Map([["A", ["R1.1"]], ["B", []]]), parts: base.parts }
  expect(refusalFrom(() => seedsFrom(missing, SMALL, SPANS, [good]))).toStartWith(
    "stripboard-seed-part-pin-not-in-reference",
  )

  const disagreeing = {
    nets: new Map([["A", ["R1.1", "R1.2"]], ["B", []]]),
    parts: base.parts,
  }
  expect(refusalFrom(() => seedsFrom(disagreeing, SMALL, SPANS, [good]))).toStartWith(
    "stripboard-seed-lead-net-disagrees",
  )
})

test("a field with two pins on one strip is no longer refused outright", () => {
  // Two pins of DIFFERENT nets at the same alongSteps - the exact shape
  // `field-shares-a-strip` refused. It is now a placement question, not a
  // field question, so building the netlist must succeed.
  const part = fixedField("U1", TWO_ROW, [
    { pin: "1", net: "A", alongSteps: 0, acrossSteps: 0 },
    { pin: "2", net: "B", alongSteps: 0, acrossSteps: 3 },
  ])
  expect(() => netlistOf([part])).not.toThrow()
  expect(refusalFrom(() => validateNetlist(netlistOf([part])))).toBe("")
})
