/**
 * THE POUR MEASUREMENT, driven over boards whose copper is known.
 *
 * **EVERY ASSERTION HERE IS A MEASURED NUMBER AGAINST A FIXTURE, NEVER A
 * VERDICT.** "This fixture's narrowest bridge is 0.85 mm" is a fact about the
 * fixture; "this fixture fails" would be an acceptance criterion, and the owner
 * declined to set any (`docs/known-gaps.md` G313) while the standing rule is that
 * an agent may not author them for the artifact it is producing. So there is no
 * test below that compares a measurement to a limit, and the last-but-one test
 * pins the SET OF FIELDS a result carries so a `pass` or `ok` cannot be added
 * without this file noticing.
 *
 * The geometry behind each number is written out in `./pour-fixtures.ts`; the
 * expected values below are worked from it by hand, not read back from a run.
 */
import { test, expect } from "bun:test"
import { measureLayer } from "../../tools/pcb/pour-bridge.ts"
import { measurePour, measurePourText, POUR_GUARDS, PourRefusal } from "../../tools/pcb/pour.ts"
import type { PourGuard } from "../../tools/pcb/pour.ts"
import {
  LEFT_PLACE, OPEN_PLACE, RECTANGLE, dumbbell, fixtureBoard,
} from "./pour-fixtures.ts"

/** One spoke is 0.5 mm of arc on a ring of radius 1.05 mm. */
const PER_SPOKE = 0.5 / (2 * Math.PI * 1.05)
const FOUR = { "U1-3": 4, "U1-4": 4, "C1-2": 4 } as const

const seen = new Set<PourGuard>()

function refusalOf(body: () => unknown): PourRefusal {
  try {
    body()
  } catch (error) {
    if (error instanceof PourRefusal) {
      seen.add(error.guard)
      return error
    }
    throw error
  }
  throw new Error("expected a PourRefusal but nothing was thrown")
}

function measure(text: string) {
  return measurePourText(text, "fixture")
}

function near(actual: number | null | undefined, expected: number, tolerance: number): void {
  if (actual === null || actual === undefined) throw new Error(`expected ${expected} but measured ${String(actual)}`)
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
}

function nearEach(actual: ReadonlyMap<string, number>, expected: Readonly<Record<string, number>>): void {
  expect([...actual.keys()].sort()).toEqual(Object.keys(expected).sort())
  for (const [key, value] of Object.entries(expected)) expect(actual.get(key)).toBe(value)
}

// --- Fixture 1: a pour that is a single region ------------------------------

test("a pour that is one region has one region, no bridge to measure, and a covered outline round U1", () => {
  const metrics = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] } }))
  expect(metrics.bridgeByLayer.get("F.Cu")?.regions).toBe(1)
  // No pair of bodies exists, which is NOT a neck of width zero: it is absent, and reported as absent.
  expect(metrics.narrowestBridgeMm).toBeNull()
  expect(metrics.bridgeByLayer.get("F.Cu")?.narrowestBridgeMm).toBeNull()
  expect(metrics.continuityAroundU1).toBe(1)
  expect(metrics.bypassReturn).toBe("pour")
  expect(metrics.bypassReturnByCap.get("C1")).toBe("pour")
  expect(metrics.resolutionMm).toBe(0.05)
})

test("a hole in the pour makes two bodies of the copper either side of it, and the bridge is the wider way round", () => {
  // U1-3 at (30, 18) has a 1.3 mm-radius void and no spoke: copper spans y 0..16.7 above it and 19.3..40 below.
  // The two lobes left and right of the hole are joined by both, and the figure is the wider: 40 - 19.3 = 20.7.
  const metrics = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, spokes: { "U1-3": 0 } }))
  near(metrics.narrowestBridgeMm, 20.7, 0.1)
  expect(metrics.bridgeByLayer.get("F.Cu")?.regions).toBe(1)
})

test("a uniformly wide strip is not read as a string of bodies: thin, long, and diagonal strips and a round disc all have no bridge", () => {
  const thin = measureLayer([[[0, 0], [40, 0], [40, 1], [0, 1]]])
  expect(thin).toEqual({ narrowestBridgeMm: null, regions: 1 })
  // Diagonal edges put the staircase of the raster on every row, which is where quantisation ripple would show.
  const diagonal = measureLayer([[[0, 0], [3, 0], [43, 20], [40, 20]]])
  expect(diagonal).toEqual({ narrowestBridgeMm: null, regions: 1 })
  const disc = measureLayer([Array.from({ length: 96 }, (_, i): [number, number] => [20 + 15 * Math.cos((i / 96) * 2 * Math.PI), 20 + 15 * Math.sin((i / 96) * 2 * Math.PI)])])
  expect(disc).toEqual({ narrowestBridgeMm: null, regions: 1 })
})

// --- Fixture 2: two regions joined by a deliberately narrow bridge ----------

test("two bodies joined by a 0.85 mm neck read a bridge of 0.85 mm, within one pixel", () => {
  const metrics = measure(fixtureBoard({ place: LEFT_PLACE, pour: { "F.Cu": [dumbbell(19.5795, 20.4295)] }, spokes: FOUR }))
  near(metrics.narrowestBridgeMm, 0.85, metrics.resolutionMm)
  // One piece of copper: the neck is what joins the bodies, so they are one region, not two.
  expect(metrics.bridgeByLayer.get("F.Cu")?.regions).toBe(1)
})

test("the bridge figure follows the neck: a 1.75 mm neck reads 1.75 mm, not the same number again", () => {
  const metrics = measure(fixtureBoard({ place: LEFT_PLACE, pour: { "F.Cu": [dumbbell(19.1295, 20.8795)] }, spokes: FOUR }))
  near(metrics.narrowestBridgeMm, 1.75, metrics.resolutionMm)
})

// --- Fixture 3: a ground pad carrying a single spoke ------------------------

test("spokes are counted per pad: one, four and two on three pads, each with the covered fraction that count implies", () => {
  const metrics = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, spokes: { "U1-3": 1, "U1-4": 4, "C1-2": 2 } }))
  nearEach(metrics.spokesByGroundPad, { "U1-3": 1, "U1-4": 4, "C1-2": 2 })
  // The ring is sampled every 0.05 mm, so each spoke's covered arc is good to about one sample (1/132 of the ring).
  near(metrics.groundPads.get("U1-3")?.[0]?.coveredFraction, 1 * PER_SPOKE, 0.02)
  near(metrics.groundPads.get("U1-4")?.[0]?.coveredFraction, 4 * PER_SPOKE, 0.02)
  near(metrics.groundPads.get("C1-2")?.[0]?.coveredFraction, 2 * PER_SPOKE, 0.02)
})

test("a pad the pour does not touch reads 0 spokes beside 0 coverage; a pad merged into it reads 0 spokes beside full coverage", () => {
  // U1-3 has a full void and no spoke; U1-4 and C1-2 have no void cut at all.
  const metrics = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, spokes: { "U1-3": 0 } }))
  expect(metrics.spokesByGroundPad.get("U1-3")).toBe(0)
  expect(metrics.groundPads.get("U1-3")?.[0]?.coveredFraction).toBe(0)
  // KiCad's solid connection: no relief, so the ring is copper all the way round and has no spoke ends to count.
  expect(metrics.spokesByGroundPad.get("U1-4")).toBe(0)
  expect(metrics.groundPads.get("U1-4")?.[0]?.coveredFraction).toBe(1)
})

test("a through-hole pad's spokes are counted on every pour layer and summed, with each layer kept beside the total", () => {
  const metrics = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE], "B.Cu": [RECTANGLE] }, spokes: FOUR }))
  nearEach(metrics.spokesByGroundPad, { "U1-3": 8, "U1-4": 8, "C1-2": 8 })
  expect(metrics.groundPads.get("U1-3")?.map((r) => [r.layer, r.spokes])).toEqual([["F.Cu", 4], ["B.Cu", 4]])
  expect([...metrics.continuityAroundU1ByLayer.keys()]).toEqual(["F.Cu", "B.Cu"])
  expect([...metrics.bridgeByLayer.keys()]).toEqual(["F.Cu", "B.Cu"])
})

// --- A split pour: continuity, regions, and a return that rides a track -----

/** Two bodies with a 0.99 mm slot at x 30.52..31.51 cutting across U1's courtyard (x 28..32, y 16..26). */
const SPLIT = [
  [[0, 0], [30.52, 0], [30.52, 40], [0, 40]],
  [[31.51, 0], [60, 0], [60, 40], [31.51, 40]],
] as const

test("a slot across U1's courtyard shortens the covered length by the slot's width on the two edges it crosses", () => {
  const metrics = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": SPLIT }, track: true }))
  // The courtyard outline is 28 mm; the slot crosses the top and bottom edges for 0.99 mm each.
  near(metrics.continuityAroundU1, 1 - (2 * 0.99) / 28, 0.005)
  // Two pieces of copper with nothing joining them. Not a bridge of width zero, and not one region.
  expect(metrics.bridgeByLayer.get("F.Cu")?.regions).toBe(2)
  expect(metrics.narrowestBridgeMm).toBeNull()
})

test("a bypass capacitor whose ground pad is on no pour U1 reaches, but ends a ground track, reads as a track", () => {
  const metrics = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": SPLIT }, track: true }))
  expect(metrics.bypassReturnByCap.get("C1")).toBe("track")
  expect(metrics.bypassReturn).toBe("track")
})

test("a return that is on neither pour nor track is refused rather than filed under one of them", () => {
  const refusal = refusalOf(() => measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": SPLIT } })))
  expect(refusal.guard).toBe("bypass-unconnected")
  expect(refusal.message).toContain("C1")
})

// --- THE REFUSAL THAT MATTERS: a zone nobody refilled ------------------------

test("a ground zone with no saved fill is refused, and the refusal says how to refill - it is never zeroes", () => {
  const refusal = refusalOf(() => measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, zoneLayers: ["F.Cu"], filledLayers: [] })))
  expect(refusal.guard).toBe("zone-unfilled")
  expect(refusal.message).toContain("--refill-zones")
  expect(refusal.message).toContain("--save-board")
  expect(refusal.message).toContain("F.Cu")
})

test("a zone filled on one of its layers and not the other is refused, naming the unfilled layer", () => {
  const refusal = refusalOf(() =>
    measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE], "B.Cu": [RECTANGLE] }, zoneLayers: ["F.Cu", "B.Cu"], filledLayers: ["F.Cu"] })),
  )
  expect(refusal.guard).toBe("zone-unfilled")
  expect(refusal.message).toContain("B.Cu")
  expect(refusal.message).not.toContain("on F.Cu, so")
})

test("a board with no ground zone is refused, and a keepout Rule Area is not a pour", () => {
  expect(refusalOf(() => measure(fixtureBoard({ place: OPEN_PLACE, pour: {}, zone: false }))).guard).toBe("no-ground-zone")
  const keepout = ['\t(zone (layers "F.Cu" "B.Cu") (uuid "cccccccc-0000-4000-8000-000000000001") (name "SYNTHETIC:rule-area")',
    "\t\t(keepout (tracks not_allowed) (vias not_allowed) (pads allowed) (copperpour not_allowed) (footprints allowed))",
    "\t\t(polygon (pts (xy 0 0) (xy 5 0) (xy 5 5) (xy 0 5))))"].join("\n")
  expect(refusalOf(() => measure(fixtureBoard({ place: OPEN_PLACE, pour: {}, zone: false, extraZones: [keepout] }))).guard).toBe("no-ground-zone")
})

// --- Other refusals: absent or unreadable inputs are never defaulted ---------

const GOOD = { place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, spokes: FOUR } as const

test("a zone with no thermal gap is refused instead of counting spokes on an assumed ring", () => {
  const refusal = refusalOf(() => measure(fixtureBoard({ ...GOOD, thermalGap: null })))
  expect(refusal.guard).toBe("board-shape")
  expect(refusal.message).toContain("thermal_gap")
})

test("an arc in a filled polygon, a pad shape that is not read, a back-side footprint and a repeated pad key are each refused", () => {
  const text = fixtureBoard(GOOD)
  const arc = text.replace('(filled_polygon (layer "F.Cu") (pts (xy 0 0)', '(filled_polygon (layer "F.Cu") (pts (arc (start 0 0) (mid 1 1) (end 2 0)) (xy 0 0)')
  expect(arc).not.toBe(text)
  expect(refusalOf(() => measure(arc)).message).toContain("(arc ...)")
  const trapezoid = refusalOf(() => measure(fixtureBoard({ ...GOOD, padShape: "trapezoid" })))
  expect(trapezoid.guard).toBe("board-shape")
  expect(trapezoid.message).toContain("trapezoid")
  const back = text.replace('(footprint "SYNTHETIC:FixtureU1" (layer "F.Cu")', '(footprint "SYNTHETIC:FixtureU1" (layer "B.Cu")')
  expect(back).not.toBe(text)
  expect(refusalOf(() => measure(back)).message).toContain("not on F.Cu")
  const twice = text.replace('(pad "4" thru_hole circle (at 0 6)', '(pad "3" thru_hole circle (at 0 6)')
  expect(twice).not.toBe(text)
  expect(refusalOf(() => measure(twice)).message).toContain("U1-3")
})

test("a board with no U1, no capacitor on the supply, or no through-hole ground pad is refused rather than measured against nothing", () => {
  const noU1 = refusalOf(() => measure(fixtureBoard({ ...GOOD, refs: { u1: "U9" } })))
  expect(noU1.guard).toBe("subject-missing")
  expect(noU1.message).toContain("U1")
  const noCap = refusalOf(() => measure(fixtureBoard({ ...GOOD, refs: { c1: "X1" } })))
  expect(noCap.guard).toBe("subject-missing")
  expect(noCap.message).toContain("bypass")
  const noThroughHole = refusalOf(() => measure(fixtureBoard({ ...GOOD, padType: "smd" })))
  expect(noThroughHole.guard).toBe("subject-missing")
  expect(noThroughHole.message).toContain("through-hole")
})

test("a missing file and text that is not a board are refused as unreadable, not read as an empty board", () => {
  expect(refusalOf(() => measurePour("/nonexistent/board.kicad_pcb")).guard).toBe("board-unreadable")
  expect(refusalOf(() => measure("this is not a board")).guard).toBe("board-unreadable")
  expect(refusalOf(() => measure("(footprint)")).guard).toBe("board-unreadable")
})

// --- The result carries numbers and nothing else -----------------------------

test("a result carries measurements and no verdict: no field says pass, ok, fail or within", () => {
  const metrics = measure(fixtureBoard(GOOD))
  expect(Object.keys(metrics).sort()).toEqual([
    "bridgeByLayer", "bypassReturn", "bypassReturnByCap", "continuityAroundU1", "continuityAroundU1ByLayer",
    "groundPads", "narrowestBridgeMm", "resolutionMm", "spokesByGroundPad",
  ])
})

test("every guard the module declares was reached by a test above", () => {
  expect([...POUR_GUARDS].filter((g) => !seen.has(g))).toEqual([])
})
