/**
 * The strictness of `tools/stripboard/exemptions.ts`, one refusal at a time.
 *
 * **THE DANGEROUS DEFAULT HERE IS "EXEMPT", AND THAT IS THE WHOLE REASON THIS
 * FILE IS AS LONG AS IT IS.** A loader that filled in a missing field, ignored a
 * key it did not know, or shrugged at an entry it could not parse would be a
 * loader that can turn a hard placement rule off by accident - quietly, in a
 * file that reads as governance. Every clause below refuses BY NAME instead, and
 * every refusal names what is missing, where to fix it, and why nothing is
 * substituted.
 *
 * **EVERY ASSERTION ANCHORS ON THE OPENING CODE.** The loader raises two dozen
 * refusals over a file where every message mentions the same words - "exempt",
 * "entry", "the owner" - so a `toContain` would pass against the neighbouring
 * clause. Each assertion uses `toStartWith` on the code and then checks the
 * facts the message must carry, never its prose. That is the convention
 * `./rules.test.ts` set and the reason it set it.
 *
 * **THE FIXTURES ARE MUTATED COPIES OF THE COMMITTED REGISTRY**
 * (`./exemptions-fixtures.ts`), never the committed file itself, so a refusal is
 * proven over the shape that is really loaded.
 *
 * The artifact itself, the verdicts and the standing consulted-by check are
 * `./exemptions.test.ts`.
 */
import { afterAll, expect, test } from "bun:test"
import path from "node:path"
import { loadExemptions } from "../../tools/stripboard/exemptions.ts"
import { cleanUpTempScratch } from "../support/temp-scratch.ts"
import { committedEntry, fixture, refusalFrom } from "./exemptions-fixtures.ts"

afterAll(cleanUpTempScratch)

/** What the loader said when handed `mutation`, or "" when it accepted it. */
function refusal(mutation: Parameters<typeof fixture>[0]): string {
  return refusalFrom(() => loadExemptions(fixture(mutation)))
}

/** One entry with `patch` merged in, as the only entry in the file. */
function onlyEntry(patch: Readonly<Record<string, unknown>>): string {
  return refusalFrom(() => loadExemptions(fixture({ entries: [{ ...committedEntry(0), ...patch }] })))
}

/** One entry with `field` removed, as the only entry in the file. */
function withoutField(field: string): string {
  const entry = committedEntry(0)
  delete entry[field]
  return refusalFrom(() => loadExemptions(fixture({ entries: [entry] })))
}

// ---------------------------------------------------------------------------
// The file
// ---------------------------------------------------------------------------

test("a registry that is not there refuses, and nothing is exempt by default", () => {
  const absent = path.join(path.dirname(fixture({})), "no-such-exemptions.json")
  const message = refusalFrom(() => loadExemptions(absent))
  expect(message).toStartWith("exemptions-unreadable")
  // THE DIRECTION IS THE POINT: a missing registry is not "nobody is exempt" and
  // it is certainly not "everybody is". It is a refusal.
  expect(message).toContain("NOT defaulted")
})

test("malformed JSON, a non-object, and a wrong schema each refuse by name", () => {
  expect(refusal({ set: { schema: 2 } })).toStartWith("exemptions-schema")
  expect(refusal({ set: { schema: "1" } })).toStartWith("exemptions-schema")
  expect(refusal({ omit: "schema" })).toStartWith("exemptions-missing-key")
})

test("an unknown top-level key refuses rather than being ignored", () => {
  const message = refusal({ set: { exceptions: [] } })
  expect(message).toStartWith("exemptions-unknown-key")
  expect(message, "it names the key").toContain("exceptions")
  expect(message, "and lists what schema 1 names").toContain("exemptions")
})

test("a missing, non-list or empty exemption list refuses", () => {
  expect(refusal({ omit: "exemptions" })).toStartWith("exemptions-missing-key")
  expect(refusal({ entries: {} })).toStartWith("exemptions-not-a-list")
  const empty = refusal({ entries: [] })
  expect(empty).toStartWith("exemptions-empty")
  // An empty registry is a FILE THAT LOOKS LIKE GOVERNANCE AND GOVERNS NOTHING.
  // Delete it instead; the loader says so.
  expect(empty).toContain("delete")
})

// ---------------------------------------------------------------------------
// One entry
// ---------------------------------------------------------------------------

test("an entry that is not an object refuses, naming its position", () => {
  const message = refusal({ entries: ["transistor-preamp-feedback"] })
  expect(message).toStartWith("exemptions-entry-not-an-object")
  expect(message, "it names the position").toContain("0")
})

test("an unknown entry key refuses rather than being dropped", () => {
  const message = onlyEntry({ reason: "because" })
  expect(message).toStartWith("exemptions-unknown-entry-key")
  expect(message, "it names the key").toContain("reason")
})

test("every required field refuses by name when it is absent", () => {
  for (const field of [
    "id",
    "subject",
    "subjectKind",
    "from",
    "why",
    "grantedBy",
    "grantedOn",
    "ownerWords",
    "doesNotExcuse",
    "consultedBy",
    "note",
  ]) {
    const message = withoutField(field)
    expect(message, field).toStartWith("exemptions-missing-field")
    expect(message, field).toContain(`"${field}"`)
  }
})

test("a field of the wrong type, and a blank one, are different refusals", () => {
  expect(onlyEntry({ why: 7 })).toStartWith("exemptions-field-type")
  expect(onlyEntry({ from: "rigidOverlap" })).toStartWith("exemptions-field-type")
  expect(onlyEntry({ consultedBy: [3] })).toStartWith("exemptions-field-type")
  const blank = onlyEntry({ why: "   " })
  expect(blank).toStartWith("exemptions-blank-field")
  // A BLANK REASON IS THE SAME AS NO REASON, which is what the owner's grant
  // specifically asked this file to carry.
  expect(blank).toContain("why")
})

test("the rules an exemption is from: none, unknown, or repeated", () => {
  expect(onlyEntry({ from: [] })).toStartWith("exemptions-no-rules")
  const unknown = onlyEntry({ from: ["rigidOverlap", "hc6"] })
  expect(unknown).toStartWith("exemptions-unknown-rule")
  expect(unknown, "it names the rule and the whitelist").toContain("hc6")
  expect(unknown, "and why the whitelist is short").toContain("soundness")
  expect(onlyEntry({ from: ["rigidOverlap", "rigidOverlap"] })).toStartWith(
    "exemptions-duplicate-rule",
  )
})

test("an exemption may only be granted by the owner, and only for a known kind of subject", () => {
  const grantor = onlyEntry({ grantedBy: "agent" })
  expect(grantor).toStartWith("exemptions-unknown-grantor")
  // THE INVARIANT, NOT A FORMALITY: an agent that could grant an exemption from
  // a criterion would be authoring that criterion by subtraction.
  expect(grantor).toContain("never author")
  const kind = onlyEntry({ subjectKind: "generated-board" })
  expect(kind).toStartWith("exemptions-unknown-subject-kind")
  expect(kind, "and the refusal names what the kinds are").toContain("as-built-board")
})

test("a grant with no date, or a date nobody can read, refuses", () => {
  expect(onlyEntry({ grantedOn: "15 October 2026" })).toStartWith("exemptions-granted-on")
  expect(onlyEntry({ grantedOn: "2026-13-01" })).toStartWith("exemptions-granted-on")
  expect(onlyEntry({ grantedOn: "2026-10-15" }), "and the real one is accepted").toBe("")
})

test("the edges must be written down, and electrical soundness by name", () => {
  const thin = onlyEntry({ doesNotExcuse: ["it does not travel to a generated board"] })
  expect(thin).toStartWith("exemptions-thin-edges")
  const silent = onlyEntry({
    doesNotExcuse: ["it does not travel to a generated board", "it is about this artifact"],
  })
  expect(silent).toStartWith("exemptions-soundness-unaddressed")
  // `violationsOf` IS REQUIRED IN THE TEXT because it is the one edge whose
  // absence is dangerous: a reader taking an exemption to cover soundness has
  // read it as excusing a board that is not the circuit.
  expect(silent).toContain("violationsOf")
})

test("an exemption must name something that reads it, and that something must exist", () => {
  const none = onlyEntry({ consultedBy: [] })
  expect(none).toStartWith("exemptions-no-consumer")
  expect(none, "it says what an unread exemption is").toContain("enforces")
  const missing = onlyEntry({ consultedBy: ["tests/stripboard/no-such-consumer.test.ts"] })
  expect(missing).toStartWith("exemptions-consumer-missing")
  expect(missing).toContain("tests/stripboard/no-such-consumer.test.ts")
})

test("two entries may not share an id or a subject", () => {
  const entry = committedEntry(0)
  expect(refusalFrom(() => loadExemptions(fixture({ entries: [entry, entry] })))).toStartWith(
    "exemptions-duplicate-id",
  )
  const renamed = { ...entry, id: "a-second-entry-for-one-board" }
  const message = refusalFrom(() => loadExemptions(fixture({ entries: [entry, renamed] })))
  expect(message).toStartWith("exemptions-duplicate-subject")
  // TWO ENTRIES OVER ONE ARTIFACT IS TWO PLACES TO LOOK for what it is excused
  // from, and the second would be found by nobody.
  expect(message).toContain("transistor-preamp-feedback")
})

// ---------------------------------------------------------------------------
// The notes block
// ---------------------------------------------------------------------------

test("the notes block is required, complete, and holds nothing else", () => {
  expect(refusal({ omit: "notes" })).toStartWith("exemptions-missing-key")
  expect(refusal({ notes: [] })).toStartWith("exemptions-notes-type")
  expect(refusal({ dropNote: "from" })).toStartWith("exemptions-missing-note")
  const unknown = refusal({ setNote: { subjects: "a note for nothing" } })
  expect(unknown).toStartWith("exemptions-unknown-note")
  expect(unknown).toContain("subjects")
  expect(refusal({ setNote: { from: 7 } })).toStartWith("exemptions-note-type")
  expect(refusal({ setNote: { from: "  " } })).toStartWith("exemptions-blank-note")
})
