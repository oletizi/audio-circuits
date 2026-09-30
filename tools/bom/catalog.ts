/**
 * The shared parts catalog: one file per part (`parts/<id>.json`), so every
 * choice is a small, readable diff. `parseCatalogEntry` validates one entry's
 * shape - including that every spec and every `mpn` is backed by an evidence
 * entry naming it, and that a `stock` part has a stocking-pack price break
 * somewhere to buy it from. `loadCatalog` reads every entry in a directory.
 *
 * Design: docs/superpowers/specs/2026-09-30-bom-design.md
 */
import path from "node:path"
import fs from "node:fs"
import { ALL_KINDS, isKnownKind } from "../../lib/model/index.ts"
import type { ComponentKind } from "../../lib/model/types.ts"
import { isRecord } from "../perfboard/guards.ts"

export type SourceUse = "standard" | "bulk" | "specialty" | "prototype-fast"

export const SOURCE_USE_LIST = ["standard", "bulk", "specialty", "prototype-fast"] as const
const SOURCE_USE_SET: ReadonlySet<string> = new Set<string>(SOURCE_USE_LIST)

export function isSourceUse(value: string): value is SourceUse {
  return SOURCE_USE_SET.has(value)
}

export interface PriceBreak {
  readonly quantity: number
  readonly unitPrice: number
  readonly pack?: boolean
}

export interface Source {
  readonly supplier: string
  readonly url: string
  readonly sku?: string
  readonly currency: string
  /** Ascending quantity; the first break is the minimum order. */
  readonly breaks: readonly PriceBreak[]
  /** YYYY-MM-DD. */
  readonly checked: string
  readonly use: SourceUse
}

export interface Specs {
  readonly ohms?: number
  readonly farads?: number
  readonly tolerancePercent?: number
  readonly volts?: number
  readonly watts?: number
  readonly leadSpacingMm?: number
  readonly diameterMm?: number
  /** "0207", "TO-92", "RM-065", "pin-header". */
  readonly package?: string
  /** TO-92 pin order as the datasheet gives it, e.g. ["emitter", "base", "collector"]. */
  readonly pinout?: readonly string[]
  readonly pins?: number
  readonly pitchMm?: number
  readonly taper?: "linear" | "log"
}

/** Every field `Specs` declares. `everySpecKey` below turns a field added to `Specs` and
 * not to this list into a compile-time error, the same guard `lib/model/kinds.ts` uses
 * for `ALL_KINDS`. */
const SPEC_KEY_LIST = [
  "ohms", "farads", "tolerancePercent", "volts", "watts", "leadSpacingMm", "diameterMm",
  "package", "pinout", "pins", "pitchMm", "taper",
] as const

function everySpecKey<T extends readonly (keyof Specs)[]>(
  keys: [Exclude<keyof Specs, T[number]>] extends [never] ? T : never,
): readonly (keyof Specs)[] {
  return keys
}

const SPEC_KEYS: readonly (keyof Specs)[] = everySpecKey(SPEC_KEY_LIST)
const SPEC_KEY_SET: ReadonlySet<string> = new Set<string>(SPEC_KEY_LIST)
const EVIDENCE_SPEC_SET: ReadonlySet<string> = new Set<string>([...SPEC_KEY_LIST, "mpn"])

export interface Evidence {
  readonly spec: keyof Specs | "mpn"
  readonly url: string
  readonly note: string
}

function isEvidenceSpecKey(value: string): value is keyof Specs | "mpn" {
  return EVIDENCE_SPEC_SET.has(value)
}

/** `accessory`: sockets, stripboard, wire, knobs - extras only, with no place in the
 * circuit model. */
export type CatalogKind = ComponentKind | "accessory"

function isCatalogKind(value: string): value is CatalogKind {
  return isKnownKind(value) || value === "accessory"
}

export interface CatalogEntry {
  /** The file name, without ".json". */
  readonly id: string
  readonly kind: CatalogKind
  readonly description: string
  /** Absent only for commodity parts with no meaningful part number (wire, stripboard). */
  readonly manufacturer?: string
  readonly mpn?: string
  readonly specs: Specs
  readonly evidence: readonly Evidence[]
  /** Why this part was chosen over the alternatives. */
  readonly why: string
  /** Whether this is a cheap commodity part worth buying in a stocking pack when prototyping. */
  readonly stock: boolean
  readonly sources: readonly Source[]
}

function requireRecord(value: unknown, what: string, where: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${where}: ${what} is a ${typeof value}, not an object.`)
  }
  return value
}

function requireNonEmptyString(value: unknown, what: string, where: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${where}: ${what} is missing or not a non-empty string.`)
  }
  return value
}

function optionalNonEmptyString(value: unknown, what: string, where: string): string | undefined {
  if (value === undefined) return undefined
  return requireNonEmptyString(value, what, where)
}

function requireFiniteNumber(value: unknown, what: string, where: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${where}: ${what} is missing or not a finite number.`)
  }
  return value
}

function optionalFiniteNumber(value: unknown, what: string, where: string): number | undefined {
  if (value === undefined) return undefined
  return requireFiniteNumber(value, what, where)
}

function requireNonNegativeNumber(value: unknown, what: string, where: string): number {
  const n = requireFiniteNumber(value, what, where)
  if (n < 0) {
    throw new Error(`${where}: ${what} (${n}) must not be negative.`)
  }
  return n
}

function requirePositiveInteger(value: unknown, what: string, where: string): number {
  const n = requireFiniteNumber(value, what, where)
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${where}: ${what} (${n}) must be a positive integer.`)
  }
  return n
}

function requireBoolean(value: unknown, what: string, where: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${where}: ${what} is a ${typeof value}, not a boolean.`)
  }
  return value
}

const ISO_DATE_PATTERN = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/

/** Whether year/month/day round-trip through `Date.UTC` unchanged - rejects a syntactically
 * matching but impossible date such as 2026-02-30. */
function isRealCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function requireIsoDate(value: unknown, what: string, where: string): string {
  const text = requireNonEmptyString(value, what, where)
  const match = ISO_DATE_PATTERN.exec(text)
  if (match === null || !isRealCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]))) {
    throw new Error(`${where}: ${what} "${text}" is not a valid "YYYY-MM-DD" date.`)
  }
  return text
}

function optionalStringArray(value: unknown, what: string, where: string): readonly string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) {
    throw new Error(`${where}: ${what} is a ${typeof value}, not an array.`)
  }
  return value.map((item, index) => requireNonEmptyString(item, `${what}[${index}]`, where))
}

function optionalTaper(value: unknown, what: string, where: string): "linear" | "log" | undefined {
  if (value === undefined) return undefined
  const text = requireNonEmptyString(value, what, where)
  if (text !== "linear" && text !== "log") {
    throw new Error(`${where}: ${what} "${text}" is not "linear" or "log".`)
  }
  return text
}

function parseSpecs(value: unknown, where: string): Specs {
  const record = requireRecord(value, "specs", where)
  for (const key of Object.keys(record)) {
    if (!SPEC_KEY_SET.has(key)) {
      throw new Error(`${where}: specs has an unknown field "${key}". Known specs: ${SPEC_KEY_LIST.join(", ")}.`)
    }
  }
  return {
    ohms: optionalFiniteNumber(record["ohms"], "specs.ohms", where),
    farads: optionalFiniteNumber(record["farads"], "specs.farads", where),
    tolerancePercent: optionalFiniteNumber(record["tolerancePercent"], "specs.tolerancePercent", where),
    volts: optionalFiniteNumber(record["volts"], "specs.volts", where),
    watts: optionalFiniteNumber(record["watts"], "specs.watts", where),
    leadSpacingMm: optionalFiniteNumber(record["leadSpacingMm"], "specs.leadSpacingMm", where),
    diameterMm: optionalFiniteNumber(record["diameterMm"], "specs.diameterMm", where),
    package: optionalNonEmptyString(record["package"], "specs.package", where),
    pinout: optionalStringArray(record["pinout"], "specs.pinout", where),
    pins: optionalFiniteNumber(record["pins"], "specs.pins", where),
    pitchMm: optionalFiniteNumber(record["pitchMm"], "specs.pitchMm", where),
    taper: optionalTaper(record["taper"], "specs.taper", where),
  }
}

function parseEvidence(value: unknown, index: number, where: string): Evidence {
  const record = requireRecord(value, `evidence[${index}]`, where)
  const specText = requireNonEmptyString(record["spec"], `evidence[${index}].spec`, where)
  if (!isEvidenceSpecKey(specText)) {
    throw new Error(
      `${where}: evidence[${index}].spec "${specText}" is not a known spec or "mpn". Known: ` +
        `${[...EVIDENCE_SPEC_SET].join(", ")}.`,
    )
  }
  return {
    spec: specText,
    url: requireNonEmptyString(record["url"], `evidence[${index}].url`, where),
    note: requireNonEmptyString(record["note"], `evidence[${index}].note`, where),
  }
}

function parseEvidenceList(value: unknown, where: string): readonly Evidence[] {
  if (!Array.isArray(value)) {
    throw new Error(`${where}: evidence is a ${typeof value}, not an array.`)
  }
  return value.map((item, index) => parseEvidence(item, index, where))
}

/** Every spec actually present must be backed by an evidence entry naming it - a spec with
 * no evidence is a guess, and this catalog does not carry guesses. */
function requireSpecEvidence(specs: Specs, evidence: readonly Evidence[], where: string): void {
  for (const key of SPEC_KEYS) {
    if (specs[key] === undefined) continue
    if (!evidence.some((entry) => entry.spec === key)) {
      throw new Error(
        `${where}: specs.${key} is present but no evidence entry names it. Add an evidence entry ` +
          `with spec: "${key}".`,
      )
    }
  }
}

function parseBreak(value: unknown, sourceIndex: number, index: number, where: string): PriceBreak {
  const what = `sources[${sourceIndex}].breaks[${index}]`
  const record = requireRecord(value, what, where)
  const quantity = requirePositiveInteger(record["quantity"], `${what}.quantity`, where)
  const unitPrice = requireNonNegativeNumber(record["unitPrice"], `${what}.unitPrice`, where)
  const packValue = record["pack"]
  if (packValue === undefined) {
    return { quantity, unitPrice }
  }
  if (typeof packValue !== "boolean") {
    throw new Error(`${where}: ${what}.pack is a ${typeof packValue}, not a boolean.`)
  }
  return { quantity, unitPrice, pack: packValue }
}

function parseBreaks(value: unknown, sourceIndex: number, where: string): readonly PriceBreak[] {
  const what = `sources[${sourceIndex}].breaks`
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(
      `${where}: ${what} ${Array.isArray(value) ? "is empty" : `is a ${typeof value}, not an array`}; a ` +
        "source must list at least one price break, the first being the minimum order.",
    )
  }
  const breaks = value.map((item, index) => parseBreak(item, sourceIndex, index, where))
  for (let index = 1; index < breaks.length; index++) {
    if (!(breaks[index].quantity > breaks[index - 1].quantity)) {
      throw new Error(
        `${where}: ${what} are not in strictly ascending order by quantity (break ${index} has ` +
          `quantity ${breaks[index].quantity}, not greater than break ${index - 1}'s ` +
          `${breaks[index - 1].quantity}).`,
      )
    }
  }
  return breaks
}

function parseSource(value: unknown, index: number, where: string): Source {
  const what = `sources[${index}]`
  const record = requireRecord(value, what, where)
  const useText = requireNonEmptyString(record["use"], `${what}.use`, where)
  if (!isSourceUse(useText)) {
    throw new Error(`${where}: ${what}.use "${useText}" is not one of ${SOURCE_USE_LIST.join(", ")}.`)
  }
  return {
    supplier: requireNonEmptyString(record["supplier"], `${what}.supplier`, where),
    url: requireNonEmptyString(record["url"], `${what}.url`, where),
    sku: optionalNonEmptyString(record["sku"], `${what}.sku`, where),
    currency: requireNonEmptyString(record["currency"], `${what}.currency`, where),
    breaks: parseBreaks(record["breaks"], index, where),
    checked: requireIsoDate(record["checked"], `${what}.checked`, where),
    use: useText,
  }
}

function parseSources(value: unknown, where: string): readonly Source[] {
  if (!Array.isArray(value)) {
    throw new Error(`${where}: sources is a ${typeof value}, not an array.`)
  }
  if (value.length === 0) {
    throw new Error(
      `${where}: sources is empty; an entry with nowhere to buy it from cannot be chosen for a ` +
        "board. Add at least one source.",
    )
  }
  return value.map((item, index) => parseSource(item, index, where))
}

/**
 * Validate one catalog entry's shape. `file` names the file this entry came from (or would
 * be written to) - it is used both in every refusal message and to check that `id` matches
 * the file's name, since `parts/<id>.json` is the whole rule for where an entry lives.
 */
export function parseCatalogEntry(json: unknown, file: string): CatalogEntry {
  const record = requireRecord(json, "the entry", file)

  const id = requireNonEmptyString(record["id"], "id", file)
  const expectedId = path.basename(file, ".json")
  if (id !== expectedId) {
    throw new Error(
      `${file}: id "${id}" does not match the file name "${expectedId}" (a catalog entry's id must ` +
        "equal its file name, parts/<id>.json).",
    )
  }

  const kindText = requireNonEmptyString(record["kind"], "kind", file)
  if (!isCatalogKind(kindText)) {
    throw new Error(
      `${file}: kind "${kindText}" is not a known component kind or "accessory". Known: ` +
        `${[...ALL_KINDS, "accessory"].join(", ")}.`,
    )
  }

  const description = requireNonEmptyString(record["description"], "description", file)
  const manufacturer = optionalNonEmptyString(record["manufacturer"], "manufacturer", file)
  const mpn = optionalNonEmptyString(record["mpn"], "mpn", file)

  const specs = parseSpecs(record["specs"], file)
  const evidence = parseEvidenceList(record["evidence"], file)
  requireSpecEvidence(specs, evidence, file)
  if (mpn !== undefined && !evidence.some((entry) => entry.spec === "mpn")) {
    throw new Error(
      `${file}: "mpn" is present but no evidence entry names "mpn". Add an evidence entry with ` +
        'spec: "mpn".',
    )
  }

  const why = requireNonEmptyString(record["why"], "why", file)
  const stock = requireBoolean(record["stock"], "stock", file)
  const sources = parseSources(record["sources"], file)
  if (stock && !sources.some((source) => source.breaks.some((brk) => brk.pack === true))) {
    throw new Error(
      `${file}: "stock" is true but no source has a price break marked "pack" (a stocking pack). ` +
        'Add one, or set "stock" to false.',
    )
  }

  return { id, kind: kindText, description, manufacturer, mpn, specs, evidence, why, stock, sources }
}

/**
 * Every entry in `dir` (one `.json` file per part). Reads the directory given to it rather
 * than a hard-coded path, so tests run against a temporary directory or fixtures rather than
 * the repository's real `parts/`.
 */
export function loadCatalog(dir: string): ReadonlyMap<string, CatalogEntry> {
  let names: readonly string[]
  try {
    names = fs.readdirSync(dir).filter((name) => name.endsWith(".json"))
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`could not read catalog directory "${dir}": ${detail}`)
  }

  const catalog = new Map<string, CatalogEntry>()
  for (const name of [...names].sort()) {
    const file = path.join(dir, name)
    const text = fs.readFileSync(file, "utf8")
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      throw new Error(`${file}: could not parse as JSON: ${detail}`)
    }
    const entry = parseCatalogEntry(json, file)
    catalog.set(entry.id, entry)
  }
  return catalog
}
