/**
 * THE LOOP ROUND THE IC, and the figure it reads.
 *
 * Task 9's review measured the first version of this figure at 0.593 on a pour
 * with no break in it - the loop crossed the IC's own sixteen pad voids - and the
 * same loop 0.3 mm further out at exactly 1.0000, and no test moved when the loop
 * did. Every single-region fixture then had its courtyard at least 0.7 mm clear
 * of every void, so the normal case for a through-hole board was never built.
 * These fixtures put reliefs on every pad of the IC and then place the loop from
 * both sides: it must clear the voids, and it must not run so far out that it
 * reads a different part of the board.
 *
 * Numbers against fixtures, never a verdict. `./pour-fixtures.ts` has the geometry:
 * U1's pads at (30, 18) and (30, 24), copper radius 0.8, voids to 1.3, so the pad
 * extent is x 29.2..30.8 by y 17.2..24.8 and the loop, grown by clearance 0.5 plus
 * thermal gap 0.5, is x 28.2..31.8 by y 16.2..25.8.
 */
import { test, expect } from "bun:test"
import type { Pt } from "../../tools/pcb/pour-geometry.ts"
import { OPEN_PLACE, RECTANGLE, fixtureBoard } from "./pour-fixtures.ts"
import { measure, near, reasonOf, valueOf } from "./pour-helpers.ts"

const FOUR = { "U1-3": 4, "U1-4": 4, "C1-2": 4 } as const

function loopOf(text: string, layer = "F.Cu") {
  const loop = valueOf(measure(text).continuityAroundIc).get(layer)
  if (loop === undefined) throw new Error(`no continuity reading on ${layer}`)
  return loop
}

test("on an unbroken pour with a relief round every pad of the IC the loop reads full coverage and no break", () => {
  const loop = loopOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, spokes: FOUR }))
  expect(loop.coveredFraction).toBe(1)
  expect(loop.breaksMm).toEqual([])
  expect(loop.polygonsTouched).toBe(1)
})

test("the loop is placed 1.0 mm outside the pad extent: the zone's clearance 0.5 plus its thermal gap 0.5", () => {
  // The two are each 0.5, so a loop placed by either alone reads 0.5 and is caught; only the sum reads 1.0.
  expect(loopOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, spokes: FOUR })).offsetMm).toBe(1)
  expect(loopOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, spokes: FOUR, clearance: 0.3 })).offsetMm).toBeCloseTo(0.8, 9)
})

test("the loop is not placed so far out that it reads a neighbouring part of the board", () => {
  // A slot from x 31.9 to 32.4: clear of the loop's right edge at 31.8, in the way of one at 32.1 or beyond.
  const slotted: readonly (readonly Pt[])[] = [
    [[0, 0], [31.9, 0], [31.9, 40], [0, 40]],
    [[32.4, 0], [60, 0], [60, 40], [32.4, 40]],
  ]
  const loop = loopOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": slotted } }))
  expect(loop.coveredFraction).toBe(1)
  expect(loop.polygonsTouched).toBe(1)
})

test("a slot across the loop is a break of its own width on each edge it crosses", () => {
  // The slot at x 30.52..31.51 cuts the loop's top and bottom edges, 0.99 mm each. The loop is 26.4 mm round.
  const split: readonly (readonly Pt[])[] = [
    [[0, 0], [30.52, 0], [30.52, 40], [0, 40]],
    [[31.51, 0], [60, 0], [60, 40], [31.51, 40]],
  ]
  const loop = loopOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": split } }))
  expect(loop.breaksMm.length).toBe(2)
  for (const b of loop.breaksMm) near(b, 0.99, 0.06)
  near(loop.coveredFraction, 1 - 1.98 / 26.4, 0.01)
  // The covered parts of the loop are on two separate pieces of copper.
  expect(loop.polygonsTouched).toBe(2)
})

test("one break and fifty breaks are told apart, though they cover the same fraction", () => {
  // The same 1.0 mm of loop lost on each of the top and bottom edges: once as one 1.0 mm slot, once as five 0.2 mm gaps.
  const one: readonly (readonly Pt[])[] = [
    [[0, 0], [30.0, 0], [30.0, 40], [0, 40]],
    [[31.0, 0], [60, 0], [60, 40], [31.0, 40]],
  ]
  const edges = [28.3, 28.95, 29.6, 30.25, 30.9, 31.55]
  const shredded: (readonly Pt[])[] = [[[0, 0], [28.3, 0], [28.3, 40], [0, 40]]]
  for (let i = 0; i + 1 < edges.length; i += 1) {
    const x = (edges[i] ?? 0) + 0.2
    const x1 = edges[i + 1] ?? 0
    shredded.push([[x, 0], [x1, 0], [x1, 40], [x, 40]])
  }
  shredded.push([[31.75, 0], [60, 0], [60, 40], [31.75, 40]])
  const a = loopOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": one } }))
  const b = loopOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": shredded } }))
  expect(a.breaksMm.length).toBe(2)
  expect(b.breaksMm.length).toBeGreaterThanOrEqual(10)
  expect(Math.max(...b.breaksMm)).toBeLessThan(0.3)
  expect(b.polygonsTouched).toBeGreaterThan(a.polygonsTouched)
  // And they are NOT told apart by the covered fraction alone, which is the point of reporting the rest.
  near(b.coveredFraction, a.coveredFraction, 0.03)
})

test("a zone that declares no clearance gives no loop, and says why; the other figures stand", () => {
  const metrics = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, spokes: FOUR, clearance: null }))
  expect(reasonOf(metrics.continuityAroundIc)).toContain("clearance")
  expect(valueOf(metrics.spokesByGroundPad).size).toBe(3)
})

test("the loop is placed round ALL of the IC's pads, whatever their nets: a pad on a signal net widens it", () => {
  // A band of no copper at x 28.0..28.4 cuts the loop's left edge (x 28.2) when only the two ground pads are counted.
  // With a third pad 3 mm to the left the loop's left edge is at 25.2, clear of the band, and the band cuts only the top and bottom.
  const banded: readonly (readonly Pt[])[] = [
    [[0, 0], [28.0, 0], [28.0, 40], [0, 40]],
    [[28.4, 0], [60, 0], [60, 40], [28.4, 40]],
  ]
  const loop = loopOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": banded }, u1ExtraPad: true }))
  expect(loop.breaksMm.length).toBe(2)
  for (const b of loop.breaksMm) near(b, 0.4, 0.06)
})

test("a pad's size and the turn of its footprint change the loop: the same band reads differently for a 3.0 mm oval turned and not", () => {
  const near_ = (text: string) => loopOf(text)
  // The band across x 29.0..29.2 cuts the left edge of a loop grown from narrow (1.6 mm) pads and not that of a loop grown from wide ones.
  const band: readonly (readonly Pt[])[] = [
    [[0, 0], [29.0, 0], [29.0, 40], [0, 40]],
    [[29.2, 0], [60, 0], [60, 40], [29.2, 40]],
  ]
  const upright = near_(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": band }, padShape: "oval", u1Turn: { degrees: 90, padSize: "3.0 1.6" } }))
  const flat = near_(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": band }, padShape: "oval", u1Turn: { degrees: 0, padSize: "3.0 1.6" } }))
  // Turned 90 degrees the pads are 1.6 wide in x and the footprint also turns; at 0 they are 3.0 wide in x.
  // Their loops are different sizes, so the same band reads differently. (That they differ is all this asserts:
  // the angle and sign of the rotation are pinned against hand-worked figures in ./pour-geometry.test.ts.)
  expect(upright.breaksMm).not.toEqual(flat.breaksMm)
})

test("breaks are listed longest first, and the longest is the one a reader looks at", () => {
  // A vertical gap x 30.0..31.0 cuts the top and bottom edges (1.0 mm each); a horizontal gap y 20.0..20.3 cuts the left and right (0.3 each).
  const quadrants: readonly (readonly Pt[])[] = [
    [[0, 0], [30.0, 0], [30.0, 20.0], [0, 20.0]],
    [[31.0, 0], [60, 0], [60, 20.0], [31.0, 20.0]],
    [[0, 20.3], [30.0, 20.3], [30.0, 40], [0, 40]],
    [[31.0, 20.3], [60, 20.3], [60, 40], [31.0, 40]],
  ]
  const breaks = loopOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": quadrants } })).breaksMm
  expect(breaks.length).toBe(4)
  near(breaks[0], 1.0, 0.06)
  near(breaks[1], 1.0, 0.06)
  near(breaks[2], 0.3, 0.06)
  near(breaks[3], 0.3, 0.06)
})

test("a loop with no copper under it is one break the length of the loop, covered 0, touching nothing", () => {
  const far: readonly (readonly Pt[])[] = [[[0, 0], [5, 0], [5, 5], [0, 5]]]
  const loop = loopOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": far } }))
  expect(loop.coveredFraction).toBe(0)
  expect(loop.polygonsTouched).toBe(0)
  expect(loop.breaksMm.length).toBe(1)
  near(loop.breaksMm[0], 26.4, 0.1)
})

test("a break that runs across the start of the walk is one break, not two", () => {
  // The band x 28.0..28.4 holds the loop's whole left edge (x 28.2) and the first and last 0.2 mm of the top and bottom edges.
  const band: readonly (readonly Pt[])[] = [
    [[0, 0], [28.0, 0], [28.0, 40], [0, 40]],
    [[28.4, 0], [60, 0], [60, 40], [28.4, 40]],
  ]
  const loop = loopOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": band } }))
  expect(loop.breaksMm.length).toBe(1)
  near(loop.breaksMm[0], 10.0, 0.15)
})
