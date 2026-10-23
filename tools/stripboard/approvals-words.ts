/**
 * The READINGS of an approval's quote, and the sentences their refusals carry.
 *
 * **SPLIT FROM `./approvals-read.ts` ON THE SEAM THAT FILE ALREADY NAMES.** That
 * module reads the registry's shape - keys, types, hashes, dates, edges - and
 * this holds the one question that is about LANGUAGE rather than about JSON: is
 * this his, and in what shape. It was split when the second admissible shape
 * arrived and took the file over this repository's 500-line ceiling, the same
 * split and the same reason as `lib/stripboard/seed-homes.ts` out of
 * `seed-model.ts`.
 *
 * **THE DIRECTION OF THE IMPORT IS WHAT KEEPS IT ACYCLIC**: this file imports
 * only `./approvals-model.ts`, and `./approvals-read.ts` imports it. So the
 * three `refuse(...)` calls stay in that module beside every other refusal the
 * loader raises - there is still exactly one place a quote refusal is thrown -
 * and what lives here is the predicates and the words.
 *
 * **NOTHING HERE IS A WAY INTO THE DATA.** `loadApprovals` in `./approvals.ts`
 * is the only one.
 *
 * **NONE OF THESE READINGS IS A PROOF AND NOTHING HERE PRETENDS OTHERWISE.**
 * They refuse SHAPES that get written by accident, and a fabricated plausible
 * utterance passes every one of them - `docs/known-gaps.md` G27 carries that
 * residual and `./approvals-model.ts` carries what the design relies on instead,
 * which is scope and visibility.
 */
import { FIRST_OR_SECOND_PERSON, SELECTION_SEPARATOR } from "./approvals-model.ts"
import { subjectNamesFor } from "../../lib/owner-words.ts"

/**
 * **THE THREE READINGS MOVED TO `lib/owner-words.ts` IN TASK 16 OF THE M1 SCHEMATIC-AUTHORING
 * PLAN, AND THIS FILE RE-EXPORTS THEM RATHER THAN HOLDING A SECOND COPY.**
 *
 * `schematic/readability-baselines.json` (spec §3.3) is a SECOND owner-judgement registry, and its
 * loader lives in `lib/schgen/readability/baseline.ts` - which **may not import from `tools/`**
 * (the M1 plan's global constraint, stated in `lib/schgen/render/blocks.ts`). The readings
 * therefore had to be reachable from `lib/`, and the only alternative was a fourth reader of the
 * same shape, which `CLAUDE.md` forbids and which that task's brief forbids by name.
 *
 * **NOTHING WAS WIDENED IN THE MOVE.** The four word lists hold exactly the entries they held and
 * the three predicates behave exactly as they did; `tests/stripboard/approvals-refusals.test.ts`
 * still drives all three through this module and `loadApprovals`.
 *
 * What stays HERE is the two refusal SENTENCES below, which name *an approval* and talk about *a
 * board*: that is this registry's vocabulary and not a shared one.
 */
export { isSelectionFor, isSpokenVoice } from "../../lib/owner-words.ts"
export { subjectNamesFor }

/** `approvals-words-narrated`'s sentence: the quote is a report ABOUT him. */
export function narratedDetail(id: string, joined: string, marker: string): string {
  return (
    `the approval ${id} quotes ${JSON.stringify(joined)}, which says "${marker}" - so it is ` +
    "a report ABOUT him and not a quotation OF him. He does not call himself the owner and " +
    "he does not narrate his own approval, and this field is for what he typed rather than " +
    "for what an agent concluded from it. Put his own sentence here, or delete the entry: " +
    'the reason belongs in "why" and the account of the decision in "note", both of ' +
    "which may be an agent's and are labelled so."
  )
}

/**
 * `approvals-words-not-spoken`'s sentence: the quote is NEITHER shape.
 *
 * **IT NAMES BOTH SHAPES AND BOTH WAYS A SELECTION FALLS SHORT**, because the
 * refusal is the only place a reader learns what was being looked for, and the
 * two near misses - a line naming the board and nothing else, a line whose
 * artifact is a bare affirmative - are the ones a well-meaning person actually
 * writes.
 *
 * It keeps the old refusal's closing instruction verbatim - *put it to him
 * rather than widening* - because the ruling that added the second shape did not
 * change what a reader should do when a true record is refused: the first move
 * is still to ask him, and a widening is still a deliberate edit with a test
 * beside it, made by somebody other than the agent whose board is waiting on it.
 */
export function neitherShapeDetail(id: string, joined: string, board: string): string {
  const short = subjectNamesFor(board).slice(-1)[0] ?? board
  return (
    `the approval ${id} quotes ${JSON.stringify(joined)}, which is neither of the two shapes ` +
    "an approval may be recorded in. It is not a VOICE - nothing in it is in the first or " +
    "second person, no " +
    FIRST_OR_SECOND_PERSON.slice(0, 6).join(", ") +
    " and none of the rest of FIRST_OR_SECOND_PERSON - and it is not a SELECTION for " +
    `"${board}" either: a selection is a line naming this board (as "${board}" or "${short}") ` +
    `and, after a "${SELECTION_SEPARATOR}", the artifact chosen for it, which must be ` +
    "something other than a bare affirmative (SELECTION_NON_ARTIFACTS in " +
    "tools/stripboard/approvals-model.ts). A quote of somebody telling you a board is fine " +
    'reads like somebody talking; a line like "approved on the render" reads like a field ' +
    'being filled in; and "low-cut: yes" names the board and chooses nothing. Nothing is ' +
    "accepted on the grounds that it is probably a quote. If he genuinely said only a word " +
    "that is neither shape, that is a case these guards did not anticipate: put it to him " +
    "rather than widening FIRST_OR_SECOND_PERSON in tools/stripboard/approvals-model.ts to " +
    "fit one record, and if a list really is too narrow, widen it in a deliberate edit with " +
    "a test beside it."
  )
}
