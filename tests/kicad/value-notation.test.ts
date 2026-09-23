import { test, expect } from "bun:test"
import { valueFor } from "../../lib/kicad/value-notation.ts"
import type { Component } from "../../lib/model/types.ts"

function capacitor(farads: number): Component {
  return { id: "c", kind: "capacitor", parameters: { farads }, pins: {}, units: [] }
}
function resistor(ohms: number): Component {
  return { id: "r", kind: "resistor", parameters: { ohms }, pins: {}, units: [] }
}

test("capacitances below 10nF are expressed in pF", () => {
  expect(valueFor(capacitor(5.6e-10))).toBe("560pF")
  expect(valueFor(capacitor(5.6e-9))).toBe("5600pF")
})

test("capacitances at or above 10nF are expressed in uF, leading zero stripped", () => {
  expect(valueFor(capacitor(1e-8))).toBe(".01uF")
  expect(valueFor(capacitor(1e-7))).toBe(".1uF")
  expect(valueFor(capacitor(4.7e-6))).toBe("4.7uF")
  expect(valueFor(capacitor(1e-5))).toBe("10uF")
  expect(valueFor(capacitor(4.7e-5))).toBe("47uF")
  expect(valueFor(capacitor(1e-4))).toBe("100uF")
})

test("resistances are expressed in uppercase K", () => {
  expect(valueFor(resistor(2700))).toBe("2.7K")
  expect(valueFor(resistor(10000))).toBe("10K")
  expect(valueFor(resistor(15000))).toBe("15K")
  expect(valueFor(resistor(100000))).toBe("100K")
})

test("decades the board does not exercise are refused, not guessed", () => {
  expect(() => valueFor(resistor(470))).toThrow(/1k.*10M/s)
  expect(() => valueFor(resistor(1e7))).toThrow(/1k.*10M/s)
  expect(() => valueFor(capacitor(2e-3))).toThrow(/1pF.*1000uF/s)
})

test("capacitor boundary: exactly 1000uF (1e-3) is refused with clear message", () => {
  expect(() => valueFor(capacitor(1e-3))).toThrow(/up to but not including 1000uF/)
})

test("capacitor boundary: highest accepted value just below 1000uF formats", () => {
  expect(valueFor(capacitor(9.99e-4))).toBe("999uF")
})

test("resistor boundaries: 1k formats, the K/M boundary is 1M, 10M refuses", () => {
  expect(valueFor(resistor(1000))).toBe("1K")
  expect(valueFor(resistor(999000))).toBe("999K")
  expect(valueFor(resistor(1e6))).toBe("1M")
  expect(valueFor(resistor(1.5e6))).toBe("1.5M")
  expect(() => valueFor(resistor(1e7))).toThrow(/1k.*10M/s)
})

test("an IC's value is its manufacturer part number", () => {
  expect(valueFor({
    id: "delay_ic", kind: "ic", parameters: {}, pins: {}, units: [],
    part: { mpn: "PT2399", symbol: "Audio:PT2399" },
  })).toBe("PT2399")
})

test("a connector with no MPN falls back to its symbol's part name", () => {
  expect(valueFor({
    id: "header", kind: "connector", parameters: {}, pins: {}, units: [],
    part: { symbol: "Connector_Generic:Conn_01x05" },
  })).toBe("Conn_01x05")
})

test("a part with neither an MPN nor a symbol refuses", () => {
  expect(() => valueFor({
    id: "mystery", kind: "ic", parameters: {}, pins: {}, units: [],
  })).toThrow(/mystery/)
})

test("an inductor refuses rather than putting its part number in the value field", () => {
  // `inductor` carries `henries`, an electrical quantity this module has no
  // formatter for. Falling through to the mpn/symbol branch would silently
  // spell an inductor's inductance as its manufacturer part number instead -
  // the exact defect this refusal exists to catch, even though `part.mpn` is
  // present here and the fallback branch would otherwise happily return it.
  expect(() => valueFor({
    id: "l1", kind: "inductor", parameters: { henries: 1e-2 }, pins: {}, units: [],
    part: { mpn: "SRR1260-103K" },
  })).toThrow(/l1.*inductor/s)
})

test("a trim-pot's value is its resistance, spelled like a resistor's", () => {
  const pot = (ohms: number): Component => ({
    id: "trim", kind: "potentiometer", parameters: { ohms, taper: { type: "linear" } },
    pins: {}, units: [], part: { mpn: "3006P", symbol: "Device:R_Potentiometer_Trim" },
  })
  expect(valueFor(pot(50000))).toBe("50K")
  expect(valueFor(pot(1e6))).toBe("1M")
})

test("a jumper's value is its part name, as for a connector", () => {
  expect(valueFor({
    id: "jumper", kind: "switch",
    parameters: { positions: ["fitted", "removed"], contacts: { fitted: [["1", "2"]], removed: [] } },
    pins: {}, units: [], part: { symbol: "Jumper:Jumper_2_Open" },
  })).toBe("Jumper_2_Open")
})

test("a switch with neither an mpn nor a symbol refuses", () => {
  expect(() => valueFor({
    id: "bare_switch", kind: "switch",
    parameters: { positions: ["a"], contacts: { a: [] } },
    pins: {}, units: [],
  })).toThrow(/bare_switch/)
})
