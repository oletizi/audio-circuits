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
  | { readonly mode: "prototype"; readonly shrinkage: number }
  | { readonly mode: "run"; readonly boards: number; readonly shrinkage: number }

export interface Extra {
  readonly part: string
  readonly quantity: number
  readonly why: string
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
    return { mode, shrinkage }
  }

  const boards = requireFiniteNumber(record["boards"], "purchasing.boards", where)
  if (!Number.isInteger(boards) || boards <= 0) {
    throw new Error(`${where}: purchasing.boards (${boards}) must be a positive integer.`)
  }
  return { mode, boards, shrinkage }
}

function parseLines(value: unknown, where: string): Readonly<Record<string, string>> {
  if (value === undefined) return {}
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
  return { part, quantity, why }
}

function parseExtras(value: unknown, where: string): readonly Extra[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    throw new Error(`${where}: extras is a ${typeof value}, not an array.`)
  }
  return value.map((item, index) => parseExtra(item, index, where))
}

/** Validate one board's `bom.json`. `file` names it in every refusal. `lines` and `extras`
 * default to empty when absent - a brand-new board's file may declare only `purchasing`. */
export function parseBoardBom(json: unknown, file: string): BoardBom {
  const record = requireRecord(json, "the board bom", file)
  const purchasing = parsePurchasing(record["purchasing"], file)
  const lines = parseLines(record["lines"], file)
  const extras = parseExtras(record["extras"], file)
  return { purchasing, lines, extras }
}
