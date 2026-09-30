/**
 * `BOM.md`: the shopping list, one markdown table per section (on the
 * board, off the board, extras), then a totals table per supplier and
 * currency. Committed, so it must be byte-for-byte deterministic for the
 * same inputs - the only date anywhere in it is each source's own
 * `checked` (Decisions; controller ruling,
 * .superpowers/sdd/2026-09-30-bom/task-4-brief.md).
 *
 * Every line's row states what it needs ("Needs", tools/bom/needs-text.ts),
 * chosen or not. Rendering never dies on a part that cannot (yet) be bought:
 * an unchosen line renders its part columns as "not chosen", a chosen id absent from the catalog as
 * "unknown part", and a source whose price breaks do not cover the needed
 * quantity (`suggestBuy` throwing) as "no pack covers <n>" in that source's
 * own cells - the report (tools/bom/report.ts), not this file, is where
 * those states are flagged as problems.
 *
 * Design: docs/superpowers/specs/2026-09-30-bom-design.md
 */
import type { BomLine } from "./types.ts"
import type { BoardBom, Extra, Purchasing } from "./board-bom.ts"
import type { CatalogEntry, Source } from "./catalog.ts"
import { coverQuantity, stockPackCovers, suggestBuy } from "./quantity.ts"
import { sortLines } from "./ordering.ts"
import { needsText } from "./needs-text.ts"

const NOT_CHOSEN = "not chosen"
const TABLE_HEADER = [
  "Designators", "Needs", "Qty", "Buy", "Description", "Manufacturer / MPN", "Links", "Unit price", "Line price",
] as const

const MICROS_PER_CURRENCY_UNIT = 1_000_000

function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, "<br>")
}

/** Several per-source values in one cell, one per line, in the same order the
 * sources are listed in - so a viewer can match a "Links" line to the "Buy" /
 * "Unit price" / "Line price" line beside it. */
function joinPerSource(cells: readonly string[]): string {
  return cells.length === 0 ? "-" : cells.join("<br>")
}

/** Two decimals, always - for a line price or a supplier's total. */
function formatAmount(amount: number): string {
  return amount.toFixed(2)
}

/** Two decimals ordinarily; up to four when the amount is under 0.10 (e.g. a
 * fraction-of-a-cent unit price, "0.012"), trimmed of trailing zeros beyond the
 * two that currency always shows. */
function formatUnitAmount(amount: number): string {
  if (amount >= 0.1) return formatAmount(amount)
  let text = amount.toFixed(4)
  while (text.endsWith("0") && !text.endsWith(".0")) {
    text = text.slice(0, -1)
  }
  return text
}

function formatMoney(amount: number, currency: string): string {
  return `${formatAmount(amount)} ${currency}`
}

function formatUnitPrice(amount: number, currency: string): string {
  return `${formatUnitAmount(amount)} ${currency}`
}

function manufacturerCell(entry: CatalogEntry): string {
  if (entry.manufacturer !== undefined && entry.mpn !== undefined) return `${entry.manufacturer} ${entry.mpn}`
  if (entry.manufacturer !== undefined) return entry.manufacturer
  if (entry.mpn !== undefined) return entry.mpn
  return "-"
}

/** One supplier+currency running total - currencies are never added together (Decisions). */
interface Total {
  readonly supplier: string
  readonly currency: string
  totalMicros: number
}

function addToTotal(totals: Map<string, Total>, supplier: string, currency: string, amount: number): void {
  const key = `${supplier}\u0000${currency}`
  const micros = Math.round(amount * MICROS_PER_CURRENCY_UNIT)
  const existing = totals.get(key)
  if (existing === undefined) {
    totals.set(key, { supplier, currency, totalMicros: micros })
    return
  }
  existing.totalMicros += micros
}

interface SourceCells {
  readonly link: string
  readonly buy: string
  readonly unit: string
  readonly line: string
  /** The line price to fold into this source's supplier+currency total - absent when
   * this source does not cover the needed quantity at all. */
  readonly linePrice?: number
}

/** One source's row-within-a-cell: its link (with its own `checked` date - the one
 * date `BOM.md` is allowed to carry), and its buy quantity and prices at the
 * suggested quantity - or, for a `stock` part bought at prototype quantities with no
 * pack big enough (checked with `stockPackCovers`, not by catching an exception), that
 * fact in place of all three. Any OTHER problem `suggestBuy` finds (a malformed
 * catalog entry with no price breaks at all, say) is a real bug and throws through,
 * uncaught - it does not belong in a rendered cell as if it were an ordinary
 * "buy a bigger pack" case. */
function sourceCells(
  need: number, purchasing: Purchasing, entry: CatalogEntry, source: Source, spares: boolean,
): SourceCells {
  const link = `[${source.supplier} (${source.use})](${source.url}) (checked ${source.checked})`
  const cover = coverQuantity(need, purchasing, spares)
  if (purchasing.mode === "prototype" && entry.stock && !stockPackCovers(entry, source, cover)) {
    const message = `no pack covers ${cover}`
    return { link, buy: message, unit: message, line: message }
  }
  const suggestion = suggestBuy(need, purchasing, entry, source, spares)
  return {
    link,
    buy: String(suggestion.quantity),
    unit: formatUnitPrice(suggestion.unitPrice, source.currency),
    line: formatMoney(suggestion.linePrice, source.currency),
    linePrice: suggestion.linePrice,
  }
}

interface RenderedRow {
  readonly designators: string
  /** The line's requirement in plain words (`needsText`); "-" for an extra, which has no line. */
  readonly needs: string
  readonly need: string
  readonly buy: string
  readonly description: string
  readonly manufacturer: string
  readonly links: string
  readonly unit: string
  readonly linePrice: string
}

function rowForUnchosen(label: readonly string[], needs: string, need: number): RenderedRow {
  return {
    designators: label.join(", "), needs, need: String(need),
    buy: NOT_CHOSEN, description: NOT_CHOSEN, manufacturer: NOT_CHOSEN, links: NOT_CHOSEN,
    unit: NOT_CHOSEN, linePrice: NOT_CHOSEN,
  }
}

function rowForUnknownPart(label: readonly string[], needs: string, need: number, partId: string): RenderedRow {
  const message = `unknown part "${partId}"`
  return {
    designators: label.join(", "), needs, need: String(need),
    buy: message, description: message, manufacturer: message, links: message,
    unit: message, linePrice: message,
  }
}

function rowForChosen(
  label: readonly string[], needs: string, need: number, entry: CatalogEntry, purchasing: Purchasing,
  spares: boolean, totals: Map<string, Total>,
): RenderedRow {
  const cells = entry.sources.map((source) => {
    const result = sourceCells(need, purchasing, entry, source, spares)
    if (result.linePrice !== undefined) addToTotal(totals, source.supplier, source.currency, result.linePrice)
    return result
  })
  return {
    designators: label.join(", "),
    needs,
    need: String(need),
    buy: joinPerSource(cells.map((c) => c.buy)),
    description: entry.description,
    manufacturer: manufacturerCell(entry),
    links: joinPerSource(cells.map((c) => c.link)),
    unit: joinPerSource(cells.map((c) => c.unit)),
    linePrice: joinPerSource(cells.map((c) => c.line)),
  }
}

function renderTable(rows: readonly RenderedRow[]): string {
  const headerLine = `| ${TABLE_HEADER.join(" | ")} |`
  const separator = `| ${TABLE_HEADER.map(() => "---").join(" | ")} |`
  const body = rows.map((row) => {
    const cells = [
      row.designators, row.needs, row.need, row.buy, row.description, row.manufacturer, row.links, row.unit, row.linePrice,
    ]
    return `| ${cells.map(escapeCell).join(" | ")} |`
  })
  return [headerLine, separator, ...body].join("\n")
}

function renderTotalsTable(totals: ReadonlyMap<string, Total>): string {
  const rows = [...totals.values()]
    .sort((a, b) => a.supplier.localeCompare(b.supplier) || a.currency.localeCompare(b.currency))
  const header = "| Supplier | Currency | Total |"
  const separator = "| --- | --- | --- |"
  const body = rows.map(
    (row) => `| ${escapeCell(row.supplier)} | ${escapeCell(row.currency)} | ${formatAmount(row.totalMicros / MICROS_PER_CURRENCY_UNIT)} |`,
  )
  return [header, separator, ...body].join("\n")
}

function sortExtras(extras: readonly Extra[]): readonly Extra[] {
  return [...extras].sort((a, b) => a.part.localeCompare(b.part))
}

function rowForLine(line: BomLine, bom: BoardBom, catalog: ReadonlyMap<string, CatalogEntry>, totals: Map<string, Total>): RenderedRow {
  const needs = needsText(line)
  const partId = bom.lines[line.key]
  if (partId === undefined) return rowForUnchosen(line.designators, needs, line.quantity)
  const entry = catalog.get(partId)
  if (entry === undefined) return rowForUnknownPart(line.designators, needs, line.quantity, partId)
  // A circuit line always carries the shrinkage margin; only an extra may opt out.
  return rowForChosen(line.designators, needs, line.quantity, entry, bom.purchasing, true, totals)
}

/** An extra is not derived from the circuit, so it has no requirement to state: "-". */
const EXTRA_NEEDS = "-"

function rowForExtra(extra: Extra, bom: BoardBom, catalog: ReadonlyMap<string, CatalogEntry>, totals: Map<string, Total>): RenderedRow {
  const entry = catalog.get(extra.part)
  if (entry === undefined) return rowForUnknownPart([extra.why], EXTRA_NEEDS, extra.quantity, extra.part)
  return rowForChosen([extra.why], EXTRA_NEEDS, extra.quantity, entry, bom.purchasing, extra.spares, totals)
}

/**
 * The shopping list for one board: a title, its one-line operating conditions, a
 * table per non-empty section (on-board lines, off-board lines, extras) and a
 * totals table per supplier and currency. Deterministic for the same inputs - no
 * date anywhere but each source's own `checked`.
 */
export function renderBomMarkdown(input: {
  readonly boardName: string
  readonly conditions: string
  readonly lines: readonly BomLine[]
  readonly bom: BoardBom
  readonly catalog: ReadonlyMap<string, CatalogEntry>
}): string {
  const { boardName, conditions, lines, bom, catalog } = input
  const totals = new Map<string, Total>()

  const onBoardRows = sortLines(lines.filter((line) => line.placement === "on-board"))
    .map((line) => rowForLine(line, bom, catalog, totals))
  const offBoardRows = sortLines(lines.filter((line) => line.placement === "off-board"))
    .map((line) => rowForLine(line, bom, catalog, totals))
  const extraRows = sortExtras(bom.extras).map((extra) => rowForExtra(extra, bom, catalog, totals))

  const output: string[] = [`# ${boardName} bill of materials`, "", conditions]

  if (onBoardRows.length > 0) {
    output.push("", "## On the board", "", renderTable(onBoardRows))
  }
  if (offBoardRows.length > 0) {
    output.push("", "## Off the board", "", renderTable(offBoardRows))
  }
  if (extraRows.length > 0) {
    output.push("", "## Extras", "", renderTable(extraRows))
  }

  output.push("", "## Totals", "", renderTotalsTable(totals))

  return `${output.join("\n")}\n`
}
