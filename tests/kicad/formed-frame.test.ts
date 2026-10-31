/**
 * The forming anchor, checked against the record that settles it: KiCad's own
 * second footprint for each formed body.
 *
 * The other record - the owner's committed layouts - is in
 * `./formed-frame-layouts.test.ts`, split off when the two together went past
 * this repository's 300-500 line ceiling. What both need is in
 * `./formed-frame-fixtures.ts`.
 *
 * **THE FIRST TEST IS THE ONE THAT MATTERS AND IT IS NOT A TEST OF THIS CODE.**
 * It opens six `.kicad_mod` files - each of this repository's three formed
 * bodies at its moulded pitch and at another pitch KiCad also ships - and
 * measures how far the body outline moved. If the recorded anchor is right, the
 * movement equals the travel of the midpoint between the outermost pads in all
 * three pairs; if `first-lead` were right it would be zero in all three, and if
 * `last-lead` were right it would be the outermost pad's own travel. The three
 * pairs disagree with both alternatives, separately, so no single file is load
 * bearing. Nothing in this repository wrote those files.
 *
 * WHAT THESE TESTS DELIBERATELY DO NOT DO is assert the holes a formed footprint
 * covers against a figure written here. That figure is the module's own output;
 * a table of it in this file would be the derivation grading itself.
 *
 * REFUSALS ARE ASSERTED ON THEIR LEADING KEY with `toStartWith`. Five times in
 * this repository a regex has matched a refusal's reasoning while its verdict
 * was wrong.
 *
 * NOTHING HERE SKIPS. On a machine without the KiCad libraries every test below
 * fails by name rather than passing quietly.
 */
import { expect, test } from "bun:test"
import { GRID_MM } from "../../lib/kicad/grid.ts"
import { occupiedAreaFor } from "../../lib/kicad/footprint-extent.ts"
import { formedFrameOf, padHolesFor } from "../../lib/kicad/formed-frame.ts"
import { classifyPads } from "../../lib/kicad/pin-pattern-model.ts"
import type { PinPattern } from "../../lib/kicad/pin-pattern-model.ts"
import { leadSpanFor } from "../../lib/kicad/lead-span.ts"
import { geometryOf } from "../../lib/stripboard/board.ts"
import { PIN_PATTERNS, pinPatternFor } from "../../lib/kicad/pin-pattern.ts"
import { readFootprintPads } from "./footprint-library.ts"
import {
  FORMED,
  midpointOf,
  PAIRS,
  refusalFrom,
  rowCoordinates,
} from "./formed-frame-fixtures.ts"
import { ringPattern } from "../stripboard/synthetic-footprints.ts"

test("KiCad's own prepared-pitch footprints put the body on the lead row's midpoint", () => {
  for (const pair of PAIRS) {
    const mouldedCoords = rowCoordinates(pair.moulded)
    const preparedCoords = rowCoordinates(pair.prepared)
    expect(preparedCoords.length, `${pair.prepared} pad count`).toBe(mouldedCoords.length)

    // Both boxes through the module that reads them, with the recorded pattern
    // re-pointed at the prepared file - the fixture shape
    // ./footprint-extent-fixtures.ts establishes, for the reason it gives.
    const recorded = pinPatternFor(pair.moulded, PIN_PATTERNS)
    const preparedFile = readFootprintPads(pair.prepared)
    const injected: PinPattern = {
      ...recorded,
      source: {
        ...recorded.source,
        file: preparedFile.file,
        version: preparedFile.version,
        padCount: preparedFile.padCount,
      },
    }
    const moulded = occupiedAreaFor(pair.moulded)
    const prepared = occupiedAreaFor(
      pair.moulded,
      new Map([...PIN_PATTERNS, [pair.moulded, injected]]),
    )

    // THE SAME BODY, so the box is the same size - the claim that makes the
    // translation below meaningful rather than two unrelated boxes compared.
    const width = (box: typeof moulded.outlineMm): number => box.maxXMm - box.minXMm
    expect(width(prepared.outlineMm), `${pair.prepared} body width`).toBeCloseTo(
      width(moulded.outlineMm),
      9,
    )
    expect(prepared.outlineMm.minYMm, `${pair.prepared} body y`).toBe(moulded.outlineMm.minYMm)
    expect(prepared.outlineMm.maxYMm, `${pair.prepared} body y`).toBe(moulded.outlineMm.maxYMm)

    const moved = prepared.outlineMm.minXMm - moulded.outlineMm.minXMm
    expect(prepared.outlineMm.maxXMm - moulded.outlineMm.maxXMm, "a translation, not a resize")
      .toBeCloseTo(moved, 9)

    const byMidpoint = midpointOf(preparedCoords) - midpointOf(mouldedCoords)
    const byFirstLead = (preparedCoords[0] ?? NaN) - (mouldedCoords[0] ?? NaN)
    const last = mouldedCoords.length - 1
    const byLastLead = (preparedCoords[last] ?? NaN) - (mouldedCoords[last] ?? NaN)

    expect(moved, `${pair.prepared}: the body moved with the row's midpoint`).toBeCloseTo(
      byMidpoint,
      9,
    )
    // AND THE PAIR DISCRIMINATES. Without these two the test would pass on any
    // footprint whose three candidate shifts happen to coincide.
    expect(Math.abs(moved - byFirstLead), `${pair.prepared}: not the first lead`).toBeGreaterThan(
      0.1,
    )
    expect(Math.abs(moved - byLastLead), `${pair.prepared}: not the last lead`).toBeGreaterThan(0.1)
  }
})

test("the recorded anchor is the one those file pairs state", () => {
  const formed = [...PIN_PATTERNS.values()].filter(
    (pattern) => pattern.accommodation.kind === "formed-to-grid",
  )
  expect(formed.map((pattern) => pattern.footprint).sort(), "the formed patterns").toEqual([
    ...FORMED,
  ].sort())
  for (const pattern of formed) {
    if (pattern.accommodation.kind !== "formed-to-grid") throw new Error("unreachable")
    expect(pattern.accommodation.anchor, pattern.footprint).toBe("lead-row-midpoint")
  }
})

test("the shift formedFrameOf returns is the midpoint travel, derived from the pads", () => {
  // The arithmetic, against the pads in the FILE rather than against the figure
  // the module computed. The prepared midpoint is half the prepared span, since
  // the frame's origin is the first lead's hole.
  for (const footprint of FORMED) {
    const pattern = pinPatternFor(footprint)
    if (pattern.accommodation.kind !== "formed-to-grid") throw new Error("unreachable")
    const coords = rowCoordinates(footprint)
    const span = (coords.length - 1) * pattern.accommodation.preparedPitchSteps * GRID_MM
    const frame = formedFrameOf(pattern)
    expect(frame.axis, footprint).toBe("x")
    expect(frame.shiftMm, footprint).toBeCloseTo(span / 2 - midpointOf(coords), 9)
  }
})

test("every as-moulded pattern's shift is zero, so nothing moved for the other twelve", () => {
  let checked = 0
  for (const pattern of PIN_PATTERNS.values()) {
    if (pattern.accommodation.kind !== "as-moulded") continue
    checked += 1
    expect(formedFrameOf(pattern).shiftMm, pattern.footprint).toBe(0)
    expect(occupiedAreaFor(pattern.footprint).anchorShiftMm, pattern.footprint).toBe(0)
  }
  expect(checked, "twelve of the fifteen recorded patterns are as-moulded").toBe(12)
})

test("a formed pattern's pads are counted off the prepared pitch, not read off the file", () => {
  // The pads in the file are at the MOULDED pitch and two of TO-92_Inline's
  // three are half a step off the grid, so reading them through the grid check
  // would refuse the footprint the accommodation exists to admit.
  for (const footprint of FORMED) {
    const pattern = pinPatternFor(footprint)
    if (pattern.accommodation.kind !== "formed-to-grid") throw new Error("unreachable")
    const pitch = pattern.accommodation.preparedPitchSteps
    const holes = padHolesFor(pattern)
    expect(holes.length, footprint).toBe(pattern.pads.length)
    expect(
      holes.map((hole) => hole.xSteps),
      `${footprint}: one hole per pad at the prepared pitch`,
    ).toEqual(pattern.pads.map((_, index) => index * pitch))
    for (const hole of holes) expect(hole.ySteps, `${footprint} across`).toBe(0)
  }
})

test("the recorded anchor is load bearing, and for a family lead-span.ts calls rigid", () => {
  /*
   * WHY THIS TEST EXISTS, AND WHAT IT CORRECTS. The owner's rule is that "the
   * only time you care about the body dimensions is if the leads are very short
   * (like certain box capacitors) or rigid like dip packaged chips" - so for a
   * `formable` family the body is not a constraint and the anchor cannot matter.
   * That reads as making the anchor moot. IT DOES NOT, and the correction came
   * from running this:
   *
   *   footprint                   lead-span.ts   anchor changes geometryOf's holes?
   *   CP_Radial_D5.0mm_P2.00mm    formable       yes - 6 holes against 9
   *   CP_Radial_D8.0mm_P3.50mm    formable       no
   *   TO-92_Inline                RIGID          YES - 9 holes against 7
   *
   * `TO-92_Inline` is a family `lead-span.ts` records as `formable: false`, and
   * its occupancy changes with the anchor, so the anchor is a record a rigid
   * part's geometry depends on. Two earlier versions of this measurement said
   * otherwise - one compared `alongX`, the BODY span alone, and one took a 1-D
   * union along the lead row; `geometryOf` builds the whole RECTANGLE from both
   * spans and unions the pads into it, and the rectangle is what a caller sees.
   *
   * THE TEST IS DIRECTIONAL, not a table of hole counts: it asserts that at
   * least one anchor-sensitive footprint is one the body genuinely constrains.
   * If that stops being true - because the hole-ownership rule changes, which
   * docs/stripboard/pin-pattern.md section 3.1 records as an open criteria
   * decision - this fails and says so, and the anchor becomes deletable.
   */
  const sensitive: string[] = []
  for (const footprint of FORMED) {
    const pattern = pinPatternFor(footprint)
    const accommodation = pattern.accommodation
    if (accommodation.kind !== "formed-to-grid") throw new Error("unreachable")
    const sets = new Set(
      (["lead-row-midpoint", "first-lead", "last-lead"] as const).map((anchor) => {
        const patterns: ReadonlyMap<string, PinPattern> = new Map([
          ...PIN_PATTERNS,
          [footprint, { ...pattern, accommodation: { ...accommodation, anchor } }],
        ])
        const { holes } = geometryOf(footprint, { strip: 0, column: 0 }, "E", patterns)
        return holes
          .map((hole) => `${hole.strip},${hole.column}`)
          .sort()
          .join(" ")
      }),
    )
    if (sets.size > 1) sensitive.push(footprint)
  }
  expect(sensitive.length, "at least one formed footprint's holes depend on the anchor")
    .toBeGreaterThan(0)
  const rigidAndSensitive = sensitive.filter((footprint) => !leadSpanFor(footprint).formable)
  expect(
    rigidAndSensitive,
    "the anchor is recorded because a RIGID family's occupancy depends on it. If this list is " +
      "empty, every anchor-sensitive footprint is one whose body the owner says is not a " +
      "constraint, and the anchor record can be deleted - see docs/stripboard/pin-pattern.md " +
      "section 3.1",
  ).toContain("Package_TO_SOT_THT:TO-92_Inline")
})

// ---------------------------------------------------------------------------
// What still refuses.
// ---------------------------------------------------------------------------

test("a multi-row formed pattern refuses by name rather than assuming the rows bend alike", () => {
  // CONSTRUCTED, because no recorded formed footprint has two rows. DIP-16 has
  // eight, and a formed accommodation on it is the shape nothing has measured.
  // The accommodation is borrowed whole from an entry that legitimately carries
  // one, so no `as Type` is needed anywhere.
  const dip = pinPatternFor("Package_DIP:DIP-16_W7.62mm")
  const formed = pinPatternFor("Package_TO_SOT_THT:TO-92_Inline")
  if (formed.accommodation.kind !== "formed-to-grid") throw new Error("unreachable")
  const multiRow: PinPattern = { ...dip, accommodation: formed.accommodation }
  expect(refusalFrom(() => formedFrameOf(multiRow))).toStartWith(
    `formed-frame-row-unmeasured: "${dip.footprint}"`,
  )
  expect(refusalFrom(() => padHolesFor(multiRow))).toStartWith(
    `formed-frame-row-unmeasured: "${dip.footprint}"`,
  )
  expect(refusalFrom(() => occupiedAreaFor(dip.footprint, new Map([[dip.footprint, multiRow]]))))
    .toStartWith(`formed-frame-row-unmeasured: "${dip.footprint}"`)
})

test("a formed row whose moulded pitches are unequal refuses by name", () => {
  // The other unmeasured shape: one `preparedPitchSteps` covers the whole row,
  // so an unevenly-moulded row makes every interior lead a candidate anchor
  // too. Three pads at 1.27 and 3.81 - collinear, one row, uneven.
  const pads = [
    { pad: "1", xMm: 0, yMm: 0 },
    { pad: "2", xMm: 1.27, yMm: 0 },
    { pad: "3", xMm: 5.08, yMm: 0 },
  ]
  const formed = pinPatternFor("Package_TO_SOT_THT:TO-92_Inline")
  if (formed.accommodation.kind !== "formed-to-grid") throw new Error("unreachable")
  const uneven: PinPattern = {
    footprint: "SYNTHETIC:Uneven_Moulded_Row",
    pads,
    source: {
      file: "tests/kicad/formed-frame.test.ts - SYNTHETIC, not a KiCad footprint",
      version: "none",
      padCount: pads.length,
      excludedPads: [],
    },
    classification: classifyPads(pads),
    accommodation: formed.accommodation,
    basis:
      "Three collinear pads at uneven moulded spacing. Synthetic: it exists so the uneven-row " +
      "refusal is exercised, because all three recorded formed footprints are evenly moulded.",
  }
  expect(uneven.classification.kind, "it is one row, so the row-count guard is passed").toBe("rows")
  expect(refusalFrom(() => formedFrameOf(uneven))).toStartWith(
    `formed-frame-row-unmeasured: "${uneven.footprint}"`,
  )
})

test("a pattern whose pads do not decompose into rows refuses a pad map, by name", () => {
  // The ring from tests/stripboard/synthetic-footprints.ts: the one pad field in
  // this repository that does NOT decompose into rows parallel to the strips,
  // with its classification derived by classifyPads from its pads rather than
  // asserted. No file is read - this refusal is about the pads.
  const ring = ringPattern()
  expect(refusalFrom(() => padHolesFor(ring))).toStartWith(
    `formed-frame-no-rows: "${ring.footprint}"`,
  )
})

test("an as-moulded pad off the grid refuses rather than being rounded to a hole", () => {
  // CONSTRUCTED, because no recorded pattern can reach it: an off-grid pitch
  // with no recorded accommodation is exactly what admitPattern refuses, so
  // every footprint this repository places is either on the grid or formed onto
  // it. The pads are 9.4mm apart - 0.86mm from four whole steps, well past the
  // 0.15mm tolerance - and classifyPads derives the classification from them.
  const pads = [
    { pad: "1", xMm: 0, yMm: 0 },
    { pad: "2", xMm: 9.4, yMm: 0 },
  ]
  const offGrid: PinPattern = {
    footprint: "SYNTHETIC:Off_Grid_Pitch_P9.40mm",
    pads,
    source: {
      file: "tests/kicad/formed-frame.test.ts - SYNTHETIC, not a KiCad footprint",
      version: "none",
      padCount: pads.length,
      excludedPads: [],
    },
    classification: classifyPads(pads),
    accommodation: { kind: "as-moulded" },
    basis:
      "Two pads 9.40mm apart and recorded as-moulded. Synthetic: it exists so that " +
      "padHolesFor's off-grid refusal is exercised, and admitPattern refuses this shape, so no " +
      "footprint this repository places can reach it.",
  }
  expect(offGrid.classification.kind, "it classifies as rows, so the rows guard is passed").toBe(
    "rows",
  )
  expect(refusalFrom(() => padHolesFor(offGrid))).toStartWith(
    `formed-frame-pad-off-grid: "${offGrid.footprint}" pad "2"`,
  )
})
