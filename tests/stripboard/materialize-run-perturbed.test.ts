/**
 * Every field the producer records, perturbed one at a time, with the check that
 * is supposed to see it named in the assertion.
 *
 * **A MANIFEST THAT SATISFIES A GATE BECAUSE THE GATE CANNOT SEE IT IS THE
 * DEFECT THIS FILE EXISTS TO RULE OUT.** `./materialize-run.test.ts` shows the
 * produced run directory clearing nine of the ten checks; on its own that is
 * equally consistent with nine checks that cannot fail. So each case below
 * writes the value a WELL-MEANING PERSON would actually write - the previously
 * pinned fork commit, a re-export of the same netlist, the two closure hashes
 * transposed, a loosened `kappa_bench` - and asserts the refusal by its own id.
 *
 * **THE CANONICAL HASH IS RECOMPUTED OVER EVERY EDIT BUT ONE.** `readManifest`
 * refuses a manifest whose recorded hash disagrees with its own blocks, and
 * `adopt` reports that as `candidate-hash` - so without recomputing, every case
 * here would refuse by that one id and would prove the canonical hash works
 * rather than that the field is seen. The one case that leaves it alone is the
 * one ABOUT it.
 *
 * **ONE RUN DIRECTORY, EDITED AND RESTORED.** `withManifest` puts the original
 * bytes back in a `finally`, so no case is another case's input: every scenario
 * is healthy except in the one respect it is about, which is what makes the
 * refusal it names discriminating rather than coincidental.
 *
 * **NOTHING UNDER `boards/` IS WRITTEN.** The scenarios that need a CHANGED
 * dependency - the rules file, the frozen fixture directory, a board whose
 * strips run the other way - point the dependency at a scratch copy and change
 * the copy. A test that edited a committed file to drive a refusal is a test
 * that can leave the repository broken when it fails halfway.
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
import { exportNetlistFor } from "../../tools/perfboard/check.ts"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import {
  PIN_PATTERN_ENTRY,
  SPAN_DATA_ENTRY,
  pinPatternClosureHash,
  spanClosureHash,
} from "../../tools/stripboard/geometry-inputs.ts"
import { materializeRun, type MaterializeRun } from "../../tools/stripboard/materialize-run.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { readManifest } from "../../tools/stripboard/run-dir.ts"
import {
  adoptInputFor,
  chainBoard,
  cleanUpFixtures,
  forkSpawn,
  manifestPath,
  producedRun,
  realDeps,
  rewritten,
  withFileAbsent,
  withManifest,
  BOARD,
  REPO,
} from "./materialize-run-fixtures.ts"
import { freshRoot, scratchStamp } from "./run-scratch.ts"

afterAll(cleanUpFixtures)

/**
 * The commit `veroroute.pin` named before the current one, from
 * `.superpowers/sdd/2026-10-16-pultec-five-boards/task-3-report.md`'s run.
 *
 * **IT IS A REAL PRIOR PIN AND NOT A MADE-UP SHA**, which is the point: the
 * realistic wrong value for either commit field is the one the pin used to
 * carry, written by somebody re-recording a figure from an older report. A
 * string of obvious nonsense would be caught by anything and would prove
 * nothing about the comparison.
 */
const PREVIOUS_PIN = "cc00bda7a6dc2ffc2e7a52d50ef10c2fabb6ebb2"

let run: MaterializeRun

beforeAll(async () => {
  run = await producedRun("perturbed")
})

test("candidate-hash: the hash left alone while a field moved is refused by name", () => {
  // THE ONE CASE THAT DOES NOT RECOMPUTE. This is the edit an operator actually
  // makes - open run.json, change the figure, save - and `readManifest` is what
  // sees it. `tools/stripboard/adopt.ts`'s `manifestOf` wraps exactly this
  // failure as the `candidate-hash` refusal.
  const naive = fs
    .readFileSync(manifestPath(run), "utf8")
    .replace('"outcome": "valid-below-target"', '"outcome": "admissible"')
  expect(naive, "the edit landed in the text").toContain('"outcome": "admissible"')
  withManifest(run, naive, () => {
    expect(() => readManifest(run.runDir)).toThrow(
      /the recorded canonical hash .* disagrees with .*, recomputed from this same file's own/,
    )
  })
})

test("candidate-hash: a candidate edited after the run no longer hashes to the record", () => {
  // THE SECOND CLAUSE OF G2.1 IS RAISED INSIDE `adoptLayout`, beside the write
  // it guards, so it is not callable from here without standing next to that
  // write - `./adopt.test.ts` drives it on a scratch board. What is driven here
  // is the comparison itself, with the gate's own `sha256OfFile`: a board opened
  // in VeroRoute and saved after the run that scored it.
  const recorded = readManifest(run.runDir).canonical.inputs.candidateSha256
  const original = fs.readFileSync(run.candidate)
  try {
    fs.appendFileSync(run.candidate, "\n")
    expect(sha256OfFile(run.candidate)).not.toBe(recorded)
  } finally {
    fs.writeFileSync(run.candidate, original)
  }
  expect(sha256OfFile(run.candidate), "restored").toBe(recorded)
})

test("rules-hash: a kappa_bench loosened after the run is refused by name", () => {
  // THE REALISTIC EDIT, named in `stripboard/rules.json`'s own note: "The
  // obvious repair is to loosen the bound to admit them, and that is NOT the
  // decision." A run graded at 0.05 and adopted under 0.06 is the exact shape
  // `rules-hash` exists for.
  const copy = path.join(freshRoot("loosened-rules"), "rules.json")
  const text = fs.readFileSync(realDeps().rulesPath, "utf8")
  const loosened = text.replace('"kappaBench": 0.05', '"kappaBench": 0.06')
  expect(loosened, "the edit landed").toContain('"kappaBench": 0.06')
  fs.writeFileSync(copy, loosened)
  const recorded = readManifest(run.runDir).canonical.inputs.rulesSha256
  expect(() =>
    assertFileHash(copy, recorded, "rules-hash", "the reviewed rules file"),
  ).toThrow(/^rules-hash: /)
})

test("span-hash and pin-pattern-hash: the two closure hashes transposed refuse separately", () => {
  // THE REALISTIC WRONG VALUE IS THE OTHER CLOSURE'S HASH. Both fields are a
  // 64-character hex digest produced by the same function one line apart, so a
  // transposition is the mistake available here - and each refusal has to name
  // its own field rather than both reporting "a hash did not match".
  const inputs = readManifest(run.runDir).canonical.inputs
  expect(() =>
    assertClosureHash(
      spanClosureHash,
      inputs.pinPatternClosureSha256,
      "span-hash",
      "the lead-span data and every module it imports",
      SPAN_DATA_ENTRY,
    ),
  ).toThrow(/^span-hash: /)
  expect(() =>
    assertClosureHash(
      pinPatternClosureHash,
      inputs.spanClosureSha256,
      "pin-pattern-hash",
      "the pin-pattern data and every module it imports",
      PIN_PATTERN_ENTRY,
    ),
  ).toThrow(/^pin-pattern-hash: /)
})

test("frozen-fixture-hash: a benchmark fixture re-extracted after the run is refused", () => {
  // THE WHOLE FIXTURE DIRECTORY IS COPIED AND ONE FILE GETS A TRAILING NEWLINE -
  // which is what a re-extraction through a different tool actually produces,
  // rather than a file full of different content. `provenance.txt` travels with
  // the copy, so the only difference from the healthy case is those bytes.
  const deps = realDeps()
  const copy = freshRoot("re-extracted-fixture")
  fs.cpSync(deps.frozenFixtureDir, copy, { recursive: true })
  const touched = path.join(copy, "pultec-low-boost-frozen.netlist")
  fs.appendFileSync(touched, "\n")
  expect(() =>
    assertFrozenFixtureUnchanged({
      ...deps,
      frozenFixtureDir: copy,
      frozenProvenanceFile: path.join(copy, "provenance.txt"),
    }),
  ).toThrow(/^frozen-fixture-hash: /)
})

test("provenance-chain: a stamp from another run of the same board is refused", async () => {
  // THE REALISTIC WRONG VALUE IS ANOTHER RUN'S STAMP, which is what copying a
  // run.json between two run directories of one board produces. The stamp is in
  // the PROVENANCE block, so it is outside the canonical hash and an operator
  // who recomputed the hash would not notice it either.
  const other = scratchStamp(BOARD, "another-run")
  const edited = rewritten(run, { provenance: { stamp: other } })
  withManifest(run, edited, () => {
    expect(() =>
      assertProvenanceChain(adoptInputFor(run), readManifest(run.runDir), chainBoard(), realDeps()),
    ).toThrow(/^provenance-chain: /)
    expect(() =>
      assertProvenanceChain(adoptInputFor(run), readManifest(run.runDir), chainBoard(), realDeps()),
    ).toThrow(new RegExp(`names the run directory .*${other}`))
  })
  await Promise.resolve()
})

test("provenance-chain: a netlist re-exported after the run is refused by name", async () => {
  // THE MOST AVAILABLE WRONG VALUE ON THIS WHOLE RECORD, and `adopt-checks.ts`
  // names the cause itself: `exportNetlistFor` stamps the moment it ran into the
  // export's header, so a hash recorded from a SECOND export of the same circuit
  // is wrong while describing the same netlist.
  //
  // **THE SECOND EXPORT IS SYNTHESISED FROM THE FIRST'S BYTES BY MOVING ITS
  // TIMESTAMP ON, AND CALLING `exportNetlistFor` AGAIN WOULD BE FLAKY.** The
  // header's stamp is `2026-10-17T03:20:49` - SECOND resolution - so two exports
  // inside one second are byte-identical and this case passed or failed
  // depending on where the clock fell: measured, it refused inside `bun test` and
  // did not refuse in a script that reached it a moment later. The electrical
  // content is untouched, which is the whole point of the case.
  const written = fs.readFileSync(path.join(run.runDir, `${BOARD}.net`), "utf8")
  const exported = /created\s+(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)/.exec(written)?.[1]
  expect(exported, "the EESchema header carries the moment the export ran").toBeDefined()
  const fresh = path.join(freshRoot("re-exported"), `${BOARD}.net`)
  fs.writeFileSync(fresh, written.replace(`${String(exported)}`, "2026-10-17T03:21:07"))
  const reExported = sha256OfFile(fresh)
  const recorded = readManifest(run.runDir).canonical.inputs.netlistSha256
  expect(reExported, "the same netlist exported one moment later is not the same bytes").not.toBe(
    recorded,
  )
  // AND THE SAME CIRCUIT STILL EXPORTS TO THE SAME CONTENT, so the case is about
  // the stamp rather than about a changed circuit.
  const declaration = loadDeclaration(path.join(REPO, "boards", BOARD, "perfboard.json"))
  const again = await exportNetlistFor(declaration)
  expect(
    again.replace(/created\s+\S+/, ""),
    "everything but the stamp is what the run exported",
  ).toBe(written.replace(/created\s+\S+/, ""))
  withManifest(run, rewritten(run, { inputs: { netlistSha256: reExported } }), () => {
    expect(() =>
      assertProvenanceChain(adoptInputFor(run), readManifest(run.runDir), chainBoard(), realDeps()),
    ).toThrow(/^provenance-chain: /)
    expect(() =>
      assertProvenanceChain(adoptInputFor(run), readManifest(run.runDir), chainBoard(), realDeps()),
    ).toThrow(/as the netlist this run was graded against/)
  })
})

test("provenance-chain: a run directory whose imported board has been swept is refused", () => {
  // THE REALISTIC CAUSE IS A CLEANUP, not an edit: `build/` is gitignored and
  // gets swept, and the base is the one file in the run directory nothing else
  // reads afterwards.
  withFileAbsent(path.join(run.runDir, "imported.vrt"), () => {
    expect(() =>
      assertProvenanceChain(adoptInputFor(run), readManifest(run.runDir), chainBoard(), realDeps()),
    ).toThrow(/^provenance-chain: the --import-placed board every arm started from is not at/)
  })
})

test("provenance-chain: a candidate outside the run directory is refused", () => {
  // THE REALISTIC MISTAKE IS NAMING THE BOARD ITSELF - `--candidate
  // boards/<board>/<board>.perfboard.vrt` - which is the file an operator has in
  // hand and the one the verb is about to overwrite.
  const committed = loadDeclaration(path.join(REPO, "boards", BOARD, "perfboard.json")).vrtPath
  expect(() =>
    assertProvenanceChain(
      { ...adoptInputFor(run), candidate: committed },
      readManifest(run.runDir),
      chainBoard(),
      realDeps(),
    ),
  ).toThrow(/^provenance-chain: the candidate .* is not inside the run directory/)
})

test("veroroute-commit: the fork commit the pin used to carry is refused by name", () => {
  const edited = rewritten(run, { inputs: { verorouteCommit: PREVIOUS_PIN } })
  withManifest(run, edited, () => {
    expect(() =>
      assertForkCommits(readManifest(run.runDir).canonical.inputs, realDeps()),
    ).toThrow(/^veroroute-commit: run.json records verorouteCommit cc00bda7/)
  })
})

test("built-commit: a build stamp from the previous pin is refused by name", () => {
  const edited = rewritten(run, { inputs: { builtCommit: PREVIOUS_PIN } })
  withManifest(run, edited, () => {
    expect(() =>
      assertForkCommits(readManifest(run.runDir).canonical.inputs, realDeps()),
    ).toThrow(/^built-commit: run.json records builtCommit cc00bda7/)
  })
})

test("built-commit: an absent build stamp is refused rather than taken as agreement", () => {
  // THE REALISTIC CASE IS A FRESH CLONE where `make veroroute` has not run, so
  // `.tools/veroroute-perfboard/.built-commit` is not there at all. UNKNOWN is
  // refused rather than read as the pinned commit - `adopt-model.ts` states why.
  const deps = realDeps()
  expect(() =>
    assertForkCommits(readManifest(run.runDir).canonical.inputs, {
      ...deps,
      builtCommit: () => undefined,
    }),
  ).toThrow(/^built-commit: the build stamp under .* is absent or empty/)
})

test("failing-check: a bound that does not pair with the recorded rule is refused", () => {
  // THE REALISTIC WRONG VALUE: `Q3` is "the search is exhausted" in prose and
  // "the budget ran out" in a tired reading of the same sentence, and REP4's
  // table is the only thing that pairs the two. `assertVerdictAdmits` re-derives
  // the bound from the rule rather than trusting the producer's pairing.
  const edited = rewritten(run, { metrics: { bound: "budget-exhausted" } })
  withManifest(run, edited, () => {
    expect(() => assertVerdictAdmits(readManifest(run.runDir), manifestPath(run))).toThrow(
      /^failing-check: .* records the bound "budget-exhausted" beside the stopping rule Q3/,
    )
  })
})

test("failing-check: a stopping rule the bound does not belong to is refused", () => {
  // THE FIELD BEING PERTURBED IS THE RULE AND THE BOUND IS LEFT AS THE RUN WROTE
  // IT, which is the other half of the same pairing: `Q4` licenses
  // `budget-exhausted`, so a `search-exhausted` beside it is the record
  // disagreeing with itself.
  const edited = rewritten(run, { metrics: { stoppingRule: "Q4" } })
  withManifest(run, edited, () => {
    expect(() => assertVerdictAdmits(readManifest(run.runDir), manifestPath(run))).toThrow(
      /^failing-check: .* records the bound "search-exhausted" beside the stopping rule Q4/,
    )
  })
})

/**
 * **THE ONE FIELD THE GATE CANNOT SEE, MEASURED RATHER THAN ASSUMED.**
 *
 * `assertVerdictAdmits` reads `metrics.outcome` and has no candidate to re-grade
 * it from, so an `outcome` edited to `admissible` WITH the canonical hash
 * recomputed clears the check. `adopt-checks.ts` closed exactly this hole for
 * `metrics.bound` - *"a tamperer recomputes the hash over the values it edited"* -
 * by re-deriving the bound from the rule; the outcome itself has no second
 * source inside the gate.
 *
 * It is asserted as a PASS on purpose. A test that left this undriven would
 * leave the suite consistent with a gate that re-grades the outcome, and the
 * next reader would believe it does. What stands behind it is `G4`: `adoptLayout`
 * runs `make check` on the board as adopted and reverts the copy on a non-zero
 * exit. Recorded as `docs/known-gaps.md` G24.
 */
test("failing-check does NOT see an outcome edited to admissible with the hash recomputed", () => {
  const edited = rewritten(run, { metrics: { outcome: "admissible" } })
  withManifest(run, edited, () => {
    const manifest = readManifest(run.runDir)
    expect(manifest.canonical.metrics.outcome, "the edit read back, hash and all").toBe(
      "admissible",
    )
    expect(() => assertVerdictAdmits(manifest, manifestPath(run))).not.toThrow()
  })
})

test("the producer refuses to record a rule that would carry the adoption", async () => {
  // THE GUARD DRIVEN ON THE STATE THAT MAKES ITS READING OF Q3 UNSAFE. With
  // kappa_bench at 0.3 the materialised board clears A2, the outcome becomes
  // `admissible`, and exitCodeFor(admissible, Q3) is 0 - so CRITERIA G2.5 would
  // admit the board on a rule this run earned over its restart schedule alone.
  // The rules object is the TEST's, built from the committed one: nothing under
  // stripboard/rules.json is touched, and the point is the producer's refusal
  // rather than a verdict about 0.3.
  const loosened = { ...loadRules(), kappaBench: 0.3 }
  await expect(
    materializeRun(
      { boardDir: path.join("boards", BOARD), rules: loosened, stamp: scratchStamp(BOARD, "loose") },
      forkSpawn(),
    ),
  ).rejects.toThrow(/^materialize-run-rule-load-bearing: /)
})

test("the producer refuses a board whose committed layout runs its strips the other way", async () => {
  // A SCRATCH BOARD DIRECTORY, because no board in this repository is a
  // vertical-strip board and the guard would otherwise be a predicate nobody has
  // seen fire. The declaration points at the REAL low-boost circuit module and
  // the layout is the committed one put into vertical strip mode by the fork's
  // own `--set-strips`, so the only thing that differs from the healthy run is
  // the axis `prepare` reads off it.
  const root = freshRoot("vertical-board")
  const boardDir = path.join(root, "boards", BOARD)
  fs.mkdirSync(boardDir, { recursive: true })
  const committed = loadDeclaration(path.join(REPO, "boards", BOARD, "perfboard.json"))
  const flipped = path.join(boardDir, `${BOARD}.perfboard.vrt`)
  const set = forkSpawn()([
    "--set-strips",
    committed.vrtPath,
    "--strips",
    "vertical",
    "-o",
    flipped,
  ])
  expect(set.status, `--set-strips wrote ${flipped}: ${set.stderr}${set.stdout}`).toBe(0)
  fs.writeFileSync(
    path.join(boardDir, "perfboard.json"),
    `${JSON.stringify(
      {
        circuit: path.relative(boardDir, path.join(REPO, "circuits", "pultec", "physical", "low-boost.ts")),
        export: "pultecLowBoost",
        vrt: `${BOARD}.perfboard.vrt`,
      },
      null,
      2,
    )}\n`,
  )
  await expect(
    materializeRun(
      { boardDir, rules: loadRules(), stamp: scratchStamp(BOARD, "vertical") },
      forkSpawn(),
    ),
  ).rejects.toThrow(/^materialize-run-strips-disagree: /)
})
