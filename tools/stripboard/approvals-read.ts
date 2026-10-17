/**
 * THE REFUSAL VOCABULARY FOR `stripboard/render-approvals.json`, AND THE READER
 * FOR ONE ENTRY - every clause that can refuse below the registry level,
 * including the three that decide whether `ownerWords` is a QUOTE or an agent's
 * account of one.
 *
 * **ITS OWN FILE FOR THE LINE CEILING, SPLIT AT THE ENTRY/REGISTRY SEAM** -
 * `./exemptions-read.ts`'s seam exactly. `./approvals.ts` answers *what is in
 * the file*; this answers *is this one entry well formed*.
 *
 * **THE DANGEROUS DEFAULT IS "APPROVED", AND IT IS WORSE HERE THAN FOR AN
 * EXEMPTION.** An exemption lets a measurement of a board he built be reported
 * instead of refused; an approval lets a board the pipeline produced be WRITTEN
 * INTO `boards/`. So not one clause below substitutes a value, and the three
 * clauses about his words are the ones to read first:
 *
 *   - `approvals-no-words` - nothing quoted at all. **A record that merely
 *     asserts approval is refused**: his words are the evidence, and an entry
 *     without them records an agent's conclusion;
 *   - `approvals-words-not-spoken` - the quote is neither of the two admissible
 *     shapes: nobody's voice (`FIRST_OR_SECOND_PERSON`) and not a selection
 *     naming this entry's board and the artifact chosen for it
 *     (`SELECTION_SEPARATOR`, `SELECTION_NON_ARTIFACTS`);
 *   - `approvals-words-narrated` - the quote talks ABOUT him
 *     (`NARRATION_MARKERS`), so it is a report and not a quotation.
 *
 * **NONE OF THE THREE PROVES HE SAID IT AND THIS MODULE CLAIMS OTHERWISE
 * NOWHERE.** They refuse the three shapes a well-meaning agent in a hurry
 * actually writes. `./approvals-model.ts`'s comment says what the design relies
 * on instead - scope, and visibility - and `docs/known-gaps.md` G27 carries the
 * residual.
 *
 * **NOTHING HERE IS A WAY INTO THE DATA.** `loadApprovals` in `./approvals.ts`
 * is the only one, and these functions are its parts.
 */
import fs from "node:fs"
import path from "node:path"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import {
  isSelectionFor,
  isSpokenVoice,
  narratedDetail,
  neitherShapeDetail,
} from "./approvals-words.ts"
import {
  ADMITTED_TERMINATIONS,
  APPROVAL_EDGES_REQUIRED,
  APPROVAL_ENTRY_KEYS,
  APPROVAL_GRANTORS,
  APPROVAL_REQUIRED_EDGE_NAMES,
  APPROVALS_FILE,
  APPROVALS_SCHEMA,
  APPROVAL_TOP_LEVEL_KEYS,
  NARRATION_MARKERS,
  type AdmittedTermination,
  type ApprovalGrantor,
  type RenderApproval,
} from "./approvals-model.ts"

/** What a value is, for a refusal that has to name it. */
export function kindOf(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (Array.isArray(value)) return "an array"
  return `a ${typeof value}`
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * An array whose entries are still unknown. `Array.isArray` on an `unknown`
 * narrows to `any[]`, which would let every entry past the type checker
 * untyped - `./exemptions-read.ts` carries the same guard for the same reason.
 */
export function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value)
}

function isAdmittedTermination(value: string): value is AdmittedTermination {
  return ADMITTED_TERMINATIONS.some((termination) => termination === value)
}

function isGrantor(value: string): value is ApprovalGrantor {
  return APPROVAL_GRANTORS.some((grantor) => grantor === value)
}

/**
 * Every refusal in this area, in one shape: a kebab-case code, then what is
 * wrong, then why nothing is substituted, then the file.
 *
 * THE CODE FIRST is deliberate and the tests depend on it, for the reason
 * `./exemptions-read.ts` gives: a file where every message mentions the same
 * words, so an assertion matching loosely would pass against its neighbour.
 */
export function refuse(code: string, detail: string, file: string): never {
  throw new Error(`${code}: ${detail} In ${file}.`)
}

/** The sentence a missing value gets, because the dangerous default is "approved". */
export const NOT_DEFAULTED =
  "It is NOT defaulted: an approval this loader completed for you would be a board written into " +
  "boards/ on nobody's word, and the registry exists so a run that performed no search is only " +
  "ever adopted on the owner's recorded judgement of a render. Supply it, or delete the entry.";

/** Read one required top-level value, refusing absence rather than defaulting it. */
export function present(parsed: Record<string, unknown>, key: string, file: string): unknown {
  if (!(key in parsed)) {
    refuse("approvals-missing-key", `"${key}" is absent. ${NOT_DEFAULTED}`, file)
  }
  return parsed[key]
}

/** The declared schema version, which must be the one this loader reads. */
export function readSchema(parsed: Record<string, unknown>, file: string): 1 {
  const value = present(parsed, "schema", file)
  if (value !== APPROVALS_SCHEMA) {
    refuse(
      "approvals-schema",
      `"schema" must be exactly ${APPROVALS_SCHEMA}, got ${JSON.stringify(value)}. Schema ` +
        `${APPROVALS_SCHEMA} names the fields this loader reads and the terminations it admits; ` +
        "reading another version as if it were this one would accept an approval nobody " +
        "reviewed. No version is assumed when the field disagrees.",
      file,
    )
  }
  return APPROVALS_SCHEMA
}

/** Refuse any top-level key schema 1 does not name, by name. */
export function rejectUnknown(parsed: Record<string, unknown>, file: string): void {
  for (const key of Object.keys(parsed)) {
    if (!APPROVAL_TOP_LEVEL_KEYS.includes(key)) {
      refuse(
        "approvals-unknown-key",
        `"${key}" is not part of a render-approvals file. Schema ${APPROVALS_SCHEMA} names ` +
          `exactly: ${APPROVAL_TOP_LEVEL_KEYS.join(", ")}. An unknown key is refused rather than ` +
          "ignored, because a key the loader drops is a qualification somebody believes is " +
          "recorded and nothing reads - which is how a board comes to be adopted under a " +
          "condition nobody checked.",
        file,
      )
    }
  }
}

/** One required text field of one entry, non-blank. */
function readText(entry: Record<string, unknown>, key: string, id: string, file: string): string {
  const value = entry[key]
  if (typeof value !== "string") {
    refuse(
      "approvals-field-type",
      `the approval ${id} has "${key}" as ${kindOf(value)}, and it must be a string. ` +
        NOT_DEFAULTED,
      file,
    )
  }
  if (value.trim() === "") {
    refuse(
      "approvals-blank-field",
      `the approval ${id} has a blank "${key}", which records nothing. An approval that admits a ` +
        "board into boards/ cannot carry a blank reason, a blank scope or a blank quote; nothing " +
        "is written for you.",
      file,
    )
  }
  return value
}

/** One required list-of-strings field of one entry. */
function readList(
  entry: Record<string, unknown>,
  key: string,
  id: string,
  file: string,
): readonly string[] {
  const value = entry[key]
  if (!isUnknownArray(value)) {
    refuse(
      "approvals-field-type",
      `the approval ${id} has "${key}" as ${kindOf(value)}, and it must be an array of strings. ` +
        NOT_DEFAULTED,
      file,
    )
  }
  const items: string[] = []
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string") {
      refuse(
        "approvals-field-type",
        `the approval ${id} has "${key}"[${index}] as ${kindOf(item)}, and every entry must be a ` +
          "string.",
        file,
      )
    }
    if (item.trim() === "") {
      refuse(
        "approvals-blank-field",
        `the approval ${id} has a blank "${key}"[${index}], which records nothing.`,
        file,
      )
    }
    items.push(item)
  }
  return items
}

/** The candidate hash: lowercase hex, sixty-four characters, and nothing else. */
function readCandidateHash(value: string, id: string, file: string): string {
  if (!/^[0-9a-f]{64}$/.test(value)) {
    refuse(
      "approvals-candidate-hash-shape",
      `the approval ${id} names the candidate ${JSON.stringify(value)}, which is not a lowercase ` +
        "64-character hex sha256. THIS FIELD IS THE WHOLE SCOPE OF THE APPROVAL - it is what " +
        "keeps his look at one render from admitting a later, different board for the same " +
        "section - so it is not accepted in whatever shape it arrives in, not uppercased for " +
        "you, and not matched on a prefix. Take the value from run.json's " +
        "canonical.inputs.candidateSha256 for the run whose candidate he was shown.",
      file,
    )
  }
  return value
}

/** The terminations this approval admits: at least one, each whitelisted, all distinct. */
function readAdmits(
  entry: Record<string, unknown>,
  id: string,
  file: string,
): readonly AdmittedTermination[] {
  const named = readList(entry, "admits", id, file)
  if (named.length === 0) {
    refuse(
      "approvals-admits-nothing",
      `the approval ${id} names no termination in "admits", so it admits nothing and reads as if ` +
        "it admitted everything. An approval admits NAMED terminations or it is not an approval.",
      file,
    )
  }
  const admitted: AdmittedTermination[] = []
  for (const name of named) {
    if (!isAdmittedTermination(name)) {
      refuse(
        "approvals-unknown-termination",
        `the approval ${id} admits "${name}", which is not an admissible termination. Exactly ` +
          `${ADMITTED_TERMINATIONS.join(" and ")} may be admitted this way. A run that SEARCHED ` +
          "is decided by exitCodeFor(outcome, rule) in tools/stripboard/report-model.ts, which " +
          "is CRITERIA G2.5 as it is stated, and an approval that could admit a stopping rule " +
          "would be overruling it - Q5 in particular, which CRITERIA says twice is reported as a " +
          "failure rather than as a result. Widening ADMITTED_TERMINATIONS in " +
          "tools/stripboard/approvals-model.ts is a deliberate edit with a test beside it.",
        file,
      )
    }
    if (admitted.includes(name)) {
      refuse(
        "approvals-duplicate-termination",
        `the approval ${id} names "${name}" twice. One mention is the approval; a second is a ` +
          "list that has been edited twice and reconciled never.",
        file,
      )
    }
    admitted.push(name)
  }
  return admitted
}

/** The edges: at least three, with both required names present in the text. */
function readEdges(
  entry: Record<string, unknown>,
  id: string,
  file: string,
): readonly string[] {
  const edges = readList(entry, "doesNotExcuse", id, file)
  if (edges.length < APPROVAL_EDGES_REQUIRED) {
    refuse(
      "approvals-thin-edges",
      `the approval ${id} states ${edges.length} edge(s) in "doesNotExcuse" and at least ` +
        `${APPROVAL_EDGES_REQUIRED} are required. The three the design named: it does not travel ` +
        "to different bytes, it does not excuse electrical soundness, and it does not excuse any " +
        "other check the adoption gate runs. An entry with two has thought about two ways of " +
        "being misread and this one has three.",
      file,
    )
  }
  const text = edges.join(" ")
  for (const name of APPROVAL_REQUIRED_EDGE_NAMES) {
    if (!text.includes(name)) {
      refuse(
        "approvals-edge-unaddressed",
        `the approval ${id} nowhere mentions ${name} in "doesNotExcuse", and that edge is ` +
          "required in the text. violationsOf (lib/stripboard/invariants.ts) is the one whose " +
          "absence says a board that is not the circuit might be covered, which no approval here " +
          "means and none may mean; candidateSha256 (tools/stripboard/run-dir.ts) is the SCOPE, " +
          "and an approval read as covering a board rather than these bytes would admit every " +
          "later layout of that section on one look at one picture. Name the symbol rather than " +
          "describing it - a name is checkable against the module that exports it and a " +
          "paraphrase is not.",
        file,
      )
    }
  }
  return edges
}

/** The consumers: at least one, each a file that is really on disk. */
function readConsumers(
  entry: Record<string, unknown>,
  id: string,
  file: string,
): readonly string[] {
  const consumers = readList(entry, "consultedBy", id, file)
  if (consumers.length === 0) {
    refuse(
      "approvals-no-consumer",
      `the approval ${id} names nothing in "consultedBy". An approval nobody reads is a gate ` +
        "nobody opened, sitting in a file that looks like governance - so an entry states the " +
        "repository-relative paths that really consult it, and tests/stripboard/approvals.test.ts " +
        "proves each one reaches this loader.",
      file,
    )
  }
  for (const consumer of consumers) {
    if (!fs.existsSync(path.join(moduleRepoRoot(), consumer))) {
      refuse(
        "approvals-consumer-missing",
        `the approval ${id} says "${consumer}" consults it, and that file is not in the ` +
          "repository. A cited consumer that does not exist is an approval that reads as " +
          "enforced and is not; most often the file was renamed on one side only.",
        file,
      )
    }
  }
  return consumers
}

/** The grant date: ISO `yyyy-mm-dd`, and a date that exists. */
function readGrantedOn(value: string, id: string, file: string): string {
  const parsed = Date.parse(`${value}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed)) {
    refuse(
      "approvals-granted-on",
      `the approval ${id} was granted on "${value}", which is not a date in yyyy-mm-dd. The day ` +
        "is half of the provenance - it is what lets a reader find the conversation the approval " +
        "came out of - so it is not accepted in whatever shape it arrives in.",
      file,
    )
  }
  if (!new Date(parsed).toISOString().startsWith(value)) {
    refuse(
      "approvals-granted-on",
      `the approval ${id} was granted on "${value}", which is a well-shaped date that does not ` +
        "exist. Nothing is rounded to a neighbouring day.",
      file,
    )
  }
  return value
}

/**
 * HIS WORDS, and the readings that refuse an agent's account of them.
 *
 * **THE LIST MUST BE NON-EMPTY**, because a record that merely asserts approval
 * without quoting him records a conclusion rather than evidence. Then the
 * readings `./approvals-model.ts` describes: nobody may be SPOKEN ABOUT, and the
 * utterance has to be one of TWO admissible shapes.
 *
 * **THE TWO SHAPES, AND THE RULING THAT ADDED THE SECOND.** A VOICE - somebody
 * speaking, `FIRST_OR_SECOND_PERSON` - or a SELECTION - a line naming this
 * entry's board and the artifact chosen for it, `isSelectionFor` above. The
 * second was added on 2026-10-17 by the controller's ruling, after the voice
 * reading refused the owner's actual reply when he was shown four renders of the
 * two remaining Pultec sections and wrote, in full, *"low-cut: part-walk-s1 /
 * hi-cut: rcm-s20"*. The reasoning is recorded in the registry's
 * `notes.ownerWords` and in this task's report so it can be overturned on the
 * argument: **the voice reading was never proof either** - it is a proxy for
 * *a human said this* - and a selection among options only the person being
 * shown them had is the same kind of proxy, carrying MORE information than the
 * approvals already on record rather than less, since it names the board and
 * the artifact where *"the two boards you showed me look good."* names neither.
 *
 * **NEITHER SHAPE WAS WIDENED TO ADMIT THE OTHER.** `FIRST_OR_SECOND_PERSON` is
 * untouched, nothing was special-cased to a board or a quote, and a bare
 * affirmative still refuses under both readings.
 *
 * **THE NARRATION READING RUNS FIRST, AND THE ORDER IS A DIAGNOSIS RATHER THAN
 * A PREFERENCE** - driven, not reasoned: a paraphrase like *"The owner approved
 * this layout after looking at the render"* trips BOTH readings, and with the
 * voice test first it was reported as *nothing here is in the first or second
 * person*, which sends a reader off to add the word *I* to a sentence that is an
 * agent's whatever its pronouns. Narration first names the phrase that gave it
 * away.
 *
 * **NEITHER READING IS A PROOF AND THIS FUNCTION DOES NOT PRETEND.** They refuse
 * the shapes that get written by accident. A fabricated plausible sentence
 * passes all three, which is `docs/known-gaps.md` G27.
 */
function readOwnerWords(
  entry: Record<string, unknown>,
  id: string,
  board: string,
  file: string,
): readonly string[] {
  const words = readList(entry, "ownerWords", id, file)
  if (words.length === 0) {
    refuse(
      "approvals-no-words",
      `the approval ${id} quotes nothing in "ownerWords". HIS WORDS ARE THE EVIDENCE AND A ` +
        "RECORD THAT MERELY ASSERTS APPROVAL IS REFUSED: a paraphrase is an agent's " +
        "reconstruction, and this entry exists so a reader can check what was actually said " +
        "against what is being claimed from it. Quote him - one utterance per entry of the list, " +
        "as he typed it, typos included - or delete the entry and report the run instead of " +
        "adopting it.",
      file,
    )
  }
  const joined = words.join(" ")
  for (const marker of NARRATION_MARKERS) {
    if (joined.toLowerCase().includes(marker)) {
      refuse(
        "approvals-words-narrated",
        narratedDetail(id, joined, marker),
        file,
      )
    }
  }
  const spoken = isSpokenVoice(joined)
  const selected = isSelectionFor(words, board)
  if (!spoken && !selected) {
    refuse(
      "approvals-words-not-spoken",
      neitherShapeDetail(id, joined, board),
      file,
    )
  }
  return words
}

/** One entry, every field read BY NAME and nothing spread. */
export function readEntry(value: unknown, index: number, file: string): RenderApproval {
  if (!isRecord(value)) {
    refuse(
      "approvals-entry-not-an-object",
      `approval ${index} is ${kindOf(value)} and every entry must be a JSON object carrying ` +
        `${APPROVAL_ENTRY_KEYS.length} fields: ${APPROVAL_ENTRY_KEYS.join(", ")}.`,
      file,
    )
  }
  const rawId = value["id"]
  const id =
    typeof rawId === "string" && rawId.trim() !== "" ? `"${rawId}"` : `at position ${index}`

  for (const key of Object.keys(value)) {
    if (!APPROVAL_ENTRY_KEYS.some((known) => known === key)) {
      refuse(
        "approvals-unknown-entry-key",
        `the approval ${id} carries "${key}", which is not an approval field. Schema ` +
          `${APPROVALS_SCHEMA} names exactly: ${APPROVAL_ENTRY_KEYS.join(", ")}. A key the ` +
          "loader drops is a qualification somebody believes is recorded and nothing reads.",
        file,
      )
    }
  }
  for (const key of APPROVAL_ENTRY_KEYS) {
    if (!(key in value)) {
      refuse("approvals-missing-field", `the approval ${id} has no "${key}". ${NOT_DEFAULTED}`, file)
    }
  }

  const grantedBy = readText(value, "grantedBy", id, file)
  if (!isGrantor(grantedBy)) {
    refuse(
      "approvals-unknown-grantor",
      `the approval ${id} was granted by "${grantedBy}", and only ` +
        `${APPROVAL_GRANTORS.join(", ")} may grant one. An agent may never author the acceptance ` +
        "criteria for the artifact it is producing (CLAUDE.md, and " +
        "docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md), and an agent that " +
        "could approve its own board would be authoring the criterion outright rather than by " +
        `subtraction. Nothing is substituted: show him the render, and record what he says in ` +
        `${APPROVALS_FILE}.`,
      file,
    )
  }

  return {
    id: readText(value, "id", id, file),
    board: readText(value, "board", id, file),
    candidateSha256: readCandidateHash(readText(value, "candidateSha256", id, file), id, file),
    renderedFrom: readText(value, "renderedFrom", id, file),
    admits: readAdmits(value, id, file),
    why: readText(value, "why", id, file),
    grantedBy,
    grantedOn: readGrantedOn(readText(value, "grantedOn", id, file), id, file),
    ownerWords: readOwnerWords(value, id, readText(value, "board", id, file), file),
    doesNotExcuse: readEdges(value, id, file),
    consultedBy: readConsumers(value, id, file),
    note: readText(value, "note", id, file),
  }
}
