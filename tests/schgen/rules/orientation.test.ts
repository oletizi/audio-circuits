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

const resolver = createResolver(
  symbolLibraries(["Device", "power", "Transistor_BJT", "Switch", "Connector_Generic", "Jumper"]),
)

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

/**
 * **THE DEMAND HERE REVERSED ON 2026-10-25 and the deleted assertion was
 * `...toBeNull()`** - *"a part on no rail at all is left open for the backend"*. The owner,
 * reviewing the first generated `pultec-hi-boost` sheet: *"signal flows left to right"*, with
 * the capacitor bank *"rotated 90 degrees"*. `docs/known-gaps.md` **G292**.
 *
 * `null` meant step 3, and step 3 resolves to 0, which for `Device:R` and `Device:C` is a
 * VERTICAL axis - across the reading direction. So "left open" was in practice "drawn the way
 * that reads worst", and nobody had said otherwise until he did.
 */
test("a part on no rail at all is laid along the signal, because signal flows left to right", () => {
  expect(preferredOrientation("resistor", context("Device:R", { "1": "IN", "2": "OUT" }))).toBe(90)
})

test("the rail constraint still WINS over the signal axis, so a grounded end goes to the bottom", () => {
  // The control for the test above: if the signal-axis entry had been added ahead of the rail
  // entry rather than behind it, every one of these would now be 90 and the rail convention -
  // RailSpec's own documented sentence - would have been silently overridden.
  expect(preferredOrientation("capacitor", context("Device:C", { "1": "VCC", "2": "GND" }))).toBe(0)
  expect(preferredOrientation("capacitor", context("Device:C", { "1": "GND", "2": "VCC" }))).toBe(180)
  expect(preferredOrientation("resistor", context("Device:R", { "1": null, "2": "GND" }))).toBe(0)
})

test("a kind whose glyph draws its own direction is still left open, signal axis or not", () => {
  // Same reasoning RAIL_END_KINDS already carries for the rail entry: turning a diode to suit a
  // reading direction would be a rule about current dressed up as a rule about layout.
  expect(preferredOrientation("diode", context("Device:R", { "1": "IN", "2": "OUT" }))).toBeNull()
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

/**
 * **THE SWITCH RULE IS A HACK AND ITS TEST SAYS SO.** It stands in for a reflection across the
 * vertical axis, which the generator cannot express; 180 reaches the same left-right arrangement
 * and reverses the throws' order. `docs/known-gaps.md` **G295**.
 */
test("a switch is turned so its throws face the bank that feeds them", () => {
  // A REAL selector. This passed with `Device:R` until 2026-10-26, which meant it exercised the
  // KIND and never a switch - and so could not have caught the rule firing on two-pin jumpers.
  expect(preferredOrientation("switch", context("Switch:SW_Rotary_1x6_MP", { "7": "IN", "1": "OUT" }))).toBe(180)
})

test("the switch rule OUTRANKS the rail entry, which is the ordering that makes it work at all", () => {
  // A selector with a grounded end would otherwise be pulled upright by the rail rule and its
  // throws would face away from the bank again. The control: change the order in orientation.ts
  // and this goes to 0 or 180-by-accident rather than 180-by-rule.
  expect(preferredOrientation("switch", context("Switch:SW_Rotary_1x6_MP", { "7": "GND", "1": "VCC" }))).toBe(180)
})

test("CONTROL: the rule is about switches only, so a passive on no rail still takes the signal axis", () => {
  expect(preferredOrientation("resistor", context("Device:R", { "1": "IN", "2": "OUT" }))).toBe(90)
})

test("a connector is turned so its pins face the circuit, not away from it", () => {
  // Conn_01x05 draws all five pins LEFT at rotation 0; the junction bus feeds things to its
  // right, so every wire wrapped around the header. docs/known-gaps.md G295.
  expect(preferredOrientation("connector", context("Connector_Generic:Conn_01x05", { "1": "IN", "2": "OUT" }))).toBe(180)
})

test("CONTROL: the turn applies to switch and connector ONLY, not to every kind", () => {
  // Without this the rule could be widened to everything and the two tests above would still pass.
  expect(preferredOrientation("diode", context("Device:R", { "1": "IN", "2": "OUT" }))).toBeNull()
  expect(preferredOrientation("resistor", context("Device:R", { "1": "IN", "2": "OUT" }))).toBe(90)
})

/**
 * **FOUND BY REVIEW, 2026-10-26.** `jumper()` in `circuits/transistor-preamp/parts.ts` returns
 * `kind: "switch"`, so the kind covers a rotary selector AND a two-pin header. The turn was
 * written about selectors and was firing on every jumper.
 *
 * **THESE USE `Jumper:Jumper_2_Open` AND NOT `Device:R`, AND THE DIFFERENCE IS THE WHOLE POINT.**
 * `d379740`'s version of this test passed `Device:R` and asserted 90 - the same substitution it
 * criticised the three turn tests above for, one commit after criticising it. A resistor's two
 * pins are at angles 270 and 90 (top and bottom); the jumper's are at 0 and 180 (left and right),
 * so the two symbols cannot stand in for each other here: the jumper is ALREADY along the reading
 * direction at rotation 0 and the resistor is across it.
 */
test("a TWO-PIN switch is a jumper: its ends are already left and right, so it stays at 0", () => {
  // 0 rather than 90. `Jumper_2_Open` has pin 1 at angle 0 and pin 2 at angle 180, so rotation 0
  // puts one end left and one right; `signalAxis` picks the rotation with the lower-numbered pin
  // on the left, which is 0. **`d379740` asserted that rotation 0 for this symbol is "across the
  // reading direction". It is not, and this is the check that would have caught it.**
  expect(preferredOrientation("switch", context("Jumper:Jumper_2_Open", { "1": "IN", "2": "OUT" }))).toBe(0)
})

test("a two-pin jumper with an end on a rail is drawn with that end toward its rail", () => {
  // THE CONTROL FOR `TWO_TERMINAL_BY_GEOMETRY`, and the only thing admitting `switch` to the rail
  // entry actually changes: on no rail the jumper is at 0 either way. `JP1` on the transistor
  // preamp's upper leg is this case - `VCC` and `UPPER_JUMPED` - and removing that list takes
  // `transistor-preamp-lab` to a clearance refusal and the census to 6 of 11.
  expect(preferredOrientation("switch", context("Jumper:Jumper_2_Open", { "1": "VCC", "2": "JUMPED" }))).toBe(270)
  expect(preferredOrientation("switch", context("Jumper:Jumper_2_Open", { "1": "SIG", "2": "GND" }))).toBe(270)
})

/**
 * **THE DEFECT `d379740` INTRODUCED WHILE FIXING THE JUMPER, and this test is why the guard is a
 * side-multiset test rather than a pin count.** It declined the turn for any member of
 * `TURNED_TO_FACE_THE_CIRCUIT` with two pins, which silently took `Conn_01x02` with it.
 *
 * A 2-way header is not a two-terminal inline part. `Connector_Generic:Conn_01x02` puts BOTH pins
 * at angle 0 - both on the LEFT - exactly as `Conn_01x05` does, so the turn moves both of them to
 * the side facing the circuit, which is the entire purpose of the rule.
 *
 * `[RAN]` without this: `transistor-preamp-feedback` loses its zero-fallback sheet and refuses at
 * clearance, and `ob-buffer` picks up a fallback field placement on `J1#1`.
 */
test("a TWO-PIN connector still turns, because both its pins face one way", () => {
  expect(preferredOrientation("connector", context("Connector_Generic:Conn_01x02", { "1": "IN", "2": "OUT" }))).toBe(180)
})

