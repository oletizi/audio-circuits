/**
 * `tools/guide/occupancy.ts`'s own weighting, moved here in Task 7 of
 * `docs/superpowers/plans/2026-10-30-remove-schgen.md` from
 * `tests/schgen/render/field-fallback.test.ts`'s "the weighted overlap cost" block, unchanged,
 * because that block tested `occupancy.ts` directly and not the schematic field placer the rest of
 * that file exercised. **That file is deleted with the generator in Task 9, so this is now the
 * only test of the weighting**, which is why the block was moved rather than copied: it proves the
 * weighting itself, and nothing else does. What went with the generator is the separate claim that
 * the schematic field placer chose the least-covered candidate under this weighting - there is no
 * schematic field placer any more.
 */
import { describe, expect, it } from "bun:test"
import { createOccupancy, MARK_WEIGHT } from "../../tools/guide/occupancy.ts"

describe("the weighted overlap cost", () => {
  it("is area times the category's weight, and a mark weighs twice a body", () => {
    const box = { minX: 0, minY: 0, maxX: 10, maxY: 4 }
    const bodies = createOccupancy(1)
    const marks = createOccupancy(MARK_WEIGHT)
    bodies.add(box)
    marks.add(box)
    expect(bodies.overlap({ minX: 0, minY: 0, maxX: 5, maxY: 4 })).toBe(20)
    expect(marks.overlap({ minX: 0, minY: 0, maxX: 5, maxY: 4 })).toBe(40)
    expect(MARK_WEIGHT).toBe(2)
  })
})
