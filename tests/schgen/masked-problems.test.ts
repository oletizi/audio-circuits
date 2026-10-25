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

/**
 * The `unmeasured` line a block's fallback fields produce, written out ONCE.
 *
 * It is typed here rather than imported from `tools/schgen/masked-problems.ts`, so the sentence is
 * still pinned by this file and a reworded report still goes red; five copies of it in the array
 * below is what pushed this file past `CLAUDE.md`'s length ceiling.
 */
const unmeasuredFallbacks = (units: readonly string[]): string =>
  `    unmeasured: text clearance involving the ${units.length} fallback field pair(s) of ` +
  `${units.join(", ")}: the placer had no clear slot and chose the least-covered one, so ` +
  "textProblems does not report their overlaps. They are not unreported - each FieldFallback " +
  "names what it covers, and report.ts prints them per block in RENDER-REPORT.md"

describe("what every declared block's refusal is hiding", () => {
  /**
   * **THE TABLE, AND TASK 24 TURNED ITS BOUND INTO A COUNT.** `5 + 3 = 8` (**G232**, **G258**)
   * assumed the three blocks whose only reported problem was field placement were each one fix
   * from drawing; `ob-buffer` was not, so the bound became `5 + 2 = 7`. The placer now takes the
   * least-covered slot instead of refusing, and the census read 7 of 12 - the bound exactly.
   *
   * **THE CENSUS READS 10 OF 12 SINCE 2026-10-25, AND `5 + 2 = 7` IS SUPERSEDED BY A CAUSE IT
   * NEVER CONTEMPLATED.** `boundaryNodeOf` stopped handing ELK a dimensionless point for every
   * global label and power symbol (`docs/known-gaps.md` **G291**), so the layout engine reserves
   * the room the text occupies. **Three more blocks draw and not one check was relaxed**:
   * `oc-audio`, `tp-leg-emitter-bypass` and `tp-stage`. Task 22's `5 + 2` was a bound on what
   * FIELD PLACEMENT could unblock, and it was correct about that; the three blocks above were
   * refused by LABEL and power-symbol clearance, which is a different population and is what
   * node sizing addressed.
   *
   * **WHAT MOVED IN THE OTHER COLUMNS, AND EACH MOVE IS THE SAME CAUSE.** `ob-buffer` loses
   * `J3#1` from its no-clear-slot list and `oc-power` loses `C3#1` from it - a less cramped block
   * gives the field placer a clear slot where it had none. `oc-power`'s remaining fallback covers
   * a different wire (`20 (GND)` where it covered `28 (VBIAS_RAW)`) because the route moved.
   * `tp-stage` gains `C2#1` and loses `TP1#1`, and `tp-leg-emitter-bypass` gains `JP5#1`: both
   * blocks reach the field placer for the first time, since a block that `checkLayout` refuses
   * never gets to it. **`ob-buffer`'s own `C3#1` still covers `wire 49 (VEE)`, which is the
   * control**: the one block whose refusal did not move did not have its geometry moved either.
   */
  it("prints every problem class of every block, with its fallback field placements", () => {
    expect(renderMasked(rows)).toEqual([
      "ob-buffer: blocked by power-value-overlap published power-value-overlap units with no clear slot C3#1",
      "    FALLBACK C3#1 (Device:C): covers wire 49 (VEE)",
      "    control (checkLayout published this too): value of power symbol GND 0 at (99.06, 33.02) overlaps value of power symbol VEE 1 at (99.06, 44.45)",
      unmeasuredFallbacks(["C3#1"]),
      "oc-power: DRAWS",
      "    FALLBACK C3#1 (Device:C): covers wire 20 (GND)",
      unmeasuredFallbacks(["C3#1"]),
      "oc-audio: DRAWS units with no clear slot U1#2, C6#1, R7#1",
      "    FALLBACK U1#2 (Amplifier_Operational:TL072): covers wire 22 (MAKEUP_FB)",
      "    FALLBACK C6#1 (Device:C): covers wire 8 (GND)",
      "    FALLBACK R7#1 (Device:R): covers wire 12 (GND)",
      unmeasuredFallbacks(["U1#2", "C6#1", "R7#1"]),
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
      unmeasuredFallbacks(["C7#1", "C9#1", "C10#1", "C11#1", "C12#1", "R3#1", "R4#1", "R6#1"]),
      "tp-leg-upper: DRAWS",
      "tp-leg-feedback: DRAWS",
      "tp-leg-lower-a: DRAWS",
      "tp-leg-lower-b: DRAWS",
      "tp-leg-collector: DRAWS",
      "tp-leg-emitter-bypass: DRAWS units with no clear slot JP5#1",
      "    FALLBACK JP5#1 (Jumper:Jumper_2_Open): covers wire 0 (BYPASS_CAP), wire 1 (BYPASS_CAP)",
      unmeasuredFallbacks(["JP5#1"]),
      "tp-stage: DRAWS units with no clear slot C2#1, C3#1, C4#1, J2#1",
      "    FALLBACK C2#1 (Device:C_Polarized): covers wire 24 (GND)",
      "    FALLBACK C3#1 (Device:C_Polarized): covers wire 18 (EMITTER), wire 19 (EMITTER), pin R6.1",
      "    FALLBACK C4#1 (Device:C_Polarized): covers wire 24 (GND)",
      "    FALLBACK J2#1 (Connector_Generic:Conn_01x02): covers wire 35 (GND)",
      unmeasuredFallbacks(["C2#1", "C3#1", "C4#1", "J2#1"]),
      "10 of 12 declared blocks draw",
      "0 of 12 are ONE measured problem from drawing with nothing unmeasured behind it (none)",
      "1 have ONE measured problem and an unmeasured residual: ob-buffer",
      "0 have more than one: none",
      "1 are unmeasurable, nothing looked at them: oc-sidechain",
    ])
  })

  /**
   * **THREE OF THE FOUR BUCKETS ARE NOW EMPTY, AND THAT IS THE MEASUREMENT RATHER THAN A WEAKENING
   * OF THE TEST.** After Task 24 the buckets held `tp-leg-emitter-bypass` (one problem, nothing
   * behind it), `ob-buffer` (one problem plus a residual), `tp-stage` (more than one) and
   * `oc-audio`/`oc-sidechain` (unmeasurable). Boundary-node sizing (**G291**) drew
   * `tp-leg-emitter-bypass`, `tp-stage` and `oc-audio`, so **ten of the twelve draw and `ob-buffer`
   * is the only block left with a measured problem at all.**
   *
   * **THE EMPTINESS IS ASSERTED AS EMPTINESS AND THE REMAINING SUBJECT IS NAMED**, because an
   * all-empty set of buckets is exactly the shape in which a classification test stops being able
   * to fail. `oneProblemAway` is empty because the one block it held now draws - NOT because
   * nothing is blocked: `ob-buffer` is still blocked, with a residual behind it, which is what
   * keeps the three-way separation observable.
   */
  it("separates one-problem-away from one-problem-plus-residual from unmeasurable", () => {
    expect(rows.filter(oneProblemAway).map((r) => r.block)).toEqual([])
    expect(rows.filter((r) => r.blockedBy.length === 1 && r.unmeasured.length > 0).map((r) => r.block)).toEqual(["ob-buffer"])
    expect(rows.filter((r) => r.blockedBy.length > 1).map((r) => r.block)).toEqual([])
    expect(rows.filter((r) => !r.draws && r.blockedBy.length === 0).map((r) => r.block)).toEqual(["oc-sidechain"])
    // 10 of 12 draw, and the two that do not are named - so "every bucket is empty" cannot be read
    // as "nothing is blocked".
    expect(rows.filter((r) => r.draws).length).toBe(10)
    expect(rows.filter((r) => !r.draws).map((r) => r.block)).toEqual(["ob-buffer", "oc-sidechain"])
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
   * fallbacks in its own order - the extra `C10#1` has a clear slot until an earlier unit's fields
   * take it - which is exactly the sequential dependence G239 named and could not measure while
   * the placer stopped at the first failure.
   *
   * **`oc-power` IS THE SECOND INSTANCE SINCE G291's NODE SIZING, AND IT IS THE CLEANEST ONE:
   * ZERO against ONE.** Asked first, `C3#1` now HAS a clear slot, so the probe names nothing; in
   * the real order it still falls back. `tp-stage`'s gap closed in the same change - four and
   * four, with `C2#1` replacing the order-dependent `TP1#1` - so the claim is carried by `pt-core`
   * and `oc-power` rather than by `tp-stage`, which is why both are asserted and the direction is
   * asserted per block rather than in aggregate.
   */
  it("counts the units with no clear field slot, and the real order falls back more often than that", () => {
    expect(row("pt-core").fallbackUnits).toEqual(["C7#1", "C9#1", "C11#1", "C12#1", "R3#1", "R4#1", "R6#1"])
    expect(row("ob-buffer").fallbackUnits).toEqual(["C3#1"])
    expect(row("tp-stage").fallbackUnits).toEqual(["C2#1", "C3#1", "C4#1", "J2#1"])
    expect(row("oc-power").fallbackUnits).toEqual([])
    expect(row("oc-audio").fallbackUnits).toEqual(["U1#2", "C6#1", "R7#1"])
    // CONTROL: a block whose every field has a clear slot has none, in both measurements. A probe
    // that reported a fallback here would be measuring itself.
    expect(row("tp-leg-upper").fallbackUnits).toEqual([])
    expect(row("tp-leg-upper").fallbacks).toEqual([])
    expect(row("tp-leg-collector").fallbackUnits).toEqual([])
    expect(row("tp-leg-collector").fallbacks).toEqual([])
    // The order-dependent extras, named rather than counted, so a change in placement order fails
    // here saying which unit moved.
    expect(row("pt-core").fallbacks.map((f) => f.key)).toEqual(["C7#1", "C9#1", "C10#1", "C11#1", "C12#1", "R3#1", "R4#1", "R6#1"])
    expect(row("tp-stage").fallbacks.map((f) => f.key)).toEqual(["C2#1", "C3#1", "C4#1", "J2#1"])
    // The probe names nothing for oc-power and the real order falls back on C3#1: 0 against 1, the
    // sequential dependence at its clearest.
    expect(row("oc-power").fallbacks.map((f) => f.key)).toEqual(["C3#1"])
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
    // **THE LOOP ABOVE NOW HAS EXACTLY TWO SUBJECTS, AND THAT IS ASSERTED RATHER THAN LEFT TO BE
    // DISCOVERED.** Ten of the twelve blocks draw since G291's node sizing, so they have no
    // mismatch kind at all; `tp-stage`, which used to be this test's `clearance` control with more
    // than two pairs, is one of them. A loop over an unstated subject set is how a check comes to
    // run over nothing and still pass.
    const kinded = rows.filter((r) => r.mismatchKind !== "")
    expect(kinded.map((r) => `${r.block} ${r.mismatchKind}`)).toEqual([
      "ob-buffer clearance",
      "oc-sidechain invalid-geometry",
    ])
    // CONTROL: the two kinds are different, and they are different for the stated reason - one
    // block's published problem names an obstacle pair and the other reaches no layout at all, so
    // it publishes nothing. A set where every answer was the same would pass the loop and say
    // nothing.
    expect(clearancePairs(row("ob-buffer").publishedProblems).length).toBe(1)
    expect(row("oc-sidechain").publishedProblems).toEqual([])
    expect(rows.filter((r) => r.draws).length).toBe(10)
  })

  /**
   * **THE SOUNDNESS CONTROL, ON PRODUCTION GEOMETRY, AND IT NOW RUNS ON ELEVEN OF THE TWELVE.**
   * `oc-audio` joined the set when G291's node sizing got it past obligation 1, so only
   * `oc-sidechain` still reaches no grid-legal layout at all. `checkLayout` reaches the full text
   * pass on all eleven, so the field-free pass must find nothing it did not report.
   * `maskedCensus` refuses when it does.
   *
   * **THE NON-VACUITY CONTROL CHANGED SUBJECT, WHICH IS WORTH SAYING PLAINLY.** It used to rest on
   * `tp-leg-emitter-bypass`'s label-label overlap and `tp-stage`'s six label problems - and both of
   * those problems are GONE, because the room the labels needed is now reserved before the layout
   * is packed. The one problem left anywhere in the corpus is `ob-buffer`'s power-value overlap,
   * and the field-free pass finds that one, so the control stands on a single subject. **One
   * subject is weaker than two and the weakening is recorded rather than hidden**; `docs/known-gaps.md`
   * **G291** carries it.
   */
  it("finds the same problem with no fields in the scene as checkLayout finds with them", () => {
    const withLayout = rows.filter((r) => r.unmeasured.every((u) => !u.startsWith("every clearance check")))
    expect(withLayout.map((r) => r.block)).toEqual([
      "ob-buffer", "oc-power", "oc-audio", "pt-core",
      "tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b", "tp-leg-collector", "tp-leg-emitter-bypass", "tp-stage",
    ])
    for (const r of withLayout) expect(r.fieldFree.filter((p) => !r.publishedProblems.includes(p)), r.block).toEqual([])
    // NOT VACUOUS: one of the eleven has a problem to find, and the field-free pass finds it.
    expect(row("ob-buffer").fieldFree).toEqual([
      "value of power symbol GND 0 at (99.06, 33.02) overlaps value of power symbol VEE 1 at (99.06, 44.45)",
    ])
    // And the ones that no longer have a problem to find are named, so "empty" reads as a result.
    expect(row("tp-leg-emitter-bypass").fieldFree).toEqual([])
    expect(row("tp-stage").fieldFree).toEqual([])
    expect(row("tp-leg-upper").fieldFree).toEqual([])
    expect(withLayout.filter((r) => r.fieldFree.length > 0).map((r) => r.block)).toEqual(["ob-buffer"])
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
