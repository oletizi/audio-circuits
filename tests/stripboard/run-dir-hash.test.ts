/**
 * `canonicalHash`: equal inputs hash equal, every field moves the hash when
 * it changes, provenance never does, and an empty `builtCommit` refuses.
 *
 * `./run-dir-fixtures.ts` says where `INPUTS`, `METRICS` and `mutate` come
 * from. The run directory's path and the gitignore property live in
 * `./run-dir-paths.test.ts`; the manifest round trip and the repository
 * safety check live in `./run-dir-manifest.test.ts`.
 *
 * NONE OF THESE ASSERTIONS RE-IMPLEMENT THE FUNCTION UNDER TEST. Each is a
 * PROPERTY: same in, same out; one field different, different out; no
 * provenance field moves it at all. `canonicalHash(I, M)).toBe(sha256(
 * JSON.stringify(sortKeys(I, M))))` would pass however wrong both sides
 * agreed to be, which is the shape Tasks 3, 4, 5, 11 and 12 each shipped
 * once.
 */
import { test, expect } from "bun:test"
import { canonicalHash } from "../../tools/stripboard/run-dir.ts"
import { INPUTS, METRICS, mutate, writeAndRead } from "./run-dir-fixtures.ts"

test("the same inputs and metrics hash the same, and a changed input changes the hash", () => {
  expect(canonicalHash(INPUTS, METRICS)).toBe(canonicalHash(INPUTS, METRICS))
  expect(canonicalHash({ ...INPUTS, seed: INPUTS.seed + 1 }, METRICS))
    .not.toBe(canonicalHash(INPUTS, METRICS))
  expect(canonicalHash(INPUTS, { ...METRICS, cuts: METRICS.cuts + 1 }))
    .not.toBe(canonicalHash(INPUTS, METRICS))
})

test("every canonical input is in the hash, one field at a time", () => {
  // An unenumerated subset is one somebody can quietly shrink when a
  // comparison fails, so each field is varied and the hash must move.
  for (const key of Object.keys(INPUTS) as (keyof typeof INPUTS)[]) {
    const changed = { ...INPUTS, [key]: mutate(INPUTS[key]) }
    expect(canonicalHash(changed, METRICS), key).not.toBe(canonicalHash(INPUTS, METRICS))
  }
})

test("every canonical metric is in the hash, one field at a time", () => {
  for (const key of Object.keys(METRICS) as (keyof typeof METRICS)[]) {
    const changed = { ...METRICS, [key]: mutate(METRICS[key]) }
    expect(canonicalHash(INPUTS, changed), key).not.toBe(canonicalHash(INPUTS, METRICS))
  }
})

test("no provenance field reaches the hash", () => {
  // Determinism is not reproducibility of timing. A run that produces the
  // same canonical hash in twice the machine time has reproduced.
  const first = writeAndRead({ stamp: "a", durationMs: 1, host: "x", msPerInvocation: 11.7 })
  const second = writeAndRead({ stamp: "b", durationMs: 9999, host: "y", msPerInvocation: 3 })
  expect(first.canonical.hash).toBe(second.canonical.hash)
})

test("an unknown built commit is recorded as unknown and never as agreement", () => {
  // acquire.ts's own rule: builtCommit() returns undefined for an unknown
  // build, which callers must treat as "not the pinned commit".
  expect(() => canonicalHash({ ...INPUTS, builtCommit: "" }, METRICS)).toThrow(/built/)
})

test("mutate throws for a type it does not handle, rather than returning it unchanged", () => {
  // Found while extending `mutate` for `CanonicalMetrics.constraints` (a
  // plain object): the number/string/array/boolean cases do not cover a
  // plain object, and if `mutate` had fallen back to "return the value
  // unchanged" instead of adding a case for it, the metrics loop above
  // would have passed vacuously on `constraints` every run.
  expect(() => mutate(null)).toThrow()
})
