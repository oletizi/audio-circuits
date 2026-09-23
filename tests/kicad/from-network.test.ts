import { test, expect } from "bun:test"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import { circuit, net } from "../../lib/model/index.ts"

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

test("two components mapping to the same designator refuse, naming both ids", () => {
  const network = circuit()
    .resistor("r1", "10K", { a: "IN", b: "MID" },
      { footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal" })
    .resistor("r2", "10K", { a: "MID", b: "GND" },
      { footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal" })
    .port("input", "IN").port("ground", "GND")
    .done()
  expect(() => toImportedNetlist(network, { r1: "R1", r2: "R1" }, PIN_NUMBERS)).toThrow(/r1.*r2.*R1/s)
})

test("a kind absent from PIN_NUMBERS with non-numeric pin names refuses, naming the kind and pin", () => {
  // `diode` has no PIN_NUMBERS entry here, and its canonical pin names
  // ("anode"/"cathode") are not themselves valid pin numbers - unlike `ic` and
  // `connector`, whose pins genuinely ARE numbers, which is why the fallback
  // exists at all. Falling through anyway would silently emit "anode" as a pin
  // NUMBER in the netlist.
  const network = circuit()
    .add({
      id: "d1", kind: "diode", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { anode: net("IN"), cathode: net("GND") } }],
      part: {
        mpn: "1N4148",
        footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal",
      },
    })
    .port("input", "IN").port("ground", "GND")
    .done()
  expect(() => toImportedNetlist(network, { d1: "D1" }, PIN_NUMBERS))
    .toThrow(/d1.*diode.*anode.*PIN_NUMBERS\["diode"\]/s)
})

test("ic and connector pins, which genuinely are numbers, still lower with no PIN_NUMBERS entry", () => {
  const network = circuit()
    .ic("u1", { "1": "IN", "2": "GND" }, { mpn: "PT2399", footprint: "Package_DIP:DIP-16_W7.62mm" })
    .connector("j1", { "1": "IN", "2": "GND" },
      { symbol: "Connector_Generic:Conn_01x02",
        footprint: "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical" })
    .port("input", "IN").port("ground", "GND")
    .done()
  const result = toImportedNetlist(network, { u1: "U1", j1: "J1" }, {})
  expect([...(result.nets["IN"] ?? [])].sort()).toEqual(["J1.1", "U1.1"])
  expect([...(result.nets["GND"] ?? [])].sort()).toEqual(["J1.2", "U1.2"])
})

test("package pins are lowered too, not only unit pins", () => {
  // Every builder shorthand sets `pins: {}`, so package pins arrive only via
  // `.add()`/`.include()` - exactly the path a multi-unit op-amp's `v+`/`v-`
  // supply pins take. `asDesignatorNets` in
  // tests/circuits/pt2399-core.test.ts proves this for a TEST-LOCAL copy of
  // this walk; this proves it for the shipping `toImportedNetlist` itself.
  const network = circuit()
    .add({
      id: "amp", kind: "opamp", parameters: {},
      pins: { "v+": net("VCC"), "v-": net("VEE") },
      units: [{ name: "A", pins: { "in+": net("IN"), "in-": net("FB"), out: net("FB") } }],
      part: { mpn: "TL072", footprint: "Package_DIP:DIP-8_W7.62mm" },
    })
    .port("input", "IN").port("vcc", "VCC").port("vee", "VEE")
    .done()

  const pinNumbers = { opamp: { "v+": "8", "v-": "4", "in+": "3", "in-": "2", out: "1" } }
  const result = toImportedNetlist(network, { amp: "U9" }, pinNumbers)
  expect(result.nets["VCC"]).toEqual(["U9.8"])
  expect(result.nets["VEE"]).toEqual(["U9.4"])
})

test("an nc pin is skipped rather than lowered to a net literally named \"undefined\"", () => {
  const network = circuit()
    .add({
      id: "r1", kind: "resistor", parameters: { ohms: 10000 }, pins: {},
      units: [{ name: "MAIN", pins: { a: net("IN"), b: { kind: "nc" } } }],
      part: { footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal" },
    })
    .port("input", "IN")
    .done()
  const result = toImportedNetlist(network, { r1: "R1" }, PIN_NUMBERS)
  expect(result.nets["undefined"]).toBeUndefined()
  expect(result.nets["IN"]).toEqual(["R1.1"])
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
