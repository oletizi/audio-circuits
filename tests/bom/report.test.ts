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
    purchasing: { mode: "prototype", shrinkage: 0.1 },
    lines: { "resistor 100k 0207": "r_100k_0207" },
    extras: [],
    ...overrides,
  }
}

test("a complete, well-fitting board reports nothing and isComplete is true", () => {
  const catalog = new Map([["r_100k_0207", entry()]])
  const report = compareBom([line()], bom(), catalog, TODAY, STALE_DAYS)
  expect(report).toEqual({
    unchosen: [], removed: [], unmet: [], unknownParts: [], stalePrices: [], uncovered: [],
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
    extras: [{ part: "missing_extra", quantity: 1, why: "test" }],
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

test("uncovered: a stock part in prototype mode with no source's pack covering the quantity", () => {
  const catalog = new Map([["r_100k_0207", entry({
    stock: true,
    sources: [source({ breaks: [{ quantity: 1, unitPrice: 0.1 }, { quantity: 100, unitPrice: 0.012, pack: true }] })],
  })]])
  // need 200 -> cover = ceil(200 * 1.1) = 220, beyond the only 100-unit pack.
  const board = bom({ purchasing: { mode: "prototype", shrinkage: 0.1 } })
  const report = compareBom([line({ quantity: 200 })], board, catalog, TODAY, STALE_DAYS)
  expect(report.uncovered).toEqual([{ part: "r_100k_0207", supplier: "Mouser", quantity: 220 }])
  expect(isComplete(report)).toBe(false)
})

test("uncovered: one non-covering source among covering ones is not reported", () => {
  const catalog = new Map([["r_100k_0207", entry({
    stock: true,
    sources: [
      source({ supplier: "Mouser", breaks: [{ quantity: 1, unitPrice: 0.1 }, { quantity: 100, unitPrice: 0.012, pack: true }] }),
      source({ supplier: "Tayda", breaks: [{ quantity: 1, unitPrice: 0.1 }, { quantity: 1000, unitPrice: 0.01, pack: true }] }),
    ],
  })]])
  const report = compareBom([line({ quantity: 200 })], bom(), catalog, TODAY, STALE_DAYS)
  expect(report.uncovered).toEqual([])
  expect(isComplete(report)).toBe(true)
})

test("a source with zero price breaks throws from compareBom rather than becoming an uncovered item", () => {
  // Bypasses catalog.ts validation (which requires at least one price break) to
  // exercise a malformed entry directly - a bug distinct from "no pack big enough",
  // and one compareBom must not silently read as an ordinary uncovered line.
  const catalog = new Map([["r_100k_0207", entry({ stock: true, sources: [source({ breaks: [] })] })]])
  expect(() => compareBom([line({ quantity: 200 })], bom(), catalog, TODAY, STALE_DAYS)).toThrow(
    /r_100k_0207/,
  )
  expect(() => compareBom([line({ quantity: 200 })], bom(), catalog, TODAY, STALE_DAYS)).toThrow(
    /no price breaks/,
  )
})

test("uncovered: applies to extras too, keyed by the extra's part", () => {
  const catalog = new Map([["knob", {
    id: "knob", kind: "accessory" as const, description: "knob", specs: {}, evidence: [], why: "test",
    stock: true,
    sources: [source({ breaks: [{ quantity: 1, unitPrice: 0.1 }, { quantity: 50, unitPrice: 0.05, pack: true }] })],
  }]])
  const board = bom({ lines: {}, extras: [{ part: "knob", quantity: 200, why: "test" }] })
  const report = compareBom([], board, catalog, TODAY, STALE_DAYS)
  expect(report.uncovered).toEqual([{ part: "knob", supplier: "Mouser", quantity: 220 }])
})

test("a line with neither removed nor unmet is skipped when its chosen part is unknown", () => {
  const catalog = new Map<string, CatalogEntry>()
  const report = compareBom([line()], bom(), catalog, TODAY, STALE_DAYS)
  expect(report.unmet).toEqual([])
  expect(report.unknownParts).toEqual(["r_100k_0207"])
})

test("reportText names every category with its fix", () => {
  const catalog = new Map<string, CatalogEntry>()
  const board = bom({ lines: { "resistor 47k 0207": "missing_part" } })
  const report = compareBom([line()], board, catalog, TODAY, STALE_DAYS)
  const text = reportText(report)
  expect(text).toMatch(/line\(s\) with no part chosen - choose a part with the researcher/)
  expect(text).toMatch(/resistor 100k 0207/)
  expect(text).toMatch(/chosen line\(s\) the circuit no longer has - remove the key from bom\.json/)
  expect(text).toMatch(/resistor 47k 0207/)
  expect(text).toMatch(/catalog id\(s\) named in bom\.json that do not exist/)
  expect(text).toMatch(/missing_part/)
})

test("reportText says the list matches when the report is empty", () => {
  const catalog = new Map([["r_100k_0207", entry()]])
  const report = compareBom([line()], bom(), catalog, TODAY, STALE_DAYS)
  expect(reportText(report)).toBe("The parts list matches the circuit: every line is chosen and every chosen part fits.")
})
