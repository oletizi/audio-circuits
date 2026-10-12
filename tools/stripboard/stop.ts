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
 * WHAT THIS MODULE THEREFORE DOES, AND THE ONE THING IT CANNOT YET DO:
 *
 * - **It never re-derives admissibility.** `a1` is imported from `./grade.ts`,
 *   the one implementation of *all ten hard constraints hold*. A local copy
 *   would be a second copy of a verdict, which CRITERIA's generate/grade split
 *   (`R2`) forbids.
 * - **It calls `a1` rather than reading `Evaluation.admissibleA1`.** The cached
 *   flag carries no proof, while `a1` refuses a result set that is not exactly
 *   the ten ids - the refusal that keeps `A1` from being *"nine `&&`s and a
 *   typo"*. `evaluate()` sets the flag from this same call, so the two agree in
 *   any real run.
 * - **`Q1` is complete**, because being at the floor DERIVES the optimisation
 *   targets rather than needing them checked: `C = C_floor` requires `J = 0`,
 *   so `kappa = 0`, which is inside any `kappa_bench` (`A2`) - and `./rules.ts`
 *   refuses a `kappaBench` of zero for exactly that reason; and the floor gap is
 *   then zero, which is inside any `tau` (`A3`). **`A4` IS NOT CHECKED HERE AND
 *   IS NOT IMPLIED**: it names which low-boost board was run, which is Task
 *   20's business and is vacuous on every other board. On low-boost a `Q1` stop
 *   is therefore one condition short of CRITERIA's *"`A1`-`A4` hold on that
 *   candidate"*, and that is stated rather than papered over.
 * - **`Q2` CANNOT BE COMPLETED UNTIL `A2` EXISTS.** The worked case above is
 *   precisely a candidate where the tolerance holds, `A1` holds and `A2` does
 *   not, so `A1` alone is not the guard `Q2` needs. `A2` is
 *   `kappa <= kappa_bench` and nothing in this repository computes it yet -
 *   Task 20's `verdict.ts` owns it. While `tau` is `null` - the owner's
 *   decision (`K4`), and *"`Q2` and `A3` do not fire"* while it is - `Q2` does
 *   not fire at all, which is CRITERIA's stated behaviour and not a missing
 *   branch. If a `tau` is ever set before Task 20 lands, `Q2` REFUSES rather
 *   than firing on a weaker guard than CRITERIA states. See
 *   `stop-tolerance-needs-a2`.
 *
 * NO THRESHOLD IS WRITTEN IN THIS FILE. `tau`, `k`, the evaluation cap and the
 * signature run length all come from `stripboard/rules.json` through
 * `StripboardRules`, because a number that entered the criteria through the
 * implementation is a criterion nobody reviewed (`PAR3`).
 * `tests/stripboard/stop.test.ts` scans both files with `V9`'s own
 * `BARE_LITERAL` - a scan, not a proof - and then checks the stronger thing
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
import { a1 } from "./grade.ts"
import type { StripboardRules } from "./rules.ts"
import {
  STOPPING_RULES,
  assertOrderCoversTable,
  refuse,
  type StopState,
  type StoppingRule,
} from "./stop-model.ts"
import type { BoardTargets } from "./targets.ts"

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
 * is how that coupling announced itself. `./rules.ts` enforces this range when
 * it loads the file; this is the same floor for a rules object built by hand,
 * because one signature compared with nothing stops the run on the first
 * failure of any kind.
 */
const MINIMUM_SIGNATURE_RUN = 2

/**
 * `Q1`: at the floor, and admissible.
 *
 * CRITERIA's conditions verbatim: *"`C = C_floor` and `W = 0`; equivalently
 * `kappa = 0`, `S_occ = min(N, R)`, `W = 0`"*. `J === 0` is `kappa === 0`
 * without the division, which matters because `kappa = J/(P - N)` is undefined
 * on a board with `P = N` and a stopping rule may not refuse one.
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
  return a1(input.best.results)
}

/**
 * `Q2`: within `tau` of the floor, and admissible.
 *
 * THE TWO EXITS BEFORE THE REFUSAL ARE BOTH CRITERIA'S. An unset `tau` means
 * `Q2` does not fire (`K4`), and an inadmissible candidate means `Q2` does not
 * fire whatever the arithmetic says - and in that second case no `A2` is needed
 * to know it. So the refusal is reached only where `Q2` would otherwise STOP
 * THE RUN on a guard weaker than the one CRITERIA states.
 */
function q2(input: StopInput): boolean {
  const tau = input.rules.tau
  if (tau === null) return false
  const first = input.state.climbHistory[0]
  if (first === undefined) {
    refuse(
      "stop-counters-malformed",
      "this state carries no climb objective, so the floor tolerance has no F_0",
    )
  }
  const gap = gapToFloor(input) / Math.max(1, first - input.targets.cutFloor)
  if (!(gap < tau)) return false
  if (!a1(input.best.results)) return false
  refuse(
    "stop-tolerance-needs-a2",
    `${input.targets.board} is within tau = ${tau} of its floor at a gap of ${gap} and A1 holds`,
  )
}

/** `Q3`: a round accepted nothing AND the seed list is spent. Both, or it is a restart trigger. */
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
