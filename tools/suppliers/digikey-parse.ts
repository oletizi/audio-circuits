/**
 * Parsing Digi-Key Product Information API v4 responses into `SupplierOffer`s. Built from
 * real recorded responses (tests/fixtures/suppliers/digikey-*.json), not from the
 * published schema. What they showed:
 *
 * - Both endpoints state the locale they answered in at the top level,
 *   `SearchLocaleUsed: { Site, Language, Currency }`; prices carry no currency of their
 *   own. Anything but "USD" is refused.
 * - Product details answers `{ Product: {...} }`; keyword search answers
 *   `{ Products: [...], ExactMatches: [...], ProductsCount, ... }`, the same product shape
 *   in both arrays (and often the same product in both).
 * - A product has one manufacturer part number but several `ProductVariations` - cut
 *   tape, tape and reel, Digi-Reel, bulk - each with its own `DigiKeyProductNumber`,
 *   `PackageType.Name`, `StandardPricing` (`BreakQuantity`, `UnitPrice`) and
 *   `QuantityAvailableforPackageType`. Each variation is its own offer: they are different
 *   orderable listings with different prices, and must never be merged.
 * - A Digi-Reel variation states a `DigiReelFee` (a per-order reeling charge) on top of its
 *   breaks; a Marketplace variation (`MarketPlace: true`) is sold by the third party named in
 *   its `Supplier`. Both are carried into the offer's `packaging` text.
 * - `Parameters` is a list of `{ ParameterText, ValueText }`.
 *
 * Stock or prices a variation does not state (absent, null, or an empty pricing list) are
 * "not stated" / "not listed", exactly as for Mouser; a present value of the wrong type is
 * malformed and refused.
 *
 * Design: docs/superpowers/specs/2026-09-30-supplier-search-design.md
 */
import { isRecord } from "../perfboard/guards.ts"
import type { PriceBreak, SupplierOffer } from "./types.ts"

function requireRecord(value: unknown, what: string, where: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`Digi-Key ${where}: ${what} is a ${typeof value}, not an object.`)
  return value
}

function requireNonEmptyString(value: unknown, what: string, where: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Digi-Key ${where}: ${what} is missing or not a non-empty string.`)
  }
  return value
}

function requireFiniteNumber(value: unknown, what: string, where: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Digi-Key ${where}: ${what} is a ${typeof value}, not a finite number.`)
  }
  return value
}

function requireArray(value: unknown, what: string, where: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`Digi-Key ${where}: ${what} is a ${typeof value}, not an array.`)
  return value
}

/** The response's stated currency, which must be USD (the tool assumes a US-dollar, US
 * locale, and asks for it in every request's headers). */
function requireUsd(json: Record<string, unknown>, where: string): void {
  const locale = requireRecord(json["SearchLocaleUsed"], "SearchLocaleUsed", where)
  const currency = requireNonEmptyString(locale["Currency"], "SearchLocaleUsed.Currency", where)
  if (currency !== "USD") {
    throw new Error(
      `Digi-Key ${where}: the response is priced in "${currency}", not "USD". The request asks ` +
        "for USD in X-DIGIKEY-Locale-Currency; check that header and the account's settings.",
    )
  }
}

function parseStock(value: unknown, sku: string, where: string): number | undefined {
  if (value === null || value === undefined) return undefined
  return requireFiniteNumber(value, `${sku}'s QuantityAvailableforPackageType`, where)
}

function parseBreaks(value: unknown, sku: string, where: string): readonly PriceBreak[] {
  if (value === null || value === undefined) return []
  return requireArray(value, `${sku}'s StandardPricing`, where)
    .map((item, index) => {
      const what = `${sku}'s StandardPricing[${index}]`
      const record = requireRecord(item, what, where)
      return {
        quantity: requireFiniteNumber(record["BreakQuantity"], `${what}.BreakQuantity`, where),
        unitPrice: requireFiniteNumber(record["UnitPrice"], `${what}.UnitPrice`, where),
      }
    })
    .sort((a, b) => a.quantity - b.quantity)
}

function parseParameters(value: unknown, where: string): Record<string, string> {
  if (value === null || value === undefined) return {}
  const parameters: Record<string, string> = {}
  requireArray(value, "Parameters", where).forEach((item, index) => {
    const what = `Parameters[${index}]`
    const record = requireRecord(item, what, where)
    const name = requireNonEmptyString(record["ParameterText"], `${what}.ParameterText`, where)
    parameters[name] = requireNonEmptyString(record["ValueText"], `${what}.ValueText`, where)
  })
  return parameters
}

/** The variation's package type, plus what else Digi-Key states about buying it that the
 * breaks alone do not show: a Digi-Reel fee, or a Marketplace seller. */
function parsePackaging(record: Record<string, unknown>, sku: string, where: string): string {
  const packageType = requireRecord(record["PackageType"], `${sku}'s PackageType`, where)
  let packaging = requireNonEmptyString(packageType["Name"], `${sku}'s PackageType.Name`, where)
  const fee = record["DigiReelFee"]
  if (fee !== null && fee !== undefined) {
    const amount = requireFiniteNumber(fee, `${sku}'s DigiReelFee`, where)
    if (amount > 0) packaging += ` (plus a $${amount.toFixed(2)} Digi-Reel fee per order)`
  }
  if (record["MarketPlace"] === true) {
    const supplier = requireRecord(record["Supplier"], `${sku}'s Supplier`, where)
    packaging += `, Marketplace seller ${requireNonEmptyString(supplier["Name"], `${sku}'s Supplier.Name`, where)}`
  }
  return packaging
}

interface ProductFields {
  readonly manufacturer: string
  readonly mpn: string
  readonly description: string
  readonly url: string
  readonly datasheetUrl?: string
  readonly parameters: Readonly<Record<string, string>>
}

function parseVariation(value: unknown, index: number, product: ProductFields, where: string, fetched: string): SupplierOffer {
  const record = requireRecord(value, `${product.mpn}'s ProductVariations[${index}]`, where)
  const sku = requireNonEmptyString(
    record["DigiKeyProductNumber"],
    `${product.mpn}'s ProductVariations[${index}].DigiKeyProductNumber`,
    where,
  )
  const breaks = parseBreaks(record["StandardPricing"], sku, where)
  return {
    supplier: "Digi-Key",
    sku,
    manufacturer: product.manufacturer,
    mpn: product.mpn,
    description: product.description,
    url: product.url,
    ...(product.datasheetUrl !== undefined ? { datasheetUrl: product.datasheetUrl } : {}),
    packaging: parsePackaging(record, sku, where),
    stock: parseStock(record["QuantityAvailableforPackageType"], sku, where),
    currency: breaks.length > 0 ? "USD" : undefined,
    breaks,
    parameters: product.parameters,
    fetched,
  }
}

/** One offer per variation of the product. A product with no variations at all has
 * nothing orderable and was never seen in a recording, so it is refused rather than
 * quietly yielding nothing. */
function parseProduct(value: unknown, what: string, endpoint: string, fetched: string): readonly SupplierOffer[] {
  const where = `${endpoint} ${what}`
  const record = requireRecord(value, what, endpoint)
  const mpn = requireNonEmptyString(record["ManufacturerProductNumber"], "ManufacturerProductNumber", where)
  const description = requireRecord(record["Description"], "Description", where)
  const datasheet = record["DatasheetUrl"]
  const product: ProductFields = {
    manufacturer: requireNonEmptyString(requireRecord(record["Manufacturer"], "Manufacturer", where)["Name"], "Manufacturer.Name", where),
    mpn,
    description: requireNonEmptyString(description["ProductDescription"], "Description.ProductDescription", where),
    url: requireNonEmptyString(record["ProductUrl"], "ProductUrl", where),
    datasheetUrl: typeof datasheet === "string" && datasheet.trim() !== "" ? datasheet : undefined,
    parameters: parseParameters(record["Parameters"], where),
  }
  const variations = requireArray(record["ProductVariations"], `${mpn}'s ProductVariations`, where)
  if (variations.length === 0) {
    throw new Error(`Digi-Key ${where}: ${mpn} has no ProductVariations, so nothing to order it as.`)
  }
  return variations.map((variation, index) => parseVariation(variation, index, product, where, fetched))
}

/** A product-details response: every variation of the one product. */
export function parseDetails(json: unknown, endpoint: string, fetched: string): readonly SupplierOffer[] {
  const record = requireRecord(json, "the response", endpoint)
  requireUsd(record, endpoint)
  return parseProduct(record["Product"], "Product", endpoint, fetched)
}

export interface KeywordOffers {
  readonly products: readonly SupplierOffer[]
  readonly exactMatches: readonly SupplierOffer[]
}

/** A keyword-search response: the offers of `Products` and of `ExactMatches`, apart. */
export function parseKeyword(json: unknown, endpoint: string, fetched: string): KeywordOffers {
  const record = requireRecord(json, "the response", endpoint)
  requireUsd(record, endpoint)
  const offersOf = (key: string): readonly SupplierOffer[] => {
    const value = record[key]
    if (value === null || value === undefined) return []
    return requireArray(value, key, endpoint).flatMap((item, index) => parseProduct(item, `${key}[${index}]`, endpoint, fetched))
  }
  return { products: offersOf("Products"), exactMatches: offersOf("ExactMatches") }
}

export interface IssuedToken {
  readonly accessToken: string
  readonly expiresInSeconds: number
}

/** The token response. Never quotes the body: it carries the token. */
export function parseToken(json: unknown, endpoint: string): IssuedToken {
  const record = requireRecord(json, "the response", endpoint)
  const accessToken = requireNonEmptyString(record["access_token"], "access_token", endpoint)
  const tokenType = requireNonEmptyString(record["token_type"], "token_type", endpoint)
  if (tokenType.toLowerCase() !== "bearer") {
    throw new Error(`Digi-Key ${endpoint}: token_type is "${tokenType}", not "Bearer".`)
  }
  const expiresInSeconds = requireFiniteNumber(record["expires_in"], "expires_in", endpoint)
  return { accessToken, expiresInSeconds }
}
