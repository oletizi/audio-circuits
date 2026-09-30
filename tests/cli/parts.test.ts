import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { runCli } from "../../tools/cli/parts.ts"
import type { FetchLike } from "../../tools/suppliers/types.ts"

const FIXTURES_DIR = path.join(import.meta.dir, "../fixtures/suppliers")
const PARTNUMBER_FIXTURE = fs.readFileSync(path.join(FIXTURES_DIR, "mouser-partnumber-mfr-25fbf52-100k.json"), "utf8")
const KEYWORD_FIXTURE = fs.readFileSync(path.join(FIXTURES_DIR, "mouser-keyword-10uf-35v-radial.json"), "utf8")

const HOME = "/home/fixture"
const MOUSER_CREDENTIALS_PATH = path.join(HOME, ".config", "mouser", "mouser-credentials.txt")
const TODAY = () => "2026-10-02"

function readFileFrom(files: Record<string, string>): (filePath: string) => string {
  return (filePath: string) => {
    const text = files[filePath]
    if (text === undefined) throw new Error(`ENOENT: no such file or directory, open '${filePath}'`)
    return text
  }
}

function fakeFetch(bodies: Record<string, string>): FetchLike {
  return async (url) => {
    for (const [needle, body] of Object.entries(bodies)) {
      if (url.includes(needle)) return { status: 200, text: async () => body }
    }
    throw new Error(`fakeFetch: no fixture registered for ${url}`)
  }
}

function neverFetch(): FetchLike {
  return async (url) => {
    throw new Error(`fetch must not be called; was called for ${url}`)
  }
}

function neverWrite(): (filePath: string, contents: string) => void {
  return (filePath: string) => {
    throw new Error(`writeFile must not be called; was called for ${filePath}`)
  }
}

/** A keyword-search fake whose result size echoes the request's own `records` field, so a
 * test can tell the CLI's default limit from an explicit `--limit` apart - the recorded
 * fixture, being a fixed snapshot, cannot distinguish the two. */
function limitAwareKeywordFetch(): FetchLike {
  return async (url, init) => {
    if (!url.includes("search/keyword")) throw new Error(`limitAwareKeywordFetch: unexpected url ${url}`)
    const body = JSON.parse(init.body ?? "{}") as { SearchByKeywordRequest: { records: number } }
    const records = body.SearchByKeywordRequest.records
    const parts = Array.from({ length: records }, (_, index) => ({
      MouserPartNumber: `1-PART-${index}`,
      Manufacturer: "Acme",
      ManufacturerPartNumber: `PART-${index}`,
      Description: "Test part",
      ProductDetailUrl: "https://mouser.com/x",
      DataSheetUrl: "",
      AvailabilityInStock: "10",
      ProductAttributes: [],
      PriceBreaks: [{ Quantity: 1, Price: "$1.00", Currency: "USD" }],
    }))
    const body_ = JSON.stringify({ Errors: [], SearchResults: { NumberOfResult: records, Parts: parts } })
    return { status: 200, text: async () => body_ }
  }
}

function baseOpts(overrides: Record<string, unknown> = {}) {
  return {
    home: HOME,
    readFile: readFileFrom({ [MOUSER_CREDENTIALS_PATH]: "test-api-key\n" }),
    writeFile: neverWrite(),
    fetch: fakeFetch({ "search/partnumber": PARTNUMBER_FIXTURE, "search/keyword": KEYWORD_FIXTURE }),
    today: TODAY,
    ...overrides,
  }
}

function collect() {
  const logs: string[] = []
  const errors: string[] = []
  return { logs, errors, log: (line: string) => logs.push(line), error: (line: string) => errors.push(line) }
}

test("--help exits 0 and lists every verb", async () => {
  const out = collect()
  const code = await runCli(["--help"], { log: out.log })
  expect(code).toBe(0)
  const usage = out.logs.join("\n")
  for (const verb of ["lookup", "search", "source", "refresh"]) expect(usage).toContain(verb)
})

test("an unknown verb exits 1, naming it", async () => {
  const out = collect()
  const code = await runCli(["frobnicate"], { error: out.error })
  expect(code).toBe(1)
  expect(out.errors.join("\n")).toContain("frobnicate")
})

test("lookup prints the Yageo part's fields as readable text", async () => {
  const out = collect()
  const code = await runCli(["lookup", "MFR-25FBF52-100K"], { ...baseOpts(), log: out.log, error: out.error })
  expect(code).toBe(0)
  const text = out.logs.join("\n")
  expect(text).toContain("Mouser 603-MFR-25FBF52-100K - MFR-25FBF52-100K (YAGEO)")
  expect(text).toContain("stock: 22598")
  expect(text).toContain("url: https://www.mouser.com")
  expect(text).toContain("datasheet: https://www.mouser.com/datasheet")
  expect(text).toMatch(/1\+: \$0\.10/)
})

test("lookup --json prints the offers as JSON", async () => {
  const out = collect()
  const code = await runCli(["lookup", "MFR-25FBF52-100K", "--json"], { ...baseOpts(), log: out.log, error: out.error })
  expect(code).toBe(0)
  const parsed = JSON.parse(out.logs.join("\n"))
  expect(parsed).toHaveLength(1)
  expect(parsed[0].mpn).toBe("MFR-25FBF52-100K")
})

test("lookup with no exact match says so, naming the supplier and the mpn", async () => {
  const out = collect()
  const code = await runCli(["lookup", "NOT-A-REAL-PART"], { ...baseOpts(), log: out.log, error: out.error })
  expect(code).toBe(0)
  expect(out.logs.join("\n")).toBe('Mouser: no exact match for "NOT-A-REAL-PART".')
})

test("lookup --supplier digikey refuses without touching the network", async () => {
  const out = collect()
  const code = await runCli(["lookup", "MFR-25FBF52-100K", "--supplier", "digikey"], {
    ...baseOpts({ fetch: neverFetch() }),
    log: out.log,
    error: out.error,
  })
  expect(code).toBe(1)
  expect(out.errors.join("\n")).toMatch(/Digi-Key.*not built yet.*developer\.digikey\.com.*Task 2/s)
})

test("lookup refuses naming the missing credentials file when Mouser's key is absent", async () => {
  const out = collect()
  const code = await runCli(["lookup", "MFR-25FBF52-100K"], {
    ...baseOpts({ readFile: readFileFrom({}), fetch: neverFetch() }),
    log: out.log,
    error: out.error,
  })
  expect(code).toBe(1)
  expect(out.errors.join("\n")).toContain("mouser-credentials.txt")
})

test("search defaults to a limit of 10 and narrows with --limit", async () => {
  const outDefault = collect()
  const code = await runCli(["search", "10uF", "35V", "radial"], {
    ...baseOpts({ fetch: limitAwareKeywordFetch() }),
    log: outDefault.log,
    error: outDefault.error,
  })
  expect(code).toBe(0)
  const offerLines = outDefault.logs.filter((line) => line.startsWith("Mouser "))
  expect(offerLines).toHaveLength(10)

  const outLimited = collect()
  const codeLimited = await runCli(["search", "10uF", "35V", "radial", "--limit", "3"], {
    ...baseOpts({ fetch: limitAwareKeywordFetch() }),
    log: outLimited.log,
    error: outLimited.error,
  })
  expect(codeLimited).toBe(0)
  expect(outLimited.logs.filter((line) => line.startsWith("Mouser "))).toHaveLength(3)
})

test("search parses the recorded keyword fixture into readable offer lines", async () => {
  const out = collect()
  const code = await runCli(["search", "10uF", "35V", "radial", "--limit", "5"], {
    ...baseOpts(),
    log: out.log,
    error: out.error,
  })
  expect(code).toBe(0)
  expect(out.logs.join("\n")).toContain("Mouser 140-SG100M1V0507P")
})

test("source prints a catalog Source for the one exact match", async () => {
  const out = collect()
  const code = await runCli(["source", "MFR-25FBF52-100K", "--supplier", "mouser", "--use", "standard"], {
    ...baseOpts(),
    log: out.log,
    error: out.error,
  })
  expect(code).toBe(0)
  const source = JSON.parse(out.logs.join("\n"))
  expect(source).toEqual({
    supplier: "Mouser",
    url: "https://www.mouser.com/en/ProductDetail/YAGEO/MFR-25FBF52-100K?qs=oAGoVhmvjhxAqZbyE%2Fs9bg%3D%3D",
    sku: "603-MFR-25FBF52-100K",
    currency: "USD",
    breaks: [
      { quantity: 1, unitPrice: 0.1 },
      { quantity: 10, unitPrice: 0.042 },
      { quantity: 25, unitPrice: 0.031 },
      { quantity: 100, unitPrice: 0.027 },
      { quantity: 250, unitPrice: 0.023 },
      { quantity: 500, unitPrice: 0.021 },
      { quantity: 1000, unitPrice: 0.018 },
      { quantity: 5000, unitPrice: 0.015 },
    ],
    checked: "2026-10-02",
    use: "standard",
  })
})

test("source refuses an invalid --use", async () => {
  const out = collect()
  const code = await runCli(["source", "MFR-25FBF52-100K", "--supplier", "mouser", "--use", "bogus"], {
    ...baseOpts({ fetch: neverFetch() }),
    log: out.log,
    error: out.error,
  })
  expect(code).toBe(1)
  expect(out.errors.join("\n")).toContain("bogus")
})

test("source refuses, listing the matches, when more than one exact match is found", async () => {
  const body = JSON.stringify({
    Errors: [],
    SearchResults: {
      NumberOfResult: 2,
      Parts: [
        {
          MouserPartNumber: "1-DUP-A",
          Manufacturer: "Acme",
          ManufacturerPartNumber: "DUP-PART",
          Description: "Variant A",
          ProductDetailUrl: "https://mouser.com/a",
          DataSheetUrl: "",
          AvailabilityInStock: "10",
          ProductAttributes: [],
          PriceBreaks: [{ Quantity: 1, Price: "$1.00", Currency: "USD" }],
        },
        {
          MouserPartNumber: "1-DUP-B",
          Manufacturer: "Acme",
          ManufacturerPartNumber: "DUP-PART",
          Description: "Variant B",
          ProductDetailUrl: "https://mouser.com/b",
          DataSheetUrl: "",
          AvailabilityInStock: "5",
          ProductAttributes: [],
          PriceBreaks: [{ Quantity: 1, Price: "$2.00", Currency: "USD" }],
        },
      ],
    },
  })
  const out = collect()
  const code = await runCli(["source", "DUP-PART", "--supplier", "mouser", "--use", "standard"], {
    ...baseOpts({ fetch: fakeFetch({ "search/partnumber": body }) }),
    log: out.log,
    error: out.error,
  })
  expect(code).toBe(1)
  const errorText = out.errors.join("\n")
  expect(errorText).toContain("more than one listing")
  expect(errorText).toContain("1-DUP-A")
  expect(errorText).toContain("1-DUP-B")
})

test("refresh reads, looks up and rewrites a catalog entry's Mouser source in place", async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "parts-cli-refresh-"))
  try {
    const partsDir = path.join(repoRoot, "parts")
    fs.mkdirSync(partsDir)
    const entryPath = path.join(partsDir, "r_100k.json")
    fs.writeFileSync(
      entryPath,
      JSON.stringify(
        {
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
        },
        null,
        2,
      ) + "\n",
    )

    const written: Record<string, string> = {}
    const realReadFile = readFileFrom({ [MOUSER_CREDENTIALS_PATH]: "test-api-key\n" })
    const readFile = (filePath: string) => (filePath === entryPath ? fs.readFileSync(entryPath, "utf8") : realReadFile(filePath))
    const writeFile = (filePath: string, contents: string) => {
      written[filePath] = contents
    }

    const out = collect()
    const code = await runCli(["refresh"], {
      ...baseOpts({ readFile, writeFile }),
      repoRoot,
      log: out.log,
      error: out.error,
    })
    expect(code).toBe(0)
    expect(Object.keys(written)).toEqual([entryPath])
    const rewritten = JSON.parse(written[entryPath])
    expect(rewritten.sources[0].breaks[0]).toEqual({ quantity: 1, unitPrice: 0.1 })
    expect(rewritten.sources[0].checked).toBe("2026-10-02")
    expect(out.logs.join("\n")).toContain("updated")
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("refresh refuses without writing anything when Mouser's credentials are missing and a Mouser source needs them", async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "parts-cli-refresh-missing-creds-"))
  try {
    const partsDir = path.join(repoRoot, "parts")
    fs.mkdirSync(partsDir)
    const entryPath = path.join(partsDir, "r_100k.json")
    fs.writeFileSync(
      entryPath,
      JSON.stringify(
        {
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
        },
        null,
        2,
      ) + "\n",
    )
    const realReadFile = readFileFrom({})
    const readFile = (filePath: string) => (filePath === entryPath ? fs.readFileSync(entryPath, "utf8") : realReadFile(filePath))

    const out = collect()
    const code = await runCli(["refresh"], {
      ...baseOpts({ readFile, writeFile: neverWrite(), fetch: neverFetch() }),
      repoRoot,
      log: out.log,
      error: out.error,
    })
    expect(code).toBe(1)
    expect(out.errors.join("\n")).toContain("mouser-credentials.txt")
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true })
  }
})
