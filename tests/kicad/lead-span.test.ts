/**
 * The recorded hole spans, checked three ways.
 *
 * 1. COVERAGE. Every footprint any board in this repository actually places is
 *    either recorded or deliberately unsourced. A span table that silently
 *    misses a family is a table that refuses mid-run on a real board.
 * 2. ARITHMETIC. Every recorded integer is recomputed from the recorded
 *    dimensions, and the pitch at each bound is checked against the physical
 *    reach those dimensions imply - including that one hole further is out of
 *    reach, so a maximum that is merely conservative fails.
 * 3. REFUSAL. An unknown footprint and an unsourced one both throw, and each
 *    says which one and what is missing.
 */
import { expect, test } from "bun:test"
import {
  GRID_MM,
  holesForSteps,
  nearestGridSteps,
  pitchForHoles,
} from "../../lib/kicad/grid.ts"
import {
  BEND_RULE,
  STRIPBOARD,
  TOOL_MAX_SPAN_HOLES,
  TOOL_MIN_SPAN_HOLES,
  bendRadiusMm,
  deriveSpanHoles,
  maxReachPitchMm,
  minReachPitchMm,
  standoffMm,
} from "../../lib/kicad/lead-span-model.ts"
import type { FormableGeometry, LeadSpan } from "../../lib/kicad/lead-span-model.ts"
import { LEAD_SPANS, UNSOURCED, leadSpanFor } from "../../lib/kicad/lead-span.ts"
import { pultecLowCut } from "../../circuits/pultec/physical/low-cut.ts"
import { pultecLowBoost } from "../../circuits/pultec/physical/low-boost.ts"
import { pultecHiCut } from "../../circuits/pultec/physical/hi-cut.ts"
import { pultecHiBoost } from "../../circuits/pultec/physical/hi-boost.ts"
import { pultecMid } from "../../circuits/pultec/physical/mid.ts"
import { pt2399Core } from "../../circuits/pt2399-core/pt2399-core.ts"
import { transistorPreampLab } from "../../circuits/transistor-preamp/lab-board.ts"
import { transistorPreampFeedback } from "../../circuits/transistor-preamp/feedback-board.ts"
import type { Network } from "../../lib/model/types.ts"

const BOARDS: readonly (() => Network)[] = [
  pultecLowCut,
  pultecLowBoost,
  pultecHiCut,
  pultecHiBoost,
  pultecMid,
  pt2399Core,
  transistorPreampLab,
  transistorPreampFeedback,
]

function placedFootprints(): ReadonlySet<string> {
  const names = new Set<string>()
  for (const board of BOARDS) {
    for (const component of board().components) {
      const footprint = component.part?.footprint
      if (footprint !== undefined) names.add(footprint)
    }
  }
  return names
}

function formable(entry: LeadSpan): FormableGeometry | null {
  return entry.geometry.kind === "formable" ? entry.geometry : null
}

test("every footprint the boards place is recorded or deliberately unsourced", () => {
  const unaccounted = [...placedFootprints()]
    .filter((name) => !LEAD_SPANS.has(name) && !UNSOURCED.has(name))
    .sort()
  expect(unaccounted).toEqual([])
})

test("every recorded and unsourced footprint is one some board actually places", () => {
  // The other direction: an entry for a footprint nothing places is a claim
  // nobody can check against a built board, and it rots silently.
  const placed = placedFootprints()
  const orphans = [...LEAD_SPANS.keys(), ...UNSOURCED.keys()]
    .filter((name) => !placed.has(name))
    .sort()
  expect(orphans).toEqual([])
})

test("the two unsourced families are exactly the ones with no sourced lead length", () => {
  expect([...UNSOURCED.keys()].sort()).toEqual([
    "Capacitor_THT:CP_Radial_D5.0mm_P2.50mm",
    "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm",
  ].sort())
})

test("an unknown footprint refuses, names itself, and quotes what is recorded", () => {
  expect(() => leadSpanFor("Capacitor_THT:C_Rect_L13.0mm_W4.0mm_P10.00mm")).toThrow(
    /no lead span is recorded for footprint "Capacitor_THT:C_Rect_L13\.0mm_W4\.0mm_P10\.00mm"/,
  )
  expect(() => leadSpanFor("Nonexistent:Thing")).toThrow(/Footprints with a recorded span:/)
  expect(() => leadSpanFor("Nonexistent:Thing")).toThrow(
    /Resistor_THT:R_Axial_DIN0207_L6\.3mm_D2\.5mm_P10\.16mm_Horizontal/,
  )
})

test("an unsourced footprint refuses with what is missing, not with a default", () => {
  expect(() => leadSpanFor("Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm")).toThrow(
    /no lead length is sourced/,
  )
  expect(() => leadSpanFor("Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm")).toThrow(/28549/)
  expect(() => leadSpanFor("Capacitor_THT:CP_Radial_D5.0mm_P2.50mm")).toThrow(
    /no datasheet is sourced for a phi5mm can at 2\.5mm lead spacing/,
  )
})

test("every recorded span is a sane pair of integers", () => {
  for (const [footprint, entry] of LEAD_SPANS) {
    expect(Number.isInteger(entry.minSpanHoles)).toBe(true)
    expect(Number.isInteger(entry.maxSpanHoles)).toBe(true)
    expect(entry.minSpanHoles).toBeGreaterThanOrEqual(1)
    expect(entry.maxSpanHoles).toBeLessThanOrEqual(TOOL_MAX_SPAN_HOLES)
    expect(entry.maxSpanHoles).toBeGreaterThanOrEqual(entry.minSpanHoles)
    expect(entry.footprint).toBe(footprint)
    expect(entry.minBasis.length).toBeGreaterThan(0)
    expect(entry.maxBasis.length).toBeGreaterThan(0)
  }
})

test("a part that cannot be formed has one span, not a range", () => {
  for (const entry of LEAD_SPANS.values()) {
    if (entry.formable) continue
    expect(entry.maxSpanHoles).toBe(entry.minSpanHoles)
  }
  // And a formable one is inside the tool's range, which a single pin is not.
  for (const entry of LEAD_SPANS.values()) {
    if (!entry.formable) continue
    expect(entry.minSpanHoles).toBeGreaterThanOrEqual(TOOL_MIN_SPAN_HOLES)
  }
})

test("every recorded integer is reproduced by the arithmetic on its own dimensions", () => {
  for (const [footprint, entry] of LEAD_SPANS) {
    const derived = deriveSpanHoles(entry.geometry, footprint)
    expect(derived.minSpanHoles).toBe(entry.minSpanHoles)
    expect(derived.maxSpanHoles).toBe(entry.maxSpanHoles)
    expect(derived.formable).toBe(entry.formable)
  }
})

test("each bound's pitch is inside the reach its dimensions allow, and one hole more is not", () => {
  for (const entry of LEAD_SPANS.values()) {
    const geometry = formable(entry)
    if (geometry === null || !entry.formable) continue

    const minPitch = minReachPitchMm(geometry)
    const maxPitch = maxReachPitchMm(geometry)
    expect(pitchForHoles(entry.minSpanHoles)).toBeGreaterThanOrEqual(minPitch - 1e-9)
    expect(pitchForHoles(entry.maxSpanHoles)).toBeLessThanOrEqual(maxPitch + 1e-9)

    // One hole tighter must be out of reach, unless the tool's floor is what
    // stopped it; one hole wider likewise, unless the tool's ceiling did.
    if (entry.minSpanHoles > TOOL_MIN_SPAN_HOLES) {
      expect(pitchForHoles(entry.minSpanHoles - 1)).toBeLessThan(minPitch)
    }
    if (entry.maxSpanHoles < TOOL_MAX_SPAN_HOLES) {
      expect(pitchForHoles(entry.maxSpanHoles + 1)).toBeGreaterThan(maxPitch)
    }
  }
})

test("a rigid family's span is the footprint's own, and is not a reach claim", () => {
  for (const entry of LEAD_SPANS.values()) {
    const geometry = entry.geometry
    if (geometry.kind !== "rigid") continue
    expect(entry.minSpanHoles).toBe(geometry.fixedSpanHoles)
    expect(entry.maxSpanHoles).toBe(geometry.fixedSpanHoles)
    expect(geometry.nonStretchable.length).toBeGreaterThan(0)
  }
  const dip = leadSpanFor("Package_DIP:DIP-16_W7.62mm")
  expect(dip.minSpanHoles).toBe(8)
  const header = leadSpanFor("Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical")
  expect(header.maxSpanHoles).toBe(5)
})

test("the DIN0207 resistor cannot be shrunk below five holes, which the tool would allow", () => {
  const entry = leadSpanFor("Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal")
  const geometry = formable(entry)
  if (geometry === null) throw new Error("the DIN0207 entry must carry formable geometry")

  expect(entry.minSpanHoles).toBe(5)
  expect(pitchForHoles(5)).toBeCloseTo(10.16, 10)
  expect(geometry.manufacturerMinPitchMm).toBe(10.0)

  // The gap this table exists to close: the tool's own floor is 2 holes, which
  // is 5.08mm, which is inside the part's own 6.5mm body.
  expect(pitchForHoles(TOOL_MIN_SPAN_HOLES)).toBeLessThan(geometry.bodyLengthMm)
  expect(entry.minSpanHoles - TOOL_MIN_SPAN_HOLES).toBe(3)

  // And the maximum is the tool's ceiling, not the lead: the lead reaches much
  // further, so the recorded 16 is a tool bound rather than a physical one.
  expect(entry.maxSpanHoles).toBe(TOOL_MAX_SPAN_HOLES)
  expect(maxReachPitchMm(geometry)).toBeGreaterThan(pitchForHoles(TOOL_MAX_SPAN_HOLES))
})

test("the untaped B32529 reaches exactly one step past its own pitch", () => {
  for (const name of [
    "Capacitor_THT:C_Rect_L7.2mm_W2.5mm_P5.00mm",
    "Capacitor_THT:C_Rect_L7.2mm_W3.5mm_P5.00mm",
  ]) {
    const entry = leadSpanFor(name)
    const geometry = formable(entry)
    if (geometry === null) throw new Error(`${name} must carry formable geometry`)
    expect(geometry.leadLengthMm).toBe(5.0)
    expect(holesForSteps(nearestGridSteps(geometry.nominalPitchMm).steps)).toBe(3)
    expect(entry.maxSpanHoles).toBe(4)
  }
})

test("the WIMA FKP2's 4mm lead admits no forming at all", () => {
  const entry = leadSpanFor("Capacitor_THT:C_Rect_L7.2mm_W4.5mm_P5.00mm")
  const geometry = formable(entry)
  if (geometry === null) throw new Error("the FKP2 entry must carry formable geometry")
  expect(geometry.leadLengthMm).toBe(4.0)
  expect(entry.formable).toBe(false)
  expect(entry.minSpanHoles).toBe(3)
  expect(entry.maxSpanHoles).toBe(3)
})

test("the Nichicon electrolytics are lead-limited at eleven holes, below the tool's ceiling", () => {
  for (const name of [
    "Capacitor_THT:CP_Radial_D5.0mm_P2.00mm",
    "Capacitor_THT:CP_Radial_D6.3mm_P2.50mm",
    "Capacitor_THT:CP_Radial_D8.0mm_P3.50mm",
  ]) {
    const entry = leadSpanFor(name)
    const geometry = formable(entry)
    if (geometry === null) throw new Error(`${name} must carry formable geometry`)
    expect(geometry.leadLengthMm).toBe(15.0)
    expect(entry.maxSpanHoles).toBe(11)
    expect(entry.maxSpanHoles).toBeLessThan(TOOL_MAX_SPAN_HOLES)
  }
})

test("the bend rule is IPC-A-610's Table 7-1 and its 0.8mm floor, not a rule of thumb", () => {
  expect(BEND_RULE.standard).toContain("IPC-A-610")
  expect(BEND_RULE.clause).toContain("7.1.2.1")
  expect(BEND_RULE.quote).toContain("not less than 0.8 mm")

  // Table 7-1's three bands, at and either side of each boundary.
  expect(bendRadiusMm(0.5)).toBeCloseTo(0.5, 10)
  expect(bendRadiusMm(0.79)).toBeCloseTo(0.79, 10)
  expect(bendRadiusMm(0.8)).toBeCloseTo(1.2, 10)
  expect(bendRadiusMm(1.2)).toBeCloseTo(1.8, 10)
  expect(bendRadiusMm(1.21)).toBeCloseTo(2.42, 10)

  // The standoff is the larger of one lead diameter and 0.8mm, so a thin lead
  // gets the 0.8mm floor and a thick one gets its own diameter.
  expect(standoffMm(0.5)).toBe(0.8)
  expect(standoffMm(0.6)).toBe(0.8)
  expect(standoffMm(1.0)).toBe(1.0)
})

test("every number carries a document, a revision and the place it was read", () => {
  const refs = [
    STRIPBOARD.source,
    ...[...LEAD_SPANS.values()].map((entry) => entry.geometry.source),
  ]
  for (const ref of refs) {
    expect(ref.manufacturer.length).toBeGreaterThan(0)
    expect(ref.document.length).toBeGreaterThan(0)
    expect(ref.documentId.length).toBeGreaterThan(0)
    expect(ref.revision.length).toBeGreaterThan(0)
    expect(ref.location.length).toBeGreaterThan(0)
    expect(ref.url).toMatch(/^https:\/\/|^\.tools\/|^\//)
  }
  // Every formable family names the specific part its numbers are, and says
  // which packaging the lead length is for - bulk and taped differ.
  for (const entry of LEAD_SPANS.values()) {
    const geometry = formable(entry)
    if (geometry === null) continue
    expect(geometry.mpn.length).toBeGreaterThan(0)
    expect(geometry.leadLengthBasis).toMatch(/untaped|bulk|tape|pin length/i)
  }
})

test("the board the spans are for is 1.6mm of 2.54mm stripboard, from a datasheet", () => {
  expect(STRIPBOARD.thicknessMm).toBe(1.6)
  expect(STRIPBOARD.gridMm).toBe(GRID_MM)
  expect(STRIPBOARD.source.document).toContain("VEROBOARD")
  // Every lead this table records is thinner than the hole it goes through.
  for (const entry of LEAD_SPANS.values()) {
    const geometry = formable(entry)
    if (geometry === null) continue
    expect(geometry.leadDiameterMm).toBeLessThan(STRIPBOARD.holeDiameterMm)
  }
})
