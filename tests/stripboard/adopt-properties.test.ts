/**
 * The adoption gate's CROSS-CUTTING properties: the ones stated over the whole
 * refusal set rather than over one refusal.
 *
 * `./adopt.test.ts` has the happy path and one test per refusal; here are the
 * four claims that quantify over all ten - every refusal's message shape, that
 * the cases cover the `AdoptRefusal` union exactly, that a refused adoption
 * leaves the board tree byte-identical, and that `make check` is the verdict
 * after the copy - plus `candidateFor`, which is the CLI's default path into
 * the gate and is not a refusal at all.
 *
 * **ITS OWN FILE FOR THE 500-LINE CEILING**, at the seam the content draws:
 * round 1 of the review added four tests to `./adopt.test.ts` and took it to
 * 507 lines. The split is one-refusal-at-a-time versus over-all-of-them, which
 * is also why the mutation harness runs BOTH files whole on every mutation:
 * MEASURED, nine of the twenty-one fail a test in each file and four fail only
 * in this one, so a harness pointed at `./adopt.test.ts` alone would have
 * under-reported half of them and missed four entirely. The pass and fail counts
 * in both files' `MUTATION RUN` notes are over the two files together.
 *
 * **NOTHING HERE WRITES UNDER THE REPOSITORY'S OWN `boards/`.** The last test
 * is the witness.
 */
import { afterAll, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { adoptLayout, candidateFor, ADOPT_REFUSALS } from "../../tools/stripboard/adopt.ts"
import {
  cleanUpFixtures,
  EVERY_REFUSAL,
  healthyAdoption,
  withTamperedCandidate,
} from "./adopt-fixtures.ts"
import { adoptWithFailingMakeCheck, digestOf, refusalFrom } from "./adopt-witness.ts"
import { boardsDigest } from "./run-dir-fixtures.ts"

/** The real `boards/` tree, hashed before this file ran anything. */
const BOARDS_BEFORE = boardsDigest()


test("every refusal names what is missing, where to fix it, and why it is not defaulted", () => {
  // THE PREVIOUS VERSION of this shape asserted non-empty, a file extension,
  // and length > 80 under a name promising three things - so "why it is not
  // defaulted" was in the title only, and a message that named a file twice
  // satisfied it. Each of the three clauses is now its own assertion, and the
  // refusal's own id has to appear so the message cannot be generic across ten
  // cases.
  const ids = new Set<string>()
  for (const [label, build, id] of EVERY_REFUSAL) {
    const message = refusalFrom(build)
    expect(message, `${label}: nothing was thrown`).not.toBe("")
    expect(message, `${label}: which refusal fired`).toContain(id) // what is missing
    expect(message, `${label}: where to fix it`).toMatch(/\.(ts|json|pin|vrt)|run\.json/)
    expect(message, `${label}: why it is not defaulted`).toMatch(/not defaulted|rather than/)
    expect(message.length, label).toBeGreaterThan(80)
    ids.add(id)
  }
  // Ten distinct refusal ids across ten cases: one generic message for all ten
  // would satisfy every assertion above except this one.
  expect(ids.size, "each case must produce its OWN refusal").toBe(EVERY_REFUSAL.length)
})

test("the cases here cover the AdoptRefusal union exactly", () => {
  // A refusal added to the type without a case here fails rather than going
  // untested - which is the hole "a gate with five of six refusals is a gate"
  // names. BOTH directions: an id in the type with no case, and a case naming
  // an id the type does not carry.
  const covered = new Set(EVERY_REFUSAL.map(([, , id]) => id))
  expect([...covered].sort()).toEqual([...ADOPT_REFUSALS].sort())
})

test("a refused adoption leaves the board tree byte-identical", () => {
  // EVERY refusal, over its own scenario, and the digest is of that scenario's
  // own board tree - not git porcelain, which task 13 round 2 measured inert
  // (./adopt-fixtures.ts's `digestOf` carries the reasoning).
  //
  // MUTATION RUN (M15): with a `putInPlace` call added ABOVE
  // assertVerdictAdmits - the shape of a gate that copies first and checks
  // afterwards - 19 passed and 2 failed: this test, on the "a non-admissible
  // verdict" scenario's two differing digests, and "after adoption, make check
  // is the verdict", whose revert then had a second copy to undo. Reverted.
  for (const [label, build] of EVERY_REFUSAL) {
    const scenario = build()
    const before = digestOf(scenario.root)
    try {
      adoptLayout(scenario.input, scenario.deps)
    } catch {
      /* the refusal is the subject */
    }
    expect(digestOf(scenario.root), label).toBe(before)
  }
})

test("after adoption, make check is the verdict and a failure is a reverted adoption", () => {
  // G4: an adopted board on which make check does not exit 0 is a failed
  // adoption and is reverted. The gate runs it and reverts rather than leaving
  // the board behind for somebody to find.
  //
  // MUTATION RUN (M16): with the `revert(placed)` call replaced by
  // `void placed`, 20 passed and this was the only failure - `touched` held
  // "boards/pultec-low-boost/pultec-low-boost.perfboard.vrt", the layout a
  // failed adoption would have left behind. Reverted.
  const result = adoptWithFailingMakeCheck()
  expect(result.message, "make check's failure is reported as a refusal").toContain("failing-check")
  expect(result.message, "and it quotes what make check printed").toContain("Layout state")
  expect(result.touched).toEqual([])
  expect(result.reverted).toBe(true)
})

test("a make check that could not run at all is a failure and never a pass", () => {
  // `defaultMakeCheck` reports `status: null` for a spawn that did not run, and
  // a skipped check must never look like a passing one. A `=== 0` comparison
  // reads null as a failure; a `> 0` comparison would have read it as a pass.
  //
  // MUTATION RUN (M17): with the condition changed to `checked.status !== null
  // && checked.status !== 0`, 20 passed and this was the only failure.
  // Reverted.
  const scenario = healthyAdoption("no-make")
  expect(() =>
    adoptLayout(scenario.input, {
      ...scenario.deps,
      makeCheck: () => ({ status: null, output: "could not run make" }),
    }),
  ).toThrow(/failing-check/)
})

test("candidateFor refuses when no .vrt in the run directory is the recorded candidate", () => {
  // THE CLI'S DEFAULT PATH: `adopt --run <dir>` with no --candidate goes through
  // this, so its two refusals are reached more often than any flag is.
  //
  // THEY ARE DELIBERATELY NOT `AdoptRefusal` IDS (review ruling, round 1): the
  // ten ids are the gate's provenance-and-verdict taxonomy, G2 enumerates
  // exactly ten, and an eleventh would contradict CRITERIA §9. These are
  // input/usage errors and stay ordinary throws - held to the same three
  // clauses, which is what is asserted.
  const scenario = withTamperedCandidate()
  let message = ""
  try {
    candidateFor(scenario.input.runDir)
  } catch (caught) {
    message = caught instanceof Error ? caught.message : String(caught)
  }
  expect(message, "it refuses").not.toBe("")
  expect(message, "what is missing").toContain("0 of the .vrt files")
  expect(message, "where to fix it").toContain(scenario.input.runDir)
  expect(message, "why it is not defaulted").toContain("not defaulted")
  expect(message, "and it is not one of the gate's ten ids").not.toContain("candidate-hash")
})

test("candidateFor refuses when two .vrt files are the recorded candidate, printing both", () => {
  // TWO FILES HOLDING THE SAME BYTES, which run.json does not distinguish.
  // Picking one would make which board gets adopted this function's choice
  // rather than the run's record, so BOTH paths are printed - a message naming
  // one would leave the operator unable to say which to pass to --candidate.
  const scenario = healthyAdoption("two-candidates")
  const twin = path.join(scenario.input.runDir, "seed-1", "twin.vrt")
  fs.copyFileSync(scenario.input.candidate, twin)
  let message = ""
  try {
    candidateFor(scenario.input.runDir)
  } catch (caught) {
    message = caught instanceof Error ? caught.message : String(caught)
  }
  expect(message, "it refuses").not.toBe("")
  expect(message, "what is missing").toContain("2 of the .vrt files")
  expect(message, "the first candidate").toContain(scenario.input.candidate)
  expect(message, "and the second").toContain(twin)
  expect(message, "why it is not defaulted").toContain("not defaulted")
  expect(message, "and it names the flag that settles it").toContain("--candidate")
})

test("candidateFor finds the recorded candidate on a healthy run", () => {
  // The positive side, so neither refusal above can be passing because the
  // function refuses everything.
  const scenario = healthyAdoption("one-candidate")
  expect(candidateFor(scenario.input.runDir)).toBe(scenario.input.candidate)
})

test("this whole file left the repository's own boards/ byte-identical", () => {
  // THE STANDING SAFETY CLAIM, and the one thing in this suite that is about
  // the real tree: the gate's entire job is writing under boards/, so a test
  // that let it write for real would modify the owner's committed layouts.
  // Every scenario's board is in a mkdtemp directory; this is the witness that
  // none of them was the real one.
  expect(boardsDigest()).toBe(BOARDS_BEFORE)
})

/**
 * REMOVE EVERY DIRECTORY THE FIXTURES MADE, and this is not housekeeping: its
 * absence left 4,606 run directories under build/stripboard/pultec-low-boost/
 * in one review round, at which point the veroroute spawn began returning exit
 * 0 with empty stdout and twenty-three tests in nine unrelated files failed.
 * ./adopt-fixtures.ts's CREATED registry carries the measurement.
 */
afterAll(() => {
  cleanUpFixtures()
})
