/**
 * The comparison: the mark, the decision variable, the two statistics beside it
 * and the retirement rule.
 *
 * Every rate below is a property of the HARNESS and not of a search:
 * `scriptedRunner` answers from a literal table in `./seed-compare-fixtures.ts`,
 * each named for what it encodes, each covering every arm and every seed. The
 * search does not exist at this task - `climb` is Task 17's and restarts are
 * Task 18's - which is why `ArmRunner` is a parameter.
 *
 * ONE TEST HERE CARRIES A GUARANTEE WEAKER THAN ITS SUBJECT AND SAYS SO: the
 * `RETIREMENT` test establishes that each arm is named and followed by prose,
 * and not that the prose is a REASON. That is the owner's judgement at review,
 * exactly as it is for Task 15's `RANKING`.
 */
import { test, expect } from "bun:test"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { parseSeedArm, SEED_ARMS, type SeedArm } from "../../tools/stripboard/seed.ts"
import {
  compareSeedArms,
  evaluationsToCross,
  FROZEN_MARK,
  markObjective,
  meetsMark,
  RETIREMENT,
  type ArmRunner,
} from "../../tools/stripboard/seed-compare.ts"
import { fakeSpawn } from "./seed-fixtures.ts"
import {
  armRun,
  comparisonInput,
  CONSTRUCTED_TIES_RANDOM,
  CONSTRUCTED_WINS,
  EVERY_START_INVALID,
  NOBODY_REACHES,
  ONE_CONSTRUCTED_SEED_MEETS,
  RANDOM_WINS,
  recordingRunner,
  scriptedRunner,
  SCRIPT,
} from "./seed-compare-fixtures.ts"

test("every arm is run against the same seeds, by the one runner the harness is given", () => {
  // The same budget is structural rather than asserted: one runner serves
  // every arm, so there is no second place for a budget to differ. What a body
  // can establish is the seed set and the arm set, and both are asserted.
  const calls: { arm: SeedArm; seed: number; start: string }[] = []
  const comparison = compareSeedArms(comparisonInput(), recordingRunner(calls, SCRIPT), fakeSpawn())
  expect(comparison.arms.map((arm) => arm.arm).sort()).toEqual([...SEED_ARMS].sort())
  for (const arm of SEED_ARMS) {
    expect(calls.filter((call) => call.arm === arm).map((call) => call.seed), arm)
      .toEqual([...comparisonInput().rules.seeds])
  }
  expect(new Set(calls.map((call) => call.start)).size, "each arm starts its own candidate")
    .toBeGreaterThan(1)
})

test("no arm is dropped for starting invalid, and each start's admissibility is recorded", () => {
  // All three starts are expected to be inadmissible: --check reports 19, 13,
  // 7 and 6 incomplete nets on the four import-placed layouts, and neither the
  // construction nor the draw routes a net. An arm filtered out for an invalid
  // start would be every arm, so the repair burden is the search's and common.
  const comparison =
    compareSeedArms(comparisonInput(), scriptedRunner(EVERY_START_INVALID), fakeSpawn())
  expect(comparison.arms.length).toBe(3)
  for (const arm of comparison.arms) {
    expect(arm.perSeed.length, arm.arm).toBe(comparisonInput().rules.seeds.length)
    expect(arm.perSeed.every((seed) => seed.run.startAdmissible === false), arm.arm).toBe(true)
  }
  // The table is not NOBODY_REACHES: every arm met the mark on one seed, so the
  // assertion above is read off runs that happened rather than off a blank run.
  expect(comparison.arms.map((arm) => arm.reached)).toEqual([1, 1, 1])
})

test("the decision variable is the success rate, counted over the seed set", () => {
  const comparison =
    compareSeedArms(comparisonInput(), scriptedRunner(ONE_CONSTRUCTED_SEED_MEETS), fakeSpawn())
  expect(comparison.decisionVariable).toBe("success-rate")
  const constructed = comparison.arms.find((arm) => arm.arm === "constructed")!
  expect(constructed.reached).toBe(1)
  expect(constructed.perSeed.filter((seed) => seed.metMark).length).toBe(1)
  expect(constructed.perSeed.length).toBe(comparisonInput().rules.seeds.length)
})

test("the mark has no default: without one the harness refuses and says it is not defaulted", () => {
  // An agent may never author the acceptance criteria for the artifact it is
  // producing, and a quality bar chosen here would be exactly that. The frozen
  // fixture's mark is B1-frozen's own clause; any other board's is a parameter.
  const noMark = { ...comparisonInput(), mark: null }
  expect(() => compareSeedArms(noMark, scriptedRunner(SCRIPT), fakeSpawn())).toThrow(/mark/)
  expect(() => compareSeedArms(noMark, scriptedRunner(SCRIPT), fakeSpawn()))
    .toThrow(/not defaulted/i)
  expect(FROZEN_MARK.source).toMatch(/B1-frozen/)
})

test("a run meets the mark only on all of its clauses, never on F alone", () => {
  // F <= 5 is reachable with wires: C = 4 with four bridges scores 5 at
  // rhoWire = 0.25, and B1-frozen requires W = 0 with every net complete. So
  // the mark reads its clauses and markObjective is only the crossing figure.
  expect(meetsMark(armRun({ cuts: 4, wires: 4, netsComplete: true }), FROZEN_MARK)).toBe(false)
  expect(meetsMark(armRun({ cuts: 5, wires: 0, netsComplete: true }), FROZEN_MARK)).toBe(true)
  expect(meetsMark(armRun({ cuts: 4, wires: 0, netsComplete: false }), FROZEN_MARK)).toBe(false)
  expect(markObjective(FROZEN_MARK, loadRules())).toBe(FROZEN_MARK.cuts)
  // The 4-cuts-4-wires run's own F, so the first assertion above is read beside
  // the figure that makes it interesting rather than beside an assumed one: it
  // is 5, which is AT the mark's objective, and the mark still refuses it.
  expect(armRun({ cuts: 4, wires: 4, netsComplete: true }).objective).toBe(5)
})

test("evaluationsToCross is an F crossing, undefined when it never crossed, refusing a misaligned history", () => {
  // NAMED AS A CROSSING rather than as "evaluations to reach the mark": an F
  // at or below the mark's objective is necessary for the mark and not
  // sufficient, because the wire and completeness clauses are read off the
  // candidate and not off F. It is the cost figure; the rate is the decision.
  expect(evaluationsToCross(armRun({ history: [9, 8, 5, 4], evaluations: 4 }), 5)).toBe(2)
  expect(evaluationsToCross(armRun({ history: [9, 8, 7], evaluations: 3 }), 5)).toBeUndefined()
  expect(() => evaluationsToCross(armRun({ history: [9, 8], evaluations: 7 }), 5))
    .toThrow(/history/)
})

test("RETIREMENT names all three arms with prose for each, names the control and the decision variable", () => {
  // Task 15's RANKING pattern, and its limit carried with it: that each arm is
  // named and followed by prose is assertable; that the prose is a REASON is
  // the owner's judgement at review, and no test establishes it.
  expect(RETIREMENT).toMatch(/success rate/)
  expect(RETIREMENT).toMatch(/control/)
  for (const arm of SEED_ARMS) {
    const at = RETIREMENT.indexOf(arm)
    expect(at, `${arm} is not named in RETIREMENT`).toBeGreaterThanOrEqual(0)
    const later = SEED_ARMS
      .map((other) => RETIREMENT.indexOf(other, at + arm.length))
      .filter((index) => index > at)
    const prose = RETIREMENT.slice(at + arm.length, Math.min(...later, RETIREMENT.length))
    expect(prose.trim().length, `${arm} is named with no prose after it`).toBeGreaterThan(40)
  }
})

test("constructed not beating random marks it retireable, and a tie counts as not beating", () => {
  const lost = compareSeedArms(comparisonInput(), scriptedRunner(RANDOM_WINS), fakeSpawn())
  expect(lost.retireable).toContain("constructed")
  const tied = compareSeedArms(comparisonInput(), scriptedRunner(CONSTRUCTED_TIES_RANDOM), fakeSpawn())
  expect(tied.retireable, "a construction that ties a uniform draw buys nothing")
    .toContain("constructed")
  // The tie is a TIE and not a loss, read off the two rates: three of five
  // seeds each. A table where constructed merely lost would exercise only the
  // `<` half of the rule and leave `>=` versus `>` undistinguished.
  const rates = (comparison: typeof tied) =>
    comparison.arms.map((arm) => [arm.arm, arm.reached] as const)
  expect(rates(tied)).toEqual([["constructed", 3], ["import", 1], ["random", 3]])
})

test("the import arm gets the same test, and the control is never retireable", () => {
  const lost = compareSeedArms(comparisonInput(), scriptedRunner(RANDOM_WINS), fakeSpawn())
  expect(lost.retireable).toContain("import")
  expect(lost.retireable).not.toContain("random")
})

test("constructed beating random marks nothing retireable, and still selects no arm", () => {
  const won = compareSeedArms(comparisonInput(), scriptedRunner(CONSTRUCTED_WINS), fakeSpawn())
  expect(won.retireable).toEqual([])
  expect(Object.keys(won).sort())
    .toEqual(["arms", "decisionVariable", "mark", "retireable", "separated"])
  // A winning arm does not install itself: there is still no default.
  expect(() => parseSeedArm("")).toThrow(/constructed, import, random/)
})

test("no arm meeting the mark retires nothing, because that run measured the budget", () => {
  const flat = compareSeedArms(comparisonInput(), scriptedRunner(NOBODY_REACHES), fakeSpawn())
  expect(flat.arms.every((arm) => arm.reached === 0)).toBe(true)
  expect(flat.retireable).toEqual([])
  expect(flat.separated).toBe(false)
})

test("a runner that throws fails the comparison rather than scoring that arm zero", () => {
  // A scored zero is indistinguishable from an arm that ran and lost, which is
  // the one confusion this comparison cannot afford.
  const thrower: ArmRunner = () => { throw new Error("spawn exhausted") }
  expect(() => compareSeedArms(comparisonInput(), thrower, fakeSpawn())).toThrow(/exhausted/)
})

test("a scripted table missing a row throws rather than answering it with a default", () => {
  // The guard the fixtures file states, driven: a runner that filled a missing
  // row would decide the rates the comparison is measuring, so the guard must
  // be reachable from a test rather than asserted in a comment.
  expect(() =>
    compareSeedArms(
      comparisonInput(),
      scriptedRunner({ constructed: [0], import: [1] }),
      fakeSpawn(),
    ),
  ).toThrow(/no row for the "random" arm/)
})
