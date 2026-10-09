import { test, expect } from "bun:test"
import { reduceToBoundary } from "../../lib/board/scaffold/reduce.ts"
import { REFERENCE_FLAT, resolveSectionFlat } from "../../lib/board/scaffold/flat.ts"
import { discoverBoundary } from "../../lib/board/scaffold/boundary.ts"
import { partitionReference } from "../../circuits/pultec/partition.ts"
import type { ResolvedComponent, ResolvedNetwork } from "../../lib/model/control-state.ts"

const modules = partitionReference().modules

const r = (id: string, a: string, b: string, ohms = 1000): ResolvedComponent => ({
  id,
  kind: "resistor",
  parameters: { ohms },
  pins: {},
  units: [{ name: "MAIN", pins: { a, b } }],
})
const c = (id: string, a: string, b: string): ResolvedComponent => ({
  id,
  kind: "capacitor",
  parameters: { farads: 1e-7 },
  pins: {},
  units: [{ name: "MAIN", pins: { a, b } }],
})
const network = (components: ResolvedComponent[]): ResolvedNetwork => ({
  ports: { ground: "0" },
  components,
})

test("a shunt reaching ground through an internal node is KEPT", () => {
  // The case that motivated explicit boundary discovery. With ground outside the
  // boundary set this chain joins no two boundary nodes and is wrongly discarded.
  const kept = reduceToBoundary(
    network([r("series_resistor", "IN", "mid_node"), c("shunt_capacitor", "mid_node", "0")]),
    new Set(["IN", "0"]),
  )
  expect(kept.map((k) => k.id).sort()).toEqual(["series_resistor", "shunt_capacitor"])
})

test("a branch on an open switch throw is dropped", () => {
  const kept = reduceToBoundary(
    network([r("live", "IN", "OUT"), c("open_throw", "IN", "dangling")]),
    new Set(["IN", "OUT", "0"]),
  )
  expect(kept.map((k) => k.id)).toEqual(["live"])
})

test("a zero-ohm component is kept and does NOT merge its nodes", () => {
  // Low-cut's entire stand-in is a short between two boundary nets. Merging them
  // would leave nothing to make removable and collapse its terminal count to one.
  const kept = reduceToBoundary(
    network([r("flat_arm", "hi_boost_out", "out", 0)]),
    new Set(["hi_boost_out", "out", "0"]),
  )
  expect(kept).toHaveLength(1)
  expect(Object.values(kept[0]!.units[0]!.pins).sort()).toEqual(["hi_boost_out", "out"])
})

test("a branch live only through a zero-ohm arm is kept", () => {
  // The omission that made the earlier design wrong: beyond a short is live, not
  // floating. Here the capacitor only reaches IN through a 0R arm.
  const kept = reduceToBoundary(
    network([r("flat_arm", "IN", "node", 0), c("beyond_the_short", "node", "0")]),
    new Set(["IN", "0"]),
  )
  expect(kept.map((k) => k.id).sort()).toEqual(["beyond_the_short", "flat_arm"])
})

test("every boundary net present in the input survives in the output's nodes", () => {
  const kept = reduceToBoundary(
    network([r("a", "IN", "OUT"), r("b", "OUT", "0")]),
    new Set(["IN", "OUT", "0"]),
  )
  const nodes = new Set(kept.flatMap((k) => Object.values(k.units[0]!.pins)))
  for (const boundaryNet of ["IN", "OUT", "0"]) {
    expect(nodes.has(boundaryNet), boundaryNet).toBe(true)
  }
})

test("a component touching only ONE boundary node is dropped", () => {
  // A single-terminal stub conducts nowhere. Keeping it would put a part on the
  // scaffold board that cannot affect anything.
  const kept = reduceToBoundary(
    network([r("live", "IN", "OUT"), c("stub", "IN", "nowhere")]),
    new Set(["IN", "OUT"]),
  )
  expect(kept.map((k) => k.id)).toEqual(["live"])
})

test("reduction drops the five unselected low-boost capacitors", () => {
  // Against the real section: six selector capacitors, one of which merged into
  // lo_boost_in at the flat setting. The other five reach only their own j10 nets.
  const boundary = discoverBoundary("low-boost", modules, "0")
  const resolved = resolveSectionFlat("low-boost", modules, REFERENCE_FLAT)
  const kept = reduceToBoundary(resolved, boundary)
  const capacitors = kept.filter((k) => k.kind === "capacitor")
  expect(capacitors).toHaveLength(1)
  expect(Object.values(capacitors[0]!.units[0]!.pins).sort()).toEqual(["0", "lo_boost_in"])
})

test("reduction keeps low-boost's series element and its flat shunt", () => {
  const boundary = discoverBoundary("low-boost", modules, "0")
  const kept = reduceToBoundary(resolveSectionFlat("low-boost", modules, REFERENCE_FLAT), boundary)
  const ids = new Set(kept.map((k) => k.id))
  expect(ids.has("R2")).toBe(true)
  expect(ids.has("RV_LO_BOOST.ccw-wiper")).toBe(true)
})

test("every section reduces to something, and to fewer parts than it started with", () => {
  for (const section of Object.keys(modules)) {
    const boundary = discoverBoundary(section, modules, "0")
    const resolved = resolveSectionFlat(section, modules, REFERENCE_FLAT)
    const kept = reduceToBoundary(resolved, boundary)
    expect(kept.length, `${section} reduced to nothing`).toBeGreaterThan(0)
    expect(kept.length, `${section} did not reduce`).toBeLessThan(resolved.components.length)
  }
})

test("reduction is deterministic and order-preserving", () => {
  const boundary = discoverBoundary("mid", modules, "0")
  const resolved = resolveSectionFlat("mid", modules, REFERENCE_FLAT)
  const a = reduceToBoundary(resolved, boundary)
  const b = reduceToBoundary(resolved, boundary)
  expect(a.map((k) => k.id)).toEqual(b.map((k) => k.id))
})

test("genuine parallel elements on internal nodes are both kept", () => {
  // The case a redundant exclusion helper used to break: C1 and C2 sit in parallel
  // between two internal nodes on a live series path, so both carry current. An
  // implementation that treated "another component joins my two nets" as a reason to
  // ignore that edge would drop them.
  const kept = reduceToBoundary(
    network([
      r("in_series", "IN", "m1"),
      c("parallel_one", "m1", "m2"),
      c("parallel_two", "m1", "m2"),
      r("out_series", "m2", "0"),
    ]),
    new Set(["IN", "0"]),
  )
  expect(kept.map((k) => k.id).sort()).toEqual([
    "in_series",
    "out_series",
    "parallel_one",
    "parallel_two",
  ].sort())
})

test("parallel elements on a DEAD-END net are both dropped", () => {
  // low-cut's C3 and C7 share j5_p3, which the selector leaves open at this setting.
  // Each can reach hi_boost_out through the other, but only by a cycle, so neither
  // conducts. This is the failure that forced the simple-path criterion.
  const kept = reduceToBoundary(
    network([
      r("live", "hi_boost_out", "out", 0),
      c("dead_end_one", "hi_boost_out", "j5_p3"),
      c("dead_end_two", "hi_boost_out", "j5_p3"),
    ]),
    new Set(["hi_boost_out", "out"]),
  )
  expect(kept.map((k) => k.id)).toEqual(["live"])
})
