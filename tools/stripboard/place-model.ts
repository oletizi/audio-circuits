/**
 * What a `place` run is asked for and what it hands back, and the refusals the
 * asking can raise.
 *
 * THE AUTHORITY is the plan's Task 23. Where this module and that document
 * differ the document wins and this comment is the defect.
 *
 * **IT IS A SEPARATE FILE FROM `./place.ts` FOR THE 500-LINE CEILING, AT THE
 * SEAM BETWEEN WHAT A RUN IS AND WHAT RUNNING ONE DOES** - the division
 * `./stop-model.ts` / `./stop.ts` and `./climb-model.ts` / `./climb.ts` already
 * use twice. Nothing here spawns, reads a board or imports the search.
 *
 * **THERE ARE TWO TARGETS AND NO DEFAULT BETWEEN THEM.** A run is against a
 * declared board under `boards/` or against the FROZEN fixture, and the two are
 * separate members of a union rather than one optional field, because `A4`
 * reads differently on low-boost's two boards and CRITERIA requires that *"a
 * run states which board it ran and therefore which clause it met"*. A run that
 * could leave both unset would be a run that picked one, which is the specific
 * error `V3` exists to prevent.
 */
import type { Evaluation } from "./climb.ts"
import type { Outcome, SeedSweepRecord } from "./report-model.ts"
import type { RunManifest } from "./run-dir.ts"
import type { RunResult } from "./search.ts"
import type { SeedArm } from "./seed.ts"
import type { StoppingRule } from "./stop-model.ts"
import type { StripboardRules } from "./rules.ts"
import type { BoardTargets } from "./targets.ts"

/** A run against a declared board: the directory holding its `perfboard.json`. */
export interface PlaceBoardTarget {
  readonly board: string
  readonly frozen?: undefined
  readonly netlist?: undefined
}

/**
 * A run against the FROZEN fixture: the hand layout's own `.vrt`, and the
 * export of the model it was built against.
 *
 * **THE `.vrt` IS NAMED AND NEVER STARTED FROM.** `B1-frozen` is stated
 * *"starting from the import-placed board"*, so the hand layout is not a seed
 * and not a spawn argument - `./place.ts` reads the committed `.dump` and
 * `.footprints.json` beside it for the two facts the export cannot carry (the
 * board's own dimensions and its footprints) and passes the path to nothing.
 * Seeding from the owner's layout would be reproducing his result by copying
 * it.
 */
export interface PlaceFrozenTarget {
  readonly frozen: string
  readonly netlist: string
  readonly board?: undefined
}

/** One run's inputs. `arm` is required and has no default (Task 16). */
export type PlaceInput = (PlaceBoardTarget | PlaceFrozenTarget) & {
  readonly rules: StripboardRules
  readonly arm: SeedArm
  /**
   * The run directory's name under `build/stripboard/<board>/`.
   *
   * PROVENANCE ONLY, and the one place this pipeline reads a clock: absent, it
   * is the wall-clock instant the run started, which is what
   * `ExecutionProvenance.stamp` records. Nothing about the search, the
   * schedule or the canonical hash reads it (`V6`), and a caller that wants two
   * runs in one directory tree passes its own.
   */
  readonly stamp?: string
}

/**
 * One run: the search's own result, the rule that stopped it, what it was
 * graded against, and where it wrote.
 *
 * `best` IS `search.best` AND IS THE SAME OBJECT, assigned from it in one
 * statement in `./place.ts` - the convenience a consumer reads (`run.best.score`)
 * beside the whole result the report needs. It is not a second candidate and
 * cannot become one.
 */
export interface PlaceRun {
  readonly search: RunResult
  readonly best: Evaluation
  readonly rule: StoppingRule
  readonly targets: BoardTargets
  readonly rules: StripboardRules
  /** Which of low-boost's two boards was run, `undefined` off that board. */
  readonly frozen: boolean | undefined
  /** `build/stripboard/<board>/<stamp>/`: every byte this run wrote. */
  readonly runDir: string
  readonly manifest: RunManifest
  /** `outcomeOf(verdictOf(...))` for this run's own candidate - the report's, not a second grading. */
  readonly outcome: Outcome
  /** Whether this run's candidate met the `A4` clause of the board it states it ran. */
  readonly metClause: boolean
  /**
   * `C_necessary` for `best`: how many of its `CUT ` lines the drop test could
   * not remove (`tools/stripboard/cut-necessity.ts`).
   *
   * **ONE DROP TEST PER RUN, ON THE REPORTED CANDIDATE, AND THAT IS THE POINT
   * OF IT BEING HERE RATHER THAN ON THE `Score`.** `F` charged this count for
   * four commits and the scorer derived it per candidate, which cost a measured
   * 17-57% of a run's wall clock for a figure that never once differed from
   * `Score.cuts` over 2,267 scored candidates. `F` charges the reported count
   * again; this field is the owner's "option C" reporting half, which he chose
   * so a divergence would be visible, and `./report.ts` prints both counts from
   * it.
   */
  readonly necessaryCuts: number
}

/**
 * The seed set's runs: one per seed of `rules.seeds`, and the two outcome
 * fields that keep the rate a diagnostic.
 *
 * **`singleRunVerdict` AND `reportedOutcome` ARE TWO FIELDS OF ONE TYPE ON
 * PURPOSE.** The plan: *"so the test above can assert they are equal and a
 * future change that derived the reported outcome from the rate would fail
 * rather than pass quietly."* Both are the FIRST seed's - the run `B1-frozen`
 * is judged on.
 */
export interface SeedSweep extends SeedSweepRecord {
  readonly singleRunVerdict: Outcome
  /** The first seed's run, whole, so the report it carries is that run's report. */
  readonly first: PlaceRun
}

/** The refusals `./place.ts` raises. One arm each in `notDefaultedBecause`. */
export type PlaceRefusal =
  | "place-target-unstated"
  | "place-frozen-companion-missing"
  | "place-frozen-board-unnamed"
  | "place-footprints-malformed"
  | "place-import-failed"
  | "place-best-dump-failed"
  | "place-no-stop"
  | "place-ranking-shape"
  | "place-built-commit-unknown"

export function notDefaultedBecause(refusal: PlaceRefusal): string {
  switch (refusal) {
    case "place-target-unstated":
      return (
        "A run is against a declared board or against the frozen fixture, and this one named " +
        "neither or both. It is NOT defaulted to either: A4 reads differently on low-boost's " +
        "two boards - the frozen fixture meets B1-frozen, the scaffolded board meets " +
        "B1-current - and CRITERIA requires a run STATE which it ran. Reporting B1-frozen " +
        "satisfied on a run against the scaffolded board is the specific error A4 and V3 exist " +
        "to prevent. Pass either { board } or { frozen, netlist }."
      )
    case "place-frozen-companion-missing":
      return (
        "The frozen run reads two files BESIDE the fixture .vrt that the EESchema v1.1 export " +
        "cannot carry: the committed --dump-board capture, for the board's own dimensions (the " +
        "GRID line is the authority for them and no test or module restates it), and the " +
        "designator-to-footprint map, because HC4, HC5, HC9 and HC10 are keyed by the footprint " +
        "and v1.1 has no footprint field at all. It is NOT defaulted to today's model, which is " +
        "a 14-net circuit: tests/fixtures/stripboard/provenance.txt forbids it in those words, " +
        "because grading a 9-net hand layout against it would restate the benchmark. Both files " +
        "are committed beside the .vrt; restore the missing one."
      )
    case "place-frozen-board-unnamed":
      return (
        "The frozen fixture's file name must begin with the board A4's frozen clause is about, " +
        "because that is the name the run reports and the name the verdict matches. It is NOT " +
        "defaulted to the fixture's own basename: a fixture for another board, run under " +
        "low-boost's name, would be graded against the owner's hand-layout benchmark for a " +
        "board he never laid out. Check LOW_BOOST_BOARD in tools/stripboard/verdict.ts and the " +
        "fixture's name against each other."
      )
    case "place-footprints-malformed":
      return (
        "The frozen footprint map is a JSON object of designator -> KiCad footprint string, as " +
        "tests/fixtures/stripboard/pultec-low-boost-frozen.footprints.json holds it. It is NOT " +
        "defaulted to an empty map: an empty map makes every placed part footprintless, which " +
        "footprintOf refuses for anything but a one-hole pad - so the run would refuse anyway, " +
        "with a message about a part instead of about this file."
      )
    case "place-import-failed":
      return (
        "Every arm begins from the board `--import` placed (B1-frozen's own clause), so a " +
        "failed import leaves nothing to start from. It is NOT defaulted to the committed " +
        "layout: that board is a hand-laid artifact on the frozen fixture and a previous run's " +
        "output on a declared board, and starting from either would be reporting a result the " +
        "run did not produce."
      )
    case "place-best-dump-failed":
      return (
        "The report prints VeroRoute's cut count beside the drop test's (the owner's \"option " +
        "C\"), and the drop test works on dump TEXT - so the reported candidate is dumped once " +
        "more at the end of the run, off the painted board the climb already wrote. A failed " +
        "dump means that file is gone or unreadable, which also makes the candidateSha256 in " +
        "run.json a hash of nothing. It is NOT defaulted to the reported count, and no cuts: " +
        "line is omitted: a report printing the two counts as equal because nobody measured " +
        "one of them is the divergence he kept both figures in order to spot, hidden. Check " +
        "that Evaluation.candidate still names a file under the run directory."
      )
    case "place-no-stop":
      return (
        "evaluateStop returned null, which means the run ended while every stopping rule said " +
        "it could continue - Q3 did not fire although the seed list is spent, or Q5 did not " +
        "although the cap is. That is a WIRING DEFECT between the search's bookkeeping and the " +
        "stop's counters, which is exactly what the plan's CHECKPOINT 2 exists to catch, and it " +
        "is NOT defaulted to a rule: a bound naming a rule the search did not reach is the " +
        "third of CHECKPOINT 2's three defects and the one that looks like success. Read the " +
        "StopState this run built in tools/stripboard/place.ts against tools/stripboard/stop.ts."
      )
    case "place-ranking-shape":
      return (
        "A_occ is read off the candidate's ranking tuple by index (rank.ts's A_OCC_POSITION), " +
        "because an Evaluation carries no dump to measure it from, and the first three " +
        "positions ARE the score's three line counts - so a tuple whose head disagrees with " +
        "the score is not the tuple rankingTuple built. It is NOT defaulted to the position " +
        "anyway: that would write wirelength into run.json under A_occ's name, in the one block " +
        "Task 24's gate compares two runs by. Reorder RANKING deliberately and fix " +
        "A_OCC_POSITION beside it."
      )
    case "place-built-commit-unknown":
      return (
        "run.json's canonical inputs record which binary ACTUALLY RAN, and " +
        "tools/perfboard/acquire.ts's builtCommit() returns undefined for a build it cannot " +
        "identify. An unknown build is never the pinned commit - that is acquire.ts's own rule " +
        "- and run-dir.ts refuses a blank or sentinel value for the same reason, so there is no " +
        "spelling of 'unknown' this run may record. Rebuild the fork through the veroroute " +
        "verb, which writes the stamp."
      )
  }
}

export function refuse(refusal: PlaceRefusal, offending: string): never {
  throw new Error(
    `${refusal}: ${offending}. ${notDefaultedBecause(refusal)} ` +
      "(The plan's Task 23 is the authority, and tools/stripboard/place.ts is the only " +
      "implementation of the place verb's run.)",
  )
}
