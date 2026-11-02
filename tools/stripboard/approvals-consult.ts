/**
 * THE CONSULTATION: *did the owner approve THIS board as THESE bytes, for a run
 * that ended THIS way* - plus the record a run directory carries so a reader can
 * see the answer and read his words.
 *
 * **ITS OWN FILE FOR THE LINE CEILING, SPLIT AT THE LOAD/CONSULT SEAM** -
 * `./exemptions-consult.ts`'s seam exactly. `./approvals.ts` and
 * `./approvals-read.ts` answer *what is in the file*; this one answers *what the
 * file says about one run*, and it reads no file at all.
 *
 * **AN APPROVAL MAKES AN ADMISSION VISIBLE, NEVER SILENT.** `approvalFor`
 * answers with a discriminated union and never a boolean, both members carry
 * text, and `approvalRecord` is the one call that turns a verdict into the lines
 * a run directory holds beside `run.json`. A board admitted on his judgement
 * rather than on a search result must READ as that, in the repository and in the
 * run directory both: **an admission nobody can see is the same hazard as a
 * skipped check that looks like a passing one.**
 *
 * **IT REFUSES A QUESTION ABOUT A RUN THAT SEARCHED** rather than answering it
 * blandly. `AskedAbout.termination` is an `AdmittedTermination`, so the type
 * stops a `StoppingRule` at the call site; `approvalFor` additionally refuses a
 * string that has been forced past it, because *approved* must never become an
 * answer about a run `exitCodeFor(outcome, rule)` already decides.
 */
import {
  ADMITTED_TERMINATIONS,
  APPROVALS_FILE,
  type AskedAbout,
  type ApprovalRegistry,
  type ApprovalVerdict,
  type RenderApproval,
} from "./approvals-model.ts"
import { refuse } from "./approvals-read.ts"
import { isStoppingRule } from "./termination.ts"

/**
 * THE AUDIT TRAIL: which approvals actually answered a question in this process.
 *
 * **IT IS NOT A CACHE AND IT IS KEYED BY ENTRY ID RATHER THAN BY REGISTRY
 * INSTANCE**, so every consumer in one process contributes to one record
 * whichever copy of the registry it loaded - `./exemptions-consult.ts`'s
 * device. `tests/stripboard/approvals.test.ts` drives the consumers and asserts
 * `unconsultedApprovals` is empty, so an entry nothing asks about goes red.
 */
const CONSULTED = new Set<string>()

/** Every approval id that has answered a question in this process. */
export function consultedApprovalIds(): ReadonlySet<string> {
  return CONSULTED
}

/** The ids in `registry` that nothing in this process has consulted. */
export function unconsultedApprovals(registry: ApprovalRegistry): readonly string[] {
  return registry.approvals.filter((entry) => !CONSULTED.has(entry.id)).map((entry) => entry.id)
}

/** One line: what was admitted, on whose word, recorded where. */
function approvedNotice(entry: RenderApproval, asked: AskedAbout): string {
  return (
    `stripboard-owner-approved: "${asked.board}" is adopted on the owner's call on a render and ` +
    `NOT on a search result - this run recorded ${asked.termination}, and ${APPROVALS_FILE} ` +
    `entry "${entry.id}" admits it for candidate ${asked.candidateSha256}, granted by ` +
    `${entry.grantedBy} on ${entry.grantedOn}. Every other check still had to pass on its own.`
  )
}

/** One line: which way it missed, and what would settle it. */
function unapprovedComplaint(asked: AskedAbout, nearest: RenderApproval | undefined): string {
  const head =
    `stripboard-unapproved: "${asked.board}" recorded ${asked.termination} for candidate ` +
    `${asked.candidateSha256}, and no recorded approval covers it: `
  const middle =
    nearest === undefined
      ? `${APPROVALS_FILE} has no entry for this board.`
      : nearest.candidateSha256 !== asked.candidateSha256
        ? `entry "${nearest.id}" is over this board but over candidate ` +
          `${nearest.candidateSha256}, which is a DIFFERENT BOARD - approval of a render is ` +
          "approval of that board as rendered, and it does not travel to a later one."
        : `entry "${nearest.id}" is over these bytes but admits only ` +
          `${nearest.admits.join(" and ")}.`
  return (
    head +
    middle +
    ` Only the owner may grant one, recorded in ${APPROVALS_FILE} with his words verbatim, the ` +
    "board, the candidate hash and what it does not excuse; nothing is admitted by a " +
    "consultation that found nothing."
  )
}

/**
 * Consult the registry about one run's board, bytes and termination.
 *
 * **THE HASH IS COMPARED AND NOT MERELY CARRIED**, which is the whole of why an
 * approval cannot travel: an entry over this board whose `candidateSha256` is
 * not the one in hand produces `unapproved` with a complaint that says the board
 * changed, rather than an approval of bytes nobody looked at.
 *
 * **IT ANSWERS WITH A VERDICT AND NEVER A BOOLEAN.** Both members are objects
 * carrying text, so a consumer cannot get silence by dropping a value.
 */
export function approvalFor(registry: ApprovalRegistry, asked: AskedAbout): ApprovalVerdict {
  // REFUSED, NOT ANSWERED. The type already forbids a `StoppingRule` here; this
  // is the runtime half, for the caller that cast or read a string off a file.
  // A run that searched is G2.5's question and this registry has no standing in
  // it.
  if (isStoppingRule(asked.termination)) {
    refuse(
      "approvals-asked-about-a-search",
      `a render approval was consulted about "${asked.board}" with the termination ` +
        `${JSON.stringify(asked.termination)}, which is one of the six stopping rules. A run ` +
        "that SEARCHED is admitted or refused by exitCodeFor(outcome, rule) in " +
        "tools/stripboard/report-model.ts - that is CRITERIA G2.5 as it is stated - and this " +
        "registry has no standing in that question. It is not answered either way: an " +
        '"unapproved" verdict here would read as the owner withholding something he was never ' +
        'asked, and an "approved" one would let a look at a render overrule a stopping rule. ' +
        `Only ${ADMITTED_TERMINATIONS.join(" and ")} is asked about.`,
      APPROVALS_FILE,
    )
  }
  const { board, candidateSha256, termination } = asked
  const nearest = registry.approvals.find((entry) => entry.board === board)
  if (
    nearest === undefined ||
    nearest.candidateSha256 !== candidateSha256 ||
    !nearest.admits.includes(termination)
  ) {
    return {
      outcome: "unapproved",
      board,
      candidateSha256,
      termination,
      nearest,
      complaint: unapprovedComplaint(asked, nearest),
    }
  }
  CONSULTED.add(nearest.id)
  return {
    outcome: "approved",
    board,
    candidateSha256,
    termination,
    approval: nearest,
    notice: approvedNotice(nearest, asked),
  }
}

/**
 * What a run directory holds beside `run.json`, so a reader of it can see that
 * this board was admitted on the owner's judgement and READ HIS WORDS.
 *
 * **IT IS WRITTEN WHETHER THE ANSWER IS YES OR NO**, and the `unapproved` body
 * is the louder of the two: a run directory that carried a file only when an
 * approval existed would make its absence look like a run that never asked.
 *
 * **HIS WORDS ARE QUOTED IN FULL AND ARE NOT SUMMARISED.** The whole point of
 * the field is that a reader can check what was said against what is being
 * claimed from it, and a record that printed the entry's id alone would send
 * that reader to a file to do it.
 */
export function approvalRecord(verdict: ApprovalVerdict): string {
  const lines: string[] = []
  if (verdict.outcome === "approved") {
    const entry = verdict.approval
    lines.push(verdict.notice, "")
    lines.push(`entry:       ${entry.id} (${APPROVALS_FILE})`)
    lines.push(`board:       ${entry.board}`)
    lines.push(`candidate:   ${entry.candidateSha256}`)
    lines.push(`admits:      ${entry.admits.join(", ")}`)
    lines.push(`granted:     ${entry.grantedBy}, ${entry.grantedOn}`)
    lines.push(`shown:       ${entry.renderedFrom}`)
    lines.push("")
    lines.push(`OWNER'S WORDS (verbatim, ${entry.grantedOn}):`)
    for (const said of entry.ownerWords) lines.push(`  "${said}"`)
    lines.push("")
    lines.push("WHAT THIS DOES NOT EXCUSE:")
    for (const edge of entry.doesNotExcuse) lines.push(`  - ${edge}`)
  } else {
    lines.push(verdict.complaint)
  }
  lines.push("")
  return lines.join("\n")
}
