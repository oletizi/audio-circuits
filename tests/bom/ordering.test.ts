import { test, expect } from "bun:test"
import { compareLines, sortLines } from "../../tools/bom/ordering.ts"
import type { BomLine } from "../../tools/bom/types.ts"

function resistor(key: string, ohms: number): BomLine {
  return {
    key, placement: "on-board", designators: ["R1"], quantity: 1, kind: "resistor", ohms,
    physical: { kind: "axial-resistor", body: "0207", leadSpacingMm: 10.16 }, minWatts: 0.25,
  }
}

function capacitor(key: string, farads: number): BomLine {
  return {
    key, placement: "on-board", designators: ["C1"], quantity: 1, kind: "capacitor", farads,
    physical: { kind: "radial-electrolytic", maxDiameterMm: 5, leadSpacingMm: 2 }, minVolts: 35,
  }
}

function pot(key: string, ohms: number, taper: "linear" | "log"): BomLine {
  return {
    key, placement: "on-board", designators: ["RV1"], quantity: 1, kind: "potentiometer", ohms, taper,
    physical: { kind: "trimmer", package: "RM-065" },
  }
}

function header(key: string, pins: number): BomLine {
  return {
    key, placement: "on-board", designators: ["J1"], quantity: 1, kind: "connector",
    physical: { kind: "pin-header", pins, pitchMm: 2.54 },
  }
}

function bjt(key: string, mpn: string): BomLine {
  return {
    key, placement: "on-board", designators: ["Q1"], quantity: 1, kind: "bjt", mpn,
    physical: { kind: "to92", pinOrder: ["emitter", "base", "collector"] },
  }
}

test("resistors sort by ohms, not by the key's text (47k before 100k)", () => {
  const oneHundredK = resistor("resistor 100k 0207", 100_000)
  const fortySevenK = resistor("resistor 47k 0207", 47_000)
  expect(sortLines([oneHundredK, fortySevenK])).toEqual([fortySevenK, oneHundredK])
})

test("capacitors sort by farads", () => {
  const ten = capacitor("capacitor 10uF x", 1e-5)
  const one = capacitor("capacitor 1uF x", 1e-6)
  expect(sortLines([ten, one])).toEqual([one, ten])
})

test("potentiometers sort by ohms, then by taper when ohms are equal", () => {
  const logPot = pot("potentiometer 50K log x", 50_000, "log")
  const linearPot = pot("potentiometer 50K linear x", 50_000, "linear")
  const smallerPot = pot("potentiometer 10K linear x", 10_000, "linear")
  expect(sortLines([logPot, linearPot, smallerPot])).toEqual([smallerPot, linearPot, logPot])
})

test("pin headers sort by pin count", () => {
  const three = header("connector Conn_01x03 x", 3)
  const two = header("connector Conn_01x02 x", 2)
  expect(sortLines([three, two])).toEqual([two, three])
})

test("a kind with no numeric value (bjt) sorts by key", () => {
  const b = bjt("bjt 2N5088 x", "2N5088")
  const a = bjt("bjt 2N3904 x", "2N3904")
  expect(sortLines([b, a])).toEqual([a, b])
})

test("different kinds sort by kind name first", () => {
  const r = resistor("resistor 100k 0207", 100_000)
  const c = capacitor("capacitor 10uF x", 1e-5)
  // "capacitor" < "resistor" alphabetically.
  expect(sortLines([r, c])).toEqual([c, r])
})

test("compareLines is a total order: equal-sorting lines compare as 0", () => {
  const line = resistor("resistor 100k 0207", 100_000)
  expect(compareLines(line, line)).toBe(0)
})
