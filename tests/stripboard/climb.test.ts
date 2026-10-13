/**
 * Task 17: THE CLIMB'S BOOKKEEPING, driven against an injected fork.
 *
 * The acceptance rule itself is `./climb-accepts.test.ts`, split off for the
 * line ceiling at the seam the brief draws: `accepts` is testable without a
 * spawn, and everything here needs one.
 *
 * **WHAT THESE PROVE AND WHAT THEY DO NOT.** The injected spawn answers
 * `--dump-board` from a script keyed by the dump count, so it does not simulate
 * a gesture: the dump a candidate reports is the script's and not the move's
 * effect. So these assert the COUNTERS, the HISTORY's one-entry-per-evaluation
 * contract, the invocation order, the scratch-file discipline and the CARRIED
 * OCCUPANCY - never the fork's geometry, which `./seed-geometry.test.ts` holds
 * against the real binary. `./climb-fixtures.ts` says the same at its own
 * definition, and `docs/stripboard/pipeline-verification.md` section 5 carries
 * what a real climb against the real binary actually did.
 *
 * Every expected count is hand-derived from the fixture boards, with the
 * derivation written out, and never recomputed from the implementation's own
 * expression.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import { accepts, climb, evaluate } from "../../tools/stripboard/climb.ts"
import { applicableMoves, enumerateMoves } from "../../tools/stripboard/moves.ts"
import { evaluationsToCross, type ArmRun } from "../../tools/stripboard/seed-compare.ts"
import {
  BASE_DUMP,
  BETTER_DUMP,
  CHECK_COMPLETE,
  CHECK_INCOMPLETE,
  climbInput,
  DUMP,
  evaluation,
  freshRunDir,
  IMPROVES_THEN_STALLS,
  incompleteNetSpawn,
  netlistFile,
  OCC,
  recordingSpawn,
  REFERENCE,
  rulesWithCap,
  rulesWithoutWorseAcceptance,
  scriptedSpawn,
  TALL_DUMP,
  TALL_PLUS_WIRES_DUMP,
  UNRESOLVED_DUMP,
  scriptedSpawnWithChecks,
  seededStart,
  type CheckScript,
  type DumpScript,
  TARGETS,
  FOOTPRINTS,
} from "./climb-fixtures.ts"

function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

const base = evaluation()

test("both fixture boards are admissible, so the acceptance tests run over real candidates", () => {
  // THE ASSUMPTION THE WHOLE CLIMB SUITE RESTS ON, asserted rather than
  // believed: if either board failed a hard constraint, every climb below would
  // accept nothing for the one reason that rejects everything - which reads
  // exactly like a converged search.
  const runDir = freshRunDir()
  const spawn = scriptedSpawn(IMPROVES_THEN_STALLS)
  const input = {
    painted: `${runDir}/painted.vrt`,
    netlist: netlistFile(runDir),
    targets: TARGETS,
    reference: REFERENCE,
    footprints: FOOTPRINTS,
    stock: climbInput(runDir, false).stock,
    rules: rulesWithoutWorseAcceptance(),
  }
  // Dump 0 is BASE_DUMP and dump 1 is BETTER_DUMP under this script.
  const first = evaluate(`${runDir}/any.vrt`, input, spawn)
  const second = evaluate(`${runDir}/any.vrt`, input, spawn)
  expect(first.admissibleA1).toBe(true)
  expect(second.admissibleA1).toBe(true)
  // F = C + 0.25*W + 1*B at the committed weights. BASE_DUMP has no CUT and no
  // SOLDER line and two WIRE lines, so 0 + 0.5 + 0; BETTER_DUMP has none of the
  // three, so 0. Both written as the number the arithmetic comes to.
  expect(first.score.objective).toBe(0.5)
  expect(second.score.objective).toBe(0)
})

test("a round is a full sweep of the move set, and the accepted count is per round", () => {
  const runDir = freshRunDir()
  const result = climb(
    seededStart(runDir),
    climbInput(runDir, false),
    scriptedSpawn(IMPROVES_THEN_STALLS),
  )
  expect(result.acceptedPerRound[result.acceptedPerRound.length - 1]).toBe(0)
  // THE BRIEF'S OWN ASSERTION HERE WAS `>= enumerateMoves(...).length`, AND IT
  // IS REPLACED RATHER THAN DELETED, with the reason, because a changed
  // brief-specified assertion must be visible. It was written when the whole
  // enumerated set was expected to be applicable. Two of the seven kinds are
  // deferred - each on evidence recorded in DEFERRED_KINDS, from the first
  // real-binary run - so the ENUMERATED count (30) is no longer a bound on
  // evaluations at all: a round sweeps the APPLICABLE set, and that is what
  // this asserts instead. Reading the enumerated count as a lower bound would
  // make this test fail for a reason that has nothing to do with the sweep.
  expect(result.evaluations).toBeGreaterThanOrEqual(
    applicableMoves(enumerateMoves(OCC, DUMP, REFERENCE)).length,
  )
  expect(enumerateMoves(OCC, DUMP, REFERENCE).length).toBe(93)

  // HAND-DERIVED, from the two boards and the script:
  //   round 0 sweeps BASE_DUMP's 91 applicable moves (93 enumerated less the two
  //     delete-wire ones, which are the only deferred kind left), and the script
  //     hands BETTER_DUMP to
  //     the first of them, so one move is accepted. It was 14 until Task 18
  //     implemented the net cluster, which adds eight - two nets by four unit
  //     deltas, every one of which lands - and 70 more with the gather, 35 per
  //     net, which is every column of the 40-wide grid the whole net fits on
  //     (./moves.test.ts derives both 35s);
  //   round 1 SWEEPS THE CARRIED OCCUPANCY, NOT `occupancyOf(BETTER)`, and
  //     that distinction is the whole point of the occupancy being carried:
  //     the accepted move was `move R1 to 1,1`, so round 1's geometry is
  //     BASE's with R1's 1x6 rect at row 1 - which is NOT what BETTER_DUMP
  //     describes, because the scripted spawn answers --dump-board from a
  //     script rather than simulating the gesture. Hand-counted on that
  //     geometry: R1 four one-hole neighbours, no clockwise turn (a 1x6 rect
  //     at row 1 turns to row -1 and would pan the board), two stretches; R2
  //     four neighbours, one turn, two stretches; and eight clusters again,
  //     both nets moving the same pair and fitting in all four directions from
  //     1,1 and 7,2. And 68 gathers: round 1 enumerates over the dump the
  //     accepted candidate reported, which is BETTER_DUMP, where `left` holds
  //     both pins at column 1 and `right` both at column 6 - so the deltas come
  //     from those columns while the LANDING is checked against the carried
  //     occupancy, R1 six columns wide from column 1 and R2 from column 2.
  //     `left` lands on columns 0 to 33 (R2's rect reaches column s+6, which
  //     must stay inside 39) and `right` on columns 5 to 38 - 34 each, LESS THE
  //     ONE COLUMN THAT MAKES BOTH DELTAS ZERO. On BETTER_DUMP each net holds
  //     both its pins in ONE column, so the gather onto that column moves
  //     nothing and is not a gesture: column 1 for `left` and column 6 for
  //     `right`. 33 each.
  //     4 + 0 + 2 + 4 + 1 + 2 + 8 + 66 = 87, every one of which reports the
  //     worse board, so none is accepted and S3 stops.
  //   one evaluation of the start, plus 91, plus 87.
  expect(applicableMoves(enumerateMoves(OCC, DUMP, REFERENCE)).length).toBe(91)
  expect(result.acceptedPerRound).toEqual([1, 0])
  expect(result.rounds).toBe(2)
  expect(result.evaluations).toBe(179)
  expect(result.best.score.objective).toBe(0)
})

test("history has one entry per evaluation, which is what makes a crossing index a count", () => {
  // THE CONTRACT TASK 16 DEPENDS ON. evaluationsToCross REFUSES a run whose
  // history length disagrees with its evaluations, rather than reporting an
  // index that means nothing - so this calls it for real rather than asserting
  // the lengths match, and a history per ACCEPTED MOVE fails here through that
  // refusal.
  const runDir = freshRunDir()
  const result = climb(
    seededStart(runDir),
    climbInput(runDir, false),
    scriptedSpawn(IMPROVES_THEN_STALLS),
  )
  const run: ArmRun = {
    startAdmissible: true,
    objective: result.best.score.objective,
    cuts: result.best.score.cuts,
    wires: result.best.score.wires,
    netsComplete: true,
    admissibleA1: result.best.admissibleA1,
    history: result.history,
    evaluations: result.evaluations,
  }
  // The start scores 0.5 and the first candidate scores 0, so the first
  // evaluation at or below 0.25 is index 1 - counted by hand off the script,
  // not off the history.
  // evaluationsToCross IS CALLED BEFORE THE LENGTHS ARE COMPARED, deliberately:
  // under a history kept per ACCEPTED MOVE it is Task 16's own refusal that
  // fires here, which is the failure a Task 18 author would really meet, rather
  // than a length assertion in this file standing in for it.
  expect(evaluationsToCross(run, 0.25)).toBe(1)
  expect(result.history.length).toBe(result.evaluations)
  expect(result.history[0]).toBe(0.5)
  expect(result.history[1]).toBe(0)
})

test("round 1 is enumerated from the CARRIED occupancy, not from the candidate's dump", () => {
  // THE SIGNATURE CHANGE, PINNED BY A TEST RATHER THAN BY THE MEASUREMENT THAT
  // FORCED IT. enumerateMoves takes a carried Occupancy because a dump cannot
  // describe a turned part's footprint, and the discriminating consequence is
  // visible in the gestures: round 0's accepted move is `R1 to 1,1`, so the
  // carried geometry has R1's rect at row 1 and round 1's first R1 gesture is
  // `to 0,1`. If the climb re-derived its geometry from the candidate's DUMP
  // instead, it would read BETTER_DUMP - which the scripted spawn returns and
  // which still places R1 at 2,1 - and round 1's first R1 gesture would be
  // `to 1,1` again, repeating round 0 forever.
  const spawned: string[][] = []
  const runDir = freshRunDir()
  climb(
    seededStart(runDir),
    climbInput(runDir, false),
    recordingSpawn(spawned, IMPROVES_THEN_STALLS),
  )
  const firstOf = (round: number): string | undefined =>
    spawned
      .map((args) => args.join(" "))
      .find((line) => line.startsWith("--move") && line.includes(`-o ${runDir}/r${round}-m0.vrt`))
  expect(firstOf(0)).toBe(`--move ${runDir}/seeded.vrt --ref R1 --to 1,1 -o ${runDir}/r0-m0.vrt`)
  expect(firstOf(1)).toContain("--ref R1 --to 0,1")
  expect(firstOf(1)).not.toContain("--to 1,1")
})

test("the climb evaluates on a scratch copy and leaves the start board untouched", () => {
  // The injected spawn really writes every -o path, with content naming itself,
  // so a climb that passed its start as an output would change these bytes.
  const runDir = freshRunDir()
  const seeded = seededStart(runDir)
  const before = fs.readFileSync(seeded, "utf8")
  climb(seeded, climbInput(runDir, false), scriptedSpawn(IMPROVES_THEN_STALLS))
  expect(fs.readFileSync(seeded, "utf8")).toEqual(before)
})

test("the batch verb is optional: the same climb runs identically without it", () => {
  // Task 9 buys breadth, not correctness. A climb that cannot run without it
  // would have made an enabler into a prerequisite.
  const runDir = freshRunDir()
  const seeded = seededStart(runDir)
  const withBatch = climb(
    seeded,
    climbInput(runDir, true),
    scriptedSpawn(IMPROVES_THEN_STALLS),
  )
  const without = climb(
    seeded,
    climbInput(runDir, false),
    scriptedSpawn(IMPROVES_THEN_STALLS),
  )
  expect(without.best.score).toEqual(withBatch.best.score)
  expect(without.evaluations).toBe(withBatch.evaluations)
  expect(without.acceptedPerRound).toEqual(withBatch.acceptedPerRound)
  // And the two transports really were different: the batched run drove
  // --move-batch and the other did not.
  const batchedSpawned: string[][] = []
  climb(seeded, climbInput(runDir, true), recordingSpawn(batchedSpawned, IMPROVES_THEN_STALLS))
  const plainSpawned: string[][] = []
  climb(seeded, climbInput(runDir, false), recordingSpawn(plainSpawned, IMPROVES_THEN_STALLS))
  const batchVerbs = (spawned: string[][]): number =>
    spawned.filter((args) => args[0] === "--move-batch").length
  expect(batchVerbs(batchedSpawned)).toBeGreaterThan(0)
  expect(batchVerbs(plainSpawned)).toBe(0)
})

test("each evaluation runs autofill before scoring, because an unpainted board has no cut list", () => {
  const spawned: string[][] = []
  const runDir = freshRunDir()
  climb(
    seededStart(runDir),
    climbInput(runDir, false),
    recordingSpawn(spawned, IMPROVES_THEN_STALLS),
  )
  const order = spawned.map((args) => args.join(" "))
  const autofill = order.findIndex((line) => line.includes("--op autofill"))
  const dump = order.findIndex((line) => line.includes("--dump-board"))
  expect(autofill).toBeGreaterThanOrEqual(0)
  expect(autofill).toBeLessThan(dump)
  // And it holds for EVERY evaluation rather than only the first. THE START IS
  // THREE INVOCATIONS - autofill, check, dump, with no apply before them and no
  // --update, because the start board is measured exactly as route 1 measured
  // it.
  expect(order.slice(0, 3)).toEqual([
    `--author ${runDir}/seeded.vrt --op autofill -o ${runDir}/start-filled.vrt`,
    `--check ${runDir}/start-filled.vrt --netlist ${runDir}/reference.net`,
    `--dump-board ${runDir}/start-filled.vrt`,
  ])
  // AND THE GESTURE IS APPLIED TO `seeded.vrt`, NOT TO `start-filled.vrt`:
  // the paint is a scoring artifact and the gesture chain runs on the unpainted
  // board. Applying the move to the painted file is what the first version of
  // climb did, and the real binary refused it on round 0, move 0 - `--move`
  // will not relocate a part onto holes that overlap its own current footprint
  // once AutoFillVero has painted copper into them. Measured; see Measured.source.
  //
  // **A CANDIDATE HERE IS FIVE INVOCATIONS AND NOT FOUR, BECAUSE THIS BOARD
  // CARRIES WIRES.** BASE_DUMP has two WIRE lines, so every candidate derived
  // from it carries a wire whose holes must be assigned to a net before
  // anything reads completeness off the board - a fresh wire's holes carry node
  // id 0 and --check's completeness reads node ids, and the climb carries the
  // UN-updated board forward, so the ids have to be re-assigned on each
  // candidate rather than once. On a board with no wire the --update is absent
  // and the candidate is the recorded four.
  expect(order.slice(3, 8)).toEqual([
    `--move ${runDir}/seeded.vrt --ref R1 --to 1,1 -o ${runDir}/r0-m0.vrt`,
    `--update ${runDir}/r0-m0.vrt --netlist ${runDir}/reference.net -o ${runDir}/r0-m0-updated.vrt`,
    `--author ${runDir}/r0-m0-updated.vrt --op autofill -o ${runDir}/r0-m0-filled.vrt`,
    `--check ${runDir}/r0-m0-filled.vrt --netlist ${runDir}/reference.net`,
    `--dump-board ${runDir}/r0-m0-filled.vrt`,
  ])
})

test("S5 stops the climb at the evaluation cap, mid-round, and spends not one more", () => {
  // Q5 IS A BACKSTOP AND NOT A MEASURE: it exists to stop a bug looping
  // forever. The committed cap is 20,000, so a real climb cannot reach it in a
  // test and this drives a fixture cap of 5 instead.
  //
  // HAND-DERIVED: the start is evaluation 1, then round 0's candidates are
  // evaluations 2, 3, 4 and 5, and the cap is checked BEFORE each candidate -
  // so the fifth evaluation is the last one taken and the sixth is never
  // started. Round 0 has 91 applicable moves, so the stop is mid-round: the
  // round is recorded with the one move it accepted before the cap bit.
  const runDir = freshRunDir()
  const result = climb(
    seededStart(runDir),
    { ...climbInput(runDir, false), rules: rulesWithCap(5) },
    scriptedSpawn(IMPROVES_THEN_STALLS),
  )
  expect(result.evaluations).toBe(5)
  expect(result.history.length).toBe(5)
  expect(result.rounds).toBe(1)
  expect(result.acceptedPerRound).toEqual([1])
  // And the uncapped climb on the same script spends 179, so the cap really is
  // what stopped this one rather than convergence.
  const uncappedDir = freshRunDir()
  const uncapped = climb(
    seededStart(uncappedDir),
    climbInput(uncappedDir, false),
    scriptedSpawn(IMPROVES_THEN_STALLS),
  )
  expect(uncapped.evaluations).toBe(179)
})

test("a climb that ends inadmissible says so, rather than reading as one that found nothing", () => {
  // A1 CLASSIFIES THE RESULT, NOT THE STEP. The script here hands back a board
  // whose nets --check reports incomplete, so HC1 fails on every evaluation and
  // no candidate ever repairs it; the climb still runs, still accepts on F, and
  // reports best.admissibleA1 = false.
  const runDir = freshRunDir()
  const result = climb(
    seededStart(runDir),
    climbInput(runDir, false),
    incompleteNetSpawn(IMPROVES_THEN_STALLS),
  )
  expect(result.best.admissibleA1).toBe(false)
  // It is NOT a climb that found nothing: it accepted the cheaper board on the
  // way, which is the whole content of the no-regression rule.
  expect(result.acceptedPerRound[0]).toBe(1)
  expect(result.best.score.objective).toBe(0)
  const failing = result.best.results.filter((entry) => !entry.held).map((entry) => entry.id)
  expect(failing).toEqual(["HC1"])
  // AND THE OPEN-NET COUNT IS THE REPORT'S, NOT A CONSTANT: the scripted
  // `--check` names `left` incomplete and `right` complete, so the one count the
  // acceptance rule's first key reads is 1. Nothing else in this file asserts
  // the wiring from the report to that field, and a field hard-coded to zero
  // would make the key tie on every pair of boards and every completeness test
  // in `./climb-accepts.test.ts` pass on hand-written numbers.
  expect(result.best.openNets).toBe(1)
})

test("the climb evaluates at least the start, so Task 16's requireMeasured is satisfiable", () => {
  // A runner reporting zero evaluations once produced a retirement
  // recommendation out of a run that measured nothing, which is why
  // compareSeedArms refuses one. climb's own guarantee is this.
  const runDir = freshRunDir()
  const result = climb(
    seededStart(runDir),
    climbInput(runDir, false),
    scriptedSpawn(IMPROVES_THEN_STALLS),
  )
  expect(result.evaluations).toBeGreaterThanOrEqual(1)
  expect(result.history.length).toBeGreaterThanOrEqual(1)
})

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
  // counted and rejected and the other 90 are scored. The climb therefore
  // reports 91 evaluations rather than 92 - the start plus 90 scored candidates
  // - one unscoreable, and a round that accepted nothing.
  const runDir = freshRunDir()
  const result = climb(
    seededStart(runDir),
    climbInput(runDir, false),
    scriptedSpawn((index) => (index === 1 ? UNRESOLVED_DUMP : BASE_DUMP)),
  )
  expect(result.unscoreable).toBe(1)
  expect(result.evaluations).toBe(91)
  expect(result.history.length).toBe(91)
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
