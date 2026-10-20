/**
 * SPEC §1.4 REVISION 4, DRIVEN: THE CANONICAL TOPOLOGY, AND OBLIGATION 2 TAKEN OVER IT.
 *
 * Hand-written for Task 13 of the M1 schematic-authoring plan. The cases are the brief's own, and
 * the canonicalisation ones come first because every assertion below them is taken over its output.
 *
 * **THE LAST TEST IS THE CROSSING-VERSUS-T-JUNCTION DISTINCTION MADE INTO A CHECK THAT COULD FAIL**,
 * and it is the one spec §1.4's obligation 2 left to an implementer's reading until revision 4.
 */

import { expect, test } from "bun:test"
import { branchJunctions, canonicalTopology, crossings, junctionProblems } from "../../../lib/schgen/elk/junctions.ts"
import { GRID } from "../../../lib/schgen/render/geometry.ts"
import type { BlockLayout, Wire } from "../../../lib/schgen/render/block-types.ts"
import type { PlacedPin } from "../../../lib/schgen/render/unit-pins.ts"

const layout = (wires: readonly Wire[]): BlockLayout => ({ placements: [], wires: [...wires], anchors: [] })

const G = (n: number): number => n * GRID

/** `n` extra copies of one segment, on one net: `n + 1` wires in and one out. */
function withDuplicateSegments(n: number): BlockLayout {
  const w: Wire = { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "A" }
  const copies: Wire[] = []
  for (let i = 0; i <= n; i += 1) copies.push({ ...w })
  // One further, distinct segment so `wires.length` after canonicalisation is not simply 1.
  copies.push({ a: { x: 0, y: G(2) }, b: { x: G(4), y: G(2) }, net: "A" })
  return layout(copies)
}

/**
 * A T whose branch point IS a pin end: two collinear segments meeting at the pin, plus a stem.
 *
 * Three arrivals at the pin - two wire ends and the pin itself - so the net's degree there is three
 * and it is a branch. `branchOnPinEnd` deliberately has exactly ONE branch point, so the assertion
 * on `kind` can be an equality over the whole list rather than a search.
 */
function branchOnPinEnd(): { readonly l: BlockLayout; readonly pins: readonly PlacedPin[] } {
  const at = { x: G(2), y: 0 }
  return {
    l: layout([
      { a: { x: 0, y: 0 }, b: at, net: "A" },
      { a: at, b: { x: G(4), y: 0 }, net: "A" },
      { a: at, b: { x: G(2), y: G(3) }, net: "A" },
    ]),
    pins: [{ part: "R_A", unit: 1, pin: "1", at, net: "A" }],
  }
}

/** Two collinear segments of one net sharing a stretch: neither a duplicate nor a clean T. */
function partiallyOverlappingSegments(): BlockLayout {
  return layout([
    { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "A" },
    { a: { x: G(2), y: 0 }, b: { x: G(6), y: 0 }, net: "A" },
  ])
}

/**
 * One net of degree four drawn as a tree: a spine with two stems, so TWO branch points.
 *
 * Each branch point has three arrivals - the spine entering, the spine leaving, and the stem - and
 * neither coincides with a pin, so both are `t-junction`s.
 */
function fourWayFan(): BlockLayout {
  return layout([
    { a: { x: 0, y: 0 }, b: { x: G(2), y: 0 }, net: "A" },
    { a: { x: G(2), y: 0 }, b: { x: G(5), y: 0 }, net: "A" },
    { a: { x: G(5), y: 0 }, b: { x: G(7), y: 0 }, net: "A" },
    { a: { x: G(2), y: 0 }, b: { x: G(2), y: G(3) }, net: "A" },
    { a: { x: G(5), y: 0 }, b: { x: G(5), y: G(3) }, net: "A" },
  ])
}

/** A horizontal segment of net `A` and a vertical one of net `B`, interiors crossing once. */
function twoNetsCrossing(): BlockLayout {
  return layout([
    { a: { x: 0, y: G(2) }, b: { x: G(6), y: G(2) }, net: "A" },
    { a: { x: G(3), y: 0 }, b: { x: G(3), y: G(5) }, net: "B" },
  ])
}

const NO_PINS: readonly PlacedPin[] = []

test("coincident duplicate segments collapse to one, and the count is reported", () => {
  const t = canonicalTopology(withDuplicateSegments(3), NO_PINS)
  expect(t.ok).toBe(true)
  if (!t.ok) return
  expect(t.collapsed).toBe(3)
  expect(t.wires.length).toBe(2)
  expect(t.zeroLength).toBe(0)
})

test("zero-length segments are dropped and counted SEPARATELY from duplicates", () => {
  const l = layout([
    { a: { x: 0, y: 0 }, b: { x: 0, y: 0 }, net: "A" },
    { a: { x: G(1), y: G(1) }, b: { x: G(1), y: G(1) }, net: "A" },
    { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "A" },
    { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "A" },
  ])
  const t = canonicalTopology(l, NO_PINS)
  expect(t.ok).toBe(true)
  if (!t.ok) return
  // The two counts must not be summed: the spikes measured them as separate facts (G106).
  expect(t.zeroLength).toBe(2)
  expect(t.collapsed).toBe(1)
  expect(t.wires.length).toBe(1)
})

test("a branch at a pin end is a different object from one in free space", () => {
  const { l, pins } = branchOnPinEnd()
  const t = canonicalTopology(l, pins)
  expect(t.ok).toBe(true)
  if (!t.ok) return
  expect(t.branches.map((b) => b.kind)).toEqual(["at-pin-end"])
  // The SAME geometry with no pin there is a t-junction, which is what makes the kind load-bearing.
  const bare = canonicalTopology(l, NO_PINS)
  expect(bare.ok).toBe(true)
  if (bare.ok) expect(bare.branches.map((b) => b.kind)).toEqual(["t-junction"])
})

test("an overlap that is neither a duplicate nor a clean T REFUSES, naming both segments", () => {
  const t = canonicalTopology(partiallyOverlappingSegments(), NO_PINS)
  expect(t.ok).toBe(false)
  if (!t.ok) {
    expect(t.ambiguous.join(" ")).toContain("wire 0")
    expect(t.ambiguous.join(" ")).toContain("wire 1")
    expect(t.ambiguous.join(" ")).toContain("neither an exact duplicate nor a clean T")
  }
})

test("two IDENTICAL segments of DIFFERENT nets are a short, not a duplicate, and REFUSE", () => {
  const t = canonicalTopology(
    layout([
      { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "A" },
      { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "B" },
    ]),
    NO_PINS,
  )
  expect(t.ok).toBe(false)
  if (!t.ok) expect(t.ambiguous.join(" ")).toContain("different nets")
})

test("a net of degree 4 drawn as a tree needs a junction at every branch point", () => {
  const t = canonicalTopology(fourWayFan(), NO_PINS)
  expect(t.ok).toBe(true)
  expect(branchJunctions(t, NO_PINS).length).toBe(2)
})

test("a branch point with no emitted junction REFUSES", () => {
  const t = canonicalTopology(fourWayFan(), NO_PINS)
  expect(junctionProblems(t, NO_PINS, []).length).toBe(2)
  // And emitting exactly the required ones leaves no problem, so the count above is not vacuous.
  expect(junctionProblems(t, NO_PINS, branchJunctions(t, NO_PINS))).toEqual([])
})

test("a junction emitted where no net branches is a problem too", () => {
  const t = canonicalTopology(fourWayFan(), NO_PINS)
  const stray = [...branchJunctions(t, NO_PINS), { x: G(100), y: G(100) }]
  const problems = junctionProblems(t, NO_PINS, stray)
  expect(problems.length).toBe(1)
  expect(problems[0] ?? "").toContain("no net's branch point")
})

test("two different nets meeting at a point are a crossing, and carry no junction", () => {
  const t = canonicalTopology(twoNetsCrossing(), NO_PINS)
  expect(t.ok).toBe(true)
  expect(crossings(t).length).toBe(1)
  expect(branchJunctions(t, NO_PINS)).toEqual([])
  // And a junction emitted AT that crossing is reported as the short it would be.
  const problems = junctionProblems(t, NO_PINS, crossings(t))
  expect(problems.length).toBe(1)
  expect(problems[0] ?? "").toContain("DIFFERENT nets")
})

test("a same-net X is a branch and NOT a crossing, which is the distinction stated the other way", () => {
  const t = canonicalTopology(
    layout([
      { a: { x: 0, y: G(2) }, b: { x: G(6), y: G(2) }, net: "A" },
      { a: { x: G(3), y: 0 }, b: { x: G(3), y: G(5) }, net: "A" },
    ]),
    NO_PINS,
  )
  expect(t.ok).toBe(true)
  if (!t.ok) return
  expect(crossings(t)).toEqual([])
  expect(branchJunctions(t, NO_PINS)).toEqual([{ x: G(3), y: G(2) }])
})

test("a branch classified at-pin-end against pins that do not hold it REFUSES, naming the point", () => {
  const { l, pins } = branchOnPinEnd()
  const t = canonicalTopology(l, pins)
  expect(t.ok).toBe(true)
  // The defect this catches: the topology was built from one placement set and the junctions are
  // being asked for against another, so a junction would land where a pin no longer is.
  expect(() => branchJunctions(t, NO_PINS)).toThrow(/different placements/)
  expect(() => junctionProblems(t, NO_PINS, [])).toThrow(/different placements/)
})

test("a refused topology answers nothing rather than answering emptily", () => {
  const t = canonicalTopology(partiallyOverlappingSegments(), NO_PINS)
  expect(t.ok).toBe(false)
  expect(branchJunctions(t, NO_PINS)).toEqual([])
  expect(crossings(t)).toEqual([])
  // ... and asking what to emit says so, rather than returning "no problems".
  expect(junctionProblems(t, NO_PINS, []).length).toBe(1)
  expect(junctionProblems(t, NO_PINS, [])[0] ?? "").toContain("was refused")
})

/**
 * **THE DUPLICATED RULE, ASSERTED EQUAL.** `junctions.ts`'s `collinearOverlap` is a re-derivation of
 * `wire-safety.ts`'s, which is module-private there. The criterion is that a collinear overlap is
 * decided by ONE rule; the mechanism available without diverging a tenth ported file is two copies,
 * so this is what holds them in step - the same four shapes `tests/schgen/render/wire-safety.test.ts`
 * uses for its collinear case, each asserted to reach the same verdict here.
 */
test("the collinear-overlap rule agrees with wire-safety's, shape for shape", () => {
  const overlapping = canonicalTopology(partiallyOverlappingSegments(), NO_PINS)
  expect(overlapping.ok).toBe(false)
  // Touching at a point is NOT an overlap: two segments meeting end to end are a corner.
  const endToEnd = canonicalTopology(
    layout([
      { a: { x: 0, y: 0 }, b: { x: G(2), y: 0 }, net: "A" },
      { a: { x: G(2), y: 0 }, b: { x: G(4), y: 0 }, net: "A" },
    ]),
    NO_PINS,
  )
  expect(endToEnd.ok).toBe(true)
  // Parallel but not collinear is not an overlap either.
  const parallel = canonicalTopology(
    layout([
      { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "A" },
      { a: { x: 0, y: G(1) }, b: { x: G(4), y: G(1) }, net: "A" },
    ]),
    NO_PINS,
  )
  expect(parallel.ok).toBe(true)
  // Perpendicular crossing is not an overlap: it is a point contact, handled as a branch.
  const perpendicular = canonicalTopology(
    layout([
      { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "A" },
      { a: { x: G(2), y: -G(1) }, b: { x: G(2), y: G(1) }, net: "A" },
    ]),
    NO_PINS,
  )
  expect(perpendicular.ok).toBe(true)
})
