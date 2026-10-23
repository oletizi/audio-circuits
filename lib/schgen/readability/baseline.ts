/**
 * SPEC §3.3's READABILITY BASELINE REGISTRY: an externally-held, provenance-carrying judgement
 * about a produced drawing, and the DESCRIPTIVE comparison a gate may never read as a pass.
 *
 * Hand-written for Task 16 of the M1 schematic-authoring plan.
 *
 * **THE CHANNEL ALREADY EXISTS AND NOTHING HERE AUTHORS IT.** `stripboard/render-approvals.json`
 * is this repository's mechanism for recording the owner's call on a produced artifact, and spec
 * §3.3 names three of its properties as exactly what a readability baseline needs: it is **scoped
 * to bytes**, so *"the owner approved this board"* cannot silently cover a later different board;
 * it **carries his words verbatim, one utterance per list element**, because *"a single string
 * would have made an agent's concatenation of them the record"*; and **a producing agent cannot
 * silently replace it** - `tools/stripboard/approvals-read.ts` refuses a record with no quote, a
 * quote in the narrator's voice, and a quote that is the entry's own reasoning in quotation marks.
 * **All three are carried here**, and the three readings are literally the same code:
 * `lib/owner-words.ts` holds them and both loaders call it.
 *
 * **ITS STATED LIMIT IS CARRIED TOO RATHER THAN PAPERED OVER: no file can prove the owner said
 * anything** (`docs/known-gaps.md` **G27**). A fabricated plausible sentence passes all three
 * readings. What the design buys instead is that a forgery must name one block and one 64-hex
 * serialization hash, must live in a committed file with his name on it, and is printed by the
 * consumer that cites it - expensive and visible, not impossible.
 *
 * **THE REGISTRY SHIPS EMPTY AND NO AGENT MAY ADD AN ENTRY.** `grantedBy` is `"owner"` and
 * `readEntry` refuses anything else, by name, citing `CLAUDE.md`'s invariant: an agent may never
 * author the acceptance criteria for the artifact it is producing. **An empty registry that
 * refuses loudly beats a general rule that quietly accepts a guess**, and an empty one is also
 * the CORRECT state for this repository today - §3.3's acceptance table says a circuit generated
 * for the first time *"reports the measures with no pass or fail"*, and every circuit here is a
 * first generation.
 *
 * **ONE REFUSAL OF THE APPROVALS LOADER IS DELIBERATELY NOT CARRIED, AND THE REASON IS THE WHOLE
 * DIFFERENCE BETWEEN THE TWO REGISTRIES.** `tools/stripboard/approvals.ts` refuses an EMPTY
 * `approvals` list - *"a registry that approves nothing is a file that looks like governance and
 * governs nothing"* - which is right there, because an empty approvals file means the gate it feeds
 * can never open. Here the empty list is the declared and documented state, so refusing it would
 * refuse the thing the spec asks for. The protection against *looking like governance* is instead
 * that every consumer reports the count it read, so a reader is told *zero baselines* rather than
 * being left to assume there were some.
 *
 * **AND THE THING THAT MUST BE STATED RATHER THAN IMPLIED (spec §3.3 revision 4): absent a
 * dominance rule, a four-measure comparison is DESCRIPTIVE, NOT PASS/FAIL.** §3.3 refuses a
 * composite score, and the consequence is that four numbers moving in different directions cannot
 * be resolved into a verdict by anything in the spec. `MeasureComparison.verdict` is therefore the
 * LITERAL TYPE `"descriptive"`: there is no other inhabitant, so `if (c.verdict === "pass")` is a
 * type error rather than a condition that is merely always false, and nothing in this module
 * returns a boolean, a grade or an exit code a caller could read a result out of. **A gate that
 * reports a measure comparison as an acceptance result is a defect in the gate.**
 *
 * **A MOVED SERIALIZATION HASH IS FLAGGED AND IS NEVER A REFUSAL TO COMPARE** - revision 4,
 * finding 18, which is a correction to this task as first written. Scoping the baseline to the
 * exact serialized layout input made a changed serialization *"stale rather than comparable"*, so
 * after any change to how a block is serialized *"the system can tell the output changed but not
 * whether it improved."* Hence `BaselineLookup`'s arm is **`comparable-hash-moved`** and not
 * `"stale"` - the rename is the point, because `"stale"` is what made an implementer stop reporting
 * numbers - and `MeasureComparison` carries `serializationMoved` **beside** the four rows rather
 * than instead of them.
 *
 * **THIS AREA IS THREE FILES AT ONE SEAM, AND THIS ONE IS THE FRONT DOOR** - every declaration and
 * function a consumer needs is exported or re-exported here, so nobody imports the parts:
 *
 *   - `./baseline-model.ts` - WHAT a recorded baseline is: the path, the schema version, the twelve
 *     fields, who may grant one, `BaselineLookup`, and G95's block-scale classification. It reads
 *     nothing and refuses nothing;
 *   - `./baseline-read.ts` - the refusal vocabulary and the reader for ONE entry, including the
 *     three clauses that decide whether `ownerWords` is a quote or an agent's account of one.
 *
 * **THE SPLIT IS A DEVIATION FROM THIS TASK's BRIEF, which names one file, and it is forced by
 * `CLAUDE.md`'s 300-500 line ceiling** - written as one file this is just over 800 lines. The seam
 * is `tools/stripboard/`'s own, not invented here, and the deviation is recorded in
 * `docs/known-gaps.md`.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  BASELINES_SCHEMA,
  BASELINE_NOTE_KEYS,
  BASELINE_TOP_LEVEL_KEYS,
  baselineScale,
  baselinesPath,
  type BaselineLookup,
  type BaselineRegistry,
  type BaselineScale,
  type ReadabilityBaseline,
} from "./baseline-model.ts"
import { NOT_DEFAULTED, isRecord, kindOf, readEntry, refuse } from "./baseline-read.ts"
import type { BlockId } from "../ir/types.ts"
import type { SchematicMeasures } from "./measures.ts"

export {
  BASELINES_FILE,
  BASELINES_SCHEMA,
  BASELINE_EDGES_REQUIRED,
  BASELINE_ENTRY_KEYS,
  BASELINE_GRANTORS,
  BASELINE_NOTE_KEYS,
  BASELINE_REQUIRED_EDGE_NAMES,
  BASELINE_TOP_LEVEL_KEYS,
  MEASURE_KEYS,
  SCALE_INVARIANT_UPTO,
  SCALE_UNSTABLE_FROM,
  baselineScale,
  baselinesPath,
  type BaselineGrantor,
  type BaselineLookup,
  type BaselineRegistry,
  type BaselineScale,
  type ReadabilityBaseline,
} from "./baseline-model.ts"

export { NOT_DEFAULTED } from "./baseline-read.ts"

export interface MeasureComparison {
  /** All four measures, always, both sides, whatever the hash did. DESCRIPTIVE, not a verdict. */
  readonly rows: readonly { readonly measure: string; readonly baseline: number; readonly now: number }[]
  /** True when the serialization moved: provenance is broken, comparison is not. */
  readonly serializationMoved: boolean
  /** Never a pass or a fail: spec §3.3 rev 4 states there is no dominance rule. */
  readonly verdict: "descriptive"
  /** `[RAN]` G95: whether this is a baseline about the circuit or about a serialization. */
  readonly scale: BaselineScale
}

/**
 * The four measures of §3.3's table, both sides, with the hash flagged beside them.
 *
 * **THE FOUR ROWS ARE §3.3's FOUR MEASURES, AND `bendsPerEdge` IS NOT A FIFTH ROW.** That table
 * reads *"bends | count, and per edge"*: the per-edge figure is a second UNIT of the first measure,
 * not a measure of its own, and a comparison with five rows against a four-row table would be this
 * module quietly adding a measure the spec did not state. `renderMeasures` prints it beside the
 * other four, which is where it belongs. **What that costs, stated rather than discovered: a change
 * in the EDGE COUNT alone - the same bends spread over more or fewer polylines - moves no row
 * here.** It moves `renderMeasures`'s second number, and `docs/known-gaps.md` records the gap.
 *
 * **`cells` IS A FOURTH PARAMETER THE BRIEF's SIGNATURE DOES NOT DECLARE, AND IT IS HERE ON
 * PURPOSE.** G95's block-scale refinement decides whether a baseline is about the circuit or about
 * a serialization, and that classification is a function of the block's cell count - which neither
 * a `ReadabilityBaseline` nor a `SchematicMeasures` carries. Exporting `baselineScale` alone and
 * leaving `MeasureComparison` without it would let a caller print four rows with no statement of
 * which kind of baseline they came from, which is the precise thing the refinement exists to
 * prevent (*"a gate citing one must not be read as the former"*). The deviation is recorded in
 * `docs/known-gaps.md`.
 */
export function compareMeasures(
  b: ReadabilityBaseline,
  m: SchematicMeasures,
  hash: string,
  cells: number,
): MeasureComparison {
  return {
    rows: [
      { measure: "bends", baseline: b.measures.bends, now: m.bends },
      { measure: "crossings", baseline: b.measures.crossings, now: m.crossings },
      { measure: "wireLength", baseline: b.measures.wireLength, now: m.wireLength },
      { measure: "occupiedArea", baseline: b.measures.occupiedArea, now: m.occupiedArea },
    ],
    serializationMoved: hash !== b.layoutInputSha256,
    verdict: "descriptive",
    scale: baselineScale(cells),
  }
}

/**
 * The baseline for one block, and the three answers there are.
 *
 * **WHEN SEVERAL ENTRIES NAME ONE BLOCK AND NONE MATCHES THE HASH, THE MOST RECENTLY GRANTED ONE
 * IS RETURNED.** Several entries per block are allowed for the reason the approvals registry allows
 * several per board: a block is drawn again and again, so a second look at a second render is a
 * second grant and has to be recordable. The comparison then has to pick one, and the newest grant
 * is the one he saw last; ties break on `id` so the answer is deterministic rather than dependent
 * on file order. It is `comparable-hash-moved` and never `found`, so the caller is always told the
 * provenance does not hold.
 */
export function baselineFor(
  bs: readonly ReadabilityBaseline[],
  block: BlockId,
  hash: string,
): BaselineLookup {
  const forBlock = bs.filter((b) => b.block === block)
  const exact = forBlock.find((b) => b.layoutInputSha256 === hash)
  if (exact !== undefined) return { kind: "found", entry: exact }
  const newest = [...forBlock].sort((a, b) => b.grantedOn.localeCompare(a.grantedOn) || a.id.localeCompare(b.id))[0]
  if (newest === undefined) return { kind: "absent" }
  return { kind: "comparable-hash-moved", entry: newest, was: newest.layoutInputSha256 }
}

function readNotes(parsed: Record<string, unknown>, file: string): Readonly<Record<string, string>> {
  const value = parsed["notes"]
  if (!isRecord(value)) refuse("baselines-notes-type", `"notes" must be a JSON object, got ${kindOf(value)}.`, file)
  for (const key of Object.keys(value)) {
    if (!BASELINE_NOTE_KEYS.includes(key)) {
      refuse(
        "baselines-unknown-note",
        `"notes" carries an entry for "${key}", which is not part of this registry's design. The ` +
          `notes block records one decision per design field - ${BASELINE_NOTE_KEYS.join(", ")} - ` +
          'and an entry\'s own reasoning belongs in its "note". A note for nothing is a reason ' +
          "nobody can check against anything.",
        file,
      )
    }
  }
  const notes: Record<string, string> = {}
  for (const key of BASELINE_NOTE_KEYS) {
    if (!(key in value)) {
      refuse(
        "baselines-missing-note",
        `"notes" has no entry for "${key}". Every design field carries a note recording why the ` +
          "registry is shaped this way, because a shape with no reason gets reshaped by the next " +
          "reader - and this file exists precisely so one decision stops being re-argued.",
        file,
      )
    }
    const note = value[key]
    if (typeof note !== "string") refuse("baselines-note-type", `the note for "${key}" must be a string, got ${kindOf(note)}.`, file)
    if (note.trim() === "") refuse("baselines-blank-note", `the note for "${key}" is blank, which is the same as no note.`, file)
    notes[key] = note
  }
  return notes
}

/**
 * The registry's entries, read strictly from its TEXT.
 *
 * **IT TAKES THE TEXT AND NOT A PATH, deliberately**: `lib/schgen/` modules are the ones a test can
 * drive with a literal, and every refusal below is driven in
 * `tests/schgen/readability/baseline.test.ts` by handing it one. `loadBaselines` is the one place
 * that reads the committed file.
 */
export function parseBaselines(json: string, file: string): readonly ReadabilityBaseline[] {
  return parseRegistry(json, file).baselines
}

/** The whole registry, including the notes block, for a consumer that reports what it read. */
export function parseRegistry(json: string, file: string, repoRoot: string = repoRootOfThisModule()): BaselineRegistry {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (error) {
    refuse("baselines-not-json", `the readability-baseline registry is not valid JSON: ${error instanceof Error ? error.message : String(error)}.`, file)
  }
  if (!isRecord(parsed)) {
    refuse("baselines-not-an-object", `the readability-baseline registry must hold a JSON object at the top level, got ${kindOf(parsed)}.`, file)
  }
  if (!("schema" in parsed)) refuse("baselines-missing-key", `"schema" is absent. ${NOT_DEFAULTED}`, file)
  if (parsed["schema"] !== BASELINES_SCHEMA) {
    refuse(
      "baselines-schema",
      `"schema" must be exactly ${BASELINES_SCHEMA}, got ${JSON.stringify(parsed["schema"])}. ` +
        `Schema ${BASELINES_SCHEMA} names the fields this loader reads; reading another version as ` +
        "if it were this one would accept a baseline nobody reviewed. No version is assumed when " +
        "the field disagrees.",
      file,
    )
  }
  for (const key of Object.keys(parsed)) {
    if (!BASELINE_TOP_LEVEL_KEYS.includes(key)) {
      refuse(
        "baselines-unknown-key",
        `"${key}" is not part of a readability-baseline file. Schema ${BASELINES_SCHEMA} names ` +
          `exactly: ${BASELINE_TOP_LEVEL_KEYS.join(", ")}. An unknown key is refused rather than ` +
          "ignored, because a key the loader drops is a qualification somebody believes is " +
          "recorded and nothing reads.",
        file,
      )
    }
  }
  if (!("baselines" in parsed)) refuse("baselines-missing-key", `"baselines" is absent. ${NOT_DEFAULTED}`, file)
  const list = parsed["baselines"]
  if (!Array.isArray(list)) {
    refuse(
      "baselines-not-a-list",
      `"baselines" is ${kindOf(list)} and must be an array of entries, one per reviewed baseline. ` +
        "An EMPTY array is the declared state of this registry and is accepted; a missing or " +
        "mistyped one is not, because an absent registry is not the same claim as an empty one.",
      file,
    )
  }
  const raw: readonly unknown[] = list
  const entries: ReadabilityBaseline[] = []
  for (const [index, value] of raw.entries()) {
    const entry = readEntry(value, index, file, repoRoot)
    for (const already of entries) {
      if (already.id === entry.id) {
        refuse("baselines-duplicate-id", `two baselines share the id "${entry.id}". An id is how a report cites the entry it compared against, so two of them make that citation ambiguous.`, file)
      }
      if (already.block === entry.block && already.layoutInputSha256 === entry.layoutInputSha256) {
        refuse(
          "baselines-duplicate-scope",
          `two baselines are over block ${entry.block} at the serialization ${entry.layoutInputSha256} - "${already.id}" and "${entry.id}". ` +
            "That is one decision recorded twice, and baselineFor would answer from whichever came " +
            "first while the second was read by nobody. A NEW drawing of the same block is a new " +
            "layout input hash and gets its own entry.",
          file,
        )
      }
    }
    entries.push(entry)
  }
  return { schema: BASELINES_SCHEMA, baselines: entries, notes: readNotes(parsed, file) }
}

function repoRootOfThisModule(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..")
}

/**
 * The committed registry, read once.
 *
 * **AN UNREADABLE REGISTRY IS A REFUSAL AND NEVER AN EMPTY LIST.** An absent file is not *"no
 * baseline is held"* and it is certainly not *"every drawing is the reference"*: it is a repository
 * missing a committed file, and a consumer that silently reported zero baselines for it would be
 * indistinguishable from one reporting the registry's real, declared, empty state.
 */
export function loadBaselines(file: string = baselinesPath()): BaselineRegistry {
  const abs = path.resolve(file)
  let contents: string
  try {
    contents = fs.readFileSync(abs, "utf8")
  } catch (error) {
    refuse(
      "baselines-unreadable",
      `the readability-baseline registry could not be read: ${error instanceof Error ? error.message : String(error)}. ` +
        'It is NOT defaulted either way: an absent registry is not "no baseline is held" and it is ' +
        'certainly not "every drawing is the reference". Restore the file, or remove the ' +
        "consultation that asked for it.",
      abs,
    )
  }
  return parseRegistry(contents, abs)
}
