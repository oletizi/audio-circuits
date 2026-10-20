/**
 * SPEC §1.4 OBLIGATION 1, DRIVEN: SNAPPING IS CHECKED FOR IDENTITY COLLAPSE, NOT ASSUMED TO
 * PRESERVE IT.
 *
 * Hand-written for Task 13 of the M1 schematic-authoring plan. The three cases are the brief's own
 * - two distinct parallel segments onto one grid line, a layout already near the grid, and two nets
 * a sub-grid distance apart - plus the zero-length arm, which is the third way snapping destroys an
 * identity and which the brief does not name.
 *
 * **TWO OF THE BRIEF's FIXTURES, WRITTEN AS IT NAMES THEM, MEASURED `ok: true`**, and both
 * corrections are on the fixtures themselves and recorded in `docs/known-gaps.md`: half a grid step
 * does not merge under nearest-rounding, and a wire END snapping into another wire's INTERIOR does
 * not change `connectedComponents`' partition.
 *
 * **EVERY FIXTURE HERE IS BUILT BY HAND AND THAT IS DELIBERATE.** `snapToGrid`'s input is a
 * `BlockLayout`, which is three plain lists, and the geometry these tests are about is a sub-grid
 * offset - a shape no real circuit is guaranteed to produce on demand. Driving it from a real ELK run
 * would make the test depend on the router putting two segments a particular fraction of a
 * millimetre apart, which is not a property anything guarantees;
 * `tests/schgen/elk/adapt.test.ts` is where the real router's geometry goes through this function.
 */

import { expect, test } from "bun:test"
import { snapCoordinate, snapPoint, snapToGrid } from "../../../lib/schgen/elk/snap.ts"
import { GRID, onGrid } from "../../../lib/schgen/render/geometry.ts"
import type { BlockLayout } from "../../../lib/schgen/render/block-types.ts"

const HALF = GRID / 2

/**
 * Two horizontal segments of two nets, closer together than half a grid step: they snap onto one
 * line.
 *
 * **THE BRIEF CALLS THIS FIXTURE `twoSegmentsHalfAGridApart` AND HALF A GRID STEP DOES NOT MERGE** -
 * measured, and the deviation is recorded in `docs/known-gaps.md`. `snapCoordinate` takes the
 * NEAREST multiple, so y = 0 snaps to 0 and y = 635 snaps to 1270: two segments exactly half a grid
 * apart land on two ADJACENT grid lines and stay distinct. The shape the obligation is about is two
 * segments inside the same rounding bucket, which is strictly less than half a step apart. Writing
 * the fixture as the brief names it gave `ok: true` and a green test asserting nothing.
 */
function twoSegmentsWithinOneRoundingStep(): BlockLayout {
  return {
    placements: [],
    wires: [
      { a: { x: 0, y: 0 }, b: { x: 4 * GRID, y: 0 }, net: "A" },
      { a: { x: 0, y: 400 }, b: { x: 4 * GRID, y: 400 }, net: "B" },
    ],
    anchors: [],
  }
}

/** Every point already a whole number of grid steps away from the grid, bar a micrometre or two. */
function alreadyNearGrid(): BlockLayout {
  return {
    placements: [{ part: "R_A", unit: 1, at: { x: 3 * GRID + 2, y: 5 * GRID - 1 }, rot: 0 }],
    wires: [
      { a: { x: 2 * GRID + 1, y: 2 * GRID }, b: { x: 6 * GRID - 2, y: 2 * GRID }, net: "A" },
      { a: { x: 2 * GRID + 1, y: 7 * GRID }, b: { x: 6 * GRID - 2, y: 7 * GRID }, net: "B" },
    ],
    anchors: [{ net: "A", at: { x: 2 * GRID + 1, y: 2 * GRID }, side: "left" }],
  }
}

/**
 * Two nets whose geometries stay DISTINCT under snapping, so the only thing that can change is which
 * nets the geometry joins.
 *
 * Net `B`'s vertical stub ends a fraction of a grid step away from net `A`'s own END. Snapping
 * brings the two ENDS onto one point, and the two previously separate pieces become one connected
 * component: one component holding two nets where there were two holding one each.
 *
 * **IT IS TWO ENDS AND NOT AN END ON AN INTERIOR, AND THAT IS NOT AN ARBITRARY CHOICE.**
 * `connectedComponents` joins a wire to a wire only at coincident ENDS - its own module comment says
 * so, because *"a pin end or wire end on a wire's INTERIOR connects ONLY with a junction there"* and
 * `checkWireSafety` refuses that shape outright. A fixture whose stub snapped into the MIDDLE of the
 * other segment would therefore NOT change the partition, and the test would have passed for the
 * wrong reason. It was written that way first and measured `ok: true`.
 */
function twoNetsWithinOneRoundingStep(): BlockLayout {
  return {
    placements: [],
    wires: [
      { a: { x: 3 * GRID, y: 0 }, b: { x: 6 * GRID, y: 0 }, net: "A" },
      { a: { x: 3 * GRID + 400, y: 4 * GRID }, b: { x: 3 * GRID + 400, y: 400 }, net: "B" },
    ],
    anchors: [
      { net: "A", at: { x: 6 * GRID, y: 0 }, side: "right" },
      { net: "B", at: { x: 3 * GRID + 400, y: 4 * GRID }, side: "up" },
    ],
  }
}

/** One short segment whose two ends snap to the same grid point: the wire vanishes. */
function segmentShorterThanHalfAGrid(): BlockLayout {
  return {
    placements: [],
    wires: [{ a: { x: 5 * GRID - 100, y: 0 }, b: { x: 5 * GRID + 100, y: 0 }, net: "A" }],
    anchors: [],
  }
}

test("snapping two distinct parallel segments onto one grid line REFUSES", () => {
  const r = snapToGrid(twoSegmentsWithinOneRoundingStep())
  expect(r.ok).toBe(false)
  if (!r.ok) {
    expect(r.collapsed.join(" ")).toContain("wire 0")
    expect(r.collapsed.join(" ")).toContain("wire 1")
    expect(r.collapsed.join(" ")).toContain("same geometry")
  }
})

test("snapping that preserves identity returns every wire on the grid", () => {
  const r = snapToGrid(alreadyNearGrid())
  expect(r.ok).toBe(true)
  if (!r.ok) return
  // A zero-wire run would pass the loop below and say nothing, so the count is pinned first.
  expect(r.wires.length).toBe(2)
  for (const w of r.wires) {
    expect(onGrid(w.a)).toBe(true)
    expect(onGrid(w.b)).toBe(true)
  }
  expect(r.placements.length).toBe(1)
  for (const p of r.placements) expect(onGrid(p.at)).toBe(true)
  expect(r.anchors.length).toBe(1)
  for (const a of r.anchors) expect(onGrid(a.at)).toBe(true)
})

test("snapping that changes a net's membership REFUSES", () => {
  const input = twoNetsWithinOneRoundingStep()
  // The arm that makes this test about MEMBERSHIP and not about geometry: the two wires are still
  // two distinct segments after snapping, so the geometry half of the obligation is satisfied.
  const geometries = new Set(input.wires.map((w) => [snapPoint(w.a), snapPoint(w.b)].map((p) => `${p.x},${p.y}`).sort().join("|")))
  expect(geometries.size).toBe(2)
  const r = snapToGrid(input)
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.collapsed.join(" ")).toContain("which nets the geometry joins")
})

test("a wire snapping to zero length REFUSES rather than being dropped", () => {
  const r = snapToGrid(segmentShorterThanHalfAGrid())
  expect(r.ok).toBe(false)
  if (!r.ok) {
    expect(r.collapsed.join(" ")).toContain("wire 0")
    expect(r.collapsed.join(" ")).toContain("zero")
  }
})

test("an empty layout snaps to an empty layout, and that is not a refusal", () => {
  const r = snapToGrid({ placements: [], wires: [], anchors: [] })
  expect(r.ok).toBe(true)
})

test("snapCoordinate takes the nearest grid multiple, with the same half-step rule on both signs", () => {
  expect(snapCoordinate(0)).toBe(0)
  expect(snapCoordinate(GRID)).toBe(GRID)
  expect(snapCoordinate(GRID - 1)).toBe(GRID)
  expect(snapCoordinate(1)).toBe(0)
  expect(snapCoordinate(HALF)).toBe(GRID)
  expect(snapCoordinate(-HALF)).toBe(0)
  expect(snapCoordinate(-GRID - 1)).toBe(-GRID)
})
