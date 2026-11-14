/**
 * THE PARTS OF THE POUR MEASUREMENT THAT DEPEND ON WHICH LAYER, WHICH TRACK AND
 * WHICH CAPACITOR - the ones a mutation sweep of `./pour.test.ts` showed no
 * board there could tell apart, because every fixture in it pours the same shape
 * on every layer and has one capacitor.
 *
 * Still measurements against hand-built fixtures: a number, or a refusal for a
 * board the measurement has no answer for. There is no verdict here and no limit.
 */
import { test, expect } from "bun:test"
import { measureLayer } from "../../tools/pcb/pour-bridge.ts"
import { measurePourText, PourRefusal } from "../../tools/pcb/pour.ts"
import type { Pt } from "../../tools/pcb/pour-geometry.ts"
import { LEFT_PLACE, OPEN_PLACE, RECTANGLE, dumbbell, fixtureBoard } from "./pour-fixtures.ts"

const measure = (text: string) => measurePourText(text, "fixture")

function near(actual: number | null | undefined, expected: number, tolerance: number): void {
  if (actual === null || actual === undefined) throw new Error(`expected ${expected} but measured ${String(actual)}`)
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
}

function refusalOf(body: () => unknown): PourRefusal {
  try {
    body()
  } catch (error) {
    if (error instanceof PourRefusal) return error
    throw error
  }
  throw new Error("expected a PourRefusal but nothing was thrown")
}

/** A slot at x 30.52..31.51 across U1's courtyard (x 28..32, y 16..26), as in `./pour.test.ts`. */
const SPLIT: readonly (readonly Pt[])[] = [
  [[0, 0], [30.52, 0], [30.52, 40], [0, 40]],
  [[31.51, 0], [60, 0], [60, 40], [31.51, 40]],
]

// --- Layers measured separately and combined by what each figure means ------

test("the narrowest bridge is the narrowest over the layers, and each layer keeps its own", () => {
  const metrics = measure(
    fixtureBoard({ place: LEFT_PLACE, pour: { "F.Cu": [dumbbell(19.1295, 20.8795)], "B.Cu": [dumbbell(19.5795, 20.4295)] } }),
  )
  near(metrics.bridgeByLayer.get("F.Cu")?.narrowestBridgeMm, 1.75, 0.05)
  near(metrics.bridgeByLayer.get("B.Cu")?.narrowestBridgeMm, 0.85, 0.05)
  near(metrics.narrowestBridgeMm, 0.85, 0.05)
})

test("continuity is the covered fraction on ANY pour layer, each layer's own figure kept beside it", () => {
  // F.Cu has the slot across U1's courtyard; B.Cu is solid. A point on the slot is covered by B.Cu.
  const metrics = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": SPLIT, "B.Cu": [RECTANGLE] } }))
  near(metrics.continuityAroundU1ByLayer.get("F.Cu"), 1 - (2 * 0.99) / 28, 0.005)
  expect(metrics.continuityAroundU1ByLayer.get("B.Cu")).toBe(1)
  expect(metrics.continuityAroundU1).toBe(1)
  // The B.Cu pour reaches both U1's ground pins and C1's ground pad, so the return rides a pour.
  expect(metrics.bypassReturnByCap.get("C1")).toBe("pour")
})

test("a layer's figures are read from that layer's own polygons, not from whichever polygon is found first", () => {
  const metrics = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": SPLIT, "B.Cu": [RECTANGLE] } }))
  expect(metrics.bridgeByLayer.get("F.Cu")?.regions).toBe(2)
  expect(metrics.bridgeByLayer.get("B.Cu")?.regions).toBe(1)
})

// --- What counts as touching a pad ------------------------------------------

/** F.Cu pour only, split so C1's side is not U1's, and C1 a surface-mount part on F.Cu. */
function splitWithTrack(track: { from: Pt; to: Pt; layer: string }) {
  return fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": SPLIT }, c1Smd: true, track })
}

test("a ground track that ends on the capacitor's pad, on the pad's layer, is what its return rides", () => {
  // C1's ground pad is at (45, 28), 0.8 mm radius; the track ends 0.5 mm from its centre.
  const metrics = measure(splitWithTrack({ from: [30, 18], to: [45.5, 28], layer: "F.Cu" }))
  expect(metrics.bypassReturnByCap.get("C1")).toBe("track")
})

test("a ground track that stops short of the pad, or ends on the wrong layer, does not touch it", () => {
  // 0.4 mm clear of the pad's rim.
  const short = refusalOf(() => measure(splitWithTrack({ from: [30, 18], to: [45, 29.2], layer: "F.Cu" })))
  expect(short.guard).toBe("bypass-unconnected")
  // On the pad's centre exactly, but on a layer an F.Cu surface-mount pad is not on.
  const wrongLayer = refusalOf(() => measure(splitWithTrack({ from: [30, 18], to: [45, 28], layer: "B.Cu" })))
  expect(wrongLayer.guard).toBe("bypass-unconnected")
})

// --- More than one bypass capacitor ------------------------------------------

test("with one return on the pour and one on a track, the overall figure is track and each capacitor is kept", () => {
  // C2 sits in the left body with U1, so it shares U1's piece of pour; C1 is across the slot, on a track.
  const place = { u1: [30, 18], c1: [45, 23], c2: [10, 25] } as const
  const metrics = measure(fixtureBoard({ place, pour: { "F.Cu": SPLIT }, track: true }))
  expect(metrics.bypassReturnByCap.get("C1")).toBe("track")
  expect(metrics.bypassReturnByCap.get("C2")).toBe("pour")
  expect(metrics.bypassReturn).toBe("track")
})

test("two footprints that are both U1 are refused: the figure is about one IC", () => {
  const refusal = refusalOf(() => measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, refs: { c1: "U1" } })))
  expect(refusal.guard).toBe("subject-missing")
  expect(refusal.message).toContain("2 footprint(s)")
})

test("two ground zones on one layer that declare different thermal gaps are refused, not averaged or picked between", () => {
  const second = [
    '\t(zone (net "GND") (layers "F.Cu") (uuid "dddddddd-0000-4000-8000-000000000001") (name "SYNTHETIC:second-ground")',
    "\t\t(fill yes (thermal_gap 0.7) (thermal_bridge_width 0.5))",
    "\t\t(polygon (pts (xy 0 0) (xy 5 0) (xy 5 5) (xy 0 5)))",
    '\t\t(filled_polygon (layer "F.Cu") (pts (xy 0 0) (xy 5 0) (xy 5 5) (xy 0 5))))',
  ].join("\n")
  const refusal = refusalOf(() => measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, extraZones: [second] })))
  expect(refusal.guard).toBe("board-shape")
  expect(refusal.message).toContain("0.7")
})

// --- What a neck is: bodies only a little wider than the neck still count ----

/** Two square-ended arms `arm` mm tall joined by a 3 mm long neck `neck` mm tall. */
function armsAndNeck(neck: number, arm: number): readonly Pt[] {
  const mid = arm / 2
  return [
    [0, 0], [arm, 0], [arm, mid - neck / 2], [arm + 3, mid - neck / 2], [arm + 3, 0], [2 * arm + 3, 0],
    [2 * arm + 3, arm], [arm + 3, arm], [arm + 3, mid + neck / 2], [arm, mid + neck / 2], [arm, arm], [0, arm],
  ]
}

test("a 1.0 mm neck between arms 1.4 mm tall is a bridge: bodies need only be a few pixels wider than the neck", () => {
  // 0.2 mm of relief each side is four pixels at the 0.05 mm pitch, the narrowest relief this test pins.
  const measured = measureLayer([armsAndNeck(1.0, 1.4)])
  near(measured.narrowestBridgeMm, 0.95, 0.06)
  expect(measured.regions).toBe(1)
})
