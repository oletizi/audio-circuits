import { test, expect } from "bun:test"
import { circuit } from "../../lib/model/builder.ts"
import { NC } from "../../lib/model/types.ts"

test("a two-resistor divider builds and validates", () => {
  const n = circuit()
    .resistor("top", "10k", { a: "IN", b: "MID" })
    .resistor("bottom", "10k", { a: "MID", b: "GND" })
    .port("IN", "IN")
    .port("GND", "GND")
    .done()

  expect(n.components).toHaveLength(2)
  expect(n.components[0]?.id).toBe("top")
  expect(n.components[0]?.parameters).toEqual({ ohms: 10000 })
  expect(n.components[0]?.units[0]?.pins.a).toEqual({ kind: "net", net: "IN" })
  expect(n.ports).toEqual({ IN: "IN", GND: "GND" })
})

test("values are parsed, not stored as strings", () => {
  const n = circuit()
    .capacitor("c", "4.7uF", { a: "IN", b: "GND" })
    .resistor("r", "1k", { a: "IN", b: "GND" })
    .port("IN", "IN").port("GND", "GND")
    .done()
  expect(n.components[0]?.parameters).toEqual({ farads: 4.7e-6 })
  expect(n.components[1]?.parameters).toEqual({ ohms: 1000 })
})

test("an ic declares its own pins and accepts a no-connect", () => {
  const n = circuit()
    .ic("u1", { "1": "VCC", "2": "OUT", "3": NC }, { mpn: "PT2399" })
    .resistor("load", "1k", { a: "OUT", b: "VCC" })
    .port("VCC", "VCC")
    .done()
  const u1 = n.components[0]
  expect(u1?.kind).toBe("ic")
  expect(u1?.part?.mpn).toBe("PT2399")
  expect(u1?.units[0]?.pins["3"]).toEqual({ kind: "nc" })
})

test("done() runs validation, so a floating net throws at construction", () => {
  expect(() =>
    circuit().resistor("r", "1k", { a: "IN", b: "DANGLE" }).port("IN", "IN").done(),
  ).toThrow(/net "DANGLE"/i)
})

test("a duplicate id throws at declaration, not at done()", () => {
  const b = circuit().resistor("r", "1k", { a: "IN", b: "GND" })
  expect(() => b.resistor("r", "2k", { a: "GND", b: "OUT" })).toThrow(/duplicate component id "r"/i)
})

test("a port declared twice throws", () => {
  const b = circuit().resistor("r", "1k", { a: "IN", b: "GND" }).port("IN", "IN")
  expect(() => b.port("IN", "GND")).toThrow(/port "IN" is already declared/i)
})

test("inductor() parses value into henries", () => {
  const n = circuit()
    .inductor("l1", "10mH", { a: "IN", b: "GND" })
    .port("IN", "IN")
    .port("GND", "GND")
    .done()
  expect(n.components[0]?.parameters).toEqual({ henries: 0.01 })
})

test("connector() builds and validates", () => {
  const n = circuit()
    .connector("j1", { "1": "IN", "2": "GND", "3": "OUT" })
    .port("IN", "IN")
    .port("GND", "GND")
    .port("OUT", "OUT")
    .done()
  expect(n.components[0]?.kind).toBe("connector")
  expect(n.components[0]?.id).toBe("j1")
  expect(n.components[0]?.units[0]?.pins["1"]).toEqual({ kind: "net", net: "IN" })
})

test("add() can build an opamp with package pins and validates", () => {
  const n = circuit()
    .add({
      id: "u1",
      kind: "opamp",
      parameters: {},
      pins: { "v+": { kind: "net", net: "VCC" }, "v-": { kind: "net", net: "GND" } },
      units: [{ name: "MAIN", pins: { "in+": { kind: "net", net: "IN" }, "in-": { kind: "net", net: "FB" }, "out": { kind: "net", net: "OUT" } } }],
      part: { mpn: "TL072" },
    })
    .port("VCC", "VCC")
    .port("GND", "GND")
    .port("IN", "IN")
    .port("FB", "FB")
    .port("OUT", "OUT")
    .done()
  const u1 = n.components[0]
  expect(u1?.kind).toBe("opamp")
  expect(u1?.pins["v+"]).toEqual({ kind: "net", net: "VCC" })
  expect(u1?.pins["v-"]).toEqual({ kind: "net", net: "GND" })
})

test("done() rejects malformed package pins", () => {
  expect(() =>
    circuit()
      .add({
        id: "u1",
        kind: "opamp",
        parameters: {},
        pins: { "v+": { kind: "net", net: "VCC" }, "invalid_pin": { kind: "net", net: "GND" } },
        units: [{ name: "MAIN", pins: { "in+": { kind: "net", net: "IN" }, "in-": { kind: "net", net: "FB" }, "out": { kind: "net", net: "OUT" } } }],
      })
      .port("VCC", "VCC")
      .port("IN", "IN")
      .port("FB", "FB")
      .port("OUT", "OUT")
      .done(),
  ).toThrow()
})

test("done() defensively copies components and ports", () => {
  const b = circuit()
    .resistor("r1", "1k", { a: "IN", b: "GND" })
    .port("IN", "IN")
    .port("GND", "GND")
  const n1 = b.done()
  expect(n1.components).toHaveLength(1)
  expect(n1.ports).toEqual({ IN: "IN", GND: "GND" })

  b.resistor("r2", "2k", { a: "OUT", b: "GND" }).port("OUT", "OUT")
  expect(n1.components).toHaveLength(1)
  expect(n1.ports).toEqual({ IN: "IN", GND: "GND" })
})
