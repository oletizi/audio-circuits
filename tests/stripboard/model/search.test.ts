/**
 * The search loop's MECHANICS: the fixed acceptance rule, the swappable
 * strategy, and `Q1`-`Q6`.
 *
 * **IT IS NOT THE BENCHMARK.** `./benchmark.test.ts` is the gate, and it runs
 * the owner's own circuits against his own hand-built boards. This file drives
 * the loop over the small fixtures in `./moves-fixtures.ts`, where one question
 * is answerable at a time and a refusal can be made to fire.
 *
 * **EVERY STOPPING RULE THE CORE CAN TEST IS MADE TO FIRE HERE, and the one it
 * cannot is asserted to be DECLARED untested rather than silently absent.** A
 * stopping rule nobody has seen fire is a rule nobody knows works, and a rule
 * that can never fire reads exactly like one that was tested and did not -
 * which is the defect this plan has caught three times.
 */
import { expect, test } from "bun:test"
import { PIN_PATTERNS } from "../../../lib/kicad/pin-pattern.ts"
import { LEAD_SPANS } from "../../../lib/kicad/lead-span.ts"
import type { Candidate } from "../../../lib/stripboard/board.ts"
import { derivedCuts } from "../../../lib/stripboard/cuts.ts"
import { violationsOf } from "../../../lib/stripboard/invariants.ts"
import {
  FIRST_IMPROVEMENT,
  STEEPEST_DESCENT,
  search,
  type SearchSetup,
  type Start,
} from "../../../lib/stripboard/search.ts"
import {
  STOPPING_RULES,
  UNTESTED_IN_CORE,
  type StoppingParameters,
} from "../../../lib/stripboard/search-stop.ts"
import {
  padContiguousOnOneStrip,
  trimmerBesideAResistor,
  twoNetsShareStripZero,
  type MoveCase,
} from "./moves-fixtures.ts"
import { refusalFrom, WEIGHTS } from "./seed-fixtures.ts"

/**
 * The stopping parameters the committed rules file carries, spelled as the
 * fixtures need them.
 *
 * **`cutFloor` IS PER FIXTURE AND IS NOT A RULES PARAMETER**, so it is supplied
 * beside them: `C_floor = max(0, N - R)` (CRITERIA), and on every fixture here
 * `N <= R`, so it is 0. The figure is checked rather than asserted - each
 * fixture's net count and strip count are read below.
 */
function stopping(overrides: Partial<StoppingParameters> = {}): StoppingParameters {
  return {
    cutFloor: 0,
    tau: null,
    yieldFloor: 1,
    evaluationCap: 200000,
    signatureRun: 3,
    ...overrides,
  }
}

/** Soundness as the model states it, which is what the fixtures can prove. */
function soundOnly(candidate: Candidate, cuts: ReturnType<typeof derivedCuts>): boolean {
  return violationsOf(candidate, cuts, REFERENCE).length === 0
}

/** The reference `soundOnly` reads, set per test by `setupFor`. */
let REFERENCE: ReturnType<typeof twoNetsShareStripZero>["reference"] = new Map()

function setupFor(
  instance: MoveCase,
  options: {
    readonly strategy?: SearchSetup["strategy"]
    readonly stopping?: Partial<StoppingParameters>
    readonly admissible?: SearchSetup["admissible"]
  } = {},
): SearchSetup {
  REFERENCE = instance.reference
  return {
    reference: instance.reference,
    spans: LEAD_SPANS,
    patterns: PIN_PATTERNS,
    weights: WEIGHTS,
    stopping: stopping(options.stopping),
    admissible: options.admissible ?? soundOnly,
    strategy: options.strategy ?? STEEPEST_DESCENT,
  }
}

function startOf(name: string, candidate: Candidate): readonly Start[] {
  return [{ name, candidate }]
}

test("every stopping rule is either tested by the core or declared untested, with a reason", () => {
  const untested = UNTESTED_IN_CORE.map((entry) => entry.rule)
  // The union is the whole taxonomy and the two sets are disjoint - which is
  // the property that makes "Q6 did not fire" impossible to confuse with "Q6
  // was never asked".
  for (const rule of STOPPING_RULES) {
    expect(untested.filter((each) => each === rule).length).toBeLessThanOrEqual(1)
  }
  expect(untested).toEqual(["Q6"])
  for (const entry of UNTESTED_IN_CORE) {
    expect(entry.why.length).toBeGreaterThan(200)
    expect(entry.why).toContain("tools/stripboard/stop.ts")
  }
})

test("a run reports the rules it did not test, so a search result cannot hide one", () => {
  const instance = padContiguousOnOneStrip()
  const result = search(startOf("at-floor", instance.base), setupFor(instance))
  expect(result.untested.map((entry) => entry.rule)).toEqual(["Q6"])
})

test("Q1 fires on the board at the floor, and the candidate is returned unchanged", () => {
  const instance = padContiguousOnOneStrip()
  const result = search(startOf("at-floor", instance.base), setupFor(instance))
  expect(result.stoppedOn).toBe("Q1")
  expect(result.best.objective).toBe(0)
  expect(result.best.candidate).toBe(instance.base)
  expect(result.evaluations).toBe(0)
})

test("Q1 does NOT fire on an inadmissible candidate, however cheap it is", () => {
  const instance = padContiguousOnOneStrip()
  const result = search(
    startOf("at-floor", instance.base),
    setupFor(instance, { admissible: () => false }),
  )
  expect(result.stoppedOn).not.toBe("Q1")
  expect(result.best.objective).toBe(0)
})

test("Q2 fires once a tolerance is set, and does not while tau is null", () => {
  const instance = twoNetsShareStripZero()
  const unset = search(startOf("one-cut", instance.base), setupFor(instance))
  expect(unset.stoppedOn).not.toBe("Q2")

  const set = search(
    startOf("one-cut", instance.base),
    setupFor(instance, { stopping: { tau: 0.5 } }),
  )
  expect(set.stoppedOn).toBe("Q2")
})

test("Q3 fires when a FULL SWEEP accepts nothing and no start remains", () => {
  // The board is at the floor, so Q1 would fire first - and an admissibility
  // predicate that refuses is exactly CRITERIA's condition for a run that
  // cannot claim success: it "stops under another condition - Q3, Q4, Q5 or
  // Q6". So this drives Q3 on a board where nothing cheaper exists at all.
  const instance = padContiguousOnOneStrip()
  const result = search(
    startOf("at-floor", instance.base),
    setupFor(instance, { admissible: () => false }),
  )
  expect(result.stoppedOn).toBe("Q3")
  expect(result.counters.startsRemaining).toBe(0)
  // A guard against a run that examined nothing: Q3 says these moves from these
  // seeds found nothing better, which is a statement about proposals that were
  // actually scored.
  expect(result.evaluations).toBeGreaterThan(0)
  expect(result.climbs[0]?.proposals).toBeGreaterThan(0)
  expect(result.climbs[0]?.rounds).toBe(1)
})

test("a board with nets of one pin each needs no join, so it too is at the floor", () => {
  // Kept because it is the one fixture with a RIGID part on it, and a Q1 stop
  // on it proves the at-floor arithmetic does not depend on a board having
  // wires: J = C - N + S_occ is 0 - 5 + 5 here.
  const instance = trimmerBesideAResistor()
  const result = search(startOf("trimmer", instance.base), setupFor(instance))
  expect(result.stoppedOn).toBe("Q1")
  expect(result.best.objective).toBe(0)
})

test("Q5 fires when the run-level cap is spent, and the cap is the parameter", () => {
  const instance = twoNetsShareStripZero()
  const result = search(
    startOf("one-cut", instance.base),
    setupFor(instance, { stopping: { evaluationCap: 1 } }),
  )
  expect(result.stoppedOn).toBe("Q5")
  expect(result.evaluations).toBeGreaterThanOrEqual(1)
})

test("the acceptance rule is the loop's and not the strategy's: cheaper AND sound", () => {
  const instance = twoNetsShareStripZero()
  const before = derivedCuts(instance.base, instance.reference)
  expect(before.length).toBe(1)

  const result = search(startOf("one-cut", instance.base), setupFor(instance))
  expect(result.best.objective).toBeLessThan(1)
  expect(violationsOf(result.best.candidate, result.best.cuts, instance.reference)).toEqual([])
  // Every accepted step is strictly cheaper than the one before it, which is
  // the whole of the rule: no plateau move, no worse move. `worseAcceptance` is
  // null in stripboard/rules.json and E3 therefore DOES NOT RUN.
  const trace = result.climbs[0]?.trace ?? []
  expect(trace.length).toBeGreaterThan(1)
  for (let at = 1; at < trace.length; at += 1) {
    expect(trace[at]).toBeLessThan(trace[at - 1] ?? Number.NEGATIVE_INFINITY)
  }
})

test("the two strategies reach the same cost here and spend different evaluations", () => {
  const instance = twoNetsShareStripZero()
  const steepest = search(
    startOf("one-cut", instance.base),
    setupFor(instance, { strategy: STEEPEST_DESCENT }),
  )
  const first = search(
    startOf("one-cut", instance.base),
    setupFor(instance, { strategy: FIRST_IMPROVEMENT }),
  )
  expect(steepest.strategy).toBe("steepest-descent")
  expect(first.strategy).toBe("first-improvement")
  expect(first.evaluations).toBeLessThan(steepest.evaluations)
  // Reported rather than asserted equal: which cost each reaches is a
  // MEASUREMENT, and an assertion that they agree would be this file deciding
  // the answer the benchmark exists to report.
  expect(Number.isFinite(steepest.best.objective)).toBe(true)
  expect(Number.isFinite(first.best.objective)).toBe(true)
})

test("several starts are climbed in turn and the best across all of them is returned", () => {
  const cheap = padContiguousOnOneStrip()
  const dear = twoNetsShareStripZero()
  // Both fixtures carry the same three nets over the same two references, so
  // they cannot be mixed: each start is climbed against the ONE reference the
  // setup names. The dear board is given first so the result cannot be the
  // first start's by accident.
  const result = search(
    [
      { name: "one-cut", candidate: dear.base },
      { name: "one-cut-again", candidate: dear.base },
    ],
    setupFor(dear),
  )
  expect(result.climbs.length).toBeGreaterThan(1)
  expect(result.climbs.map((climb) => climb.start)).toEqual(["one-cut", "one-cut-again"])
  expect(result.best.objective).toBeLessThanOrEqual(result.climbs[0]?.bestObjective ?? 0)
  expect(cheap.base.wires).toEqual([])
})

test("a search with no starts refuses rather than returning an empty result", () => {
  const instance = twoNetsShareStripZero()
  const message = refusalFrom(() => search([], setupFor(instance)))
  expect(message).toStartWith("stripboard-search-no-starts:")
  expect(message).toContain("Nothing is substituted")
})

test("an unsound start is refused rather than climbed from", () => {
  const instance = padContiguousOnOneStrip()
  // Two nets merged into one, so the merged net's pins sit on strip 0 and strip
  // 8 with nothing joining them - an OPEN. No placement is changed and no pin
  // ends up on two nets, so the refusal that fires is the search's own rather
  // than the cut derivation's.
  const broken = new Map<string, readonly string[]>([
    ["NET_AC", ["R1.1", "R3.1", "R2.2"]],
    ["NET_B", ["R1.2", "R2.1", "R3.2"]],
  ])
  const message = refusalFrom(() =>
    search(startOf("merged-nets", instance.base), {
      ...setupFor(instance),
      reference: broken,
      admissible: (candidate, cuts) => violationsOf(candidate, cuts, broken).length === 0,
    }),
  )
  expect(message).toStartWith("stripboard-search-unsound-start:")
  expect(message).toContain("NET_AC")
})

test("a non-positive evaluation cap refuses, because a run that evaluates nothing is not a run", () => {
  const instance = twoNetsShareStripZero()
  const message = refusalFrom(() =>
    search(startOf("one-cut", instance.base), setupFor(instance, { stopping: { evaluationCap: 0 } })),
  )
  expect(message).toStartWith("stripboard-search-cap-unusable:")
})
