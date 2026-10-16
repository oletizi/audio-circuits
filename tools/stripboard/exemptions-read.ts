/**
 * THE REFUSAL VOCABULARY FOR `stripboard/exemptions.json`, AND THE READER FOR
 * ONE ENTRY - every clause that can refuse below the registry level.
 *
 * **ITS OWN FILE FOR THE 500-LINE CEILING, SPLIT AT THE ENTRY/REGISTRY SEAM.**
 * `./exemptions.ts` answers *what is in the file* - the schema, the entry list,
 * the notes block, and `loadExemptions` - and this one answers *is this one
 * entry well formed*, which is where two dozen of the refusals live. The seam is
 * the same one `./exemptions-consult.ts` is on the other side of: load, then
 * consult.
 *
 * **THE DANGEROUS DEFAULT IS "EXEMPT", which is why there are so many clauses
 * and why not one of them substitutes a value.** An exemption this module
 * completed for a reader would be a hard placement rule switched off by nobody.
 * Every refusal names what is missing, where to fix it, and why nothing is
 * filled in.
 *
 * **NOTHING HERE IS A WAY INTO THE DATA.** `loadExemptions` in
 * `./exemptions.ts` is the only one, and these functions are its parts.
 */
import fs from "node:fs"
import path from "node:path"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import {
  EDGES_REQUIRED,
  ENTRY_KEYS,
  EXEMPTABLE_RULES,
  EXEMPTIONS_SCHEMA,
  GRANTORS,
  SOUNDNESS_PREDICATE,
  SUBJECT_KINDS,
  TOP_LEVEL_KEYS,
  type Exemption,
  type ExemptableRule,
  type Grantor,
  type SubjectKind,
} from "./exemptions-model.ts"

/** What a value is, for a refusal that has to name it. */
export function kindOf(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (Array.isArray(value)) return "an array"
  return `a ${typeof value}`
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * An array whose entries are still unknown. `Array.isArray` on an `unknown`
 * narrows to `any[]`, which would let every entry past the type checker
 * untyped, so the element type is stated and each entry is proven below.
 */
export function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value)
}

function isExemptableRule(value: string): value is ExemptableRule {
  return EXEMPTABLE_RULES.some((rule) => rule === value)
}

function isSubjectKind(value: string): value is SubjectKind {
  return SUBJECT_KINDS.some((kind) => kind === value)
}

function isGrantor(value: string): value is Grantor {
  return GRANTORS.some((grantor) => grantor === value)
}

/**
 * Every refusal in this module, in one shape: a kebab-case code, then what is
 * wrong, then why nothing is substituted, then the file.
 *
 * THE CODE FIRST is deliberate and the tests depend on it, for the reason
 * `./rules.ts` gives: two dozen refusals over a file where every message
 * mentions the same words, so an assertion matching loosely would pass against
 * its neighbour.
 */
export function refuse(code: string, detail: string, file: string): never {
  throw new Error(`${code}: ${detail} In ${file}.`)
}

/** The sentence a missing value gets, because the dangerous default is "exempt". */
export const NOT_DEFAULTED =
  "It is NOT defaulted: an exemption this loader completed for you would be a hard placement " +
  "rule switched off by nobody, and the registry exists so a rule is only ever excused on the " +
  "owner's recorded word. Supply it, or delete the entry."

/** Read one required top-level value, refusing absence rather than defaulting it. */
export function present(parsed: Record<string, unknown>, key: string, file: string): unknown {
  if (!(key in parsed)) {
    refuse("exemptions-missing-key", `"${key}" is absent. ${NOT_DEFAULTED}`, file)
  }
  return parsed[key]
}

/** The declared schema version, which must be the one this loader reads. */
export function readSchema(parsed: Record<string, unknown>, file: string): 1 {
  const value = present(parsed, "schema", file)
  if (value !== EXEMPTIONS_SCHEMA) {
    refuse(
      "exemptions-schema",
      `"schema" must be exactly ${EXEMPTIONS_SCHEMA}, got ${JSON.stringify(value)}. Schema ` +
        `${EXEMPTIONS_SCHEMA} names the fields this loader reads and the rules it admits; ` +
        "reading another version as if it were this one would accept an exemption nobody " +
        "reviewed. No version is assumed when the field disagrees.",
      file,
    )
  }
  return EXEMPTIONS_SCHEMA
}

/** Refuse any top-level key schema 1 does not name, by name. */
export function rejectUnknown(parsed: Record<string, unknown>, file: string): void {
  for (const key of Object.keys(parsed)) {
    if (!TOP_LEVEL_KEYS.includes(key)) {
      refuse(
        "exemptions-unknown-key",
        `"${key}" is not part of a stripboard exemptions file. Schema ${EXEMPTIONS_SCHEMA} names ` +
          `exactly: ${TOP_LEVEL_KEYS.join(", ")}. An unknown key is refused rather than ignored, ` +
          "because a key the loader drops is an exemption somebody believes is recorded and " +
          "nothing reads - which is how a board comes to be excused by a file nobody consults.",
        file,
      )
    }
  }
}

/** One required text field of one entry, non-blank. */
function readText(
  entry: Record<string, unknown>,
  key: string,
  id: string,
  file: string,
): string {
  const value = entry[key]
  if (typeof value !== "string") {
    refuse(
      "exemptions-field-type",
      `the exemption ${id} has "${key}" as ${kindOf(value)}, and it must be a string. ` +
        NOT_DEFAULTED,
      file,
    )
  }
  if (value.trim() === "") {
    refuse(
      "exemptions-blank-field",
      `the exemption ${id} has a blank "${key}", which records nothing. An exemption the owner ` +
        'granted specifically so it would "carry a reason and provenance" cannot carry a blank ' +
        "one; nothing is written for you.",
      file,
    )
  }
  return value
}

/** One required list-of-strings field of one entry. */
function readList(
  entry: Record<string, unknown>,
  key: string,
  id: string,
  file: string,
): readonly string[] {
  const value = entry[key]
  if (!isUnknownArray(value)) {
    refuse(
      "exemptions-field-type",
      `the exemption ${id} has "${key}" as ${kindOf(value)}, and it must be an array of ` +
        `strings. ${NOT_DEFAULTED}`,
      file,
    )
  }
  const items: string[] = []
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string") {
      refuse(
        "exemptions-field-type",
        `the exemption ${id} has "${key}"[${index}] as ${kindOf(item)}, and every entry must be ` +
          "a string.",
        file,
      )
    }
    if (item.trim() === "") {
      refuse(
        "exemptions-blank-field",
        `the exemption ${id} has a blank "${key}"[${index}], which records nothing.`,
        file,
      )
    }
    items.push(item)
  }
  return items
}

/** The rules this entry is from: at least one, each whitelisted, all distinct. */
function readFrom(
  entry: Record<string, unknown>,
  id: string,
  file: string,
): readonly ExemptableRule[] {
  const named = readList(entry, "from", id, file)
  if (named.length === 0) {
    refuse(
      "exemptions-no-rules",
      `the exemption ${id} names no rule it is from, so it excuses nothing and reads as if it ` +
        "excused everything. An exemption is from NAMED rules or it is not an exemption.",
      file,
    )
  }
  const rules: ExemptableRule[] = []
  for (const name of named) {
    if (!isExemptableRule(name)) {
      refuse(
        "exemptions-unknown-rule",
        `the exemption ${id} is from "${name}", which is not an exemptable rule. Exactly ` +
          `${EXEMPTABLE_RULES.join(" and ")} may be exempted - the two HARD placement rules in ` +
          "lib/stripboard/seed-area.ts, both of them the owner's directives. The whitelist is " +
          "short on purpose and widening it is a deliberate edit to EXEMPTABLE_RULES in " +
          `tools/stripboard/exemptions-model.ts with a test beside it. ${SOUNDNESS_PREDICATE} is ` +
          "deliberately NOT in it and must not be added: electrical soundness is a different " +
          "claim from how hard a board was to build, and a board that is not the circuit is not " +
          "a board anybody wanted exempted.",
        file,
      )
    }
    if (rules.includes(name)) {
      refuse(
        "exemptions-duplicate-rule",
        `the exemption ${id} names "${name}" twice. One mention is the exemption; a second is a ` +
          "list that has been edited twice and reconciled never.",
        file,
      )
    }
    rules.push(name)
  }
  return rules
}

/** The edges: at least two, and electrical soundness among them by name. */
function readEdges(
  entry: Record<string, unknown>,
  id: string,
  file: string,
): readonly string[] {
  const edges = readList(entry, "doesNotExcuse", id, file)
  if (edges.length < EDGES_REQUIRED) {
    refuse(
      "exemptions-thin-edges",
      `the exemption ${id} states ${edges.length} edge(s) in "doesNotExcuse" and at least ` +
        `${EDGES_REQUIRED} are required. The two the owner's grant was designed around: an ` +
        "exemption is about one specific as-built artifact and does NOT travel to a board the " +
        "tooling generates, and it does not excuse electrical soundness. An entry with one edge " +
        "has thought about one way of being misread.",
      file,
    )
  }
  if (!edges.join(" ").includes(SOUNDNESS_PREDICATE)) {
    refuse(
      "exemptions-soundness-unaddressed",
      `the exemption ${id} nowhere says that it does not excuse ${SOUNDNESS_PREDICATE}, and that ` +
        "edge is required in the text. It is the one whose absence is dangerous: a reader " +
        "taking an exemption to cover soundness has read it as excusing a board that is not the " +
        "circuit, which no exemption here means and none may mean. Name the symbol rather than " +
        "describing it - a name is checkable against the module that exports it " +
        "(lib/stripboard/invariants.ts) and a paraphrase is not.",
      file,
    )
  }
  return edges
}

/** The consumers: at least one, each a file that is really on disk. */
function readConsumers(
  entry: Record<string, unknown>,
  id: string,
  file: string,
): readonly string[] {
  const consumers = readList(entry, "consultedBy", id, file)
  if (consumers.length === 0) {
    refuse(
      "exemptions-no-consumer",
      `the exemption ${id} names nothing in "consultedBy". An exemption nobody reads is a rule ` +
        "nobody enforces, hiding in a file that looks like governance - so an entry states the " +
        "repository-relative paths that really consult it, and " +
        "tests/stripboard/exemptions.test.ts proves each one reaches this loader.",
      file,
    )
  }
  for (const consumer of consumers) {
    if (!fs.existsSync(path.join(moduleRepoRoot(), consumer))) {
      refuse(
        "exemptions-consumer-missing",
        `the exemption ${id} says "${consumer}" consults it, and that file is not in the ` +
          "repository. A cited consumer that does not exist is an exemption that reads as " +
          "enforced and is not; most often the file was renamed on one side only.",
        file,
      )
    }
  }
  return consumers
}

/** The grant date: ISO `yyyy-mm-dd`, and a date that exists. */
function readGrantedOn(value: string, id: string, file: string): string {
  const parsed = Date.parse(`${value}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed)) {
    refuse(
      "exemptions-granted-on",
      `the exemption ${id} was granted on "${value}", which is not a date in yyyy-mm-dd. The ` +
        "day is half of the provenance - it is what lets a reader find the conversation the " +
        "grant came out of - so it is not accepted in whatever shape it arrives in.",
      file,
    )
  }
  if (!new Date(parsed).toISOString().startsWith(value)) {
    refuse(
      "exemptions-granted-on",
      `the exemption ${id} was granted on "${value}", which is a well-shaped date that does not ` +
        "exist. Nothing is rounded to a neighbouring day.",
      file,
    )
  }
  return value
}

/** One entry, every field read BY NAME and nothing spread. */
export function readEntry(value: unknown, index: number, file: string): Exemption {
  if (!isRecord(value)) {
    refuse(
      "exemptions-entry-not-an-object",
      `exemption ${index} is ${kindOf(value)} and every entry must be a JSON object carrying ` +
        `${ENTRY_KEYS.length} fields: ${ENTRY_KEYS.join(", ")}.`,
      file,
    )
  }
  const rawId = value["id"]
  const id = typeof rawId === "string" && rawId.trim() !== "" ? `"${rawId}"` : `at position ${index}`

  for (const key of Object.keys(value)) {
    if (!ENTRY_KEYS.some((known) => known === key)) {
      refuse(
        "exemptions-unknown-entry-key",
        `the exemption ${id} carries "${key}", which is not an exemption field. Schema ` +
          `${EXEMPTIONS_SCHEMA} names exactly: ${ENTRY_KEYS.join(", ")}. A key the loader drops ` +
          "is a qualification somebody believes is recorded and nothing reads.",
        file,
      )
    }
  }
  for (const key of ENTRY_KEYS) {
    if (!(key in value)) {
      refuse(
        "exemptions-missing-field",
        `the exemption ${id} has no "${key}". ${NOT_DEFAULTED}`,
        file,
      )
    }
  }

  const subjectKind = readText(value, "subjectKind", id, file)
  if (!isSubjectKind(subjectKind)) {
    refuse(
      "exemptions-unknown-subject-kind",
      `the exemption ${id} is over a "${subjectKind}", which is not a kind of subject this ` +
        `registry knows. Exactly these are: ${SUBJECT_KINDS.join(", ")}. There is deliberately ` +
        "no kind for a board the tooling generates - such a board is held to both rules in " +
        "full, so a kind that could name one would be a way to exempt the thing the rules exist " +
        "for.",
      file,
    )
  }
  const grantedBy = readText(value, "grantedBy", id, file)
  if (!isGrantor(grantedBy)) {
    refuse(
      "exemptions-unknown-grantor",
      `the exemption ${id} was granted by "${grantedBy}", and only ${GRANTORS.join(", ")} may ` +
        "grant one. An agent may never author the acceptance criteria for the artifact it is " +
        "producing (docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md), and an " +
        "agent that could grant an exemption FROM a criterion would be authoring that criterion " +
        "by subtraction. Nothing is substituted: route the grant through him.",
      file,
    )
  }

  return {
    id: readText(value, "id", id, file),
    subject: readText(value, "subject", id, file),
    subjectKind,
    from: readFrom(value, id, file),
    why: readText(value, "why", id, file),
    grantedBy,
    grantedOn: readGrantedOn(readText(value, "grantedOn", id, file), id, file),
    ownerWords: readText(value, "ownerWords", id, file),
    doesNotExcuse: readEdges(value, id, file),
    consultedBy: readConsumers(value, id, file),
    note: readText(value, "note", id, file),
  }
}