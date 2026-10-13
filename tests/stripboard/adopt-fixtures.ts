/**
 * One healthy adoption, and one deliberately broken variant per refusal.
 *
 * **NOTHING HERE EVER WRITES UNDER THE REPOSITORY'S OWN `boards/`.** The whole
 * job of the thing under test is writing there, so a test that let it write for
 * real would modify the owner's committed layouts - the one failure this file
 * is built to make impossible. Every scenario's board lives in its own
 * `mkdtemp` directory and the gate's write lands there; `./adopt-witness.ts`'s
 * `digestOf` is what the tests assert over, and `boardsDigest` from
 * `./run-dir-fixtures.ts` is the standing witness that the real tree is
 * untouched.
 *
 * **IT IS TWO FILES FOR THE 500-LINE CEILING**, at the seam the content draws:
 * this one BUILDS a scenario and `./adopt-witness.ts` LOOKS AT what one did.
 * Nothing here inspects an adoption and nothing there assembles one.
 *
 * **EVERY DIRECTORY IT MAKES IS REGISTERED AND REMOVED, and `cleanUpFixtures`
 * is not housekeeping - its absence broke twenty-three tests in nine unrelated
 * files.** `./adopt-scratch.ts` holds that machinery and the measurement.
 *
 * **THE RUN DIRECTORY IS REAL, AND IT HAS TO BE.** `runDirectory` resolves
 * against `moduleRepoRoot()`, and `assertProvenanceChain` checks that the
 * manifest's own stamp reproduces the directory it was read from - so a run
 * directory somewhere else would fail that check for a reason no test here is
 * about. It goes under `build/stripboard/`, which is gitignored, with a stamp
 * unique per scenario, exactly as `./run-dir-fixtures.ts` does.
 *
 * **THE COMMITTED INPUT FILES ARE THE REAL ONES, READ-ONLY.** `stripboard/
 * rules.json`, `lib/kicad/lead-span.ts`, `lib/kicad/pin-pattern.ts` and
 * B1-frozen's four fixtures are hashed as they stand, so the healthy scenario's
 * recorded hashes are the hashes of the files the production gate would read.
 * A scenario that needs a CHANGED one points the dependency at a scratch copy
 * and changes the copy: a test that edited a committed file to drive a refusal
 * would be a test that can leave the repository broken when it fails halfway.
 *
 * **EVERY SCENARIO IS HEALTHY EXCEPT IN ONE RESPECT.** That is what makes the
 * per-refusal tests discriminating rather than coincidental: if two things were
 * wrong at once, a test could pass against whichever check happened to run
 * first and the refusal it names could be dead.
 */
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { freshRoot, freshStamp, registerCreated } from "./adopt-scratch.ts"
import type { AdoptDeps, AdoptInput } from "../../tools/stripboard/adopt-model.ts"
import type { GitRunner } from "../../tools/perfboard/mutate.ts"
import { closureSha256 } from "../../lib/import-closure.ts"
import {
  pinPatternClosureHash,
  spanClosureHash,
} from "../../tools/stripboard/geometry-inputs.ts"
import { RULES_PATH } from "../../tools/stripboard/rules.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import {
  canonicalHash,
  runDirectory,
  writeManifest,
  type CanonicalInputs,
  type CanonicalMetrics,
  type RunManifest,
} from "../../tools/stripboard/run-dir.ts"
import type { Outcome } from "../../tools/stripboard/report-model.ts"

const REPO_ROOT = moduleRepoRoot()
const BOARD = "pultec-low-boost"
const LAYOUT_BASENAME = `${BOARD}.perfboard.vrt`

/** Where the layout lands, relative to a scenario's own root - the happy path's one write. */
export const ADOPTED_RELATIVE_PATH = path.join("boards", BOARD, LAYOUT_BASENAME)

const PIN_COMMIT = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678"
const OTHER_COMMIT = "99887766554433221100ffeeddccbbaa99887766"
const PIPELINE_COMMIT = "0f1e2d3c4b5a69788796a5b4c3d2e1f001234567"

const FROZEN_DIR = path.join(REPO_ROOT, "tests", "fixtures", "stripboard")
const FROZEN_PROVENANCE = path.join(FROZEN_DIR, "provenance.txt")

/** The four files B1-frozen is stated against - `tools/stripboard/adopt-checks.ts`'s own set. */
const FROZEN_FIXTURE_FILES: readonly string[] = [
  `${BOARD}-frozen.vrt`,
  `${BOARD}-frozen.netlist`,
  `${BOARD}-frozen.dump`,
  `${BOARD}-frozen.footprints.json`,
]

function sha256OfFile(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex")
}

/** One adoption, assembled: what the gate is handed and what it reaches through. */
export interface Scenario {
  readonly input: AdoptInput
  readonly deps: AdoptDeps
  /** The scenario's own root. `input.boardDir` is `<root>/boards/<board>`. */
  readonly root: string
}

/** A git runner that reports a clean, tracked tree for every question asked of it. */
const CLEAN_GIT: GitRunner = () => ({ status: 0, stdout: "" })

/**
 * `cleanUpFixtures` is re-exported from here so a test file has ONE fixture
 * import rather than two, and `./adopt-scratch.ts` carries the measurement that
 * made it necessary.
 */
export { cleanUpFixtures } from "./adopt-scratch.ts"

/**
 * A board directory with the two authored sources a declaration names.
 *
 * The circuit module is a stub and is never imported: the gate passes its path
 * to git and to a refusal message and opens it nowhere. Writing a real circuit
 * here would be a fixture claiming to be checked against something it is not.
 */
function makeBoardDir(root: string): string {
  const boardDir = path.join(root, "boards", BOARD)
  fs.mkdirSync(boardDir, { recursive: true })
  fs.writeFileSync(
    path.join(boardDir, "perfboard.json"),
    `${JSON.stringify(
      { circuit: "low-boost.ts", export: "pultecLowBoost", vrt: LAYOUT_BASENAME },
      null,
      2,
    )}\n`,
  )
  fs.writeFileSync(
    path.join(boardDir, "low-boost.ts"),
    "// A stand-in for the circuit module a declaration names. The gate never imports it.\n",
  )
  return boardDir
}

/** The run directory the healthy scenario reads, with the four files a chain needs. */
function makeRunDir(label: string): { readonly runDir: string; readonly candidate: string; readonly stamp: string } {
  const stamp = freshStamp(label)
  const runDir = runDirectory(BOARD, stamp)
  registerCreated(runDir)
  fs.mkdirSync(path.join(runDir, "seed-1"), { recursive: true })
  fs.writeFileSync(path.join(runDir, `${BOARD}.net`), "( { EESchema Netlist Version 1.1 created  1970-01-01T00:00:00 }\n)\n")
  fs.writeFileSync(path.join(runDir, "imported.vrt"), "the --import-placed board every arm starts from\n")
  const candidate = path.join(runDir, "seed-1", "candidate.vrt")
  fs.writeFileSync(candidate, "the candidate this run scored best\n")
  return { runDir, candidate, stamp }
}

function metricsWith(outcome: Outcome, stoppingRule: string): CanonicalMetrics {
  return {
    cuts: 5,
    wires: 0,
    solder: 1,
    objective: 5.25,
    netCount: 9,
    joins: 1,
    occupied: 5,
    clustering: 0.2,
    occupiedArea: 18,
    constraints: { HC1: true, HC2: true },
    ranking: [5, 0, 1, 18, 0.2],
    stoppingRule,
    bound: "at-floor",
    outcome,
    restartBoundaries: [0],
  }
}

function inputsFor(runDir: string, candidate: string): CanonicalInputs {
  return {
    candidateSha256: sha256OfFile(candidate),
    rulesSha256: sha256OfFile(RULES_PATH),
    netlistSha256: sha256OfFile(path.join(runDir, `${BOARD}.net`)),
    // THE REAL CLOSURE HASHES, from the same functions the gate recomputes
    // with. A fixture that recorded a made-up pair here would make the healthy
    // scenario refuse, and a fixture that hashed one file would record a
    // quantity the gate never compares.
    spanClosureSha256: spanClosureHash(),
    pinPatternClosureSha256: pinPatternClosureHash(),
    seeds: [1],
    seed: 1,
    seedArm: "constructed",
    verorouteCommit: PIN_COMMIT,
    builtCommit: PIN_COMMIT,
    pipelineCommit: PIPELINE_COMMIT,
  }
}

function manifestFor(
  runDir: string,
  candidate: string,
  stamp: string,
  outcome: Outcome,
  stoppingRule: string,
): RunManifest {
  const inputs = inputsFor(runDir, candidate)
  const metrics = metricsWith(outcome, stoppingRule)
  return {
    canonical: { inputs, metrics, hash: canonicalHash(inputs, metrics) },
    provenance: {
      stamp,
      startedAt: "2026-10-13T00:00:00.000Z",
      durationMs: 1000,
      host: "fixture-host",
      msPerInvocation: 1,
      invocations: 1000,
      evaluations: 250,
    },
  }
}

function depsFor(root: string): AdoptDeps {
  return {
    repoRoot: REPO_ROOT,
    pinFile: path.join(REPO_ROOT, "veroroute.pin"),
    rulesPath: RULES_PATH,
    spanClosureHash,
    pinPatternClosureHash,
    frozenFixtureDir: FROZEN_DIR,
    frozenProvenanceFile: FROZEN_PROVENANCE,
    // READ NEITHER FROM THE REAL PIN FILE NOR FROM THE REAL BUILD STAMP: both
    // move with the fork, and a fixture keyed to today's commit would fail the
    // day it is bumped for a reason no test here is about.
    readPin: () => ({ repo: "https://example.invalid/veroroute.git", commit: PIN_COMMIT }),
    builtCommit: () => PIN_COMMIT,
    git: CLEAN_GIT,
    // `make check` IS INJECTED, never spawned: the real one builds the fork and
    // runs kicad-cli, and on the scratch board there is no Makefile to run at
    // all. What the production gate does with the real one is `defaultMakeCheck`
    // in tools/stripboard/adopt.ts; what is asserted here is what the gate does
    // with its ANSWER, which is the part a test can hold it to.
    makeCheck: () => ({ status: 0, output: `ok ${path.join(root, "boards", BOARD)}\n` }),
  }
}

/** A scenario that passes every one of the ten checks. */
export function healthyAdoption(label = "healthy"): Scenario {
  const root = freshRoot(label)
  const boardDir = makeBoardDir(root)
  const { runDir, candidate, stamp } = makeRunDir(label)
  writeManifest(runDir, manifestFor(runDir, candidate, stamp, "admissible", "Q1"))
  return {
    root,
    input: { runDir, candidate, boardDir, allowDirty: false },
    deps: depsFor(root),
  }
}

/** A scratch copy of `file` whose bytes differ from it by one appended line. */
function changedCopy(file: string, label: string): string {
  const root = freshRoot(label)
  const copy = path.join(root, path.basename(file))
  fs.writeFileSync(copy, `${fs.readFileSync(file, "utf8")}\n// edited after the run\n`)
  return copy
}

export function withTamperedCandidate(): Scenario {
  const scenario = healthyAdoption("tampered-candidate")
  // THE MANIFEST IS LEFT ALONE AND THE BOARD IS EDITED, which is the real
  // shape: a candidate changed after the run that scored it.
  fs.writeFileSync(scenario.input.candidate, "a board edited after the run that scored it\n")
  return scenario
}

export function withTamperedMetrics(): Scenario {
  const scenario = healthyAdoption("tampered-metrics")
  // WRITTEN RAW, BYPASSING `writeManifest`, because that function refuses a
  // manifest whose recorded hash disagrees with its own blocks - so a file in
  // that state is something that happens to it afterwards, which is exactly
  // what this scenario is.
  const file = path.join(scenario.input.runDir, "run.json")
  const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"))
  if (typeof parsed !== "object" || parsed === null || !("canonical" in parsed)) {
    throw new Error(`withTamperedMetrics: ${file} is not the manifest writeManifest just wrote.`)
  }
  const manifest: RunManifest = manifestFor(
    scenario.input.runDir,
    scenario.input.candidate,
    path.basename(scenario.input.runDir),
    "admissible",
    "Q1",
  )
  const tampered = {
    canonical: {
      inputs: manifest.canonical.inputs,
      // One metric moved, and the RECORDED HASH LEFT AS IT WAS.
      metrics: { ...manifest.canonical.metrics, cuts: manifest.canonical.metrics.cuts - 1 },
      hash: manifest.canonical.hash,
    },
    provenance: manifest.provenance,
  }
  fs.writeFileSync(file, `${JSON.stringify(tampered, null, 2)}\n`)
  return scenario
}

export function withChangedRules(): Scenario {
  const scenario = healthyAdoption("changed-rules")
  return {
    ...scenario,
    deps: { ...scenario.deps, rulesPath: changedCopy(RULES_PATH, "rules") },
  }
}

/**
 * A closure hash standing in for "that closure is not what it was when the run
 * recorded it".
 *
 * **IT IS AN INJECTED FUNCTION AND NOT AN EDITED COPY ON DISK**, and the change
 * of shape is forced rather than chosen: the gate now compares a digest over an
 * IMPORT CLOSURE, and a copy of `lead-span.ts` in a scratch directory cannot
 * resolve its own relative imports, so a copy would make the walker refuse
 * "reaches ... which is not a file" instead of refusing the hash. Editing the
 * real `lib/kicad/lead-span.ts` under a test is not an option either. What the
 * gate must do with a closure that has moved is exactly what it does with a
 * digest that disagrees, and that is what this drives.
 *
 * The one property this shape CANNOT demonstrate - that the closure genuinely
 * covers `lead-span-model.ts` and `pin-pattern-model.ts`, which is the whole
 * reason the hash changed from a file to a closure - is asserted directly
 * against `closureSha256`'s own walk in `./adopt.test.ts`.
 */
const MOVED_CLOSURE = `${"9".repeat(63)}0`

export function withChangedSpanData(): Scenario {
  const scenario = healthyAdoption("changed-span")
  return {
    ...scenario,
    deps: { ...scenario.deps, spanClosureHash: () => MOVED_CLOSURE },
  }
}

export function withChangedPinPatterns(): Scenario {
  const scenario = healthyAdoption("changed-pin-pattern")
  return {
    ...scenario,
    deps: { ...scenario.deps, pinPatternClosureHash: () => MOVED_CLOSURE },
  }
}

/**
 * A closure walk that CANNOT RUN, so the gate's handling of it can be driven.
 *
 * A skipped check must never look like a passing one, and a walk that throws is
 * the one way this check can fail to produce an answer at all - `closureSha256`
 * refuses an import it cannot resolve to a file rather than dropping the edge.
 */
export function withUnwalkableSpanClosure(): Scenario {
  const scenario = healthyAdoption("unwalkable-span")
  return {
    ...scenario,
    deps: {
      ...scenario.deps,
      spanClosureHash: () => closureSha256("lib/kicad/does-not-exist.ts"),
    },
  }
}

export function withChangedFrozenFixture(): Scenario {
  const scenario = healthyAdoption("changed-frozen")
  // THE COMMITTED FIXTURE IS COPIED AND THE COPY IS EDITED. provenance.txt
  // stays the real one, because it is the authority a changed fixture has to
  // fail against - editing both would be the tampering this refusal exists to
  // catch, performed in full.
  const dir = frozenFixtureCopy("frozen")
  const edited = path.join(dir, FROZEN_FIXTURE_FILES[1])
  fs.appendFileSync(edited, "\n; a benchmark edited to be easier\n")
  return { ...scenario, deps: { ...scenario.deps, frozenFixtureDir: dir } }
}

/** A scratch copy of the four frozen fixtures, for a scenario that damages one. */
function frozenFixtureCopy(label: string): string {
  const dir = freshRoot(label)
  for (const basename of FROZEN_FIXTURE_FILES) {
    fs.copyFileSync(path.join(FROZEN_DIR, basename), path.join(dir, basename))
  }
  return dir
}

/**
 * **THE REVIEW'S OWN EXPERIMENT**: one frozen fixture file replaced by the bytes
 * of ANOTHER file `provenance.txt` records.
 *
 * `pultec-low-boost-frozen.dump` gets `pt2399-core.dump`'s bytes. Both hashes
 * are in that file, so the first version of this check - "does this hash appear
 * anywhere in provenance.txt" - PASSED on this scenario, which is the whole of
 * finding F1 in round 1 of the Task 24 review. It is a sharper probe than an
 * edited file: an edit produces a hash the file does not carry at all, and any
 * reading catches that; a swap produces a hash it carries under a different
 * name, and only a reading that keeps the name-to-hash association catches it.
 */
export function withSwappedFrozenFixture(): Scenario {
  const scenario = healthyAdoption("swapped-frozen")
  const dir = frozenFixtureCopy("frozen-swap")
  fs.copyFileSync(
    path.join(FROZEN_DIR, "pt2399-core.dump"),
    path.join(dir, `${BOARD}-frozen.dump`),
  )
  return { ...scenario, deps: { ...scenario.deps, frozenFixtureDir: dir } }
}

/**
 * A `provenance.txt` whose record for one frozen fixture has been severed from
 * its name - the fixture itself untouched.
 *
 * The basename line is renamed, so the hash is still in the file and the
 * association is not. A parser that fell back to the substring search, or that
 * read an unparseable record as agreement, would pass this; the refusal has to
 * name the basename it could not find a record for.
 */
export function withUnrecordedFrozenFixture(): Scenario {
  const scenario = healthyAdoption("unrecorded-frozen")
  const root = freshRoot("provenance")
  const file = path.join(root, "provenance.txt")
  const text = fs.readFileSync(FROZEN_PROVENANCE, "utf8")
  const damaged = text.replace(
    `    ${BOARD}-frozen.dump\n`,
    "    some-other-name-entirely.dump\n",
  )
  if (damaged === text) {
    throw new Error(
      `withUnrecordedFrozenFixture: the record line for ${BOARD}-frozen.dump was not found in ` +
        `${FROZEN_PROVENANCE}, so this fixture would have handed the gate an UNDAMAGED ` +
        "provenance file and the test driving it would have passed vacuously. The record's " +
        "indentation or name has changed; fix this replacement rather than loosening it.",
    )
  }
  fs.writeFileSync(file, damaged)
  return { ...scenario, deps: { ...scenario.deps, frozenProvenanceFile: file } }
}

/**
 * A board whose own sources have moved since the run.
 *
 * The git stub answers `diff --quiet <commit> -- <sources>` with a difference
 * and every other question cleanly, so the chain's last link is the only one
 * that fails - `args[2]` is the commit on that call and `"--"` on
 * `assertLayoutRecoverable`'s, which is what tells the two apart.
 */
export function withStaleSourceBoard(): Scenario {
  const scenario = healthyAdoption("stale-source")
  const git: GitRunner = (args) =>
    args[0] === "diff" && args[2] !== "--" ? { status: 1, stdout: "" } : { status: 0, stdout: "" }
  return { ...scenario, deps: { ...scenario.deps, git } }
}

export function withOtherPin(): Scenario {
  const scenario = healthyAdoption("other-pin")
  return {
    ...scenario,
    deps: {
      ...scenario.deps,
      readPin: () => ({ repo: "https://example.invalid/veroroute.git", commit: OTHER_COMMIT }),
    },
  }
}

export function withOtherBuiltCommit(): Scenario {
  const scenario = healthyAdoption("other-built")
  // The PIN still agrees with the manifest; the STAMP does not. That is D25's
  // disagreement, and it has happened once already.
  return { ...scenario, deps: { ...scenario.deps, builtCommit: () => OTHER_COMMIT } }
}

export function withUnknownBuiltCommit(): Scenario {
  const scenario = healthyAdoption("unknown-built")
  return { ...scenario, deps: { ...scenario.deps, builtCommit: () => undefined } }
}

export function withOutcome(outcome: Outcome): Scenario {
  const scenario = healthyAdoption(`outcome-${outcome}`)
  writeManifest(
    scenario.input.runDir,
    manifestFor(
      scenario.input.runDir,
      scenario.input.candidate,
      path.basename(scenario.input.runDir),
      outcome,
      "Q1",
    ),
  )
  return scenario
}

/** An admissible candidate out of a run that hit `Q5`'s backstop, which `exitCodeFor` fails. */
export function withQ5Backstop(): Scenario {
  const scenario = healthyAdoption("q5")
  writeManifest(
    scenario.input.runDir,
    manifestFor(
      scenario.input.runDir,
      scenario.input.candidate,
      path.basename(scenario.input.runDir),
      "admissible",
      "Q5",
    ),
  )
  return scenario
}

/**
 * A layout git cannot bring back.
 *
 * The stub answers `diff --quiet -- <vrt>` - `assertLayoutRecoverable`'s own
 * call, recognisable by `"--"` in third position - with a difference, and the
 * chain's `diff --quiet <commit> --` cleanly, so `provenance-chain` passes and
 * `uncommitted-layout` is what fires.
 */
export function withDirtyBoard(): Scenario {
  const scenario = healthyAdoption("dirty")
  const git: GitRunner = (args) =>
    args[0] === "diff" && args[2] === "--" ? { status: 1, stdout: "" } : { status: 0, stdout: "" }
  return { ...scenario, deps: { ...scenario.deps, git } }
}

/** Every refusal, as `[label, build, id]` - the list the suite drives and asserts over. */
export const EVERY_REFUSAL: readonly (readonly [string, () => Scenario, string])[] = [
  ["a candidate edited after the run", withTamperedCandidate, "candidate-hash"],
  ["a rules file changed since the run", withChangedRules, "rules-hash"],
  ["changed lead-span data", withChangedSpanData, "span-hash"],
  ["changed pin-pattern data", withChangedPinPatterns, "pin-pattern-hash"],
  ["an edited frozen benchmark", withChangedFrozenFixture, "frozen-fixture-hash"],
  ["a board that moved since the run", withStaleSourceBoard, "provenance-chain"],
  ["a fork commit the pin disagrees with", withOtherPin, "veroroute-commit"],
  ["a built commit the stamp disagrees with", withOtherBuiltCommit, "built-commit"],
  ["a non-admissible verdict", () => withOutcome("invalid"), "failing-check"],
  ["an uncommitted layout", withDirtyBoard, "uncommitted-layout"],
]
