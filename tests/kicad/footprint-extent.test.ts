/**
 * `occupiedAreaFor`, and the one thing it has to get right: telling apart three
 * footprints whose pads are byte-identical.
 *
 * **THE DISCRIMINATING TEST IS THE FIRST ONE.** A derivation that returned the
 * same answer for all three `C_Rect` footprints would satisfy every weaker test
 * in this file, and those three are the whole reason the module exists. The
 * assertion is over the DERIVED GEOMETRY only - `outlineMm` - and deliberately not
 * over the whole `FootprintExtent`: that record carries the footprint's name and
 * its file path, which differ between the three whatever the derivation does, so
 * a set over the whole record would have size 3 even if every box came out
 * identical. That is this repository's recorded defect class - a test matching a
 * message's reasoning rather than its verdict - in a new shape.
 *
 * **AND THE SECOND TEST IS THE INDEPENDENT CHECK**: each `C_Rect`'s derived box
 * is compared against the `L` and `W` fields in the footprint's OWN NAME, which
 * no amount of writing this code to match could have arranged.
 *
 * REFUSALS ARE ASSERTED ON THEIR LEADING KEY with `toStartWith`, never with a
 * regex over the whole message, for the reason
 * `tests/stripboard/model/board.test.ts` gives: five times in this repository a
 * regex has matched a refusal's reasoning while its verdict was wrong.
 *
 * NOTHING HERE SKIPS. `occupiedAreaFor` opens the installed KiCad libraries, and
 * on a machine without them every test below fails by name rather than passing
 * quietly - the precedent `tests/kicad/footprint-library.ts` sets and the reason
 * it sets it.
 */
import fs from "node:fs"
import path from "node:path"
import { expect, test } from "bun:test"
import { GRID_MM } from "../../lib/kicad/grid.ts"
import { occupiedAreaFor } from "../../lib/kicad/footprint-extent.ts"
import { padHolesFor } from "../../lib/kicad/formed-frame.ts"
import { PIN_PATTERNS, pinPatternFor } from "../../lib/kicad/pin-pattern.ts"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import {
  MISSING_FILE,
  NO_BODY_OUTLINE,
  POLY_BODY_OUTLINE,
  RE_POINTED,
  UNREADABLE_COORDINATE,
  VERSION_CHANGED,
  withRePointed,
} from "./footprint-extent-fixtures.ts"

/** The three footprints whose pads are identical and whose bodies are not. */
const C_RECT_FAMILY = [
  { footprint: "Capacitor_THT:C_Rect_L7.2mm_W2.5mm_P5.00mm", lengthMm: 7.2, widthMm: 2.5 },
  { footprint: "Capacitor_THT:C_Rect_L7.2mm_W3.5mm_P5.00mm", lengthMm: 7.2, widthMm: 3.5 },
  { footprint: "Capacitor_THT:C_Rect_L7.2mm_W4.5mm_P5.00mm", lengthMm: 7.2, widthMm: 4.5 },
] as const

const holeCount = (span: { minSteps: number; maxSteps: number }): number =>
  span.maxSteps - span.minSteps + 1

function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  throw new Error("the call returned instead of refusing")
}

test("three footprints with identical pads get three different derived outlines", () => {
  const pads = C_RECT_FAMILY.map((entry) =>
    JSON.stringify(pinPatternFor(entry.footprint, PIN_PATTERNS).pads),
  )
  expect(new Set(pads).size, "the premise: all three pad lists are the same").toBe(1)
  const bodies = C_RECT_FAMILY.map((entry) =>
    JSON.stringify(occupiedAreaFor(entry.footprint).outlineMm),
  )
  expect(new Set(bodies).size, "and the three bodies are told apart").toBe(3)
})

test("each derived outline equals the L and W the footprint's own name states", () => {
  // The independent check. KiCad names these footprints after the part's body,
  // so the file's F.Fab rectangle and the name's own fields are two statements
  // of one dimension made in two places - and this code could not have been
  // written to agree with the second one.
  for (const entry of C_RECT_FAMILY) {
    const body = occupiedAreaFor(entry.footprint).outlineMm
    expect(body.maxXMm - body.minXMm, `${entry.footprint} length`).toBeCloseTo(entry.lengthMm, 6)
    expect(body.maxYMm - body.minYMm, `${entry.footprint} width`).toBeCloseTo(entry.widthMm, 6)
  }
})

test("each electrolytic's derived outline is as wide as the D its own name states", () => {
  // The same independent check over a DIFFERENT form and a different family: the
  // three CP_Radial bodies are stated as an fp_circle - centre plus a point on
  // the circumference - rather than a rectangle, so this exercises the radius
  // arithmetic rather than a pair of corners. The names say the diameter; the
  // files say the circle; nothing here could have been written to make them
  // agree.
  const radial = [
    { footprint: "Capacitor_THT:CP_Radial_D5.0mm_P2.00mm", diameterMm: 5 },
    { footprint: "Capacitor_THT:CP_Radial_D6.3mm_P2.50mm", diameterMm: 6.3 },
    { footprint: "Capacitor_THT:CP_Radial_D8.0mm_P3.50mm", diameterMm: 8 },
  ] as const
  for (const entry of radial) {
    const body = occupiedAreaFor(entry.footprint).outlineMm
    // BOTH axes come out at the bare diameter, which is a measurement and was
    // not the first guess written here: each of the three also draws a polarity
    // marker on F.Fab, and on all three that marker sits INSIDE the can's own
    // bounding box on both axes - D5.0's is at x -1.13..-0.63 against a circle
    // spanning -1.5..3.5 - so it widens nothing. The first version of this
    // assertion claimed the along-lead axis was wider and failed by 0 on
    // D5.0mm.
    expect(body.maxXMm - body.minXMm, `${entry.footprint} along`).toBeCloseTo(entry.diameterMm, 6)
    expect(body.maxYMm - body.minYMm, `${entry.footprint} across`).toBeCloseTo(
      entry.diameterMm,
      6,
    )
  }
})

test("the derived hole spans separate the one-strip body from the two three-strip ones", () => {
  // MEASURED, AND THE TIE IS REPORTED RATHER THAN HIDDEN. Across the strips a
  // 2.5mm body reaches 1.25mm, inside its own strip's 1.27mm half, and covers
  // one; a 3.5mm body reaches 1.75mm and a 4.5mm body 2.25mm, both past that
  // boundary and both short of the 3.81mm one beyond it, so both cover three.
  // The last two genuinely occupy the same strips - a fact about 2.54mm stock,
  // not a derivation that failed to tell them apart - and `outlineMm` is where they
  // stay distinguishable.
  const across = C_RECT_FAMILY.map((entry) => holeCount(occupiedAreaFor(entry.footprint).alongY))
  expect(across, "strips covered at 2.5, 3.5 and 4.5mm of body").toEqual([1, 3, 3])
  const along = C_RECT_FAMILY.map((entry) => holeCount(occupiedAreaFor(entry.footprint).alongX))
  expect(along, "and all three are three holes long").toEqual([3, 3, 3])
})

/**
 * THE BOARD THAT DISAGREED WITH A LEAD-DERIVED EXTENT.
 * `tools/stripboard/seed-geometry.ts` records a first version that read a row
 * count off the leads and was wrong by one on `C18`, whose leads sit in the
 * middle row of three. This reads the frozen board itself rather than that
 * record: the dump's own `PART` and `PIN` lines give each part's footprint
 * rectangle, and the footprints JSON beside it gives which KiCad footprint each
 * ref is.
 *
 * ON THAT BOARD BOTH CAPS ARE TURNED - their two leads share a COLUMN and sit
 * two rows apart - so the footprint's own along-lead axis lies along the board's
 * rows and its across-lead axis along the columns. `SPAN` is the rectangle's
 * column count and `AT`'s row with the lead rows gives its row count.
 */
const FROZEN = path.resolve(import.meta.dir, "..", "fixtures", "stripboard")

interface FrozenRect {
  readonly rows: number
  readonly cols: number
}

function frozenRect(ref: string): FrozenRect {
  const dump = parseBoardDump(
    fs.readFileSync(path.join(FROZEN, "pultec-low-boost-frozen.dump"), "utf8"),
  )
  const part = dump.parts.find((candidate) => candidate.ref === ref)
  if (part === undefined || part.placement === "floating") {
    throw new Error(
      `the frozen low-boost dump has no placed PART ${ref}, so there is nothing to ` +
        "compare against.",
    )
  }
  const pins = dump.pins[ref] ?? []
  if (pins.length !== 2) {
    throw new Error(
      `PART ${ref} has ${pins.length} PIN lines in the frozen dump; this check is written ` +
        "for a two-lead part.",
    )
  }
  const columns = new Set(pins.map((pin) => pin.col))
  if (columns.size !== 1) {
    throw new Error(
      `PART ${ref}'s two leads do not share a column in the frozen dump, so it is not ` +
        "turned and this check's axis mapping does not hold.",
    )
  }
  const rows = pins.map((pin) => pin.row)
  const lowest = Math.min(...rows)
  const highest = Math.max(...rows)
  if (part.placement.row !== lowest) {
    throw new Error(
      `PART ${ref} is AT row ${part.placement.row} and its lowest lead is at row ${lowest}; ` +
        "this check assumes the rectangle starts at the first lead row.",
    )
  }
  return { rows: highest - lowest + 1, cols: part.span }
}

function frozenFootprint(ref: string): string {
  const parsed: unknown = JSON.parse(
    fs.readFileSync(path.join(FROZEN, "pultec-low-boost-frozen.footprints.json"), "utf8"),
  )
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(
      "the frozen low-boost footprints JSON is not a designator-to-footprint object.",
    )
  }
  const found = Object.entries(parsed).find(([designator]) => designator === ref)?.[1]
  if (typeof found !== "string") {
    throw new Error(`the frozen low-boost footprints JSON gives no footprint for ${ref}.`)
  }
  return found
}

test("the derived extents agree with the frozen low-boost board on C18 and C19", () => {
  // C18 is the 3.5mm body the fork places as a three-row CAP_FILM_WIDE; C19 is
  // the 2.5mm body it places as a one-row CAP_FILM. Those two refs are the whole
  // reason an occupied area had to come from somewhere other than the pads.
  for (const ref of ["C18", "C19"]) {
    const extent = occupiedAreaFor(frozenFootprint(ref))
    const board = frozenRect(ref)
    // The part is turned on that board: footprint x runs along the board's rows.
    expect(holeCount(extent.alongX), `${ref} rows`).toBe(board.rows)
    expect(holeCount(extent.alongY), `${ref} columns`).toBe(board.cols)
  }
})

test("C18 and C19 are the two footprints whose pads cannot be told apart", () => {
  // The premise of the test above, asserted rather than assumed: if the fixture
  // ever gave these two refs the same footprint, or two with different pads, the
  // agreement would stop being evidence of anything.
  const pads = ["C18", "C19"].map((ref) =>
    JSON.stringify(pinPatternFor(frozenFootprint(ref), PIN_PATTERNS).pads),
  )
  expect(new Set(pads).size, "identical pads").toBe(1)
  expect(new Set(["C18", "C19"].map(frozenFootprint)).size, "and two distinct footprints").toBe(2)
})

test("every recorded footprint yields a derived body, and none is transcribed", () => {
  for (const pattern of PIN_PATTERNS.values()) {
    const extent = occupiedAreaFor(pattern.footprint)
    expect(extent.file, pattern.footprint).toBe(pattern.source.file)
    expect(extent.version, pattern.footprint).toBe(pattern.source.version)
    expect(extent.forms.length, `${pattern.footprint} F.Fab forms`).toBeGreaterThan(0)
    expect(extent.outlineMm.maxXMm, pattern.footprint).toBeGreaterThan(extent.outlineMm.minXMm)
    expect(extent.outlineMm.maxYMm, pattern.footprint).toBeGreaterThan(extent.outlineMm.minYMm)
  }
  expect(PIN_PATTERNS.size, "all fifteen recorded footprints").toBe(15)
})

test("the footprint origin is pad 1's centre for every recorded footprint", () => {
  // `geometryOf` places a part by the hole its footprint's own (0,0) lands on,
  // and this is the measurement behind the note that for all thirteen that is
  // pad 1. It is asserted rather than relied on: a fourteenth footprint whose
  // pad 1 sits elsewhere would make a reader's assumption wrong, and a failure
  // here is the notice.
  for (const pattern of PIN_PATTERNS.values()) {
    const first = pattern.pads[0]
    expect(first?.pad, pattern.footprint).toBe("1")
    expect(first?.xMm, `${pattern.footprint} pad 1 x`).toBe(0)
    expect(first?.yMm, `${pattern.footprint} pad 1 y`).toBe(0)
  }
})

test("every as-moulded pattern's pads land inside the holes its body covers", () => {
  // A measurement, and a cross-check: the body outline and the pads are read
  // from two different parts of the same file by two different functions, and a
  // pad outside the body's hole box would mean one of them is wrong. It holds
  // for all ten as-moulded patterns, including DIP-16, whose pads sit 0.635mm
  // outside the body outline and still inside the holes it covers.
  let checked = 0
  for (const pattern of PIN_PATTERNS.values()) {
    if (pattern.accommodation.kind !== "as-moulded") continue
    checked += 1
    const extent = occupiedAreaFor(pattern.footprint)
    for (const pad of padHolesFor(pattern)) {
      expect(pad.xSteps, `${pattern.footprint} pad ${pad.pad} x`).toBeGreaterThanOrEqual(
        extent.alongX.minSteps,
      )
      expect(pad.xSteps, `${pattern.footprint} pad ${pad.pad} x`).toBeLessThanOrEqual(
        extent.alongX.maxSteps,
      )
      expect(pad.ySteps, `${pattern.footprint} pad ${pad.pad} y`).toBeGreaterThanOrEqual(
        extent.alongY.minSteps,
      )
      expect(pad.ySteps, `${pattern.footprint} pad ${pad.pad} y`).toBeLessThanOrEqual(
        extent.alongY.maxSteps,
      )
    }
  }
  expect(checked, "twelve of the fifteen recorded patterns are as-moulded").toBe(12)
})

test("outlineMm is the FILE's box, unshifted, even for a formed footprint", () => {
  // The two halves of the record are stated in two frames and the field names
  // say which: `outlineMm` is what the file draws, around the MOULDED leads,
  // while `alongX`/`alongY` are counted in the PREPARED frame. A derivation
  // that shifted the box itself would make this test pass by 1.27mm.
  const extent = occupiedAreaFor("Package_TO_SOT_THT:TO-92_Inline")
  expect(extent.forms).toContain("fp_arc")
  expect(extent.outlineMm.maxXMm - extent.outlineMm.minXMm).toBeGreaterThan(GRID_MM)
  const pattern = pinPatternFor("Package_TO_SOT_THT:TO-92_Inline")
  const moulded = pattern.pads.map((pad) => pad.xMm)
  const midpoint = (Math.min(...moulded) + Math.max(...moulded)) / 2
  const centre = (extent.outlineMm.minXMm + extent.outlineMm.maxXMm) / 2
  expect(centre, "the file draws the body centred on the MOULDED row").toBeCloseTo(midpoint, 9)
  expect(extent.anchorShiftMm, "and the shift that takes it to the formed frame is carried")
    .toBeGreaterThan(0)
})

test("a .kicad_mod with no F.Fab graphic at all refuses by name", () => {
  const message = refusalFrom(() =>
    occupiedAreaFor(RE_POINTED, withRePointed(NO_BODY_OUTLINE)),
  )
  expect(message).toStartWith(`footprint-extent-no-body-outline: "${RE_POINTED}"`)
  // The fixture HAS a courtyard, and it is still refused. That is the point of
  // the fixture: a courtyard is not a body outline.
  expect(message).toContain(NO_BODY_OUTLINE.source.file)
})

test("an F.Fab form this module does not handle refuses rather than being skipped", () => {
  const message = refusalFrom(() =>
    occupiedAreaFor(RE_POINTED, withRePointed(POLY_BODY_OUTLINE)),
  )
  expect(message).toStartWith(`footprint-extent-unknown-body-shape: "${RE_POINTED}"`)
})

test("a file whose version no longer matches the recorded one refuses by name", () => {
  const message = refusalFrom(() =>
    occupiedAreaFor(RE_POINTED, withRePointed(VERSION_CHANGED)),
  )
  expect(message).toStartWith(`footprint-extent-version-changed: "${RE_POINTED}"`)
})

test("an F.Fab graphic with a truncated coordinate refuses rather than being dropped", () => {
  // The guard that stands between a truncated graphic and a body outline
  // quietly smaller than the part. It is reachable - a malformed file is a real
  // thing - and it is exercised here rather than left present and unexamined.
  const message = refusalFrom(() =>
    occupiedAreaFor(RE_POINTED, withRePointed(UNREADABLE_COORDINATE)),
  )
  expect(message).toStartWith("footprint-extent-unreadable-coordinate:")
})

test("a recorded file that is not on disk refuses by name", () => {
  const message = refusalFrom(() => occupiedAreaFor(RE_POINTED, withRePointed(MISSING_FILE)))
  expect(message).toStartWith(`footprint-extent-missing-file: "${RE_POINTED}"`)
})

test("an unrecorded footprint refuses in the pattern module's own vocabulary", () => {
  // `occupiedAreaFor` resolves the pattern FIRST, so there is exactly one
  // refusal for an unrecorded name in this repository and it is
  // `pinPatternFor`'s. Nothing here derives a path from a name, which is what a
  // lookup table keyed by footprint would have had to do - and a second refusal
  // saying the same thing in different words is the duplication this check pins.
  const unrecorded = "SYNTHETIC:Unrecorded_Body_D9mm"
  const message = refusalFrom(() => occupiedAreaFor(unrecorded))
  expect(message).toStartWith(`no pin pattern is recorded for footprint "${unrecorded}"`)
})
