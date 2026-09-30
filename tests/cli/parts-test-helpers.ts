/**
 * Shared fakes for the `bun run parts` CLI tests: an in-memory key file, a fetch that
 * answers from recorded Mouser fixtures, and collectors for the CLI's two output streams.
 * Nothing here touches the network or the real `~/.config` key files.
 */
import fs from "node:fs"
import path from "node:path"
import type { FetchLike } from "../../tools/suppliers/types.ts"

const FIXTURES_DIR = path.join(import.meta.dir, "../fixtures/suppliers")
export const PARTNUMBER_FIXTURE = fs.readFileSync(path.join(FIXTURES_DIR, "mouser-partnumber-mfr-25fbf52-100k.json"), "utf8")
export const KEYWORD_FIXTURE = fs.readFileSync(path.join(FIXTURES_DIR, "mouser-keyword-10uf-35v-radial.json"), "utf8")

export const HOME = "/home/fixture"
export const MOUSER_CREDENTIALS_PATH = path.join(HOME, ".config", "mouser", "mouser-credentials.txt")
export const TODAY = () => "2026-10-02"

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
    readFile: readFileFrom({ [MOUSER_CREDENTIALS_PATH]: "test-api-key\n" }),
    writeFile: neverWrite(),
    fetch: fakeFetch({ "search/partnumber": PARTNUMBER_FIXTURE, "search/keyword": KEYWORD_FIXTURE }),
    today: TODAY,
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
