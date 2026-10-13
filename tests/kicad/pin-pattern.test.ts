import { test, expect } from "bun:test"
import { GRID_MM } from "../../lib/kicad/grid.ts"
import { classifyPads, admitPattern, preparedExtentsHoles }
  from "../../lib/kicad/pin-pattern-model.ts"
import { PIN_PATTERNS, pinPatternFor } from "../../lib/kicad/pin-pattern.ts"
import { LEAD_SPANS, leadSpanFor } from "../../lib/kicad/lead-span.ts"
import type { GridAccommodation, PadPosition, PinPattern }
  from "../../lib/kicad/pin-pattern-model.ts"
import { readFootprintPads } from "./footprint-library.ts"

const ring = (count: number, radiusMm: number): readonly PadPosition[] =>
  Array.from({ length: count }, (_, index) => {
    const angle = (2 * Math.PI * index) / count
    return {
      pad: String(index + 1),
      xMm: Number((radiusMm * Math.cos(angle)).toFixed(4)),
      yMm: Number((radiusMm * Math.sin(angle)).toFixed(4)),
    }
  })

/**
 * Typed rather than `as const`, so that stripping a recorded accommodation in a
 * test needs no type assertion: CLAUDE.md forbids `as Type` and a test reaching
 * for one is usually a test building a value the types say cannot exist.
 */
const AS_MOULDED: GridAccommodation = { kind: "as-moulded" }

test("every footprint with a recorded lead span also has a recorded pin pattern", () => {
  // HC10 is in A1. A footprint the pipeline may place and HC10 cannot classify
  // is a hard constraint that silently passes, which is the one failure this
  // module exists to prevent.
  //
  // Break 2 of step 8 - dropping CP_Radial_D6.3mm_P2.50mm from PIN_PATTERNS -
  // failed here, and only here, printing the dropped footprint's name.
  const missing = [...LEAD_SPANS.keys()].filter((name) => !PIN_PATTERNS.has(name)).sort()
  expect(missing).toEqual([])
})

test("every recorded classification is rederived from the recorded pads, not asserted", () => {
  // The lead-span split's discipline: a value that cannot be rederived from the
  // dimensions beside it is a transcription error, and that is the error this
  // catches.
  //
  // Break 3 of step 8 - pad "3" of PinHeader_1x05_P2.54mm_Vertical moved from
  // y 5.08 to 5.58 - failed here, printing that footprint and a diff of the
  // rederived rows, AND failed the file-opening test below ("pad 3 y, expected
  // 5.58, received 5.08"). Two independent detections, which is the point of
  // also reading the file.
  for (const pattern of PIN_PATTERNS.values()) {
    expect(classifyPads(pattern.pads), pattern.footprint).toEqual(pattern.classification)
  }
})

test("every recorded pad OPENS its .kicad_mod and agrees with the file, pad by pad", () => {
  // THE TEST THIS REPLACES compared pattern.pads.length against
  // pattern.source.padCount - two fields of the SAME hand-written literal. It
  // was named "agrees with the footprint file the pads came from" and never
  // opened a file, so transcribing eight pads from a ten-pad footprint and
  // writing padCount: 8 passed it. That is the defect class this plan calls its
  // crux; the rule it broke is the repository's: verify names against the thing
  // itself, the libraries are on disk.
  //
  // Breaks 4 and 5 of step 8, both on DIP-16_W7.62mm, both run and reverted.
  // Break 4 dropped pad "16" and left padCount at 16: this test failed with
  // "transcribed + excluded must account for every pad in the file, expected
  // 16, received 15". Break 5 is its self-consistent twin - the dropped pad
  // with padCount corrected to 15, which is what made the replaced test
  // worthless - and this test still failed, at the padCount-against-the-FILE
  // assertion, expected 16, received 15.
  //
  // Both also failed the rederivation test above, because a pad list short of
  // the file no longer rederives the recorded classification. This is the only
  // test that would see them if that classification had been short to match.
  //
  // readFootprintPads THROWS when the library is not resolvable. It must not
  // skip - see tests/kicad/footprint-library.ts and the precedent in
  // tests/circuits/kicad-round-trip.ts.
  for (const pattern of PIN_PATTERNS.values()) {
    const file = readFootprintPads(pattern.footprint)
    expect(pattern.source.file, pattern.footprint).toBe(file.file)
    expect(pattern.source.version, pattern.footprint).toBe(file.version)
    // Every (pad ...) form in the file is accounted for: transcribed, or
    // excluded with a reason. A silent shortfall is the failure above.
    expect(pattern.source.padCount, pattern.footprint).toBe(file.padCount)
    expect(
      pattern.pads.length + pattern.source.excludedPads.length,
      `${pattern.footprint}: transcribed + excluded must account for every pad in the file`,
    ).toBe(file.padCount)
    for (const excluded of pattern.source.excludedPads) {
      expect(excluded.reason.length, `${pattern.footprint} pad ${excluded.pad}`).toBeGreaterThan(20)
    }
    // And each recorded position is the file's own (at x y), by pad name.
    const onDisk = new Map(file.pads.map((pad) => [pad.pad, pad]))
    for (const pad of pattern.pads) {
      const actual = onDisk.get(pad.pad)
      expect(actual, `${pattern.footprint} pad "${pad.pad}" is not in ${file.file}`).toBeDefined()
      expect(actual?.xMm, `${pattern.footprint} pad ${pad.pad} x`).toBeCloseTo(pad.xMm, 4)
      expect(actual?.yMm, `${pattern.footprint} pad ${pad.pad} y`).toBeCloseTo(pad.yMm, 4)
    }
  }
})

test("the library helper refuses a missing footprint rather than skipping", () => {
  // The guard on the guard. If this ever stops throwing, every assertion above
  // becomes a loop over nothing on a machine with no KiCad.
  expect(() => readFootprintPads("Nonexistent_Lib:Nonexistent_Footprint")).toThrow(/does not skip/)
  expect(() => readFootprintPads("not-a-reference")).toThrow(/Library>:<Name/)
})

test("a single row of pads decomposes across the strips, and reports its along-row pitch", () => {
  // TO-92_Inline's own geometry: three collinear pads at HALF a grid step.
  // Decomposition is about the ACROSS direction, so one row decomposes; whether
  // the leads reach holes is the along-row question and classifyPads reports it
  // as a fact rather than deciding it. admitPattern decides, below.
  const inline = classifyPads([
    { pad: "1", xMm: 0, yMm: 0 },
    { pad: "2", xMm: 1.27, yMm: 0 },
    { pad: "3", xMm: 2.54, yMm: 0 },
  ])
  expect(inline.kind).toBe("rows")
  if (inline.kind !== "rows") throw new Error("unreachable: kind was asserted above")
  expect(inline.rows).toEqual([["1", "2", "3"]])
  expect(inline.rowPitchSteps).toEqual([])
  expect(inline.alongRowOnGrid).toBe(false)
  expect(inline.alongRowPitchesMm).toEqual([1.27, 1.27])
})

test("an off-grid along-row pitch on a NON-FORMABLE family refuses without a recorded accommodation", () => {
  // The review's sharp point, as the test that would have caught it:
  // collinearity does not establish that the leads enter holes. TO-92_Inline's
  // outer pads are on 1.27mm against a 2.54mm grid, and lead-span.ts records
  // the family as formable: false - nothing there says the terminals may be
  // moved. Admitting it on collinearity alone would be inferring a physical
  // accommodation from a geometric coincidence.
  //
  // Break 6 of step 8 - admitPattern returning eligible whenever the
  // classification is rows, i.e. admission by collinearity - failed five
  // tests: this one, its formable twin below, the spurious-record test, the
  // no-recorded-span refusal and the prepared-extent refusal. It was given the
  // detail string "rows, so formed" so that the admission tests still passed,
  // which is what makes those five the refusals' own coverage.
  const pattern = pinPatternFor("Package_TO_SOT_THT:TO-92_Inline")
  const refused = admitPattern({ ...pattern, accommodation: AS_MOULDED })
  expect(refused.kind).toBe("refused")
  if (refused.kind !== "refused") throw new Error("unreachable")
  expect(refused.reason).toMatch(/formed/)
  expect(refused.reason).toMatch(/TO-92_Inline/)
  expect(refused.reason).toMatch(/not defaulted/)
})

test("an off-grid along-row pitch on a FORMABLE family also refuses without a recorded accommodation", () => {
  // The same clause from the other side, and it is not redundant: a family
  // lead-span.ts records as formable has a forming claim with a datasheet
  // behind it, but THAT claim is about reach and says nothing about whether
  // this footprint's own moulded pitch was formed to the grid. An as-moulded
  // record on an off-grid pitch is a false statement either way, so the
  // refusal covers both formabilities and only its remedy differs.
  const radial = pinPatternFor("Capacitor_THT:CP_Radial_D5.0mm_P2.00mm")
  const refused = admitPattern({ ...radial, accommodation: AS_MOULDED })
  expect(refused.kind).toBe("refused")
  if (refused.kind !== "refused") throw new Error("unreachable")
  expect(refused.reason).toMatch(/CP_Radial_D5\.0mm_P2\.00mm/)
  expect(refused.reason).toMatch(/formed-to-grid/)
  expect(refused.reason).toMatch(/not defaulted/)
})

test("the recorded formed-to-grid accommodation admits it, and says the leads are formed", () => {
  const admitted = admitPattern(pinPatternFor("Package_TO_SOT_THT:TO-92_Inline"))
  expect(admitted.kind).toBe("eligible")
  if (admitted.kind !== "eligible") throw new Error("unreachable")
  expect(admitted.accommodation.kind).toBe("formed-to-grid")
  expect(admitted.detail).toMatch(/formed/)
})

test("every formed-to-grid accommodation carries a basis and a datasheet source", () => {
  // The same provenance discipline the lead spans carry: a physical
  // accommodation recorded as a bare boolean is a claim nobody can check.
  for (const pattern of PIN_PATTERNS.values()) {
    if (pattern.accommodation.kind !== "formed-to-grid") continue
    expect(pattern.accommodation.basis.length, pattern.footprint).toBeGreaterThan(60)
    expect(pattern.accommodation.source.url, pattern.footprint).not.toBe("")
    expect(pattern.accommodation.preparedPitchSteps, pattern.footprint).toBeGreaterThanOrEqual(1)
  }
})

test("an accommodation recorded for a pattern that is already on the grid is refused as spurious", () => {
  // The other direction, and it matters: a formed-leads record on a part that
  // needs no forming is a claim about a physical operation nobody performs, and
  // it would quietly license the off-grid case next to it.
  const onGrid = pinPatternFor("Package_DIP:DIP-16_W7.62mm")
  // The DatasheetRef is borrowed from an entry that legitimately has one, so no
  // cast is needed: CLAUDE.md forbids `as Type`, and a test that reaches for one
  // is usually a test building a value the types say cannot exist.
  const formed = pinPatternFor("Package_TO_SOT_THT:TO-92_Inline")
  if (formed.accommodation.kind !== "formed-to-grid") {
    throw new Error("TO-92_Inline must carry a formed-to-grid accommodation; see pin-pattern.ts")
  }
  const spurious: PinPattern = {
    ...onGrid,
    accommodation: {
      kind: "formed-to-grid",
      preparedPitchSteps: 1,
      basis: "a preparation this part does not need, recorded to prove the guard fires",
      source: formed.accommodation.source,
    },
  }
  expect(admitPattern(spurious).kind).toBe("refused")
})

test("a pattern whose footprint has no recorded lead span is refused by name", () => {
  // admitPattern's cross-check has nothing to check against for a footprint
  // lead-span.ts does not record, and admitting it would be admitting an
  // unbounded reach. DIP-8 is the nearest real footprint that is NOT recorded.
  const stranger: PinPattern = {
    ...pinPatternFor("Package_DIP:DIP-16_W7.62mm"),
    footprint: "Package_DIP:DIP-8_W7.62mm",
  }
  const refused = admitPattern(stranger)
  expect(refused.kind).toBe("refused")
  if (refused.kind !== "refused") throw new Error("unreachable")
  expect(refused.reason).toMatch(/DIP-8_W7\.62mm/)
  expect(refused.reason).toMatch(/LEAD_SPANS/)
  expect(refused.reason).toMatch(/not defaulted/)
})

test("every entry's prepared extent lies inside the span lead-span.ts records for it", () => {
  // The cross-module check, with no span figure written here (PAR2): both
  // numbers are read from the modules. It is a DISJUNCTION over the two axes,
  // because neither module says which axis a recorded span is measured along -
  // so it catches an extent matching NEITHER axis and does not catch one
  // matching the wrong one. That is the guarantee, stated rather than implied.
  for (const pattern of PIN_PATTERNS.values()) {
    const span = leadSpanFor(pattern.footprint)
    const admitted = admitPattern(pattern)
    expect(admitted.kind, pattern.footprint).toBe("eligible")
    const extents = preparedExtentsHoles(pattern)
    const fits = extents.some(
      (holes) => holes >= span.minSpanHoles && holes <= span.maxSpanHoles,
    )
    expect(
      fits,
      `${pattern.footprint}: neither axis's prepared extent ${JSON.stringify(extents)} is inside ` +
        `[${span.minSpanHoles}, ${span.maxSpanHoles}] - one of the two modules is wrong`,
    ).toBe(true)
  }
})

test("a prepared extent outside the recorded span is refused, naming both modules", () => {
  // The cross-check as a refusal rather than as a loop over today's data: a
  // formed pitch nine steps wide puts TO-92_Inline's three pads nineteen holes
  // apart, which no reading of lead-span.ts's three-hole span admits. Neither
  // module says which axis a span is measured along, so the refusal names both
  // and asks for the transcription to be checked rather than picking a winner.
  const formed = pinPatternFor("Package_TO_SOT_THT:TO-92_Inline")
  if (formed.accommodation.kind !== "formed-to-grid") {
    throw new Error("TO-92_Inline must carry a formed-to-grid accommodation; see pin-pattern.ts")
  }
  const overreaching: PinPattern = {
    ...formed,
    accommodation: { ...formed.accommodation, preparedPitchSteps: 9 },
  }
  const refused = admitPattern(overreaching)
  expect(refused.kind).toBe("refused")
  if (refused.kind !== "refused") throw new Error("unreachable")
  // ANCHORED ON THE CLAUSE ONLY THIS BRANCH EMITS. `/lead-span\.ts/` and
  // `/pin-pattern\.ts/` alone could not tell this refusal from the other four
  // `admitPattern` raises: ALL FIVE end in WHY_NOT_DEFAULTED and every remedy
  // clause cites both modules by path, so a reordering that made an earlier
  // branch fire first would keep this test green while the branch it exists for
  // went unexercised. "neither axis's prepared hole extent" is the cross-check's
  // own sentence, and the extent pair beside it is the measurement.
  expect(refused.reason).toContain("neither axis's prepared hole extent [19,1]")
  expect(refused.reason).toContain("3-3 holes lib/kicad/lead-span.ts records")
  expect(refused.reason).toContain("lib/kicad/pin-pattern.ts")
})

test("preparedExtentsHoles refuses the two patterns whose holes it cannot state", () => {
  // It returns hole counts, so it must not return one for a pattern whose pads
  // are not at holes. Two cases: no rows at all, and an off-grid along-row
  // pitch with no recorded preparation - the one admitPattern refuses above.
  const radial = pinPatternFor("Capacitor_THT:CP_Radial_D5.0mm_P2.00mm")
  expect(() => preparedExtentsHoles({ ...radial, accommodation: AS_MOULDED })).toThrow(
    /CP_Radial_D5\.0mm_P2\.00mm/,
  )
  const pads = ring(11, 8)
  const notRows: PinPattern = { ...radial, pads, classification: classifyPads(pads) }
  expect(() => preparedExtentsHoles(notRows)).toThrow(/no rows/)
})

test("two rows a whole number of strips apart decompose, and the pitch is reported in steps", () => {
  // A DIP's four corner pads. BOTH axes decompose here - rows of constant y are
  // one strip pitch apart, rows of constant x are three - and classifyPads
  // tries x FIRST, so the reported axis is "x" and the pitch is ONE step.
  //
  // Checked against the real footprint: DIP-16_W7.62mm's sixteen pads give
  // eight rows of constant y at one step each (measured, 2026-10-10), so "x
  // first" is also the physically useful answer and not an arbitrary tie-break.
  const dip = classifyPads([
    { pad: "1", xMm: 0, yMm: 0 },
    { pad: "2", xMm: 0, yMm: 2.54 },
    { pad: "3", xMm: 7.62, yMm: 2.54 },
    { pad: "4", xMm: 7.62, yMm: 0 },
  ])
  expect(dip.kind).toBe("rows")
  if (dip.kind !== "rows") throw new Error("unreachable: kind was asserted above")
  expect(dip.axis).toBe("x")
  expect(dip.rows.length).toBe(2)
  expect(dip.rowPitchSteps).toEqual([1])
  expect(dip.alongRowOnGrid).toBe(true)   // 7.62mm is three steps
})

test("the real DIP-16's sixteen pads decompose into eight rows one strip apart", () => {
  // The same claim against the file rather than against four hand-picked
  // corners, which is what makes the tie-break above a measurement.
  const classified = classifyPads(readFootprintPads("Package_DIP:DIP-16_W7.62mm").pads)
  expect(classified.kind).toBe("rows")
  if (classified.kind !== "rows") throw new Error("unreachable")
  expect(classified.rows.length).toBe(8)
  expect(new Set(classified.rowPitchSteps)).toEqual(new Set([1]))
})

test("a ring of pads is refused, naming why - the negative case HC10 exists for", () => {
  // Break 1 of step 8 - the vacuous classifier, returning one row of
  // everything unconditionally, which is the shape the fork's mutation harness
  // found four times - failed ten of the twenty-three tests, this one and the
  // off-grid refusal below among them.
  const classified = classifyPads(ring(11, 8))
  expect(classified.kind).toBe("off-strip-lattice")
  if (classified.kind !== "off-strip-lattice") throw new Error("unreachable")
  expect(classified.reason).toMatch(/strip/)
  expect(classified.reason).toMatch(/[0-9]/)
})

test("a ring is refused on BOTH axes, so the refusal is not an artefact of trying one", () => {
  // A ring has every pad on its own row whichever axis is grouped by, so a
  // classifier that tried one axis and gave up would refuse it for the wrong
  // reason and would also refuse a DIP rotated 90 degrees.
  const rotated = ring(11, 8).map((pad) => ({ pad: pad.pad, xMm: pad.yMm, yMm: pad.xMm }))
  expect(classifyPads(rotated).kind).toBe("off-strip-lattice")
})

test("admitPattern refuses a round pin pattern outright - HC10's own refusal", () => {
  // THE CLAUSE THE WHOLE TASK EXISTS FOR, and until fix round 1 nothing drove
  // it: every other admitPattern call in this file passes a `rows` pattern, so
  // a mutant returning eligible from the off-strip-lattice clause passed all
  // twenty-three tests. Step 8's break 6 was gated on `rows` and missed it too.
  //
  // Proved it can fail: that clause was made to return eligible, and this test
  // failed alone - "Expected: refused, Received: eligible" - 23 pass / 1 fail.
  // Reverted.
  //
  // The footprint is deliberately one lead-span.ts does NOT record: the
  // across-strip clause is checked BEFORE the span lookup, so the round
  // refusal must not depend on a recorded span - a round family refuses "by
  // name before any placement exists to grade", which is CRITERIA's own words.
  const pads = ring(11, 8)
  const round: PinPattern = {
    ...pinPatternFor("Package_DIP:DIP-16_W7.62mm"),
    footprint: "Rotary_SW:SW_Rotary11_D30mm",
    pads,
    classification: classifyPads(pads),
  }
  const refused = admitPattern(round)
  expect(refused.kind).toBe("refused")
  if (refused.kind !== "refused") throw new Error("unreachable")
  expect(refused.reason).toMatch(/SW_Rotary11_D30mm/)
  expect(refused.reason).toMatch(/does not decompose into rows parallel to the strips/)
  expect(refused.reason).toMatch(/cut/)
  expect(refused.reason).toMatch(/not defaulted/)
})

test("a row separation off the grid by more than the tolerance is refused ON BOTH AXES", () => {
  // A 2x2 pad field decomposes whenever EITHER axis is on the grid, so a test
  // for the refusal must put the offending separation on both.
  const offGrid = classifyPads([
    { pad: "1", xMm: 0, yMm: 0 },
    { pad: "2", xMm: GRID_MM + 0.4, yMm: 0 },
    { pad: "3", xMm: 0, yMm: GRID_MM + 0.4 },
    { pad: "4", xMm: GRID_MM + 0.4, yMm: GRID_MM + 0.4 },
  ])
  expect(offGrid.kind).toBe("off-strip-lattice")
  if (offGrid.kind !== "off-strip-lattice") throw new Error("unreachable")
  // The reason names both attempts, so a classifier that tried one axis and
  // gave up is distinguishable from one that tried both.
  expect(offGrid.reason).toMatch(/Along x/)
  expect(offGrid.reason).toMatch(/Along y/)
})

test("an off-grid separation on ONE axis decomposes on the other, which is not a refusal", () => {
  // The control for the test above, and the thing that makes "both axes" a real
  // claim rather than a phrasing: the same offending separation with one axis
  // on the grid must CLASSIFY, on that axis.
  const oneAxis = classifyPads([
    { pad: "1", xMm: 0, yMm: 0 },
    { pad: "2", xMm: 2.54, yMm: 0 },
    { pad: "3", xMm: 0, yMm: GRID_MM + 0.4 },
    { pad: "4", xMm: 2.54, yMm: GRID_MM + 0.4 },
  ])
  expect(oneAxis.kind).toBe("rows")
  if (oneAxis.kind !== "rows") throw new Error("unreachable")
  expect(oneAxis.axis).toBe("y")   // rows of constant x, one step apart
  expect(oneAxis.rowPitchSteps).toEqual([1])
  expect(oneAxis.alongRowOnGrid).toBe(false)   // the 2.94mm pitch runs ALONG the row
})

test("a row separation inside PITCH_TOLERANCE_MM is accepted as that many steps", () => {
  // KiCad names imperial parts in rounded metric, which is exactly what
  // PITCH_TOLERANCE_MM is sized for; 5mm is a 0.2in row separation.
  const rounded = classifyPads([
    { pad: "1", xMm: 0, yMm: 0 },
    { pad: "2", xMm: 2.5, yMm: 0 },
    { pad: "3", xMm: 0, yMm: 5 },
    { pad: "4", xMm: 2.5, yMm: 5 },
  ])
  expect(rounded.kind).toBe("rows")
  if (rounded.kind !== "rows") throw new Error("unreachable")
  expect(rounded.rowPitchSteps).toEqual([2])
})

test("an unlisted footprint refuses by name, listing the ones that are classified", () => {
  const refuse = () => pinPatternFor("Rotary_SW:SW_Rotary11_D30mm")
  expect(refuse).toThrow(/SW_Rotary11_D30mm/)
  expect(refuse).toThrow(/PIN_PATTERNS/)
  expect(refuse).toThrow(/not defaulted/)
  // THE LISTING, which this test's name claims and which the three regexes
  // above did not prove - the defect the fix-round-1 review found in the name.
  // A refusal that says what is missing and not what IS available sends the
  // reader to the source to find out, which is the thing the message exists to
  // save them.
  let message = ""
  try {
    refuse()
  } catch (error) {
    message = error instanceof Error ? error.message : String(error)
  }
  for (const footprint of PIN_PATTERNS.keys()) {
    expect(message, `the refusal must list ${footprint}`).toContain(footprint)
  }
})

test("no pattern is empty, because zero pads would classify as rows vacuously", () => {
  for (const pattern of PIN_PATTERNS.values()) {
    expect(pattern.pads.length, pattern.footprint).toBeGreaterThan(0)
  }
  expect(() => classifyPads([])).toThrow(/at least one pad/)
})
