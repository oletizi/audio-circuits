import { test, expect } from "bun:test"
import { coverQuantity, suggestBuy } from "../../tools/bom/quantity.ts"
import type { Purchasing } from "../../tools/bom/board-bom.ts"
import type { CatalogEntry, Source } from "../../tools/bom/catalog.ts"

const PROTOTYPE_10PC: Purchasing = { mode: "prototype", shrinkage: 0.1, stockQuantity: 100, maxStockUnitPrice: 1, maxStockOverage: 10 }

function run(boards: number, shrinkage: number): Purchasing {
  return { mode: "run", boards, shrinkage }
}

function entry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    id: "r_100k_0207",
    kind: "resistor",
    description: "100k resistor",
    specs: {},
    evidence: [],
    why: "test fixture",
    stock: false,
    sources: [],
    ...overrides,
  }
}

function source(breaks: Source["breaks"]): Source {
  return {
    supplier: "Mouser",
    url: "https://mouser.com/x",
    currency: "USD",
    breaks,
    checked: "2026-09-01",
    use: "standard",
  }
}

test("coverQuantity: prototype, need 1, shrinkage 0.1 -> 2", () => {
  expect(coverQuantity(1, PROTOTYPE_10PC, true)).toBe(2)
})

test("coverQuantity: prototype, need 10, shrinkage 0.1 -> 11", () => {
  expect(coverQuantity(10, PROTOTYPE_10PC, true)).toBe(11)
})

test("coverQuantity: run, need 3, 5 boards, shrinkage 0.1 -> 17", () => {
  expect(coverQuantity(3, run(5, 0.1), true)).toBe(17)
})

test("coverQuantity: spares false drops the shrinkage margin (prototype 1 -> 1, run 3 x 5 boards -> 15)", () => {
  expect(coverQuantity(1, PROTOTYPE_10PC, false)).toBe(1)
  expect(coverQuantity(3, run(5, 0.1), false)).toBe(15)
})

test("suggestBuy: prototype, non-stock, spares false buys exactly the need", () => {
  const e = entry()
  const s = source([{ quantity: 1, unitPrice: 25.33 }])
  expect(suggestBuy(1, PROTOTYPE_10PC, e, s, false)).toEqual({ quantity: 1, unitPrice: 25.33, linePrice: 25.33 })
  expect(suggestBuy(1, PROTOTYPE_10PC, e, s, true).quantity).toBe(2)
})

const BREAKS_1_10_100: Source["breaks"] = [
  { quantity: 1, unitPrice: 0.1 },
  { quantity: 10, unitPrice: 0.07 },
  { quantity: 100, unitPrice: 0.03 },
]

test("suggestBuy: prototype, stock part, cover 3, stockQuantity 100 -> the 100 break at 0.03", () => {
  const e = entry({ stock: true })
  // need 2 -> cover = ceil(2 * 1.1) = 3; target = max(3, 100) = 100, exactly the 100 break.
  const suggestion = suggestBuy(2, PROTOTYPE_10PC, e, source(BREAKS_1_10_100), true)
  expect(suggestion).toEqual({ quantity: 100, unitPrice: 0.03, linePrice: 3 })
})

test("suggestBuy: prototype, stock part, every break below the target -> the target at the largest break's price", () => {
  const e = entry({ stock: true })
  const s = source([
    { quantity: 1, unitPrice: 0.1 },
    { quantity: 10, unitPrice: 0.07 },
  ])
  // cover 3, target 100: no break reaches 100, so buy 100 at the 10-break's 0.07.
  const suggestion = suggestBuy(2, PROTOTYPE_10PC, e, s, true)
  expect(suggestion).toEqual({ quantity: 100, unitPrice: 0.07, linePrice: 7 })
})

test("suggestBuy: prototype, stock part, a target between breaks buys the next break up", () => {
  const e = entry({ stock: true })
  const purchasing: Purchasing = { mode: "prototype", shrinkage: 0.1, stockQuantity: 50, maxStockUnitPrice: 1, maxStockOverage: 10 }
  // cover 3, target 50: the smallest break at or above 50 is the 100 break.
  expect(suggestBuy(2, purchasing, e, source(BREAKS_1_10_100), true)).toEqual({
    quantity: 100, unitPrice: 0.03, linePrice: 3,
  })
})

test("suggestBuy: prototype, stock part, a cover above stockQuantity sets the target", () => {
  const e = entry({ stock: true })
  // need 200 -> cover = 220 > 100; no break reaches 220, so buy 220 at the 100-break's 0.03.
  expect(suggestBuy(200, PROTOTYPE_10PC, e, source(BREAKS_1_10_100), true)).toEqual({
    quantity: 220, unitPrice: 0.03, linePrice: 6.6,
  })
})

test("suggestBuy: prototype, stock extra with spares false keeps its no-margin cover, then the stock rule", () => {
  const e = entry({ stock: true })
  const purchasing: Purchasing = { mode: "prototype", shrinkage: 0.1, stockQuantity: 5, maxStockUnitPrice: 1, maxStockOverage: 10 }
  // need 10, spares false -> cover 10 (not 11); target max(10, 5) = 10, exactly the 10 break.
  expect(suggestBuy(10, purchasing, e, source(BREAKS_1_10_100), false)).toEqual({
    quantity: 10, unitPrice: 0.07, linePrice: 0.7,
  })
  // With spares, cover 11 -> the smallest break reaching 11 is the 100 break.
  expect(suggestBuy(10, purchasing, e, source(BREAKS_1_10_100), true).quantity).toBe(100)
})

test("suggestBuy: run mode ignores stock - a stock part is bought as any other", () => {
  const stocked = suggestBuy(3, run(5, 0.1), entry({ stock: true }), source(BREAKS_1_10_100), true)
  const plain = suggestBuy(3, run(5, 0.1), entry({ stock: false }), source(BREAKS_1_10_100), true)
  expect(stocked).toEqual(plain)
})

test("suggestBuy: prototype, non-stock -> buys the cover, at the break price for that quantity", () => {
  const e = entry({ stock: false })
  const s = source([
    { quantity: 1, unitPrice: 0.5 },
    { quantity: 25, unitPrice: 0.3 },
  ])
  // need 10 -> cover = ceil(10 * 1.1) = 11, which is below the 25 break, so break [1, 0.5] applies.
  const suggestion = suggestBuy(10, PROTOTYPE_10PC, e, s, true)
  expect(suggestion).toEqual({ quantity: 11, unitPrice: 0.5, linePrice: 5.5 })
})

test("suggestBuy: prototype, non-stock, cover below the first break's quantity -> buys the first break's quantity", () => {
  const e = entry({ stock: false })
  const s = source([
    { quantity: 10, unitPrice: 0.4 },
    { quantity: 100, unitPrice: 0.2 },
  ])
  // need 1 -> cover = ceil(1 * 1.1) = 2, below the minimum order of 10.
  const suggestion = suggestBuy(1, PROTOTYPE_10PC, e, s, true)
  expect(suggestion).toEqual({ quantity: 10, unitPrice: 0.4, linePrice: 4 })
})

test("suggestBuy: run, moves up to a larger break when that costs less in total (25 @ 0.30)", () => {
  const e = entry()
  const s = source([
    { quantity: 1, unitPrice: 0.5 },
    { quantity: 25, unitPrice: 0.3 },
  ])
  // need chosen so cover = 17: ceil(need * 5 * 1.1) = 17 -> need = 3 (as in the coverQuantity test).
  const suggestion = suggestBuy(3, run(5, 0.1), e, s, true)
  expect(suggestion).toEqual({ quantity: 25, unitPrice: 0.3, linePrice: 7.5 })
})

test("suggestBuy: run, stays at the cover when a larger break costs more in total (100 @ 0.30)", () => {
  const e = entry()
  const s = source([
    { quantity: 1, unitPrice: 0.5 },
    { quantity: 100, unitPrice: 0.3 },
  ])
  const suggestion = suggestBuy(3, run(5, 0.1), e, s, true)
  expect(suggestion).toEqual({ quantity: 17, unitPrice: 0.5, linePrice: 8.5 })
})

test("suggestBuy: run, cover below the first break's quantity buys the first break's quantity", () => {
  const e = entry()
  const s = source([
    { quantity: 10, unitPrice: 0.4 },
    { quantity: 100, unitPrice: 0.39 },
  ])
  // need 1, 1 board, shrinkage 0.1 -> cover = 2, below the minimum order of 10.
  const suggestion = suggestBuy(1, { mode: "run", boards: 1, shrinkage: 0.1 }, e, s, true)
  expect(suggestion.quantity).toBe(10)
  expect(suggestion.unitPrice).toBe(0.4)
})

test("suggestBuy: throws naming the entry and supplier when the source has no price breaks", () => {
  const e = entry({ id: "r_no_breaks" })
  const s = source([])
  expect(() => suggestBuy(1, PROTOTYPE_10PC, e, s, true)).toThrow(/r_no_breaks/)
  expect(() => suggestBuy(1, PROTOTYPE_10PC, e, s, true)).toThrow(/Mouser/)
})
