/**
 * The Digi-Key Product Information API v4 client. OAuth2 client-credentials flow only (the
 * application's registered callback URL is never used); the token is cached until 30 s
 * before its stated `expires_in`, by the injected `now()` (milliseconds).
 *
 * - token: `POST /v1/oauth2/token`, form body `client_id`, `client_secret`,
 *   `grant_type=client_credentials`
 * - `lookupSku`: `GET /products/v4/search/{productNumber}/productdetails` with the Digi-Key
 *   product number; the response is the whole product (every packaging variation), and the
 *   one variation with that number is returned. Only Digi-Key's recorded "Requested
 *   Product ... Not Found" 404 means it does not list it; any other 404 is refused.
 * - `lookup` and `search`: `POST /products/v4/search/keyword` with
 *   `{ Keywords, Limit, Offset }`. `search` reads one page. `lookup` pages by `Offset`
 *   until it has seen every product `ProductsCount` reports, keeping only exact
 *   manufacturer-part-number matches from `ExactMatches` and `Products` both, one offer per
 *   SKU; past `LOOKUP_MAX_PAGES` it refuses rather than return a list that could be short.
 *
 * `lookup` deliberately does not use product details: the recordings show product details
 * answering 404 "Duplicate Products found ... provide manufacturerId" for an mpn that more
 * than one manufacturer makes (`digikey-productdetails-2n3904-duplicate.json`), where keyword
 * search returns several makers' listings (`digikey-keyword-2n3904.json`).
 *
 * The client ID, the secret and the token never reach an error: every request goes through
 * `requestJson` (tools/suppliers/http.ts) with all three as redacted secrets.
 *
 * Design: docs/superpowers/specs/2026-09-30-supplier-search-design.md
 */
import { redactSecrets, requestJson, type JsonRequest } from "./http.ts"
import { isProductNotFound, parseDetails, parseKeyword, parseToken, problemDetail } from "./digikey-parse.ts"
import type { DigikeyCredentials } from "./credentials.ts"
import type { FetchLike, SupplierClient, SupplierOffer } from "./types.ts"

const HOST = "https://api.digikey.com"
const TOKEN_PATH = "oauth2/token"
const KEYWORD_PATH = "products/v4/search/keyword"
/** The page size `lookup` walks keyword results in: the largest `Limit` Digi-Key's v4
 * keyword search is documented to accept. */
export const LOOKUP_PAGE_SIZE = 50
/** How many pages `lookup` walks before refusing: past this, the exact matches it found
 * could not be known to be all of them. */
export const LOOKUP_MAX_PAGES = 10
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

  async function keyword(keywords: string, limit: number, offset: number) {
    const response = await productRequest({
      method: "POST",
      endpointPath: KEYWORD_PATH,
      body: JSON.stringify({ Keywords: keywords, Limit: limit, Offset: offset }),
    })
    return parseKeyword(response.json, KEYWORD_PATH, today())
  }

  function tooManyProducts(mpn: string, total: number): Error {
    return new Error(
      `Digi-Key ${KEYWORD_PATH}: a search for "${mpn}" finds ${total} products, more than the ` +
        `${LOOKUP_MAX_PAGES} pages of ${LOOKUP_PAGE_SIZE} this tool reads, so its exact matches could ` +
        "be incomplete and none are returned. Name the Digi-Key product number instead: " +
        `bun run parts source ${mpn.trim()} --supplier digikey --use <use> --sku <Digi-Key product number>.`,
    )
  }

  /** Every exact mpn match, from `ExactMatches` and `Products` of every page of the keyword
   * search - paged by `Offset` until every product `ProductsCount` reports has been seen. A
   * list that could be truncated is refused, never returned. */
  async function lookup(mpn: string): Promise<readonly SupplierOffer[]> {
    const bySku = new Map<string, SupplierOffer>()
    let seen = 0
    for (let page = 0; ; page += 1) {
      const result = await keyword(mpn.trim(), LOOKUP_PAGE_SIZE, seen)
      if (result.totalProducts > LOOKUP_PAGE_SIZE * LOOKUP_MAX_PAGES) throw tooManyProducts(mpn, result.totalProducts)
      for (const offer of [...result.exactMatches, ...result.products]) {
        if (sameText(offer.mpn, mpn) && !bySku.has(offer.sku)) bySku.set(offer.sku, offer)
      }
      seen += result.pageProducts
      if (seen >= result.totalProducts) return [...bySku.values()]
      if (result.pageProducts === 0) {
        throw new Error(
          `Digi-Key ${KEYWORD_PATH}: a search for "${mpn}" reports ${result.totalProducts} products, but the ` +
            `page at offset ${seen} held none, so its exact matches cannot be known to be complete. Try ` +
            "again, or name the Digi-Key product number with --sku.",
        )
      }
      if (page + 1 >= LOOKUP_MAX_PAGES) throw tooManyProducts(mpn, result.totalProducts)
    }
  }

  /** The one variation with that Digi-Key product number. `undefined` only for Digi-Key's
   * own "Requested Product ... Not Found" answer; any other 404, or a product returned
   * without that variation, is refused naming the SKU and what came back. */
  async function lookupSku(sku: string): Promise<SupplierOffer | undefined> {
    const endpointPath = detailsPath(sku.trim())
    const response = await productRequest({ method: "GET", endpointPath, passStatuses: [404] })
    if (response.status === 404) {
      if (isProductNotFound(response.json)) return undefined
      const detail = problemDetail(response.json)
      const quoted = detail === undefined ? "" : `: ${redactSecrets(detail, secrets(), `${HOST}/${endpointPath}`, endpointPath)}`
      throw new Error(
        `Digi-Key ${endpointPath}: HTTP 404 for SKU "${sku}" that is not Digi-Key's "Requested Product ` +
          `... Not Found" answer${quoted}. Check that "${sku}" is a Digi-Key product number, not a ` +
          "manufacturer part number.",
      )
    }
    const offers = parseDetails(response.json, endpointPath, today())
    const offer = offers.find((candidate) => sameText(candidate.sku, sku))
    if (offer === undefined) {
      throw new Error(
        `Digi-Key ${endpointPath}: HTTP ${response.status} for SKU "${sku}" returned ${offers[0].mpn} with ` +
          `no variation of that number (it lists ${offers.map((candidate) => candidate.sku).join(", ")}). ` +
          "The product number may have been replaced; choose one of those.",
      )
    }
    return offer
  }

  async function search(keywords: string, limit: number): Promise<readonly SupplierOffer[]> {
    return (await keyword(keywords, limit, 0)).products
  }

  return { name: "Digi-Key", lookup, lookupSku, search }
}
