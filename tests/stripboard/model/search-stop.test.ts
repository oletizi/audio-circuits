/**
 * `Q1`-`Q6`'s ARITHMETIC, driven through `evaluateStop` with counters built by
 * hand - and every refusal `lib/stripboard/search-stop.ts` raises, made to fire.
 *
 * **IT EXISTS BECAUSE THE FIRST ROUND OF THIS TASK SHIPPED A `Q4` NOBODY HAD
 * SEEN FIRE.** The rule ended both seeded `transistor-preamp-feedback` runs and
 * was therefore load bearing in the headline result, and nothing asserted it:
 * `./benchmark.test.ts` checks only that the stop matches `/^Q[1-6]$/`, so a
 * `Q4` that always returned `false` would have fallen through to `Q3` at the
 * same `F` 3.25 and the gate would still have passed. That is a predicate
 * nobody knows works sitting underneath a number being reported, which is the
 * failure this repository is built against. The review of this task caught it.
 *
 * **WHY THE COUNTERS ARE BUILT BY HAND HERE AND CLIMBED FOR IN `./search.test.ts`.**
 * `evaluateStop` is the exported decision function and is the same call the loop
 * makes, so driving it directly is driving the rule - and it is the only way to
 * reach a particular `g`, `r` and `e` without engineering a fixture until the
 * number comes out, which would be fitting the test to the outcome. The LOOP's
 * half - that it appends to both arrays together, one entry per climb, and sums
 * `e` across the run - is proven in `./search.test.ts` by a real climb whose
 * stop moves from `Q3` to `Q4` when `k` moves.
 */
import { expect, test } from "bun:test"
import type { Candidate } from "../../../lib/stripboard/board.ts"
import { derivedCuts, type ReferenceNets } from "../../../lib/stripboard/cuts.ts"
import { objectiveOf } from "../../../lib/stripboard/score.ts"
import {
  STOPPING_RULES,
  UNTESTED_IN_CORE,
  assertTaxonomy,
  evaluateStop,
  type Admissible,
  type RunCounters,
  type Scored,
  type StoppingParameters,
} from "../../../lib/stripboard/search-stop.ts"
import { padContiguousOnOneStrip, twoNetsShareStripZero } from "./moves-fixtures.ts"
import { refusalFrom, WEIGHTS } from "./seed-fixtures.ts"

/** One candidate priced the way the loop prices it, so `best.objective` is real. */
function scoredOf(candidate: Candidate, reference: ReferenceNets): Scored {
  const cuts = derivedCuts(candidate, reference)
  return { candidate, cuts, objective: objectiveOf(candidate, cuts, WEIGHTS) }
}

/**
 * The parameters, with `tau` unset as `stripboard/rules.json` carries it and a
 * cap far above anything these counters spend.
 *
 * `yieldFloor` defaults to the committed `k = 1`; the tests that move it say so.
 */
function parameters(overrides: Partial<StoppingParameters> = {}): StoppingParameters {
  return {
    cutFloor: 0,
    tau: null,
    yieldFloor: 1,
    evaluationCap: 2_000_000,
    signatureRun: 3,
    ...overrides,
  }
}

/**
 * Counters describing a run of three climbs: the first won a lot, the second won
 * nothing.
 *
 * **THE FIGURES ARE A REAL RUN'S**, taken from the synthetic five-resistor board
 * `./search.test.ts` climbs: `F` 8 at the start, 1 after each climb, 2,175
 * evaluations per climb. They are written here rather than computed so that one
 * `g`, `r` and `e` can be held still while `k` moves.
 */
function threeClimbs(overrides: Partial<RunCounters> = {}): RunCounters {
  return {
    climbHistory: [8, 1, 1],
    climbEvaluations: [0, 2175, 2175],
    runEvaluations: 4350,
    startsRemaining: 0,
    // UNDEFINED THROUGHOUT THIS FILE, which keeps Q3 out of the way: it is the
    // state before a climb's first round, and Q3 is about a full sweep that
    // accepted nothing. Without it Q3 fires first on every case below and Q4 is
    // never reached - which is precedence working, and would make these
    // assertions vacuous.
    acceptedThisRound: undefined,
    ...overrides,
  }
}

const ADMITS: Admissible = () => true
const REFUSES: Admissible = () => false

/** A board above its floor, so `Q1` cannot pre-empt the rule under test. */
function aboveFloor(): { readonly best: Scored; readonly reference: ReferenceNets } {
  const instance = twoNetsShareStripZero()
  return { best: scoredOf(instance.base, instance.reference), reference: instance.reference }
}

test("the fixture this file reasons about really is above its floor and costs F = 1", () => {
  // Every Q4 case below depends on Q1 and Q2 declining first. If this board were
  // at its floor, Q1 would fire and every assertion about Q4 would be about a
  // rule that was never consulted.
  const { best, reference } = aboveFloor()
  expect(best.objective).toBe(1)
  expect(best.cuts.length).toBe(1)
  expect(evaluateStop(threeClimbs(), best, reference, parameters(), ADMITS)).not.toBe("Q1")
})

test("Q4 FIRES when the projected cost to close the gap exceeds what the run has spent", () => {
  const { best, reference } = aboveFloor()
  // g = 1 - 0 = 1; r = (8 - 1)/2175 = 0.00322 per evaluation, so g/r = 310.7
  // evaluations to close what provably remains; e = 4350. At k = 0.05 the
  // budget is 217.5 and the projection exceeds it.
  expect(
    evaluateStop(threeClimbs(), best, reference, parameters({ yieldFloor: 0.05 }), ADMITS),
  ).toBe("Q4")
})

test("Q4 DOES NOT fire at the committed k = 1, on those same counters", () => {
  // The pair with the test above is the whole point: the threshold is applied
  // rather than merely present, and it is the rules file's parameter that moves
  // it. At k = 1 the budget is 4350 against a projection of 310.7.
  const { best, reference } = aboveFloor()
  expect(evaluateStop(threeClimbs(), best, reference, parameters(), ADMITS)).not.toBe("Q4")
})

test("Q4 needs TWO consecutive climb steps, so one restart is not enough", () => {
  const { best, reference } = aboveFloor()
  const oneStep = threeClimbs({
    climbHistory: [8, 1],
    climbEvaluations: [0, 2175],
    runEvaluations: 2175,
  })
  expect(evaluateStop(oneStep, best, reference, parameters({ yieldFloor: 0.05 }), ADMITS)).not.toBe(
    "Q4",
  )
})

test("Q4 does not fire when no gap remains, however flat the search has gone", () => {
  const { best, reference } = aboveFloor()
  // cutFloor equal to the achieved F leaves g = 0: there is no gap to project a
  // cost against, so the rule holds for nothing.
  const atTheFloor = parameters({ cutFloor: best.objective, yieldFloor: 0.05 })
  expect(evaluateStop(threeClimbs(), best, reference, atTheFloor, ADMITS)).not.toBe("Q4")
})

test("a restart that won NOTHING is Q4's strongest case, not a division to avoid", () => {
  const { best, reference } = aboveFloor()
  // Both steps flat: r <= 0 twice, which projects an unbounded cost to close a
  // gap that remains. It fires at the committed k = 1, where the measured
  // counters above do not.
  const flat = threeClimbs({ climbHistory: [1, 1, 1] })
  expect(evaluateStop(flat, best, reference, parameters(), ADMITS)).toBe("Q4")
})

test("Q1 requires the admissibility predicate, and Q2 requires a tau", () => {
  const instance = padContiguousOnOneStrip()
  const best = scoredOf(instance.base, instance.reference)
  expect(best.objective).toBe(0)
  const atFloor = threeClimbs({ climbHistory: [0, 0, 0] })
  expect(evaluateStop(atFloor, best, instance.reference, parameters(), ADMITS)).toBe("Q1")
  // Inadmissible: Q1 declines, and with tau unset Q2 cannot take its place.
  expect(evaluateStop(atFloor, best, instance.reference, parameters(), REFUSES)).not.toBe("Q1")
  expect(evaluateStop(atFloor, best, instance.reference, parameters(), REFUSES)).not.toBe("Q2")
  // Admissible with a tau set: Q2 is reachable on a board above its floor.
  const { best: above, reference } = aboveFloor()
  expect(evaluateStop(threeClimbs(), above, reference, parameters({ tau: 0.5 }), ADMITS)).toBe("Q2")
})

test("Q5 is run-level and fires on the shared counter", () => {
  const { best, reference } = aboveFloor()
  const spent = threeClimbs({ runEvaluations: 4350 })
  expect(evaluateStop(spent, best, reference, parameters({ evaluationCap: 4350 }), ADMITS)).toBe(
    "Q5",
  )
  expect(evaluateStop(spent, best, reference, parameters({ evaluationCap: 4351 }), ADMITS)).not.toBe(
    "Q5",
  )
})

test("counters whose two arrays disagree in length refuse rather than measuring a rate", () => {
  const { best, reference } = aboveFloor()
  const lopsided = threeClimbs({ climbEvaluations: [0, 2175] })
  const message = refusalFrom(() =>
    evaluateStop(lopsided, best, reference, parameters(), ADMITS),
  )
  expect(message).toStartWith("search-stop-counters-malformed:")
  expect(message).toContain("3 climb objective(s) and 2 climb evaluation count(s)")
})

test("a climb reporting no evaluations refuses, because its improvement has no rate", () => {
  const { best, reference } = aboveFloor()
  const zeroed = threeClimbs({ climbEvaluations: [0, 2175, 0] })
  const message = refusalFrom(() => evaluateStop(zeroed, best, reference, parameters(), ADMITS))
  expect(message).toStartWith("search-stop-counters-malformed:")
  expect(message).toContain("climb 2 reports 0 evaluation(s)")
})

test("a candidate beneath the declared floor refuses rather than being read as a good result", () => {
  const { best, reference } = aboveFloor()
  const message = refusalFrom(() =>
    evaluateStop(threeClimbs(), best, reference, parameters({ cutFloor: 2 }), ADMITS),
  )
  expect(message).toStartWith("search-stop-negative-gap:")
  expect(message).toContain("F = 1 against a declared floor of 2")
})

test("a bridge on a board at its floor refuses, because there is no join for it to supply", () => {
  const instance = padContiguousOnOneStrip()
  // NET_A's leads sit on strip 0 at columns 1 and 5; strip 1 is empty. A bridge
  // between those two strips at column 8 carries NET_A, adds no cut (one net on
  // each strip either side), adds no wire, and does not change S_occ - which
  // counts LEAD strips. So the board is still at its floor by every clause Q1
  // reads, with B = 1, which is the condition CRITERIA says cannot arise.
  const bridged: Candidate = {
    ...instance.base,
    bridges: [{ column: 8, strips: [0, 1], net: "NET_A" }],
  }
  const best = scoredOf(bridged, instance.reference)
  expect(best.cuts.length).toBe(0)
  expect(bridged.wires.length).toBe(0)
  const message = refusalFrom(() =>
    evaluateStop(
      threeClimbs({ climbHistory: [1, 0.25, 0.25] }),
      best,
      instance.reference,
      parameters(),
      ADMITS,
    ),
  )
  expect(message).toStartWith("search-stop-bridge-without-join:")
  expect(message).toContain("1 solder bridge(s)")
})

test("assertTaxonomy accepts the real lists - which is what makes the three cases below mean something", () => {
  // The guard this file drives is reachable BECAUSE it takes its lists as
  // arguments. `evaluateStop` calls it with the module's own three on every
  // decision, so a hole in the taxonomy fails every stop; here it is shown to
  // fail on demand.
  const untested = UNTESTED_IN_CORE.map((entry) => entry.rule)
  const decided = STOPPING_RULES.filter((rule) => !untested.includes(rule))
  expect(() => assertTaxonomy(STOPPING_RULES, decided, untested)).not.toThrow()
  expect(decided.length).toBeGreaterThan(0)
  expect(untested.length).toBeGreaterThan(0)
})

test("assertTaxonomy refuses a rule that is neither decided nor declared untested", () => {
  const message = refusalFrom(() => assertTaxonomy(STOPPING_RULES, ["Q1", "Q2", "Q3"], ["Q6"]))
  expect(message).toStartWith("search-stop-taxonomy-incomplete:")
  expect(message).toContain("STOP AT THE FIRST OF Q1-Q6")
})

test("assertTaxonomy refuses a rule claimed in both lists at once", () => {
  const message = refusalFrom(() =>
    assertTaxonomy(STOPPING_RULES, ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"], ["Q6"]),
  )
  expect(message).toStartWith("search-stop-taxonomy-incomplete:")
  expect(message).toContain("with [Q6] in both")
})

test("assertTaxonomy refuses a rule the order does not name", () => {
  const message = refusalFrom(() =>
    assertTaxonomy(STOPPING_RULES, ["Q1", "Q2", "Q3", "Q4", "Q5", "Q7"], ["Q6"]),
  )
  expect(message).toStartWith("search-stop-taxonomy-incomplete:")
})

test("WHAT assertTaxonomy DOES NOT CATCH, asserted so the limit is not taken on trust", () => {
  // It compares the two lists as SETS - coverage and disjointness - so it would
  // accept Q3 being moved out of the decided table and into the untested list,
  // which is a rule silently not being tested. **The thing that actually pins
  // the untested list to exactly Q6 is the assertion in `./search.test.ts`**, and
  // `docs/stripboard/pipeline-verification.md` section 14.5 credits it there.
  const movedQ3 = ["Q1", "Q2", "Q4", "Q5"]
  expect(() => assertTaxonomy(STOPPING_RULES, movedQ3, ["Q3", "Q6"])).not.toThrow()
  // And this is the guard that does catch it.
  expect(UNTESTED_IN_CORE.map((entry) => entry.rule)).toEqual(["Q6"])
})
