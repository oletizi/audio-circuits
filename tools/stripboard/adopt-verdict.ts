/**
 * `G2.5`: the VERDICT the adoption gate reads off `run.json`, and the one
 * channel that admits a run which performed no search.
 *
 * THE AUTHORITY is CRITERIA `G2.5`
 * (`docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md` §9),
 * read with acceptance channel 4 of
 * `docs/superpowers/specs/2026-10-16-pultec-five-boards-design.md`. Where this
 * module and those documents differ they win and this comment is the defect.
 *
 * **ITS OWN FILE FOR THE LINE CEILING, SPLIT AT THE SEAM THE GATE ALREADY
 * HAS.** `./adopt-checks.ts` answers *are the recorded facts still the facts* -
 * four hashes, the frozen fixture, the chain, the two fork commits, all of them
 * comparisons against files on disk. This one answers *may this RUN be adopted
 * at all*, which is a different question with a different authority: the three
 * outcomes, the six stopping rules, the no-search state, and the owner's
 * recorded call on a render. `./adopt-checks.ts` re-exports
 * `assertVerdictAdmits`, so no consumer's import path changed when it moved.
 *
 * **NOTHING HERE WRITES ANYTHING.** The seam `./adopt-checks.ts` states holds
 * for this file too: every function returns or throws, and `./adopt.ts` is the
 * only file in this pipeline that puts bytes under `boards/`. What
 * `assertVerdictAdmits` RETURNS is the line an adoption must print when a board
 * was admitted on the owner's judgement rather than on a search result.
 */
import {
  refuse,
  type AdoptDeps,
} from "./adopt-model.ts"
import {
  approvalFor,
  loadApprovals,
  APPROVALS_FILE,
  type ApprovalRegistry,
} from "./approvals.ts"
import {
  exitCodeFor,
  outcomeExitCode,
  OUTCOMES,
  OUTCOME_WORDING,
  type Outcome,
} from "./report-model.ts"
import type { RunManifest } from "./run-dir.ts"
import { STOPPING_RULES } from "./stop-model.ts"
import {
  boundOf,
  isStoppingRule,
  NO_SEARCH,
  NO_SEARCH_NOTE,
  type Termination,
} from "./termination.ts"

/** One of `REP5`'s three outcomes, from the string `run.json` recorded. */
function outcomeFrom(text: string, file: string): Outcome {
  const found = OUTCOMES.find((outcome) => outcome === text)
  if (found === undefined) {
    refuse(
      "failing-check",
      `${file} records the outcome ${JSON.stringify(text)}, which is not one of REP5's three ` +
        `(${OUTCOMES.join(", ")}), so this run's verdict cannot be read`,
    )
  }
  return found
}

/**
 * How the run ended - one of `Q1`-`Q6`, or `./termination.ts`'s `no-search` -
 * from the string `run.json` recorded.
 *
 * **IT RETURNS `no-search` RATHER THAN REFUSING IT, WHICH IS THE CHANGE THIS
 * CHANNEL IS**, and nothing else about the gate moved with it. The string used
 * to refuse here because `G2.5` is read through `exitCodeFor(outcome, rule)`
 * over the six and CRITERIA has no clause for a run that searched not at all -
 * which was right while nothing carried the owner's call on the board. It now
 * reaches `assertOwnerApproved`, which refuses it unless
 * `stripboard/render-approvals.json` records his approval of THIS board at THIS
 * candidate hash. **A run with no such record is refused by the same
 * `failing-check` id and the same `NO_SEARCH_NOTE` it always carried.**
 *
 * An unreadable string is still refused as one: `no-search` is a state a
 * producer records deliberately, so reporting it under *not one of Q1-Q6* would
 * read as a corruption and send the next reader looking for one.
 */
function terminationFrom(text: string, file: string): Termination {
  if (text === NO_SEARCH) return NO_SEARCH
  const found = STOPPING_RULES.find((rule) => rule === text)
  if (found === undefined) {
    refuse(
      "failing-check",
      `${file} records the stopping rule ${JSON.stringify(text)}, which is not one of ` +
        `${STOPPING_RULES.join(", ")} and is not ${NO_SEARCH} either, so whether the RUN ` +
        "itself failed cannot be read",
    )
  }
  return found
}

/**
 * The registry, loaded, with a load failure reported as this gate's own refusal.
 *
 * **A REGISTRY THAT WILL NOT LOAD IS A REFUSAL AND NEVER A PASS.**
 * `loadApprovals` throws by name on a malformed entry, an unknown key, a grantor
 * who is not the owner or a quote in nobody's voice; the dangerous default here
 * is *approved*, and a check that could not run must not look like one that ran.
 * The refusal id is added so the message cannot be mistaken for a read error
 * somewhere else in the pipeline.
 */
function registryFrom(file: string, deps: AdoptDeps): ApprovalRegistry {
  try {
    return loadApprovals(deps.approvalsPath)
  } catch (caught) {
    // THE LOADER'S OWN FULL CLAUSE, WITH ITS CLOSING PERIOD TRIMMED, because
    // `refuse` adds one and ".." reads as a typo in a message somebody is meant
    // to act on.
    const detail = (caught instanceof Error ? caught.message : String(caught)).replace(/\.$/, "")
    refuse(
      "failing-check",
      `${file} records the stopping rule ${JSON.stringify(NO_SEARCH)}, so ${APPROVALS_FILE} is ` +
        `what decides whether this run may be adopted, and it did not load: ${detail}`,
    )
  }
}

/**
 * The one thing a recorded approval admits: a run that performed no search, for
 * the board and the bytes he was shown.
 *
 * **IT IS REACHED LAST AND IT ADMITS NOTHING ELSE.** Every hash, the chain, both
 * fork commits and the candidate's own outcome have already been checked when
 * this runs, so an approval is never what carries a board past another refusal -
 * `assertVerdictAdmits` grades the outcome through the same `EXIT_CODES` table
 * every other run goes through, BEFORE asking this question, and a board that
 * fails one of those is refused with the approval on record and unread.
 *
 * **WHAT IT RETURNS IS THE LINE THE ADOPTION MUST PRINT.** An admission on the
 * owner's judgement rather than on a search result has to READ as that, so the
 * verdict's notice is handed back rather than discarded; `./adopt.ts` returns it
 * to the CLI, which prints it.
 */
function assertOwnerApproved(
  manifest: RunManifest,
  file: string,
  board: string,
  deps: AdoptDeps,
): readonly string[] {
  const verdict = approvalFor(registryFrom(file, deps), {
    board,
    candidateSha256: manifest.canonical.inputs.candidateSha256,
    termination: NO_SEARCH,
  })
  if (verdict.outcome !== "approved") {
    refuse(
      "failing-check",
      `${file} records the stopping rule ${JSON.stringify(NO_SEARCH)}, and ${NO_SEARCH_NOTE}. ` +
        verdict.complaint,
    )
  }
  return [verdict.notice]
}

/**
 * `G2.5`: the verdict, read through the `EXIT_CODES` table and not through a
 * second comparison with `"admissible"`.
 *
 * **IT TAKES THE RULE AS WELL AS THE OUTCOME WHERE THERE IS ONE**, which is what
 * makes a `Q5` stop on an admissible candidate a refusal here: CRITERIA says
 * twice that a run stopping on `Q5` is reported as a failure rather than as a
 * result, and adopting the product of a run reported as a failure would be
 * reading it as a result.
 *
 * **A `no-search` RUN IS GRADED ON ITS CANDIDATE AND THEN ON THE OWNER'S
 * RECORDED CALL, IN THAT ORDER.** `outcomeExitCode` is the same table
 * `exitCodeFor` ends in, so the candidate is held to exactly what every other
 * run's is; what the run cannot supply is a rule, and `runFailedOn` is keyed by
 * one. The ordering is deliberate rather than incidental: a board that fails its
 * own outcome must be refused FOR THAT, so the message a reader gets names the
 * board rather than the approval, and an approval is only ever reached by a run
 * whose one remaining defect is that it searched nothing.
 *
 * **THE BOUND IS RE-DERIVED EITHER WAY.** `boundOf` answers `boundFor` for the
 * six and `no-bound` for a run that swept nothing, so the pairing is checked
 * against one table on both paths.
 */
export function assertVerdictAdmits(
  manifest: RunManifest,
  file: string,
  board: string,
  deps: AdoptDeps,
): readonly string[] {
  const outcome = outcomeFrom(manifest.canonical.metrics.outcome, file)
  const termination = terminationFrom(manifest.canonical.metrics.stoppingRule, file)
  // THE BOUND IS RE-DERIVED FROM THE TERMINATION RATHER THAN TRUSTED AS
  // RECORDED, and that closes a gap this check had from the start:
  // `metrics.bound` was folded into the canonical hash and compared against
  // nothing, so the gate trusted the PRODUCER's pairing of the two. A tamperer
  // recomputes the hash over the values it edited, and `run.json` is the one
  // artifact where the bound and the rule can disagree undetected - while REP4
  // requires that they agree in one report. `BOUNDS` is the one table that pairs
  // them (`./report-model.ts`) and `boundOf` is the one reader of it that also
  // answers for a run with no rule (`./termination.ts`), so one side is derived
  // here and compared, which is a different act from reading both off the record.
  const derived = boundOf(termination)
  if (manifest.canonical.metrics.bound !== derived) {
    refuse(
      "failing-check",
      `${file} records the bound ${JSON.stringify(manifest.canonical.metrics.bound)} beside the ` +
        `stopping rule ${termination}, and REP4's own table pairs ${termination} with ${derived}`,
    )
  }
  if (isStoppingRule(termination)) {
    if (exitCodeFor(outcome, termination) !== 0) {
      refuse(
        "failing-check",
        `${file} reports ${OUTCOME_WORDING[outcome]} - and the run stopped on ${termination}`,
      )
    }
    return []
  }
  if (outcomeExitCode(outcome) !== 0) {
    refuse(
      "failing-check",
      `${file} reports ${OUTCOME_WORDING[outcome]} - and the run performed no search either, so ` +
        `no recorded approval can admit it: ${APPROVALS_FILE} answers one question only, which ` +
        "is whether a run that searched nothing may be adopted, and every other check still has " +
        "to pass on its own",
    )
  }
  return assertOwnerApproved(manifest, file, board, deps)
}
