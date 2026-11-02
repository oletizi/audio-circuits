/**
 * WHICH MOUNTING A SPAN REQUIRES: the derivation two emitters read, and the two
 * spans it refuses to answer for.
 *
 * **ITS OWN FILE, beside `./lead-span.test.ts` rather than inside it**, which is
 * at 469 lines and whose three claims are coverage, arithmetic and refusal over
 * the recorded TABLE. This file is about a different question - what a span the
 * board already has obliges the builder to do - and its subject is
 * `lib/kicad/lead-span-mounting.ts`.
 *
 * **WHERE EACH FIGURE COMES FROM.** The DIN0207 rows are the only recorded
 * two-mounting family, and its two floors are read off the dimensions rather
 * than written here: `axialFlatMinPitchMm` and `axialVerticalMinPitchMm` are
 * called for the pitches and `holesForSteps(gridStepsAtLeast(...))` for the
 * holes, which is the same conversion `deriveSpanHoles` uses. The ONE figure
 * written out is the owner's own: `R2` at a 3-hole span on his hand-laid
 * low-boost, which is the board that made `84d8adf` necessary and the shape
 * this whole derivation exists to name.
 *
 * **THE TWO REFUSALS ARE DRIVEN WITH SYNTHETIC GEOMETRIES, AND THAT IS STATED
 * RATHER THAN HIDDEN.** Neither is reachable from the recorded table today: the
 * DIN0207's standing floor is the grid's 2 holes, which is also the tool's
 * minimum, so no span can sit below it, and its 28mm lead folds easily. A test
 * that could only drive them through a real family would be a test for a guard
 * nobody can exercise, so the geometry is built here, each field named with why
 * it has the value it does.
 */
import { expect, test } from "bun:test"
import { gridStepsAtLeast, holesForSteps } from "../../lib/kicad/grid.ts"
import {
  axialFlatMinPitchMm,
  axialStandsOnEnd,
  axialVerticalMinPitchMm,
  deriveSpanHoles,
  type FormableGeometry,
  type LeadSpan,
} from "../../lib/kicad/lead-span-model.ts"
import {
  MOUNTING_LABEL,
  flatMinSpanHoles,
  mountingForSpan,
} from "../../lib/kicad/lead-span-mounting.ts"
import { LEAD_SPANS, leadSpanFor } from "../../lib/kicad/lead-span.ts"

const AXIAL = "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal"
const RADIAL = "Capacitor_THT:CP_Radial_D5.0mm_P2.00mm"
const RIGID = "Package_DIP:DIP-16_W7.62mm"

/** Holes from a millimetre pitch, by the one conversion `deriveSpanHoles` uses. */
function holesAtLeast(pitchMm: number): number {
  return holesForSteps(gridStepsAtLeast(pitchMm))
}

/** The formable axial geometry of the one recorded two-mounting family. */
function axialGeometry(): FormableGeometry {
  const geometry = leadSpanFor(AXIAL).geometry
  if (geometry.kind !== "formable") {
    throw new Error(`${AXIAL}'s recorded geometry is ${geometry.kind}, not formable`)
  }
  return geometry
}

test("the flat floor in holes is the flat PITCH through the grid, not a second figure", () => {
  // The two sides are computed by different routes: the left is the function
  // under test, the right is the recorded pitch converted here. They agree
  // because the function does that conversion and no other - which is the claim,
  // since a floor converted some other way would be comparable with nothing.
  const span = leadSpanFor(AXIAL)
  expect(flatMinSpanHoles(span)).toBe(holesAtLeast(axialFlatMinPitchMm(axialGeometry())))
})

test("the flat floor is STRICTLY ABOVE the recorded minSpanHoles on the axial family", () => {
  // WITHOUT THIS GAP THERE IS NOTHING TO ANNOTATE, so it is asserted rather
  // than assumed: `minSpanHoles` takes the looser of the two mountings and the
  // flat floor is the tighter one's, so a span can be legal and still below the
  // body's reach. Both numbers are read, neither written.
  const span = leadSpanFor(AXIAL)
  const flat = flatMinSpanHoles(span)
  expect(flat).toBeGreaterThan(span.minSpanHoles)
  expect(span.minSpanHoles).toBe(holesAtLeast(axialVerticalMinPitchMm(axialGeometry())))
})

test("a family with one mounting has no flat floor to be below, so it is never annotated", () => {
  // A radial can and a DIP: both leads of the one leave the same face and the
  // other's pin field is moulded, so there is no body between the holes to take
  // out and nothing a builder could do differently. `undefined` rather than a
  // number, and `one-mounting` at every span either family can be placed at.
  for (const footprint of [RADIAL, RIGID]) {
    const span = leadSpanFor(footprint)
    expect(flatMinSpanHoles(span), footprint).toBeUndefined()
    for (const holes of [span.minSpanHoles, span.maxSpanHoles]) {
      expect(mountingForSpan(span, holes), `${footprint} at ${holes}`).toBe("one-mounting")
    }
  }
})

test("the owner's own 3-hole resistor span is STOOD ON END, and 5 holes is not", () => {
  // HIS BOARD, AND THE FIGURE IS HIS: `R2` on the hand-laid low-boost spans 3
  // holes, which `HC9` rejected until `84d8adf` because the recorded minimum was
  // 5. *"It's standard practice to stand resistors on end when their holes are
  // next to each other. That's should NOT be a failure condition"*. The 5 on the
  // other side is the flat floor, read rather than written, and the pair is what
  // makes the annotation a derivation: one hole either side of that floor gives
  // two different answers.
  const span = leadSpanFor(AXIAL)
  const flat = flatMinSpanHoles(span) ?? 0
  expect(mountingForSpan(span, 3)).toBe("stood-on-end")
  expect(mountingForSpan(span, flat)).toBe("flat-fits")
  expect(mountingForSpan(span, flat - 1)).toBe("stood-on-end")
  expect(mountingForSpan(span, flat + 1)).toBe("flat-fits")
})

test("every recorded family answers at every span it can be placed at", () => {
  // THE SWEEP THAT CATCHES A FAMILY NOBODY THOUGHT ABOUT, including one added
  // later: over every entry in `LEAD_SPANS`, at every span between its own two
  // bounds, the answer is one of the three members and never a throw. The
  // refusals below are for spans OUTSIDE those bounds, which is the distinction
  // this test pins - a recorded family's own legal spans are all answerable.
  expect(LEAD_SPANS.size).toBeGreaterThan(1)
  for (const [footprint, span] of LEAD_SPANS) {
    for (let holes = span.minSpanHoles; holes <= span.maxSpanHoles; holes += 1) {
      const mounting = mountingForSpan(span, holes)
      expect(MOUNTING_LABEL[mounting], `${footprint} at ${holes} holes`).toBeTruthy()
    }
  }
})

test("the label for each mounting is the one a build sheet prints, and only one shouts", () => {
  // The guide and the grader both read `MOUNTING_LABEL`, so the wording is one
  // thing rather than two. The instruction is the only one in capitals: a sheet
  // whose every row shouts has no emphasis left for the row that matters.
  expect(MOUNTING_LABEL["stood-on-end"]).toBe("STAND ON END")
  expect(MOUNTING_LABEL["flat-fits"]).toBe(MOUNTING_LABEL["flat-fits"].toLowerCase())
  expect(MOUNTING_LABEL["one-mounting"]).toBe(MOUNTING_LABEL["one-mounting"].toLowerCase())
})

/**
 * A two-mounting family whose STANDING floor is above the grid, so there is a
 * span below `minSpanHoles` to ask about.
 *
 * It is the DIN0207's recorded dimensions with ONE field changed: the body
 * diameter goes from 2.5mm to 12mm, so the returning lead's centreline sits
 * `6 + 0.3 = 6.3mm` from the body axis and the standing floor becomes 3 grid
 * steps rather than one. Nothing else is touched, and the figure it moves is
 * asserted below rather than assumed.
 */
function fatBodied(): LeadSpan {
  const geometry: FormableGeometry = { ...axialGeometry(), bodyDiameterMm: 12.0 }
  return { ...leadSpanFor(AXIAL), ...deriveSpanHoles(geometry, AXIAL), geometry }
}

test("a span below minSpanHoles refuses, naming HC9, rather than reading STAND ON END", () => {
  // NO MOUNTING REACHES IT, so there is no instruction to print: `minSpanHoles`
  // is already the looser of the two mountings. A build sheet saying STAND ON
  // END there would be an instruction nobody can carry out, which is worse than
  // a blank cell and worse than a refusal.
  const span = fatBodied()
  expect(span.minSpanHoles).toBeGreaterThan(2)
  expect(() => mountingForSpan(span, span.minSpanHoles - 1)).toThrow(
    /below its recorded minSpanHoles/,
  )
  expect(() => mountingForSpan(span, span.minSpanHoles - 1)).toThrow(/NOT reported as STAND ON END/)
  expect(() => mountingForSpan(span, span.minSpanHoles - 1)).toThrow(/HC9/)
  // AND IT STILL ANSWERS AT ITS OWN FLOOR, so the refusal is about the span
  // being out of reach and not about this family.
  expect(mountingForSpan(span, span.minSpanHoles)).toBe("stood-on-end")
})

test("a lead too short to fold refuses rather than defaulting to either mounting", () => {
  // The second refusal, and it reports a DEFECT rather than a board: a family
  // whose lead cannot make the fold has no standing mounting, so
  // `minReachPitchMm` returns the FLAT floor and nothing below it is legal -
  // meaning `minSpanHoles` and this derivation would have to disagree for the
  // branch to be reached at all. It is driven here by pairing a short-lead
  // geometry with the long-lead family's recorded bounds, which is exactly that
  // disagreement.
  const short: FormableGeometry = { ...axialGeometry(), leadLengthMm: 4.0 }
  expect(axialStandsOnEnd(short)).toBe(false)
  const span: LeadSpan = { ...leadSpanFor(AXIAL), geometry: short }
  expect(() => mountingForSpan(span, 3)).toThrow(/too short to fold/)
  expect(() => mountingForSpan(span, 3)).toThrow(/NOT defaulted to flat/)
})
