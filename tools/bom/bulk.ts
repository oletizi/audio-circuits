/**
 * The board-wide buy plan: which buy quantity each chosen part is suggested at, per
 * source, once prototype bulk buying is capped (Decisions, "Bulk buying is capped",
 * docs/superpowers/specs/2026-09-30-bom-design.md).
 *
 * In prototype mode a `stock` part's per-source suggestion from `suggestBuy` is a BULK
 * buy (at least `stockQuantity`). Two caps decide whether it is taken:
 *
 * - unit price: a bulk buy whose unit price is above `maxStockUnitPrice` (in the
 *   source's own currency) is set aside for the covered buy (`coveredBuy`);
 * - overage: per supplier and currency, the order total with the remaining bulk buys
 *   may exceed the same order at covered quantities by at most `maxStockOverage` of the
 *   latter. While it exceeds, the bulk buy that adds the most money (bulk line price
 *   minus covered line price) is set aside, ties broken by key (a line's key, an
 *   extra's catalog id), then by source position.
 *
 * Every set-aside bulk buy is recorded with its reason - information for the report and
 * `BOM.md`, never a failure. Run mode has no bulk buys: every source gets `suggestBuy`.
 *
 * Totals are integer micros, as in tools/bom/quantity.ts.
 */
import type { BomLine } from "./types.ts"
import type { BoardBom, Purchasing } from "./board-bom.ts"
import type { CatalogEntry } from "./catalog.ts"
import { coveredBuy, suggestBuy, toMicros, type BuySuggestion } from "./quantity.ts"
import { sortLines } from "./ordering.ts"

/** One chosen part to buy: a derived line with a known catalog entry, or an extra. */
export interface BuyItem {
  /** Identity within one board: `lineItemId` or `extraItemId`. */
  readonly id: string
  /** The overage tie-break key: the line's key, or the extra's catalog id. */
  readonly key: string
  /** How the item is named to a reader: a line's designators, or the extra's reason. */
  readonly label: string
  readonly entry: CatalogEntry
  readonly need: number
  readonly spares: boolean
}

export type BulkOutcome = "bulk" | "over-unit-price" | "over-overage"

/** The caps a bulk buy was judged against - prototype mode's purchasing fields. */
export interface BulkCaps {
  readonly maxStockUnitPrice: number
  readonly maxStockOverage: number
}

/** One `stock` part's bulk buy at one source, and whether it was taken. */
export interface BulkDecision {
  readonly key: string
  readonly label: string
  readonly part: string
  readonly supplier: string
  readonly currency: string
  readonly outcome: BulkOutcome
  readonly bulk: BuySuggestion
  readonly covered: BuySuggestion
  readonly caps: BulkCaps
}

export interface BuyPlan {
  /** The suggestion for one item at one of its entry's sources (by position). */
  readonly buy: (itemId: string, sourceIndex: number) => BuySuggestion
  /** Every bulk buy considered, taken or not, sorted by supplier and currency, then in the
   * order the items were given. */
  readonly decisions: readonly BulkDecision[]
}

export function lineItemId(key: string): string {
  return `line:${key}`
}

export function extraItemId(index: number): string {
  return `extra:${index}`
}

/** Every chosen line and extra whose catalog entry exists - unchosen lines and unknown ids
 * have nothing to buy and are reported elsewhere (tools/bom/report.ts). Lines come in the
 * parts list's order (`sortLines`), then extras in bom.json's order; `decisions` keep it. */
export function buyItems(
  lines: readonly BomLine[], bom: BoardBom, catalog: ReadonlyMap<string, CatalogEntry>,
): readonly BuyItem[] {
  const items: BuyItem[] = []
  for (const line of sortLines(lines)) {
    const partId = bom.lines[line.key]
    if (partId === undefined) continue
    const entry = catalog.get(partId)
    if (entry === undefined) continue
    items.push({
      id: lineItemId(line.key), key: line.key, label: line.designators.join(", "),
      entry, need: line.quantity, spares: true,
    })
  }
  bom.extras.forEach((extra, index) => {
    const entry = catalog.get(extra.part)
    if (entry === undefined) return
    items.push({
      id: extraItemId(index), key: extra.part, label: extra.why,
      entry, need: extra.quantity, spares: extra.spares,
    })
  })
  return items
}

function lineMicros(suggestion: BuySuggestion): number {
  return suggestion.quantity * toMicros(suggestion.unitPrice)
}

/** A bulk buy still in the running for one supplier+currency order. */
interface Candidate {
  readonly slot: string
  readonly key: string
  readonly sourceIndex: number
  readonly addedMicros: number
}

/** Mutable working state for one supplier+currency order. */
interface Order {
  coveredMicros: number
  plannedMicros: number
  readonly candidates: Candidate[]
}

function slotOf(itemId: string, sourceIndex: number): string {
  return `${itemId}\u0000${sourceIndex}`
}

function costliestFirst(a: Candidate, b: Candidate): number {
  if (a.addedMicros !== b.addedMicros) return b.addedMicros - a.addedMicros
  if (a.key !== b.key) return a.key < b.key ? -1 : 1
  return a.sourceIndex - b.sourceIndex
}

/** The buy plan for a board's items under its purchasing mode (see the module comment). */
export function planBuys(items: readonly BuyItem[], purchasing: Purchasing): BuyPlan {
  const chosen = new Map<string, BuySuggestion>()
  const pending = new Map<string, Omit<BulkDecision, "outcome">>()
  const outcomes = new Map<string, BulkOutcome>()
  const orders = new Map<string, Order>()

  for (const item of items) {
    item.entry.sources.forEach((source, sourceIndex) => {
      const slot = slotOf(item.id, sourceIndex)
      const covered = coveredBuy(item.need, purchasing, item.entry, source, item.spares)
      const orderKey = `${source.supplier}\u0000${source.currency}`
      const order = orders.get(orderKey) ?? { coveredMicros: 0, plannedMicros: 0, candidates: [] }
      orders.set(orderKey, order)
      order.coveredMicros += lineMicros(covered)

      if (purchasing.mode !== "prototype" || !item.entry.stock) {
        const suggestion = suggestBuy(item.need, purchasing, item.entry, source, item.spares)
        chosen.set(slot, suggestion)
        order.plannedMicros += lineMicros(suggestion)
        return
      }

      const bulk = suggestBuy(item.need, purchasing, item.entry, source, item.spares)
      pending.set(slot, {
        key: item.key, label: item.label, part: item.entry.id,
        supplier: source.supplier, currency: source.currency, bulk, covered,
        caps: { maxStockUnitPrice: purchasing.maxStockUnitPrice, maxStockOverage: purchasing.maxStockOverage },
      })
      if (toMicros(bulk.unitPrice) > toMicros(purchasing.maxStockUnitPrice)) {
        outcomes.set(slot, "over-unit-price")
        chosen.set(slot, covered)
        order.plannedMicros += lineMicros(covered)
        return
      }
      outcomes.set(slot, "bulk")
      chosen.set(slot, bulk)
      order.plannedMicros += lineMicros(bulk)
      order.candidates.push({ slot, key: item.key, sourceIndex, addedMicros: lineMicros(bulk) - lineMicros(covered) })
    })
  }

  if (purchasing.mode === "prototype") {
    for (const order of orders.values()) {
      const queue = [...order.candidates].sort(costliestFirst)
      for (const candidate of queue) {
        if (order.plannedMicros - order.coveredMicros <= order.coveredMicros * purchasing.maxStockOverage) break
        const decision = pending.get(candidate.slot)
        if (decision === undefined) {
          throw new Error(`bulk candidate "${candidate.slot}" has no recorded decision - a bug in tools/bom/bulk.ts.`)
        }
        outcomes.set(candidate.slot, "over-overage")
        chosen.set(candidate.slot, decision.covered)
        order.plannedMicros -= candidate.addedMicros
      }
    }
  }

  const decisions: BulkDecision[] = []
  for (const [slot, decision] of pending) {
    const outcome = outcomes.get(slot)
    if (outcome === undefined) {
      throw new Error(`bulk decision "${slot}" has no outcome - a bug in tools/bom/bulk.ts.`)
    }
    decisions.push({ ...decision, outcome })
  }
  // A stable sort: within one supplier and currency, the items' own order (the Map's
  // insertion order) is kept.
  decisions.sort((a, b) => a.supplier.localeCompare(b.supplier) || a.currency.localeCompare(b.currency))

  return {
    buy: (itemId, sourceIndex) => {
      const suggestion = chosen.get(slotOf(itemId, sourceIndex))
      if (suggestion === undefined) {
        throw new Error(
          `no buy planned for item "${itemId}" at source ${sourceIndex} - it was not among the items ` +
            "passed to planBuys (a bug in the caller).",
        )
      }
      return suggestion
    },
    decisions,
  }
}
