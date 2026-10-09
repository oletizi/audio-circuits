import { test, expect } from "bun:test"
import { discoverBoundary } from "../../lib/board/scaffold/boundary.ts"
import { partitionReference } from "../../circuits/pultec/partition.ts"
import { net } from "../../lib/model/types.ts"
import type { Component } from "../../lib/model/types.ts"

const modules = partitionReference().modules

test("a section's boundary is every net another section also touches, plus ground", () => {
  const boundary = discoverBoundary("low-boost", modules, "0")
  expect([...boundary].sort()).toEqual(["0", "lo_boost_in", "out"])
})

test("internal nets are not boundary nets", () => {
  const boundary = discoverBoundary("low-boost", modules, "0")
  expect(boundary.has("j10_p1")).toBe(false)
})

test("every section's boundary is discovered, not listed", () => {
  // The spec's per-section terminal tables are RESULTS of this function, not inputs.
  // Only low-boost and mid reference ground at all - low-cut, hi-boost and hi-cut are
  // two-terminal networks that never return to it - which is why the spec's isolation
  // counts are 1, 1, 1, 2, 2 rather than two links everywhere.
  const expected: Record<string, string[]> = {
    "hi-boost": ["hi_boost_out", "in"],
    "hi-cut": ["hi_boost_out", "lo_boost_in"],
    "low-cut": ["hi_boost_out", "out"],
    "low-boost": ["0", "lo_boost_in", "out"],
    mid: ["0", "hi_boost_out", "in"],
  }
  for (const [section, nets] of Object.entries(expected)) {
    expect([...discoverBoundary(section, modules, "0")].sort(), section).toEqual(nets)
  }
})

test("ground is a boundary net even when it is the ONLY section touching it", () => {
  // Load-bearing only in this case. In the real partition both low-boost and mid name
  // ground, so each already finds it "foreign" and the explicit clause is redundant
  // there. A synthetic partition is the only way to show the clause does anything:
  // without it, `shunt`'s capacitor-to-ground would not be on a path between two
  // boundary nodes and the reduction would discard a real network.
  const shunt: Component[] = [
    {
      id: "series_resistor",
      kind: "resistor",
      parameters: { ohms: 1000 },
      pins: {},
      units: [{ name: "MAIN", pins: { a: net("IN"), b: net("mid_node") } }],
    },
    {
      id: "shunt_capacitor",
      kind: "capacitor",
      parameters: { farads: 1e-7 },
      pins: {},
      units: [{ name: "MAIN", pins: { a: net("mid_node"), b: net("0") } }],
    },
  ]
  const neighbour: Component[] = [
    {
      id: "neighbour_resistor",
      kind: "resistor",
      parameters: { ohms: 2200 },
      pins: {},
      units: [{ name: "MAIN", pins: { a: net("IN"), b: net("OUT") } }],
    },
  ]
  const boundary = discoverBoundary("shunt", { shunt, neighbour }, "0")
  expect([...boundary].sort()).toEqual(["0", "IN"])
})

test("a section that never touches ground does not gain a ground terminal", () => {
  // The clause adds ground only when the section actually references it. Inventing a
  // ground terminal would add a link to a leg that does not exist.
  expect(discoverBoundary("hi-boost", modules, "0").has("0")).toBe(false)
})

test("an unknown section refuses, naming it and the sections that exist", () => {
  expect(() => discoverBoundary("nope", modules, "0")).toThrow(/nope/)
  expect(() => discoverBoundary("nope", modules, "0")).toThrow(/low-boost/)
})
