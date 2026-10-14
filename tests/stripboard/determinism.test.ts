/**
 * Task 21: `V6` - the canonical artifact identity reproduces, the execution
 * provenance is recorded and never compared, and the RESTART BOUNDARIES are
 * part of the identity rather than a field nobody would miss.
 *
 * THE AUTHORITY is the `V6` row of
 * `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md` as the
 * stripboard pipeline plan's Task 21 brief quotes it: *"a run that lands on the
 * same board by a different path has not demonstrated the determinism the
 * escape mechanisms need."* Where this file and that document differ the
 * document wins and this comment is the defect.
 *
 * **THE TWO CONTRACTS, AND THEY ARE NOT RUN TOGETHER.** Canonical artifact
 * identity must reproduce byte for byte: the candidate `.vrt` and the
 * enumerated metrics - `C`, `W`, `B`, `F`, `N`, `J`, `S_occ`, `kappa`, `A_occ`,
 * every `HC1`-`HC10` verdict, the ranking tuple, the stopping rule, the
 * `bound`, the `outcome`, and the restart boundaries. Execution provenance - the
 * stamp, the timestamps, the temporary paths, the durations, the host, the
 * measured milliseconds, the invocation counts - is recorded and compared by
 * nothing here. The two live in the two top-level blocks of `RunManifest`, and
 * the last test compares two runs' manifests asserting the canonical blocks
 * EQUAL and the provenance blocks DIFFERENT in one breath, so neither claim can
 * be satisfied by the other.
 *
 * **WHAT TASK 13 ALREADY PROVED AND THIS FILE DOES NOT REPEAT.**
 * `./run-dir-hash.test.ts` proves `canonicalHash` hashes exactly
 * `{ inputs, metrics }` - that a `provenance` block cannot reach it, and that
 * two manifests with wildly different provenance hash alike. That is the hash's
 * own contract. This file is the layer above it: that two full `search` runs
 * from one seed list produce one canonical block at all.
 *
 * **WHAT THESE PROVE AND WHAT THEY DO NOT.** The spawn is injected and answers
 * `--dump-board` from a script, so no board here is the fork's own output and
 * nothing below is evidence about VeroRoute's geometry. What reproduces is the
 * SEARCH: which move the run accepted, in which round of which climb, where the
 * restarts fell, and what the graders then said about the board it reported. A
 * nondeterminism inside the fork is invisible to this file, and one in a module
 * the search reaches is caught here only if it moves a compared fact;
 * `./escapes-search.test.ts`'s closure scan is the cheap early warning that
 * names the file instead. `./determinism-fixtures.ts` holds the runs, the dump
 * scripts and the two readers, and states the rest of this file's bounds -
 * why every comparison runs through one directory, and that no `Q6` stop is
 * covered.
 */
import { afterAll, expect, test } from "bun:test"
import os from "node:os"
import path from "node:path"
import { cleanUpTempScratch } from "../support/temp-scratch.ts"
import { renderReport } from "../../tools/stripboard/report.ts"
import {
  readManifest,
  writeManifest,
  type CanonicalMetrics,
} from "../../tools/stripboard/run-dir.ts"
import {
  BOUNDARY_SHIFTED,
  CAP,
  canonicalInputsOf,
  canonicalMetricsOf,
  candidateWithinRun,
  evaluationsOf,
  hashOf,
  manifestOf,
  NOTHING_ACCEPTED,
  ONE_MOVE_LATER,
  oneRun,
  SCRIPT,
  SEEDS,
  seededArmDraw,
  stoppingRuleOf,
  twoRuns,
  type Bundle,
} from "./determinism-fixtures.ts"
import { freshSearchDir } from "./search-fixtures.ts"

afterAll(cleanUpTempScratch)

/** The same run twice, which is the pair most of these tests want. */
function twice(): readonly [Bundle, Bundle] {
  return twoRuns(freshSearchDir(), { script: SCRIPT }, { script: SCRIPT })
}

/** One run's report, rendered from the rule its own counters produced. */
function reportOf(bundle: Bundle): readonly string[] {
  return renderReport({
    run: bundle.result,
    rule: stoppingRuleOf(bundle),
    targets: bundle.targets,
    rules: bundle.rules,
    frozen: undefined,
    binding: undefined,
    // THE SCRIPTED BOARDS CARRY NO CUTS AT ALL (`./climb-boards.ts`: every net
    // sits on its own strip), so zero necessary of zero reported is this run's
    // own figure and not a stand-in. No test in this file reads the `cuts:`
    // line; what they compare is that two runs render the SAME lines, and a
    // number pulled from the candidate would make that comparison depend on a
    // drop test neither run ran.
    necessaryCuts: bundle.result.best.score.cuts,
  })
}

test("the same seed list and the same inputs reproduce the candidate and the metrics", () => {
  const [first, second] = twice()
  // THE RUN ACTUALLY SEARCHED, asserted as the hand-derived figures before any
  // comparison rests on it: 90 evaluations for the stalled first climb and 5 for
  // the second, one accepted move in the second climb, one restart boundary. Two
  // runs that evaluated nothing would agree about everything below. The 90 was
  // 92 until the add-wire enumeration became segment-aware - ./search-fixtures.ts
  // carries that arithmetic - so the cap of 95 now leaves five for the second
  // climb rather than three.
  expect(first.result.climbs.map((climb) => climb.evaluations)).toEqual([90, 5])
  expect(evaluationsOf(first.result)).toBe(CAP)
  expect(first.result.climbs.map((climb) => climb.acceptedPerRound)).toEqual([[0], [1]])
  expect(first.result.restartBoundaries).toEqual([90])

  // The same move, in the same round of the same climb, producing the same bytes.
  expect(candidateWithinRun(second)).toBe(candidateWithinRun(first))
  expect(second.candidateBytes).toEqual(first.candidateBytes)
  expect(canonicalMetricsOf(second)).toEqual(canonicalMetricsOf(first))
  expect(hashOf(second)).toBe(hashOf(first))
  // And the report a reader is handed reproduces as text. Its first line names
  // the candidate's path, which is identical here only because both runs were
  // handed one run directory - so this line says nothing about a path leak,
  // which is the manifest test's business.
  expect(reportOf(second)).toEqual(reportOf(first))
})

test("the restart boundaries reproduce, not merely the final board", () => {
  const [first, second] = twice()
  expect(second.result.restartBoundaries).toEqual(first.result.restartBoundaries)
  // One boundary per restart, and a restart is not the first climb - so a run
  // that never restarted would satisfy the equality above with two empty lists.
  expect(first.result.restartBoundaries.length).toBe(SEEDS.length - 1)
})

test("a run that lands on the same board by a different path is not a reproduction", () => {
  // THIS IS WHAT PUTS THE BOUNDARIES IN THE IDENTITY. The shifted run's first
  // climb loses one evaluation to an unscoreable candidate, so its restart
  // begins at 89 instead of 90 - and everything else about the run is the same:
  // the same accepted move, the same candidate bytes, the same F, the same
  // ranking tuple, the same stopping rule, the same outcome. Drop the boundaries
  // from the comparison and these two runs are indistinguishable, which is the
  // whole reason V6 names them.
  const [baseline, shifted] = twoRuns(
    freshSearchDir(),
    { script: SCRIPT },
    { script: BOUNDARY_SHIFTED },
  )
  expect(shifted.result.climbs.map((climb) => climb.unscoreable)).toEqual([1, 0])
  expect(shifted.result.restartBoundaries).toEqual([89])
  expect(baseline.result.restartBoundaries).toEqual([90])
  expect(candidateWithinRun(shifted)).toBe(candidateWithinRun(baseline))
  expect(shifted.candidateBytes).toEqual(baseline.candidateBytes)
  const exceptBoundaries = (metrics: CanonicalMetrics): unknown => {
    const { restartBoundaries, ...rest } = metrics
    return { ...rest, boundaryCount: restartBoundaries.length }
  }
  expect(exceptBoundaries(canonicalMetricsOf(shifted)))
    .toEqual(exceptBoundaries(canonicalMetricsOf(baseline)))
  expect(canonicalMetricsOf(shifted)).not.toEqual(canonicalMetricsOf(baseline))
  expect(hashOf(shifted)).not.toBe(hashOf(baseline))
})

test("the accepted move itself is part of the identity, not only the board it produced", () => {
  // The companion to the test above, on the other field: this run accepts the
  // second candidate of its second climb instead of the first, so the board it
  // reports is the same board by every canonical METRIC and a different file.
  // The candidate's content hash is what separates them.
  const [baseline, later] = twoRuns(
    freshSearchDir(),
    { script: SCRIPT },
    { script: ONE_MOVE_LATER },
  )
  expect(canonicalMetricsOf(later)).toEqual(canonicalMetricsOf(baseline))
  expect(candidateWithinRun(later)).not.toBe(candidateWithinRun(baseline))
  expect(canonicalInputsOf(later).candidateSha256)
    .not.toBe(canonicalInputsOf(baseline).candidateSha256)
  expect(hashOf(later)).not.toBe(hashOf(baseline))
})

test("a different seed list changes the canonical hash", () => {
  // THROUGH THE CANONICAL INPUTS, WHICH IS WHERE THE SCHEDULE IS RECORDED, and
  // saying so is the point: on the `import` arm a seed changes no board at all -
  // that arm has one start and the seed is not consulted - so the metrics of
  // these two runs agree, and a hash that did not carry the seed list would call
  // them one run. V6 is that the schedule is a function of the seed list, so the
  // record has to carry the list it was a function of.
  const [baseline, changed] = twoRuns(
    freshSearchDir(),
    { script: SCRIPT },
    { script: SCRIPT, seeds: [9, 8, 7] },
  )
  expect(canonicalMetricsOf(changed)).toEqual(canonicalMetricsOf(baseline))
  expect(canonicalInputsOf(changed).seeds).toEqual([9, 8, 7])
  expect(hashOf(changed)).not.toBe(hashOf(baseline))
})

test("a run that takes three times as long reproduces, and one that DIFFERS does not", () => {
  // Determinism is not reproducibility of timing, so a slower run must hash the
  // same. THE SECOND CLAUSE IS IN THE BODY AND NOT ONLY IN THE NAME: a hash that
  // ignored the metrics entirely would satisfy the first clause by itself.
  const runDir = freshSearchDir()
  const baseline = oneRun(runDir, { script: SCRIPT })
  if (baseline.durationMs < 1) {
    throw new Error(
      "the baseline run measured under a millisecond, so there is no duration to make a slower " +
        "run three times longer than and the comparison below would be vacuous. It is NOT " +
        "treated as zero: a timing claim asserted against a zero baseline is the shape this " +
        "suite refuses. Raise CAP in ./determinism-fixtures.ts so the run is long enough to " +
        "measure.",
    )
  }
  // The delay is per invocation and sized from the measured baseline, so the
  // slow run's SLEEP ALONE is at least three times the baseline's whole
  // duration: the assertion below is satisfied by construction rather than by
  // what the machine was doing, which is what keeps a timing test from flaking.
  const perInvocation = Math.max(1, Math.ceil((3 * baseline.durationMs) / baseline.invocations))
  const slow = oneRun(runDir, { script: SCRIPT, delayMs: perInvocation })
  expect(slow.invocations).toBe(baseline.invocations)
  expect(slow.durationMs).toBeGreaterThanOrEqual(3 * baseline.durationMs)
  expect(hashOf(slow), "a slower run must reproduce").toBe(hashOf(baseline))

  // And a run whose RESULT differs must not hash the same, which is the half
  // that makes the half above mean something.
  const [reference, different] = twoRuns(
    freshSearchDir(),
    { script: SCRIPT },
    { script: NOTHING_ACCEPTED },
  )
  expect(canonicalMetricsOf(different), "the scripts must actually produce different results")
    .not.toEqual(canonicalMetricsOf(reference))
  expect(hashOf(different), "a differing run must not reproduce").not.toBe(hashOf(reference))
})

test("the seeded arm's own draw reproduces, which is the one place a draw happens", () => {
  // EVERY OTHER TEST HERE RUNS THE `import` ARM, WHICH CONSULTS NO SEED - so a
  // seededPrng seeded from the clock would leave all of them passing. This is
  // the comparison that would fail: the control arm draws a position and a
  // quarter-turn per part, and its recorded gestures are that draw.
  const runDir = freshSearchDir()
  const first = seededArmDraw(runDir, 0)
  const second = seededArmDraw(runDir, 0)
  // IT ACTUALLY DREW: the sequence is the arm's read, its per-part gestures and
  // the autofill that paints the start, so a run that emitted nothing would
  // compare two short lists and pass.
  expect(first.filter((args) => args[0] === "--move").length).toBeGreaterThan(1)
  expect(first.filter((args) => args[0] === "--rotate").length).toBeGreaterThan(1)
  expect(second).toEqual(first)
  // AND THE DRAW IS A FUNCTION OF THE SEED, which is what makes the equality
  // above a reproduction rather than two copies of a constant gesture list.
  expect(seededArmDraw(runDir, 1)).not.toEqual(first)
})

test("the manifest's provenance block holds the timings and the canonical block does not", () => {
  const [bundle] = twice()
  const manifest = manifestOf(bundle)
  expect(manifest.provenance.durationMs).toBeGreaterThanOrEqual(0)
  const canonical = JSON.stringify(manifest.canonical)
  expect(canonical).not.toContain("durationMs")
  expect(canonical).not.toContain(manifest.provenance.stamp)
  // AND NO TEMPORARY PATH REACHED IT EITHER, which is the leak a hash over
  // enumerated fields can still carry: the candidate enters the canonical block
  // as a content hash, and its path - the run directory, under the system's
  // temporary root - is provenance.
  expect(canonical).not.toContain(bundle.runDir)
  expect(canonical).not.toContain(os.tmpdir())
  expect(canonical).not.toContain(manifest.provenance.host)
})

test("two runs' manifests agree on the canonical block and disagree on the provenance", () => {
  // THE TWO CONTRACTS IN ONE ASSERTION PAIR, and neither can be satisfied by the
  // other: if this file were comparing provenance by accident the first
  // expectation would fail, and if it were comparing nothing the second would.
  // They are written and read back through writeManifest/readManifest, which
  // refuse a manifest whose recorded hash disagrees with its own block - so what
  // is compared is what a run would actually leave on disk.
  const runDir = freshSearchDir()
  const [first, second] = twoRuns(runDir, { script: SCRIPT }, { script: SCRIPT, delayMs: 1 })
  // TWO DIRECTORIES UNDER THE ONE RUN DIRECTORY, because `run.json` has one name
  // and the two runs shared a directory. The manifests are written after both
  // runs for the same reason: the second run emptied the first's.
  const recorded = [first, second].map((bundle, index) => {
    const into = path.join(runDir, `recorded-${index}`)
    writeManifest(into, manifestOf(bundle))
    return readManifest(into)
  })
  const [one, two] = recorded
  if (one === undefined || two === undefined) {
    throw new Error("two manifests were written and fewer than two were read back.")
  }
  expect(two.canonical).toEqual(one.canonical)
  expect(two.provenance).not.toEqual(one.provenance)
  expect(two.provenance.stamp).not.toBe(one.provenance.stamp)
  // THE DURATIONS ARE NOT COMPARED, not even for inequality: the second run
  // slept a millisecond in every invocation, and asserting that it therefore
  // measured longer would be this file comparing a timing after all - and would
  // be the one assertion here a loaded machine could turn red.
})
