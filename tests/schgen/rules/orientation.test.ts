/**
 * `lib/schgen/rules/orientation.ts`: step 2 of spec §1.5's authority order, and the `null` that
 * hands step 3 to the backend.
 *
 * Hand-written for Task 9 of the M1 schematic-authoring plan. `docs/known-gaps.md` **G99** calls a
 * drawn orientation the second load-bearing invention of the five - it *"decides whether ELK
 * crashes (G94), and moves crossings from 16 to 139 on one circuit"* - so what matters here is as
 * much that the library returns `null` where it has nothing to say as that it returns a rotation
 * where it does. A rule library answering everything would silently take §1.5 step 3 away.
 */

import { test, expect } from "bun:test"
import { preferredOrientation } from "../../../lib/schgen/rules/orientation.ts"
import { createResolver } from "../../../lib/schgen/render/library.ts"
import { symbolLibraries } from "../../../lib/schgen/render/stock-symbols.ts"
import type { OrientationContext } from "../../../lib/schgen/rules/orientation.ts"
import type { NetName, RailSpec } from "../../../lib/schgen/ir/types.ts"

const resolver = createResolver(symbolLibraries(["Device", "power", "Transistor_BJT"]))

const RAILS: readonly RailSpec[] = [
  { net: "GND", symbol: "power:GND", kind: "ground", pwrFlag: null },
  { net: "VCC", symbol: "power:VCC", kind: "supply", pwrFlag: null },
]

function context(libId: string, pinNets: Readonly<Record<string, NetName | null>>): OrientationContext {
  return {
    symbol: resolver.resolve(libId),
    pinNets: new Map(Object.entries(pinNets)),
    rails: new Map(RAILS.map((r) => [r.net, r])),
  }
}

test("a resistor with its pin 2 on ground is drawn at 0, which puts that pin at the bottom", () => {
  expect(preferredOrientation("resistor", context("Device:R", { "1": "SIG", "2": "GND" }))).toBe(0)
})

test("a resistor with its pin 1 on ground is drawn at 180, which puts that pin at the bottom", () => {
  expect(preferredOrientation("resistor", context("Device:R", { "1": "GND", "2": "SIG" }))).toBe(180)
})

test("a decoupling capacitor across a supply and a ground satisfies both constraints at once", () => {
  expect(preferredOrientation("capacitor", context("Device:C", { "1": "VCC", "2": "GND" }))).toBe(0)
  expect(preferredOrientation("capacitor", context("Device:C", { "1": "GND", "2": "VCC" }))).toBe(180)
})

test("a part on no rail at all is left open for the backend", () => {
  expect(preferredOrientation("resistor", context("Device:R", { "1": "IN", "2": "OUT" }))).toBeNull()
})

test("a part with BOTH ends on ground rails is left open, because the constraints do not choose", () => {
  // Two grounded ends want two bottoms and a two-pin glyph has one. `null` is the honest answer;
  // returning 0 would be picking, which is the thing §1.5 step 2 must not do.
  expect(preferredOrientation("capacitor", context("Device:C", { "1": "GND", "2": "GND" }))).toBeNull()
})

test("a no-connect pin contributes no constraint", () => {
  expect(preferredOrientation("resistor", context("Device:R", { "1": null, "2": "GND" }))).toBe(0)
})

test("a kind outside the reviewed set is left open even when it sits on a rail", () => {
  // A diode's glyph already carries a direction, so a rail rule for it would be a rule about
  // current direction wearing a rail's clothes; nothing in this repository has stated one.
  expect(preferredOrientation("diode", context("Device:D", { "1": "GND", "2": "SIG" }))).toBeNull()
  expect(
    preferredOrientation("bjt", context("Transistor_BJT:2N3904", { "1": "GND", "2": "BASE", "3": "VCC" })),
  ).toBeNull()
})
