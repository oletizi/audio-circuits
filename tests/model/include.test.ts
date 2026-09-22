import { test, expect } from "bun:test"
import { circuit } from "../../lib/model/builder.ts"

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
