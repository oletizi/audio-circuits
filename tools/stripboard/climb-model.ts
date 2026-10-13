/**
 * THE CLIMB'S VOCABULARY: what one climb is handed, what it reports, and the one
 * refusal it catches.
 *
 * **SPLIT FROM `./climb.ts` FOR THE 500-LINE CEILING, AT THE SAME SEAM THIS
 * DIRECTORY SPLITS EVERYWHERE ELSE**: this one answers *what IS a climb's input
 * and result* and that one answers *what does a climb do*. The same division as
 * `./moves-model.ts` / `./moves.ts`, `./constraints-model.ts` /
 * `./constraints.ts`, `./stop-model.ts` / `./stop.ts` and `./report-model.ts` /
 * `./report.ts`. `./climb.ts` stays the module the plan names and re-exports all
 * of this, so no consumer imports this file directly and the plan's declared
 * interface is unchanged.
 *
 * **EVERY CLAIM ABOUT WHY A CLIMB IS SHAPED AS IT IS LIVES IN `./climb.ts`'s
 * MODULE COMMENT** - the acceptance rule's two departures, the incumbent and the
 * best being two records, one history entry per evaluation, and the invocations
 * a candidate costs. One place, not two.
 */
import type { Stock } from "./constraints-model.ts"
import type { ReferenceNets } from "./equivalence.ts"
import type { Occupancy } from "./seed-geometry.ts"
import type { StripboardRules } from "./rules.ts"
import type { SeedStart } from "./seed.ts"
import type { BoardTargets } from "./targets.ts"
import type { Evaluation } from "./climb-evaluate.ts"


/**
 * The one refusal `climb` catches, matched by the NAME `./score.ts` gives it.
 *
 * `./score.ts` builds every refusal as the member of its own `ScoreRefusal`
 * union followed by a colon, so this prefix is that member rather than a phrase
 * from the prose - and a catch broad enough to swallow a fork failure or a
 * geometry refusal would turn a defect into a skipped candidate, which is the
 * shape this pipeline is built against.
 *
 * **EXPORTED BECAUSE A SECOND SWEEP CATCHES THE SAME ONE.**
 * `./complete.ts`'s completion pass evaluates candidates the same four
 * invocations deep and meets the same refusal - a wire that shorts two nets
 * leaves `CUT_STATE UNRESOLVED` - and a second copy of this string would be a
 * literal that silently stopped matching if `./score.ts`'s union member were
 * renamed.
 */
export const UNSCOREABLE = "score-cuts-not-computed"

/**
 * What one climb needs. `batch` is REQUIRED with no default: Task 9's
 * `--move-batch` buys breadth and not correctness, and a flag that defaulted
 * would make an enabler read as a prerequisite in the one place a reader looks.
 */
export interface ClimbInput {
  /** Every scratch board, ops file and painted board this climb writes lands here. */
  readonly runDir: string
  readonly netlist: string
  readonly targets: BoardTargets
  readonly reference: ReferenceNets
  readonly footprints: ReadonlyMap<string, string>
  readonly stock: Stock
  readonly rules: StripboardRules
  /** Whether a candidate's gesture goes through `--move-batch` or its own verb. */
  readonly batch: boolean
  /**
   * The PART GEOMETRY of the starting board, handed over rather than derived.
   *
   * **REQUIRED, WITH NO DEFAULT, AND THIS MODULE READS NO GEOMETRY OFF A DUMP.**
   * A dump reports no column extent for a part facing `N` or `S` (COST §7.3
   * item 2), so deriving the geometry refuses a board an arm has turned a part
   * on - and all three starting arms turn parts. `seedCandidate` returns this
   * beside the board for exactly that reason (`SeedStart`). A caller starting
   * from a board nobody has turned may read its own and owns that refusal
   * itself; defaulting here would put the refusal back in the one place the
   * handover exists to remove it from.
   */
  readonly occupancy: Occupancy
}

/**
 * One climb's counters. **`history` is one entry per evaluation** - see the
 * module comment, and Task 16's `evaluationsToCross`, which refuses a run where
 * that is not true.
 */
export interface ClimbResult {
  /**
   * The best candidate this climb SAW, by `strictlyBetter` - not the board it
   * finished standing on.
   *
   * The two are the same board under the committed rules, where every
   * acceptance improves on the incumbent. They come apart when `E3`'s bound is
   * configured, and then this is the one that may be reported: a run that named
   * its walk position would report a board worse than one it had found.
   */
  readonly best: Evaluation
  /**
   * The same board as `best`, as the UNPAINTED file and the part geometry that
   * goes with it - the handover a FURTHER STAGE needs and `best` cannot give.
   *
   * **IT IS THE SAME SHAPE AND THE SAME CONTRACT AS `./seed.ts`'s `SeedStart`,
   * which is what hands a start INTO this climb**, and the two reasons that
   * contract exists are both live here. The board is unpainted because a
   * painted one refuses the next gesture: `--move` will not relocate a part
   * over its own current footprint once `AutoFillVero` has painted copper into
   * the holes it is about to vacate (`Measured.source` carries the
   * measurement). And the occupancy travels with it because `occupancyOf`
   * cannot read a board a part has been turned on, so a later stage that
   * re-derived the geometry would refuse exactly the boards this search
   * produces - measured: `occupancyOf` refuses all ten best boards of the first
   * completeness sweep, on `C18` facing `N` or `S`.
   *
   * `./complete.ts` is the consumer. Without this field the completion pass
   * could only be run by re-deriving a geometry that cannot be derived.
   */
  readonly bestStart: SeedStart
  readonly rounds: number
  readonly evaluations: number
  /** How many moves each round accepted. `acceptedPerRound.length === rounds`. */
  readonly acceptedPerRound: readonly number[]
  /** Every evaluation's `F`, in the order the candidates were evaluated. */
  readonly history: readonly number[]
  /**
   * How many candidates could not be SCORED at all, and the first one's refusal.
   *
   * **A CANDIDATE WHOSE CUT LIST CANNOT BE COMPUTED IS REJECTED AND COUNTED,
   * NOT A RUN-STOPPING REFUSAL - A DELIBERATE CHANGE WITH A MEASUREMENT BEHIND
   * IT.** `add-wire` produces one: a wire bridging two strips on a packed board
   * routinely shorts two different nets, and `AutoFillVero` then reports
   * `CUT_STATE UNRESOLVED` with `CUT_CONFLICT` lines instead of a cut
   * arrangement. Measured on the constructed arm at seed 3 of the import-placed
   * low-boost board: `Wire1` from `5,3` to `6,3` produced
   * `CUT_CONFLICT 5,2,9 5,4,11` and `CUT_CONFLICT 6,2,8 6,4,14`, and re-running
   * `--author --op autofill` leaves it unresolved every time.
   *
   * `./score.ts` refuses such a board and is RIGHT to - *"scoring it anyway
   * would price a board at zero cuts and rank it first"* - but a refusal that
   * stops the run makes `add-wire` unusable on any real board, which is the
   * capability the move set exists to have. So the candidate is rejected, for
   * the same reason an unscoreable board cannot be compared with anything, and
   * **the count is reported rather than swallowed**: these are not evaluations,
   * they are candidates the pipeline could not evaluate, and a reader seeing a
   * large number here is looking at a search spending its budget on shorts.
   *
   * `evaluations` and `history.length` still count only SCORED candidates,
   * which is what Task 16's `evaluationsToCross` requires of them.
   */
  readonly unscoreable: number
  readonly firstUnscoreable: string | null
}
