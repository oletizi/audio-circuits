import { test, expect } from "bun:test"
import { renderBomMarkdown } from "../../tools/bom/render.ts"
import type { BomLine } from "../../tools/bom/types.ts"
import type { BoardBom } from "../../tools/bom/board-bom.ts"
import type { CatalogEntry, Source } from "../../tools/bom/catalog.ts"

function resistorLine(overrides: Partial<BomLine> = {}): BomLine {
  return {
    key: "resistor 100k 0207",
    placement: "on-board",
    designators: ["R2", "R10"],
    quantity: 2,
    kind: "resistor",
    ohms: 100_000,
    physical: { kind: "axial-resistor", body: "0207", leadSpacingMm: 10.16 },
    minWatts: 0.25,
    ...overrides,
  }
}

const PANEL_POT_LINE: BomLine = {
  key: "potentiometer 25K linear panel-pot",
  placement: "off-board",
  designators: ["RV5"],
  quantity: 1,
  kind: "potentiometer",
  ohms: 25_000,
  taper: "linear",
  physical: { kind: "panel-pot" },
}

function source(overrides: Partial<Source> = {}): Source {
  return {
    supplier: "Mouser",
    url: "https://mouser.com/x",
    currency: "USD",
    breaks: [{ quantity: 1, unitPrice: 0.1 }, { quantity: 100, unitPrice: 0.012, pack: true }],
    checked: "2026-09-01",
    use: "standard",
    ...overrides,
  }
}

function entry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    id: "r_100k_0207",
    kind: "resistor",
    description: "100k 1/4W metal film resistor, 0207 body",
    manufacturer: "Yageo",
    mpn: "CFR-25JB-52-100K",
    specs: { ohms: 100_000, watts: 0.25, package: "0207", leadSpacingMm: 10.16 },
    evidence: [],
    why: "test fixture",
    stock: true,
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

test("renders a title, conditions, an on-board table and a totals table", () => {
  const catalog = new Map([["r_100k_0207", entry()]])
  const text = renderBomMarkdown({
    boardName: "staged-board", conditions: "9V rail, gain trim at noon", lines: [resistorLine()], bom: bom(), catalog,
  })
  expect(text).toContain("# staged-board bill of materials")
  expect(text).toContain("9V rail, gain trim at noon")
  expect(text).toContain("## On the board")
  expect(text).not.toContain("## Off the board")
  expect(text).not.toContain("## Extras")
  expect(text).toContain("## Totals")
  expect(text).toContain("R2, R10")
  expect(text).toContain("Yageo CFR-25JB-52-100K")
  expect(text).toContain("[Mouser (standard)](https://mouser.com/x) (checked 2026-09-01)")
})

test("unchosen line renders a row saying \"not chosen\"", () => {
  const catalog = new Map<string, CatalogEntry>()
  const text = renderBomMarkdown({
    boardName: "b", conditions: "x", lines: [resistorLine()], bom: bom({ lines: {} }), catalog,
  })
  expect(text).toContain(
    "| R2, R10 | 100K, 0207 axial, 10.16 mm leads, min 0.25 W | 2 | not chosen | not chosen | not chosen " +
      "| not chosen | not chosen | not chosen |",
  )
})

test("every section table has a Needs column after Designators", () => {
  const catalog = new Map([["r_100k_0207", entry()]])
  const text = renderBomMarkdown({
    boardName: "b", conditions: "x", lines: [resistorLine()], bom: bom(), catalog,
  })
  expect(text).toContain("| Designators | Needs | Need | Buy | Description |")
  expect(text).toContain("| R2, R10 | 100K, 0207 axial, 10.16 mm leads, min 0.25 W | 2 |")
})

test("off-board panel pot rows state what they need", () => {
  const text = renderBomMarkdown({
    boardName: "b", conditions: "x", lines: [PANEL_POT_LINE], bom: bom({ lines: {} }), catalog: new Map(),
  })
  expect(text).toContain("| RV5 | 25K, linear, panel pot | 1 | not chosen |")
})

test("a chosen id absent from the catalog renders \"unknown part\" instead of throwing", () => {
  const catalog = new Map<string, CatalogEntry>()
  const text = renderBomMarkdown({
    boardName: "b", conditions: "x", lines: [resistorLine()], bom: bom(), catalog,
  })
  expect(text).toContain('unknown part "r_100k_0207"')
})

test("a source with no pack covering the quantity renders \"no pack covers <n>\" instead of throwing", () => {
  const catalog = new Map([["r_100k_0207", entry({
    sources: [source({ breaks: [{ quantity: 1, unitPrice: 0.1 }, { quantity: 100, unitPrice: 0.012, pack: true }] })],
  })]])
  // quantity 200 -> cover = ceil(200 * 1.1) = 220, beyond the only 100-unit pack.
  const text = renderBomMarkdown({
    boardName: "b", conditions: "x", lines: [resistorLine({ quantity: 200, designators: ["R1"] })], bom: bom(), catalog,
  })
  expect(text).toContain("no pack covers 220")
})

test("off-board lines render under \"Off the board\"", () => {
  const catalog = new Map([["pot_25k", {
    id: "pot_25k", kind: "potentiometer" as const, description: "25k linear pot, 16mm, solid shaft, PCB pins",
    specs: { ohms: 25_000, taper: "linear" as const }, evidence: [], why: "test", stock: false,
    sources: [source({ breaks: [{ quantity: 1, unitPrice: 1.5 }] })],
  }]])
  const text = renderBomMarkdown({
    boardName: "b", conditions: "x", lines: [PANEL_POT_LINE],
    bom: bom({ lines: { "potentiometer 25K linear panel-pot": "pot_25k" } }), catalog,
  })
  expect(text).toContain("## Off the board")
  expect(text).not.toContain("## On the board")
})

test("extras render under \"Extras\", using the reason as the identifying label", () => {
  const catalog = new Map([["transistor_socket_to92", {
    id: "transistor_socket_to92", kind: "accessory" as const, description: "TO-92 transistor socket",
    specs: {}, evidence: [], why: "test", stock: true,
    sources: [source({ breaks: [{ quantity: 1, unitPrice: 0.1 }, { quantity: 50, unitPrice: 0.05, pack: true }] })],
  }]])
  const text = renderBomMarkdown({
    boardName: "b", conditions: "x", lines: [], catalog,
    bom: bom({ lines: {}, extras: [{ part: "transistor_socket_to92", quantity: 6, why: "one per BJT, plus spares" }] }),
  })
  expect(text).toContain("## Extras")
  expect(text).toContain("| one per BJT, plus spares | - | 6 |")
  expect(text).toContain("TO-92 transistor socket")
})

test("unit prices under 0.10 show up to four decimals; line and total prices show two", () => {
  const catalog = new Map([["r_100k_0207", entry({
    sources: [source({ breaks: [{ quantity: 1, unitPrice: 0.1 }, { quantity: 100, unitPrice: 0.012, pack: true }] })],
  })]])
  // need 2 -> cover = ceil(2 * 1.1) = 3, well under the 100-pack -> the pack break applies.
  const text = renderBomMarkdown({
    boardName: "b", conditions: "x", lines: [resistorLine({ quantity: 2 })], bom: bom(), catalog,
  })
  expect(text).toContain("0.012 USD")
  expect(text).toContain("1.20 USD")
})

test("totals are per supplier AND currency, never combined across currencies", () => {
  const catalog = new Map([
    ["r_100k_0207", entry({
      stock: false,
      sources: [source({ supplier: "Mouser", currency: "USD", breaks: [{ quantity: 1, unitPrice: 0.1 }] })],
    })],
    ["r_47k_0207", entry({
      id: "r_47k_0207", stock: false,
      sources: [source({ supplier: "Tayda", currency: "GBP", breaks: [{ quantity: 1, unitPrice: 0.2 }] })],
    })],
  ])
  const lines = [
    resistorLine({ quantity: 1, designators: ["R1"] }),
    resistorLine({ key: "resistor 47k 0207", quantity: 1, designators: ["R2"], ohms: 47_000 }),
  ]
  const text = renderBomMarkdown({
    boardName: "b", conditions: "x", lines,
    bom: bom({ lines: { "resistor 100k 0207": "r_100k_0207", "resistor 47k 0207": "r_47k_0207" } }),
    catalog,
  })
  // need 1 -> cover = ceil(1 * 1.1) = 2 (shrinkage 0.1, prototype mode) -> 2 units at the
  // single break's unit price: 2 x 0.1 = 0.20 USD; 2 x 0.2 = 0.40 GBP.
  expect(text).toMatch(/\| Mouser \| USD \| 0\.20 \|/)
  expect(text).toMatch(/\| Tayda \| GBP \| 0\.40 \|/)
})

test("rendering is byte-for-byte deterministic for the same inputs", () => {
  const catalog = new Map([["r_100k_0207", entry()]])
  const input = { boardName: "staged-board", conditions: "9V rail", lines: [resistorLine()], bom: bom(), catalog }
  expect(renderBomMarkdown(input)).toBe(renderBomMarkdown(input))
})

test("no date appears anywhere except a source's own \"checked\" date", () => {
  const catalog = new Map([["r_100k_0207", entry({ sources: [source({ checked: "2026-03-15" })] })]])
  const text = renderBomMarkdown({
    boardName: "b", conditions: "x", lines: [resistorLine()], bom: bom(), catalog,
  })
  const dates = text.match(/\d{4}-\d{2}-\d{2}/g) ?? []
  expect(dates).toEqual(["2026-03-15"])
})

test("lines are ordered deterministically within a section by kind then numeric value, not the key's text", () => {
  const catalog = new Map([
    ["r_100k_0207", entry()],
    ["r_47k_0207", entry({ id: "r_47k_0207", specs: { ohms: 47_000, watts: 0.25, package: "0207", leadSpacingMm: 10.16 } })],
  ])
  const lines = [
    resistorLine({ quantity: 1, designators: ["R1"] }),
    resistorLine({ key: "resistor 47k 0207", quantity: 1, designators: ["R2"], ohms: 47_000 }),
  ]
  const text = renderBomMarkdown({
    boardName: "b", conditions: "x", lines,
    bom: bom({ lines: { "resistor 100k 0207": "r_100k_0207", "resistor 47k 0207": "r_47k_0207" } }),
    catalog,
  })
  // 47k sorts before 100k numerically, even though "resistor 100k 0207" sorts before
  // "resistor 47k 0207" as plain text ("1" < "4") - the key's text is only the final
  // tie-break (tools/bom/ordering.ts), not the primary order.
  const onBoardSection = text.split("## On the board")[1]
  const r47Index = onBoardSection.indexOf("R2")
  const r100Index = onBoardSection.indexOf("R1")
  expect(r47Index).toBeGreaterThan(0)
  expect(r100Index).toBeGreaterThan(r47Index)
})
