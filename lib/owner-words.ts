/**
 * THE READINGS THAT DECIDE WHETHER A RECORDED QUOTE IS THE OWNER'S WORDS OR AN AGENT'S ACCOUNT OF
 * THEM - one implementation, shared by every registry that records his judgement.
 *
 * **IT IS A MOVE AND NOT A NEW RULE. `tools/stripboard/approvals-model.ts` and
 * `tools/stripboard/approvals-words.ts` HELD THESE AND NOW RE-EXPORT THEM**, so there is still
 * exactly one definition of each word list and each predicate, and every sentence of reasoning
 * below is theirs, carried across rather than rewritten. Nothing was widened in the move: the four
 * lists hold exactly the entries they held, and the three predicates behave exactly as they did
 * (`tests/stripboard/approvals-refusals.test.ts` drives them through the approvals loader, and
 * `tests/schgen/readability/baseline.test.ts` drives them through the readability loader).
 *
 * **WHY IT MOVED, which is the one thing that is new.** Task 16 of the M1 schematic-authoring plan
 * adds a SECOND owner-judgement registry - `schematic/readability-baselines.json`, spec §3.3 -
 * whose loader lives in `lib/schgen/readability/baseline.ts`. **`lib/schgen/` may not import from
 * `tools/`** (the M1 plan's global constraint, stated in `lib/schgen/render/blocks.ts`), so the
 * refusals could not be reused where they were. The task brief's instruction was *"reuse
 * `tools/stripboard/approvals-read.ts`'s three refusals rather than writing a fourth reader of the
 * same shape"*, and this file is the only mechanism that obeys it: a second copy of
 * `FIRST_OR_SECOND_PERSON` would be two places to keep correct, which `CLAUDE.md` forbids in as
 * many words.
 *
 * **WHAT IS HERE AND WHAT IS NOT.** Here: the word lists, the predicates, and the narration sweep.
 * Not here: the refusal SENTENCES, which name the registry they are refusing for (*"the approval
 * X"*, *"the baseline Y"*) and belong beside the loader that raises them. `tools/stripboard/
 * approvals-words.ts` keeps its two sentence builders for that reason.
 *
 * **NONE OF THESE READINGS IS A PROOF AND NOTHING HERE PRETENDS OTHERWISE.** They refuse the
 * SHAPES that get written by accident. A fabricated plausible utterance passes every one of them -
 * `docs/known-gaps.md` **G27** carries that residual, and what the design relies on instead is
 * scope (an entry names one subject and one 64-hex artifact hash) and visibility (the registry is
 * committed and the consumer prints the entry it was admitted on).
 */

/** Whether `word` appears in `text` as a whole word - see `FIRST_OR_SECOND_PERSON`. */
function saysWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(^|[^\\p{L}'])${escaped}($|[^\\p{L}'])`, "iu").test(text)
}

/**
 * The words that say an utterance is somebody TALKING rather than an agent REPORTING, at least one
 * of which must appear across a recorded quote.
 *
 * **IT IS A POSITIVE TEST AND THAT IS DELIBERATE.** A blacklist of paraphrase phrasings is a game
 * of whack-a-mole an agent in a hurry wins by accident - *"approved on the render"* carries no
 * marker of narration at all - whereas a quote of somebody addressing you almost always carries a
 * first- or second-person word. His actual words do, twice over: *"**I** don't see the problem"*,
 * *"**let's** keep it. It looks fine to **me**"*; so do the words behind `stripboard/exemptions.json`:
 * *"**You** should keep a record of exemptions. **My** ad-built boards..."*.
 *
 * **WHAT IT COSTS, STATED RATHER THAN HIDDEN:** a genuine one-word approval - *"yes"*, *"ship it"* -
 * carries no marker, so this guard refuses a true record in that case. It is checked across the
 * JOINED list rather than per utterance so that a terse line beside a substantive quote passes, and
 * the refusal says what to do: record the fuller quote, or put the case to him rather than widening
 * this list to fit one awkward record.
 *
 * **THEY ARE WHOLE WORDS AND ARE MATCHED ON WORD BOUNDARIES**, which is a correction with a
 * measurement behind it: as bare substrings, `me` is inside *measured*, *some* and *came*, and `us`
 * inside *because*, so the list matched nearly any English sentence and the guard tested nothing.
 */
export const FIRST_OR_SECOND_PERSON = [
  "i",
  "i'm",
  "i've",
  "i'd",
  "me",
  "my",
  "mine",
  "we",
  "we've",
  "we're",
  "us",
  "our",
  "let's",
  "you",
  "you're",
  "your",
] as const

/**
 * The phrasings that say an utterance is an agent's REPORT about the owner rather than the owner's
 * own words, none of which may appear in one.
 *
 * **IT IS THE SECOND, INDEPENDENT READING OF THE SAME QUESTION** - the positive test above asks
 * *is this somebody speaking*, and this asks *is this somebody being spoken about*. Both are cheap,
 * neither subsumes the other, and the one forgery that is actually likely - an agent filling the
 * quote field with the sentence it was about to write in `why` - trips this one.
 *
 * **HE DOES NOT CALL HIMSELF THE OWNER AND HE DOES NOT NARRATE HIS OWN APPROVAL.** If he ever does,
 * this guard refuses a true record; its refusal says so and says that widening the list is a
 * deliberate edit with a test beside it, which is the house rule for every whitelist in this
 * repository.
 */
export const NARRATION_MARKERS = [
  "the owner",
  "owner's",
  "owner approved",
  "he approved",
  "he said",
  "he ruled",
  "approved by",
  "the operator",
] as const

/**
 * The character that separates a SELECTION's subject from the artifact it chose:
 * `low-cut: part-walk-s1`.
 *
 * It is declared rather than written inline so the one shape that reading admits is stated beside
 * the two word lists, and so a reader who finds a refusal can see what form was being looked for.
 */
export const SELECTION_SEPARATOR = ":"

/**
 * The words that are NOT an artifact, however they are punctuated, so a bare affirmative cannot be
 * dressed up as a selection by putting a subject in front of it.
 *
 * **THIS LIST IS THE WHOLE DIFFERENCE BETWEEN A SELECTION AND A FIELD BEING FILLED IN.**
 * `low-cut: yes` names the subject and says nothing an agent did not already know;
 * `low-cut: part-walk-s1` names one of four renders that were put in front of him, which is
 * information only the person choosing has. The reading admits the second and must refuse the
 * first, and these are the words that keep the two apart.
 *
 * It is a blacklist, which everywhere else in this pipeline is the weaker device - and it is the
 * right one HERE because it is narrowing an admission rather than granting one: a word missing from
 * it lets a vague selection through, where a word missing from `FIRST_OR_SECOND_PERSON` refuses a
 * true record. A reader who finds a vague affirmative that got past this adds it in a deliberate
 * edit with a test beside it, the same house rule.
 */
export const SELECTION_NON_ARTIFACTS = [
  "yes",
  "no",
  "ok",
  "okay",
  "yep",
  "yeah",
  "sure",
  "good",
  "fine",
  "great",
  "done",
  "go",
  "agreed",
  "approved",
  "approve",
  "accepted",
  "lgtm",
  "ship it",
  "looks good",
  "sounds good",
  "fine by me",
  "that one",
  "this one",
] as const

/**
 * THE FIRST ADMISSIBLE SHAPE - a VOICE: somebody is speaking in it.
 *
 * Unchanged by the arrival of the second shape, and deliberately so: nothing was widened, nothing
 * was special-cased, and `FIRST_OR_SECOND_PERSON` holds exactly the words it held before.
 */
export function isSpokenVoice(joined: string): boolean {
  return FIRST_OR_SECOND_PERSON.some((word) => saysWord(joined, word))
}

/**
 * The narration marker a quote trips, or `null` when it trips none.
 *
 * **THE SWEEP IS HERE RATHER THAN IN EACH LOADER, so that two registries cannot drift on WHICH
 * markers they check or on the order they check them in.** The marker is returned rather than a
 * boolean because the refusal has to name the phrase that gave the quote away: a reader told only
 * *"this reads as narration"* has to guess which words did it.
 *
 * **IT RUNS BEFORE THE VOICE READING, AND THE ORDER IS A DIAGNOSIS RATHER THAN A PREFERENCE** -
 * driven, not reasoned: a paraphrase like *"The owner approved this layout after looking at the
 * render"* trips BOTH readings, and with the voice test first it was reported as *nothing here is
 * in the first or second person*, which sends a reader off to add the word *I* to a sentence that
 * is an agent's whatever its pronouns. Narration first names the phrase that gave it away. Each
 * loader is responsible for calling them in that order; this function does not sequence them.
 */
export function narrationMarkerIn(joined: string): string | null {
  const lowered = joined.toLowerCase()
  for (const marker of NARRATION_MARKERS) {
    if (lowered.includes(marker)) return marker
  }
  return null
}

/**
 * The SUBJECT names one subject may be called by in his own words: its full name, and its name with
 * the first hyphen segment dropped.
 *
 * **IT IS TWO SPELLINGS AND NOT A SUFFIX RULE**, which is a deliberate tightening: `pultec-low-cut`
 * is named by `pultec-low-cut` or by `low-cut`, and NOT by `cut`, which would read the same against
 * `pultec-hi-cut` and would make a selection admissible for a subject it does not name. He writes
 * the section name - *"low-cut: part-walk-s1"* - and that is the one abbreviation this reading
 * accepts.
 */
export function subjectNamesFor(subject: string): readonly string[] {
  const at = subject.indexOf("-")
  const names = at === -1 ? [subject] : [subject, subject.slice(at + 1)]
  return names.map((name) => name.toLowerCase())
}

/**
 * THE SECOND ADMISSIBLE SHAPE - a SELECTION: some line of the quote pairs a subject naming THIS
 * entry's subject with the artifact chosen for it.
 *
 * **BOTH SIDES ARE REQUIRED AND THAT IS THE WHOLE OF THE READING.** A line naming only the subject
 * (`low-cut:`) says nothing was chosen; a line naming only an artifact (`part-walk-s1`) says
 * nothing about which subject it is for and would admit one utterance against any entry; and a line
 * whose artifact is a bare affirmative (`low-cut: yes`) carries no information an agent did not
 * already have, which is exactly the shape a field gets filled in with.
 *
 * **IT IS CHECKED PER LINE, AND PER ENTRY.** Per line because he answered two boards in one message
 * and each entry is about one of them; per entry because a selection is admissible only for the
 * subject it names, so the same two lines pasted against a THIRD subject's entry are refused by
 * this reading - which is the one thing `docs/known-gaps.md` G31 says the voice reading cannot do.
 */
export function isSelectionFor(words: readonly string[], subject: string): boolean {
  const subjects = subjectNamesFor(subject)
  for (const line of words.join("\n").split("\n")) {
    const at = line.indexOf(SELECTION_SEPARATOR)
    if (at === -1) continue
    const named = line.slice(0, at).trim().toLowerCase()
    if (!subjects.includes(named)) continue
    const artifact = line.slice(at + SELECTION_SEPARATOR.length).trim()
    if (artifact === "") continue
    const plain = artifact.toLowerCase().replace(/[.!,;]+$/, "")
    if (SELECTION_NON_ARTIFACTS.some((word) => word === plain)) continue
    return true
  }
  return false
}
