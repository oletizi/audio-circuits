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
 * `CanonicalInputs` and `CanonicalMetrics` carry. `CanonicalMetrics.
 * constraints` is a plain object (`Readonly<Record<string, boolean>>`),
 * which the brief's number/string/array/boolean cases do not cover - so the
 * brief's `mutate`, run on `constraints`, fell through to its own throw, and
 * the metrics loop could not pass AS WRITTEN: it would throw instead of
 * asserting anything (CORRECTED - a prior version of this comment said the
 * opposite, that an unhandled type would make the loop "pass vacuously";
 * measured and found backwards: an unhandled type crashes the loop, it does
 * not let it pass). The fix adds a plain-object branch: flip one key's
 * boolean (or add a key, for an empty or non-boolean-valued object).
 *
 * THE THROW ITSELF GUARDS A DIFFERENT HAZARD, and this is the one worth
 * stating carefully: a `mutate` that fell off the end and implicitly
 * returned `undefined` for an unhandled type - rather than throwing - would
 * let the loop complete and pass. `JSON.stringify` drops `undefined`-valued
 * object keys entirely, so the payload would be missing that key, the
 * computed hash would differ from the unmutated original's for an unrelated
 * reason (a key disappeared, not a value changed), and `.not.toBe(...)`
 * would pass - for the wrong reason, on every run, forever. The explicit
 * throw forecloses that: a type with no branch stops the loop rather than
 * silently producing a payload with a hole in it.
 *
 * KNOWN LIMIT OF THE LOOP, recorded rather than fixed (reviewed and accepted
 * at LOW): `{ ...INPUTS, [key]: mutate(INPUTS[key]) }` computes `changed`'s
 * type from a union-typed key, and TypeScript does not check the computed
 * property's value against that specific field's declared type - so a
 * `mutate` that returned, say, a plain object for every field would still
 * typecheck against `CanonicalInputs` and the loop would still pass, because
 * "this field participates in the hash" only needs a DIFFERENT value, not a
 * same-typed one. Closing this would need a cast (banned) or a per-field
 * typed mutation table; neither is worth it to protect a property the loop
 * does not actually rely on.
 */
import { createHash, randomUUID } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
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
  spanClosureSha256: "d".repeat(64),
  pinPatternClosureSha256: "e".repeat(64),
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
  invocations: 1,
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

/** A fresh, uniquely-stamped run directory under `run-dir-test/`, not yet created on disk. */
function freshRunDir(label: string): string {
  writeCounter += 1
  const stamp = `${label}-${process.pid}-${writeCounter}-${randomUUID()}`
  return runDirectory("run-dir-test", stamp)
}

/** Write `manifest` into a fresh, uniquely-stamped run directory and return its path. */
export function writeInto(manifest: RunManifest): string {
  const dir = freshRunDir("fixture")
  writeManifest(dir, manifest)
  return dir
}

const RAW_BASENAME = "run.json"

/**
 * Write `value` as `run.json` directly into a fresh run directory, bypassing
 * `writeManifest` entirely. `writeManifest` now refuses a manifest whose
 * recorded hash disagrees with its own inputs/metrics (finding 3 of the
 * task-13 review), so a test that needs a FILE carrying a bad hash - to
 * drive `readManifest`'s own self-check, or a third top-level block to prove
 * nothing reads past the two documented ones - can no longer produce one by
 * calling `writeManifest` with bad data. This is also the more honest shape:
 * such damage is something that happens to a file after the writer is done,
 * not something the writer itself ever produces.
 */
export function writeRaw(value: unknown): string {
  const dir = freshRunDir("raw")
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, RAW_BASENAME), JSON.stringify(value, null, 2))
  return dir
}

/** Read `dir`'s `run.json` back as a plain JSON object, with no field-by-field reshaping. */
export function readRawManifestFile(dir: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(fs.readFileSync(path.join(dir, RAW_BASENAME), "utf8"))
  if (!isPlainObject(parsed)) {
    throw new Error(`readRawManifestFile: ${path.join(dir, RAW_BASENAME)} is not a JSON object.`)
  }
  return parsed
}

/**
 * Write `INPUTS`/`METRICS` with the given (possibly partial) provenance,
 * read the manifest back, and return what came back. Used by the test that
 * exercises "no provenance field reaches the hash": two calls with wildly
 * different provenance and the SAME inputs/metrics must come back with the
 * same `canonical.hash`.
 *
 * THE HASH IS RECOMPUTED HERE, NOT TAKEN FROM `FIXTURE_HASH` - on purpose,
 * so both sides of that test's comparison are independently computed calls
 * rather than one module-level constant compared to itself (task-13 review,
 * finding 6). Recomputing it here changes nothing about the VALUE, since
 * `INPUTS`/`METRICS` never vary - what it changes is what the test can
 * actually detect.
 *
 * WHAT ACTUALLY GUARANTEES THE PROPERTY, stated honestly: this function, and
 * the test built on it, DEMONSTRATE that provenance does not reach the hash;
 * neither IS the guarantee. The guarantee is `canonicalHash`'s own
 * signature - `canonicalHash(inputs: CanonicalInputs, metrics:
 * CanonicalMetrics)` takes no provenance parameter, so provenance cannot
 * reach it without a visible change to that signature or a module-level
 * global, either of which review would catch on sight.
 */
export function writeAndRead(provenance: Partial<ExecutionProvenance>): RunManifest {
  const manifest: RunManifest = {
    canonical: { inputs: INPUTS, metrics: METRICS, hash: canonicalHash(INPUTS, METRICS) },
    provenance: { ...DEFAULT_PROVENANCE, ...provenance },
  }
  return readManifest(writeInto(manifest))
}

/**
 * Every regular file under `dir`, recursively, as absolute paths - order not
 * yet settled.
 *
 * REFUSES AN ENTRY THAT IS NEITHER A FILE NOR A DIRECTORY, rather than
 * dropping it silently. `fs.Dirent#isFile()` and `#isDirectory()` are both
 * false for a symlink, a socket or a FIFO, and the review that asked for
 * this digest measured that a symlink under `boards/` fell out of the walk
 * with no sound at all - creating one IS a modification to `boards/`, and a
 * witness that cannot see it would report "unchanged" about a tree that
 * changed, which is exactly the shape this repository's own rule means by "a
 * skipped check must never look like a passing one." There are no symlinks
 * under `boards/` today, so this throws for nobody now and refuses loudly
 * the day it would otherwise have gone quiet.
 */
function walkFiles(dir: string): readonly string[] {
  const files: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkFiles(full))
    } else if (entry.isFile()) {
      files.push(full)
    } else {
      const kind = entry.isSymbolicLink()
        ? "a symlink"
        : "neither a regular file nor a directory"
      throw new Error(
        `walkFiles: ${full} is ${kind}. boardsDigest cannot witness it as written - remove ` +
          "it, or teach walkFiles to handle this entry kind deliberately (for a symlink, " +
          "that might mean hashing its target path rather than following or skipping it) - " +
          "rather than let it drop out of the digest silently, which would make boards/ " +
          "look unchanged when it is not.",
      )
    }
  }
  return files
}

/**
 * A content digest over every file under `boards/` - each file's path
 * (relative to `boards/`) and its raw bytes, in path-sorted order, folded
 * into one sha256.
 *
 * REPLACES `git status --porcelain` AS V7's WITNESS (task-13 fix round 2;
 * the review measured round 1's `toBe(before)` inert, not merely fragile:
 * porcelain prints ` M path` identically whether a file changed once or
 * three times, so when earlier tests in this file already dirty `boards/`
 * before V7 captures `before`, a FOURTH change by the code under test
 * leaves `after` reading identically to `before` and the test passes over
 * real damage). A content digest has none of that blind spot: it is built
 * from what each file actually CONTAINS, not from git's record of whether
 * it differs from HEAD, so a second change to an already-dirty file moves
 * it exactly as a first change would, an addition or deletion moves it
 * through the path set, and it needs no git state at all - a boards/ tree
 * that is clean, dirty, or not inside a git repository in the first place
 * all digest the same way. It still tolerates a PRE-EXISTING dirty tree the
 * way the dropped `toBe("")` assertion could not: an ordinary, in-progress,
 * uncommitted board edit sitting in the tree before a test runs is real
 * bench work (this repository's own stated purpose), and comparing the
 * digest before against the digest after - rather than against some fixed
 * "clean" value - still passes when nothing in THIS run touched `boards/`.
 *
 * Forty-nine files, ~1.1MB as of this writing - negligible to hash on every
 * run.
 *
 * EACH PATH AND EACH CONTENT BLOCK IS PREFIXED WITH ITS OWN BYTE LENGTH
 * (`lengthPrefixed` below), not just separated by a `\0`. A bare separator
 * is ambiguous: one file named `"X"` holding the bytes `path\0Y` digests
 * identically to two files named `"X"` and `"path"` holding `""` and `"Y"` -
 * the NUL in the first file's own content reads, byte for byte, as the
 * separator the second case would also produce. A fixed-width length prefix
 * removes that: the exact byte count of each block is encoded ahead of it,
 * so there is nothing left for a file's own bytes to be mistaken for.
 *
 * WHAT STILL DOES NOT MOVE THIS DIGEST, left open deliberately rather than
 * found later: file MODE (permission bits, the executable bit) is read by
 * neither `fs.Dirent` nor `fs.readFileSync`, so a `chmod` under `boards/`
 * is invisible to `boardsDigest` exactly as it was before this fix. Closing
 * that is not asked for here.
 */
function lengthPrefixed(block: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(block.length, 0)
  return Buffer.concat([length, block])
}

export function boardsDigest(): string {
  const root = path.join(moduleRepoRoot(), "boards")
  const files = [...walkFiles(root)].sort()
  const hash = createHash("sha256")
  for (const file of files) {
    const relativePath = Buffer.from(path.relative(root, file), "utf8")
    const contents = fs.readFileSync(file)
    hash.update(lengthPrefixed(relativePath))
    hash.update(lengthPrefixed(contents))
  }
  return hash.digest("hex")
}
