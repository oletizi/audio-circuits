/**
 * Shared fakes for the Digi-Key client tests: the recorded fixtures, and a fetch that
 * answers the token endpoint and the two product endpoints from them while recording every
 * request it was sent. Nothing here touches the network or the real credentials file.
 */
import fs from "node:fs"
import path from "node:path"
import type { FetchLike } from "../../tools/suppliers/types.ts"

const FIXTURES_DIR = path.join(import.meta.dir, "../fixtures/suppliers")

export function fixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), "utf8")
}

/** The recorded token response, with the scrubbed token put back as a fake one. */
export const FAKE_TOKEN = "FAKE-TOKEN-3f9a1c"
export const TOKEN_BODY = fixture("digikey-token.json").replace("<redacted>", FAKE_TOKEN)
export const DETAILS_CT = fixture("digikey-productdetails-311-100kcrct-nd.json")
export const DETAILS_NOT_FOUND = fixture("digikey-productdetails-not-found.json")
export const KEYWORD_RC0805 = fixture("digikey-keyword-rc0805fr-07100kl.json")
export const KEYWORD_MFR25 = fixture("digikey-keyword-mfr-25fbf52-100k.json")
export const KEYWORD_10UF = fixture("digikey-keyword-10uf-35v-radial.json")
export const KEYWORD_2N3904 = fixture("digikey-keyword-2n3904.json")

export const CREDENTIALS = { clientId: "FAKE-CLIENT-ID-71b2", clientSecret: "FAKE-SECRET-90d4e" }
export const TODAY = () => "2026-10-09"

export interface SentRequest {
  readonly url: string
  readonly method: string
  readonly headers: Record<string, string>
  readonly body?: string
}

export interface Reply {
  readonly status: number
  readonly body: string
}

/** Answers the token endpoint with `token` and every other URL by the first matching
 * `routes` needle; records every request in `sent`. */
export function recordingFetch(
  routes: Record<string, Reply>,
  token: Reply = { status: 200, body: TOKEN_BODY },
): { fetch: FetchLike; sent: SentRequest[] } {
  const sent: SentRequest[] = []
  const fetch: FetchLike = async (url, init) => {
    sent.push({ url, method: init.method, headers: init.headers, body: init.body })
    const reply = url.endsWith("/v1/oauth2/token")
      ? token
      : Object.entries(routes).find(([needle]) => url.includes(needle))?.[1]
    if (reply === undefined) throw new Error(`recordingFetch: no fixture registered for ${url}`)
    return { status: reply.status, text: async () => reply.body }
  }
  return { fetch, sent }
}

export function ok(body: string): Reply {
  return { status: 200, body }
}

/** A minimal Digi-Key search response holding the given products, as the keyword endpoint
 * shapes it (SearchLocaleUsed at the top, Products and ExactMatches arrays). */
export function keywordBody(
  products: readonly Record<string, unknown>[],
  exact: readonly Record<string, unknown>[] = [],
  currency = "USD",
): string {
  return JSON.stringify({
    Products: products,
    ProductsCount: products.length,
    ExactMatches: exact,
    SearchLocaleUsed: { Site: "US", Language: "en", Currency: currency },
  })
}

/** One minimal Digi-Key product with the given variations. */
export function product(mpn: string, variations: readonly Record<string, unknown>[]): Record<string, unknown> {
  return {
    Description: { ProductDescription: `${mpn} description`, DetailedDescription: "detail" },
    Manufacturer: { Id: 1, Name: "Acme" },
    ManufacturerProductNumber: mpn,
    ProductUrl: `https://www.digikey.com/${mpn}`,
    DatasheetUrl: "",
    Parameters: [],
    ProductVariations: variations,
  }
}

/** One minimal Digi-Key product variation. */
export function variation(sku: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    DigiKeyProductNumber: sku,
    PackageType: { Id: 2, Name: "Cut Tape (CT)" },
    StandardPricing: [{ BreakQuantity: 1, UnitPrice: 0.5, TotalPrice: 0.5 }],
    MarketPlace: false,
    QuantityAvailableforPackageType: 10,
    DigiReelFee: 0,
    ...overrides,
  }
}
