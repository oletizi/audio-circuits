/**
 * Comparing a board's derived needs against its `bom.json` and the shared
 * catalog: what `make bom` reports (Decisions, docs/superpowers/specs/
 * 2026-09-30-bom-design.md - "The command"). Never writes anything; a
 * choice is made by a person or by the researcher, never inferred here.
 *
 * `uncovered` is a controller ruling
 * (.superpowers/sdd/2026-09-30-bom/task-4-brief.md), beyond the design as
 * written: `suggestBuy` throws for a prototype `stock` part when a source has
 * no stocking pack covering the needed quantity. That is only a report item
 * when NO source of the chosen entry covers it - a single non-covering
 * source among covering ones is shown in `BOM.md`'s table (tools/bom/
 * render.ts), not flagged here.
 *
 * Design: docs/superpowers/specs/2026-09-30-bom-design.md
 */
import { misfits, type Misfit } from "./fit.ts"
import type { BomLine } from "./types.ts"
import type { BoardBom, Purchasing } from "./board-bom.ts"
import type { CatalogEntry } from "./catalog.ts"
import { coverQuantity, suggestBuy } from "./quantity.ts"

export interface BomReport {
  readonly unchosen: readonly BomLine[]
  /** Keys in bom.json the circuit no longer has. */
  readonly removed: readonly string[]
  readonly unmet: readonly { readonly line: BomLine; readonly part: string; readonly misfits: readonly Misfit[] }[]
  /** Catalog ids named in bom.json that do not exist. */
  readonly unknownParts: readonly string[]
  readonly stalePrices: readonly { readonly part: string; readonly supplier: string; readonly checked: string }[]
  /** A chosen part where NO source covers the needed quantity with any price break
   * (e.g. a prototype `stock` part with no stocking pack big enough). One entry per
   * non-covering source, only when every source of that entry fails. */
  readonly uncovered: readonly { readonly part: string; readonly supplier: string; readonly quantity: number }[]
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Whole days between two "YYYY-MM-DD" dates, read as UTC midnights so neither the
 * host's time zone nor daylight-saving shifts can move a date by a day. */
function daysBetween(from: string, to: string): number {
  const fromMs = Date.parse(`${from}T00:00:00Z`)
  const toMs = Date.parse(`${to}T00:00:00Z`)
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
    throw new Error(`daysBetween: could not parse "${from}" or "${to}" as a "YYYY-MM-DD" date.`)
  }
  return Math.round((toMs - fromMs) / MS_PER_DAY)
}

/** Every source that covers `need`, given `purchasing` - by attempting `suggestBuy` and
 * treating any throw (no stocking pack big enough, no price breaks at all) as "does not
 * cover". When every source fails, one uncovered entry per failing source; when at
 * least one source covers, none (a single failing source among covering ones belongs in
 * the rendered table, not the report - see the module comment). */
function uncoveredFor(
  partId: string, need: number, purchasing: Purchasing, entry: CatalogEntry,
): readonly { readonly part: string; readonly supplier: string; readonly quantity: number }[] {
  const failingSuppliers: string[] = []
  let anyCovers = false
  for (const source of entry.sources) {
    try {
      suggestBuy(need, purchasing, entry, source)
      anyCovers = true
    } catch {
      failingSuppliers.push(source.supplier)
    }
  }
  if (anyCovers) return []
  const quantity = coverQuantity(need, purchasing)
  return failingSuppliers.map((supplier) => ({ part: partId, supplier, quantity }))
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

  const unchosen = lines.filter((line) => bom.lines[line.key] === undefined)

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

  const uncovered: { part: string; supplier: string; quantity: number }[] = []
  for (const [key, partId] of Object.entries(bom.lines)) {
    const line = lineByKey.get(key)
    if (line === undefined) continue
    const entry = catalog.get(partId)
    if (entry === undefined) continue
    uncovered.push(...uncoveredFor(partId, line.quantity, bom.purchasing, entry))
  }
  for (const extra of bom.extras) {
    const entry = catalog.get(extra.part)
    if (entry === undefined) continue
    uncovered.push(...uncoveredFor(extra.part, extra.quantity, bom.purchasing, entry))
  }

  return {
    unchosen,
    removed,
    unmet,
    unknownParts: [...unknownPartIds],
    stalePrices,
    uncovered,
  }
}

/** Whether the parts list is complete: nothing unchosen, nothing removed, every choice
 * meets its line, no unknown catalog id, and every chosen part is coverable from at
 * least one source. Staleness does not affect completeness - a stale price is still a
 * price, reported so it can be refreshed, not a reason `make bom` fails. */
export function isComplete(report: BomReport): boolean {
  return (
    report.unchosen.length === 0 &&
    report.removed.length === 0 &&
    report.unmet.length === 0 &&
    report.unknownParts.length === 0 &&
    report.uncovered.length === 0
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

  if (report.uncovered.length > 0) {
    sections.push(
      `${report.uncovered.length} part/supplier pair(s) with no price break covering the needed quantity - ` +
        "add a larger pack break, or choose a different supplier:",
      ...report.uncovered.map((item) => `  - "${item.part}" at ${item.supplier} (need ${item.quantity})`),
    )
  }

  if (sections.length === 0) {
    return "The parts list matches the circuit: every line is chosen and every chosen part fits."
  }

  return sections.join("\n")
}
