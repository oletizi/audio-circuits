/**
 * The SEED-SET SWEEP's lines: what the reviewed seed list says about the
 * pipeline, as against what one run says about one board.
 *
 * THE AUTHORITY is the plan's Task 23, which states the three constraints this
 * file exists to keep: *"it is not an acceptance threshold and no number is
 * attached to it"*, *"the seed set is `stripboard/rules.json`'s `seeds`"*, and
 * *"it is reported whether it is flattering or not ... so a one-in-eight result
 * reads as one in eight"*. Where this module and that document differ the
 * document wins and this comment is the defect.
 *
 * **IT IS A SEPARATE FILE FROM `./report.ts` FOR THE 500-LINE CEILING, AT THE
 * SEAM BETWEEN A VERDICT AND A DIAGNOSTIC.** `./report.ts` renders the three
 * things a run is judged by - the outcome, the bound and the exit code - and
 * computes all three before it reaches this file; nothing here is read by any
 * of them. The split is also what makes that reading checkable rather than
 * promised: this module imports no verdict, no stop and no search, so there is
 * no path by which a rate could reach one.
 *
 * **IT TAKES THE BOARD AND THE `frozen` FLAG, NOT A `ReportInput`**, which
 * keeps `./report.ts` the only module that knows what a report is rendered
 * from - and keeps the import one-way, so the two files cannot grow a cycle.
 */
import type { BoundStatus, Outcome } from "./report-model.ts"

/**
 * One seed's run, as the seed-set sweep records it, and the whole sweep.
 *
 * **IT IS A DIAGNOSTIC AND THE TYPE IS WHERE THAT IS ENFORCED.** Task 23's
 * criterion is ONE run - *"`B1-frozen` says the pipeline must reach `C <= 5`
 * with `W = 0`; that is the criterion and it is met or not by a run"* - and the
 * sweep answers the different question *"on how many of the reviewed seeds"*.
 * So `reportedOutcome` is carried here beside the per-seed rows and **is the
 * first seed's own verdict rather than anything computed from `reached`**:
 * `tools/stripboard/place.ts` sets it from that run and nothing else, and a
 * change that derived it from the rate would fail the test that holds
 * `reportedOutcome` against `singleRunVerdict` instead of passing quietly. No
 * number is attached to `reached` anywhere - *"a success rate with a bar on it"*
 * is exactly the acceptance criterion the producing agent may not author.
 *
 * It lives in THIS module rather than beside `place.ts`'s `SeedSweep` so that
 * `./report.ts` can render it without importing the module that runs the
 * search: `SeedSweep` satisfies this shape and adds the first run itself.
 *
 * **IT MOVED HERE FROM `./report-model.ts` AND THE REASON IS THE CEILING, NOT A
 * RETHINK.** That module reached 501 lines when `outcomeExitCode` arrived, and
 * of everything in it these two types are the ones whose own module already
 * existed: this file is the sweep's renderer and was importing them back out of
 * the vocabulary module. The import is now one-way the other way round -
 * `./report.ts` re-exports them from here, as it always did from there, so no
 * consumer's import path changed - and nothing here imports a verdict, a stop
 * or a search, which is the property the split is for.
 */
export interface SeedRunRecord {
  readonly seed: number
  readonly cuts: number
  readonly wires: number
  readonly bound: BoundStatus
  readonly outcome: Outcome
}

export interface SeedSweepRecord {
  /** One row per seed of `rules.seeds`, in that list's order. */
  readonly perSeed: readonly SeedRunRecord[]
  /** How many seeds met the `A4` clause of the board that was run. Nothing but the report reads it. */
  readonly reached: number
  /** What the report prints: the FIRST seed's verdict, never a function of `reached`. */
  readonly reportedOutcome: Outcome
}

/**
 * Which `A4` clause the seeds were counted against, named by the board the run
 * states it ran.
 *
 * **NEVER BOTH, AND NEVER THE FROZEN ONE ON A SCAFFOLDED RUN** (`V3`): `A4`
 * reads differently on low-boost's two boards, and a sweep line naming
 * `B1-frozen` in a scaffolded run's report would read as the owner's own
 * benchmark having been measured. `undefined` is the case `./verdict.ts` allows
 * only off low-boost, where `A4` is vacuous - and a count against a vacuous
 * condition is said to be exactly that rather than printed as a result.
 */
export function clauseName(frozen: boolean | undefined, board: string): string {
  if (frozen === undefined) {
    return `A4, which is vacuous on ${board} and decides nothing there`
  }
  return frozen
    ? "B1-frozen's clause (A4: at most five cuts, no wire bridges, every net complete)"
    : "B1-current's clause (A4)"
}

/**
 * The sweep: both numbers of the fraction on one line, the word DIAGNOSTIC on
 * that line, and one row per seed.
 *
 * **BOTH NUMBERS, SO A FRACTION CANNOT BE READ AS A BARE PERCENTAGE.** The rows
 * carry each seed's `C`, `W`, bound and outcome because the rate alone cannot
 * distinguish a run that nearly made it from one that refused - and because a
 * rate quoted without its rows is a number a reader cannot go and check.
 */
export function sweepLines(
  frozen: boolean | undefined,
  board: string,
  sweep: SeedSweepRecord,
): readonly string[] {
  return [
    `seed set: ${sweep.reached} of ${sweep.perSeed.length} reviewed seed(s) met ` +
      `${clauseName(frozen, board)} - a DIAGNOSTIC, not an acceptance condition: no number is ` +
      "attached to it, and it changes no outcome, no bound and no exit code. The verdict " +
      "above is the first seed's run alone, which is the run the criterion is judged on. " +
      "WHAT THAT CLAUSE GRADED is A4's own line above, and not this count: a clause that does " +
      "not fire is met by every seed, and the count says how many met it rather than what " +
      "meeting it was worth. " +
      // THE CLAUSE IS NAMED BY `clauseName` AND NOWHERE ELSE IN THIS STRING,
      // because a sentence here mentioning the frozen clause would put the
      // words "B1-frozen" in a SCAFFOLDED run's report - the one thing V3
      // forbids, and it would be a literal rather than a verdict, so no
      // grader would catch it.
      "Which clause that is, is the line's own first half.",
    ...sweep.perSeed.map(
      (seed) =>
        `seed ${seed.seed}: C = ${seed.cuts}, W = ${seed.wires}, bound = ${seed.bound}, ` +
        `outcome = ${seed.outcome}`,
    ),
  ]
}
