import { test, expect } from "bun:test"
import { OFF_BOARD } from "../../circuits/pultec/off-board.ts"
import { THREE_BAND_REFERENCE } from "../../circuits/pultec/model/three-band.ts"

test("every off-board id names a component that exists", () => {
  const ids = new Set(THREE_BAND_REFERENCE.components.map((c) => c.id))
  const strays = [...OFF_BOARD].filter((id) => !ids.has(id)).sort()
  expect(strays).toEqual([])
})

test("every pot, switch and inductor is named explicitly, with no default", () => {
  const shouldBeNamed = THREE_BAND_REFERENCE.components
    .filter((c) => c.kind === "potentiometer" || c.kind === "switch" || c.kind === "inductor")
    .map((c) => c.id)
  const unnamed = shouldBeNamed.filter((id) => !OFF_BOARD.has(id)).sort()
  expect(unnamed).toEqual([])
})

test("no passive is off-board", () => {
  const passives = THREE_BAND_REFERENCE.components
    .filter((c) => c.kind === "capacitor" || c.kind === "resistor")
    .map((c) => c.id)
  expect(passives.filter((id) => OFF_BOARD.has(id))).toEqual([])
})

test("all nine inductors start off-board, because no part has been chosen", () => {
  const inductors = THREE_BAND_REFERENCE.components.filter((c) => c.kind === "inductor")
  expect(inductors.length).toBe(9)
  for (const inductor of inductors) expect(OFF_BOARD.has(inductor.id)).toBe(true)
})
