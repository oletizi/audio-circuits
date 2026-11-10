/**
 * **THE FIVE BOARDS THE SCHGEN DRAWING TRIAL SENDS, AND THE GATE THAT REFUSES ANY WHOSE PAGE IS NOT
 * APPROVED BYTE FOR BYTE.**
 *
 * The trial shows SchGen's attempts beside the approved page for each board
 * (`docs/superpowers/specs/2026-11-09-schgen-drawing-trial-design.md`). A verdict is bound to the
 * exact bytes reviewed (`EVALUATING-DRAWINGS.md` §5) and `docs/schematic/verdicts.md` is the only
 * authority for one, so a board is admitted only when the sha256 of its committed page appears in
 * that register. `transistor-preamp-staged` has a drafted page and no approval, and is not here.
 *
 * **THE GATE HASHES BYTES AND PARSES NOTHING.** It never reads a coordinate or a symbol out of the
 * page; the request generator (`./request.ts`) builds its text from the board model alone.
 */
import fs from "node:fs"
import path from "node:path"
import { draftedSheet, sha256OfFile } from "../../tests/circuits/drafted-sheet.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"

export const TRIAL_BOARDS: readonly string[] = [
  "pultec-hi-boost",
  "pultec-hi-cut",
  "pultec-low-boost",
  "pultec-low-cut",
  "pultec-mid",
]

/** The circuit directory under `drafted/` every trial board's page sits in. */
export const TRIAL_CIRCUIT = "pultec"

/** Refuses a board that is not one of the five. */
export function assertTrialBoard(board: string): void {
  if (!TRIAL_BOARDS.includes(board)) {
    throw new Error(
      `"${board}" is not a trial board. TRIAL_BOARDS in tools/schgen-drawing-trial/boards.ts ` +
        `lists the five approved Pultec boards: [${TRIAL_BOARDS.join(", ")}]. A board is added ` +
        "there deliberately, once its page's sha256 is recorded as approved in " +
        "docs/schematic/verdicts.md; it is not inferred, because the trial shows each attempt " +
        "beside an approved page and a board without one has nothing to be shown beside.",
    )
  }
}

/**
 * The sha256 of `sheet`, provided `docs/schematic/verdicts.md` records it as a backticked digest;
 * refuses otherwise. Takes a path so its refusal can be driven with a perturbed copy.
 */
export function approvedDigestOf(sheet: string): string {
  const digest = sha256OfFile(sheet)
  const register = path.join(moduleRepoRoot(), "docs", "schematic", "verdicts.md")
  const verdicts = fs.readFileSync(register, "utf8")
  if (!verdicts.includes(`\`${digest}\``)) {
    throw new Error(
      `${sheet} has sha256 ${digest}, which docs/schematic/verdicts.md does not record. A verdict ` +
        "is bound to the exact bytes reviewed (EVALUATING-DRAWINGS.md §5), so these bytes are not " +
        "an approved page and the trial will not show SchGen's attempts beside them. Either the " +
        "page changed after approval - restore it - or it was never approved, in which case it " +
        "goes to the owner before it goes to the trial. Not defaulted: an unapproved page as the " +
        "comparison would misstate what the attempts were set beside.",
    )
  }
  return digest
}

/** The approved digest of a trial board's committed page under `drafted/pultec/`. */
export function approvedSheetDigest(board: string): string {
  assertTrialBoard(board)
  return approvedDigestOf(draftedSheet(TRIAL_CIRCUIT, board))
}
