import { expect, test } from "bun:test"
import { DESIGNATORS, PIN_NUMBERS } from "../../circuits/h7-platform/carrier-board.ts"
import { pinNumberFor } from "../../lib/kicad/from-network.ts"
import type { Component } from "../../lib/model/types.ts"
import { modelForSheet } from "./sheet-model.ts"

function pinsOf(component: Component): string[] {
  const pins = Object.keys(component.pins)
  for (const unit of component.units) pins.push(...Object.keys(unit.pins))
  return pins
}

test("the carrier's sheet model uses the carrier's own designators", () => {
  const model = modelForSheet("h7-carrier")
  expect(Object.fromEntries(model.designators)).toEqual({ ...DESIGNATORS })
})

test("the carrier's sheet model uses the carrier's own pin numbers", () => {
  const model = modelForSheet("h7-carrier")
  expect(model.network.components.length).toBeGreaterThan(0)
  for (const component of model.network.components) {
    const expected = new Map(pinsOf(component).map((pin) => [pin, pinNumberFor(component, pin, PIN_NUMBERS)]))
    expect(model.pinNumbers.get(component.id)).toEqual(expected)
  }
})

test("an undeclared board still refuses", () => {
  expect(() => modelForSheet("no-such-board")).toThrow(/no drafted-page model is declared/)
})
