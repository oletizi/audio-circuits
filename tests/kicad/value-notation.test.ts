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
  expect(() => valueFor(resistor(470))).toThrow(/1k.*999k/s)
  expect(() => valueFor(resistor(2e6))).toThrow(/1k.*999k/s)
  expect(() => valueFor(capacitor(2e-3))).toThrow(/1pF.*1000uF/s)
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
