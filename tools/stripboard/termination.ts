/**
 * **WHAT A RUN RECORDS WHEN NO SEARCH RAN**, and why that is a different type
 * from the six stopping rules rather than a seventh member of them.
 *
 * THE PROBLEM THIS FILE EXISTS FOR, stated as the record it fixes.
 * `./stop-model.ts`'s `StoppingRule` is `Q1`-`Q6` and **every one of the six
 * describes how a SEARCH terminated** - at the floor, within tolerance, with a
 * swept move set that accepted nothing, out of yield, out of budget, on a
 * repeated failure signature. `./materialize-run.ts` performs no search at all
 * (`docs/known-gaps.md` G22: nothing in this repository can propose a move on a
 * materialised board), so every one of the six is false about it. It recorded
 * `Q3` - *"a full sweep of the move set that produced no accepted move, and the
 * seed list spent"* - read over the restart schedule alone, and
 * `assertRuleNotLoadBearing` then refused to write the run directory at all,
 * because a `Q3` beside an `admissible` outcome is a zero exit and CRITERIA
 * `G2.5` would have admitted the board on a clause nothing earned.
 *
 * **SO A RUN THAT SWEPT NO MOVE SET MAY NOW SAY SO, AND SAYING SO IS NOT A
 * STOPPING RULE.** `NO_SEARCH` is not in `STOPPING_RULES`, is not a key of
 * `BOUNDS`, `RUN_FAILURE` or `DECIDED_BY`, and cannot be handed to `boundFor`,
 * `runFailedOn`, `exitCodeFor` or `renderReport` - each of those takes a
 * `StoppingRule` and a `Termination` is not one. **That is the whole mechanism
 * by which this state licenses none of the claims the six rules license**: it
 * is not a weaker entry in those tables, it is absent from them, and the
 * compiler is what keeps it absent. `assertDistinct` below is the runtime half,
 * for the edit that would collapse the two types back together.
 *
 * **IT IS A RECORD AND NOT A DECISION.** `evaluateStop` answers *did this
 * search stop, and on which rule*; a producer that ran no search has no
 * counters to ask it with - `./materialize-run.ts` used to build them, and the
 * `acceptedThisRound: 0` in them was the false claim - so it records `NO_SEARCH`
 * instead of asking. Nothing here decides whether such a run may be adopted:
 * `CRITERIA G2.5` is read through `exitCodeFor(outcome, rule)` over the six, so
 * it has no clause for a run that searched not at all, and **an agent may not
 * author one.** What it is adopted on instead is the owner's call on a render -
 * acceptance channel 4 of
 * `docs/superpowers/specs/2026-10-16-pultec-five-boards-design.md`, recorded
 * per board and per candidate hash in `stripboard/render-approvals.json` and
 * consulted by `./adopt-checks.ts`. Absent such a record this state is still
 * refused. See `NO_SEARCH_NOTE`, which is the sentence that refusal carries, and
 * `docs/known-gaps.md` G21 and G27.
 *
 * **ITS OWN FILE, FOR THE REASON THE TWO TYPES ARE SEPARATE.** The vocabulary
 * could have gone in `./stop-model.ts` beside the six, or in `./report-model.ts`
 * beside the five bound statuses - and in either place a reader meets it as one
 * more entry in a taxonomy, which is exactly the confusion the type split
 * exists to prevent. Here the module's name is the distinction, and
 * `./report-model.ts` is at its line ceiling besides.
 */
import { BOUND_STATUSES, boundFor, type BoundStatus } from "./report-model.ts"
import { STOPPING_RULES, type StoppingRule } from "./stop-model.ts"

/**
 * What a run that performed no search records where a search records its rule.
 *
 * THE VALUE IS A SENTENCE FRAGMENT AND NOT A `Q`-SHAPED ID, deliberately. `Q0`,
 * `Q7` or `N1` would read as a seventh rule of the same taxonomy in `run.json`
 * and in a refusal's text, and a reader skimming `"stoppingRule": "Q0"` would
 * have no reason to look it up. `"no-search"` cannot be mistaken for one.
 */
export const NO_SEARCH = "no-search" as const

export type NoSearch = typeof NO_SEARCH

/**
 * How a run ended: on one of the six stopping rules, or having run no search.
 *
 * **A UNION AND NOT A WIDENED `StoppingRule`.** A producer records a
 * `Termination`; everything that reads a stopping rule as a claim about a
 * search still takes a `StoppingRule`, so the narrowing has to happen - through
 * `isStoppingRule` - at every point where the no-search case would otherwise
 * acquire a claim by falling through.
 */
export type Termination = StoppingRule | NoSearch

/**
 * What such a run records where a search records the bound its rule licensed.
 *
 * `REP1`'s five bound statuses each say something about where a search stopped,
 * and the weakest of them - `budget-exhausted`, *"where the search stopped, not
 * where the problem bottoms out"* - is still a statement about a search. A run
 * that swept nothing has not bounded anything, and that is not the weakest of
 * the five; it is outside them.
 */
export const NO_BOUND = "no-bound" as const

export type NoBound = typeof NO_BOUND

/** The bound a `Termination` licenses: one of `REP1`'s five, or none at all. */
export type TerminationBound = BoundStatus | NoBound

/**
 * The sentence a refusal about this state carries, in one place because two
 * spellings of *what a no-search run is adopted on* would be two criteria.
 *
 * **IT NAMES THE ONE CHANNEL AND NOT A CRITERION OF ITS OWN.** An agent may not
 * author the clause that admits this run; it did not have to, because
 * `docs/superpowers/specs/2026-10-16-pultec-five-boards-design.md` already makes
 * the owner's call on a render acceptance channel 4. So this sentence says where
 * such a call is recorded and what it has to say - not whether this particular
 * board deserves one.
 */
export const NO_SEARCH_NOTE =
  "a run recording " +
  NO_SEARCH +
  " swept no move set and bounded nothing - tools/stripboard/materialize-run.ts constructs one " +
  "candidate per seed in the model, materialises it and grades it, and docs/known-gaps.md G22 " +
  "carries why no search in this repository can run on such a board. CRITERIA G2.5 admits a run " +
  "through exitCodeFor(outcome, rule) over Q1-Q6, so it has no clause for a run that searched " +
  "not at all, and an agent may not author one. WHAT SUCH A RUN IS ADOPTED ON IS THE OWNER'S " +
  "CALL ON A RENDER - acceptance channel 4 of " +
  "docs/superpowers/specs/2026-10-16-pultec-five-boards-design.md, which is his channel and not " +
  "the producing agent's - RECORDED IN stripboard/render-approvals.json against THIS board and " +
  "THIS candidate's sha256, with his words verbatim. It is not defaulted to the outcome alone, " +
  "which would admit a board on a search nobody ran, and not to a stopping rule chosen to fit " +
  "the verdict. With no such record the run is REPORTED and NOT ADOPTED: show him the render and " +
  "record what he says, or report the run (docs/known-gaps.md G21 and G27)"

/** The refusals this module raises. One arm each in `notDefaultedBecause`. */
export type TerminationRefusal = "termination-not-distinct"

function notDefaultedBecause(refusal: TerminationRefusal): string {
  switch (refusal) {
    case "termination-not-distinct":
      return (
        "NO_SEARCH and NO_BOUND license none of the claims Q1-Q6 and REP1's five bound statuses " +
        "license, and the whole mechanism for that is their ABSENCE from those taxonomies: " +
        "isStoppingRule returns false for NO_SEARCH, so boundFor, runFailedOn, exitCodeFor and " +
        "renderReport are unreachable with it. A member of either taxonomy spelled the same way " +
        "collapses that - isStoppingRule would return true, boundOf would call boundFor, and a " +
        "run that swept no move set would acquire whatever that entry licenses. It is refused at " +
        "import rather than tested per call, because the collapse is a fact about the two " +
        "tables and not about one run. Fix STOPPING_RULES in tools/stripboard/stop-model.ts, " +
        "BOUND_STATUSES in tools/stripboard/report-model.ts, or NO_SEARCH and NO_BOUND here."
      )
  }
}

export function refuse(refusal: TerminationRefusal, offending: string): never {
  throw new Error(
    `${refusal}: ${offending}. ${notDefaultedBecause(refusal)} ` +
      "(tools/stripboard/termination.ts holds the no-search vocabulary; CRITERIA section 5 owns " +
      "Q1-Q6 and section 7's REP1 owns the five bound statuses.)",
  )
}

/**
 * That the no-search vocabulary and the search taxonomies share no spelling.
 *
 * **IT TAKES ITS LISTS AS ARGUMENTS SO IT CAN BE SHOWN TO FAIL**, which is
 * `./stop-model.ts`'s `assertOrderCoversTable` and `./report-model.ts`'s
 * `assertEnumerated` device: a guard that reads its own two constants is
 * unreachable without an edit and is therefore a guard no test covers.
 * `tests/stripboard/termination.test.ts` calls it with a rule list carrying
 * `no-search` and with a bound list carrying `no-bound`.
 */
export function assertDistinct(rules: readonly string[], bounds: readonly string[]): void {
  if (rules.includes(NO_SEARCH)) {
    refuse(
      "termination-not-distinct",
      `the stopping rules are [${rules.join(", ")}] and one of them is spelled ${NO_SEARCH}`,
    )
  }
  if (bounds.includes(NO_BOUND)) {
    refuse(
      "termination-not-distinct",
      `the bound statuses are [${bounds.join(", ")}] and one of them is spelled ${NO_BOUND}`,
    )
  }
}

// CHECKED AT IMPORT for the reason `./report-model.ts` checks its own two
// tables there: the collapse would otherwise first be noticed by a run that
// recorded a claim it had not earned.
assertDistinct(STOPPING_RULES, BOUND_STATUSES)

/**
 * Whether this termination is one of the six, narrowing the type where it is.
 *
 * **EVERY READER OF A STOPPING RULE AS A CLAIM GOES THROUGH HERE**, and that is
 * the point rather than a convenience: `boundFor`, `runFailedOn`, `exitCodeFor`
 * and `renderReport` all take a `StoppingRule`, so a caller holding a
 * `Termination` cannot reach any of them without first asking this question and
 * writing the other branch.
 */
export function isStoppingRule(termination: Termination): termination is StoppingRule {
  return STOPPING_RULES.some((rule) => rule === termination)
}

/**
 * The bound a termination licenses: `boundFor`'s answer for the six, `NO_BOUND`
 * for a run that swept nothing.
 *
 * `boundFor` IS CALLED RATHER THAN RE-TABLED, so `REP1`'s rule-to-bound pairing
 * stays in the one place `./adopt-checks.ts` re-derives it from - a second table
 * here would be a second place for one run's bound to come out differently, on
 * the side of the seam the gate does not read.
 */
export function boundOf(termination: Termination): TerminationBound {
  return isStoppingRule(termination) ? boundFor(termination) : NO_BOUND
}
