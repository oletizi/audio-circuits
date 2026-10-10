import { test, expect } from "bun:test"
import { compareBom, isComplete, reportText } from "../../tools/bom/report.ts"
import type { BomLine } from "../../tools/bom/types.ts"
import type { BoardBom } from "../../tools/bom/board-bom.ts"
import type { CatalogEntry, Source } from "../../tools/bom/catalog.ts"

const TODAY = "2026-09-30"
const STALE_DAYS = 45

function line(overrides: Partial<BomLine> = {}): BomLine {
  return {
    key: "resistor 100k 0207",
    placement: "on-board",
    designators: ["R2"],
    quantity: 1,
    kind: "resistor",
    ohms: 100_000,
    physical: { kind: "axial-resistor", body: "0207", leadSpacingMm: 10.16 },
    minWatts: 0.25,
    ...overrides,
  }
}

function source(overrides: Partial<Source> = {}): Source {
  return {
    supplier: "Mouser",
    url: "https://mouser.com/x",
    currency: "USD",
    breaks: [{ quantity: 1, unitPrice: 0.1 }],
    checked: "2026-09-01",
    use: "standard",
    ...overrides,
  }
}

function entry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    id: "r_100k_0207",
    kind: "resistor",
    description: "100k resistor",
    specs: { ohms: 100_000, watts: 0.25, package: "0207", leadSpacingMm: 10.16 },
    evidence: [],
    why: "test fixture",
    stock: false,
    sources: [source()],
    ...overrides,
  }
}

function bom(overrides: Partial<BoardBom> = {}): BoardBom {
  return {
    purchasing: { mode: "prototype", shrinkage: 0.1, stockQuantity: 100, maxStockUnitPrice: 1, maxStockOverage: 10 },
    lines: { "resistor 100k 0207": "r_100k_0207" },
    extras: [],
    ...overrides,
  }
}

test("a complete, well-fitting board reports nothing and isComplete is true", () => {
  const catalog = new Map([["r_100k_0207", entry()]])
  const report = compareBom([line()], bom(), catalog, TODAY, STALE_DAYS)
  expect(report).toEqual({
    unchosen: [], removed: [], unmet: [], unknownParts: [], stalePrices: [], bulkDropped: [],
  })
  expect(isComplete(report)).toBe(true)
})

test("unchosen: a line with no entry in bom.json's lines", () => {
  const catalog = new Map<string, CatalogEntry>()
  const board = bom({ lines: {} })
  const report = compareBom([line()], board, catalog, TODAY, STALE_DAYS)
  expect(report.unchosen).toEqual([line()])
  expect(isComplete(report)).toBe(false)
})

test("unchosen: ordered by kind then numeric value, not the key's text (47k before 100k)", () => {
  const catalog = new Map<string, CatalogEntry>()
  const oneHundredK = line()
  const fortySevenK = line({ key: "resistor 47k 0207", designators: ["R7"], ohms: 47_000 })
  const report = compareBom([oneHundredK, fortySevenK], bom({ lines: {} }), catalog, TODAY, STALE_DAYS)
  expect(report.unchosen).toEqual([fortySevenK, oneHundredK])
})

test("unmet: ordered by kind then numeric value, not the key's text (47k before 100k)", () => {
  const catalog = new Map([
    ["r_100k_0207", entry({ specs: { ohms: 1, watts: 0.25, package: "0207", leadSpacingMm: 10.16 } })],
    ["r_47k_0207", entry({ id: "r_47k_0207", specs: { ohms: 1, watts: 0.25, package: "0207", leadSpacingMm: 10.16 } })],
  ])
  const oneHundredK = line()
  const fortySevenK = line({ key: "resistor 47k 0207", designators: ["R7"], ohms: 47_000 })
  const board = bom({ lines: { "resistor 100k 0207": "r_100k_0207", "resistor 47k 0207": "r_47k_0207" } })
  const report = compareBom([oneHundredK, fortySevenK], board, catalog, TODAY, STALE_DAYS)
  expect(report.unmet.map((item) => item.line.key)).toEqual(["resistor 47k 0207", "resistor 100k 0207"])
})

test("removed: a bom.json key the circuit no longer has", () => {
  const catalog = new Map([["r_100k_0207", entry()]])
  const board = bom({ lines: { "resistor 100k 0207": "r_100k_0207", "resistor 47k 0207": "r_47k_0207" } })
  const report = compareBom([line()], board, catalog, TODAY, STALE_DAYS)
  expect(report.removed).toEqual(["resistor 47k 0207"])
  expect(isComplete(report)).toBe(false)
})

test("unmet: a chosen part that no longer meets its line, naming the field", () => {
  const catalog = new Map([["r_100k_0207", entry({ specs: { ohms: 47_000, watts: 0.25, package: "0207", leadSpacingMm: 10.16 } })]])
  const report = compareBom([line()], bom(), catalog, TODAY, STALE_DAYS)
  expect(report.unmet).toHaveLength(1)
  expect(report.unmet[0].part).toBe("r_100k_0207")
  expect(report.unmet[0].misfits).toContainEqual({ field: "ohms", needed: "100000", found: "47000" })
  expect(isComplete(report)).toBe(false)
})

test("unknownParts: a catalog id named in lines or extras that does not exist", () => {
  const catalog = new Map<string, CatalogEntry>()
  const board = bom({
    lines: { "resistor 100k 0207": "r_100k_0207" },
    extras: [{ part: "missing_extra", quantity: 1, why: "test", spares: true }],
  })
  const report = compareBom([line()], board, catalog, TODAY, STALE_DAYS)
  expect([...report.unknownParts].sort()).toEqual(["missing_extra", "r_100k_0207"])
  expect(isComplete(report)).toBe(false)
})

test("stalePrices: a source checked more than staleDays before today", () => {
  const catalog = new Map([["r_100k_0207", entry({ sources: [source({ checked: "2026-01-01" })] })]])
  const report = compareBom([line()], bom(), catalog, TODAY, STALE_DAYS)
  expect(report.stalePrices).toEqual([{ part: "r_100k_0207", supplier: "Mouser", checked: "2026-01-01" }])
  // Staleness alone does not affect completeness.
  expect(isComplete(report)).toBe(true)
})

test("stalePrices: exactly staleDays old is not stale; one day older is", () => {
  const okCatalog = new Map([["r_100k_0207", entry({ sources: [source({ checked: "2026-08-16" })] })]])
  expect(compareBom([line()], bom(), okCatalog, TODAY, STALE_DAYS).stalePrices).toEqual([])

  const staleCatalog = new Map([["r_100k_0207", entry({ sources: [source({ checked: "2026-08-15" })] })]])
  expect(compareBom([line()], bom(), staleCatalog, TODAY, STALE_DAYS).stalePrices).toHaveLength(1)
})

test("bulkDropped: a bulk buy over the unit-price cap is reported as information, and the list is still complete", () => {
  const catalog = new Map([["r_100k_0207", entry({
    stock: true,
    sources: [source({ breaks: [{ quantity: 1, unitPrice: 0.29 }, { quantity: 250, unitPrice: 0.271 }] })],
  })]])
  const board = bom({
    purchasing: { mode: "prototype", shrinkage: 0.1, stockQuantity: 100, maxStockUnitPrice: 0.15, maxStockOverage: 0.5 },
  })
  const report = compareBom([line()], board, catalog, TODAY, STALE_DAYS)
  expect(report.bulkDropped.map((d) => [d.part, d.supplier, d.outcome])).toEqual([
    ["r_100k_0207", "Mouser", "over-unit-price"],
  ])
  expect(isComplete(report)).toBe(true)
  const text = reportText(report)
  expect(text).toContain("The parts list matches the circuit")
  expect(text).toContain("1 bulk buy(s) not taken (information only")
  expect(text).toContain(
    "R2 (r_100k_0207) at Mouser: not 250 - its unit price 0.271 USD is over the 0.15 USD bulk cap; buying 2",
  )
})

test("bulkDropped: a bulk buy taken is not reported", () => {
  const catalog = new Map([["r_100k_0207", entry({
    stock: true,
    sources: [source({ breaks: [{ quantity: 1, unitPrice: 0.1 }, { quantity: 100, unitPrice: 0.03 }] })],
  })]])
  // Covered 2 @ 0.10 = 0.20; bulk 100 @ 0.03 = 3.00 adds 2.80, within 20 x 0.20 = 4.00.
  const board = bom({
    purchasing: { mode: "prototype", shrinkage: 0.1, stockQuantity: 100, maxStockUnitPrice: 0.15, maxStockOverage: 20 },
  })
  const report = compareBom([line()], board, catalog, TODAY, STALE_DAYS)
  expect(report.bulkDropped).toEqual([])
  expect(reportText(report)).not.toContain("bulk")
})
