/**
 * THE POUR MEASUREMENT, driven over boards whose copper is known.
 *
 * **EVERY ASSERTION HERE IS A MEASURED NUMBER AGAINST A FIXTURE, NEVER A
 * VERDICT.** "This fixture's narrowest neck is 0.85 mm" is a fact about the
 * fixture; "this fixture fails" would be an acceptance criterion, and the owner
 * declined to set any (`docs/known-gaps.md` G313) while the standing rule is that
 * an agent may not author them for the artifact it is producing. So there is no
 * test below that compares a measurement to a limit, and one test pins the SET OF
 * FIELDS a result carries so a `pass` or `ok` cannot be added without this file
 * noticing.
 *
 * The geometry behind each number is written out in `./pour-fixtures.ts`; the
 * expected values below are worked from it by hand, not read back from a run.
 * Continuity, region joins and bypass returns are in
 * `./pour-continuity.test.ts`, `./pour-joins.test.ts` and
 * `./pour-layers-and-returns.test.ts`.
 */
import { test, expect } from "bun:test"
import { measureLayer } from "../../tools/pcb/pour-bridge.ts"
import { measurePour, measurePourText, POUR_GUARDS, PT2399_CORE } from "../../tools/pcb/pour.ts"
import type { PourSubject } from "../../tools/pcb/pour.ts"
import { LEFT_PLACE, OPEN_PLACE, RECTANGLE, dumbbell, fixtureBoard } from "./pour-fixtures.ts"
import { measure, near, reasonOf, refusalOf, seenGuards, valueOf } from "./pour-helpers.ts"

/** One spoke is 0.5 mm of arc on a ring of radius 1.05 mm. */
const PER_SPOKE = 0.5 / (2 * Math.PI * 1.05)
const FOUR = { "U1-3": 4, "U1-4": 4, "C1-2": 4 } as const

// --- Fixture 1: a pour that is a single region ------------------------------

test("a pour that is one region has one region, no bridge to report, and says why", () => {
  const metrics = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] } }))
  expect(metrics.regionsByLayer.get("F.Cu")).toBe(1)
  // There are no separate regions, so there is nothing to bridge. That is reported as a reason, not as a number or a zero.
  expect(reasonOf(metrics.narrowestBridgeMm)).toContain("no separate regions")
  // And no constriction between two wide bodies either: one plain rectangle.
  expect(metrics.narrowestNeckMm).toBeNull()
  expect(metrics.resolutionMm).toBe(0.05)
  expect(metrics.noiseFloorMm).toBeCloseTo(0.1, 9)
})

test("a hole in the pour makes two bodies of the copper either side of it, and the NECK is the wider way round - not a bridge", () => {
  // U1-3 at (30, 18) has a 1.3 mm-radius void and no spoke: copper spans y 0..16.7 above it and 19.3..40 below.
  // The two lobes left and right of the hole are joined by both, and the neck figure is the wider: 40 - 19.3 = 20.7.
  const metrics = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, spokes: { "U1-3": 0 } }))
  near(metrics.narrowestNeckMm, 20.7, 0.1)
  expect(metrics.regionsByLayer.get("F.Cu")).toBe(1)
  // The same board has one region, so no bridge: the neck figure and the bridge figure are different things.
  expect(metrics.narrowestBridgeMm.kind).toBe("unavailable")
})

test("a uniformly wide strip is not read as a string of bodies, at any width or angle, and nor is a round disc", () => {
  for (const width of [0.3, 0.5, 1, 1.6, 3]) {
    for (let degrees = 0; degrees < 90; degrees += 7) {
      const a = (degrees * Math.PI) / 180
      const rotate = ([x, y]: readonly [number, number]): [number, number] => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]
      const strip = measureLayer([[[0, 0], [40, 0], [40, width], [0, width]].map((p) => rotate(p as [number, number]))])
      if (strip.narrowestNeckMm !== null || strip.regions !== 1) throw new Error(`a ${width} mm strip at ${degrees} degrees read ${JSON.stringify(strip)}`)
    }
  }
  const disc = measureLayer([Array.from({ length: 96 }, (_, i): [number, number] => [20 + 15 * Math.cos((i / 96) * 2 * Math.PI), 20 + 15 * Math.sin((i / 96) * 2 * Math.PI)])])
  expect(disc).toEqual({ narrowestNeckMm: null, regions: 1 })
})

// --- Fixture 2: two bodies joined by a deliberately narrow neck --------------

test("two bodies joined by a 0.85 mm neck read a neck of 0.85 mm, within one pixel", () => {
  const metrics = measure(fixtureBoard({ place: LEFT_PLACE, pour: { "F.Cu": [dumbbell(19.5795, 20.4295)] }, spokes: FOUR }))
  near(metrics.narrowestNeckMm, 0.85, 0.05)
  // One piece of copper: the neck is what joins the bodies, so they are one region, not two.
  expect(metrics.regionsByLayer.get("F.Cu")).toBe(1)
})

test("the neck figure follows the neck: a 1.75 mm neck reads 1.75 mm, not the same number again", () => {
  const metrics = measure(fixtureBoard({ place: LEFT_PLACE, pour: { "F.Cu": [dumbbell(19.1295, 20.8795)] }, spokes: FOUR }))
  near(metrics.narrowestNeckMm, 1.75, 0.05)
})

// --- Fixture 3: a ground pad carrying a single spoke ------------------------

function spokesOf(metrics: ReturnType<typeof measure>, pad: string, layer = "F.Cu") {
  const reading = valueOf(metrics.spokesByGroundPad).get(pad)?.get(layer)
  if (reading === undefined) throw new Error(`no spoke reading for ${pad} on ${layer}`)
  return reading
}

test("spokes are counted per pad: one, four and two on three pads, each with the covered fraction that count implies", () => {
  const metrics = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, spokes: { "U1-3": 1, "U1-4": 4, "C1-2": 2 } }))
  expect(spokesOf(metrics, "U1-3").spokes).toBe(1)
  expect(spokesOf(metrics, "U1-4").spokes).toBe(4)
  expect(spokesOf(metrics, "C1-2").spokes).toBe(2)
  expect([...valueOf(metrics.spokesByGroundPad).keys()].sort()).toEqual(["C1-2", "U1-3", "U1-4"])
  // The ring is sampled every 0.05 mm, so each spoke's covered arc is good to about one sample (1/132 of the ring).
  near(spokesOf(metrics, "U1-3").coveredFraction, 1 * PER_SPOKE, 0.02)
  near(spokesOf(metrics, "U1-4").coveredFraction, 4 * PER_SPOKE, 0.02)
  near(spokesOf(metrics, "C1-2").coveredFraction, 2 * PER_SPOKE, 0.02)
})

test("0 spokes is three different boards, told apart by the covered fraction and the zone's declared connection", () => {
  // U1-3 has a full void and no spoke; U1-4 and C1-2 have no void cut at all, in a zone that declares thermal relief.
  const thermal = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, spokes: { "U1-3": 0 } }))
  expect(spokesOf(thermal, "U1-3")).toEqual({ spokes: 0, coveredFraction: 0, declaredConnection: "thermal" })
  expect(spokesOf(thermal, "U1-4")).toEqual({ spokes: 0, coveredFraction: 1, declaredConnection: "thermal" })
  // The board the router writes: `(connect_pads yes ...)`, every pad joined solid, so every pad reads 0 spokes - and says it is solid.
  const solid = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, connect: "yes" }))
  for (const pad of ["U1-3", "U1-4", "C1-2"]) {
    expect(spokesOf(solid, pad)).toEqual({ spokes: 0, coveredFraction: 1, declaredConnection: "yes" })
  }
})

test("a through-hole pad's spokes are read on every pour layer and kept per layer, never summed", () => {
  const metrics = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE], "B.Cu": [RECTANGLE] }, spokes: FOUR }))
  const pad = valueOf(metrics.spokesByGroundPad).get("U1-3")
  expect([...(pad ?? [])].map(([layer, r]) => [layer, r.spokes])).toEqual([["F.Cu", 4], ["B.Cu", 4]])
  expect([...metrics.regionsByLayer.keys()]).toEqual(["F.Cu", "B.Cu"])
  expect([...metrics.neckByLayer.keys()]).toEqual(["F.Cu", "B.Cu"])
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

test("a board with no ground zone is refused, and a keepout Rule Area is not a pour - even one that still carries a net", () => {
  expect(refusalOf(() => measure(fixtureBoard({ place: OPEN_PLACE, pour: {}, zone: false }))).guard).toBe("no-ground-zone")
  const keepout = ['\t(zone (layers "F.Cu" "B.Cu") (uuid "cccccccc-0000-4000-8000-000000000001") (name "SYNTHETIC:rule-area")',
    "\t\t(keepout (tracks not_allowed) (vias not_allowed) (pads allowed) (copperpour not_allowed) (footprints allowed))",
    "\t\t(polygon (pts (xy 0 0) (xy 5 0) (xy 5 5) (xy 0 5))))"].join("\n")
  expect(refusalOf(() => measure(fixtureBoard({ place: OPEN_PLACE, pour: {}, zone: false, extraZones: [keepout] }))).guard).toBe("no-ground-zone")
  // KiCad strips the net from a Rule Area when it SAVES; a board that has not been through that save can still carry one.
  const netted = keepout.replace('(zone (layers', '(zone (net "GND") (layers')
  expect(netted).not.toBe(keepout)
  expect(refusalOf(() => measure(fixtureBoard({ place: OPEN_PLACE, pour: {}, zone: false, extraZones: [netted] }))).guard).toBe("no-ground-zone")
  const beside = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, extraZones: [netted] }))
  expect(beside.regionsByLayer.get("F.Cu")).toBe(1)
})

// --- Other refusals: unreadable inputs are never defaulted -------------------

const GOOD = { place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, spokes: FOUR } as const

test("a zone with no thermal gap is refused instead of counting spokes on an assumed ring", () => {
  const refusal = refusalOf(() => measure(fixtureBoard({ ...GOOD, thermalGap: null })))
  expect(refusal.guard).toBe("board-shape")
  expect(refusal.message).toContain("thermal_gap")
})

test("an arc in a filled polygon, a pad shape that is not read, a back-side footprint, a repeated pad key and a nameless footprint are each refused", () => {
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
  const nameless = text.replace('(property "Reference" "C1" (at 0 0 0) (layer "F.SilkS") (uuid "22222222-0000-4000-8000-000000000009"))', "")
  expect(nameless).not.toBe(text)
  expect(refusalOf(() => measure(nameless)).message).toContain("no Reference")
})

test("a missing file and text that is not a board are refused as unreadable, not read as an empty board", () => {
  expect(refusalOf(() => measurePour("/nonexistent/board.kicad_pcb", PT2399_CORE)).guard).toBe("board-unreadable")
  expect(refusalOf(() => measure("this is not a board")).guard).toBe("board-unreadable")
  expect(refusalOf(() => measure("(footprint)")).guard).toBe("board-unreadable")
})

// --- What is NOT a refusal: an absent subject silences only its own figure ----

test("a board with no U1, no through-hole ground pad or no bypass capacitor still reports every figure it can", () => {
  const noU1 = measure(fixtureBoard({ ...GOOD, refs: { u1: "U9" } }))
  expect(reasonOf(noU1.continuityAroundIc)).toContain("U1")
  expect(reasonOf(noU1.bypassReturn)).toContain("U1")
  expect(noU1.regionsByLayer.get("F.Cu")).toBe(1)
  expect(valueOf(noU1.spokesByGroundPad).size).toBe(3)

  const noCap = measure(fixtureBoard({ ...GOOD, refs: { c1: "X1" } }))
  expect(reasonOf(noCap.bypassReturn)).toContain("bypass")
  expect(valueOf(noCap.continuityAroundIc).get("F.Cu")?.coveredFraction).toBe(1)

  // A surface-mount build: no through-hole ground pad, and all the other figures stand.
  const smd = measure(fixtureBoard({ ...GOOD, padType: "smd" }))
  expect(reasonOf(smd.spokesByGroundPad)).toContain("through-hole")
  expect(valueOf(smd.continuityAroundIc).get("F.Cu")?.coveredFraction).toBe(1)
  expect(smd.regionsByLayer.get("F.Cu")).toBe(1)
})

test("two footprints that are both U1 are an unavailable continuity figure, not a refusal of the board", () => {
  const metrics = measure(fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, refs: { c1: "U1" } }))
  expect(valueOf(metrics.continuityAroundIc).size).toBe(1)
})

// --- The subject is a parameter, not an assumption ---------------------------

test("a board whose rails are not GND and +5V is measured against the nets the caller names, and refused for the wrong ones", () => {
  const text = fixtureBoard(GOOD).replaceAll('(net "GND")', '(net "0V")').replaceAll('(net "+5V")', '(net "VCC")')
  expect(refusalOf(() => measure(text)).guard).toBe("no-ground-zone")
  const renamed = measureWith(text, { groundNet: "0V", supplyNet: "VCC", icReference: "U1" })
  expect(valueOf(renamed.bypassReturn).byCap.get("C1")).toBe("pour")
})

function measureWith(text: string, subject: PourSubject) {
  return measurePourText(text, "fixture", subject)
}

// --- The result carries numbers and nothing else -----------------------------

test("a result carries measurements and no verdict: no field says pass, ok, fail or within", () => {
  const metrics = measure(fixtureBoard(GOOD))
  expect(Object.keys(metrics).sort()).toEqual([
    "bypassReturn", "continuityAroundIc", "narrowestBridgeMm", "narrowestNeckMm", "neckByLayer", "noiseFloorMm",
    "regionJoins", "regionsByLayer", "resolutionMm", "spokesByGroundPad", "viaLinks",
  ])
})

test("every guard the module declares was reached by a test above", () => {
  expect([...POUR_GUARDS].filter((g) => !seenGuards.has(g))).toEqual([])
})
