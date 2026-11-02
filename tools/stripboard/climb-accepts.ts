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
 *
 * **AND COMPLETENESS IS THE ORDERING'S FIRST KEY, WHICH IS THE SECOND
 * DEPARTURE AND IS RECORDED IN THE SAME PLACE.** `Evaluation.openNets` - the
 * count of nets `--check` calls `incomplete` - is compared before `F` is looked
 * at, and a candidate with fewer open nets is accepted whatever its `F`.
 *
 * **WHY IT IS HERE AND NOT IN `F` OR IN `RANKING`**, which is a reading of
 * CRITERIA rather than a preference:
 *
 * - **NOT IN `F`.** `OBJ1` fixes `F = C + ρ_w·W + ρ_s·B`, *"with `C`, `W` and
 *   `B` the counts of `CUT `, `WIRE` and `SOLDER` lines"*, and `V1` checks
 *   exactly those three counts by a second code path - a fourth term is not a
 *   line count in the dump and would make `F` a different quantity from the one
 *   that is checked. More decisively, a term in `F` is a WEIGHTED term, and a
 *   weight is a price at which an open net may be bought: CRITERIA section 2
 *   says of the ten hard constraints *"nothing in them is tradeable"*, and `A1`
 *   repeats it - *"Nothing is tradeable."* `HC1`'s own reason is the clause
 *   that settles the direction: *"because a board that does not conduct has no
 *   cost worth reporting."* A quantity that must not be traded against the cost
 *   cannot be a term inside it, and a quantity whose absence makes the cost not
 *   worth reporting belongs ABOVE it.
 * - **NOT IN `RANKING`.** `OBJ3` is explicit that *"a ranking term is not a
 *   term in `F`"* and cannot make the search accept a worse one, and
 *   `compareRanking` is consulted only at `ΔF = 0`. A completeness term there
 *   would be unable to buy the single cut that closing a net costs, which is
 *   the measured reason nothing closed: `docs/stripboard/
 *   pipeline-verification.md` §6.9.
 * - **SO: THE FIRST KEY OF THE ACCEPTANCE ORDERING**, which is the one place a
 *   quantity can dominate `F` without being priced against it. It is the same
 *   shape as the no-regression clause above - a hard-constraint fact that
 *   decides before any arithmetic on `F` - and `OBJ2`'s test for a proposed
 *   term is satisfied in the only sense that applies to a key rather than a
 *   term: it is arithmetic on a field the fork prints, with no latitude inside
 *   it.
 *
 * **THE CLIMB STILL TERMINATES, and the lexicographic shape is why.**
 * `openNets` is a count bounded below by zero, and the ordering never accepts a
 * candidate with more of them, so it can strictly fall at most as many times as
 * the board has nets; between two falls the comparison is the old `ΔF`-then-
 * ranking rule, unchanged. `S3` therefore still fires on a round that accepts
 * nothing.
 *
 * **WHAT IT COSTS, STATED RATHER THAN DISCOVERED: `F` IS NO LONGER MONOTONE IN
 * `best`.** A candidate that closes a net at a higher `F` becomes the best, so
 * `ClimbResult.history` can rise at a new best and `climb.ts`'s *"`best` only
 * ever improves"* is now a statement about this ordering and not about `F`
 * alone. That is the change doing its job rather than a side effect: a board
 * that conducts is not a cheaper board, and it is the one being asked for.
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
 * 2. **COMPLETENESS FIRST, THEN `ΔF`, AGAINST THE INCUMBENT, with the ranking
 *    consulted only at `ΔF = 0`.** That is `strictlyBetter`, and the open-net
 *    count is its first key for the CRITERIA reasons in the module comment.
 * 3. **`E3`, LAST AND ONLY WHEN A BOUND IS CONFIGURED: a candidate worse by at
 *    most the bound is accepted.** It is an additional clause and not a
 *    replacement, so a configured bound changes nothing about clauses 1 and 2 -
 *    the plateau move stays free, a regression still rejects, and the bound
 *    buys a worse `F` and never an open net.
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
 * Whether `candidate` beats `incumbent`: fewer open nets, or the same number of
 * them and a better `F`, or the same number and an equal `F` with a strictly
 * better ranking tuple.
 *
 * **ONE DEFINITION OF BETTER, READ IN THREE PLACES**: this rule's own clause,
 * `climb`'s record of the best candidate it saw, and `search`'s choice of the
 * best across climbs. Two definitions would let a run report a best board its
 * own acceptance rule would have rejected - and with completeness in the
 * ordering that is not a theoretical risk: a definition that kept `F` alone
 * would report, as a run's result, a board the run had itself passed over for
 * leaving a net open.
 *
 * **THE OPEN-NET COUNT IS A KEY AND NOT A TERM, so the comparison returns on it
 * outright** - no value of `F` is ever subtracted from, scaled against or
 * compared with a count of open nets anywhere in this file. That is what makes
 * completeness dominate rather than compete, which is the module comment's
 * reading of CRITERIA section 2 and `A1`.
 *
 * A tie on every one of `RANKING`'s five positions is NOT an improvement:
 * accepting it would let the climb swap one layout for an equivalent one forever
 * and report a round that accepted something while nothing got better.
 */
export function strictlyBetter(candidate: Evaluation, incumbent: Evaluation): boolean {
  // THE FIRST KEY, AND IT RETURNS ON ANY DIFFERENCE: fewer open nets is better
  // whatever F does, and MORE open nets is worse whatever F does.
  if (candidate.openNets !== incumbent.openNets) return candidate.openNets < incumbent.openNets
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

  // CLAUSE 2, AGAINST THE INCUMBENT: open nets first, then F, then the ranking.
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
  // THE BOUND IS A BOUND ON `F` AND ON NOTHING ELSE. A candidate reaching here
  // with a DIFFERENT open-net count has already been decided by
  // `strictlyBetter`'s first key - fewer was accepted as clause 2 - so the only
  // case this guard turns away is MORE open nets than the incumbent, and `delta`
  // would be comparing `F` across two boards that are not comparable on it:
  // CRITERIA section 2's "nothing in them is tradeable" is exactly a prohibition
  // on a bound that could buy one. The same reason clause 1 is not weakened by
  // `E3` either.
  if (candidate.openNets !== incumbent.openNets) return false
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
 * must not forbid every move away from it.
 *
 * **A CONSTRAINT THIS MOVE REPAIRS IS NOT AN ACCEPTANCE HERE EITHER - AND FOR
 * `HC1` THAT IS NO LONGER THE END OF THE MATTER.** This function reports
 * regressions and nothing else, so a repair reaches the decision through the
 * ordering rather than through this list. For nine of the ten that ordering is
 * `F` and the ranking, unchanged. For `HC1` it is `strictlyBetter`'s first key,
 * which is a DEGREE of the same fact this function can only see as a boolean:
 * the measured failure was a search that removed six cuts over sixty-three
 * rounds and closed one net of fourteen, because every intermediate board was
 * broken on both sides and nothing else in the rule mentioned completeness
 * (`docs/stripboard/pipeline-verification.md` §6.9). The sentence that stood
 * here - *"`HC1` holding is not itself a cheaper board"* - is true and was the
 * wrong conclusion to draw from it: a board that conducts is not cheaper, it is
 * the one being asked for.
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
 * results, or whose `openNets` disagrees with its own `HC1`.
 *
 * The two could only disagree if something built the record by hand, and the
 * disagreement is not reconcilable from the data: `admissibleA1: true` beside a
 * broken constraint is a board certified against a check that failed, and the
 * reverse hides an admissible one. `a1` itself refuses a set that is not the ten
 * ids once each, so this also catches a results list with a constraint missing.
 *
 * **THE `HC1` HALF IS WHAT KEEPS THE ORDERING'S FIRST KEY HONEST.** Both fields
 * come from one `CheckReport` in `./climb-evaluate.ts`, so a positive
 * `openNets` beside an `HC1` that holds is a record no measurement produced -
 * and it is the record that would make the search's first key disagree with the
 * hard constraint it is a reading of. **The implication is one-directional, and
 * deliberately so:** `HC1` reads the exit status as well as the net lines, so it
 * may fail with no `incomplete` net at all (`./constraints-electrical.ts` names
 * that case), and `openNets: 0` beside a broken `HC1` is therefore a legitimate
 * board rather than an inconsistency.
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
  const hc1 = evaluation.results.find((result) => result.id === "HC1")
  if (evaluation.openNets > 0 && hc1?.held === true) {
    throw new Error(
      `accepts: ${which} (${evaluation.candidate}) records openNets = ${evaluation.openNets} ` +
        "beside an HC1 that HOLDS. Both are readings of one --check report - HC1 requires that " +
        "it name no incomplete net, and openNets is how many it named - so no measurement " +
        "produces this pair. It is not reconciled to either side, because the one that is wrong " +
        "is not in the data, and the acceptance rule's first key is that count: taking it would " +
        "order candidates by a completeness figure the hard constraint contradicts. Build the " +
        "Evaluation through evaluate(), which sets both from one parsed report.",
    )
  }
}
