/**
 * The readable-text output of `bun run parts`: one supplier offer (lookup, search) and one
 * refresh report line. Kept apart from the verbs (tools/cli/parts.ts) so each file stays
 * small; nothing here reads a file, a key or the network.
 *
 * Design: docs/superpowers/specs/2026-09-30-supplier-search-design.md
 */
import type { SourceReport } from "../suppliers/refresh.ts"
import type { SupplierOffer } from "../suppliers/types.ts"

/** US-locale currency, but with enough precision to keep sub-cent unit prices (routine for
 * passives bought by the thousand, e.g. $0.018) distinct from one another - the default
 * two-decimal currency format would round several of a resistor's real price breaks down
 * to the same "$0.02" and hide the very comparison this tool exists to show. */
export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount)
}

function formatParameters(parameters: Readonly<Record<string, string>>): string[] {
  const names = Object.keys(parameters)
  if (names.length === 0) return ["  parameters: none listed"]
  return ["  parameters:", ...names.map((name) => `    ${name}: ${parameters[name]}`)]
}

export function formatOffer(offer: SupplierOffer): string[] {
  const lines = [
    `${offer.supplier} ${offer.sku} - ${offer.mpn} (${offer.manufacturer})`,
    `  ${offer.description}`,
    ...(offer.packaging !== undefined ? [`  packaging: ${offer.packaging}`] : []),
    `  stock: ${offer.stock !== undefined ? offer.stock : "not stated"}`,
  ]
  if (offer.breaks.length === 0) {
    lines.push("  price: not listed")
  } else if (offer.currency === undefined) {
    throw new Error(
      `${offer.supplier} ${offer.sku} has price breaks but no currency; cannot format its price.`,
    )
  } else {
    const currency = offer.currency
    for (const brk of offer.breaks) {
      lines.push(`  ${brk.quantity}+: ${formatMoney(brk.unitPrice, currency)}`)
    }
  }
  lines.push(...formatParameters(offer.parameters))
  lines.push(`  url: ${offer.url}`)
  lines.push(`  datasheet: ${offer.datasheetUrl ?? "(none listed)"}`)
  return lines
}

export function formatReport(report: SourceReport): string {
  const where = `${report.id} sources[${report.sourceIndex}] ${report.supplier}` + (report.sku !== undefined ? ` (${report.sku})` : "")
  switch (report.outcome.status) {
    case "updated": {
      const { oldUnitPrice, newUnitPrice } = report.outcome
      const smallest =
        oldUnitPrice === newUnitPrice
          ? `smallest-quantity price still ${formatMoney(newUnitPrice, "USD")}`
          : `${formatMoney(oldUnitPrice, "USD")} -> ${formatMoney(newUnitPrice, "USD")}`
      return `${where}: updated, price breaks changed (${smallest})`
    }
    case "unchanged":
      return `${where}: unchanged`
    case "not-listed":
      return `${where}: no longer listed`
    case "no-price":
      return `${where}: listed without a price`
  }
}
