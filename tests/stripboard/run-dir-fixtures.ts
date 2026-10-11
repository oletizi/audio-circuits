/**
 * What the run-directory tests are checked against: one `CanonicalInputs`
 * and one `CanonicalMetrics` fixture, `mutate` (the one-field-at-a-time
 * driver), and the small filesystem/git helpers three of the four test
 * files share.
 *
 * ITS OWN MODULE for the reason `./score-fixtures.ts` is: `run-dir.ts`'s
 * tests are one file per check - `run-dir-hash`, `run-dir-paths` and
 * `run-dir-manifest` - and all three need the same `INPUTS`/`METRICS`
 * pair. A copy in each would be three fixtures that could drift, which for
 * a hash whose whole point is to notice drift would be exactly backwards.
 *
 * `mutate` IS THE GUARD AGAINST THE FAILURE THIS PROJECT KEEPS CATCHING.
 * The two per-field loops in `./run-dir-hash.test.ts` only prove anything if
 * `mutate` truly produces a DIFFERENT value of the SAME type for every field
 * `CanonicalInputs` and `CanonicalMetrics` carry - a `mutate` that returned
 * its argument unchanged would make both loops pass vacuously, which is why
 * it throws rather than falls back to that for a type it does not
 * recognise. `CanonicalMetrics.constraints` is a plain object
 * (`Readonly<Record<string, boolean>>`), which the number/string/array/
 * boolean cases do not cover, so it gets its own branch: flip one key's
 * boolean (or add a key, for an empty or non-boolean-valued object) rather
 * than fall through to the throw that would otherwise fire on every run of
 * the metrics loop.
 */
import { randomUUID } from "node:crypto"
import { spawnSync } from "node:child_process"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import {
  canonicalHash,
  readManifest,
  runDirectory,
  writeManifest,
  type CanonicalInputs,
  type CanonicalMetrics,
  type ExecutionProvenance,
  type RunManifest,
} from "../../tools/stripboard/run-dir.ts"

/** A fixture candidate's canonical inputs - forty-byte-looking hex strings, none of them real. */
export const INPUTS: CanonicalInputs = {
  candidateSha256: "a".repeat(64),
  rulesSha256: "b".repeat(64),
  netlistSha256: "c".repeat(64),
  spanDataSha256: "d".repeat(64),
  pinPatternSha256: "e".repeat(64),
  seeds: [1, 2, 3],
  seed: 2,
  seedArm: "constructed",
  verorouteCommit: "f".repeat(40),
  builtCommit: "1".repeat(40),
  pipelineCommit: "0".repeat(40),
}

/** The same candidate's canonical metrics - one of every field type `CanonicalMetrics` carries. */
export const METRICS: CanonicalMetrics = {
  cuts: 5,
  wires: 1,
  solder: 1,
  objective: 6.25,
  netCount: 14,
  joins: 3,
  occupied: 9,
  clustering: 0.2,
  occupiedArea: 18,
  constraints: { floorMet: true, clusterBound: false },
  ranking: [6.25, 7, 8],
  stoppingRule: "Q4",
  bound: "K5",
  outcome: "accepted",
  restartBoundaries: [0, 3, 7],
}

/** `MANIFEST`'s own hash, over `INPUTS`/`METRICS` - computed once, reused by the fixtures below. */
const FIXTURE_HASH = canonicalHash(INPUTS, METRICS)

const DEFAULT_PROVENANCE: ExecutionProvenance = {
  stamp: "fixture-stamp",
  startedAt: "2026-10-11T00:00:00.000Z",
  durationMs: 1,
  host: "fixture-host",
  msPerInvocation: 1,
  evaluations: 1,
}

/** A complete, self-consistent manifest: `hash` genuinely is `canonicalHash(INPUTS, METRICS)`. */
export const MANIFEST: RunManifest = {
  canonical: { inputs: INPUTS, metrics: METRICS, hash: FIXTURE_HASH },
  provenance: DEFAULT_PROVENANCE,
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function kindOf(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (Array.isArray(value)) return "an array"
  return `a ${typeof value}`
}

/**
 * Return a DIFFERENT value of the SAME type - never the argument back,
 * because a `mutate` that did would make every loop that drives it
 * vacuous. Throws for a type it does not handle, rather than guessing one.
 */
export function mutate(value: unknown): unknown {
  if (typeof value === "number") {
    return value + 1
  }
  if (typeof value === "string") {
    return `${value}-mutated`
  }
  if (Array.isArray(value)) {
    return [...value, value.length === 0 ? 0 : value[0]]
  }
  if (typeof value === "boolean") {
    return !value
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value)
    if (keys.length === 0) {
      return { ...value, mutated: true }
    }
    const [firstKey] = keys
    const current = value[firstKey]
    if (typeof current === "boolean") {
      return { ...value, [firstKey]: !current }
    }
    // Every key present but none boolean-valued: add a key rather than guess
    // at flipping something that is not a boolean.
    return { ...value, mutated: true }
  }
  throw new Error(
    `mutate: does not handle ${kindOf(value)}. Extend it with a case for this type rather ` +
      "than fall back to returning the value unchanged, which would make the loop driving " +
      "this call pass vacuously.",
  )
}

let writeCounter = 0

/** Write `manifest` into a fresh, uniquely-stamped run directory and return its path. */
export function writeInto(manifest: RunManifest): string {
  writeCounter += 1
  const stamp = `fixture-${process.pid}-${writeCounter}-${randomUUID()}`
  const dir = runDirectory("run-dir-test", stamp)
  writeManifest(dir, manifest)
  return dir
}

/**
 * Write `INPUTS`/`METRICS` with the given (possibly partial) provenance,
 * read the manifest back, and return what came back. Used by the test that
 * proves provenance never reaches the hash: two calls with wildly different
 * provenance and the SAME inputs/metrics must come back with the same
 * `canonical.hash`.
 */
export function writeAndRead(provenance: Partial<ExecutionProvenance>): RunManifest {
  const manifest: RunManifest = {
    canonical: { inputs: INPUTS, metrics: METRICS, hash: FIXTURE_HASH },
    provenance: { ...DEFAULT_PROVENANCE, ...provenance },
  }
  return readManifest(writeInto(manifest))
}

/** `git status --porcelain <pathspec>`, run from the repository root, raw stdout returned. */
export function gitPorcelain(pathspec: string): string {
  const result = spawnSync("git", ["status", "--porcelain", pathspec], {
    cwd: moduleRepoRoot(),
    encoding: "utf8",
  })
  if (result.status !== 0) {
    throw new Error(
      `git status --porcelain ${pathspec} exited ${result.status}: ${result.stderr ?? ""}`,
    )
  }
  return result.stdout
}
