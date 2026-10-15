/**
 * THE TWO `HC8` INVARIANTS UNDER TEST, on the smallest candidates that make each
 * question answerable.
 *
 * **THE CROSS-CHECK AGAINST THE EXISTING VERIFIER IS NOT HERE.** It is
 * `./invariants-agree.test.ts`, following the split this directory already uses
 * for cut derivation (`./cuts.test.ts` and `./cuts-agree.test.ts`): the unit
 * tests may not import `tools/`, the agreement test must, and one file holding
 * both would put the core's own tests on the far side of that boundary.
 *
 * **EVERY REFUSAL IS ASSERTED WITH `toStartWith` ON ITS KEY**, for the reason
 * `./cuts.test.ts` gives: these messages carry explanatory prose that mentions
 * the same words a loose `toThrow(/.../)` would match, so a test that cannot
 * tell one refusal from another proves less than its name claims.
 *
 * **WHAT THESE TESTS ESTABLISH, AND WHAT THEY DO NOT - stated because mutation
 * testing cannot catch a predicate that is too permissive.**
 *
 * They establish BOTH directions on a candidate held otherwise fixed: the same
 * board with its derived cuts holds both invariants and with a cut missing
 * shorts, and an interleaved board holds no cut list that makes it whole. So
 * neither invariant is satisfied by always answering "sound" nor by always
 * answering "broken", which is the failure a count of killed mutants cannot
 * distinguish. They establish that each violation names the net and the
 * component by asserting the component IDS, which are a function of the
 * candidate's own grid walk.
 *
 * **ELEVEN MUTATIONS OF `violationsOf` WERE RUN AND ELEVEN DIED** against these
 * two files: each invariant's threshold moved so it never fires and so it always
 * fires; the pin map keyed by `ref` alone; an unplaced reference pin skipped
 * instead of refused; an off-grid lead skipped instead of refused; an empty
 * reference returning no violations; the witness taken as the largest pin; and
 * each of the three declared orderings reversed. **That is evidence the checks
 * exist and are reached, and it is not evidence that either predicate is tight** -
 * a mutation run cannot find a case neither file thought to write.
 *
 * They do NOT establish that `derivedCuts` can never hand this check a SHORT.
 * **No short below comes out of `derivedCuts`**: every one is produced by handing
 * over a cut list that is not the derived one - which is the honest case, because
 * a move generator carrying a cut list over from the candidate it mutated is
 * exactly how a stale list reaches here. The structural reason is that phase 1
 * separates every adjacent pair of same-strip runs of different nets and every
 * cross-strip join declares one net whose endpoints are its own contacts, so a
 * short would need a defect in that derivation. **That is an argument, not a
 * proof**, and no attempt below succeeded in constructing a counterexample.
 */
import { expect, test } from "bun:test"
import type { Candidate, Hole, Placement } from "../../../lib/stripboard/board.ts"
import { derivedCuts, type ReferenceNets } from "../../../lib/stripboard/cuts.ts"
import {
  describeViolations,
  violationsOf,
  type Violation,
} from "../../../lib/stripboard/invariants.ts"
import { at, FIXTURE_PART_KIND, part } from "./cuts-fixtures.ts"

/** The message a call refused with, or "" when it did not refuse. */
function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

function board(placements: readonly Placement[], columns = 12): Candidate {
  return { grid: { strips: 12, columns }, placements, wires: [], bridges: [] }
}

const nets = (entries: Readonly<Record<string, readonly string[]>>): ReferenceNets =>
  new Map(Object.entries(entries))

/**
 * A one-pin placement, which is what an off-board part's expanded terminal is.
 *
 * It carries `FIXTURE_PART_KIND` rather than a literal of its own for the
 * measured reason `./cuts-fixtures.ts` gives: `tests/kicad/footprint-sweep.ts`
 * collects the value of any quoted footprint field, and a second placeholder
 * here failed that sweep by name until it became this constant.
 */
function terminal(ref: string, pin: string, hole: Hole): Placement {
  return {
    ref,
    footprint: FIXTURE_PART_KIND,
    origin: hole,
    direction: "E",
    holes: [hole],
    pins: new Map([[pin, hole]]),
  }
}

const opensOf = (violations: readonly Violation[]) => violations.filter((v) => v.kind === "open")
const shortsOf = (violations: readonly Violation[]) => violations.filter((v) => v.kind === "short")

/**
 * One net's two leads on two strips with nothing joining them - the open.
 *
 * Each part's other lead is on a strip of its own and on a net of its own, so no
 * strip carries two nets and `derivedCuts` returns nothing at all. With a bare
 * 12-strip board and no cuts, each strip is one conductor and the ids are the
 * strip numbers, which is why the assertions below can name components 2 and 4.
 */
const ONE_NET_ON_TWO_STRIPS = board([
  part("P1", { a: at(2, 4), b: at(0, 0) }),
  part("P2", { a: at(4, 4), b: at(1, 0) }),
])

const ONE_NET_ON_TWO_STRIPS_NETS = nets({
  NET_SPLIT: ["P1.a", "P2.a"],
  NET_P1B: ["P1.b"],
  NET_P2B: ["P2.b"],
})

/**
 * Two nets' leads in neighbouring holes on strip 3 - the short, when the cut
 * between them is absent.
 *
 * `derivedCuts` puts a cut after column 5, the only gap there is, and the board
 * then holds both invariants. The short below is what the SAME board does when
 * the cut list it is checked against does not carry that cut.
 */
const TWO_NETS_ON_STRIP_THREE = board([
  part("P1", { a: at(3, 5), b: at(0, 0) }),
  part("P3", { a: at(3, 6), b: at(5, 0) }),
])

const TWO_NETS_ON_STRIP_THREE_NETS = nets({
  NET_ONE: ["P1.a"],
  NET_TWO: ["P3.a"],
  NET_P1B: ["P1.b"],
  NET_P3B: ["P3.b"],
})

/**
 * One net's two leads on strip 3 with ANOTHER net's lead between them - an open
 * that `derivedCuts` itself produces, and the case the invariants exist for.
 *
 * `NET_ONE` is at columns 1 and 5; `NET_TWO` is at column 3. The declared nets
 * are consistent and phase 1 is correct: it separates the three runs with cuts
 * after columns 1 and 3. **The result still does not work**, because `NET_ONE`'s
 * two leads are now on two sides of `NET_TWO`'s segment with no wire over the
 * top. No cut list makes this board whole, so this is not a derivation defect
 * being reported - it is a layout that needs a wire or a different placement.
 */
const INTERLEAVED_ON_STRIP_THREE = board([
  part("P1", { a: at(3, 1), b: at(0, 0) }),
  part("P2", { a: at(3, 5), b: at(1, 0) }),
  part("P3", { a: at(3, 3), b: at(2, 0) }),
])

const INTERLEAVED_NETS = nets({
  NET_ONE: ["P1.a", "P2.a"],
  NET_TWO: ["P3.a"],
  NET_P1B: ["P1.b"],
  NET_P2B: ["P2.b"],
  NET_P3B: ["P3.b"],
})

test("a sound candidate yields no violations at all", () => {
  const cuts = derivedCuts(TWO_NETS_ON_STRIP_THREE, TWO_NETS_ON_STRIP_THREE_NETS)
  expect(cuts, "phase 1 found the one gap there is").toEqual([{ strip: 3, afterColumn: 5 }])
  expect(violationsOf(TWO_NETS_ON_STRIP_THREE, cuts, TWO_NETS_ON_STRIP_THREE_NETS)).toEqual([])
})

test("INVARIANT 2: a net whose terminals lie in two components is an open naming both", () => {
  const violations = violationsOf(
    ONE_NET_ON_TWO_STRIPS,
    derivedCuts(ONE_NET_ON_TWO_STRIPS, ONE_NET_ON_TWO_STRIPS_NETS),
    ONE_NET_ON_TWO_STRIPS_NETS,
  )
  expect(violations).toEqual([
    {
      kind: "open",
      net: "NET_SPLIT",
      groups: [
        { component: 2, pins: ["P1.a"] },
        { component: 4, pins: ["P2.a"] },
      ],
    },
  ])
})

test("INVARIANT 1: one component holding two nets is a short naming both and the component", () => {
  // THE SAME CANDIDATE AS THE SOUND TEST ABOVE, checked against a cut list that
  // does not carry the cut phase 1 derived for it. With strip 3 uncut it is one
  // conductor, so its id is its strip number.
  const violations = violationsOf(TWO_NETS_ON_STRIP_THREE, [], TWO_NETS_ON_STRIP_THREE_NETS)
  expect(violations).toEqual([
    { kind: "short", nets: ["NET_ONE", "NET_TWO"], component: 3, hole: "3,5" },
  ])
})

test("the invariants read the cut list they are given, not the one phase 1 would derive", () => {
  // The pair above, stated as the property: one candidate, two cut lists, two
  // answers. A check that reached back for `derivedCuts` could not do this, and a
  // check that read the DECLARED nets instead of the partition would answer
  // "sound" both times - the declared nets are identical.
  const reference = TWO_NETS_ON_STRIP_THREE_NETS
  const derived = derivedCuts(TWO_NETS_ON_STRIP_THREE, reference)
  expect(violationsOf(TWO_NETS_ON_STRIP_THREE, derived, reference)).toEqual([])
  expect(violationsOf(TWO_NETS_ON_STRIP_THREE, [], reference)).toHaveLength(1)
})

test("an interleaved strip is an open that phase 1's own cuts produce", () => {
  const cuts = derivedCuts(INTERLEAVED_ON_STRIP_THREE, INTERLEAVED_NETS)
  expect(cuts, "phase 1 separated all three runs").toEqual([
    { strip: 3, afterColumn: 1 },
    { strip: 3, afterColumn: 3 },
  ])
  const violations = violationsOf(INTERLEAVED_ON_STRIP_THREE, cuts, INTERLEAVED_NETS)
  expect(violations).toEqual([
    {
      kind: "open",
      net: "NET_ONE",
      groups: [
        { component: 3, pins: ["P1.a"] },
        { component: 5, pins: ["P2.a"] },
      ],
    },
  ])
  expect(shortsOf(violations), "the net in the middle is not shorted to either side").toEqual([])
})

test("a wire over the top closes the open, so the check is not merely counting strips", () => {
  const joined: Candidate = {
    ...ONE_NET_ON_TWO_STRIPS,
    wires: [{ from: at(2, 4), to: at(4, 4), net: "NET_SPLIT" }],
  }
  const cuts = derivedCuts(joined, ONE_NET_ON_TWO_STRIPS_NETS)
  expect(violationsOf(joined, cuts, ONE_NET_ON_TWO_STRIPS_NETS)).toEqual([])
})

test("two placements sharing one ref are two terminals, not one", () => {
  // A PAD PLACEMENT'S IDENTITY IS ITS `ref` AND ITS PIN NAME. An off-board part
  // with two terminals is two placements sharing one ref, so a map keyed by ref
  // alone would hold one of these two holes and the other pin would refuse as
  // unplaced. This board puts both on one net and on two strips: the open names
  // BOTH pins in two components, which is only possible if both holes were read.
  const candidate = board([terminal("SW", "3", at(0, 0)), terminal("SW", "5", at(1, 0))])
  const reference = nets({ NET_SHARED: ["SW.3", "SW.5"] })
  expect(violationsOf(candidate, derivedCuts(candidate, reference), reference)).toEqual([
    {
      kind: "open",
      net: "NET_SHARED",
      groups: [
        { component: 0, pins: ["SW.3"] },
        { component: 1, pins: ["SW.5"] },
      ],
    },
  ])
})

test("one candidate can be open AND short at once, and both are reported", () => {
  // THE INTERLEAVED BOARD WITH ONLY THE FIRST OF ITS TWO CUTS. Strip 3 is then
  // {0,1} and {2..11}: `NET_ONE`'s leads at columns 1 and 5 fall either side, so
  // it is open - and `NET_TWO`'s lead at column 3 shares the second segment with
  // `NET_ONE`'s, so the two are shorted. One finding of each kind, in the declared
  // order: opens by net name, then shorts by component id.
  const violations = violationsOf(
    INTERLEAVED_ON_STRIP_THREE,
    [{ strip: 3, afterColumn: 1 }],
    INTERLEAVED_NETS,
  )
  expect(violations).toEqual([
    {
      kind: "open",
      net: "NET_ONE",
      groups: [
        { component: 3, pins: ["P1.a"] },
        { component: 4, pins: ["P2.a"] },
      ],
    },
    { kind: "short", nets: ["NET_ONE", "NET_TWO"], component: 4, hole: "3,5" },
  ])
  expect(describeViolations(violations).map((line) => line.slice(0, 6))).toEqual([
    "OPEN: ",
    "SHORT:",
  ])
})

test("two opens come back in ascending net-name order, whatever order the reference lists", () => {
  // THE DECLARED ORDER, CHECKED RATHER THAN ASSERTED IN A COMMENT. The reference
  // below lists `NET_ZEBRA` first, so a walk in reference order would return it
  // first. Both nets are split across two strips with nothing joining them.
  const candidate = board([
    terminal("T1", "1", at(2, 0)),
    terminal("T2", "1", at(3, 0)),
    terminal("T3", "1", at(4, 0)),
    terminal("T4", "1", at(5, 0)),
  ])
  const reference = nets({ NET_ZEBRA: ["T1.1", "T2.1"], NET_ALPHA: ["T3.1", "T4.1"] })
  const violations = violationsOf(candidate, derivedCuts(candidate, reference), reference)
  expect(opensOf(violations).map((violation) => violation.net)).toEqual([
    "NET_ALPHA",
    "NET_ZEBRA",
  ])
})

test("two shorts come back in ascending component order, whatever order the reference lists", () => {
  // The companion for invariant 1, and the same construction: the reference
  // lists strip 2's nets first, so a walk in reference order would put component
  // 2 before component 1.
  const candidate = board([
    terminal("T1", "1", at(1, 0)),
    terminal("T2", "1", at(1, 1)),
    terminal("T3", "1", at(2, 0)),
    terminal("T4", "1", at(2, 1)),
  ])
  const reference = nets({
    NET_C: ["T3.1"],
    NET_D: ["T4.1"],
    NET_A: ["T1.1"],
    NET_B: ["T2.1"],
  })
  const violations = violationsOf(candidate, [], reference)
  expect(shortsOf(violations)).toEqual([
    { kind: "short", nets: ["NET_A", "NET_B"], component: 1, hole: "1,0" },
    { kind: "short", nets: ["NET_C", "NET_D"], component: 2, hole: "2,0" },
  ])
})

test("the result is the same on two runs over one candidate", () => {
  const cuts = [{ strip: 3, afterColumn: 1 }]
  expect(violationsOf(INTERLEAVED_ON_STRIP_THREE, cuts, INTERLEAVED_NETS)).toEqual(
    violationsOf(INTERLEAVED_ON_STRIP_THREE, cuts, INTERLEAVED_NETS),
  )
})

test("an uncut interleaved strip shorts the two nets and leaves neither open", () => {
  // Stated because it is the measurement behind the test above: with NO cuts the
  // whole strip is one conductor, so `NET_ONE` is whole again and the only
  // finding is the short. The open appears only once a cut divides it.
  const violations = violationsOf(INTERLEAVED_ON_STRIP_THREE, [], INTERLEAVED_NETS)
  expect(violations.map((violation) => violation.kind)).toEqual(["short"])
  expect(opensOf(violations)).toEqual([])
})

test("describeViolations renders one line per violation and nothing for a sound candidate", () => {
  const sound = derivedCuts(TWO_NETS_ON_STRIP_THREE, TWO_NETS_ON_STRIP_THREE_NETS)
  expect(
    describeViolations(violationsOf(TWO_NETS_ON_STRIP_THREE, sound, TWO_NETS_ON_STRIP_THREE_NETS)),
  ).toEqual([])
  const lines = describeViolations(
    violationsOf(TWO_NETS_ON_STRIP_THREE, [], TWO_NETS_ON_STRIP_THREE_NETS),
  )
  expect(lines).toHaveLength(1)
  expect(lines[0]).toStartWith("SHORT: ")
  expect(lines[0]).toContain("witnessed at hole 3,5")
  const open = describeViolations(
    violationsOf(
      ONE_NET_ON_TWO_STRIPS,
      derivedCuts(ONE_NET_ON_TWO_STRIPS, ONE_NET_ON_TWO_STRIPS_NETS),
      ONE_NET_ON_TWO_STRIPS_NETS,
    ),
  )
  expect(open[0]).toStartWith("OPEN: ")
  expect(open[0]).toContain("component 2")
  expect(open[0]).toContain("component 4")
})

test("an empty reference refuses rather than reporting a sound candidate", () => {
  expect(refusalFrom(() => violationsOf(ONE_NET_ON_TWO_STRIPS, [], new Map()))).toStartWith(
    "stripboard-invariants-empty-reference: ",
  )
})

test("a reference net with no pins refuses by name", () => {
  const reference = nets({ NET_P1B: ["P1.b"], NET_P2B: ["P2.b"], NET_EMPTY: [] })
  expect(refusalFrom(() => violationsOf(ONE_NET_ON_TWO_STRIPS, [], reference))).toStartWith(
    "stripboard-invariants-empty-reference-net: ",
  )
})

test("a pin on two reference nets refuses rather than being reported as a short", () => {
  // The measured reason is in the refusal itself: this is the one input that
  // would otherwise blame the copper for a netlist defect on a board whose
  // copper is correct.
  const reference = nets({ NET_ONE: ["P1.a"], NET_TWO: ["P1.a"], NET_P1B: ["P1.b"] })
  expect(refusalFrom(() => violationsOf(ONE_NET_ON_TWO_STRIPS, [], reference))).toStartWith(
    "stripboard-invariants-pin-on-two-nets: ",
  )
})

test("two placements stating two holes for one pin refuse by name", () => {
  const candidate = board([terminal("SW", "3", at(0, 0)), terminal("SW", "3", at(1, 0))])
  const reference = nets({ NET_SHARED: ["SW.3"] })
  expect(refusalFrom(() => violationsOf(candidate, [], reference))).toStartWith(
    "stripboard-invariants-pin-declared-twice: ",
  )
})

test("a reference pin no placement puts in a hole refuses, and is NOT reported as an open", () => {
  const reference = nets({ NET_SPLIT: ["P1.a", "P9.a"], NET_P1B: ["P1.b"], NET_P2B: ["P2.b"] })
  const message = refusalFrom(() => violationsOf(ONE_NET_ON_TWO_STRIPS, [], reference))
  expect(message).toStartWith("stripboard-invariants-reference-pin-not-placed: ")
  expect(message, "it names the pin").toContain('"P9.a"')
})

test("a lead in a hole the stock does not have refuses by name", () => {
  const candidate = board([part("P1", { a: at(3, 20), b: at(0, 0) })])
  const reference = nets({ NET_ONE: ["P1.a"], NET_P1B: ["P1.b"] })
  expect(refusalFrom(() => violationsOf(candidate, [], reference))).toStartWith(
    "stripboard-invariants-pin-hole-off-grid: ",
  )
})

test("an unusable grid refuses in connectivity rather than here, and is not swallowed", () => {
  // A SKIPPED CHECK MUST NEVER LOOK LIKE A PASSING ONE. `componentsOf` owns the
  // grid and cut-list refusals; this asserts that `violationsOf` lets one through
  // under its own key rather than catching it and returning no violations.
  const candidate: Candidate = {
    grid: { strips: 0, columns: 4 },
    placements: [],
    wires: [],
    bridges: [],
  }
  expect(
    refusalFrom(() => violationsOf(candidate, [], nets({ NET_ONE: ["P1.a"] }))),
  ).toStartWith("stripboard-connectivity-grid-unusable: ")
})
