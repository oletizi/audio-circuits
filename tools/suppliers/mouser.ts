/**
 * The Mouser Search API v1 client. Built from real recorded responses (a part-number
 * search for `MFR-25FBF52-100K` and a keyword search for "10uF 35V radial"), not from
 * memory of what a distributor's API usually looks like - see
 * `tests/fixtures/suppliers/mouser-*.json`. The two endpoints:
 *
 * - `POST /search/partnumber` with `{ SearchByPartRequest: { mouserPartNumber, partSearchOptions } }`
 * - `POST /search/keyword` with `{ SearchByKeywordRequest: { keyword, records, startingRecord } }`
 *
 * Both return `{ Errors: [...], SearchResults: { NumberOfResult, Parts: [...] } }`. A
 * non-empty `Errors` array is refused naming Mouser and every error's `Message`.
 *
 * Design: docs/superpowers/specs/2026-09-30-supplier-search-design.md
 */
import { isRecord } from "../perfboard/guards.ts"
import { postJson } from "./http.ts"
import type { FetchLike, PriceBreak, SupplierClient, SupplierOffer } from "./types.ts"
import type { MouserCredentials } from "./credentials.ts"

const BASE_URL = "https://api.mouser.com/api/v1"
const PARTNUMBER_PATH = "search/partnumber"
const KEYWORD_PATH = "search/keyword"

function partnumberUrl(apiKey: string): string {
  return `${BASE_URL}/search/partnumber?apiKey=${apiKey}`
}

function keywordUrl(apiKey: string): string {
  return `${BASE_URL}/search/keyword?apiKey=${apiKey}`
}

function requireRecord(value: unknown, what: string, where: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Mouser ${where}: ${what} is a ${typeof value}, not an object.`)
  }
  return value
}

function requireNonEmptyString(value: unknown, what: string, where: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Mouser ${where}: ${what} is missing or not a non-empty string.`)
  }
  return value
}

function requireFiniteNumber(value: unknown, what: string, where: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Mouser ${where}: ${what} is a ${typeof value}, not a finite number.`)
  }
  return value
}

/** Strips a currency symbol and thousands separators from a Mouser price string ("$1,234.56")
 * and parses what remains; throws naming the unparsed text rather than guessing a value. */
function parsePrice(text: string, what: string, where: string): number {
  const cleaned = text.replace(/[^0-9.]/g, "")
  const value = Number(cleaned)
  if (cleaned === "" || !Number.isFinite(value)) {
    throw new Error(`Mouser ${where}: ${what} "${text}" could not be parsed as a price.`)
  }
  return value
}

interface ParsedBreak {
  readonly quantity: number
  readonly unitPrice: number
  readonly currency: string
}

function parseBreakRecord(value: unknown, index: number, where: string): ParsedBreak {
  const what = `PriceBreaks[${index}]`
  const record = requireRecord(value, what, where)
  const quantity = requireFiniteNumber(record["Quantity"], `${what}.Quantity`, where)
  const priceText = requireNonEmptyString(record["Price"], `${what}.Price`, where)
  const currency = requireNonEmptyString(record["Currency"], `${what}.Currency`, where)
  const unitPrice = parsePrice(priceText, `${what}.Price`, where)
  return { quantity, unitPrice, currency }
}

function parseBreaksAndCurrency(
  value: unknown,
  sku: string,
  where: string,
): { readonly breaks: readonly PriceBreak[]; readonly currency: string } {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Mouser ${where}: PriceBreaks is missing or empty; ${sku} has no price to record.`)
  }
  const parsed = value.map((item, index) => parseBreakRecord(item, index, where))
  const currencies = new Set(parsed.map((item) => item.currency))
  if (currencies.size !== 1) {
    throw new Error(
      `Mouser ${where}: PriceBreaks for ${sku} report more than one currency (${[...currencies].join(", ")}).`,
    )
  }
  const currency = parsed[0].currency
  if (currency !== "USD") {
    throw new Error(
      `Mouser ${where}: ${sku} is priced in "${currency}", not "USD". Check the Mouser account's ` +
        "currency setting (this tool assumes a US-dollar, US-locale account).",
    )
  }
  const breaks = parsed
    .map(({ quantity, unitPrice }) => ({ quantity, unitPrice }))
    .slice()
    .sort((a, b) => a.quantity - b.quantity)
  return { breaks, currency }
}

function parseParameters(value: unknown, where: string): Record<string, string> {
  if (value === null || value === undefined) return {}
  if (!Array.isArray(value)) {
    throw new Error(`Mouser ${where}: ProductAttributes is a ${typeof value}, not an array.`)
  }
  const parameters: Record<string, string> = {}
  value.forEach((item, index) => {
    const what = `ProductAttributes[${index}]`
    const record = requireRecord(item, what, where)
    const name = requireNonEmptyString(record["AttributeName"], `${what}.AttributeName`, where)
    const attributeValue = requireNonEmptyString(record["AttributeValue"], `${what}.AttributeValue`, where)
    parameters[name] = attributeValue
  })
  return parameters
}

function parsePart(value: unknown, index: number, endpoint: string, today: () => string): SupplierOffer {
  const where = `${endpoint} Parts[${index}]`
  const record = requireRecord(value, `Parts[${index}]`, endpoint)

  const sku = requireNonEmptyString(record["MouserPartNumber"], "MouserPartNumber", where)
  const manufacturer = requireNonEmptyString(record["Manufacturer"], "Manufacturer", where)
  const mpn = requireNonEmptyString(record["ManufacturerPartNumber"], "ManufacturerPartNumber", where)
  const description = requireNonEmptyString(record["Description"], "Description", where)
  const url = requireNonEmptyString(record["ProductDetailUrl"], "ProductDetailUrl", where)

  const datasheetValue = record["DataSheetUrl"]
  const datasheetUrl =
    typeof datasheetValue === "string" && datasheetValue.trim() !== "" ? datasheetValue : undefined

  const stockValue = record["AvailabilityInStock"]
  if (typeof stockValue !== "string" || stockValue.trim() === "") {
    throw new Error(
      `Mouser ${where}: ${sku} has no usable "AvailabilityInStock" (got ${JSON.stringify(stockValue)}, ` +
        "expected a numeric string, e.g. \"0\" for no stock).",
    )
  }
  const stock = Number(stockValue)
  if (!Number.isFinite(stock)) {
    throw new Error(`Mouser ${where}: ${sku}'s "AvailabilityInStock" ("${stockValue}") is not a number.`)
  }

  const { breaks, currency } = parseBreaksAndCurrency(record["PriceBreaks"], sku, where)
  const parameters = parseParameters(record["ProductAttributes"], where)

  return {
    supplier: "Mouser",
    sku,
    manufacturer,
    mpn,
    description,
    url,
    datasheetUrl,
    stock,
    currency,
    breaks,
    parameters,
    fetched: today(),
  }
}

/** `Errors` non-empty is Mouser's own refusal (bad key, rate limit, malformed request); every
 * entry's `Message` is named, never the key (the key lives only in the request URL). */
function parseErrors(value: unknown, endpoint: string): void {
  if (!Array.isArray(value)) {
    throw new Error(`Mouser ${endpoint}: response is missing an "Errors" array.`)
  }
  if (value.length === 0) return
  const messages = value.map((item, index) =>
    requireNonEmptyString(requireRecord(item, `Errors[${index}]`, endpoint)["Message"], `Errors[${index}].Message`, endpoint),
  )
  throw new Error(`Mouser ${endpoint} refused the request: ${messages.join("; ")}`)
}

function parseParts(json: unknown, endpoint: string, today: () => string): readonly SupplierOffer[] {
  const record = requireRecord(json, "the response", endpoint)
  parseErrors(record["Errors"], endpoint)

  const results = requireRecord(record["SearchResults"], "SearchResults", endpoint)
  const partsValue = results["Parts"]
  if (partsValue === null || partsValue === undefined) return []
  if (!Array.isArray(partsValue)) {
    throw new Error(`Mouser ${endpoint}: SearchResults.Parts is a ${typeof partsValue}, not an array.`)
  }
  return partsValue.map((part, index) => parsePart(part, index, endpoint, today))
}

function sameText(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export function mouserClient(credentials: MouserCredentials, fetch: FetchLike, today: () => string): SupplierClient {
  async function searchByPartNumber(partNumber: string): Promise<readonly SupplierOffer[]> {
    const json = await postJson(fetch, "Mouser", partnumberUrl(credentials.apiKey), PARTNUMBER_PATH, {
      SearchByPartRequest: { mouserPartNumber: partNumber, partSearchOptions: "Exact" },
    })
    return parseParts(json, PARTNUMBER_PATH, today)
  }

  async function lookup(mpn: string): Promise<readonly SupplierOffer[]> {
    const offers = await searchByPartNumber(mpn)
    return offers.filter((offer) => sameText(offer.mpn, mpn))
  }

  async function lookupSku(sku: string): Promise<SupplierOffer | undefined> {
    const offers = await searchByPartNumber(sku)
    return offers.find((offer) => sameText(offer.sku, sku))
  }

  async function search(keywords: string, limit: number): Promise<readonly SupplierOffer[]> {
    const json = await postJson(fetch, "Mouser", keywordUrl(credentials.apiKey), KEYWORD_PATH, {
      SearchByKeywordRequest: { keyword: keywords, records: limit, startingRecord: 0 },
    })
    return parseParts(json, KEYWORD_PATH, today)
  }

  return { name: "Mouser", lookup, lookupSku, search }
}
