/**
 * `lib/schgen/rules/pin-sides.ts`: a pin's side comes from the symbol's own geometry, and a symbol
 * that does not answer refuses.
 *
 * Hand-written for Task 9 of the M1 schematic-authoring plan. The first test is
 * `docs/known-gaps.md` **G99**'s sharpest finding turned into a check: the ELK spike split
 * `pt2399-core`'s 16-pin PT2399 *"first half in, second half out"* with *"no basis in the model at
 * all"*, and this asserts what the LIBRARY says the split is.
 */

import { test, expect } from "bun:test"
import { pinSidesFor, sideOfPin, symbolStatesItsSides } from "../../../lib/schgen/rules/pin-sides.ts"
import { ROTATIONS } from "../../../lib/schgen/render/geometry.ts"
import { createResolver } from "../../../lib/schgen/render/library.ts"
import { symbolLibraries } from "../../../lib/schgen/render/stock-symbols.ts"

const resolver = createResolver(symbolLibraries(["Device", "Audio", "Connector", "Connector_Generic", "Amplifier_Operational", "Transistor_BJT"]))

test("the PT2399's side partition comes from the symbol: pins 1-8 left, 9-16 right", () => {
  const sides = pinSidesFor("ic", resolver.resolve("Audio:PT2399"))
  expect(sides.size).toBe(16)
  const left = [...sides].filter(([, side]) => side === "left").map(([n]) => n)
  const right = [...sides].filter(([, side]) => side === "right").map(([n]) => n)
  expect(left).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"])
  expect(right).toEqual(["9", "10", "11", "12", "13", "14", "15", "16"])
})

test("a two-pin passive is sided top and bottom, which is where its glyph puts its pins", () => {
  for (const libId of ["Device:R", "Device:C", "Device:C_Polarized", "Device:R_Photo"]) {
    const sides = pinSidesFor("resistor", resolver.resolve(libId))
    expect([...sides], libId).toEqual([
      ["1", "top"],
      ["2", "bottom"],
    ])
  }
})

test("a diode is sided left and right, and a transistor across three sides", () => {
  expect([...pinSidesFor("diode", resolver.resolve("Device:D"))]).toEqual([
    ["1", "left"],
    ["2", "right"],
  ])
  expect([...pinSidesFor("bjt", resolver.resolve("Transistor_BJT:2N3904"))]).toEqual([
    ["1", "bottom"],
    ["2", "left"],
    ["3", "top"],
  ])
})

test("a multi-unit op-amp's pins are sided per pin, across all four sides", () => {
  const sides = pinSidesFor("opamp", resolver.resolve("Amplifier_Operational:TL072"))
  expect([...sides]).toEqual([
    ["1", "right"],
    ["2", "left"],
    ["3", "left"],
    ["4", "bottom"],
    ["5", "left"],
    ["6", "left"],
    ["7", "right"],
    ["8", "top"],
  ])
})

test("a one-sided symbol refuses, naming the symbol, the kind and every pin number", () => {
  expect(() => pinSidesFor("connector", resolver.resolve("Connector_Generic:Conn_01x05")))
    .toThrow(/Connector_Generic:Conn_01x05 \(declared for a "connector"\) puts all 5 of its pins on one side \("left"\)/)
  expect(() => pinSidesFor("connector", resolver.resolve("Connector_Generic:Conn_01x05")))
    .toThrow(/covering every pin number \(1, 2, 3, 4, 5\)/)
  expect(() => pinSidesFor("connector", resolver.resolve("Connector:TestPoint")))
    .toThrow(/puts all 1 of its pins on one side \("bottom"\)/)
})

test("symbolStatesItsSides agrees with whether pinSidesFor refuses, on every symbol tried", () => {
  const cases: readonly [string, boolean][] = [
    ["Audio:PT2399", true],
    ["Device:R", true],
    ["Device:D", true],
    ["Amplifier_Operational:TL072", true],
    ["Transistor_BJT:2N3904", true],
    ["Connector_Generic:Conn_01x02", false],
    ["Connector_Generic:Conn_01x05", false],
    ["Connector:TestPoint", false],
  ]
  expect(cases.length, "a case list nothing iterates is a check that cannot fail").toBe(8)
  const disagreements: string[] = []
  for (const [libId, expected] of cases) {
    const symbol = resolver.resolve(libId)
    const states = symbolStatesItsSides(symbol)
    if (states !== expected) disagreements.push(`${libId}: symbolStatesItsSides ${states}, expected ${expected}`)
    let refused = false
    try {
      pinSidesFor("connector", symbol)
    } catch {
      refused = true
    }
    if (refused === states) disagreements.push(`${libId}: predicate ${states} but refusal ${refused}`)
  }
  expect(disagreements).toEqual([])
})

test("a rotation moves a pin's side and never its identity", () => {
  // The four sides, read through the port's own `pinSide` and its SIDE_OF_ANGLE table rather than
  // asserted from an intuition about which way a rotation turns: pin 1 of Device:R carries angle
  // 270, so the sequence below is SIDE_OF_ANGLE[(270 + rot) % 360] renamed. It is pin 1 at every
  // rotation - the identity never moves, which is spec 1.5's "mirroring moves geometry, never pin
  // assignment" at the smallest scale there is.
  const resistor = resolver.resolve("Device:R")
  const pin1 = resistor.pins.find((p) => p.number === "1")
  expect(pin1).toBeDefined()
  if (pin1 === undefined) return
  expect(pin1.angle).toBe(270)
  expect(ROTATIONS.map((rot) => sideOfPin(rot, pin1))).toEqual(["top", "left", "bottom", "right"])
})
