import { test, expect } from "bun:test"
import { parseBoardDump, holeName } from "../../tools/guide/dump.ts"
import { numberedCuts, numberedBridges } from "../../tools/guide/numbering.ts"
import { renderLayout, type RenderOptions } from "../../tools/guide/render.ts"

/**
 * A small hand-written board in the pinned fork's `--dump-board` grammar: a
 * resistor, a stretched electrolytic (leads four columns apart on a 200-mil
 * body), a standing resistor (pins one hole apart), a wire, two cuts and a
 * solder bridge. The cuts are listed out of
 * reading order on purpose, so numbering has to sort them.
 */
const DUMP_TEXT = [
  "PART R1 RESISTOR 10K AT 2,3 SPAN 1",
  "PART C1 CAP_ELECTRO_200 10uF AT 5,5 SPAN 3",
  "PART R2 RESISTOR 1K AT 0,10 SPAN 1",
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
  "PIN R2 1 AT 0,10",
  "PIN R2 2 AT 1,10",
  "",
].join("\n")

const DUMP = parseBoardDump(DUMP_TEXT)
const LABELS: ReadonlyMap<string, string> = new Map([
  ["R1", "R1"],
  ["C1", "C1"],
  ["R2", "R2"],
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
  expect(boxes.sort()).toEqual(["cut:1", "cut:2", "part:C1", "part:R1", "part:R2"])
})

test("every cut's cross sits between its own two holes, with its number and checkbox within a pitch of it", () => {
  const numbers = elements(COMPONENT, "text", "cut-number").map((el) => attr(el, "data-cut"))
  expect(numbers).toEqual(["1", "2"])
  for (const { number, cut } of numberedCuts(DUMP)) {
    const a = holeCentre(COMPONENT, holeName(cut.a.row, cut.a.col))
    const b = holeCentre(COMPONENT, holeName(cut.b.row, cut.b.col))
    const centre = cutCentre(COMPONENT, number)
    expect(centre).toEqual({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
    const label = elements(COMPONENT, "text", "cut-number").find((el) => attr(el, "data-cut") === String(number))
    const box = elements(COMPONENT, "rect", "checkbox").find((el) => attr(el, "data-for") === `cut:${number}`)
    if (label === undefined || box === undefined) {
      throw new Error(`test: cut ${number} has no number or checkbox`)
    }
    expect(Math.abs(num(label, "x") - centre.x)).toBeLessThan(20)
    expect(Math.abs(num(label, "y") - centre.y)).toBeLessThan(20)
    expect(Math.abs(num(box, "x") - centre.x)).toBeLessThan(20)
    expect(Math.abs(num(box, "y") - centre.y)).toBeLessThan(20)
  }
})

test("a standing resistor is drawn round, and no part body is a checkbox-sized square", () => {
  const standing = elements(COMPONENT, "circle", "part-body").find((el) => {
    const r2 = holeCentre(COMPONENT, "A11")
    return num(el, "cx") === r2.x && num(el, "cy") === r2.y
  })
  expect(standing).toBeDefined()
  const rects = elements(COMPONENT, "rect", "part-body").map((el) => ({ w: num(el, "width"), h: num(el, "height") }))
  const polygons = elements(COMPONENT, "polygon", "part-body").map((el) => {
    const pts = attr(el, "points").split(" ").map((pair) => pair.split(",").map(Number))
    const xs = pts.map((p) => p[0] ?? 0)
    const ys = pts.map((p) => p[1] ?? 0)
    return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
  })
  for (const { w, h } of [...rects, ...polygons]) {
    const squareish = Math.max(w, h) / Math.min(w, h) < 1.5
    expect(squareish && Math.max(w, h) < 16).toBe(false)
  }
})

test("bridge numbers are printed in both views", () => {
  for (const svg of [COMPONENT, COPPER]) {
    expect(svg).toMatch(/<text [^>]*class="bridge-number"[^>]*>B1<\/text>/)
  }
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

function coordTexts(svg: string, content: string): string[] {
  return [...svg.matchAll(/<text [^>]*class="coord"[^>]*>([^<]*)<\/text>/g)]
    .filter((m) => m[1] === content)
    .map((m) => m[0])
}

test("the copper view's printed column numbers and row letters move with the holes they name", () => {
  for (const [view, svg] of [["component", COMPONENT], ["copper", COPPER]] as const) {
    const a1 = holeCentre(svg, "A1")
    const lastCol = holeCentre(svg, `A${DUMP.grid.cols}`)
    for (const el of coordTexts(svg, "1")) {
      expect({ view, x: num(el, "x") }).toEqual({ view, x: a1.x })
    }
    for (const el of coordTexts(svg, String(DUMP.grid.cols))) {
      expect({ view, x: num(el, "x") }).toEqual({ view, x: lastCol.x })
    }
    expect(coordTexts(svg, "1").length).toBe(2)
  }
  // Mirrored: column 1's number is printed at the right-hand end on the copper side.
  const [copperOne] = coordTexts(COPPER, "1")
  const [copperLast] = coordTexts(COPPER, String(DUMP.grid.cols))
  if (copperOne === undefined || copperLast === undefined) {
    throw new Error("test: no column numbers")
  }
  expect(num(copperOne, "x")).toBeGreaterThan(num(copperLast, "x"))
  // Rows are not mirrored for horizontal strips: A is still at the top.
  const [rowA] = coordTexts(COPPER, "A")
  if (rowA === undefined) {
    throw new Error("test: no row letter A")
  }
  expect(Number(attr(rowA, "y"))).toBeLessThan(holeCentre(COPPER, "B1").y)
})

/** A board with vertical strips: its cuts sever columns, between vertically adjacent holes. */
const VERTICAL = parseBoardDump(
  [
    "PART R1 RESISTOR 10K AT 2,3 SPAN 1",
    "NODE 1 NAME VCC R1.1",
    "NODE 2 NAME GND R1.2",
    "VERTICAL_STRIPS 1",
    "CUT_STATE COMPUTED",
    "CUT 6,2,1 7,2,2",
    "CUT 2,4,1 3,4,2",
    "SOLDER 4,6 4,7",
    "GRID 10 12",
    "PIN R1 1 AT 2,3",
    "PIN R1 2 AT 2,7",
    "",
  ].join("\n"),
)

test("with vertical strips the copper view mirrors rows instead of columns, cuts included", () => {
  const labels = new Map([["R1", "R1"]])
  const opts = (view: RenderOptions["view"]): RenderOptions => ({ view, title: "vertical", edgeLabels: [] })
  const component = renderLayout(VERTICAL, labels, opts("component"))
  const copper = renderLayout(VERTICAL, labels, opts("copper"))
  const lastRow = holeName(VERTICAL.grid.rows - 1, 0)
  expect(holeCentre(copper, "A1")).toEqual(holeCentre(component, lastRow))
  const top = holeCentre(component, "A1").y
  const bottom = holeCentre(component, lastRow).y
  for (const { number, cut } of numberedCuts(VERTICAL)) {
    expect(cut.a.col).toBe(cut.b.col)
    const c = cutCentre(component, number)
    const m = cutCentre(copper, number)
    expect(m.x).toBe(c.x)
    expect(m.y).toBeCloseTo(top + bottom - c.y, 6)
  }
  // Column strips are marked: 1, 5, 9 of 12, on the physical strips they name in both views.
  for (const svg of [component, copper]) {
    expect(markedStrips(svg)).toEqual(["1", "5", "9"])
    for (const el of elements(svg, "line", "strip marked-strip")) {
      const hole = holeCentre(svg, `A${attr(el, "data-strip")}`)
      expect([num(el, "x1"), num(el, "x2")]).toEqual([hole.x, hole.x])
    }
    expect(coordTexts(svg, "5").every(isBold)).toBe(true)
    expect(coordTexts(svg, "6").some(isBold)).toBe(false)
    expect(coordTexts(svg, "A").some(isBold)).toBe(false)
    expect(svg).toContain("every 4th strip (columns 1, 5, 9 ...), for alignment")
  }
})

test("an edge label's leader detours round another part's pin that stands between its hole and the edge", () => {
  // R2 moved so it stands on F11, right between C1's pin 2 (F10) and the right-hand edge.
  const pins = { ...DUMP.pins, R2: [{ pin: "1", row: 5, col: 10 }, { pin: "2", row: 6, col: 10 }] }
  const svg = renderLayout({ ...DUMP, pins }, LABELS, {
    view: "component",
    title: "detour",
    edgeLabels: [{ ref: "C1", pin: "2", text: "OUT" }],
  })
  const f11 = holeCentre(svg, "F11")
  const leaders = elements(svg, "line", "edge-leader")
  expect(leaders.length).toBe(2)
  for (const el of leaders) {
    const [x1, y1, x2, y2] = [num(el, "x1"), num(el, "y1"), num(el, "x2"), num(el, "y2")]
    const passesThrough = y1 === f11.y && y2 === f11.y && Math.min(x1, x2) <= f11.x && Math.max(x1, x2) >= f11.x
    expect(passesThrough).toBe(false)
  }
})

test("the copper view's summary counts only what it shows", () => {
  expect(COPPER).toContain(">2 cuts, 1 solder bridges<")
  expect(COPPER).not.toContain("wire links")
  expect(COMPONENT).toContain(">3 parts, 1 wire links, 2 cuts, 1 solder bridges<")
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

test("no colour other than black, white and the two strip greys appears", () => {
  for (const svg of [COMPONENT, COPPER]) {
    const colours = new Set([...svg.matchAll(/(?:fill|stroke|color)="([^"]*)"/g)].map((m) => m[1]))
    for (const colour of colours) {
      expect(["none", "#000000", "#ffffff", "#c8c8c8", "#999999"]).toContain(colour)
    }
    expect(svg).not.toMatch(/style=|rgb\(/)
  }
})

function markedStrips(svg: string): string[] {
  return elements(svg, "line", "strip marked-strip").map((el) => attr(el, "data-strip"))
}

function isBold(el: string): boolean {
  return /font-weight="bold"/.test(el)
}

test("every fourth row strip, from A, is marked in the darker grey with its letter bold at both ends, on both views", () => {
  for (const svg of [COMPONENT, COPPER]) {
    expect(markedStrips(svg)).toEqual(["A", "E", "I"])
    for (const el of elements(svg, "line", "strip marked-strip")) {
      expect(attr(el, "stroke")).toBe("#999999")
      // The marked line runs through the holes of the strip it names, mirrored or not.
      const hole = holeCentre(svg, `${attr(el, "data-strip")}1`)
      expect([num(el, "y1"), num(el, "y2")]).toEqual([hole.y, hole.y])
    }
    for (const el of elements(svg, "line", "strip")) {
      expect(attr(el, "stroke")).toBe("#c8c8c8")
    }
    for (const letter of ["A", "E", "I"]) {
      const coords = coordTexts(svg, letter)
      expect(coords.length).toBe(2)
      expect(coords.every(isBold)).toBe(true)
    }
    for (const letter of ["B", "C", "D", "J"]) {
      expect(coordTexts(svg, letter).some(isBold)).toBe(false)
    }
    // Column numbers are not strips on this board, so none is bold.
    expect(coordTexts(svg, "1").some(isBold)).toBe(false)
  }
  expect(COMPONENT).toContain("every 4th strip (rows A, E, I ...), for alignment")
  expect(COPPER).toContain("every 4th strip (rows A, E, I ...), for alignment")
})

test("an off-board connection is labelled at the nearest board edge", () => {
  expect(COMPONENT).toMatch(/<text [^>]*class="edge-label"[^>]*>IN<\/text>/)
})

test("text is XML-escaped", () => {
  const svg = renderLayout(DUMP, new Map([["R1", "a<b&c"], ["C1", "C1"], ["R2", "R2"]]), {
    view: "component",
    title: "x & y",
    edgeLabels: [{ ref: "R1", pin: "1", text: "<IN>" }],
  })
  expect(svg).toContain("a&lt;b&amp;c")
  expect(svg).toContain("x &amp; y")
  expect(svg).toContain("&lt;IN&gt;")
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
