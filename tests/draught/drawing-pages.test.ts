// Design change C3, Step 1: the composition-driven pieces of multi-page drawing, without drafting.
// `drawingPagesFromNetwork` (one intent per block), `assemble-root` (the root sheet's op-list from
// `Network.blocks`) and `hierarchical-labels` (each block sheet's labels turned into the boundary).
// The fixture is tests/fixtures/two-block-board/, two dividers sharing 3V3 and GND, each with a
// private FB.
import { expect, test } from "bun:test"
import { circuit } from "../../lib/model/index.ts"
import type { Network, PartSpec } from "../../lib/model/index.ts"
import { blankRootSheet, ROOT_PIN_PITCH_MIL, ROOT_STUB_MIL, rootSheetOps } from "../../tools/draught/assemble-root.ts"
import { drawingPagesFromNetwork, type DrawingPage } from "../../tools/draught/drawing-pages.ts"
import { blockSheetLabelProblems, hierarchicalLabelOps, sheetLabels } from "../../tools/draught/hierarchical-labels.ts"
import { DESIGNATORS, drawingPages, PAGE_GROUPS, PIN_NUMBERS, twoBlockBoard } from "../fixtures/two-block-board/two-block-board.ts"

const R: PartSpec = { symbol: "Device:R" }

function page(block: string): DrawingPage {
  const found = drawingPages().find((p) => p.block === block)
  if (found === undefined) throw new Error(`the fixture has no page for block ${block}`)
  return found
}

// --- drawingPagesFromNetwork ---

test("the two-block fixture lowers to one page per block, every component on exactly one", () => {
  const pages = drawingPages()
  expect(pages.map((p) => p.block)).toEqual(["a", "b"])
  const refs = pages.flatMap((p) => p.intent.parts.map((part) => part.ref)).sort()
  expect(refs).toEqual(Object.values(DESIGNATORS).sort())
  expect(page("a").intent.parts.map((p) => p.ref)).toEqual(["R1", "R2", "C1"])
  expect(page("b").intent.parts.map((p) => p.ref)).toEqual(["R3", "R4", "C2"])
  expect(page("a").intent.parts.every((p) => p.group === "divider a")).toBe(true)
})

test("a page's port nets are marked: port name, parent net, the block's pins, and whether copperhead drafts them", () => {
  expect(page("a").ports).toEqual([
    { name: "3V3", net: "3V3", pins: ["R1.1"], drafted: false },
    { name: "GND", net: "GND", pins: ["C1.2", "R2.2"], drafted: true },
  ])
  expect(page("b").ports).toEqual([
    { name: "3V3", net: "3V3", pins: ["R3.1"], drafted: false },
    { name: "GND", net: "GND", pins: ["C2.2", "R4.2"], drafted: true },
  ])
})

test("a private net is named by its UNPREFIXED model name, so both pages carry the same text FB", () => {
  // The model names them a_FB and b_FB; the page names each FB. The positive control in
  // tests/circuits/two-block-project.test.ts depends on this: two local labels of one text on two
  // sheets must stay two nets.
  expect(page("a").intent.nets).toEqual([
    { name: "FB", kind: "signal", pins: ["C1.1", "R1.2", "R2.1"] },
    { name: "GND", kind: "signal", pins: ["C1.2", "R2.2"] },
  ])
  expect(page("b").intent.nets.map((n) => n.name)).toEqual(["FB", "GND"])
  const modelNets = new Set(twoBlockBoard().components.flatMap((c) => c.units.flatMap((u) => Object.values(u.pins))).flatMap((c) => (c.kind === "net" ? [c.net] : [])))
  expect([...modelNets].sort()).toEqual(["3V3", "GND", "a_FB", "b_FB"])
})

test("every net on a page is drawn as a signal, so copperhead draws no power symbol, which would join sheets by name", () => {
  for (const p of drawingPages()) for (const net of p.intent.nets) expect(net.kind).toBe("signal")
})

function blockOfOne(): Network {
  return circuit().resistor("r", "1k", { a: "IN", b: "OUT" }, R).port("IN", "IN").port("OUT", "OUT").done()
}

test("a network with no blocks refuses: it is a one-page board", () => {
  const flat = circuit().resistor("r", "1k", { a: "X", b: "Y" }, R).port("x", "X").port("y", "Y").done()
  expect(() => drawingPagesFromNetwork(flat, { r: "R1" }, PIN_NUMBERS, {})).toThrow(/no blocks/)
})

test("a block with no caption, or a caption for no block, refuses", () => {
  expect(() => drawingPagesFromNetwork(twoBlockBoard(), DESIGNATORS, PIN_NUMBERS, { a: "divider a" })).toThrow(/"b"/)
  expect(() => drawingPagesFromNetwork(twoBlockBoard(), DESIGNATORS, PIN_NUMBERS, { ...PAGE_GROUPS, c: "x" })).toThrow(/"c"/)
})

test("a component outside every block refuses: a multi-page board's root holds no parts", () => {
  const net = circuit().include("a", blockOfOne(), { IN: "IN", OUT: "OUT" }).resistor("loose", "1k", { a: "IN", b: "OUT" }, R).done()
  expect(() => drawingPagesFromNetwork(net, { a_r: "R1", loose: "R2" }, PIN_NUMBERS, { a: "a" })).toThrow(/loose/)
})

test("two ports of one block bound to one parent net refuse: the sheet would carry two names for one net", () => {
  const net = circuit().include("a", blockOfOne(), { IN: "N", OUT: "N" }).done()
  expect(() => drawingPagesFromNetwork(net, { a_r: "R1" }, PIN_NUMBERS, { a: "a" })).toThrow(/both bound to/)
})

test("a private net whose page text equals a port name refuses: the two would join on the sheet", () => {
  const block = circuit()
    .resistor("r1", "1k", { a: "IN", b: "X" }, R)
    .resistor("r2", "1k", { a: "X", b: "IN2" }, R)
    .port("X_PORT", "IN").port("IN2", "IN2").done()
  // the private net X is drawn as "X"; renaming the port to "X" makes them collide
  const colliding = circuit()
    .resistor("r1", "1k", { a: "IN", b: "X" }, R)
    .resistor("r2", "1k", { a: "X", b: "IN2" }, R)
    .port("X", "IN").port("IN2", "IN2").done()
  const ok = circuit().include("a", block, { X_PORT: "P", IN2: "Q" }).port("p", "P").port("q", "Q").done()
  expect(drawingPagesFromNetwork(ok, { a_r1: "R1", a_r2: "R2" }, PIN_NUMBERS, { a: "a" })).toHaveLength(1)
  const bad = circuit().include("a", colliding, { X: "P", IN2: "Q" }).port("p", "P").port("q", "Q").done()
  expect(() => drawingPagesFromNetwork(bad, { a_r1: "R1", a_r2: "R2" }, PIN_NUMBERS, { a: "a" })).toThrow(/collide|port/)
})

// --- assemble-root ---

type Op = Readonly<Record<string, unknown>>

function opsOf(kind: string, ops: readonly Op[]): Op[] {
  return ops.filter((op) => op["op"] === kind)
}

test("the root op-list holds one add_sheet per block, one sheet pin per port, each wired to its parent net", () => {
  const list = rootSheetOps(twoBlockBoard(), "two-block-board")
  expect(list.protocol_version).toBe(2)
  expect(list.target_format).toBe("kicad")
  expect(list.target_file).toBe("two-block-board.kicad_sch")
  const sheets = opsOf("add_sheet", list.ops)
  expect(sheets.map((s) => [s["name"], s["file"]])).toEqual([["a", "a.kicad_sch"], ["b", "b.kicad_sch"]])
  for (const sheet of sheets) {
    const pins = sheet["pins"]
    if (!Array.isArray(pins)) throw new Error("add_sheet carries no pins array")
    expect(pins.map((p: Readonly<Record<string, unknown>>) => p["name"])).toEqual(["3V3", "GND"])
  }
  const wires = opsOf("add_wire", list.ops)
  const labels = opsOf("add_net_label", list.ops)
  expect(wires).toHaveLength(4)
  expect(labels).toHaveLength(4)
  // Each sheet pin's edge point starts a wire whose far end carries the parent net's local label.
  for (const sheet of sheets) {
    const at = sheet["at"]
    const pins = sheet["pins"]
    if (!Array.isArray(at) || !Array.isArray(pins)) throw new Error("add_sheet shape")
    pins.forEach((pin: Readonly<Record<string, unknown>>, index: number) => {
      const x = Number(at[0])
      const y = Number(at[1]) + (index + 1) * ROOT_PIN_PITCH_MIL
      expect(pin["offset_mil"]).toBe((index + 1) * ROOT_PIN_PITCH_MIL)
      const wire = wires.find((w) => JSON.stringify(w["vertices"]) === JSON.stringify([[x, y], [x - ROOT_STUB_MIL, y]]))
      expect(wire, `a wire from ${sheet["name"]}'s ${String(pin["name"])} pin`).toBeDefined()
      const label = labels.find((l) => JSON.stringify(l["at"]) === JSON.stringify([x - ROOT_STUB_MIL, y]))
      expect(label?.["name"]).toBe(pin["name"])
      expect(label?.["scope"]).toBe("local")
    })
  }
})

test("the root sheet's starting text is deterministic, on US Letter, and differs by board", () => {
  const one = blankRootSheet("two-block-board")
  expect(blankRootSheet("two-block-board")).toBe(one)
  expect(one).toContain('(paper "USLetter")')
  expect(blankRootSheet("other-board")).not.toBe(one)
})

test("a root sheet pin is named by the PORT and its label by the PARENT net, which may differ", () => {
  const net = circuit().include("a", blockOfOne(), { IN: "SIG_IN", OUT: "SIG_OUT" }).port("in", "SIG_IN").port("out", "SIG_OUT").done()
  const list = rootSheetOps(net, "x")
  const sheet = opsOf("add_sheet", list.ops)[0]
  const pins = sheet?.["pins"]
  if (!Array.isArray(pins)) throw new Error("add_sheet carries no pins array")
  expect(pins.map((p: Readonly<Record<string, unknown>>) => p["name"])).toEqual(["IN", "OUT"])
  expect(opsOf("add_net_label", list.ops).map((l) => l["name"])).toEqual(["SIG_IN", "SIG_OUT"])
})

// --- hierarchical-labels ---

/** A block sheet as copperhead writes its labels: a local GND, a global FB and an unrelated local. */
const SHEET = [
  "(kicad_sch",
  '\t(label "GND" (at 114.3 67.31 0)',
  "\t\t(effects (font (size 1.27 1.27)) (justify left bottom))",
  '\t\t(uuid "00000000-0000-0000-0000-000000000001")',
  "\t)",
  '\t(global_label "FB" (shape passive) (at 101.6 54.61 90)',
  "\t\t(effects (font (size 1.27 1.27)) (justify left))",
  '\t\t(uuid "00000000-0000-0000-0000-000000000002")',
  "\t)",
  ")",
].join("\n")

test("the sheet's top-level labels are read with kind, text, position in mil, rotation and uuid", () => {
  expect(sheetLabels(SHEET)).toEqual([
    { kind: "label", text: "GND", xMil: 4500, yMil: 2650, rotation: 0, uuid: "00000000-0000-0000-0000-000000000001" },
    { kind: "global_label", text: "FB", xMil: 4000, yMil: 2150, rotation: 90, uuid: "00000000-0000-0000-0000-000000000002" },
  ])
})

test("each port net loses copperhead's labels and gains one hierarchical label; a global on a private net turns local", () => {
  const list = hierarchicalLabelOps(SHEET, page("a"), "a.kicad_sch")
  expect(list.target_file).toBe("a.kicad_sch")
  expect(list.ops).toEqual([
    // 3V3: copperhead drew no label (a one-pin net it could not draft), so it goes on the pin
    { op: "add_net_label", name: "3V3", at: "R1.1", scope: "hierarchical" },
    // GND: copperhead's local label, replaced in place
    { op: "delete_object", uuid: "00000000-0000-0000-0000-000000000001" },
    { op: "add_net_label", name: "GND", at: [4500, 2650], scope: "hierarchical", rotation: 0 },
    // FB is private: its global label would join every sheet's FB by name
    { op: "delete_object", uuid: "00000000-0000-0000-0000-000000000002" },
    { op: "add_net_label", name: "FB", at: [4000, 2150], scope: "local", rotation: 90 },
  ])
})

test("a port net copperhead labelled more than once keeps one hierarchical label and local labels for the rest", () => {
  const twice = SHEET.replace(
    ")\n)",
    ')\n\t(global_label "GND" (shape passive) (at 50.8 50.8 180)\n\t\t(uuid "00000000-0000-0000-0000-000000000003")\n\t)\n)',
  )
  expect(twice).not.toBe(SHEET)
  const ops = hierarchicalLabelOps(twice, page("a"), "a.kicad_sch").ops
  const gnd = ops.filter((op) => op["name"] === "GND")
  expect(gnd).toEqual([
    { op: "add_net_label", name: "GND", at: [4500, 2650], scope: "hierarchical", rotation: 0 },
    { op: "add_net_label", name: "GND", at: [2000, 2000], scope: "local", rotation: 180 },
  ])
  expect(ops.filter((op) => op["op"] === "delete_object")).toHaveLength(3)
})

test("a sheet that already carries a hierarchical label refuses: it has been through this step", () => {
  const done = SHEET.replace("(label \"GND\"", "(hierarchical_label \"GND\" (shape input)")
  expect(() => hierarchicalLabelOps(done, page("a"), "a.kicad_sch")).toThrow(/hierarchical/)
})

test("the post-condition: one hierarchical label per port, no global label, and nothing else is reported", () => {
  const good = [
    "(kicad_sch",
    '\t(hierarchical_label "3V3" (shape input) (at 1 1 0) (uuid "h1"))',
    '\t(hierarchical_label "GND" (shape input) (at 2 2 0) (uuid "h2"))',
    '\t(label "FB" (at 3 3 0) (uuid "l1"))',
    ")",
  ].join("\n")
  expect(blockSheetLabelProblems(good, page("a"))).toEqual([])
  // the control: copperhead's untouched sheet fails it on every count
  const problems = blockSheetLabelProblems(SHEET, page("a"))
  expect(problems).toContain('port "3V3" has 0 hierarchical labels, expected exactly 1')
  expect(problems).toContain('port "GND" has 0 hierarchical labels, expected exactly 1')
  expect(problems).toContain('global label "FB" remains; a global label joins every sheet by name')
})
