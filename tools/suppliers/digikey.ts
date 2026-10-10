/**
 * The Digi-Key Product Information API v4 client. OAuth2 client-credentials flow only (the
 * application's registered callback URL is never used); the token is cached until 30 s
 * before its stated `expires_in`, by the injected `now()` (milliseconds).
 *
 * - token: `POST /v1/oauth2/token`, form body `client_id`, `client_secret`,
 *   `grant_type=client_credentials`
 * - `lookupSku`: `GET /products/v4/search/{productNumber}/productdetails` with the Digi-Key
 *   product number; the response is the whole product (every packaging variation), and the
 *   one variation with that number is returned. 404 means Digi-Key does not list it.
 * - `lookup` and `search`: `POST /products/v4/search/keyword` with
 *   `{ Keywords, Limit, Offset: 0 }`. `lookup` keeps only exact manufacturer-part-number
 *   matches, from `ExactMatches` and `Products` both, one offer per SKU.
 *
 * `lookup` deliberately does not use product details: the recordings show product details
 * answering 404 "Duplicate Products found ... provide manufacturerId" for an mpn that more
 * than one manufacturer makes (`digikey-productdetails-2n3904-duplicate.json`), where keyword
 * search lists every one of them (`digikey-keyword-2n3904.json`).
 *
 * The client ID, the secret and the token never reach an error: every request goes through
 * `requestJson` (tools/suppliers/http.ts) with all three as redacted secrets.
 *
 * Design: docs/superpowers/specs/2026-09-30-supplier-search-design.md
 */
import { requestJson, type JsonRequest } from "./http.ts"
import { parseDetails, parseKeyword, parseToken } from "./digikey-parse.ts"
import type { DigikeyCredentials } from "./credentials.ts"
import type { FetchLike, SupplierClient, SupplierOffer } from "./types.ts"

const HOST = "https://api.digikey.com"
const TOKEN_PATH = "oauth2/token"
const KEYWORD_PATH = "products/v4/search/keyword"
/** How many products a `lookup` asks for; exact matches arrive in `ExactMatches` regardless. */
const LOOKUP_LIMIT = 10
const TOKEN_MARGIN_SECONDS = 30

function detailsPath(productNumber: string): string {
  return `products/v4/search/${encodeURIComponent(productNumber)}/productdetails`
}

function sameText(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

interface CachedToken {
  readonly accessToken: string
  readonly expiresAt: number
}

export function digikeyClient(
  credentials: DigikeyCredentials,
  fetch: FetchLike,
  today: () => string,
  now: () => number,
): SupplierClient {
  let cached: CachedToken | undefined

  function secrets(): readonly string[] {
    const values = [credentials.clientId, credentials.clientSecret]
    return cached !== undefined ? [...values, cached.accessToken] : values
  }

  async function token(): Promise<string> {
    const issuedAt = now()
    if (cached !== undefined && issuedAt < cached.expiresAt) return cached.accessToken
    const response = await requestJson(fetch, "Digi-Key", {
      method: "POST",
      url: `${HOST}/v1/${TOKEN_PATH}`,
      endpointPath: TOKEN_PATH,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        grant_type: "client_credentials",
      }).toString(),
      secrets: secrets(),
    })
    const issued = parseToken(response.json, TOKEN_PATH)
    cached = {
      accessToken: issued.accessToken,
      expiresAt: issuedAt + (issued.expiresInSeconds - TOKEN_MARGIN_SECONDS) * 1000,
    }
    return issued.accessToken
  }

  async function productRequest(
    request: Pick<JsonRequest, "method" | "endpointPath" | "body" | "passStatuses">,
  ): Promise<{ status: number; json: unknown }> {
    const accessToken = await token()
    return requestJson(fetch, "Digi-Key", {
      ...request,
      url: `${HOST}/${request.endpointPath}`,
      headers: {
        "X-DIGIKEY-Client-Id": credentials.clientId,
        Authorization: `Bearer ${accessToken}`,
        "X-DIGIKEY-Locale-Site": "US",
        "X-DIGIKEY-Locale-Language": "en",
        "X-DIGIKEY-Locale-Currency": "USD",
        ...(request.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      secrets: secrets(),
    })
  }

  async function keyword(keywords: string, limit: number) {
    const response = await productRequest({
      method: "POST",
      endpointPath: KEYWORD_PATH,
      body: JSON.stringify({ Keywords: keywords, Limit: limit, Offset: 0 }),
    })
    return parseKeyword(response.json, KEYWORD_PATH, today())
  }

  async function lookup(mpn: string): Promise<readonly SupplierOffer[]> {
    const { exactMatches, products } = await keyword(mpn.trim(), LOOKUP_LIMIT)
    const bySku = new Map<string, SupplierOffer>()
    for (const offer of [...exactMatches, ...products]) {
      if (sameText(offer.mpn, mpn) && !bySku.has(offer.sku)) bySku.set(offer.sku, offer)
    }
    return [...bySku.values()]
  }

  async function lookupSku(sku: string): Promise<SupplierOffer | undefined> {
    const endpointPath = detailsPath(sku.trim())
    const response = await productRequest({ method: "GET", endpointPath, passStatuses: [404] })
    if (response.status === 404) return undefined
    return parseDetails(response.json, endpointPath, today()).find((offer) => sameText(offer.sku, sku))
  }

  async function search(keywords: string, limit: number): Promise<readonly SupplierOffer[]> {
    return (await keyword(keywords, limit)).products
  }

  return { name: "Digi-Key", lookup, lookupSku, search }
}
