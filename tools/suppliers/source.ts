/**
 * Turning a supplier offer into a catalog `Source` (`tools/bom/catalog.ts`), the shape
 * `parts source` prints and a catalog entry's `sources` array holds. `pack` is left unset
 * on every break: a stocking pack cannot be read from either supplier's search service
 * reliably, so the researcher marks it by hand after reading the listing.
 *
 * Design: docs/superpowers/specs/2026-09-30-supplier-search-design.md
 */
import type { PriceBreak, Source, SourceUse } from "../bom/catalog.ts"
import type { SupplierOffer } from "./types.ts"

export function offerToSource(offer: SupplierOffer, use: SourceUse): Source {
  const breaks: readonly PriceBreak[] = offer.breaks.map((brk) => ({
    quantity: brk.quantity,
    unitPrice: brk.unitPrice,
  }))
  return {
    supplier: offer.supplier,
    url: offer.url,
    sku: offer.sku,
    currency: offer.currency,
    breaks,
    checked: offer.fetched,
    use,
  }
}
