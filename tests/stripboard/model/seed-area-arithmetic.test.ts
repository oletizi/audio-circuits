/**
 * THE AREA ARITHMETIC SAYS WHAT IT CLAIMS: the rectangle primitives in
 * `lib/stripboard/seed-area.ts`, over small hand-constructed rectangles whose
 * right answer can be checked by eye.
 *
 * **WHAT THIS ESTABLISHES.** That `areaRect` grows a pin frame by its body
 * margins and swaps axes with the part's facing; that `freeHolesBetween`
 * counts zero for two rectangles that are adjacent (the off-by-one this
 * caught was a real bug) and counts a diagonal neighbour as in the way, the
 * same as an orthogonal one; that `rectsOverlap` and `spanHoles` agree with a
 * geometric reading of the same rectangles; and that `routedUnderRigid` and
 * `comfortOf` answer correctly over one rigid area and the formable ones
 * around it.
 *
 * **ONE OF SIX FILES `./seed-room.test.ts` SPLIT INTO** (`docs/known-gaps.md`
 * G6, settled 2026-10-18); see `./seed-room-hand-boards.test.ts` for the
 * other five.
 */
import { expect, test } from "bun:test"
import {
  areaRect,
  comfortOf,
  freeHolesBetween,
  rectsOverlap,
  routedUnderRigid,
  spanHoles,
  type PartArea,
} from "../../../lib/stripboard/seed-area.ts"

test("the area arithmetic says what it claims", () => {
  const margins = { beforeAlong: 1, afterAlong: 1, beforeAcross: 2, afterAcross: 2 }
  const pins = [
    { alongSteps: 0, acrossSteps: 0 },
    { alongSteps: 1, acrossSteps: 0 },
  ]
  // Facing S puts the pin row across the strips and the across axis down the
  // columns, so the margins swap axes with the turn.
  expect(areaRect(pins, margins, { strip: 5, column: 5 }, "S")).toEqual({
    minStrip: 4,
    maxStrip: 7,
    minColumn: 3,
    maxColumn: 7,
  })
  // Facing E puts the row along a strip, so the same margins land the other way.
  expect(areaRect(pins, margins, { strip: 5, column: 5 }, "E")).toEqual({
    minStrip: 3,
    maxStrip: 7,
    minColumn: 4,
    maxColumn: 7,
  })
  const a = { minStrip: 0, maxStrip: 1, minColumn: 0, maxColumn: 1 }
  // Adjacent: no free hole between them. The off-by-one here was a real bug -
  // see freeHolesBetween's own comment.
  expect(freeHolesBetween(a, { minStrip: 0, maxStrip: 1, minColumn: 2, maxColumn: 3 })).toBe(0)
  expect(freeHolesBetween(a, { minStrip: 0, maxStrip: 1, minColumn: 3, maxColumn: 4 })).toBe(1)
  expect(rectsOverlap(a, { minStrip: 1, maxStrip: 2, minColumn: 1, maxColumn: 2 })).toBe(true)
  expect(rectsOverlap(a, { minStrip: 0, maxStrip: 1, minColumn: 2, maxColumn: 3 })).toBe(false)
  // A diagonal neighbour is as much in the way as an orthogonal one.
  expect(freeHolesBetween(a, { minStrip: 3, maxStrip: 4, minColumn: 3, maxColumn: 4 })).toBe(1)
  expect(spanHoles({ strip: 1, column: 2 }, { strip: 4, column: 2 }).length).toBe(4)

  const rigid: PartArea = {
    ref: "RV1",
    rigid: true,
    rect: { minStrip: 0, maxStrip: 2, minColumn: 0, maxColumn: 2 },
    leads: [{ strip: 0, column: 0 }],
  }
  const formable: PartArea = {
    ref: "R1",
    rigid: false,
    rect: { minStrip: 1, maxStrip: 1, minColumn: 1, maxColumn: 1 },
    leads: [{ strip: 1, column: 1 }],
  }
  expect(routedUnderRigid(formable, [rigid])?.host, "a lead inside a rigid area is caught").toBe(
    "RV1",
  )
  expect(routedUnderRigid(rigid, [formable])?.host, "and so is the reverse order").toBe("RV1")
  expect(comfortOf(formable.rect, [rigid])).toBe("crowded")
  expect(comfortOf({ minStrip: 3, maxStrip: 3, minColumn: 0, maxColumn: 0 }, [rigid])).toBe(
    "touching",
  )
  expect(comfortOf({ minStrip: 4, maxStrip: 4, minColumn: 0, maxColumn: 0 }, [rigid])).toBe("roomy")
})
