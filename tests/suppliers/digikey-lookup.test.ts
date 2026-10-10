import { test, expect } from "bun:test"
import { digikeyClient, LOOKUP_MAX_PAGES, LOOKUP_PAGE_SIZE } from "../../tools/suppliers/digikey.ts"
import { isRecord } from "../../tools/perfboard/guards.ts"
import type { FetchLike } from "../../tools/suppliers/types.ts"
import {
  CREDENTIALS, DETAILS_CT, TOKEN_BODY, TODAY, fixture, ok, product, recordingFetch, variation,
} from "./digikey-helpers.ts"

const T0 = 1_760_000_000_000

function page(products: readonly Record<string, unknown>[], total: number, exact: readonly Record<string, unknown>[] = []): string {
  return JSON.stringify({
    Products: products,
    ProductsCount: total,
    ExactMatches: exact,
    SearchLocaleUsed: { Site: "US", Language: "en", Currency: "USD" },
  })
}

/** Answers the keyword search by the request's `Offset`, from `pages` (keyed by offset);
 * records every offset asked for. */
function pagedFetch(pages: Record<number, string>): { fetch: FetchLike; offsets: number[] } {
  const offsets: number[] = []
  const fetch: FetchLike = async (url, init) => {
    if (url.endsWith("/v1/oauth2/token")) return { status: 200, text: async () => TOKEN_BODY }
    const request: unknown = JSON.parse(init.body ?? "{}")
    const offset = isRecord(request) ? request["Offset"] : undefined
    if (typeof offset !== "number") throw new Error("pagedFetch: request has no numeric Offset")
    offsets.push(offset)
    const body = pages[offset]
    if (body === undefined) throw new Error(`pagedFetch: no page registered at offset ${offset}`)
    return { status: 200, text: async () => body }
  }
  return { fetch, offsets }
}

test("lookup pages through every product the count reports, collecting exact matches from each page", async () => {
  const first = [product("PART-1", [variation("A-1-ND")]), product("PART-1X", [variation("X-1-ND")])]
  const second = [product("PART-1", [variation("B-1-ND")])]
  const { fetch, offsets } = pagedFetch({ 0: page(first, 3), 2: page(second, 3) })
  const offers = await digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookup("PART-1")
  expect(offsets).toEqual([0, 2])
  expect(offers.map((offer) => offer.sku)).toEqual(["A-1-ND", "B-1-ND"])
})

test("lookup refuses, naming the mpn, the count and --sku, when the search finds more products than it pages through", async () => {
  const total = LOOKUP_PAGE_SIZE * LOOKUP_MAX_PAGES + 1
  const { fetch, offsets } = pagedFetch({ 0: page([product("BIG-1", [variation("BIG-1-ND")])], total) })
  await expect(digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookup("BIG-1")).rejects.toThrow(
    new RegExp(`"BIG-1" finds ${total} products.*none are returned.*--sku`, "s"),
  )
  expect(offsets).toEqual([0])
})

test("lookup refuses when a page comes back empty before the reported count is reached", async () => {
  const { fetch } = pagedFetch({ 0: page([product("GAP-1", [variation("GAP-1-ND")])], 4), 1: page([], 4) })
  await expect(digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookup("GAP-1")).rejects.toThrow(
    /"GAP-1" reports 4 products, but the page at offset 1 held none/,
  )
})

test("lookupSku refuses Digi-Key's duplicate-products 404, naming the SKU, the status and Digi-Key's detail", async () => {
  const body = fixture("digikey-productdetails-2n3904-duplicate.json")
  const { fetch } = recordingFetch({ productdetails: { status: 404, body } })
  await expect(digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookupSku("2N3904")).rejects.toThrow(
    /HTTP 404 for SKU "2N3904".*Duplicate Products found for 2n3904/s,
  )
})

test("lookupSku refuses a 404 that is not Digi-Key's problem body (a wrong endpoint or gateway)", async () => {
  const { fetch } = recordingFetch({ productdetails: { status: 404, body: JSON.stringify({ message: "no route" }) } })
  await expect(digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookupSku("311-100KCRCT-ND")).rejects.toThrow(
    /HTTP 404 for SKU "311-100KCRCT-ND" that is not Digi-Key's "Requested Product \.\.\. Not Found" answer\./,
  )
})

test("lookupSku refuses a 404 whose body is not JSON, naming the status", async () => {
  const { fetch } = recordingFetch({ productdetails: { status: 404, body: "<html>Not Found</html>" } })
  await expect(digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookupSku("311-100KCRCT-ND")).rejects.toThrow(
    /311-100KCRCT-ND\/productdetails \(HTTP 404\): response body was not valid JSON/,
  )
})

test("lookupSku refuses a product returned without a variation of that SKU, listing the ones it has", async () => {
  const { fetch } = recordingFetch({ productdetails: ok(DETAILS_CT) })
  await expect(digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookupSku("311-100KCROLD-ND")).rejects.toThrow(
    /HTTP 200 for SKU "311-100KCROLD-ND" returned RC0805FR-07100KL with no variation of that number \(it lists 311-100KCRTR-ND, 311-100KCRCT-ND, 311-100KCRDKR-ND\)/,
  )
})

test("a Digi-Reel listing carries its fee and the product's cut-tape SKU; a Marketplace listing its seller", async () => {
  const { fetch } = recordingFetch({ productdetails: ok(DETAILS_CT) })
  const client = digikeyClient(CREDENTIALS, fetch, TODAY, () => T0)
  const reel = await client.lookupSku("311-100KCRDKR-ND")
  expect(reel?.reelingFee).toBe(7)
  expect(reel?.cutTapeSku).toBe("311-100KCRCT-ND")
  const cutTape = await client.lookupSku("311-100KCRCT-ND")
  expect(cutTape?.reelingFee).toBeUndefined()
  expect(cutTape?.cutTapeSku).toBeUndefined()

  const marketplace = page(
    [product("MP-1", [variation("MP-1-ND", { MarketPlace: true, Supplier: { Id: 9, Name: "Third Party Co" } })])],
    1,
  )
  const market = recordingFetch({ "search/keyword": ok(marketplace) })
  const offers = await digikeyClient(CREDENTIALS, market.fetch, TODAY, () => T0).lookup("MP-1")
  expect(offers[0].marketplaceSeller).toBe("Third Party Co")
})
