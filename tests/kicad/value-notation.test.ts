import { test, expect } from "bun:test"
import { valueFor } from "../../lib/kicad/value-notation.ts"
import { net } from "../../lib/model/types.ts"
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
  expect(() => valueFor(resistor(2e6))).toThrow(/1R.*999k/s)
  expect(() => valueFor(capacitor(2e-3))).toThrow(/1pF.*1000uF/s)
})

test("capacitor boundary: exactly 1000uF (1e-3) is refused with clear message", () => {
  expect(() => valueFor(capacitor(1e-3))).toThrow(/up to but not including 1000uF/)
})

test("capacitor boundary: highest accepted value just below 1000uF formats", () => {
  expect(valueFor(capacitor(9.99e-4))).toBe("999uF")
})

test("resistor boundaries: 1000 ohms, 999000 ohms both format, 999001 refuses", () => {
  expect(valueFor(resistor(1000))).toBe("1K")
  expect(valueFor(resistor(999000))).toBe("999K")
  expect(() => valueFor(resistor(999001))).toThrow(/1R.*999k/s)
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

function twoPin(id: string, kind: Component["kind"], parameters: Component["parameters"]): Component {
  return {
    id,
    kind,
    parameters,
    pins: {},
    units: [{ name: "MAIN", pins: { a: net("x"), b: net("y") } }],
  }
}

test("inductance below one henry is spelled in millihenries", () => {
  expect(valueFor(twoPin("L1", "inductor", { henries: 0.1 }))).toBe("100mH")
  expect(valueFor(twoPin("L2", "inductor", { henries: 0.22 }))).toBe("220mH")
  expect(valueFor(twoPin("L3", "inductor", { henries: 0.45 }))).toBe("450mH")
  expect(valueFor(twoPin("L4", "inductor", { henries: 0.6 }))).toBe("600mH")
})

test("inductance at or above one henry is spelled in henries", () => {
  expect(valueFor(twoPin("L5", "inductor", { henries: 1 }))).toBe("1H")
  expect(valueFor(twoPin("L6", "inductor", { henries: 2 }))).toBe("2H")
})

test("inductance outside the proven range refuses rather than guessing", () => {
  expect(() => valueFor(twoPin("L7", "inductor", { henries: 1e-7 }))).toThrow(/proven/)
  expect(() => valueFor(twoPin("L8", "inductor", { henries: 1000 }))).toThrow(/proven/)
})

test("resistance below one kilohm keeps its ohms spelling", () => {
  expect(valueFor(twoPin("R1", "resistor", { ohms: 430 }))).toBe("430R")
  expect(valueFor(twoPin("R2", "resistor", { ohms: 1 }))).toBe("1R")
})

test("resistance at or above one kilohm is unchanged by this task", () => {
  expect(valueFor(twoPin("R3", "resistor", { ohms: 4700 }))).toBe("4.7K")
  expect(valueFor(twoPin("R4", "resistor", { ohms: 1000 }))).toBe("1K")
  expect(valueFor(twoPin("R5", "resistor", { ohms: 100000 }))).toBe("100K")
})

test("a potentiometer is valued by its resistance, not its taper", () => {
  const pot: Component = {
    id: "RV1",
    kind: "potentiometer",
    parameters: { ohms: 47000, taper: { type: "log", curveConstant: 4.8 } },
    pins: {},
    units: [{ name: "MAIN", pins: { ccw: net("a"), wiper: net("b"), cw: net("c") } }],
  }
  expect(valueFor(pot)).toBe("47K")
})

test("a switch is valued by its part identity, because it has no quantity", () => {
  const sw: Component = {
    id: "SW1",
    kind: "switch",
    parameters: { positions: ["a", "b"], contacts: { a: [["common", "t1"]], b: [["common", "t2"]] } },
    part: { symbol: "Switch:SW_Rotary6" },
    pins: {},
    units: [{ name: "MAIN", pins: { common: net("c"), t1: net("x"), t2: net("y") } }],
  }
  expect(valueFor(sw)).toBe("SW_Rotary6")
})

test("a switch with no part identity refuses rather than emitting an empty value", () => {
  const sw: Component = {
    id: "SW2",
    kind: "switch",
    parameters: { positions: ["a"], contacts: { a: [] } },
    pins: {},
    units: [{ name: "MAIN", pins: { common: net("c") } }],
  }
  expect(() => valueFor(sw)).toThrow(/neither an mpn nor a symbol/)
})
