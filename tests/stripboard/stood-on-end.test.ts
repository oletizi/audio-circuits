/**
 * `HC9`'s REPORT NAMES THE PARTS A BUILDER HAS TO STAND ON END.
 *
 * **WHY THIS IS A TEST AND NOT A DETAIL.** `84d8adf` taught the span model that
 * an axial part can be stood on end, which cleared twelve `HC9` failures across
 * four boards - including the owner's own `R2`, three holes apart against a flat
 * minimum of five. His warrant: *"It's standard practice to stand resistors on
 * end when their holes are next to each other. That's should NOT be a failure
 * condition"*. **What it did not do is say WHICH parts stand up.** `HC9`'s floor
 * is the LOOSER of an axial part's two mountings, so a span it holds on can be
 * one the body cannot lie between, and a held `HC9` read *"every span is at or
 * above its minimum"* over a board carrying six such resistors while naming
 * none of them. Standard practice to him; invisible to anybody else handed the
 * board.
 *
 * ITS OWN FILE because `./grade.test.ts` is at 481 lines against this
 * repository's 500-line ceiling, and because the subject is narrower than that
 * file's: `./grade.test.ts` asserts that each of the ten constraints holds and
 * breaks where it should, and this one asserts what one of them SAYS when it
 * holds. The derivation itself is tested in
 * `tests/kicad/lead-span-mounting.test.ts`, which is where the two refusals and
 * the floor arithmetic live; nothing here re-derives a floor.
 *
 * **THE FIXTURE IS THE HEALTHY BOARD WITH ONE LEAD MOVED**, so what varies
 * between the two tests below is a single `PIN` line. Its `R1` and `R2` are both
 * the recorded DIN0207 at a 6-hole span - above the flat floor, so the clause is
 * correctly silent on it as committed - and moving `R1`'s second lead to row 3
 * puts it at the owner's own 3 holes.
 */
import { test, expect } from "bun:test"
import { hc9 } from "../../tools/stripboard/constraints.ts"
import { flatMinSpanHoles } from "../../lib/kicad/lead-span-mounting.ts"
import { leadSpanFor } from "../../lib/kicad/lead-span.ts"
import { healthyInput, inputFor } from "./grade-fixtures.ts"

const AXIAL = "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal"

test("a board whose every span clears the flat floor says nothing about standing parts up", () => {
  // THE SILENT CASE, asserted so the clause below is not a sentence that always
  // appears. The healthy board's two resistors span 6 holes against a flat floor
  // this test READS rather than restates, and 6 is above it, so both lie flat
  // and there is nothing to instruct.
  const flat = flatMinSpanHoles(leadSpanFor(AXIAL)) ?? 0
  expect(flat).toBeLessThan(6)
  const result = hc9(healthyInput())
  expect(result.held).toBe(true)
  expect(result.detail).not.toContain("STOOD ON END")
})

test("a resistor below its flat floor is named in HC9's detail, and HC9 still holds", () => {
  // THE OWNER'S OWN SHAPE: `R1`'s second lead moves from row 6 to row 3, a
  // 3-hole span - his hand-laid low-boost's `R2` to the hole. `HC9` must still
  // HOLD, because standing the part up is the mounting its floor already allows
  // for; the detail must say so and name the part, because the layout does not.
  const input = inputFor("healthy", (text) =>
    text.replace("PIN R1 2 AT 6,1", "PIN R1 2 AT 3,1"),
  )
  const result = hc9(input)
  expect(result.held).toBe(true)
  expect(result.detail).toContain("1 part(s) must be STOOD ON END")
  expect(result.detail).toContain("R1 spans 3 holes against a flat floor of 5")
  // AND IT SAYS WHY IT IS NOT A FAILURE, because a capitalised instruction on a
  // line that otherwise reports only violations reads as one.
  expect(result.detail).toContain("not a failure")
  // R2 IS UNTOUCHED AND IS NOT NAMED, which is what makes the clause about this
  // part rather than about the board: one lead moved, one part annotated.
  expect(result.detail).not.toContain("R2")
})
