import { test, expect } from "bun:test"
import { circuit } from "../../lib/model/builder.ts"
import { blockOf } from "../../lib/model/include.ts"

const block = () =>
  circuit()
    .resistor("r_up", "10k", { a: "3V3", b: "FB" })
    .resistor("r_dn", "10k", { a: "FB", b: "GND" })
    .port("rail", "3V3")
    .port("gnd", "GND")
    .done()

const twoBlocks = () =>
  circuit()
    .include("a", block(), { rail: "3V3", gnd: "GND" })
    .include("b", block(), { rail: "3V3", gnd: "GND" })
    .resistor("top_level", "1k", { a: "3V3", b: "GND" })
    .done()

test("a network with no include has no blocks", () => {
  const n = circuit().resistor("r", "1k", { a: "X", b: "Y" }).port("x", "X").port("y", "Y").done()
  expect(n.blocks).toEqual([])
})

test("include records its prefix, prefixed component ids and port bindings", () => {
  const n = twoBlocks()
  expect(n.blocks).toEqual([
    { prefix: "a", componentIds: ["a_r_up", "a_r_dn"], ports: { rail: "3V3", gnd: "GND" } },
    { prefix: "b", componentIds: ["b_r_up", "b_r_dn"], ports: { rail: "3V3", gnd: "GND" } },
  ])
  const nets = new Set(
    n.components.flatMap((c) =>
      c.units.flatMap((u) => Object.values(u.pins).flatMap((p) => (p.kind === "net" ? [p.net] : []))),
    ),
  )
  expect(nets.has("a_FB")).toBe(true)
  expect(nets.has("b_FB")).toBe(true)
})

test("blockOf names the block, and null for a top-level part", () => {
  const n = twoBlocks()
  expect(blockOf(n, "a_r_up")).toBe("a")
  expect(blockOf(n, "b_r_dn")).toBe("b")
  expect(blockOf(n, "top_level")).toBeNull()
})

test("including a network that has blocks refuses, naming the inner prefixes", () => {
  const outer = twoBlocks()
  const withPorts = circuit()
    .include("a", block(), { rail: "3V3", gnd: "GND" })
    .include("b", block(), { rail: "3V3", gnd: "GND" })
    .port("rail", "3V3")
    .port("gnd", "GND")
    .done()
  expect(outer.blocks.length).toBe(2)
  const attempt = () => circuit().include("outer", withPorts, { rail: "R", gnd: "G" })
  expect(attempt).toThrow(/nested composition is not yet drawn \(C3 draws one level\)/i)
  expect(attempt).toThrow(/\(a, b\)/)
})
