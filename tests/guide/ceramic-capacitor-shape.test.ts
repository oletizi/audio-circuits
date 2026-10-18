import { test, expect } from "bun:test"
import type { Part } from "../../tools/guide/dump.ts"
import { bodyFor, type PlacedPin } from "../../tools/guide/part-shapes.ts"

/**
 * G3: `bodyFor` had no `CAP_CERAMIC` branch, so rendering a board carrying
 * one refused with `no drawing for VeroRoute part type "CAP_CERAMIC"`.
 * `CAP_CERAMIC` appears bare in `tests/fixtures/pt2399-core-board.dump` and
 * `tests/fixtures/stripboard/pt2399-core.dump` (the --dump-board spelling),
 * while `lib/kicad/import-string.ts:247` emits the span-suffixed
 * `CAP_CERAMIC${gridSteps(...)}` - e.g. `CAP_CERAMIC1` - on import. Both
 * spellings must draw.
 */

/** A placed, two-lead part's pins, far enough apart to look like a real lead span. */
const TWO_PINS: readonly PlacedPin[] = [
  { pin: { pin: "1", row: 4, col: 7 }, at: { x: 70, y: 40 } },
  { pin: { pin: "2", row: 4, col: 6 }, at: { x: 60, y: 40 } },
]

function ceramicPart(type: string): Part {
  return { ref: "C_TEST", type, value: ".1uF", placement: { row: 4, col: 6 }, span: 1, direction: undefined }
}

test("a ceramic disc capacitor draws, in both spellings the pipeline uses", () => {
  for (const type of ["CAP_CERAMIC", "CAP_CERAMIC1", "CAP_CERAMIC3"]) {
    expect(() => bodyFor(ceramicPart(type), TWO_PINS), type).not.toThrow()
  }
})

test("a ceramic disc capacitor draws as a box around its pins, not a claimed body shape", () => {
  const body = bodyFor(ceramicPart("CAP_CERAMIC1"), TWO_PINS)
  // Same contract as the film-capacitor box (tests/guide/capacitor-import-shapes.test.ts):
  // a rectangle over the pin holes, pin 1 marked, no polarity.
  expect(body.outline).toContain("<rect")
  expect(body.marks.length).toBe(1)
  expect(body.polarity).toBeUndefined()
})
