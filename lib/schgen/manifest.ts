/**
 * SPEC §2.1's GENERATION MANIFEST: the one record that says four link checks ran over ONE
 * derivation.
 *
 * Hand-written for Task 16 of the M1 schematic-authoring plan.
 *
 * **WHY IT EXISTS.** Spec §2.1, finding 9: *"four link checks that each pass prove nothing jointly
 * unless they ran over the same derivation. Nothing above said they did."* So every generated
 * schematic is accompanied by a record of the hashes of the canonical schematic's netlist export,
 * the section network the generator consumed, the serialized layout input per block, the template
 * and rule libraries that graded it, and the generated schematic itself. **CRITERION: a gate that
 * reports a pass names the manifest it passed against, and a manifest whose input hashes do not
 * match the files on disk fails rather than regenerating silently.** `tools/schgen/verify.ts` is
 * where the first half is enforced and `staleManifestInputs` is the second half.
 *
 * **IT HASHES THE SERIALIZED LAYOUT INPUT AND NOT THE NETWORK'S CONTENT, AND THAT IS MEASURED
 * RATHER THAN CAUTIOUS** - spec §2.1 revision 2, `docs/known-gaps.md` **G95**. `[RAN]` Three
 * shuffles of one netlist - *"same components, same nets, same partition"* - give **three distinct
 * drawings out of three on 4 of 4 circuits**, moving inter-net crossings by up to 2.1x at block
 * scale and 3x flat. *"A hash over the section `Network`'s CONTENT would not detect the change that
 * moved the drawing. A manifest built that way would certify two different drawings under one
 * input hash, which is exactly the failure the manifest exists to prevent."*
 *
 * **SO THE TWO HASHES ANSWER TWO DIFFERENT QUESTIONS AND BOTH ARE KEPT.**
 * `sectionNetworkSha256` is **deliberately order-insensitive** (see `canonicalNetworkText`): it
 * answers *is this the same circuit*, and two shuffles of one netlist must agree on it or the first
 * test in `tests/schgen/manifest.test.ts` is measuring nothing. `layoutInputSha256` is
 * **byte-exact** on what the layout backend was handed: it answers *is this the same drawing*, and
 * two shuffles must DISAGREE on it. A manifest with only the first would certify two drawings
 * under one key; a manifest with only the second could not tell a reordered circuit from a
 * different one.
 *
 * **THIS IS NOT A NEW DISCIPLINE HERE, WHICH IS THE ARGUMENT FOR IT.** The parent's `run.json`
 * records hashes of the source board, the intent, the rules, the policy and the engine commit, and
 * *"`adopt` refuses a run whose result hash has changed"*; `stripboard/render-approvals.json`
 * scopes an owner approval to a `candidateSha256` *"for exactly this reason - an approval of a
 * render is an approval of those bytes."* **The schematic side had no equivalent.**
 *
 * **WHAT THIS MANIFEST IS *NOT* FOR, stated here because spec §3.3 revision 4 exists to correct
 * exactly this conflation.** It is the **reproducibility identity**: the exact bytes, the engine,
 * the libraries, the artifact. A readability BASELINE is a **comparison identity** - the circuit or
 * block fixture - and `./readability/baseline.ts` reports a moved serialization hash as
 * `comparable-hash-moved` and goes on reporting all four measures. A moved input hash is fatal to a
 * reproducibility claim and is NOT fatal to a comparison. The two must not be collapsed.
 */

import crypto from "node:crypto"
import type { BlockId, CircuitSpec } from "./ir/types.ts"

/** The generated file that carries the manifest, relative to a design's `outDir`. */
export const MANIFEST_FILE = "MANIFEST.json"

/** The only schema version this module reads or writes. */
export const MANIFEST_VERSION = 1

export interface GenerationManifest {
  readonly version: 1
  /** The canonical schematic's netlist export: the authority for a schematic-first circuit. */
  readonly canonicalNetlistSha256: string | null
  readonly sectionNetworkSha256: string
  /** Block id -> SHA-256 of the EXACT bytes handed to the layout backend. */
  readonly layoutInputSha256: Readonly<Record<BlockId, string>>
  readonly templateLibrarySha256: string
  readonly ruleLibrarySha256: string
  readonly generatedSha256: Readonly<Record<string, string>>
}

/**
 * What a manifest is built FROM: the text of each thing, not its hash.
 *
 * **`canonicalNetlist` IS `string | null` AND THE NULL MEANS ONE PARTICULAR THING.** `CLAUDE.md`
 * says authority runs in both directions: *"for a circuit an agent designs, the model is
 * authoritative and the schematic is derived from it. For an existing design being brought in - the
 * Pultec - the schematic is authoritative and the model is derived from a netlist export."* A
 * schematic-first circuit therefore HAS a canonical netlist export and a model-first circuit does
 * not, so `null` records *this design declares no canonical netlist*, which is a fact about the
 * design and not a value this module substituted. **It is not read as agreement either**:
 * `staleManifestInputs` reports `canonicalNetlist` when one side has a netlist and the other does
 * not, so a design that gains or loses one invalidates the manifest rather than keeping it.
 */
export interface ManifestInputs {
  readonly canonicalNetlist: string | null
  readonly sectionNetwork: string
  readonly layoutInputs: Readonly<Record<BlockId, string>>
  readonly templateLibrary: string
  readonly ruleLibrary: string
  readonly generated: Readonly<Record<string, string>>
}

/**
 * The five INPUT members - what a generation knows before it has produced anything.
 *
 * `generatedFiles` assembles the sixth from the files it has just built, which is why the caller
 * supplies this and not a whole `ManifestInputs`: the manifest hashes the generated set, and the
 * manifest is itself one of the generated files, so the only place the two can be put together
 * without a circular reference is inside the producer.
 */
export type ManifestSources = Omit<ManifestInputs, "generated">

export function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex")
}

const sortedRecord = (r: Readonly<Record<string, string>>): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const key of Object.keys(r).sort()) {
    const value = r[key]
    if (value !== undefined) out[key] = value
  }
  return out
}

const hashedRecord = (r: Readonly<Record<string, string>>): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const [key, text] of Object.entries(sortedRecord(r))) out[key] = sha256(text)
  return out
}

/**
 * The whole `ManifestInputs` from the five sources and the generated file set - **one rule, so the
 * producer and the verifier cannot disagree about what is hashed.**
 *
 * **`MANIFEST.json` IS EXCLUDED FROM `generated`, and the reason is a fixed point rather than a
 * preference.** The manifest hashes the generated set and is itself one of the generated files, so
 * including it would require its own hash to be known before it was written. It is excluded HERE,
 * once, rather than at each call site - `tools/schgen/generated-files.ts` builds the manifest and
 * `tools/schgen/verify.ts` rebuilds the inputs to compare against it, and a difference between
 * those two exclusions would make every manifest look stale.
 *
 * **WHAT THAT COSTS: the manifest does not hash itself**, so a hand-edited `MANIFEST.json` is not
 * caught by `generatedSha256`. It is caught by `staleFiles` (gate 1), which compares every
 * generated file including this one by CONTENT against what the generator produces.
 */
export function manifestInputsOf(
  sources: ManifestSources,
  files: ReadonlyMap<string, string>,
): ManifestInputs {
  const generated: Record<string, string> = {}
  for (const [name, text] of files) {
    if (name === MANIFEST_FILE) continue
    generated[name] = text
  }
  return { ...sources, generated }
}

export function buildManifest(x: ManifestInputs): GenerationManifest {
  return {
    version: MANIFEST_VERSION,
    canonicalNetlistSha256: x.canonicalNetlist === null ? null : sha256(x.canonicalNetlist),
    sectionNetworkSha256: sha256(x.sectionNetwork),
    layoutInputSha256: hashedRecord(x.layoutInputs),
    templateLibrarySha256: sha256(x.templateLibrary),
    ruleLibrarySha256: sha256(x.ruleLibrary),
    generatedSha256: hashedRecord(x.generated),
  }
}

/**
 * The manifest as the exact bytes of a generated file: indented, key-sorted, newline-terminated.
 *
 * **IT IS A COMMITTED DERIVED ARTIFACT, so it is written to be read in a diff** - `CLAUDE.md`:
 * *"where a generated netlist is committed, it is committed deliberately: it is the form in which a
 * human's schematic edit becomes legible to an agent in a diff."* The same applies here: a reader
 * looking at a changed manifest should be able to see WHICH hash moved, which a single compact line
 * would not show.
 */
export function serializeManifest(m: GenerationManifest): string {
  const ordered = {
    version: m.version,
    canonicalNetlistSha256: m.canonicalNetlistSha256,
    sectionNetworkSha256: m.sectionNetworkSha256,
    layoutInputSha256: sortedRecord(m.layoutInputSha256),
    templateLibrarySha256: m.templateLibrarySha256,
    ruleLibrarySha256: m.ruleLibrarySha256,
    generatedSha256: sortedRecord(m.generatedSha256),
  }
  return `${JSON.stringify(ordered, null, 2)}\n`
}

const MANIFEST_KEYS: readonly string[] = [
  "version",
  "canonicalNetlistSha256",
  "sectionNetworkSha256",
  "layoutInputSha256",
  "templateLibrarySha256",
  "ruleLibrarySha256",
  "generatedSha256",
]

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

const HEX64 = /^[0-9a-f]{64}$/

function refuse(what: string): never {
  throw new Error(
    `${MANIFEST_FILE} is not a generation manifest: ${what}. It is NOT repaired and no field is ` +
      "defaulted: the manifest exists so a gate can name the derivation it passed against, and a " +
      "manifest this parser completed for you would let a gate cite a derivation nobody recorded " +
      `(spec 2.1). Regenerate it with \`bun run schgen generate\`, or fix the file.`,
  )
}

function hashAt(value: unknown, where: string): string {
  if (typeof value !== "string" || !HEX64.test(value)) {
    refuse(`${where} is ${JSON.stringify(value)}, which is not a lowercase 64-character hex sha256`)
  }
  return value
}

function hashRecordAt(value: unknown, where: string): Readonly<Record<string, string>> {
  if (!isRecord(value)) refuse(`${where} must be a JSON object of name -> sha256`)
  const out: Record<string, string> = {}
  for (const [key, hash] of Object.entries(value)) out[key] = hashAt(hash, `${where}[${key}]`)
  return out
}

/** The manifest a file holds, with every field read BY NAME and nothing spread or defaulted. */
export function parseManifest(json: string): GenerationManifest {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (error) {
    refuse(`it is not valid JSON (${error instanceof Error ? error.message : String(error)})`)
  }
  if (!isRecord(parsed)) refuse("it does not hold a JSON object at the top level")
  for (const key of Object.keys(parsed)) {
    if (!MANIFEST_KEYS.includes(key)) {
      refuse(
        `it carries "${key}", which is not a manifest field. Schema ${MANIFEST_VERSION} names ` +
          `exactly: ${MANIFEST_KEYS.join(", ")}. An unknown key is refused rather than ignored, ` +
          "because a key this parser drops is an input somebody believes is recorded and nothing " +
          "compares",
      )
    }
  }
  for (const key of MANIFEST_KEYS) {
    if (!(key in parsed)) refuse(`it has no "${key}"`)
  }
  if (parsed["version"] !== MANIFEST_VERSION) {
    refuse(
      `"version" must be exactly ${MANIFEST_VERSION}, got ${JSON.stringify(parsed["version"])}. ` +
        "Reading another version as if it were this one would compare fields that may not mean the " +
        "same thing",
    )
  }
  const netlist = parsed["canonicalNetlistSha256"]
  return {
    version: MANIFEST_VERSION,
    canonicalNetlistSha256: netlist === null ? null : hashAt(netlist, "canonicalNetlistSha256"),
    sectionNetworkSha256: hashAt(parsed["sectionNetworkSha256"], "sectionNetworkSha256"),
    layoutInputSha256: hashRecordAt(parsed["layoutInputSha256"], "layoutInputSha256"),
    templateLibrarySha256: hashAt(parsed["templateLibrarySha256"], "templateLibrarySha256"),
    ruleLibrarySha256: hashAt(parsed["ruleLibrarySha256"], "ruleLibrarySha256"),
    generatedSha256: hashRecordAt(parsed["generatedSha256"], "generatedSha256"),
  }
}

/**
 * Every INPUT hash of `m` that disagrees with `current`. Empty means the manifest is live.
 *
 * **IT COMPARES THE FIVE INPUTS AND NOT `generatedSha256`, WHICH IS DELIBERATE AND IS NOT A GAP.**
 * The generated set is compared by CONTENT, file by file, by `staleFiles` in
 * `tools/schgen/generated-files.ts`, which is gate 1 - and `MANIFEST.json` is one of the files it
 * compares, so a manifest that no longer matches the output already fails there, naming the file.
 * Comparing the output a second time here would be two rules for one question, which `CLAUDE.md`
 * forbids. **What this function adds is the half gate 1 cannot give**: gate 1 says *a file
 * differs*, and this says *WHICH INPUT MOVED* - a template edit, a rule edit, a reordered block, a
 * different netlist export - and that is what lets gates 3, 6, 7 and 8 refuse to pass rather than
 * running against an output whose provenance no longer holds.
 *
 * A block named on one side and not the other is reported, in both directions: a manifest that
 * lost a block's layout input would otherwise compare as live, which is the *"skipped check that
 * looks like a passing one"* shape.
 */
export function staleManifestInputs(m: GenerationManifest, current: ManifestInputs): readonly string[] {
  const now = buildManifest(current)
  const out: string[] = []
  if (m.canonicalNetlistSha256 !== now.canonicalNetlistSha256) {
    out.push(
      `canonicalNetlist: the manifest records ${m.canonicalNetlistSha256 ?? "none"} and the ` +
        `design's export now hashes ${now.canonicalNetlistSha256 ?? "none"}`,
    )
  }
  if (m.sectionNetworkSha256 !== now.sectionNetworkSha256) {
    out.push(
      `sectionNetwork: the manifest records ${m.sectionNetworkSha256} and the circuit now hashes ` +
        `${now.sectionNetworkSha256}. This hash is order-insensitive, so the circuit's CONTENT has ` +
        "changed and not merely the order it is declared in",
    )
  }
  for (const block of [...new Set([...Object.keys(m.layoutInputSha256), ...Object.keys(now.layoutInputSha256)])].sort()) {
    const was = m.layoutInputSha256[block]
    const is = now.layoutInputSha256[block]
    if (was === is) continue
    if (was === undefined) out.push(`layoutInput[${block}]: this block has a layout input now and the manifest records none`)
    else if (is === undefined) out.push(`layoutInput[${block}]: the manifest records a layout input and this block has none now`)
    else out.push(`layoutInput[${block}]: the manifest records ${was} and the backend is now handed bytes hashing ${is}`)
  }
  if (m.templateLibrarySha256 !== now.templateLibrarySha256) {
    out.push(`templateLibrary: the manifest records ${m.templateLibrarySha256} and it now hashes ${now.templateLibrarySha256}`)
  }
  if (m.ruleLibrarySha256 !== now.ruleLibrarySha256) {
    out.push(`ruleLibrary: the manifest records ${m.ruleLibrarySha256} and it now hashes ${now.ruleLibrarySha256}`)
  }
  return out
}

/**
 * THE SECTION NETWORK AS AN ORDER-INSENSITIVE TEXT: *is this the same circuit*, and nothing else.
 *
 * **EVERY ARRAY IS SORTED BY ITS OWN CANONICAL TEXT AND EVERY OBJECT'S KEYS ARE SORTED, so a
 * reordered declaration hashes identically.** That is the property `tests/schgen/manifest.test.ts`'s
 * first test rests on, and it is the property that makes the layout-input hash load-bearing rather
 * than decorative: if this hash moved when a `.capacitor(...)` call moved, it would look as if the
 * manifest had noticed the reordering, when what it had noticed is a change of no electrical
 * consequence. **G95**'s criterion is that the thing which DID change - the drawing - is caught by
 * the serialized layout input, and that only reads as a criterion if the network hash does not
 * move.
 *
 * **WHAT IT CANNOT SEE, SAID HERE RATHER THAN DISCOVERED LATER: order.** Two circuits that differ
 * only in the order of a parts list, a block's member list or a sheet's notes hash the same here.
 * That is the intent and it is also the whole of this hash's blind spot; nothing else is lost,
 * because sorting a list preserves its multiset.
 *
 * **AN `undefined` REFUSES RATHER THAN BEING DROPPED.** `JSON.stringify` omits an undefined
 * property, so a field that arrived undefined would vanish from the hashed text and two circuits
 * differing in it would hash the same - the exact failure `lib/schgen/elk/serialize.ts` refuses an
 * undeclared ELK field for.
 */
export function canonicalNetworkText(c: CircuitSpec): string {
  return canonicalTextOf(c, "circuit")
}

/**
 * The same canonicalisation over ANY data value.
 *
 * **IT IS EXPORTED SO THE TWO REFUSALS BELOW ARE DRIVABLE WITHOUT A CAST.** `CircuitSpec` has no
 * optional field and no `unknown`, so there is no type-legal way to hand `canonicalNetworkText` an
 * undefined nested value or a function - and this repository's rule is no casts, so a guard reached
 * only through one would be a guard no test covers. `CLAUDE.md`: *"a skipped check must never look
 * like a passing one"*. `tests/schgen/manifest.test.ts` drives both arms through this entry.
 */
export function canonicalTextOf(value: unknown, where: string): string {
  return JSON.stringify(canonicalValue(value, where))
}

type Canonical = string | number | boolean | null | readonly Canonical[] | { readonly [k: string]: Canonical }

function canonicalValue(value: unknown, where: string): Canonical {
  if (value === null) return null
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value
  if (value === undefined) {
    throw new Error(
      `canonicalNetworkText: ${where} is undefined. It is NOT skipped: JSON.stringify omits an ` +
        "undefined property, so the field would vanish from the hashed text and two circuits " +
        "differing in it would share one sectionNetworkSha256 - which is the failure the manifest " +
        "exists to prevent (docs/known-gaps.md G95). Give the field a value or a null.",
    )
  }
  if (value instanceof Map) {
    return [...value.entries()]
      .map(([k, v]) => [canonicalValue(k, `${where} key`), canonicalValue(v, `${where}[${String(k)}]`)] as const)
      .map((pair) => [...pair])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  }
  if (value instanceof Set) {
    return [...value].map((v, i) => canonicalValue(v, `${where}[${i}]`)).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  }
  if (Array.isArray(value)) {
    const items: unknown[] = value
    return items
      .map((v, i) => canonicalValue(v, `${where}[${i}]`))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  }
  if (typeof value === "object") {
    const out: Record<string, Canonical> = {}
    for (const key of Object.keys(value).sort()) out[key] = canonicalValue(Reflect.get(value, key), `${where}.${key}`)
    return out
  }
  throw new Error(
    `canonicalNetworkText: ${where} is a ${typeof value}, which has no stable text. A circuit spec ` +
      "is data; a function or a symbol in it cannot be hashed and is not skipped, because a value " +
      "left out of this text is one two circuits could differ in while hashing the same.",
  )
}
