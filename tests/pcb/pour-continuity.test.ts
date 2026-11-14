/**
 * THE LOOPS ROUND THE IC, and what the continuity figure reads from them.
 *
 * The figure went wrong twice. The courtyard box sat inside U1's own pad voids and
 * read 0.593 on an unbroken pour; a loop placed from declared clearances then
 * moved with configuration and not with the pour - 0.4221 with a second zone,
 * 0.9563 with a pad-local clearance, 0.7746 with a conditioned rule, each on an
 * unbroken plane. The figure now reads NO clearance: it walks a band of loops out
 * from the pad extent, reports all of them, and puts first the one with
 * the least of the way round uncovered. These fixtures put reliefs round every pad
 * of the IC, at three depths, and a real break across all of them.
 *
 * Numbers against fixtures, never a verdict. `./pour-fixtures.ts` has the geometry:
 * U1's pads at (30, 18) and (30, 24), copper radius 0.8, so the pad extent is
 * x 29.2..30.8 by y 17.2..24.8, and loops are walked every 0.25 mm out to 3 mm.
 * The real-KiCad cases for the three configurations are in `./pour-refill.test.ts`.
 */
import { test, expect } from "bun:test"
import type { Pt } from "../../tools/pcb/pour-geometry.ts"
import { LOOP_BAND, padExtent } from "../../tools/pcb/pour-continuity.ts"
import type { BoardPad } from "../../tools/pcb/pour-read-pads.ts"
import { OPEN_PLACE, RECTANGLE, fixtureBoard } from "./pour-fixtures.ts"
import { measure, near, reasonOf, valueOf } from "./pour-helpers.ts"

const FOUR = { "U1-3": 4, "U1-4": 4, "C1-2": 4 } as const

function continuityOf(text: string, layer = "F.Cu") {
  const loops = valueOf(measure(text).continuityAroundIc).get(layer)
  if (loops === undefined) throw new Error(`no continuity reading on ${layer}`)
  return loops
}

const leastUncoveredOf = (text: string, layer = "F.Cu") => continuityOf(text, layer).leastUncovered

/** The offset of the nearest loop with nothing uncovered. */
function firstWhole(profile: readonly { readonly offsetMm: number; readonly uncoveredMm: number }[]): number {
  const whole = profile.find((l) => l.uncoveredMm === 0)
  if (whole === undefined) throw new Error("no loop in the band is whole")
  return whole.offsetMm
}

// --- The band: an unbroken pour, with the IC's own voids at three depths -----

test("on an unbroken pour with a relief round every pad the least-uncovered loop reads full coverage, and the loop at the pad extent shows the IC's own voids", () => {
  const loops = continuityOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, spokes: FOUR }))
  expect(loops.leastUncovered.coveredFraction).toBe(1)
  expect(loops.leastUncovered.breaksMm).toEqual([])
  expect(loops.leastUncovered.uncoveredMm).toBe(0)
  // Several loops are whole; ties go to the nearest one.
  expect(loops.leastUncovered.offsetMm).toBe(firstWhole(loops.profile))
  expect(loops.profile.filter((l) => l.uncoveredMm === 0).length).toBeGreaterThan(1)
  // The loop at the pad extent itself crosses the voids; that is the 0.593 the first version reported as the pour.
  const inner = loops.profile[0]
  expect(inner?.offsetMm).toBe(0)
  expect(inner?.coveredFraction).toBeLessThan(0.9)
  // And the band is the one stated, walked in full.
  expect(loops.bandMm).toEqual({ fromMm: 0, toMm: 3, stepMm: 0.25 })
  expect(loops.profile.map((l) => l.offsetMm)).toEqual([0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3])
  expect(LOOP_BAND).toEqual(loops.bandMm)
})

test("a deeper void - what a larger clearance cuts - still leaves a loop in the band clear of it, with no clearance read anywhere", () => {
  // Voids reaching 1.2 mm past the pad copper: the loops nearer than that read them, and the least-uncovered loop is one beyond.
  const loops = continuityOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, spokes: FOUR, voidMm: 1.2 }))
  expect(loops.leastUncovered.coveredFraction).toBe(1)
  expect(loops.leastUncovered.offsetMm).toBeGreaterThanOrEqual(1.25)
  expect(loops.leastUncovered.offsetMm).toBe(firstWhole(loops.profile))
  expect(loops.profile[0]?.coveredFraction).toBeLessThan(0.9)
})

test("a void deeper than the band reaches is read as a break on every loop: the band's limit is real, and the profile shows it", () => {
  // One pad's void reaching 3.5 mm past its copper; the outermost loop is 3.0 mm out, 3.8 mm from the pad's centre.
  const loops = continuityOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, spokes: { "U1-3": 4 }, voidMm: 3.5 }))
  for (const loop of loops.profile) expect(loop.coveredFraction).toBeLessThan(1)
  expect(loops.leastUncovered.coveredFraction).toBeLessThan(1)
})

test("nothing a clearance could be read from changes the figure: the zone's own value, or a second zone with another", () => {
  // Voids reaching 0.9 mm past the pad: a loop placed from a clearance of 0.75 would sit inside them (it read 0.6680), one placed from 1.0 would not.
  const base = fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, spokes: FOUR, voidMm: 0.9 })
  const wide = base.replace("(clearance 0.5)", "(clearance 9)")
  const narrow = base.replace("(clearance 0.5)", "(clearance 0.05)")
  expect(wide).not.toBe(base)
  expect(JSON.stringify(continuityOf(wide))).toBe(JSON.stringify(continuityOf(base)))
  expect(JSON.stringify(continuityOf(narrow))).toBe(JSON.stringify(continuityOf(base)))
  // A second ground zone on the layer, 20 mm from the IC, declaring a clearance of its own.
  const second = [
    '\t(zone (net "GND") (layers "F.Cu") (uuid "dddddddd-0000-4000-8000-000000000001") (name "SYNTHETIC:second-ground")',
    "\t\t(connect_pads (clearance 0.05)) (fill yes (thermal_gap 0.5) (thermal_bridge_width 0.5))",
    "\t\t(polygon (pts (xy 50 0) (xy 58 0) (xy 58 8) (xy 50 8)))",
    '\t\t(filled_polygon (layer "F.Cu") (pts (xy 50 0) (xy 58 0) (xy 58 8) (xy 50 8))))',
  ].join("\n")
  const withSecond = fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, spokes: FOUR, voidMm: 0.9, extraZones: [second] })
  expect(continuityOf(withSecond).leastUncovered).toEqual(continuityOf(base).leastUncovered)
})

// --- A real break depresses the whole band ----------------------------------

const SPLIT: readonly (readonly Pt[])[] = [
  [[0, 0], [30.52, 0], [30.52, 40], [0, 40]],
  [[31.51, 0], [60, 0], [60, 40], [31.51, 40]],
]

test("a slot across the pour is a break on every loop clear of it, of its own width on each edge it crosses", () => {
  // The slot x 30.52..31.51 cuts the top and bottom edges, 0.99 mm each, of every loop whose right edge is past it.
  const loops = continuityOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": SPLIT } }))
  expect(loops.leastUncovered.breaksMm.length).toBe(2)
  for (const b of loops.leastUncovered.breaksMm) near(b, 0.99, 0.06)
  near(loops.leastUncovered.uncoveredMm, 1.98, 0.1)
  // The nearest such loop wins the tie: its right edge at 30.8 + 0.75 = 31.55 is the first past the slot.
  expect(loops.leastUncovered.offsetMm).toBe(0.75)
  // Not one loop in the band is whole.
  for (const loop of loops.profile) expect(loop.uncoveredMm).toBeGreaterThan(1.9)
  expect(loops.leastUncovered.fillPiecesTouched).toBe(2)
  expect(loops.leastUncovered.connectedGroupsTouched).toBe(2)
})

test("one break and many breaks are told apart, though they cover a similar fraction", () => {
  // One 1.0 mm slot at x 30..31, against six 0.2 mm gaps between x 28.3 and 31.75.
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
  const a = leastUncoveredOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": one } }))
  const b = leastUncoveredOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": shredded } }))
  expect(a.breaksMm.length).toBe(2)
  expect(b.breaksMm.length).toBeGreaterThan(a.breaksMm.length)
  expect(Math.max(...b.breaksMm)).toBeLessThan(0.3)
  expect(b.fillPiecesTouched).toBeGreaterThan(a.fillPiecesTouched)
  near(b.coveredFraction, a.coveredFraction, 0.08)
  // Further out the same pour is cut into many more pieces, and the profile carries them.
  const profile = continuityOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": shredded } })).profile
  expect(Math.max(...profile.map((l) => l.breaksMm.length))).toBeGreaterThanOrEqual(8)
})

test("a break that dead-ends INSIDE the band cuts only the loops beyond its end: the least-uncovered loop reads whole and the profile does not", () => {
  // A 0.3 mm slot from the left edge to x = 27.2, which is 2.0 mm short of the pad extent (x 29.2). Loops 2.25 mm out and beyond
  // have their left edge past the slot's end, and cross it; loops nearer than that do not reach it.
  const slotted: readonly (readonly Pt[])[] = [[[0, 0], [60, 0], [60, 40], [0, 40], [0, 21.0], [27.2, 21.0], [27.2, 20.7], [0, 20.7]]]
  const loops = continuityOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": slotted } }))
  // The headline reads whole, with nothing in its breaks: a consumer reading only it would see no break.
  expect(loops.leastUncovered.uncoveredMm).toBe(0)
  expect(loops.leastUncovered.breaksMm).toEqual([])
  // The profile is where the break is.
  for (const loop of loops.profile.filter((l) => l.offsetMm <= 1.75)) expect(loop.uncoveredMm).toBe(0)
  const beyond = loops.profile.filter((l) => l.offsetMm >= 2.25)
  expect(beyond.length).toBe(4)
  for (const loop of beyond) {
    expect(loop.breaksMm.length).toBe(1)
    near(loop.breaksMm[0], 0.3, 0.06)
  }
})

test("breaks are listed longest first", () => {
  // A vertical gap x 30.0..31.0 cuts top and bottom (1.0 mm each); a horizontal gap y 20.0..20.3 cuts left and right (0.3 each).
  const quadrants: readonly (readonly Pt[])[] = [
    [[0, 0], [30.0, 0], [30.0, 20.0], [0, 20.0]],
    [[31.0, 0], [60, 0], [60, 20.0], [31.0, 20.0]],
    [[0, 20.3], [30.0, 20.3], [30.0, 40], [0, 40]],
    [[31.0, 20.3], [60, 20.3], [60, 40], [31.0, 40]],
  ]
  const breaks = leastUncoveredOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": quadrants } })).breaksMm
  expect(breaks.length).toBe(4)
  near(breaks[0], 1.0, 0.06)
  near(breaks[1], 1.0, 0.06)
  near(breaks[2], 0.3, 0.06)
  near(breaks[3], 0.3, 0.06)
})

test("a loop with no copper under it is one break the length of the loop, covered 0, touching nothing", () => {
  const far: readonly (readonly Pt[])[] = [[[0, 0], [5, 0], [5, 5], [0, 5]]]
  const loops = continuityOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": far } }))
  expect(loops.leastUncovered.coveredFraction).toBe(0)
  expect(loops.leastUncovered.fillPiecesTouched).toBe(0)
  expect(loops.leastUncovered.connectedGroupsTouched).toBe(0)
  // Every loop is wholly uncovered, so the nearest wins: the pad extent's own 18.4 mm round.
  expect(loops.leastUncovered.offsetMm).toBe(0)
  expect(loops.leastUncovered.breaksMm.length).toBe(1)
  near(loops.leastUncovered.breaksMm[0], 18.4, 0.1)
})

test("a break that runs across the start of the walk is one break, not two", () => {
  // An L-shaped pour with x < 30, y < 18 removed: it holds the walk's start corner (x0, y0) of every loop.
  const elbow: readonly (readonly Pt[])[] = [[[30, 0], [60, 0], [60, 40], [0, 40], [0, 18], [30, 18]]]
  const loop = leastUncoveredOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": elbow } }))
  expect(loop.breaksMm.length).toBe(1)
  // At the pad extent: 0.8 mm of top edge and 0.8 mm of left edge either side of the corner.
  near(loop.breaksMm[0], 1.6, 0.1)
})

test("with no footprint of the IC's reference there is nothing to walk round, and the other figures stand", () => {
  const metrics = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, spokes: FOUR, refs: { u1: "U9" } }))
  expect(reasonOf(metrics.continuityAroundIc)).toContain("no part to walk a loop around")
  expect(valueOf(metrics.spokesByGroundPad).size).toBe(3)
})

// --- What the loops are walked round -----------------------------------------

function pad(x: number, y: number, hx: number, hy: number, degrees = 0): BoardPad {
  return { ref: "U1", number: "1", type: "thru_hole", net: null, layers: ["F.Cu"], outline: { centre: [x, y], hx, hy, radius: Math.min(hx, hy), degrees } }
}

test("the pad extent is the box round the copper of every pad, whatever its net, size or turn", () => {
  const box = padExtent([pad(10, 10, 0.8, 0.8), pad(10, 16, 0.8, 0.8)])
  expect([box.x0, box.y0, box.x1, box.y1].map((v) => Math.round(v * 1000) / 1000)).toEqual([9.2, 9.2, 10.8, 16.8])
  // A 3.0 x 1.6 oval is 3.0 wide, and the same pad turned 90 degrees is 3.0 tall.
  const flat = padExtent([pad(10, 10, 1.5, 0.8, 0)])
  const upright = padExtent([pad(10, 10, 1.5, 0.8, 90)])
  expect([flat.x1 - flat.x0, flat.y1 - flat.y0].map((v) => Math.round(v * 100) / 100)).toEqual([3, 1.6])
  expect([upright.x1 - upright.x0, upright.y1 - upright.y0].map((v) => Math.round(v * 100) / 100)).toEqual([1.6, 3])
})

test("an IC pad on a signal net widens the extent the loops are walked from", () => {
  const withSignal = leastUncoveredOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": SPLIT }, u1ExtraPad: true }))
  const without = leastUncoveredOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": SPLIT } }))
  // The extra pad 3 mm to the left makes every loop longer, so the same two slot crossings are the same length on a longer walk.
  expect(withSignal.breaksMm.length).toBe(2)
  expect(withSignal.coveredFraction).toBeGreaterThan(without.coveredFraction)
})

// --- Coverage and connectedness, side by side --------------------------------

const via = (x: number): string =>
  `\t(via (at ${x} 10) (size 0.8) (drill 0.4) (layers "F.Cu" "B.Cu") (net "GND") (uuid "eeeeeeee-0000-4000-8000-000000000001"))`

test("two pieces of fill the loop touches are isolated when nothing joins them: pieces 2, groups 2", () => {
  const loop = leastUncoveredOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": SPLIT } }))
  expect(loop.fillPiecesTouched).toBe(2)
  expect(loop.connectedGroupsTouched).toBe(2)
})

test("the same two pieces are one group when a ground track joins them: pieces 2, groups 1", () => {
  const loop = leastUncoveredOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": SPLIT }, track: { from: [20, 10], to: [40, 10], layer: "F.Cu" } }))
  expect(loop.fillPiecesTouched).toBe(2)
  expect(loop.connectedGroupsTouched).toBe(1)
})

test("vias join them through the other layer's fill, but only when each piece has one", () => {
  const board = (vias: readonly string[]) => leastUncoveredOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": SPLIT, "B.Cu": [RECTANGLE] }, extraZones: vias, padType: "smd" }))
  // One via ties only the right piece to B.Cu: the left is still on its own.
  expect(board([via(45)]).connectedGroupsTouched).toBe(2)
  expect(board([via(45), via(10)]).connectedGroupsTouched).toBe(1)
  expect(board([via(45), via(10)]).fillPiecesTouched).toBe(2)
})

test("through-hole ground pads join the fill they sit in on every layer, so a solid back plane joins a split front", () => {
  const loop = leastUncoveredOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": SPLIT, "B.Cu": [RECTANGLE] } }))
  expect(loop.fillPiecesTouched).toBe(2)
  expect(loop.connectedGroupsTouched).toBe(1)
})

// --- The result carries numbers and nothing else ----------------------------

test("a continuity reading carries measurements and no verdict, down to the loop: its fields are pinned", () => {
  const loops = continuityOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, spokes: FOUR }))
  expect(Object.keys(loops).sort()).toEqual(["bandMm", "leastUncovered", "profile"])
  expect(Object.keys(loops.bandMm).sort()).toEqual(["fromMm", "stepMm", "toMm"])
  const fields = ["breaksMm", "connectedGroupsTouched", "coveredFraction", "fillPiecesTouched", "offsetMm", "uncoveredMm"]
  expect(Object.keys(loops.leastUncovered).sort()).toEqual(fields)
  for (const loop of loops.profile) expect(Object.keys(loop).sort()).toEqual(fields)
})

test("the extent of no pads is refused outright, so removing the caller's own check fails fast and does not hang", () => {
  expect(() => padExtent([])).toThrow("no pads")
})
