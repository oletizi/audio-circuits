/**
 * What `tests/stripboard/report.test.ts` and
 * `tests/stripboard/report-taxonomy.test.ts` are checked against: a `RunResult`
 * factory, a `ReportInput` factory, and the five named runs the `REP` criteria
 * are stated over.
 *
 * ITS OWN MODULE following `./stop-fixtures.ts`, `./rank-fixtures.ts` and
 * `./score-fixtures.ts`: the two report tests split by concern - the taxonomy
 * and the rendering - over one set of fixtures, so a run named here is one
 * thing to keep correct rather than two that could drift.
 *
 * **IT BUILDS ON `./stop-fixtures.ts` RATHER THAN RESTATING ITS BOARD.**
 * `TARGETS`, `LOW_BOOST`, `heldResults`, `failedResults` and `evaluation` are
 * that module's, because the verdict a report renders is the verdict
 * `./verdict.test.ts` and `./stop.test.ts` drive - a second board with a second
 * floor would make a report test a statement about a different circuit.
 *
 * **NOTHING HERE IS MEASURED BY RUNNING ANYTHING.** Every count is hand-built
 * and the derivations are written beside them, so no fixture is evidence about
 * an artifact. Where a figure matters - `F_0 = 40` and `F = 1`, which make the
 * `A3` gap one fortieth - it is `./stop-fixtures.ts`'s own figure, quoted from
 * CRITERIA section 5's worked case.
 */
import type { ClimbResult } from "../../tools/stripboard/climb.ts"
import type { Evaluation } from "../../tools/stripboard/climb-evaluate.ts"
import type { ReportInput } from "../../tools/stripboard/report.ts"
import { boundFor, type BoundStatus, type Outcome } from "../../tools/stripboard/report.ts"
import { loadRules, type StripboardRules } from "../../tools/stripboard/rules.ts"
import type { RunResult } from "../../tools/stripboard/search.ts"
import type { SeedStart } from "../../tools/stripboard/seed.ts"
import type { StoppingRule } from "../../tools/stripboard/stop.ts"
import { TARGETS, evaluation, failedResults } from "./stop-fixtures.ts"

/** The committed rules, loaded once. `tau` is null in them, which several fixtures rest on. */
export const RULES: StripboardRules = loadRules()

/**
 * A `tau`, used only to reach `A3`'s arithmetic and `Q2`'s bound.
 *
 * **NOT A DEFAULT AND NOT A PROPOSAL**, the same statement `./verdict.test.ts`
 * and `./stop.test.ts` make about their own: `tau` is unset by the owner's
 * decision (`K4`), so a test that needs the tolerance to fire supplies one and
 * says here that it is the test's number.
 */
export const TOLERANCE_RULES: StripboardRules = { ...RULES, tau: 0.05 }

/**
 * A `bestStart` naming a board nothing wrote and an EMPTY occupancy.
 *
 * **NOTHING IN THESE FIXTURES READS IT, AND THE EMPTY MAP SAYS SO.** The report
 * is a function of counters and of the candidate's grade; `bestStart` exists for
 * the completion pass (`tools/stripboard/complete.ts`), which no test in this
 * file reaches. An occupancy with a part in it would be geometry nobody
 * measured, dressed as a fact about a board - so there is none, and a consumer
 * that ever did read this would get a board with no parts rather than a
 * plausible-looking one.
 */
function noBestStart(): SeedStart {
  return { board: "report-fixture-best.vrt", occupancy: new Map() }
}

/** One climb that found `best` for `evaluations` evaluations. */
function climbOf(best: Evaluation, evaluations: number): ClimbResult {
  return {
    best,
    bestStart: noBestStart(),
    rounds: 1,
    evaluations,
    acceptedPerRound: [1],
    history: [best.score.objective],
    unscoreable: 0,
    firstUnscoreable: null,
  }
}

/** `F = 1` against a floor of zero, with every hard constraint held and `kappa = 0`. */
export function healthyCandidate(): Evaluation {
  return evaluation({ cuts: 1, wires: 0, solder: 0, joins: 0, occupied: 9, clustering: 0 })
}

/**
 * The same candidate with `kappa` above the committed bound: `A2` FAILS and
 * `A1` holds.
 *
 * ONE CUT AND `kappa = 0.2`, so the only condition spoiled is `A2` - which is
 * what makes the run below *valid, below target* rather than invalid.
 */
export function clusteredCandidate(): Evaluation {
  return evaluation({ cuts: 1, wires: 0, solder: 0, joins: 2, occupied: 9, clustering: 0.2 })
}

/** `F_0 = 40`: the first climb of a run that reached `F = 1` in its second. */
function startCandidate(): Evaluation {
  return evaluation({ cuts: 40, wires: 0, solder: 0, joins: 0, occupied: 9, clustering: 0 })
}

/**
 * A two-climb run whose best is `best` and whose `F_0` is forty.
 *
 * TWO CLIMBS BECAUSE `F_0` IS THE FIRST CLIMB'S FIGURE and `A3`'s denominator
 * is `F_0 - F_floor`: a one-climb run has `F_0 = F`, so its gap is one and no
 * tolerance admits it. With `F_0 = 40` and `F = 1` against a floor of zero the
 * gap is one fortieth, inside `TOLERANCE_RULES`'s twentieth - CRITERIA section
 * 5's own worked figures.
 */
export function runResult(overrides: Partial<RunResult> = {}): RunResult {
  const best = overrides.best ?? healthyCandidate()
  return {
    best,
    bestStart: noBestStart(),
    climbs: [climbOf(startCandidate(), 100), climbOf(best, 100)],
    restartBoundaries: [100],
    worseAcceptanceRan: false,
    ...overrides,
  }
}

/**
 * A report input with `A1`, `A2` and `A4` held, `A3` unevaluated, and `Q3`
 * fired.
 *
 * `Q3` IS THE DEFAULT RULE RATHER THAN `Q1`, because `Q1` is the one stop that
 * licenses an optimality claim: a fixture resting there would make every test
 * built on it a test of the strongest wording available by accident.
 */
export function reportInput(overrides: Partial<ReportInput> = {}): ReportInput {
  return {
    run: runResult(),
    rule: "Q3",
    targets: TARGETS,
    rules: RULES,
    frozen: undefined,
    binding: undefined,
    ...overrides,
  }
}

/** `V10`: a run that spent its backstop and has proved nothing about a lower bound. */
export function underBudgetedRun(): ReportInput {
  return reportInput({ rule: "Q5" })
}

/**
 * `V12`: a run failing ONLY `A2` - valid, below target, and not a malfunction.
 *
 * **ITS RULE IS `Q3` AND THE CHOICE IS LOAD-BEARING.** `Q5`'s own `OB3` line
 * carries CRITERIA's requirement that a backstop stop be *"reported as a
 * failure"* and uses CRITERIA's word for what is then wrong - so a `Q5`
 * fixture would carry that vocabulary into a report `V12` asserts reads as no
 * malfunction, and the test would be measuring the fixture's rule rather than
 * the `A2` wording it is about. A search-exhausted run short of the clustering
 * bound is also the case `K2` predicts as the expected early outcome.
 */
export function a2OnlyFailure(): ReportInput {
  return reportInput({ run: runResult({ best: clusteredCandidate() }), rule: "Q3" })
}

/** `V12`: a run failing `A1`, which is invalid whatever the optimisation conditions say. */
export function a1Failure(): ReportInput {
  const best = evaluation(
    { cuts: 1, wires: 0, solder: 0, joins: 0, occupied: 9, clustering: 0 },
    failedResults(),
  )
  return reportInput({ run: runResult({ best }), rule: "Q3" })
}

/** `OB3`: a run whose verdict turned on `tau`, which the owner has not set. */
export function withinToleranceRun(): ReportInput {
  return reportInput({ rule: "Q2", rules: TOLERANCE_RULES })
}

/**
 * `E3`: a run under the committed rules, which leave the worse-acceptance bound
 * unset.
 *
 * It is `reportInput()` unchanged, and the separate name is the point: the
 * assertion is about what the COMMITTED rules do, so a fixture that configured
 * a bound to make the test interesting would be testing a configuration nobody
 * reviewed.
 */
export function runWithoutWorseAcceptance(): ReportInput {
  return reportInput()
}

/** A run with `E3`'s bound configured, for the other half of that line. */
export function runWithWorseAcceptance(): ReportInput {
  return reportInput({
    run: runResult({ worseAcceptanceRan: true }),
    rules: { ...RULES, worseAcceptance: 1 },
  })
}

/**
 * The rule that produces each bound status, for `REP3`'s enumeration.
 *
 * **`Q4` CARRIES `budget-exhausted` AND `Q5` DOES NOT APPEAR**, because the map
 * is from a status to ONE rule that produces it and those two share a status.
 * `assertRuleProducesBound` below checks every pair against `boundFor`, so this
 * table cannot drift from the module's own: a fixture naming the wrong rule
 * would render the wrong wording and the loop would still pass.
 */
const RULE_FOR: Readonly<Record<BoundStatus, StoppingRule>> = {
  "at-floor": "Q1",
  "within-tolerance": "Q2",
  "search-exhausted": "Q3",
  "budget-exhausted": "Q4",
  "systematic-cause": "Q6",
}

/** Checked by the taxonomy test: the fixture's rule really does produce that bound. */
export function ruleFor(bound: BoundStatus): StoppingRule {
  return RULE_FOR[bound]
}

/**
 * The candidate that produces each outcome, by the condition it spoils.
 *
 * A `switch` over the union rather than two `if`s, so a fourth outcome does not
 * compile until this says which candidate reaches it.
 */
function candidateFor(outcome: Outcome): Evaluation {
  switch (outcome) {
    case "invalid":
      return evaluation(
        { cuts: 1, wires: 0, solder: 0, joins: 0, occupied: 9, clustering: 0 },
        failedResults(),
      )
    case "valid-below-target":
      return clusteredCandidate()
    case "admissible":
      return healthyCandidate()
  }
}

/**
 * One report input per bound-and-outcome combination, for `REP3`'s loop.
 *
 * **`within-tolerance` TAKES `TOLERANCE_RULES` AND EVERY OTHER STATUS TAKES THE
 * COMMITTED ONES**, because `Q2` cannot fire with `tau` unset - `./report.ts`
 * refuses that pair as a bound naming a rule the search could not have
 * returned. So the fixture supplies the tolerance exactly where the criteria
 * require one and nowhere else.
 */
export function runWith(selection: {
  readonly bound: BoundStatus
  readonly outcome: Outcome
}): ReportInput {
  const rule = RULE_FOR[selection.bound]
  return reportInput({
    run: runResult({ best: candidateFor(selection.outcome) }),
    rule,
    rules: boundFor(rule) === "within-tolerance" ? TOLERANCE_RULES : RULES,
  })
}
