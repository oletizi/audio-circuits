/**
 * Fixtures for `./approvals.test.ts` and `./approvals-refusals.test.ts`: a
 * modified copy of the COMMITTED `stripboard/render-approvals.json`, written
 * somewhere temporary.
 *
 * Its own module for the reason `./exemptions-fixtures.ts` is: a test file is
 * the assertions, and a helper that writes files is a different kind of thing.
 * It **NEVER** touches `stripboard/render-approvals.json`.
 *
 * **EVERY FIXTURE STARTS FROM THE COMMITTED CONTENT**, exactly as
 * `./exemptions-fixtures.ts` does and for the same reason: a hand-written
 * minimal object would drift from the real file, and the refusals would then be
 * proven over a shape nobody loads.
 *
 * Its scratch goes through `../support/temp-scratch.ts`, so both test files arm
 * `afterAll(cleanUpTempScratch)` - `./temp-scratch.test.ts` holds that line for
 * every `mkdtemp` site under `tests/`.
 */
import fs from "node:fs"
import path from "node:path"
import { freshTempScratch } from "../support/temp-scratch.ts"
import { APPROVALS_PATH } from "../../tools/stripboard/approvals.ts"

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** The committed registry, parsed - the starting point every fixture mutates. */
function committed(): { readonly top: Record<string, unknown>; readonly entries: unknown[] } {
  const parsed: unknown = JSON.parse(fs.readFileSync(APPROVALS_PATH, "utf8"))
  if (!isRecord(parsed)) throw new Error("the committed approvals file is not a JSON object")
  const entries = parsed["approvals"]
  if (!Array.isArray(entries)) {
    throw new Error('the committed approvals file has no "approvals" array')
  }
  return { top: { ...parsed }, entries: [...entries] }
}

/** One committed entry, parsed, for a test that wants to mutate a field of it. */
export function committedEntry(index: number): Record<string, unknown> {
  const entry = committed().entries[index]
  if (!isRecord(entry)) throw new Error(`the committed approvals file has no entry ${index}`)
  return { ...entry }
}

/**
 * What a fixture may change - `./exemptions-fixtures.ts`'s `Mutation`, field for
 * field, because the two registries are read by two loaders of one shape and a
 * second vocabulary for the same gestures would make the two suites read
 * differently for no reason.
 */
export interface Mutation {
  readonly set?: Readonly<Record<string, unknown>>
  readonly omit?: string
  readonly entries?: unknown
  readonly patchEntry?: {
    readonly index: number
    readonly set?: Readonly<Record<string, unknown>>
    readonly omitKey?: string
  }
  readonly notes?: unknown
  readonly setNote?: Readonly<Record<string, unknown>>
  readonly dropNote?: string
}

/** A modified copy of the committed registry, whose path is returned. */
export function fixture(mutation: Mutation): string {
  const { top, entries } = committed()
  const built: Record<string, unknown> = { ...top }

  if (mutation.entries !== undefined) {
    built["approvals"] = mutation.entries
  } else if (mutation.patchEntry !== undefined) {
    const patch = mutation.patchEntry
    const entry = entries[patch.index]
    if (!isRecord(entry)) throw new Error(`fixture: no committed entry ${patch.index}`)
    const changed: Record<string, unknown> = { ...entry, ...(patch.set ?? {}) }
    if (patch.omitKey !== undefined) delete changed[patch.omitKey]
    built["approvals"] = entries.map((each, at) => (at === patch.index ? changed : each))
  }

  if (mutation.notes !== undefined) {
    built["notes"] = mutation.notes
  } else if (mutation.setNote !== undefined || mutation.dropNote !== undefined) {
    const committedNotes = top["notes"]
    if (!isRecord(committedNotes)) throw new Error("the committed approvals file has no notes")
    const notes: Record<string, unknown> = { ...committedNotes, ...(mutation.setNote ?? {}) }
    if (mutation.dropNote !== undefined) delete notes[mutation.dropNote]
    built["notes"] = notes
  }

  for (const [key, value] of Object.entries(mutation.set ?? {})) built[key] = value
  if (mutation.omit !== undefined) delete built[mutation.omit]

  const file = path.join(freshTempScratch("stripboard-approvals-"), "render-approvals.json")
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
