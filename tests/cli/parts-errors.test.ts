import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { runCli } from "../../tools/cli/parts.ts"
import type { FetchLike } from "../../tools/suppliers/types.ts"
import {
  MOUSER_CREDENTIALS_PATH, baseOpts, collect, fakeFetch, listing, neverFetch, partnumberBody, readFileFrom,
} from "./parts-test-helpers.ts"

const FAKE_KEY = "FAKE-KEY-7c1e0d"

/** A fetch that rejects the way a runtime does on a DNS or connection failure, with the
 * full request URL - and so the key - in its message and its cause. */
function rejectingFetch(): FetchLike {
  return async (url) => {
    throw new TypeError(`fetch failed: Unable to connect. Is the computer able to access the url? ${url}`, {
      cause: new Error(`connect ECONNREFUSED ${url}`),
    })
  }
}

function keyedOpts(fetch: FetchLike) {
  return baseOpts({ readFile: readFileFrom({ [MOUSER_CREDENTIALS_PATH]: `${FAKE_KEY}\n` }), fetch })
}

function writeRefreshableEntry(partsDir: string): string {
  const entryPath = path.join(partsDir, "r_100k.json")
  const entry = {
    id: "r_100k",
    kind: "resistor",
    description: "test entry",
    specs: {},
    evidence: [],
    why: "test",
    stock: false,
    sources: [
      {
        supplier: "Mouser",
        url: "https://www.mouser.com/old",
        sku: "603-MFR-25FBF52-100K",
        currency: "USD",
        breaks: [{ quantity: 1, unitPrice: 0.5 }],
        checked: "2026-01-01",
        use: "standard",
      },
    ],
  }
  fs.writeFileSync(entryPath, `${JSON.stringify(entry, null, 2)}\n`)
  return entryPath
}

const NETWORK_VERBS: readonly (readonly string[])[] = [
  ["lookup", "MFR-25FBF52-100K"],
  ["search", "10uF", "35V"],
  ["source", "MFR-25FBF52-100K", "--supplier", "mouser", "--use", "standard"],
  ["source", "MFR-25FBF52-100K", "--supplier", "mouser", "--use", "standard", "--sku", "603-MFR-25FBF52-100K"],
]

for (const argv of NETWORK_VERBS) {
  test(`${argv.join(" ")}: a fetch rejection carrying the URL exits 1 and never prints the key`, async () => {
    const out = collect()
    const code = await runCli(argv, { ...keyedOpts(rejectingFetch()), log: out.log, error: out.error })
    expect(code).toBe(1)
    const everything = [...out.logs, ...out.errors].join("\n")
    expect(everything).not.toContain(FAKE_KEY)
    expect(out.errors.join("\n")).toMatch(/Mouser search\/(partnumber|keyword): request could not be sent \(TypeError\)/)
  })
}

test("refresh: a fetch rejection carrying the URL exits 1, writes nothing and never prints the key", async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "parts-cli-refresh-reject-"))
  try {
    const partsDir = path.join(repoRoot, "parts")
    fs.mkdirSync(partsDir)
    const entryPath = writeRefreshableEntry(partsDir)
    const keyFile = readFileFrom({ [MOUSER_CREDENTIALS_PATH]: `${FAKE_KEY}\n` })
    const readFile = (filePath: string) => (filePath === entryPath ? fs.readFileSync(entryPath, "utf8") : keyFile(filePath))
    const out = collect()
    const code = await runCli(["refresh"], {
      ...baseOpts({ readFile, fetch: rejectingFetch() }),
      repoRoot,
      log: out.log,
      error: out.error,
    })
    expect(code).toBe(1)
    expect([...out.logs, ...out.errors].join("\n")).not.toContain(FAKE_KEY)
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("lookup: Mouser's own Errors refusal exits 1 with a message, not an uncaught rejection", async () => {
  const body = JSON.stringify({
    Errors: [{ Id: "1", Code: "InvalidApiKey", Message: "The API key is invalid.", PropertyName: "apiKey" }],
    SearchResults: null,
  })
  const out = collect()
  const code = await runCli(["lookup", "MFR-25FBF52-100K"], {
    ...keyedOpts(fakeFetch({ "search/partnumber": body })),
    log: out.log,
    error: out.error,
  })
  expect(code).toBe(1)
  expect(out.errors.join("\n")).toBe("Mouser search/partnumber refused the request: The API key is invalid.")
})

test("a response body that fails to read, with the URL in its error, exits 1 and never prints the key", async () => {
  const throwing: FetchLike = async (url) => ({
    status: 200,
    text: async () => {
      throw new Error(`body stream closed for ${url}`)
    },
  })
  const out = collect()
  const code = await runCli(["lookup", "MFR-25FBF52-100K"], { ...keyedOpts(throwing), log: out.log, error: out.error })
  expect(code).toBe(1)
  expect(out.errors.join("\n")).not.toContain(FAKE_KEY)
})

const TWO_LISTINGS = partnumberBody([
  listing("1-DUP-A", "DUP-PART", "Variant A"),
  listing("1-DUP-B", "DUP-PART", "Variant B"),
])

/** Answers a part-number search with both listings, or with only the one a request's
 * `mouserPartNumber` names exactly - Mouser's own "Exact" behaviour for a SKU. */
function dupFetch(): FetchLike {
  return async (_url, init) => {
    const request = String(init.body)
    if (request.includes('"1-DUP-A"')) return { status: 200, text: async () => partnumberBody([listing("1-DUP-A", "DUP-PART", "Variant A")]) }
    if (request.includes('"1-DUP-B"')) return { status: 200, text: async () => partnumberBody([listing("1-DUP-B", "DUP-PART", "Variant B")]) }
    if (request.includes('"DUP-PART"')) return { status: 200, text: async () => TWO_LISTINGS }
    return { status: 200, text: async () => partnumberBody([]) }
  }
}

test("source --sku picks the named listing when the mpn matches several", async () => {
  const out = collect()
  const code = await runCli(["source", "DUP-PART", "--supplier", "mouser", "--use", "standard", "--sku", "1-DUP-B"], {
    ...baseOpts({ fetch: dupFetch() }),
    log: out.log,
    error: out.error,
  })
  expect(code).toBe(0)
  const source = JSON.parse(out.logs.join("\n"))
  expect(source.sku).toBe("1-DUP-B")
  expect(source.url).toBe("https://mouser.com/1-DUP-B")
  expect(source.use).toBe("standard")
})

test("source without --sku, when the mpn matches several, refuses naming each listing and --sku", async () => {
  const out = collect()
  const code = await runCli(["source", "DUP-PART", "--supplier", "mouser", "--use", "standard"], {
    ...baseOpts({ fetch: dupFetch() }),
    log: out.log,
    error: out.error,
  })
  expect(code).toBe(1)
  const text = out.errors.join("\n")
  expect(text).toContain("1-DUP-A")
  expect(text).toContain("1-DUP-B")
  expect(text).toContain("--sku")
})

test("source --sku refuses a listing whose mpn is not the one asked for", async () => {
  const body = partnumberBody([listing("1-OTHER", "OTHER-PART", "Something else")])
  const out = collect()
  const code = await runCli(["source", "DUP-PART", "--supplier", "mouser", "--use", "standard", "--sku", "1-OTHER"], {
    ...baseOpts({ fetch: fakeFetch({ "search/partnumber": body }) }),
    log: out.log,
    error: out.error,
  })
  expect(code).toBe(1)
  expect(out.errors.join("\n")).toContain('Mouser 1-OTHER is mpn "OTHER-PART", not "DUP-PART"')
})

test("source --sku refuses a part number the supplier does not list", async () => {
  const out = collect()
  const code = await runCli(["source", "DUP-PART", "--supplier", "mouser", "--use", "standard", "--sku", "1-GONE"], {
    ...baseOpts({ fetch: dupFetch() }),
    log: out.log,
    error: out.error,
  })
  expect(code).toBe(1)
  expect(out.errors.join("\n")).toBe('Mouser: no listing with part number "1-GONE".')
})

test("--sku is refused on a verb that does not take it", async () => {
  const out = collect()
  const code = await runCli(["lookup", "DUP-PART", "--sku", "1-DUP-A"], {
    ...baseOpts({ fetch: neverFetch() }),
    log: out.log,
    error: out.error,
  })
  expect(code).toBe(1)
  expect(out.errors.join("\n")).toContain('unknown flag "--sku"')
})
