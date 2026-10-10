import { test, expect } from "bun:test"
import { digikeyClient } from "../../tools/suppliers/digikey.ts"
import {
  CREDENTIALS, DETAILS_CT, DETAILS_NOT_FOUND, FAKE_TOKEN, KEYWORD_10UF, KEYWORD_2N3904, KEYWORD_RC0805, TODAY,
  keywordBody, ok, product, recordingFetch, variation,
} from "./digikey-helpers.ts"

const T0 = 1_760_000_000_000
const MINUTE = 60_000

test("the first request fetches a client-credentials token; +5 min reuses it; +10 min fetches a new one", async () => {
  let clock = T0
  const { fetch, sent } = recordingFetch({ productdetails: ok(DETAILS_CT) })
  const client = digikeyClient(CREDENTIALS, fetch, TODAY, () => clock)

  await client.lookupSku("311-100KCRCT-ND")
  const tokenRequests = () => sent.filter((request) => request.url.endsWith("/v1/oauth2/token"))
  expect(tokenRequests()).toHaveLength(1)
  const tokenRequest = tokenRequests()[0]
  expect(tokenRequest.url).toBe("https://api.digikey.com/v1/oauth2/token")
  expect(tokenRequest.method).toBe("POST")
  expect(tokenRequest.headers["Content-Type"]).toBe("application/x-www-form-urlencoded")
  const form = new URLSearchParams(tokenRequest.body ?? "")
  expect(form.get("client_id")).toBe(CREDENTIALS.clientId)
  expect(form.get("client_secret")).toBe(CREDENTIALS.clientSecret)
  expect(form.get("grant_type")).toBe("client_credentials")

  clock = T0 + 5 * MINUTE
  await client.lookupSku("311-100KCRCT-ND")
  expect(tokenRequests()).toHaveLength(1)

  // The recorded token lives 599 s; it is reused until 30 s before that, so +10 min is past it.
  clock = T0 + 10 * MINUTE
  await client.lookupSku("311-100KCRCT-ND")
  expect(tokenRequests()).toHaveLength(2)
})

test("product requests carry the client id, the bearer token and the US/en/USD locale headers", async () => {
  const { fetch, sent } = recordingFetch({ productdetails: ok(DETAILS_CT) })
  await digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookupSku("311-100KCRCT-ND")
  const request = sent[1]
  expect(request.url).toBe("https://api.digikey.com/products/v4/search/311-100KCRCT-ND/productdetails")
  expect(request.method).toBe("GET")
  expect(request.headers).toMatchObject({
    "X-DIGIKEY-Client-Id": CREDENTIALS.clientId,
    Authorization: `Bearer ${FAKE_TOKEN}`,
    "X-DIGIKEY-Locale-Site": "US",
    "X-DIGIKEY-Locale-Language": "en",
    "X-DIGIKEY-Locale-Currency": "USD",
  })
})

test("lookupSku of the cut-tape SKU returns the cut-tape listing and pricing, never the reel's", async () => {
  const { fetch } = recordingFetch({ productdetails: ok(DETAILS_CT) })
  const offer = await digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookupSku("311-100KCRCT-ND")
  expect(offer).toEqual({
    supplier: "Digi-Key",
    sku: "311-100KCRCT-ND",
    manufacturer: "YAGEO",
    mpn: "RC0805FR-07100KL",
    description: "RES 100K OHM 1% 1/8W 0805",
    url: "https://www.digikey.com/en/products/detail/yageo/RC0805FR-07100KL/727544",
    datasheetUrl: "https://yageogroup.com/content/datasheet/asset/file/PYU-RC_GROUP_51_ROHS_L",
    packaging: "Cut Tape (CT)",
    stock: 619504,
    currency: "USD",
    breaks: [
      { quantity: 1, unitPrice: 0.11 },
      { quantity: 10, unitPrice: 0.036 },
      { quantity: 25, unitPrice: 0.0272 },
      { quantity: 50, unitPrice: 0.022 },
      { quantity: 100, unitPrice: 0.0181 },
      { quantity: 250, unitPrice: 0.01424 },
      { quantity: 500, unitPrice: 0.01204 },
      { quantity: 1000, unitPrice: 0.01032 },
    ],
    parameters: expect.objectContaining({
      Resistance: "100 kOhms",
      Tolerance: "±1%",
      "Package / Case": "0805 (2012 Metric)",
    }),
    fetched: "2026-10-09",
  })
})

test("lookupSku of the reel SKU returns the reel's pricing", async () => {
  const { fetch } = recordingFetch({ productdetails: ok(DETAILS_CT) })
  const offer = await digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookupSku("311-100KCRTR-ND")
  expect(offer?.packaging).toBe("Tape & Reel (TR)")
  expect(offer?.breaks[0]).toEqual({ quantity: 5000, unitPrice: 0.00715 })
})

test("lookupSku returns undefined when Digi-Key answers 404 Not Found", async () => {
  const { fetch } = recordingFetch({ productdetails: { status: 404, body: DETAILS_NOT_FOUND } })
  expect(await digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookupSku("NO-SUCH-PART-ZZQ123")).toBeUndefined()
})

test("lookup keeps each packaging variation of one mpn as its own offer, with its own SKU and price breaks", async () => {
  const { fetch, sent } = recordingFetch({ "search/keyword": ok(KEYWORD_RC0805) })
  const offers = await digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookup("RC0805FR-07100KL")
  expect(sent[1].url).toBe("https://api.digikey.com/products/v4/search/keyword")
  expect(sent[1].method).toBe("POST")
  expect(JSON.parse(sent[1].body ?? "")).toEqual({ Keywords: "RC0805FR-07100KL", Limit: 10, Offset: 0 })

  // The product is in both ExactMatches and Products: three offers, not six.
  expect(offers.map((offer) => [offer.sku, offer.packaging, offer.breaks[0]])).toEqual([
    ["311-100KCRTR-ND", "Tape & Reel (TR)", { quantity: 5000, unitPrice: 0.00715 }],
    ["311-100KCRCT-ND", "Cut Tape (CT)", { quantity: 1, unitPrice: 0.11 }],
    ["311-100KCRDKR-ND", "Digi-Reel® (plus a $7.00 Digi-Reel fee per order)", { quantity: 1, unitPrice: 0.11 }],
  ])
  expect(new Set(offers.map((offer) => offer.mpn))).toEqual(new Set(["RC0805FR-07100KL"]))
})

test("lookup returns only exact, case/whitespace-insensitive mpn matches, across manufacturers", async () => {
  const { fetch } = recordingFetch({ "search/keyword": ok(KEYWORD_2N3904) })
  const offers = await digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookup("  2n3904 ")
  expect(offers.length).toBeGreaterThan(0)
  expect(offers.every((offer) => offer.mpn === "2N3904")).toBe(true)
  expect(new Set(offers.map((offer) => offer.manufacturer)).size).toBeGreaterThan(1)
  expect(new Set(offers.map((offer) => offer.sku)).size).toBe(offers.length)
  // A Marketplace listing says so, naming its seller.
  const marketplace = offers.find((offer) => offer.sku === "6557-2N3904TR-ND")
  expect(marketplace?.packaging).toBe("Tape & Reel (TR), Marketplace seller GOODWORK")
})

test("lookup returns [] when nothing matches the mpn exactly", async () => {
  const { fetch } = recordingFetch({ "search/keyword": ok(KEYWORD_RC0805) })
  expect(await digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookup("RC0805FR-07100K")).toEqual([])
})

test("search sends the limit and returns one offer per variation of every product found", async () => {
  const { fetch, sent } = recordingFetch({ "search/keyword": ok(KEYWORD_10UF) })
  const offers = await digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).search("10uF 35V radial", 5)
  expect(JSON.parse(sent[1].body ?? "")).toEqual({ Keywords: "10uF 35V radial", Limit: 5, Offset: 0 })
  expect(offers).toHaveLength(15)
  expect(offers[0]).toMatchObject({ supplier: "Digi-Key", sku: "PCE3948TR-ND", mpn: "EEE-1VA100WR", currency: "USD" })
})

test("a variation without stock or prices yields stock undefined, empty breaks and no currency", async () => {
  const body = keywordBody([
    product("BARE-1", [
      variation("B-1-ND", { QuantityAvailableforPackageType: undefined, StandardPricing: [] }),
      variation("B-2-ND", { QuantityAvailableforPackageType: null, StandardPricing: null }),
    ]),
  ])
  const { fetch } = recordingFetch({ "search/keyword": ok(body) })
  const offers = await digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookup("BARE-1")
  expect(offers).toHaveLength(2)
  for (const offer of offers) {
    expect(offer.stock).toBeUndefined()
    expect(offer.breaks).toEqual([])
    expect(offer.currency).toBeUndefined()
    expect("datasheetUrl" in offer && offer.datasheetUrl !== undefined).toBe(false)
  }
})

test("a response priced in another currency is refused, naming Digi-Key and the currency", async () => {
  const body = keywordBody([product("EUR-1", [variation("E-1-ND")])], [], "EUR")
  const { fetch } = recordingFetch({ "search/keyword": ok(body) })
  await expect(digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookup("EUR-1")).rejects.toThrow(
    /Digi-Key.*"EUR", not "USD"/,
  )
})

test("a product without variations is refused, naming the mpn", async () => {
  const { fetch } = recordingFetch({ "search/keyword": ok(keywordBody([product("NOVAR-1", [])])) })
  await expect(digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookup("NOVAR-1")).rejects.toThrow(
    /Digi-Key.*NOVAR-1.*no ProductVariations/,
  )
})

test("a variation missing its Digi-Key product number is refused, naming the field", async () => {
  const body = keywordBody([product("MISS-1", [variation("", {})])])
  const { fetch } = recordingFetch({ "search/keyword": ok(body) })
  await expect(digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookup("MISS-1")).rejects.toThrow(
    /Digi-Key.*DigiKeyProductNumber/,
  )
})

test("a refused token request names Digi-Key, the endpoint and the status, and redacts the credentials", async () => {
  const echo = JSON.stringify({ error: "invalid_client", client: CREDENTIALS.clientId, secret: CREDENTIALS.clientSecret })
  const { fetch } = recordingFetch({}, { status: 401, body: echo })
  const result = digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookup("X")
  await expect(result).rejects.toThrow(/Digi-Key oauth2\/token request failed \(HTTP 401\): .*invalid_client/)
  const message = await result.catch((error: unknown) => (error instanceof Error ? error.message : ""))
  expect(message).not.toContain(CREDENTIALS.clientId)
  expect(message).not.toContain(CREDENTIALS.clientSecret)
})

test("an HTTP error body that echoes the token is redacted", async () => {
  const { fetch } = recordingFetch({ "search/keyword": { status: 401, body: `bad token ${FAKE_TOKEN}` } })
  const result = digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).search("x", 1)
  const message = await result.catch((error: unknown) => (error instanceof Error ? error.message : ""))
  expect(message).toMatch(/Digi-Key products\/v4\/search\/keyword request failed \(HTTP 401\): bad token <redacted>/)
  expect(message).not.toContain(FAKE_TOKEN)
})

test("a fetch rejection carrying the secret and the token never reaches the error message", async () => {
  const leaky = recordingFetch({})
  let calls = 0
  const fetch: typeof leaky.fetch = async (url, init) => {
    calls += 1
    if (calls === 1) return leaky.fetch(url, init)
    throw new TypeError(`fetch failed ${CREDENTIALS.clientSecret} ${FAKE_TOKEN} ${url}`, {
      cause: new Error(`${CREDENTIALS.clientId} ${init.headers["Authorization"]}`),
    })
  }
  const message = await digikeyClient(CREDENTIALS, fetch, TODAY, () => T0)
    .lookupSku("311-100KCRCT-ND")
    .catch((error: unknown) => (error instanceof Error ? `${error.message} ${String(error.cause)}` : ""))
  expect(message).toMatch(/Digi-Key products\/v4\/search\/311-100KCRCT-ND\/productdetails: request could not be sent \(TypeError\)/)
  for (const secret of [CREDENTIALS.clientId, CREDENTIALS.clientSecret, FAKE_TOKEN]) expect(message).not.toContain(secret)
})

test("a token response without an access_token is refused without quoting the body", async () => {
  const { fetch } = recordingFetch({}, ok(JSON.stringify({ expires_in: 599, token_type: "Bearer" })))
  await expect(digikeyClient(CREDENTIALS, fetch, TODAY, () => T0).lookup("X")).rejects.toThrow(
    /Digi-Key oauth2\/token: access_token is missing or not a non-empty string/,
  )
})
