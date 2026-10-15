/**
 * WHAT A STRATEGY IS ALLOWED TO DO: pick one proposal out of a round, through a
 * window the loop controls.
 *
 * **SPLIT FROM `./search.ts` FOR THE LINE CEILING, AT THE SEAM THAT MODULE
 * ALREADY HAD** - the same division as `tools/stripboard/stop-model.ts` /
 * `tools/stripboard/stop.ts`. This file answers *which proposals does a round
 * look at, and when does it commit*; that one answers *does the run continue*.
 * `./search.ts` re-exports everything here, so the plan's declared interface is
 * unchanged and no consumer imports this file directly.
 *
 * **THE ACCEPTANCE RULE IS NOT HERE AND MUST NOT BE.** `Acceptance` below is the
 * INTERFACE a strategy sees; the rule itself - strictly cheaper under the
 * owner's weights, and sound by `violationsOf` - is implemented once, in
 * `./search.ts`, together with the evaluation counter. A strategy therefore has
 * nowhere to price a board differently or to accept a plateau move, which is the
 * point of handing it a `consider` instead of the proposals' scores.
 */
import type { Candidate } from "./board.ts"

/**
 * What the fixed acceptance rule said about one proposal.
 *
 * `objective` is present on every arm because a report wants the distribution,
 * not only the winner - and `unsound` carries it too, since a cheaper-but-
 * unsound proposal is a diagnostic about the move generator rather than noise.
 */
export type Admission =
  | { readonly kind: "accept"; readonly objective: number }
  | { readonly kind: "not-cheaper"; readonly objective: number }
  | { readonly kind: "unsound"; readonly objective: number }
  | { readonly kind: "budget-spent" }

/**
 * The fixed acceptance rule, handed to a strategy as the only way it can look at
 * a proposal.
 *
 * **A STRATEGY CANNOT SCORE A PROPOSAL ITSELF**, which is the point of the
 * shape: `consider` is where the weights, `derivedCuts`, `violationsOf` and the
 * evaluation counter all live, so a strategy that wanted to accept a plateau
 * move or price a board differently has nowhere to do it.
 */
export interface Acceptance {
  /** The incumbent's `F`. A proposal must beat it strictly. */
  readonly incumbent: number
  /** Scores one proposal, charges one evaluation, and applies the rule. */
  consider(proposal: Candidate): Admission
}

/**
 * ONE ROUND'S DECISION, and the only thing a strategy owns.
 *
 * `chooseFrom` walks the proposals however it likes and returns the one to take,
 * or `undefined` for a round that accepts nothing. It MUST return a proposal
 * `consider` admitted - the loop re-derives that proposal's cuts and objective
 * from scratch, so a strategy that returned an unadmitted board would produce a
 * climb whose trace is not monotone, which `tests/stripboard/model/search.test.ts`
 * asserts over the supplied two.
 */
export interface Strategy {
  readonly name: string
  readonly description: string
  chooseFrom(proposals: readonly Candidate[], acceptance: Acceptance): Candidate | undefined
}

/**
 * **STEEPEST DESCENT**: consider every proposal, take the cheapest admitted one.
 *
 * Ties go to the earlier proposal in `movesFrom`'s declared order, so two runs
 * over equal inputs take the same move. It spends a full round's evaluations
 * whether it finds one improvement or a thousand.
 */
export const STEEPEST_DESCENT: Strategy = {
  name: "steepest-descent",
  description:
    "Considers every proposal of a round and takes the cheapest the acceptance rule admitted, " +
    "ties to movesFrom's declared order. Spends one full round of evaluations per accepted move.",
  chooseFrom(proposals, acceptance) {
    let chosen: Candidate | undefined
    let best = acceptance.incumbent
    for (const proposal of proposals) {
      const admission = acceptance.consider(proposal)
      if (admission.kind === "budget-spent") break
      if (admission.kind !== "accept") continue
      if (admission.objective < best) {
        chosen = proposal
        best = admission.objective
      }
    }
    return chosen
  },
}

/**
 * **FIRST IMPROVEMENT**: take the first admitted proposal and stop looking.
 *
 * It spends whatever a round needs to reach its first improvement, which on a
 * seed with a dense gradient is a small fraction of the round - and the move it
 * takes is the first in `movesFrom`'s declared order rather than the best, so it
 * can end somewhere steepest descent does not. Which of the two is better is a
 * measurement and is reported, not asserted.
 */
export const FIRST_IMPROVEMENT: Strategy = {
  name: "first-improvement",
  description:
    "Takes the first proposal of a round the acceptance rule admits, in movesFrom's declared " +
    "order, and stops considering the rest.",
  chooseFrom(proposals, acceptance) {
    for (const proposal of proposals) {
      const admission = acceptance.consider(proposal)
      if (admission.kind === "budget-spent") return undefined
      if (admission.kind === "accept") return proposal
    }
    return undefined
  },
}
