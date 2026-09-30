import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { loadCatalog, parseCatalogEntry } from "../../tools/bom/catalog.ts"
import type { CatalogEntry } from "../../tools/bom/catalog.ts"

const FILE = "parts/r_100k_0207.json"

/** Typed as `Record<string, unknown>` (not inferred) so spreading it into a mutated test
 * fixture never needs an `as Record<string, unknown>` cast at the call site. */
const VALID_SOURCE: Record<string, unknown> = {
  supplier: "Mouser",
  url: "https://mouser.com/CFR-25JB-52-100K",
  sku: "603-CFR-25JB-52-100K",
  currency: "USD",
  breaks: [
    { quantity: 1, unitPrice: 0.1 },
    { quantity: 100, unitPrice: 0.012, pack: true },
  ],
  checked: "2026-09-01",
  use: "standard",
}

/** Typed as `Record<string, unknown>[]` (not inferred) so filtering it in a test never
 * needs an `as` cast at the call site. */
const VALID_EVIDENCE: readonly Record<string, unknown>[] = [
  { spec: "ohms", url: "https://example.com/datasheet.pdf", note: "100k nominal, table 1" },
  { spec: "tolerancePercent", url: "https://example.com/datasheet.pdf", note: "J tolerance = 5%" },
  { spec: "watts", url: "https://example.com/datasheet.pdf", note: "1/4W rating, section 2" },
  { spec: "leadSpacingMm", url: "https://example.com/datasheet.pdf", note: "0207 body, 10.16mm lead spacing" },
  { spec: "package", url: "https://example.com/datasheet.pdf", note: "0207 axial body" },
  { spec: "mpn", url: "https://mouser.com/CFR-25JB-52-100K", note: "Mouser product page" },
]

const VALID: Record<string, unknown> = {
  id: "r_100k_0207",
  kind: "resistor",
  description: "100k 1/4W metal film resistor, 0207 body",
  manufacturer: "Yageo",
  mpn: "CFR-25JB-52-100K",
  specs: {
    ohms: 100_000,
    tolerancePercent: 5,
    watts: 0.25,
    leadSpacingMm: 10.16,
    package: "0207",
  },
  evidence: VALID_EVIDENCE,
  why: "Cheap, stocked at Mouser and Tayda, meets the 0207 footprint.",
  stock: true,
  sources: [VALID_SOURCE],
}

function valid(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...VALID, ...overrides }
}

function withoutField(field: string): Record<string, unknown> {
  const copy = { ...VALID }
  delete copy[field]
  return copy
}

test("parseCatalogEntry accepts a well-formed entry", () => {
  const entry = parseCatalogEntry(VALID, FILE)
  expect(entry.id).toBe("r_100k_0207")
  expect(entry.kind).toBe("resistor")
  expect(entry.specs.ohms).toBe(100_000)
  expect(entry.stock).toBe(true)
  expect(entry.sources).toHaveLength(1)
  expect(entry.sources[0].breaks).toHaveLength(2)
})

test("parseCatalogEntry throws when the json is not an object", () => {
  expect(() => parseCatalogEntry("nope", FILE)).toThrow(/the entry/)
  expect(() => parseCatalogEntry(null, FILE)).toThrow(/the entry/)
})

const REQUIRED_FIELDS = ["id", "kind", "description", "specs", "evidence", "why", "stock", "sources"]

for (const field of REQUIRED_FIELDS) {
  test(`parseCatalogEntry throws naming "${field}" when it is missing`, () => {
    expect(() => parseCatalogEntry(withoutField(field), FILE)).toThrow(new RegExp(field))
  })
}

test("parseCatalogEntry throws naming the file when id does not match the file name", () => {
  expect(() => parseCatalogEntry(valid({ id: "wrong_id" }), FILE)).toThrow(
    /id "wrong_id" does not match the file name "r_100k_0207"/,
  )
})

test("parseCatalogEntry throws when kind is unknown", () => {
  expect(() => parseCatalogEntry(valid({ kind: "flux-capacitor" }), FILE)).toThrow(
    /kind "flux-capacitor" is not a known component kind or "accessory"/,
  )
})

test("parseCatalogEntry accepts kind \"accessory\"", () => {
  const entry = parseCatalogEntry(
    valid({
      kind: "accessory",
      specs: {},
      evidence: [],
      mpn: undefined,
    }),
    FILE,
  )
  expect(entry.kind).toBe("accessory")
})

test("parseCatalogEntry throws when a spec is present with no evidence entry naming it", () => {
  const entry = valid({ evidence: VALID_EVIDENCE.filter((e) => e["spec"] !== "ohms") })
  expect(() => parseCatalogEntry(entry, FILE)).toThrow(/specs.ohms is present but no evidence entry names it/)
})

test("parseCatalogEntry throws when mpn is present without evidence naming \"mpn\"", () => {
  const entry = valid({ evidence: VALID_EVIDENCE.filter((e) => e["spec"] !== "mpn") })
  expect(() => parseCatalogEntry(entry, FILE)).toThrow(/"mpn" is present but no evidence entry names "mpn"/)
})

test("parseCatalogEntry throws when a source's use is unknown", () => {
  const sources = [{ ...VALID_SOURCE, use: "ebay" }]
  expect(() => parseCatalogEntry(valid({ sources }), FILE)).toThrow(/use "ebay" is not one of/)
})

test("parseCatalogEntry throws when breaks is empty", () => {
  const sources = [{ ...VALID_SOURCE, breaks: [] }]
  expect(() => parseCatalogEntry(valid({ sources }), FILE)).toThrow(/breaks is empty/)
})

test("parseCatalogEntry throws when breaks are not ascending", () => {
  const sources = [
    {
      ...VALID_SOURCE,
      breaks: [
        { quantity: 100, unitPrice: 0.012 },
        { quantity: 1, unitPrice: 0.1 },
      ],
    },
  ]
  expect(() => parseCatalogEntry(valid({ sources }), FILE)).toThrow(/not in strictly ascending order/)
})

test("parseCatalogEntry throws when checked is not YYYY-MM-DD", () => {
  const sources = [{ ...VALID_SOURCE, checked: "09/01/2026" }]
  expect(() => parseCatalogEntry(valid({ sources }), FILE)).toThrow(/not a valid "YYYY-MM-DD" date/)
})

test("parseCatalogEntry throws when checked is not a real calendar date", () => {
  const sources = [{ ...VALID_SOURCE, checked: "2026-02-30" }]
  expect(() => parseCatalogEntry(valid({ sources }), FILE)).toThrow(/not a valid "YYYY-MM-DD" date/)
})

test("parseCatalogEntry throws when stock is true and no source has a pack break", () => {
  const sources = [
    {
      ...VALID_SOURCE,
      breaks: [{ quantity: 1, unitPrice: 0.1 }],
    },
  ]
  expect(() => parseCatalogEntry(valid({ sources }), FILE)).toThrow(
    /"stock" is true but no source has a price break marked "pack"/,
  )
})

test("parseCatalogEntry throws when sources is empty", () => {
  expect(() => parseCatalogEntry(valid({ sources: [] }), FILE)).toThrow(
    /sources is empty; an entry with nowhere to buy it from cannot be chosen for a board. Add at least one source/,
  )
})

test("parseCatalogEntry accepts stock: false with no pack break", () => {
  const sources = [
    {
      ...VALID_SOURCE,
      breaks: [{ quantity: 1, unitPrice: 0.1 }],
    },
  ]
  const entry = parseCatalogEntry(valid({ stock: false, sources }), FILE)
  expect(entry.stock).toBe(false)
})

function withTempDir(run: (dir: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bom-catalog-"))
  try {
    run(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

test("loadCatalog reads every *.json entry from the given directory, keyed by id", () => {
  withTempDir((dir) => {
    fs.writeFileSync(path.join(dir, "r_100k_0207.json"), JSON.stringify(VALID))
    fs.writeFileSync(
      path.join(dir, "not-a-part.txt"),
      "ignored, not a .json file",
    )
    const catalog: ReadonlyMap<string, CatalogEntry> = loadCatalog(dir)
    expect(catalog.size).toBe(1)
    expect(catalog.get("r_100k_0207")?.description).toBe(
      "100k 1/4W metal film resistor, 0207 body",
    )
  })
})

test("loadCatalog throws naming the file when an entry's id does not match its file name", () => {
  withTempDir((dir) => {
    fs.writeFileSync(path.join(dir, "wrong_name.json"), JSON.stringify(VALID))
    expect(() => loadCatalog(dir)).toThrow(/wrong_name\.json.*id "r_100k_0207" does not match/s)
  })
})

test("loadCatalog throws naming the directory when it cannot be read", () => {
  expect(() => loadCatalog("/definitely/not/a/real/directory")).toThrow(
    /could not read catalog directory/,
  )
})
