import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { runCli } from "../../tools/cli/parts.ts"
import type { FetchLike } from "../../tools/suppliers/types.ts"
import {
  BOTH_KEY_FILES, DIGIKEY_CLIENT_ID, DIGIKEY_CREDENTIALS_PATH, DIGIKEY_SECRET, DIGIKEY_TOKEN, MOUSER_CREDENTIALS_PATH,
  baseOpts, collect, digikeyFetch, neverFetch, readFileFrom,
} from "./parts-test-helpers.ts"

const ONLY_MOUSER_KEY = { [MOUSER_CREDENTIALS_PATH]: BOTH_KEY_FILES[MOUSER_CREDENTIALS_PATH] }

test("lookup without --supplier prints both suppliers' offers", async () => {
  const out = collect()
  const code = await runCli(["lookup", "MFR-25FBF52-100K"], { ...baseOpts(), log: out.log, error: out.error })
  expect(code).toBe(0)
  const text = out.logs.join("\n")
  expect(text).toContain("Mouser 603-MFR-25FBF52-100K - MFR-25FBF52-100K (YAGEO)")
  expect(text).toContain("Digi-Key 100KXBK-ND - MFR-25FBF52-100K (YAGEO)")
  expect(text).toContain("  packaging: Bulk")
})

test("lookup --supplier digikey prints each packaging variation as its own offer", async () => {
  const out = collect()
  const code = await runCli(["lookup", "RC0805FR-07100KL", "--supplier", "digikey"], {
    ...baseOpts({ fetch: digikeyFetch() }),
    log: out.log,
    error: out.error,
  })
  expect(code).toBe(0)
  const headers = out.logs.filter((line) => line.startsWith("Digi-Key "))
  expect(headers).toEqual([
    "Digi-Key 311-100KCRTR-ND - RC0805FR-07100KL (YAGEO)",
    "Digi-Key 311-100KCRCT-ND - RC0805FR-07100KL (YAGEO)",
    "Digi-Key 311-100KCRDKR-ND - RC0805FR-07100KL (YAGEO)",
  ])
  expect(out.logs).toContain("  packaging: Tape & Reel (TR)")
  expect(out.logs).toContain("  5000+: $0.0072")
})

test("lookup without --supplier refuses, naming the Digi-Key file, before any request when its key is missing", async () => {
  const out = collect()
  const code = await runCli(["lookup", "MFR-25FBF52-100K"], {
    ...baseOpts({ readFile: readFileFrom(ONLY_MOUSER_KEY), fetch: neverFetch() }),
    log: out.log,
    error: out.error,
  })
  expect(code).toBe(1)
  expect(out.errors.join("\n")).toMatch(/digikey-credentials\.txt.*clientID.*clientSecret.*developer\.digikey\.com/s)
  expect(out.logs).toEqual([])
})

test("search --supplier digikey refuses naming the Digi-Key file when its key is missing", async () => {
  const out = collect()
  const code = await runCli(["search", "10uF", "--supplier", "digikey"], {
    ...baseOpts({ readFile: readFileFrom(ONLY_MOUSER_KEY), fetch: neverFetch() }),
    log: out.log,
    error: out.error,
  })
  expect(code).toBe(1)
  expect(out.errors.join("\n")).toContain(DIGIKEY_CREDENTIALS_PATH)
})

test("source --supplier digikey refuses, listing every variation, when the mpn has several", async () => {
  const out = collect()
  const code = await runCli(["source", "RC0805FR-07100KL", "--supplier", "digikey", "--use", "standard"], {
    ...baseOpts({ fetch: digikeyFetch() }),
    log: out.log,
    error: out.error,
  })
  expect(code).toBe(1)
  const text = out.errors.join("\n")
  for (const sku of ["311-100KCRTR-ND", "311-100KCRCT-ND", "311-100KCRDKR-ND"]) expect(text).toContain(sku)
  expect(text).toContain("Cut Tape (CT)")
  expect(text).toContain("--sku")
})

test("source --supplier digikey --sku picks the cut-tape variation and its pricing", async () => {
  const out = collect()
  const code = await runCli(
    ["source", "RC0805FR-07100KL", "--supplier", "digikey", "--use", "standard", "--sku", "311-100KCRCT-ND"],
    { ...baseOpts({ fetch: digikeyFetch() }), log: out.log, error: out.error },
  )
  expect(code).toBe(0)
  const source = JSON.parse(out.logs.join("\n"))
  expect(source).toMatchObject({
    supplier: "Digi-Key",
    sku: "311-100KCRCT-ND",
    url: "https://www.digikey.com/en/products/detail/yageo/RC0805FR-07100KL/727544",
    currency: "USD",
    checked: "2026-10-02",
    use: "standard",
  })
  expect(source.breaks[0]).toEqual({ quantity: 1, unitPrice: 0.11 })
})

test("source --sku of the Digi-Reel listing refuses, naming the cut-tape SKU; lookup still shows it", async () => {
  const out = collect()
  const code = await runCli(
    ["source", "RC0805FR-07100KL", "--supplier", "digikey", "--use", "standard", "--sku", "311-100KCRDKR-ND"],
    { ...baseOpts({ fetch: digikeyFetch() }), log: out.log, error: out.error },
  )
  expect(code).toBe(1)
  expect(out.logs).toEqual([])
  expect(out.errors.join("\n")).toMatch(/311-100KCRDKR-ND charges a \$7\.00 reeling fee.*--sku 311-100KCRCT-ND/s)

  const shown = collect()
  await runCli(["lookup", "RC0805FR-07100KL", "--supplier", "digikey"], {
    ...baseOpts({ fetch: digikeyFetch() }),
    log: shown.log,
    error: shown.error,
  })
  expect(shown.logs).toContain("  packaging: Digi-Reel® (plus a $7.00 Digi-Reel fee per order)")
})

test("lookup and search --supplier digikey report no match, exit 0, when Digi-Key finds nothing", async () => {
  const looked = collect()
  const lookupCode = await runCli(["lookup", "450-AA193", "--supplier", "digikey"], {
    ...baseOpts({ fetch: digikeyFetch() }),
    log: looked.log,
    error: looked.error,
  })
  expect(lookupCode).toBe(0)
  expect(looked.logs).toEqual(['Digi-Key: no exact match for "450-AA193".'])
  expect(looked.errors).toEqual([])

  const searched = collect()
  const searchCode = await runCli(["search", "Eagle", "Plastic", "Devices", "450-AA193", "--supplier", "digikey"], {
    ...baseOpts({ fetch: digikeyFetch() }),
    log: searched.log,
    error: searched.error,
  })
  expect(searchCode).toBe(0)
  expect(searched.logs).toEqual(['Digi-Key: no exact match for "Eagle Plastic Devices 450-AA193".'])
  expect(searched.errors).toEqual([])
})

function writeDigikeyEntry(partsDir: string): string {
  const entryPath = path.join(partsDir, "r_100k_0805.json")
  const entry = {
    id: "r_100k_0805",
    kind: "resistor",
    description: "test entry",
    specs: {},
    evidence: [],
    why: "test",
    stock: false,
    sources: [
      {
        supplier: "Digi-Key",
        url: "https://www.digikey.com/old",
        sku: "311-100KCRCT-ND",
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

async function refreshWith(keyFiles: Record<string, string>, fetch: FetchLike) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "parts-cli-refresh-dk-"))
  try {
    const partsDir = path.join(repoRoot, "parts")
    fs.mkdirSync(partsDir)
    const entryPath = writeDigikeyEntry(partsDir)
    const keys = readFileFrom(keyFiles)
    const readFile = (filePath: string) => (filePath === entryPath ? fs.readFileSync(entryPath, "utf8") : keys(filePath))
    const written: Record<string, string> = {}
    const out = collect()
    const code = await runCli(["refresh"], {
      ...baseOpts({ readFile, fetch, writeFile: (filePath: string, contents: string) => (written[filePath] = contents) }),
      repoRoot,
      log: out.log,
      error: out.error,
    })
    return { code, out, written: Object.values(written) }
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true })
  }
}

test("refresh rewrites a Digi-Key source by its own SKU, with that variation's pricing", async () => {
  const { code, out, written } = await refreshWith(BOTH_KEY_FILES, digikeyFetch())
  expect(code).toBe(0)
  expect(written).toHaveLength(1)
  const rewritten = JSON.parse(written[0])
  expect(rewritten.sources[0].breaks[0]).toEqual({ quantity: 1, unitPrice: 0.11 })
  expect(rewritten.sources[0].breaks).toHaveLength(8)
  expect(rewritten.sources[0].checked).toBe("2026-10-02")
  expect(out.logs.join("\n")).toContain("Digi-Key (311-100KCRCT-ND): updated")
})

test("refresh refuses, naming the Digi-Key file, when a Digi-Key source needs a missing key", async () => {
  const { code, out, written } = await refreshWith(ONLY_MOUSER_KEY, neverFetch())
  expect(code).toBe(1)
  expect(written).toEqual([])
  expect(out.errors.join("\n")).toContain("digikey-credentials.txt")
})

/** A fetch that answers the token request, then rejects every other request the way a
 * runtime might, with the secret, the client ID and the token in its message and cause. */
function leakyRejectingFetch(): FetchLike {
  const digikey = digikeyFetch()
  return async (url, init) => {
    if (url.endsWith("/v1/oauth2/token")) return digikey(url, init)
    throw new TypeError(`fetch failed for ${url} ${DIGIKEY_SECRET} ${init.headers["Authorization"]}`, {
      cause: new Error(`${DIGIKEY_CLIENT_ID} ${DIGIKEY_TOKEN} ${init.body ?? ""}`),
    })
  }
}

/** A fetch whose very first (token) request rejects, carrying the form body - the secret. */
function tokenRejectingFetch(): FetchLike {
  return async (url, init) => {
    throw new TypeError(`fetch failed for ${url}: ${init.body ?? ""}`, { cause: new Error(DIGIKEY_SECRET) })
  }
}

const DIGIKEY_VERBS: readonly (readonly string[])[] = [
  ["lookup", "RC0805FR-07100KL", "--supplier", "digikey"],
  ["search", "10uF", "--supplier", "digikey"],
  ["source", "RC0805FR-07100KL", "--supplier", "digikey", "--use", "standard", "--sku", "311-100KCRCT-ND"],
]

const REJECTIONS: readonly (readonly [string, FetchLike])[] = [
  ["request", leakyRejectingFetch()],
  ["token", tokenRejectingFetch()],
]

for (const argv of DIGIKEY_VERBS) {
  for (const [name, fetch] of REJECTIONS) {
    test(`${argv.join(" ")}: a ${name} fetch rejection never prints the secret, client ID or token`, async () => {
      const out = collect()
      const code = await runCli(argv, { ...baseOpts({ fetch }), log: out.log, error: out.error })
      expect(code).toBe(1)
      const everything = [...out.logs, ...out.errors].join("\n")
      for (const secret of [DIGIKEY_SECRET, DIGIKEY_CLIENT_ID, DIGIKEY_TOKEN]) expect(everything).not.toContain(secret)
      expect(out.errors.join("\n")).toMatch(/^Digi-Key \S+: request could not be sent \(TypeError\)/)
    })
  }
}

test("refresh: a fetch rejection never prints the secret, client ID or token", async () => {
  const { code, out, written } = await refreshWith(BOTH_KEY_FILES, leakyRejectingFetch())
  expect(code).toBe(1)
  expect(written).toEqual([])
  const everything = [...out.logs, ...out.errors].join("\n")
  for (const secret of [DIGIKEY_SECRET, DIGIKEY_CLIENT_ID, DIGIKEY_TOKEN]) expect(everything).not.toContain(secret)
})
