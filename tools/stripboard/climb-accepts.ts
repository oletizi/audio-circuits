/**
 * THE ACCEPTANCE RULE: the one place a candidate is accepted or rejected, and
 * the one definition of "strictly better".
 *
 * **SPLIT FROM `./climb.ts` FOR THE LINE CEILING, AT THE SEAM THE TASK 17 BRIEF
 * ITSELF DREW**: *"`accepts` is exported so the acceptance rule is testable
 * without a spawn"*. This file answers *do we take this candidate* and
 * `./climb.ts` answers *what do we sweep, and how many did we try*. The same
 * division as `./climb-evaluate.ts`, `./moves-apply.ts` and
 * `./moves-cluster.ts`. `./climb.ts` stays the module the plan names and
 * re-exports this one, so no consumer imports it directly and the plan's
 * declared interface is unchanged.
 *
 * **THE ONE PROPERTY THIS DESIGN RESTS ON: A RANKING TERM CANNOT MAKE THE CLIMB
 * ACCEPT A WORSE `F`.** `./rank.ts`'s own comment states it from the other side
 * - *"a smaller `A_occ` never licenses keeping a candidate `F` would otherwise
 * reject"* - and `strictlyBetter` below is where it is true or false. The tuple
 * is consulted ONLY on `ΔF = 0`, so no value of any ranking term is ever
 * compared against a change in `F`. If
 * `tests/stripboard/climb-accepts.test.ts`'s first test ever passes while `F`
 * rose, the search is optimising something nobody authorised, and `A_occ` - the
 * occupied board AREA - would have become an objective by the back door.
 *
 * **THE ACCEPTANCE RULE HERE IS NO-REGRESSION, AND THE DOCUMENTS SAY "REJECT ON
 * ANY HARD-CONSTRAINT FAILURE".** This module departs from them deliberately,
 * the departure is recorded in `docs/superpowers/plans/
 * 2026-10-10-stripboard-pipeline.md` under *"Deviations from the specs"* with
 * its reasoning and what would close it, and `accepts`' own comment carries the
 * measured deadlock that forced it. The resolution is NOT to revert the rule.
 */
import type { ConstraintResult } from "./constraints-model.ts"
import type { Evaluation } from "./climb-evaluate.ts"
import { a1 } from "./grade.ts"
import { compareRanking } from "./rank.ts"
import type { StripboardRules } from "./rules.ts"

/**
 * Whether the climb accepts `input.candidate`.
 *
 * **EXPORTED SO THE ACCEPTANCE RULE IS TESTABLE WITHOUT A SPAWN**, which is the
 * whole reason it is a function and not three lines inside the loop: the
 * property this module rests on is a property of this rule, and a rule only
 * reachable through four fork invocations is a rule nobody asserts directly.
 *
 * THE ORDER OF THE CLAUSES IS THE RULE AND NOT A STYLE:
 *
 * 1. **NO REGRESSION, against the PREDECESSOR: a candidate that BREAKS a
 *    constraint which held on the board the move was applied to is rejected,
 *    before `F` is looked at at all.** Putting this clause after the `ΔF` test
 *    is precisely the mutation that would let a cheap broken candidate through,
 *    and measuring it against the INCUMBENT instead is the bug
 *    `AcceptanceInput.predecessor` exists to name. **`E3`'s bound does not
 *    weaken it**: a bounded worse-acceptance buys a worse `F` and never a
 *    broken constraint.
 * 2. **`ΔF` decides against the INCUMBENT, and the ranking is consulted only at
 *    `ΔF = 0`.** That is `strictlyBetter`.
 * 3. **`E3`, LAST AND ONLY WHEN A BOUND IS CONFIGURED: a candidate worse by at
 *    most the bound is accepted.** It is an additional clause and not a
 *    replacement, so a configured bound changes nothing about clauses 1 and 2 -
 *    the plateau move stays free and a regression still rejects.
 *
 * **WHY NO-REGRESSION AND NOT `A1`, WHICH IS A CORRECTION TO THIS RULE'S FIRST
 * VERSION AND IS RECORDED RATHER THAN TIDIED AWAY.** The rule was `if
 * (!candidate.admissibleA1) return false`, which is the plan's acceptance
 * mechanics read literally, and it DEADLOCKS: `HC1` is a board-level predicate,
 * every starting arm begins from a board with incomplete nets (`./seed.ts`: 19,
 * 13, 7 and 6 on mid, hi-boost, hi-cut and low-cut), `A1` is the conjunction of
 * all ten, and no single gesture flips the conjunction from false to true unless
 * it happens to be the very last repair needed - which is unreachable when
 * nothing before it was accepted. Every round reports `acceptedPerRound: [0]`,
 * and with `Q3` treating a barren round as a restart trigger the whole search
 * degenerates into trying each seed once and declaring itself exhausted.
 *
 * CRITERIA uses `A1` to classify the OUTCOME - its *"valid, below target"* row
 * is `A1` holding with an optimisation target unmet - and **nowhere requires an
 * intermediate step to satisfy it.** So "reject on any hard-constraint failure"
 * was the plan's own mechanics rather than a criteria clause, and the correction
 * leaves what counts as an acceptable LAYOUT untouched: an inadmissible board
 * still cannot be adopted, because Task 24's gate has its own `failing-check`
 * refusal, and `ClimbResult.best.admissibleA1` reports plainly whether the climb
 * ended admissible.
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
   * It is the incumbent and not the predecessor, so a strict acceptance only
   * ever improves on it: comparing `F` against the base instead would accept a
   * sibling that beat the base while losing to a sibling already accepted this
   * round. **Under `E3` the incumbent can get worse**, which is the escape doing
   * its job - and `ClimbResult.best` is a separate record for exactly that
   * reason (`./climb.ts`).
   */
  readonly incumbent: Evaluation
  readonly candidate: Evaluation
}

/**
 * Whether `candidate` beats `incumbent` on `F`, or ties it with a strictly
 * better ranking tuple.
 *
 * **ONE DEFINITION OF BETTER, READ IN THREE PLACES**: this rule's own `ΔF`
 * clause, `climb`'s record of the best candidate it saw, and `search`'s choice
 * of the best across climbs. Two definitions would let a run report a best
 * board its own acceptance rule would have rejected.
 *
 * A tie on every one of `RANKING`'s five positions is NOT an improvement:
 * accepting it would let the climb swap one layout for an equivalent one forever
 * and report a round that accepted something while nothing got better.
 */
export function strictlyBetter(candidate: Evaluation, incumbent: Evaluation): boolean {
  const delta = candidate.score.objective - incumbent.score.objective
  if (delta < 0) return true
  if (delta === 0) return compareRanking(candidate.ranking, incumbent.ranking) < 0
  return false
}

export function accepts(input: AcceptanceInput, rules: StripboardRules): boolean {
  const { predecessor, incumbent, candidate } = input
  requireSelfConsistent(predecessor, "the board this move was applied to")
  requireSelfConsistent(incumbent, "the best candidate so far")
  requireSelfConsistent(candidate, "the candidate being considered")

  // CLAUSE 1, BEFORE ANY ARITHMETIC ON F, AND AGAINST THE PREDECESSOR: only the
  // board this move was applied to can say what this move broke. E3's bound does
  // not reach past this clause.
  if (regressions(predecessor, candidate).length > 0) return false

  // CLAUSE 2, AGAINST THE INCUMBENT.
  if (strictlyBetter(candidate, incumbent)) return true

  return acceptsWorse(candidate, incumbent, rules)
}

/**
 * `E3`: a candidate worse than the incumbent by at most the configured bound.
 *
 * **UNCONFIGURED MEANS THE MECHANISM DOES NOT RUN**, which is PIPELINE E3's own
 * instruction and CRITERIA PAR3's: *"nothing in COST, MOVE or this document
 * supplies a schedule, and this document will not invent one. Refuse rather than
 * guess: unconfigured means E3 does not run, stated in the report, not quietly
 * approximated."* `RunResult.worseAcceptanceRan` is where the run states it.
 *
 * **THERE IS NO DRAW, AND THAT IS THE HONEST READING OF A SPEC THAT NAMES A
 * PRNG.** §7.4 says E3's draws come from one seeded PRNG whose algorithm and
 * seed are recorded, and supplies NO SCHEDULE for them to feed: no temperature,
 * no acceptance probability, no cooling. So the bound alone decides, and
 * `accepts` takes no draw. A probability invented here would be exactly the
 * number this pipeline refuses to make up - and a draw parameter that nothing
 * consumed would be worse than none, because it would claim a randomness the
 * rule does not have. `seededPrng` is Task 16's, exported from `./seed.ts`, and
 * is where a reviewed schedule would get its stream when one exists;
 * `tests/stripboard/escapes-search.test.ts` holds both halves of this paragraph.
 *
 * **A BOUND OF 0 IS REFUSED BY THE LOADER AND NOT HERE.** `./rules.ts` states
 * why: a bound of 0 accepts nothing worse and that state already has a spelling
 * (`null`), and two spellings of one state is the ambiguity that file exists to
 * prevent. So this function never sees one.
 *
 * **WHAT A CONFIGURED BOUND COSTS, STATED RATHER THAN DISCOVERED.** An accepted
 * worse candidate makes the round's incumbent worse, so `S3` - a round that
 * accepts nothing - stops firing while the walk keeps finding candidates within
 * the bound, and the climb then ends on the evaluation cap instead. That is the
 * escape working, and the cap is the backstop it works against; the committed
 * rules leave the bound unset, so no run in this repository has done it yet.
 */
function acceptsWorse(
  candidate: Evaluation,
  incumbent: Evaluation,
  rules: StripboardRules,
): boolean {
  const bound = rules.worseAcceptance
  if (bound === null) return false
  const delta = candidate.score.objective - incumbent.score.objective
  return delta > 0 && delta <= bound
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
 * reverse hides an admissible one. `a1` itself refuses a set that is not the ten
 * ids once each, so this also catches a results list with a constraint missing.
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
