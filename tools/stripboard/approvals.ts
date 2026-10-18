/**
 * The STRICT LOADER for `stripboard/render-approvals.json`, and the ONLY way in.
 *
 * **WHAT THE REGISTRY IS FOR.** The adoption gate reads `CRITERIA G2.5` through
 * `exitCodeFor(outcome, rule)` over the six stopping rules, and the
 * materialisation path performs no search, so it records `./termination.ts`'s
 * `NO_SEARCH` and the gate had nothing to read. **The clause that admits such a
 * run already existed and no agent authored it** -
 * `docs/superpowers/specs/2026-10-16-pultec-five-boards-design.md`, *Acceptance*
 * channel 4: ***"Whether a board is any good is the owner's call on a render, as
 * it has been for every board in this project. Not a figure, and not the
 * producing agent's."*** This file is how that call reaches the gate.
 *
 * **WHY THE STRICTNESS IS NOT FUSSINESS: THE DANGEROUS DEFAULT IS "APPROVED".**
 * A loader that filled in a missing field, ignored a key it did not know, or
 * shrugged at an entry it could not parse would be a loader that writes a board
 * into `boards/` on nobody's word. Every clause refuses BY NAME, and **there is
 * no default anywhere in these four modules.**
 *
 * **THIS AREA IS FOUR FILES AT THREE REAL SEAMS, AND THIS ONE IS THE FRONT
 * DOOR** - every declaration and function a consumer needs is exported or
 * re-exported here, so nobody imports the parts:
 *
 *   - `./approvals-model.ts` - WHAT a recorded approval is: the path, the schema
 *     version, the twelve fields, the one admissible termination, who may grant
 *     one, the verdict shape, and the two word lists. It reads nothing and
 *     refuses nothing;
 *   - `./approvals-read.ts` - the refusal vocabulary and the reader for ONE
 *     entry, including the three clauses that decide whether `ownerWords` is a
 *     quote or an agent's account of one;
 *   - `./approvals-consult.ts` - the CONSULTATION: `approvalFor`,
 *     `approvalRecord`, and the audit trail of which entries answered something.
 *
 * This file is then the file level and nothing else: the schema, the unknown-key
 * refusal, the entry list, the notes block, and `loadApprovals`.
 *
 * **WHAT AN APPROVAL ADMITS, AND IT IS ONE THING.** It answers *may a run that
 * performed no search be adopted*, for one board, for one candidate hash. It
 * does not excuse a hard-constraint violation, a failed electrical
 * verification, a hash mismatch, a dirty layout or a non-zero `make check`:
 * every one of those is refused by its own check in `./adopt-checks.ts`,
 * `./adopt-verdict.ts` and `./adopt.ts`, each of which still has to pass on its
 * own.
 *
 * **IT IS IN `tools/` AND THAT IS THE BOUNDARY, NOT A FILING CHOICE.**
 * `lib/stripboard/` is the core; it may not import from `tools/` and it never
 * reads a file, and `tests/stripboard/model/no-fork.test.ts` enforces both
 * transitively. So nothing the search or the model does can see this file: **an
 * approval is read at the moment of ADOPTION and can never reach the rules a
 * candidate is graded by.**
 */
import fs from "node:fs"
import path from "node:path"
import {
  APPROVALS_PATH,
  APPROVAL_NOTE_KEYS,
  type ApprovalRegistry,
  type RenderApproval,
} from "./approvals-model.ts"
import {
  isRecord,
  isUnknownArray,
  kindOf,
  present,
  readEntry,
  readSchema,
  refuse,
  rejectUnknown,
} from "./approvals-read.ts"

export {
  ADMITTED_TERMINATIONS,
  APPROVALS_FILE,
  APPROVALS_PATH,
  APPROVALS_SCHEMA,
  APPROVAL_EDGES_REQUIRED,
  APPROVAL_ENTRY_KEYS,
  APPROVAL_GRANTORS,
  APPROVAL_REQUIRED_EDGE_NAMES,
  FIRST_OR_SECOND_PERSON,
  NARRATION_MARKERS,
  type AdmittedTermination,
  type ApprovalGrantor,
  type ApprovalRegistry,
  type ApprovalVerdict,
  type AskedAbout,
  type RenderApproval,
} from "./approvals-model.ts"

export {
  approvalFor,
  approvalRecord,
  consultedApprovalIds,
  unconsultedApprovals,
} from "./approvals-consult.ts"

/**
 * The entry list: present, a list, non-empty, with distinct ids and distinct
 * board-and-candidate pairs.
 *
 * **TWO ENTRIES OVER ONE BOARD ARE ALLOWED AND TWO OVER ONE CANDIDATE ARE
 * NOT**, which is the one place this registry's uniqueness rule differs from
 * `stripboard/exemptions.json`'s and it follows from what an approval is over.
 * A board is laid out again and again, so a second look at a second render is a
 * second grant and has to be recordable; the same BYTES approved twice is one
 * decision written down twice, and `approvalFor` would answer from whichever
 * came first.
 */
function readEntries(parsed: Record<string, unknown>, file: string): readonly RenderApproval[] {
  const value = present(parsed, "approvals", file)
  if (!isUnknownArray(value)) {
    refuse(
      "approvals-not-a-list",
      `"approvals" is ${kindOf(value)} and must be an array of entries, one per approved render.`,
      file,
    )
  }
  if (value.length === 0) {
    refuse(
      "approvals-empty",
      '"approvals" is empty. A registry that approves nothing is a file that looks like ' +
        "governance and governs nothing, which is worse than no file at all: delete it, and " +
        "delete tools/stripboard/approvals.ts's callers with it, rather than leaving an empty " +
        "one for somebody to find and trust.",
      file,
    )
  }
  const entries: RenderApproval[] = []
  for (const [index, raw] of value.entries()) {
    const entry = readEntry(raw, index, file)
    for (const already of entries) {
      if (already.id === entry.id) {
        refuse(
          "approvals-duplicate-id",
          `two approvals share the id "${entry.id}". An id is how a notice and a run directory ` +
            "cite the entry a board was admitted on, so two of them make that citation ambiguous.",
          file,
        )
      }
      if (already.candidateSha256 === entry.candidateSha256) {
        refuse(
          "approvals-duplicate-candidate",
          `two approvals are over the candidate ${entry.candidateSha256} - "${already.id}" and ` +
            `"${entry.id}". That is one decision recorded twice, and a consultation would answer ` +
            "from whichever came first while the second was read by nobody. One entry per set of " +
            "bytes; a NEW render of the same board is a new candidate hash and gets its own " +
            "entry.",
          file,
        )
      }
    }
    entries.push(entry)
  }
  return entries
}

/** The notes block: one non-blank string per recorded decision, and nothing else. */
function readNotes(
  parsed: Record<string, unknown>,
  file: string,
): Readonly<Record<string, string>> {
  const value = present(parsed, "notes", file)
  if (!isRecord(value)) {
    refuse("approvals-notes-type", `"notes" must be a JSON object, got ${kindOf(value)}.`, file)
  }
  for (const key of Object.keys(value)) {
    if (!APPROVAL_NOTE_KEYS.includes(key)) {
      refuse(
        "approvals-unknown-note",
        `"notes" carries an entry for "${key}", which is not part of this registry's design. ` +
          `The notes block records one decision per design field - ` +
          `${APPROVAL_NOTE_KEYS.join(", ")} - and an entry's own reasoning belongs in its ` +
          '"note". A note for nothing is a reason nobody can check against anything.',
        file,
      )
    }
  }
  const notes: Record<string, string> = {}
  for (const key of APPROVAL_NOTE_KEYS) {
    if (!(key in value)) {
      refuse(
        "approvals-missing-note",
        `"notes" has no entry for "${key}". Every design field carries a note recording why the ` +
          "registry is shaped this way, because a shape with no reason gets reshaped by the next " +
          "reader - and this file exists precisely so one decision stops being re-argued.",
        file,
      )
    }
    const note = value[key]
    if (typeof note !== "string") {
      refuse("approvals-note-type", `the note for "${key}" must be a string, got ${kindOf(note)}.`, file)
    }
    if (note.trim() === "") {
      refuse("approvals-blank-note", `the note for "${key}" is blank, which is the same as no note.`, file)
    }
    notes[key] = note
  }
  return notes
}

/**
 * Load the recorded approvals, defaulting only the PATH and never a value.
 *
 * Every field is read BY NAME: a spread of the parsed object would carry an
 * unknown key through and make `rejectUnknown` decorative, which is the one
 * mistake this module cannot make and still be worth having.
 */
export function loadApprovals(file: string = APPROVALS_PATH): ApprovalRegistry {
  const abs = path.resolve(file)

  let contents: string
  try {
    contents = fs.readFileSync(abs, "utf8")
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    refuse(
      "approvals-unreadable",
      `the render-approvals registry could not be read: ${detail}. It is NOT defaulted either ` +
        'way: an absent registry is not "no board is approved" and it is certainly not "every ' +
        'board is". Restore the file, or remove the consultation that asked for it.',
      abs,
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    refuse("approvals-not-json", `the render-approvals registry is not valid JSON: ${detail}.`, abs)
  }

  if (!isRecord(parsed)) {
    refuse(
      "approvals-not-an-object",
      `the render-approvals registry must hold a JSON object at the top level, got ` +
        `${kindOf(parsed)}.`,
      abs,
    )
  }

  const schema = readSchema(parsed, abs)
  rejectUnknown(parsed, abs)
  return { schema, approvals: readEntries(parsed, abs), notes: readNotes(parsed, abs) }
}
