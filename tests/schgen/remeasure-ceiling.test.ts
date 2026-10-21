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
import { BLOCK_SIZE, blocksOutside, remeasure, renderRow, type Remeasurement } from "../../tools/schgen/remeasure.ts"
import { floorEvidence, orderSweep, renderSweep, sizeCoverage, type OrderSweepRow } from "../../tools/schgen/remeasure-ceiling.ts"

let rows: readonly Remeasurement[]
let sweep: readonly OrderSweepRow[]

beforeAll(async () => {
  rows = await remeasure()
  sweep = await orderSweep()
}, 600_000)

describe("step 5: the ceiling's shape, and the floor's basis", () => {
  /** The sweep, pinned: four declaration orders per block, crossings in each. */
  it("is these twelve sweep rows", () => {
    expect(renderSweep(sweep)).toEqual([
      "ob-buffer parts=9 placements=11 orders=4 crossings 7, 7, 4, 8 MOVES [gates refuse]",
      "oc-power parts=8 placements=8 orders=4 crossings 1, 3, 2, 2 MOVES [gates refuse]",
      "oc-audio parts=12 placements=14 orders=4 crossings 5, 12, 7, 6 MOVES [gates refuse]",
      "oc-sidechain parts=17 placements=19 orders=4 crossings 7, 14, 9, 19 MOVES [gates refuse]",
      "pt-core parts=24 placements=24 orders=4 crossings 78, 53, 39, 65 MOVES [gates refuse]",
      "tp-leg-upper parts=3 placements=3 orders=3 crossings 0, 0, 0 INVARIANT",
      "tp-leg-feedback parts=3 placements=3 orders=3 crossings 0, 0, 0 INVARIANT",
      "tp-leg-lower-a parts=3 placements=3 orders=3 crossings 0, 0, 0 INVARIANT",
      "tp-leg-lower-b parts=3 placements=3 orders=3 crossings 0, 0, 0 INVARIANT",
      "tp-leg-collector parts=2 placements=2 orders=2 crossings 0, 0 INVARIANT",
      "tp-leg-emitter-bypass parts=2 placements=2 orders=2 crossings 0, 0 INVARIANT [gates refuse]",
      "tp-stage parts=16 placements=16 orders=4 crossings 7, 4, 5, 6 MOVES [gates refuse]",
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
      "8: 1 subject(s), 1 refused",
      "9: unmeasured",
      "13: unmeasured",
      "17: unmeasured",
      "28: unmeasured",
    ])
  })

  /**
   * **THE CEILING's OWN SIZE, NOT THE AGGREGATE - fix round 1, item 3.** The caveat used to say
   * *"three distinct topologies"*, which is true of sizes 2 and 3 together and conceals that the
   * ceiling's own size has ONE topology swept over half its permutations. Both figures are
   * asserted here so the disclosure cannot drift from the measurement.
   */
  it("supports the CEILING's size with one topology over 3 of its 6 permutations", () => {
    const atCeiling = sweep.filter((r) => r.placements === SCALE_INVARIANT_UPTO)
    expect(atCeiling.map((r) => r.block)).toEqual(["tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b"])
    // ONE topology: the four are byte-identical (G185), which these four measure rows show.
    const shapes = new Set(atCeiling.map((r) => r.results.map((x) => x.crossings).join(",")))
    expect(shapes.size, "the four subjects at the ceiling are one topology four times").toBe(1)
    // The four MEASURE identically. The rendered rows differ only in which spike row each is paired
    // with, so the comparison is over the measures themselves rather than over the printed line.
    const legMeasures = new Set(
      rows
        .filter((r) => atCeiling.some((a) => a.block === r.block))
        .map((r) => JSON.stringify({ ...r.geometry.measures, aspect: r.geometry.aspect, placements: r.geometry.placements })),
    )
    expect(legMeasures.size, "and they measure identically, which is what makes them one topology").toBe(1)
    // 3 of 6 permutations: 3 placements have 3! = 6 orderings and the sweep laid out 3 distinct ones.
    const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1))
    for (const row of atCeiling) {
      expect(row.distinctOrders, `${row.block} distinct orders`).toBe(3)
      expect(factorial(row.placements), `${row.block} possible orders`).toBe(6)
    }
    // Size 2 is the better-supported size - two topologies, swept exhaustively - and is NOT the
    // ceiling, which is the half an aggregate caveat hides.
    const atTwo = sweep.filter((r) => r.placements === 2)
    expect(atTwo.map((r) => r.block)).toEqual(["tp-leg-collector", "tp-leg-emitter-bypass"])
    for (const row of atTwo) expect(row.distinctOrders, `${row.block}`).toBe(factorial(row.placements))
  })

  it("rests its invariant side on THREE distinct topologies, because four of the six are congruent", () => {
    const invariant = sweep.filter((r) => r.invariant)
    expect(invariant.map((r) => r.block)).toEqual([
      "tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b",
      "tp-leg-collector", "tp-leg-emitter-bypass",
    ])
    expect(invariant.length).toBe(6)
    // The four legs are one topology drawn four times (G185: byte-identical), so the distinct
    // subjects are {a bias leg, tp-leg-collector, tp-leg-emitter-bypass}.
    expect(new Set(invariant.map((r) => r.placements))).toEqual(new Set([2, 3]))
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

  /** The floor's basis: a boundary node of zero size has no area for a floor to be a bound on. */
  it("measures all 38 boundary nodes at zero size, which is why the floor stays unmeasured", () => {
    const floor = floorEvidence()
    expect(floor.boundaryNodes).toBe(38)
    expect(floor.zeroSized).toBe(38)
    expect(floor.nonZeroSized).toEqual([])
    expect(floor.worstShareBlock).toBe("tp-leg-emitter-bypass")
    expect((100 * floor.worstShare).toFixed(1)).toBe("66.7")
  })
})

