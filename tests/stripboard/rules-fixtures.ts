/**
 * Fixtures for `rules.test.ts`: a modified copy of the COMMITTED rules file,
 * written somewhere temporary.
 *
 * Its own module for the reason `lib/import-closure.ts` is: the test file is the
 * assertions, and a helper that writes files is a different kind of thing. It
 * NEVER touches `stripboard/rules.json`.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { RULES_PATH } from "../../tools/stripboard/rules.ts"

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * A modified copy of the committed file, whose path is returned.
 *
 * Starting from the committed content rather than from a hand-written minimal
 * object is the point: a fixture built by hand would drift from the real file,
 * and these refusals would then be proven over a shape nobody loads.
 *
 * Three keys are RESERVED and are not top-level overrides: `omit` removes one
 * top-level key, `dropNote` removes one notes entry, and `setNote` merges
 * entries into `notes` - its values deliberately `unknown`, so a non-string
 * note can be written. Anything else is written at the top level, which is how
 * an unknown key gets into a fixture.
 */
export function fixture(mutation: Readonly<Record<string, unknown>>): string {
  const parsed: unknown = JSON.parse(fs.readFileSync(RULES_PATH, "utf8"))
  if (!isRecord(parsed)) throw new Error("the committed rules file is not a JSON object")
  const committedNotes = parsed["notes"]
  if (!isRecord(committedNotes)) throw new Error("the committed rules file has no notes object")

  const notes: Record<string, unknown> = { ...committedNotes }
  const built: Record<string, unknown> = { ...parsed }

  for (const [key, value] of Object.entries(mutation)) {
    if (key === "omit") {
      if (typeof value !== "string") throw new Error("fixture: omit takes a key name")
      delete built[value]
    } else if (key === "dropNote") {
      if (typeof value !== "string") throw new Error("fixture: dropNote takes a key name")
      delete notes[value]
    } else if (key === "setNote") {
      if (!isRecord(value)) throw new Error("fixture: setNote takes an object")
      for (const [noteKey, noteValue] of Object.entries(value)) notes[noteKey] = noteValue
    } else {
      built[key] = value
    }
  }
  if (!("notes" in mutation)) built["notes"] = notes

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stripboard-rules-"))
  const file = path.join(dir, "rules.json")
  fs.writeFileSync(file, JSON.stringify(built, null, 2))
  return file
}

/** The message a call refused with, or "" when it did not refuse at all. */
export function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}
