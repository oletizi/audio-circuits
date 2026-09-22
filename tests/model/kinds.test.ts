import { test, expect } from "bun:test"
import { unitPins, packagePins, isKnownKind } from "../../lib/model/kinds.ts"

test("two-terminal passives share the a/b vocabulary", () => {
  for (const kind of ["resistor", "capacitor", "inductor", "photoresistor"] as const) {
    expect([...unitPins(kind)].sort()).toEqual(["a", "b"])
    expect(packagePins(kind)).toEqual([])
  }
})

test("polarised and three-terminal kinds have their own vocabularies", () => {
  expect([...unitPins("diode")].sort()).toEqual(["anode", "cathode"])
  expect([...unitPins("bjt")].sort()).toEqual(["base", "collector", "emitter"])
  expect([...unitPins("potentiometer")].sort()).toEqual(["ccw", "cw", "wiper"])
})

test("an opamp splits signal pins from shared supply pins", () => {
  expect([...unitPins("opamp")].sort()).toEqual(["in+", "in-", "out"])
  expect([...packagePins("opamp")].sort()).toEqual(["v+", "v-"])
})

test("ic and connector declare their pins per part, not per kind", () => {
  expect(unitPins("ic")).toEqual([])
  expect(unitPins("connector")).toEqual([])
})

test("an unknown kind is rejected rather than defaulted", () => {
  expect(isKnownKind("resistor")).toBe(true)
  expect(isKnownKind("flux_capacitor")).toBe(false)
  expect(() => unitPins("flux_capacitor" as never)).toThrow(/unknown component kind/i)
})
