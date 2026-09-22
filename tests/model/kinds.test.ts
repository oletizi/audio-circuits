import { test, expect } from "bun:test"
import {
  unitPins, packagePins, isKnownKind, ALL_KINDS, hasOpenVocabulary,
  spicePinOrder, isSpicePrimitive,
} from "../../lib/model/kinds.ts"

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

test("ic, connector and switch declare their pins per part, not per kind", () => {
  expect(unitPins("ic")).toEqual([])
  expect(unitPins("connector")).toEqual([])
  expect(unitPins("switch")).toEqual([])
})

test("an unknown kind is rejected rather than defaulted", () => {
  expect(isKnownKind("resistor")).toBe(true)
  expect(isKnownKind("flux_capacitor")).toBe(false)
  expect(() => unitPins("flux_capacitor" as never)).toThrow(/unknown component kind/i)
})

test("open and closed vocabularies are declared consistently for every kind", () => {
  for (const kind of ALL_KINDS) {
    if (hasOpenVocabulary(kind)) {
      expect(unitPins(kind)).toEqual([])
    } else {
      expect(unitPins(kind).length).toBeGreaterThan(0)
    }
  }
})

test("a SPICE primitive's argument order comes from the kind, not from its vocabulary", () => {
  expect(spicePinOrder("diode")).toEqual(["anode", "cathode"])
  // The Q line's order is collector, base, emitter, while the kind's vocabulary reads
  // base, collector, emitter. Emitting the vocabulary would swap a transistor's first
  // two terminals and still simulate cleanly, so the two are asserted to differ.
  expect(spicePinOrder("bjt")).toEqual(["collector", "base", "emitter"])
  expect(spicePinOrder("bjt")).not.toEqual([...unitPins("bjt")])
  expect(isSpicePrimitive("diode")).toBe(true)
  expect(isSpicePrimitive("resistor")).toBe(true)
})

test("a subcircuit-backed kind has no kind-level pin order and says why", () => {
  expect(isSpicePrimitive("opamp")).toBe(false)
  expect(() => spicePinOrder("opamp")).toThrow(/opamp.*pin order comes from its model/i)
})

test("an unknown kind is rejected by the SPICE pin-order lookups too", () => {
  expect(() => spicePinOrder("flux_capacitor" as never)).toThrow(/unknown component kind/i)
  expect(() => isSpicePrimitive("flux_capacitor" as never)).toThrow(/unknown component kind/i)
})

test("every primitive's SPICE order names exactly that kind's own pins", () => {
  // Guards a typo in the SPICE order ("emitor") that no other test would catch: the
  // emitter would then throw on every BJT, or worse, place an argument nothing names.
  for (const kind of ALL_KINDS) {
    if (!isSpicePrimitive(kind)) continue
    const declared = [...unitPins(kind), ...packagePins(kind)].sort()
    expect([...spicePinOrder(kind)].sort(), `${kind}'s SPICE order does not match its vocabulary`)
      .toEqual(declared)
  }
})
