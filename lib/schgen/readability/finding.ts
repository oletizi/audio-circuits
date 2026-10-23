/**
 * SPEC §3.5's READABILITY FINDING CONTRACT: the FORM of a finding, and nothing whatever about its
 * CONTENT.
 *
 * Hand-written for Task 16 of the M1 schematic-authoring plan.
 *
 * **NOTHING IN THIS MODULE SAYS WHAT THE FINDINGS SHOULD BE, HOW MANY THERE SHOULD BE, OR WHAT
 * CATEGORIES THEY FALL INTO. THE FIVE FIELDS ARE THE CONTRACT.** That sentence is §3.5's own, and
 * it is the whole purpose of this file: there is no list of defect classes here, no enumeration of
 * things to look for, no expected count, and no severity policy. A reviewing agent is handed the
 * CRITERION - *can you follow this block from the drawing alone?* - and never the list.
 *
 * **THE MEASUREMENT THAT MAKES THAT A RULE RATHER THAN A PREFERENCE** (`docs/known-gaps.md`
 * **G83**). The readability gate this program would otherwise copy pre-named its reviewer's defect
 * categories in the dispatch prompt - *"text overlapping or too close; labels or notes naming parts
 * by ids that are not on the drawing; ... wasted space that forces a large paper size; a 'do not
 * populate' cross that hides pin numbers; unclear supply arrows; wide bus legends"* - and set
 * against the twenty defects reported, **five map onto that list almost one-to-one**. So the
 * reviewer was independent of the SOURCE and not of the producing controller's expectations, which
 * `CLAUDE.md` names as the producing side choosing what the checks are. **A prompt is the easiest
 * part of a gate to clone and the easiest place to smuggle the producing side's expectations in.**
 *
 * **AND THE OTHER HALF, WHICH IS WHY A FORM IS SPECIFIED AT ALL** (§3.5, revision 1, finding 8):
 * withholding the categories stops the reviewer being led and does nothing to stop a VAGUE finding.
 * *"The mid sheet is hard to follow"* is unactionable and unfalsifiable. So the five fields are
 * exactly §3.5's five rows, each with that section's reason:
 *
 * | field | why |
 * | --- | --- |
 * | `where` | a finding nobody can locate cannot be fixed or disputed |
 * | `misreading` | not *"this is unclear"* but *"a reader would take this wire as joining C3 to the coil return"* |
 * | `classification` | they go to different places: an electrical error is a generator defect; a readability problem is graded against the criteria |
 * | `evidence` | the render, the crop, the coordinates - whatever makes a second reader able to look at the same thing |
 * | `severity` | 16 of 19 cosmetic defects were knowingly shipped at the source project; that is a legitimate outcome only if the reviewer said which were which |
 *
 * **AND THE REVIEWER MAY NOT SILENTLY MODIFY THE ACCEPTANCE CRITERIA.** §3.5: a reviewer that adds
 * a constraint it then grades against *"has authored the criteria for the artifact in front of it -
 * the governing invariant, one level up from where it is usually caught. A recurring new failure
 * mode is a PROPOSED ADDITION to the standing rule library, subject to independent review, and
 * never an automatically accepted constraint."* **`parseFindings` therefore refuses a finding that
 * carries a criterion of its own**, by name, and says where a proposal belongs instead. The
 * proposal is a legitimate and wanted output; the automatic acceptance is the failure.
 */

/** Blocking, or a suggestion: §3.5 requires the reviewer to say which, and never to leave it open. */
export type FindingSeverity = "blocking" | "suggestion"

export const FINDING_SEVERITIES: readonly FindingSeverity[] = ["blocking", "suggestion"]

/**
 * An electrical error or a readability problem.
 *
 * **IT IS A CLASSIFICATION OF WHERE THE FINDING GOES AND NOT A DEFECT CATEGORY**, which is the
 * distinction that keeps these two values from being the start of a hint list. §3.5: *"they go to
 * different places: an electrical error is a generator defect; a readability problem is graded
 * against the criteria."* Nothing here says what kinds of electrical error or what kinds of
 * readability problem exist, and a third value would need a third destination to justify it.
 */
export type FindingClass = "electrical-error" | "readability-problem"

export const FINDING_CLASSES: readonly FindingClass[] = ["electrical-error", "readability-problem"]

export interface ReadabilityFinding {
  /** The affected sheet or region. */
  readonly where: string
  /** Stated AS the misreading, not as "this is unclear". */
  readonly misreading: string
  readonly classification: FindingClass
  /** The render, the crop, the coordinates. */
  readonly evidence: string
  readonly severity: FindingSeverity
}

/** Exactly the five fields §3.5's table names, and no sixth. */
export const FINDING_KEYS = ["where", "misreading", "classification", "evidence", "severity"] as const

/**
 * The keys a finding may NOT carry, each because it would be the reviewer authoring a criterion.
 *
 * **THIS IS NOT A HINT LIST IN DISGUISE, AND THE TEST IS WHICH DIRECTION IT POINTS.** A hint list
 * tells the reviewer what to LOOK FOR, which biases the only independent reader (G83). These are
 * keys the reviewer may not SUPPLY, which bias nothing: refusing them removes a reviewer's ability
 * to grade against a rule it wrote, and adds no expectation about what it should find.
 *
 * `criterion`, `rule` and `requirement` are the three shapes a reviewer in a hurry actually
 * writes - a finding that states its own standard and then reports the drawing as failing it.
 * `proposedRule` is here too, and its refusal is the one that says where a proposal DOES belong:
 * the proposal is wanted, and it belongs in a reviewed addition to the standing rule library, not
 * in the finding that would be graded against it.
 */
export const FORBIDDEN_FINDING_KEYS = ["criterion", "criteria", "rule", "requirement", "proposedRule", "threshold"] as const

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

const kindOf = (v: unknown): string => {
  if (v === null) return "null"
  if (v === undefined) return "undefined"
  if (Array.isArray(v)) return "an array"
  return `a ${typeof v}`
}

function refuse(code: string, detail: string, file: string): never {
  throw new Error(`${code}: ${detail} In ${file}.`)
}

/**
 * The sentence a missing field gets.
 *
 * **THE DANGEROUS DEFAULT HERE IS A FINDING NOBODY CAN ACT ON.** A `severity` this parser filled in
 * would decide for the reviewer whether a defect blocks - the one judgement §3.5 says the reviewer
 * must make, because *"16 of 19 cosmetic defects were knowingly shipped"* at the source project and
 * *"that is a legitimate outcome only if the reviewer said which were which"*. A `where` filled in
 * would be a location nobody can check. Nothing is written for a reviewer.
 */
const NOT_DEFAULTED =
  "It is NOT defaulted: these five fields are spec 3.5's contract, and a field this parser filled " +
  "in for the reviewer would be a judgement the reviewer did not make - a severity nobody decided " +
  "or a location nobody can look at. Supply it, or drop the finding.";

function readText(entry: Record<string, unknown>, key: string, id: string, file: string): string {
  const value = entry[key]
  if (typeof value !== "string") {
    refuse("findings-field-type", `finding ${id} has "${key}" as ${kindOf(value)}, and it must be a string. ${NOT_DEFAULTED}`, file)
  }
  if (value.trim() === "") {
    refuse("findings-blank-field", `finding ${id} has a blank "${key}", which records nothing a second reader could act on.`, file)
  }
  return value
}

function isClass(v: string): v is FindingClass {
  return FINDING_CLASSES.some((known) => known === v)
}

function isSeverity(v: string): v is FindingSeverity {
  return FINDING_SEVERITIES.some((known) => known === v)
}

/**
 * One finding, every field read BY NAME, with the criterion clause refused first.
 *
 * **THE CRITERION CLAUSE RUNS BEFORE THE UNKNOWN-KEY CLAUSE, and the order is a diagnosis rather
 * than a preference.** A finding carrying `criterion` would trip both - it is an unknown key AND it
 * is a reviewer authoring a standard - and the unknown-key message says only *that is not a finding
 * field*, which sends a reader off to look for a typo. The criterion message says what the field
 * actually is and where a proposal belongs instead.
 */
function readFinding(value: unknown, index: number, file: string): ReadabilityFinding {
  if (!isRecord(value)) {
    refuse(
      "findings-not-an-object",
      `finding ${index} is ${kindOf(value)} and every finding must be a JSON object carrying ` +
        `${FINDING_KEYS.length} fields: ${FINDING_KEYS.join(", ")}.`,
      file,
    )
  }
  const rawWhere = value["where"]
  const id = typeof rawWhere === "string" && rawWhere.trim() !== "" ? `at "${rawWhere}"` : `at position ${index}`

  for (const forbidden of FORBIDDEN_FINDING_KEYS) {
    if (!(forbidden in value)) continue
    refuse(
      "findings-carries-a-criterion",
      `finding ${id} carries "${forbidden}", so it states a standard of its own and reports the ` +
        "drawing against it. A REVIEWER MAY NOT SILENTLY MODIFY THE ACCEPTANCE CRITERIA (spec 3.5): " +
        "a reviewer that adds a constraint it then grades against has authored the criteria for the " +
        "artifact in front of it, which is the governing invariant CLAUDE.md states, one level up " +
        "from where it is usually caught. The proposal is a WANTED output and is not being " +
        "discarded - a recurring new failure mode is a PROPOSED ADDITION to the standing rule " +
        "library (lib/schgen/rules/), subject to independent review by somebody other than this " +
        "reviewer, and never an automatically accepted constraint. Put the proposal there and " +
        `state this finding as the misreading it is: ${FINDING_KEYS.join(", ")} and nothing else.`,
      file,
    )
  }
  for (const key of Object.keys(value)) {
    if (!FINDING_KEYS.some((known) => known === key)) {
      refuse(
        "findings-unknown-key",
        `finding ${id} carries "${key}", which is not one of spec 3.5's five fields: ` +
          `${FINDING_KEYS.join(", ")}. An unknown key is refused rather than ignored, because a key ` +
          "the parser drops is a qualification the reviewer believes is recorded and nothing reads.",
        file,
      )
    }
  }
  for (const key of FINDING_KEYS) {
    if (!(key in value)) refuse("findings-missing-field", `finding ${id} has no "${key}". ${NOT_DEFAULTED}`, file)
  }

  const classification = readText(value, "classification", id, file)
  if (!isClass(classification)) {
    refuse(
      "findings-unknown-class",
      `finding ${id} is classified "${classification}", and a finding is exactly one of ` +
        `${FINDING_CLASSES.join(" or ")}. The two are DESTINATIONS and not defect categories: an ` +
        "electrical error is a generator defect and goes to the generator; a readability problem is " +
        "graded against the criteria (spec 3.5). A third value would need a third destination, so " +
        "widening FINDING_CLASSES in lib/schgen/readability/finding.ts is a deliberate edit with a " +
        "test beside it.",
      file,
    )
  }
  const severity = readText(value, "severity", id, file)
  if (!isSeverity(severity)) {
    refuse(
      "findings-unknown-severity",
      `finding ${id} has severity "${severity}", and it must be ${FINDING_SEVERITIES.join(" or ")}. ` +
        "It is not inferred from the classification and it is not defaulted: at the source project " +
        "16 of 19 cosmetic defects were knowingly shipped, and spec 3.5 says that is a legitimate " +
        "outcome only if the reviewer said which were which.",
      file,
    )
  }
  return {
    where: readText(value, "where", id, file),
    misreading: readText(value, "misreading", id, file),
    classification,
    evidence: readText(value, "evidence", id, file),
    severity,
  }
}

/**
 * A reviewer's findings, read strictly from their text.
 *
 * **AN EMPTY LIST IS ACCEPTED AND IS NOT THE SAME AS A MISSING ONE.** A reviewer that read a sheet
 * and found nothing has reported something; a report with no `findings` key at all has not run, and
 * the two must not look alike. **AND THE COUNT IS NEVER CHECKED**: nothing here says how many
 * findings there should be, because a parser with an expected count is a parser telling the
 * reviewer how much to find, which is G83's failure wearing a schema's clothes.
 */
export function parseFindings(json: string, file: string): readonly ReadabilityFinding[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (error) {
    refuse("findings-not-json", `the readability findings are not valid JSON: ${error instanceof Error ? error.message : String(error)}.`, file)
  }
  if (!isRecord(parsed)) {
    refuse("findings-not-an-object", `a findings report must hold a JSON object at the top level, got ${kindOf(parsed)}.`, file)
  }
  for (const key of Object.keys(parsed)) {
    if (key !== "findings") {
      refuse(
        "findings-unknown-key",
        `the report carries "${key}" at the top level, and a findings report holds exactly ` +
          '"findings". A summary, a count or a verdict alongside the list is refused: spec 3.3 ' +
          "revision 4 says a measure comparison is not a verdict and spec 3.5 gives this reviewer " +
          "no verdict to report either - the findings ARE the output.",
        file,
      )
    }
  }
  if (!("findings" in parsed)) {
    refuse(
      "findings-missing-key",
      '"findings" is absent. An absent list is NOT an empty one: a reviewer that read a sheet and ' +
        "found nothing has reported something, and a report that never ran has not. Nothing is " +
        "defaulted.",
      file,
    )
  }
  const list = parsed["findings"]
  if (!Array.isArray(list)) {
    refuse("findings-not-a-list", `"findings" is ${kindOf(list)} and must be an array, one entry per finding.`, file)
  }
  const raw: readonly unknown[] = list
  return raw.map((value, index) => readFinding(value, index, file))
}
