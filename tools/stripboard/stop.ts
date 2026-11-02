/**
 * `Q1`-`Q6`: when a run stops. **A STOP IS NOT A PASS.**
 *
 * THE AUTHORITY is
 * `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md`
 * (CRITERIA) section 5 and its `REP1` table. *"A run stops for one of six
 * reasons and is admissible for a different one. Conflating them is how a
 * pipeline reports success on a board it merely gave up on."* So this module
 * answers only *has the run finished*, and `tools/stripboard/verdict.ts`
 * (Task 20) answers *is the board admissible*. Where this module and CRITERIA
 * differ, CRITERIA wins and this comment is the defect.
 *
 * THE DECLARATIONS - the rule ids, `StopState`, `FailureSignature`,
 * `signatureOf`, `floorNote` and every refusal - live in `./stop-model.ts` and
 * are re-exported here, so every consumer still imports this module. That file
 * holds the vocabulary; this one holds the six decisions.
 *
 * `Q1` AND `Q2` ARE SUCCESSFUL TERMINATIONS AND MAY NOT FIRE ON AN
 * INADMISSIBLE CANDIDATE, and **the arithmetic is why rather than the
 * principle**. `kappa = J/(P - N)` divides by the splitting available and the
 * floor tolerance divides by `F_0 - F_floor`, so the two scale independently.
 * CRITERIA's worked case, carried here rather than cited because a theoretical
 * statement is one somebody later decides is theoretical: with `P - N = 10` a
 * single unit of `J` is a clustering of one tenth, TWICE a bound of one
 * twentieth - while if `F_0 - F_floor = 40` on that same board, that same unit
 * of `J` is a gap of one fortieth, INSIDE a tolerance of one twentieth. `Q2`
 * stops, `A2` fails, and the evaluation budget is left unspent on a board the
 * pipeline was still allowed to improve.
 *
 * WHAT THIS MODULE THEREFORE DOES:
 *
 * - **It never derives an admissibility condition.** `admissible` is imported
 *   from `./verdict.ts`, which is the one implementation of `A1`-`A4` - and
 *   `A1` within it is `./grade.ts`'s `a1`. A local predicate here would be a
 *   second copy of a verdict, which CRITERIA's generate/grade split (`R2`)
 *   forbids. **`./verdict.ts` is Task 20's file written in Task 19**, which is
 *   the plan's own instruction for this mutual reference; its module comment
 *   carries the note.
 * - **It reads the candidate's ten results rather than `Evaluation.admissibleA1`.**
 *   The cached flag carries no proof, while `a1` inside `admissible` refuses a
 *   result set that is not exactly the ten ids - the refusal that keeps `A1`
 *   from being *"nine `&&`s and a typo"*. `evaluate()` sets the flag from the
 *   same call, so the two agree in any real run.
 * - **`Q1` and `Q2` both require all four conditions**, through
 *   `fullyAdmissible`. `Q2` requires no tolerance arithmetic of its own: `A3`
 *   IS `K4`'s tolerance, so *"within tolerance of the floor, and admissible"*
 *   is `admissible` with `tau` set, computed in one place.
 * - **While `tau` is `null`** - the owner's decision (`K4`), and *"`Q2` and
 *   `A3` do not fire"* while it is - `Q2` does not fire at all, which is
 *   CRITERIA's stated behaviour and not a missing branch. `A3` does not block
 *   admissibility while it is unset, so `Q1` still fires.
 * - **`A4` NEEDS TO BE TOLD WHICH BOARD RAN**, so `StopState` carries `frozen`
 *   and `admissible` refuses on low-boost when it is unstated. That field is an
 *   addition to the counters the plan declares, and the reason is `A4`: a run
 *   that cannot say which low-boost board it graded cannot satisfy it.
 *
 * NO THRESHOLD IS WRITTEN IN THIS FILE. `tau`, `k`, the evaluation cap and the
 * signature run length all come from `stripboard/rules.json` through
 * `StripboardRules`, because a number that entered the criteria through the
 * implementation is a criterion nobody reviewed (`PAR3`).
 * `tests/stripboard/stop.test.ts` scans both files with `V9`'s own
 * `bareLiteral` - a scan, not a proof - and then checks the stronger thing
 * behaviourally: every threshold applied here must MOVE when the rules file's
 * value moves.
 *
 * THE FLOOR IS A FUNCTION OF TODAY'S STOCK. `C_floor = max(0, N - R)` takes `R`
 * from the strip count, and the owner's standing rule (CRITERIA section 2,
 * verbatim) is *"I may, at any time, decide to change the dimensions of any
 * board at any time. The dimensions are ALWAYS provisional"*. A `Q1` stop is
 * therefore an optimality claim against a provisional figure. `evaluateStop`
 * returns a rule id and nothing else, so the provisionality cannot ride on its
 * return value: `floorNote` is what a report prints beside the figure, and
 * Task 20 is where it is printed.
 */
import type { Evaluation } from "./climb.ts"
import type { StripboardRules } from "./rules.ts"
import {
  STOPPING_RULES,
  assertOrderCoversTable,
  refuse,
  type StopState,
  type StoppingRule,
} from "./stop-model.ts"
import type { BoardTargets } from "./targets.ts"
import { admissible, fullyAdmissible } from "./verdict.ts"

export {
  STOPPING_RULES,
  assertOrderCoversTable,
  floorNote,
  signatureOf,
  type FailureSignature,
  type StopRefusal,
  type StopState,
  type StoppingRule,
} from "./stop-model.ts"

/** What every rule is handed. One object, so adding a rule cannot change six signatures. */
interface StopInput {
  readonly state: StopState
  readonly best: Evaluation
  readonly targets: BoardTargets
  readonly rules: StripboardRules
}

/**
 * `A1`-`A4` for the candidate `Q1` or `Q2` is about.
 *
 * **`binding` IS `undefined` AND THAT CANNOT CHANGE WHETHER A RUN STOPS.** A
 * binding constraint is constraint-side evidence a search does not hold, and
 * `./verdict.ts` reports its absence in `A2`'s detail rather than refusing -
 * which matters here because `Q1` and `Q2` read only the four booleans, never a
 * detail string. Task 20's report is where a binding constraint is supplied.
 *
 * **AND NOTHING IN PRODUCTION EVER SUPPLIES ONE, which is a stated limit rather
 * than a thing waiting to happen.** `reportInputOf` in `./place.ts` hardcodes
 * `binding: undefined` as well, so `REP2`'s requirement that an `A2` failure
 * name what bounded the clustering is never met on a real run - every report
 * says "No binding constraint was stated" - and the `span` and `packing` arms of
 * `BindingConstraint`, along with `report-binding-rule-disagrees`, are dead
 * outside tests. It is safe in the conservative direction: `K3`'s ratchet can
 * never be moved on a production run. Recorded in
 * `docs/stripboard/pipeline-verification.md` §7 and §9.5.
 */
function admissibilityOf(input: StopInput): boolean {
  return fullyAdmissible(
    admissible({
      results: input.best.results,
      score: input.best.score,
      targets: input.targets,
      rules: input.rules,
      initialObjective: input.state.climbHistory[0],
      frozen: input.state.frozen,
      binding: undefined,
    }),
  )
}

/** `g = F - C_floor`: the gap the derived floor says provably remains. */
function gapToFloor(input: StopInput): number {
  const gap = input.best.score.objective - input.targets.cutFloor
  if (gap < 0) {
    refuse(
      "stop-negative-gap",
      `${input.targets.board} scores F = ${input.best.score.objective} against a declared floor ` +
        `of ${input.targets.cutFloor}`,
    )
  }
  return gap
}

/**
 * One climb-to-climb step: what the restart won, and what it cost.
 *
 * THERE IS ONE FEWER OF THESE THAN THERE ARE CLIMBS, because a step is a
 * restart and the first climb is not one - the same reason
 * `RunResult.restartBoundaries` is one shorter than `RunResult.climbs`.
 */
interface ClimbStep {
  /** `F` of the previous climb minus `F` of this one: positive is progress. */
  readonly improvement: number
  /** The evaluations this climb spent. */
  readonly evaluations: number
}

function climbSteps(state: StopState): readonly ClimbStep[] {
  if (state.climbEvaluations.length !== state.climbHistory.length) {
    refuse(
      "stop-counters-malformed",
      `this state carries ${state.climbHistory.length} climb objective(s) and ` +
        `${state.climbEvaluations.length} climb evaluation count(s)`,
    )
  }
  const steps: ClimbStep[] = []
  for (let index = 1; index < state.climbHistory.length; index += 1) {
    const previous = state.climbHistory[index - 1] ?? 0
    const current = state.climbHistory[index] ?? 0
    const evaluations = state.climbEvaluations[index] ?? 0
    if (evaluations <= 0) {
      refuse(
        "stop-counters-malformed",
        `climb ${index} reports ${evaluations} evaluation(s), so its improvement has no rate`,
      )
    }
    steps.push({ improvement: previous - current, evaluations })
  }
  return steps
}

/**
 * How many consecutive climb steps `Q4` needs.
 *
 * TWO, AND IT IS A SHAPE RATHER THAN A TUNABLE, so it is not in the rules file:
 * CRITERIA `Q4` requires the measurement be *"across at least one restart,
 * never within a climb"*, and Task 19's brief in the stripboard pipeline plan
 * states the reading that two CONSECUTIVE steps are required, *"so one is not
 * enough"*. Improvement here is bursty - a climb goes flat and then drops
 * sharply after a restart - so one flat step is the condition the restarts
 * exist to leave rather than evidence the search is done.
 */
const REQUIRED_STEPS = 2

/**
 * The shortest `signatureRun` `Q6` will act on.
 *
 * TWO, AND IT IS A DIFFERENT TWO FROM `REQUIRED_STEPS` ABOVE - the two are
 * written separately although they share a digit, because they are different
 * quantities and a single constant serving both would couple them: a mutation
 * of `Q4`'s step count broke `Q6`'s refusal while they shared one name, which
 * is how that coupling announced itself, and
 * `tests/stripboard/stop.test.ts` now scans for its return.
 *
 * **IT IS A DELIBERATE SECOND READING OF `./rules.ts`'s RANGE, NOT A SECOND
 * SPECIFICATION OF IT.** That file is where the range is stated and enforced,
 * and it enforces it when it LOADS a file - which a rules object built in code
 * never passes through. The duplication buys the one case the loader cannot
 * see; if it ever disagrees with the loader, the loader is right.
 */
const MINIMUM_SIGNATURE_RUN = 2

/**
 * `Q1`: at the floor, and admissible.
 *
 * CRITERIA's conditions verbatim: *"`C = C_floor` and `W = 0`; equivalently
 * `kappa = 0`, `S_occ = min(N, R)`, `W = 0`"*. `J === 0` is `kappa === 0`
 * without the division, which matters because `kappa = J/(P - N)` is undefined
 * on a board with `P = N` and a stopping rule may not refuse one.
 *
 * **IT CARRIES A FOURTH CONDITION NOBODY STATES, AND THIS IS WHERE IT IS
 * STATED: THE CANDIDATE'S DUMP MUST REPORT THE SAME NET COUNT AS THE MODEL.**
 * The clauses below mix two sources deliberately - the floor is a model quantity
 * - and the consequence falls out of the algebra. `targets.cutFloor` and
 * `targets.netCount` are MODEL-sourced (`./targets.ts`); `score.joins` is built
 * from the DUMP's `N` (`./score.ts` reads `Object.keys(dump.nodes).length` and
 * hands it to `segmentJoins`). On a board with `N_model <= R`: `cutFloor = 0`
 * forces `C = 0`, `occupied = min(N_model, R) = N_model`, and `joins = 0` then
 * forces `0 - N_dump + N_model = 0`, i.e. `N_dump === N_model`.
 *
 * **IT IS NOT UNSATISFIABLE**, which the final whole-branch review suspected and
 * this records as checked rather than assumed:
 * `tests/fixtures/stripboard/pultec-low-boost-imported.dump` carries 14 `NODE`
 * lines against that model's 14 nets, so on the `--import`-placed board every
 * run starts from, the clause holds and `Q1` is reachable.
 *
 * **WHERE IT CANNOT FIRE is on a layout whose dump disagrees with its model**,
 * and COST §2.3 records all five committed Pultec hand layouts as exactly that
 * (`tests/stripboard/targets-oracle.ts` carries both numbers per board -
 * low-boost is `nets: 14` against `layoutNets: 9`). `Q1` is the only optimality
 * claim this pipeline may make, so on such a board "Q1 did not fire" must be
 * read as "the question was not askable here" and NOT as "the board is above its
 * floor". Nothing in this module, `./report.ts` or `floorNote` said so until
 * this comment; see `docs/stripboard/pipeline-verification.md` §9.2.
 */
function q1(input: StopInput): boolean {
  const score = input.best.score
  const atFloor =
    score.cuts === input.targets.cutFloor &&
    score.wires === 0 &&
    score.joins === 0 &&
    score.occupied === Math.min(input.targets.netCount, input.targets.strips)
  if (!atFloor) return false
  if (score.solder > 0) {
    refuse(
      "stop-bridge-without-join",
      `${input.targets.board} is at its floor with J = 0 and reports ${score.solder} solder ` +
        "bridge(s)",
    )
  }
  return admissibilityOf(input)
}

/**
 * `Q2`: within `tau` of the floor, and admissible.
 *
 * IT COMPUTES NO TOLERANCE OF ITS OWN. `A3` **is** `K4`'s tolerance - the same
 * `(F - F_floor)/max(1, F_0 - F_floor) < tau` - and it is one of the four
 * conditions, so *"within tolerance of the floor, and admissible"* is exactly
 * *admissible, with a `tau` set*. Two readings of one formula would be two
 * places for the gap to come out differently on one board.
 *
 * THE `tau === null` EXIT IS CRITERIA'S, NOT AN OPTIMISATION: `A3` does not
 * block admissibility while `tau` is unset, so without this exit `Q2` would
 * fire on every admissible candidate and report *within tolerance* against a
 * tolerance the owner declined to set.
 */
function q2(input: StopInput): boolean {
  if (input.rules.tau === null) return false
  return admissibilityOf(input)
}

/**
 * `Q3`: a round accepted nothing AND the seed list is spent. Both, or it is a
 * restart trigger rather than a stop.
 *
 * **IT CANNOT VERIFY THE CLAUSE IT DEPENDS ON, AND THAT OBLIGATION IS STATED
 * HERE RATHER THAN LEFT IMPLICIT.** CRITERIA requires *"a full sweep of the
 * move set - INCLUDING the net-cluster move - that produced no accepted
 * move"*, and `acceptedThisRound` is a count with nothing in it that says what
 * was swept. What makes the clause true is `./climb.ts`'s own definition of a
 * round: *"a full sweep of the move set enumerated at the round's start"*, with
 * the net-cluster move in that set. A caller that counted a partial sweep into
 * this field would report a search exhausted that had not been, and nothing
 * here would catch it.
 */
function q3(input: StopInput): boolean {
  return input.state.acceptedThisRound === 0 && input.state.seedsRemaining === 0
}

/**
 * `Q4`: finishing would cost more than the search already has - `g/r > k*e`
 * over the last two climb steps.
 *
 * `r <= 0` IS NOT A DIVISION TO AVOID BUT THE STRONGEST CASE OF THE RULE: a
 * restart that won nothing projects an unbounded cost to close a gap that
 * remains, so the condition holds. `g === 0` is the opposite and holds for
 * nothing: there is no gap left to project a cost against.
 *
 * `e` IS THE RUN'S SPEND, summed over the climbs, not the last climb's -
 * *"a restart legitimately resumes progress, so resetting the yield counter is
 * correct; hiding that the run as a whole has stalled is not"*.
 */
function q4(input: StopInput): boolean {
  const steps = climbSteps(input.state)
  if (steps.length < REQUIRED_STEPS) return false
  const gap = gapToFloor(input)
  if (gap === 0) return false
  const spent = input.state.climbEvaluations.reduce((total, count) => total + count, 0)
  const budget = input.rules.yieldFloor * spent
  return steps.slice(-REQUIRED_STEPS).every((step) => {
    if (step.improvement <= 0) return true
    return gap / (step.improvement / step.evaluations) > budget
  })
}

/** `Q5`: the run-level cap is spent. Run-level, so a restart cannot grant itself more. */
function q5(input: StopInput): boolean {
  return input.state.runEvaluations >= input.rules.evaluationCap
}

/**
 * `Q6`: the last `signatureRun` signatures are one signature.
 *
 * THE WINDOW IS THE END OF THE RUN'S WHOLE SEQUENCE, NEVER ONE CLIMB'S SLICE OF
 * IT - *"compared within and across restarts, because three sharing a signature
 * across two seeds is stronger evidence than three within one"*.
 */
function q6(input: StopInput): boolean {
  const run = input.rules.signatureRun
  if (!Number.isInteger(run) || run < MINIMUM_SIGNATURE_RUN) {
    refuse("stop-rules-malformed", `these rules carry a Q6 run length of ${run}`)
  }
  const signatures = input.state.signatures
  if (signatures.length < run) return false
  const window = signatures.slice(-run)
  return window.every((signature) => signature === window[0])
}

/**
 * The six rules, keyed by id so the table cannot lose one: a missing key is a
 * `bun run typecheck` failure against `StoppingRule`, and `STOPPING_RULES`
 * supplies the order.
 */
const RULES: Readonly<Record<StoppingRule, (input: StopInput) => boolean>> = {
  Q1: q1,
  Q2: q2,
  Q3: q3,
  Q4: q4,
  Q5: q5,
  Q6: q6,
}

/**
 * The FIRST rule that fires, in `Q1`-`Q6` order, or `null` while the search may
 * continue.
 *
 * `null` IS NOT A VERDICT AND NEITHER IS A RULE ID. A stop says the run is
 * over; whether the board can be built is `./verdict.ts`'s answer from the same
 * candidate's ten constraint results.
 */
export function evaluateStop(
  state: StopState,
  best: Evaluation,
  targets: BoardTargets,
  rules: StripboardRules,
): StoppingRule | null {
  assertOrderCoversTable(STOPPING_RULES, Object.keys(RULES))
  const input: StopInput = { state, best, targets, rules }
  for (const rule of STOPPING_RULES) {
    if (RULES[rule](input)) return rule
  }
  return null
}
