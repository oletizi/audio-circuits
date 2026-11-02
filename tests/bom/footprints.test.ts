import { test, expect } from "bun:test"
import { net, type Component } from "../../lib/model/types.ts"
import { physicalFor } from "../../tools/bom/footprints.ts"

function resistor(id: string): Component {
  return { id, kind: "resistor", parameters: { ohms: 100 }, pins: {}, units: [{ name: "MAIN", pins: {} }] }
}

function bjt(id: string): Component {
  return {
    id, kind: "bjt", parameters: {},
    part: { mpn: "2N3904", footprint: "Package_TO_SOT_THT:TO-92_Inline" },
    pins: {},
    units: [{ name: "MAIN", pins: { emitter: net("E"), base: net("B"), collector: net("C") } }],
  }
}

const BJT_PIN_NUMBERS = { bjt: { emitter: "1", base: "2", collector: "3" } }

test("an axial resistor footprint parses its lead spacing", () => {
  const physical = physicalFor(
    "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal",
    resistor("r1"),
    {},
  )
  expect(physical).toEqual({ kind: "axial-resistor", body: "0207", leadSpacingMm: 10.16 })
})

test("a radial electrolytic footprint parses its body diameter and lead spacing", () => {
  const physical = physicalFor("Capacitor_THT:CP_Radial_D5.0mm_P2.00mm", resistor("c1"), {})
  expect(physical).toEqual({ kind: "radial-electrolytic", maxDiameterMm: 5.0, leadSpacingMm: 2.0 })
})

/**
 * The `C_Disc` family: the dimensions are read off the footprint FILE, not written from
 * memory. `/Applications/KiCad/.../Capacitor_THT.pretty/C_Disc_D5.0mm_W2.5mm_P2.50mm.kicad_mod`
 * (version 20260206) has `descr "... pin pitch=2.50mm, diameter*width=5*2.5mm^2 ..."` and
 * pads 1 and 2 at x 0 and x 2.5. So D is the diameter and P is the pitch, and the W
 * dimension deliberately becomes nothing: `Specs` has no field for a body thickness, so
 * there is nothing to compare it with and nothing is invented to pretend otherwise.
 */
test("a C_Disc capacitor footprint parses its body diameter and lead spacing", () => {
  const physical = physicalFor("Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm", resistor("c1"), {})
  expect(physical).toEqual({ kind: "disc-capacitor", maxDiameterMm: 5.0, leadSpacingMm: 2.5 })
})

test("a C_Disc footprint is not confused with the polarised CP_Radial family", () => {
  expect(physicalFor("Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm", resistor("c1"), {}).kind)
    .toBe("disc-capacitor")
  expect(physicalFor("Capacitor_THT:CP_Radial_D5.0mm_P2.50mm", resistor("c2"), {}).kind)
    .toBe("radial-electrolytic")
})

test("a TO-92 footprint takes its pin order from PIN_NUMBERS.bjt, sorted by pin number", () => {
  const physical = physicalFor("Package_TO_SOT_THT:TO-92_Inline", bjt("q1"), BJT_PIN_NUMBERS)
  expect(physical).toEqual({ kind: "to92", pinOrder: ["emitter", "base", "collector"] })
})

test("a TO-92 footprint with no PIN_NUMBERS.bjt throws naming the fix", () => {
  expect(() => physicalFor("Package_TO_SOT_THT:TO-92_Inline", bjt("q1"), {})).toThrow(
    /PIN_NUMBERS\["bjt"\]/,
  )
})

test("a trimmer footprint is recognised", () => {
  const physical = physicalFor(
    "Potentiometer_THT:Potentiometer_Runtron_RM-065_Vertical",
    resistor("rv1"),
    {},
  )
  expect(physical).toEqual({ kind: "trimmer", package: "RM-065" })
})

test("a pin header footprint parses its pin count", () => {
  const physical = physicalFor(
    "Connector_PinHeader_2.54mm:PinHeader_1x03_P2.54mm_Vertical",
    resistor("j1"),
    {},
  )
  expect(physical).toEqual({ kind: "pin-header", pins: 3, pitchMm: 2.54 })
})

test("an unrecognised footprint throws, naming it", () => {
  // A REAL footprint that this module does not recognise, not an invented one.
  // It named a bare C_0805 until tests/kicad/footprint-names.test.ts swept for
  // names the libraries do not hold; the library spells it
  // C_0805_2012Metric, verified against Capacitor_SMD.pretty on disk. An
  // unrecognised-footprint test needs a footprint the module cannot classify,
  // which a real SMD name satisfies, so nothing was gained by inventing one.
  expect(() => physicalFor("Capacitor_SMD:C_0805_2012Metric", resistor("c9"), {}))
    .toThrow(/Capacitor_SMD:C_0805/)
})
