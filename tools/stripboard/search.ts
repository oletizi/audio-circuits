/**
 * `E2`: THE RUN - one climb per seed, each from a start the run's OWN arm
 * produced, keeping the best candidate across all of them.
 *
 * THE AUTHORITY is `docs/superpowers/specs/
 * 2026-10-10-stripboard-pipeline-design.md` §7.4's `E2` row - *"a restart takes
 * a different low-bandwidth ordering and climbs again, keeping the best
 * candidate across all climbs"* - and the reproducibility clauses under it.
 * Where this module and that document differ the document wins and this comment
 * is the defect.
 *
 * **IT IS A SEPARATE FILE FROM `./climb.ts` FOR THE 500-LINE CEILING, AT THE
 * CLIMB/RESTART SEAM.** `./climb.ts` answers *what does one climb do* and this
 * one answers *how many climbs, from where, and which result*. Unlike
 * `./climb-accepts.ts` and `./climb-evaluate.ts` it is NOT re-exported from
 * `./climb.ts`: the plan names `search` as Task 18's own interface and Tasks 19
 * to 21 consume `RunResult` directly, so a consumer importing this file is
 * importing the module the plan declares.
 *
 * **EVERY RESTART RE-SEEDS THROUGH `seedCandidate` WITH THE RUN'S ARM, AND THAT
 * IS A CORRECTNESS FIX THE COMPARISON FORCED OUT.** An earlier draft of the plan
 * had `E2` call `assignStrips` directly - the constructed arm's own derivation -
 * which would have re-constructed on every restart whatever arm the run
 * selected. Every arm's restarts would then have been the constructed arm's, and
 * Task 16's comparison would have measured only the FIRST climb of each run,
 * which is precisely the question it exists to answer: whether the start matters
 * once restarts are cheap. `tests/stripboard/escapes-search.test.ts` reads the
 * arm off the spawn record for that reason.
 *
 * **THE SCHEDULE IS A FUNCTION OF THE SEED LIST AND OF NOTHING ELSE** - which
 * seeds, in which order, with which share of the cap - never of elapsed time or
 * remaining wall clock. `V6` depends on it, and the closure scan in
 * `tests/stripboard/escapes-search.test.ts` is the cheap early warning that no
 * file the search reaches names a clock, a pid or a directory listing.
 *
 * **THE EVALUATION CAP IS RUN-LEVEL AND SHARED, AND THE DIVISION IS "WHAT IS
 * LEFT".** `Q5`'s cap bounds the RUN, so a restart cannot quietly grant itself
 * another full cap; each climb is handed the remainder and a run whose cap is
 * spent starts no further climb. That shortfall is visible rather than silent:
 * `climbs.length` is then less than the seed list's length and the evaluations
 * sum to the cap. `Q5` reporting is Task 19's, and this is the bookkeeping it
 * reads.
 *
 * **`Q3` IS A RESTART TRIGGER BEFORE IT IS A STOP.** A round with no accepted
 * move ends THAT climb (`S3`, in `./climb.ts`); the run continues to the next
 * seed, and `Q3` fires only when the seed list is spent. Without that, the run
 * would halt at the first local optimum - which is the condition `E2` exists to
 * leave.
 */
import fs from "node:fs"
import path from "node:path"
import { strictlyBetter } from "./climb-accepts.ts"
import { climb, type ClimbResult, type Evaluation } from "./climb.ts"
import type { Stock } from "./constraints-model.ts"
import type { ReferenceNets } from "./equivalence.ts"
import type { StripboardRules } from "./rules.ts"
import { seedCandidate, type SeedArm, type SpawnVeroroute } from "./seed.ts"
import type { BoardTargets } from "./targets.ts"

/**
 * What one run needs: one climb's inputs, plus the board every arm starts from
 * and **the arm itself, which is required and has no default.**
 *
 * `./seed.ts` states the reason at length: the three arms are an experiment with
 * random as its control, and an arm selected by a fallback would be a comparison
 * whose own treatment nobody named. `SeedArm` is an enumerated union rather than
 * a bare string, so an unknown arm does not compile and `parseSeedArm` is where
 * text becomes one.
 *
 * `occupancy` is NOT here, and that is the whole shape of `E2`: a run does not
 * carry one start's geometry, it produces one start per seed, and each start's
 * geometry comes back from the arm that made it (`SeedStart`). A dump cannot
 * describe a turned part's footprint, so a run that took a single occupancy
 * would be a run with a single start.
 */
export interface SearchInput {
  /** The `--import`-placed board every arm begins from, for every restart. */
  readonly importedBoard: string
  /** Each climb gets its own directory under this one, named for its seed. */
  readonly runDir: string
  readonly netlist: string
  readonly targets: BoardTargets
  readonly reference: ReferenceNets
  readonly footprints: ReadonlyMap<string, string>
  readonly stock: Stock
  readonly rules: StripboardRules
  /** Whether a candidate's gesture goes through `--move-batch` or its own verb. */
  readonly batch: boolean
  readonly arm: SeedArm
}

/** One run: every climb's counters, the best candidate across them, and what `E3` did. */
export interface RunResult {
  /**
   * The best candidate any climb saw, by the acceptance rule's own
   * `strictlyBetter`.
   */
  readonly best: Evaluation
  /** One entry per climb, in the seed list's order. */
  readonly climbs: readonly ClimbResult[]
  /**
   * The RUN-LEVEL EVALUATION INDEX at which each climb after the first began:
   * the running total of the climbs before it.
   *
   * There are `climbs.length - 1` of them, because a boundary is a restart and
   * the first climb is not one. Task 21 compares two runs' boundaries, which is
   * what `V6` asks for beyond the final board: *"a run that lands on the same
   * board by a different path has not demonstrated the determinism the escape
   * mechanisms need."*
   */
  readonly restartBoundaries: readonly number[]
  /**
   * Whether `E3`'s bounded worse-acceptance was IN EFFECT for this run.
   *
   * **IT REPORTS THE MECHANISM, NOT A FIRING.** `true` means the rules
   * configured a bound, so the clause was live on every acceptance decision the
   * run made; it does not say a worse candidate was in fact taken, which is read
   * off the climbs' own counters. `false` means `stripboard/rules.json` left the
   * bound unset and the mechanism did not run at all - which PIPELINE E3
   * requires be STATED IN THE REPORT rather than quietly approximated, and Task
   * 20 is where it is stated.
   */
  readonly worseAcceptanceRan: boolean
}

/**
 * Run one climb per seed in `input.rules.seeds` - the reviewed list, so no
 * second seed list exists - and report the best candidate across them.
 */
export function search(input: SearchInput, spawn: SpawnVeroroute): RunResult {
  const seeds = input.rules.seeds
  if (seeds.length === 0) {
    throw new Error(
      "search: the rules carry no seeds, so there is no climb to run and no restart schedule to " +
        "derive. It is NOT defaulted to one unseeded climb: the schedule is a function of the " +
        "seed list alone (PIPELINE V6), and a run that invented a seed would be a run nothing " +
        "reproduces. tools/stripboard/rules.ts refuses an empty list when it loads one, so " +
        "reaching here means a caller built a rules object by hand.",
    )
  }
  const cap = input.rules.evaluationCap
  const climbs: ClimbResult[] = []
  const restartBoundaries: number[] = []
  let spent = 0
  let best: Evaluation | undefined

  for (const [index, seed] of seeds.entries()) {
    const remaining = cap - spent
    // THE RUN-LEVEL CAP, SPENT RATHER THAN RE-GRANTED. A climb always evaluates
    // the start it is handed, so starting one with nothing left would spend an
    // evaluation past the cap; the run stops instead and the short climbs list
    // is the record of it.
    if (remaining <= 0) break
    // ONE DIRECTORY PER CLIMB, CREATED HERE because the arm writes into it
    // before `climb` is called and `seedCandidate` creates nothing: two climbs
    // sharing a run directory would write each other's `r0-m0.vrt`.
    const runDir = path.join(input.runDir, `seed-${seed}`)
    fs.mkdirSync(runDir, { recursive: true })
    // THE RUN'S OWN ARM, EVERY TIME, and the occupancy comes back with the
    // board: `climb` reads no geometry off a dump, because a dump cannot
    // describe a turned part's footprint and all three arms turn parts.
    const start = seedCandidate(
      {
        importedBoard: input.importedBoard,
        targets: input.targets,
        runDir,
        rules: input.rules,
        arm: input.arm,
        seed,
      },
      spawn,
    )
    const result = climb(
      start.board,
      {
        runDir,
        netlist: input.netlist,
        targets: input.targets,
        reference: input.reference,
        footprints: input.footprints,
        stock: input.stock,
        rules: { ...input.rules, evaluationCap: remaining },
        batch: input.batch,
        occupancy: start.occupancy,
      },
      spawn,
    )
    if (index > 0) restartBoundaries.push(spent)
    spent += result.evaluations
    climbs.push(result)
    if (best === undefined || strictlyBetter(result.best, best)) best = result.best
  }

  if (best === undefined) {
    throw new Error(
      `search: no climb ran, with ${seeds.length} seed(s) and an evaluation cap of ${cap}, so ` +
        "there is no best candidate to report. It is NOT reported as a run at F = 0 with an " +
        "empty history - which is the one shape Task 16's requireMeasured exists to refuse, " +
        "because a success rate counted from it would be a number that came from no " +
        "measurement. A cap at or below zero is the only way here; raise it in " +
        "stripboard/rules.json, where Q5's own note says it is a backstop sized so a healthy " +
        "run never reaches it.",
    )
  }
  return {
    best,
    climbs,
    restartBoundaries,
    worseAcceptanceRan: input.rules.worseAcceptance !== null,
  }
}
