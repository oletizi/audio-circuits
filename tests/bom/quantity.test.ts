import { test, expect } from "bun:test"
import { coverQuantity, stockPackCovers, suggestBuy } from "../../tools/bom/quantity.ts"
import type { Purchasing } from "../../tools/bom/board-bom.ts"
import type { CatalogEntry, Source } from "../../tools/bom/catalog.ts"

const PROTOTYPE_10PC: Purchasing = { mode: "prototype", shrinkage: 0.1 }

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
  expect(coverQuantity(1, PROTOTYPE_10PC)).toBe(2)
})

test("coverQuantity: prototype, need 10, shrinkage 0.1 -> 11", () => {
  expect(coverQuantity(10, PROTOTYPE_10PC)).toBe(11)
})

test("coverQuantity: run, need 3, 5 boards, shrinkage 0.1 -> 17", () => {
  expect(coverQuantity(3, run(5, 0.1))).toBe(17)
})

test("suggestBuy: prototype, stock part, a pack break covers the cover -> buys the pack", () => {
  const e = entry({ stock: true })
  const s = source([
    { quantity: 1, unitPrice: 0.1 },
    { quantity: 100, unitPrice: 0.012, pack: true },
  ])
  // need 2 -> cover = ceil(2 * 1.1) = 3, well under the 100-pack.
  const suggestion = suggestBuy(2, PROTOTYPE_10PC, e, s)
  expect(suggestion).toEqual({ quantity: 100, unitPrice: 0.012, linePrice: 1.2 })
})

test("suggestBuy: prototype, stock part, no pack covers the cover -> throws naming entry and supplier", () => {
  const e = entry({ id: "r_weird", stock: true })
  const s = source([
    { quantity: 1, unitPrice: 0.1 },
    { quantity: 100, unitPrice: 0.012, pack: true },
  ])
  // need 200 -> cover = ceil(200 * 1.1) = 220, beyond the only 100-unit pack.
  expect(() => suggestBuy(200, PROTOTYPE_10PC, e, s)).toThrow(/r_weird/)
  expect(() => suggestBuy(200, PROTOTYPE_10PC, e, s)).toThrow(/Mouser/)
})

test("suggestBuy: prototype, non-stock -> buys the cover, at the break price for that quantity", () => {
  const e = entry({ stock: false })
  const s = source([
    { quantity: 1, unitPrice: 0.5 },
    { quantity: 25, unitPrice: 0.3 },
  ])
  // need 10 -> cover = ceil(10 * 1.1) = 11, which is below the 25 break, so break [1, 0.5] applies.
  const suggestion = suggestBuy(10, PROTOTYPE_10PC, e, s)
  expect(suggestion).toEqual({ quantity: 11, unitPrice: 0.5, linePrice: 5.5 })
})

test("suggestBuy: prototype, non-stock, cover below the first break's quantity -> buys the first break's quantity", () => {
  const e = entry({ stock: false })
  const s = source([
    { quantity: 10, unitPrice: 0.4 },
    { quantity: 100, unitPrice: 0.2 },
  ])
  // need 1 -> cover = ceil(1 * 1.1) = 2, below the minimum order of 10.
  const suggestion = suggestBuy(1, PROTOTYPE_10PC, e, s)
  expect(suggestion).toEqual({ quantity: 10, unitPrice: 0.4, linePrice: 4 })
})

test("suggestBuy: run, moves up to a larger break when that costs less in total (25 @ 0.30)", () => {
  const e = entry()
  const s = source([
    { quantity: 1, unitPrice: 0.5 },
    { quantity: 25, unitPrice: 0.3 },
  ])
  // need chosen so cover = 17: ceil(need * 5 * 1.1) = 17 -> need = 3 (as in the coverQuantity test).
  const suggestion = suggestBuy(3, run(5, 0.1), e, s)
  expect(suggestion).toEqual({ quantity: 25, unitPrice: 0.3, linePrice: 7.5 })
})

test("suggestBuy: run, stays at the cover when a larger break costs more in total (100 @ 0.30)", () => {
  const e = entry()
  const s = source([
    { quantity: 1, unitPrice: 0.5 },
    { quantity: 100, unitPrice: 0.3 },
  ])
  const suggestion = suggestBuy(3, run(5, 0.1), e, s)
  expect(suggestion).toEqual({ quantity: 17, unitPrice: 0.5, linePrice: 8.5 })
})

test("suggestBuy: run, cover below the first break's quantity buys the first break's quantity", () => {
  const e = entry()
  const s = source([
    { quantity: 10, unitPrice: 0.4 },
    { quantity: 100, unitPrice: 0.39 },
  ])
  // need 1, 1 board, shrinkage 0.1 -> cover = 2, below the minimum order of 10.
  const suggestion = suggestBuy(1, { mode: "run", boards: 1, shrinkage: 0.1 }, e, s)
  expect(suggestion.quantity).toBe(10)
  expect(suggestion.unitPrice).toBe(0.4)
})

test("suggestBuy: throws naming the entry and supplier when the source has no price breaks", () => {
  const e = entry({ id: "r_no_breaks" })
  const s = source([])
  expect(() => suggestBuy(1, PROTOTYPE_10PC, e, s)).toThrow(/r_no_breaks/)
  expect(() => suggestBuy(1, PROTOTYPE_10PC, e, s)).toThrow(/Mouser/)
})

test("stockPackCovers: true when some pack break's quantity is at least the needed quantity", () => {
  const e = entry({ stock: true })
  const s = source([{ quantity: 1, unitPrice: 0.1 }, { quantity: 100, unitPrice: 0.012, pack: true }])
  expect(stockPackCovers(e, s, 3)).toBe(true)
  expect(stockPackCovers(e, s, 100)).toBe(true)
})

test("stockPackCovers: false when no pack break's quantity reaches the needed quantity", () => {
  const e = entry({ stock: true })
  const s = source([{ quantity: 1, unitPrice: 0.1 }, { quantity: 100, unitPrice: 0.012, pack: true }])
  expect(stockPackCovers(e, s, 220)).toBe(false)
})

test("stockPackCovers: false when the only breaks are not marked \"pack\", however large", () => {
  const e = entry({ stock: true })
  const s = source([{ quantity: 1, unitPrice: 0.1 }, { quantity: 1000, unitPrice: 0.01 }])
  expect(stockPackCovers(e, s, 220)).toBe(false)
})

test("stockPackCovers: throws (does not return false) when the source has no price breaks at all", () => {
  const e = entry({ id: "r_no_breaks" })
  const s = source([])
  expect(() => stockPackCovers(e, s, 1)).toThrow(/r_no_breaks/)
  expect(() => stockPackCovers(e, s, 1)).toThrow(/Mouser/)
})
