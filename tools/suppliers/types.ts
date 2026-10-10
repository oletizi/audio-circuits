/**
 * The shapes every supplier client produces and the one interface the CLI verbs
 * (`tools/cli/parts.ts`) and the price refresh (`tools/suppliers/refresh.ts`) call through. A third supplier with a
 * service can be added later by writing one more file behind `SupplierClient`
 * without touching any verb.
 *
 * Design: docs/superpowers/specs/2026-09-30-supplier-search-design.md
 */

export type SupplierName = "Mouser" | "Digi-Key"

export interface PriceBreak {
  readonly quantity: number
  readonly unitPrice: number
}

export interface SupplierOffer {
  readonly supplier: SupplierName
  readonly sku: string
  readonly manufacturer: string
  readonly mpn: string
  readonly description: string
  readonly url: string
  readonly datasheetUrl?: string
  /** How this listing is packed, when the supplier states it per listing (Digi-Key: one
   * offer per product variation - "Cut Tape (CT)", "Tape & Reel (TR)" ...). Mouser lists
   * packaging among `parameters` instead, so its offers leave this absent. */
  readonly packaging?: string
  /** Absent when the supplier does not state it (Mouser: null, absent or empty string;
   * Digi-Key: a variation without `QuantityAvailableforPackageType`). */
  readonly stock?: number
  /** Absent exactly when `breaks` is empty - there is no price to have a currency for. */
  readonly currency?: string
  /** Ascending quantity; empty when the supplier lists no price breaks for this listing
   * (a factory-order or discontinued part). */
  readonly breaks: readonly PriceBreak[]
  readonly parameters: Readonly<Record<string, string>>
  /** YYYY-MM-DD. */
  readonly fetched: string
}

export interface SupplierClient {
  readonly name: SupplierName
  /** Exact mpn matches only (case-insensitive, ignoring surrounding whitespace); [] when none. */
  lookup(mpn: string): Promise<readonly SupplierOffer[]>
  /** By the supplier's own part number (for refresh); undefined when the supplier no longer lists it. */
  lookupSku(sku: string): Promise<SupplierOffer | undefined>
  search(keywords: string, limit: number): Promise<readonly SupplierOffer[]>
}

/** The one shape a supplier client needs from `fetch`, so tests inject a fake and `bun test`
 * never touches the network. */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{ status: number; text(): Promise<string> }>
