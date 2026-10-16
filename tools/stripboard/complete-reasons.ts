/**
 * WHAT THE COMPLETION PASS SAYS ABOUT WHAT IT DID NOT DO: why an evaluated
 * candidate was not accepted, and why a net on the reported board is still open.
 *
 * **ITS OWN FILE BECAUSE IT IS THE PASS'S REPORTING VOCABULARY AND NOT ITS
 * SEARCH.** `./complete.ts` is the rounds, the acceptance and the bookkeeping;
 * this is the wording the result carries. It also put `complete.ts` back under
 * the 500-line ceiling, which the statement about the pass having no production
 * caller took it past.
 *
 * **EVERY REASON HERE IS REACHED ONE WAY ONLY**, which is what makes attributing
 * one an attribution rather than a guess. `./complete.ts`'s own header states
 * the same taxonomy from the other side - *"never as a net that could not
 * close."*
 */
import type { Measured } from "./climb-evaluate.ts"

/**
 * Why a candidate that was evaluated was not accepted.
 *
 * **IT STATES WHAT THE TWO MEASUREMENTS SAY AND NOTHING MORE.** An earlier
 * wording said the wires *"closed this net and opened at least as many others,
 * which a wire does by shorting two nets onto one piece of copper"* - a
 * mechanism, asserted from two counts that cannot establish it. What the counts
 * and the two check reports DO establish is which nets changed status, so that
 * is what this names: the set that closed and the set that opened, read off the
 * two reports, with no account of why. A reader who wants the cause has the two
 * boards in the run directory.
 */
export function rejection(predecessor: Measured, incumbent: Measured, candidate: Measured): string {
  const held = new Set(
    predecessor.evaluation.results.filter((result) => result.held).map((result) => result.id),
  )
  const broke = candidate.evaluation.results
    .filter((result) => !result.held && held.has(result.id))
    .map((result) => result.id)
  if (broke.length > 0) {
    return (
      `the candidate built to close it BREAKS ${broke.join(", ")}, which held on the board the ` +
      "wires were applied to. The acceptance rule's no-regression clause rejects it before F is " +
      "looked at, so closing this net BY THESE WIRES costs a hard constraint. That is a fact " +
      "about the wires this generator planned and not about every way the net could be closed: " +
      "a different set of holes, or a wire path, might not break it."
    )
  }
  const was = new Set(predecessor.checkReport.incompleteNets)
  const now = new Set(candidate.checkReport.incompleteNets)
  const closed = [...was].filter((net) => !now.has(net))
  const opened = [...now].filter((net) => !was.has(net))
  return (
    `the candidate built to close it was not better: openNets ` +
    `${incumbent.evaluation.openNets} -> ${candidate.evaluation.openNets}, F ` +
    `${incumbent.evaluation.score.objective} -> ${candidate.evaluation.score.objective}. ` +
    `Against the board the wires were applied to, --check then called these nets complete that ` +
    `were not: [${closed.join(", ")}]; and these incomplete that were not: [${opened.join(", ")}]. ` +
    "Both lists are read off the two reports; nothing here says why the second one moved."
  )
}

/**
 * The reason a net open on the reported board was never swept for.
 *
 * It is reachable one way only: an ACCEPTED candidate closed one net and opened
 * this one at an EQUAL open-net count, which the acceptance rule permits when
 * `F` improves - and the pass then stopped before a round could plan for the net
 * that opened. Nothing else changes the board, so the cause is not a guess.
 */
export const NEWLY_OPEN =
  "it was NOT OPEN on the board the last round swept from, so no candidate for it was ever " +
  "proposed. An accepted candidate closed another net and opened this one at an equal open-net " +
  "count - which the acceptance rule permits when F improves - and the pass ended before a " +
  "round could plan for it."

/** The reason a net whose plan was complete never got its candidate evaluated. */
export const CAP_SPENT =
  "the candidate that would close it was NOT EVALUATED, because the evaluation cap this pass " +
  "was handed ran out first. That is a budget and not a fact about the board: the net's joins " +
  "are all plannable, and a pass with a larger remainder would have tried them. The cap is " +
  "Q5's run-level backstop, divided by whoever ran the search before this pass."
