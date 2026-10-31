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
   * **AND THE ORIENTATION RULE CUT THE FALLBACK POPULATION FROM 18 TO 11 WITHOUT MOVING THE
   * BUCKETS** (`docs/known-gaps.md` **G292**). Laying a two-terminal passive with no rail end
   * along the signal re-places every block, so the slots the field placer is offered move with it.
   *
   * **THE CENSUS READ 8 OF 12 ON 2026-10-26 AND THE FALLBACK POPULATION WENT 11 TO 20 - BOTH
   * THE WRONG WAY, AND NEITHER IS PRESENTED AS ANYTHING ELSE** (**G296**). `edgesForNet`'s star
   * and the two 180 rules re-place every block again:
   *
   * | block | fallbacks before | at G296 | now |
   * | --- | --- | --- | --- |
   * | `pt-core` | 4 | **15** | 15 |
   * | `oc-audio` | 3 | 3, on different units | 3 |
   * | `tp-stage` | 1 | **2** | 2 |
   * | `ob-buffer` | 1 | **0** - it DRAWS with every field clear | 0 |
   * | `oc-power` | 1 | 0 - it no longer draws at all | 0 |
   * | `tp-leg-emitter-bypass` | 1 | **0** | **1**, on `JP5#1` |
   *
   * **THE CENSUS IS 9 OF 12 SINCE THE JUMPER TURN WAS DECLINED, AND THE POPULATION WENT 20 TO 21,
   * SO ONE FIGURE IMPROVED AND THE OTHER DID NOT** (**G297**). `tp-leg-upper` draws, and the same
   * change puts one fallback back on `tp-leg-emitter-bypass`: `JP5#1` is a jumper, it is no longer
   * turned 180, and at its new rotation the placer has no clear slot for its fields and chooses the
   * least-covered one - over `wire 0` and `wire 1`, both `BYPASS_CAP`. **That is the
   * minimise-and-disclose trade of G260 and it is the cost of the block census moving**, recorded
   * here rather than netted off against the block that was gained.
   *
   * **`pt-core`'s FIFTEEN ARE CROSS-CHECKED BY A DIFFERENT DRIVER, which is what makes the figure
   * a measurement rather than this module's opinion of itself**:
   * `tests/schgen/gates/pt2399-nc-round-trip.kicad.test.ts` generates that circuit through
   * `generate` - a different entry point, with the real `kicad-cli` behind it - and reports the
   * same fifteen keys in the same order.
   *
   * **ALL FIFTEEN of pt-core's fallbacks cover a WIRE, and five of them cover the SAME wire**
   * (`wire 76 (Net-(C8-Pad2))`). A field placed over five different capacitors' worth of the one
   * net's wire is the shape **G260** trades away by design; the count is here so the trade is
   * visible, and nothing in this file refuses it.
   */
  it("prints every problem class of every block, with its fallback field placements", () => {
    expect(renderMasked(rows)).toEqual([
      "ob-buffer: DRAWS",
      "oc-power: blocked by power-value-body-overlap, power-value-graphic-overlap, power-value-wire-overlap published power-value-wire-overlap, power-value-body-overlap, power-value-body-overlap, power-value-graphic-overlap, power-value-graphic-overlap, power-value-graphic-overlap, power-value-graphic-overlap",
      "    control (checkLayout published this too): value of power symbol +9V_PROTECTED 1 at (33.02, 52.07) overlaps wire 0 of oc-power (+9V_PROTECTED)",
      "    control (checkLayout published this too): value of power symbol +9V_PROTECTED 1 at (33.02, 52.07) overlaps body of C1#1",
      "    control (checkLayout published this too): value of power symbol +9V_PROTECTED 1 at (33.02, 52.07) overlaps body of C3#1",
      "    control (checkLayout published this too): value of power symbol +9V_PROTECTED 1 at (33.02, 52.07) overlaps graphic 0 of C1#1",
      "    control (checkLayout published this too): value of power symbol +9V_PROTECTED 1 at (33.02, 52.07) overlaps graphic 1 of C1#1",
      "    control (checkLayout published this too): value of power symbol +9V_PROTECTED 1 at (33.02, 52.07) overlaps graphic 0 of C3#1",
      "    control (checkLayout published this too): value of power symbol +9V_PROTECTED 1 at (33.02, 52.07) overlaps graphic 1 of C3#1",
      "oc-audio: blocked by power-value-wire-overlap published power-value-wire-overlap, power-value-wire-overlap units with no clear slot R3#1, U1#1, U1#2",
      "    FALLBACK R3#1 (Device:R): covers wire 33 (OUT)",
      "    FALLBACK U1#1 (Amplifier_Operational:TL072): covers pin U1.1 text",
      "    FALLBACK U1#2 (Amplifier_Operational:TL072): covers wire 63 (audio_GR)",
      "    control (checkLayout published this too): value of power symbol +9V_PROTECTED 1 at (38.1, 24.13) overlaps wire 2 of oc-audio (+9V_PROTECTED)",
      "    control (checkLayout published this too): value of power symbol +9V_PROTECTED 1 at (38.1, 24.13) overlaps wire 12 of oc-audio (GND)",
      unmeasuredFallbacks(["R3#1", "U1#1", "U1#2"]),
      "oc-sidechain: blocked by nothing measurable",
      "    unmeasured: every clearance check: refused at obligation 3: one transform, two readers, so there is no grid-legal layout for any of them to run on",
      "pt-core: DRAWS units with no clear slot C1#1, C2#1, C3#1, C4#1, C5#1, C7#1, C8#1, C9#1, C11#1, C12#1, C14#1, R1#1, R3#1, R5#1, R7#1",
      "    FALLBACK C1#1 (Device:C): covers wire 42 (GND), wire 151 (VCO)",
      "    FALLBACK C2#1 (Device:C): covers wire 76 (Net-(C8-Pad2)), wire 114 (Net-(U1-LPF2-OUT))",
      "    FALLBACK C3#1 (Device:C): covers wire 76 (Net-(C8-Pad2))",
      "    FALLBACK C4#1 (Device:C): covers wire 76 (Net-(C8-Pad2))",
      "    FALLBACK C5#1 (Device:C): covers wire 76 (Net-(C8-Pad2))",
      "    FALLBACK C7#1 (Device:C): covers wire 48 (INPUT)",
      "    FALLBACK C8#1 (Device:C): covers wire 72 (Net-(C8-Pad2))",
      "    FALLBACK C9#1 (Device:C): covers wire 53 (Net-(C10-Pad1))",
      "    FALLBACK C11#1 (Device:C): covers wire 76 (Net-(C8-Pad2)), wire 116 (Net-(U1-LPF2-OUT))",
      "    FALLBACK C12#1 (Device:C): covers wire 62 (Net-(C12-Pad1)), wire 72 (Net-(C8-Pad2))",
      "    FALLBACK C14#1 (Device:C): covers wire 126 (Net-(U1-OP1-OUT))",
      "    FALLBACK R1#1 (Device:R): covers wire 105 (Net-(U1-LPF2-IN)), pin R7.2",
      "    FALLBACK R3#1 (Device:R): covers wire 143 (OUTPUT), pin C10.2",
      "    FALLBACK R5#1 (Device:R): covers wire 111 (Net-(U1-LPF2-OUT))",
      "    FALLBACK R7#1 (Device:R): covers wire 72 (Net-(C8-Pad2)), wire 73 (Net-(C8-Pad2)), pin R1.1",
      unmeasuredFallbacks(["C1#1", "C2#1", "C3#1", "C4#1", "C5#1", "C7#1", "C8#1", "C9#1", "C11#1", "C12#1", "C14#1", "R1#1", "R3#1", "R5#1", "R7#1"]),
      "tp-leg-upper: DRAWS",
      "tp-leg-feedback: DRAWS",
      "tp-leg-lower-a: DRAWS",
      "tp-leg-lower-b: DRAWS",
      "tp-leg-collector: DRAWS",
      "tp-leg-emitter-bypass: DRAWS units with no clear slot JP5#1",
      "    FALLBACK JP5#1 (Jumper:Jumper_2_Open): covers wire 0 (BYPASS_CAP), wire 1 (BYPASS_CAP)",
      unmeasuredFallbacks(["JP5#1"]),
      "tp-stage: DRAWS units with no clear slot R6#1, C3#1",
      "    FALLBACK R6#1 (Device:R): covers wire 25 (EMITTER)",
      "    FALLBACK C3#1 (Device:C_Polarized): covers wire 15 (COLLECTOR)",
      unmeasuredFallbacks(["R6#1", "C3#1"]),
      "9 of 12 declared blocks draw",
      "0 of 12 are ONE measured problem from drawing with nothing unmeasured behind it (none)",
      "1 have ONE measured problem and an unmeasured residual: oc-audio",
      "1 have more than one: oc-power",
      "1 are unmeasurable, nothing looked at them: oc-sidechain",
    ])
  })

  /**
   * **THREE OF THE FOUR BUCKETS WERE EMPTY AND NOW TWO ARE, SO THIS TEST CAN FAIL IN MORE WAYS
   * THAN IT COULD YESTERDAY - which is the one improvement in this whole file.** After Task 24
   * the buckets held `tp-leg-emitter-bypass` (one problem, nothing behind it), `ob-buffer` (one
   * problem plus a residual), `tp-stage` (more than one) and `oc-audio`/`oc-sidechain`
   * (unmeasurable); boundary-node sizing (**G291**) drew three of them and left `ob-buffer` as the
   * only block with a measured problem at all.
   *
   * **THE STAR AND THE TWO 180 RULES REFILLED TWO BUCKETS** (**G296**): `oc-audio` is the
   * one-problem-plus-residual block now, and `oc-power` and `tp-leg-upper` were a
   * more-than-one bucket that had NO members since Task 24. `ob-buffer` left the table entirely by
   * drawing.
   *
   * **AND THE MORE-THAN-ONE BUCKET IS BACK TO ONE MEMBER SINCE THE JUMPER TURN WAS DECLINED**
   * (**G297**): `tp-leg-upper` draws, so `oc-power` holds that bucket alone. **Two of the four
   * buckets are populated and two are empty, which is one fewer way for this test to fail than it
   * had yesterday, and that is a loss rather than a neutral change** - it is stated here because
   * the direction of this particular figure is the opposite of the census's.
   *
   * **`oneProblemAway` IS STILL EMPTY AND THAT IS STILL A MEASUREMENT RATHER THAN AN ABSENCE OF
   * ONE.** No block in the corpus has exactly one measured problem with nothing unmeasured behind
   * it: `oc-audio` has one class but three fallback fields behind it, and `oc-power` has seven
   * classes. An empty bucket next to two populated ones is a reading; four empty buckets
   * would have been the shape in which this test stopped being able to fail.
   */
  it("separates one-problem-away from one-problem-plus-residual from unmeasurable", () => {
    expect(rows.filter(oneProblemAway).map((r) => r.block)).toEqual([])
    expect(rows.filter((r) => r.blockedBy.length === 1 && r.unmeasured.length > 0).map((r) => r.block)).toEqual(["oc-audio"])
    expect(rows.filter((r) => r.blockedBy.length > 1).map((r) => r.block)).toEqual(["oc-power"])
    expect(rows.filter((r) => !r.draws && r.blockedBy.length === 0).map((r) => r.block)).toEqual(["oc-sidechain"])
    // 9 of 12 draw, and the three that do not are named - so "a bucket is empty" cannot be read
    // as "nothing is blocked".
    expect(rows.filter((r) => r.draws).length).toBe(9)
    expect(rows.filter((r) => !r.draws).map((r) => r.block)).toEqual(["oc-power", "oc-audio", "oc-sidechain"])
    // The three non-drawing blocks are exactly the buckets' members plus nothing, which is the
    // arithmetic that says the classification is total: 1 + 1 + 1 = 3.
    expect(1 + 1 + 1).toBe(rows.filter((r) => !r.draws).length)
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
   * **AND THE "REAL PLACEMENT ORDER FALLS BACK MORE OFTEN THAN THE PROBE DOES" MEASUREMENT HAS NO
   * CARRIER AT ALL SINCE 2026-10-26, WHICH IS A LOST SUBJECT AND IS STATED AS ONE** (**G296**).
   * The claim is about the PLACER - `placeFields` walks units in placement order, so an earlier
   * unit's fields become an obstacle for a later one - and which block exhibits it is a property
   * of a geometry that keeps moving. It has now moved onto and off four different blocks:
   *
   * - Task 22: `pt-core`, seven units asked first against EIGHT fallbacks in its own order;
   * - G291's node sizing: `oc-power` at ZERO against ONE, `tp-stage`'s gap closed at four/four;
   * - G292's orientation rule: `pt-core` closed at four/four, `tp-stage` opened at ZERO/ONE;
   * - the star and the two 180 rules: EVERY block's two lists AGREE - `pt-core` 15/15,
   *   `oc-audio` 3/3, `tp-stage` 2/2, and nothing else has a fallback;
   * - **the jumper turn declined (**G297**): still every block AGREES, now on four blocks rather
   *   than three** - `pt-core` 15/15, `oc-audio` 3/3, `tp-stage` 2/2, `tp-leg-emitter-bypass` 1/1.
   *   **So the sequential dependence is unobservable on this corpus at this geometry**, on one
   *   more subject than before. It is asserted below as an agreement per block, which is a real
   *   reading; it is NOT asserted that the placer stopped being order-dependent, which would be
   *   reading an absent subject as a result.
   */
  it("counts the units with no clear field slot, and the two measurements agree on every block", () => {
    expect(row("pt-core").fallbackUnits).toEqual([
      "C1#1", "C2#1", "C3#1", "C4#1", "C5#1", "C7#1", "C8#1", "C9#1", "C11#1", "C12#1", "C14#1", "R1#1", "R3#1", "R5#1", "R7#1",
    ])
    expect(row("ob-buffer").fallbackUnits).toEqual([])
    expect(row("tp-stage").fallbackUnits).toEqual(["R6#1", "C3#1"])
    expect(row("oc-power").fallbackUnits).toEqual([])
    expect(row("oc-audio").fallbackUnits).toEqual(["R3#1", "U1#1", "U1#2"])
    // THE ONE THAT ARRIVED WITH THE JUMPER TURN BEING DECLINED (**G297**), and it is a jumper's
    // own fields: `JP5#1` is `Jumper:Jumper_2_Open` and at its untuned rotation the placer has no
    // clear slot for it.
    expect(row("tp-leg-emitter-bypass").fallbackUnits).toEqual(["JP5#1"])
    // CONTROL: a block whose every field has a clear slot has none, in both measurements. A probe
    // that reported a fallback here would be measuring itself. `tp-leg-upper` is one of these
    // again - it draws AND every field is clear, which is the stronger of the two readings.
    expect(row("tp-leg-upper").fallbackUnits).toEqual([])
    expect(row("tp-leg-upper").fallbacks).toEqual([])
    expect(row("tp-leg-collector").fallbackUnits).toEqual([])
    expect(row("tp-leg-collector").fallbacks).toEqual([])
    // THE TWO LISTS AGREE ON EVERY BLOCK THAT HAS ONE, asserted per block and by name so a change
    // in placement order fails here saying which unit moved - not as an aggregate, which would
    // survive a re-shuffle. The agreement is the reading; the absent dependence is not.
    expect(row("pt-core").fallbacks.map((f) => f.key)).toEqual([...row("pt-core").fallbackUnits])
    expect(row("oc-audio").fallbacks.map((f) => f.key)).toEqual([...row("oc-audio").fallbackUnits])
    expect(row("tp-stage").fallbacks.map((f) => f.key)).toEqual([...row("tp-stage").fallbackUnits])
    expect(row("tp-leg-emitter-bypass").fallbacks.map((f) => f.key)).toEqual([...row("tp-leg-emitter-bypass").fallbackUnits])
    expect(rows.filter((r) => r.fallbacks.length !== r.fallbackUnits.length).map((r) => r.block)).toEqual([])
    // The whole population, so the 21 in this test's own header is checkable here: 15 + 3 + 2 + 1.
    expect(rows.reduce((n, r) => n + r.fallbacks.length, 0)).toBe(21)
    expect(15 + 3 + 2 + 1).toBe(21)
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
    // field-placement refusal - named no obstacle pair; with that refusal gone its power-value
    // overlap was published, that problem DID name a pair, and its kind became `clearance`.
    //
    // **`ob-buffer` NOW DRAWS AND HAS NO KIND AT ALL, so the settled answer is carried by other
    // blocks instead of one** (**G296**) - three for a day, and **two since `tp-leg-upper` rejoined
    // them in drawing** (**G297**). `oc-power` and `oc-audio` are each refused at obligation 4 on a
    // power symbol's value, both of those problems name an obstacle pair, and both are classified
    // `clearance`. The subject changed twice; the answer did not.
    expect(row("ob-buffer").mismatchKind).toBe("")
    expect(row("ob-buffer").draws).toBe(true)
    // And there is nothing left to widen: the field-free pass finds nothing checkLayout did not
    // publish, on every block, so the pair set a widening could add to is EMPTY. The comparison is
    // over the problems the widening would ADD - `fieldFree` repeats what is already published, so
    // concatenating the two lists double-counts and measures nothing.
    for (const r of rows.filter((x) => x.mismatchKind !== "")) {
      const added = r.fieldFree.filter((p) => !r.publishedProblems.includes(p))
      expect(added, r.block).toEqual([])
      expect(clearancePairs(added).length, r.block).toBe(0)
    }
    // **THE LOOP ABOVE HAS EXACTLY THREE SUBJECTS, AND THAT IS ASSERTED RATHER THAN LEFT TO BE
    // DISCOVERED.** Nine of the twelve blocks draw, so they have no mismatch kind at all. A loop
    // over an unstated subject set is how a check comes to run over nothing and still pass.
    const kinded = rows.filter((r) => r.mismatchKind !== "")
    expect(kinded.map((r) => `${r.block} ${r.mismatchKind}`)).toEqual([
      "oc-power clearance",
      "oc-audio clearance",
      "oc-sidechain invalid-geometry",
    ])
    // CONTROL: the two kinds are different, and they are different for the stated reason - two
    // blocks' published problems name an obstacle pair and the third reaches no layout at all, so
    // it publishes nothing. A set where every answer was the same would pass the loop and say
    // nothing. The pair COUNTS are asserted per block, so a block whose problems stopped naming a
    // pair would fail here rather than silently keep its kind.
    expect(kinded.map((r) => `${r.block} ${clearancePairs(r.publishedProblems).length}`)).toEqual([
      "oc-power 7", "oc-audio 2", "oc-sidechain 0",
    ])
    expect(row("oc-sidechain").publishedProblems).toEqual([])
    expect(rows.filter((r) => r.draws).length).toBe(9)
  })

  /**
   * **THE SOUNDNESS CONTROL, ON PRODUCTION GEOMETRY, AND IT NOW RUNS ON ELEVEN OF THE TWELVE.**
   * `oc-audio` joined the set when G291's node sizing got it past obligation 1, so only
   * `oc-sidechain` still reaches no grid-legal layout at all. `checkLayout` reaches the full text
   * pass on all eleven, so the field-free pass must find nothing it did not report.
   * `maskedCensus` refuses when it does.
   *
   * **THE NON-VACUITY CONTROL HAS CHANGED SUBJECT TWICE AND IS STRONGER NOW THAN AT EITHER
   * EARLIER STATE, which is worth saying plainly because every other figure in this file went the
   * other way.** It rested on `tp-leg-emitter-bypass`'s label-label overlap and `tp-stage`'s six
   * label problems; node sizing removed both and left it standing on `ob-buffer` alone, which
   * **G291** recorded as a weakening. `ob-buffer` draws now, and the control rested on **three**
   * blocks - `oc-power` with seven problems, `oc-audio` with two and `tp-leg-upper` with two
   * (**G296**).
   *
   * **IT IS TWO BLOCKS SINCE `tp-leg-upper` DRAWS, AND THAT IS A WEAKENING, NOT A GAIN** (**G297**).
   * Nine problems over two texts carry the control where eleven over three carried it yesterday.
   * **The same change that improved the census weakened this control, and both directions are
   * stated** - a block that stops refusing takes its problems out of the non-vacuity evidence with
   * it, which is the standing cost of resting a control on the corpus's defects.
   */
  it("finds the same problem with no fields in the scene as checkLayout finds with them", () => {
    const withLayout = rows.filter((r) => r.unmeasured.every((u) => !u.startsWith("every clearance check")))
    expect(withLayout.map((r) => r.block)).toEqual([
      "ob-buffer", "oc-power", "oc-audio", "pt-core",
      "tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b", "tp-leg-collector", "tp-leg-emitter-bypass", "tp-stage",
    ])
    for (const r of withLayout) expect(r.fieldFree.filter((p) => !r.publishedProblems.includes(p)), r.block).toEqual([])
    // NOT VACUOUS: two of the eleven have problems to find, and the field-free pass finds all of
    // them. **EVERY ONE IS A POWER SYMBOL'S VALUE AND THERE ARE TWO TEXTS BEHIND NINE
    // PROBLEMS** - `oc-power`'s one text accounts for seven of them. The coordinates are a record;
    // what the control needs is that the field-free pass reproduces the published list exactly.
    expect(row("oc-power").fieldFree).toEqual([
      "value of power symbol +9V_PROTECTED 1 at (33.02, 52.07) overlaps wire 0 of oc-power (+9V_PROTECTED)",
      "value of power symbol +9V_PROTECTED 1 at (33.02, 52.07) overlaps body of C1#1",
      "value of power symbol +9V_PROTECTED 1 at (33.02, 52.07) overlaps body of C3#1",
      "value of power symbol +9V_PROTECTED 1 at (33.02, 52.07) overlaps graphic 0 of C1#1",
      "value of power symbol +9V_PROTECTED 1 at (33.02, 52.07) overlaps graphic 1 of C1#1",
      "value of power symbol +9V_PROTECTED 1 at (33.02, 52.07) overlaps graphic 0 of C3#1",
      "value of power symbol +9V_PROTECTED 1 at (33.02, 52.07) overlaps graphic 1 of C3#1",
    ])
    expect(row("oc-audio").fieldFree).toEqual([
      "value of power symbol +9V_PROTECTED 1 at (38.1, 24.13) overlaps wire 2 of oc-audio (+9V_PROTECTED)",
      "value of power symbol +9V_PROTECTED 1 at (38.1, 24.13) overlaps wire 12 of oc-audio (GND)",
    ])
    // TWO TEXTS, NINE PROBLEMS, derived rather than restated: the distinct text on the left of
    // every problem in the corpus, counted.
    const texts = new Set(withLayout.flatMap((r) => r.fieldFree.map((p) => p.slice(0, p.indexOf(" overlaps ")))))
    expect(texts.size).toBe(2)
    expect(withLayout.reduce((n, r) => n + r.fieldFree.length, 0)).toBe(9)
    expect(7 + 2).toBe(9)
    // And the ones that no longer have a problem to find are named, so "empty" reads as a result.
    // **`tp-leg-upper` IS THE NEWEST MEMBER OF THIS LIST AND ITS EMPTINESS IS THE FIX**: the two
    // problems it used to report - its `VCC` value over `wire 9` and over `pin R1.1` - are gone
    // because `JP1` is no longer turned 180, and the field-free pass finds nothing either.
    expect(row("tp-leg-upper").fieldFree).toEqual([])
    expect(row("ob-buffer").fieldFree).toEqual([])
    expect(row("tp-leg-emitter-bypass").fieldFree).toEqual([])
    expect(row("tp-stage").fieldFree).toEqual([])
    expect(withLayout.filter((r) => r.fieldFree.length > 0).map((r) => r.block)).toEqual(["oc-power", "oc-audio"])
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
