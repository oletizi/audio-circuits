/**
 * Comparing a board's derived needs against its `bom.json` and the shared
 * catalog: what `make bom` reports (Decisions, docs/superpowers/specs/
 * 2026-09-30-bom-design.md - "The command"). Never writes anything; a
 * choice is made by a person or by the researcher, never inferred here.
 *
 * Design: docs/superpowers/specs/2026-09-30-bom-design.md
 */
import { misfits, type Misfit } from "./fit.ts"
import { compareLines, sortLines } from "./ordering.ts"
import type { BomLine } from "./types.ts"
import type { BoardBom } from "./board-bom.ts"
import type { CatalogEntry } from "./catalog.ts"
import { buyItems, planBuys, type BulkDecision } from "./bulk.ts"
import { bulkDecisionText } from "./bulk-text.ts"

export interface BomReport {
  readonly unchosen: readonly BomLine[]
  /** Keys in bom.json the circuit no longer has. */
  readonly removed: readonly string[]
  readonly unmet: readonly { readonly line: BomLine; readonly part: string; readonly misfits: readonly Misfit[] }[]
  /** Catalog ids named in bom.json that do not exist. */
  readonly unknownParts: readonly string[]
  readonly stalePrices: readonly { readonly part: string; readonly supplier: string; readonly checked: string }[]
  /** Prototype bulk buys NOT taken - over the unit-price cap, or dropped to keep a
   * supplier's order within the overage cap (tools/bom/bulk.ts). Information, never a
   * reason the list is incomplete. */
  readonly bulkDropped: readonly BulkDecision[]
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Whole days between two "YYYY-MM-DD" dates, read as UTC midnights so neither the
 * host's time zone nor daylight-saving shifts can move a date by a day. */
function daysBetween(from: string, to: string): number {
  const fromMs = Date.parse(`${from}T00:00:00Z`)
  const toMs = Date.parse(`${to}T00:00:00Z`)
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
    throw new Error(
      `daysBetween: could not parse "${from}" or "${to}" as a "YYYY-MM-DD" date. Pass an ISO ` +
        '"YYYY-MM-DD" date for both `today` and the catalog entry\'s `checked` field.',
    )
  }
  return Math.round((toMs - fromMs) / MS_PER_DAY)
}

/**
 * Compares what the circuit needs (`lines`, from `deriveNeeds`) against what the board
 * has chosen (`bom`) and the shared catalog. `today` and `staleDays` (YYYY-MM-DD, and a
 * day count) decide `stalePrices` only - `BOM.md` itself carries no date but each
 * source's own `checked` (tools/bom/render.ts).
 */
export function compareBom(
  lines: readonly BomLine[],
  bom: BoardBom,
  catalog: ReadonlyMap<string, CatalogEntry>,
  today: string,
  staleDays: number,
): BomReport {
  const lineByKey = new Map(lines.map((line) => [line.key, line]))

  const unchosen = sortLines(lines.filter((line) => bom.lines[line.key] === undefined))

  const removed = Object.keys(bom.lines).filter((key) => !lineByKey.has(key))

  const unknownPartIds = new Set<string>()
  for (const partId of Object.values(bom.lines)) {
    if (!catalog.has(partId)) unknownPartIds.add(partId)
  }
  for (const extra of bom.extras) {
    if (!catalog.has(extra.part)) unknownPartIds.add(extra.part)
  }

  const unmet: { line: BomLine; part: string; misfits: readonly Misfit[] }[] = []
  for (const [key, partId] of Object.entries(bom.lines)) {
    const line = lineByKey.get(key)
    if (line === undefined) continue // reported as "removed" instead
    const entry = catalog.get(partId)
    if (entry === undefined) continue // reported as "unknownParts" instead
    const found = misfits(line, entry)
    if (found.length > 0) unmet.push({ line, part: partId, misfits: found })
  }
  unmet.sort((a, b) => compareLines(a.line, b.line))

  const referencedIds = new Set<string>([...Object.values(bom.lines), ...bom.extras.map((extra) => extra.part)])
  const stalePrices: { part: string; supplier: string; checked: string }[] = []
  for (const partId of referencedIds) {
    const entry = catalog.get(partId)
    if (entry === undefined) continue
    for (const source of entry.sources) {
      if (daysBetween(source.checked, today) > staleDays) {
        stalePrices.push({ part: entry.id, supplier: source.supplier, checked: source.checked })
      }
    }
  }

  const bulkDropped = planBuys(buyItems(lines, bom, catalog), bom.purchasing).decisions
    .filter((decision) => decision.outcome !== "bulk")

  return {
    unchosen,
    removed,
    unmet,
    unknownParts: [...unknownPartIds],
    stalePrices,
    bulkDropped,
  }
}

/** Whether the parts list is complete: nothing unchosen, nothing removed, every choice
 * meets its line, and no unknown catalog id. Staleness does not affect completeness - a stale price is still a
 * price, reported so it can be refreshed, not a reason `make bom` fails. */
export function isComplete(report: BomReport): boolean {
  return (
    report.unchosen.length === 0 &&
    report.removed.length === 0 &&
    report.unmet.length === 0 &&
    report.unknownParts.length === 0
  )
}

function misfitText(misfit: Misfit): string {
  return `${misfit.field}: needed ${misfit.needed}, found ${misfit.found}`
}

/** A human-readable rendering of a `BomReport`, one section per category, each item
 * named alongside its fix. Deterministic: the categories are always in the same order,
 * and every list within them follows the order `compareBom` built it in. */
export function reportText(report: BomReport): string {
  const sections: string[] = []

  if (report.unchosen.length > 0) {
    sections.push(
      `${report.unchosen.length} line(s) with no part chosen - choose a part with the researcher:`,
      ...report.unchosen.map((line) => `  - ${line.key} (${line.designators.join(", ")})`),
    )
  }

  if (report.removed.length > 0) {
    sections.push(
      `${report.removed.length} chosen line(s) the circuit no longer has - remove the key from bom.json:`,
      ...report.removed.map((key) => `  - ${key}`),
    )
  }

  if (report.unmet.length > 0) {
    sections.push(
      `${report.unmet.length} chosen part(s) that no longer meet their line - choose a different part, ` +
        "or fix the catalog entry:",
      ...report.unmet.map(
        (item) => `  - ${item.line.key}: "${item.part}" (${item.misfits.map(misfitText).join("; ")})`,
      ),
    )
  }

  if (report.unknownParts.length > 0) {
    sections.push(
      `${report.unknownParts.length} catalog id(s) named in bom.json that do not exist - remove them ` +
        "from bom.json, or add the catalog entry:",
      ...report.unknownParts.map((id) => `  - ${id}`),
    )
  }

  if (report.stalePrices.length > 0) {
    sections.push(
      `${report.stalePrices.length} price(s) older than the staleness limit - re-check with the researcher:`,
      ...report.stalePrices.map((item) => `  - "${item.part}" at ${item.supplier}, checked ${item.checked}`),
    )
  }

  const summary = sections.length === 0
    ? ["The parts list matches the circuit: every line is chosen and every chosen part fits."]
    : sections

  if (report.bulkDropped.length === 0) return summary.join("\n")
  return [
    ...summary,
    `${report.bulkDropped.length} bulk buy(s) not taken (information only - these parts are bought at ` +
      "the covered quantity):",
    ...report.bulkDropped.map((decision) => `  - ${bulkDecisionText(decision)}`),
  ].join("\n")
}
