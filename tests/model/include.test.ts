import { test, expect } from "bun:test"
import { circuit, NC } from "../../lib/model/builder.ts"

const divider = () =>
  circuit()
    .resistor("top", "10k", { a: "IN", b: "MID" })
    .resistor("bottom", "10k", { a: "MID", b: "GND" })
    .port("IN", "IN")
    .port("OUT", "MID")
    .port("GND", "GND")
    .done()

test("included component ids are prefixed", () => {
  const n = circuit()
    .include("first", divider(), { IN: "SIG", OUT: "TAP", GND: "GROUND" })
    .resistor("load", "1k", { a: "TAP", b: "GROUND" })
    .port("SIG", "SIG").port("GROUND", "GROUND")
    .done()

  expect(n.components.map((c) => c.id).sort())
    .toEqual(["first_bottom", "first_top", "load"])
})

test("bound ports take the parent's net; unbound internals are prefixed", () => {
  const n = circuit()
    .include("first", divider(), { IN: "SIG", OUT: "TAP", GND: "GROUND" })
    .resistor("load", "1k", { a: "TAP", b: "GROUND" })
    .port("SIG", "SIG").port("GROUND", "GROUND")
    .done()

  const top = n.components.find((c) => c.id === "first_top")
  expect(top?.units[0]?.pins.a).toEqual({ kind: "net", net: "SIG" })
  expect(top?.units[0]?.pins.b).toEqual({ kind: "net", net: "TAP" })
})

test("two instances of the same sub-circuit do not collide", () => {
  const n = circuit()
    .include("a", divider(), { IN: "SIG", OUT: "TAP_A", GND: "GROUND" })
    .include("b", divider(), { IN: "TAP_A", OUT: "TAP_B", GND: "GROUND" })
    .resistor("load", "1k", { a: "TAP_B", b: "GROUND" })
    .port("SIG", "SIG").port("GROUND", "GROUND")
    .done()

  expect(n.components).toHaveLength(5)
  const aTop = n.components.find((c) => c.id === "a_top")
  const bTop = n.components.find((c) => c.id === "b_top")
  expect(aTop?.units[0]?.pins.b).toEqual({ kind: "net", net: "TAP_A" })
  expect(bTop?.units[0]?.pins.a).toEqual({ kind: "net", net: "TAP_A" })
})

test("an unbound declared port is rejected - there are no implicit global nets", () => {
  expect(() =>
    circuit().include("first", divider(), { IN: "SIG", OUT: "TAP" }),
  ).toThrow(/port "GND" .*not bound/i)
})

test("binding a port the sub-circuit does not declare is rejected", () => {
  expect(() =>
    circuit().include("first", divider(), {
      IN: "SIG", OUT: "TAP", GND: "GROUND", VCC: "RAIL",
    }),
  ).toThrow(/"VCC" is not a declared port/i)
})

test("a prefix colliding with an existing id is rejected", () => {
  const b = circuit().resistor("first_top", "1k", { a: "SIG", b: "GROUND" })
  expect(() => b.include("first", divider(), { IN: "SIG", OUT: "TAP", GND: "GROUND" }))
    .toThrow(/duplicate component id "first_top"/i)
})

test("NC pins are not renamed or converted to nets", () => {
  const subCircuit = circuit()
    .ic("opamp", {
      in_p: "V_IN", in_n: "V_FB", out: "V_OUT",
      pos: "VCC", neg: "GND", nc1: NC, nc2: NC,
    })
    .port("IN", "V_IN")
    .port("FB", "V_FB")
    .port("OUT", "V_OUT")
    .port("VCC", "VCC")
    .port("GND", "GND")
    .done()

  const n = circuit()
    .include("opamp1", subCircuit, {
      IN: "SIG_IN", FB: "SIG_FB", OUT: "SIG_OUT", VCC: "RAIL", GND: "GROUND",
    })
    .port("SIG_IN", "SIG_IN").port("SIG_FB", "SIG_FB").port("SIG_OUT", "SIG_OUT")
    .port("RAIL", "RAIL").port("GROUND", "GROUND")
    .done()

  const component = n.components.find((c) => c.id === "opamp1_opamp")

  // NC pins must remain NC, not be converted to nets or prefixed
  expect(component?.units[0]?.pins.nc1).toEqual({ kind: "nc" })
  expect(component?.units[0]?.pins.nc2).toEqual({ kind: "nc" })

  // Regular pins should be renamed as expected
  expect(component?.units[0]?.pins.in_p).toEqual({ kind: "net", net: "SIG_IN" })
  expect(component?.units[0]?.pins.out).toEqual({ kind: "net", net: "SIG_OUT" })
})

test("empty prefix is rejected", () => {
  const subCircuit = circuit()
    .resistor("r1", "1k", { a: "IN", b: "GND" })
    .port("IN", "IN")
    .port("GND", "GND")
    .done()

  expect(() =>
    circuit().include("", subCircuit, { IN: "SIG", GND: "GROUND" })
  ).toThrow(/include prefix must not be empty/i)
})
