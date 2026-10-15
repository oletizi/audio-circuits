/**
 * `Q1`-`Q6` OVER A CANDIDATE HELD IN MEMORY: when a search of this model stops.
 * **A STOP IS NOT A PASS.**
 *
 * THE AUTHORITY is
 * `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md`
 * (CRITERIA) section 5 and its `REP1` table, and the taxonomy is **retained
 * unchanged** - the model-and-search plan's own instruction: *"The stopping
 * taxonomy is retained unchanged; only the budget rises."* Where this module
 * and CRITERIA differ, CRITERIA wins and this comment is the defect.
 *
 * **IT IS A SECOND IMPLEMENTATION OF ONE TAXONOMY AND THAT IS SAID HERE RATHER
 * THAN LEFT FOR SOMEBODY TO FIND.** `tools/stripboard/stop.ts` decides the same
 * six rules over a graded `BoardDump` for the fork-driven pipeline. This one
 * decides them over a `Candidate`, because `lib/stripboard/` **may not import
 * from `tools/`** - `tests/stripboard/model/no-fork.test.ts` enforces that over
 * the whole import closure - and the core scores candidates it has never
 * exported. The arithmetic of each rule is transcribed from that module
 * deliberately and the differences are enumerated below; which of the two
 * survives is the plan's decision, not this module's.
 *
 * **THE THREE DIFFERENCES, each forced by the boundary rather than chosen:**
 *
 *   1. **`A1`-`A4` ARRIVE AS A PREDICATE.** `tools/stripboard/verdict.ts` is the
 *      one implementation of admissibility and it is behind the boundary, so
 *      `Q1` and `Q2` read an `admissible` function the caller supplies - the
 *      same device `./score.ts` uses for the owner's weights, and for the same
 *      reason: *"an agent may never author the acceptance criteria for the
 *      artifact it is producing."* A local predicate here would be a second
 *      copy of a verdict, which CRITERIA's generate/grade split (`R2`) forbids.
 *      **A CALLER THAT SUPPLIES A WEAKER PREDICATE GETS A WEAKER `Q1`**, and
 *      `Q1` is the only optimality claim this project may make - so a run must
 *      report what it handed in. Nothing here can check that for it.
 *   2. **`K4`'s TOLERANCE IS NOT COMPUTED HERE.** `A3` **is** that tolerance and
 *      `A3` is one of admissibility's four conditions, so *"within tolerance of
 *      the floor, and admissible"* is exactly *admissible, with a `tau` set* -
 *      which is how `tools/stripboard/stop.ts` reads it too. `tau` is carried
 *      below only to decide whether `Q2` runs at all.
 *   3. **`Q6` IS NOT TESTED AT ALL**, and that is `UNTESTED_IN_CORE` rather than
 *      a predicate over an empty list. See that constant.
 *
 * NO THRESHOLD IS WRITTEN IN THIS FILE. `tau`, `k`, the evaluation cap and the
 * signature run length are `PAR3` parameters from `stripboard/rules.json`, and a
 * number that entered the criteria through the implementation is a criterion
 * nobody reviewed. `C_floor` is a parameter too: `max(0, N - R)` is derived by
 * `tools/stripboard/targets.ts`, which is the one owner of that formula and is
 * behind the boundary.
 *
 * THE FLOOR IS A FUNCTION OF TODAY'S STOCK. `R` is a strip count, and the
 * owner's standing rule (CRITERIA section 2, verbatim) is *"I may, at any time,
 * decide to change the dimensions of any board at any time. The dimensions are
 * ALWAYS provisional"*. A `Q1` stop is therefore an optimality claim against a
 * provisional figure.
 */
import type { Candidate } from "./board.ts"
import { significantContacts, type Cut, type ReferenceNets } from "./cuts.ts"

/** The six reasons a run stops, in the order they are tested. */
export type StoppingRule = "Q1" | "Q2" | "Q3" | "Q4" | "Q5" | "Q6"

/**
 * `Q1`-`Q6` in CRITERIA's own order, which IS the precedence: *"stop at the
 * first of"*.
 */
export const STOPPING_RULES: readonly StoppingRule[] = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"]

/** One rule this module does not decide, and why it does not. */
export interface UntestedRule {
  readonly rule: StoppingRule
  readonly why: string
}

/**
 * **THE RULES THIS MODULE DOES NOT TEST, STATED AS DATA SO A RUN CAN REPORT
 * THEM.**
 *
 * *"A skipped check must never look like a passing one."* `Q6` is the one, and
 * it is here rather than implemented as a predicate over a signature list
 * nothing ever appends to - because a rule that can never fire reads exactly
 * like a rule that was tested and did not, which is a defect this plan has
 * caught three times.
 */
export const UNTESTED_IN_CORE: readonly UntestedRule[] = [
  {
    rule: "Q6",
    why:
      "Q6 stops a run whose CANDIDATE FAILURES repeat, and its signature is the failing hard-" +
      "constraint names, the floating parts and the CUT_CONFLICT positions - all three of which " +
      "exist only in a graded dump, behind the tools/ boundary lib/stripboard/ may not cross. " +
      "The core also has no failure to sign: the search's acceptance rule never admits a " +
      "candidate violationsOf rejects, and an unsound start is refused rather than climbed " +
      "from, so signatureOf's own stop-nothing-to-sign condition holds for every candidate this " +
      "loop ever holds. IT IS NOT DEFAULTED TO never-fires: Q6 is decided by " +
      "tools/stripboard/stop.ts over the pipeline's graded candidates, and a run through the " +
      "core reports it as untested so that its silence is not read as evidence.",
  },
]

/**
 * The thresholds and the floor the six rules read. **Every one is a parameter.**
 */
export interface StoppingParameters {
  /**
   * `C_floor = max(0, N - R)` for this board, which `Q1`, `Q2` and `Q4` read.
   *
   * A PARAMETER, because `tools/stripboard/targets.ts` is the one owner of the
   * derivation and is behind the boundary. A second spelling here would be two
   * places for one board's floor to come out differently.
   */
  readonly cutFloor: number
  /** `K4`'s `tau`. `null` is UNSET - the owner's decision - and `Q2` then does not fire. */
  readonly tau: number | null
  /** `Q4`'s `k`, the diminishing-returns ratio. A labelled hypothesis. */
  readonly yieldFloor: number
  /** `Q5`'s run-level evaluation cap - a backstop against a looping bug, not a target. */
  readonly evaluationCap: number
  /** `Q6`'s run length. Carried so a caller's rules object is complete; not read here. */
  readonly signatureRun: number
}

/**
 * The counters the rules read. **Every field is a count the search kept**, never
 * a figure derived here from a board.
 */
export interface RunCounters {
  /**
   * One entry per climb, in the order the climbs ran: that climb's best `F`.
   *
   * The first entry is `F_0`, the objective the run started from. `Q4`'s
   * improvement per climb is read off consecutive entries, which is what makes
   * it *"measured across at least one restart, never within a climb"*.
   */
  readonly climbHistory: readonly number[]
  /** One entry per climb: the evaluations it spent. Same length as `climbHistory`. */
  readonly climbEvaluations: readonly number[]
  /** `Q5`'s counter: evaluations spent by the RUN, which restarts share. */
  readonly runEvaluations: number
  /** How many starts of the reviewed list are still unspent. `Q3` needs zero. */
  readonly startsRemaining: number
  /**
   * How many moves the most recent FULL SWEEP of the move set accepted, or
   * `undefined` when there has not been one.
   *
   * **`undefined` IS LOAD BEARING AND IS NOT AN ABSENT COUNT.** `Q3` is
   * *"every seed's climb has reached a full sweep of the move set ... that
   * produced no accepted move"*, so the two states that are NOT a full sweep
   * must be distinguishable from a sweep that found nothing: before a climb's
   * first round there is no round to report, and a round the evaluation cap cut
   * short examined part of the move set. Both read as `0` in a plain `number`,
   * and `Q3` would then report a search exhausted that never ran - or, worse,
   * fire ahead of `Q5` on a budget-truncated round and report *these moves from
   * these seeds did not find better* about moves nobody looked at.
   */
  readonly acceptedThisRound: number | undefined
}

/** The candidate a stop is decided about, priced and with its cuts derived once. */
export interface Scored {
  readonly candidate: Candidate
  readonly cuts: readonly Cut[]
  readonly objective: number
}

/** `A1`-`A4` for the candidate `Q1` or `Q2` is about, supplied by the caller. */
export type Admissible = (candidate: Candidate, cuts: readonly Cut[]) => boolean

export type StopRefusal =
  | "search-stop-counters-malformed"
  | "search-stop-bridge-without-join"
  | "search-stop-negative-gap"
  | "search-stop-taxonomy-incomplete"

function notDefaultedBecause(refusal: StopRefusal): string {
  switch (refusal) {
    case "search-stop-counters-malformed":
      return (
        "Q4 is measured ACROSS climbs, so a per-climb improvement needs that climb's own " +
        "evaluation count beside its own best F, and the tolerance's denominator is F_0, the " +
        "first climb's figure. A missing or non-positive counter is NOT defaulted and NOT " +
        "skipped: a rate computed from an invented denominator is a stopping decision made on a " +
        "number nobody measured, and a rule that quietly declines to fire looks exactly like " +
        "one that fired false. Build the counters in lib/stripboard/search.ts, which appends to " +
        "both arrays together at a climb's end."
      )
    case "search-stop-bridge-without-join":
      return (
        "At the floor kappa = 0, so no net is split and there is no join for a bridge to " +
        "supply: CRITERIA Q1 states that B = 0 FOLLOWS rather than being assumed, and this is " +
        "where it is read rather than assumed. A bridge on a board with J = 0 means one of the " +
        "two numbers is not the quantity it claims to be, so it is refused rather than reported " +
        "as an at-floor stop carrying a bridge nobody can account for. Check the candidate's " +
        "bridges against its derived cuts and its occupied strips."
      )
    case "search-stop-negative-gap":
      return (
        "C_floor is a LOWER bound (CRITERIA K5), so a candidate beneath it is not an " +
        "unexpectedly good result - it is proof that the floor, the scorer or the cut " +
        "derivation is not the quantity it claims to be. It is not clamped to zero, which would " +
        "convert the evidence into a stop: a negative remaining gap makes Q4's projection " +
        "meaningless. Check the cutFloor handed in against tools/stripboard/targets.ts's " +
        "derivation for this board."
      )
    case "search-stop-taxonomy-incomplete":
      return (
        "CRITERIA section 5 says STOP AT THE FIRST OF Q1-Q6, so the order IS the precedence - a " +
        "rule missing from the order is never tested, and a run that stopped on a later rule " +
        "reports a weaker bound than the one it earned. Every rule must be either decided by " +
        "the RULES table in this file or listed in UNTESTED_IN_CORE with its reason, and no " +
        "rule may be in both. It is refused rather than tested over what is left, because a " +
        "taxonomy with a hole in it is the shape of failure this file exists to prevent."
      )
  }
}

export function refuse(refusal: StopRefusal, offending: string): never {
  throw new Error(
    `${refusal}: ${offending}. ${notDefaultedBecause(refusal)} ` +
      "(CRITERIA section 5 and REP1 are the authority; tools/stripboard/stop.ts is the same " +
      "taxonomy over a graded dump, and lib/stripboard/search-stop.ts is this one over a " +
      "Candidate.)",
  )
}

/** What every rule is handed. One object, so adding a rule cannot change six signatures. */
interface StopInput {
  readonly counters: RunCounters
  readonly best: Scored
  readonly reference: ReferenceNets
  readonly parameters: StoppingParameters
  readonly admissible: Admissible
}

/**
 * `S_occ`: how many distinct strips hold a LEAD.
 *
 * **LEADS ONLY, which is `occupiedStrips`'s definition in
 * `tools/stripboard/targets.ts` and not a looser reading of it** - that function
 * counts the dump's `PIN` rows, and a `WIRE` end or a `SOLDER` blob is not a
 * pin. A strip carrying only a wire end therefore does not count, in both
 * implementations, and `J = C - N + S_occ` is the identity both are plugged
 * into.
 */
function occupiedStrips(candidate: Candidate): number {
  const strips = new Set<number>()
  for (const placement of candidate.placements) {
    for (const hole of placement.pins.values()) strips.add(hole.strip)
  }
  return strips.size
}

/** `g = F - C_floor`: the gap the derived floor says provably remains. */
function gapToFloor(input: StopInput): number {
  const gap = input.best.objective - input.parameters.cutFloor
  if (gap < 0) {
    refuse(
      "search-stop-negative-gap",
      `this candidate scores F = ${input.best.objective} against a declared floor of ` +
        `${input.parameters.cutFloor}`,
    )
  }
  return gap
}

/**
 * `Q1`: at the floor, and admissible.
 *
 * CRITERIA's conditions verbatim: *"`C = C_floor` and `W = 0`; equivalently
 * `kappa = 0`, `S_occ = min(N, R)`, `W = 0`"*. `J === 0` is `kappa === 0`
 * without the division, which matters because `kappa = J/(P - N)` is undefined
 * on a board with `P = N` and a stopping rule may not refuse one.
 *
 * **`significantContacts` IS RUN FOR ITS REFUSALS BEFORE `S_occ` IS READ.** A
 * pin on two reference nets, a wire carrying a net no pin reaches and a contact
 * off the stock are all refused there, by name, in the module that owns those
 * messages - and `Q1` is the one optimality claim this project may make, so it
 * may not be made about a board whose own contacts are inconsistent.
 */
function q1(input: StopInput): boolean {
  const candidate = input.best.candidate
  significantContacts(candidate, input.reference)
  const cuts = input.best.cuts.length
  const netCount = input.reference.size
  const occupied = occupiedStrips(candidate)
  const joins = cuts - netCount + occupied
  const atFloor =
    cuts === input.parameters.cutFloor &&
    candidate.wires.length === 0 &&
    joins === 0 &&
    occupied === Math.min(netCount, candidate.grid.strips)
  if (!atFloor) return false
  if (candidate.bridges.length > 0) {
    refuse(
      "search-stop-bridge-without-join",
      `this candidate is at its floor with J = 0 and carries ${candidate.bridges.length} ` +
        "solder bridge(s)",
    )
  }
  return input.admissible(candidate, input.best.cuts)
}

/**
 * `Q2`: within `tau` of the floor, and admissible.
 *
 * IT COMPUTES NO TOLERANCE OF ITS OWN, exactly as
 * `tools/stripboard/stop.ts`'s does not: `A3` **is** `K4`'s tolerance and is one
 * of admissibility's four conditions, so *"within tolerance of the floor, and
 * admissible"* is *admissible, with a `tau` set*. Two readings of one formula
 * would be two places for the gap to come out differently on one board - and
 * here the second would be on the wrong side of the boundary from the first.
 *
 * **SO A CALLER WHOSE `admissible` DOES NOT IMPLEMENT `A3` GETS A `Q2` THAT IS
 * NOT CRITERIA'S**, and a run that sets `tau` must say which predicate it
 * handed in. The committed rules file carries `tau: null`, under which `Q2`
 * does not fire at all - CRITERIA's stated behaviour and not a missing branch.
 */
function q2(input: StopInput): boolean {
  if (input.parameters.tau === null) return false
  return input.admissible(input.best.candidate, input.best.cuts)
}

/**
 * `Q3`: a round accepted nothing AND the start list is spent. Both, or it is a
 * restart trigger rather than a stop.
 *
 * **IT CANNOT VERIFY THE CLAUSE IT DEPENDS ON, AND THAT OBLIGATION IS STATED
 * HERE RATHER THAN LEFT IMPLICIT.** CRITERIA requires *"a full sweep of the
 * move set that produced no accepted move"*, and `acceptedThisRound` is a count
 * with nothing in it that says what was swept. What makes the clause true is
 * `lib/stripboard/search.ts`'s own definition of a round: every proposal
 * `movesFrom` returned for the incumbent, considered once. A caller that counted
 * a partial sweep into this field would report a search exhausted that had not
 * been, and nothing here would catch it.
 */
function q3(input: StopInput): boolean {
  return input.counters.acceptedThisRound === 0 && input.counters.startsRemaining === 0
}

/** One climb-to-climb step: what the restart won, and what it cost. */
interface ClimbStep {
  readonly improvement: number
  readonly evaluations: number
}

function climbSteps(counters: RunCounters): readonly ClimbStep[] {
  if (counters.climbEvaluations.length !== counters.climbHistory.length) {
    refuse(
      "search-stop-counters-malformed",
      `these counters carry ${counters.climbHistory.length} climb objective(s) and ` +
        `${counters.climbEvaluations.length} climb evaluation count(s)`,
    )
  }
  const steps: ClimbStep[] = []
  for (let index = 1; index < counters.climbHistory.length; index += 1) {
    const previous = counters.climbHistory[index - 1] ?? 0
    const current = counters.climbHistory[index] ?? 0
    const evaluations = counters.climbEvaluations[index] ?? 0
    if (evaluations <= 0) {
      refuse(
        "search-stop-counters-malformed",
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
 * never within a climb"*, and the stripboard pipeline plan's reading is that two
 * CONSECUTIVE steps are required, *"so one is not enough"*. Improvement here is
 * bursty - a climb goes flat and then drops sharply after a restart - so one
 * flat step is the condition the restarts exist to leave rather than evidence
 * the search is done. The same two as `tools/stripboard/stop.ts`'s
 * `REQUIRED_STEPS`, and recorded in both because they are one reading of one
 * sentence rather than a constant with two users.
 */
const REQUIRED_STEPS = 2

/**
 * `Q4`: finishing would cost more than the search already has - `g/r > k*e`
 * over the last two climb steps.
 *
 * `r <= 0` IS NOT A DIVISION TO AVOID BUT THE STRONGEST CASE OF THE RULE: a
 * restart that won nothing projects an unbounded cost to close a gap that
 * remains, so the condition holds. `g === 0` is the opposite and holds for
 * nothing: there is no gap left to project a cost against.
 *
 * `e` IS THE RUN'S SPEND, summed over the climbs, not the last climb's - a
 * restart legitimately resumes progress, so resetting the counter is correct;
 * hiding that the run as a whole has stalled is not.
 */
function q4(input: StopInput): boolean {
  const steps = climbSteps(input.counters)
  if (steps.length < REQUIRED_STEPS) return false
  const gap = gapToFloor(input)
  if (gap === 0) return false
  const spent = input.counters.climbEvaluations.reduce((total, count) => total + count, 0)
  const budget = input.parameters.yieldFloor * spent
  return steps.slice(-REQUIRED_STEPS).every((step) => {
    if (step.improvement <= 0) return true
    return gap / (step.improvement / step.evaluations) > budget
  })
}

/** `Q5`: the run-level cap is spent. Run-level, so a restart cannot grant itself more. */
function q5(input: StopInput): boolean {
  return input.counters.runEvaluations >= input.parameters.evaluationCap
}

/**
 * The rules this module DECIDES, keyed by id so the table cannot lose one.
 *
 * `Q6` is absent on purpose and `UNTESTED_IN_CORE` says why; `assertTaxonomy`
 * below is what makes that absence a declaration rather than a gap.
 */
const RULES: Readonly<Record<Exclude<StoppingRule, "Q6">, (input: StopInput) => boolean>> = {
  Q1: q1,
  Q2: q2,
  Q3: q3,
  Q4: q4,
  Q5: q5,
}

/**
 * The decided rules and the declared-untested ones together cover `Q1`-`Q6`
 * exactly, with no rule in both.
 *
 * **IT TAKES ITS LISTS AS ARGUMENTS SO IT CAN BE SHOWN TO FAIL**, following
 * `assertOrderCoversTable` in `tools/stripboard/stop-model.ts`, whose own
 * equivalent in `tools/stripboard/grade.ts` reads its own table and is therefore
 * a guard no test can reach.
 */
export function assertTaxonomy(
  order: readonly string[],
  decided: readonly string[],
  untested: readonly string[],
): void {
  const covered = [...decided, ...untested].sort()
  const expected = [...order].sort()
  const both = decided.filter((rule) => untested.includes(rule))
  if (
    both.length > 0 ||
    covered.length !== expected.length ||
    covered.some((rule, index) => rule !== expected[index])
  ) {
    refuse(
      "search-stop-taxonomy-incomplete",
      `the stopping order is [${order.join(", ")}], the decided rules are ` +
        `[${decided.join(", ")}] and the declared-untested rules are [${untested.join(", ")}]` +
        (both.length > 0 ? `, with [${both.join(", ")}] in both` : ""),
    )
  }
}

/**
 * The FIRST rule that fires, in `Q1`-`Q6` order, or `null` while the search may
 * continue.
 *
 * `null` IS NOT A VERDICT AND NEITHER IS A RULE ID. A stop says the run is over;
 * whether the board can be built is the grader's answer from the same
 * candidate - `tools/stripboard/verdict.ts` in the pipeline, and the
 * `admissible` predicate's own business here.
 */
export function evaluateStop(
  counters: RunCounters,
  best: Scored,
  reference: ReferenceNets,
  parameters: StoppingParameters,
  admissible: Admissible,
): StoppingRule | null {
  assertTaxonomy(
    STOPPING_RULES,
    Object.keys(RULES),
    UNTESTED_IN_CORE.map((entry) => entry.rule),
  )
  const input: StopInput = { counters, best, reference, parameters, admissible }
  for (const rule of STOPPING_RULES) {
    const decide = rule === "Q6" ? undefined : RULES[rule]
    if (decide !== undefined && decide(input)) return rule
  }
  return null
}
