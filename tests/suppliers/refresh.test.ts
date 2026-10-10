import { test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { refreshCatalog } from "../../tools/suppliers/refresh.ts"
import {
  tmpCatalogDir, writeEntry, realIo, offer, READY_CLIENT,
} from "./refresh-fixtures.ts"

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

test("reports updated when only a larger break's price changed, the smallest-quantity price being the same", async () => {
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
            { quantity: 100, unitPrice: 0.06 },
          ],
          checked: "2026-08-01",
          use: "standard",
        },
      ],
    })
    const io = realIo()
    const result = await refreshCatalog(dir, ["r_100k"], READY_CLIENT(async () => offer()), io.readFile, io.writeFile)
    expect(result.reports).toEqual([
      { id: "r_100k", sourceIndex: 0, supplier: "Mouser", sku: "603-TEST", outcome: { status: "updated", oldUnitPrice: 0.1, newUnitPrice: 0.1 } },
    ])
    const written = JSON.parse(fs.readFileSync(path.join(dir, "r_100k.json"), "utf8"))
    expect(written.sources[0].breaks[1]).toEqual({ quantity: 100, unitPrice: 0.05 })
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("reports updated when a break's quantity changed, even with the same prices", async () => {
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
            { quantity: 50, unitPrice: 0.05 },
          ],
          checked: "2026-08-01",
          use: "standard",
        },
      ],
    })
    const io = realIo()
    const result = await refreshCatalog(dir, ["r_100k"], READY_CLIENT(async () => offer()), io.readFile, io.writeFile)
    expect(result.reports[0].outcome.status).toBe("updated")
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

test("reports no-price and leaves the source untouched when the SKU is listed but has no price break", async () => {
  const dir = tmpCatalogDir()
  try {
    writeEntry(dir, "r_100k", {
      sources: [
        {
          supplier: "Mouser",
          url: "https://mouser.com/r100k",
          sku: "511-2N3904",
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
      ["r_100k"],
      READY_CLIENT(async (sku) => (sku === "511-2N3904" ? offer({ sku, breaks: [] }) : undefined)),
      io.readFile,
      io.writeFile,
    )
    expect(result.reports).toEqual([
      { id: "r_100k", sourceIndex: 0, supplier: "Mouser", sku: "511-2N3904", outcome: { status: "no-price" } },
    ])
    expect(result.writtenIds).toEqual([])
    expect(io.written).toEqual([])
    const unchanged = JSON.parse(fs.readFileSync(path.join(dir, "r_100k.json"), "utf8"))
    expect(unchanged.sources[0].breaks).toEqual([{ quantity: 1, unitPrice: 0.1 }])
    expect(unchanged.sources[0].checked).toBe("2026-08-01")
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
