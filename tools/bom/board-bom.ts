/**
 * A board's parts-list choices: which catalog id fills each derived line
 * (`lines`), the parts the circuit does not know about (`extras`: sockets,
 * stripboard, wire, knobs), and how many to buy (`purchasing`).
 *
 * `make bom` reports against this file and never writes it - a board's
 * choices are made by a person or by the researcher agent, never inferred.
 *
 * Design: docs/superpowers/specs/2026-09-30-bom-design.md
 */
import { isRecord } from "../perfboard/guards.ts"

export type Purchasing =
  | {
      readonly mode: "prototype"
      readonly shrinkage: number
      /** The quantity a `stock` part is bulk-bought to (at least). */
      readonly stockQuantity: number
      /** A bulk buy is taken only at or below this unit price, in the source's currency. */
      readonly maxStockUnitPrice: number
      /** Per supplier and currency, the fraction by which the order with bulk buys may exceed
       * the same order at covered quantities. */
      readonly maxStockOverage: number
    }
  | { readonly mode: "run"; readonly boards: number; readonly shrinkage: number }

export interface Extra {
  readonly part: string
  readonly quantity: number
  readonly why: string
  /** Whether the board's shrinkage margin (and so at least one spare) applies to this
   * extra. `"spares": false` in bom.json turns it off - for an extra where a spare is not
   * worth buying, such as a multi-spool wire kit. Absent means true: the spec's documented
   * default, the same rule every line follows. */
  readonly spares: boolean
}

export interface BoardBom {
  readonly purchasing: Purchasing
  /** Line key (as `deriveNeeds` builds it) -> catalog id. */
  readonly lines: Readonly<Record<string, string>>
  readonly extras: readonly Extra[]
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

function requireFiniteNumber(value: unknown, what: string, where: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${where}: ${what} is missing or not a finite number.`)
  }
  return value
}

/** The purchasing fields only prototype mode reads; run mode refuses each by name. */
const PROTOTYPE_ONLY_FIELDS = ["stockQuantity", "maxStockUnitPrice", "maxStockOverage"] as const

function parseStockCaps(
  record: Record<string, unknown>, where: string,
): { readonly stockQuantity: number; readonly maxStockUnitPrice: number; readonly maxStockOverage: number } {
  const stockQuantity = requireFiniteNumber(record["stockQuantity"], "purchasing.stockQuantity", where)
  if (!Number.isInteger(stockQuantity) || stockQuantity <= 0) {
    throw new Error(
      `${where}: purchasing.stockQuantity (${stockQuantity}) must be a positive integer - the ` +
        "quantity a prototype buys of each `stock` part.",
    )
  }
  const maxStockUnitPrice = requireFiniteNumber(record["maxStockUnitPrice"], "purchasing.maxStockUnitPrice", where)
  if (!(maxStockUnitPrice > 0)) {
    throw new Error(
      `${where}: purchasing.maxStockUnitPrice (${maxStockUnitPrice}) must be a positive number - the ` +
        "highest unit price, in the source's currency, at which a `stock` part is bought in bulk.",
    )
  }
  const maxStockOverage = requireFiniteNumber(record["maxStockOverage"], "purchasing.maxStockOverage", where)
  if (!(maxStockOverage >= 0)) {
    throw new Error(
      `${where}: purchasing.maxStockOverage (${maxStockOverage}) must be a fraction of at least 0 - how ` +
        "far bulk buys may raise a supplier's order over the same order at covered quantities.",
    )
  }
  return { stockQuantity, maxStockUnitPrice, maxStockOverage }
}

function parsePurchasing(value: unknown, where: string): Purchasing {
  const record = requireRecord(value, "purchasing", where)

  const mode = requireNonEmptyString(record["mode"], "purchasing.mode", where)
  if (mode !== "prototype" && mode !== "run") {
    throw new Error(`${where}: purchasing.mode "${mode}" is not "prototype" or "run".`)
  }

  const shrinkage = requireFiniteNumber(record["shrinkage"], "purchasing.shrinkage", where)
  if (!(shrinkage > 0)) {
    throw new Error(`${where}: purchasing.shrinkage (${shrinkage}) must be greater than 0.`)
  }

  if (mode === "prototype") {
    return { mode, shrinkage, ...parseStockCaps(record, where) }
  }

  for (const field of PROTOTYPE_ONLY_FIELDS) {
    if (record[field] !== undefined) {
      throw new Error(
        `${where}: purchasing.${field} is set, but purchasing.mode is "run", which does not use ` +
          `it. Remove "${field}", or set mode to "prototype".`,
      )
    }
  }
  const boards = requireFiniteNumber(record["boards"], "purchasing.boards", where)
  if (!Number.isInteger(boards) || boards <= 0) {
    throw new Error(`${where}: purchasing.boards (${boards}) must be a positive integer.`)
  }
  return { mode, boards, shrinkage }
}

function parseLines(value: unknown, where: string): Readonly<Record<string, string>> {
  if (value === undefined) {
    throw new Error(
      `${where}: missing "lines". Declare it explicitly - {} if the board has no line chosen yet.`,
    )
  }
  const record = requireRecord(value, "lines", where)
  const lines: Record<string, string> = {}
  for (const [key, entry] of Object.entries(record)) {
    lines[key] = requireNonEmptyString(entry, `lines["${key}"]`, where)
  }
  return lines
}

function parseExtra(value: unknown, index: number, where: string): Extra {
  const what = `extras[${index}]`
  const record = requireRecord(value, what, where)
  const part = requireNonEmptyString(record["part"], `${what}.part`, where)
  const quantity = requireFiniteNumber(record["quantity"], `${what}.quantity`, where)
  if (!(quantity > 0)) {
    throw new Error(`${where}: ${what}.quantity (${quantity}) must be a positive number.`)
  }
  const why = requireNonEmptyString(record["why"], `${what}.why`, where)
  return { part, quantity, why, spares: parseSpares(record["spares"], what, where) }
}

/** `spares` is optional: absent means true (the documented default in the BOM spec's
 * bom.json section - the shrinkage margin applies, as for every line). Present, it must
 * be a boolean. */
function parseSpares(value: unknown, what: string, where: string): boolean {
  if (value === undefined) return true
  if (typeof value !== "boolean") {
    throw new Error(
      `${where}: ${what}.spares is a ${typeof value}, not a boolean. Write false to buy this ` +
        "extra without the shrinkage margin, or leave it out to apply the margin.",
    )
  }
  return value
}

function parseExtras(value: unknown, where: string): readonly Extra[] {
  if (value === undefined) {
    throw new Error(
      `${where}: missing "extras". Declare it explicitly - [] if the board needs none yet.`,
    )
  }
  if (!Array.isArray(value)) {
    throw new Error(`${where}: extras is a ${typeof value}, not an array.`)
  }
  return value.map((item, index) => parseExtra(item, index, where))
}

/** Validate one board's `bom.json`. `file` names it in every refusal. `purchasing`, `lines`
 * and `extras` are all required - a fallback default for a missing key would silently accept
 * a typo (e.g. "line" for "lines") as "no lines chosen yet". A board with genuinely no lines
 * or extras yet must say so explicitly, with `{}` / `[]`. */
export function parseBoardBom(json: unknown, file: string): BoardBom {
  const record = requireRecord(json, "the board bom", file)
  const purchasing = parsePurchasing(record["purchasing"], file)
  const lines = parseLines(record["lines"], file)
  const extras = parseExtras(record["extras"], file)
  return { purchasing, lines, extras }
}
