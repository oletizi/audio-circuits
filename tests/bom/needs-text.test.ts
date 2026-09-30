import { test, expect } from "bun:test"
import { needsText } from "../../tools/bom/needs-text.ts"
import type { BomLine } from "../../tools/bom/types.ts"

function line(overrides: Partial<BomLine> & Pick<BomLine, "kind" | "physical">): BomLine {
  return { key: "k", placement: "on-board", designators: ["X1"], quantity: 1, ...overrides }
}

test("axial resistor: value, body, lead spacing and power rating", () => {
  expect(needsText(line({
    kind: "resistor", ohms: 100_000, minWatts: 0.25,
    physical: { kind: "axial-resistor", body: "0207", leadSpacingMm: 10.16 },
  }))).toBe("100K, 0207 axial, 10.16 mm leads, min 0.25 W")
})

test("a derived power rating is shown to three significant figures", () => {
  expect(needsText(line({
    kind: "resistor", ohms: 22, minWatts: 0.51234,
    physical: { kind: "axial-resistor", body: "0207", leadSpacingMm: 10.16 },
  }))).toBe("22R, 0207 axial, 10.16 mm leads, min 0.512 W")
})

test("radial electrolytic: value, maximum diameter, lead spacing and voltage rating", () => {
  expect(needsText(line({
    kind: "capacitor", farads: 10e-6, minVolts: 35,
    physical: { kind: "radial-electrolytic", maxDiameterMm: 6.3, leadSpacingMm: 2.5 },
  }))).toBe("10uF, radial, <= 6.3 mm dia, 2.5 mm leads, min 35 V")
})

test("TO-92: the named part and its pin order as letters", () => {
  expect(needsText(line({
    kind: "bjt", partType: "2N3904",
    physical: { kind: "to92", pinOrder: ["emitter", "base", "collector"] },
  }))).toBe("2N3904, TO-92, E-B-C")
})

test("trimmer: value, taper and package", () => {
  expect(needsText(line({
    kind: "potentiometer", ohms: 200_000, taper: "linear",
    physical: { kind: "trimmer", package: "RM-065" },
  }))).toBe("200K, linear, RM-065 trimmer")
})

test("a part number the physical text already states is not repeated", () => {
  expect(needsText(line({
    kind: "potentiometer", ohms: 1_000, taper: "linear", partType: "RM-065",
    physical: { kind: "trimmer", package: "RM-065" },
  }))).toBe("1K, linear, RM-065 trimmer")
})

test("pin header: pin count and pitch", () => {
  expect(needsText(line({
    kind: "connector", physical: { kind: "pin-header", pins: 3, pitchMm: 2.54 },
  }))).toBe("3-pin 2.54 mm header")
})

test("panel pot: value, taper and placement", () => {
  expect(needsText(line({
    kind: "potentiometer", ohms: 25_000, taper: "log", placement: "off-board",
    physical: { kind: "panel-pot" },
  }))).toBe("25K, log, panel pot")
})
