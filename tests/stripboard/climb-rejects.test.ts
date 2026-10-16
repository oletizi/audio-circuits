/**
 * WHAT THE CLIMB DOES WITH A CANDIDATE IT CANNOT SCORE - the rejected-and-counted
 * path, driven against an injected fork.
 *
 * **ITS OWN FILE AT A REAL SEAM, not at a line count.** `./climb.test.ts` holds
 * the climb's BOOKKEEPING - the round sweep, the one-entry-per-evaluation
 * history, the carried occupancy, the invocation order, the scratch-file
 * discipline and the cap. This file holds the other half of the contract: which
 * failures are a REJECTED CANDIDATE (counted in `unscoreable`, the run goes on)
 * and which stop the run, and that a sibling's incidental repair does not reject
 * the later siblings of its own round. The two halves want different fixtures -
 * every test here scripts a fork that FAILS in a particular way - and the split
 * put `./climb.test.ts` back under the 500-line ceiling, which it had passed by
 * twenty-seven.
 *
 * **WHAT THESE PROVE AND WHAT THEY DO NOT**, the same caveat `./climb.test.ts`
 * carries: the injected spawn answers `--dump-board` from a script keyed by the
 * dump count, so it does not simulate a gesture - the dump a candidate reports
 * is the script's and not the move's effect. So these assert the COUNTERS and
 * the refusal taxonomy, never the fork's geometry, which
 * `./seed-geometry.test.ts` holds against the real binary.
 *
 * Every expected count is hand-derived from the fixture boards, with the
 * derivation written out, and never recomputed from the implementation's own
 * expression.
 */
import { afterAll, expect, test } from "bun:test"
import { cleanUpTempScratch } from "../support/temp-scratch.ts"
import { climb } from "../../tools/stripboard/climb.ts"
import {
  BASE_DUMP,
  CHECK_COMPLETE,
  climbInput,
  freshRunDir,
  rulesWithCap,
  scriptedSpawn,
  scriptedSpawnWithChecks,
  seededStart,
  TALL_DUMP,
  TALL_PLUS_WIRES_DUMP,
  UNRESOLVED_DUMP,
  type CheckScript,
  type DumpScript,
} from "./climb-fixtures.ts"

afterAll(cleanUpTempScratch)

function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

test("a candidate whose cuts cannot be computed is rejected and counted, not fatal", () => {
  // **THE MEASUREMENT THAT FORCED THIS.** `add-wire` can short two nets, and
  // `AutoFillVero` then reports CUT_STATE UNRESOLVED with CUT_CONFLICT lines
  // instead of a cut arrangement - measured on the constructed arm at seed 3 of
  // the import-placed low-boost board, where Wire1 from 5,3 to 6,3 produced
  // CUT_CONFLICT 5,2,9 5,4,11 and re-running the autofill never resolved it.
  // ./score.ts refuses to score that board and is right to; a refusal that
  // stopped the RUN made add-wire unusable on any real board.
  //
  // HAND-DERIVED: the script hands the unresolved board to round 0's first
  // candidate and BASE_DUMP to everything else, so that one candidate is
  // counted and rejected and the other 88 are scored. The climb therefore
  // reports 89 evaluations rather than 90 - the start plus 88 scored candidates
  // - one unscoreable, and a round that accepted nothing.
  const runDir = freshRunDir()
  const result = climb(
    seededStart(runDir),
    climbInput(runDir, false),
    scriptedSpawn((index) => (index === 1 ? UNRESOLVED_DUMP : BASE_DUMP)),
  )
  expect(result.unscoreable).toBe(1)
  expect(result.evaluations).toBe(89)
  expect(result.history.length).toBe(89)
  expect(result.rounds).toBe(1)
  expect(result.acceptedPerRound).toEqual([0])
  // AND THE CAUSE IS KEPT, not swallowed: the first refusal's own words are on
  // the result, so a reader who sees a count can see what it was.
  expect(result.firstUnscoreable).toContain("CUT_STATE UNRESOLVED")
  expect(result.firstUnscoreable).toContain("score-cuts-not-computed")
  // A CLIMB THAT SCORES NOTHING AT ALL IS STILL A CLIMB THAT MEASURED ITS START,
  // which is what Task 16's requireMeasured needs: the start is NOT caught by
  // this, so an unscoreable START still stops the run.
  const startDir = freshRunDir()
  const refusal = refusalFrom(() =>
    climb(seededStart(startDir), climbInput(startDir, false), scriptedSpawn(() => UNRESOLVED_DUMP)),
  )
  expect(refusal).toContain("score-cuts-not-computed")
})

test("the cap counts what the run SPENT, so unscoreable candidates bring it closer", () => {
  // **WHY THE CAP COUNTS THEM**, which is the half the test above does not
  // reach: an unscoreable candidate costs the same four fork invocations as a
  // scored one, so a board whose every wire candidate shorts would sweep
  // forever against a cap that never moved. `evaluations` still counts only
  // SCORED candidates - Task 16's `evaluationsToCross` needs that - so the two
  // numbers come apart here and the cap is the one that must not.
  //
  // HAND-DERIVED at a fixture cap of 5, the start scored and round 0's first
  // two candidates unresolved: the start is spend 1, the two unscoreable
  // candidates are spends 2 and 3, the next two are SCORED (spends 4 and 5),
  // and the sixth is never started. So three evaluations, two unscoreable, and
  // five spends - against a cap that ignored them, which would run on to five
  // SCORED evaluations.
  const runDir = freshRunDir()
  const result = climb(
    seededStart(runDir),
    { ...climbInput(runDir, false), rules: rulesWithCap(5) },
    scriptedSpawn((index) => (index === 1 || index === 2 ? UNRESOLVED_DUMP : BASE_DUMP)),
  )
  expect(result.unscoreable).toBe(2)
  expect(result.evaluations).toBe(3)
  expect(result.history.length).toBe(3)
})

test("a candidate the fork could not paint stops the run rather than scoring half of it", () => {
  const runDir = freshRunDir()
  const seeded = seededStart(runDir)
  const input = climbInput(runDir, false)
  const refusal = refusalFrom(() =>
    climb(seeded, input, (args) =>
      args[0] === "--author"
        ? { status: 1, stdout: "", stderr: "AutoFillVero: strip connectivity unresolved\n" }
        : { status: 0, stdout: "", stderr: "" },
    ),
  )
  expect(refusal).toContain("painting the strips")
  expect(refusal).toContain("strip connectivity unresolved")
  expect(refusal).toContain("makes every crossing index after it wrong")
})

test("a sibling's incidental repair does not reject the later siblings of its own round", () => {
  // ITEM 1 OF THE TASK 17 REVIEW, AND IT WAS A CORRECTNESS BUG. Every move in a
  // round is applied to ONE base board, so what a move BROKE is a statement
  // about that board. `accepts` compared the candidate's constraints against
  // the INCUMBENT instead, so a sibling that incidentally repaired a constraint
  // and became the incumbent made every LATER sibling in the same round - none
  // of which ever had that repair - look like it had broken the constraint, and
  // each was rejected for a regression it did not cause. Acceptance then
  // depended on the order siblings were swept in, which Task 13's canonical
  // hash cannot see, because the hash is over inputs and outcomes rather than
  // over a round's internal order.
  //
  // **THE CONSTRAINT IS `HC6` AND IT USED TO BE `HC1`, WHICH IS A CHANGE THE
  // COMPLETENESS KEY FORCED RATHER THAN A TIDY-UP.** The open-net count is now
  // the acceptance ordering's first key, so a sibling that leaves a net open is
  // rejected against an incumbent that closed one - deliberately, and whatever
  // its `F`. With `HC1` as the repaired constraint this test could therefore no
  // longer distinguish the bug from the rule: the later sibling would be
  // rejected either way, and a test that passes under the bug is a test of
  // nothing. `HC6` is a fact about the board's extent, the key is constant
  // across the round because every scripted `--check` reports both nets
  // complete, and the property under test is unchanged.
  //
  // THE SCRIPT, three boards whose F strictly decreases, hand-checked against
  // the grader (each figure is `bun run` output on the fixture, not a guess):
  //   evaluation 0, the start: TALL_PLUS_WIRES + a complete --check
  //                            -> F = 0.75, HC6 broken (44 rows against 34),
  //                               nine holding
  //   evaluation 1, round 0 move 0: BASE + a complete --check
  //                            -> F = 0.50, all ten hold - it REPAIRS HC6 and
  //                               is accepted, so it becomes the incumbent
  //   evaluation 2, round 0 move 1: TALL + a complete --check
  //                            -> F = 0, HC6 broken exactly as its predecessor
  //                               had it, and it broke nothing
  // Evaluation 2 is the best board in the run and caused no regression, so it
  // must be accepted. Under the bug it was rejected as an HC6 regression
  // against evaluation 1, and the climb finished at F = 0.5 instead of F = 0.
  const runDir = freshRunDir()
  const dumps: DumpScript = (index) =>
    index === 1 ? BASE_DUMP : index === 2 ? TALL_DUMP : TALL_PLUS_WIRES_DUMP
  const checks: CheckScript = (index) => CHECK_COMPLETE(index)
  const result = climb(
    seededStart(runDir),
    climbInput(runDir, false),
    scriptedSpawnWithChecks(dumps, checks),
  )
  expect(result.history[0]).toBe(0.75)
  expect(result.history[1]).toBe(0.5)
  expect(result.history[2]).toBe(0)
  // BOTH siblings are accepted: the repair, and then the cheaper board that
  // kept HC6 broken. Under the bug this was [1, ...] and never 2.
  expect(result.acceptedPerRound[0]).toBe(2)
  expect(result.best.score.objective).toBe(0)
  // And the run still reports its own inadmissibility rather than hiding it:
  // the best board has HC6 broken, which it inherited and did not cause.
  expect(result.best.admissibleA1).toBe(false)
  expect(result.best.results.filter((entry) => !entry.held).map((entry) => entry.id)).toEqual([
    "HC6",
  ])
  // AND THE FIRST KEY WAS CONSTANT, which is what makes the acceptance above
  // attributable to the no-regression clause and to `F`: every board in the
  // round reported both nets complete.
  expect(result.best.openNets).toBe(0)
})
