import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { refreshCatalog, type SupplierClients } from "../../tools/suppliers/refresh.ts"
import type { SupplierClient, SupplierOffer } from "../../tools/suppliers/types.ts"

function tmpCatalogDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "parts-refresh-test-"))
}

function writeEntry(dir: string, id: string, fields: Record<string, unknown>): void {
  const entry = {
    id,
    kind: "resistor",
    description: "test entry",
    specs: {},
    evidence: [],
    why: "test",
    stock: false,
    sources: [],
    ...fields,
  }
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(entry, null, 2) + "\n")
}

/** A real `fs.readFileSync`/`fs.writeFileSync` pair, spied so tests can assert on exactly
 * which paths were written (or that none were). */
function realIo(): {
  readFile: (filePath: string) => string
  writeFile: (filePath: string, contents: string) => void
  written: string[]
} {
  const written: string[] = []
  return {
    readFile: (filePath: string) => fs.readFileSync(filePath, "utf8"),
    writeFile: (filePath: string, contents: string) => {
      written.push(filePath)
      fs.writeFileSync(filePath, contents)
    },
    written,
  }
}

function offer(overrides: Partial<SupplierOffer> = {}): SupplierOffer {
  return {
    supplier: "Mouser",
    sku: "603-TEST",
    manufacturer: "Acme",
    mpn: "TEST-PART",
    description: "A test part",
    url: "https://mouser.com/test",
    stock: 100,
    currency: "USD",
    breaks: [
      { quantity: 1, unitPrice: 0.1 },
      { quantity: 100, unitPrice: 0.05 },
    ],
    parameters: {},
    fetched: "2026-10-01",
    ...overrides,
  }
}

function fakeMouserClient(lookupSku: (sku: string) => Promise<SupplierOffer | undefined>): SupplierClient {
  return {
    name: "Mouser",
    lookup: async () => {
      throw new Error("not used in these tests")
    },
    search: async () => {
      throw new Error("not used in these tests")
    },
    lookupSku,
  }
}

const READY_CLIENT = (lookupSku: (sku: string) => Promise<SupplierOffer | undefined>): SupplierClients => ({
  Mouser: { kind: "ready", client: fakeMouserClient(lookupSku) },
})

const NOT_BUILT_DIGIKEY: SupplierClients = {
  "Digi-Key": { kind: "not-built", message: "Digi-Key client not built" },
}

test("updates a source's breaks and checked date, reporting the smallest break's old and new price", async () => {
  const dir = tmpCatalogDir()
  try {
    writeEntry(dir, "r_100k", {
      sources: [
        {
          supplier: "Mouser",
          url: "https://mouser.com/r100k",
          sku: "603-TEST",
          currency: "USD",
          breaks: [{ quantity: 1, unitPrice: 0.12 }],
          checked: "2026-08-01",
          use: "standard",
        },
      ],
    })
    const io = realIo()
    const result = await refreshCatalog(
      dir,
      ["r_100k"],
      READY_CLIENT(async (sku) => (sku === "603-TEST" ? offer() : undefined)),
      io.readFile,
      io.writeFile,
    )
    expect(result.reports).toEqual([
      { id: "r_100k", sourceIndex: 0, supplier: "Mouser", sku: "603-TEST", outcome: { status: "updated", oldUnitPrice: 0.12, newUnitPrice: 0.1 } },
    ])
    expect(result.writtenIds).toEqual(["r_100k"])
    expect(io.written).toEqual([path.join(dir, "r_100k.json")])
    const written = JSON.parse(fs.readFileSync(path.join(dir, "r_100k.json"), "utf8"))
    expect(written.sources[0].breaks).toEqual([
      { quantity: 1, unitPrice: 0.1 },
      { quantity: 100, unitPrice: 0.05 },
    ])
    expect(written.sources[0].checked).toBe("2026-10-01")
    expect(fs.readFileSync(path.join(dir, "r_100k.json"), "utf8").endsWith("\n")).toBe(true)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("keeps pack: true on a break whose quantity still exists, drops it for one that does not", async () => {
  const dir = tmpCatalogDir()
  try {
    writeEntry(dir, "r_100k", {
      sources: [
        {
          supplier: "Mouser",
          url: "https://mouser.com/r100k",
          sku: "603-TEST",
          currency: "USD",
          breaks: [
            { quantity: 1, unitPrice: 0.12 },
            { quantity: 5000, unitPrice: 0.02, pack: true },
          ],
          checked: "2026-08-01",
          use: "standard",
        },
      ],
    })
    const io = realIo()
    await refreshCatalog(
      dir,
      ["r_100k"],
      READY_CLIENT(async () =>
        offer({
          breaks: [
            { quantity: 1, unitPrice: 0.1 },
            { quantity: 100, unitPrice: 0.05 },
          ],
        }),
      ),
      io.readFile,
      io.writeFile,
    )
    const written = JSON.parse(fs.readFileSync(path.join(dir, "r_100k.json"), "utf8"))
    // quantity 1 still exists but was never marked pack; quantity 5000's pack mark has
    // nowhere to go since 5000 no longer appears; quantity 100 is new, unmarked.
    expect(written.sources[0].breaks).toEqual([
      { quantity: 1, unitPrice: 0.1 },
      { quantity: 100, unitPrice: 0.05 },
    ])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("reports unchanged when the offer's prices match, but still bumps checked", async () => {
  const dir = tmpCatalogDir()
  try {
    writeEntry(dir, "r_100k", {
      sources: [
        {
          supplier: "Mouser",
          url: "https://mouser.com/r100k",
          sku: "603-TEST",
          currency: "USD",
          breaks: [
            { quantity: 1, unitPrice: 0.1 },
            { quantity: 100, unitPrice: 0.05 },
          ],
          checked: "2026-08-01",
          use: "standard",
        },
      ],
    })
    const io = realIo()
    const result = await refreshCatalog(dir, ["r_100k"], READY_CLIENT(async () => offer()), io.readFile, io.writeFile)
    expect(result.reports).toEqual([
      { id: "r_100k", sourceIndex: 0, supplier: "Mouser", sku: "603-TEST", outcome: { status: "unchanged" } },
    ])
    expect(result.writtenIds).toEqual(["r_100k"])
    const written = JSON.parse(fs.readFileSync(path.join(dir, "r_100k.json"), "utf8"))
    expect(written.sources[0].checked).toBe("2026-10-01")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("reports not-listed and leaves the source untouched when the supplier no longer lists it", async () => {
  const dir = tmpCatalogDir()
  try {
    writeEntry(dir, "r_100k", {
      sources: [
        {
          supplier: "Mouser",
          url: "https://mouser.com/r100k",
          sku: "603-GONE",
          currency: "USD",
          breaks: [{ quantity: 1, unitPrice: 0.1 }],
          checked: "2026-08-01",
          use: "standard",
        },
      ],
    })
    const io = realIo()
    const result = await refreshCatalog(dir, ["r_100k"], READY_CLIENT(async () => undefined), io.readFile, io.writeFile)
    expect(result.reports).toEqual([
      { id: "r_100k", sourceIndex: 0, supplier: "Mouser", sku: "603-GONE", outcome: { status: "not-listed" } },
    ])
    expect(result.writtenIds).toEqual([])
    expect(io.written).toEqual([])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("a Digi-Key source with no client is left untouched and reported not-refreshed, without refusing the run", async () => {
  const dir = tmpCatalogDir()
  try {
    writeEntry(dir, "d_part", {
      sources: [
        {
          supplier: "Digi-Key",
          url: "https://digikey.com/d",
          sku: "DK-1",
          currency: "USD",
          breaks: [{ quantity: 1, unitPrice: 0.2 }],
          checked: "2026-08-01",
          use: "standard",
        },
      ],
    })
    const io = realIo()
    const result = await refreshCatalog(dir, ["d_part"], NOT_BUILT_DIGIKEY, io.readFile, io.writeFile)
    expect(result.reports).toEqual([
      {
        id: "d_part",
        sourceIndex: 0,
        supplier: "Digi-Key",
        sku: "DK-1",
        outcome: { status: "not-refreshed", reason: "Digi-Key client not built" },
      },
    ])
    expect(result.writtenIds).toEqual([])
    expect(io.written).toEqual([])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("a source from a non-refreshable supplier (Tayda) is untouched and never reported", async () => {
  const dir = tmpCatalogDir()
  try {
    writeEntry(dir, "t_part", {
      sources: [
        {
          supplier: "Tayda",
          url: "https://taydaelectronics.com/t",
          currency: "USD",
          breaks: [{ quantity: 1, unitPrice: 0.05 }],
          checked: "2026-08-01",
          use: "standard",
        },
      ],
    })
    const io = realIo()
    const result = await refreshCatalog(dir, ["t_part"], {}, io.readFile, io.writeFile)
    expect(result.reports).toEqual([])
    expect(result.writtenIds).toEqual([])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("a Mouser source with missing credentials refuses the whole run before any lookup", async () => {
  const dir = tmpCatalogDir()
  try {
    writeEntry(dir, "r_100k", {
      sources: [
        {
          supplier: "Mouser",
          url: "https://mouser.com/r100k",
          sku: "603-TEST",
          currency: "USD",
          breaks: [{ quantity: 1, unitPrice: 0.1 }],
          checked: "2026-08-01",
          use: "standard",
        },
      ],
    })
    const io = realIo()
    const clients: SupplierClients = {
      Mouser: {
        kind: "missing-credentials",
        message: "/home/x/.config/mouser/mouser-credentials.txt: could not read the credentials file",
      },
    }
    await expect(refreshCatalog(dir, ["r_100k"], clients, io.readFile, io.writeFile)).rejects.toThrow(
      /mouser-credentials\.txt/,
    )
    expect(io.written).toEqual([])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("critical: when the second entry's lookup throws, writeFile is never called for either entry", async () => {
  const dir = tmpCatalogDir()
  try {
    writeEntry(dir, "a_first", {
      sources: [
        {
          supplier: "Mouser",
          url: "https://mouser.com/a",
          sku: "603-FIRST",
          currency: "USD",
          breaks: [{ quantity: 1, unitPrice: 0.2 }],
          checked: "2026-08-01",
          use: "standard",
        },
      ],
    })
    writeEntry(dir, "b_second", {
      sources: [
        {
          supplier: "Mouser",
          url: "https://mouser.com/b",
          sku: "603-SECOND",
          currency: "USD",
          breaks: [{ quantity: 1, unitPrice: 0.3 }],
          checked: "2026-08-01",
          use: "standard",
        },
      ],
    })
    const io = realIo()
    const clients = READY_CLIENT(async (sku) => {
      if (sku === "603-SECOND") throw new Error("Mouser search/partnumber request failed (HTTP 500): boom")
      return offer({ sku: "603-FIRST", breaks: [{ quantity: 1, unitPrice: 0.05 }] })
    })
    await expect(refreshCatalog(dir, ["a_first", "b_second"], clients, io.readFile, io.writeFile)).rejects.toThrow(
      /HTTP 500/,
    )
    expect(io.written).toEqual([])
    expect(JSON.parse(fs.readFileSync(path.join(dir, "a_first.json"), "utf8")).sources[0].checked).toBe("2026-08-01")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("critical: when the second entry's rewritten entry fails validation, writeFile is never called for either", async () => {
  const dir = tmpCatalogDir()
  try {
    writeEntry(dir, "a_first", {
      sources: [
        {
          supplier: "Mouser",
          url: "https://mouser.com/a",
          sku: "603-FIRST",
          currency: "USD",
          breaks: [{ quantity: 1, unitPrice: 0.2 }],
          checked: "2026-08-01",
          use: "standard",
        },
      ],
    })
    writeEntry(dir, "b_second", {
      stock: true, // requires a pack break somewhere once rewritten, which this offer never supplies
      sources: [
        {
          supplier: "Mouser",
          url: "https://mouser.com/b",
          sku: "603-SECOND",
          currency: "USD",
          breaks: [{ quantity: 1, unitPrice: 0.3, pack: true }],
          checked: "2026-08-01",
          use: "standard",
        },
      ],
    })
    const io = realIo()
    const clients = READY_CLIENT(async (sku) =>
      sku === "603-FIRST"
        ? offer({ sku: "603-FIRST", breaks: [{ quantity: 1, unitPrice: 0.05 }] })
        : offer({ sku: "603-SECOND", breaks: [{ quantity: 500, unitPrice: 0.01 }] }),
    )
    await expect(refreshCatalog(dir, ["a_first", "b_second"], clients, io.readFile, io.writeFile)).rejects.toThrow(
      /stock.*pack/s,
    )
    expect(io.written).toEqual([])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("with no ids, refreshes every entry discovered in the directory", async () => {
  const dir = tmpCatalogDir()
  try {
    writeEntry(dir, "aa", {
      sources: [
        {
          supplier: "Mouser",
          url: "https://mouser.com/aa",
          sku: "603-AA",
          currency: "USD",
          breaks: [{ quantity: 1, unitPrice: 0.1 }],
          checked: "2026-08-01",
          use: "standard",
        },
      ],
    })
    writeEntry(dir, "bb", {
      sources: [
        {
          supplier: "Mouser",
          url: "https://mouser.com/bb",
          sku: "603-BB",
          currency: "USD",
          breaks: [{ quantity: 1, unitPrice: 0.1 }],
          checked: "2026-08-01",
          use: "standard",
        },
      ],
    })
    const io = realIo()
    const result = await refreshCatalog(
      dir,
      [],
      READY_CLIENT(async (sku) => offer({ sku, breaks: [{ quantity: 1, unitPrice: 0.2 }] })),
      io.readFile,
      io.writeFile,
    )
    expect(result.writtenIds).toEqual(["aa", "bb"])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("refuses naming the file when a named id does not exist in the directory", async () => {
  const dir = tmpCatalogDir()
  try {
    const io = realIo()
    await expect(refreshCatalog(dir, ["missing"], {}, io.readFile, io.writeFile)).rejects.toThrow(/missing\.json/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
