/**
 * **THE BENCHMARK, AND IT IS A GATE RATHER THAN A REPORT.** The owner's two
 * hand-built boards, on their own circuits, against the search's result on the
 * same circuits.
 *
 * **THE THRESHOLD IS FIXED DATA AND IS NOT ADJUSTABLE BY WHOEVER IS TRYING TO
 * PASS IT.** It is `C`, `W` and `B` counted off each board's own committed dump
 * and priced by the committed weights - built in `./benchmark-fixtures.ts`,
 * which writes no figure for either board. *"A gate whose bar can be moved by
 * the implementer is the invariant failure this project exists to prevent,
 * wearing a gate's clothes."* Three ways that bar could have been moved, all
 * refused here: a number typed into a test, a friendlier instance, and a
 * tolerance added to the comparison.
 *
 * **IF THE HAND RESULT IS NOT MATCHED, THE MILESTONE HAS FAILED and the
 * assertion below says so by failing.** Reporting a miss honestly and calling
 * the work done are different outcomes, and a disappointing number reported
 * honestly remains worth more than a flattering one - this design exists because
 * the previous plan produced an honest null.
 *
 * **WHAT IS AND IS NOT COMPARED.** `F = C + rho_w*W + rho_s*B` is the
 * comparison, because it is the objective the owner's weights define and
 * `OBJ1`'s term list is closed. **Board area is NOT compared**: the owner was
 * shown three rendered boards for one circuit on 2026-10-14 - his own hand
 * layout beating both of ours on size AND on cut, wire and bridge count - and
 * ruled *"I much prefer the one with zero cuts."* No area term is in `OBJ1` and
 * none is added. The hand board's size is reported as context by
 * `docs/stripboard/pipeline-verification.md` section 14, not asserted on.
 *
 * **TWO STRATEGIES ARE RUN AND BOTH ARE ASSERTED**, because *"naming a winner
 * before measuring is the failure this project's record documents five times"*.
 * Nothing here asserts which is better, or that they agree.
 *
 * **EVERY COUNT THIS FILE ASSERTS OVER IS ASSERTED NON-ZERO FIRST.** A benchmark
 * that silently examined no instance, no strategy or no start would pass while
 * proving nothing, which is the failure mode the whole workflow exists to
 * prevent.
 */
import { expect, test } from "bun:test"
import { FIRST_IMPROVEMENT, STEEPEST_DESCENT } from "../../../lib/stripboard/search.ts"
import type { SearchResult, Strategy } from "../../../lib/stripboard/search.ts"
import {
  BENCHMARK_BOARDS,
  RULES,
  benchmarkInstances,
  figuresOf,
  handRun,
  seededRun,
} from "./benchmark-fixtures.ts"

/** The two strategies, both measured. Neither is the default. */
const STRATEGIES: readonly Strategy[] = [STEEPEST_DESCENT, FIRST_IMPROVEMENT]

const INSTANCES = benchmarkInstances()

/**
 * How long a test that forces the four seeded runs is given, in milliseconds.
 *
 * **IT IS A MEASURED HEADROOM AND NOT A TUNED THRESHOLD.** `bun test`'s default
 * is 5,000 ms and the four runs together take about 7,300 ms on the machine this
 * was written on - `transistor-preamp-feedback` is three climbs and roughly
 * 36,000 evaluations per strategy. The figure below is an order of magnitude
 * over that so a slower machine does not turn a passing gate into a timeout,
 * which would be a failure that says nothing about the search. **It bounds
 * nothing the gate asserts**: the evaluation cap is what bounds the run, and it
 * is a parameter in `./benchmark-fixtures.ts`.
 */
const RUN_TIMEOUT_MS = 60_000

test("the benchmark examines both named instances and two strategies", () => {
  // THE GUARD IN FRONT OF EVERY OTHER ASSERTION IN THIS FILE. A table that came
  // back empty would make every `for` below a loop over nothing.
  expect(INSTANCES.length).toBe(2)
  expect(INSTANCES.map((instance) => instance.name)).toEqual([...BENCHMARK_BOARDS])
  expect(STRATEGIES.length).toBe(2)
  expect(new Set(STRATEGIES.map((strategy) => strategy.name)).size).toBe(2)
})

test("every instance offers at least one start, and every refused start is named", () => {
  for (const instance of INSTANCES) {
    expect(instance.seedStarts.length).toBeGreaterThan(0)
    for (const start of instance.seedStarts) {
      expect(start.candidate.placements.length).toBeGreaterThan(0)
    }
    // A start that refused must carry the refusal, so an unavailable starting
    // point cannot read as one nobody tried.
    for (const entry of instance.unavailableStarts) {
      expect(entry.refusal.length).toBeGreaterThan(40)
    }
  }
})

test("the hand result comes off each board's own dump and is a real cost", () => {
  for (const instance of INSTANCES) {
    // Counted, never transcribed - so these are bounds on the DATA rather than
    // the data itself. Both hand boards carry cuts and wires; asserting the
    // exact figures here would put the threshold in this file.
    expect(instance.hand.cuts).toBeGreaterThan(0)
    expect(instance.hand.wires).toBeGreaterThan(0)
    expect(instance.hand.objective).toBeGreaterThan(instance.hand.cuts)
    expect(instance.hand.objective).toBe(
      instance.hand.cuts + RULES.rhoWire * instance.hand.wires + RULES.rhoSolder * instance.hand.solder,
    )
  }
})

/** The properties every run must have whatever it achieved, asserted once per run. */
function wellFormed(result: SearchResult, strategy: Strategy): SearchResult {
  expect(result.strategy).toBe(strategy.name)
  // A stop is not a pass, but a run with no stated stop is not a result at all.
  expect(result.stoppedOn).toMatch(/^Q[1-6]$/)
  // The rules this run did not test are reported rather than silently absent.
  expect(result.untested.map((entry) => entry.rule)).toEqual(["Q6"])
  return result
}

test("THE GATE: on both instances and both strategies, the search matches the hand board's cost", () => {
  const verdicts: string[] = []
  for (const instance of INSTANCES) {
    for (const strategy of STRATEGIES) {
      const result = wellFormed(seededRun(instance, strategy), strategy)
      const figures = figuresOf(result.best.candidate, instance.nets)

      // EVERY NET WHOLE, on the result that is being compared. A cheaper board
      // that does not realise the circuit is not a cheaper board.
      expect(figures.netsWhole).toBe(true)
      expect(figures.objective).toBe(result.best.objective)

      // THE GATE. `<=` and not `< tau`: the comparison carries no tolerance,
      // because a tolerance here would be the implementer choosing how close
      // counts as matched.
      verdicts.push(
        `${instance.name} / ${strategy.name}: F ${figures.objective} against the hand board's ` +
          `${instance.hand.objective}`,
      )
      expect(figures.objective).toBeLessThanOrEqual(instance.hand.objective)
    }
  }
  // Not decoration: if the two loops above ran over nothing, this is 0 and the
  // gate passed without comparing one board.
  expect(verdicts.length).toBe(INSTANCES.length * STRATEGIES.length)
}, RUN_TIMEOUT_MS)

test("the before state is recorded per start, so the search's gain is separable from the seed's", () => {
  let measured = 0
  for (const instance of INSTANCES) {
    for (const start of instance.seedStarts) {
      const before = figuresOf(start.candidate, instance.nets)
      // SOUND IS A PROPERTY OF THE CONSTRUCTION; NO CUT IS A PROPERTY OF THESE
      // THREE ORDERINGS, and the two are asserted together for different
      // reasons. `seedsFrom` refuses a seed `violationsOf` rejects, so the first
      // line holds for every seed it will ever return.
      //
      // **THE SECOND LINE USED TO CARRY A STRUCTURAL ARGUMENT AND IT IS STRUCK
      // RATHER THAN QUIETLY DROPPED**: ~~"Every seed this construction produces
      // is sound and carries no cut - a STRUCTURAL property of
      // lib/stripboard/seed.ts, and the owner's ruling of 2026-10-14 makes it a
      // feature rather than the accident it was first reported as."~~ That
      // property was deleted on 2026-10-15, when a lead was allowed to land on a
      // strip another net occupies - the owner: *"Zero cuts was never a
      // requirement."* Re-measured the same day: 11 of the 12 distinct orderings
      // `derivedOrderings` yields now build on `transistor-preamp-feedback`, with
      // cut counts 0,0,0,0,0,0,0,2,3,3,4. So a cut-free seed is no longer
      // guaranteed anywhere, and `seed.ts`'s own warning applies to the sentence
      // above - *"a structural argument that has gone stale looks precisely like
      // a sound one."*
      //
      // **THE ASSERTION STAYS**, because what it now says is still worth saying
      // and is still checked: the three orderings this gate starts from come out
      // at C 0 on both instances, which is why the figures below are the seed's
      // wire and bridge counts alone and why the search's gain is separable from
      // them. A change that made one of these three start carrying a cut would be
      // a different baseline, and this line is what refuses to let that pass
      // silently.
      expect(before.netsWhole).toBe(true)
      expect(before.cuts).toBe(0)
      measured += 1
    }
    for (const strategy of STRATEGIES) {
      const result = wellFormed(seededRun(instance, strategy), strategy)
      for (const climb of result.climbs) {
        // A climb's own start cost, beside what it reached: the two figures the
        // plan's Step 1 asks for, per climb rather than per run.
        expect(climb.bestObjective).toBeLessThanOrEqual(climb.initialObjective)
        expect(climb.trace[0]).toBe(climb.initialObjective)
        expect(climb.trace.length).toBe(climb.accepted + 1)
      }
      expect(result.best.objective).toBeLessThanOrEqual(
        Math.min(...result.climbs.map((climb) => climb.initialObjective)),
      )
    }
  }
  expect(measured).toBeGreaterThan(0)
}, RUN_TIMEOUT_MS)

test("THE SEARCH IS RUN FROM THE IMPORTED HAND BOARD TOO, and a board that will not import says so", () => {
  let climbed = 0
  let refused = 0
  for (const instance of INSTANCES) {
    if (instance.importedStart === undefined) {
      // Not a pass by omission: the instance must carry the refusal that says
      // why its own layout is not a startable board.
      const entry = instance.unavailableStarts.find((each) => each.name === "imported hand board")
      expect(entry?.refusal ?? "").toContain("vero-import")
      refused += 1
      continue
    }
    const before = figuresOf(instance.importedStart.candidate, instance.nets)
    expect(before.netsWhole).toBe(true)
    // The imported board IS the hand board, so its own figures must be the
    // threshold's - which is also a check on the importer.
    expect(before.cuts).toBe(instance.hand.cuts)
    expect(before.wires).toBe(instance.hand.wires)
    expect(before.bridges).toBe(instance.hand.solder)
    expect(before.objective).toBe(instance.hand.objective)

    for (const strategy of STRATEGIES) {
      const run = handRun(instance, strategy)
      if (run === undefined) {
        throw new Error(
          `${instance.name} carries an importedStart and handRun returned nothing for ` +
            `${strategy.name}. The two are the same condition, so this is a defect in ` +
            "tests/stripboard/model/benchmark-fixtures.ts rather than a board that would not " +
            "import - and it is thrown rather than skipped, because a skipped strategy here " +
            "passes this test while climbing nothing.",
        )
      }
      const result = wellFormed(run, strategy)
      const after = figuresOf(result.best.candidate, instance.nets)
      expect(after.netsWhole).toBe(true)
      // A climb from the hand board can only improve on it or leave it alone.
      expect(after.objective).toBeLessThanOrEqual(instance.hand.objective)
      // And it stays on the piece of board the owner cut: a translation never
      // changes the grid.
      expect(after.strips).toBe(before.strips)
      expect(after.columns).toBe(before.columns)
      climbed += 1
    }
  }
  // One instance imports and one does not, on the boards as committed. Asserted
  // as a non-zero pair rather than as exact names, so this test cannot pass by
  // examining neither.
  expect(climbed + refused).toBeGreaterThan(0)
  expect(climbed).toBeGreaterThan(0)
  expect(refused).toBeGreaterThan(0)
}, RUN_TIMEOUT_MS)
