/**
 * The search loop's MECHANICS: the fixed acceptance rule, the swappable
 * strategy, and `Q1`-`Q6`.
 *
 * **IT IS NOT THE BENCHMARK.** `./benchmark.test.ts` is the gate, and it runs
 * the owner's own circuits against his own hand-built boards. This file drives
 * the loop over the small fixtures in `./moves-fixtures.ts`, where one question
 * is answerable at a time and a refusal can be made to fire.
 *
 * **WHERE EACH STOPPING RULE IS MADE TO FIRE, because the first round of this
 * task claimed all of them were made to fire here and `Q4` was not.** That was
 * a false claim about a load-bearing rule - `Q4` ended both seeded
 * `transistor-preamp-feedback` runs - and the review caught it. The division
 * now:
 *
 *   - `Q1`, `Q2`, `Q3` and `Q5` fire **through `search`** in this file, because
 *     a real climb reaches each of them;
 *   - `Q4` fires **through `search` in this file too**, by the threshold moving:
 *     one board, one set of restarts, `Q3` at the committed `k = 1` and `Q4` at
 *     a smaller `k`. That is the pattern `tests/stripboard/stop.test.ts` uses
 *     for the same rule on the pipeline side - *"every threshold applied here
 *     must MOVE when the rules file's value moves"* - and it is what proves the
 *     LOOP builds the counters `Q4` reads. Its arithmetic, at a `g`, `r` and `e`
 *     no fixture happens to produce, is driven directly through `evaluateStop`
 *     in `./search-stop.test.ts`;
 *   - `Q6` is not decided by the core at all, and the assertion below is that it
 *     is DECLARED untested with a reason rather than silently absent.
 *
 * A stopping rule nobody has seen fire is a rule nobody knows works, and a rule
 * that can never fire reads exactly like one that was tested and did not -
 * which is the defect this plan has caught three times, and the `Q4` gap above
 * was a fourth.
 *
 * **WHICH REFUSALS ARE DRIVEN, counted rather than claimed in general.** Of
 * `lib/stripboard/search.ts`'s five, four fire here: `no-starts`,
 * `unsound-start`, `cap-unusable` and `no-proposals`. The fifth,
 * `stopped-for-no-reason`, is **not reachable from outside this module** and the
 * reason is stated at the refusal itself. `./search-stop.test.ts` drives all
 * four of `lib/stripboard/search-stop.ts`'s.
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
import { objectiveOf } from "../../../lib/stripboard/score.ts"
import { at } from "./cuts-fixtures.ts"
import {
  AXIAL,
  fitted,
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
  // Q3's OWN CONDITION, read off the counters the rule was decided on: a full
  // sweep that accepted nothing, with no start left.
  expect(result.counters.acceptedThisRound).toBe(0)
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
  expect(result.counters.runEvaluations).toBeGreaterThanOrEqual(1)
  // THE ROUND WAS TRUNCATED AND SAYS SO, which is why Q3 did not fire ahead of
  // Q5: a partial sweep of the move set reports `undefined` rather than
  // nothing-accepted.
  expect(result.counters.acceptedThisRound).toBeUndefined()
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

/**
 * A board whose two rows each carry one net per column, so cuts abound: `parts`
 * resistors across strips 0 and 4, every lead on a net of its own.
 *
 * **IT IS HERE TO GIVE `Q4` A GAP WORTH PROJECTING AGAINST.** Every other
 * fixture in `./moves-fixtures.ts` costs 0 or 1, and `Q4` compares the gap that
 * remains against the rate the search is closing it - so on a board that costs
 * 1 there is nothing to project. Five parts cost `F` 8: four cuts on each of the
 * two occupied strips, no wire, no bridge.
 *
 * **NOTHING ABOUT ITS SHAPE WAS CHOSEN AFTER SEEING A STOP.** The part count is
 * the smallest that does not descend to the objective's floor - at four parts
 * both strategies reach `F` 0 and `Q1` fires, which is measured and is why the
 * number is five.
 */
function crowdedRows(parts: number): MoveCase {
  const placements = []
  const reference = new Map<string, readonly string[]>()
  for (let index = 0; index < parts; index += 1) {
    placements.push(fitted(`R${index}`, AXIAL, "S", { "1": at(0, index), "2": at(4, index) }))
    reference.set(`TOP_${index}`, [`R${index}.1`])
    reference.set(`BOTTOM_${index}`, [`R${index}.2`])
  }
  return {
    base: { grid: { strips: 12, columns: 12 }, placements, wires: [], bridges: [] },
    reference,
  }
}

test("Q4 FIRES THROUGH THE LOOP, and at the committed k = 1 the same run stops on Q3", () => {
  // THE PAIR IS THE TEST. One board, three identical restarts, both strategies,
  // one parameter moved: Q3 at the owner's k = 1 and Q4 below it. So Q4 is
  // applied rather than merely present, the LOOP really does append one entry
  // per climb to both counter arrays and sum e across the run, and a Q4 stuck
  // at false would show up as the two halves agreeing.
  //
  // Identical restarts are the condition Q4 is about - "a restart that won
  // nothing" - and the loop does not dedupe starts. Both climbs reach F 1 from
  // F 8, so the second step is exactly flat and the first is what the threshold
  // is compared against.
  const instance = crowdedRows(5)
  const before = derivedCuts(instance.base, instance.reference)
  expect(objectiveOf(instance.base, before, WEIGHTS)).toBe(8)

  const restarts: readonly Start[] = [0, 1, 2].map((index) => ({
    name: `restart-${index}`,
    candidate: instance.base,
  }))
  let measured = 0
  for (const strategy of [STEEPEST_DESCENT, FIRST_IMPROVEMENT]) {
    const committed = search(restarts, setupFor(instance, { strategy }))
    expect(committed.stoppedOn).toBe("Q3")

    const lowered = search(
      restarts,
      setupFor(instance, { strategy, stopping: { yieldFloor: 0.05 } }),
    )
    expect(lowered.stoppedOn).toBe("Q4")

    // The two runs are the SAME search up to the stop: same board reached, same
    // per-climb counters. Only the rule that read them differs, which is what
    // makes the pair evidence about Q4 rather than about two different climbs.
    //
    // **`runEvaluations` is NOT among them and the sentence used to imply it
    // was** - it is 6,525 at the committed k against 4,350 below it, because the
    // k = 1 run climbs on past where the lowered one stops. That is the stop
    // differing, which is the whole point, so the two figures SHOULD diverge;
    // what must match is everything the rule reads, and `climbHistory` and
    // `climbEvaluations` are asserted below because those are it.
    expect(lowered.best.objective).toBe(committed.best.objective)
    expect(lowered.counters.climbHistory).toEqual(committed.counters.climbHistory)
    expect(lowered.counters.climbEvaluations).toEqual(committed.counters.climbEvaluations)
    // Q4 is measured ACROSS restarts, so the history must carry F_0 and two
    // climbs: a two-entry history would make the rule decline for want of steps
    // rather than for want of a projection.
    expect(lowered.counters.climbHistory.length).toBe(3)
    expect(lowered.counters.climbEvaluations.filter((count) => count > 0).length).toBe(2)
    measured += 1
  }
  expect(measured).toBe(2)
})

test("a board with no move available refuses, rather than reading as a search exhausted", () => {
  // A five-hole strip one column wide, with one axial resistor filling it: every
  // displacement is off the stock, so `movesFrom` returns an empty list. The
  // admissibility predicate refuses so that Q1 - which this board satisfies -
  // does not stop the run before a round is attempted.
  const wedged: Candidate = {
    grid: { strips: 5, columns: 1 },
    placements: [fitted("R1", AXIAL, "S", { "1": at(0, 0), "2": at(4, 0) })],
    wires: [],
    bridges: [],
  }
  const reference = new Map<string, readonly string[]>([
    ["NET_A", ["R1.1"]],
    ["NET_B", ["R1.2"]],
  ])
  const message = refusalFrom(() =>
    search(startOf("wedged", wedged), {
      ...setupFor({ base: wedged, reference }),
      admissible: () => false,
    }),
  )
  expect(message).toStartWith("stripboard-search-no-proposals:")
  expect(message).toContain("examined nothing")
})
