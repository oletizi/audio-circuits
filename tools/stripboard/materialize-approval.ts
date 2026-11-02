/**
 * `owner-approval.txt`: what a materialisation run directory records about the
 * owner's call on a render of the board it produced.
 *
 * **ITS OWN FILE FOR THE LINE CEILING, AND THE SEAM IS WHAT THE RUN DID VERSUS
 * WHAT IS RECORDED ABOUT IT.** `./materialize-run.ts` prepares, imports,
 * constructs, materialises, grades and writes `run.json`; this is one write
 * beside that one, for a person rather than for a tool.
 *
 * **IT IS A RECORD AND NOT A DECISION, which is the whole reason it may sit in
 * the producer at all.** `./adopt-verdict.ts` consults
 * `stripboard/render-approvals.json` ITSELF at adoption, from the same committed
 * file, so a run directory whose file says *approved* is refused all the same if
 * the gate's own consultation disagrees. What this buys is that **a reader
 * standing in a run directory can see whether the board would be admitted on his
 * judgement rather than on a search result, and read what he said** - which an
 * entry in a committed registry alone does not give them.
 */
import fs from "node:fs"
import path from "node:path"
import { approvalFor, approvalRecord, loadApprovals } from "./approvals.ts"
import { isStoppingRule, type Termination } from "./termination.ts"

/**
 * The file this producer writes beside `run.json` so a reader of the run
 * directory can see what the board would be admitted on, and read his words.
 *
 * `.txt` RATHER THAN `.json`, deliberately: nothing reads it. It is for a person
 * standing in a run directory, and a second machine-readable copy of a committed
 * registry is a second place for one decision to go stale.
 */
const APPROVAL_BASENAME = "owner-approval.txt"

/**
 * Write down what the owner's recorded calls say about the board this run
 * produced - **a RECORD and not a decision.**
 *
 * **IT IS WRITTEN WHETHER THE ANSWER IS YES OR NO**, and the unapproved body is
 * the louder of the two: a run directory that carried this file only when an
 * approval existed would make its absence read as a run that never asked.
 * `./approvals-consult.ts`'s `approvalRecord` is the one place the body is
 * composed, so the run directory and a notice cannot say different things.
 *
 * **IT DECIDES NOTHING AND IT IS NOT READ BY THE GATE.** `./adopt-verdict.ts`
 * consults the registry itself at adoption, from the same committed file - so a
 * run directory whose file says *approved* is still refused if the gate's own
 * consultation disagrees, which is what keeps this write a convenience for a
 * human rather than a second authority.
 *
 * **A REGISTRY THAT WILL NOT LOAD STOPS THE RUN**, propagating out of here
 * rather than being caught and written down as *could not read it*: that file is
 * committed and test-covered, so a malformed one is a repository-level breakage
 * and the one thing it must not do is become a shrug in a run directory.
 */
export function writeApprovalRecord(
  runDir: string,
  board: string,
  candidateSha256: string,
  termination: Termination,
): void {
  // A RUN THAT SEARCHED IS NOT THIS REGISTRY APPROVAL'S QUESTION AT ALL -
  // `exitCodeFor(outcome, rule)` decides it, and `approvalFor` refuses to be
  // asked - so there is nothing to write down and no file is written. The branch
  // is unreachable while `TERMINATION` holds `NO_SEARCH`, and it is here rather
  // than asserted away because this function takes the termination it is given.
  if (isStoppingRule(termination)) return
  const verdict = approvalFor(loadApprovals(), { board, candidateSha256, termination })
  fs.writeFileSync(path.join(runDir, APPROVAL_BASENAME), approvalRecord(verdict))
}
