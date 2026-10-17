/**
 * `stripboard/render-approvals.json` as a committed artifact, the verdicts it
 * answers with, the record a run directory carries, and the standing check that
 * **every entry in it is consulted by something**.
 *
 * **WHAT THE REGISTRY IS, IN ONE SENTENCE: the way an acceptance channel the
 * spec already names reaches the adoption gate.**
 * `docs/superpowers/specs/2026-10-16-pultec-five-boards-design.md`, under
 * *Acceptance*, channel 4: ***"Whether a board is any good is the owner's call
 * on a render, as it has been for every board in this project. Not a figure, and
 * not the producing agent's."*** The gate reads `CRITERIA G2.5` through
 * `exitCodeFor(outcome, rule)` over the six stopping rules, the materialisation
 * path performs no search, and so the gate had nothing to read. **No clause was
 * authored here. A channel was wired.**
 *
 * **THE DANGER THIS FILE IS WRITTEN AGAINST IS AN AGENT CLAIMING AN APPROVAL
 * THAT WAS NEVER GIVEN**, and the tests are grouped by what resists it: the
 * quote is required and is checked for being a quote rather than a report; the
 * scope is a candidate hash and a different board is UNAPPROVED by the same
 * entry; and the channel admits exactly one thing, so a board failing any other
 * check is refused with an approval on record and unread.
 *
 * **WHAT NONE OF IT PROVES.** No file can prove the owner said anything. These
 * tests pin what the mechanism really does - refuse the shapes an agent in a
 * hurry writes, and make a claim specific and visible - and
 * `docs/known-gaps.md` G27 carries the residual rather than this file implying
 * there is none.
 *
 * **WHAT IS NOT HERE.** The loader's strictness, one clause at a time, is
 * `./approvals-refusals.test.ts`. The run directory this registry is consulted
 * about, produced for real, is `./materialize-run.test.ts`.
 */
import { afterAll, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { importClosure } from "../../lib/import-closure.ts"
import {
  ADMITTED_TERMINATIONS,
  APPROVALS_PATH,
  APPROVAL_GRANTORS,
  approvalFor,
  approvalRecord,
  consultedApprovalIds,
  loadApprovals,
  unconsultedApprovals,
  type RenderApproval,
} from "../../tools/stripboard/approvals.ts"
import { STOPPING_RULES } from "../../tools/stripboard/stop-model.ts"
import { NO_SEARCH } from "../../tools/stripboard/termination.ts"
import { cleanUpTempScratch } from "../support/temp-scratch.ts"
import { fixture, refusalFrom } from "./approvals-fixtures.ts"

afterAll(cleanUpTempScratch)

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..")

/** This file, which an entry may NOT cite as the thing that consults it. */
const SELF = "tests/stripboard/approvals.test.ts"

/** The one approved render, and the board it is over. */
const BOARD = "pultec-low-boost"
const ENTRY_ID = "owner-render-pultec-low-boost-rcm-s0"

function entryFor(board: string): RenderApproval {
  const found = loadApprovals().approvals.find((entry) => entry.board === board)
  if (found === undefined) throw new Error(`no approval for "${board}" in ${APPROVALS_PATH}`)
  return found
}

// ---------------------------------------------------------------------------
// The committed artifact
// ---------------------------------------------------------------------------

test("the committed registry loads, and approves exactly one render", () => {
  const registry = loadApprovals()
  expect(registry.schema).toBe(1)
  expect(registry.approvals.map((entry) => entry.id)).toEqual([ENTRY_ID])
  const entry = entryFor(BOARD)
  expect(entry.grantedBy).toBe("owner")
  expect(entry.grantedOn).toBe("2026-10-16")
  expect([...entry.admits]).toEqual([...ADMITTED_TERMINATIONS])
  // THE SCOPE IS BYTES, so the field is a real sha256 and not a board name
  // wearing one. A truncated or uppercased paste refuses in the loader.
  expect(entry.candidateSha256).toMatch(/^[0-9a-f]{64}$/)
  expect(entry.why.length).toBeGreaterThan(80)
  expect(entry.note.length).toBeGreaterThan(200)
})

test("his words are carried verbatim, as two utterances and not one agent's sentence", () => {
  const entry = entryFor(BOARD)
  // TWO SENTENCES SAID SEPARATELY, kept separate. A single string would have
  // made an agent's concatenation of them the record.
  expect(entry.ownerWords).toHaveLength(2)
  expect(entry.ownerWords[0]).toBe(
    "i prefer the loose layout. It's much easier to build. I don't see the problem",
  )
  expect(entry.ownerWords[1]).toBe(
    "if the layout is electrically correct, let's keep it. It looks fine to me",
  )
  // THE LOWER-CASE "i" IS THE ASSERTION, the same device
  // `./exemptions.test.ts` uses for his preserved typo: a quote an agent tidies
  // is a quote nobody can check against what was said.
  expect(entry.ownerWords[0], "not tidied to an upper-case I").not.toStartWith("I prefer")
  // AND THE SAME WORDS ARE THE AUTHORITY FOR THE WITHDRAWN CLUSTERING BOUND, so
  // the two records cannot drift into two different quotations of one moment.
  const rules = fs.readFileSync(path.join(REPO_ROOT, "stripboard", "rules.json"), "utf8")
  for (const said of entry.ownerWords) {
    expect(rules, `stripboard/rules.json quotes it too: ${said}`).toContain(said)
  }
})

test("every approval writes down its edges, the scope and soundness by name", () => {
  for (const entry of loadApprovals().approvals) {
    expect(entry.doesNotExcuse.length, entry.id).toBeGreaterThanOrEqual(3)
    const all = entry.doesNotExcuse.join(" ")
    // THE TWO THE LOADER REQUIRES, named as symbols rather than described: a
    // name is checkable against the module that exports it and a paraphrase is
    // not.
    expect(all, entry.id).toContain("violationsOf")
    expect(all, entry.id).toContain("candidateSha256")
    // AND THE THIRD EDGE THE DESIGN NAMED: it excuses no other check.
    expect(all, entry.id).toContain("candidate-hash")
  }
})

test("only the owner may grant one, and the whitelist is one", () => {
  expect([...APPROVAL_GRANTORS]).toEqual(["owner"])
  const message = refusalFrom(() =>
    loadApprovals(fixture({ patchEntry: { index: 0, set: { grantedBy: "agent" } } })),
  )
  expect(message).toStartWith("approvals-unknown-grantor")
  expect(message, "it says why an agent may not").toContain(
    "may never author the acceptance criteria",
  )
})

test("a stopping rule is not admissible through this channel, and asking refuses by name", () => {
  const admitted: readonly string[] = ADMITTED_TERMINATIONS
  expect(admitted).toEqual([NO_SEARCH])
  for (const rule of STOPPING_RULES) {
    expect(admitted, `${rule} is decided by exitCodeFor, not by a render`).not.toContain(rule)
  }
  const message = refusalFrom(() =>
    loadApprovals(fixture({ patchEntry: { index: 0, set: { admits: ["Q5"] } } })),
  )
  expect(message).toStartWith("approvals-unknown-termination")
  expect(message, "and names what decides a run that searched").toContain("exitCodeFor")
})

// ---------------------------------------------------------------------------
// The verdicts: scoped to bytes, and never silent
// ---------------------------------------------------------------------------

test("the approved verdict names the board, the bytes and the entry, in one line", () => {
  const entry = entryFor(BOARD)
  const verdict = approvalFor(loadApprovals(), {
    board: BOARD,
    candidateSha256: entry.candidateSha256,
    termination: NO_SEARCH,
  })
  if (verdict.outcome !== "approved") {
    throw new Error(`expected an approved verdict, got ${verdict.outcome}`)
  }
  expect(verdict.approval.id).toBe(ENTRY_ID)
  expect(verdict.notice.includes("\n"), "one line").toBe(false)
  expect(verdict.notice).toContain(BOARD)
  expect(verdict.notice).toContain(entry.candidateSha256)
  expect(verdict.notice, "where the grant is recorded").toContain(
    "stripboard/render-approvals.json",
  )
  expect(verdict.notice, "and that it was not a search result").toContain("NOT on a search result")
})

test("THE SCOPE: the same board with different bytes is UNAPPROVED by the same entry", () => {
  // **THE ONE THING THAT MAKES THIS REGISTRY SAFE TO HAVE.** Approval of a
  // render is approval of THAT board as rendered. A later run that places
  // low-boost differently produces a different candidate hash, and this entry
  // does not cover it - which is the whole reason the hash is in the record
  // rather than the board name alone.
  const verdict = approvalFor(loadApprovals(), {
    board: BOARD,
    candidateSha256: "0".repeat(64),
    termination: NO_SEARCH,
  })
  if (verdict.outcome !== "unapproved") {
    throw new Error(`expected an unapproved verdict, got ${verdict.outcome}`)
  }
  expect(verdict.nearest?.id, "the entry over this board was found and did not cover it").toBe(
    ENTRY_ID,
  )
  expect(verdict.complaint).toContain("a DIFFERENT BOARD")
  expect(verdict.complaint, "and says what an approval is of").toContain(
    "approval of that board as rendered",
  )
})

test("a board with no entry is UNAPPROVED rather than quietly admitted", () => {
  // THE DANGEROUS DIRECTION IS "APPROVED". The other four Pultec sections are
  // real boards with no entry here, and a run of one that performed no search
  // gets the loud answer.
  const verdict = approvalFor(loadApprovals(), {
    board: "pultec-mid-band",
    candidateSha256: "a".repeat(64),
    termination: NO_SEARCH,
  })
  if (verdict.outcome !== "unapproved") {
    throw new Error(`expected an unapproved verdict, got ${verdict.outcome}`)
  }
  expect(verdict.nearest, "there is no entry for it at all").toBeUndefined()
  expect(verdict.complaint).toContain("pultec-mid-band")
  expect(verdict.complaint, "it says where an approval would have to come from").toContain(
    "stripboard/render-approvals.json",
  )
  expect(verdict.complaint, "and who may grant one").toContain("owner")
})

test("a consultation about a run that SEARCHED is refused rather than answered", () => {
  // NEITHER ANSWER WOULD BE TRUE. "Unapproved" would read as the owner
  // withholding something he was never asked, and "approved" would let a look at
  // a render overrule a stopping rule - `Q5` in particular, which CRITERIA says
  // twice is reported as a failure rather than as a result. The type forbids it
  // at the call site; this is the runtime half, driven through a cast-free
  // helper that hands over the string a `run.json` could hold.
  const registry = loadApprovals()
  const candidateSha256 = entryFor(BOARD).candidateSha256
  for (const rule of STOPPING_RULES) {
    const message = refusalFrom(() =>
      approvalFor(registry, { board: BOARD, candidateSha256, termination: rule }),
    )
    expect(message, rule).toStartWith("approvals-asked-about-a-search")
    expect(message, rule).toContain("exitCodeFor")
    expect(message, "and it says it is not answered either way").toContain(
      "not answered either way",
    )
  }
})

// ---------------------------------------------------------------------------
// The record a run directory carries
// ---------------------------------------------------------------------------

test("the run-directory record quotes him in full and states the edges", () => {
  const entry = entryFor(BOARD)
  const text = approvalRecord(
    approvalFor(loadApprovals(), {
      board: BOARD,
      candidateSha256: entry.candidateSha256,
      termination: NO_SEARCH,
    }),
  )
  expect(text).toContain("OWNER'S WORDS (verbatim, 2026-10-16)")
  for (const said of entry.ownerWords) expect(text, "quoted in full").toContain(said)
  expect(text).toContain("WHAT THIS DOES NOT EXCUSE:")
  for (const edge of entry.doesNotExcuse) expect(text).toContain(edge)
  // AND WHAT HE WAS SHOWN, which is the honest half: he looked at a picture, and
  // the bytes are the materialisation of the same construction.
  expect(text).toContain(entry.renderedFrom)
})

test("the unapproved record is written too, and is the louder of the two", () => {
  // A RUN DIRECTORY THAT CARRIED THIS FILE ONLY WHEN AN APPROVAL EXISTED would
  // make its absence read as a run that never asked.
  const text = approvalRecord(
    approvalFor(loadApprovals(), {
      board: BOARD,
      candidateSha256: "f".repeat(64),
      termination: NO_SEARCH,
    }),
  )
  expect(text).toStartWith("stripboard-unapproved")
  expect(text, "it does not quote him at all").not.toContain("OWNER'S WORDS")
})

// ---------------------------------------------------------------------------
// The standing check: an approval nobody reads is a gate nobody opened
// ---------------------------------------------------------------------------

test("every approval names a live consumer, and never this file", () => {
  for (const entry of loadApprovals().approvals) {
    expect(entry.consultedBy.length, entry.id).toBeGreaterThan(0)
    for (const consumer of entry.consultedBy) {
      expect(fs.existsSync(path.join(REPO_ROOT, consumer)), consumer).toBe(true)
      // THE CITED FILE MUST REALLY READ THE REGISTRY, transitively - a grep for
      // a filename is satisfied by a comment, and a comment consults nothing.
      expect([...importClosure(consumer)], `${entry.id} via ${consumer}`).toContain(
        "tools/stripboard/approvals.ts",
      )
      // AND IT MAY NOT BE THIS TEST. An entry whose only reader is the
      // registry's own test is an entry that exists to satisfy its own check.
      expect(consumer, `${entry.id} may not cite its own test`).not.toBe(SELF)
    }
  }
})

test("THE STANDING CHECK: every approval is reached by a real consultation", () => {
  // DRIVEN THROUGH `approvalFor` WITH THE HASH THE ENTRY ITSELF CARRIES, which
  // is what the gate and the producer both ask with. An entry nothing asks about
  // leaves its id in `unconsultedApprovals` and this test goes red; that is not
  // vacuous, and `./approvals-refusals.test.ts` has the entry whose consumer is
  // missing to prove the other half.
  const registry = loadApprovals()
  for (const entry of registry.approvals) {
    const verdict = approvalFor(registry, {
      board: entry.board,
      candidateSha256: entry.candidateSha256,
      termination: NO_SEARCH,
    })
    expect(verdict.outcome, entry.id).toBe("approved")
  }
  expect(unconsultedApprovals(registry), "every entry was reached").toEqual([])
  expect([...consultedApprovalIds()], "and by id").toEqual(
    expect.arrayContaining(registry.approvals.map((entry) => entry.id)),
  )
})
