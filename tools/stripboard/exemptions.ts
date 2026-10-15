/**
 * The STRICT LOADER for `stripboard/exemptions.json`, and the ONLY way in.
 *
 * **WHY THE STRICTNESS IS NOT FUSSINESS, AND IT IS SHARPER HERE THAN IN
 * `./rules.ts`: THE DANGEROUS DEFAULT IS "EXEMPT".** A loader that filled in a
 * missing field, ignored a key it did not know, or shrugged at an entry it could
 * not parse would be a loader that can turn a hard placement rule off by
 * accident, quietly, in a file that reads as governance. Every clause refuses BY
 * NAME, and **there is no default anywhere in these three modules.**
 *
 * **THIS AREA IS THREE FILES AT TWO REAL SEAMS, AND THIS ONE IS THE FRONT
 * DOOR** - every declaration and function a consumer needs is exported or
 * re-exported here, so nobody imports the parts:
 *
 *   - `./exemptions-model.ts` - WHAT a recorded exemption is: the path, the
 *     schema version, the eleven fields, the two exemptable rules, who may grant
 *     one, and the verdict shape. It reads nothing and refuses nothing;
 *   - `./exemptions-read.ts` - the refusal vocabulary and the reader for ONE
 *     entry, which is where most of the refusals live;
 *   - `./exemptions-consult.ts` - the CONSULTATION: `verdictFor`, `noticesOf`,
 *     and the audit trail of which entries actually excused something.
 *
 * This file is then the file level and nothing else: the schema, the unknown-key
 * refusal, the entry list, the notes block, and `loadExemptions`.
 *
 * **AN EXEMPTION MAKES A VIOLATION REPORTED, NOT INVISIBLE.** `verdictFor`
 * answers with a discriminated union rather than a boolean, and `noticesOf` is
 * the one call that turns verdicts into the lines a run must print. An exempt
 * board does not fail and does not go quiet: **a silent exemption is a skipped
 * check that looks like a passing one.**
 *
 * **WHY THE REGISTRY EXISTS, in the owner's words, 2026-10-15:** ***"You should
 * keep a record of exemptions. My ad-built boards should be exempt from the
 * stricter standards of our new tooling—and, that exemption should carry a
 * reason and provenance so we don't have to keep having this dumb
 * conversation"*** - *"ad-built"* is his typo for *"as-built"* and is quoted as
 * he typed it.
 *
 * **IT IS IN `tools/` AND THAT IS THE BOUNDARY, NOT A FILING CHOICE.**
 * `lib/stripboard/` is the core; it may not import from `tools/` and it never
 * reads a file, and `tests/stripboard/model/no-fork.test.ts` enforces both
 * transitively. So the two rules an exemption names cannot see this file, which
 * is exactly right: **an exemption excuses a measurement of an as-built
 * artifact, and it can never reach the rule a generated board is held to.**
 */
import fs from "node:fs"
import path from "node:path"
import {
  EXEMPTIONS_PATH,
  NOTE_KEYS,
  type Exemption,
  type ExemptionRegistry,
} from "./exemptions-model.ts"
import {
  isRecord,
  isUnknownArray,
  kindOf,
  present,
  readEntry,
  readSchema,
  refuse,
  rejectUnknown,
} from "./exemptions-read.ts"

export {
  EXEMPTABLE_RULES,
  EXEMPTIONS_FILE,
  EXEMPTIONS_PATH,
  EXEMPTIONS_SCHEMA,
  GRANTORS,
  SUBJECT_KINDS,
  type Exemption,
  type ExemptableRule,
  type ExemptionRegistry,
  type ExemptionVerdict,
  type Grantor,
  type Measured,
  type SubjectKind,
} from "./exemptions-model.ts"

export {
  consultedIds,
  noticesOf,
  unconsulted,
  verdictFor,
} from "./exemptions-consult.ts"

/** The entry list: present, a list, non-empty, with distinct ids and subjects. */
function readEntries(parsed: Record<string, unknown>, file: string): readonly Exemption[] {
  const value = present(parsed, "exemptions", file)
  if (!isUnknownArray(value)) {
    refuse(
      "exemptions-not-a-list",
      `"exemptions" is ${kindOf(value)} and must be an array of entries, one per exempt subject.`,
      file,
    )
  }
  if (value.length === 0) {
    refuse(
      "exemptions-empty",
      '"exemptions" is empty. A registry that exempts nothing is a file that looks like ' +
        "governance and governs nothing, which is worse than no file at all: delete it, and " +
        "delete tools/stripboard/exemptions.ts's callers with it, rather than leaving an empty " +
        "one for somebody to find and trust.",
      file,
    )
  }
  const entries: Exemption[] = []
  for (const [index, raw] of value.entries()) {
    const entry = readEntry(raw, index, file)
    for (const already of entries) {
      if (already.id === entry.id) {
        refuse(
          "exemptions-duplicate-id",
          `two exemptions share the id "${entry.id}". An id is how a notice cites the entry that ` +
            "excused something, so two of them make a notice ambiguous about which grant it is " +
            "reporting under.",
          file,
        )
      }
      if (already.subject === entry.subject) {
        refuse(
          "exemptions-duplicate-subject",
          `two exemptions are over "${entry.subject}" - "${already.id}" and "${entry.id}". That ` +
            "is two places to look for what one artifact is excused from, and the second would " +
            "be found by nobody. One entry per subject; widen its \"from\" instead.",
          file,
        )
      }
    }
    entries.push(entry)
  }
  return entries
}

/** The notes block: one non-blank string per recorded decision, and nothing else. */
function readNotes(parsed: Record<string, unknown>, file: string): Readonly<Record<string, string>> {
  const value = present(parsed, "notes", file)
  if (!isRecord(value)) {
    refuse("exemptions-notes-type", `"notes" must be a JSON object, got ${kindOf(value)}.`, file)
  }
  for (const key of Object.keys(value)) {
    if (!NOTE_KEYS.includes(key)) {
      refuse(
        "exemptions-unknown-note",
        `"notes" carries an entry for "${key}", which is not part of this registry's design. ` +
          `The notes block records one decision per design field - ${NOTE_KEYS.join(", ")} - and ` +
          "an entry's own reasoning belongs in its \"note\". A note for nothing is a reason " +
          "nobody can check against anything.",
        file,
      )
    }
  }
  const notes: Record<string, string> = {}
  for (const key of NOTE_KEYS) {
    if (!(key in value)) {
      refuse(
        "exemptions-missing-note",
        `"notes" has no entry for "${key}". Every design field carries a note recording why the ` +
          "registry is shaped this way, because a shape with no reason gets reshaped by the next " +
          "reader - and this file exists precisely so one decision stops being re-argued.",
        file,
      )
    }
    const note = value[key]
    if (typeof note !== "string") {
      refuse(
        "exemptions-note-type",
        `the note for "${key}" must be a string, got ${kindOf(note)}.`,
        file,
      )
    }
    if (note.trim() === "") {
      refuse(
        "exemptions-blank-note",
        `the note for "${key}" is blank, which is the same as no note.`,
        file,
      )
    }
    notes[key] = note
  }
  return notes
}

/**
 * Load the recorded exemptions, defaulting only the PATH and never a value.
 *
 * Every field is read BY NAME: a spread of the parsed object would carry an
 * unknown key through and make `rejectUnknown` decorative, which is the one
 * mistake this module cannot make and still be worth having.
 */
export function loadExemptions(file: string = EXEMPTIONS_PATH): ExemptionRegistry {
  const abs = path.resolve(file)

  let contents: string
  try {
    contents = fs.readFileSync(abs, "utf8")
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    refuse(
      "exemptions-unreadable",
      `the stripboard exemptions registry could not be read: ${detail}. It is NOT defaulted ` +
        "either way: an absent registry is not \"nobody is exempt\" and it is certainly not " +
        "\"everybody is\". Restore the file, or remove the consultation that asked for it.",
      abs,
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    refuse("exemptions-not-json", `the exemptions registry is not valid JSON: ${detail}.`, abs)
  }

  if (!isRecord(parsed)) {
    refuse(
      "exemptions-not-an-object",
      `the exemptions registry must hold a JSON object at the top level, got ${kindOf(parsed)}.`,
      abs,
    )
  }

  const schema = readSchema(parsed, abs)
  rejectUnknown(parsed, abs)
  return { schema, exemptions: readEntries(parsed, abs), notes: readNotes(parsed, abs) }
}