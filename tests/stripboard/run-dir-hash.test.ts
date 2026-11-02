/**
 * `canonicalHash`: equal inputs hash equal, every field moves the hash when
 * it changes, provenance never does, and a blank identifying field refuses.
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
import { afterAll, test, expect } from "bun:test"
import { canonicalHash } from "../../tools/stripboard/run-dir.ts"
import {
  INPUTS,
  METRICS,
  ORDERING_INPUTS,
  mutate,
  writeAndRead,
} from "./run-dir-fixtures.ts"
import type { CanonicalInputs } from "../../tools/stripboard/run-dir.ts"
import { cleanUpFixtures } from "./run-scratch.ts"

// EVERY RUN DIRECTORY THIS FILE MADE IS REMOVED. `./run-scratch.ts` carries why
// that is not housekeeping: the same growth, further along, made the veroroute
// spawn return exit 0 with empty stdout and failed twenty-three tests in nine
// unrelated files.
afterAll(cleanUpFixtures)


test("the same inputs and metrics hash the same, and a changed input changes the hash", () => {
  expect(canonicalHash(INPUTS, METRICS)).toBe(canonicalHash(INPUTS, METRICS))
  expect(canonicalHash({ ...INPUTS, seed: 99 }, METRICS))
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

test("every canonical input is in the hash on the ordering side of the either/or too", () => {
  // `ordering` is absent from INPUTS - the two are an either/or - so the loop
  // above cannot reach it. This one walks the fixture that carries it, which is
  // also where `ordering` itself gets varied.
  for (const key of Object.keys(ORDERING_INPUTS) as (keyof typeof ORDERING_INPUTS)[]) {
    const changed = { ...ORDERING_INPUTS, [key]: mutate(ORDERING_INPUTS[key]) }
    expect(canonicalHash(changed, METRICS), key)
      .not.toBe(canonicalHash(ORDERING_INPUTS, METRICS))
  }
  // AND THE TWO SIDES ARE NOT THE SAME RECORD. A board built from
  // `part-walk s1` and one built from `rcm s2` must not hash alike just
  // because the field naming them changed shape.
  expect(canonicalHash(ORDERING_INPUTS, METRICS)).not.toBe(canonicalHash(INPUTS, METRICS))
})

test("the restart is stated exactly once: both is refused and neither is refused", () => {
  // THE GUARD THESE TWO DRIVE IS WHY A MATERIALISED BOARD IS REPRODUCIBLE AT
  // ALL. `tools/stripboard/materialize-run.ts` varies orderings, not seeds, and
  // one of the orderings a committed Pultec board is built from - `part-walk s1`
  // - has no seed anywhere in it. A record admitting both fields could say
  // `seed: 0` beside it, and `rcm s0` is an ordering that REFUSES on that same
  // board, so the number would not merely be vague; it would name an
  // arrangement that cannot have produced the candidate it sits next to.
  const both = canonicalHashRefusal({ ...INPUTS, ordering: "part-walk s1" })
  expect(both).toContain("restart-stated-twice")
  expect(both).toContain("part-walk s1")
  const { seed: _seed, ...neither } = INPUTS
  const message = canonicalHashRefusal(neither)
  expect(message).toContain("restart-not-stated")
  expect(message, "it says why seed 0 is not a default").toContain("pultec-low-cut")
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
  //
  // THIS TEST DEMONSTRATES THE PROPERTY; IT IS NOT WHAT SECURES IT.
  // `writeAndRead` computes its hash with `canonicalHash(INPUTS, METRICS)`
  // on each call (task-13 review, finding 6: a prior version wrote a
  // module-level constant into both manifests, so this assertion compared
  // that constant to itself and could fail only via readManifest's own
  // recompute, not via provenance actually reaching anything). The real
  // guarantee is `canonicalHash`'s signature: it takes `inputs` and
  // `metrics` and no provenance parameter, so provenance cannot reach it
  // without a visible change to that signature.
  const first = writeAndRead({ stamp: "a", durationMs: 1, host: "x", msPerInvocation: 11.7 })
  const second = writeAndRead({ stamp: "b", durationMs: 9999, host: "y", msPerInvocation: 3 })
  expect(first.canonical.hash).toBe(second.canonical.hash)
})

test("an unknown built commit is recorded as unknown and never as agreement", () => {
  // acquire.ts's own rule: builtCommit() returns undefined for an unknown
  // build, which callers must treat as "not the pinned commit".
  expect(() => canonicalHash({ ...INPUTS, builtCommit: "" }, METRICS)).toThrow(/built/)
})

/** `canonicalHash`'s refusal message for one `CanonicalInputs`, or `""` if it did not refuse. */
function canonicalHashRefusal(inputs: CanonicalInputs): string {
  try {
    canonicalHash(inputs, METRICS)
    return ""
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

/** `canonicalHash`'s refusal message for `{ ...INPUTS, [field]: value }`, or `""` if it did not refuse. */
function blankFieldRefusal(field: string, value: string): string {
  try {
    canonicalHash({ ...INPUTS, [field]: value }, METRICS)
    return ""
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

const IDENTIFYING_FIELDS = [
  "candidateSha256",
  "rulesSha256",
  "netlistSha256",
  "spanClosureSha256",
  "pinPatternClosureSha256",
  "verorouteCommit",
  "pipelineCommit",
] as const

test("every identifying string field refuses empty, not only builtCommit", () => {
  // task-13 review, finding 8: a blank candidateSha256, rulesSha256,
  // netlistSha256, spanClosureSha256, pinPatternClosureSha256, verorouteCommit or
  // pipelineCommit records a provenance claim that says nothing, exactly as
  // a blank builtCommit does, and a caller can write `?? ""` to any of them.
  for (const field of IDENTIFYING_FIELDS) {
    const message = blankFieldRefusal(field, "")
    expect(message, field).toContain(field)
    expect(message, field).toContain("blank")
  }
})

test("whitespace-only is blank too, not a second spelling of a real value", () => {
  // task-13 review round 2: `""` was refused but `" "` was accepted - the
  // check was `=== ""` rather than "contains no non-whitespace". Driven
  // over builtCommit and one sibling field; not a sentinel-word blacklist
  // (that duty belongs to the caller, per the coordinator's ruling on this
  // finding) - just the same blank check `""` gets, extended to whitespace.
  expect(() => canonicalHash({ ...INPUTS, builtCommit: "   " }, METRICS)).toThrow(/blank/)
  const message = blankFieldRefusal("candidateSha256", "\t\n ")
  expect(message).toContain("candidateSha256")
  expect(message).toContain("blank")
})

test("mutate throws for a type it does not handle, rather than returning it unchanged", () => {
  // Found while extending `mutate` for `CanonicalMetrics.constraints` (a
  // plain object): the brief's number/string/array/boolean cases do not
  // cover a plain object, and without this branch `mutate` would fall
  // through to its own throw on `constraints` - so the metrics loop above
  // could not have passed AS WRITTEN; it would have thrown instead of
  // asserting anything. (CORRECTED - a prior version of this comment said
  // the opposite, that the unhandled case would make the loop "pass
  // vacuously on constraints every run"; measured and found backwards,
  // see ./run-dir-fixtures.ts's module doc for the real hazard the throw
  // guards against.)
  expect(() => mutate(null)).toThrow()
})
