/**
 * The ADOPTION GATE's approval arm, driven over a real `pultec-low-boost` run
 * with the registry perturbed one way at a time.
 *
 * **WHAT `./approvals-refusals.test.ts` PROVES AND THIS FILE DOES NOT.** That
 * file holds the LOADER to its clauses. This one holds the GATE to them: a
 * perturbed registry reaching `assertVerdictAdmits` has to come back as
 * `failing-check` and not as something a reader of an adoption would mistake for
 * another kind of fault - and, the other way round, a healthy registry must not
 * carry a board that fails any other check.
 *
 * **THE THREE THINGS THE BRIEF REQUIRED PROVEN, EACH ITS OWN TEST BELOW:**
 *
 *   1. a record without his verbatim words is refused;
 *   2. a record whose board or candidate hash does not match is refused;
 *   3. the channel admits NOTHING else - a board failing another check is
 *      refused with an approval on record and unread.
 *
 * **THE RUN IS REAL AND THE GATE IS THE PRODUCTION ONE** -
 * `./materialize-run-fixtures.ts`'s `producedRun` and `realDeps`, so the only
 * thing a case changes is the one dependency it is about. **Nothing under
 * `boards/` is written and `adoptLayout` is never called**: the committed
 * `pultec-low-boost.perfboard.vrt` is the owner's own layout.
 *
 * **NO CASE EDITS `stripboard/render-approvals.json`.** Every perturbation is a
 * scratch copy handed over as `deps.approvalsPath`, which is why that path is a
 * dependency at all (`tools/stripboard/adopt-model.ts` says so in those terms).
 */
import { afterAll, beforeAll, expect, test } from "bun:test"
import path from "node:path"
import { assertVerdictAdmits } from "../../tools/stripboard/adopt-checks.ts"
import type { AdoptDeps } from "../../tools/stripboard/adopt-model.ts"
import type { MaterializeRun } from "../../tools/stripboard/materialize-run.ts"
import { readManifest } from "../../tools/stripboard/run-dir.ts"
import { cleanUpTempScratch } from "../support/temp-scratch.ts"
import { committedEntry, fixture } from "./approvals-fixtures.ts"
import {
  BOARD,
  cleanUpFixtures,
  manifestPath,
  producedRun,
  realDeps,
  rewritten,
  withManifest,
} from "./materialize-run-fixtures.ts"

afterAll(cleanUpFixtures)
afterAll(cleanUpTempScratch)

let run: MaterializeRun

beforeAll(async () => {
  run = await producedRun("adopt-approval-gate")
})

/** The production gate, with the approvals registry pointed at a scratch copy. */
function depsWithRegistry(approvalsPath: string): AdoptDeps {
  return { ...realDeps(), approvalsPath }
}

/** What the gate said about this run under `deps`, or "" when it admitted it. */
function verdictRefusal(deps: AdoptDeps, board: string = BOARD): string {
  try {
    assertVerdictAdmits(readManifest(run.runDir), manifestPath(run), board, deps)
  } catch (caught) {
    return caught instanceof Error ? caught.message : String(caught)
  }
  return ""
}

test("the unperturbed run is admitted, and the notice says on what", () => {
  // THE CONTROL, AND IT IS WHAT MAKES EVERY REFUSAL BELOW DISCRIMINATING. A gate
  // that refused this run whatever the registry said would pass every
  // perturbation here and prove nothing.
  expect(verdictRefusal(realDeps())).toBe("")
})

// ---------------------------------------------------------------------------
// 1. His words
// ---------------------------------------------------------------------------

test("A RECORD THAT DOES NOT QUOTE HIM IS REFUSED AT THE GATE, not just by the loader", () => {
  // THE FORGERY THE BRIEF NAMED: an entry that asserts the approval and leaves
  // out the one part that cannot be derived from the task. The gate reports it
  // as its own refusal rather than letting a loader error escape as something
  // else - a check that could not run must not look like one that ran.
  const entry = committedEntry(0)
  const message = verdictRefusal(
    depsWithRegistry(fixture({ entries: [{ ...entry, ownerWords: [] }] })),
  )
  expect(message).toStartWith("failing-check: ")
  expect(message, "it names the registry as what decides").toContain(
    "stripboard/render-approvals.json is what decides whether this run may be adopted",
  )
  expect(message, "and carries the loader's own clause").toContain("approvals-no-words")
  expect(message).toContain("HIS WORDS ARE THE EVIDENCE")
})

test("a paraphrase in the agent's voice is refused at the gate too", () => {
  const entry = committedEntry(0)
  const message = verdictRefusal(
    depsWithRegistry(
      fixture({
        entries: [
          { ...entry, ownerWords: ["The owner approved this layout after seeing the render."] },
        ],
      }),
    ),
  )
  expect(message).toStartWith("failing-check: ")
  expect(message).toContain("approvals-words-narrated")
})

// ---------------------------------------------------------------------------
// 2. The scope: this board, these bytes
// ---------------------------------------------------------------------------

test("A RECORD OVER DIFFERENT BYTES IS REFUSED, which is the whole of the scope", () => {
  // **THE CASE THE MECHANISM EXISTS FOR.** A later run places low-boost
  // differently, the candidate hash moves, and the entry he granted over the
  // board he was SHOWN must not admit the board he was not. The perturbation is
  // the other direction - the entry's hash changed rather than the run's -
  // because that is the same comparison and leaves the run healthy.
  const entry = committedEntry(0)
  const message = verdictRefusal(
    depsWithRegistry(fixture({ entries: [{ ...entry, candidateSha256: "d".repeat(64) }] })),
  )
  expect(message).toStartWith("failing-check: ")
  expect(message, "it says the run performed no search").toContain(
    'records the stopping rule "no-search"',
  )
  expect(message, "and that the recorded approval is over a different board").toContain(
    "a DIFFERENT BOARD",
  )
  expect(message, "quoting the hash it was asked about").toContain(
    readManifest(run.runDir).canonical.inputs.candidateSha256,
  )
})

test("A RECORD OVER ANOTHER BOARD IS REFUSED, and the other four sections have none", () => {
  // `pultec-mid-band` IS A REAL BOARD OF THIS PROJECT WITH NO ENTRY. Asked about
  // it, the registry says so rather than answering from the one entry it has -
  // which is what keeps one approved render from admitting five boards.
  const message = verdictRefusal(realDeps(), "pultec-mid-band")
  expect(message).toStartWith("failing-check: ")
  expect(message).toContain("has no entry for this board")
  expect(message, "and who may grant one").toContain("Only the owner may grant one")
})

test("a registry that is not there is a refusal, never an admission", () => {
  const absent = path.join(path.dirname(fixture({})), "no-such-approvals.json")
  const message = verdictRefusal(depsWithRegistry(absent))
  expect(message).toStartWith("failing-check: ")
  expect(message).toContain("approvals-unreadable")
  // THE DANGEROUS DIRECTION, SAID IN THE REFUSAL ITSELF.
  expect(message).toContain('an absent registry is not "no board is approved"')
})

// ---------------------------------------------------------------------------
// 3. It admits nothing else
// ---------------------------------------------------------------------------

test("THE CHANNEL DOES NOT ADMIT A CANDIDATE THAT IS NOT ADMISSIBLE", () => {
  // **THE PERTURBATION A WELL-MEANING PERSON WOULD WRITE**: the board failed a
  // hard constraint, somebody has his approval of the render on record, and
  // reads the two as adding up to an adoption. They do not. The outcome is
  // graded through the same `EXIT_CODES` table every other run's is, BEFORE the
  // registry is consulted at all, so the refusal names the BOARD rather than the
  // approval - and the full, healthy registry is in place while it fires.
  const edited = rewritten(run, { metrics: { outcome: "invalid" } })
  withManifest(run, edited, () => {
    const message = verdictRefusal(realDeps())
    expect(message).toStartWith("failing-check: ")
    expect(message, "the refusal is about the candidate").toContain(
      "fails a hard electrical or physical constraint",
    )
    expect(message, "and it says the approval cannot reach this").toContain(
      "no recorded approval can admit it",
    )
    expect(message, "naming what the registry does answer").toContain(
      "whether a run that searched nothing may be adopted",
    )
  })
})

test("THE ORDER: a bad board and a bad registry together is refused for the BOARD", () => {
  // **THE ORDERING IS A DIAGNOSIS AND THIS IS WHAT PINS IT.** With a healthy
  // registry the two orders are indistinguishable - the outcome refuses either
  // way - so the claim that the approval is reached LAST is only observable when
  // both are wrong, which is exactly the state somebody debugging a failed
  // adoption is in. Consulted first, the message would name the registry and
  // send them to fix a quote for a board that fails `A1`; graded first, it names
  // the board. Driven: gutting the order made this test and nothing else go red.
  const entry = committedEntry(0)
  const registry = fixture({ entries: [{ ...entry, ownerWords: [] }] })
  const edited = rewritten(run, { metrics: { outcome: "invalid" } })
  withManifest(run, edited, () => {
    const message = verdictRefusal(depsWithRegistry(registry))
    expect(message).toStartWith("failing-check: ")
    expect(message, "the board is what is wrong with it").toContain(
      "fails a hard electrical or physical constraint",
    )
    expect(message, "and the registry is not even read").not.toContain("approvals-no-words")
  })
})

test("nor one the pipeline reported as below target", () => {
  const edited = rewritten(run, { metrics: { outcome: "valid-below-target" } })
  withManifest(run, edited, () => {
    const message = verdictRefusal(realDeps())
    expect(message).toStartWith("failing-check: ")
    expect(message).toContain("valid, below target")
    expect(message).toContain("no recorded approval can admit it")
  })
})

test("an approval admitting a stopping rule cannot be recorded at all", () => {
  // THE WAY A FORGER WOULD REACH A `Q5` RUN - widen `admits` rather than argue
  // with `exitCodeFor`. The loader refuses the entry, so the gate refuses the
  // run, and the message names the function that really decides a run that
  // searched.
  const entry = committedEntry(0)
  const message = verdictRefusal(
    depsWithRegistry(fixture({ entries: [{ ...entry, admits: ["no-search", "Q5"] }] })),
  )
  expect(message).toStartWith("failing-check: ")
  expect(message).toContain("approvals-unknown-termination")
  expect(message).toContain("exitCodeFor")
})

test("and the approval does not stand in for any OTHER check: the hashes still decide", () => {
  // THE EDGE STATED IN THE ENTRY, DRIVEN. `metrics.bound` is the one field the
  // gate re-derives, so a record whose bound disagrees with its termination is
  // refused with the owner's approval on record and unread - the approval is
  // reached only after the pairing and the outcome have both passed.
  const edited = rewritten(run, { metrics: { bound: "search-exhausted" } })
  withManifest(run, edited, () => {
    const message = verdictRefusal(realDeps())
    expect(message).toStartWith("failing-check: ")
    expect(message).toContain('records the bound "search-exhausted" beside the stopping rule no-search')
    expect(message, "the approval was never consulted").not.toContain("stripboard-owner-approved")
  })
})
