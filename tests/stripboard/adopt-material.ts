/**
 * WHAT THE ADOPTION FIXTURES BUILD ON DISK: a scratch board directory, a real run
 * directory with the four files a chain needs, the `CanonicalInputs` /
 * `CanonicalMetrics` / `RunManifest` a healthy run would have written, and the
 * `AdoptDeps` the gate reaches through.
 *
 * **ITS OWN MODULE AT THE SEAM BETWEEN WHAT A HEALTHY RUN LOOKS LIKE AND WHAT A
 * SCENARIO BREAKS ABOUT IT.** `./adopt-fixtures.ts` is the twenty scenarios -
 * the one healthy adoption and nineteen that damage exactly one thing - and this
 * is the material they are all assembled from. It is also what put
 * `adopt-fixtures.ts` back under the 500-line ceiling, which it passed when the
 * closure-hash and bound/rule scenarios landed.
 *
 * **THE BOUND IS PASSED IN AS A LITERAL AND NOT DERIVED FROM THE RULE** - see
 * `metricsWith` below, which carries why that matters now that the gate
 * re-derives `boundFor(stoppingRule)` and refuses a disagreement.
 *
 * **NOTHING UNDER THE REPOSITORY'S OWN `boards/` IS TOUCHED.** Every scenario's
 * board lives under its own `mkdtemp` root, and `./run-scratch.ts` carries the
 * measurement behind registering and removing every directory either file makes.
 */
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { freshStamp, registerCreated } from "./run-scratch.ts"
import type { AdoptDeps } from "../../tools/stripboard/adopt-model.ts"
import { APPROVALS_PATH } from "../../tools/stripboard/approvals.ts"
import type { GitRunner } from "../../tools/perfboard/mutate.ts"
import {
  pinPatternClosureHash,
  spanClosureHash,
} from "../../tools/stripboard/geometry-inputs.ts"
import { RULES_PATH } from "../../tools/stripboard/rules.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import {
  canonicalHash,
  runDirectory,
  type CanonicalInputs,
  type CanonicalMetrics,
  type RunManifest,
} from "../../tools/stripboard/run-dir.ts"
import type { Outcome } from "../../tools/stripboard/report-model.ts"

export const REPO_ROOT = moduleRepoRoot()
export const BOARD = "pultec-low-boost"
export const LAYOUT_BASENAME = `${BOARD}.perfboard.vrt`

export const PIN_COMMIT = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678"
export const OTHER_COMMIT = "99887766554433221100ffeeddccbbaa99887766"
export const PIPELINE_COMMIT = "0f1e2d3c4b5a69788796a5b4c3d2e1f001234567"

export const FROZEN_DIR = path.join(REPO_ROOT, "tests", "fixtures", "stripboard")
export const FROZEN_PROVENANCE = path.join(FROZEN_DIR, "provenance.txt")

/** The four files B1-frozen is stated against - `tools/stripboard/adopt-checks.ts`'s own set. */
export const FROZEN_FIXTURE_FILES: readonly string[] = [
  `${BOARD}-frozen.vrt`,
  `${BOARD}-frozen.netlist`,
  `${BOARD}-frozen.dump`,
  `${BOARD}-frozen.footprints.json`,
]

export function sha256OfFile(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex")
}

/** A git runner that reports a clean, tracked tree for every question asked of it. */
export const CLEAN_GIT: GitRunner = () => ({ status: 0, stdout: "" })

/**
 * A board directory with the two authored sources a declaration names.
 *
 * The circuit module is a stub and is never imported: the gate passes its path
 * to git and to a refusal message and opens it nowhere. Writing a real circuit
 * here would be a fixture claiming to be checked against something it is not.
 */
export function makeBoardDir(root: string): string {
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
export function makeRunDir(label: string): { readonly runDir: string; readonly candidate: string; readonly stamp: string } {
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

/**
 * **THE BOUND IS PASSED IN AS A LITERAL AND NOT DERIVED FROM THE RULE.** The gate
 * now re-derives `boundFor(stoppingRule)` and refuses a manifest where the two
 * disagree, and a fixture that computed its bound with the same `boundFor` the
 * gate compares against would make that check compare a value to itself. So
 * every scenario states the pairing REP4's table states, by hand - and the
 * mismatched-pairing scenario states a wrong one on purpose. (This fixture
 * carried `bound: "at-floor"` beside `stoppingRule: "Q5"` until the check landed,
 * which the check found on its first run: Q5's bound is `budget-exhausted`.)
 */
export function metricsWith(
  outcome: Outcome,
  stoppingRule: string,
  bound: string,
): CanonicalMetrics {
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
    bound,
    outcome,
    restartBoundaries: [0],
  }
}

export function inputsFor(runDir: string, candidate: string): CanonicalInputs {
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

export function manifestFor(
  runDir: string,
  candidate: string,
  stamp: string,
  outcome: Outcome,
  stoppingRule: string,
  bound: string,
): RunManifest {
  const inputs = inputsFor(runDir, candidate)
  const metrics = metricsWith(outcome, stoppingRule, bound)
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

export function depsFor(root: string): AdoptDeps {
  return {
    repoRoot: REPO_ROOT,
    pinFile: path.join(REPO_ROOT, "veroroute.pin"),
    rulesPath: RULES_PATH,
    spanClosureHash,
    pinPatternClosureHash,
    // THE REAL REGISTRY, because every fixture run here records a stopping rule
    // and `assertVerdictAdmits` consults the approvals only for a run that
    // performed no search. A test that needs the other path hands over its own
    // path - `./approvals-fixtures.ts` writes one - rather than this default.
    approvalsPath: APPROVALS_PATH,
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

