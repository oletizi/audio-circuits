/**
 * `Q1`-`Q6`'s VOCABULARY: the six rule ids, the counters they read, the failure
 * signature `Q6` compares, and every refusal the stopping rules raise.
 *
 * **SPLIT FROM `./stop.ts` FOR THE LINE CEILING, AT THE SEAM THAT FILE ALREADY
 * HAD**: this one answers *what is a stop stated in terms of* and that one
 * answers *does this run stop*. The same division as `./constraints-model.ts` /
 * `./constraints.ts` and `./climb-evaluate.ts` / `./climb.ts`. `./stop.ts`
 * stays the module the plan names and re-exports everything here, so the plan's
 * declared interface is unchanged and no consumer imports this file directly.
 *
 * **EVERY CLAIM ABOUT WHY THE RULES ARE SHAPED AS THEY ARE LIVES IN
 * `./stop.ts`'s MODULE COMMENT** - what `Q1` and `Q2` require, why `Q2` cannot
 * be completed until `A2` exists, and why no threshold is written in code. One
 * place, not two.
 */
import type { BoardDump } from "../guide/dump.ts"
import type { ConstraintResult } from "./grade.ts"
import type { BoardTargets } from "./targets.ts"

/** The six reasons a run stops, in the order they are tested. */
export type StoppingRule = "Q1" | "Q2" | "Q3" | "Q4" | "Q5" | "Q6"

/**
 * `Q1`-`Q6` in CRITERIA's own order, which IS the precedence: *"stop at the
 * first of"*. The array is the order and `./stop.ts`'s table is the lookup;
 * `assertOrderCoversTable` checks them against each other.
 */
export const STOPPING_RULES: readonly StoppingRule[] = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"]

/**
 * The counters the six rules read. **Every field is a count the search kept,
 * never a figure derived here from a board.**
 */
export interface StopState {
  /**
   * One entry per climb, in the order the climbs ran: that climb's best `F`.
   *
   * The first entry is `F_0`, the objective the run started from, which is the
   * floor tolerance's denominator. `Q4`'s improvement per climb is read off
   * consecutive entries, which is what makes it *"measured across at least one
   * restart, never within a climb"*.
   */
  readonly climbHistory: readonly number[]
  /** One entry per climb: the evaluations it spent. Same length as `climbHistory`. */
  readonly climbEvaluations: readonly number[]
  /** `Q5`'s counter: evaluations spent by the RUN, which restarts share. */
  readonly runEvaluations: number
  /** How many seeds of the reviewed list are still unspent. `Q3` needs zero. */
  readonly seedsRemaining: number
  /** Every failure signature the run has recorded, in order, ACROSS restarts. */
  readonly signatures: readonly string[]
  /** How many moves the most recent round accepted. `Q3` needs zero. */
  readonly acceptedThisRound: number
}

/**
 * `Q6`'s failure signature: *"the failing check names, the floating parts, the
 * `CUT_CONFLICT` positions"*.
 */
export interface FailureSignature {
  /** The ids of the hard constraints that did NOT hold, sorted. */
  readonly failedChecks: readonly string[]
  /** Every part the dump reports as `FLOATING`, by ref, sorted. */
  readonly floating: readonly string[]
  /**
   * The `CUT_CONFLICT` positions.
   *
   * **ALWAYS EMPTY TODAY, AND SAYING SO IS THE POINT.** The fork emits a
   * `CUT_CONFLICT` line only under `CUT_STATE UNRESOLVED`
   * (`tools/perfboard/cut-state.ts`), and `parseBoardDump` does not carry those
   * lines into a `BoardDump` at all - so on a `COMPUTED` dump there are none to
   * report, and on any other state `signatureOf` refuses rather than returning
   * an empty list that would read as *no conflicts*.
   */
  readonly cutConflicts: readonly string[]
}

/**
 * Every refusal the stopping rules raise, as a union rather than loose strings
 * so the `switch` below proves each has a reason: add a member without an arm
 * and `bun run typecheck` fails. The same device as `ScoreRefusal`'s in
 * `./score.ts`.
 */
export type StopRefusal =
  | "stop-counters-malformed"
  | "stop-rules-malformed"
  | "stop-bridge-without-join"
  | "stop-negative-gap"
  | "stop-tolerance-needs-a2"
  | "stop-nothing-to-sign"
  | "stop-cut-conflicts-unavailable"

/** One statement per refusal: what is missing, where to fix it, and why it is not defaulted. */
function notDefaultedBecause(refusal: StopRefusal): string {
  switch (refusal) {
    case "stop-counters-malformed":
      return (
        "Q4 is measured ACROSS climbs, so a per-climb improvement needs that climb's own " +
        "evaluation count beside its own best F, and the floor tolerance's denominator is F_0, " +
        "the first climb's figure. A missing or non-positive counter is NOT defaulted and NOT " +
        "skipped: a rate computed from an invented denominator is a stopping decision made on " +
        "a number nobody measured, and a rule that quietly declines to fire looks exactly like " +
        "one that fired false. Build the StopState from search()'s RunResult in " +
        "tools/stripboard/search.ts, which keeps both arrays one entry per climb."
      )
    case "stop-rules-malformed":
      return (
        "Q6 stops on a REPEATED failure, so its run length is at least two - one signature " +
        "compared with nothing stops the run on the first failure of any kind. " +
        "tools/stripboard/rules.ts enforces that range when it LOADS the file, so reaching " +
        "this means a caller built a StripboardRules by hand. It is not clamped: a run length " +
        "this module repaired would be a parameter the reviewed file does not carry."
      )
    case "stop-bridge-without-join":
      return (
        "At the floor kappa = 0, so no net is split and there is no join for a derived bridge " +
        "to supply: CRITERIA Q1 states that B = 0 FOLLOWS rather than being assumed, and this " +
        "is where it is read rather than assumed. A bridge counted on a board with J = 0 means " +
        "one of the two numbers is not the quantity it claims to be, so it is refused rather " +
        "than reported as an at-floor stop carrying a bridge nobody can account for. Check the " +
        "SOLDER lines in the candidate's dump against its CUT and NODE lines."
      )
    case "stop-negative-gap":
      return (
        "F_floor is a LOWER bound (CRITERIA K5), so a candidate beneath it is not an " +
        "unexpectedly good result - it is proof that the floor derivation, the scorer or the " +
        "dump is not the quantity it claims to be. tools/stripboard/score.ts refuses it first " +
        "and is the primary reading; this is the same condition arriving at the stop boundary, " +
        "where a negative remaining gap makes Q4's projection meaningless and Q2's tolerance " +
        "pass with room to spare. It is not clamped to zero, which would convert the evidence " +
        "into a stop."
      )
    case "stop-tolerance-needs-a2":
      return (
        "Q2 is a SUCCESSFUL TERMINATION and may not fire on an inadmissible candidate, and A1 " +
        "alone is not that guard: kappa and the floor tolerance are differently normalised, so " +
        "A2 can fail while the tolerance holds - which is CRITERIA section 5's worked case and " +
        "the reason Q2 requires admissibility at all. A2 (kappa <= kappa_bench, CRITERIA K2) " +
        "belongs to tools/stripboard/verdict.ts, which does not exist yet: Task 20 of the " +
        "stripboard pipeline plan under docs/superpowers/plans/ creates it. It is NOT " +
        "approximated by A1 here and no local kappa comparison is written here, because a " +
        "second copy of an admissibility condition is what R2 forbids and what makes two " +
        "verdicts possible for one board. Fix: land Task 20 and have Q2 consult its " +
        "admissibility result. Until then set no tau - which is the owner's own position (K4)."
      )
    case "stop-nothing-to-sign":
      return (
        "Q6's signature is a FAILURE signature: it stops a run whose failures repeat. A " +
        "candidate with every hard constraint held and no floating part has no failure to " +
        "sign, and signing it anyway would produce one identical empty signature per healthy " +
        "candidate - so three consecutive SUCCESSES would stop the run reporting a systematic " +
        "cause. It is refused rather than returned empty because the caller's mistake is " +
        "recording a signature for a candidate that did not fail. Record one only for a " +
        "candidate whose grade has a failing check or whose dump has a floating part."
      )
    case "stop-cut-conflicts-unavailable":
      return (
        "A CUT_CONFLICT position exists only in the raw dump TEXT, under CUT_STATE UNRESOLVED " +
        "(tools/perfboard/cut-state.ts reads those lines), and parseBoardDump does not carry " +
        "them into a BoardDump - so on an unresolved board this signature would silently omit " +
        "the third of its three parts. It is not reported as an empty list, because an empty " +
        "list reads as NO conflicts and would make two different boards share a signature. " +
        "Note that tools/stripboard/score.ts refuses an unresolved candidate first (HC2), so " +
        "no evaluated candidate reaches here and a caller that hand-built the dump did. Fix: " +
        "carry the lines in tools/guide/dump-model.ts's BoardDump, or sign a COMPUTED dump."
      )
  }
}

export function refuse(refusal: StopRefusal, offending: string): never {
  throw new Error(
    `${refusal}: ${offending}. ${notDefaultedBecause(refusal)} ` +
      "(CRITERIA section 5 and REP1 are the authority, and tools/stripboard/stop.ts is the " +
      "only implementation of Q1-Q6.)",
  )
}

/**
 * What a report prints beside any figure derived from the strip count.
 *
 * IT EXISTS BECAUSE `evaluateStop` RETURNS A RULE ID AND NOTHING ELSE, so a
 * `Q1` stop cannot carry its own caveat. `C_floor = max(0, N - R)` takes `R`
 * from today's stock, so the floor a run was judged against is a fact about a
 * purchase rather than a property of the circuit, and the owner's rule over
 * every dimension is quoted rather than paraphrased.
 */
export function floorNote(targets: BoardTargets): string {
  return (
    `${targets.board}: C_floor = max(0, N - R) = ${targets.cutFloor} cuts, from N = ` +
    `${targets.netCount} nets and R = ${targets.strips} strips. R IS TODAY'S STOCK AND THE ` +
    'FLOOR IS PROVISIONAL WITH IT - the owner, verbatim: "I may, at any time, decide to change ' +
    'the dimensions of any board at any time. The dimensions are ALWAYS provisional" (CRITERIA ' +
    "section 2). An at-floor stop is optimal against this R and says nothing about another."
  )
}

/**
 * `Q6`'s signature for one candidate, as a string so a run can compare and
 * record it without keeping a parsed object per evaluation.
 *
 * EVERY LIST IS SORTED, because the signature's job is to be EQUAL across two
 * candidates that failed the same way, and the order a grader happens to return
 * its results in is not part of how a board failed.
 */
export function signatureOf(results: readonly ConstraintResult[], dump: BoardDump): string {
  if (dump.cutState !== "COMPUTED") {
    refuse(
      "stop-cut-conflicts-unavailable",
      `this candidate's dump reports CUT_STATE ${dump.cutState}, which is not COMPUTED`,
    )
  }
  const failedChecks = results.filter((result) => !result.held).map((result) => result.id).sort()
  const floating = dump.parts
    .filter((part) => part.placement === "floating")
    .map((part) => part.ref)
    .sort()
  if (failedChecks.length === 0 && floating.length === 0) {
    refuse(
      "stop-nothing-to-sign",
      `this candidate has no failing check among the ${results.length} given, and no floating part`,
    )
  }
  const signature: FailureSignature = { failedChecks, floating, cutConflicts: [] }
  // Field by field rather than JSON.stringify of the object, so the string's
  // shape is fixed here and cannot change with a field's declaration order.
  return [
    `checks=${signature.failedChecks.join(",")}`,
    `floating=${signature.floating.join(",")}`,
    `conflicts=${signature.cutConflicts.join(",")}`,
  ].join(" ")
}

/**
 * The order and the rule table, checked against each other BEFORE anything is
 * decided - the same guard `./grade.ts` puts in front of `A1`'s fold: an order
 * that lost an entry would silently never test that rule, and a run that
 * stopped on `Q5` where `Q2` held reports the weakest statement available in
 * place of a successful termination.
 *
 * **IT TAKES BOTH LISTS AS ARGUMENTS RATHER THAN READING THEM**, so it can be
 * shown to fail. `./grade.ts`'s equivalent reads its own table and is therefore
 * unreachable without an edit, which makes it a guard no test covers; this one
 * is reachable, and `tests/stripboard/stop.test.ts` drives a short order and a
 * reordered one through it.
 */
export function assertOrderCoversTable(order: readonly string[], keys: readonly string[]): void {
  if (keys.length !== order.length || keys.some((key, index) => key !== order[index])) {
    throw new Error(
      `the stopping order is [${order.join(", ")}] and the rule table is [${keys.join(", ")}].` +
        "\nThis refuses rather than testing what is left: CRITERIA section 5 says STOP AT THE " +
        "FIRST OF Q1-Q6, so the order IS the precedence - a rule missing from the order is " +
        "never tested, and a run that stopped on a later rule reports a weaker bound than the " +
        "one it earned. Fix tools/stripboard/stop.ts's STOPPING_RULES or its RULES table.",
    )
  }
}
