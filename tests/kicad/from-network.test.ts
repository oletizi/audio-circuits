import { test, expect } from "bun:test"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import { circuit } from "../../lib/model/index.ts"

const DESIGNATORS = { r1: "R1", c1: "C1" }
const PIN_NUMBERS = { resistor: { a: "1", b: "2" }, capacitor: { a: "1", b: "2" } }

function twoPart() {
  return circuit()
    .resistor("r1", "10K", { a: "IN", b: "MID" },
      { footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal" })
    .capacitor("c1", ".1uF", { a: "MID", b: "GND" },
      { footprint: "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm" })
    .port("input", "IN").port("ground", "GND")
    .done()
}

test("lowers components to designator, value and import string", () => {
  const result = toImportedNetlist(twoPart(), DESIGNATORS, PIN_NUMBERS)
  expect(result.components).toEqual([
    { designator: "R1", value: "10K", footprint: "RESISTOR4" },
    { designator: "C1", value: ".1uF", footprint: "CAP_CERAMIC1" },
  ])
})

test("collects nets as sorted designator.pin members", () => {
  const result = toImportedNetlist(twoPart(), DESIGNATORS, PIN_NUMBERS)
  expect(result.nets).toEqual({ IN: ["R1.1"], MID: ["C1.1", "R1.2"], GND: ["C1.2"] })
})

test("an unmapped component refuses rather than emitting a nameless part", () => {
  expect(() => toImportedNetlist(twoPart(), { r1: "R1" }, PIN_NUMBERS)).toThrow(/c1/)
})

test("a component with no footprint refuses", () => {
  const network = circuit()
    .resistor("r1", "10K", { a: "IN", b: "GND" })
    .port("input", "IN").port("ground", "GND")
    .done()
  expect(() => toImportedNetlist(network, DESIGNATORS, PIN_NUMBERS)).toThrow(/r1.*footprint/s)
})

test("a pin count beyond the import string's declared count refuses", () => {
  const network = circuit()
    .connector("header", { "1": "A", "2": "B", "3": "C" },
      { symbol: "Connector_Generic:Conn_01x02",
        footprint: "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical" })
    .port("a", "A").port("b", "B").port("c", "C")
    .done()
  expect(() => toImportedNetlist(network, { header: "J1" }, PIN_NUMBERS))
    .toThrow(/J1.*SIP2.*declares only 2/s)
})
