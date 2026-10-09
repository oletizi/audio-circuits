import { test, expect } from "bun:test"
import { connectedGroups, isolationPoints } from "../../lib/board/scaffold/isolate.ts"
import { reduceToBoundary } from "../../lib/board/scaffold/reduce.ts"
import { REFERENCE_FLAT, resolveSectionFlat } from "../../lib/board/scaffold/flat.ts"
import { discoverBoundary } from "../../lib/board/scaffold/boundary.ts"
import { partitionReference } from "../../circuits/pultec/partition.ts"
import type { ResolvedComponent } from "../../lib/model/control-state.ts"

const modules = partitionReference().modules

const r = (id: string, a: string, b: string, ohms = 1000): ResolvedComponent => ({
  id,
  kind: "resistor",
  parameters: { ohms },
  pins: {},
  units: [{ name: "MAIN", pins: { a, b } }],
})

test("a two-terminal stand-in needs one isolation point", () => {
  const points = isolationPoints(
    [r("arm", "in", "hi_boost_out")],
    new Set(["in", "hi_boost_out"]),
  )
  expect(points).toHaveLength(1)
})

test("a three-terminal stand-in needs two", () => {
  // Low-boost: 56k to `out` and a 0R shunt to ground, meeting at lo_boost_in. One link
  // leaves `out` connected to ground through the 56k - measured at 0.589 dB on the
  // full build, which is why this is a correctness test and not a style preference.
  const points = isolationPoints(
    [r("series", "lo_boost_in", "out", 56_000), r("shunt", "lo_boost_in", "0", 0)],
    new Set(["lo_boost_in", "out", "0"]),
  )
  expect(points).toHaveLength(2)
})

test("the leg left attached is ground, because hanging off ground joins nothing", () => {
  const points = isolationPoints(
    [r("series", "lo_boost_in", "out", 56_000), r("shunt", "lo_boost_in", "0", 0)],
    new Set(["lo_boost_in", "out", "0"]),
  )
  expect(points.map((p) => p.net).sort()).toEqual(["lo_boost_in", "out"])
  expect(points.some((p) => p.net === "0")).toBe(false)
})

test("isolation is derived per connected component, not per section", () => {
  // Two pieces sharing no net, two terminals each: one point per piece, not one
  // overall. A single n-1 applied to the whole section would give one.
  const pieces = [r("a", "in", "out"), r("b", "hi_boost_out", "0")]
  expect(connectedGroups(pieces)).toHaveLength(2)
  expect(isolationPoints(pieces, new Set(["in", "out", "hi_boost_out", "0"]))).toHaveLength(2)
})

test("components sharing a net are one connected component", () => {
  const groups = connectedGroups([r("a", "in", "mid"), r("b", "mid", "out")])
  expect(groups).toHaveLength(1)
  expect(groups[0]).toHaveLength(2)
})

test("one entry per distinct boundary net, not per pin on it", () => {
  // Two components both land on `out`. Breaking that net once is enough.
  const points = isolationPoints(
    [r("a", "in", "out"), r("b", "in", "out")],
    new Set(["in", "out"]),
  )
  expect(points).toHaveLength(1)
})

test("every isolation point names a real pin of a real component", () => {
  for (const section of Object.keys(modules)) {
    const boundary = discoverBoundary(section, modules, "0")
    const kept = reduceToBoundary(resolveSectionFlat(section, modules, REFERENCE_FLAT), boundary)
    for (const point of isolationPoints(kept, boundary)) {
      const owner = kept.find((k) => k.id === point.component)
      expect(owner, `${section}: ${point.component}`).toBeDefined()
      expect(owner!.units[0]!.pins[point.terminal], `${section}: ${point.component}.${point.terminal}`)
        .toBe(point.net)
    }
  }
})

test("the derived isolation counts are 1, 1, 1, 2, 2 and total seven", () => {
  // The spec reports these. They are results of the derivation, and the 2s come from
  // low-boost and mid being the only sections that reference ground at all.
  const expected: Record<string, number> = {
    "hi-boost": 1,
    "hi-cut": 1,
    "low-cut": 1,
    "low-boost": 2,
    mid: 2,
  }
  let total = 0
  for (const [section, count] of Object.entries(expected)) {
    const boundary = discoverBoundary(section, modules, "0")
    const kept = reduceToBoundary(resolveSectionFlat(section, modules, REFERENCE_FLAT), boundary)
    const points = isolationPoints(kept, boundary)
    expect(points.length, section).toBe(count)
    total += points.length
  }
  expect(total).toBe(7)
})

test("breaking the derived points leaves at most one boundary net per group attached", () => {
  // The property the count exists to deliver, asserted directly rather than inferred
  // from the number.
  for (const section of Object.keys(modules)) {
    const boundary = discoverBoundary(section, modules, "0")
    const kept = reduceToBoundary(resolveSectionFlat(section, modules, REFERENCE_FLAT), boundary)
    const broken = new Set(isolationPoints(kept, boundary).map((p) => p.net))
    for (const group of connectedGroups(kept)) {
      const groupNets = new Set(
        group.flatMap((c) => c.units.flatMap((u) => Object.values(u.pins))).filter((n) => boundary.has(n)),
      )
      const stillAttached = [...groupNets].filter((n) => !broken.has(n))
      expect(stillAttached.length, `${section}: ${stillAttached.join(", ")}`).toBeLessThanOrEqual(1)
    }
  }
})

test("isolation is deterministic", () => {
  const boundary = discoverBoundary("mid", modules, "0")
  const kept = reduceToBoundary(resolveSectionFlat("mid", modules, REFERENCE_FLAT), boundary)
  expect(JSON.stringify(isolationPoints(kept, boundary)))
    .toBe(JSON.stringify(isolationPoints(kept, boundary)))
})
