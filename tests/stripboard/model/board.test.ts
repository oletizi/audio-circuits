/**
 * The model's two testable behaviours: `holesOverlap`, and every refusal
 * `geometryOf` makes.
 *
 * WHY THERE IS NO TEST OF A `geometryOf` RETURN VALUE. There is no return value
 * to test. `geometryOf` refuses every footprint today, because nothing in
 * `lib/` records a footprint's occupied area and the model forbids
 * reconstructing it from the pins. The last test below is the EVIDENCE for that
 * refusal rather than a restatement of it: it reads the recorded pads of the
 * three `C_Rect` footprints out of `lib/kicad/pin-pattern.ts` and shows they are
 * identical across three different body widths, so no function of the pads can
 * tell the three apart.
 *
 * REFUSALS ARE ASSERTED ON THEIR LEADING KEY, never with a regex over the whole
 * message. This repository has five times had a test match a refusal's
 * REASONING and pass while its VERDICT was wrong, so the assertion is
 * `toStartWith` on the discriminating identifier at the front, as
 * `tests/stripboard/rules.test.ts` does.
 */
import { expect, test } from "bun:test"
import { PIN_PATTERNS, pinPatternFor } from "../../../lib/kicad/pin-pattern.ts"
import { geometryOf, holesOverlap, type Candidate, type Hole, type Placement }
  from "../../../lib/stripboard/board.ts"
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

test("geometryOf refuses a recorded, mountable footprint for want of an occupied area", () => {
  for (const footprint of C_RECT_FAMILY) {
    const message = refusalFrom(() => geometryOf(footprint, ORIGIN, "E", PIN_PATTERNS))
    expect(message, footprint).toStartWith(
      `stripboard-geometry-no-occupied-area: "${footprint}"`,
    )
  }
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
