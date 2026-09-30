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
