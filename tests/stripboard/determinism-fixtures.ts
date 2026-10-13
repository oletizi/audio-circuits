/**
 * What `tests/stripboard/determinism.test.ts` is checked against: the two short
 * runs `V6` compares, the four dump scripts they are answered from, and the
 * readers that take a run's CANONICAL block and its EXECUTION PROVENANCE apart.
 *
 * IT IS NOT A `.test.ts` FILE: it is a helper that file imports, following
 * `./search-fixtures.ts`, `./report-fixtures.ts` and six others. The split is
 * the 500-line ceiling at this task's own seam - this file answers *what is a
 * run, and what are its two blocks*, and the test file answers *which of them
 * must reproduce*.
 *
 * **NO SPAWN HERE SIMULATES A GESTURE.** They wrap `./search-fixtures.ts`'s,
 * which answers `--dump-board` from a script keyed by the dump count - so the
 * board a candidate reports is the script's and not the move's effect, and
 * nothing built on this file is evidence about VeroRoute's geometry.
 *
 * **WHY THE RUN IS TINY, AND WHERE THE FIGURES COME FROM.** A determinism test
 * does not need a long run; it needs two identical short ones. These take the
 * `import` arm over `./climb-fixtures.ts`'s two-part `BASE_DUMP` with two seeds
 * and an evaluation cap of 95, which is one stalled climb (90 evaluations: its
 * start plus that board's 89 applicable moves, the arithmetic
 * `./search-fixtures.ts` writes out) plus a second climb's start and two
 * candidates. Every figure the tests assert is derived from that arithmetic and
 * nothing here is measured by running anything.
 */
import { createHash } from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { CONSTRAINT_IDS } from "../../tools/stripboard/constraints-model.ts"
import { A_OCC_POSITION, RANKING_POSITIONS } from "../../tools/stripboard/rank.ts"
import { boundFor, outcomeOf } from "../../tools/stripboard/report.ts"
import type { StripboardRules } from "../../tools/stripboard/rules.ts"
import {
  canonicalHash,
  type CanonicalInputs,
  type CanonicalMetrics,
  type RunManifest,
} from "../../tools/stripboard/run-dir.ts"
import { search, type RunResult } from "../../tools/stripboard/search.ts"
import type { SpawnVeroroute } from "../../tools/stripboard/seed.ts"
import { evaluateStop, type StopState, type StoppingRule } from "../../tools/stripboard/stop.ts"
import type { BoardTargets } from "../../tools/stripboard/targets.ts"
import { admissible } from "../../tools/stripboard/verdict.ts"
import { UNRESOLVED_DUMP } from "./climb-fixtures.ts"
import { INPUTS } from "./run-dir-fixtures.ts"
import {
  committedRules,
  DUMPS_PER_STALLED_CLIMB,
  lowBoostSearchInput,
  recordingLowBoostSpawn,
  searchInput,
  searchSpawn,
  SECOND_SEED_WINS,
  startSequences,
  STALLS_IMMEDIATELY_EVERY_SEED,
} from "./search-fixtures.ts"
import { IMPORTED_BOARD } from "./seed-fixtures.ts"

/**
 * The seed list these runs restart on, and the cap that bounds them.
 *
 * TWO SEEDS AND 95 EVALUATIONS, DERIVED RATHER THAN CHOSEN: a cap of 95 leaves
 * the second climb a start and four candidates after the first climb's 90, the
 * shortest run that still has a restart boundary in it. A third seed would never
 * be reached, so the list names two.
 */
export const SEEDS: readonly number[] = [0, 1]
export const CAP = 95

/**
 * The board name these runs grade under, and it is NOT `pultec-low-boost`.
 *
 * `./search-fixtures.ts` hands the low-boost targets to the search because the
 * stock, the net count and the floor have to come from a real declaration - but
 * the boards the script answers with are `./climb-fixtures.ts`'s two-part
 * fixture, which is neither low-boost board. `A4` reads differently on those
 * two, and `tools/stripboard/verdict.ts` refuses to grade `pultec-low-boost`
 * without being told which one ran - correctly, because reporting `B1-frozen`
 * met on a board nobody built is the error `A4` exists to prevent. Renaming the
 * board makes `A4` vacuous and states the truth: this is a fixture board.
 * `./report-fixtures.ts` names its own `stop-fixture` for the same reason.
 */
export const BOARD = "determinism-fixture"

/** The dump script both reproduced runs are answered from: the second seed wins. */
export const SCRIPT = SECOND_SEED_WINS

/**
 * The same world with no candidate ever better than its start, so the run ends
 * on the stalled board.
 *
 * This is the run whose RESULT differs - `F = 0.5` against `SCRIPT`'s `0`, two
 * wires against none, and `Q3` rather than `Q5` - which is the half that makes
 * *a slower run must reproduce* mean something.
 */
export const NOTHING_ACCEPTED = (): string => STALLS_IMMEDIATELY_EVERY_SEED()

/**
 * The better board one candidate LATER: the second climb accepts its second
 * move instead of its first.
 *
 * **THE RUN THIS SCRIPT PRODUCES LANDS ON THE SAME BOARD BY A DIFFERENT PATH**,
 * which is `V6`'s own sentence and the reason the candidate FILE is compared and
 * not only the numbers: every canonical metric is identical to `SCRIPT`'s and
 * the accepted move is a different one.
 */
export const ONE_MOVE_LATER = (dumpIndex: number): string =>
  dumpIndex === DUMPS_PER_STALLED_CLIMB + 3
    ? SCRIPT(DUMPS_PER_STALLED_CLIMB + 2)
    : STALLS_IMMEDIATELY_EVERY_SEED()

/**
 * `SCRIPT` with ONE of the first climb's candidates unscoreable, which moves the
 * restart boundary and nothing else.
 *
 * An unscoreable candidate is rejected and counted rather than evaluated
 * (`ClimbResult.unscoreable`), so the first climb reports 89 evaluations instead
 * of 90 and the restart therefore begins at 89. It still consumed its dump, so
 * every later index is where `SCRIPT` put it and the second climb accepts the
 * same move: the run reports the same candidate bytes, the same `F`, the same
 * ranking tuple, the same stopping rule and the same outcome. **The boundaries
 * are the only thing that moves.**
 *
 * Index 2 is the first climb's FIRST CANDIDATE - 0 is the arm's read of the
 * imported board and 1 is the start, and an unscoreable START stops the run
 * instead of being counted (`./climb.test.ts`'s own case).
 */
export const BOUNDARY_SHIFTED = (dumpIndex: number): string =>
  dumpIndex === 2 ? UNRESOLVED_DUMP : SCRIPT(dumpIndex)

/** One run, with everything the two contracts are read off it. */
export interface Bundle {
  readonly result: RunResult
  readonly targets: BoardTargets
  readonly rules: StripboardRules
  readonly runDir: string
  readonly seeds: readonly number[]
  /**
   * The reported candidate's bytes, read the moment the run returned.
   *
   * CARRIED RATHER THAN RE-READ, because `./determinism.test.ts` empties the run
   * directory between two runs: a later read would find the other run's file or
   * no file at all, and comparing the second run's bytes against a file the
   * first run left behind would be a reproduction test satisfied by staleness.
   */
  readonly candidateBytes: Buffer
  /** Provenance: how many fork invocations the run made. */
  readonly invocations: number
  /** Provenance: wall clock, measured here and compared by nothing. */
  readonly durationMs: number
  readonly startedAt: string
}

/** Every fork invocation counted, and `delayMs` of real time spent in each. */
function countingSpawn(
  script: (index: number) => string,
  delayMs: number,
  counter: { invocations: number },
): SpawnVeroroute {
  const inner = searchSpawn(script)
  return (args) => {
    counter.invocations += 1
    if (delayMs > 0) Bun.sleepSync(delayMs)
    return inner(args)
  }
}

/** One run to make: which script answers it, and the two things a test varies. */
export interface RunSpec {
  readonly script: (index: number) => string
  readonly seeds?: readonly number[]
  readonly delayMs?: number
}

/** Run one search over the fixture world and record what it cost. */
function runSearch(options: RunSpec & { readonly runDir: string }): Bundle {
  const seeds = options.seeds ?? SEEDS
  const base = searchInput(options.runDir)
  const rules: StripboardRules = { ...committedRules(), seeds, evaluationCap: CAP }
  const targets: BoardTargets = { ...base.targets, board: BOARD }
  const counter = { invocations: 0 }
  const spawn = countingSpawn(options.script, options.delayMs ?? 0, counter)
  const startedAt = new Date().toISOString()
  const started = Date.now()
  const result = search({ ...base, targets, rules }, spawn)
  return {
    result,
    targets,
    rules,
    runDir: options.runDir,
    seeds,
    candidateBytes: fs.readFileSync(result.best.candidate),
    invocations: counter.invocations,
    durationMs: Date.now() - started,
    startedAt,
  }
}

/**
 * One run through `runDir`, which is EMPTIED and recreated first.
 *
 * **WHY EVERY COMPARISON SHARES ONE DIRECTORY, BECAUSE IT BOUNDS EVERY TEST
 * BUILT ON IT.** The injected spawn writes its own `-o` path into each board it
 * writes, so the run directory is part of every candidate's BYTES - and two runs
 * in two temporary directories could therefore never be compared byte for byte
 * without excluding a path, which is the one thing `V6` must not do. Holding the
 * directory equal makes it an input held equal rather than a field excluded. The
 * price, said plainly: nothing built on this proves the pipeline is INSENSITIVE
 * to its run directory. That no path reached the canonical block is checked by
 * the manifest test's `not.toContain(runDir)`.
 *
 * **EMPTYING IT IS WHAT STOPS A STALE PASS**: no byte of one run survives into
 * the next, so a reproduction cannot be satisfied by the previous run's file.
 * `Bundle.candidateBytes` is read before the next run wipes it, and the
 * directory is recreated because `searchInput` writes into one it expects to
 * exist.
 */
export function oneRun(runDir: string, spec: RunSpec): Bundle {
  fs.rmSync(runDir, { recursive: true, force: true })
  fs.mkdirSync(runDir, { recursive: true })
  return runSearch({ ...spec, runDir })
}

/** The two runs a comparison needs, in order, through the one directory. */
export function twoRuns(
  runDir: string,
  first: RunSpec,
  second: RunSpec,
): readonly [Bundle, Bundle] {
  return [oneRun(runDir, first), oneRun(runDir, second)]
}

/**
 * The cap the seeded-arm runs below are bounded by.
 *
 * FIVE, AND THE ARM IS THE SUBJECT RATHER THAN THE CLIMB: the arm emits its
 * whole draw before the first evaluation whatever the cap is, so one climb runs
 * and one start is produced, which is what these compare.
 */
const ARM_CAP = 5

/**
 * One run of the `random` arm at `seed`, and the gestures its draw produced:
 * the arm's read of the imported board through to the autofill that paints the
 * start its climb then evaluates.
 *
 * **THIS IS THE ONLY PLACE A DRAW HAPPENS AT ALL, AND THAT IS WHY IT EXISTS.**
 * Everything else in this file runs the `import` arm, which has exactly one
 * start and does not consult the seed - so a `seededPrng` seeded from the clock
 * would leave every comparison in `./determinism.test.ts` passing. The control
 * arm draws a position and a quarter-turn count per part, and its gestures are
 * what that nondeterminism would move. It takes `./search-fixtures.ts`'s
 * low-boost world because the seeded arms only work against the real capture -
 * that file states the reason at length - and the climb that follows sweeps the
 * reduced two-part board, bounded by `ARM_CAP`.
 */
export function seededArmDraw(runDir: string, seed: number): readonly (readonly string[])[] {
  fs.rmSync(runDir, { recursive: true, force: true })
  fs.mkdirSync(runDir, { recursive: true })
  const base = lowBoostSearchInput(runDir, "random")
  const spawned: string[][] = []
  search(
    { ...base, rules: { ...base.rules, seeds: [seed], evaluationCap: ARM_CAP } },
    recordingLowBoostSpawn(spawned),
  )
  const sequences = startSequences(spawned, IMPORTED_BOARD)
  const only = sequences[0]
  if (sequences.length !== 1 || only === undefined) {
    throw new Error(
      `seededArmDraw: this run produced ${sequences.length} start sequence(s) and exactly one ` +
        `was expected, because a cap of ${ARM_CAP} is spent by the first climb and no restart ` +
        "is begun. It is NOT defaulted to the first of several: a comparison over the wrong " +
        "sequence would compare two runs' different climbs and could pass either way. Check " +
        "ARM_CAP against the seed list this was handed.",
    )
  }
  return only
}

/** The evaluations the run spent, summed over its climbs as `Q5`'s counter is. */
export function evaluationsOf(result: RunResult): number {
  return result.climbs.reduce((total, climb) => total + climb.evaluations, 0)
}

/**
 * The stopping-rule counters, built here from the `RunResult`.
 *
 * **NO MODULE BUILDS ONE YET AND THAT IS WHY THIS EXISTS.**
 * `tools/stripboard/stop-model.ts`'s own refusal names the source - *"build the
 * StopState from search()'s RunResult in tools/stripboard/search.ts"* - and
 * Task 22 is where the runner does it. When it does, this helper calls that one
 * instead: two readings of one state is exactly the drift this repository keeps
 * catching.
 *
 * **`Q6` CANNOT FIRE AGAINST IT.** `signatures` is a run-level sequence nothing
 * in `RunResult` carries, so none is recorded and a `Q6` run's reproduction is
 * covered by nothing built on this file.
 */
export function stopStateOf(bundle: Bundle): StopState {
  const climbs = bundle.result.climbs
  const last = climbs.at(-1)
  if (last === undefined) {
    throw new Error(
      "stopStateOf: this run reports no climb at all, so there is no round whose accepted count " +
        "Q3 could read and no climb history for Q4. It is NOT defaulted to an empty state: a " +
        "stopping rule evaluated against counters nobody measured is the shape Task 16's " +
        "requireMeasured refuses. tools/stripboard/search.ts throws before returning such a " +
        "run, so reaching here means a RunResult was built by hand.",
    )
  }
  return {
    climbHistory: climbs.map((climb) => climb.best.score.objective),
    climbEvaluations: climbs.map((climb) => climb.evaluations),
    runEvaluations: evaluationsOf(bundle.result),
    seedsRemaining: bundle.seeds.length - climbs.length,
    signatures: [],
    acceptedThisRound: last.acceptedPerRound.at(-1) ?? 0,
    // BOARD is not low-boost, so A4 is vacuous and this is not read.
    frozen: undefined,
  }
}

/**
 * `A_occ` off the candidate's own ranking tuple, with the tuple's shape checked
 * rather than assumed.
 *
 * `Evaluation` carries no dump, so `occupiedArea(dump)` cannot be called here -
 * the figure reaches this file as the fourth position of the tuple
 * `tools/stripboard/rank.ts`'s `rankingTuple` built. The first three positions
 * ARE the score's three line counts, so holding them against the score proves
 * this tuple is that tuple: an index read off a reordered tuple would otherwise
 * put wirelength in the manifest under `A_occ`'s name and pass.
 *
 * **THE TWO CONSTANTS COME FROM `rank.ts` AND USED TO BE DECLARED HERE.**
 * `tools/stripboard/place.ts` reads the same position for the same reason, and
 * one index into one tuple with two owners is one owner too many - so the pair
 * moved to the module that builds the tuple and this file imports them.
 */
function occupiedAreaOf(result: RunResult): number {
  const best = result.best
  const ranking = best.ranking
  const expected = [best.score.cuts, best.score.wires, best.score.solder]
  const leading = ranking.slice(0, expected.length)
  if (ranking.length !== RANKING_POSITIONS || leading.join(",") !== expected.join(",")) {
    throw new Error(
      `occupiedAreaOf: this candidate's ranking tuple is [${ranking.join(", ")}], whose first ` +
        `three positions are not this candidate's C, W and B (${expected.join(", ")}) or whose ` +
        `length is not ${RANKING_POSITIONS}. A_occ is read from position ${A_OCC_POSITION} of ` +
        "tools/stripboard/rank.ts's rankingTuple, and that index is only A_occ while the tuple " +
        "is the declared one. It is NOT defaulted and the area is NOT recomputed from a dump: " +
        "Evaluation carries none, and a figure this file derived for itself would be a second " +
        "reading of OBJ3's term. Reorder RANKING deliberately and fix A_OCC_POSITION beside it.",
    )
  }
  const area = ranking[A_OCC_POSITION]
  if (area === undefined) {
    throw new Error(
      "occupiedAreaOf: the ranking tuple has no fourth position, after the length check above.",
    )
  }
  return area
}

/** Every `HC1`-`HC10` verdict, keyed by id, with the ten checked for. */
function constraintsOf(result: RunResult): Readonly<Record<string, boolean>> {
  const held: Record<string, boolean> = {}
  for (const entry of result.best.results) held[entry.id] = entry.held
  const missing = CONSTRAINT_IDS.filter((id) => !(id in held))
  if (missing.length > 0) {
    throw new Error(
      `constraintsOf: this candidate reports no verdict for ${missing.join(", ")}, so the ` +
        "canonical metrics would carry fewer than the ten hard constraints and a comparison " +
        "over them would pass over the missing ones. V6 enumerates every HC1-HC10 pass/fail as " +
        "part of the identity that must reproduce. It is NOT defaulted to false, which would " +
        "record a constraint as broken that nobody graded; grade the candidate through " +
        "tools/stripboard/constraints.ts, which returns all ten.",
    )
  }
  return held
}

/** The rule `evaluateStop` returned for this run, refusing the `null` it also returns. */
export function stoppingRuleOf(bundle: Bundle): StoppingRule {
  const rule = evaluateStop(stopStateOf(bundle), bundle.result.best, bundle.targets, bundle.rules)
  if (rule === null) {
    throw new Error(
      "stoppingRuleOf: no stopping rule fired for this run, so it has no stopping rule, no " +
        "bound and no reported outcome to reproduce. It is NOT defaulted to Q5 or to any other " +
        "rule: the bound is generated from the rule that fired (REP1/REP3), and naming one that " +
        "did not would put a stopping reason in the record that nothing measured. These fixtures " +
        "stop on Q5 (the cap) or Q3 (a stalled round with the seed list spent); a run reaching " +
        "here is a run neither fired on, which is the fault to report.",
    )
  }
  return rule
}

/**
 * The enumerated canonical metrics of one run.
 *
 * The stopping rule, the bound and the outcome are produced by the modules that
 * own them - `evaluateStop`, `boundFor`, `admissible`/`outcomeOf` - and are not
 * restated here, so a run whose counters moved shows up in this object rather
 * than being recomputed into agreement with itself.
 */
export function canonicalMetricsOf(bundle: Bundle): CanonicalMetrics {
  const best = bundle.result.best
  const rule = stoppingRuleOf(bundle)
  const verdict = admissible({
    results: best.results,
    score: best.score,
    targets: bundle.targets,
    rules: bundle.rules,
    initialObjective: bundle.result.climbs[0]?.best.score.objective,
    frozen: undefined,
    binding: undefined,
  })
  return {
    cuts: best.score.cuts,
    wires: best.score.wires,
    solder: best.score.solder,
    objective: best.score.objective,
    netCount: best.score.netCount,
    joins: best.score.joins,
    occupied: best.score.occupied,
    clustering: best.score.clustering,
    occupiedArea: occupiedAreaOf(bundle.result),
    constraints: constraintsOf(bundle.result),
    ranking: best.ranking,
    stoppingRule: rule,
    bound: boundFor(rule),
    outcome: outcomeOf(verdict),
    restartBoundaries: bundle.result.restartBoundaries,
  }
}

/**
 * The canonical inputs of one run: the candidate's content hash and the seed
 * schedule from the run, every other identifier from `./run-dir-fixtures.ts`'s
 * `INPUTS`.
 *
 * **THE BORROWED SEVEN ARE BORROWED DELIBERATELY.** `canonicalHash` refuses a
 * blank commit or file hash, and what two runs of `search` can differ in is the
 * candidate, the metrics and the seed list - never the commit VeroRoute was
 * built from. `seed` is `seeds[0]` because `RunResult` does not record which
 * climb produced the best candidate, and nothing here discriminates on it.
 */
export function canonicalInputsOf(bundle: Bundle): CanonicalInputs {
  const seed = bundle.seeds[0]
  if (seed === undefined) {
    throw new Error(
      "canonicalInputsOf: this run carries an empty seed list, which tools/stripboard/search.ts " +
        "refuses before it climbs anything - so there is no restart schedule to record. It is " +
        "not defaulted to zero: a hash recording a seed the run never took would reproduce " +
        "across two different schedules.",
    )
  }
  return {
    ...INPUTS,
    candidateSha256: createHash("sha256").update(bundle.candidateBytes).digest("hex"),
    seeds: bundle.seeds,
    seed,
    seedArm: "import",
  }
}

/** The run's canonical hash, over its inputs and its metrics and nothing else. */
export function hashOf(bundle: Bundle): string {
  return canonicalHash(canonicalInputsOf(bundle), canonicalMetricsOf(bundle))
}

/**
 * The manifest a run would leave behind: the canonical block, and the provenance
 * this file measured.
 *
 * The stamp carries the start time and the run directory's basename - a
 * temporary path, and therefore one string that must not appear in the canonical
 * block. The test file asserts exactly that.
 */
export function manifestOf(bundle: Bundle): RunManifest {
  const inputs = canonicalInputsOf(bundle)
  const metrics = canonicalMetricsOf(bundle)
  return {
    canonical: { inputs, metrics, hash: canonicalHash(inputs, metrics) },
    provenance: {
      stamp: `${bundle.startedAt}-${path.basename(bundle.runDir)}`,
      startedAt: bundle.startedAt,
      durationMs: bundle.durationMs,
      host: os.hostname(),
      msPerInvocation: bundle.durationMs / bundle.invocations,
      evaluations: evaluationsOf(bundle.result),
    },
  }
}

/** The best candidate's path WITHIN the run: which climb, round and move produced it. */
export function candidateWithinRun(bundle: Bundle): string {
  return path.relative(bundle.runDir, bundle.result.best.candidate)
}
