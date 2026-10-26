/**
 * **SPEC §1.8's TWO BOUNDS, PINNED: the ceiling's shape re-derived on this backend, the floor's
 * basis, and both scale constants tied to the sweep they came from.**
 *
 * Hand-written for Task 17 of the M1 schematic-authoring plan; **split out of `./remeasure.test.ts`
 * at fix round 1**, which took that file past `CLAUDE.md`'s 300-500 line ceiling.
 *
 * **THE TWO THINGS FIX ROUND 1 ADDED HERE.** Item 2: both constants are pinned to the MEASUREMENT
 * rather than to a classification that depends on them - the previous assertions left
 * `SCALE_UNSTABLE_FROM` green at 7 and at 6, so a one-step drift of the bound that rests on a
 * single refused layout went uncaught. Item 3: the ceiling's OWN size is pinned, because the
 * caveat's *"three distinct topologies"* is true of sizes 2 and 3 together and conceals that size 3
 * has one topology over half its permutations.
 *
 * **NOTHING HERE IS A THRESHOLD.** These are equalities against measured values: a figure that moves
 * in either direction fails, which is what makes them a record rather than a bar.
 */
import { beforeAll, describe, expect, it } from "bun:test"
import { SCALE_INVARIANT_UPTO, SCALE_UNSTABLE_FROM } from "../../lib/schgen/readability/baseline.ts"
import { GRID } from "../../lib/schgen/render/geometry.ts"
import { BLOCK_SIZE, blocksOutside, remeasure, type Remeasurement } from "../../tools/schgen/remeasure.ts"
import { floorEvidence, orderSweep, renderSweep, sizeCoverage, type OrderSweepRow } from "../../tools/schgen/remeasure-ceiling.ts"

let rows: readonly Remeasurement[]
let sweep: readonly OrderSweepRow[]

beforeAll(async () => {
  rows = await remeasure()
  sweep = await orderSweep()
}, 600_000)

describe("step 5: the ceiling's shape, and the floor's basis", () => {
  /**
   * The sweep, pinned: four declaration orders per block, crossings in each.
   *
   * **THREE `[gates refuse]` TAGS CAME OFF ON 2026-10-25 AND NOT ONE CROSSING COUNT MOVED, which
   * is a measurement in its own right.** Boundary-node sizing (`docs/known-gaps.md` **G291**)
   * drew `oc-audio`, `tp-leg-emitter-bypass` and `tp-stage` for the first time, so `gatesRefuse` -
   * which is a property of the UNPERMUTED block's production geometry - is now false for them.
   * **Every one of the 40 crossing counts in this table was byte-identical through that change**,
   * although wire length or occupied area moved on TEN of the twelve blocks.
   *
   * **THE ORIENTATION RULE MOVED 18 OF THE 40 AND MOVED NO BLOCK ACROSS THE INVARIANT/MOVES
   * LINE, and the contrast with the paragraph above is the finding** (`docs/known-gaps.md`
   * **G292**). Node sizing re-packed one graph; turning every non-rail two-terminal passive
   * through 90 degrees changes its node box AND its two pin ports' sides, which builds a different
   * graph, and a sweep over DECLARATION orders is exactly the quantity that notices. **G292's
   * other half - edges ordered by downstream depth - moved not one of the 40**, because
   * `downstreamDepth` seeds from a `FIRST_SEPARATE` boundary net and no parity block has one.
   * Which moved, term by term: all four on `ob-buffer`, `oc-sidechain` and `pt-core`,
   * three of four on `oc-audio` and on `tp-stage`, **none at all on `oc-power` or on any of the
   * six legs**. `oc-power`'s unmoved `1, 3, 2, 2` is load-bearing: it is the single subject
   * `SCALE_UNSTABLE_FROM` rests on, and the test below derives that constant from this row.
   *
   * **THE CLASSIFICATION COLUMN IS THE CLAIM AND IT IS UNMOVED ON ALL TWELVE** - six INVARIANT,
   * six MOVES, same blocks - which is what makes the ceiling below unmoved rather than
   * coincidentally re-derived at the same number. **The counts themselves are a record**: nothing
   * here is a crossing budget, and the two that fell (`pt-core` 78 to 71, `tp-stage` 7 to 6) are
   * reported, not claimed as a goal.
   *
   * Each row's FIRST count is declaration order, and the test immediately below ties it per block
   * to `tools/schgen/remeasure.ts`'s own figure for the unsuffixed block - so no row here can
   * drift from the per-block table without one of the two going red.
   */
  it("is these twelve sweep rows", () => {
    expect(renderSweep(sweep)).toEqual([
      "ob-buffer parts=9 placements=11 orders=4 crossings 6, 5, 5, 6 MOVES [gates refuse]",
      "oc-power parts=8 placements=8 orders=4 crossings 1, 3, 2, 2 MOVES",
      "oc-audio parts=12 placements=14 orders=4 crossings 5, 6, 6, 4 MOVES",
      "oc-sidechain parts=17 placements=19 orders=4 crossings 8, 10, 5, 13 MOVES [gates refuse]",
      "pt-core parts=24 placements=24 orders=4 crossings 71, 61, 42, 79 MOVES",
      "tp-leg-upper parts=3 placements=3 orders=3 crossings 0, 0, 0 INVARIANT",
      "tp-leg-feedback parts=3 placements=3 orders=3 crossings 0, 0, 0 INVARIANT",
      "tp-leg-lower-a parts=3 placements=3 orders=3 crossings 0, 0, 0 INVARIANT",
      "tp-leg-lower-b parts=3 placements=3 orders=3 crossings 0, 0, 0 INVARIANT",
      "tp-leg-collector parts=2 placements=2 orders=2 crossings 0, 0 INVARIANT",
      "tp-leg-emitter-bypass parts=2 placements=2 orders=2 crossings 0, 0 INVARIANT",
      "tp-stage parts=16 placements=16 orders=4 crossings 6, 6, 8, 6 MOVES",
    ])
    // The classification column, asserted as a column so it cannot move behind the counts.
    expect(sweep.map((r) => (r.invariant ? "INVARIANT" : "MOVES"))).toEqual([
      "MOVES", "MOVES", "MOVES", "MOVES", "MOVES",
      "INVARIANT", "INVARIANT", "INVARIANT", "INVARIANT", "INVARIANT", "INVARIANT",
      "MOVES",
    ])
  })

  /**
   * **THE CONTROL FOR THE PER-ORDER BLOCK ID.** Each order is laid out under `<id>~o<n>` because
   * `layoutBlocks` refuses two inputs for one id. Order 0 IS declaration order, so its crossing
   * count must equal the one `remeasure` reports for the unsuffixed block - and if the ELK root id
   * ever influenced a layout, this is what would say so.
   */
  it("gives order 0 the same crossing count as the unsuffixed block, so the id suffix is inert", () => {
    for (const row of sweep) {
      const main = rows.find((r) => r.block === row.block)
      if (main === undefined) throw new Error(`the sweep holds ${row.block} and the per-block table does not`)
      expect(row.results[0]?.crossings, `${row.block} order 0`).toBe(main.geometry.measures.crossings)
    }
  })

  /** Ruling R40: per size, with the subject count and how many are geometry the gates refuse. */
  it("covers 2 of the spike's 7 sweep sizes and says the other 5 are unmeasured", () => {
    expect(sizeCoverage(sweep).map((s) => `${s.placements}: ${s.unmeasured ? "unmeasured" : `${s.subjects.length} subject(s), ${s.refusedSubjects} refused`}`)).toEqual([
      "3: 4 subject(s), 0 refused",
      "4: unmeasured",
      "8: 1 subject(s), 0 refused",
      "9: unmeasured",
      "13: unmeasured",
      "17: unmeasured",
      "28: unmeasured",
    ])
  })

  /**
   * **THE CEILING's OWN SIZE, NOT THE AGGREGATE - fix round 1, item 3.** The caveat used to say
   * *"three distinct topologies"*, which is true of sizes 2 and 3 together and concealed the
   * ceiling's own size. Both figures are asserted here so the disclosure cannot drift from the
   * measurement.
   *
   * **THE THIN SPOT THIS TEST EXISTED TO EXPOSE IS GONE, AND THE CAUSE IS WORTH THE WHOLE
   * COMMENT.** Until 2026-10-25 the four subjects at the ceiling were ONE topology four times,
   * *"because the four bias legs draw byte-identically (G185)"*. **They do not any more.**
   * Boundary-node sizing (`docs/known-gaps.md` **G291**) makes a boundary node as big as the text
   * drawn at it, and **the four legs differ in exactly that text**:
   *
   * | leg | boundary nets | distinct geometry |
   * | --- | --- | --- |
   * | `tp-leg-upper` | `VCC` power symbol + `BASE` label | its own |
   * | `tp-leg-feedback` | `COLLECTOR` label + `BASE` label | its own |
   * | `tp-leg-lower-a` | `GND` power symbol + `BASE` label | shared with `-lower-b` |
   * | `tp-leg-lower-b` | `GND` power symbol + `BASE` label | shared with `-lower-a` |
   *
   * A `COLLECTOR` label reserves `(9 + 2) * GRID` plus its references where `BASE` reserves
   * `(4 + 2) * GRID` plus references, so ELK packs `-feedback` differently from the other three;
   * `VCC` and `GND` are both three characters but their SYMBOL bodies differ, so `-upper` differs
   * from the two `-lower` legs. **Only the two legs with identical boundary nets stay congruent**,
   * which is three distinct topologies over four subjects where there was one.
   *
   * **THAT IS BETTER SUPPORT FOR THE CEILING AND NOT WORSE, and it is asserted as a count rather
   * than argued**: the number of distinct topologies at the ceiling's own size is pinned, so it
   * cannot drift back to one without this test saying so.
   */
  it("supports the CEILING's size with three topologies over 3 of its 6 permutations", () => {
    const atCeiling = sweep.filter((r) => r.placements === SCALE_INVARIANT_UPTO)
    expect(atCeiling.map((r) => r.block)).toEqual(["tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b"])
    // The crossing counts are 0 in every order on all four, so the SWEEP cannot separate them -
    // which is why the geometry is compared below rather than the sweep's own output.
    const shapes = new Set(atCeiling.map((r) => r.results.map((x) => x.crossings).join(",")))
    expect(shapes.size, "all four sweep to 0 crossings in every order").toBe(1)
    // THREE distinct geometries, and the pair that coincides is named: the comparison is over the
    // measures themselves rather than over the printed row, which differs by spike row anyway.
    const measureOf = (block: string): string => {
      const r = rows.find((x) => x.block === block)
      if (r === undefined) throw new Error(`the per-block table holds no ${block}`)
      return JSON.stringify({ ...r.geometry.measures, aspect: r.geometry.aspect, placements: r.geometry.placements })
    }
    const legMeasures = new Set(atCeiling.map((r) => measureOf(r.block)))
    expect(legMeasures.size, "three distinct topologies at the ceiling's own size").toBe(3)
    // The coincidence is the two legs whose boundary nets are the SAME pair, which is the half of
    // G185's congruence that survives node sizing.
    expect(measureOf("tp-leg-lower-a")).toBe(measureOf("tp-leg-lower-b"))
    expect(measureOf("tp-leg-upper")).not.toBe(measureOf("tp-leg-lower-a"))
    expect(measureOf("tp-leg-feedback")).not.toBe(measureOf("tp-leg-lower-a"))
    expect(measureOf("tp-leg-feedback")).not.toBe(measureOf("tp-leg-upper"))
    // 3 of 6 permutations: 3 placements have 3! = 6 orderings and the sweep laid out 3 distinct ones.
    const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1))
    for (const row of atCeiling) {
      expect(row.distinctOrders, `${row.block} distinct orders`).toBe(3)
      expect(factorial(row.placements), `${row.block} possible orders`).toBe(6)
    }
    // Size 2 is swept EXHAUSTIVELY and is still not the ceiling, which is the half an aggregate
    // caveat hides whichever way the topology count goes.
    const atTwo = sweep.filter((r) => r.placements === 2)
    expect(atTwo.map((r) => r.block)).toEqual(["tp-leg-collector", "tp-leg-emitter-bypass"])
    for (const row of atTwo) expect(row.distinctOrders, `${row.block}`).toBe(factorial(row.placements))
  })

  /**
   * **FIVE DISTINCT TOPOLOGIES, NOT THREE, SINCE 2026-10-25 - and the old figure is kept here
   * because it is the one the published caveat quoted.** It read *"three distinct topologies,
   * because four of the six are congruent"*; only `tp-leg-lower-a` and `tp-leg-lower-b` are
   * congruent now, for the reason the test above sets out, so the six invariant subjects are five
   * distinct geometries. `docs/known-gaps.md` **G291**.
   */
  it("rests its invariant side on FIVE distinct topologies, because only two of the six are congruent", () => {
    const invariant = sweep.filter((r) => r.invariant)
    expect(invariant.map((r) => r.block)).toEqual([
      "tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b",
      "tp-leg-collector", "tp-leg-emitter-bypass",
    ])
    expect(invariant.length).toBe(6)
    expect(new Set(invariant.map((r) => r.placements))).toEqual(new Set([2, 3]))
    // The distinct count, asserted rather than described, so the caveat cannot drift from it.
    const geometries = new Set(
      invariant.map((r) => {
        const row = rows.find((x) => x.block === r.block)
        if (row === undefined) throw new Error(`the per-block table holds no ${r.block}`)
        return JSON.stringify({ ...row.geometry.measures, aspect: row.geometry.aspect, placements: row.geometry.placements })
      }),
    )
    expect(geometries.size).toBe(5)
  })

  /**
   * **BOTH CONSTANTS ARE PINNED TO THE SWEEP THEY CAME FROM, NOT TO A LITERAL - fix round 1, item
   * 2.** The review drove the neighbourhood and found `SCALE_UNSTABLE_FROM` GREEN at 7 and at 6:
   * the previous assertions constrained `UPTO` to {3,4} and `FROM` to {6,7,8}, because they asserted
   * CLASSIFICATIONS that depend on the constants rather than the constants themselves. **A full
   * revert to 9/13 was caught and a one-step drift of the upper bound was not - and the upper bound
   * is the one `baseline-model.ts` says rests on a single refused layout.**
   *
   * These two assertions derive each bound from the measurement, so they fail in BOTH directions
   * for BOTH constants, and they also fail if the sweep itself moves - which is the stronger
   * property: a constant and the measurement it is named after cannot drift apart silently.
   */
  it("pins both scale constants to the sweep they were measured from", () => {
    const invariant = sweep.filter((r) => r.invariant).map((r) => r.placements)
    const moving = sweep.filter((r) => !r.invariant).map((r) => r.placements)
    expect(invariant.length, "no block measured invariant, so the lower bound has no subject").toBeGreaterThan(0)
    expect(moving.length, "no block measured moving, so the upper bound has no subject").toBeGreaterThan(0)
    expect(
      Math.max(...invariant),
      "SCALE_INVARIANT_UPTO must be the LARGEST block size whose crossing count was measured " +
        "invariant over four declaration orders. The sweep says that size is " +
        `${Math.max(...invariant)}; the constant says ${SCALE_INVARIANT_UPTO}. One of the two moved.`,
    ).toBe(SCALE_INVARIANT_UPTO)
    expect(
      Math.min(...moving),
      "SCALE_UNSTABLE_FROM must be the SMALLEST block size whose crossing count was measured MOVING " +
        `under reordering - oc-power at 8 placements, 1, 3, 2, 2. The sweep says ${Math.min(...moving)}; ` +
        `the constant says ${SCALE_UNSTABLE_FROM}. One of the two moved, and this bound rests on a ` +
        "single subject whose layout the gates refuse.",
    ).toBe(SCALE_UNSTABLE_FROM)
  })

  it("names the ceiling 3 and the floor unmeasured, and reports 6 declared blocks outside it", () => {
    expect(BLOCK_SIZE.ceiling).toBe(3)
    expect(BLOCK_SIZE.floor).toBe("unmeasured")
    expect(BLOCK_SIZE.costPaid).toContain("THE CEILING's COST")
    expect(BLOCK_SIZE.evidence).toContain("THE CAVEAT TRAVELS")
    expect(blocksOutside(rows).map((s) => s.split(" ")[0])).toEqual([
      "ob-buffer", "oc-power", "oc-audio", "oc-sidechain", "pt-core", "tp-stage",
    ])
  })

  /**
   * **THE FLOOR's STATED BASIS IS REFUTED AND NOTHING HAS REPLACED IT - this test used to be
   * `measures all 38 boundary nodes at zero size, which is why the floor stays unmeasured`.**
   *
   * That was the argument: a boundary node of zero size has no area for a floor to be a bound on.
   * Since 2026-10-25 **every one of the 38 boundary nodes has a size** (`docs/known-gaps.md`
   * **G291**), so the premise is gone. **`BLOCK_SIZE.floor` is still `"unmeasured"`, and this test
   * deliberately does NOT re-derive it**: the floor is a spec §1.8 claim, and an agent that
   * measured a floor here and then checked the drawing against it would be authoring the criterion
   * it is judged by (`CLAUDE.md`). What is pinned is the MEASUREMENT, and the refutation with it.
   *
   * **AND THE 38 SIZES ARE A CLOSED FORM, WHICH IS WHY THEY ARE CHECKED AND NOT LISTED.** Each is
   * the box the thing drawn at it occupies, unioned over both `valueAlong` settings:
   *   - a RAIL (power symbol) is `textWidth(net)` wide and `glyph + GRID/2 + textWidth(net)` tall,
   *     which for a 3-character net is `3810 x 6985` - the ground glyph being 2540 tall;
   *   - a LABEL is `labelExtent(net, refs)` along its side and `2 * GRID` = 2540 across it.
   * Both forms are asserted below, so a size that stopped following its own geometry fails here.
   */
  it("measures all 38 boundary nodes at a NON-zero size, which refutes the floor's stated basis", () => {
    const floor = floorEvidence()
    expect(floor.boundaryNodes).toBe(38)
    expect(floor.zeroSized, "a zero-size boundary node is the defect G291 names").toBe(0)
    expect(floor.nonZeroSized.length).toBe(38)
    // The closed form, both arms. A rail is as tall as its glyph plus its value; a label is two
    // grid steps across whichever side it is on.
    const sizes = floor.nonZeroSized.map((s) => {
      const m = /is (\d+) x (\d+)$/.exec(s)
      if (m === null) throw new Error(`floorEvidence printed a size this test cannot read: ${s}`)
      return { what: s, w: Number(m[1]), h: Number(m[2]) }
    })
    const rails = sizes.filter((s) => s.h !== 2 * GRID)
    const labels = sizes.filter((s) => s.h === 2 * GRID)
    expect(rails.length, "the corpus has rails, or the rail arm below is vacuous").toBeGreaterThan(0)
    expect(labels.length, "the corpus has labels, or the label arm below is vacuous").toBeGreaterThan(0)
    // A rail: the value text's width across, and the glyph plus a half step plus that width along.
    // Every rail symbol in this corpus has a 2540 um glyph, so the height is w + 2540 + GRID/2.
    for (const r of rails) expect(r.h, r.what).toBe(r.w + 2540 + GRID / 2)
    // A label: a whole number of grid steps along its side, at least (1 + 2) * GRID of outline.
    for (const l of labels) {
      expect(l.w % (GRID / 2), l.what).toBe(0)
      expect(l.w, l.what).toBeGreaterThanOrEqual(3 * GRID)
    }
    // The port-glyph SHARE is a count ratio over graph cells and no size enters it, so it is the
    // control that says this test is reading sizes and not re-reading the census.
    expect(floor.worstShareBlock).toBe("tp-leg-emitter-bypass")
    expect((100 * floor.worstShare).toFixed(1)).toBe("66.7")
  })
})

