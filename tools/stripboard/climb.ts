/**
 * `P2`: the single-part hill climb, and the one place a candidate is accepted
 * or rejected.
 *
 * THE AUTHORITY is `docs/superpowers/specs/
 * 2026-10-10-stripboard-pipeline-design.md` §1257's `P2` row and
 * `docs/superpowers/specs/2026-10-10-stripboard-placement-cost-design.md` §6.1
 * and §6.4. Where this module and those documents differ the documents win and
 * this comment is the defect - **with ONE named exception, below.**
 *
 * **THE EXCEPTION: the acceptance rule is NO-REGRESSION, and the documents say
 * "reject on any hard-constraint failure".** The rule itself is
 * `./climb-accepts.ts`'s and so is the full account of the departure; it is
 * named here because a module comment asserting the documents win, beside code
 * that departs from them, is a contradiction a reader would resolve the wrong
 * way - and the resolution is NOT to revert the rule. The departure is recorded
 * in `docs/superpowers/plans/2026-10-10-stripboard-pipeline.md` under
 * *"Deviations from the specs"*.
 *
 * **ACCEPTANCE, EXACTLY, AND NOTHING ELSE:** **no regression** - a candidate
 * that breaks a hard constraint which held on the board the move was applied to
 * is rejected, whatever its `F` - then `ΔF < 0`, or `ΔF = 0` with a strictly
 * better ranking tuple, and then, only when `stripboard/rules.json` configures a
 * bound, `E3`'s bounded worse-acceptance. The committed rules leave that bound
 * unset, so no run in this repository has taken a worse candidate.
 *
 * **THE INCUMBENT AND THE BEST ARE TWO RECORDS, AND `E3` IS WHY.** The incumbent
 * is the board the next round sweeps from and what `ΔF` is measured against, and
 * under a configured bound it can get WORSE - that is the escape doing its job.
 * `ClimbResult.best` is the best candidate the climb saw, by the same
 * `strictlyBetter` the acceptance rule uses, and it only ever improves. With the
 * bound unset the two coincide, because every acceptance then improves on the
 * incumbent; a climb that reported its walk position as its result would be
 * indistinguishable until the first bound was configured, which is why they are
 * separate now rather than when E3 is first used.
 *
 * **`A1` CLASSIFIES THE RESULT, NOT THE STEP**, and `./climb-accepts.ts` carries
 * the correction that made that true, the deadlock it fixes and the CRITERIA
 * reading behind it. `ClimbResult.best.admissibleA1` is where a run says whether
 * it ended admissible, so a climb that ends inadmissible is reported as exactly
 * that rather than as a climb that found nothing.
 *
 * **`history` HAS ONE ENTRY PER EVALUATION, AND THAT IS LOAD-BEARING ACROSS
 * TASKS.** Task 16's `evaluationsToCross` reads a crossing INDEX off it and
 * refuses a run whose `history.length` disagrees with its `evaluations`,
 * because one entry per evaluation is the only thing that makes such an index
 * an evaluation count. A history per ACCEPTED MOVE would have made that figure
 * silently wrong. So every evaluation appends exactly once, including the start
 * and including a candidate that was rejected.
 *
 * **`scoreDumpText`, NOT `scoreDump`, AND THE REASON IS `V1`.** `scoreDump`
 * takes an `IndependentCount` the caller produced, and `./score.ts` names the
 * residual that leaves: *"What nothing here can prove is that `countLines` was
 * handed the same text `boardGeometry` was: a caller passing
 * `countLines(someOtherText)` whose three counts happen to match all three of
 * this dump's would pass. `scoreDumpText` closes that, because it reads the
 * text once."* This module is the FIRST production consumer of either entry
 * point, so the choice decides what `V1` rides on for the whole pipeline, and
 * it reads `--dump-board`'s stdout into ONE local `string` that both
 * `scoreDumpText` and `boardGeometry` are handed.
 *
 * **THE EVALUATION IS FOUR INVOCATIONS** - apply, autofill, check, dump -
 * which is why a candidate evaluation is order 10^1 per second at PIPELINE
 * §4.6's 11.71 ms per invocation, and why Task 9's `--move-batch` buys breadth.
 * `apply` is `./moves.ts`'s; the other three are below, in that order, because
 * an UNPAINTED board reports `CUT_STATE UNRESOLVED` and `HC2` refuses it rather
 * than mis-scoring it - so the paint comes before anything reads a cut list.
 *
 * **`--check`'S EXIT STATUS IS DATA, NOT A FAILURE.** It exits 1 on a board
 * with an incomplete net, and that exit code is `HC1`'s own input - so this
 * module refuses a non-zero `--author` or `--dump-board` and deliberately does
 * NOT refuse a non-zero `--check`. Treating the two alike would stop the run on
 * exactly the boards the search exists to repair.
 *
 * **WHAT A REAL CLIMB ACTUALLY DOES, so this comment is not the only evidence
 * about it.** On the import-placed low-boost board against the pinned fork,
 * over the reviewed seed set and the move set this file sweeps TODAY - the five
 * single-part kinds less the two deferred, plus `E1`'s net cluster: `random`
 * reaches `F` 13 to 17 in 41 to 73 rounds and 6,072 to 10,226 evaluations;
 * `constructed` 16 to 17 in 31 to 48 rounds and 3,537 to 5,755; `import` 36 in 3
 * rounds and 83 evaluations on every seed, because it has one start. All fifteen
 * runs stopped on `S3`, none reached the evaluation cap, and every one ended
 * inadmissible. **THE FIGURES THIS PARAGRAPH CARRIED BEFORE WERE THE SAME BOARD
 * WITHOUT THE CLUSTER MOVE** - 5110, 2058 and 77 evaluations at `F` 14, 17 and
 * 36 - and they are not deleted but moved: `docs/stripboard/
 * pipeline-verification.md` §5.9 is that run, §6.3 is this one, §6.4 is what the
 * cluster move did to `F` (nothing, at 8% to 62% more evaluations) and §6.5 is
 * the stretch defect the comparison found. **AND §6.6 SUPERSEDES THE FIGURES
 * ABOVE ON TWO OF THE THREE ARMS**, because the move set grew again: with the
 * GATHER, seed 0 reaches `F` 10 on `constructed` in 32 rounds and 4,150
 * evaluations and `F` 11 on `random` in 63 rounds and 9,698, while `import`
 * stays at 36 because no gather is proposable on a board packed into three rows.
 * §6.7 is the whole seed set under that move set, and **§6.8 SUPERSEDES BOTH**
 * because the gather's candidates were widened to every strip: `constructed`
 * reaches `F` 8, 8, 8, 7 and 7 in 48 to 70 rounds and 11,306 to 15,300
 * evaluations; `random` 12, 12, 12, 16 and 14 in 41 to 70 rounds and 9,423 to
 * 15,813; `import` 33 on every seed in 21 rounds and 4,086. All fifteen stopped
 * on `S3`, none reached the cap, and every one ended inadmissible. A climb is
 * three to four times the size it was before the widening, which is what §6.8
 * records as its cost.
 *
 * **THE START IS INADMISSIBLE AND THAT IS NORMAL.** `./seed.ts` records that
 * all three arms begin from a board whose nets are incomplete - 19, 13, 7 and 6
 * on mid, hi-boost, hi-cut and low-cut - so `HC1` fails on the start and will
 * keep failing until the search has repaired the circuit. The no-regression
 * rule is what lets a climb move at all from there while still refusing to
 * trade a constraint away.
 */
import fs from "node:fs"
import path from "node:path"
import { accepts, strictlyBetter } from "./climb-accepts.ts"
import type { Stock } from "./constraints-model.ts"
import type { ReferenceNets } from "./equivalence.ts"
import {
  applicableMoves,
  applyMove,
  describeMove,
  enumerateMoves,
  occupancyAfter,
  type GestureTransport,
  type Move,
} from "./moves.ts"
import type { Occupancy } from "./seed-geometry.ts"
import type { StripboardRules } from "./rules.ts"
import type { SpawnVeroroute } from "./seed.ts"
import type { BoardTargets } from "./targets.ts"
import { measure, type Evaluation, type Measured } from "./climb-evaluate.ts"

/**
 * The one refusal `climb` catches, matched by the NAME `./score.ts` gives it.
 *
 * `./score.ts` builds every refusal as the member of its own `ScoreRefusal`
 * union followed by a colon, so this prefix is that member rather than a phrase
 * from the prose - and a catch broad enough to swallow a fork failure or a
 * geometry refusal would turn a defect into a skipped candidate, which is the
 * shape this pipeline is built against.
 */
const UNSCOREABLE = "score-cuts-not-computed"

/**
 * The evaluation half, re-exported from `./climb-evaluate.ts`.
 *
 * This is the module the plan names and Tasks 18, 19 and 20 import. The split
 * is at the measure/accept seam and was forced by the 500-line ceiling;
 * `Measured` crosses it because the climb needs the dump and the unpainted
 * source board, and it is the pair's own vocabulary rather than part of the
 * plan's interface.
 */
export { evaluate, type EvaluateInput, type Evaluation, type Measured } from "./climb-evaluate.ts"

/**
 * The acceptance rule, re-exported from `./climb-accepts.ts`.
 *
 * This is the module the plan names and Tasks 18, 19 and 20 import. The split is
 * at the sweep/accept seam and was forced by the 500-line ceiling when `E3`
 * arrived; `strictlyBetter` crosses it because this module needs the same
 * definition of better for the best candidate it records as the rule uses for
 * `ΔF`, and two definitions would let a run report a best board its own rule
 * would have rejected.
 */
export {
  accepts,
  strictlyBetter,
  type AcceptanceInput,
} from "./climb-accepts.ts"

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

/**
 * Climb from `start` until a round accepts nothing (`S3`) or the run-level
 * evaluation cap is spent (`S5`).
 *
 * **A ROUND IS A FULL SWEEP OF THE MOVE SET ENUMERATED AT THE ROUND'S START,
 * EVERY MOVE APPLIED TO THE BOARD THE ROUND STARTED FROM.** That is what makes
 * it a sweep rather than a walk: a move enumerated for one board and applied to
 * a different one is a gesture nobody proposed - the part has moved, so the
 * origin the move names is no longer the origin the model checked. The best
 * candidate found becomes the next round's base, so `best` only ever improves.
 *
 * `S1` (at the floor), `S2` (within `tau` of it) and `S4`/`Q4` (yield
 * collapsed) are NOT here: they are reported by Task 19 from these counters, and
 * `tau` is `null` in the committed rules, deliberately unset. `S3` and `S5` are
 * both here because both are the loop's own business - one ends a converged
 * climb and the other bounds a looping bug.
 */
/**
 * One candidate the climb is standing on: what was measured, and the PART
 * GEOMETRY carried forward to it.
 *
 * The occupancy sits beside the measurement rather than inside `Measured`,
 * because `measure` reads a board and applies no gesture - it has no way to
 * know what the geometry became. The climb is the only thing that does.
 */
interface State {
  readonly measured: Measured
  readonly occupancy: Occupancy
}

/** Which part a part-moving move names, for the type lookup the stretch bound needs. */
function refOf(move: Move): string | undefined {
  if (move.kind === "move" || move.kind === "rotate" || move.kind === "stretch") return move.ref
  return undefined
}

export function climb(start: string, input: ClimbInput, spawn: SpawnVeroroute): ClimbResult {
  fs.mkdirSync(input.runDir, { recursive: true })
  const transport: GestureTransport = input.batch ? "batched" : "one-gesture-per-launch"
  const cap = input.rules.evaluationCap
  const history: number[] = []
  const acceptedPerRound: number[] = []
  let unscoreable = 0
  let firstUnscoreable: string | null = null

  const evaluateInto = (board: string, tag: string): Measured => {
    const measured = measure(
      board,
      {
        painted: path.join(input.runDir, `${tag}-filled.vrt`),
        netlist: input.netlist,
        targets: input.targets,
        reference: input.reference,
        footprints: input.footprints,
        stock: input.stock,
        rules: input.rules,
      },
      spawn,
    )
    // ONE ENTRY PER EVALUATION, APPENDED WHERE THE EVALUATION HAPPENS, so there
    // is no path through this function that measures a candidate without
    // recording its F.
    history.push(measured.evaluation.score.objective)
    return measured
  }

  // THE START IS EVALUATED, which is also what makes Task 16's requireMeasured
  // satisfiable: a run that scored no candidate has not measured the start it
  // was handed, and that refusal exists because a runner reporting zero
  // evaluations once produced a retirement recommendation out of nothing.
  const first = evaluateInto(start, "start")
  // THE STARTING GEOMETRY IS THE CALLER'S, AND NOTHING HERE READS IT OFF A
  // DUMP. Deriving it was the last thing standing between the constructed and
  // random arms and a climb at all: both turn parts before the climb is called,
  // and a turned part is exactly what a dump cannot describe. `seedCandidate`
  // hands it over, so this module needs no read and carries no such refusal.
  let incumbent: State = { measured: first, occupancy: input.occupancy }
  // THE BEST CANDIDATE SEEN, WHICH IS NOT THE INCUMBENT ONCE `E3` IS
  // CONFIGURED. A bounded worse-acceptance moves the walk and must not move the
  // result; see the module comment. `strictlyBetter` is the acceptance rule's
  // own, so the two cannot disagree about which of two boards is better.
  let best: Evaluation = first.evaluation
  let base = incumbent
  let rounds = 0
  let spent = false

  while (!spent) {
    const moves = applicableMoves(
      enumerateMoves(base.occupancy, base.measured.dump, input.reference),
    )
    if (moves.length === 0) {
      throw new Error(
        `climb: the move set is empty on ${base.measured.evaluation.candidate}, so this round ` +
          "sweep nothing and the climb would report a local optimum it never tested. It is not " +
          "treated as convergence: enumerateMoves found no gesture the placement model admits - " +
          "every part boxed in, nothing stretchable, no net spanning two strips - which is a " +
          "fact about the board worth stopping on. Check the board's grid against its parts' " +
          "rects, and DEFERRED_KINDS in tools/stripboard/moves.ts for what is left out by " +
          "declaration.",
      )
    }
    let accepted = 0
    for (const [index, move] of moves.entries()) {
      // THE CAP COUNTS WHAT THE RUN SPENT, WHICH INCLUDES THE CANDIDATES IT
      // COULD NOT SCORE: each cost the same four fork invocations as a scored
      // one, and a board whose every wire candidate shorts would otherwise
      // sweep forever against a cap that never moved.
      if (history.length + unscoreable >= cap) {
        spent = true
        break
      }
      const tag = `r${rounds}-m${index}`
      const candidateBoard = path.join(input.runDir, `${tag}.vrt`)
      // THE SAME CALL THE ENUMERATION USED TO PROPOSE THIS MOVE, so the set
      // the search sweeps and the state it carries cannot disagree about what a
      // gesture does. `undefined` here is a defect in this loop and not a state
      // to carry forward, exactly as `withPartTurned` says of itself: the
      // occupancy is not advanced past a gesture that cannot happen.
      const type = base.measured.dump.parts.find((part) => part.ref === refOf(move))?.type
      const advanced = occupancyAfter(base.occupancy, base.measured.dump, move, type)
      if (advanced === undefined) {
        throw new Error(
          `climb: ${describeMove(move)} was proposed by enumerateMoves and the same model now ` +
            "says the occupancy cannot be advanced past it. The two cannot disagree - they are " +
            "one call - so this is a defect in the climb rather than a gesture to skip, and the " +
            "occupancy is NOT left unadvanced: a state that disagreed with the board would make " +
            "every later round propose holes that are already taken.",
        )
      }
      applyMove(base.measured.source, move, candidateBoard, spawn, transport)
      // AN UNSCOREABLE CANDIDATE IS REJECTED AND COUNTED - see
      // `ClimbResult.unscoreable` for the measurement that forced it and why the
      // alternative is worse. ONLY that one refusal is caught, by its own name:
      // a fork failure, a geometry refusal or a grader refusal still stops the
      // run, because none of them says "this candidate cannot be compared".
      let measured: Measured
      try {
        measured = evaluateInto(candidateBoard, tag)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!message.startsWith(UNSCOREABLE)) throw error
        unscoreable += 1
        if (firstUnscoreable === null) firstUnscoreable = message
        continue
      }
      // THE TWO COMPARISON BOARDS ARE DIFFERENT AND BOTH ARE NAMED: a
      // regression is measured against the board this move was applied to, and
      // F against the best so far. See `AcceptanceInput`.
      const verdict = accepts(
        {
          predecessor: base.measured.evaluation,
          incumbent: incumbent.measured.evaluation,
          candidate: measured.evaluation,
        },
        input.rules,
      )
      if (verdict) {
        incumbent = { measured, occupancy: advanced }
        // AND THE BEST SEEN IS UPDATED SEPARATELY, so an E3 acceptance cannot
        // make the run report a board worse than one it found.
        if (strictlyBetter(measured.evaluation, best)) best = measured.evaluation
        accepted += 1
      }
    }
    acceptedPerRound.push(accepted)
    rounds += 1
    // S3: a whole round produced no accepted move, which is a local optimum
    // under this move set and the only stopping rule this loop owns besides the
    // backstop.
    if (accepted === 0) break
    base = incumbent
  }

  return {
    best,
    rounds,
    evaluations: history.length,
    acceptedPerRound,
    history,
    unscoreable,
    firstUnscoreable,
  }
}
