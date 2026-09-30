import { test, expect } from "bun:test"
import { misfits } from "../../tools/bom/fit.ts"
import type { BomLine } from "../../tools/bom/types.ts"
import type { CatalogEntry } from "../../tools/bom/catalog.ts"

function entry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    id: "r_100k_0207",
    kind: "resistor",
    description: "100k resistor",
    specs: {},
    evidence: [],
    why: "test fixture",
    stock: false,
    sources: [{ supplier: "Mouser", url: "https://mouser.com/x", currency: "USD", breaks: [{ quantity: 1, unitPrice: 0.1 }], checked: "2026-09-01", use: "standard" }],
    ...overrides,
  }
}

const AXIAL_RESISTOR_LINE: BomLine = {
  key: "resistor 100k 0207",
  placement: "on-board",
  designators: ["R2"],
  quantity: 1,
  kind: "resistor",
  ohms: 100_000,
  physical: { kind: "axial-resistor", body: "0207", leadSpacingMm: 10.16 },
  minWatts: 0.25,
}

test("wrong kind yields exactly the kind misfit, even when specs otherwise match", () => {
  const found = misfits(AXIAL_RESISTOR_LINE, entry({ kind: "potentiometer", specs: { ohms: 100_000 } }))
  expect(found).toEqual([{ field: "kind", needed: "resistor", found: "potentiometer" }])
})

test("a well-formed entry that meets every field has no misfits", () => {
  const found = misfits(AXIAL_RESISTOR_LINE, entry({
    specs: { ohms: 100_000, watts: 0.25, package: "0207", leadSpacingMm: 10.16 },
  }))
  expect(found).toEqual([])
})

test("ohms mismatch is a misfit naming both values", () => {
  const found = misfits(AXIAL_RESISTOR_LINE, entry({
    specs: { ohms: 47_000, watts: 0.25, package: "0207", leadSpacingMm: 10.16 },
  }))
  expect(found).toContainEqual({ field: "ohms", needed: "100000", found: "47000" })
})

test("ohms not stated on the entry is a misfit reading \"not stated\"", () => {
  const found = misfits(AXIAL_RESISTOR_LINE, entry({
    specs: { watts: 0.25, package: "0207", leadSpacingMm: 10.16 },
  }))
  expect(found).toContainEqual({ field: "ohms", needed: "100000", found: "not stated" })
})

test("watts below minWatts is a misfit; watts not stated is a misfit", () => {
  const under = misfits(AXIAL_RESISTOR_LINE, entry({
    specs: { ohms: 100_000, watts: 0.1, package: "0207", leadSpacingMm: 10.16 },
  }))
  expect(under).toContainEqual({ field: "watts", needed: ">= 0.25", found: "0.1" })

  const missing = misfits(AXIAL_RESISTOR_LINE, entry({
    specs: { ohms: 100_000, package: "0207", leadSpacingMm: 10.16 },
  }))
  expect(missing).toContainEqual({ field: "watts", needed: ">= 0.25", found: "not stated" })
})

test("watts at or above minWatts is not a misfit", () => {
  const exact = misfits(AXIAL_RESISTOR_LINE, entry({
    specs: { ohms: 100_000, watts: 0.25, package: "0207", leadSpacingMm: 10.16 },
  }))
  expect(exact.some((m) => m.field === "watts")).toBe(false)
})

test("axial resistor: the body decides the fit; lead spacing is not checked (leads are bent to pitch)", () => {
  const wrongBody = misfits(AXIAL_RESISTOR_LINE, entry({
    specs: { ohms: 100_000, watts: 0.25, package: "0805" },
  }))
  expect(wrongBody).toContainEqual({ field: "package", needed: "0207", found: "0805" })
  const noSpacing = misfits(AXIAL_RESISTOR_LINE, entry({
    specs: { ohms: 100_000, watts: 0.25, package: "0207" },
  }))
  expect(noSpacing).toEqual([])
})

const CAPACITOR_LINE: BomLine = {
  key: "capacitor 10uF CP_Radial_D5.0mm_P2.00mm",
  placement: "on-board",
  designators: ["C3"],
  quantity: 1,
  kind: "capacitor",
  farads: 1e-5,
  physical: { kind: "radial-electrolytic", maxDiameterMm: 5.0, leadSpacingMm: 2.0 },
  minVolts: 35,
}

test("electrolytic: diameter at or under the max is fine; over is a misfit", () => {
  const fitsSmaller = misfits(CAPACITOR_LINE, entry({
    kind: "capacitor", specs: { farads: 1e-5, volts: 35, diameterMm: 4.0, leadSpacingMm: 2.0 },
  }))
  expect(fitsSmaller.some((m) => m.field === "diameterMm")).toBe(false)

  const tooBig = misfits(CAPACITOR_LINE, entry({
    kind: "capacitor", specs: { farads: 1e-5, volts: 35, diameterMm: 6.3, leadSpacingMm: 2.0 },
  }))
  expect(tooBig).toContainEqual({ field: "diameterMm", needed: "<= 5", found: "6.3" })
})

test("electrolytic: lead spacing must equal, not merely fit", () => {
  const found = misfits(CAPACITOR_LINE, entry({
    kind: "capacitor", specs: { farads: 1e-5, volts: 35, diameterMm: 5.0, leadSpacingMm: 2.5 },
  }))
  expect(found).toContainEqual({ field: "leadSpacingMm", needed: "2", found: "2.5" })
})

test("electrolytic: volts below minVolts, or unstated, is a misfit", () => {
  const under = misfits(CAPACITOR_LINE, entry({
    kind: "capacitor", specs: { farads: 1e-5, volts: 25, diameterMm: 5.0, leadSpacingMm: 2.0 },
  }))
  expect(under).toContainEqual({ field: "volts", needed: ">= 35", found: "25" })
})

const TO92_LINE: BomLine = {
  key: "bjt 2N3904 TO-92_Inline",
  placement: "on-board",
  designators: ["Q1"],
  quantity: 1,
  kind: "bjt",
  mpn: "2N3904",
  physical: { kind: "to92", pinOrder: ["emitter", "base", "collector"] },
}

test("to92: package and pinout must both match", () => {
  const ok = misfits(TO92_LINE, entry({
    kind: "bjt", mpn: "2N3904", specs: { package: "TO-92", pinout: ["emitter", "base", "collector"] },
  }))
  expect(ok).toEqual([])

  const wrongPackage = misfits(TO92_LINE, entry({
    kind: "bjt", mpn: "2N3904", specs: { package: "SOT-23", pinout: ["emitter", "base", "collector"] },
  }))
  expect(wrongPackage).toContainEqual({ field: "package", needed: "TO-92", found: "SOT-23" })

  const wrongPinout = misfits(TO92_LINE, entry({
    kind: "bjt", mpn: "2N3904", specs: { package: "TO-92", pinout: ["collector", "base", "emitter"] },
  }))
  expect(wrongPinout).toContainEqual({
    field: "pinout", needed: "emitter, base, collector", found: "collector, base, emitter",
  })

  const missingPinout = misfits(TO92_LINE, entry({ kind: "bjt", mpn: "2N3904", specs: { package: "TO-92" } }))
  expect(missingPinout).toContainEqual({ field: "pinout", needed: "emitter, base, collector", found: "not stated" })
})

test("mpn equal when the line names one; not checked when it does not", () => {
  const wrongMpn = misfits(TO92_LINE, entry({
    kind: "bjt", mpn: "2N5088", specs: { package: "TO-92", pinout: ["emitter", "base", "collector"] },
  }))
  expect(wrongMpn).toContainEqual({ field: "mpn", needed: "2N3904", found: "2N5088" })

  const noMpnNeeded: BomLine = { ...TO92_LINE, mpn: undefined }
  const noMpnOnEntry = misfits(noMpnNeeded, entry({
    kind: "bjt", mpn: undefined, specs: { package: "TO-92", pinout: ["emitter", "base", "collector"] },
  }))
  expect(noMpnOnEntry.some((m) => m.field === "mpn")).toBe(false)
})

const TRIMMER_LINE: BomLine = {
  key: "potentiometer 50K linear RM-065 Potentiometer_Runtron_RM-065_Vertical",
  placement: "on-board",
  designators: ["RV1"],
  quantity: 1,
  kind: "potentiometer",
  ohms: 50_000,
  taper: "linear",
  physical: { kind: "trimmer", package: "RM-065" },
}

test("trimmer: package must equal RM-065; value and taper still checked", () => {
  const ok = misfits(TRIMMER_LINE, entry({
    kind: "potentiometer", specs: { ohms: 50_000, taper: "linear", package: "RM-065" },
  }))
  expect(ok).toEqual([])

  const wrongPackage = misfits(TRIMMER_LINE, entry({
    kind: "potentiometer", specs: { ohms: 50_000, taper: "linear", package: "RM-063" },
  }))
  expect(wrongPackage).toContainEqual({ field: "package", needed: "RM-065", found: "RM-063" })

  const wrongTaper = misfits(TRIMMER_LINE, entry({
    kind: "potentiometer", specs: { ohms: 50_000, taper: "log", package: "RM-065" },
  }))
  expect(wrongTaper).toContainEqual({ field: "taper", needed: "linear", found: "log" })
})

test("a passive's circuit part number names its footprint family, so a compatible part under its own mpn fits", () => {
  const namedLine: BomLine = { ...TRIMMER_LINE, mpn: "RM-065" }
  const substitute = misfits(namedLine, entry({
    kind: "potentiometer", mpn: "PT6KV-503A2020", specs: { ohms: 50_000, taper: "linear", package: "RM-065" },
  }))
  expect(substitute).toEqual([])
})

const HEADER_LINE: BomLine = {
  key: "connector Conn_01x03 PinHeader_1x03_P2.54mm_Vertical",
  placement: "on-board",
  designators: ["RV5"],
  quantity: 1,
  kind: "connector",
  physical: { kind: "pin-header", pins: 3, pitchMm: 2.54 },
}

test("header: pins and pitch must both equal", () => {
  const ok = misfits(HEADER_LINE, entry({ kind: "connector", specs: { pins: 3, pitchMm: 2.54 } }))
  expect(ok).toEqual([])

  const wrongPins = misfits(HEADER_LINE, entry({ kind: "connector", specs: { pins: 2, pitchMm: 2.54 } }))
  expect(wrongPins).toContainEqual({ field: "pins", needed: "3", found: "2" })

  const wrongPitch = misfits(HEADER_LINE, entry({ kind: "connector", specs: { pins: 3, pitchMm: 2.0 } }))
  expect(wrongPitch).toContainEqual({ field: "pitchMm", needed: "2.54", found: "2" })
})

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

test("panel pot: only value and taper are checked, nothing physical", () => {
  const ok = misfits(PANEL_POT_LINE, entry({ kind: "potentiometer", specs: { ohms: 25_000, taper: "linear" } }))
  expect(ok).toEqual([])

  const wrongOhms = misfits(PANEL_POT_LINE, entry({ kind: "potentiometer", specs: { ohms: 10_000, taper: "linear" } }))
  expect(wrongOhms).toEqual([{ field: "ohms", needed: "25000", found: "10000" }])
})
