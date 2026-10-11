import { test, expect } from "bun:test"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import {
  fabricationExtent,
  requiredFeatures,
  trimPreservesConnectivity,
  withinExtent,
} from "../../tools/stripboard/extent.ts"
import { holeKey } from "../../tools/stripboard/copper.ts"
import {
  everyExtentFixture,
  SOLDER_AND_CUT_PAST_BOUNDS,
  WIRE_PAST_BOUNDS,
} from "./extent-fixtures.ts"

/**
 * `HC6`'s quantity, graded on its own before any constraint reads it.
 *
 * `tools/stripboard/extent.ts` is a MEASUREMENT module: it returns numbers and
 * a comparison, and `HC6` is the only thing that turns them into a verdict. So
 * these tests assert the arithmetic's PROPERTIES - that a union is never
 * smaller than a part, that a trim either reproduces the partition or says
 * which hole it lost - and never recompute the implementation's own expression
 * on both sides of an `expect`.
 */

test("requiredFeatures enumerates the four kinds and nothing else, with both holes of a pair", () => {
  const dump = parseBoardDump(WIRE_PAST_BOUNDS)
  const features = requiredFeatures(dump)
  // The counts are read off the fixture's own lines, which are in front of a
  // reader in extent-fixtures.ts: four PIN lines, one CUT (two holes), one
  // SOLDER (two holes), one WIRE (two ends).
  expect(features.filter((feature) => feature.kind === "pin")).toHaveLength(4)
  expect(features.filter((feature) => feature.kind === "cut")).toHaveLength(2)
  expect(features.filter((feature) => feature.kind === "solder")).toHaveLength(2)
  expect(features.filter((feature) => feature.kind === "wire")).toHaveLength(2)
  expect(features).toHaveLength(10)
  // Every feature says what it belongs to, so a refusal can point at it.
  for (const feature of features) expect(feature.names, feature.hole).not.toBe("")
  // BOTH holes of the cut, not one: a board trimmed past either end has no gap
  // to sever, so the two nets the cut separates stay joined.
  expect(features.filter((feature) => feature.kind === "cut").map((feature) => feature.hole).sort())
    .toEqual(["1,2", "1,3"])
})

test("nothing is inferred from SPAN: a stretched part's holes come only from PIN", () => {
  // Both fixture resistors carry SPAN 4 while their leads are 4 columns apart,
  // which is a 5-hole span - SPAN is the footprint's own column count, never a
  // lead span. If anything here read SPAN, changing it would move a hole.
  const widened = WIRE_PAST_BOUNDS.replace("AT 1,1 SPAN 4", "AT 1,1 SPAN 9")
  expect(requiredFeatures(parseBoardDump(widened))).toEqual(
    requiredFeatures(parseBoardDump(WIRE_PAST_BOUNDS)),
  )
})

test("the fabrication extent is the union, so it is never smaller than either input", () => {
  // The conservatism is the whole argument: HC6 may be STRICTER than the truth
  // and must never be looser. A union cannot be smaller than a part.
  for (const [name, dump] of everyExtentFixture()) {
    const extent = fabricationExtent(dump)
    const bounds = dump.bounds
    if (bounds === undefined) throw new Error(`${name}: fixture must carry a BOUNDS line`)
    expect(extent.minRow, name).toBeLessThanOrEqual(bounds.minRow)
    expect(extent.maxRow, name).toBeGreaterThanOrEqual(bounds.maxRow)
    expect(extent.minCol, name).toBeLessThanOrEqual(bounds.minCol)
    expect(extent.maxCol, name).toBeGreaterThanOrEqual(bounds.maxCol)
    for (const feature of requiredFeatures(dump)) {
      expect(withinExtent(feature.hole, extent), `${name}: ${feature.kind} ${feature.names}`).toBe(
        true,
      )
    }
  }
})

test("featuresOutsideBounds is non-empty exactly where a feature reaches past BOUNDS", () => {
  // THE DISCRIMINATING PAIR. A test that only ever saw a non-empty list would
  // pass for an implementation that reported every feature as outside, and one
  // that only ever saw an empty list would pass for an implementation that
  // reported none. Both cases are here, and the second comes from real boards.
  const wire = fabricationExtent(parseBoardDump(WIRE_PAST_BOUNDS))
  // ONE wire feature, not two: W1's ends are 2,6 and 4,7, and only 4,7 is past
  // BOUNDS 1,1 4,6. Each END is enumerated separately and judged separately -
  // this expectation read "wire, wire" until the fixture corrected it, which is
  // the whole reason the figures here are read off the fixture's own lines
  // rather than derived from what the extent returned.
  expect(wire.featuresOutsideBounds.map((feature) => feature.kind)).toEqual(["wire"])
  expect(wire.featuresOutsideBounds[0]?.hole).toBe("4,7")
  // BOUNDS stops at column 6 and W1 reaches 7, so the extent is one column
  // wider than BOUNDS in that axis and identical in the other.
  expect([wire.minRow, wire.minCol, wire.maxRow, wire.maxCol]).toEqual([1, 1, 4, 7])
  expect([wire.rows, wire.cols]).toEqual([4, 7])

  const solder = fabricationExtent(parseBoardDump(SOLDER_AND_CUT_PAST_BOUNDS))
  // A cut's far end and both bridge holes lie past BOUNDS 1,1 3,4 here, so the
  // kinds reported are not only "wire".
  expect([...new Set(solder.featuresOutsideBounds.map((feature) => feature.kind))].sort()).toEqual([
    "cut",
    "solder",
  ])
  expect([solder.maxRow, solder.maxCol]).toEqual([3, 5])
})

test("BOUNDS and the features coincide on real boards, which is the empty half of that pair", () => {
  // Measured in docs/stripboard/pipeline-verification.md section 2.1 and
  // re-measured here through the binary: on pultec-low-boost and pt2399-core
  // BOUNDS equals the extent of every enumerated hole, so nothing is outside.
  const byName = new Map(everyExtentFixture())
  for (const name of ["pultec-low-boost", "pt2399-core"]) {
    const dump = byName.get(name)
    if (dump === undefined) throw new Error(`${name} is not among the extent fixtures`)
    expect(fabricationExtent(dump).featuresOutsideBounds, name).toEqual([])
  }
  // And on transistor-preamp-staged BOUNDS OVER-states: it reaches columns no
  // hole does, so the union equals BOUNDS there and nothing is outside either -
  // the over-statement shows up as the extent being wider than every feature,
  // not as a feature outside.
  const staged = byName.get("transistor-preamp-staged")
  if (staged === undefined) throw new Error("transistor-preamp-staged is not among the fixtures")
  const extent = fabricationExtent(staged)
  expect(extent.featuresOutsideBounds).toEqual([])
  const columns = requiredFeatures(staged).map((feature) => Number(feature.hole.split(",")[1]))
  expect(extent.maxCol).toBeGreaterThan(Math.max(...columns))
})

test("fabricationExtent refuses a dump with no BOUNDS rather than using the feature extent", () => {
  // Task 7's ruling. The feature extent is a LOWER bound on physical extent,
  // because a body overhangs its leads, so substituting it would silently
  // LOOSEN whatever asked - a board graded as fitting the stock that does not.
  const noBounds = parseBoardDump(
    WIRE_PAST_BOUNDS.split("\n").filter((line) => !line.startsWith("BOUNDS ")).join("\n"),
  )
  expect(() => fabricationExtent(noBounds)).toThrow(/BOUNDS/)
  expect(() => fabricationExtent(noBounds)).toThrow(/NOT defaulted/)
  // And "BOUNDS - -", the board with nothing on it, refuses the same way rather
  // than parsing GetBounds' wrong-ended sentinels as a one-hole rect.
  const emptyRect = parseBoardDump(WIRE_PAST_BOUNDS.replace("BOUNDS 1,1 4,6", "BOUNDS - -"))
  expect(() => fabricationExtent(emptyRect)).toThrow(/BOUNDS/)
})

test("withinExtent is inclusive at both ends and false just outside each of the four", () => {
  const extent = fabricationExtent(parseBoardDump(WIRE_PAST_BOUNDS))
  expect(withinExtent(holeKey({ row: extent.minRow, col: extent.minCol }), extent)).toBe(true)
  expect(withinExtent(holeKey({ row: extent.maxRow, col: extent.maxCol }), extent)).toBe(true)
  expect(withinExtent(holeKey({ row: extent.minRow - 1, col: extent.minCol }), extent)).toBe(false)
  expect(withinExtent(holeKey({ row: extent.minRow, col: extent.minCol - 1 }), extent)).toBe(false)
  expect(withinExtent(holeKey({ row: extent.maxRow + 1, col: extent.maxCol }), extent)).toBe(false)
  expect(withinExtent(holeKey({ row: extent.maxRow, col: extent.maxCol + 1 }), extent)).toBe(false)
})

test("trimming to the fabrication extent preserves the reconstructed connectivity", () => {
  // The claim "a cuttable board includes every feature that preserves
  // connectivity", made as a computation: rebuild the copper graph from a dump
  // restricted to the extent and compare the PARTITION OF THE PIN HOLES with
  // the untrimmed one. An extent that dropped the copper run a cut depends on
  // changes that partition, which is exactly the failure a bounding box hides.
  for (const [name, dump] of everyExtentFixture()) {
    const result = trimPreservesConnectivity(dump, fabricationExtent(dump))
    expect(result.preserved, `${name}: ${result.detail}`).toBe(true)
    // A pass says what it checked, so a vacuous one is visible.
    expect(result.detail, name).toMatch(/required features/)
  }
})

test("trimming to a DELIBERATELY TOO SMALL extent is detected, so the check can fail", () => {
  // Without this the test above passes for a trim that drops nothing because
  // the extent is the whole board, and it would never have been exercised.
  //
  // THE FIRST FIXTURE IS THE ONE THIS WORKS ON, and that is why it is first:
  // WIRE_PAST_BOUNDS puts a wire end at the extent's own maxCol. On a board
  // whose maxCol comes from BOUNDS alone - transistor-preamp-feedback, measured
  // - shrinking by one column drops nothing at all.
  const first = everyExtentFixture()[0]
  if (first === undefined) throw new Error("there are no extent fixtures")
  const [name, dump] = first
  const whole = fabricationExtent(dump)
  const shrunk = { ...whole, maxCol: whole.maxCol - 1, cols: whole.cols - 1 }
  const result = trimPreservesConnectivity(dump, shrunk)
  expect(result.preserved, `${name}: ${result.detail}`).toBe(false)
  expect(result.detail).toMatch(/[0-9]+,[0-9]+/)
  expect(result.detail).toMatch(/wire W1/)
})

test("a trim that keeps every feature and still changes the copper is detected too", () => {
  // THE SECOND FAILURE SHAPE, and the one a feature-count check cannot see. The
  // extent is shrunk at the LEFT instead, to drop column 1 - which holds R1.1
  // and R2.1 - so the dropped-feature clause fires; shrinking the TOP by one
  // row instead drops row 1, which carries R1's whole strip. Either way the
  // partition is not reproduced, and the detail names a hole.
  const dump = parseBoardDump(WIRE_PAST_BOUNDS)
  const whole = fabricationExtent(dump)
  const shrunkTop = { ...whole, minRow: whole.minRow + 1, rows: whole.rows - 1 }
  const result = trimPreservesConnectivity(dump, shrunkTop)
  expect(result.preserved, result.detail).toBe(false)
  expect(result.detail).toMatch(/[0-9]+,[0-9]+/)
  // R1's leads are what row 1 carried, so the refusal names one of them.
  expect(result.detail).toMatch(/R1/)
})

test("the partition is compared by pin identity, not by component number", () => {
  // `copperGraph` numbers its components in row-major order of first
  // appearance, so a trimmed board's numbering differs from the untrimmed one's
  // for an IDENTICAL partition. A comparison of the numbers would report every
  // trim of a board whose extent starts past 0,0 as a change - and every
  // fixture here starts past it, which is why the pass above means something.
  const dump = parseBoardDump(WIRE_PAST_BOUNDS)
  const extent = fabricationExtent(dump)
  expect([extent.minRow, extent.minCol]).not.toEqual([0, 0])
  expect(trimPreservesConnectivity(dump, extent).preserved).toBe(true)
})
