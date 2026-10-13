/**
 * MEASURING one candidate: the three invocations an evaluation spends on the
 * fork, and the five figures they produce.
 *
 * **SPLIT FROM `./climb.ts` FOR THE LINE CEILING, AT THE SEAM THAT FILE ALREADY
 * HAD**: this one answers *what is this candidate worth* and that one answers
 * *do we accept it, and how many did we try*. The same division as
 * `./constraints-model.ts` / `./constraints.ts`. `./climb.ts` stays the module
 * the plan names and re-exports `Evaluation`, `EvaluateInput` and `evaluate`
 * from here, so the plan's declared interface is unchanged and no consumer
 * imports this file directly.
 *
 * **EVERY CLAIM ABOUT WHY THIS IS SHAPED AS IT IS LIVES IN `./climb.ts`'s
 * MODULE COMMENT** - the order of the three invocations, `scoreDumpText` rather
 * than `scoreDump`, and `--check`'s exit status being data rather than a
 * failure. One place, not two.
 */
import { boardGeometry } from "./copper.ts"
import { parseCheckReport, type CheckReport } from "./check-report.ts"
import type { BoardDump } from "../guide/dump.ts"
import type { ConstraintResult, Stock } from "./constraints-model.ts"
import type { ReferenceNets } from "./equivalence.ts"
import { a1, gradeHardConstraints } from "./grade.ts"
import { rankingTuple } from "./rank.ts"
import type { StripboardRules } from "./rules.ts"
import { scoreDumpText, type Score } from "./score.ts"
import type { SpawnVeroroute } from "./seed.ts"
import type { BoardTargets } from "./targets.ts"

/**
 * One candidate, measured: its number, its ten verdicts, its place in the
 * ranking, and how many of its nets are still open.
 */
export interface Evaluation {
  /** The painted board this was measured from - the file, not the move that made it. */
  readonly candidate: string
  readonly score: Score
  readonly results: readonly ConstraintResult[]
  readonly ranking: readonly number[]
  readonly admissibleA1: boolean
  /**
   * How many nets `--check` reports as `incomplete` on this board.
   *
   * **IT IS NOT A SIXTH TERM OF `F` AND NOT A SIXTH POSITION OF THE RANKING.**
   * It is the FIRST KEY of the acceptance rule's ordering
   * (`./climb-accepts.ts`), and that file carries the CRITERIA reading for why
   * it is there rather than in either of the other two places.
   *
   * **IT IS `CheckReport.incompleteNets.length` AND NOTHING ELSE** - the same
   * field `HC1` reads, from the same report, parsed once per evaluation
   * (`./constraints-electrical.ts`). So the search's first key and the hard
   * constraint cannot disagree about whether a board conducts, and
   * `requireSelfConsistent` in `./climb-accepts.ts` refuses a record where they
   * do.
   *
   * **A `blocked` NET IS NOT COUNTED HERE, AND THAT IS A LIMIT RATHER THAN A
   * CHOICE ABOUT COMPLETENESS.** `./check-report.ts` keeps `blocked` out of
   * `incompleteNets` deliberately - it is a net with an UNPLACED member, which
   * is `HC3`'s signal read from the other side - so on a board with a floating
   * part some unjoined nets print `blocked` and this count does not see them.
   * What closes that gap is the acceptance rule's no-regression clause, which
   * rejects a candidate that breaks `HC3` where the predecessor held it; on a
   * board whose start ALREADY floats a part, nothing here closes it. No run
   * recorded in `docs/stripboard/pipeline-verification.md` has `HC3` in its
   * failing set, so the gap is not live on the board this pipeline has measured
   * - that is the evidence for the scope of the claim, and not a claim that the
   * gap cannot exist.
   */
  readonly openNets: number
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
export interface Measured {
  readonly evaluation: Evaluation
  readonly dump: BoardDump
  /**
   * The `--dump-board` TEXT this measurement was read from - the one string
   * `scoreDumpText` and `boardGeometry` were both handed.
   *
   * **IT IS HANDED OUT RATHER THAN RE-FETCHED, AND THAT IS WHAT KEEPS A LATER
   * READER ON THE SAME CHARACTERS.** `./pad-provenance.ts` takes TEXT and not a
   * `BoardDump`, for its own stated reason - a parsed dump carries no `PAD`
   * lines, so a caller handing one over would get a verdict keyed the board's
   * way without being told - so the completion pass needs the text to locate an
   * off-board part's expanded pads. A second `--dump-board` would be a fifth
   * invocation per evaluation that the recorded cost model (four) does not
   * account for, AND it would be a second reading: two dumps of one board agree
   * today and nothing here would notice if they stopped.
   */
  readonly dumpText: string
  /**
   * The parsed `--check` report this measurement's `openNets` was counted from.
   *
   * **IT IS HANDED OUT SO THAT NOTHING DOWNSTREAM RUNS A SECOND `--check`, AND
   * THAT IS THE WHOLE REASON.** `Evaluation.openNets` is this report's
   * `incompleteNets.length` and `HC1` reads the same report, so the count and
   * the hard constraint cannot disagree. A consumer that needs the net NAMES -
   * `./complete.ts`, which plans a join per open net - would otherwise either
   * check again, producing a second completeness measure that could disagree
   * with the one the acceptance rule orders by, or parse them back out of
   * `HC1`'s prose detail. Both were tried and both are worse than handing over
   * the object that was already parsed.
   */
  readonly checkReport: CheckReport
  /**
   * The board this measurement was read from - the one `measure` was handed,
   * BEFORE the autofill.
   *
   * **IT IS NOT, IN GENERAL, THE BOARD THE NEXT GESTURE IS APPLIED TO, AND IT
   * SAID SO UNTIL THE WIRE CANDIDATES' `--update` ARRIVED.** A candidate that
   * adds a wire is measured on its `--update`d copy (`addsWire`, and
   * `./complete-apply.ts`'s `assignNodes` for why), and `--update` runs
   * `AutoFillVero` itself - so for such a candidate this field names a PAINTED
   * board, and the paragraph below is exactly why a gesture must not be applied
   * to it. The board the next gesture goes to is the caller's own carried state:
   * `./climb.ts`'s `State.board` and `./complete.ts`'s `Standing.board`, which
   * both existed for this reason before the field's claim stopped being true.
   *
   * **IT IS NOT `evaluation.candidate` EITHER, AND CONFUSING THOSE TWO WAS A BUG
   * THAT ONLY THE REAL BINARY FOUND.** `candidate` is the PAINTED board, which
   * is what had to be scored (`HC2` refuses an unresolved cut list) - and
   * `--move` REFUSES a relocation that overlaps a part's own current footprint
   * on a painted board, because `AutoFillVero` has painted copper into the
   * holes the part is about to vacate and `Board::CanPutDown` then counts them
   * as occupied. Measured on the import-placed low-boost board: `--move C18
   * --to 1,0` succeeds on the unpainted board and is refused on the autofilled
   * one, and after relocating `C18` to open space at `20,20` and repainting,
   * `21,20` and `20,21` are both refused while `23,20` - clear of its own
   * 3x3 rect - succeeds. A one-hole move always overlaps, so chaining gestures
   * on the painted board refuses on round 0, move 0.
   *
   * So the paint is a SCORING ARTIFACT and the gesture chain runs on the
   * unpainted board, which is `tools/stripboard/seed-arms.ts`'s own rule
   * stated from the other side: *"the paint comes after the last gesture that
   * moves anything"*.
   */
  readonly source: string
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
export function measure(board: string, input: EvaluateInput, spawn: SpawnVeroroute): Measured {
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

  // THE REFERENCE NETS GO TO THE SCORER TOO, AND IT IS THE SAME OBJECT THE
  // GRADER IS HANDED BELOW. `F` charges the cuts the drop test cannot remove
  // (`tools/stripboard/cut-necessity.ts`), and a cut is necessary when dropping
  // it joins two REFERENCE nets' leads - so the scorer and the grader read one
  // reference side rather than two that could disagree about which nets exist.
  const score = scoreDumpText(dumpText, input.targets, input.rules, input.reference)
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
      // THE SAME `checkReport` THE GRADER WAS HANDED, so HC1's verdict and the
      // acceptance rule's first key are two readings of one report rather than
      // two reports.
      openNets: checkReport.incompleteNets.length,
    },
    dump,
    dumpText,
    checkReport,
    source: board,
  }
}

/** One candidate's `Evaluation`: autofill, check, dump, score, grade, rank. */
export function evaluate(board: string, input: EvaluateInput, spawn: SpawnVeroroute): Evaluation {
  return measure(board, input, spawn).evaluation
}
