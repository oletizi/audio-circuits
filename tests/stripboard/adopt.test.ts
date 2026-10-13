/**
 * The adoption gate: one happy path, ten refusals, and the two properties that
 * make it a gate rather than a copy.
 *
 * **EVERY REFUSAL HAS ITS OWN TEST AND ITS OWN MUTATION RECORDED BESIDE IT.** A
 * refusal shipped untested here once and a mutant passed all 23 tests in its
 * file; each `MUTATION RUN` note below says what was commented out, what failed,
 * and that it was reverted - and each was proved with a WHOLE-FILE run, never a
 * `-t` filter, because a filtered run cannot show that the mutation left the
 * rest of the file passing.
 *
 * **NOTHING HERE WRITES UNDER THE REPOSITORY'S OWN `boards/`.** See
 * `./adopt-fixtures.ts`; the last test in this file is the witness.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { adoptLayout, ADOPT_REFUSALS } from "../../tools/stripboard/adopt.ts"
import {
  adoptAndList,
  adoptWithFailingMakeCheck,
  digestOf,
  refusalFrom,
} from "./adopt-witness.ts"
import {
  ADOPTED_RELATIVE_PATH,
  EVERY_REFUSAL,
  healthyAdoption,
  withChangedFrozenFixture,
  withChangedPinPatterns,
  withChangedRules,
  withChangedSpanData,
  withDirtyBoard,
  withOtherBuiltCommit,
  withOtherPin,
  withOutcome,
  withQ5Backstop,
  withStaleSourceBoard,
  withTamperedCandidate,
  withTamperedMetrics,
  withUnknownBuiltCommit,
} from "./adopt-fixtures.ts"
import { boardsDigest } from "./run-dir-fixtures.ts"

/** The real `boards/` tree, hashed before this file ran anything. */
const BOARDS_BEFORE = boardsDigest()

test("the happy path copies the candidate into the board directory and nothing else", () => {
  // THE LIST IS THE ASSERTION, not just "the file is there": G1 says this verb
  // is the only thing that writes under boards/, and a gate that also left a
  // report, a backup or a record of itself would satisfy an existsSync and fail
  // this.
  //
  // MUTATION RUN (M1): with `fs.writeFileSync(path.join(input.boardDir,
  // "adopted.json"), "{}")` added beside the copy in adoptLayout, 19 passed and
  // 2 failed - this test, on the second entry in the received array, and "after
  // adoption, make check is the verdict", because a revert that puts the layout
  // back does not put back a second file nobody told it about. Reverted.
  const touched = adoptAndList(healthyAdoption())
  expect(touched).toEqual([ADOPTED_RELATIVE_PATH])
})

test("the adopted layout is the candidate's own bytes", () => {
  // The copy is a COPY. A gate that created the destination and wrote nothing
  // into it would pass the list assertion above.
  const scenario = healthyAdoption("bytes")
  adoptLayout(scenario.input, scenario.deps)
  expect(fs.readFileSync(path.join(scenario.root, ADOPTED_RELATIVE_PATH))).toEqual(
    fs.readFileSync(scenario.input.candidate),
  )
})

test("G2.1: a candidate whose sha256 differs from run.json's is refused", () => {
  // MUTATION RUN (M2): with the `candidateHash !== inputs.candidateSha256`
  // branch in adoptLayout replaced by `if (false)`, 18 passed and 3 failed -
  // this test, "every refusal names what is missing" and "a refused adoption
  // leaves the board tree byte-identical", the last because with no refusal left
  // the edited candidate was adopted. Reverted.
  expect(() => {
    const scenario = withTamperedCandidate()
    adoptLayout(scenario.input, scenario.deps)
  }).toThrow(/sha256/)
})

test("G2.1: a candidate whose canonical artifact hash differs is refused", () => {
  // THE CONDITION IS `readManifest`'S AND THE REFUSAL ID IS THIS GATE'S, and
  // both halves are asserted. This scenario is NOT in EVERY_REFUSAL - that list
  // carries one case per id and `candidate-hash`'s is the edited candidate - so
  // without the second assertion here, a gate that let run-dir.ts's own message
  // out unwrapped would still satisfy the first and nothing in this file would
  // notice.
  //
  // MUTATION RUN (M3): with `manifestOf`'s refuse replaced by a bare rethrow of
  // the underlying message, 20 passed and 1 failed - this test, on the second
  // assertion, the message being run-dir.ts's own and carrying no refusal id.
  // Reverted.
  const message = refusalFrom(withTamperedMetrics)
  expect(message).toMatch(/canonical/)
  expect(message, "and it is reported as this gate's own refusal").toContain("candidate-hash")
})

test("G2.2: a rules file that changed since the run is refused, so no parameter is slipped in after", () => {
  // MUTATION RUN (M4): with the rules-hash assertFileHash call commented out,
  // 18 passed and 3 failed - this test, "every refusal names what is missing",
  // and "a refused adoption leaves the board tree byte-identical". Reverted.
  expect(() => {
    const scenario = withChangedRules()
    adoptLayout(scenario.input, scenario.deps)
  }).toThrow(/rules/)
})

test("G2.2: changed span data or pin-pattern data is refused, each named", () => {
  // EACH NAMED: one refusal covering both would satisfy a `/hash/` assertion
  // and leave the operator looking in the wrong file. The two patterns are the
  // two FILES, not the two ids.
  //
  // MUTATION RUN (M5, M6): with the span-hash call commented out this failed on
  // the first assertion; with the pin-pattern-hash call commented out it failed
  // on the second. Each run was 18 pass / 3 fail - this test, "every refusal
  // names what is missing", and "a refused adoption leaves the board tree
  // byte-identical". Both reverted.
  expect(() => {
    const scenario = withChangedSpanData()
    adoptLayout(scenario.input, scenario.deps)
  }).toThrow(/lead-span/)
  expect(() => {
    const scenario = withChangedPinPatterns()
    adoptLayout(scenario.input, scenario.deps)
  }).toThrow(/pin-pattern/)
})

test("G2.2: a changed frozen fixture is refused", () => {
  // B2: the fixture is hashed like any other input, so a silently edited
  // benchmark surfaces as a changed hash rather than as a quietly easier test.
  //
  // THE BRIEF SAYS "on a B1-frozen run" AND THE CHECK IS UNCONDITIONAL, which
  // is a deliberate strengthening recorded in tools/stripboard/adopt-checks.ts:
  // run.json carries no frozen flag, and the only recorded signal is the
  // netlist hash - which a tampered fixture stops matching, so a conditional
  // check would be switched off by the edit it exists to catch.
  //
  // MUTATION RUN (M7): with assertFrozenFixtureUnchanged's
  // `!provenance.includes(actual)` branch replaced by `if (false)`, 18 passed
  // and 3 failed - this test, "every refusal names what is missing", and "a
  // refused adoption leaves the board tree byte-identical". Reverted.
  expect(() => {
    const scenario = withChangedFrozenFixture()
    adoptLayout(scenario.input, scenario.deps)
  }).toThrow(/fixture/)
})

test("G2.3: a provenance chain that does not start from the board as it now is is refused", () => {
  // MUTATION RUN (M8): with the `moved.status !== 0` branch in
  // assertProvenanceChain - the `git diff --quiet <pipelineCommit>` comparison -
  // replaced by `if (false)`, 18 passed and 3 failed: this test, "every refusal
  // names what is missing", and "a refused adoption leaves the board tree
  // byte-identical". Reverted.
  expect(() => {
    const scenario = withStaleSourceBoard()
    adoptLayout(scenario.input, scenario.deps)
  }).toThrow(/provenance/)
})

test("G2.3: the chain's four on-disk links are each required", () => {
  // THE FOUR LINKS, DRIVEN ONE AT A TIME. The test above drives the git link
  // only, and a chain check with one live link and three dead ones would pass
  // it. Each case removes exactly one file (or moves the candidate out of the
  // run directory) from an otherwise healthy scenario.
  const cases: readonly (readonly [string, (root: string, runDir: string) => void])[] = [
    ["the netlist", (_root, runDir) => fs.rmSync(path.join(runDir, "pultec-low-boost.net"))],
    ["the imported board", (_root, runDir) => fs.rmSync(path.join(runDir, "imported.vrt"))],
    [
      "the netlist's own bytes",
      (_root, runDir) => fs.appendFileSync(path.join(runDir, "pultec-low-boost.net"), "( edited )\n"),
    ],
  ]
  for (const [what, damage] of cases) {
    const scenario = healthyAdoption("chain")
    damage(scenario.root, scenario.input.runDir)
    let message = ""
    try {
      adoptLayout(scenario.input, scenario.deps)
    } catch (caught) {
      message = caught instanceof Error ? caught.message : String(caught)
    }
    expect(message, what).toContain("provenance-chain")
  }
  // The fifth link: a candidate from somewhere else entirely, with the run's
  // own recorded hash still matching it.
  const elsewhere = healthyAdoption("chain-outside")
  const outside = path.join(elsewhere.root, "candidate.vrt")
  fs.copyFileSync(elsewhere.input.candidate, outside)
  let message = ""
  try {
    adoptLayout({ ...elsewhere.input, candidate: outside }, elsewhere.deps)
  } catch (caught) {
    message = caught instanceof Error ? caught.message : String(caught)
  }
  expect(message, "a candidate outside the run directory").toContain("provenance-chain")
})

test("G2.4: a veroroute commit differing from veroroute.pin is refused", () => {
  // THE ID IS ASSERTED BESIDE THE WORDING, AND THAT IS NOT BELT-AND-BRACES.
  // MEASURED: with the `inputs.verorouteCommit !== pinned` branch disabled, the
  // run still refused - on `built-commit`, whose message also names
  // veroroute.pin - so `/veroroute\.pin/` alone was satisfied by a refusal
  // about a different thing. A pattern that the wrong refusal also matches is
  // an assertion true by coincidence.
  //
  // MUTATION RUN (M9): with that branch replaced by `if (false)`, 19 passed and
  // 2 failed - this test on the id assertion (the first still matched), and
  // "every refusal names what is missing", which caught the wrong id. Reverted.
  const message = refusalFrom(withOtherPin)
  expect(message).toMatch(/veroroute\.pin/)
  expect(message, "and it is the pin's own refusal").toContain("veroroute-commit")
})

test("G2.4: a built commit differing from EITHER is refused, separately", () => {
  // The pin is what was intended and builtCommit() is what ran. They have
  // disagreed once already and every figure in COST and MOVE went through the
  // disagreement.
  //
  // MUTATION RUN (M10): with the `inputs.builtCommit !== stamped` branch
  // replaced by `if (false)`, 18 passed and 3 failed - this test with an empty
  // message, since the pin still agreed and no other branch covered it, plus
  // "every refusal names what is missing" and "a refused adoption leaves the
  // board tree byte-identical". Reverted.
  const message = refusalFrom(withOtherBuiltCommit)
  expect(message).toMatch(/built/)
  expect(message, "the stamp is what disagreed").toContain("the stamp beside the binary says")
})

test("G2.4: an UNKNOWN built commit is refused rather than taken as agreement", () => {
  // THE WORD "unknown" IS IN THIS REFUSAL'S OWN not-defaulted STATEMENT, so
  // `/unknown/` alone is satisfied by EVERY built-commit refusal - MEASURED: with
  // the `stamped === undefined` branch disabled, the gate fell through to
  // comparing the manifest's commit with `undefined` and refused with "the stamp
  // beside the binary says undefined", and `/unknown/` matched the boilerplate.
  // The mutant survived all 21 tests in this file. So what is asserted now is
  // the OFFENDING half of the message - that the stamp is what is absent - and
  // that no refusal here prints the word `undefined`, which is a refusal that
  // does not know what it is saying.
  //
  // MUTATION RUN (M11): with that branch replaced by `if (false)`, 20 passed and
  // this was the only failure, on the second and third assertions. Before they
  // were added the same mutant survived all 21. Reverted.
  const message = refusalFrom(withUnknownBuiltCommit)
  expect(message).toMatch(/unknown/)
  expect(message, "the absent stamp is what it names").toContain("the build stamp under")
  expect(message, "and no refusal prints undefined").not.toMatch(/undefined/)
})

test("G2.5: a non-admissible verdict is refused, including valid-below-target", () => {
  // The adoption gate admits only `admissible`, so valid-below-target is a
  // layout the pipeline reports and does not adopt.
  //
  // MUTATION RUN (M12): with assertVerdictAdmits's `exitCodeFor(...) !== 0`
  // branch replaced by `if (false)`, 17 passed and 4 failed - this test, the Q5
  // test below, "every refusal names what is missing", and "a refused adoption
  // leaves the board tree byte-identical". Reverted.
  expect(() => {
    const scenario = withOutcome("invalid")
    adoptLayout(scenario.input, scenario.deps)
  }).toThrow(/invalid/)
  expect(() => {
    const scenario = withOutcome("valid-below-target")
    adoptLayout(scenario.input, scenario.deps)
  }).toThrow(/valid, below target/)
})

test("G2.5: an admissible candidate out of a Q5 run is refused, because the RUN failed", () => {
  // THE REASON `exitCodeFor` TAKES THE RULE. CRITERIA says twice that a run
  // stopping on Q5 is reported as a failure rather than as a result, so the
  // candidate being healthy is not enough - and a gate that compared the
  // outcome with "admissible" itself would adopt this one.
  //
  // MUTATION RUN (M13): with assertVerdictAdmits's condition changed to
  // `outcome !== "admissible"` - the second taxonomy it exists not to be - 20
  // passed and this was the ONLY failure, which is what makes it the
  // discriminating test for the two-argument `exitCodeFor`. Reverted.
  expect(() => {
    const scenario = withQ5Backstop()
    adoptLayout(scenario.input, scenario.deps)
  }).toThrow(/Q5/)
})

test("G2.6: an uncommitted layout is refused unless --allow-dirty", () => {
  // Exactly how update and stripboard already behave, so git stays the undo.
  //
  // MUTATION RUN (M14): with the assertLayoutRecoverable call replaced by
  // `void declaration.vrtPath`, 18 passed and 3 failed - this test's first
  // assertion, "every refusal names what is missing", and "a refused adoption
  // leaves the board tree byte-identical". Reverted.
  expect(() => {
    const scenario = withDirtyBoard()
    adoptLayout(scenario.input, scenario.deps)
  }).toThrow(/--allow-dirty/)
  expect(() => {
    const scenario = withDirtyBoard()
    adoptLayout({ ...scenario.input, allowDirty: true }, scenario.deps)
  }).not.toThrow()
})

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

test("this whole file left the repository's own boards/ byte-identical", () => {
  // THE STANDING SAFETY CLAIM, and the one thing in this suite that is about
  // the real tree: the gate's entire job is writing under boards/, so a test
  // that let it write for real would modify the owner's committed layouts.
  // Every scenario's board is in a mkdtemp directory; this is the witness that
  // none of them was the real one.
  expect(boardsDigest()).toBe(BOARDS_BEFORE)
})
