/**
 * `stripboard/rules.json` and the strict loader that is the ONLY way in.
 *
 * WHY THIS FILE EXISTS, which is the whole point of it. The governing
 * invariant of the stripboard pipeline is that an agent may never author the
 * acceptance criteria for the artifact it produces
 * (`docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md`), and
 * the rules file is how criteria reach the optimiser WITHOUT passing through
 * the agent that runs it: every threshold, weight and bound the pipeline is
 * graded against lives there, reviewed, rather than in the code that grades.
 * CRITERIA PAR3 is the criterion; PAR4 is why there is no per-board variant.
 *
 * SO THE STRICTNESS IS NOT FUSSINESS. A loader that silently accepted an
 * unknown key, or quietly defaulted a missing one, would let the pipeline
 * grade itself against something nobody approved - the unknown key being a
 * parameter somebody believes is in force and nothing reads, the default being
 * a number that entered the criteria through the implementation. Both are
 * refused BY NAME here, and there is no default anywhere in this module.
 *
 * NULL IS A VALUE AND NOT AN ABSENCE. `tau` (CRITERIA K4) and
 * `worseAcceptance` (PIPELINE E3) are deliberately unset, and both are written
 * `null` with their keys REQUIRED, so "unset on purpose, and here is why" is
 * distinguishable from "left out by accident".
 *
 * The shape follows the sibling repository's `placement-rules.json` and its
 * `rejectUnknown`/`requireNumber` loader (PIPELINE R1); the vocabulary is this
 * project's own.
 */
import fs from "node:fs"
import path from "node:path"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"

/**
 * The one committed rules file, absolute - computed once, because G2.2 hashes
 * its content into the run manifest and a canonical hash has to hash one
 * thing. A second way to name this file would be a second file to that hash.
 */
export const RULES_PATH = path.join(moduleRepoRoot(), "stripboard", "rules.json")

/** The only schema version this loader reads. */
export const RULES_SCHEMA = 1

export interface StripboardRules {
  readonly schema: 1
  /** CRITERIA PAR1's `rho_w`: what one wire bridge costs against one cut. */
  readonly rhoWire: number
  /** CRITERIA PAR1's `rho_s`: what one solder bridge costs. */
  readonly rhoSolder: number
  /** CRITERIA K2's `kappa_bench`: the clustering bound A2 applies. */
  readonly kappaBench: number
  /**
   * CRITERIA K4's `tau`, the floor tolerance - `null` while it is UNSET, which
   * is the owner's decision and not an omission. While it is null, Q2 and A3
   * do not fire.
   */
  readonly tau: number | null
  /** CRITERIA Q4's `k`, the diminishing-returns ratio. A labelled hypothesis. */
  readonly yieldFloor: number
  /** CRITERIA Q5's run-level evaluation budget - a backstop, not a target. */
  readonly evaluationCap: number
  /** CRITERIA Q6's run length: how many results must share a failure signature. */
  readonly signatureRun: number
  /** PIPELINE R7/E2's seed list, which the restart schedule is derived from. */
  readonly seeds: readonly number[]
  /**
   * PIPELINE E3's bound on accepting a worse candidate - `null` meaning the
   * mechanism DOES NOT RUN, because no source supplies a schedule and none is
   * invented.
   */
  readonly worseAcceptance: number | null
  /** CRITERIA HC6's stock, in strips. */
  readonly stockRows: number
  /** CRITERIA HC6's stock, in columns. */
  readonly stockCols: number
  /** One entry per parameter, recording why the number is what it is. */
  readonly notes: Readonly<Record<string, string>>
}

/** The eleven parameters, in the order the committed file carries them. */
const PARAMETERS = [
  "rhoWire",
  "rhoSolder",
  "kappaBench",
  "tau",
  "yieldFloor",
  "evaluationCap",
  "signatureRun",
  "seeds",
  "worseAcceptance",
  "stockRows",
  "stockCols",
] as const

/** Every key a schema-1 file may carry, and no other. */
const TOP_LEVEL_KEYS: readonly string[] = ["schema", ...PARAMETERS, "notes"]

type Parameter = (typeof PARAMETERS)[number]

/**
 * The two parameters that may be null - a union rather than a runtime list, so
 * that reading a third as nullable does not compile until `NULLABLE` below
 * says what the pipeline does while that one is unset.
 */
type NullableParameter = "tau" | "worseAcceptance"

/** Every parameter that is a single number - which is all of them but the seed list. */
type NumericParameter = Exclude<Parameter, "seeds">

/**
 * What a numeric parameter must be, and WHY the bound is where it is.
 *
 * `why` is spliced into the refusal, because a range that refuses without
 * saying what it is protecting is a range the next person widens. Every one of
 * these comes from a criterion, named in the text.
 */
interface NumberSpec {
  readonly integer: boolean
  /** Inclusive. A value below this is refused. */
  readonly min: number
  /** Inclusive, when present. */
  readonly max?: number
  readonly why: string
}

const NUMBERS: Readonly<Record<NumericParameter, NumberSpec>> = {
  rhoWire: {
    integer: false,
    min: Number.MIN_VALUE,
    why:
      "CRITERIA PAR1 prices a wire against a cut, so a weight of zero or less would " +
      "make wires free or profitable and F would stop being a cost",
  },
  rhoSolder: {
    integer: false,
    min: Number.MIN_VALUE,
    why:
      "CRITERIA PAR1 prices a solder bridge as comparable to one cut, so a weight of " +
      "zero or less would make bridges free or profitable",
  },
  kappaBench: {
    integer: false,
    min: Number.MIN_VALUE,
    max: 1,
    why:
      "kappa = J/(P - N) lies in [0, 1] (CRITERIA K1), so a bound above 1 refuses " +
      "nothing; and a bound of 0 would refuse a layout AT THE FLOOR, which sits at " +
      "kappa = 0 - K2 rests on A2 being unable to refuse a provably optimal layout",
  },
  tau: {
    integer: false,
    min: Number.MIN_VALUE,
    max: 1,
    why:
      "the tolerance is (F - F_floor)/max(1, F_0 - F_floor) < tau (CRITERIA K4), a " +
      "fraction of the gap to the derived floor, so 0 passes nothing and 1 passes " +
      "everything the search started from",
  },
  yieldFloor: {
    integer: false,
    min: Number.MIN_VALUE,
    why:
      "Q4 stops when g/r > k*e (CRITERIA Q4) and k is a ratio of effort to effort, so " +
      "k <= 0 stops the search on its first evaluation",
  },
  evaluationCap: {
    integer: true,
    min: 1,
    why:
      "Q5 is a run-level backstop against a looping bug (CRITERIA Q5), and a cap below " +
      "one evaluation stops a run before it has scored anything",
  },
  signatureRun: {
    integer: true,
    min: 2,
    why:
      "Q6 stops on a REPEATED failure (CRITERIA Q6), so a run length of 1 compares a " +
      "signature with nothing and stops on the first failure of any kind",
  },
  stockRows: {
    integer: true,
    min: 1,
    why: "HC6's stock is a physical board, measured in whole strips (CRITERIA HC6)",
  },
  stockCols: {
    integer: true,
    min: 1,
    why: "HC6's stock is a physical board, measured in whole columns (CRITERIA HC6)",
  },
  worseAcceptance: {
    integer: false,
    min: Number.MIN_VALUE,
    why:
      "E3 accepts a worse candidate WITHIN a bound (PIPELINE E3), so a bound of 0 or " +
      'less accepts nothing worse - which is the mechanism not running, and that state ' +
      "is written null so there is exactly one spelling of it",
  },
}

/**
 * What null MEANS for each parameter that may be it - keyed by
 * `NullableParameter`, so the compiler requires an entry: unset without a
 * statement of what the pipeline then does is a silent change of behaviour,
 * which is the opposite of what null records here.
 */
const NULLABLE: Readonly<Record<NullableParameter, string>> = {
  tau: "null means the floor tolerance is UNSET (CRITERIA K4), so Q2 and A3 do not fire",
  worseAcceptance: "null means E3 does not run and the report says so (PIPELINE E3)",
}

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
