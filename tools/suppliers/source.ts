/**
 * Turning a supplier offer into a catalog `Source` (`tools/bom/catalog.ts`), the shape
 * `parts source` prints and a catalog entry's `sources` array holds.
 *
 * An offer with no price breaks (a factory-order or discontinued listing) cannot become a
 * `Source` - a source with nothing to buy at is not useful - so this refuses, naming the
 * SKU, rather than emitting a `Source` with an empty `breaks` array.
 *
 * Two Digi-Key listings are refused for the same reason - what the `Source` would say is not
 * what buying it costs or who sells it: a Digi-Reel (a per-order reeling fee on top of the
 * breaks, which a `Source` has no place for; the refusal names the cut-tape SKU with the same
 * breaks and no fee), and a Marketplace listing (sold by a third party, not Digi-Key).
 * `lookup` and `search` still show both, with their packaging text.
 *
 * Design: docs/superpowers/specs/2026-09-30-supplier-search-design.md
 */
import type { PriceBreak, Source, SourceUse } from "../bom/catalog.ts"
import type { SupplierOffer } from "./types.ts"

export function offerToSource(offer: SupplierOffer, use: SourceUse): Source {
  if (offer.reelingFee !== undefined) {
    const instead =
      offer.cutTapeSku !== undefined
        ? `use the same product's cut-tape listing instead: --sku ${offer.cutTapeSku}`
        : "choose another listing"
    throw new Error(
      `${offer.supplier} ${offer.sku} charges a $${offer.reelingFee.toFixed(2)} reeling fee per order on ` +
        `top of its price breaks, which a catalog source cannot record (its cost would read low); ${instead}.`,
    )
  }
  if (offer.marketplaceSeller !== undefined) {
    throw new Error(
      `${offer.supplier} ${offer.sku} is a Marketplace listing, sold by the third party ` +
        `"${offer.marketplaceSeller}" rather than by ${offer.supplier}, and a catalog source records ` +
        "only the supplier's own listings; choose another listing.",
    )
  }
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
