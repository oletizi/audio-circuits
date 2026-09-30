import { test, expect } from "bun:test"
import { buyItems, lineItemId, planBuys, type BuyItem } from "../../tools/bom/bulk.ts"
import type { Purchasing } from "../../tools/bom/board-bom.ts"
import type { CatalogEntry, Source } from "../../tools/bom/catalog.ts"
import type { BomLine } from "../../tools/bom/types.ts"

function prototype(maxStockUnitPrice: number, maxStockOverage: number): Purchasing {
  return { mode: "prototype", shrinkage: 0.1, stockQuantity: 100, maxStockUnitPrice, maxStockOverage }
}

function source(breaks: Source["breaks"], supplier = "Mouser"): Source {
  return { supplier, url: `https://${supplier}.example/x`, currency: "USD", breaks, checked: "2026-09-01", use: "standard" }
}

function entry(id: string, stock: boolean, sources: readonly Source[]): CatalogEntry {
  return { id, kind: "resistor", description: id, specs: {}, evidence: [], why: "test", stock, sources }
}

/** need 1 -> cover ceil(1 * 1.1) = 2 in every case below. */
function item(key: string, part: CatalogEntry): BuyItem {
  return { id: lineItemId(key), key, label: key.toUpperCase(), entry: part, need: 1, spares: true }
}

const CHEAP = [{ quantity: 1, unitPrice: 0.1 }, { quantity: 100, unitPrice: 0.03 }]
// A non-stock part costing 20.00 at covered quantity (2 @ 10.00): gives the order a base.
const EXPENSIVE = item("pot", entry("pot", false, [source([{ quantity: 1, unitPrice: 10 }])]))

test("unit-price cap: a bulk buy over maxStockUnitPrice is set aside for the covered quantity", () => {
  // The staged board's 3-pin header: bulk is 250 @ 0.271, over the 0.15 cap -> buy the cover, 2 @ 0.29.
  const header = item("header", entry("hdr", true, [source([{ quantity: 1, unitPrice: 0.29 }, { quantity: 250, unitPrice: 0.271 }])]))
  const plan = planBuys([header], prototype(0.15, 0.5))
  expect(plan.buy(header.id, 0)).toEqual({ quantity: 2, unitPrice: 0.29, linePrice: 0.58 })
  expect(plan.decisions.map((d) => [d.key, d.outcome])).toEqual([["header", "over-unit-price"]])
  expect(plan.decisions[0]?.bulk).toEqual({ quantity: 250, unitPrice: 0.271, linePrice: 67.75 })
})

test("unit-price cap: a bulk unit price exactly at the cap is taken", () => {
  const r = item("r", entry("r", true, [source([{ quantity: 1, unitPrice: 0.2 }, { quantity: 100, unitPrice: 0.15 }])]))
  // Overage 100%: 15.00 - 0.40 = 14.60 added is within 20.40.
  const plan = planBuys([r, EXPENSIVE], prototype(0.15, 1))
  expect(plan.buy(r.id, 0)).toEqual({ quantity: 100, unitPrice: 0.15, linePrice: 15 })
  expect(plan.decisions[0]?.outcome).toBe("bulk")
})

test("overage cap: the bulk buy adding the most money is dropped first, then the rest fit", () => {
  // Covered order: 20.00 + 3 x 0.20 = 20.60; 50% allows 10.30 more.
  // Bulk adds: a 3.00 - 0.20 = 2.80, b 5.00 - 0.20 = 4.80, c 2.80 -> 10.40 > 10.30.
  // Dropping b (the most, 4.80) leaves 5.60 <= 10.30, so a and c stay bulk.
  const a = item("resistor a", entry("ra", true, [source(CHEAP)]))
  const b = item("resistor b", entry("rb", true, [source([{ quantity: 1, unitPrice: 0.1 }, { quantity: 100, unitPrice: 0.05 }])]))
  const c = item("resistor c", entry("rc", true, [source(CHEAP)]))
  const plan = planBuys([a, b, c, EXPENSIVE], prototype(0.15, 0.5))
  expect(plan.decisions.map((d) => [d.key, d.outcome])).toEqual([
    ["resistor a", "bulk"], ["resistor b", "over-overage"], ["resistor c", "bulk"],
  ])
  expect(plan.buy(b.id, 0)).toEqual({ quantity: 2, unitPrice: 0.1, linePrice: 0.2 })
  expect(plan.buy(a.id, 0)).toEqual({ quantity: 100, unitPrice: 0.03, linePrice: 3 })
})

test("overage cap: an order within the cap keeps every bulk buy", () => {
  // Same order at 60%: 10.40 <= 20.60 x 0.6 = 12.36.
  const a = item("resistor a", entry("ra", true, [source(CHEAP)]))
  const b = item("resistor b", entry("rb", true, [source([{ quantity: 1, unitPrice: 0.1 }, { quantity: 100, unitPrice: 0.05 }])]))
  const c = item("resistor c", entry("rc", true, [source(CHEAP)]))
  const plan = planBuys([a, b, c, EXPENSIVE], prototype(0.15, 0.6))
  expect(plan.decisions.every((d) => d.outcome === "bulk")).toBe(true)
})

test("overage cap: equal added money is dropped in key order, and dropping stops once within the cap", () => {
  // Three bulk buys adding 2.80 each = 8.40; 30% of 20.60 allows 6.18. Dropping one (the
  // smallest key, "resistor a") leaves 5.60 <= 6.18.
  const c = item("resistor c", entry("rc", true, [source(CHEAP)]))
  const a = item("resistor a", entry("ra", true, [source(CHEAP)]))
  const b = item("resistor b", entry("rb", true, [source(CHEAP)]))
  const plan = planBuys([c, a, b, EXPENSIVE], prototype(0.15, 0.3))
  // Decisions keep the items' given order; the drop went to the smallest key regardless.
  expect(plan.decisions.map((d) => [d.key, d.outcome])).toEqual([
    ["resistor c", "bulk"], ["resistor a", "over-overage"], ["resistor b", "bulk"],
  ])
})

test("overage cap: a zero overage drops every bulk buy that adds money", () => {
  const a = item("resistor a", entry("ra", true, [source(CHEAP)]))
  const plan = planBuys([a, EXPENSIVE], prototype(0.15, 0))
  expect(plan.decisions.map((d) => d.outcome)).toEqual(["over-overage"])
})

test("each supplier's order is capped on its own: a drop at Mouser does not touch Tayda", () => {
  // Part x at two suppliers. Mouser's order is x alone: covered 0.20, bulk 5.00 (+4.80) is
  // far over 50% of 0.20 -> dropped. Tayda's order also holds the 20.00 pot: covered 20.20,
  // bulk 100 @ 0.01 = 1.00 (+0.80) is within 10.10 -> kept.
  const x = item("x", entry("x", true, [
    source([{ quantity: 1, unitPrice: 0.1 }, { quantity: 100, unitPrice: 0.05 }], "Mouser"),
    source([{ quantity: 1, unitPrice: 0.1 }, { quantity: 100, unitPrice: 0.01 }], "Tayda"),
  ]))
  const pot = item("pot", entry("pot", false, [source([{ quantity: 1, unitPrice: 10 }], "Tayda")]))
  const plan = planBuys([x, pot], prototype(0.15, 0.5))
  expect(plan.decisions.map((d) => [d.supplier, d.outcome])).toEqual([["Mouser", "over-overage"], ["Tayda", "bulk"]])
  expect(plan.buy(x.id, 0)).toEqual({ quantity: 2, unitPrice: 0.1, linePrice: 0.2 })
  expect(plan.buy(x.id, 1)).toEqual({ quantity: 100, unitPrice: 0.01, linePrice: 1 })
})

test("run mode considers no bulk buys", () => {
  const a = item("resistor a", entry("ra", true, [source(CHEAP)]))
  const plan = planBuys([a], { mode: "run", boards: 1, shrinkage: 0.1 })
  expect(plan.decisions).toEqual([])
  // The run rule: 2 @ 0.10 = 0.20 costs less than 100 @ 0.03 = 3.00.
  expect(plan.buy(a.id, 0)).toEqual({ quantity: 2, unitPrice: 0.1, linePrice: 0.2 })
})

test("buyItems keys a line by its key and an extra by its catalog id, skipping unchosen and unknown", () => {
  const line: BomLine = {
    key: "resistor 1K x", placement: "on-board", designators: ["R1", "R2"], quantity: 2, kind: "resistor",
    physical: { kind: "axial-resistor", body: "0207", leadSpacingMm: 10.16 },
  }
  const unchosen: BomLine = { ...line, key: "resistor 2K x" }
  const catalog = new Map([["r1k", entry("r1k", true, [source(CHEAP)])], ["kit", entry("kit", false, [source(CHEAP)])]])
  const items = buyItems([line, unchosen], {
    purchasing: prototype(0.15, 0.5),
    lines: { "resistor 1K x": "r1k" },
    extras: [
      { part: "kit", quantity: 1, why: "wiring", spares: false },
      { part: "missing", quantity: 1, why: "nothing", spares: true },
    ],
  }, catalog)
  expect(items.map((i) => [i.id, i.key, i.label, i.need, i.spares])).toEqual([
    ["line:resistor 1K x", "resistor 1K x", "R1, R2", 2, true],
    ["extra:0", "kit", "wiring", 1, false],
  ])
})
