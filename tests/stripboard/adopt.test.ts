/**
 * The adoption gate: one happy path and one test per refusal.
 *
 * The claims stated over ALL TEN refusals at once - the message shape, the union
 * coverage, the byte-identical board tree, `make check` as the verdict - are in
 * `./adopt-properties.test.ts`, which this file was split from when round 1 of
 * the review took it past the 500-line ceiling.
 *
 * **EVERY REFUSAL HAS ITS OWN TEST AND ITS OWN MUTATION RECORDED BESIDE IT.** A
 * refusal shipped untested here once and a mutant passed all 23 tests in its
 * file; each `MUTATION RUN` note below says what was changed, what failed, and
 * that it was reverted - and each was proved with WHOLE-FILE runs of this file
 * AND `./adopt-properties.test.ts`, never a `-t` filter, because a filtered run
 * cannot show that the mutation left the rest of the suite passing. The pass and
 * fail counts in those notes are over both files together.
 *
 * **NOTHING HERE WRITES UNDER THE REPOSITORY'S OWN `boards/`.** See
 * `./adopt-fixtures.ts`; the last test in this file is the witness.
 */
import { afterAll, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { adoptLayout } from "../../tools/stripboard/adopt.ts"
import { adoptAndList, refusalFrom } from "./adopt-witness.ts"
import {
  ADOPTED_RELATIVE_PATH,
  cleanUpFixtures,
  healthyAdoption,
  withChangedFrozenFixture,
  withChangedPinPatterns,
  withChangedRules,
  withChangedSpanData,
  withMismatchedBound,
  withDirtyBoard,
  withOtherBuiltCommit,
  withOtherPin,
  withOutcome,
  withQ5Backstop,
  withStaleSourceBoard,
  withSwappedFrozenFixture,
  withTamperedCandidate,
  withTamperedMetrics,
  withUnknownBuiltCommit,
  withUnwalkableSpanClosure,
  withUnrecordedFrozenFixture,
} from "./adopt-fixtures.ts"
import { boardsDigest } from "./run-dir-fixtures.ts"
import { closureSha256, importClosure } from "../../lib/import-closure.ts"
import {
  PIN_PATTERN_ENTRY,
  SPAN_DATA_ENTRY,
  pinPatternClosureHash,
  spanClosureHash,
} from "../../tools/stripboard/geometry-inputs.ts"

/** The real `boards/` tree, hashed before this file ran anything. */
const BOARDS_BEFORE = boardsDigest()

test("the happy path copies the candidate into the board directory and nothing else", () => {
  // THE LIST IS THE ASSERTION, not just "the file is there": G1 says this verb
  // is the only thing that writes under boards/, and a gate that also left a
  // report, a backup or a record of itself would satisfy an existsSync and fail
  // this.
  //
  // MUTATION RUN (M1): with `fs.writeFileSync(path.join(input.boardDir,
  // "adopted.json"), "{}")` added beside the copy in adoptLayout, 25 passed and
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
  // branch in adoptLayout replaced by `if (false)`, 24 passed and 3 failed -
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
  // the underlying message, 26 passed and 1 failed - this test, on the second
  // assertion, the message being run-dir.ts's own and carrying no refusal id.
  // Reverted.
  const message = refusalFrom(withTamperedMetrics)
  expect(message).toMatch(/canonical/)
  expect(message, "and it is reported as this gate's own refusal").toContain("candidate-hash")
})

test("G2.2: a rules file that changed since the run is refused, so no parameter is slipped in after", () => {
  // MUTATION RUN (M4): with the rules-hash assertFileHash call commented out,
  // 24 passed and 3 failed - this test, "every refusal names what is missing",
  // and "a refused adoption leaves the board tree byte-identical". Reverted.
  expect(() => {
    const scenario = withChangedRules()
    adoptLayout(scenario.input, scenario.deps)
  }).toThrow(/rules/)
})

test("G2.2: changed span data or pin-pattern data is refused, each named by its own id", () => {
  // EACH NAMED: one refusal covering both would satisfy a `/hash/` assertion
  // and leave the operator looking in the wrong file. The REFUSAL ID is
  // asserted beside the file name, because the two statements each run to
  // several hundred words and the words "lead-span" and "pin-pattern" both
  // appear in prose about the other - the id is the only token that cannot.
  //
  // MUTATION RUN (M5, M6): with the span-hash call commented out this failed on
  // the first assertion; with the pin-pattern-hash call commented out it failed
  // on the second. Each run was 24 pass / 3 fail - this test, "every refusal
  // names what is missing", and "a refused adoption leaves the board tree
  // byte-identical". Both reverted.
  const spanMessage = refusalFrom(withChangedSpanData)
  expect(spanMessage).toContain("span-hash")
  expect(spanMessage).toContain("lib/kicad/lead-span.ts")
  const patternMessage = refusalFrom(withChangedPinPatterns)
  expect(patternMessage).toContain("pin-pattern-hash")
  expect(patternMessage).toContain("lib/kicad/pin-pattern.ts")
})

test("G2.2: the two hashes cover the IMPORT CLOSURE, so a model file cannot move after a run", () => {
  // THE PROPERTY THE FIXTURES CANNOT SHOW, and the one the whole-branch review
  // found missing. span-hash and pin-pattern-hash each used to hash ONE FILE
  // while their own statements called that file "the authority": lead-span.ts
  // builds LEAD_SPANS at module load out of lead-span-model.ts (which also
  // holds BEND_RULE, the stripboard pitch and TOOL_MIN/MAX_SPAN_HOLES), and
  // pin-pattern.ts only TYPE-imports the runtime admitPattern that
  // pin-pattern-model.ts defines. So the bend arithmetic or the hole clamp
  // could be edited after a run with both hashes still matching - and
  // `make check` does not cover it, because such an edit changes the bounds the
  // candidate was graded under without changing the netlist.
  //
  // This asserts the closures by MEMBERSHIP rather than by a digest value: a
  // digest literal would have to be updated on every edit to those files and
  // would say nothing about which files it covered.
  const spanClosure = importClosure(SPAN_DATA_ENTRY)
  expect([...spanClosure]).toContain("lib/kicad/lead-span.ts")
  expect([...spanClosure]).toContain("lib/kicad/lead-span-model.ts")
  const patternClosure = importClosure(PIN_PATTERN_ENTRY)
  expect([...patternClosure]).toContain("lib/kicad/pin-pattern.ts")
  expect([...patternClosure]).toContain("lib/kicad/pin-pattern-model.ts")
  // And the digest genuinely reads those files: hashing a closure that omitted
  // the model modules would give the same answer as hashing the entry alone.
  expect(spanClosureHash()).not.toBe(closureSha256("lib/kicad/lead-span-model.ts"))
  expect(spanClosureHash()).toMatch(/^[0-9a-f]{64}$/)
  expect(pinPatternClosureHash()).toMatch(/^[0-9a-f]{64}$/)
})

test("a closure that cannot be walked is this gate's refusal, never a pass", () => {
  // A SKIPPED CHECK MUST NEVER LOOK LIKE A PASSING ONE. closureSha256 throws
  // when the walk reaches a file that is not there; the gate reports that as
  // span-hash rather than letting a read error escape from somewhere else in
  // the pipeline, where it would read as a pipeline bug rather than a refused
  // adoption.
  const message = refusalFrom(withUnwalkableSpanClosure)
  expect(message).toContain("span-hash")
  expect(message).toContain("could not be hashed")
  expect(message).toContain("not a file")
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
  // MUTATION RUN (M7): with assertFrozenFixtureUnchanged's comparison removed
  // entirely - the recorded hash still parsed and then discarded - 23 passed and
  // 4 failed: this test, "a frozen fixture replaced by ANOTHER recorded file's
  // bytes", "every refusal names what is missing", and "a refused adoption
  // leaves the board tree byte-identical". Reverted.
  expect(() => {
    const scenario = withChangedFrozenFixture()
    adoptLayout(scenario.input, scenario.deps)
  }).toThrow(/fixture/)
})

test("G2.2: a frozen fixture replaced by ANOTHER recorded file's bytes is refused", () => {
  // THE REVIEW'S OWN EXPERIMENT, ROUND 1 FINDING F1, AND IT PASSED BEFORE THIS
  // CHANGE. provenance.txt carries fourteen sha256 values for eight files, so
  // `provenance.includes(actual)` - "does this hash appear anywhere in the
  // file" - was satisfied by ANY listed file's hash: swapping
  // pultec-low-boost-frozen.dump for pt2399-core.dump's bytes left a hash the
  // file genuinely records, under a different name, and the check said nothing.
  // What B2 is about is the ASSOCIATION between a name and a hash, and
  // tools/stripboard/adopt-provenance.ts is what now reads it.
  //
  // MUTATION RUN (M20): with the comparison put back to the pre-fix
  // `!provenance.includes(actual)` reading, 25 passed and 2 failed - this test
  // and the record-severed test below. **The edited-fixture test above still
  // PASSED**, which is why an edit is the weaker probe and a swap is the
  // discriminating one: an edit produces a hash the file carries nowhere, and
  // the substring search catches that much. Reverted.
  const message = refusalFrom(withSwappedFrozenFixture)
  expect(message, "the swap is refused").toContain("frozen-fixture-hash")
  expect(message, "and the fixture it is about is named").toContain("pultec-low-boost-frozen.dump")
})

test("G2.2: a frozen fixture whose provenance record is severed from its name is refused", () => {
  // THE PARSER'S OWN REFUSAL, and the hazard it closes is the one the substring
  // search was: a reading that finds nothing must say so rather than pass. The
  // fixture here is byte-for-byte the committed one and its hash is still in the
  // file - only the basename line is renamed - so a parser that fell back to the
  // substring search would admit it.
  //
  // MUTATION RUN (M21): with `recordedHashFor`'s refusal replaced by a return of
  // the first 64-hex string found anywhere in the text, 26 passed and this was
  // the ONLY failure - and it failed on the SECOND assertion, because the gate
  // still refused, naming a hash belonging to a different file. Refusing for the
  // wrong reason is what a silent fallback buys, which is why the basename is
  // asserted and not just the id. Reverted.
  const message = refusalFrom(withUnrecordedFrozenFixture)
  expect(message, "a missing record is a refusal").toContain("frozen-fixture-hash")
  expect(message, "and it names the basename it found no record for").toContain(
    "records no sha256 for pultec-low-boost-frozen.dump",
  )
})

test("G2.3: a provenance chain that does not start from the board as it now is is refused", () => {
  // MUTATION RUN (M8): with the `moved.status !== 0` branch in
  // assertProvenanceChain - the `git diff --quiet <pipelineCommit>` comparison -
  // replaced by `if (false)`, 24 passed and 3 failed: this test, "every refusal
  // names what is missing", and "a refused adoption leaves the board tree
  // byte-identical". Reverted.
  // AND THE ID IS ASSERTED BESIDE THE WORDING, which this test needed and did
  // not have. `/provenance/` is matched by `frozen-fixture-hash`'s own
  // not-defaulted statement too, through the words "provenance.txt" - and that
  // check runs BEFORE this one, so a frozen refusal firing on this scenario
  // would have satisfied the pattern while saying nothing about the chain.
  //
  // MUTATION RUN (M18): with assertFrozenFixtureUnchanged's comparison forced
  // to refuse on every adoption, the `/provenance/` assertion PASSED and
  // `toContain("provenance-chain")` failed. Reverted.
  const message = refusalFrom(withStaleSourceBoard)
  expect(message).toMatch(/provenance/)
  expect(message, "and it is the chain's own refusal").toContain("provenance-chain")
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
  // MUTATION RUN (M9): with that branch replaced by `if (false)`, 25 passed and
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
  // replaced by `if (false)`, 24 passed and 3 failed - this test with an empty
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
  // MUTATION RUN (M11): with that branch replaced by `if (false)`, 26 passed and
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
  // branch replaced by `if (false)`, 23 passed and 4 failed - this test, the Q5
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
  // `outcome !== "admissible"` - the second taxonomy it exists not to be - 26
  // passed and this was the ONLY failure, which is what makes it the
  // discriminating test for the two-argument `exitCodeFor`. Reverted.
  // `/Q5/` ALONE WAS TRUE BY COINCIDENCE: `notDefaultedBecause("failing-check")`
  // says "this one also catches a Q5 stop on a healthy candidate" in its own
  // prose, so the pattern matched every failing-check refusal whether or not the
  // message named the rule that fired. The id is asserted beside it per the
  // review's ruling, and the OFFENDING clause beside that - which is the half a
  // message generator can lose.
  //
  // MUTATION RUN (M19): with `- and the run stopped on ${rule}` removed from
  // assertVerdictAdmits's message, `/Q5/` and the id assertion both PASSED and
  // the third failed. Reverted.
  const message = refusalFrom(withQ5Backstop)
  expect(message).toMatch(/Q5/)
  expect(message, "and it is the verdict's own refusal").toContain("failing-check")
  expect(message, "and the message itself names the rule that fired").toContain(
    "the run stopped on Q5",
  )
})

test("G2.5: a bound that is not its rule's bound is refused, re-derived rather than trusted", () => {
  // `metrics.bound` was folded into the canonical hash and compared against
  // NOTHING, so the gate trusted the producer's pairing of the bound with the
  // rule - and a tamperer recomputes the hash over whatever it edited, which
  // makes run.json the one artifact where the two can disagree undetected while
  // REP4 requires they agree in one report. `boundFor` is now called here and
  // one side derived, which is a different act from reading both off the record.
  //
  // THE FIXTURE'S OWN HISTORY IS THE EVIDENCE THIS HAS TEETH: every scenario in
  // adopt-fixtures.ts recorded `bound: "at-floor"` whatever the rule, so the Q5
  // scenario carried at-floor beside Q5 - and this check refused it on its first
  // run, before the Q5 clause that test is about could fire. Each scenario now
  // states REP4's pairing as a literal rather than computing it with the same
  // boundFor the gate compares against.
  const message = refusalFrom(withMismatchedBound)
  expect(message).toContain("failing-check")
  expect(message).toContain("records the bound \"search-exhausted\"")
  expect(message).toContain("pairs Q1 with at-floor")
})

test("G2.6: an uncommitted layout is refused unless --allow-dirty", () => {
  // Exactly how update and stripboard already behave, so git stays the undo.
  //
  // MUTATION RUN (M14): with the assertLayoutRecoverable call replaced by
  // `void declaration.vrtPath`, 24 passed and 3 failed - this test's first
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

test("this whole file left the repository's own boards/ byte-identical", () => {
  // THE STANDING SAFETY CLAIM, and the one thing in this suite that is about
  // the real tree: the gate's entire job is writing under boards/, so a test
  // that let it write for real would modify the owner's committed layouts.
  // Every scenario's board is in a mkdtemp directory; this is the witness that
  // none of them was the real one. `./adopt-properties.test.ts` carries the
  // same test, because each file has to be able to say it for itself.
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
