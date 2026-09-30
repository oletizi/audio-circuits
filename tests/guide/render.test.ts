import { test, expect } from "bun:test"
import { parseBoardDump, holeName } from "../../tools/guide/dump.ts"
import { numberedCuts, numberedBridges } from "../../tools/guide/numbering.ts"
import { renderLayout, type RenderOptions } from "../../tools/guide/render.ts"

/**
 * A small hand-written board in the pinned fork's `--dump-board` grammar: a
 * resistor, a stretched electrolytic (leads four columns apart on a 200-mil
 * body), a wire, two cuts and a solder bridge. The cuts are listed out of
 * reading order on purpose, so numbering has to sort them.
 */
const DUMP_TEXT = [
  "PART R1 RESISTOR 10K AT 2,3 SPAN 1",
  "PART C1 CAP_ELECTRO_200 10uF AT 5,5 SPAN 3",
  "NODE 1 NAME VCC R1.1 C1.1",
  "NODE 2 NAME GND R1.2 C1.2",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "CUT 5,6,1 5,7,2",
  "CUT 2,4,1 2,5,2",
  "SOLDER 3,8 4,8",
  "WIRE W1 AT 8,2 ENDS 8,2,2,2 8,9,2,2",
  "GRID 10 12",
  "PIN R1 1 AT 2,3",
  "PIN R1 2 AT 6,3",
  "PIN C1 1 AT 5,5",
  "PIN C1 2 AT 5,9",
  "",
].join("\n")

const DUMP = parseBoardDump(DUMP_TEXT)
const LABELS: ReadonlyMap<string, string> = new Map([
  ["R1", "R1"],
  ["C1", "C1"],
])

function options(view: RenderOptions["view"]): RenderOptions {
  return { view, title: "test board", edgeLabels: [{ ref: "R1", pin: "1", text: "IN" }] }
}

const COMPONENT = renderLayout(DUMP, LABELS, options("component"))
const COPPER = renderLayout(DUMP, LABELS, options("copper"))

function attr(element: string, name: string): string {
  const match = new RegExp(`\\s${name}="([^"]*)"`).exec(element)
  if (match === null || match[1] === undefined) {
    throw new Error(`test: no ${name} attribute on ${element}`)
  }
  return match[1]
}

function num(element: string, name: string): number {
  return Number(attr(element, name))
}

function elements(svg: string, tag: string, cls: string): string[] {
  return [...svg.matchAll(new RegExp(`<${tag}\\s[^>]*class="${cls}"[^>]*>`, "g"))].map((m) => m[0])
}

function holeCentre(svg: string, name: string): { x: number; y: number } {
  const hole = elements(svg, "circle", "hole").find((el) => attr(el, "data-hole") === name)
  if (hole === undefined) {
    throw new Error(`test: no hole ${name}`)
  }
  return { x: num(hole, "cx"), y: num(hole, "cy") }
}

/** The centre of cut `n`'s cross: the midpoint of the first of its two strokes. */
function cutCentre(svg: string, n: number): { x: number; y: number } {
  const group = new RegExp(`<g class="cut" data-cut="${n}">(.*?)</g>`).exec(svg)
  const stroke = group?.[1]?.match(/<line\s[^>]*>/)?.[0]
  if (stroke === undefined) {
    throw new Error(`test: no cut ${n}`)
  }
  return { x: (num(stroke, "x1") + num(stroke, "x2")) / 2, y: (num(stroke, "y1") + num(stroke, "y2")) / 2 }
}

test("cuts and bridges are numbered from 1 in reading order: row, then column", () => {
  expect(numberedCuts(DUMP).map(({ number, cut }) => [number, holeName(cut.a.row, cut.a.col)])).toEqual([
    [1, "C5"],
    [2, "F7"],
  ])
  expect(numberedBridges(DUMP).map(({ number, bridge }) => [number, bridge.a, bridge.b])).toEqual([
    [1, { row: 3, col: 8 }, { row: 4, col: 8 }],
  ])
})

test("the component view has one checkbox per placed part and per cut", () => {
  const boxes = elements(COMPONENT, "rect", "checkbox").map((el) => attr(el, "data-for"))
  expect(boxes.sort()).toEqual(["cut:1", "cut:2", "part:C1", "part:R1"])
})

test("cut numbers are drawn in reading order, each beside its own cut", () => {
  const numbers = elements(COMPONENT, "text", "cut-number").map((el) => attr(el, "data-cut"))
  expect(numbers).toEqual(["1", "2"])
  const first = cutCentre(COMPONENT, 1)
  const c5 = holeCentre(COMPONENT, "C5")
  const c6 = holeCentre(COMPONENT, "C6")
  expect(first).toEqual({ x: (c5.x + c6.x) / 2, y: c5.y })
})

test("every pin has a lead line, and each ends on its pin's hole", () => {
  const leads = elements(COMPONENT, "line", "lead")
  const expected = Object.entries(DUMP.pins).flatMap(([ref, pins]) => pins.map((pin) => ({ ref, pin })))
  expect(leads.length).toBe(expected.length)
  for (const { ref, pin } of expected) {
    const lead = leads.find((el) => attr(el, "data-ref") === ref && attr(el, "data-pin") === pin.pin)
    if (lead === undefined) {
      throw new Error(`test: no lead for ${ref}.${pin.pin}`)
    }
    expect({ x: num(lead, "x2"), y: num(lead, "y2") }).toEqual(holeCentre(COMPONENT, holeName(pin.row, pin.col)))
  }
})

test("the copper view mirrors the columns, keeps the cut numbers and their checkboxes, and omits parts and wires", () => {
  for (const n of [1, 2]) {
    const component = cutCentre(COMPONENT, n)
    const copper = cutCentre(COPPER, n)
    const a1 = holeCentre(COMPONENT, "A1").x
    const aLast = holeCentre(COMPONENT, `A${DUMP.grid.cols}`).x
    expect(copper.x).toBeCloseTo(a1 + aLast - component.x, 6)
    expect(copper.y).toBe(component.y)
  }
  // A hole keeps its name on both sides: A1 moves to where A12 was.
  expect(holeCentre(COPPER, "A1")).toEqual(holeCentre(COMPONENT, `A${DUMP.grid.cols}`))
  expect(elements(COPPER, "text", "cut-number").map((el) => attr(el, "data-cut"))).toEqual(["1", "2"])
  expect(elements(COPPER, "rect", "checkbox").map((el) => attr(el, "data-for")).sort()).toEqual(["cut:1", "cut:2"])
  expect(elements(COPPER, "line", "lead")).toEqual([])
  expect(elements(COPPER, "line", "wire")).toEqual([])
  expect(COPPER).not.toContain('class="part-body"')
  expect(elements(COPPER, "line", "bridge").length).toBe(1)
})

test("with vertical strips the copper view mirrors rows instead of columns", () => {
  const vertical = { ...DUMP, verticalStrips: true }
  const component = renderLayout(vertical, LABELS, options("component"))
  const copper = renderLayout(vertical, LABELS, options("copper"))
  expect(holeCentre(copper, "A1")).toEqual(holeCentre(component, `${holeName(DUMP.grid.rows - 1, 0)}`))
})

test("the electrolytic's + is marked beside its pin 1 hole, however far that lead is stretched", () => {
  const plus = elements(COMPONENT, "text", "polarity")
  expect(plus.length).toBe(1)
  const p1 = holeCentre(COMPONENT, "F6")
  const [mark] = plus
  if (mark === undefined) {
    throw new Error("test: no polarity mark")
  }
  expect(Math.hypot(num(mark, "x") - p1.x, num(mark, "y") - p1.y)).toBeLessThan(15)
})

test("no colour other than black, white and the strip grey appears", () => {
  for (const svg of [COMPONENT, COPPER]) {
    const colours = new Set([...svg.matchAll(/(?:fill|stroke|color)="([^"]*)"/g)].map((m) => m[1]))
    for (const colour of colours) {
      expect(["none", "#000000", "#ffffff", "#c8c8c8"]).toContain(colour)
    }
    expect(svg).not.toMatch(/style=|rgb\(/)
  }
})

test("an off-board connection is labelled at the nearest board edge", () => {
  expect(COMPONENT).toMatch(/<text [^>]*class="edge-label"[^>]*>IN<\/text>/)
})

test("text is XML-escaped", () => {
  const svg = renderLayout(DUMP, new Map([["R1", "a<b&c"], ["C1", "C1"]]), { ...options("component"), title: "x & y" })
  expect(svg).toContain("a&lt;b&amp;c")
  expect(svg).toContain("x &amp; y")
})

test("refusals: a missing label, an unknown edge-label pin, an unplaced pin list, an undrawable type", () => {
  expect(() => renderLayout(DUMP, new Map([["R1", "R1"]]), options("component"))).toThrow(/C1/)
  expect(() =>
    renderLayout(DUMP, LABELS, { ...options("component"), edgeLabels: [{ ref: "R1", pin: "7", text: "X" }] }),
  ).toThrow(/R1.*7/)
  const noPins = { ...DUMP, pins: { R1: DUMP.pins["R1"] ?? [] } }
  expect(() => renderLayout(noPins, LABELS, options("component"))).toThrow(/C1.*pinned/)
  const oddType = { ...DUMP, parts: DUMP.parts.map((p) => (p.ref === "R1" ? { ...p, type: "DIP8" } : p)) }
  expect(() => renderLayout(oddType, LABELS, options("component"))).toThrow(/DIP8.*R1/)
})
