import { test, expect } from "bun:test"
import { writeSchematicStub } from "../../lib/kicad/schematic.ts"
import type { SchematicStubInput } from "../../lib/kicad/schematic.ts"
import { parseSexpr, children, child, attr } from "../../lib/kicad/sexpr.ts"
import type { SNode } from "../../lib/kicad/sexpr.ts"
import { circuit, NC } from "../../lib/model/index.ts"
import type { Network } from "../../lib/model/index.ts"

function counter(): () => string {
  let n = 0
  return () => `00000000-0000-4000-8000-${String(n++).padStart(12, "0")}`
}

const RESISTOR = {
  footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal",
  symbol: "Device:R",
}
const HEADER = {
  footprint: "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical",
  symbol: "Connector_Generic:Conn_01x02",
  electricallyInert: true,
}

function input(network: Network, designators: Record<string, string>): SchematicStubInput {
  return {
    network, designators,
    pinNumbers: { resistor: { a: "1", b: "2" } },
    notes: ["BENCH NOTE", "second line"],
    projectName: "tiny",
    newUuid: counter(),
  }
}

const tiny = (): Network => circuit()
  .resistor("load", "1k", { a: "A", b: "B" }, RESISTOR)
  .connector("header", { "1": "A", "2": "B" }, HEADER)
  .done()

function property(symbol: SNode, key: string): string | undefined {
  return children(symbol, "property").find((p) => p.atoms[0] === key)?.atoms[1]
}

test("the stub embeds each symbol once and places one instance per part", () => {
  const root = parseSexpr(writeSchematicStub(input(tiny(), { load: "R1", header: "J1" })))
  expect(root.name).toBe("kicad_sch")
  const libSymbols = child(root, "lib_symbols")
  if (libSymbols === undefined) throw new Error("no lib_symbols")
  expect(children(libSymbols, "symbol").map((s) => s.atoms[0]).sort())
    .toEqual(["Connector_Generic:Conn_01x02", "Device:R"])

  const placed = children(root, "symbol")
  expect(placed.map((s) => property(s, "Reference")).sort()).toEqual(["J1", "R1"])
  const r1 = placed.find((s) => property(s, "Reference") === "R1")
  if (r1 === undefined) throw new Error("no R1")
  expect(attr(r1, "lib_id")).toBe("Device:R")
  expect(property(r1, "Value")).toBe("1K")
  expect(property(r1, "Footprint")).toBe(RESISTOR.footprint)
})

test("every pin is carried to a net label, and nothing else connects", () => {
  const root = parseSexpr(writeSchematicStub(input(tiny(), { load: "R1", header: "J1" })))
  expect(children(root, "label").map((l) => l.atoms[0]).sort()).toEqual(["A", "A", "B", "B"])
  expect(children(root, "wire").length).toBe(4)
})

test("the notes become one text block, with KiCad's \\n line escape", () => {
  // Asserted on the raw text: parseSexpr's reader keeps the character after a
  // backslash and drops the backslash, so it cannot show the escape.
  const text = writeSchematicStub(input(tiny(), { load: "R1", header: "J1" }))
  expect(children(parseSexpr(text), "text").length).toBe(1)
  expect(text).toContain('(text "BENCH NOTE\\nsecond line"')
})

test("a deliberately unconnected pin gets a no-connect flag, not a label", () => {
  const network = circuit()
    .resistor("load", "1k", { a: "A", b: "B" }, RESISTOR)
    .connector("header", { "1": "A", "2": NC }, HEADER)
    .connector("other", { "1": "B", "2": "A" }, HEADER)
    .done()
  const root = parseSexpr(writeSchematicStub(
    input(network, { load: "R1", header: "J1", other: "J2" })))
  expect(children(root, "no_connect").length).toBe(1)
  expect(children(root, "label").length).toBe(5)
})

test("parts are placed in the network's declaration order, not sorted by designator", () => {
  // "header" (designator J1) is declared AFTER "load" (designator R2) here -
  // alphabetically R2 sorts after J1, so a designator sort would still place
  // load first by coincidence. Add a third part whose designator sorts before
  // both, but which is declared last, to pin the order down unambiguously:
  // grouping a leg's jumper/floor/trim together (spec §4.3) only survives if
  // placement follows declaration order, not a designator sort.
  const network = circuit()
    .connector("header", { "1": "A", "2": "B" }, HEADER)
    .resistor("load", "1k", { a: "A", b: "B" }, RESISTOR)
    .resistor("first_by_designator", "1k", { a: "B", b: "A" }, RESISTOR)
    .done()
  const text = writeSchematicStub(input(
    network, { header: "J1", load: "R2", first_by_designator: "R1" },
  ))
  const at = (designator: string): number => text.indexOf(`(property "Reference" "${designator}"`)
  expect(at("J1")).toBeGreaterThan(-1)
  expect(at("R2")).toBeGreaterThan(-1)
  expect(at("R1")).toBeGreaterThan(-1)
  expect(at("J1")).toBeLessThan(at("R2"))
  expect(at("R2")).toBeLessThan(at("R1"))
})

test("a part with no symbol, or a symbol pin the circuit leaves unmentioned, refuses", () => {
  // validateNetwork refuses a single-member net that is not a declared port, so
  // each fixture below adds a "filler" resistor purely to give every net a
  // second member; it plays no other part in what is being asserted.
  const noSymbol = circuit()
    .resistor("load", "1k", { a: "A", b: "B" }, { footprint: RESISTOR.footprint })
    .resistor("filler", "1k", { a: "B", b: "A" }, RESISTOR)
    .done()
  expect(() => writeSchematicStub(input(noSymbol, { load: "R1", filler: "R2" })))
    .toThrow(/part\.symbol/)

  const halfHeader = circuit()
    .resistor("load", "1k", { a: "A", b: "B" }, RESISTOR)
    .resistor("filler", "1k", { a: "B", b: "A" }, RESISTOR)
    .connector("header", { "1": "A" }, HEADER)
    .done()
  expect(() => writeSchematicStub(input(halfHeader, { load: "R1", filler: "R2", header: "J1" })))
    .toThrow(/pin 2.*not connected/s)
})
