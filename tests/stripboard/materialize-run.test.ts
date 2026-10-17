/**
 * The run directory `tools/stripboard/materialize-run.ts` produces, handed to
 * the checks `adoptLayout` runs, one at a time, BY NAME.
 *
 * **IT CALLS THE CHECKS AND NOT `adoptLayout`.** That function's last act is to
 * copy the candidate over `boards/pultec-low-boost/pultec-low-boost.perfboard.vrt`,
 * which is the owner's own layout and is not a test's to overwrite. Calling the
 * checks individually also makes a failure name which refusal fired, where
 * `adoptLayout` would report whichever one it reached first.
 *
 * **WHAT THIS FILE MEASURED, STATED UP FRONT.** Every one of the nine drivable
 * checks passes on a run directory this producer wrote, **under the committed
 * rules**, and `failing-check` is the one that says why the ninth is not a
 * figure: the materialised low-boost board grades `admissible` (the owner
 * withdrew `kappa_bench` on 2026-10-16, so `A2` does not fire) and the run
 * records `tools/stripboard/termination.ts`'s `no-search` because it swept no
 * move set, so what admits it is **the owner's recorded call on a render** -
 * acceptance channel 4 of
 * `docs/superpowers/specs/2026-10-16-pultec-five-boards-design.md`, recorded in
 * `stripboard/render-approvals.json` against this board and this candidate's
 * sha256. The tenth check, the post-copy `make check` (`G4`), needs the copy and
 * is not driven here.
 *
 * **THE APPROVAL IS SCOPED TO BYTES, SO ONE ASSERTION HERE IS LOAD-BEARING IN A
 * WAY A READER SHOULD KNOW ABOUT.** If a pipeline change moves the produced
 * candidate, its hash stops matching the recorded one and this file goes red on
 * `failing-check` with a complaint saying the board changed. **That is the
 * mechanism working**: he approved a board, not a section, and a different board
 * needs a different look from him. Re-render, show him, record what he says -
 * never edit the hash to match.
 *
 * **WHAT CHANGED ON 2026-10-16, SINCE THE SHAPE OF THESE TESTS IS THE RECORD OF
 * IT.** This file used to run under a fixture carrying the withdrawn `0.05`,
 * because the producer recorded `Q3` and `assertRuleNotLoadBearing` then refused
 * to write a run at all when the outcome came out `admissible`. The producer
 * records `no-search` now, so the fixture is gone and these checks are driven
 * over a run graded with the reviewed parameters; and `failing-check` refused
 * every such run until the owner's approval had a file to be recorded in.
 * `docs/known-gaps.md` G27 records what that mechanism can and cannot prove.
 *
 * **`uncommitted-layout` IS NOT HERE AND THAT IS DELIBERATE** - it is the one
 * check about the DESTINATION rather than about the run, it lives in
 * `tools/stripboard/adopt.ts` beside the write it guards, and reaching it means
 * standing next to that write. `tests/stripboard/adopt.test.ts` drives it on a
 * scratch board.
 */
import { afterAll, beforeAll, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import {
  assertClosureHash,
  assertFileHash,
  assertForkCommits,
  assertFrozenFixtureUnchanged,
  assertProvenanceChain,
  assertVerdictAdmits,
  sha256OfFile,
} from "../../tools/stripboard/adopt-checks.ts"
import {
  PIN_PATTERN_ENTRY,
  SPAN_DATA_ENTRY,
} from "../../tools/stripboard/geometry-inputs.ts"
import type { MaterializeRun } from "../../tools/stripboard/materialize-run.ts"
import { readManifest } from "../../tools/stripboard/run-dir.ts"
import {
  adoptInputFor,
  BOARD,
  chainBoard,
  cleanUpFixtures,
  manifestPath,
  producedRun,
  realDeps,
  REPO,
} from "./materialize-run-fixtures.ts"

afterAll(cleanUpFixtures)

let run: MaterializeRun

beforeAll(async () => {
  run = await producedRun("materialize-run")
})

test("the producer writes every file the chain's links are read from", () => {
  const held = fs.readdirSync(run.runDir).sort()
  expect(held, "run.json, the netlist, the imported base and one directory per seed").toEqual([
    "imported.vrt",
    // WHAT THE BOARD WOULD BE ADMITTED ON, WRITTEN WHERE A READER OF THE RUN
    // DIRECTORY FINDS IT. A run that performed no search is adopted only on the
    // owner's recorded call on a render, and this file carries his words in full
    // - or the complaint, when no record covers these bytes.
    "owner-approval.txt",
    "pultec-low-boost.net",
    "run.json",
    "seed-0",
    "seed-1",
    "seed-2",
    "seed-3",
    "seed-4",
  ])
  expect(
    fs.readdirSync(path.join(run.runDir, `seed-${run.bestSeed}`)).sort(),
    "the document, the board the fork wrote from it, and the painted board it was graded on",
  ).toEqual(["candidate.vrt", "layout.txt", "materialized.vrt"])
})

test("nothing the producer wrote is under boards/", () => {
  expect(
    path.resolve(run.runDir),
    "the run directory is under build/stripboard/<board>/, which is gitignored",
  ).toBe(path.join(REPO, "build", "stripboard", run.board, path.basename(run.runDir)))
  for (const entry of run.perSeed) {
    expect(entry.materialized.includes(`${path.sep}boards${path.sep}`)).toBe(false)
    expect(entry.evaluation.candidate.includes(`${path.sep}boards${path.sep}`)).toBe(false)
  }
})

test("candidate-hash: run.json reads back, and the candidate hashes to what it records", () => {
  // THE CANONICAL HASH IS `readManifest`'s OWN CHECK, which is G2.1's second
  // clause: it recomputes canonicalHash(inputs, metrics) over the file's own two
  // blocks and throws when they disagree. `adopt` reports that as
  // `candidate-hash`, so a manifest that reads back is that refusal not firing.
  const manifest = readManifest(run.runDir)
  expect(manifest.canonical.hash.length, "a sha256, recomputed from the file's own blocks").toBe(64)
  expect(sha256OfFile(run.candidate)).toBe(manifest.canonical.inputs.candidateSha256)
})

test("rules-hash: the recorded hash is the reviewed rules file as it stands", () => {
  const deps = realDeps()
  const inputs = readManifest(run.runDir).canonical.inputs
  expect(() =>
    assertFileHash(deps.rulesPath, inputs.rulesSha256, "rules-hash", "the reviewed rules file"),
  ).not.toThrow()
})

test("span-hash and pin-pattern-hash: each closure, recomputed by the gate's own function", () => {
  const deps = realDeps()
  const inputs = readManifest(run.runDir).canonical.inputs
  expect(() =>
    assertClosureHash(
      deps.spanClosureHash,
      inputs.spanClosureSha256,
      "span-hash",
      "the lead-span data and every module it imports",
      SPAN_DATA_ENTRY,
    ),
  ).not.toThrow()
  expect(() =>
    assertClosureHash(
      deps.pinPatternClosureHash,
      inputs.pinPatternClosureSha256,
      "pin-pattern-hash",
      "the pin-pattern data and every module it imports",
      PIN_PATTERN_ENTRY,
    ),
  ).not.toThrow()
})

test("frozen-fixture-hash: B1-frozen's four files still hash to provenance.txt", () => {
  // IT IS UNCONDITIONAL AND IS NOT ABOUT THIS RUN - `adopt-checks.ts` says why
  // at length. It is asserted here because `adoptLayout` runs it on every
  // adoption, so a run directory that could not clear it is one nothing could
  // adopt whatever else was true of it.
  expect(() => assertFrozenFixtureUnchanged(realDeps())).not.toThrow()
})

test("provenance-chain: the stamp, the netlist, the imported board and the candidate", () => {
  expect(() =>
    assertProvenanceChain(adoptInputFor(run), readManifest(run.runDir), chainBoard(), realDeps()),
  ).not.toThrow()
})

test("veroroute-commit and built-commit: the pin, the record and the stamp on disk", () => {
  expect(() => assertForkCommits(readManifest(run.runDir).canonical.inputs, realDeps())).not.toThrow()
})

/**
 * `failing-check` ON THE RUN AS PRODUCED, and the assertions are about WHAT
 * ADMITS IT rather than about a pass alone.
 *
 * **THE CANDIDATE AND THE RUN ARE TWO FACTS AND BOTH ARE CHECKED.** The
 * candidate holds all ten hard constraints and, with `kappa_bench` withdrawn,
 * meets every condition that fires - the outcome is `admissible`, and
 * `outcomeExitCode` grades it through the same table every other run's goes
 * through. The RUN swept no move set, so it records `no-search` and has no rule
 * for `exitCodeFor`; what admits THAT is the owner's recorded call on a render
 * of this board, and the notice the gate hands back is how the adoption says so.
 */
test("failing-check: a no-search run is admitted on the owner's recorded approval", () => {
  const file = manifestPath(run)
  const manifest = readManifest(run.runDir)
  expect(
    Object.values(manifest.canonical.metrics.constraints).every((held) => held),
    "HC1-HC10 all hold on the materialised board",
  ).toBe(true)
  expect(
    manifest.canonical.metrics.outcome,
    "every hard constraint holds and no graded target is missed",
  ).toBe("admissible")
  // KAPPA IS IN THE RECORD WHETHER A BOUND GRADES IT OR NOT: the figure is the
  // measurement, the bound was the grading, and unsetting the bound took only
  // the second. This is the number a later bound would be set from.
  expect(manifest.canonical.metrics.clustering).toBeCloseTo(0.25, 10)
  expect(
    manifest.canonical.metrics.stoppingRule,
    "the producer records what it did rather than the least-wrong Q-rule",
  ).toBe("no-search")
  expect(manifest.canonical.metrics.bound, "and therefore no bound at all").toBe("no-bound")
  const notices = assertVerdictAdmits(manifest, file, BOARD, realDeps())
  // ONE LINE, AND IT NAMES WHAT THE BOARD WAS ADMITTED ON. An admission on his
  // judgement rather than on a search result that nobody sees is the same hazard
  // as a skipped check that looks like a passing one, so the gate hands the line
  // back and `tools/cli/perfboard-stripboard-verbs.ts` prints it.
  expect(notices, "the admission is audible").toHaveLength(1)
  expect(notices[0]).toContain("stripboard-owner-approved")
  expect(notices[0], "and says it was not a search result").toContain("NOT on a search result")
  expect(notices[0], "naming the entry").toContain("owner-render-pultec-low-boost-rcm-s0")
  expect(notices[0], "and the bytes it is scoped to").toContain(
    manifest.canonical.inputs.candidateSha256,
  )
})

/**
 * **THE RUN DIRECTORY SAYS SO TOO, AND IT CARRIES HIS WORDS.** The requirement
 * is not only that the gate can be satisfied: a reader standing in a run
 * directory has to be able to see that this board would be admitted on the
 * owner's judgement rather than on a search result, and read what he said - so
 * `tools/stripboard/materialize-run.ts` writes `owner-approval.txt` beside
 * `run.json`. It decides nothing; the gate consults the committed registry
 * itself.
 */
test("the run directory carries the approval, with his words quoted in full", () => {
  const text = fs.readFileSync(path.join(run.runDir, "owner-approval.txt"), "utf8")
  expect(text).toContain("stripboard-owner-approved")
  expect(text).toContain("owner-render-pultec-low-boost-rcm-s0")
  expect(text).toContain("OWNER'S WORDS (verbatim, 2026-10-16)")
  // VERBATIM, LOWER-CASE "i" AND ALL. A quote an agent tidies is a quote nobody
  // can check against what was said.
  expect(text).toContain("i prefer the loose layout. It's much easier to build.")
  expect(text).toContain("if the layout is electrically correct, let's keep it. It looks fine to me")
  expect(text, "and the edges, so the file cannot be read as a blanket").toContain(
    "WHAT THIS DOES NOT EXCUSE:",
  )
  expect(text).toContain("violationsOf")
})

test("the record carries the figures the model produced, not a second reading of them", () => {
  const metrics = readManifest(run.runDir).canonical.metrics
  expect(
    [metrics.cuts, metrics.wires, metrics.solder],
    "the model's own 4 cuts / 4 wires / 5 bridges for low-boost",
  ).toEqual([run.best.score.cuts, run.best.score.wires, run.best.score.solder])
  expect(metrics.stoppingRule, "the termination the producer recorded").toBe(run.termination)
  expect(metrics.outcome, "the outcome tools/stripboard/verdict.ts produced").toBe(run.outcome)
})
