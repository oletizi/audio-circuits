/**
 * THE REFUSAL VOCABULARY FOR `schematic/readability-baselines.json`, AND THE READER FOR ONE ENTRY -
 * every clause that can refuse below the registry level, including the three that decide whether
 * `ownerWords` is a QUOTE or an agent's account of one.
 *
 * Hand-written for Task 16 of the M1 schematic-authoring plan.
 *
 * **ITS OWN FILE FOR THE LINE CEILING, SPLIT AT THE ENTRY/REGISTRY SEAM** -
 * `tools/stripboard/approvals-read.ts`'s seam exactly. `./baseline.ts` answers *what is in the
 * file*; this answers *is this one entry well formed*. `./baseline-model.ts` records why the split
 * is a deviation from the task brief and what forced it.
 *
 * **THE DANGEROUS DEFAULT HERE IS "THIS DRAWING IS THE REFERENCE", AND IT IS QUIETER THAN THE
 * APPROVALS REGISTRY's.** An approvals field this loader completed would be a board written into
 * `boards/` on nobody's word - loud, because the adoption prints what admitted it. A baseline field
 * completed here would be a reference drawing nobody chose, cited by a report as the thing a later
 * drawing is compared against; and because the comparison is DESCRIPTIVE by construction, nothing
 * downstream would refuse it. So not one clause below substitutes a value.
 *
 * **THE THREE CLAUSES ABOUT HIS WORDS ARE `tools/stripboard/approvals-read.ts`'s, REUSED RATHER
 * THAN REWRITTEN**: `lib/owner-words.ts` holds the predicates, the word lists and the narration
 * sweep, and both loaders call the same functions. See `readOwnerWords` below for the one
 * difference - the SELECTION shape is deliberately not admitted here - and for why.
 *
 * **NOTHING HERE IS A WAY INTO THE DATA.** `loadBaselines` and `parseRegistry` in `./baseline.ts`
 * are the only ones, and these functions are their parts.
 */

import fs from "node:fs"
import path from "node:path"
import { isSelectionFor, isSpokenVoice, narrationMarkerIn } from "../../owner-words.ts"
import {
  BASELINES_FILE,
  BASELINES_SCHEMA,
  BASELINE_EDGES_REQUIRED,
  BASELINE_ENTRY_KEYS,
  BASELINE_GRANTORS,
  BASELINE_REQUIRED_EDGE_NAMES,
  MEASURE_KEYS,
  type BaselineGrantor,
  type ReadabilityBaseline,
} from "./baseline-model.ts"
import type { SchematicMeasures } from "./measures.ts"

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

export const kindOf = (v: unknown): string => {
  if (v === null) return "null"
  if (v === undefined) return "undefined"
  if (Array.isArray(v)) return "an array"
  return `a ${typeof v}`
}

export function refuse(code: string, detail: string, file: string): never {
  throw new Error(`${code}: ${detail} In ${file}.`)
}

/**
 * The sentence a missing value gets, because the dangerous default here is *"this drawing is the
 * reference"*.
 *
 * An approvals field this loader completed would be a board written into `boards/` on nobody's
 * word. A baseline field this loader completed would be a REFERENCE DRAWING nobody chose, cited by
 * a gate as the thing a later drawing is compared against - and because the comparison is
 * descriptive, nothing downstream would refuse it. A baseline nobody granted is therefore quieter
 * than a board nobody approved, not louder, which is the reason for refusing every absence here.
 */
export const NOT_DEFAULTED =
  "It is NOT defaulted: a baseline this loader completed for you would be a reference drawing " +
  "nobody chose, cited by a gate as the thing a later drawing is compared against - and the " +
  "comparison is descriptive, so nothing downstream would refuse it. Supply it, or delete the " +
  `entry and report the measures with no baseline (spec 3.3: a first generation has nothing to ` +
  "regress against).";

function readText(entry: Record<string, unknown>, key: string, id: string, file: string): string {
  const value = entry[key]
  if (typeof value !== "string") {
    refuse("baselines-field-type", `the baseline ${id} has "${key}" as ${kindOf(value)}, and it must be a string. ${NOT_DEFAULTED}`, file)
  }
  if (value.trim() === "") {
    refuse(
      "baselines-blank-field",
      `the baseline ${id} has a blank "${key}", which records nothing. A baseline a gate cites ` +
        "cannot carry a blank reason, a blank scope or a blank quote; nothing is written for you.",
      file,
    )
  }
  return value
}

function readList(entry: Record<string, unknown>, key: string, id: string, file: string): readonly string[] {
  const value = entry[key]
  if (!Array.isArray(value)) {
    refuse("baselines-field-type", `the baseline ${id} has "${key}" as ${kindOf(value)}, and it must be an array of strings. ${NOT_DEFAULTED}`, file)
  }
  const items: string[] = []
  const raw: readonly unknown[] = value
  for (const [index, item] of raw.entries()) {
    if (typeof item !== "string") {
      refuse("baselines-field-type", `the baseline ${id} has "${key}"[${index}] as ${kindOf(item)}, and every entry must be a string.`, file)
    }
    if (item.trim() === "") {
      refuse("baselines-blank-field", `the baseline ${id} has a blank "${key}"[${index}], which records nothing.`, file)
    }
    items.push(item)
  }
  return items
}

/** The serialization hash: lowercase hex, sixty-four characters, and nothing else. */
function readHash(value: string, id: string, file: string): string {
  if (!/^[0-9a-f]{64}$/.test(value)) {
    refuse(
      "baselines-hash-shape",
      `the baseline ${id} names the layout input ${JSON.stringify(value)}, which is not a ` +
        "lowercase 64-character hex sha256. THIS FIELD IS THE SCOPE OF THE BASELINE - it is what " +
        "makes a moved serialization reportable as comparable-hash-moved rather than silently " +
        "comparable - so it is not accepted in whatever shape it arrives in, not uppercased for " +
        "you, and not matched on a prefix. Take the value from MANIFEST.json's " +
        "layoutInputSha256 entry for the block he was shown.",
      file,
    )
  }
  return value
}

function readGrantedOn(value: string, id: string, file: string): string {
  const parsed = Date.parse(`${value}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed)) {
    refuse(
      "baselines-granted-on",
      `the baseline ${id} was granted on "${value}", which is not a date in yyyy-mm-dd. The day is ` +
        "half of the provenance - it is what lets a reader find the conversation the baseline came " +
        "out of, and it is what breaks a tie when two entries name one block - so it is not " +
        "accepted in whatever shape it arrives in.",
      file,
    )
  }
  if (!new Date(parsed).toISOString().startsWith(value)) {
    refuse("baselines-granted-on", `the baseline ${id} was granted on "${value}", which is a well-shaped date that does not exist. Nothing is rounded to a neighbouring day.`, file)
  }
  return value
}

/** The four measured numbers plus the per-edge figure, each finite and not negative. */
function readMeasures(entry: Record<string, unknown>, id: string, file: string): SchematicMeasures {
  const value = entry["measures"]
  if (!isRecord(value)) {
    refuse("baselines-field-type", `the baseline ${id} has "measures" as ${kindOf(value)}, and it must be a JSON object carrying ${MEASURE_KEYS.join(", ")}. ${NOT_DEFAULTED}`, file)
  }
  for (const key of Object.keys(value)) {
    if (!MEASURE_KEYS.some((known) => known === key)) {
      refuse(
        "baselines-unknown-measure",
        `the baseline ${id} records a measure "${key}", which spec 3.3 does not name. The measures ` +
          `are exactly ${MEASURE_KEYS.join(", ")}. A fifth number is refused rather than ignored: ` +
          "section 3.3 refuses a composite score, and an extra figure recorded beside the four is " +
          "how a composite arrives without anybody deciding to adopt one.",
        file,
      )
    }
  }
  const read = (key: string): number => {
    const n = value[key]
    if (typeof n !== "number" || !Number.isFinite(n)) {
      refuse("baselines-measure-type", `the baseline ${id} has measures.${key} as ${kindOf(n)}, and every measure is a finite number. ${NOT_DEFAULTED}`, file)
    }
    if (n < 0) {
      refuse("baselines-measure-negative", `the baseline ${id} has measures.${key} = ${n}. None of these four can be negative - a count, a length and an area are all non-negative - so a negative value is a transcription error and is not clamped.`, file)
    }
    return n
  }
  for (const key of MEASURE_KEYS) {
    if (!(key in value)) refuse("baselines-missing-measure", `the baseline ${id} has no measures.${key}. ${NOT_DEFAULTED}`, file)
  }
  return {
    bends: read("bends"),
    bendsPerEdge: read("bendsPerEdge"),
    crossings: read("crossings"),
    wireLength: read("wireLength"),
    occupiedArea: read("occupiedArea"),
  }
}

function readEdges(entry: Record<string, unknown>, id: string, file: string): readonly string[] {
  const edges = readList(entry, "doesNotExcuse", id, file)
  if (edges.length < BASELINE_EDGES_REQUIRED) {
    refuse(
      "baselines-thin-edges",
      `the baseline ${id} states ${edges.length} edge(s) in "doesNotExcuse" and at least ` +
        `${BASELINE_EDGES_REQUIRED} are required. The three this registry's design named: it is ` +
        "not a pass, it does not travel to a different serialization, and it does not excuse any " +
        "hard geometric check. An entry with two has thought about two ways of being misread and " +
        "this one has three.",
      file,
    )
  }
  const text = edges.join(" ")
  for (const name of BASELINE_REQUIRED_EDGE_NAMES) {
    if (!text.includes(name)) {
      refuse(
        "baselines-edge-unaddressed",
        `the baseline ${id} nowhere mentions ${name} in "doesNotExcuse", and that edge is required ` +
          "in the text. verdict (MeasureComparison, lib/schgen/readability/baseline.ts) is the one " +
          "whose absence lets four diagnostics be read as an acceptance result, which spec 3.3 " +
          "revision 4 calls a category error; layoutInputSha256 is the SCOPE, and a baseline read " +
          "as covering a block rather than a serialization would be cited for a drawing nobody " +
          "looked at. Name the symbol rather than describing it - a name is checkable against the " +
          "module that exports it and a paraphrase is not.",
        file,
      )
    }
  }
  return edges
}

function readConsumers(entry: Record<string, unknown>, id: string, file: string, repoRoot: string): readonly string[] {
  const consumers = readList(entry, "consultedBy", id, file)
  for (const consumer of consumers) {
    if (!fs.existsSync(path.join(repoRoot, consumer))) {
      refuse(
        "baselines-consumer-missing",
        `the baseline ${id} says "${consumer}" consults it, and that file is not in the repository. ` +
          "A cited consumer that does not exist is a baseline that reads as consulted and is not; " +
          "most often the file was renamed on one side only.",
        file,
      )
    }
  }
  return consumers
}

/**
 * HIS WORDS, and the readings that refuse an agent's account of them.
 *
 * **THE THREE READINGS ARE `tools/stripboard/approvals-read.ts`'s, REUSED RATHER THAN REWRITTEN**:
 * `lib/owner-words.ts` holds the predicates and the narration sweep, and the approvals loader calls
 * the same functions. The narration reading runs FIRST, which is that module's diagnosis order and
 * not a preference: a paraphrase trips both readings, and with the voice test first it is reported
 * as *nothing here is in the first or second person*, which sends a reader off to add the word *I*
 * to a sentence that is an agent's whatever its pronouns.
 *
 * **ONLY THE VOICE SHAPE IS ADMITTED HERE, AND THE NARROWING IS DELIBERATE.** The approvals loader
 * admits a second shape - a SELECTION, *"low-cut: part-walk-s1"* - added on 2026-10-17 by a
 * controller ruling **after the voice reading refused a real reply of his**. That is a measured
 * case, and there is no equivalent measured case for a baseline: nobody has yet been shown a set of
 * candidate drawings and asked to pick one. Admitting the shape anyway would be widening an
 * admission on no evidence, which is the one direction `CLAUDE.md` says not to widen in. The
 * refusal below names the shape and says that widening it is a deliberate edit with a test beside
 * it - and `isSelectionFor` is imported and called, so the cost of the narrowing is measured rather
 * than assumed: the refusal reports whether the quote WOULD have passed as a selection.
 */
function readOwnerWords(entry: Record<string, unknown>, id: string, block: string, file: string): readonly string[] {
  const words = readList(entry, "ownerWords", id, file)
  if (words.length === 0) {
    refuse(
      "baselines-no-words",
      `the baseline ${id} quotes nothing in "ownerWords". HIS WORDS ARE THE EVIDENCE AND A RECORD ` +
        "THAT MERELY ASSERTS A BASELINE IS REFUSED: a paraphrase is an agent's reconstruction, and " +
        "this entry exists so a reader can check what was actually said against what is being " +
        "claimed from it. Quote him - one utterance per entry of the list, as he typed it, typos " +
        "included - or delete the entry and report the measures with no baseline.",
      file,
    )
  }
  const joined = words.join(" ")
  const marker = narrationMarkerIn(joined)
  if (marker !== null) {
    refuse(
      "baselines-words-narrated",
      `the baseline ${id} quotes ${JSON.stringify(joined)}, which says "${marker}" - so it is a ` +
        "report ABOUT him and not a quotation OF him. He does not call himself the owner and he " +
        "does not narrate his own decisions, and this field is for what he typed rather than for " +
        'what an agent concluded from it. Put his own sentence here, or delete the entry: the ' +
        'reason belongs in "why" and the account of the decision in "note", both of which may be ' +
        "an agent's and are labelled so.",
      file,
    )
  }
  if (!isSpokenVoice(joined)) {
    const wouldBeSelection = isSelectionFor(words, block)
    refuse(
      "baselines-words-not-spoken",
      `the baseline ${id} quotes ${JSON.stringify(joined)}, and nothing in it is in the first or ` +
        "second person - no " +
        FIRST_SIX.join(", ") +
        " and none of the rest of FIRST_OR_SECOND_PERSON (lib/owner-words.ts). A quote of somebody " +
        'telling you a drawing reads well sounds like somebody talking; a line like "baseline ' +
        'accepted on the render" reads like a field being filled in. ' +
        (wouldBeSelection
          ? `It WOULD pass the SELECTION reading for block "${block}", which this registry does not ` +
            "admit: that shape was added to stripboard/render-approvals.json by a controller ruling " +
            "after the voice reading refused a real reply of his, and no equivalent case has arisen " +
            "for a baseline. If this is one, that is the ruling to get - widening it here is a " +
            "deliberate edit with a test beside it, made by somebody other than the agent whose " +
            "drawing is waiting on it."
          : "It would not pass the SELECTION reading either, so there is no near miss to report. " +
            "Nothing is accepted on the grounds that it is probably a quote; if he genuinely said " +
            "only a word that is neither shape, put it to him rather than widening " +
            "FIRST_OR_SECOND_PERSON in lib/owner-words.ts."),
      file,
    )
  }
  return words
}

/** The first six of `FIRST_OR_SECOND_PERSON`, named in the refusal so a reader sees the shape. */
const FIRST_SIX: readonly string[] = ["i", "i'm", "i've", "i'd", "me", "my"]

function isGrantor(value: string): value is BaselineGrantor {
  return BASELINE_GRANTORS.some((grantor) => grantor === value)
}

/** One entry, every field read BY NAME and nothing spread. */
export function readEntry(value: unknown, index: number, file: string, repoRoot: string): ReadabilityBaseline {
  if (!isRecord(value)) {
    refuse(
      "baselines-entry-not-an-object",
      `baseline ${index} is ${kindOf(value)} and every entry must be a JSON object carrying ` +
        `${BASELINE_ENTRY_KEYS.length} fields: ${BASELINE_ENTRY_KEYS.join(", ")}.`,
      file,
    )
  }
  const rawId = value["id"]
  const id = typeof rawId === "string" && rawId.trim() !== "" ? `"${rawId}"` : `at position ${index}`

  for (const key of Object.keys(value)) {
    if (!BASELINE_ENTRY_KEYS.some((known) => known === key)) {
      refuse(
        "baselines-unknown-entry-key",
        `the baseline ${id} carries "${key}", which is not a baseline field. Schema ` +
          `${BASELINES_SCHEMA} names exactly: ${BASELINE_ENTRY_KEYS.join(", ")}. A key the loader ` +
          "drops is a qualification somebody believes is recorded and nothing reads.",
        file,
      )
    }
  }
  for (const key of BASELINE_ENTRY_KEYS) {
    if (!(key in value)) refuse("baselines-missing-field", `the baseline ${id} has no "${key}". ${NOT_DEFAULTED}`, file)
  }

  const grantedBy = readText(value, "grantedBy", id, file)
  if (!isGrantor(grantedBy)) {
    refuse(
      "baselines-unknown-grantor",
      `the baseline ${id} was granted by "${grantedBy}", and only ${BASELINE_GRANTORS.join(", ")} ` +
        "may grant one. AN AGENT MAY NEVER AUTHOR THE ACCEPTANCE CRITERIA FOR THE ARTIFACT IT IS " +
        "PRODUCING (CLAUDE.md, and docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md), " +
        "and an agent that could enter its own drawing's numbers as the reference would be " +
        "authoring the criterion outright - the failure CLAUDE.md describes as an agent building " +
        "the intent from the artifact it had already produced and then checking the artifact " +
        `against it. Nothing is substituted: show him the render, and record what he says in ` +
        `${BASELINES_FILE}.`,
      file,
    )
  }

  const block = readText(value, "block", id, file)
  return {
    id: readText(value, "id", id, file),
    circuit: readText(value, "circuit", id, file),
    block,
    layoutInputSha256: readHash(readText(value, "layoutInputSha256", id, file), id, file),
    measures: readMeasures(value, id, file),
    why: readText(value, "why", id, file),
    grantedBy,
    grantedOn: readGrantedOn(readText(value, "grantedOn", id, file), id, file),
    ownerWords: readOwnerWords(value, id, block, file),
    doesNotExcuse: readEdges(value, id, file),
    consultedBy: readConsumers(value, id, file, repoRoot),
    note: readText(value, "note", id, file),
  }
}

