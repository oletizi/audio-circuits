/**
 * `obstaclesOf`: the two obstacles a `checkLayout` problem is about, or nothing. Task 8;
 * hand-written, no pedals source.
 *
 * **EVERY EXAMPLE HERE IS TRANSCRIBED FROM THE CODE THAT WRITES IT**, with the writer named, and
 * the template literals of the producers are filled in with plausible values. That is the only
 * thing that makes this test evidence rather than a mirror of `problem-obstacles.ts`: a relation
 * phrase checked only against itself proves the module is self-consistent, which was never in
 * doubt. One of the examples - the `connector-fanout` one - is lifted verbatim from a ported test
 * that asserts it, so at least one string here is held to the real pipeline by a second test.
 *
 * **THE ORDERING CASES ARE THE ONES THAT COULD SILENTLY BE WRONG.** `" lies on "` is a substring
 * of `" lies on pin end "`, and `" ends on "` of `" ends mid-wire on "`. If the shorter phrase
 * were tried first, the pair would split in the middle of the longer phrase and the second
 * obstacle would come out as `pin end R1.1 (net GND)` with the relation misnamed. Both are
 * asserted below with the real strings.
 */
import { describe, expect, test } from "bun:test"
import { obstaclesOf, RELATION_INFIXES, RELATION_WRITERS } from "../../../lib/schgen/render/problem-obstacles.ts"

describe("obstaclesOf", () => {
  /** text-scene.ts `textProblems`: `${t.what} overlaps ${o.what}`, and the one a ported test asserts. */
  test("the overlap a connector-fanout refusal reports, as the ported test spells it", () => {
    expect(obstaclesOf("label A at (31.75, -5.08) overlaps body of J_USB#1")).toEqual({
      constraint: "overlaps",
      obstacles: ["label A at (31.75, -5.08)", "body of J_USB#1"],
    })
  })

  /**
   * glyph-clearance.ts `glyphPair`: `${a.what} touches ${b.what}, which is on another net`. The
   * clause about the nets is prose about the problem and is cut; the coordinates are how the
   * drawing names each glyph and are kept, on both sides.
   */
  test("a glyph pair on two nets: the trailing clause is prose, the coordinates are not", () => {
    expect(obstaclesOf("the glyph of power symbol GND 0 at (0, 2.54) touches label SIG at (0, 5.08), which is on another net")).toEqual({
      constraint: "touches",
      obstacles: ["the glyph of power symbol GND 0 at (0, 2.54)", "label SIG at (0, 5.08)"],
    })
  })

  /** layout-check.ts `overlapProblems`: `bodies of ${p.key} and ${q.key} overlap` - both in front. */
  test("two bodies, which is the one problem that names both obstacles before the relation", () => {
    expect(obstaclesOf("bodies of R1#1 and R2#1 overlap")).toEqual({
      constraint: "bodies overlap",
      obstacles: ["R1#1", "R2#1"],
    })
  })

  /** body-clearance.ts `onPinLine` and the wire loop. */
  test("body clearance: a wire end on a pin line, and a wire through a body", () => {
    expect(obstaclesOf("wire 3 of B (GND) end at (2.54, 0) lies on the line of pin U_LDO#1.3")).toEqual({
      constraint: "on pin line",
      obstacles: ["wire 3 of B (GND) end at (2.54, 0)", "U_LDO#1.3"],
    })
    expect(obstaclesOf("wire 1 of B (SIG) from (0, 0) to (10.16, 0) passes through the body of R1#1")).toEqual({
      constraint: "through body",
      obstacles: ["wire 1 of B (SIG) from (0, 0) to (10.16, 0)", "R1#1"],
    })
  })

  /** wire-safety.ts: the two phrases whose shorter sibling must not win. */
  test("the longer phrase wins: 'lies on pin end' over 'lies on', 'ends mid-wire on' over 'ends on'", () => {
    expect(obstaclesOf("anchor anchor GND 0 (net GND) lies on pin end R1.2 (net GND) at (0, 7.62)")).toEqual({
      constraint: "anchor on pin end",
      obstacles: ["anchor anchor GND 0 (net GND)", "R1.2 (net GND) at (0, 7.62)"],
    })
    expect(obstaclesOf("anchor anchor GND 0 (net GND) lies on wire 2 of B (net GND) at (0, 7.62)")).toEqual({
      constraint: "anchor on wire",
      obstacles: ["anchor anchor GND 0 (net GND)", "wire 2 of B (net GND) at (0, 7.62)"],
    })
    expect(obstaclesOf("wire 0 of B ends mid-wire on wire 4 of B at (5.08, 0); split the wire there")).toEqual({
      constraint: "wire end mid-wire",
      obstacles: ["wire 0 of B", "wire 4 of B at (5.08, 0)"],
    })
    expect(obstaclesOf("wire 0 of B (net SIG) ends on wire 4 of B (net GND) at (5.08, 0)")).toEqual({
      constraint: "wire ends on wire",
      obstacles: ["wire 0 of B (net SIG)", "wire 4 of B (net GND) at (5.08, 0)"],
    })
  })

  /**
   * **THE REFUSAL, WHICH IS THE HALF THAT KEEPS THIS HONEST.** These are real `checkLayout`
   * problems - `layout-check.ts`'s `placementProblems`, `internalSplitProblems`,
   * `componentProblems` and `anchorProblems`, and `wire-safety.ts`'s dangling-end check - and each
   * names ONE subject or three. `null` is the right answer, and the caller must refuse rather
   * than report a clearance mismatch with a pair it made up.
   */
  test("a problem with no obstacle PAIR returns nothing, so the caller cannot invent one", () => {
    for (const problem of [
      "unit R1#1 is not placed",
      "unit R1#1 is placed 2 times",
      "placement R9#1 is not a unit of this block",
      "net TAP is split into 2 pieces",
      "piece of net GND containing R1.2, wire 3 of B has no label or power symbol",
      "anchor for VCC, which this block does not touch",
      "internal net TAP has a label anchor; internal nets are wired, never labelled",
      "wire 2 of B (net SIG) ends at (12.7, 0) touching nothing; end it on a pin, a label, a power symbol or another wire end",
    ]) {
      expect(obstaclesOf(problem), problem).toBeNull()
    }
  })

  /**
   * The vocabulary is DATA, and a list nothing iterates is a check that cannot fail: this pins its
   * size and that every entry cites a writer, so a phrase added without a citation fails here.
   * The count is measured, not chosen - fifteen infix relations plus the one prefix form.
   */
  test("every declared relation cites the code that writes it", () => {
    expect(RELATION_INFIXES.length).toBe(15)
    expect(new Set(RELATION_INFIXES).size, "a duplicated phrase would make the second entry dead").toBe(15)
    for (const infix of RELATION_INFIXES) {
      const writer = RELATION_WRITERS.get(infix)
      expect(writer, `no writer cited for "${infix}"`).toBeTruthy()
      expect((writer ?? "").includes(".ts"), `the writer cited for "${infix}" names no file`).toBe(true)
    }
  })
})
