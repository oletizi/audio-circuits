/**
 * `P2`: the single-part hill climb, and the one place a candidate is accepted
 * or rejected.
 *
 * THE AUTHORITY is `docs/superpowers/specs/
 * 2026-10-10-stripboard-pipeline-design.md` §1257's `P2` row and
 * `docs/superpowers/specs/2026-10-10-stripboard-placement-cost-design.md` §6.1
 * and §6.4. Where this module and those documents differ the documents win and
 * this comment is the defect.
 *
 * **THE ONE PROPERTY THIS DESIGN RESTS ON: A RANKING TERM CANNOT MAKE THE CLIMB
 * ACCEPT A WORSE `F`.** `./rank.ts`'s own comment states it from the other side
 * - *"a smaller `A_occ` never licenses keeping a candidate `F` would otherwise
 * reject"* - and `accepts` below is where it is true or false. The tuple is
 * consulted ONLY on `ΔF = 0`, so no value of any ranking term is ever compared
 * against a change in `F`. If `tests/stripboard/climb.test.ts`'s first test
 * ever passes while `F` rose, the search is optimising something nobody
 * authorised, and `A_occ` - the occupied board AREA - would have become an
 * objective by the back door.
 *
 * **ACCEPTANCE, EXACTLY, AND NOTHING ELSE:** **no regression** - a candidate
 * that breaks a hard constraint which held before the move is rejected,
 * whatever its `F` - and then `ΔF < 0`, or `ΔF = 0` with a strictly better
 * ranking tuple. `E3`'s bounded worse-acceptance is Task 18's, and a rules file
 * that CONFIGURES a bound is refused here rather than silently climbed without
 * it - a configured search behaviour that does not run is worse than one that
 * is off, because the record would say it ran.
 *
 * **`A1` CLASSIFIES THE RESULT, NOT THE STEP**, and `accepts`' own comment
 * carries the correction that made that true, the deadlock it fixes and the
 * CRITERIA reading behind it. `ClimbResult.best.admissibleA1` is where a run
 * says whether it ended admissible, so a climb that ends inadmissible is
 * reported as exactly that rather than as a climb that found nothing.
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
 * from each of the three starting arms: `random` 53 rounds and 5110
 * evaluations, 84 accepted moves, `F` from 31 to 14; `constructed` 29 rounds
 * and 2058 evaluations, 44 accepted moves, `F` from 21 to 17; `import` 3 rounds
 * and 77 evaluations, 3 accepted moves, `F` from 39 to 36. All three stopped on
 * `S3` and all three ended inadmissible.
 * `docs/stripboard/pipeline-verification.md` section 5 carries all three runs,
 * every refusal on the way, and - in §5.9 - what may and may not be concluded
 * from the control arm winning.
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
import type { ConstraintResult, Stock } from "./constraints-model.ts"
import type { ReferenceNets } from "./equivalence.ts"
import { a1 } from "./grade.ts"
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
import { compareRanking } from "./rank.ts"
import type { StripboardRules } from "./rules.ts"
import type { SpawnVeroroute } from "./seed.ts"
import type { BoardTargets } from "./targets.ts"
import { measure, type Evaluation, type Measured } from "./climb-evaluate.ts"

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
 * Whether the climb accepts `input.candidate`.
 *
 * **EXPORTED SO THE ACCEPTANCE RULE IS TESTABLE WITHOUT A SPAWN**, which is
 * the whole reason it is a function and not three lines inside the loop: the
 * property this module rests on is a property of this rule, and a rule only
 * reachable through four fork invocations is a rule nobody asserts directly.
 *
 * THE ORDER OF THE THREE CLAUSES IS THE RULE AND NOT A STYLE:
 *
 * 1. **A configured `worseAcceptance` refuses.** `E3` is Task 18's; a bound
 *    present in the rules and ignored here would be a search behaviour the
 *    record claims and the code does not do.
 * 2. **NO REGRESSION, against the PREDECESSOR: a candidate that BREAKS a
 *    constraint which held on the board the move was applied to is rejected,
 *    before `F` is looked at at all.** Putting this clause after the `ΔF` test
 *    is precisely the mutation that would let a cheap broken candidate through,
 *    and measuring it against the INCUMBENT instead is the bug
 *    `AcceptanceInput.predecessor` exists to name.
 * 3. **`ΔF` decides against the INCUMBENT, and the ranking is consulted only
 *    at `ΔF = 0`.**
 *
 * **WHY NO-REGRESSION AND NOT `A1`, WHICH IS A CORRECTION TO THIS MODULE'S
 * FIRST VERSION AND IS RECORDED RATHER THAN TIDIED AWAY.** The rule here was
 * `if (!candidate.admissibleA1) return false`, which is the plan's acceptance
 * mechanics read literally, and it DEADLOCKS: `HC1` is a board-level predicate,
 * every starting arm begins from a board with incomplete nets (`./seed.ts`: 19,
 * 13, 7 and 6 on mid, hi-boost, hi-cut and low-cut), `A1` is the conjunction of
 * all ten, and no single gesture flips the conjunction from false to true
 * unless it happens to be the very last repair needed - which is unreachable
 * when nothing before it was accepted. Every round reports
 * `acceptedPerRound: [0]`, and with `Q3` treating a barren round as a restart
 * trigger the whole search degenerates into trying each seed once and
 * declaring itself exhausted.
 *
 * CRITERIA uses `A1` to classify the OUTCOME - its *"valid, below target"* row
 * is `A1` holding with an optimisation target unmet - and **nowhere requires an
 * intermediate step to satisfy it.** So "reject on any hard-constraint failure"
 * was the plan's own mechanics rather than a criteria clause, and the
 * correction leaves what counts as an acceptable LAYOUT untouched: an
 * inadmissible board still cannot be adopted, because Task 24's gate has its
 * own `failing-check` refusal, and `ClimbResult.best.admissibleA1` reports
 * plainly whether the climb ended admissible.
 *
 * **`HC2` IS DIFFERENT IN KIND FROM THE OTHER NINE AND IS NOT CHECKED HERE AT
 * ALL.** Under `CUT_STATE UNRESOLVED` the cut list is ABSENT rather than empty,
 * so `C` is not a derived count, `F` is not a number about the board and no
 * comparison between two candidates means anything. That is a precondition for
 * SCORING and not a property being traded, and `./score.ts` already refuses it
 * on every evaluation - so this function inherits the guard and deliberately
 * does not duplicate it. A candidate that reaches `accepts` has a computed cut
 * list by construction.
 */
export interface AcceptanceInput {
  /**
   * The board the move was APPLIED TO - what a regression is measured against.
   *
   * **IT IS NOT THE INCUMBENT, AND CONFLATING THE TWO WAS A CORRECTNESS BUG.**
   * A round applies every move to one base board, so "the regressions this move
   * caused" is a statement about this board and no other. Measured against the
   * INCUMBENT instead, a sibling move that incidentally repaired a constraint
   * and became the incumbent made every LATER sibling in the same round - none
   * of which ever had that repair - look like it had BROKEN the constraint, and
   * each was rejected for a regression it did not cause. That made acceptance
   * depend on the order siblings happened to be swept in, which is the shape of
   * irreproducibility Task 13's canonical hash cannot see, because the hash is
   * over inputs and outcomes and not over the order a round tried things in.
   */
  readonly predecessor: Evaluation
  /**
   * The best candidate so far - what `F` and the ranking are measured against.
   *
   * It is the incumbent and not the predecessor, so `best` only ever improves:
   * comparing `F` against the base instead would accept a sibling that beat the
   * base while losing to a sibling already accepted this round.
   */
  readonly incumbent: Evaluation
  readonly candidate: Evaluation
}

export function accepts(input: AcceptanceInput, rules: StripboardRules): boolean {
  const { predecessor, incumbent, candidate } = input
  if (rules.worseAcceptance !== null) {
    throw new Error(
      `accepts: this rules file configures worseAcceptance = ${rules.worseAcceptance}, and E3's ` +
        "bounded worse-acceptance is Task 18's to implement (tools/stripboard/climb.ts, the " +
        "restart and worse-acceptance step). It is NOT ignored and the climb does NOT fall back " +
        "to strict improvement: a bound that is configured and does not run would make the run " +
        "record say a search behaviour happened when it did not, which is worse than the " +
        "behaviour being off. Write null in stripboard/rules.json to record E3 as deliberately " +
        "unset - which is what the committed file does, with its reason in the notes.",
    )
  }
  requireSelfConsistent(predecessor, "the board this move was applied to")
  requireSelfConsistent(incumbent, "the best candidate so far")
  requireSelfConsistent(candidate, "the candidate being considered")

  // CLAUSE 2, BEFORE ANY ARITHMETIC ON F, AND AGAINST THE PREDECESSOR: only the
  // board this move was applied to can say what this move broke.
  if (regressions(predecessor, candidate).length > 0) return false

  // CLAUSES 3 AND 4, AGAINST THE INCUMBENT: `best` only ever improves.
  const delta = candidate.score.objective - incumbent.score.objective
  if (delta < 0) return true
  // A ranking term is consulted ONLY here, where F is unchanged, and a tie on
  // every one of RANKING's five positions is NOT an improvement: accepting it
  // would let the climb swap one layout for an equivalent one forever and
  // report a round that accepted something while nothing got better.
  if (delta === 0) return compareRanking(candidate.ranking, incumbent.ranking) < 0
  return false
}

/**
 * Every constraint that HELD on `current` and is BROKEN on `candidate`: the
 * regressions the move caused.
 *
 * **IT IS KEYED BY ID AND NEVER BY POSITION.** `gradeHardConstraints` returns
 * the ten in `CONSTRAINT_IDS`' order and `a1` refuses a set that is not exactly
 * the ten once each, so the two lists do line up today - and comparing them
 * index by index would be a claim about that ordering rather than about the
 * constraints, and would silently compare `HC3` against `HC4` the moment
 * anything reordered the table.
 *
 * **A CONSTRAINT BROKEN ON BOTH SIDES IS NOT A REGRESSION**, and that is the
 * whole content of the correction above: the starting board's incomplete nets
 * must not forbid every move away from it. **A constraint this move REPAIRS is
 * not an acceptance either** - it reaches the decision through `F` and the
 * ranking like everything else, because `HC1` holding is not itself a cheaper
 * board.
 *
 * It returns the list rather than a boolean so a caller that wants to say WHICH
 * constraint a move broke can, without a second pass.
 */
function regressions(
  current: Evaluation,
  candidate: Evaluation,
): readonly ConstraintResult[] {
  const held = new Set<string>()
  for (const result of current.results) {
    if (result.held) held.add(result.id)
  }
  return candidate.results.filter((result) => !result.held && held.has(result.id))
}

/**
 * Refuse an `Evaluation` whose `admissibleA1` disagrees with its own ten
 * results.
 *
 * The two could only disagree if something built the record by hand, and the
 * disagreement is not reconcilable from the data: `admissibleA1: true` beside a
 * broken constraint is a board certified against a check that failed, and the
 * reverse hides an admissible one. `a1` itself refuses a set that is not the
 * ten ids once each, so this also catches a results list with a constraint
 * missing.
 */
function requireSelfConsistent(evaluation: Evaluation, which: string): void {
  const recomputed = a1(evaluation.results)
  if (recomputed !== evaluation.admissibleA1) {
    throw new Error(
      `accepts: ${which} (${evaluation.candidate}) records admissibleA1 = ` +
        `${evaluation.admissibleA1} while a1() over its own ten results comes to ${recomputed}. ` +
        "Neither is preferred and the two are not reconciled: which one is the verdict is not " +
        "in the data, and taking the field would certify a board against a constraint that " +
        "failed. Build the Evaluation through evaluate(), which sets both from one grade.",
    )
  }
}

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
  readonly best: Evaluation
  readonly rounds: number
  readonly evaluations: number
  /** How many moves each round accepted. `acceptedPerRound.length === rounds`. */
  readonly acceptedPerRound: readonly number[]
  /** Every evaluation's `F`, in the order the candidates were evaluated. */
  readonly history: readonly number[]
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
  let best: State = { measured: first, occupancy: input.occupancy }
  let base = best
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
      if (history.length >= cap) {
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
      const measured = evaluateInto(candidateBoard, tag)
      // THE TWO COMPARISON BOARDS ARE DIFFERENT AND BOTH ARE NAMED: a
      // regression is measured against the board this move was applied to, and
      // F against the best so far. See `AcceptanceInput`.
      const verdict = accepts(
        {
          predecessor: base.measured.evaluation,
          incumbent: best.measured.evaluation,
          candidate: measured.evaluation,
        },
        input.rules,
      )
      if (verdict) {
        best = { measured, occupancy: advanced }
        accepted += 1
      }
    }
    acceptedPerRound.push(accepted)
    rounds += 1
    // S3: a whole round produced no accepted move, which is a local optimum
    // under this move set and the only stopping rule this loop owns besides the
    // backstop.
    if (accepted === 0) break
    base = best
  }

  return {
    best: best.measured.evaluation,
    rounds,
    evaluations: history.length,
    acceptedPerRound,
    history,
  }
}
