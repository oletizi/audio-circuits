/**
 * The manifest round trip, its self-check against a tampered file,
 * `writeManifest`'s own refusal of a self-inconsistent manifest, the
 * exactly-two-top-level-blocks guarantee, and V7's standing
 * repository-safety test.
 *
 * `./run-dir-fixtures.ts` says where `MANIFEST` and the write/read/raw
 * helpers come from. `writeInto` and `writeRaw` each give their call its
 * own, uniquely-stamped run directory under `build/stripboard/
 * run-dir-test/`, which is gitignored (`./run-dir-paths.test.ts` proves
 * that property), so nothing this file writes is ever a candidate for
 * `git add`.
 */
import { test, expect } from "bun:test"
import { readManifest } from "../../tools/stripboard/run-dir.ts"
import { MANIFEST, gitPorcelain, readRawManifestFile, writeInto, writeRaw } from "./run-dir-fixtures.ts"

test("a manifest round-trips, and a hash that disagrees with its own block refuses", () => {
  const dir = writeInto(MANIFEST)
  expect(readManifest(dir)).toEqual(MANIFEST)

  // A disagreeing hash is damage that happens to a file AFTER the writer is
  // done - writeManifest itself now refuses to write one (the test right
  // below this one) - so the tampered file is produced with `writeRaw`,
  // bypassing `writeManifest` entirely, rather than through `writeInto`.
  const tampered = { ...MANIFEST, canonical: { ...MANIFEST.canonical, hash: "0".repeat(64) } }
  const bad = writeRaw(tampered)
  expect(() => readManifest(bad)).toThrow(/hash/)
})

test("writeManifest refuses a manifest whose recorded hash disagrees with its own inputs/metrics", () => {
  // task-13 review, finding 3: detection used to be deferred entirely to
  // readManifest, which could be a different process or a different task,
  // long after the run that produced the bad file has finished. The writer
  // holds both the inputs and the claimed hash, so it refuses before
  // anything reaches disk.
  const tampered = { ...MANIFEST, canonical: { ...MANIFEST.canonical, hash: "0".repeat(64) } }
  expect(() => writeInto(tampered)).toThrow(/hash/)
})

test("writeManifest writes exactly two top-level blocks: canonical and provenance", () => {
  // task-13 review, finding 1: the brief's Step 3 states this as a
  // requirement in prose, and nothing checked it - readManifest reconstructs
  // its return value field by field and would silently ignore a third block,
  // so `toEqual(MANIFEST)` above cannot see one either. This reads run.json
  // raw, bypassing readManifest's own reshaping, specifically so a third
  // block has somewhere to be caught.
  const dir = writeInto(MANIFEST)
  const raw = readRawManifestFile(dir)
  expect(Object.keys(raw).sort()).toEqual(["canonical", "provenance"])
})

test("V7: writing a scored evaluation into a run directory never modifies boards/", () => {
  // `boards/` is this repository's committed, hand-authored board content -
  // the one tree a run that only reads a candidate to score and record it
  // must never touch.
  //
  // THE ASSERTION THAT CARRIES THIS TEST IS before/after EQUALITY, not
  // emptiness (task-13 review, finding 4): this repository's own stated
  // purpose is that boards are revised on a bench, so an ordinary,
  // in-progress, uncommitted board edit sitting in the tree when this test
  // runs is real work, not a defect, and asserting `after === ""` would fail
  // the test for a reason that has nothing to do with the code under test.
  // `after === before` tolerates a dirty tree and still catches the one
  // thing this test exists to catch: THIS CODE adding to what was already
  // there. task-13-report.md's second appendix carries the real failure
  // text from re-running the break against this exact assertion, with the
  // break living in the code under test rather than as a hand-edit made
  // before the test runs (the distinction finding 4 raised).
  const before = gitPorcelain("boards/")
  writeInto(MANIFEST)
  const after = gitPorcelain("boards/")
  expect(after).toBe(before)
})
