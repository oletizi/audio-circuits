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

test("mouserClient rewords a fetch rejection that carries the request URL, naming only supplier and endpoint path", async () => {
  const secret = "fake-key-9f3c"
  const rejecting: FetchLike = async (url) => {
    throw new TypeError(`fetch failed: unable to connect to ${url}`)
  }
  const client = mouserClient({ apiKey: secret }, rejecting, TODAY)
  let thrown: unknown
  try {
    await client.lookup("MFR-25FBF52-100K")
  } catch (error) {
    thrown = error
  }
  const message = thrown instanceof Error ? thrown.message : ""
  expect(message).toBe(
    "Mouser search/partnumber: request could not be sent (TypeError). Check the network connection and try again.",
  )
  expect(message).not.toContain(secret)
})

test("mouserClient rewrites a request URL echoed in an HTTP error body to the endpoint path", async () => {
  const secret = "fake-key-echo"
  const echoing: FetchLike = async (url) => ({ status: 400, text: async () => `bad request: ${url}` })
  const client = mouserClient({ apiKey: secret }, echoing, TODAY)
  await expect(client.search("10uF", 5)).rejects.toThrow("bad request: search/keyword")
  await expect(client.search("10uF", 5)).rejects.not.toThrow(secret)
})

test("mouserClient redacts the api key, plain or percent-encoded, from an HTTP error body that echoes it", async () => {
  const secret = "k/e+y=1 2"
  const echoing: FetchLike = async () => ({
    status: 401,
    text: async () => `key ${secret} or ${encodeURIComponent(secret)} rejected`,
  })
  const message = await mouserClient({ apiKey: secret }, echoing, TODAY)
    .search("10uF", 5)
    .catch((error: unknown) => (error instanceof Error ? error.message : ""))
  expect(message).toBe("Mouser search/keyword request failed (HTTP 401): key <redacted> or <redacted> rejected")
})

test("mouserClient URL-encodes the api key in the query string", async () => {
  const seen: string[] = []
  const recording: FetchLike = async (url) => {
    seen.push(url)
    return { status: 200, text: async () => PARTNUMBER_FIXTURE }
  }
  await mouserClient({ apiKey: "a&b=c d" }, recording, TODAY).lookup("MFR-25FBF52-100K")
  expect(seen).toEqual(["https://api.mouser.com/api/v1/search/partnumber?apiKey=a%26b%3Dc%20d"])
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

test("mouserClient leaves stock undefined when AvailabilityInStock is null", async () => {
  const body = JSON.stringify({
    Errors: [],
    SearchResults: {
      NumberOfResult: 1,
      Parts: [
        {
          MouserPartNumber: "1-NULL-STOCK",
          Manufacturer: "Acme",
          ManufacturerPartNumber: "NULL-STOCK-PART",
          Description: "Test part",
          ProductDetailUrl: "https://www.mouser.com/x",
          DataSheetUrl: "",
          AvailabilityInStock: null,
          ProductAttributes: [],
          PriceBreaks: [{ Quantity: 1, Price: "$1.00", Currency: "USD" }],
        },
      ],
    },
  })
  const client = mouserClient(CREDENTIALS, fakeFetch({ "search/partnumber": body }), TODAY)
  const offers = await client.lookup("NULL-STOCK-PART")
  expect(offers).toHaveLength(1)
  expect(offers[0].stock).toBeUndefined()
})

test("mouserClient leaves stock undefined when AvailabilityInStock is absent", async () => {
  const body = JSON.stringify({
    Errors: [],
    SearchResults: {
      NumberOfResult: 1,
      Parts: [
        {
          MouserPartNumber: "1-MISSING-STOCK",
          Manufacturer: "Acme",
          ManufacturerPartNumber: "MISSING-STOCK-PART",
          Description: "Test part",
          ProductDetailUrl: "https://www.mouser.com/x",
          DataSheetUrl: "",
          ProductAttributes: [],
          PriceBreaks: [{ Quantity: 1, Price: "$1.00", Currency: "USD" }],
        },
      ],
    },
  })
  const client = mouserClient(CREDENTIALS, fakeFetch({ "search/partnumber": body }), TODAY)
  const offers = await client.lookup("MISSING-STOCK-PART")
  expect(offers).toHaveLength(1)
  expect(offers[0].stock).toBeUndefined()
})

test("mouserClient leaves stock undefined when AvailabilityInStock is an empty string", async () => {
  const body = JSON.stringify({
    Errors: [],
    SearchResults: {
      NumberOfResult: 1,
      Parts: [
        {
          MouserPartNumber: "1-EMPTY-STOCK",
          Manufacturer: "Acme",
          ManufacturerPartNumber: "EMPTY-STOCK-PART",
          Description: "Test part",
          ProductDetailUrl: "https://www.mouser.com/x",
          DataSheetUrl: "",
          AvailabilityInStock: "",
          ProductAttributes: [],
          PriceBreaks: [{ Quantity: 1, Price: "$1.00", Currency: "USD" }],
        },
      ],
    },
  })
  const client = mouserClient(CREDENTIALS, fakeFetch({ "search/partnumber": body }), TODAY)
  const offers = await client.lookup("EMPTY-STOCK-PART")
  expect(offers).toHaveLength(1)
  expect(offers[0].stock).toBeUndefined()
})

test("mouserClient throws naming the part when AvailabilityInStock is present but not a number", async () => {
  const body = JSON.stringify({
    Errors: [],
    SearchResults: {
      NumberOfResult: 1,
      Parts: [
        {
          MouserPartNumber: "1-BAD-STOCK",
          Manufacturer: "Acme",
          ManufacturerPartNumber: "BAD-STOCK-PART",
          Description: "Test part",
          ProductDetailUrl: "https://www.mouser.com/x",
          DataSheetUrl: "",
          AvailabilityInStock: "not-a-number",
          ProductAttributes: [],
          PriceBreaks: [{ Quantity: 1, Price: "$1.00", Currency: "USD" }],
        },
      ],
    },
  })
  const client = mouserClient(CREDENTIALS, fakeFetch({ "search/partnumber": body }), TODAY)
  await expect(client.lookup("BAD-STOCK-PART")).rejects.toThrow(/1-BAD-STOCK.*AvailabilityInStock.*not a number/s)
})

test("mouserClient yields an offer with empty breaks and no currency when PriceBreaks is missing or empty", async () => {
  const body = JSON.stringify({
    Errors: [],
    SearchResults: {
      NumberOfResult: 2,
      Parts: [
        {
          MouserPartNumber: "1-NO-PRICEBREAKS-KEY",
          Manufacturer: "Acme",
          ManufacturerPartNumber: "NO-PRICEBREAKS-PART",
          Description: "Test part",
          ProductDetailUrl: "https://www.mouser.com/x",
          DataSheetUrl: "",
          AvailabilityInStock: "0",
          ProductAttributes: [],
        },
        {
          MouserPartNumber: "1-EMPTY-PRICEBREAKS",
          Manufacturer: "Acme",
          ManufacturerPartNumber: "NO-PRICEBREAKS-PART",
          Description: "Test part",
          ProductDetailUrl: "https://www.mouser.com/y",
          DataSheetUrl: "",
          AvailabilityInStock: "0",
          ProductAttributes: [],
          PriceBreaks: [],
        },
      ],
    },
  })
  const client = mouserClient(CREDENTIALS, fakeFetch({ "search/partnumber": body }), TODAY)
  const offers = await client.lookup("NO-PRICEBREAKS-PART")
  expect(offers).toHaveLength(2)
  for (const offer of offers) {
    expect(offer.breaks).toEqual([])
    expect(offer.currency).toBeUndefined()
  }
})

test("search returns every offer when one record has a null stock and another has empty PriceBreaks, alongside a normal record", async () => {
  const body = JSON.stringify({
    Errors: [],
    SearchResults: {
      NumberOfResult: 3,
      Parts: [
        {
          MouserPartNumber: "1-NORMAL",
          Manufacturer: "Acme",
          ManufacturerPartNumber: "NORMAL-PART",
          Description: "A normally stocked, priced part",
          ProductDetailUrl: "https://www.mouser.com/normal",
          DataSheetUrl: "",
          AvailabilityInStock: "500",
          ProductAttributes: [],
          PriceBreaks: [{ Quantity: 1, Price: "$1.00", Currency: "USD" }],
        },
        {
          MouserPartNumber: "511-2N3904",
          Manufacturer: "Acme",
          ManufacturerPartNumber: "NULL-STOCK-PART",
          Description: "A factory-order part with no stated stock",
          ProductDetailUrl: "https://www.mouser.com/null-stock",
          DataSheetUrl: "",
          AvailabilityInStock: null,
          ProductAttributes: [],
          PriceBreaks: [{ Quantity: 1, Price: "$2.00", Currency: "USD" }],
        },
        {
          MouserPartNumber: "1-NO-PRICE",
          Manufacturer: "Acme",
          ManufacturerPartNumber: "NO-PRICE-PART",
          Description: "A discontinued part with no listed price",
          ProductDetailUrl: "https://www.mouser.com/no-price",
          DataSheetUrl: "",
          AvailabilityInStock: "0",
          ProductAttributes: [],
          PriceBreaks: [],
        },
      ],
    },
  })
  const client = mouserClient(CREDENTIALS, fakeFetch({ "search/keyword": body }), TODAY)
  const offers = await client.search("mixed availability", 3)
  expect(offers).toHaveLength(3)

  const normal = offers.find((offer) => offer.sku === "1-NORMAL")
  expect(normal?.stock).toBe(500)
  expect(normal?.breaks).toEqual([{ quantity: 1, unitPrice: 1 }])

  const nullStock = offers.find((offer) => offer.sku === "511-2N3904")
  expect(nullStock?.stock).toBeUndefined()
  expect(nullStock?.breaks).toEqual([{ quantity: 1, unitPrice: 2 }])

  const noPrice = offers.find((offer) => offer.sku === "1-NO-PRICE")
  expect(noPrice?.stock).toBe(0)
  expect(noPrice?.breaks).toEqual([])
  expect(noPrice?.currency).toBeUndefined()
})

test("mouserClient throws naming the part and currency when a price break is not in USD", async () => {
  const body = JSON.stringify({
    Errors: [],
    SearchResults: {
      NumberOfResult: 1,
      Parts: [
        {
          MouserPartNumber: "1-EURO-PART",
          Manufacturer: "Acme",
          ManufacturerPartNumber: "EURO-PART",
          Description: "Test part",
          ProductDetailUrl: "https://www.mouser.com/x",
          DataSheetUrl: "",
          AvailabilityInStock: "5",
          ProductAttributes: [],
          PriceBreaks: [{ Quantity: 1, Price: "€1.00", Currency: "EUR" }],
        },
      ],
    },
  })
  const client = mouserClient(CREDENTIALS, fakeFetch({ "search/partnumber": body }), TODAY)
  await expect(client.lookup("EURO-PART")).rejects.toThrow(
    /1-EURO-PART.*"EUR".*not.*"USD".*Mouser account's currency setting/s,
  )
})
