/**
 * A PART'S BODY MARGIN COMES OUT OF ITS OWN `.kicad_mod`, NEVER A TABLE - and
 * what refuses rather than guesses when that derivation cannot be done.
 *
 * **WHAT THESE ESTABLISH.** That `bodyMarginsFor` derives the correct number
 * of whole holes a footprint's moulded body reaches past its own pads, on
 * both axes, for every recorded footprint - not a hand-typed figure; that the
 * row-axis guard (`unmeasuredAlongAxis`) fires exactly when a footprint's
 * classification claims an along-row pitch nothing in its pad pattern
 * measured, and stays silent when a real pitch was measured, whatever the
 * footprint's shape; and that the derivation refuses by name, never by
 * guessing a box, for an unrecorded footprint, an unrecorded pin pattern, a
 * malformed pin id, a pad the footprint does not have, a margin read off an
 * unmeasured axis with a real overhang on it, and a body margin that is not a
 * whole number of holes.
 *
 * **ONE OF SIX FILES `./seed-room.test.ts` SPLIT INTO** (`docs/known-gaps.md`
 * G6, settled 2026-10-18); see `./seed-room-hand-boards.test.ts` for the
 * other five.
 *
 * **A refusal test here asserts its leading key and the facts the message
 * must carry, never its prose.** A message rewritten keeps these tests
 * passing, which is intended; a message that stops naming the part, the
 * footprint or the side does not.
 */
import { expect, test } from "bun:test"
import { LEAD_SPANS } from "../../../lib/kicad/lead-span.ts"
import { PIN_PATTERNS } from "../../../lib/kicad/pin-pattern.ts"
import { padHolesFor } from "../../../lib/kicad/formed-frame.ts"
import { bodyMarginsFor, seedPartsFrom, unmeasuredAlongAxis } from "../../../lib/stripboard/seed-parts.ts"
import { seedsFrom } from "../../../lib/stripboard/seed.ts"
import {
  netlistOf,
  ordering,
  refusalFrom,
  syntheticSpan,
  twoLead,
} from "./seed-fixtures.ts"
import type { PinPattern } from "../../../lib/kicad/pin-pattern-model.ts"

const SOURCE = { patterns: PIN_PATTERNS, spans: LEAD_SPANS }

test("a part's body margins come out of its own .kicad_mod", () => {
  // The 220uF can on the feedback board, whose body the owner saw stacked on a
  // trimmer: 8mm across, so two holes past its pads on each side of the row.
  expect(bodyMarginsFor("Capacitor_THT:CP_Radial_D8.0mm_P3.50mm", SOURCE)).toEqual({
    beforeAlong: 1,
    afterAlong: 1,
    beforeAcross: 2,
    afterAcross: 2,
  })
  // A DIN0207 resistor's body lies between its leads and reaches past neither.
  expect(
    bodyMarginsFor("Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal", SOURCE),
  ).toEqual({ beforeAlong: 0, afterAlong: 0, beforeAcross: 0, afterAcross: 0 })
  // Every recorded footprint derives, and no margin is negative.
  for (const footprint of PIN_PATTERNS.keys()) {
    const margins = bodyMarginsFor(footprint, SOURCE)
    for (const [side, steps] of Object.entries(margins)) {
      expect(steps, `${footprint} ${side}`).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(steps), `${footprint} ${side} is whole`).toBe(true)
    }
  }
})

test("the row-axis guard fires on a footprint with no measured along-pitch", () => {
  // PinHeader_1x05: five pads, one distinct xSteps. classifyPads calls that
  // axis "x" and the old guard believed it.
  const pattern = PIN_PATTERNS.get("Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical")
  if (pattern === undefined) throw new Error("the fixture footprint is not recorded")
  const pads = padHolesFor(pattern)
  expect(new Set(pads.map((p) => p.xSteps)).size, "the premise: one distinct xSteps").toBe(1)
  expect(unmeasuredAlongAxis(pattern), "and the guard sees it").toBe(true)

  // The negative: a footprint whose along-row pitch WAS measured must not be
  // flagged, or the guard is merely stricter rather than correct.
  const to92 = PIN_PATTERNS.get("Package_TO_SOT_THT:TO-92_Inline")
  if (to92 === undefined) throw new Error("the fixture footprint is not recorded")
  expect(new Set(padHolesFor(to92).map((p) => p.xSteps)).size, "three distinct xSteps").toBe(3)
  expect(unmeasuredAlongAxis(to92), "TO-92 measured a real pitch").toBe(false)

  const dip16 = PIN_PATTERNS.get("Package_DIP:DIP-16_W7.62mm")
  if (dip16 === undefined) throw new Error("the fixture footprint is not recorded")
  expect(new Set(padHolesFor(dip16).map((p) => p.xSteps)).size, "two distinct xSteps").toBe(2)
  expect(unmeasuredAlongAxis(dip16), "DIP-16 measured a real pitch").toBe(false)
})

test("the row-axis guard refuses a margin read off an axis nothing measured", () => {
  // PinHeader_1x05 itself is unmeasured-along-x AND harmless: its margins are
  // all zero, because nothing varies along the unmeasured axis to overhang
  // from - the "every recorded footprint derives" test above covers exactly
  // that, unchanged. What the guard must still catch is the combination this
  // repository has no recorded footprint for: an unmeasured axis claim paired
  // with a REAL overhang on it. Built here from a real, as-moulded entry
  // (`CP_Radial_D6.3mm_P2.50mm`, a one-row-of-two with a measured 1-hole
  // along-margin each side) with its pads re-stated as two singleton rows -
  // the PinHeader shape - while keeping its real `.kicad_mod` file and
  // version, so the body overhang `occupiedAreaFor` reads is genuine and not
  // invented for the test.
  const real = PIN_PATTERNS.get("Capacitor_THT:CP_Radial_D6.3mm_P2.50mm")
  if (real === undefined) throw new Error("the fixture footprint is not recorded")
  const vacuous: PinPattern = {
    ...real,
    pads: [
      { pad: "1", xMm: 0, yMm: 0 },
      { pad: "2", xMm: 0, yMm: 2.54 },
    ],
    classification: {
      kind: "rows",
      axis: "x",
      rows: [["1"], ["2"]],
      rowPitchSteps: [1],
      alongRowPitchesMm: [],
      alongRowOnGrid: true,
    },
  }
  expect(unmeasuredAlongAxis(vacuous), "the premise: no measured along-pitch").toBe(true)
  const patterns = new Map([[vacuous.footprint, vacuous]])
  const synthetic = { patterns, spans: LEAD_SPANS }
  expect(refusalFrom(() => bodyMarginsFor(vacuous.footprint, synthetic))).toStartWith(
    "stripboard-seed-parts-row-axis",
  )
})

test("the geometry derivation refuses by name rather than guessing a box", () => {
  expect(refusalFrom(() => bodyMarginsFor("SYNTHETIC:Nothing_Recorded", SOURCE))).toStartWith(
    "stripboard-seed-parts-no-pattern",
  )
  const nets = new Map([["A", ["R1.1", "R1.2"]]])
  expect(refusalFrom(() => seedPartsFrom(nets, new Map(), SOURCE))).toStartWith(
    "stripboard-seed-parts-no-footprint",
  )
  expect(
    refusalFrom(() => seedPartsFrom(new Map([["A", ["R1"]]]), new Map(), SOURCE)),
  ).toStartWith("stripboard-seed-parts-pin-id-malformed")
  const wrongPins = new Map([["A", ["Q1.9", "Q1.8", "Q1.7"]]])
  const message = refusalFrom(() =>
    seedPartsFrom(wrongPins, new Map([["Q1", "Package_TO_SOT_THT:TO-92_Inline"]]), SOURCE),
  )
  expect(message).toStartWith("stripboard-seed-parts-pad-missing")
  expect(message, "it names the pads the footprint does have").toContain("[1, 2, 3]")
})

test("a body margin that is not a whole number of holes refuses by name", () => {
  const broken = netlistOf([
    twoLead("R1", "SYNTHETIC:Seed_Bodied", ["1", "A"], ["2", "B"], {
      body: { beforeAlong: 0, afterAlong: 0.5, beforeAcross: 0, afterAcross: 0 },
    }),
  ])
  const spans = new Map([["SYNTHETIC:Seed_Bodied", syntheticSpan("SYNTHETIC:Seed_Bodied", 2, 6)]])
  const message = refusalFrom(() =>
    seedsFrom(broken, { strips: 8, columns: 8 }, spans, [ordering("ab", ["A", "B"], 1)]),
  )
  expect(message).toStartWith("stripboard-seed-body-margin-not-whole")
  expect(message, "it names the part").toContain('"R1"')
  expect(message, "and the side").toContain("afterAlong")
})
