/**
 * Task 17: the acceptance rule and the climb's bookkeeping.
 *
 * THE AUTHORITY is the brief at
 * `.superpowers/sdd/2026-10-10-stripboard-pipeline/task-17-brief.md`, `OBJ3` in
 * `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md` and
 * COST §6.1/§6.4.
 *
 * **THE FIRST TEST IS THE ONE THIS WHOLE DESIGN RESTS ON.** A ranking term
 * cannot make the climb accept a worse `F`. If it ever passes while `F` rose,
 * `A_occ` - the occupied board area - has become an objective nobody
 * authorised, and every later run's number would be about a different quantity
 * than the one `OBJ1` names.
 *
 * **WHAT THE CLIMB TESTS PROVE AND WHAT THEY DO NOT.** The injected spawn
 * answers `--dump-board` from a script keyed by the dump count, so it does not
 * simulate a gesture: the dump a candidate reports is the script's and not the
 * move's effect. So these assert the COUNTERS, the HISTORY's one-entry-per-
 * evaluation contract, the invocation order and the scratch-file discipline -
 * never the fork's geometry, which `./seed-geometry.test.ts` holds against the
 * real binary. `./climb-fixtures.ts` says the same at its own definition.
 *
 * Every expected count below is hand-derived from the two fixture boards, with
 * the derivation written out, and never recomputed from the implementation's
 * own expression.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import { accepts, climb, evaluate } from "../../tools/stripboard/climb.ts"
import { applicableMoves, enumerateMoves } from "../../tools/stripboard/moves.ts"
import { evaluationsToCross, type ArmRun } from "../../tools/stripboard/seed-compare.ts"
import {
  BETTER,
  BETTER_TUPLE,
  climbInput,
  DUMP,
  evaluation,
  freshRunDir,
  IMPROVES_THEN_STALLS,
  incompleteNetSpawn,
  netlistFile,
  recordingSpawn,
  REFERENCE,
  rulesWithCap,
  rulesWithoutWorseAcceptance,
  rulesWithWorseAcceptance,
  scriptedSpawn,
  seededStart,
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

test("a ranking term cannot make the climb accept a worse F", () => {
  // OBJ3. The candidate below has a strictly better ranking tuple - zero in
  // every one of RANKING's five positions against the base's ones - and a worse
  // F. It must be rejected. If this test ever passes while F rose, the search is
  // optimising something nobody authorised.
  const worseF = {
    ...base,
    score: { ...base.score, objective: base.score.objective + 1 },
    ranking: [0, 0, 0, 0, 0],
  }
  expect(accepts(base, worseF, rulesWithoutWorseAcceptance())).toBe(false)
})

test("a strictly better F is accepted", () => {
  const better = { ...base, score: { ...base.score, objective: base.score.objective - 1 } }
  expect(accepts(base, better, rulesWithoutWorseAcceptance())).toBe(true)
})

test("an equal F with a strictly better ranking is accepted, and an equal tuple is not", () => {
  const plateauBetter = { ...base, ranking: BETTER_TUPLE }
  const plateauSame = { ...base }
  expect(accepts(base, plateauBetter, rulesWithoutWorseAcceptance())).toBe(true)
  expect(accepts(base, plateauSame, rulesWithoutWorseAcceptance())).toBe(false)
})

test("a candidate failing any hard constraint is rejected whatever its F", () => {
  // The base board holds all ten, so HC1 failing here is a REGRESSION this
  // move caused, and no F is cheap enough to buy it.
  const cheapAndBroken = {
    ...base,
    admissibleA1: false,
    score: { ...base.score, objective: 0 },
    results: base.results.map((result) =>
      result.id === "HC1" ? { ...result, held: false } : result,
    ),
  }
  expect(accepts(base, cheapAndBroken, rulesWithoutWorseAcceptance())).toBe(false)
})

test("a constraint already broken before the move does not by itself reject the candidate", () => {
  // THE DEADLOCK THIS RULE EXISTS TO BREAK. Every starting arm begins from a
  // board with incomplete nets, so HC1 fails on the start; under an
  // A1-gates-every-step rule no single gesture could ever be accepted, because
  // no one gesture flips the conjunction of ten. Here HC1 is broken on BOTH
  // sides and the candidate is strictly cheaper, so it is accepted.
  const brokenBefore = {
    ...base,
    admissibleA1: false,
    results: base.results.map((result) =>
      result.id === "HC1" ? { ...result, held: false } : result,
    ),
  }
  const stillBrokenButCheaper = {
    ...brokenBefore,
    score: { ...brokenBefore.score, objective: brokenBefore.score.objective - 1 },
  }
  expect(accepts(brokenBefore, stillBrokenButCheaper, rulesWithoutWorseAcceptance())).toBe(true)
  // And it is still rejected if it breaks a SECOND constraint on the way.
  const alsoBreaksHC3 = {
    ...stillBrokenButCheaper,
    results: stillBrokenButCheaper.results.map((result) =>
      result.id === "HC3" ? { ...result, held: false } : result,
    ),
  }
  expect(accepts(brokenBefore, alsoBreaksHC3, rulesWithoutWorseAcceptance())).toBe(false)
})

test("repairing a constraint is not an acceptance of its own: F and the ranking still decide", () => {
  // HC1 holding is not itself a cheaper board. A candidate that repairs it
  // while F rises is rejected like any other worse candidate - otherwise
  // "repair" would be a second objective nobody declared.
  const brokenBefore = {
    ...base,
    admissibleA1: false,
    results: base.results.map((result) =>
      result.id === "HC1" ? { ...result, held: false } : result,
    ),
  }
  const repairedButDearer = {
    ...base,
    score: { ...base.score, objective: brokenBefore.score.objective + 1 },
  }
  expect(accepts(brokenBefore, repairedButDearer, rulesWithoutWorseAcceptance())).toBe(false)
  const repairedAndCheaper = {
    ...base,
    score: { ...base.score, objective: brokenBefore.score.objective - 1 },
  }
  expect(accepts(brokenBefore, repairedAndCheaper, rulesWithoutWorseAcceptance())).toBe(true)
})

test("a regression is matched by constraint id, never by position in the list", () => {
  // Comparing the two result lists index by index would be a claim about
  // gradeHardConstraints' ordering rather than about the constraints, and would
  // compare HC3 against HC4 the moment anything reordered the table.
  //
  // THE FIXTURE HAS TO DISCRIMINATE IN THE ACCEPT DIRECTION, and the first
  // version of this test did not - a survivor in the mutation run proved it.
  // It reversed the candidate's ten with HC10 broken, where the positional
  // reading finds HC1 held in the base at that index and rejects too: both
  // readings said no, for different reasons, and the test passed either way.
  //
  // So: HC1 is broken on BOTH sides, the candidate's ten are REVERSED (HC1 now
  // last), and the candidate is cheaper. By id this is no regression and the
  // move is accepted. By POSITION the candidate's index 9 is broken HC1 against
  // the base's index 9, held HC10 - so a positional reading invents a
  // regression and rejects.
  const brokenBefore = {
    ...base,
    admissibleA1: false,
    results: base.results.map((result) =>
      result.id === "HC1" ? { ...result, held: false } : result,
    ),
  }
  const reversedAndCheaper = {
    ...brokenBefore,
    results: [...brokenBefore.results].reverse(),
    score: { ...brokenBefore.score, objective: brokenBefore.score.objective - 1 },
  }
  expect(reversedAndCheaper.results[9]?.id).toBe("HC1")
  expect(reversedAndCheaper.results[9]?.held).toBe(false)
  expect(brokenBefore.results[9]?.id).toBe("HC10")
  expect(brokenBefore.results[9]?.held).toBe(true)
  expect(accepts(brokenBefore, reversedAndCheaper, rulesWithoutWorseAcceptance())).toBe(true)
})

test("a configured worseAcceptance refuses rather than being climbed without", () => {
  // E3 is Task 18's. A bound present in the rules and ignored here would make
  // the run record claim a search behaviour that did not happen.
  const refusal = refusalFrom(() => accepts(base, base, rulesWithWorseAcceptance(2)))
  expect(refusal).toContain("worseAcceptance = 2")
  expect(refusal).toContain("Task 18")
})

test("an Evaluation whose admissibleA1 disagrees with its own results refuses", () => {
  // Neither field is preferred: admissibleA1 true beside a broken constraint
  // would certify a board against a check that failed.
  const forged = {
    ...base,
    admissibleA1: true,
    results: base.results.map((result) =>
      result.id === "HC8" ? { ...result, held: false } : result,
    ),
  }
  const refusal = refusalFrom(() => accepts(base, forged, rulesWithoutWorseAcceptance()))
  expect(refusal).toContain("records admissibleA1 = true")
  expect(refusal).toContain("comes to false")
})

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
  // enumerated set was expected to be applicable. Four of the six kinds are
  // now deferred - each on evidence recorded in DEFERRED_KINDS, three of them
  // from the first real-binary run - so the ENUMERATED count (26) is no longer
  // a bound on evaluations at all: a round sweeps the APPLICABLE set, and that
  // is what this asserts instead. Reading the enumerated count as a lower
  // bound would make this test fail for a reason that has nothing to do with
  // the sweep.
  expect(result.evaluations).toBeGreaterThanOrEqual(
    applicableMoves(enumerateMoves(DUMP, REFERENCE)).length,
  )
  expect(enumerateMoves(DUMP, REFERENCE).length).toBe(26)

  // HAND-DERIVED, from the two boards and the script:
  //   round 0 sweeps BASE_DUMP's 12 applicable moves (26 enumerated less the
  //     fourteen cluster, delete-wire, add-wire and rotate ones), and the
  //     script hands BETTER_DUMP to the first of them, so one move is accepted;
  //   round 1 sweeps BETTER_DUMP's 12 applicable moves (22 less the eight
  //     clusters and the two rotates; BETTER_DUMP has no WIRE line and no
  //     cross-strip net, so it enumerates no delete-wire and no add-wire
  //     either way), every one of which reports the worse board, so none is
  //     accepted and S3 stops.
  //   one evaluation of the start, plus 12, plus 12.
  expect(applicableMoves(enumerateMoves(DUMP, REFERENCE)).length).toBe(12)
  expect(applicableMoves(enumerateMoves(BETTER, REFERENCE)).length).toBe(12)
  expect(result.acceptedPerRound).toEqual([1, 0])
  expect(result.rounds).toBe(2)
  expect(result.evaluations).toBe(25)
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
  // And it holds for EVERY evaluation rather than only the first: the four
  // invocations are apply, autofill, check, dump, so the first evaluation is
  // the three with no apply before them and each later one is a full four.
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
  expect(order.slice(3, 7)).toEqual([
    `--move ${runDir}/seeded.vrt --ref R1 --to 1,1 -o ${runDir}/r0-m0.vrt`,
    `--author ${runDir}/r0-m0.vrt --op autofill -o ${runDir}/r0-m0-filled.vrt`,
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
  // started. Round 0 has 12 applicable moves, so the stop is mid-round: the
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
  // And the uncapped climb on the same script spends 31, so the cap really is
  // what stopped this one rather than convergence.
  const uncappedDir = freshRunDir()
  const uncapped = climb(
    seededStart(uncappedDir),
    climbInput(uncappedDir, false),
    scriptedSpawn(IMPROVES_THEN_STALLS),
  )
  expect(uncapped.evaluations).toBe(25)
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
