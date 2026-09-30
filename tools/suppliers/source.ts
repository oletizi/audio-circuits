/**
 * Turning a supplier offer into a catalog `Source` (`tools/bom/catalog.ts`), the shape
 * `parts source` prints and a catalog entry's `sources` array holds. `pack` is left unset
 * on every break: a stocking pack cannot be read from either supplier's search service
 * reliably, so the researcher marks it by hand after reading the listing.
 *
 * An offer with no price breaks (a factory-order or discontinued listing) cannot become a
 * `Source` - a source with nothing to buy at is not useful - so this refuses, naming the
 * SKU, rather than emitting a `Source` with an empty `breaks` array.
 *
 * Design: docs/superpowers/specs/2026-09-30-supplier-search-design.md
 */
import type { PriceBreak, Source, SourceUse } from "../bom/catalog.ts"
import type { SupplierOffer } from "./types.ts"

export function offerToSource(offer: SupplierOffer, use: SourceUse): Source {
  if (offer.breaks.length === 0) {
    throw new Error(
      `${offer.supplier} lists no price for ${offer.sku}: choose another SKU or supplier.`,
    )
  }
  if (offer.currency === undefined) {
    throw new Error(
      `${offer.supplier} ${offer.sku} has price breaks but no currency; inspect the offer before sourcing it.`,
    )
  }
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
