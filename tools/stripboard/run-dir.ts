/**
 * The run directory, the canonical hash over enumerated inputs and metrics,
 * and the manifest that records both.
 *
 * WHY THIS EXISTS: the pipeline searches for a stripboard layout across
 * seeds and restarts, and a run has to be able to PROVE it produced a given
 * board rather than merely claim it. `canonicalHash` is that proof's
 * fingerprint - a hash over exactly the facts that determine a run's
 * result - and `RunManifest` is where a run records it beside the facts
 * themselves, so a reader (or Task 24's adoption gate) can recompute the
 * hash from the recorded facts and refuse a manifest that disagrees with
 * itself.
 *
 * THE CANONICAL BLOCK AND PROVENANCE ARE TWO DIFFERENT CLAIMS, and the
 * manifest keeps them in two different top-level keys rather than one flat
 * object so neither can leak into the other by accident. `canonical`
 * (`inputs` + `metrics` + `hash`) is what makes two runs comparable: hold
 * the same board, rules, netlist, seed and search outcome, and two runs
 * agree bit-for-bit. `provenance` is what makes one run auditable: when it
 * ran, how long it took, on what host - none of which bears on whether the
 * run reproduced. Task 24's adoption gate compares the `canonical` block
 * only, and a manifest that mixed the two would make the gate fail on the
 * clock rather than on the result.
 *
 * WHERE THE FIELDS COME FROM, so nothing here looks invented:
 *   - `candidateSha256`, `netlistSha256`, `spanDataSha256` and
 *     `pinPatternSha256` identify the candidate board, the netlist it is
 *     checked against, and the two derived inputs the search works from -
 *     each a hash of a file, not the file's path, because a path says where
 *     something currently lives and a hash says what it IS.
 *   - `rulesSha256` is the hash of the one committed rules file
 *     `tools/stripboard/rules.ts`'s `RULES_PATH` names (Task 10) - this
 *     module does not read that file itself; it only hashes whatever
 *     content a caller read from it, which is what keeps `canonicalHash`
 *     a pure function of its two arguments.
 *   - `verorouteCommit` is the commit `tools/perfboard/acquire.ts`'s
 *     `readPin` found pinned, and `builtCommit` is the commit the binary
 *     that actually ran was built from, from that module's own
 *     `builtCommit()`. The two are allowed to disagree - a stale local
 *     build is a real state, not a bug - which is exactly why both are
 *     canonical: a hash that recorded only the pin would call a stale
 *     build "the pinned run."
 *   - `builtCommit()` returns `string | undefined` for a build it cannot
 *     identify, and `CanonicalInputs.builtCommit` is a required `string` on
 *     purpose: the caller holding `undefined` must decide what an unknown
 *     build means rather than let it reach this module silently. The one
 *     spelling of "unknown" this module accepts from a caller who still
 *     writes `?? ""` is refused outright, below - an unknown build is never
 *     recorded as agreement with the pin.
 *   - `seedArm` is in the canonical inputs, not the provenance, because two
 *     restart arms that happened to hash alike would make Task 16's
 *     comparison between them indistinguishable in the record, which is the
 *     one thing this hash exists to prevent.
 */
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { SEED_ARMS, type SeedArm } from "./seed.ts"

/**
 * Every fact that determines a run's RESULT, and nothing that only
 * describes its execution. `canonicalHash` hashes exactly this object plus
 * `CanonicalMetrics` - no third field, no fewer.
 */
export interface CanonicalInputs {
  readonly candidateSha256: string
  readonly rulesSha256: string
  readonly netlistSha256: string
  readonly spanDataSha256: string
  readonly pinPatternSha256: string
  readonly seeds: readonly number[]
  readonly seed: number
  readonly seedArm: SeedArm
  readonly verorouteCommit: string
  readonly builtCommit: string
  readonly pipelineCommit: string
}

/**
 * Every number and verdict the search produced for one candidate. `ranking`
 * and `restartBoundaries` are arrays because they describe a SEQUENCE across
 * the run (successive candidates' objectives, and where each restart began),
 * not one candidate's score.
 */
export interface CanonicalMetrics {
  readonly cuts: number
  readonly wires: number
  readonly solder: number
  readonly objective: number
  readonly netCount: number
  readonly joins: number
  readonly occupied: number
  readonly clustering: number
  readonly occupiedArea: number
  readonly constraints: Readonly<Record<string, boolean>>
  readonly ranking: readonly number[]
  readonly stoppingRule: string
  readonly bound: string
  readonly outcome: string
  readonly restartBoundaries: readonly number[]
}

/**
 * What describes the run's EXECUTION rather than its result - timing and
 * the machine it ran on. None of this is in `canonicalHash`: a run that
 * reproduces in twice the machine time has still reproduced, and determinism
 * is not reproducibility of timing.
 */
export interface ExecutionProvenance {
  readonly stamp: string
  readonly startedAt: string
  readonly durationMs: number
  readonly host: string
  readonly msPerInvocation: number
  readonly evaluations: number
}

/** The two blocks a run directory's `run.json` carries, and no third. */
export interface RunManifest {
  readonly canonical: {
    readonly inputs: CanonicalInputs
    readonly metrics: CanonicalMetrics
    readonly hash: string
  }
  readonly provenance: ExecutionProvenance
}

const MANIFEST_BASENAME = "run.json"

/** What a value is, for a refusal that has to name it - `rules.ts`'s `kindOf`, same shape. */
function kindOf(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (Array.isArray(value)) return "an array"
  return `a ${typeof value}`
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Sort every object's keys, recursively, leaving array ORDER untouched.
 * `JSON.stringify` serialises object keys in insertion order, which is a
 * property of how a value was BUILT, not of what it says - two equal
 * `CanonicalInputs` built field-by-field in a different order would then
 * hash differently, which would make the hash a fact about code style
 * rather than about the run. Arrays are never reordered: `ranking` and
 * `restartBoundaries` are sequences, and `seeds`' order is PIPELINE E2's
 * restart schedule, so sorting either would hash away the fact it records.
 */
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep)
  }
  if (isPlainObject(value)) {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeysDeep(value[key])
    }
    return sorted
  }
  return value
}

/**
 * Every `CanonicalInputs` string field that identifies something - a hash or
 * a commit - rather than describing it. All eight are refused blank, for the
 * same reason `builtCommit` alone used to be: a blank value here is never an
 * accident of "not yet known" written honestly, because this type has no
 * such spelling - it is either a caller papering over a value it does not
 * have with `?? ""`, and that caller can do it to any of the eight with the
 * same consequence, a run recording agreement with the world that it does
 * not have.
 */
type StringInputField =
  | "candidateSha256"
  | "rulesSha256"
  | "netlistSha256"
  | "spanDataSha256"
  | "pinPatternSha256"
  | "verorouteCommit"
  | "builtCommit"
  | "pipelineCommit"

const REQUIRED_NONEMPTY_INPUT_FIELDS: readonly StringInputField[] = [
  "candidateSha256",
  "rulesSha256",
  "netlistSha256",
  "spanDataSha256",
  "pinPatternSha256",
  "verorouteCommit",
  "builtCommit",
  "pipelineCommit",
]

/**
 * Whether a required identifying field's value is blank - the empty string,
 * or nothing but whitespace. `""` alone used to be the check (task-13 review
 * finding 8: `" "` passed it), and whitespace is not a second spelling of
 * "unknown" this module invents a meaning for - it is refused for the same
 * reason `""` is, because it is not a real hash or commit either.
 */
function isBlank(value: string): boolean {
  return value.trim() === ""
}

/** The refusal for one blank required field - `builtCommit` keeps its fuller, named reason. */
function blankInputFieldRefusal(field: StringInputField): string {
  if (field === "builtCommit") {
    return (
      "canonicalHash: builtCommit is blank (empty or all whitespace). " +
      "tools/perfboard/acquire.ts's builtCommit() returns undefined for a build it cannot " +
      "identify, and an unknown build is never the pinned commit - that is acquire.ts's own " +
      "rule. Hashing a blank value would record an unresolved build as if it agreed with " +
      "verorouteCommit; resolve what was actually built, or carry the unresolved state some " +
      "other way than a blank string. This module does not accept a sentinel word (such as " +
      '"unknown") as an alternative spelling either - resolving what actually happened is the ' +
      "caller's duty, not a word this hash can stand in for."
    )
  }
  return (
    `canonicalHash: ${field} is blank (empty or all whitespace). It is not defaulted: this ` +
    "field identifies something - a hash or a commit - and a blank value records a " +
    "provenance claim that says nothing, which is the same hazard builtCommit's own refusal " +
    `exists for. Compute the real value ${field} is supposed to carry, or carry "not yet ` +
    'known" some other way than a blank string.'
  )
}

/**
 * Hash exactly `{ inputs, metrics }`, keys sorted, nothing else admitted.
 *
 * Refuses any of `CanonicalInputs`' eight identifying string fields when it
 * is blank - empty, or nothing but whitespace - rather than hashing it. See
 * `REQUIRED_NONEMPTY_INPUT_FIELDS` above for why all eight, not just
 * `builtCommit`.
 */
export function canonicalHash(inputs: CanonicalInputs, metrics: CanonicalMetrics): string {
  for (const field of REQUIRED_NONEMPTY_INPUT_FIELDS) {
    if (isBlank(inputs[field])) {
      throw new Error(blankInputFieldRefusal(field))
    }
  }
  const payload = JSON.stringify(sortKeysDeep({ inputs, metrics }))
  return createHash("sha256").update(payload, "utf8").digest("hex")
}

/** `build/stripboard/<board>/<stamp>/` under this repository's root. */
export function runDirectory(board: string, stamp: string): string {
  return path.join(moduleRepoRoot(), "build", "stripboard", board, stamp)
}

/**
 * Write `run.json` into `dir`, creating it if absent, holding exactly the
 * manifest's two top-level blocks - `canonical` and `provenance` - and
 * nothing a later reader has to reconcile against a third source.
 *
 * REFUSES A SELF-INCONSISTENT MANIFEST RATHER THAN WRITING IT. The caller
 * hands over both `inputs`/`metrics` and the hash it claims those hash to;
 * this function is in a position to check that claim before anything
 * reaches disk, and "refuse rather than guess" means it does - a bad hash
 * written here would otherwise sit undetected until some later reader
 * called `readManifest`, in a different process, a different task, or
 * Task 24's gate, long after the run that produced it has finished and the
 * chance to diagnose it has gone. Failing at the write is failing where the
 * fault is.
 */
export function writeManifest(dir: string, manifest: RunManifest): void {
  const expected = canonicalHash(manifest.canonical.inputs, manifest.canonical.metrics)
  if (manifest.canonical.hash !== expected) {
    throw new Error(
      `writeManifest: the manifest's recorded hash ${manifest.canonical.hash} disagrees with ` +
        `${expected}, computed from this same call's own inputs and metrics. A manifest is ` +
        "never written in a state that disagrees with itself; recompute the hash with " +
        "canonicalHash(inputs, metrics) rather than supplying one by hand.",
    )
  }
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, MANIFEST_BASENAME)
  fs.writeFileSync(file, `${JSON.stringify({ canonical: manifest.canonical, provenance: manifest.provenance }, null, 2)}\n`)
}

function requireRecord(value: unknown, key: string, file: string): Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw new Error(`${file}: "${key}" must be a JSON object, got ${kindOf(value)}.`)
  }
  return value
}

function requireField(record: Record<string, unknown>, key: string, file: string): unknown {
  if (!(key in record)) {
    throw new Error(`${file}: "${key}" is missing from the recorded manifest.`)
  }
  return record[key]
}

function requireString(value: unknown, key: string, file: string): string {
  if (typeof value !== "string") {
    throw new Error(`${file}: "${key}" must be a string, got ${kindOf(value)}.`)
  }
  return value
}

function requireNumber(value: unknown, key: string, file: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${file}: "${key}" must be a finite number, got ${kindOf(value)}.`)
  }
  return value
}

function requireNumberArray(value: unknown, key: string, file: string): readonly number[] {
  if (!Array.isArray(value)) {
    throw new Error(`${file}: "${key}" must be an array of numbers, got ${kindOf(value)}.`)
  }
  return value.map((entry, index) => requireNumber(entry, `${key}[${index}]`, file))
}

function requireBooleanRecord(
  value: unknown,
  key: string,
  file: string,
): Readonly<Record<string, boolean>> {
  const record = requireRecord(value, key, file)
  const result: Record<string, boolean> = {}
  for (const entryKey of Object.keys(record)) {
    const entryValue = record[entryKey]
    if (typeof entryValue !== "boolean") {
      throw new Error(
        `${file}: "${key}.${entryKey}" must be a boolean, got ${kindOf(entryValue)}.`,
      )
    }
    result[entryKey] = entryValue
  }
  return result
}

function requireSeedArm(value: unknown, key: string, file: string): SeedArm {
  const candidate = requireString(value, key, file)
  const found = SEED_ARMS.find((arm) => arm === candidate)
  if (found === undefined) {
    throw new Error(
      `${file}: "${key}" must be one of ${SEED_ARMS.join(", ")}, got ${JSON.stringify(candidate)}.`,
    )
  }
  return found
}

/** Read `parsed` into a `CanonicalInputs`, field by field, refusing by name rather than guessing. */
function toCanonicalInputs(value: unknown, file: string): CanonicalInputs {
  const record = requireRecord(value, "canonical.inputs", file)
  return {
    candidateSha256: requireString(requireField(record, "candidateSha256", file), "candidateSha256", file),
    rulesSha256: requireString(requireField(record, "rulesSha256", file), "rulesSha256", file),
    netlistSha256: requireString(requireField(record, "netlistSha256", file), "netlistSha256", file),
    spanDataSha256: requireString(requireField(record, "spanDataSha256", file), "spanDataSha256", file),
    pinPatternSha256: requireString(requireField(record, "pinPatternSha256", file), "pinPatternSha256", file),
    seeds: requireNumberArray(requireField(record, "seeds", file), "seeds", file),
    seed: requireNumber(requireField(record, "seed", file), "seed", file),
    seedArm: requireSeedArm(requireField(record, "seedArm", file), "seedArm", file),
    verorouteCommit: requireString(requireField(record, "verorouteCommit", file), "verorouteCommit", file),
    builtCommit: requireString(requireField(record, "builtCommit", file), "builtCommit", file),
    pipelineCommit: requireString(requireField(record, "pipelineCommit", file), "pipelineCommit", file),
  }
}

/** Read `parsed` into a `CanonicalMetrics`, field by field. */
function toCanonicalMetrics(value: unknown, file: string): CanonicalMetrics {
  const record = requireRecord(value, "canonical.metrics", file)
  return {
    cuts: requireNumber(requireField(record, "cuts", file), "cuts", file),
    wires: requireNumber(requireField(record, "wires", file), "wires", file),
    solder: requireNumber(requireField(record, "solder", file), "solder", file),
    objective: requireNumber(requireField(record, "objective", file), "objective", file),
    netCount: requireNumber(requireField(record, "netCount", file), "netCount", file),
    joins: requireNumber(requireField(record, "joins", file), "joins", file),
    occupied: requireNumber(requireField(record, "occupied", file), "occupied", file),
    clustering: requireNumber(requireField(record, "clustering", file), "clustering", file),
    occupiedArea: requireNumber(requireField(record, "occupiedArea", file), "occupiedArea", file),
    constraints: requireBooleanRecord(requireField(record, "constraints", file), "constraints", file),
    ranking: requireNumberArray(requireField(record, "ranking", file), "ranking", file),
    stoppingRule: requireString(requireField(record, "stoppingRule", file), "stoppingRule", file),
    bound: requireString(requireField(record, "bound", file), "bound", file),
    outcome: requireString(requireField(record, "outcome", file), "outcome", file),
    restartBoundaries: requireNumberArray(
      requireField(record, "restartBoundaries", file),
      "restartBoundaries",
      file,
    ),
  }
}

/** Read `parsed` into an `ExecutionProvenance`, field by field. */
function toExecutionProvenance(value: unknown, file: string): ExecutionProvenance {
  const record = requireRecord(value, "provenance", file)
  return {
    stamp: requireString(requireField(record, "stamp", file), "stamp", file),
    startedAt: requireString(requireField(record, "startedAt", file), "startedAt", file),
    durationMs: requireNumber(requireField(record, "durationMs", file), "durationMs", file),
    host: requireString(requireField(record, "host", file), "host", file),
    msPerInvocation: requireNumber(requireField(record, "msPerInvocation", file), "msPerInvocation", file),
    evaluations: requireNumber(requireField(record, "evaluations", file), "evaluations", file),
  }
}

/**
 * Read `run.json` out of `dir`, refusing a manifest whose recorded hash
 * disagrees with the hash recomputed from its own `inputs` and `metrics`.
 *
 * That disagreement is not a formatting nitpick: it means either the file
 * was edited after being written, or it was written by a version of this
 * module that hashed something else - either way, the one proof this
 * directory exists to keep no longer proves anything, and handing it back
 * unchecked would let a tampered or stale manifest be read as the run it
 * claims to be.
 */
export function readManifest(dir: string): RunManifest {
  const file = path.join(dir, MANIFEST_BASENAME)
  const text = fs.readFileSync(file, "utf8")
  const parsed: unknown = JSON.parse(text)
  const top = requireRecord(parsed, "<root>", file)
  const canonicalBlock = requireRecord(requireField(top, "canonical", file), "canonical", file)

  const inputs = toCanonicalInputs(requireField(canonicalBlock, "inputs", file), file)
  const metrics = toCanonicalMetrics(requireField(canonicalBlock, "metrics", file), file)
  const recordedHash = requireString(requireField(canonicalBlock, "hash", file), "canonical.hash", file)
  const provenance = toExecutionProvenance(requireField(top, "provenance", file), file)

  const recomputed = canonicalHash(inputs, metrics)
  if (recomputed !== recordedHash) {
    throw new Error(
      `${file}: the recorded canonical hash ${recordedHash} disagrees with ${recomputed}, ` +
        "recomputed from this same file's own inputs and metrics. Either the file was edited " +
        "after being written, or it was written by a version of this module that hashed " +
        "something different - either way, this manifest no longer proves what it claims to.",
    )
  }

  return { canonical: { inputs, metrics, hash: recordedHash }, provenance }
}
