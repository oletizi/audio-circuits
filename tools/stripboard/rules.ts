/**
 * The STRICT LOADER for `stripboard/rules.json`, and the ONLY way in.
 *
 * WHY THE STRICTNESS IS NOT FUSSINESS. A loader that silently accepted an
 * unknown key, or quietly defaulted a missing one, would let the pipeline grade
 * itself against something nobody approved - the unknown key being a parameter
 * somebody believes is in force and nothing reads, the default being a number
 * that entered the criteria through the implementation. Both are refused BY NAME
 * here, and there is no default anywhere in this module.
 *
 * **WHAT THE RULES ARE IS IN `./rules-model.ts`** - the path, the schema
 * version, the eleven parameters, their ranges and what `null` means for the two
 * that may be it. That file was split out at the what-it-is / what-reading-it-
 * does seam this area already draws four times (`stop-model`, `place-model`,
 * `climb-model`, `adopt-model`), and because this file had passed the 500-line
 * ceiling by two. The three declarations consumers use are re-exported below, so
 * every existing import of `RULES_PATH`, `RULES_SCHEMA` or `StripboardRules`
 * from here still resolves.
 *
 * The shape follows the sibling repository's `placement-rules.json` and its
 * `rejectUnknown`/`requireNumber` loader (PIPELINE R1); the vocabulary is this
 * project's own.
 */
import fs from "node:fs"
import path from "node:path"
import {
  NULLABLE,
  NUMBERS,
  PARAMETERS,
  RULES_PATH,
  RULES_SCHEMA,
  TOP_LEVEL_KEYS,
  type NullableParameter,
  type NumericParameter,
  type StripboardRules,
} from "./rules-model.ts"

export { RULES_PATH, RULES_SCHEMA, type StripboardRules } from "./rules-model.ts"


/** What a value is, for a refusal that has to name it. */
function kindOf(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (Array.isArray(value)) return "an array"
  return `a ${typeof value}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * An array whose entries are still unknown. `Array.isArray` on an `unknown`
 * narrows to `any[]`, which would let every entry past the type checker
 * untyped, so the element type is stated and each entry proven a number.
 */
function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value)
}

/**
 * Every refusal in this module, in one shape: a kebab-case code, then the key,
 * then what was expected, then why nothing is defaulted, then the file.
 *
 * The CODE FIRST is deliberate and the tests depend on it: this module raises
 * seventeen refusals and several are near-identical in wording - unknown key,
 * missing key, wrong type, out of range, three ways a seed list can be wrong,
 * four ways a note can be - over a file where every message mentions the same
 * key names. A test matching one loosely would pass against its neighbour, so
 * the code is the opening clause and each assertion anchors on it.
 */
function refuse(code: string, detail: string, file: string): never {
  throw new Error(`${code}: ${detail} In ${file}.`)
}

/** The sentence every missing or absent value gets, because none is defaulted. */
const NOT_DEFAULTED =
  "It is NOT defaulted: a number this loader filled in would be a criterion the " +
  "pipeline grades itself against without review, which is the invariant " +
  "stripboard/rules.json exists to keep. Supply it, or - for tau and " +
  "worseAcceptance - write null to record it as deliberately unset."

/** Read one required raw value, refusing absence rather than defaulting it. */
function present(parsed: Record<string, unknown>, key: string, file: string): unknown {
  if (!(key in parsed)) {
    refuse("rules-missing-key", `"${key}" is absent. ${NOT_DEFAULTED}`, file)
  }
  return parsed[key]
}

/**
 * Apply one `NumberSpec` to a value already known to be a number. `NUMBERS` is
 * keyed by `NumericParameter`, so a parameter with no stated range is a
 * compile error rather than a runtime guard no test could ever drive.
 */
function checkRange(value: number, key: NumericParameter, file: string): number {
  const spec = NUMBERS[key]
  if (!Number.isFinite(value)) {
    refuse("rules-range", `"${key}" must be a finite number, got ${value}.`, file)
  }
  if (spec.integer && !Number.isInteger(value)) {
    refuse("rules-range", `"${key}" must be a whole number, got ${value}. ${spec.why}.`, file)
  }
  if (value < spec.min) {
    const floor = spec.min === Number.MIN_VALUE ? "greater than 0" : `at least ${spec.min}`
    refuse("rules-range", `"${key}" must be ${floor}, got ${value}. ${spec.why}.`, file)
  }
  if (spec.max !== undefined && value > spec.max) {
    refuse("rules-range", `"${key}" must be at most ${spec.max}, got ${value}. ${spec.why}.`, file)
  }
  return value
}

/** One required number, with its range applied. */
function readNumber(parsed: Record<string, unknown>, key: NumericParameter, file: string): number {
  const value = present(parsed, key, file)
  if (typeof value !== "number") {
    refuse(
      "rules-type",
      `"${key}" must be a number, got ${kindOf(value)}. ${NOT_DEFAULTED}`,
      file,
    )
  }
  return checkRange(value, key, file)
}

/** One required number that may be null, null being a recorded decision. */
function readNullableNumber(
  parsed: Record<string, unknown>,
  key: NullableParameter,
  file: string,
): number | null {
  // FOUND BY MUTATION, and the reason `key` is typed: with `readNumber`
  // delegating here, every non-nullable key's refusal read "got a string.
  // undefined; any other ...", a message with a hole where NULLABLE had no
  // entry. `NullableParameter` makes that a compile error.
  const meaning = NULLABLE[key]
  const value = present(parsed, key, file)
  if (value === null) return null
  if (typeof value !== "number") {
    refuse(
      "rules-type",
      `"${key}" must be a number or null, got ${kindOf(value)}. ${meaning}; any other ` +
        `spelling of "off" is refused, because two spellings of one state is the ambiguity ` +
        `this file exists to prevent. ${NOT_DEFAULTED}`,
      file,
    )
  }
  return checkRange(value, key, file)
}

/** The seed list: non-empty, distinct, non-negative whole numbers. */
function readSeeds(parsed: Record<string, unknown>, file: string): readonly number[] {
  const value = present(parsed, "seeds", file)
  if (!isUnknownArray(value)) {
    refuse("rules-type", `"seeds" must be an array of numbers, got ${kindOf(value)}.`, file)
  }
  if (value.length === 0) {
    refuse(
      "rules-seeds-empty",
      '"seeds" must list at least one seed. The restart schedule is derived from this list ' +
        "alone (PIPELINE E2) and Q3 fires when it is spent, so an empty list is a run with " +
        "no climb at all rather than a run with default seeds.",
      file,
    )
  }
  const seeds: number[] = []
  const seen = new Set<number>()
  for (const entry of value) {
    if (typeof entry !== "number" || !Number.isInteger(entry)) {
      refuse(
        "rules-seeds-entry",
        `"seeds" must hold whole numbers, got ${kindOf(entry)} (${String(entry)}). A seed is ` +
          "recorded per candidate and reproducibility depends on it (PIPELINE V6).",
        file,
      )
    }
    if (entry < 0) {
      refuse("rules-seeds-entry", `"seeds" must hold non-negative numbers, got ${entry}.`, file)
    }
    if (seen.has(entry)) {
      refuse(
        "rules-seeds-not-distinct",
        `"seeds" must be distinct and ${entry} appears twice. A repeated seed is a repeated ` +
          "climb from the same ordering, which spends the run-level cap (Q5) on a candidate " +
          "already evaluated while reading as another restart.",
        file,
      )
    }
    seen.add(entry)
    seeds.push(entry)
  }
  return seeds
}

/** The notes block: one non-blank string per parameter, and nothing else. */
function readNotes(parsed: Record<string, unknown>, file: string): Readonly<Record<string, string>> {
  const value = present(parsed, "notes", file)
  if (!isRecord(value)) {
    refuse("rules-notes-type", `"notes" must be a JSON object, got ${kindOf(value)}.`, file)
  }
  for (const key of Object.keys(value)) {
    if (!PARAMETERS.some((parameter) => parameter === key)) {
      refuse(
        "rules-unknown-note",
        `"notes" carries an entry for "${key}", which is not a parameter. A note for nothing ` +
          "is a reason nobody can check against a number, and most often it is a parameter " +
          "that was renamed on one side only.",
        file,
      )
    }
  }
  const notes: Record<string, string> = {}
  for (const key of PARAMETERS) {
    if (!(key in value)) {
      refuse(
        "rules-missing-note",
        `"${key}" has no entry in "notes". Every parameter carries a note recording why the ` +
          "number is what it is, because a number with no reason cannot be argued with - and " +
          "the reason is what a reviewer reads instead of re-deriving the value. It is not " +
          "defaulted and an empty note is not written for you.",
        file,
      )
    }
    const note = value[key]
    if (typeof note !== "string") {
      refuse("rules-note-type", `the note for "${key}" must be a string, got ${kindOf(note)}.`, file)
    }
    if (note.trim() === "") {
      refuse(
        "rules-blank-note",
        `the note for "${key}" is blank, which is the same as no note: it records no reason ` +
          "and leaves the number unarguable.",
        file,
      )
    }
    notes[key] = note
  }
  return notes
}

/** Refuse any key schema 1 does not name, by name. */
function rejectUnknown(parsed: Record<string, unknown>, file: string): void {
  for (const key of Object.keys(parsed)) {
    if (!TOP_LEVEL_KEYS.includes(key)) {
      refuse(
        "rules-unknown-key",
        `"${key}" is not a stripboard rules parameter. Schema ${RULES_SCHEMA} names exactly: ` +
          `${TOP_LEVEL_KEYS.join(", ")}. An unknown key is refused rather than ignored, because ` +
          "a key the loader drops is a parameter somebody believes is in force and nothing " +
          "reads - which is how a run comes to be graded against something nobody approved.",
        file,
      )
    }
  }
}

/** The declared schema version, which must be the one this loader reads. */
function readSchema(parsed: Record<string, unknown>, file: string): 1 {
  const value = present(parsed, "schema", file)
  if (value !== RULES_SCHEMA) {
    refuse(
      "rules-schema",
      `"schema" must be exactly ${RULES_SCHEMA}, got ${JSON.stringify(value)}. Schema ` +
        `${RULES_SCHEMA} names the keys this loader reads and the ranges it applies; reading ` +
        "another version as if it were this one would accept a parameter set nobody reviewed. " +
        "No version is assumed when the field disagrees.",
      file,
    )
  }
  return RULES_SCHEMA
}

/**
 * Load the stripboard rules, defaulting only the PATH and never a value. Every
 * field is read BY NAME: a spread of the parsed object would carry an unknown
 * key through and make `rejectUnknown` decorative, which is the one mistake
 * this module cannot make and still be worth having.
 */
export function loadRules(file: string = RULES_PATH): StripboardRules {
  const abs = path.resolve(file)

  let contents: string
  try {
    contents = fs.readFileSync(abs, "utf8")
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    refuse(
      "rules-unreadable",
      `the stripboard rules file could not be read: ${detail}. Nothing is defaulted when it ` +
        "is missing: a pipeline with no rules file has no reviewed parameters at all.",
      abs,
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    refuse("rules-not-json", `the stripboard rules file is not valid JSON: ${detail}.`, abs)
  }

  if (!isRecord(parsed)) {
    refuse(
      "rules-not-an-object",
      `the stripboard rules file must hold a JSON object at the top level, got ${kindOf(parsed)}.`,
      abs,
    )
  }

  const schema = readSchema(parsed, abs)
  rejectUnknown(parsed, abs)

  return {
    schema,
    rhoWire: readNumber(parsed, "rhoWire", abs),
    rhoSolder: readNumber(parsed, "rhoSolder", abs),
    kappaBench: readNumber(parsed, "kappaBench", abs),
    tau: readNullableNumber(parsed, "tau", abs),
    yieldFloor: readNumber(parsed, "yieldFloor", abs),
    evaluationCap: readNumber(parsed, "evaluationCap", abs),
    signatureRun: readNumber(parsed, "signatureRun", abs),
    seeds: readSeeds(parsed, abs),
    worseAcceptance: readNullableNumber(parsed, "worseAcceptance", abs),
    stockRows: readNumber(parsed, "stockRows", abs),
    stockCols: readNumber(parsed, "stockCols", abs),
    notes: readNotes(parsed, abs),
  }
}
