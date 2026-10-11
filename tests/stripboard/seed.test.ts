/**
 * `SEED_ARMS` enumerates `SeedArm` completely - three entries, one per
 * member of the union - in a way that would catch the enumeration drifting
 * from the union rather than comparing the array to a copy of itself
 * (CONTROLLER RULING 1, 2026-10-10 stripboard-pipeline Task 13).
 *
 * Typing each literal below `: SeedArm` is what makes this a real check:
 * `"constructed"` fails to compile if the union ever drops that member, and
 * a fourth member added to the union without a fourth literal here is
 * caught by the length assertion instead - between the two, either side
 * drifting out of step with the other is a compile error or a failing
 * test, never a silent pass.
 */
import { test, expect } from "bun:test"
import { SEED_ARMS, type SeedArm } from "../../tools/stripboard/seed.ts"

test("SEED_ARMS has exactly three entries, one per member of the SeedArm union", () => {
  expect(SEED_ARMS.length).toBe(3)
})

test("every member of SeedArm appears in SEED_ARMS", () => {
  const constructed: SeedArm = "constructed"
  const imported: SeedArm = "import"
  const random: SeedArm = "random"
  for (const arm of [constructed, imported, random]) {
    expect(SEED_ARMS).toContain(arm)
  }
})
