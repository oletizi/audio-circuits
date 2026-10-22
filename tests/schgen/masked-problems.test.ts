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
   * **THE TABLE, AND IT IS THE TASK'S WHOLE ANSWER.** `5 + 3 = 8` (**G232**, **G258**) assumed the
   * three blocks whose only reported problem is field placement were each one fix from drawing.
   * One of them is not: `ob-buffer` hides a power-value overlap, which no fix to field placement
   * touches. So the bound is `5 + 2 = 7`, and it is still a BOUND - the text clearance of any
   * field is unmeasurable while the field has no slot.
   */
  it("prints every problem class of every block, published and masked", () => {
    expect(renderMasked(rows)).toEqual([
      "ob-buffer: blocked by field-placement, power-value-overlap published field-placement masked power-value-overlap units with no slot C3#1, J3#1",
      "    masked: value of power symbol GND 0 at (99.06, 33.02) overlaps value of power symbol VEE 1 at (99.06, 44.45)",
      "    unmeasured: text clearance involving any unit's own Reference or Value: field placement refused, so there is no slot to measure one from",
      "oc-power: blocked by field-placement published field-placement units with no slot C3#1",
      "    unmeasured: text clearance involving any unit's own Reference or Value: field placement refused, so there is no slot to measure one from",
      "oc-audio: blocked by nothing measurable",
      "    unmeasured: every clearance check: refused at obligation 1: the snap collapsed geometry, so there is no grid-legal layout for any of them to run on",
      "oc-sidechain: blocked by nothing measurable",
      "    unmeasured: every clearance check: refused at obligation 3: one transform, two readers, so there is no grid-legal layout for any of them to run on",
      "pt-core: blocked by field-placement published field-placement units with no slot C7#1, C9#1, C11#1, C12#1, R3#1, R4#1, R6#1",
      "    unmeasured: text clearance involving any unit's own Reference or Value: field placement refused, so there is no slot to measure one from",
      "tp-leg-upper: DRAWS",
      "tp-leg-feedback: DRAWS",
      "tp-leg-lower-a: DRAWS",
      "tp-leg-lower-b: DRAWS",
      "tp-leg-collector: DRAWS",
      "tp-leg-emitter-bypass: blocked by label-label-overlap published label-label-overlap",
      "    control (fields placed, so checkLayout published this too): label BYPASS_JUMPED at (17.78, 3.81) overlaps label BYPASS_CAP at (12.7, 5.08)",
      "tp-stage: blocked by body-label-overlap, field-placement, label-body-overlap, label-graphic-overlap, label-pin-text-overlap, label-wire-overlap" +
        " published body-label-overlap, body-label-overlap, field-placement" +
        " masked label-wire-overlap, label-body-overlap, label-pin-text-overlap, label-body-overlap, label-graphic-overlap, label-graphic-overlap" +
        " units with no slot C3#1, C4#1, J2#1",
      "    masked: label BYPASS_CAP at (11.43, 11.43) overlaps wire 12 of tp-stage (COLLECTOR)",
      "    masked: label BYPASS_CAP at (11.43, 11.43) overlaps body of Q1#1",
      "    masked: label BYPASS_CAP at (11.43, 11.43) overlaps pin Q1.2 text",
      "    masked: label BASE at (53.34, 25.4) overlaps body of TP1#1",
      "    masked: label BASE at (53.34, 25.4) overlaps graphic 2 of TP1#1",
      "    masked: label BASE at (53.34, 25.4) overlaps graphic 3 of TP1#1",
      "    unmeasured: text clearance involving any unit's own Reference or Value: field placement refused, so there is no slot to measure one from",
      "5 of 12 declared blocks draw",
      "1 of 12 are ONE measured problem from drawing with nothing unmeasured behind it (tp-leg-emitter-bypass)",
      "2 have ONE measured problem and an unmeasured residual: oc-power, pt-core",
      "2 have more than one: ob-buffer, tp-stage",
      "2 are unmeasurable, nothing looked at them: oc-audio, oc-sidechain",
    ])
  })

  /**
   * **ONE BLOCK IS ONE MEASURED PROBLEM FROM DRAWING WITH NOTHING BEHIND IT, AND IT IS NOT ONE OF
   * THE THREE THE LEVERAGE FIGURE COUNTED.** The split is the point: `oc-power` and `pt-core` have
   * one measured class each AND an unmeasured residual, `ob-buffer` has two measured classes, and
   * two blocks have nothing measured at all. A check that could have failed in four directions,
   * and it did fail in one of them while this was being written: `ob-buffer` was in the first
   * bucket until the field-free pass found its power-value overlap.
   */
  it("separates one-problem-away from one-problem-plus-residual from unmeasurable", () => {
    expect(rows.filter(oneProblemAway).map((r) => r.block)).toEqual(["tp-leg-emitter-bypass"])
    expect(rows.filter((r) => r.blockedBy.length === 1 && r.unmeasured.length > 0).map((r) => r.block)).toEqual(["oc-power", "pt-core"])
    expect(rows.filter((r) => r.blockedBy.length > 1).map((r) => r.block)).toEqual(["ob-buffer", "tp-stage"])
    expect(rows.filter((r) => !r.draws && r.blockedBy.length === 0).map((r) => r.block)).toEqual(["oc-audio", "oc-sidechain"])
    // The arithmetic G232 published, re-taken: 5 draw, and field placement is the sole MEASURED
    // blocker of two rather than three, so the ceiling it buys is 7 of 12 and not 9 and not 8.
    expect(rows.filter((r) => r.draws).length).toBe(5)
    expect(rows.filter((r) => r.blockedBy.length === 1 && r.blockedBy[0] === "field-placement").map((r) => r.block)).toEqual(["oc-power", "pt-core"])
  })

  /**
   * **THE SECOND MASKING, AND NOTHING HAD RECORDED IT**: `tryPlaceFields` returns at the FIRST
   * unit it cannot place, so a block's one field-placement line is a floor. `pt-core` publishes
   * `C7#1` and has SEVEN units with no slot even in first position - the most permissive obstacle
   * set the search can be given.
   *
   * **A CHECK THAT COULD HAVE ANSWERED DIFFERENTLY, and the answer was not known before it ran:**
   * had each block's other units placed once asked first, every `blockedUnits` would hold exactly
   * the one unit the refusal already names, and there would be no second masking to record.
   */
  it("counts the units with no field slot, not just the one the refusal names", () => {
    expect(row("pt-core").blockedUnits).toEqual(["C7#1", "C9#1", "C11#1", "C12#1", "R3#1", "R4#1", "R6#1"])
    expect(row("ob-buffer").blockedUnits).toEqual(["C3#1", "J3#1"])
    expect(row("tp-stage").blockedUnits).toEqual(["C3#1", "C4#1", "J2#1"])
    expect(row("oc-power").blockedUnits).toEqual(["C3#1"])
    // CONTROL: a block that draws has none, and so does the one whose fields place and whose
    // problem is elsewhere. A probe that reported a blocked unit here would be measuring itself.
    expect(row("tp-leg-upper").blockedUnits).toEqual([])
    expect(row("tp-leg-emitter-bypass").blockedUnits).toEqual([])
    /**
     * **THE UNIT THE PRODUCTION REFUSAL NAMES IS ALWAYS ONE OF THEM, which is two measurements
     * agreeing and is not a tautology.** The published refusal names the first failing unit in
     * PLACEMENT order, with every earlier unit's fields already occupying slots; this probe asks
     * each unit with no other fields placed at all. A unit could therefore fail in the published
     * run and place here, and **a red here would be a FINDING - that unit's failure is contingent
     * on where another unit's fields went - rather than a defect in the probe.**
     */
    for (const r of rows.filter((x) => x.blockedUnits.length > 0)) {
      const named = r.publishedProblems.filter((p) => p.includes("no place for its Reference and Value"))
      expect(named).toHaveLength(1)
      expect(r.blockedUnits.some((u) => named[0]?.includes(`${u} (`))).toBe(true)
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
  it("would change the mismatch KIND of one block today, and of which blocks is not a property of the change", () => {
    const buffer = row("ob-buffer")
    expect(buffer.mismatchKind).toBe("invalid-geometry")
    expect(clearancePairs(buffer.publishedProblems)).toEqual([])
    expect(clearancePairs([...buffer.publishedProblems, ...buffer.fieldFree])).toHaveLength(1)
    // The two whose kind would NOT move today, and the reason is that they mask nothing - not that
    // the widening is safe for them.
    for (const id of ["oc-power", "pt-core"]) {
      const r = row(id)
      expect(r.mismatchKind).toBe("invalid-geometry")
      expect(r.fieldFree).toEqual([])
      expect(clearancePairs([...r.publishedProblems, ...r.fieldFree])).toEqual([])
    }
    // CONTROL: a block that already names pairs cannot have its kind moved by any widening.
    const stage = row("tp-stage")
    expect(stage.mismatchKind).toBe("clearance")
    expect(clearancePairs(stage.publishedProblems)).toHaveLength(2)
    expect(clearancePairs([...stage.publishedProblems, ...stage.fieldFree]).length).toBeGreaterThan(2)
    // And the one block whose fields placed refuses as a clearance already, with its pair.
    expect(row("tp-leg-emitter-bypass").mismatchKind).toBe("clearance")
  })

  /**
   * **THE SOUNDNESS CONTROL, ON PRODUCTION GEOMETRY.** Six blocks have fields that place, so
   * `checkLayout` ran the full text pass on them and the field-free pass must find nothing it did
   * not report. `maskedCensus` refuses when it does; this asserts the control is not vacuous -
   * `tp-leg-emitter-bypass` really does find its label-over-label problem with no field in the
   * scene, which is why that problem is known to survive any field placement.
   */
  it("finds the same problem with no fields in the scene as checkLayout finds with them", () => {
    const placed = rows.filter((r) => r.fieldsPlaced)
    expect(placed.map((r) => r.block)).toEqual([
      "tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b", "tp-leg-collector", "tp-leg-emitter-bypass",
    ])
    for (const r of placed) expect(r.fieldFree.filter((p) => !r.publishedProblems.includes(p))).toEqual([])
    // NOT VACUOUS: one of the six has a problem to find, and the field-free pass finds it.
    expect(row("tp-leg-emitter-bypass").fieldFree).toEqual(["label BYPASS_JUMPED at (17.78, 3.81) overlaps label BYPASS_CAP at (12.7, 5.08)"])
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
