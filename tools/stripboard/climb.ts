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
 * **THE START IS INADMISSIBLE AND THAT IS NORMAL.** `./seed.ts` records that
 * all three arms begin from a board whose nets are incomplete - 19, 13, 7 and 6
 * on mid, hi-boost, hi-cut and low-cut - so `HC1` fails on the start and will
 * keep failing until the search has repaired the circuit. The no-regression
 * rule is what lets a climb move at all from there while still refusing to
 * trade a constraint away; `docs/stripboard/pipeline-verification.md` carries
 * what a real climb from each arm actually does.
 */
import fs from "node:fs"
import path from "node:path"
import { boardGeometry } from "./copper.ts"
import { parseCheckReport, type CheckReport } from "./check-report.ts"
import type { BoardDump } from "../guide/dump.ts"
import type { ConstraintResult, Stock } from "./constraints-model.ts"
import type { ReferenceNets } from "./equivalence.ts"
import { a1, gradeHardConstraints } from "./grade.ts"
import { applicableMoves, applyMove, enumerateMoves, type GestureTransport } from "./moves.ts"
import { compareRanking, rankingTuple } from "./rank.ts"
import type { StripboardRules } from "./rules.ts"
import { scoreDumpText, type Score } from "./score.ts"
import type { SpawnVeroroute } from "./seed.ts"
import type { BoardTargets } from "./targets.ts"

/** One candidate, measured: its number, its ten verdicts, and its place in the ranking. */
export interface Evaluation {
  /** The painted board this was measured from - the file, not the move that made it. */
  readonly candidate: string
  readonly score: Score
  readonly results: readonly ConstraintResult[]
  readonly ranking: readonly number[]
  readonly admissibleA1: boolean
}

/**
 * What one evaluation needs. `painted` is where the autofilled board is
 * WRITTEN, named by the caller rather than derived here: the fork's rule is
 * `-o` always and never a path a verb worked out for itself, and a climb that
 * derived its own scratch names would be one edit away from deriving the start
 * board's.
 */
export interface EvaluateInput {
  readonly painted: string
  /** The reference export `--check` compares the board against. */
  readonly netlist: string
  readonly targets: BoardTargets
  readonly reference: ReferenceNets
  /** Reference designator -> the KiCad footprint the part is fitted with. */
  readonly footprints: ReadonlyMap<string, string>
  readonly stock: Stock
  readonly rules: StripboardRules
}

/**
 * The evaluation together with the dump it was measured from.
 *
 * **IT IS INTERNAL, AND `Evaluation` STAYS THE FIVE FIELDS THE PLAN DECLARES.**
 * The climb needs the parsed dump to enumerate the next round's moves from the
 * board it is standing on, and fetching it again would be a fifth invocation
 * per evaluation that the recorded cost model (four) does not account for. So
 * the dump travels inside this module and is not added to the interface three
 * later tasks consume.
 */
interface Measured {
  readonly evaluation: Evaluation
  readonly dump: BoardDump
}

/** One spawn whose failure means the gesture did not happen. */
function run(spawn: SpawnVeroroute, args: readonly string[], what: string): string {
  const result = spawn(args)
  if (result.status !== 0) {
    throw new Error(
      `evaluate: ${what} exited ${result.status}, so this candidate was not measured. The ` +
        `invocation was: ${args.join(" ")}\n${result.stdout}${result.stderr}\nIt is not retried ` +
        "and no partial measurement is recorded: a candidate scored from a board the fork could " +
        "not paint or could not read is a number about nothing, and one such number in the " +
        "history makes every crossing index after it wrong.",
    )
  }
  return result.stdout
}

/**
 * `--check`'s report for one board. **Its exit code is read, never refused
 * on** - see the module comment.
 *
 * The two streams are concatenated in `tools/perfboard/check.ts`'s own order
 * and for its own stated reason: *"the report body is on stdout, but an
 * unreadable board writes an empty report and puts the only diagnostic on
 * stderr"*, and `parseCheckReport` is written against that concatenation.
 */
function checkReportOf(spawn: SpawnVeroroute, board: string, netlist: string): CheckReport {
  const result = spawn(["--check", board, "--netlist", netlist])
  return parseCheckReport({ status: result.status, output: `${result.stdout}${result.stderr}` })
}

/** The evaluation and the dump behind it: the three invocations, in their one order. */
function measure(board: string, input: EvaluateInput, spawn: SpawnVeroroute): Measured {
  // 1. PAINT. AutoFillVero runs on --update and on --author --op autofill and
  // on nothing else, and HC2 refuses an unresolved cut state rather than
  // mis-scoring it, so nothing below may read a cut list before this.
  run(
    spawn,
    ["--author", board, "--op", "autofill", "-o", input.painted],
    `painting the strips of ${board}`,
  )
  // 2. CHECK, against the netlist. HC1 and HC7 read this report and nothing
  // else does.
  const checkReport = checkReportOf(spawn, input.painted, input.netlist)
  // 3. DUMP, into ONE string. Everything measured below is read from this
  // single `dumpText`, which is what makes V1's two counts provably about the
  // same characters - see the module comment on scoreDumpText.
  const dumpText = run(spawn, ["--dump-board", input.painted], `reading ${input.painted}`)

  const score = scoreDumpText(dumpText, input.targets, input.rules)
  // `boardGeometry`, not `parseBoardDump`: a parsed dump skips every geometry
  // refusal, so text fed through the bare parser never exercises the contract
  // HC8 is stated in. The same correction Tasks 3, 4, 5, 11 and 12 each needed.
  const dump = boardGeometry(dumpText)
  const results = gradeHardConstraints({
    // Both from the same string, so the grader and the scorer cannot be
    // describing two different boards.
    dumpText,
    dump,
    reference: input.reference,
    footprints: input.footprints,
    checkReport,
    stock: input.stock,
    rules: input.rules,
  })
  return {
    evaluation: {
      candidate: input.painted,
      score,
      results,
      ranking: rankingTuple(score, dump, input.reference),
      admissibleA1: a1(results),
    },
    dump,
  }
}

/** One candidate's `Evaluation`: autofill, check, dump, score, grade, rank. */
export function evaluate(board: string, input: EvaluateInput, spawn: SpawnVeroroute): Evaluation {
  return measure(board, input, spawn).evaluation
}

/**
 * Whether the climb accepts `candidate` in place of `current`.
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
 * 2. **NO REGRESSION: a candidate that BREAKS a constraint which held before
 *    the move is rejected, before `F` is looked at at all.** Putting this
 *    clause after the `ΔF` test is precisely the mutation that would let a
 *    cheap broken candidate through.
 * 3. **`ΔF` decides, and the ranking is consulted only at `ΔF = 0`.**
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
export function accepts(
  current: Evaluation,
  candidate: Evaluation,
  rules: StripboardRules,
): boolean {
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
  requireSelfConsistent(current, "the candidate the climb is standing on")
  requireSelfConsistent(candidate, "the candidate being considered")

  // CLAUSE 2, BEFORE ANY ARITHMETIC ON F.
  if (regressions(current, candidate).length > 0) return false

  const delta = candidate.score.objective - current.score.objective
  if (delta < 0) return true
  // A ranking term is consulted ONLY here, where F is unchanged, and a tie on
  // every one of RANKING's five positions is NOT an improvement: accepting it
  // would let the climb swap one layout for an equivalent one forever and
  // report a round that accepted something while nothing got better.
  if (delta === 0) return compareRanking(candidate.ranking, current.ranking) < 0
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
  let best = evaluateInto(start, "start")
  let base = best
  let rounds = 0
  let spent = false

  while (!spent) {
    const moves = applicableMoves(enumerateMoves(base.dump, input.reference))
    if (moves.length === 0) {
      throw new Error(
        `climb: the move set is empty on ${base.evaluation.candidate}, so this round would ` +
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
      applyMove(base.evaluation.candidate, move, candidateBoard, spawn, transport)
      const measured = evaluateInto(candidateBoard, tag)
      if (accepts(best.evaluation, measured.evaluation, input.rules)) {
        best = measured
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

  return { best: best.evaluation, rounds, evaluations: history.length, acceptedPerRound, history }
}
