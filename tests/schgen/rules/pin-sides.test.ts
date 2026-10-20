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
import { isPinSide, pinSidesFor, sideOfPin } from "../../../lib/schgen/rules/pin-sides.ts"
import { ROTATIONS } from "../../../lib/schgen/render/geometry.ts"
import { createResolver } from "../../../lib/schgen/render/library.ts"
import { symbolLibraries } from "../../../lib/schgen/render/stock-symbols.ts"

const resolver = createResolver(symbolLibraries(["Device", "Audio", "Connector", "Connector_Generic", "Amplifier_Operational", "Transistor_BJT", "Jumper"]))

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

test("a ONE-SIDED symbol is answered, not refused - the deleted rule's whole mistake", () => {
  // Task 9 review, round 1: `pinSidesFor` used to refuse a symbol giving fewer than two distinct
  // sides. A KiCad pin always carries an `(at x y angle)` and an angle always yields a side, so a
  // one-sided glyph is a DEFINITE answer about which edge each pin sits on - not an ambiguous
  // one. The question the refusal was really reaching for, which pins are an interface in and
  // which out, is a DIRECTION and lives in portDirections and InterfacePort. See G155.
  expect([...pinSidesFor("connector", resolver.resolve("Connector_Generic:Conn_01x05"))]).toEqual([
    ["1", "left"],
    ["2", "left"],
    ["3", "left"],
    ["4", "left"],
    ["5", "left"],
  ])
  expect([...pinSidesFor("connector", resolver.resolve("Connector:TestPoint"))]).toEqual([["1", "bottom"]])
  expect([...pinSidesFor("connector", resolver.resolve("Connector_Generic:Conn_01x02"))]).toEqual([
    ["1", "left"],
    ["2", "left"],
  ])
})

test("the surviving refusal is about a BROKEN symbol: no pins at all", () => {
  // The one case where geometry genuinely cannot answer. Built by emptying a real symbol's pin
  // list rather than hunting for a pinless library symbol, so the refusal is driven rather than
  // described.
  const pinless = { ...resolver.resolve("Device:R"), pins: [] }
  expect(() => pinSidesFor("resistor", pinless))
    .toThrow(/Device:R \(declared for a "resistor"\) has no pins/)
})

test("every pin of every symbol the parity circuits use gets a side, and the sides are the four", () => {
  const ids = [
    "Audio:PT2399",
    "Amplifier_Operational:TL072",
    "Device:R",
    "Device:C",
    "Device:C_Polarized",
    "Device:R_Photo",
    "Device:R_Potentiometer_Trim",
    "Device:D",
    "Transistor_BJT:2N3904",
    "Connector_Generic:Conn_01x02",
    "Connector_Generic:Conn_01x05",
    "Connector:TestPoint",
    "Jumper:Jumper_2_Open",
  ]
  expect(ids.length, "a symbol list nothing iterates is a check that cannot fail").toBe(13)
  const missing: string[] = []
  let pins = 0
  for (const id of ids) {
    const symbol = resolver.resolve(id)
    const sides = pinSidesFor("ic", symbol)
    for (const pin of symbol.pins) {
      pins += 1
      const side = sides.get(pin.number)
      if (side === undefined || !isPinSide(side)) missing.push(`${id}.${pin.number}`)
    }
  }
  expect(missing).toEqual([])
  // 16 + 8 + 2 + 2 + 2 + 2 + 3 + 2 + 3 + 2 + 5 + 1 + 2, pinned so a sweep that silently
  // stopped covering a symbol shows up as a count rather than as a pass.
  expect(pins, "the sweep covered the wrong number of pins").toBe(50)
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
