/**
 * WHAT JOINS SEPARATE PIECES OF THE POUR, and the figure called a bridge.
 *
 * `docs/known-gaps.md` G313 records the owner being asked about "the narrowest
 * bridge between pour regions". The first version of `narrowestBridgeMm` read
 * the narrowest constriction INSIDE one solid pour - 2.45 mm on a plane with no
 * bridge in it - and read nothing at all when the pour really was in two
 * pieces. These tests pin the figure to the owner's own words: it is a track
 * between regions, it is absent with a stated reason when the regions are not
 * joined or there are none, and the fill's constriction is a separate figure.
 *
 * The fixtures split the pour at a slot x 30.52..31.51 (see `./pour-fixtures.ts`).
 * Numbers against fixtures, never a verdict.
 */
import { test, expect } from "bun:test"
import type { Pt } from "../../tools/pcb/pour-geometry.ts"
import { OPEN_PLACE, RECTANGLE, fixtureBoard } from "./pour-fixtures.ts"
import type { TrackSpec } from "./pour-fixtures.ts"
import { measure, reasonOf, refusalOf, valueOf } from "./pour-helpers.ts"

const SPLIT: readonly (readonly Pt[])[] = [
  [[0, 0], [30.52, 0], [30.52, 40], [0, 40]],
  [[31.51, 0], [60, 0], [60, 40], [31.51, 40]],
]

const board = (track: TrackSpec | readonly TrackSpec[] | undefined, extra: readonly string[] = []) =>
  fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": SPLIT }, ...(track === undefined ? {} : { track }), extraZones: extra })

test("two separate pieces of fill with nothing joining them have no bridge to report, and the reason says they are unjoined", () => {
  const metrics = measure(board(undefined))
  expect(metrics.regionsByLayer.get("F.Cu")).toBe(2)
  const reason = reasonOf(metrics.narrowestBridgeMm)
  expect(reason).toContain("separate pieces")
  expect(reason).toContain("no ground track joins")
  expect(metrics.regionJoins).toEqual([])
  // This is the case the first version read as `null` beside a region count of 2 - absence as reassurance.
})

test("a ground track from one piece to the other is the bridge, at its own width", () => {
  const metrics = measure(board({ from: [20, 10], to: [40, 10], layer: "F.Cu" }))
  expect(valueOf(metrics.narrowestBridgeMm)).toBe(0.5)
  expect(metrics.regionJoins).toEqual([{ layer: "F.Cu", polygons: [0, 1], widthMm: 0.5 }])
})

test("a chain of tracks that share an endpoint joins what neither does alone, at the narrowest track in the chain", () => {
  // The first ends in the slot, the second starts there: neither touches both pieces of fill.
  const metrics = measure(board([
    { from: [20, 10], to: [31, 10], layer: "F.Cu" },
    { from: [31, 10], to: [40, 10], layer: "F.Cu", width: 0.3 },
  ]))
  expect(metrics.regionJoins.length).toBe(1)
  expect(metrics.regionJoins[0]?.polygons).toEqual([0, 1])
  expect(valueOf(metrics.narrowestBridgeMm)).toBe(0.3)
})

test("an arc is a join too, and the narrowest join over several is the figure", () => {
  const metrics = measure(board([
    { from: [20, 10], to: [40, 10], layer: "F.Cu", arc: true },
    { from: [20, 30], to: [40, 30], layer: "F.Cu", width: 0.8 },
  ]))
  expect(metrics.regionJoins.length).toBe(2)
  expect(valueOf(metrics.narrowestBridgeMm)).toBe(0.5)
})

test("a track inside one piece, or on another net, joins nothing", () => {
  const inside = measure(board({ from: [5, 10], to: [25, 10], layer: "F.Cu" }))
  expect(inside.regionJoins).toEqual([])
  expect(reasonOf(inside.narrowestBridgeMm)).toContain("no ground track joins")
  const signal = measure(board({ from: [20, 10], to: [40, 10], layer: "F.Cu", net: "SIG" }))
  expect(signal.regionJoins).toEqual([])
})

test("on a pour that is one piece a track is not a bridge, whatever it touches", () => {
  const metrics = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, track: { from: [10, 10], to: [20, 10], layer: "F.Cu" } }))
  expect(reasonOf(metrics.narrowestBridgeMm)).toContain("no separate regions")
})

test("with two layers split, the bridge figure is the narrowest join on either", () => {
  const metrics = measure(fixtureBoard({
    place: OPEN_PLACE,
    pour: { "F.Cu": SPLIT, "B.Cu": SPLIT },
    track: [
      { from: [20, 10], to: [40, 10], layer: "F.Cu" },
      { from: [20, 10], to: [40, 10], layer: "B.Cu", width: 0.3 },
    ],
  }))
  expect(metrics.regionJoins.map((j) => [j.layer, j.widthMm])).toEqual([["F.Cu", 0.5], ["B.Cu", 0.3]])
  expect(valueOf(metrics.narrowestBridgeMm)).toBe(0.3)
})

test("a dead-end stub off a bridge does not narrow it: two 0.5 mm tracks bridging the pieces read 0.5 with a 0.2 mm stub on their shared end", () => {
  const bridge: readonly TrackSpec[] = [
    { from: [20, 10], to: [31, 10], layer: "F.Cu" },
    { from: [31, 10], to: [40, 10], layer: "F.Cu" },
  ]
  expect(valueOf(measure(board(bridge)).narrowestBridgeMm)).toBe(0.5)
  const stubbed = measure(board([...bridge, { from: [31, 10], to: [31, 12], layer: "F.Cu", width: 0.2 }]))
  expect(valueOf(stubbed.narrowestBridgeMm)).toBe(0.5)
  expect(stubbed.regionJoins).toEqual([{ layer: "F.Cu", polygons: [0, 1], widthMm: 0.5 }])
  // And a chain whose own narrow link IS the bridge still reads that link.
  const thin = measure(board([{ from: [20, 10], to: [31, 10], layer: "F.Cu" }, { from: [31, 10], to: [40, 10], layer: "F.Cu", width: 0.3 }]))
  expect(valueOf(thin.narrowestBridgeMm)).toBe(0.3)
})

test("a ground via in fill on two layers links the polygons it sits in; a via in one polygon links nothing", () => {
  const via = (x: number): string =>
    `\t(via (at ${x} 10) (size 0.8) (drill 0.4) (layers "F.Cu" "B.Cu") (net "GND") (uuid "eeeeeeee-0000-4000-8000-000000000001"))`
  // F.Cu is split (polygons 0 and 1) and B.Cu is solid (polygon 2).
  const fixture = (x: number) => fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": SPLIT, "B.Cu": [RECTANGLE] }, extraZones: [via(x)] })
  expect(measure(fixture(45)).viaLinks).toEqual([{ at: [45, 10], polygons: [1, 2] }])
  expect(measure(fixture(10)).viaLinks).toEqual([{ at: [10, 10], polygons: [0, 2] }])
  // In the slot: in no F.Cu fill, so only B.Cu's polygon holds it, and there is nothing to link.
  expect(measure(fixture(31)).viaLinks).toEqual([])
})

test("a via links only the layers it pierces: a blind via does not reach a pour deeper in the stack", () => {
  const layers = (from: string, to: string): string =>
    `\t(via (at 45 10) (size 0.8) (drill 0.4) (layers "${from}" "${to}") (net "GND") (uuid "eeeeeeee-0000-4000-8000-000000000001"))`
  // F.Cu split (polygons 0 and 1), In2.Cu solid (polygon 2), In1.Cu and B.Cu not poured; the board declares B.Cu before the inner layers.
  const fixture = (via: string) =>
    fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": SPLIT, "In2.Cu": [RECTANGLE] }, innerLayers: true, extraZones: [via], padType: "smd" })
  expect(measure(fixture(layers("F.Cu", "In2.Cu"))).viaLinks).toEqual([{ at: [45, 10], polygons: [1, 2] }])
  expect(measure(fixture(layers("In2.Cu", "F.Cu"))).viaLinks).toEqual([{ at: [45, 10], polygons: [1, 2] }])
  // Blind F.Cu to In1.Cu stops short of In2.Cu; In1.Cu to B.Cu starts past F.Cu.
  expect(measure(fixture(layers("F.Cu", "In1.Cu"))).viaLinks).toEqual([])
  expect(measure(fixture(layers("In1.Cu", "B.Cu"))).viaLinks).toEqual([])
  // A via written with no layer span is not assumed to go all the way through.
  const spanless = '\t(via (at 45 10) (size 0.8) (drill 0.4) (net "GND") (uuid "eeeeeeee-0000-4000-8000-000000000001"))'
  expect(refusalOf(() => measure(fixture(spanless))).message).toContain("span")
})
