/**
 * THE PARTS OF THE POUR MEASUREMENT THAT DEPEND ON WHICH LAYER, WHICH TRACK AND
 * WHICH CAPACITOR, and the neck figure's resolution pinned from both sides.
 *
 * A bypass return is one of four facts - pour, track, via, none found - and the
 * overall figure is one of them only when every capacitor agrees. It used to be a
 * refusal when a return was neither pour nor track, which threw away the other
 * figures of the board and wore an electrical verdict in its name; a board with
 * its return still to route, or an SMD cap with a via in its pad, is now a
 * measured fact.
 *
 * Numbers against fixtures, never a verdict.
 */
import { test, expect } from "bun:test"
import { measureLayer } from "../../tools/pcb/pour-bridge.ts"
import type { Pt } from "../../tools/pcb/pour-geometry.ts"
import { LEFT_PLACE, OPEN_PLACE, RECTANGLE, dumbbell, fixtureBoard } from "./pour-fixtures.ts"
import type { TrackSpec } from "./pour-fixtures.ts"
import { measure, near, reasonOf, valueOf } from "./pour-helpers.ts"

/** A slot at x 30.52..31.51 across U1's loop (x 28.2..31.8, y 16.2..25.8), as in `./pour-continuity.test.ts`. */
const SPLIT: readonly (readonly Pt[])[] = [
  [[0, 0], [30.52, 0], [30.52, 40], [0, 40]],
  [[31.51, 0], [60, 0], [60, 40], [31.51, 40]],
]

const returnOf = (text: string, cap = "C1") => valueOf(measure(text).bypassReturn).byCap.get(cap)

// --- Layers measured separately and never folded into one figure -------------

test("the narrowest neck is the narrowest over the layers, and each layer keeps its own", () => {
  const metrics = measure(
    fixtureBoard({ place: LEFT_PLACE, pour: { "F.Cu": [dumbbell(19.1295, 20.8795)], "B.Cu": [dumbbell(19.5795, 20.4295)] } }),
  )
  near(metrics.neckByLayer.get("F.Cu"), 1.75, 0.05)
  near(metrics.neckByLayer.get("B.Cu"), 0.85, 0.05)
  near(metrics.narrowestNeckMm, 0.85, 0.05)
})

test("continuity is read per layer and not folded: a slot across the loop on F.Cu is not covered by a solid B.Cu", () => {
  const metrics = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": SPLIT, "B.Cu": [RECTANGLE] } }))
  const loops = valueOf(metrics.continuityAroundIc)
  near(loops.get("F.Cu")?.coveredFraction, 1 - 1.98 / 26.4, 0.01)
  expect(loops.get("F.Cu")?.breaksMm.length).toBe(2)
  expect(loops.get("B.Cu")?.coveredFraction).toBe(1)
  // Each layer's figures come from that layer's own polygons.
  expect(metrics.regionsByLayer.get("F.Cu")).toBe(2)
  expect(metrics.regionsByLayer.get("B.Cu")).toBe(1)
})

// --- What counts as touching a pad ------------------------------------------

/** F.Cu pour only, split so C1's side is not U1's, and C1 a surface-mount part on F.Cu. */
const splitWith = (track?: TrackSpec | readonly TrackSpec[], extra: readonly string[] = []) =>
  fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": SPLIT }, c1Smd: true, ...(track === undefined ? {} : { track }), extraZones: extra })

test("a ground track that ends on the capacitor's pad, on the pad's layer, is its return", () => {
  // C1's ground pad is at (45, 28), 0.8 mm radius; the track ends 0.5 mm from its centre.
  expect(returnOf(splitWith({ from: [30, 18], to: [45.5, 28], layer: "F.Cu" }))).toBe("track")
})

test("a ground track that stops short of the pad, or ends on the wrong layer, does not touch it: none found", () => {
  // 0.4 mm clear of the pad's rim, and the track is 0.25 mm to a side.
  expect(returnOf(splitWith({ from: [30, 18], to: [45, 29.2], layer: "F.Cu" }))).toBe("none-found")
  // On the pad's centre exactly, but on a layer an F.Cu surface-mount pad is not on.
  expect(returnOf(splitWith({ from: [30, 18], to: [45, 28], layer: "B.Cu" }))).toBe("none-found")
})

test("only a GROUND track counts, and an arc is a track as much as a straight segment is", () => {
  expect(returnOf(splitWith({ from: [30, 18], to: [45, 28], layer: "F.Cu", net: "SIG" }))).toBe("none-found")
  expect(returnOf(splitWith({ from: [30, 18], to: [45, 28], layer: "F.Cu", arc: true }))).toBe("track")
})

test("a ground via in the pad is its own fact: via, which is neither pour nor track and is not refused", () => {
  const via = '\t(via (at 45 28) (size 0.8) (drill 0.4) (layers "F.Cu" "B.Cu") (net "GND") (uuid "eeeeeeee-0000-4000-8000-000000000001"))'
  const metrics = measure(splitWith(undefined, [via]))
  expect(valueOf(metrics.bypassReturn).byCap.get("C1")).toBe("via")
  // And it did not silence the other figures, which the refusal it replaces did.
  expect(valueOf(metrics.continuityAroundIc).get("F.Cu")?.breaksMm.length).toBe(2)
  expect(valueOf(metrics.spokesByGroundPad).size).toBe(2)
  // A via that is not in the pad is not its return.
  const away = '\t(via (at 20 5) (size 0.8) (drill 0.4) (layers "F.Cu" "B.Cu") (net "GND") (uuid "eeeeeeee-0000-4000-8000-000000000001"))'
  expect(returnOf(splitWith(undefined, [away]))).toBe("none-found")
})

test("a surface-mount pad on F.Cu is not on a B.Cu pour: a pour there does not carry its return", () => {
  // F.Cu is split so C1's side is not U1's; B.Cu is one solid pour that WOULD reach both if the pad were on it.
  const text = fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": SPLIT, "B.Cu": [RECTANGLE] }, c1Smd: true })
  expect(returnOf(text)).toBe("none-found")
})

test("a return that is on the pour and also has a track reads pour: the pour is checked first and the order is not a preference the reader sees", () => {
  expect(returnOf(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, track: true }))).toBe("pour")
})

test("a C-numbered part with no ground pad is not a bypass capacitor, and with nothing else to ask about the figure is unavailable", () => {
  const text = fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] } })
  const signal = text.replace('(pad "2" thru_hole circle (at 0 5) (size 1.6 1.6) (drill 0.8) (layers "*.Cu" "*.Mask") (net "GND"))', '(pad "2" thru_hole circle (at 0 5) (size 1.6 1.6) (drill 0.8) (layers "*.Cu" "*.Mask") (net "SIG"))')
  expect(signal).not.toBe(text)
  expect(reasonOf(measure(signal).bypassReturn)).toContain("bypass")
})

// --- More than one bypass capacitor ------------------------------------------

const TWO = { u1: [30, 18], c1: [45, 23], c2: [10, 25] } as const

test("with one return on the pour and one on a track the overall figure is mixed, and each capacitor is kept", () => {
  // C2 sits in the left body with U1, so it shares U1's piece of pour; C1 is across the slot, on a track.
  const metrics = valueOf(measure(fixtureBoard({ place: TWO, pour: { "F.Cu": SPLIT }, track: true })).bypassReturn)
  expect(metrics.byCap.get("C1")).toBe("track")
  expect(metrics.byCap.get("C2")).toBe("pour")
  expect(metrics.overall).toBe("mixed")
})

test("when every capacitor agrees the overall figure is that answer, whichever answer it is", () => {
  const twoTracks = fixtureBoard({
    place: { u1: [30, 18], c1: [45, 23], c2: [50, 23] }, pour: { "F.Cu": SPLIT },
    track: [{ from: [30, 18], to: [45, 28], layer: "F.Cu" }, { from: [30, 18], to: [50, 28], layer: "F.Cu" }],
  })
  expect(valueOf(measure(twoTracks).bypassReturn).overall).toBe("track")
  const twoPours = fixtureBoard({ place: TWO, pour: { "F.Cu": [RECTANGLE] } })
  expect(valueOf(measure(twoPours).bypassReturn).overall).toBe("pour")
  const neither = fixtureBoard({ place: { u1: [30, 18], c1: [45, 23], c2: [50, 23] }, pour: { "F.Cu": SPLIT } })
  expect(valueOf(measure(neither).bypassReturn).overall).toBe("none-found")
})

// --- What a neck is: the resolution pinned from both sides -------------------

/** Two square-ended arms `arm` mm tall joined by a 3 mm long neck `neck` mm tall. */
function armsAndNeck(neck: number, arm: number): readonly Pt[] {
  const mid = arm / 2
  return [
    [0, 0], [arm, 0], [arm, mid - neck / 2], [arm + 3, mid - neck / 2], [arm + 3, 0], [2 * arm + 3, 0],
    [2 * arm + 3, arm], [arm + 3, arm], [arm + 3, mid + neck / 2], [arm, mid + neck / 2], [arm, arm], [0, arm],
  ]
}

test("arms 3 pixels wider in radius than the neck make a neck, and arms 2 pixels wider do not: the floor is pinned at 2", () => {
  // A 1.0 mm neck: arms 1.3 mm tall are 0.15 mm = 3 pixels wider in radius; arms 1.2 mm tall are 2 pixels wider.
  // A floor of 3 or more hides the first; a floor of 1 or less reveals the second. Neither is a verdict.
  const three = measureLayer([armsAndNeck(1.0, 1.3)])
  near(three.narrowestNeckMm, 0.95, 0.06)
  expect(measureLayer([armsAndNeck(1.0, 1.2)]).narrowestNeckMm).toBeNull()
  expect(measureLayer([armsAndNeck(1.0, 1.4)]).narrowestNeckMm).not.toBeNull()
})

test("the neck figure carries a literal accuracy of one pixel: 0.85 reads 0.85, and a 0.8 neck reads 0.75 or 0.8, never over", () => {
  const odd = measureLayer([armsAndNeck(0.85, 2.0)])
  near(odd.narrowestNeckMm, 0.85, 0.001)
  const even = measureLayer([armsAndNeck(0.8, 2.0)]).narrowestNeckMm
  if (even === null) throw new Error("expected a neck")
  expect(even).toBeGreaterThanOrEqual(0.75 - 1e-9)
  expect(even).toBeLessThanOrEqual(0.8 + 1e-9)
})
