import { test, expect } from "bun:test"
import { offerToSource } from "../../tools/suppliers/source.ts"
import { parseCatalogEntry } from "../../tools/bom/catalog.ts"
import type { SupplierOffer } from "../../tools/suppliers/types.ts"

const OFFER: SupplierOffer = {
  supplier: "Mouser",
  sku: "603-MFR-25FBF52-100K",
  manufacturer: "YAGEO",
  mpn: "MFR-25FBF52-100K",
  description: "Metal Film Resistors - Through Hole 100K OHM 1/4W 1%",
  url: "https://www.mouser.com/en/ProductDetail/YAGEO/MFR-25FBF52-100K",
  datasheetUrl: "https://www.mouser.com/datasheet/3/508/1/YAGEO_MFR_DATASHEET.pdf",
  stock: 22598,
  currency: "USD",
  breaks: [
    { quantity: 1, unitPrice: 0.1 },
    { quantity: 10, unitPrice: 0.042 },
  ],
  parameters: { Packaging: "Bulk" },
  fetched: "2026-09-30",
}

const MINIMAL_ENTRY = (source: unknown): Record<string, unknown> => ({
  id: "r_100k_test",
  kind: "resistor",
  description: "test entry",
  specs: {},
  evidence: [],
  why: "test",
  stock: false,
  sources: [source],
})

test("offerToSource carries supplier, url, sku, currency, checked and use across", () => {
  const source = offerToSource(OFFER, "standard")
  expect(source).toEqual({
    supplier: "Mouser",
    url: "https://www.mouser.com/en/ProductDetail/YAGEO/MFR-25FBF52-100K",
    sku: "603-MFR-25FBF52-100K",
    currency: "USD",
    breaks: [
      { quantity: 1, unitPrice: 0.1 },
      { quantity: 10, unitPrice: 0.042 },
    ],
    checked: "2026-09-30",
    use: "standard",
  })
})

test("offerToSource leaves pack unset on every break", () => {
  const source = offerToSource(OFFER, "standard")
  for (const brk of source.breaks) {
    expect("pack" in brk).toBe(false)
  }
})

test("offerToSource's result passes parseCatalogEntry's source validation", () => {
  const source = offerToSource(OFFER, "prototype-fast")
  const entry = parseCatalogEntry(MINIMAL_ENTRY(source), "parts/r_100k_test.json")
  expect(entry.sources).toHaveLength(1)
  expect(entry.sources[0].supplier).toBe("Mouser")
  expect(entry.sources[0].use).toBe("prototype-fast")
})

test("offerToSource refuses an offer with no price breaks, naming the SKU and the supplier", () => {
  const unpriced: SupplierOffer = { ...OFFER, sku: "511-2N3904", breaks: [], currency: undefined }
  expect(() => offerToSource(unpriced, "standard")).toThrow(/Mouser lists no price for 511-2N3904.*choose another/s)
})

const DIGIKEY: SupplierOffer = { ...OFFER, supplier: "Digi-Key", sku: "311-100KCRCT-ND", packaging: "Cut Tape (CT)" }

test("offerToSource refuses a Digi-Reel listing, naming its fee and the cut-tape SKU to use instead", () => {
  const reel: SupplierOffer = {
    ...DIGIKEY,
    sku: "311-100KCRDKR-ND",
    packaging: "Digi-Reel® (plus a $7.00 Digi-Reel fee per order)",
    reelingFee: 7,
    cutTapeSku: "311-100KCRCT-ND",
  }
  expect(() => offerToSource(reel, "standard")).toThrow(
    /Digi-Key 311-100KCRDKR-ND charges a \$7\.00 reeling fee per order.*--sku 311-100KCRCT-ND/s,
  )
})

test("offerToSource refuses a reeling-fee listing whose product has no cut tape, saying to choose another", () => {
  const reel: SupplierOffer = { ...DIGIKEY, sku: "X-DKR-ND", reelingFee: 7 }
  expect(() => offerToSource(reel, "standard")).toThrow(/X-DKR-ND charges a \$7\.00 reeling fee.*choose another listing/s)
})

test("offerToSource refuses a Marketplace listing, naming the third-party seller", () => {
  const market: SupplierOffer = { ...DIGIKEY, sku: "6557-2N3904TR-ND", marketplaceSeller: "GOODWORK" }
  expect(() => offerToSource(market, "standard")).toThrow(
    /Digi-Key 6557-2N3904TR-ND is a Marketplace listing, sold by the third party "GOODWORK".*choose another listing/s,
  )
})

test("offerToSource accepts Digi-Key's own cut-tape listing", () => {
  expect(offerToSource(DIGIKEY, "standard").sku).toBe("311-100KCRCT-ND")
})
