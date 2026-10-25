/**
 * **TASK 17's RE-MEASUREMENT, PINNED - every figure `docs/schematic/m1-remeasurement.md` and
 * `docs/known-gaps.md` quote, recomputed on every run.**
 *
 * Hand-written for Task 17 of the M1 schematic-authoring plan.
 *
 * **WHY A TEST AND NOT A SCRATCH SCRIPT.** `docs/known-gaps.md` **G209**'s own lesson: Task 15's
 * first round computed its numbers in a scratch script and *"were the only number in these entries
 * nobody else could reproduce"*. Every number this task publishes is asserted here, so a change in
 * the generator that moves one turns this red naming it rather than leaving a document quietly
 * wrong.
 *
 * **NOTHING HERE IS AN ACCEPTANCE THRESHOLD.** Spec §3.3 gives the four measures none and revision
 * 4 adds that absent a dominance rule they are descriptive. These are EQUALITIES against measured
 * values: a figure that moves in either direction fails, which is what makes them a record rather
 * than a bar. A reader must not read `crossings 0` passing here as a crossing budget.
 */
import { beforeAll, describe, expect, it } from "bun:test"
import { afterAll } from "bun:test"
import { cleanUpTempScratch } from "../support/temp-scratch.ts"
import { drawnBlocks as composedLegs, miniSheet, type ComposedSubject, type DrawnBlocks } from "./__fixtures__/composed.ts"
import { remeasure, renderRow, type Remeasurement } from "../../tools/schgen/remeasure.ts"
import { classOf, coverageCensus, gateOf, leverageOf, renderCoverage, type BlockCoverage } from "../../tools/schgen/remeasure-coverage.ts"
import { comparabilityOf, SPIKE_BLOCKS, SPIKE_CROSSING_RATIO, spikeRowFor } from "../../tools/schgen/remeasure-spikes.ts"
import { integratedExperiment, type IntegratedExperiment } from "../../tools/schgen/remeasure-composed.ts"
import { disjointness, legShapes, skinIdWidth, type Disjointness, type LegShape } from "../../tools/schgen/remeasure-criteria.ts"
import { nonMemberContainments } from "../../lib/schgen/render/compose.ts"
import { layoutSheet } from "../../lib/schgen/render/sheets.ts"
import { packSheet } from "../../tools/schgen/elk/sheet-layout.ts"
import { FLAG_LIB_ID } from "../../tools/schgen/generate.ts"

afterAll(cleanUpTempScratch)

let rows: readonly Remeasurement[]
let experiment: IntegratedExperiment
let legs: readonly LegShape[]
let groups: Disjointness
let probe: DrawnBlocks
let signal: ComposedSubject
let coverage: readonly BlockCoverage[]

beforeAll(async () => {
  rows = await remeasure()
  experiment = await integratedExperiment()
  legs = await legShapes()
  groups = await disjointness()
  probe = await composedLegs("transistor-preamp")
  signal = await miniSheet("signal")
  coverage = await coverageCensus()
}, 600_000)

describe("step 1 and step 3: which blocks draw, and the four measures of each", () => {
  /**
   * **TEN OF THE TWELVE DECLARED BLOCKS DRAW SINCE 2026-10-25, AND THE TWO MOVES BEHIND THAT ARE
   * DIFFERENT IN KIND.** Task 24 took it from five to seven: `oc-power` and `pt-core` joined the
   * four congruent bias legs and `tp-leg-collector` when `render/field-placement.ts` stopped
   * refusing a unit with no clear slot and started placing it at the least-covered one, so **both
   * of those two draw with text drawn over something** - one fallback in `oc-power`, eight in
   * `pt-core`.
   *
   * **BOUNDARY-NODE SIZING TOOK IT FROM SEVEN TO TEN AND DID THE OPPOSITE** (`docs/known-gaps.md`
   * **G291**). `oc-audio`, `tp-leg-emitter-bypass` and `tp-stage` draw because ELK is now told how
   * much room a global label and a power symbol occupy, so it leaves it: **nothing was relaxed and
   * no text was hidden.** The three were refused by a snap collapse, a label-over-label overlap
   * and six label problems respectively - every one of them a consequence of packing the circuit
   * around dimensionless points.
   *
   * **THE TWO THAT STILL REFUSE ARE REFUSED FOR REASONS NODE SIZING DOES NOT TOUCH**: `ob-buffer`
   * at `checkLayout` on a power symbol's value over another power symbol's value, and
   * `oc-sidechain` at obligation 3, where `elkjs` returns a port coordinate that disagrees with
   * the pin end recomputed from the placement.
   */
  it("is 10 accepted and 2 refused, and names the gate that refused each", () => {
    expect(rows.map((r) => `${r.block} ${r.geometry.stage}${r.geometry.refusal === null ? "" : ` ${gateOf(r.geometry.refusal)}`}`)).toEqual([
      "ob-buffer backend-output obligation 4: checkLayout",
      "oc-power accepted",
      "oc-audio accepted",
      "oc-sidechain backend-output obligation 3: one transform, two readers",
      "pt-core accepted",
      "tp-leg-upper accepted",
      "tp-leg-feedback accepted",
      "tp-leg-lower-a accepted",
      "tp-leg-lower-b accepted",
      "tp-leg-collector accepted",
      "tp-leg-emitter-bypass accepted",
      "tp-stage accepted",
    ])
    expect(rows.filter((r) => r.geometry.stage === "accepted").length).toBe(10)
  })

  it("draws 0 of 12 by TEMPLATE, which is the other axis and has not moved", () => {
    // Ruling R41: `realised` means a template drew the block, and that is still 0 of 12.
    expect(rows.every((r) => r.drawnBy === "elk")).toBe(true)
  })

  /**
   * The twelve rows `docs/schematic/m1-remeasurement.md` prints, to the digit.
   *
   * **WHAT MOVED ON 2026-10-25 AND WHAT DID NOT, TERM BY TERM** (`docs/known-gaps.md` **G291**).
   * `parts`, `units`, `placements`, `graphCells`, `ports`, `share` and `scale` are counts of what
   * the circuit declares and are **identical on all twelve rows**; `stage` moved on the three
   * blocks that started drawing. Of the five geometric figures:
   *
   * - `bends`, `perEdge` and `crossings` moved on **one row** - `oc-audio`, 30/0.75 to 29/0.72,
   *   and that one moved because its STAGE moved from `backend-output` to `accepted` and the
   *   accepted geometry is the snapped one. No block's crossing count moved at all;
   * - at least one of `len`, `area` and `aspect` moved on **ten of the twelve**. `pt-core` and
   *   `tp-leg-collector` came out byte-identical in every figure, and `ob-buffer` moved in `len`
   *   alone - 436.80 to 442.30 grid steps with its area and aspect unchanged to the digit.
   *
   * So the change moved where the wires go and did not move a single topological count, which is
   * the signature of a layout that was re-packed rather than re-routed.
   */
  it("is these twelve rows of figures", () => {
    expect(rows.map(renderRow)).toEqual([
      "ob-buffer parts=9 units=11 placements=11 graphCells=14 ports=3 share=21.4% stage=backend-output bends=28 perEdge=0.97 crossings=7 len=442.30 area=3233.45 aspect=1.24 scale=about-a-serialization | no spike row",
      "oc-power parts=8 units=8 placements=8 graphCells=11 ports=3 share=27.3% stage=accepted bends=5 perEdge=0.19 crossings=1 len=221.00 area=1856.00 aspect=2.21 scale=about-a-serialization | spike oc-power moved",
      "oc-audio parts=12 units=14 placements=14 graphCells=18 ports=4 share=22.2% stage=accepted bends=29 perEdge=0.72 crossings=5 len=641.00 area=4708.00 aspect=2.43 scale=about-a-serialization | spike oc-audio moved",
      "oc-sidechain parts=17 units=19 placements=19 graphCells=24 ports=5 share=20.8% stage=backend-output bends=27 perEdge=0.55 crossings=7 len=1021.12 area=10112.00 aspect=2.16 scale=about-a-serialization | spike oc-sidechain moved",
      "pt-core parts=24 units=24 placements=24 graphCells=26 ports=2 share=7.7% stage=accepted bends=83 perEdge=1.15 crossings=78 len=2472.00 area=12648.00 aspect=1.22 scale=about-a-serialization | no spike row",
      "tp-leg-upper parts=3 units=3 placements=3 graphCells=5 ports=2 share=40.0% stage=accepted bends=8 perEdge=1.33 crossings=0 len=55.00 area=696.00 aspect=1.21 scale=about-the-circuit | spike leg-upper moved",
      "tp-leg-feedback parts=3 units=3 placements=3 graphCells=5 ports=2 share=40.0% stage=accepted bends=8 perEdge=1.33 crossings=0 len=77.00 area=1100.00 aspect=2.75 scale=about-the-circuit | spike leg-feedback moved",
      "tp-leg-lower-a parts=3 units=3 placements=3 graphCells=5 ports=2 share=40.0% stage=accepted bends=8 perEdge=1.33 crossings=0 len=67.00 area=900.00 aspect=2.25 scale=about-the-circuit | spike leg-lowerA moved",
      "tp-leg-lower-b parts=3 units=3 placements=3 graphCells=5 ports=2 share=40.0% stage=accepted bends=8 perEdge=1.33 crossings=0 len=67.00 area=900.00 aspect=2.25 scale=about-the-circuit | spike leg-lowerB moved",
      "tp-leg-collector parts=2 units=2 placements=2 graphCells=4 ports=2 share=50.0% stage=accepted bends=6 perEdge=1.20 crossings=0 len=32.00 area=221.00 aspect=0.76 scale=about-the-circuit | spike leg-collector moved",
      "tp-leg-emitter-bypass parts=2 units=2 placements=2 graphCells=6 ports=4 share=66.7% stage=accepted bends=6 perEdge=1.00 crossings=0 len=50.00 area=195.00 aspect=0.87 scale=about-the-circuit | no spike row",
      "tp-stage parts=16 units=16 placements=16 graphCells=23 ports=7 share=30.4% stage=accepted bends=24 perEdge=0.62 crossings=7 len=466.00 area=3692.00 aspect=1.37 scale=about-a-serialization | no spike row",
    ])
  })

  /**
   * **THE FIVE ACCEPTED ROWS REPRODUCE G216's TABLE, AND WHAT THAT ESTABLISHES IS NARROW.** Both
   * sides run over the geometry `adaptElkLayoutReported` returns, which is already canonicalised -
   * G216's own correction to its round-1 independence claim. **Two implementations agreeing is a
   * check on the arithmetic and NOT a cross-check of the geometry.**
   *
   * **IT IS G216's FIVE BY NAME SINCE TASK 24, NOT "whatever is accepted today".** Ten blocks
   * are accepted now, and summing all of them would compare a 10-block total against a 5-block
   * table - two different quantities, which is exactly the comparison **G220** names as the
   * failure. The five are named so that the agreement stays an agreement.
   *
   * **G216's 14 PLACEMENTS STAND AND ITS 224 GRID STEPS DO NOT - 298 since 2026-10-25** (**G291**).
   * The wires that reach the labels are longer because the labels now have room reserved for them,
   * and no part moved between blocks. 298 is cross-checked rather than copied:
   * `tests/schgen/readability/measures.test.ts` takes it over the same five blocks from the
   * canonical topology, and `tests/schgen/render/compose.test.ts` takes it from the REALISED
   * layouts in micrometres through `shapeMeasures` and gets 378 460 = 298 x 1270.
   */
  it("reproduces G216's five accepted rows, which is an arithmetic agreement and not a second reading", () => {
    const G216_ROWS = ["tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b", "tp-leg-collector"]
    const accepted = rows.filter((r) => G216_ROWS.includes(r.block))
    expect(accepted.length, "G216's five rows are all present and all still accepted").toBe(5)
    expect(accepted.every((r) => r.geometry.stage === "accepted")).toBe(true)
    expect(accepted.reduce((n, r) => n + r.geometry.placements, 0)).toBe(14)
    expect(accepted.reduce((n, r) => n + r.geometry.measures.wireLength, 0)).toBe(298)
  })
})

describe("step 2: a block is compared against ITS spike row or against none", () => {
  /**
   * **THE PAIRING, PINNED - and this is the assertion Step 10's perturbation turns red.** It prints
   * the block and the spike row beside it, so a comparison against the wrong row fails NAMING BOTH.
   */
  it("pairs each block with its own spike row, or with none", () => {
    expect(rows.map((r) => `${r.block} <- ${r.spike === null ? "no spike row" : r.spike.row.spikeBlock}`)).toEqual([
      "ob-buffer <- no spike row",
      "oc-power <- oc-power",
      "oc-audio <- oc-audio",
      "oc-sidechain <- oc-sidechain",
      "pt-core <- no spike row",
      "tp-leg-upper <- leg-upper",
      "tp-leg-feedback <- leg-feedback",
      "tp-leg-lower-a <- leg-lowerA",
      "tp-leg-lower-b <- leg-lowerB",
      "tp-leg-collector <- leg-collector",
      "tp-leg-emitter-bypass <- no spike row",
      "tp-stage <- no spike row",
    ])
  })

  it("leaves a block with NO spike row uncompared, rather than comparing it to a nearby one", () => {
    const orphans = rows.filter((r) => r.spike === null).map((r) => r.block)
    expect(orphans).toEqual(["ob-buffer", "pt-core", "tp-leg-emitter-bypass", "tp-stage"])
    // The part counts of the four orphans are 9, 24, 2 and 16, and the spike's table holds rows at
    // 9, 2 and 17 parts - so a "nearest size" rule would have found a partner for three of them.
    expect(SPIKE_BLOCKS.some((r) => r.parts === 9)).toBe(true)
    expect(SPIKE_BLOCKS.some((r) => r.parts === 2)).toBe(true)
    for (const r of rows) if (r.spike !== null) expect(r.spike.row.block, r.block).toBe(r.block)
  })

  it("reports ten of the spike's eighteen rows as having no block here at all", () => {
    const orphanedSpikeRows = SPIKE_BLOCKS.filter((r) => r.block === null).map((r) => r.spikeBlock)
    expect(orphanedSpikeRows).toEqual([
      "standin-low-cut", "standin-mid", "standin-hi-boost", "standin-low-boost", "standin-hi-cut",
      "pultec-low-boost", "pultec-low-cut", "pultec-hi-cut", "pultec-hi-boost", "pultec-mid",
    ])
    expect(spikeRowFor("pultec-mid")).toBeNull()
  })

  /** Per figure: crossings and aspect are the same quantity, the other three are not (**G220**). */
  it("calls three of the five figures NOT-COMPARABLE, per measure and with a reason", () => {
    const first = rows.find((r) => r.block === "oc-power")?.spike
    expect(first).toBeDefined()
    expect(first?.figures.map((f) => `${f.measure} ${f.verdict}`)).toEqual([
      "aspect moved",
      "bends not-comparable",
      "bendsPerEdge not-comparable",
      "crossings moved",
      "wireLength not-comparable",
    ])
    expect(comparabilityOf("crossings")).toBe("same-quantity")
    expect(comparabilityOf("bendsPerEdge")).toBe("not-comparable")
    expect(() => comparabilityOf("readability")).toThrow(/nothing states whether "readability" is the same quantity/)
  })

  it("reproduces the spike's crossings on the five legs and moves them on the three oc blocks", () => {
    expect(rows.flatMap((r) => (r.spike === null ? [] : [`${r.block} ${r.spike.verdict}`]))).toEqual([
      "oc-power moved",
      "oc-audio moved",
      "oc-sidechain moved",
      "tp-leg-upper moved",
      "tp-leg-feedback moved",
      "tp-leg-lower-a moved",
      "tp-leg-lower-b moved",
      "tp-leg-collector moved",
    ])
    // The crossing figure alone REPRODUCES on all five legs (0 against 0) and MOVES on all three
    // oc blocks; every row's overall verdict is `moved` because the aspect moved on all eight.
    const crossings = rows.flatMap((r) => (r.spike === null ? [] : [`${r.block} ${r.spike.figures.find((f) => f.measure === "crossings")?.verdict}`]))
    expect(crossings).toEqual([
      "oc-power moved", "oc-audio moved", "oc-sidechain moved",
      "tp-leg-upper reproduced", "tp-leg-feedback reproduced", "tp-leg-lower-a reproduced",
      "tp-leg-lower-b reproduced", "tp-leg-collector reproduced",
    ])
  })
})

/**
 * **THE EXPERIMENT'S SUBJECT IS `optical-compressor` SINCE 2026-10-25, AND THE RE-SCOPE IS WHY
 * THESE FIGURES ARE WHOLLY NEW RATHER THAN MOVED.**
 *
 * It was `transistor-preamp`'s five drawing legs, by controller ruling **R38**, which substituted
 * them because the brief's own subject was unusable: *"all three `oc-*` blocks are among the seven
 * the post-layout gates refuse, so there is no composed side to measure."* Boundary-node sizing
 * (`docs/known-gaps.md` **G291**) inverted both halves of that:
 *
 * - **all seven `transistor-preamp` blocks draw**, and `integratedExperiment`'s guard refuses that
 *   case - rightly, because with every block drawing the flat side is a whole circuit and the
 *   sub-circuit caveat the module prints would be false. **The guard was not relaxed. The subject
 *   moved.** It is the guard going red that found this, which is the behaviour `CLAUDE.md` asks
 *   of a check that cannot run;
 * - **`optical-compressor` draws 2 of its 3** - `oc-power` and `oc-audio` yes, `oc-sidechain` no -
 *   so the brief's named mechanism is available for the first time since Task 17.
 *
 * **AND THE RE-SCOPE BOUGHT WHAT R38 COULD NOT: BOTH SIDES MEASURE.** On the five legs the flat
 * probe was refused by the junction gate, so the accepted column held *"a composed drawing and a
 * refusal"* and the only stage-matched comparison was at `backend-output`. Here the flat probe is
 * ACCEPTED, so G105's criterion - *"reports the four measures against the FLAT whole-circuit
 * baseline"* - has figures on both sides at the stage a drawing is actually emitted from.
 */
describe("step 4: the integrated experiment, on optical-compressor's two blocks that draw", () => {
  it("has a FLAT side that is ACCEPTED, which it was not on the previous subject", () => {
    expect(experiment.circuit).toBe("optical-compressor")
    expect(experiment.blocks).toEqual(["oc-power", "oc-audio"])
    expect(experiment.notDrawn.map((n) => n.id)).toEqual(["oc-sidechain"])
    // SOME blocks draw, which is the condition the experiment is specified for (R38) and the
    // condition `transistor-preamp` no longer meets.
    expect(experiment.blocks.length).toBeGreaterThan(0)
    expect(experiment.notDrawn.length).toBeGreaterThan(0)
    expect(experiment.flat.ok).toBe(true)
    if (!experiment.flat.ok) return
    const f = experiment.flat.figures
    // 22 placements: oc-power's 8 and oc-audio's 14, which is the flat probe holding exactly the
    // union of the two blocks' members and nothing else.
    expect(f.placements).toBe(22)
    expect(f.wires).toBe(99)
    expect(f.nets).toBe(12)
    expect(f.measures.bends).toBe(31)
    expect(f.measures.crossings).toBe(6)
    expect(f.measures.wireLength).toBe(1040)
    expect(f.measures.occupiedArea).toBe(12_672)
    expect(f.aspect?.toFixed(2)).toBe("2.91")
  })

  /**
   * **THE COMPOSED SIDE, AND THE ONE FIGURE WORTH READING TWICE IS `crossings`.** The two blocks
   * cross 1 and 5 between them, the composed drawing crosses 6, and seam B therefore adds none -
   * which is the next test, taken as a difference rather than asserted.
   *
   * `placements` and `nets` agree with the flat side exactly, because both sides hold the same
   * 22 parts on the same 12 wired nets; `wires` differs by one (100 against 99) because the two
   * blocks are routed independently and their segment lists do not have to agree with a single
   * graph's. `wireLength` is LOWER composed than flat - 862 against 1040 grid steps - and
   * `occupiedArea` likewise, 8536 against 12 672. **A composed drawing that is tighter than the
   * flat one is a legitimate outcome and is reported as one** (R38's fourth clause), not as a
   * failure of the measurement.
   */
  it("has a COMPOSED side whose crossings are exactly the blocks' own", () => {
    expect(experiment.composed.ok).toBe(true)
    if (!experiment.composed.ok) return
    const f = experiment.composed.figures
    expect(f.placements).toBe(22)
    expect(f.wires).toBe(100)
    expect(f.nets).toBe(12)
    expect(f.measures.wireLength).toBe(862)
    expect(f.measures.bends).toBe(34)
    expect(f.measures.crossings).toBe(6)
    expect(f.measures.occupiedArea).toBe(8536)
    expect(f.aspect?.toFixed(2)).toBe("4.41")
    // The per-block figures the composed total is made of, named so the sum below is checkable.
    expect(experiment.perBlock.map((b) => `${b.id} crossings=${b.figures.measures.crossings} len=${b.figures.measures.wireLength}`)).toEqual([
      "oc-power crossings=1 len=221",
      "oc-audio crossings=5 len=641",
    ])
    expect(1 + 5).toBe(f.measures.crossings)
  })

  it("measures seam B adding NO crossing and NO wire, which is G208 re-taken", () => {
    expect(experiment.interBlockCrossings).toBe(0)
    expect(experiment.interBlockWireLength).toBe(0)
    expect(experiment.frameOverlaps).toEqual([])
  })

  /**
   * **THE STAGE-MATCHED COMPARISON, AND THE RATIO IS TAKEN NOW - AT 1.00x.** Both sides here are
   * the pre-snap canonical topology of what `elkjs` emitted, so their difference is attributable
   * to the decomposition rather than to the stage.
   *
   * **ON THE PREVIOUS SUBJECT THE RATIO HAD NO DENOMINATOR** - the five legs measured ZERO
   * crossings composed, which was *"a result about this subject and not a missing figure"*. On
   * `optical-compressor` the composed side crosses 6, so the ratio exists: **6 / 6 = 1.00x.**
   *
   * **1.00x IS NOT THE SPIKE'S 6.1x AND IS NOT A FRACTION OF IT.** The spike's paired control is
   * on the same CIRCUIT now, which is new - whole 293 against blocks 48 on `optical-compressor` -
   * and that makes the subject match, not the figures. The spike's numbers came from a different
   * frontend with different node sizes and port constraints, `comparabilityOf` still calls three
   * of the five measures not-comparable, and nothing here scales one into the other. **The flat
   * and composed sides of this experiment produce the same crossing count on this subject, and
   * that is the whole of what 1.00x says.**
   */
  it("is 6 crossings flat against 6 in blocks, and 1039.00 grid steps against 864.11", () => {
    expect(experiment.flatBackendOutput.ok).toBe(true)
    if (!experiment.flatBackendOutput.ok) return
    expect(experiment.flatBackendOutput.figures.measures.crossings).toBe(6)
    expect(experiment.flatBackendOutput.figures.measures.wireLength.toFixed(2)).toBe("1039.00")
    expect(experiment.flatBackendOutput.figures.measures.bends).toBe(31)
    expect(experiment.perBlockBackendOutput.reduce((n, b) => n + b.figures.measures.crossings, 0)).toBe(6)
    expect(experiment.perBlockBackendOutput.reduce((n, b) => n + b.figures.measures.wireLength, 0).toFixed(2)).toBe("864.11")
    expect(experiment.perBlockBackendOutput.reduce((n, b) => n + b.figures.measures.bends, 0)).toBe(34)
    // The ratio exists on this subject and is reported as measured here, never as the spike's.
    expect(experiment.crossingRatio).toBe(1)
    expect(SPIKE_CROSSING_RATIO).not.toBe(experiment.crossingRatio)
    // And the three not-comparable measures are still not-comparable: a matching subject does not
    // make a matching frontend.
    expect(comparabilityOf("bends")).toBe("not-comparable")
    expect(comparabilityOf("bendsPerEdge")).toBe("not-comparable")
    expect(comparabilityOf("wireLength")).toBe("not-comparable")
  })
})

describe("ruling R46: what stands between 10 of 12 blocks drawing and more", () => {
  /**
   * **TASK 24 SPENT THE LEVERAGE, AND IT CAME OUT AT EXACTLY THE BOUND TASK 22 PUBLISHED.** The
   * history is worth keeping because the bound was right and the first two figures were not:
   * field placement was *"the sole blocker of four blocks"*, then three (Task 21 hid a Value that
   * repeats its symbol's part name), then the ceiling was measured at `5 + 2 = 7` once
   * `ob-buffer`'s masked power-value overlap was found. **`render/field-placement.ts` places at
   * the least-covered slot instead of refusing, and the census read 7 of 12.**
   *
   * **AND THEN THE CENSUS WENT TO 10 OF 12 FROM OUTSIDE THAT BOUND ENTIRELY** - boundary-node
   * sizing, `docs/known-gaps.md` **G291**. `5 + 2 = 7` was a bound on what FIELD PLACEMENT could
   * unblock and it was right about that; `oc-audio`, `tp-leg-emitter-bypass` and `tp-stage` were
   * blocked by a snap collapse and by LABEL and power-symbol clearance, which field placement
   * never touched. **A correct bound on one mechanism is not a bound on the drawing**, and that is
   * the lesson worth keeping from the arithmetic.
   *
   * **SIX PROBLEM CLASSES LEFT THE CENSUS IN ONE CHANGE**, which is the mask-lifting of **G258**
   * running in reverse: `body-label-overlap`, `label-body-overlap`, `label-graphic-overlap`,
   * `label-label-overlap`, `label-pin-text-overlap` and `label-wire-overlap` are gone, because the
   * room the labels needed is reserved before the circuit is packed. **One class remains in the
   * whole corpus**: `ob-buffer`'s `power-value-overlap`.
   *
   * **THE ONE THING THIS CENSUS STILL CANNOT SEE is a fallback field's own overlaps**, which
   * `textProblems` does not report by design (`render/text-scene.ts`'s `Named.fallback`): they are
   * carried by the `FieldFallback` records instead, counted per unit in
   * `tests/schgen/masked-problems.test.ts` and printed in every generation's `RENDER-REPORT.md`.
   * `docs/known-gaps.md` **G232**, **G257**, **G258**, **G260**, **G291**.
   */
  it("classifies every checkLayout problem of every declared block", () => {
    expect(renderCoverage(coverage)).toEqual([
      "ob-buffer refused at obligation 4: checkLayout problems power-value-overlap",
      "oc-power DRAWS",
      "oc-audio DRAWS",
      "oc-sidechain refused at obligation 3: one transform, two readers",
      "pt-core DRAWS",
      "tp-leg-upper DRAWS",
      "tp-leg-feedback DRAWS",
      "tp-leg-lower-a DRAWS",
      "tp-leg-lower-b DRAWS",
      "tp-leg-collector DRAWS",
      "tp-leg-emitter-bypass DRAWS",
      "tp-stage DRAWS",
      "10 of 12 declared blocks draw",
      "class power-value-overlap: sole blocker of 1 block(s) (ob-buffer), partial blocker of 0 (none)",
    ])
  })

  it("reports ONE problem class in the whole corpus, and names what blocks the two that remain", () => {
    // **THE DEFECT THAT CARRIED THIS DESCRIBE's NAME IS GONE FROM THE CENSUS ENTIRELY.** It is
    // asserted as absent rather than as zero: `leverageOf` lists a class only when some block
    // reported it, so `undefined` IS the measurement, and a class that still blocked a block
    // partially would come back defined and fail here.
    expect(leverageOf(coverage).find((l) => l.problemClass === "field-placement")).toBeUndefined()
    expect(coverage.filter((r) => r.draws).length).toBe(10)
    // **TASK 22's CEILING OF `5 + 2` IS SUPERSEDED, and it is asserted as superseded rather than
    // quietly dropped**: it was a bound on field placement, and three blocks drew past it by a
    // different mechanism. A test that still said `5 + 2` would now be wrong in a way that read
    // as a regression.
    expect(5 + 2).toBeLessThan(coverage.filter((r) => r.draws).length)
    // The SIX classes that left the census, asserted as absent by name, so a block that started
    // reporting one again fails here saying which.
    for (const gone of [
      "body-label-overlap", "label-body-overlap", "label-graphic-overlap",
      "label-label-overlap", "label-pin-text-overlap", "label-wire-overlap",
    ]) {
      expect(leverageOf(coverage).find((l) => l.problemClass === gone), gone).toBeUndefined()
    }
    // The one that remains, and it is NOT a field: a power symbol's value over another power
    // symbol's value. `leverageOf` reporting exactly one class is the measurement.
    expect(leverageOf(coverage).map((l) => l.problemClass)).toEqual(["power-value-overlap"])
    expect(leverageOf(coverage).find((l) => l.problemClass === "power-value-overlap")?.soleBlocker).toEqual(["ob-buffer"])
    expect(leverageOf(coverage).find((l) => l.problemClass === "power-value-overlap")?.partialBlocker).toEqual([])
    // And the two blocks that do not draw, named: one refused at checkLayout and one before it.
    expect(coverage.filter((r) => !r.draws).map((r) => r.block)).toEqual(["ob-buffer", "oc-sidechain"])
  })

  it("refuses a problem whose text names no known class, rather than binning it as other", () => {
    expect(() => classOf("block X: something nobody has classified")).toThrow(/matches no known class/)
    expect(() => classOf("block X: something nobody has classified")).toThrow(/ruling R46/)
    expect(classOf("no place for its Reference and Value")).toBe("field-placement")
  })

  /**
   * **THE MISBINNING TASK 21 FOUND, AND IT IS A CHECK THAT COULD NOT FIRE RATHER THAN ONE THAT
   * FIRED WRONGLY.** `body-label-overlap`'s marker was the SUBSTRING `"overlaps label"`, which a
   * label-over-label problem also contains, so the first matching entry won and the
   * whitelist-that-throws never saw an unclassified shape. Both shapes are asserted here, from the
   * real problem texts (`docs/known-gaps.md` **G258**), and a third shape that is neither still
   * throws - which is the arm the entry above drives.
   */
  it("tells a label over a label apart from a body over a label", () => {
    expect(classOf("label BYPASS_JUMPED at (17.78, 3.81) overlaps label BYPASS_CAP at (12.7, 5.08)")).toBe("label-label-overlap")
    expect(classOf("body of Q1#1 overlaps label BYPASS_CAP at (11.43, 11.43)")).toBe("body-label-overlap")
    // And a text-over-body problem, which `textProblems` can also emit, is NOT silently filed as
    // either of them: nothing has measured one in this corpus, so it must refuse.
    expect(() => classOf("Reference of C3#1 overlaps body of R6#1")).toThrow(/matches no known class/)
  })

  /**
   * **A BLOCK REFUSED BEFORE `checkLayout` HAS NO PROBLEM CLASSES, AND THAT IS NOT THE SAME AS
   * HAVING NONE.** Nothing has looked at `oc-sidechain`'s clearances, so its empty list must not
   * be read as clean.
   *
   * **IT WAS TWO BLOCKS UNTIL 2026-10-25 AND IS ONE NOW** (**G291**): `oc-audio` was refused at
   * obligation 1 - *"the snap collapsed geometry"* - and draws. One subject is weaker than two, so
   * the control is restated as a difference: `ob-buffer` also does not draw and it DOES have a
   * problem class, which is what keeps "no classes" distinguishable from "not refused here".
   */
  it("leaves the one block refused at an earlier obligation with no problem classes at all", () => {
    const earlier = coverage.filter((r) => !r.draws && r.problemClasses.length === 0)
    expect(earlier.map((r) => `${r.block} ${r.gate}`)).toEqual([
      "oc-sidechain obligation 3: one transform, two readers",
    ])
    // The control: the other block that does not draw reports a class, so an empty list is a
    // statement about WHERE it was refused and not about whether anything is wrong with it.
    const buffer = coverage.find((r) => r.block === "ob-buffer")
    expect(buffer?.draws).toBe(false)
    expect(buffer?.problemClasses).toEqual(["power-value-overlap"])
  })
})

/**
 * **THE FOUR BIAS LEGS ARE NO LONGER CONGRUENT, AND THAT IS THIS WHOLE SECTION'S SUBJECT CHANGING
 * UNDER IT.** Until 2026-10-25 the four drew byte-identically (**G185**) - same three placements,
 * same two anchor positions, same jumper-to-trim displacement of 14 grid steps - and this section
 * measured that.
 *
 * **BOUNDARY-NODE SIZING BROKE IT, AND THE CAUSE IS DERIVABLE RATHER THAN OBSERVED**
 * (`docs/known-gaps.md` **G291**). A boundary node is now as big as the label or power symbol that
 * will be drawn at it, and the four legs differ in exactly that text:
 *
 * | leg | inbound boundary | outbound boundary | geometry |
 * | --- | --- | --- | --- |
 * | `tp-leg-upper` | `VCC` power symbol (top edge) | `BASE` label | its own |
 * | `tp-leg-feedback` | `COLLECTOR` label | `BASE` label | its own |
 * | `tp-leg-lower-a` | `BASE` label | `GND` power symbol | shared |
 * | `tp-leg-lower-b` | `BASE` label | `GND` power symbol | shared |
 *
 * **THE TWO LEGS WITH THE SAME PAIR OF BOUNDARY NETS ARE THE ONLY PAIR THAT STILL COINCIDES**, and
 * that is the evidence: the two `-lower` legs hold different PARTS with different semantic ids and
 * still draw identically, while `-upper` and `-feedback` hold the same KINDS of parts and do not.
 * What separates them is the boundary text, not the circuit.
 */
describe("step 6: congruence, WITH the rail glyphs the instances actually get", () => {
  it("gives the two -lower legs identical placements and the other two their own", () => {
    const [upper, feedback, lowerA, lowerB] = legs
    expect(upper).toBeDefined()
    expect(upper?.placements).toEqual(["jumper#1@7620,10160@0", "floor#1@20320,15240@0", "trim#1@27940,25400@0"])
    expect(feedback?.placements).toEqual(["jumper#1@7620,5080@0", "floor#1@36830,10160@0", "trim#1@60960,20320@0"])
    expect(lowerA?.placements).toEqual(["jumper#1@7620,5080@0", "floor#1@30480,10160@0", "trim#1@48260,20320@0"])
    // THE SURVIVING CONGRUENCE, and it is a pair of DIFFERENT parts drawing alike.
    expect(lowerB?.placements, "the two -lower legs").toEqual(lowerA?.placements)
    // The other two differ from it, asserted so "congruent" cannot quietly come back meaning three.
    expect(upper?.placements).not.toEqual(lowerA?.placements)
    expect(feedback?.placements).not.toEqual(lowerA?.placements)
    // THE ANCHOR POSITIONS NO LONGER COINCIDE EITHER. One of the two is the same on all four -
    // (17780, 1270), the first-layer boundary - and the other moved with the block's own width,
    // which is what a wider reserved label does to a LAST_SEPARATE node's position.
    const positions = (leg: LegShape): readonly string[] =>
      leg.anchors.map((a) => a.slice(a.indexOf("@") + 1).split("/")[0] ?? "").sort()
    expect(legs.every((l) => positions(l).includes("17780,1270")), "the first-layer anchor").toBe(true)
    expect(legs.map((l) => positions(l).filter((p) => p !== "17780,1270").join(""))).toEqual([
      "38100,31750", "71120,26670", "58420,26670", "58420,26670",
    ])
  })

  it("gives three of the four a rail glyph and one of them NONE, which is G97's breaking condition", () => {
    expect(legs.map((l) => `${l.block} powers=${l.powers.join("|") || "none"} labels=${l.labels.join("|")}`)).toEqual([
      "tp-leg-upper powers=VCC/power:VCC@17780,1270@0 labels=BASE@38100,31750/right",
      "tp-leg-feedback powers=none labels=COLLECTOR@17780,1270/right|BASE@71120,26670/right",
      "tp-leg-lower-a powers=GND/power:GND@58420,26670@0 labels=BASE@17780,1270/right",
      "tp-leg-lower-b powers=GND/power:GND@58420,26670@0 labels=BASE@17780,1270/right",
    ])
  })

  /**
   * **THE MEASURED SPREAD IS NO LONGER ZERO, SO THE OLD REFUTATION OF THE SKIN'S FORMULA IS GONE -
   * AND THE FORMULA IS STILL NOT WHAT PRODUCES IT.**
   *
   * The claim this test used to carry was clean: `6 * len(id) + 5` gives 107, 125, 119 and 119 for
   * the four jumpers' semantic ids, so it predicts the four x offsets DIFFER, **and all four
   * measured 14 grid steps.** A predicted spread against a measured zero.
   *
   * Since 2026-10-25 the four measure **16, 42, 32 and 32** grid steps (`docs/known-gaps.md`
   * **G291**). So what is asserted now is weaker and is stated as weaker:
   *
   * - the measured displacements are NOT a scaling of the prediction. From `-upper` to `-lower`
   *   the formula moves 12 px and the measurement moves 16 grid steps; from `-lower` to
   *   `-feedback` the formula moves 6 px and the measurement moves 10. **16/12 is not 10/6**, so
   *   no single factor carries one into the other;
   * - the spread that IS there is the boundary text's, by the evidence in this describe's own
   *   header: the only pair that still coincides is the only pair with the same boundary nets.
   *
   * **WHAT CANNOT BE SETTLED ON THIS SUBJECT, said plainly:** the four legs' id LENGTHS and their
   * boundary-net lengths happen to vary together, and the two orderings now agree (`-upper`
   * smallest, `-feedback` largest, the two `-lower` equal). **That agreement is not evidence for
   * the formula and this test does not treat it as evidence against it either.** Separating the
   * two causes needs a subject where part-id length and boundary-net length vary independently,
   * and this repository declares none. Recorded in **G291** rather than guessed at here.
   */
  it("measures a spread that 6*len(id)+5 does not predict, where it used to measure none", () => {
    expect(legs.map((l) => l.predictedX)).toEqual([107, 125, 119, 119])
    expect(skinIdWidth("upper_bias_jumper")).toBe(107)
    expect(skinIdWidth("feedback_bias_jumper")).toBe(125)
    expect(legs.map((l) => l.jumperToTrim)).toEqual([
      { dx: 16, dy: 12 }, { dx: 42, dy: 12 }, { dx: 32, dy: 12 }, { dx: 32, dy: 12 },
    ])
    expect(new Set(legs.map((l) => l.predictedX)).size).toBeGreaterThan(1)
    // The spread is real now - three distinct displacements where there was one.
    expect(new Set(legs.map((l) => l.jumperToTrim?.dx)).size).toBe(3)
    // AND IT IS NOT THE FORMULA'S SPREAD: the two step ratios disagree, so no single scale factor
    // maps the prediction onto the measurement. 16/12 = 1.33 against 10/6 = 1.67.
    const [upper, feedback, lowerA] = legs
    const predictedStep = (lowerA?.predictedX ?? 0) - (upper?.predictedX ?? 0)
    const measuredStep = (lowerA?.jumperToTrim?.dx ?? 0) - (upper?.jumperToTrim?.dx ?? 0)
    const predictedStep2 = (feedback?.predictedX ?? 0) - (lowerA?.predictedX ?? 0)
    const measuredStep2 = (feedback?.jumperToTrim?.dx ?? 0) - (lowerA?.jumperToTrim?.dx ?? 0)
    expect([predictedStep, measuredStep, predictedStep2, measuredStep2]).toEqual([12, 16, 6, 10])
    expect(measuredStep / predictedStep).not.toBe(measuredStep2 / predictedStep2)
  })
})

describe("step 7: disjointness at sheet level, over Task 15's packing", () => {
  it("puts no non-member inside any block's own extent, and overlaps no frame under either packer", () => {
    expect(groups.blocks.map((b) => `${b.block} ${b.members} members ${b.box.w}x${b.box.h} ${(100 * b.ofCanvas).toFixed(2)}% inside=${b.nonMembersInside.length}`)).toEqual([
      "tp-leg-upper 3 members 29x24 1.22% inside=0",
      "tp-leg-feedback 3 members 55x20 1.93% inside=0",
      "tp-leg-lower-a 3 members 45x20 1.58% inside=0",
      "tp-leg-lower-b 3 members 45x20 1.58% inside=0",
      "tp-leg-collector 2 members 13x17 0.39% inside=0",
      "tp-leg-emitter-bypass 2 members 13x15 0.34% inside=0",
      "tp-stage 16 members 71x52 6.46% inside=0",
    ])
    expect(groups.frameOverlapsElk).toEqual([])
    expect(groups.frameOverlapsShelf).toEqual([])
  })

  /**
   * The frame-box reading of the same criterion, on `mini`, which was for a long time the ONE
   * design that composes.
   */
  it("reports no non-member containment on mini's signal sheet, and the check could have failed", async () => {
    const packing = await packSheet(signal.contents, signal.paper)
    expect(packing.ok).toBe(true)
    if (!packing.ok) return
    const drawing = layoutSheet(signal.circuit, "signal", signal.symbols, FLAG_LIB_ID, signal.elk, packing)
    expect(nonMemberContainments(signal.circuit, drawing)).toEqual([])
    const huge = {
      ...drawing,
      frames: drawing.frames.map((f, i) => (i === 0 ? { ...f, box: { minX: -1e9, minY: -1e9, maxX: 1e9, maxY: 1e9 } } : f)),
    }
    expect(nonMemberContainments(signal.circuit, huge).length).toBeGreaterThan(0)
  })

  /**
   * **`transistor-preamp`'s OWN DECLARED SHEET LAYS OUT, AND G211 IS REFUTED.** This test was
   * `cannot take the same reading on transistor-preamp's own sheet, and refuses rather than
   * skipping`, and it asserted that `layoutSheet` THROWS - because *"two of its seven blocks do
   * not draw"*. All seven draw since 2026-10-25 (`docs/known-gaps.md` **G291**), the `lab` sheet
   * lays out on its declared A3, and the reading the old test could not take is taken here.
   *
   * **THIS IS THE FIRST PARITY CIRCUIT WHOSE OWN DECLARED SHEET COMPOSES.**
   * `tests/schgen/__fixtures__/composed.ts`'s header says *"not one of the four circuits has a
   * sheet that can be composed at all"*, and that sentence is now false; the fixture still uses
   * `mini` and the five-leg probe, which is a separate question from whether the sheet lays out.
   */
  it("takes the same reading on transistor-preamp's own declared sheet, which it could not before", () => {
    expect(probe.drew.length).toBe(7)
    expect(probe.refused.map((r) => r.id).sort()).toEqual([])
    const drawing = layoutSheet(probe.circuit, "lab", probe.symbols, FLAG_LIB_ID, probe.elk)
    // Seven frames on the sheet's own declared paper, and 142 wires - which is `shapeMeasures`'
    // `segments` total over the same seven blocks in `tests/schgen/render/compose.test.ts`.
    expect(drawing.frames.length).toBe(7)
    expect(drawing.wires.length).toBe(142)
    expect(nonMemberContainments(probe.circuit, drawing)).toEqual([])
    // NOT VACUOUS, by the same control the mini reading uses: a frame grown to swallow the sheet
    // reports every symbol that is not its own block's.
    const huge = {
      ...drawing,
      frames: drawing.frames.map((f, i) => (i === 0 ? { ...f, box: { minX: -1e9, minY: -1e9, maxX: 1e9, maxY: 1e9 } } : f)),
    }
    expect(nonMemberContainments(probe.circuit, huge).length).toBe(29)
  })
})
