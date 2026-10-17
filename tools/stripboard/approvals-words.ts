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
import {
  FIRST_OR_SECOND_PERSON,
  SELECTION_NON_ARTIFACTS,
  SELECTION_SEPARATOR,
} from "./approvals-model.ts"

/** Whether `word` appears in `text` as a whole word - see `FIRST_OR_SECOND_PERSON`. */
function saysWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(^|[^\\p{L}'])${escaped}($|[^\\p{L}'])`, "iu").test(text)
}

/**
 * THE FIRST ADMISSIBLE SHAPE - a VOICE: somebody is speaking in it.
 *
 * Unchanged by the arrival of the second shape, and deliberately so: nothing was
 * widened, nothing was special-cased, and `FIRST_OR_SECOND_PERSON` holds exactly
 * the words it held before.
 */
export function isSpokenVoice(joined: string): boolean {
  return FIRST_OR_SECOND_PERSON.some((word) => saysWord(joined, word))
}

/**
 * The SUBJECT names one board may be called by in his own words: its full name,
 * and its name with the first hyphen segment dropped.
 *
 * **IT IS TWO SPELLINGS AND NOT A SUFFIX RULE**, which is a deliberate
 * tightening: `pultec-low-cut` is named by `pultec-low-cut` or by `low-cut`,
 * and NOT by `cut`, which would read the same against `pultec-hi-cut` and would
 * make a selection admissible for a board it does not name. He writes the
 * section name - *"low-cut: part-walk-s1"* - and that is the one abbreviation
 * this reading accepts.
 */
export function subjectNamesFor(board: string): readonly string[] {
  const at = board.indexOf("-")
  const names = at === -1 ? [board] : [board, board.slice(at + 1)]
  return names.map((name) => name.toLowerCase())
}

/**
 * THE SECOND ADMISSIBLE SHAPE - a SELECTION: some line of the quote pairs a
 * subject naming THIS entry's board with the artifact chosen for it.
 *
 * **BOTH SIDES ARE REQUIRED AND THAT IS THE WHOLE OF THE READING.** A line
 * naming only the board (`low-cut:`) says nothing was chosen; a line naming only
 * an artifact (`part-walk-s1`) says nothing about which board it is for and
 * would admit one utterance against any entry; and a line whose artifact is a
 * bare affirmative (`low-cut: yes`) carries no information an agent did not
 * already have, which is exactly the shape a field gets filled in with.
 *
 * **IT IS CHECKED PER LINE, AND PER ENTRY.** Per line because he answered two
 * boards in one message and each entry is about one of them; per entry because
 * a selection is admissible only for the board it names, so the same two lines
 * pasted against a THIRD board's entry are refused by this reading - which is
 * the one thing `docs/known-gaps.md` G31 says the voice reading cannot do.
 */
export function isSelectionFor(words: readonly string[], board: string): boolean {
  const subjects = subjectNamesFor(board)
  for (const line of words.join("\n").split("\n")) {
    const at = line.indexOf(SELECTION_SEPARATOR)
    if (at === -1) continue
    const subject = line.slice(0, at).trim().toLowerCase()
    if (!subjects.includes(subject)) continue
    const artifact = line.slice(at + SELECTION_SEPARATOR.length).trim()
    if (artifact === "") continue
    const plain = artifact.toLowerCase().replace(/[.!,;]+$/, "")
    if (SELECTION_NON_ARTIFACTS.some((word) => word === plain)) continue
    return true
  }
  return false
}

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
