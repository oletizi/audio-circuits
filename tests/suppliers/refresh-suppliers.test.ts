import { test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { refreshCatalog, type SupplierClients } from "../../tools/suppliers/refresh.ts"
import {
  tmpCatalogDir, writeEntry, realIo, offer, READY_CLIENT, NOT_BUILT_DIGIKEY,
} from "./refresh-fixtures.ts"

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
    const clients = READY_CLIENT(async (sku) =>
      sku === "603-FIRST"
        ? offer({ sku: "603-FIRST", breaks: [{ quantity: 1, unitPrice: 0.05 }] })
        : offer({ sku: "603-SECOND", breaks: [{ quantity: -1, unitPrice: 0.01 }] }),
    )
    await expect(refreshCatalog(dir, ["a_first", "b_second"], clients, io.readFile, io.writeFile)).rejects.toThrow(
      /breaks\[0\]\.quantity \(-1\) must be a positive integer/,
    )
    expect(io.written).toEqual([])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
