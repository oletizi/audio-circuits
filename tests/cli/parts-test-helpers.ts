/**
 * Shared fakes for the `bun run parts` CLI tests: in-memory key files, a fetch that
 * answers from recorded Mouser and Digi-Key fixtures, and collectors for the CLI's two
 * output streams. Nothing here touches the network or the real `~/.config` key files.
 */
import fs from "node:fs"
import path from "node:path"
import { isRecord } from "../../tools/perfboard/guards.ts"
import type { FetchLike } from "../../tools/suppliers/types.ts"

const FIXTURES_DIR = path.join(import.meta.dir, "../fixtures/suppliers")
const fixture = (name: string) => fs.readFileSync(path.join(FIXTURES_DIR, name), "utf8")
export const PARTNUMBER_FIXTURE = fixture("mouser-partnumber-mfr-25fbf52-100k.json")
export const KEYWORD_FIXTURE = fixture("mouser-keyword-10uf-35v-radial.json")

export const HOME = "/home/fixture"
export const MOUSER_CREDENTIALS_PATH = path.join(HOME, ".config", "mouser", "mouser-credentials.txt")
export const DIGIKEY_CREDENTIALS_PATH = path.join(HOME, ".config", "digikey", "digikey-credentials.txt")
export const TODAY = () => "2026-10-02"

export const DIGIKEY_CLIENT_ID = "FAKE-DK-CLIENT-ID-5e21"
export const DIGIKEY_SECRET = "FAKE-DK-SECRET-c03b"
export const DIGIKEY_TOKEN = "FAKE-DK-TOKEN-8a7f"
export const DIGIKEY_CREDENTIALS_TEXT = `clientID: ${DIGIKEY_CLIENT_ID}\nclientSecret: ${DIGIKEY_SECRET}\n`

/** Both suppliers' key files. */
export const BOTH_KEY_FILES: Record<string, string> = {
  [MOUSER_CREDENTIALS_PATH]: "test-api-key\n",
  [DIGIKEY_CREDENTIALS_PATH]: DIGIKEY_CREDENTIALS_TEXT,
}

const DIGIKEY_TOKEN_BODY = fixture("digikey-token.json").replace("<redacted>", DIGIKEY_TOKEN)
const DIGIKEY_KEYWORD_BY_TERMS: Record<string, string> = {
  "MFR-25FBF52-100K": fixture("digikey-keyword-mfr-25fbf52-100k.json"),
  "RC0805FR-07100KL": fixture("digikey-keyword-rc0805fr-07100kl.json"),
  "10uF 35V radial": fixture("digikey-keyword-10uf-35v-radial.json"),
}
const DIGIKEY_DETAILS_BY_SKU: Record<string, string> = {
  "311-100KCRCT-ND": fixture("digikey-productdetails-311-100kcrct-nd.json"),
  "311-100KCRTR-ND": fixture("digikey-productdetails-311-100kcrct-nd.json"),
  "311-100KCRDKR-ND": fixture("digikey-productdetails-311-100kcrct-nd.json"),
}
const DIGIKEY_NOT_FOUND = fixture("digikey-productdetails-not-found.json")
const DIGIKEY_EMPTY_KEYWORD = JSON.stringify({
  Products: [],
  ProductsCount: 0,
  ExactMatches: [],
  SearchLocaleUsed: { Site: "US", Language: "en", Currency: "USD" },
})

/** Answers Digi-Key's token, keyword and product-details endpoints from the recorded
 * fixtures (keyword search by the request's `Keywords`, details by the SKU in the path);
 * anything it has no fixture for is an empty search or a 404, as Digi-Key answers. */
export function digikeyFetch(): FetchLike {
  return async (url, init) => {
    if (url === "https://api.digikey.com/v1/oauth2/token") return { status: 200, text: async () => DIGIKEY_TOKEN_BODY }
    if (url === "https://api.digikey.com/products/v4/search/keyword") {
      const request: unknown = JSON.parse(init.body ?? "{}")
      const terms = isRecord(request) ? request["Keywords"] : undefined
      const body = typeof terms === "string" ? DIGIKEY_KEYWORD_BY_TERMS[terms] : undefined
      return { status: 200, text: async () => body ?? DIGIKEY_EMPTY_KEYWORD }
    }
    const details = url.match(/^https:\/\/api\.digikey\.com\/products\/v4\/search\/([^/]+)\/productdetails$/)
    if (details !== null) {
      const body = DIGIKEY_DETAILS_BY_SKU[decodeURIComponent(details[1])]
      return body === undefined ? { status: 404, text: async () => DIGIKEY_NOT_FOUND } : { status: 200, text: async () => body }
    }
    throw new Error(`digikeyFetch: no fixture registered for ${url}`)
  }
}

/** Routes Digi-Key requests to `digikeyFetch` and everything else to `mouser`. */
export function bothFetch(mouser: FetchLike): FetchLike {
  const digikey = digikeyFetch()
  return async (url, init) => (url.startsWith("https://api.digikey.com/") ? digikey(url, init) : mouser(url, init))
}

export function readFileFrom(files: Record<string, string>): (filePath: string) => string {
  return (filePath: string) => {
    const text = files[filePath]
    if (text === undefined) throw new Error(`ENOENT: no such file or directory, open '${filePath}'`)
    return text
  }
}

export function fakeFetch(bodies: Record<string, string>): FetchLike {
  return async (url) => {
    for (const [needle, body] of Object.entries(bodies)) {
      if (url.includes(needle)) return { status: 200, text: async () => body }
    }
    throw new Error(`fakeFetch: no fixture registered for ${url}`)
  }
}

export function neverFetch(): FetchLike {
  return async (url) => {
    throw new Error(`fetch must not be called; was called for ${url}`)
  }
}

export function neverWrite(): (filePath: string, contents: string) => void {
  return (filePath: string) => {
    throw new Error(`writeFile must not be called; was called for ${filePath}`)
  }
}

export function baseOpts(overrides: Record<string, unknown> = {}) {
  return {
    home: HOME,
    readFile: readFileFrom(BOTH_KEY_FILES),
    writeFile: neverWrite(),
    fetch: bothFetch(
      fakeFetch({ "search/partnumber": PARTNUMBER_FIXTURE, "search/keyword": KEYWORD_FIXTURE }),
    ),
    today: TODAY,
    now: () => 1_760_000_000_000,
    ...overrides,
  }
}

export function collect() {
  const logs: string[] = []
  const errors: string[] = []
  return { logs, errors, log: (line: string) => logs.push(line), error: (line: string) => errors.push(line) }
}

/** One Mouser part-number search response body with the given listings. */
export function partnumberBody(parts: readonly Record<string, unknown>[]): string {
  return JSON.stringify({ Errors: [], SearchResults: { NumberOfResult: parts.length, Parts: parts } })
}

/** One minimal, priced Mouser listing. */
export function listing(sku: string, mpn: string, description: string): Record<string, unknown> {
  return {
    MouserPartNumber: sku,
    Manufacturer: "Acme",
    ManufacturerPartNumber: mpn,
    Description: description,
    ProductDetailUrl: `https://mouser.com/${sku}`,
    DataSheetUrl: "",
    AvailabilityInStock: "10",
    ProductAttributes: [],
    PriceBreaks: [{ Quantity: 1, Price: "$1.00", Currency: "USD" }],
  }
}
