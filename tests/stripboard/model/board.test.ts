/**
 * The model's two testable behaviours: `holesOverlap`, and what `geometryOf`
 * returns and refuses.
 *
 * **THE RETURN VALUE IS TESTED HERE NOW, AND IT WAS NOT ALWAYS.** When this file
 * was written `geometryOf` refused every footprint, because nothing in `lib/`
 * said which holes a part's body covers; the comment that stood here said so and
 * the last test below was the evidence for it. `lib/kicad/footprint-extent.ts`
 * supplied the missing half by deriving the body outline from the footprint's own
 * `.kicad_mod`, so the refusals NARROWED rather than went away - and each of
 * them is still asserted below, including the one that used to fire for
 * everything.
 *
 * The three-identical-pads test at the end stays exactly as it was: it is still
 * true, and it is still the reason the occupied area cannot come from the pads.
 *
 * REFUSALS ARE ASSERTED ON THEIR LEADING KEY, never with a regex over the whole
 * message. This repository has five times had a test match a refusal's
 * REASONING and pass while its VERDICT was wrong, so the assertion is
 * `toStartWith` on the discriminating identifier at the front, as
 * `tests/stripboard/rules.test.ts` does.
 */
import { expect, test } from "bun:test"
import { PIN_PATTERNS, pinPatternFor } from "../../../lib/kicad/pin-pattern.ts"
import { admitPattern, classifyPads } from "../../../lib/kicad/pin-pattern-model.ts"
import type { PinPattern } from "../../../lib/kicad/pin-pattern-model.ts"
import { geometryOf, holesOverlap, type Candidate, type Hole, type Placement }
  from "../../../lib/stripboard/board.ts"
import { NO_BODY_OUTLINE, RE_POINTED, withRePointed }
  from "../../kicad/footprint-extent-fixtures.ts"
import { INJECTED_PATTERNS, ringPattern } from "../synthetic-footprints.ts"

const GRID = { strips: 6, columns: 12 }

/** A placement stated outright: these tests are about holes, not about derivation. */
function placed(ref: string, holes: readonly Hole[], pins: readonly [string, Hole][]): Placement {
  return {
    ref,
    footprint: "Capacitor_THT:C_Rect_L7.2mm_W2.5mm_P5.00mm",
    origin: holes[0] ?? { strip: 0, column: 0 },
    direction: "E",
    holes,
    pins: new Map(pins),
  }
}

function candidate(placements: readonly Placement[]): Candidate {
  return { grid: GRID, placements, wires: [], bridges: [] }
}

/** `R1` and `C1` both claim strip 2, column 3. */
function twoPartsOnOneHole(): Candidate {
  return candidate([
    placed("R1", [{ strip: 2, column: 1 }, { strip: 2, column: 2 }, { strip: 2, column: 3 }], [
      ["1", { strip: 2, column: 1 }],
      ["2", { strip: 2, column: 3 }],
    ]),
    placed("C1", [{ strip: 2, column: 3 }, { strip: 2, column: 4 }], [
      ["1", { strip: 2, column: 3 }],
      ["2", { strip: 2, column: 4 }],
    ]),
  ])
}

/** The same two parts, one strip apart, sharing nothing. */
function twoPartsApart(): Candidate {
  return candidate([
    placed("R1", [{ strip: 2, column: 1 }, { strip: 2, column: 2 }, { strip: 2, column: 3 }], [
      ["1", { strip: 2, column: 1 }],
      ["2", { strip: 2, column: 3 }],
    ]),
    placed("C1", [{ strip: 3, column: 3 }, { strip: 3, column: 4 }], [
      ["1", { strip: 3, column: 3 }],
      ["2", { strip: 3, column: 4 }],
    ]),
  ])
}

test("two placements occupying one hole are detected, by the hole and both refs", () => {
  const clash = holesOverlap(twoPartsOnOneHole())
  expect(clash, "an overlap is reported").not.toBeNull()
  expect(clash?.hole).toEqual({ strip: 2, column: 3 })
  expect([...(clash?.refs ?? [])].sort(), "both parts are named").toEqual(["C1", "R1"])
})

test("a candidate whose parts occupy distinct holes reports no overlap", () => {
  expect(holesOverlap(twoPartsApart())).toBeNull()
})

test("a candidate with no placements reports no overlap", () => {
  expect(holesOverlap(candidate([]))).toBeNull()
})

/**
 * A part cannot collide with itself, and the discriminating case is a repeated
 * hole in ONE placement's list. Without the per-placement set, the second
 * mention of strip 2 column 1 reads as a second claimant and `R1` is reported
 * as clashing with `R1`.
 */
test("one placement that lists a hole twice is not reported as clashing with itself", () => {
  const repeated = candidate([
    placed("R1", [{ strip: 2, column: 1 }, { strip: 2, column: 1 }], [["1", { strip: 2, column: 1 }]]),
  ])
  expect(holesOverlap(repeated)).toBeNull()
})

/**
 * Three parts on one hole name all three. A predicate that stopped at the first
 * pair would pass the two-part test above and leave the third part invisible to
 * whatever reports the clash.
 */
test("three placements on one hole name all three refs", () => {
  const three = candidate([
    placed("R1", [{ strip: 1, column: 1 }], [["1", { strip: 1, column: 1 }]]),
    placed("R2", [{ strip: 1, column: 1 }], [["1", { strip: 1, column: 1 }]]),
    placed("R3", [{ strip: 1, column: 1 }], [["1", { strip: 1, column: 1 }]]),
  ])
  const clash = holesOverlap(three)
  expect(clash?.hole).toEqual({ strip: 1, column: 1 })
  expect([...(clash?.refs ?? [])].sort()).toEqual(["R1", "R2", "R3"])
})

function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  throw new Error("the call returned instead of refusing")
}

const ORIGIN: Hole = { strip: 0, column: 0 }

/**
 * The name is `SYNTHETIC:`-prefixed and that prefix is load-bearing.
 * `tests/kicad/footprint-names.test.ts` sweeps every footprint name in the
 * repository and checks it against the installed KiCad libraries, exempting
 * exactly this prefix. The first version of this test invented two names under
 * two libraries that do not exist and the sweep failed, by name, which is the
 * check working.
 */
const UNRECORDED = "SYNTHETIC:Unrecorded_Pattern_D9mm"

test("geometryOf refuses a footprint with no recorded pin pattern, by name", () => {
  const message = refusalFrom(() => geometryOf(UNRECORDED, ORIGIN, "E", PIN_PATTERNS))
  expect(message).toStartWith(`stripboard-geometry-unrecorded-pattern: "${UNRECORDED}"`)
})

/**
 * The ring comes from `../synthetic-footprints.ts` rather than from a second
 * copy here: it is the one pad field in this repository that does NOT decompose
 * into rows parallel to the strips, it already carries the `SYNTHETIC:` prefix,
 * and its classification is derived by `classifyPads` from its pads rather than
 * asserted - so this test refuses a ring because the geometry is a ring.
 *
 * A pattern whose pads do not land on holes has no pad-to-hole mapping at all,
 * so `geometryOf` refuses there before it reaches the occupied-area question.
 */
test("geometryOf refuses a footprint whose pads do not lie on the strips, by name", () => {
  const ring = ringPattern()
  const message = refusalFrom(() => geometryOf(ring.footprint, ORIGIN, "E", INJECTED_PATTERNS))
  expect(message).toStartWith(
    `stripboard-geometry-unmountable-pattern: "${ring.footprint}"`,
  )
})

const C_RECT_FAMILY = [
  "Capacitor_THT:C_Rect_L7.2mm_W2.5mm_P5.00mm",
  "Capacitor_THT:C_Rect_L7.2mm_W3.5mm_P5.00mm",
  "Capacitor_THT:C_Rect_L7.2mm_W4.5mm_P5.00mm",
] as const

/**
 * THE REFUSAL THAT NARROWED. Until `lib/kicad/footprint-extent.ts` existed this
 * key fired for every recorded footprint, including all three of these. It is
 * still here and still reachable - a footprint whose own `.kicad_mod` carries no
 * body outline cannot be given one - and what has changed is that a recorded,
 * mountable footprint with a body outline no longer reaches it. A refusal that
 * vanished would be a guard removed rather than a guard satisfied.
 *
 * The fixture is the RECORDED footprint with its `source` re-pointed at a file
 * that has a courtyard, two pads and no `F.Fab` graphic. It has to be a recorded
 * name: `admitPattern` reads the module-level `LEAD_SPANS` and nothing routes an
 * injected span to it, so an invented name refuses one step earlier, at
 * `unmountable-pattern`, and never reaches the geometry. See
 * `tests/kicad/footprint-extent-fixtures.ts`.
 */
test("geometryOf still refuses a footprint whose file states no occupied area, by name", () => {
  const message = refusalFrom(() =>
    geometryOf(RE_POINTED, ORIGIN, "E", withRePointed(NO_BODY_OUTLINE)),
  )
  expect(message).toStartWith(`stripboard-geometry-no-occupied-area: "${RE_POINTED}"`)
  expect(message, "and it carries the cause").toContain("footprint-extent-no-body-outline")
})

/**
 * The pad-to-hole half still refuses separately, and the two are not
 * interchangeable: a formed footprint HAS a derivable body, and what it may be
 * missing is a frame to put its bent leads in.
 *
 * **THIS TEST USED TO ASSERT THE REFUSAL FOR ALL THREE RECORDED FORMED
 * FOOTPRINTS, and they are now derived.** `footprint-extent-formed-frame-unrecorded`
 * is gone, replaced by a recorded `FormingAnchor` on each accommodation - read
 * off KiCad's own prepared-pitch footprints for the same three bodies, in
 * `tests/kicad/formed-frame.test.ts`. The KEY survives, narrowed to the formed
 * SHAPES no anchor record covers, and this is its fixture: a multi-row formed
 * pattern, where nothing says whether the rows are bent alike.
 *
 * It keeps DIP-16's NAME, for the reason the other fixtures keep theirs -
 * `admitPattern` reads the module-level `LEAD_SPANS` and nothing routes an
 * injected span to it. Its pads are two rows of eight at the off-grid 1.27mm,
 * so the prepared extent is 8 holes along the row, which is the 8 that module
 * records for DIP-16 - without that the pattern refuses one step earlier, at
 * `unmountable-pattern`, and the geometry is never reached.
 */
test("geometryOf refuses a multi-row formed pattern for want of a pad-to-hole map, by name", () => {
  const name = "Package_DIP:DIP-16_W7.62mm"
  const recorded = pinPatternFor(name, PIN_PATTERNS)
  if (recorded.accommodation.kind !== "as-moulded") {
    throw new Error("DIP-16 is recorded as-moulded; see lib/kicad/pin-pattern.ts")
  }
  const formed = pinPatternFor("Package_TO_SOT_THT:TO-92_Inline", PIN_PATTERNS)
  if (formed.accommodation.kind !== "formed-to-grid") {
    throw new Error("TO-92_Inline must carry a formed-to-grid accommodation")
  }
  const pads = [0, 2.54].flatMap((yMm, row) =>
    [0, 1, 2, 3, 4, 5, 6, 7].map((index) => ({
      pad: `${row * 8 + index + 1}`,
      xMm: index * 1.27,
      yMm,
    })),
  )
  const multiRow: PinPattern = {
    ...recorded,
    pads,
    source: { ...recorded.source, padCount: pads.length },
    classification: classifyPads(pads),
    accommodation: formed.accommodation,
    basis: "Two rows of eight at the off-grid 1.27mm. SYNTHETIC: see the comment above.",
  }
  const patterns = new Map([...PIN_PATTERNS, [name, multiRow]])
  expect(admitPattern(multiRow).kind, "it must reach the geometry to refuse there").toBe("eligible")
  const message = refusalFrom(() => geometryOf(name, ORIGIN, "E", patterns))
  expect(message).toStartWith(`stripboard-geometry-no-pad-holes: "${name}"`)
  expect(message).toContain("formed-frame-row-unmeasured")
})

/**
 * And the three recorded formed footprints now return, which is the whole point
 * of the anchor.
 *
 * NO HOLE COUNT IS WRITTEN HERE. The count is the derivation's own output and a
 * figure for it in this file would be the derivation grading itself; what is
 * asserted is the relation the anchor was recorded to make true - every pin sits
 * in a hole the part occupies, at the prepared pitch the accommodation states.
 */
test("geometryOf returns for all three formed footprints, with pins at the prepared pitch", () => {
  const formed = [...PIN_PATTERNS.values()].filter(
    (pattern) => pattern.accommodation.kind === "formed-to-grid",
  )
  expect(formed.length, "three recorded formed footprints").toBe(3)
  for (const pattern of formed) {
    const accommodation = pattern.accommodation
    if (accommodation.kind !== "formed-to-grid") throw new Error("unreachable")
    const { holes, pins } = geometryOf(pattern.footprint, ORIGIN, "E", PIN_PATTERNS)
    expect([...pins.keys()].sort(), pattern.footprint).toEqual(
      pattern.pads.map((pad) => pad.pad).sort(),
    )
    const keys = new Set(holes.map((hole) => `${hole.strip},${hole.column}`))
    for (const [pin, hole] of pins) {
      expect(keys.has(`${hole.strip},${hole.column}`), `${pattern.footprint} pin ${pin}`).toBe(true)
    }
    // Facing `E`, the footprint's x axis runs along the columns, and all three
    // formed footprints decompose into one row along x - so consecutive pins sit
    // `preparedPitchSteps` columns apart and share a strip.
    const columns = [...pins.values()].map((hole) => hole.column).sort((a, b) => a - b)
    const strips = new Set([...pins.values()].map((hole) => hole.strip))
    expect(strips.size, `${pattern.footprint} is one row`).toBe(1)
    expect(columns, pattern.footprint).toEqual(
      pattern.pads.map((_, index) => index * accommodation.preparedPitchSteps),
    )
  }
})

/**
 * THE RETURN VALUE, AND THE PART OF IT NO FUNCTION OF THE PADS COULD PRODUCE.
 *
 * All three footprints carry the same two pads, so all three put pin 1 and pin 2
 * two columns apart facing `E`. What differs is the hole count: the 2.5mm body
 * covers its own strip and the other two reach into the strips either side. The
 * figures are the ones `tests/kicad/footprint-extent.test.ts` checks against the
 * frozen low-boost board for `C18` and `C19`.
 */
test("geometryOf returns holes and pins for a recorded, mountable footprint", () => {
  const holeCounts = C_RECT_FAMILY.map(
    (footprint) => geometryOf(footprint, ORIGIN, "E", PIN_PATTERNS).holes.length,
  )
  expect(holeCounts, "three along the leads, by one strip and by three").toEqual([3, 9, 9])
  for (const footprint of C_RECT_FAMILY) {
    const { pins } = geometryOf(footprint, ORIGIN, "E", PIN_PATTERNS)
    expect([...pins.keys()].sort(), footprint).toEqual(["1", "2"])
    expect(pins.get("1"), footprint).toEqual({ strip: 0, column: 0 })
    expect(pins.get("2"), footprint).toEqual({ strip: 0, column: 2 })
  }
})

/**
 * Turning a part turns its body with it. The 3.5mm cap facing `E` is three
 * columns by three strips either way, so the discriminating case is the 2.5mm
 * one, which is three columns by one strip facing `E` and one column by three
 * strips facing `S`.
 */
test("a quarter turn exchanges a part's along-lead and across-lead extents", () => {
  const narrow = "Capacitor_THT:C_Rect_L7.2mm_W2.5mm_P5.00mm"
  const east = geometryOf(narrow, ORIGIN, "E", PIN_PATTERNS)
  const south = geometryOf(narrow, ORIGIN, "S", PIN_PATTERNS)
  expect(new Set(east.holes.map((hole) => hole.strip)).size, "one strip facing E").toBe(1)
  expect(new Set(east.holes.map((hole) => hole.column)).size, "three columns facing E").toBe(3)
  expect(new Set(south.holes.map((hole) => hole.strip)).size, "three strips facing S").toBe(3)
  expect(new Set(south.holes.map((hole) => hole.column)).size, "one column facing S").toBe(1)
  expect(south.pins.get("2"), "pin 2 two strips along, facing S").toEqual({ strip: 2, column: 0 })
})

/**
 * THE EVIDENCE FOR THAT REFUSAL, read off the recorded data rather than argued.
 *
 * Three footprints of three different body widths carry byte-identical pads, so
 * every function of the pads returns the same answer for all three. The owner's
 * boards fit two of them: `pultec-low-boost-frozen.footprints.json` gives `C18`
 * the 3.5mm body and `C19`-`C23` the 2.5mm one.
 */
test("three C_Rect footprints of different body widths have identical recorded pads", () => {
  const padSets = C_RECT_FAMILY.map((footprint) =>
    JSON.stringify(pinPatternFor(footprint, PIN_PATTERNS).pads),
  )
  expect(new Set(padSets).size, "all three pad lists are the same").toBe(1)
  expect(new Set(C_RECT_FAMILY).size, "and they are three distinct footprints").toBe(3)
})
