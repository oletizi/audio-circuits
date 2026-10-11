/**
 * The manifest round trip, its self-check against a tampered hash, and V7's
 * standing repository-safety test.
 *
 * `./run-dir-fixtures.ts` says where `MANIFEST` and the write/read helpers
 * come from. `writeInto` gives every call here its own, uniquely-stamped
 * run directory under `build/stripboard/run-dir-test/`, which is gitignored
 * (`./run-dir-paths.test.ts` proves that property), so nothing this file
 * writes is ever a candidate for `git add`.
 */
import { test, expect } from "bun:test"
import { readManifest } from "../../tools/stripboard/run-dir.ts"
import { MANIFEST, gitPorcelain, writeInto } from "./run-dir-fixtures.ts"

test("a manifest round-trips, and a hash that disagrees with its own block refuses", () => {
  const dir = writeInto(MANIFEST)
  expect(readManifest(dir)).toEqual(MANIFEST)
  const tampered = { ...MANIFEST, canonical: { ...MANIFEST.canonical, hash: "0".repeat(64) } }
  const bad = writeInto(tampered)
  expect(() => readManifest(bad)).toThrow(/hash/)
})

test("V7: writing a scored evaluation into a run directory never modifies boards/", () => {
  // `boards/` is this repository's committed, hand-authored board content -
  // the one tree a run that only reads a candidate to score and record it
  // must never touch. This test has been run against a one-byte edit under
  // `boards/` to confirm it can fail; task-13-report.md carries the real
  // failure text and the revert that followed. Reverted, it is a standing
  // check rather than a one-off.
  const before = gitPorcelain("boards/")
  writeInto(MANIFEST)
  const after = gitPorcelain("boards/")
  expect(after).toBe(before)
  expect(after).toBe("")
})
