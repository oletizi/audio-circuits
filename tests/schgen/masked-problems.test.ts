/**
 * **HOW DEEP THE MASKING GOES, PINNED - every figure Task 22 publishes, recomputed on every run.**
 *
 * Hand-written for Task 22 of the M1 schematic-authoring plan.
 *
 * **WHY A TEST AND NOT A SCRATCH SCRIPT**, which is `docs/known-gaps.md` **G209**'s lesson and
 * **G245**'s and **G250**'s: a count published without the thing that counted it is a figure
 * nobody can re-take. The per-block table in `docs/known-gaps.md` **G258** is this file's output,
 * and a block that starts or stops drawing, or starts or stops hiding something, moves these rows.
 *
 * **NOTHING HERE IS A THRESHOLD AND NOTHING HERE REFUSES A DRAWING.**
 * `tools/schgen/masked-problems.ts` reports; `lib/schgen/elk/adapt.ts` decides. These are
 * equalities against measured values.
 */
import { beforeAll, describe, expect, it } from "bun:test"
import { FIELD_TEXT, maskedCensus, oneProblemAway, renderMasked, withoutFieldText, type MaskedBlock } from "../../tools/schgen/masked-problems.ts"
import { clearancePairs } from "../../lib/schgen/elk/adapt.ts"
import { blockCircuit, res, symbols } from "./__fixtures__/circuits.ts"
import { subgraphOf } from "../../lib/schgen/render/blocks.ts"
import { textProblems, textScene } from "../../lib/schgen/render/text-scene.ts"
import type { BlockLayout } from "../../lib/schgen/render/block-types.ts"

let rows: readonly MaskedBlock[]

beforeAll(async () => {
  rows = await maskedCensus()
})

const row = (id: string): MaskedBlock => {
  const found = rows.find((r) => r.block === id)
  if (found === undefined) throw new Error(`no row for ${id}; the census holds ${rows.map((r) => r.block).join(", ")}`)
  return found
}

describe("what every declared block's refusal is hiding", () => {
  /**
   * **THE TABLE, AND TASK 24 TURNED ITS BOUND INTO A COUNT.** `5 + 3 = 8` (**G232**, **G258**)
   * assumed the three blocks whose only reported problem was field placement were each one fix
   * from drawing; `ob-buffer` was not, so the bound became `5 + 2 = 7`. The placer now takes the
   * least-covered slot instead of refusing, and **the census reads 7 of 12** - the bound exactly.
   *
   * **AND THE MASKED COLUMN IS EMPTY ON EVERY ROW, BY CONSTRUCTION.** With no field-placement
   * refusal to early-return, `layout-check.ts` reaches the full text pass on every block, so
   * everything that was masked is published: `ob-buffer`'s power-value overlap and `tp-stage`'s
   * six label problems are now `checkLayout`'s own output. **What is unreported now is a different
   * population** - the overlaps of the fields the placer could not keep clear - and the `FALLBACK`
   * lines are where this tool reports them.
   */
  it("prints every problem class of every block, with its fallback field placements", () => {
    expect(renderMasked(rows)).toEqual([
      "ob-buffer: blocked by power-value-overlap published power-value-overlap units with no clear slot C3#1, J3#1",
      "    FALLBACK C3#1 (Device:C): covers wire 49 (VEE)",
      "    FALLBACK J3#1 (Connector_Generic:Conn_01x03): covers wire 46 (VCC)",
      "    control (checkLayout published this too): value of power symbol GND 0 at (99.06, 33.02) overlaps value of power symbol VEE 1 at (99.06, 44.45)",
      "    unmeasured: text clearance involving the 2 fallback field pair(s) of " +
        "C3#1, J3#1: the placer had no clear slot and chose the least-covered one, so textProblems does not report their overlaps. They are not unreported - each FieldFallback names what it covers, and report.ts prints them per block in RENDER-REPORT.md",
      "oc-power: DRAWS units with no clear slot C3#1",
      "    FALLBACK C3#1 (Device:C): covers wire 28 (VBIAS_RAW)",
      "    unmeasured: text clearance involving the 1 fallback field pair(s) of " +
        "C3#1: the placer had no clear slot and chose the least-covered one, so textProblems does not report their overlaps. They are not unreported - each FieldFallback names what it covers, and report.ts prints them per block in RENDER-REPORT.md",
      "oc-audio: blocked by nothing measurable",
      "    unmeasured: every clearance check: refused at obligation 1: the snap collapsed geometry, so there is no grid-legal layout for any of them to run on",
      "oc-sidechain: blocked by nothing measurable",
      "    unmeasured: every clearance check: refused at obligation 3: one transform, two readers, so there is no grid-legal layout for any of them to run on",
      "pt-core: DRAWS units with no clear slot C7#1, C9#1, C11#1, C12#1, R3#1, R4#1, R6#1",
      "    FALLBACK C7#1 (Device:C): covers wire 77 (Net-(C8-Pad2))",
      "    FALLBACK C9#1 (Device:C): covers wire 146 (OUTPUT), wire 147 (OUTPUT), pin C10.2",
      "    FALLBACK C10#1 (Device:C): covers wire 53 (Net-(C10-Pad1))",
      "    FALLBACK C11#1 (Device:C): covers wire 24 (GND)",
      "    FALLBACK C12#1 (Device:C): covers wire 106 (Net-(U1-LPF2-IN)), wire 148 (OUTPUT)",
      "    FALLBACK R3#1 (Device:R): covers wire 30 (GND), wire 36 (GND), wire 153 (VCO)",
      "    FALLBACK R4#1 (Device:R): covers wire 136 (Net-(U1-OP2-OUT))",
      "    FALLBACK R6#1 (Device:R): covers wire 98 (Net-(U1-LPF1-OUT))",
      "    unmeasured: text clearance involving the 8 fallback field pair(s) of " +
        "C7#1, C9#1, C10#1, C11#1, C12#1, R3#1, R4#1, R6#1: the placer had no clear slot and chose the least-covered one, so textProblems does not report their overlaps. They are not unreported - each FieldFallback names what it covers, and report.ts prints them per block in RENDER-REPORT.md",
      "tp-leg-upper: DRAWS",
      "tp-leg-feedback: DRAWS",
      "tp-leg-lower-a: DRAWS",
      "tp-leg-lower-b: DRAWS",
      "tp-leg-collector: DRAWS",
      "tp-leg-emitter-bypass: blocked by label-label-overlap published label-label-overlap",
      "    control (checkLayout published this too): label BYPASS_JUMPED at (17.78, 3.81) overlaps label BYPASS_CAP at (12.7, 5.08)",
      "tp-stage: blocked by body-label-overlap, label-body-overlap, label-graphic-overlap, label-pin-text-overlap, label-wire-overlap" +
        " published body-label-overlap, body-label-overlap, label-wire-overlap, label-body-overlap, label-pin-text-overlap, label-body-overlap," +
        " label-graphic-overlap, label-graphic-overlap units with no clear slot C3#1, C4#1, J2#1",
      "    FALLBACK C3#1 (Device:C_Polarized): covers wire 19 (EMITTER)",
      "    FALLBACK C4#1 (Device:C_Polarized): covers wire 24 (GND)",
      "    FALLBACK J2#1 (Connector_Generic:Conn_01x02): covers wire 35 (GND)",
      "    FALLBACK TP1#1 (Connector:TestPoint): covers label EMITTER",
      "    control (checkLayout published this too): label BYPASS_CAP at (11.43, 11.43) overlaps wire 12 of tp-stage (COLLECTOR)",
      "    control (checkLayout published this too): label BYPASS_CAP at (11.43, 11.43) overlaps body of Q1#1",
      "    control (checkLayout published this too): label BYPASS_CAP at (11.43, 11.43) overlaps pin Q1.2 text",
      "    control (checkLayout published this too): label BASE at (53.34, 25.4) overlaps body of TP1#1",
      "    control (checkLayout published this too): label BASE at (53.34, 25.4) overlaps graphic 2 of TP1#1",
      "    control (checkLayout published this too): label BASE at (53.34, 25.4) overlaps graphic 3 of TP1#1",
      "    unmeasured: text clearance involving the 4 fallback field pair(s) of " +
        "C3#1, C4#1, J2#1, TP1#1: the placer had no clear slot and chose the least-covered one, so textProblems does not report their overlaps. They are not unreported - each FieldFallback names what it covers, and report.ts prints them per block in RENDER-REPORT.md",
      "7 of 12 declared blocks draw",
      "1 of 12 are ONE measured problem from drawing with nothing unmeasured behind it (tp-leg-emitter-bypass)",
      "1 have ONE measured problem and an unmeasured residual: ob-buffer",
      "1 have more than one: tp-stage",
      "2 are unmeasurable, nothing looked at them: oc-audio, oc-sidechain",
    ])
  })

  /**
   * **THE BUCKETS AFTER TASK 24, and the two that emptied are the finding.** `oc-power` and
   * `pt-core` were *"one measured problem plus an unmeasured residual"*; they now DRAW, which is
   * the ceiling G232 published being reached. `ob-buffer` moved the other way - from two measured
   * classes to one - because the class it lost was the field-placement refusal, not because
   * anything about it improved.
   *
   * **A CHECK THAT COULD HAVE FAILED IN FOUR DIRECTIONS**, and it did fail in one of them while
   * the previous round of this test was being written: `ob-buffer` was in the one-problem-away
   * bucket until the field-free pass found its power-value overlap.
   */
  it("separates one-problem-away from one-problem-plus-residual from unmeasurable", () => {
    expect(rows.filter(oneProblemAway).map((r) => r.block)).toEqual(["tp-leg-emitter-bypass"])
    expect(rows.filter((r) => r.blockedBy.length === 1 && r.unmeasured.length > 0).map((r) => r.block)).toEqual(["ob-buffer"])
    expect(rows.filter((r) => r.blockedBy.length > 1).map((r) => r.block)).toEqual(["tp-stage"])
    expect(rows.filter((r) => !r.draws && r.blockedBy.length === 0).map((r) => r.block)).toEqual(["oc-audio", "oc-sidechain"])
    // The arithmetic G232 published, re-taken after the fix: 7 draw, which is `5 + 2` exactly.
    expect(rows.filter((r) => r.draws).length).toBe(7)
    // And field placement blocks NOTHING any more - asserted as an empty list rather than a count,
    // so a block that still carried the class would fail here naming itself.
    expect(rows.filter((r) => r.blockedBy.includes("field-placement")).map((r) => r.block)).toEqual([])
  })

  /**
   * **THE PER-UNIT FIGURES G239 PUBLISHES, AND THEY SURVIVED THE FIX UNCHANGED.** `placeFields`
   * walks units in placement order, so one refusal line was only ever a floor; this probe re-asks
   * each unit FIRST, where it sees the most permissive obstacle set the search can give it. The
   * four lists below are the same four G239's Task 22 amendment recorded, with "no slot" now
   * meaning "no CLEAR slot, so the unit is drawn over something".
   *
   * **AND THE REAL PLACEMENT ORDER FALLS BACK MORE OFTEN THAN THE PROBE DOES, which is new and is
   * only measurable now.** `pt-core` has seven units with no clear slot asked first and EIGHT
   * fallbacks in its own order; `tp-stage` has three and FOUR. **The extra one in each is
   * order-dependent** - `C10#1` and `TP1#1` have a clear slot until an earlier unit's fields take
   * it - which is exactly the sequential dependence G239 named and could not measure while the
   * placer stopped at the first failure.
   */
  it("counts the units with no clear field slot, and the real order falls back more often than that", () => {
    expect(row("pt-core").fallbackUnits).toEqual(["C7#1", "C9#1", "C11#1", "C12#1", "R3#1", "R4#1", "R6#1"])
    expect(row("ob-buffer").fallbackUnits).toEqual(["C3#1", "J3#1"])
    expect(row("tp-stage").fallbackUnits).toEqual(["C3#1", "C4#1", "J2#1"])
    expect(row("oc-power").fallbackUnits).toEqual(["C3#1"])
    // CONTROL: a block whose every field has a clear slot has none, in both measurements. A probe
    // that reported a fallback here would be measuring itself.
    expect(row("tp-leg-upper").fallbackUnits).toEqual([])
    expect(row("tp-leg-upper").fallbacks).toEqual([])
    expect(row("tp-leg-emitter-bypass").fallbackUnits).toEqual([])
    expect(row("tp-leg-emitter-bypass").fallbacks).toEqual([])
    // The order-dependent extras, named rather than counted, so a change in placement order fails
    // here saying which unit moved.
    expect(row("pt-core").fallbacks.map((f) => f.key)).toEqual(["C7#1", "C9#1", "C10#1", "C11#1", "C12#1", "R3#1", "R4#1", "R6#1"])
    expect(row("tp-stage").fallbacks.map((f) => f.key)).toEqual(["C3#1", "C4#1", "J2#1", "TP1#1"])
    /**
     * **EVERY UNIT THE FIRST-POSITION PROBE NAMES ALSO FALLS BACK IN THE REAL ORDER, which is two
     * measurements agreeing and is not a tautology.** The probe asks each unit with no other
     * fields placed at all; the real run places them in order, each one's fields becoming an
     * obstacle for the next. A unit could therefore fail the probe and place cleanly in the real
     * order only if adding obstacles created a slot, which it cannot - so **a red here would be a
     * defect in the placer**, not a finding about a block.
     */
    for (const r of rows) {
      const real = new Set(r.fallbacks.map((f) => f.key))
      for (const u of r.fallbackUnits) expect(real.has(u), `${r.block} ${u}`).toBe(true)
    }
  })

  /**
   * **WHY THE REPORT COULD NOT SIMPLY BE WIDENED IN PLACE, measured rather than argued - and the
   * first version of this test said THREE blocks and was wrong.**
   *
   * `adaptElkLayoutReported` reports a `clearance` mismatch when some `checkLayout` problem names
   * an obstacle pair and an `invalid-geometry` one when none does. A field-placement refusal names
   * no pair. So the question is whether the MASKED problems name one, and that is per block:
   *
   * - `ob-buffer`: 0 pairs published, and its masked power-value overlap names one, so widening
   *   `checkLayout` flips its classified verdict from `invalid-geometry` to `clearance`;
   * - `oc-power` and `pt-core`: 0 pairs published and NOTHING masked, so widening moves nothing
   *   **today** - and nothing holds that still: one new text obstacle, or one new block in the
   *   corpus, and these two are `ob-buffer`;
   * - `tp-stage`: already two pairs, so its kind cannot move at all.
   *
   * **THAT IS A WORSE PROPERTY THAN A UNIFORM CHANGE, which is the point.** The verdict kind would
   * become contingent on the masked population - data nobody reviewed, varying per block and per
   * corpus - so one of twelve blocks flips today and the review that passed it could not tell
   * which ones flip next. `docs/known-gaps.md` **G258**'s criterion two asked for the measurement
   * WITHOUT changing what anything refuses, and this is why that is a separate tool.
   */
  it("changes the mismatch KIND of no block, because the widening it was about has happened", () => {
    // **THE QUESTION THIS ANSWERED IS SETTLED, AND THE ANSWER IS THAT THE FLIP ALREADY HAPPENED.**
    // `ob-buffer` refused as `invalid-geometry` because its only published problem - the
    // field-placement refusal - named no obstacle pair. With that refusal gone its power-value
    // overlap IS published, that problem DOES name a pair, and its kind is `clearance`. So the
    // contingency this test warned about is not hypothetical any more: it fired, on the one block
    // the previous round predicted it would fire on.
    const buffer = row("ob-buffer")
    expect(buffer.mismatchKind).toBe("clearance")
    expect(clearancePairs(buffer.publishedProblems)).toHaveLength(1)
    // And there is nothing left to widen: the field-free pass finds nothing checkLayout did not
    // publish, on every block, so the pair set a widening could add to is EMPTY. The comparison is
    // over the problems the widening would ADD - `fieldFree` repeats what is already published, so
    // concatenating the two lists double-counts and measures nothing.
    for (const r of rows.filter((x) => x.mismatchKind !== "")) {
      const added = r.fieldFree.filter((p) => !r.publishedProblems.includes(p))
      expect(added, r.block).toEqual([])
      expect(clearancePairs(added).length, r.block).toBe(0)
    }
    // CONTROL: a block that names pairs is `clearance`, and the two that reach no layout at all
    // are neither - so the loop above is not running over a set where every answer is the same.
    const stage = row("tp-stage")
    expect(stage.mismatchKind).toBe("clearance")
    expect(clearancePairs(stage.publishedProblems).length).toBeGreaterThan(2)
    expect(row("oc-audio").mismatchKind).toBe("invalid-geometry")
  })

  /**
   * **THE SOUNDNESS CONTROL, ON PRODUCTION GEOMETRY, AND SINCE TASK 24 IT RUNS ON EVERY BLOCK WITH
   * A LAYOUT.** `checkLayout` reaches the full text pass on all ten of them now, so the field-free
   * pass must find nothing it did not report. `maskedCensus` refuses when it does; this asserts
   * the control is not vacuous - `tp-leg-emitter-bypass` and `tp-stage` really do find their label
   * problems with no field in the scene, which is why those problems are known to survive any
   * field placement.
   */
  it("finds the same problem with no fields in the scene as checkLayout finds with them", () => {
    const withLayout = rows.filter((r) => r.unmeasured.every((u) => !u.startsWith("every clearance check")))
    expect(withLayout.map((r) => r.block)).toEqual([
      "ob-buffer", "oc-power", "pt-core",
      "tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b", "tp-leg-collector", "tp-leg-emitter-bypass", "tp-stage",
    ])
    for (const r of withLayout) expect(r.fieldFree.filter((p) => !r.publishedProblems.includes(p)), r.block).toEqual([])
    // NOT VACUOUS: two of the ten have a problem to find, and the field-free pass finds it.
    expect(row("tp-leg-emitter-bypass").fieldFree).toEqual(["label BYPASS_JUMPED at (17.78, 3.81) overlaps label BYPASS_CAP at (12.7, 5.08)"])
    expect(row("tp-stage").fieldFree.length).toBe(6)
    expect(row("tp-leg-upper").fieldFree).toEqual([])
  })

  /**
   * No masked problem names a field, which is the one premise the whole population rests on - and
   * the guard that holds it is driven in BOTH arms here rather than left as a tripwire today's data
   * cannot trip (**G236**).
   */
  it("reports no masked problem that involves a unit's own Reference or Value, and refuses one that does", () => {
    const naming = rows.flatMap((r) => r.fieldFree.filter((p) => FIELD_TEXT.test(p)))
    expect(naming).toEqual([])
    // The refusing arm, from the field-text form `tests/schgen/remeasure.test.ts` already uses.
    expect(() => withoutFieldText("B", ["Reference of C3#1 overlaps body of R6#1"])).toThrow(/naming a unit's own Reference or Value/)
    expect(() => withoutFieldText("B", ["Value of C3#1 overlaps label N1 at (0, 0)"])).toThrow(/is a defect in/)
    // And the passing arm on the shapes that ARE measurable: the discriminator could have failed
    // both ways, and a power symbol's value contains "value of" without being a unit's field.
    const measurable = [
      "value of power symbol GND 0 at (99.06, 33.02) overlaps value of power symbol VEE 1 at (99.06, 44.45)",
      "label BYPASS_CAP at (11.43, 11.43) overlaps pin Q1.2 text",
    ]
    expect(withoutFieldText("B", measurable)).toEqual(measurable)
  })
})

/**
 * **WHAT THE `"omitted"` SCENE DROPS, EXACTLY - the mechanism the measurement above rests on.**
 *
 * The real-corpus control shows the subset holds where it can be checked; this shows WHY, on one
 * resistor: the omitted scene is the placed scene minus its two field boxes and identical in every
 * other part. `textProblems` is a function of the scene, so dropping a text can only drop the
 * problems that text is party to - which makes the masked population sound and makes everything
 * involving a field unmeasurable rather than absent.
 */
describe("the field-free text scene", () => {
  const one = () => {
    const c = blockCircuit([res("R1", "N1", "N2")], { kind: "bus", groups: [] }, { external: [] })
    const g = subgraphOf(c, "B", symbols)
    const layout: BlockLayout = { placements: [{ part: "R1", unit: 1, at: { x: 0, y: 0 }, rot: 0 }], wires: [], anchors: [] }
    const parts = { blocks: [{ g, layout }], powers: [], labels: [], texts: [], frames: [] }
    return {
      placed: textScene("block B", symbols, parts),
      omitted: textScene("block B", symbols, parts, "omitted"),
    }
  }

  it("drops the unit's Reference and Value and nothing else", () => {
    const { placed, omitted } = one()
    expect(placed.texts.map((t) => t.what)).toEqual(["Reference of R1#1", "Value of R1#1"])
    expect(omitted.texts).toEqual([])
    // Every other part of the scene is the same object graph: the obstacles a problem would be
    // measured against are untouched, which is what makes the two comparable at all.
    expect(omitted.bodies).toEqual(placed.bodies)
    expect(omitted.segments).toEqual(placed.segments)
    expect(omitted.pinTexts).toEqual(placed.pinTexts)
    expect(omitted.strokes).toEqual(placed.strokes)
    expect(omitted.frames).toEqual(placed.frames)
    expect(omitted.crosses).toEqual(placed.crosses)
    expect(omitted.scope).toBe(placed.scope)
    // CONTROL: the placed scene is the one every check uses, and it is unchanged - a default
    // argument that altered it would make this whole file a measurement of something else.
    expect(placed.bodies.map((b) => b.what)).toEqual(["body of R1#1"])
  })

  it("is clean on a layout whose only texts are the fields, which is a bound and not a verdict", () => {
    const { placed, omitted } = one()
    expect(textProblems(placed)).toEqual([])
    expect(textProblems(omitted)).toEqual([])
  })
})
