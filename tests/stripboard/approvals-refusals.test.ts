/**
 * The strictness of `tools/stripboard/approvals.ts`, one refusal at a time.
 *
 * **THE DANGEROUS DEFAULT HERE IS "APPROVED", AND IT IS WORSE THAN AN
 * EXEMPTION'S.** An exemption lets a measurement of a board he built be reported
 * instead of refused; an approval lets a board the pipeline produced be WRITTEN
 * INTO `boards/`. A loader that filled in a missing field, ignored a key it did
 * not know, or shrugged at an entry it could not parse would be a loader that
 * admits a board on nobody's word. Every clause below refuses BY NAME instead.
 *
 * **THE THREE TESTS TO READ FIRST ARE THE ONES ABOUT HIS WORDS.** The brief that
 * asked for this mechanism named the danger plainly - an agent claiming the
 * owner's approval that was never given - so the perturbations are the ones a
 * well-meaning agent in a hurry would really write: the quote left out, the
 * quote replaced by a paraphrase, the quote replaced by a field-filling phrase.
 * **None of them proves he said anything**, which the loader's own comment says
 * and `docs/known-gaps.md` G27 records.
 *
 * **EVERY ASSERTION ANCHORS ON THE OPENING CODE** - `./exemptions-refusals.test.ts`'s
 * convention, and for its reason: two dozen refusals over a file where every
 * message mentions the same words, so a `toContain` would pass against the
 * neighbouring clause.
 *
 * **THE FIXTURES ARE MUTATED COPIES OF THE COMMITTED REGISTRY**
 * (`./approvals-fixtures.ts`), never the committed file itself, so a refusal is
 * proven over the shape that is really loaded.
 *
 * The artifact itself, the verdicts and the standing consulted-by check are
 * `./approvals.test.ts`.
 */
import { afterAll, expect, test } from "bun:test"
import path from "node:path"
import { loadApprovals } from "../../tools/stripboard/approvals.ts"
import { cleanUpTempScratch } from "../support/temp-scratch.ts"
import { committedEntry, fixture, refusalFrom } from "./approvals-fixtures.ts"

afterAll(cleanUpTempScratch)

/** What the loader said when handed `mutation`, or "" when it accepted it. */
function refusal(mutation: Parameters<typeof fixture>[0]): string {
  return refusalFrom(() => loadApprovals(fixture(mutation)))
}

/** One entry with `patch` merged in, as the only entry in the file. */
function onlyEntry(patch: Readonly<Record<string, unknown>>): string {
  return refusalFrom(() =>
    loadApprovals(fixture({ entries: [{ ...committedEntry(0), ...patch }] })),
  )
}

/** One entry with `field` removed, as the only entry in the file. */
function withoutField(field: string): string {
  const entry = committedEntry(0)
  delete entry[field]
  return refusalFrom(() => loadApprovals(fixture({ entries: [entry] })))
}

// ---------------------------------------------------------------------------
// His words: the three shapes an agent in a hurry writes
// ---------------------------------------------------------------------------

test("A RECORD WITH NO QUOTE IS REFUSED, and that is the whole point of the field", () => {
  // THE FIRST THING A FORGER DOES IS NOT QUOTE HIM, because a quote is the one
  // part that cannot be derived from the task. Both spellings of absence refuse:
  // the field missing, and the field present and empty.
  const missing = withoutField("ownerWords")
  expect(missing).toStartWith("approvals-missing-field")
  expect(missing).toContain("ownerWords")
  const empty = onlyEntry({ ownerWords: [] })
  expect(empty).toStartWith("approvals-no-words")
  expect(empty, "it says the words are the evidence").toContain("HIS WORDS ARE THE EVIDENCE")
  expect(empty, "and what to do instead of asserting approval").toContain(
    "report the run instead of adopting it",
  )
})

test("A PARAPHRASE IN THE AGENT'S VOICE IS REFUSED, by the narration it carries", () => {
  // WHAT A WELL-MEANING AGENT ACTUALLY WRITES. It is true, it is well
  // intentioned, and it is a report about him rather than a quotation of him -
  // so there is nothing for a reader to check the claim against.
  const message = onlyEntry({
    ownerWords: ["The owner approved this layout after looking at the render."],
  })
  expect(message).toStartWith("approvals-words-narrated")
  expect(message, "it names the phrase that gave it away").toContain("the owner")
  expect(message, "and says where an agent's account belongs").toContain(
    'the reason belongs in "why"',
  )
})

test("A FIELD-FILLING PHRASE IS REFUSED, because nobody is speaking in it", () => {
  // THE SECOND SHAPE, AND THE BLACKLIST DOES NOT CATCH IT - "approved on the
  // render" narrates nothing and names nobody. What it has instead is nobody in
  // the first or second person, which is what a quote of somebody telling you a
  // board is fine always has.
  const message = onlyEntry({ ownerWords: ["approved on the render, 2026-10-16"] })
  expect(message).toStartWith("approvals-words-not-spoken")
  expect(message, "it quotes back what it was given").toContain("approved on the render")
  expect(message, "and refuses to widen the list to fit one record").toContain(
    "put it to him rather than widening",
  )
})

test("his real words pass both readings, which is what makes the two guards tests and not walls", () => {
  // THE CONTROL. A guard that refused everything would pass the three tests
  // above and be worthless, so the committed entry's own words are driven
  // through the same loader - lower-case "i" and all.
  expect(refusal({})).toBe("")
  expect(
    onlyEntry({
      ownerWords: ["i prefer the loose layout. It's much easier to build. I don't see the problem"],
    }),
    "one of the two, alone",
  ).toBe("")
  expect(
    onlyEntry({ ownerWords: ["You should keep a record of exemptions"] }),
    "and the words behind the exemptions registry, for a second real sample",
  ).toBe("")
})

// ---------------------------------------------------------------------------
// The scope
// ---------------------------------------------------------------------------

test("a candidate hash that is not one refuses, in every shape a paste arrives in", () => {
  const entry = committedEntry(0)
  const real = entry["candidateSha256"]
  if (typeof real !== "string") throw new Error("the committed entry has no candidateSha256")
  for (const [what, value] of [
    ["a board name", "pultec-low-boost"],
    ["the first twelve characters", real.slice(0, 12)],
    ["the same hash uppercased", real.toUpperCase()],
    ["a hash with a space in it", `${real.slice(0, 32)} ${real.slice(33)}`],
  ] as const) {
    const message = onlyEntry({ candidateSha256: value })
    expect(message, what).toStartWith("approvals-candidate-hash-shape")
    expect(message, `${what}: it says the field is the scope`).toContain(
      "THIS FIELD IS THE WHOLE SCOPE OF THE APPROVAL",
    )
  }
})

test("two approvals over one candidate refuse, and two over one board do not", () => {
  const entry = committedEntry(0)
  const twice = refusalFrom(() =>
    loadApprovals(fixture({ entries: [entry, { ...entry, id: "second-look" }] })),
  )
  expect(twice).toStartWith("approvals-duplicate-candidate")
  expect(twice, "it says a new render is a new hash").toContain("new candidate hash")
  // TWO LOOKS AT TWO RENDERS OF ONE BOARD IS TWO GRANTS, and the registry has to
  // be able to hold both - which is where this file differs from
  // stripboard/exemptions.json, whose subjects are boards that will not change
  // again.
  const second = {
    ...entry,
    id: "second-look",
    candidateSha256: "b".repeat(64),
  }
  expect(
    refusalFrom(() => loadApprovals(fixture({ entries: [entry, second] }))),
    "one board, two renders, two grants",
  ).toBe("")
})

test("two approvals sharing an id refuse, because a notice cites one", () => {
  const entry = committedEntry(0)
  const message = refusalFrom(() =>
    loadApprovals(fixture({ entries: [entry, { ...entry, candidateSha256: "c".repeat(64) }] })),
  )
  expect(message).toStartWith("approvals-duplicate-id")
})

// ---------------------------------------------------------------------------
// The edges
// ---------------------------------------------------------------------------

test("an entry that has not thought about three ways of being misread refuses", () => {
  const thin = onlyEntry({
    doesNotExcuse: [
      "it does not travel to different bytes - candidateSha256 is the scope",
      "it does not excuse violationsOf",
    ],
  })
  expect(thin).toStartWith("approvals-thin-edges")
  expect(thin).toContain("at least 3 are required")
})

test("an entry that nowhere names violationsOf or candidateSha256 refuses, by the name it omits", () => {
  const edges = [
    "it does not travel to different bytes, which the hash in this entry is for",
    "it does not excuse a board that is not the circuit",
    "it does not excuse any other check the gate runs",
  ]
  const soundness = onlyEntry({ doesNotExcuse: edges })
  expect(soundness).toStartWith("approvals-edge-unaddressed")
  expect(soundness, "the symbol it wanted").toContain("violationsOf")
  const scope = onlyEntry({
    doesNotExcuse: [
      "it does not excuse violationsOf, which is electrical soundness",
      "it does not excuse any other check the gate runs",
      "it is one board's look and not a standard",
    ],
  })
  expect(scope).toStartWith("approvals-edge-unaddressed")
  expect(scope, "the other symbol").toContain("candidateSha256")
})

// ---------------------------------------------------------------------------
// The file, the entry list and the notes block
// ---------------------------------------------------------------------------

test("a registry that is not there refuses, and nothing is approved by default", () => {
  const absent = path.join(path.dirname(fixture({})), "no-such-approvals.json")
  const message = refusalFrom(() => loadApprovals(absent))
  expect(message).toStartWith("approvals-unreadable")
  // THE DIRECTION IS THE POINT: a missing registry is not "no board is approved"
  // and it is certainly not "every board is". It is a refusal.
  expect(message).toContain('an absent registry is not "no board is approved"')
})

test("a registry that is not JSON, or not an object, refuses by its own code", () => {
  const scratch = path.dirname(fixture({}))
  const notJson = path.join(scratch, "not-json.json")
  const notObject = path.join(scratch, "not-object.json")
  Bun.write(notJson, "{ not json")
  Bun.write(notObject, "[]")
  expect(refusalFrom(() => loadApprovals(notJson))).toStartWith("approvals-not-json")
  expect(refusalFrom(() => loadApprovals(notObject))).toStartWith("approvals-not-an-object")
})

test("a schema that is not 1 refuses rather than being read as 1", () => {
  expect(refusal({ set: { schema: 2 } })).toStartWith("approvals-schema")
  expect(refusal({ omit: "schema" })).toStartWith("approvals-missing-key")
})

test("an unknown top-level key, and an unknown entry key, each refuse by name", () => {
  const top = refusal({ set: { approved: true } })
  expect(top).toStartWith("approvals-unknown-key")
  expect(top, "a key the loader drops is a condition nobody checked").toContain("approved")
  const entry = onlyEntry({ expires: "2026-12-01" })
  expect(entry).toStartWith("approvals-unknown-entry-key")
  expect(entry).toContain("expires")
})

test("an empty approvals list refuses rather than governing nothing", () => {
  const message = refusal({ entries: [] })
  expect(message).toStartWith("approvals-empty")
  expect(message, "and it says to delete the file rather than keep an empty one").toContain(
    "delete it",
  )
})

test("an approvals value that is not a list, and an entry that is not an object, refuse", () => {
  expect(refusal({ entries: "owner-render-pultec-low-boost-rcm-s0" })).toStartWith(
    "approvals-not-a-list",
  )
  expect(refusal({ entries: ["owner-render-pultec-low-boost-rcm-s0"] })).toStartWith(
    "approvals-entry-not-an-object",
  )
})

test("every field is required, and a blank one is the same as none", () => {
  for (const field of [
    "id",
    "board",
    "candidateSha256",
    "renderedFrom",
    "why",
    "grantedBy",
    "grantedOn",
    "note",
  ]) {
    expect(withoutField(field), field).toStartWith("approvals-missing-field")
    expect(onlyEntry({ [field]: "   " }), field).toStartWith("approvals-blank-field")
    expect(onlyEntry({ [field]: 7 }), field).toStartWith("approvals-field-type")
  }
})

test("an admits list that is empty, duplicated or not a list refuses", () => {
  expect(onlyEntry({ admits: [] })).toStartWith("approvals-admits-nothing")
  expect(onlyEntry({ admits: ["no-search", "no-search"] })).toStartWith(
    "approvals-duplicate-termination",
  )
  expect(onlyEntry({ admits: "no-search" })).toStartWith("approvals-field-type")
})

test("a grant date that is not a date, or is a date that does not exist, refuses", () => {
  expect(onlyEntry({ grantedOn: "16 October 2026" })).toStartWith("approvals-granted-on")
  const impossible = onlyEntry({ grantedOn: "2026-02-30" })
  expect(impossible).toStartWith("approvals-granted-on")
  expect(impossible, "nothing is rounded to a neighbouring day").toContain("does not exist")
})

test("a consultedBy that is empty, or names a file that is not there, refuses", () => {
  const none = onlyEntry({ consultedBy: [] })
  expect(none).toStartWith("approvals-no-consumer")
  expect(none, "an approval nobody reads is a gate nobody opened").toContain(
    "a gate nobody opened",
  )
  const gone = onlyEntry({ consultedBy: ["tools/stripboard/adopt-checks-renamed.ts"] })
  expect(gone).toStartWith("approvals-consumer-missing")
})

test("the notes block is required, complete, and holds no note for nothing", () => {
  expect(refusal({ omit: "notes" })).toStartWith("approvals-missing-key")
  expect(refusal({ notes: [] })).toStartWith("approvals-notes-type")
  expect(refusal({ dropNote: "ownerWords" })).toStartWith("approvals-missing-note")
  expect(refusal({ setNote: { expiry: "a note for a field that does not exist" } })).toStartWith(
    "approvals-unknown-note",
  )
  expect(refusal({ setNote: { admits: "  " } })).toStartWith("approvals-blank-note")
  expect(refusal({ setNote: { admits: 3 } })).toStartWith("approvals-note-type")
})
