/**
 * Shared fixtures for the `refreshCatalog` tests (tests/suppliers/refresh*.test.ts): a
 * temporary catalog directory, entry writer, spied real file I/O, and fake supplier clients.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { SupplierClients } from "../../tools/suppliers/refresh.ts"
import type { SupplierClient, SupplierName, SupplierOffer } from "../../tools/suppliers/types.ts"

export function tmpCatalogDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "parts-refresh-test-"))
}

export function writeEntry(dir: string, id: string, fields: Record<string, unknown>): void {
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
export function realIo(): {
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

export function offer(overrides: Partial<SupplierOffer> = {}): SupplierOffer {
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

export function fakeMouserClient(lookupSku: (sku: string) => Promise<SupplierOffer | undefined>): SupplierClient {
  return fakeClient("Mouser", lookupSku)
}

export function fakeClient(
  name: SupplierName,
  lookupSku: (sku: string) => Promise<SupplierOffer | undefined>,
): SupplierClient {
  return {
    name,
    lookup: async () => {
      throw new Error("not used in these tests")
    },
    search: async () => {
      throw new Error("not used in these tests")
    },
    lookupSku,
  }
}

export const READY_CLIENT = (lookupSku: (sku: string) => Promise<SupplierOffer | undefined>): SupplierClients => ({
  Mouser: { kind: "ready", client: fakeMouserClient(lookupSku) },
})
