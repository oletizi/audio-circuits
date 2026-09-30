import { test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { mouserClient } from "../../tools/suppliers/mouser.ts"
import type { FetchLike } from "../../tools/suppliers/types.ts"

const FIXTURES_DIR = path.join(import.meta.dir, "../fixtures/suppliers")
const PARTNUMBER_FIXTURE = fs.readFileSync(path.join(FIXTURES_DIR, "mouser-partnumber-mfr-25fbf52-100k.json"), "utf8")
const KEYWORD_FIXTURE = fs.readFileSync(path.join(FIXTURES_DIR, "mouser-keyword-10uf-35v-radial.json"), "utf8")

const CREDENTIALS = { apiKey: "test-api-key" }
const TODAY = () => "2026-09-30"

function fakeFetch(bodies: Record<string, string>): FetchLike {
  return async (url) => {
    for (const [needle, body] of Object.entries(bodies)) {
      if (url.includes(needle)) {
        return { status: 200, text: async () => body }
      }
    }
    throw new Error(`fakeFetch: no fixture registered for ${url}`)
  }
}

function errorFetch(status: number, body: string): FetchLike {
  return async () => ({ status, text: async () => body })
}

test("mouserClient.lookup parses the recorded exact-match response", async () => {
  const client = mouserClient(
    CREDENTIALS,
    fakeFetch({ "search/partnumber": PARTNUMBER_FIXTURE }),
    TODAY,
  )
  const offers = await client.lookup("MFR-25FBF52-100K")
  expect(offers).toHaveLength(1)
  const offer = offers[0]
  expect(offer.supplier).toBe("Mouser")
  expect(offer.sku).toBe("603-MFR-25FBF52-100K")
  expect(offer.manufacturer).toBe("YAGEO")
  expect(offer.mpn).toBe("MFR-25FBF52-100K")
  expect(offer.description).toBe("Metal Film Resistors - Through Hole 100K OHM 1/4W 1%")
  expect(offer.url).toBe("https://www.mouser.com/en/ProductDetail/YAGEO/MFR-25FBF52-100K?qs=oAGoVhmvjhxAqZbyE%2Fs9bg%3D%3D")
  expect(offer.datasheetUrl).toBe("https://www.mouser.com/datasheet/3/508/1/YAGEO_MFR_DATASHEET.pdf")
  expect(offer.stock).toBe(22598)
  expect(offer.currency).toBe("USD")
  expect(offer.breaks).toEqual([
    { quantity: 1, unitPrice: 0.1 },
    { quantity: 10, unitPrice: 0.042 },
    { quantity: 25, unitPrice: 0.031 },
    { quantity: 100, unitPrice: 0.027 },
    { quantity: 250, unitPrice: 0.023 },
    { quantity: 500, unitPrice: 0.021 },
    { quantity: 1000, unitPrice: 0.018 },
    { quantity: 5000, unitPrice: 0.015 },
  ])
  expect(offer.parameters).toEqual({ Packaging: "Bulk", "Standard Pack Qty": "10000" })
  expect(offer.fetched).toBe("2026-09-30")
})

test("mouserClient.lookup filters out anything that is not an exact, case/whitespace-insensitive mpn match", async () => {
  const client = mouserClient(
    CREDENTIALS,
    fakeFetch({ "search/partnumber": PARTNUMBER_FIXTURE }),
    TODAY,
  )
  const offers = await client.lookup("  mfr-25fbf52-100k  ")
  expect(offers).toHaveLength(1)

  const none = mouserClient(
    CREDENTIALS,
    fakeFetch({ "search/partnumber": PARTNUMBER_FIXTURE }),
    TODAY,
  )
  const noMatch = await none.lookup("MFR-25FBF52-999K")
  expect(noMatch).toEqual([])
})

test("mouserClient.lookupSku finds the offer by Mouser part number", async () => {
  const client = mouserClient(
    CREDENTIALS,
    fakeFetch({ "search/partnumber": PARTNUMBER_FIXTURE }),
    TODAY,
  )
  const offer = await client.lookupSku("603-MFR-25FBF52-100K")
  expect(offer?.mpn).toBe("MFR-25FBF52-100K")

  const missing = await client.lookupSku("NOT-A-REAL-SKU")
  expect(missing).toBeUndefined()
})

test("mouserClient.search parses the recorded keyword response, capped at the requested limit", async () => {
  const client = mouserClient(
    CREDENTIALS,
    fakeFetch({ "search/keyword": KEYWORD_FIXTURE }),
    TODAY,
  )
  const offers = await client.search("10uF 35V radial", 5)
  expect(offers).toHaveLength(5)
  expect(offers[0].sku).toBe("140-SG100M1V0507P")
  expect(offers[0].datasheetUrl).toBeUndefined()
  expect(offers[1].mpn).toBe("510D106M035AA3D")
  expect(offers[1].breaks[0]).toEqual({ quantity: 1, unitPrice: 8.7 })
})

test("mouserClient throws naming Mouser and the message when the Errors array is non-empty", async () => {
  const body = JSON.stringify({
    Errors: [{ Id: "1", Code: "InvalidApiKey", Message: "The API key is invalid.", PropertyName: "apiKey" }],
    SearchResults: { NumberOfResult: 0, Parts: [] },
  })
  const client = mouserClient(CREDENTIALS, fakeFetch({ "search/partnumber": body }), TODAY)
  await expect(client.lookup("MFR-25FBF52-100K")).rejects.toThrow(/Mouser.*The API key is invalid\./s)
})

test("mouserClient never puts the api key in an error message", async () => {
  const body = JSON.stringify({
    Errors: [{ Id: "1", Code: "RateLimited", Message: "Rate limit exceeded.", PropertyName: null }],
    SearchResults: { NumberOfResult: 0, Parts: [] },
  })
  const client = mouserClient({ apiKey: "super-secret-key-value" }, fakeFetch({ "search/partnumber": body }), TODAY)
  let thrown: unknown
  try {
    await client.lookup("MFR-25FBF52-100K")
  } catch (error) {
    thrown = error
  }
  expect(thrown).toBeInstanceOf(Error)
  const message = thrown instanceof Error ? thrown.message : ""
  expect(message).not.toContain("super-secret-key-value")
})

test("mouserClient throws naming supplier, HTTP status and the service message on a non-2xx response", async () => {
  const client = mouserClient(CREDENTIALS, errorFetch(429, "Too Many Requests"), TODAY)
  await expect(client.lookup("MFR-25FBF52-100K")).rejects.toThrow(/Mouser search\/partnumber.*HTTP 429.*Too Many Requests/s)
})

test("mouserClient throws naming the price text when a price break cannot be parsed", async () => {
  const body = JSON.stringify({
    Errors: [],
    SearchResults: {
      NumberOfResult: 1,
      Parts: [
        {
          MouserPartNumber: "1-BAD-PRICE",
          Manufacturer: "Acme",
          ManufacturerPartNumber: "BAD-PRICE",
          Description: "Test part",
          ProductDetailUrl: "https://www.mouser.com/x",
          DataSheetUrl: "",
          AvailabilityInStock: "10",
          ProductAttributes: [],
          PriceBreaks: [{ Quantity: 1, Price: "not-a-price", Currency: "USD" }],
        },
      ],
    },
  })
  const client = mouserClient(CREDENTIALS, fakeFetch({ "search/partnumber": body }), TODAY)
  await expect(client.lookup("BAD-PRICE")).rejects.toThrow(/not-a-price.*could not be parsed/s)
})

test("mouserClient parses a price with a thousands separator", async () => {
  const body = JSON.stringify({
    Errors: [],
    SearchResults: {
      NumberOfResult: 1,
      Parts: [
        {
          MouserPartNumber: "1-EXPENSIVE",
          Manufacturer: "Acme",
          ManufacturerPartNumber: "EXPENSIVE-PART",
          Description: "Test part",
          ProductDetailUrl: "https://www.mouser.com/x",
          DataSheetUrl: "",
          AvailabilityInStock: "0",
          ProductAttributes: [],
          PriceBreaks: [{ Quantity: 1, Price: "$1,234.56", Currency: "USD" }],
        },
      ],
    },
  })
  const client = mouserClient(CREDENTIALS, fakeFetch({ "search/partnumber": body }), TODAY)
  const offers = await client.lookup("EXPENSIVE-PART")
  expect(offers[0].breaks).toEqual([{ quantity: 1, unitPrice: 1234.56 }])
  expect(offers[0].stock).toBe(0)
})
