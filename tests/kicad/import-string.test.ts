import { test, expect } from "bun:test"
import { importStringFor, declaredPinCount } from "../../lib/kicad/import-string.ts"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { importLegacyNetlist } from "../../lib/kicad/legacy-netlist.ts"

test("derives the five proven families", () => {
  expect(importStringFor("Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal"))
    .toBe("RESISTOR4")
  expect(importStringFor("Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm")).toBe("CAP_CERAMIC1")
  expect(importStringFor("Capacitor_THT:CP_Radial_D5.0mm_P2.50mm")).toBe("CAP_ELECTRO_200")
  expect(importStringFor("Capacitor_THT:CP_Radial_D6.3mm_P2.50mm")).toBe("CAP_ELECTRO_250")
  expect(importStringFor("Capacitor_THT:CP_Radial_D8.0mm_P3.50mm")).toBe("CAP_ELECTRO_300")
  expect(importStringFor("Package_DIP:DIP-16_W7.62mm")).toBe("DIP16")
  expect(importStringFor("Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical"))
    .toBe("SIP5")
})

test("an 8.0mm body rounds DOWN to the nearest enumerated diameter", () => {
  // 314.96 mil. The enumerated set has no 350, so this is nearest-member
  // selection over an uneven ladder, not rounding to 50 mil.
  expect(importStringFor("Capacitor_THT:CP_Radial_D8.0mm_P3.50mm")).toBe("CAP_ELECTRO_300")
})

test("rounded-metric names for imperial parts are inside the pitch tolerance", () => {
  // P2.50mm is a nominal 0.1in part, 0.04mm from the grid.
  expect(importStringFor("Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm")).toBe("CAP_CERAMIC1")
  // P7.50mm is a nominal 0.3in part, 0.12mm from the grid.
  expect(importStringFor("Capacitor_THT:C_Disc_D9.0mm_W2.5mm_P7.50mm")).toBe("CAP_CERAMIC3")
})

test("an off-grid pitch refuses, naming the measurement", () => {
  expect(() => importStringFor("Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P9.40mm"))
    .toThrow(/9\.4.*2\.54.*0\.15/s)
})

test("a diameter equidistant between two enumerated types refuses", () => {
  // 8.89mm is 350.00000000000006 mil - the midpoint of the 300/400 gap, which
  // float error resolves in favour of 400 by 1.2e-13. Ambiguity is therefore
  // detected as a band, and this asserts the band is actually reachable.
  expect(() => importStringFor("Capacitor_THT:CP_Radial_D8.89mm_P3.50mm"))
    .toThrow(/equidistant.*CAP_ELECTRO_300.*CAP_ELECTRO_400/s)
})

test("a diameter outside the enumerated range refuses", () => {
  expect(() => importStringFor("Capacitor_THT:CP_Radial_D3.0mm_P2.00mm")).toThrow(/175.*650/s)
  expect(() => importStringFor("Capacitor_THT:CP_Radial_D20.0mm_P7.50mm")).toThrow(/175.*650/s)
})

test("an unrecognized family refuses, listing the shapes that derive", () => {
  expect(() => importStringFor("Package_TO_SOT_THT:TO-92_Inline"))
    .toThrow(/TO-92_Inline[\s\S]*R_Axial[\s\S]*PinHeader_1x/)
})

test("an override wins over the derivation", () => {
  const overrides = new Map([["Package_DIP:DIP-16_W7.62mm", "DIP16"]])
  expect(importStringFor("Package_DIP:DIP-16_W7.62mm", overrides)).toBe("DIP16")
})

test("pin-count types report their count; span types do not", () => {
  expect(declaredPinCount("DIP16")).toBe(16)
  expect(declaredPinCount("SIP5")).toBe(5)
  expect(declaredPinCount("RESISTOR4")).toBeNull()
  expect(declaredPinCount("CAP_ELECTRO_200")).toBeNull()
})

test("every part of the built board derives the import string that board used", async () => {
  const modern = importNetlist(await Bun.file("tests/fixtures/pt2399-core.net").text())
  const legacy = importLegacyNetlist(
    await Bun.file("tests/fixtures/pt2399-core-veroroute.net").text(),
  )
  const used = new Map(legacy.components.map((c) => [c.designator, c.footprint]))

  expect(modern.components.length).toBe(24)
  for (const component of modern.components) {
    const footprint = component.footprint
    if (footprint === undefined) throw new Error(`${component.designator} has no footprint`)
    const expected = used.get(component.designator)
    if (expected === undefined) {
      throw new Error(`${component.designator} has no recorded import string in the legacy netlist`)
    }
    expect(importStringFor(footprint)).toBe(expected)
  }
})
