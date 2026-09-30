/**
 * Plain-words descriptions of bulk-buy decisions (tools/bom/bulk.ts), shared by the
 * report (tools/bom/report.ts) and `BOM.md` (tools/bom/render.ts) so both say the same
 * thing about the same decision.
 */
import type { BulkDecision } from "./bulk.ts"

function percentText(fraction: number): string {
  return `${Number((fraction * 100).toPrecision(6))}%`
}

/** "R12 (resistor-22r-metal-film-0207) at Mouser" */
export function bulkSubjectText(decision: BulkDecision): string {
  return `${decision.label} (${decision.part}) at ${decision.supplier}`
}

/** What was bought, and - for a bulk buy not taken - why not. */
export function bulkDecisionText(decision: BulkDecision): string {
  const caps = decision.caps
  const subject = bulkSubjectText(decision)
  const { bulk, covered, currency } = decision
  if (decision.outcome === "bulk") {
    return `${subject}: ${bulk.quantity} at ${bulk.unitPrice} ${currency}`
  }
  if (decision.outcome === "over-unit-price") {
    return (
      `${subject}: not ${bulk.quantity} - its unit price ${bulk.unitPrice} ${currency} is over the ` +
      `${caps.maxStockUnitPrice} ${currency} bulk cap; buying ${covered.quantity}`
    )
  }
  return (
    `${subject}: not ${bulk.quantity} - dropped to keep the ${decision.supplier} ${currency} order within ` +
    `${percentText(caps.maxStockOverage)} over its total at covered quantities; buying ${covered.quantity}`
  )
}
