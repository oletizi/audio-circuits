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
import { disjointness, legShapes, skinIdWidth, type Disjointness, type LegShape, type LegShapes } from "../../tools/schgen/remeasure-criteria.ts"
import { nonMemberContainments } from "../../lib/schgen/render/compose.ts"
import { layoutSheet, sheetOf } from "../../lib/schgen/render/sheets.ts"
import { packSheet } from "../../tools/schgen/elk/sheet-layout.ts"
import { FLAG_LIB_ID } from "../../tools/schgen/generate.ts"

afterAll(cleanUpTempScratch)

let rows: readonly Remeasurement[]
let experiment: IntegratedExperiment
let legs: LegShapes
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
   * **EIGHT OF THE TWELVE DECLARED BLOCKS DRAW SINCE 2026-10-26, DOWN FROM TEN, AND THE TWO
   * CHANGES BEHIND THAT ARE SEPARATELY MEASURED AND DO NOT ADD UP** (`docs/known-gaps.md`
   * **G296**). It was 5, then 7 at field placement, then 10 at boundary-node sizing (**G291**).
   *
   * `[RAN]` the census on four trees, with each change rolled back on its own and the
   * both-rolled-back tree as the control that the probe reproduces the last green state exactly:
   *
   * | tree | draws | the set |
   * | --- | --- | --- |
   * | chain, no 180 (control) | **10 of 12** | the ten this table held until 2026-10-26 |
   * | chain + the two 180 rules | **8 of 12** | loses `pt-core` and `tp-stage` |
   * | star + no 180 | **7 of 12** | loses `oc-audio`, `pt-core`, `tp-leg-upper` |
   * | star + the two 180 rules (HEAD) | **8 of 12** | loses `oc-power`, `oc-audio`, `tp-leg-upper`; gains `ob-buffer` |
   *
   * **NEITHER CHANGE IS AN IMPROVEMENT ON ITS OWN AND THE TWO INTERACT, which is the finding.**
   * `pt-core` is lost by EITHER change alone and drawn by both together; `oc-power` is lost by
   * NEITHER alone and by both together. So no row of this table can be attributed to one change,
   * and nothing here claims one.
   *
   * **ALL FOUR REFUSALS ARE ONE DEFECT CLASS AND IT IS NOT A NEW ONE.** `oc-power`, `oc-audio` and
   * `tp-leg-upper` each refuse at `checkLayout` on ONE power symbol's VALUE text drawn over the
   * block's own parts, wires or pins - **G262**'s class, whose power-symbol half that entry records
   * as never having been re-driven. `oc-sidechain` refuses at obligation 3 as it has throughout,
   * where `elkjs` returns a port coordinate that disagrees with the pin end recomputed from the
   * placement.
   */
  it("is 8 accepted and 4 refused, and names the gate that refused each", () => {
    expect(rows.map((r) => `${r.block} ${r.geometry.stage}${r.geometry.refusal === null ? "" : ` ${gateOf(r.geometry.refusal)}`}`)).toEqual([
      "ob-buffer accepted",
      "oc-power backend-output obligation 4: checkLayout",
      "oc-audio backend-output obligation 4: checkLayout",
      "oc-sidechain backend-output obligation 3: one transform, two readers",
      "pt-core accepted",
      "tp-leg-upper backend-output obligation 4: checkLayout",
      "tp-leg-feedback accepted",
      "tp-leg-lower-a accepted",
      "tp-leg-lower-b accepted",
      "tp-leg-collector accepted",
      "tp-leg-emitter-bypass accepted",
      "tp-stage accepted",
    ])
    expect(rows.filter((r) => r.geometry.stage === "accepted").length).toBe(8)
  })

  it("draws 0 of 12 by TEMPLATE, which is the other axis and has not moved", () => {
    // Ruling R41: `realised` means a template drew the block, and that is still 0 of 12.
    expect(rows.every((r) => r.drawnBy === "elk")).toBe(true)
  })

  /**
   * The twelve rows `docs/schematic/m1-remeasurement.md` prints, to the digit.
   *
   * **WHAT MOVED ON 2026-10-25 AND WHAT DID NOT, TERM BY TERM - AND THE TWO CHANGES THAT DAY MOVED
   * DIFFERENT KINDS OF THING, which is the finding worth more than either table.**
   *
   * **Boundary-node sizing** (`docs/known-gaps.md` **G291**) moved `stage` on three blocks and at
   * least one of `len`, `area`, `aspect` on ten of twelve, and **did not move a single topological
   * count**: *"the signature of a layout that was re-packed rather than re-routed."*
   *
   * **The ORIENTATION rule** (**G292**) moved the GRAPH. A two-terminal passive with no rail end
   * is now laid along the signal, so its node box goes from tall to wide and its two pin ports
   * move from `NORTH`/`SOUTH` to `EAST`/`WEST`; `layered` is given a different problem, and
   * `bends`, `perEdge` and `crossings` move with the rest:
   *
   * - `crossings` moved on **four of the twelve** - `ob-buffer` 7 to 6, `oc-sidechain` 7 to 8,
   *   `pt-core` 78 to 71, `tp-stage` 7 to 6. Three down, one up, and none of them is a threshold;
   * - `bends` moved on **eight of the twelve**. `oc-power`, `tp-leg-collector` and
   *   `tp-leg-emitter-bypass` are unmoved in every figure, and those three are the control that
   *   the rule is a no-op where it has nothing to turn;
   * - `parts`, `units`, `placements`, `graphCells`, `ports`, `share`, `scale` and `stage` are
   *   **identical on all twelve rows**: nothing started or stopped drawing.
   *
   * **G292's OTHER HALF - EDGES ORDERED BY DOWNSTREAM DEPTH - MOVED NOT ONE FIGURE IN THIS FILE,
   * AND THE COMMIT THAT LANDED IT SAYS IT MOVED 24 TESTS.** `[RAN]` the seven affected files with
   * `lib/schgen/elk/graph.ts` rolled back to the orientation-only commit and these expectations in
   * place: **97 pass, 0 fail.** `downstreamDepth` seeds from a boundary net with the
   * `FIRST_SEPARATE` layer constraint, and **no parity block has one** - the seven blocks in the
   * repository that do are all Pultec board blocks. `docs/known-gaps.md` **G292** carries it.
   *
   * **THE STAR AND THE TWO 180 RULES MOVED `stage` ON FOUR ROWS AND EVERY GEOMETRIC FIGURE ON
   * ALL TWELVE** (**G296**). `parts`, `units`, `placements`, `graphCells`, `ports`, `share` and
   * `scale` are **identical on all twelve rows**, which is what says the subject did not change;
   * `bends`, `perEdge`, `crossings`, `len`, `area` and `aspect` all moved.
   *
   * **ONE COLUMN SPLITS THE CORPUS EXACTLY IN TWO BY SIZE AND IT IS WORTH NAMING: `aspect`,**
   * which is `box.w / box.h`. It **FELL on all six blocks holding more than three placements** -
   * `ob-buffer` 1.62 to 0.75, `oc-power` 2.21 to 0.64, `oc-audio` 3.64 to 0.91, `oc-sidechain`
   * 3.34 to 0.79, `pt-core` 2.06 to 0.46, `tp-stage` 1.48 to 0.77 - and **ROSE on all six holding
   * three or fewer**: `tp-leg-feedback` 3.93 to 6.88, both `-lower` legs 3.21 to 5.63,
   * `tp-leg-upper` 1.88 to 3.98, `-collector` 0.76 to 0.81, `-emitter-bypass` 0.87 to 0.93. **Six
   * and six, with the cut exactly at the placement count**, which is asserted here as an
   * observation and not explained: every one of the six that fell went from wider-than-tall to
   * taller-than-wide, so the six biggest blocks all stopped reading left to right, which is the
   * opposite of what **G292**'s directive asked for. Whether that is better or worse on A3 is the
   * owner's judgement and **G293**'s open criterion, not this file's.
   *
   * **EVERY `bends` AND `crossings` FIGURE HERE IS CROSS-CHECKED, which is what keeps this table a
   * measurement.** `tests/schgen/readability/measures.test.ts` takes both quantities through a
   * different driver - `readElkGraph` plus `canonicalTopology` for the pre-snap column, and
   * `measuresOf` over the accepted topology for the eight blocks that draw - and agrees on all
   * twelve: pre-snap `oc-power` 23/2, `oc-audio` 30/9, `oc-sidechain` 46/13, `tp-leg-upper` 5/0;
   * accepted `ob-buffer` 20/6, `pt-core` 85/54, `tp-stage` 30/11 and 5/0 on every leg accepted.
   * Each block's `len` and `area` are checked there too, against `shapeMeasures` in micrometres
   * and `anchorExtent` in grid steps.
   */
  it("is these twelve rows of figures", () => {
    expect(rows.map(renderRow)).toEqual([
      "ob-buffer parts=9 units=11 placements=11 graphCells=14 ports=3 share=21.4% stage=accepted bends=20 perEdge=0.71 crossings=6 len=293.00 area=2028.00 aspect=0.75 scale=about-a-serialization | no spike row",
      "oc-power parts=8 units=8 placements=8 graphCells=11 ports=3 share=27.3% stage=backend-output bends=23 perEdge=0.96 crossings=2 len=528.50 area=3394.54 aspect=0.64 scale=about-a-serialization | spike oc-power moved",
      "oc-audio parts=12 units=14 placements=14 graphCells=18 ports=4 share=22.2% stage=backend-output bends=30 perEdge=0.79 crossings=9 len=623.21 area=3503.63 aspect=0.91 scale=about-a-serialization | spike oc-audio moved",
      "oc-sidechain parts=17 units=19 placements=19 graphCells=24 ports=5 share=20.8% stage=backend-output bends=46 perEdge=1.00 crossings=13 len=1034.70 area=8623.57 aspect=0.79 scale=about-a-serialization | spike oc-sidechain moved",
      "pt-core parts=24 units=24 placements=24 graphCells=26 ports=2 share=7.7% stage=accepted bends=85 perEdge=1.25 crossings=54 len=1978.00 area=7068.00 aspect=0.46 scale=about-a-serialization | no spike row",
      "tp-leg-upper parts=3 units=3 placements=3 graphCells=5 ports=2 share=40.0% stage=backend-output bends=5 perEdge=0.83 crossings=0 len=40.60 area=254.40 aspect=3.98 scale=about-the-circuit | spike leg-upper moved",
      "tp-leg-feedback parts=3 units=3 placements=3 graphCells=5 ports=2 share=40.0% stage=accepted bends=5 perEdge=0.83 crossings=0 len=64.00 area=440.00 aspect=6.88 scale=about-the-circuit | spike leg-feedback moved",
      "tp-leg-lower-a parts=3 units=3 placements=3 graphCells=5 ports=2 share=40.0% stage=accepted bends=5 perEdge=0.83 crossings=0 len=54.00 area=360.00 aspect=5.63 scale=about-the-circuit | spike leg-lowerA moved",
      "tp-leg-lower-b parts=3 units=3 placements=3 graphCells=5 ports=2 share=40.0% stage=accepted bends=5 perEdge=0.83 crossings=0 len=54.00 area=360.00 aspect=5.63 scale=about-the-circuit | spike leg-lowerB moved",
      "tp-leg-collector parts=2 units=2 placements=2 graphCells=4 ports=2 share=50.0% stage=accepted bends=5 perEdge=1.00 crossings=0 len=27.00 area=208.00 aspect=0.81 scale=about-the-circuit | spike leg-collector moved",
      "tp-leg-emitter-bypass parts=2 units=2 placements=2 graphCells=6 ports=4 share=66.7% stage=accepted bends=5 perEdge=0.83 crossings=0 len=45.00 area=182.00 aspect=0.93 scale=about-the-circuit | no spike row",
      "tp-stage parts=16 units=16 placements=16 graphCells=23 ports=7 share=30.4% stage=accepted bends=30 perEdge=0.81 crossings=11 len=512.00 area=3905.00 aspect=0.77 scale=about-a-serialization | no spike row",
    ])
  })

  /**
   * **THE FIVE ACCEPTED ROWS REPRODUCE G216's TABLE, AND WHAT THAT ESTABLISHES IS NARROW.** Both
   * sides run over the geometry `adaptElkLayoutReported` returns, which is already canonicalised -
   * G216's own correction to its round-1 independence claim. **Two implementations agreeing is a
   * check on the arithmetic and NOT a cross-check of the geometry.**
   *
   * **IT IS G216's FIVE BY NAME SINCE TASK 24, NOT "whatever is accepted today".** Eight blocks
   * are accepted now, and summing all of them would compare an 8-block total against a 5-block
   * table - two different quantities, which is exactly the comparison **G220** names as the
   * failure. The five are named so that the agreement stays an agreement.
   *
   * **AND SINCE 2026-10-26 ONLY FOUR OF G216's FIVE ARE ACCEPTED**, `tp-leg-upper` having stopped
   * drawing (**G296**). **The five are still the subject and the one missing from the sum is named
   * rather than dropped**: a table that quietly summed four rows under a five-row heading is
   * exactly the G220 failure one step smaller.
   *
   * **G216's WIRE TOTAL HAS NOW MOVED THREE TIMES: 224, then 298, then 276, now 199 over FOUR
   * rows** - and the 199 is not comparable with the 276, because one of the five terms is gone.
   * What IS comparable is term by term, and three of the four fell: `-feedback` 71 to 64,
   * both `-lower` legs 61 to 54, `-collector` 32 to 27. **Its PLACEMENT total went 14 to 11**, and
   * that is the sum losing a 3-placement block rather than any part moving between blocks.
   *
   * 199 is cross-checked rather than copied: `tests/schgen/readability/measures.test.ts` takes the
   * same four `len` figures over the canonical topology through a different driver.
   */
  it("reproduces G216's four still-accepted rows, which is an arithmetic agreement and not a second reading", () => {
    const G216_ROWS = ["tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b", "tp-leg-collector"]
    const five = rows.filter((r) => G216_ROWS.includes(r.block))
    expect(five.length, "G216's five rows are all present as rows").toBe(5)
    // THE ONE THAT IS NO LONGER ACCEPTED IS NAMED, so "four" cannot be read as "G216 had four".
    expect(five.filter((r) => r.geometry.stage !== "accepted").map((r) => r.block)).toEqual(["tp-leg-upper"])
    const accepted = five.filter((r) => r.geometry.stage === "accepted")
    expect(accepted.length).toBe(4)
    expect(accepted.reduce((n, r) => n + r.geometry.placements, 0)).toBe(11)
    expect(accepted.reduce((n, r) => n + r.geometry.measures.wireLength, 0)).toBe(199)
    // The total against its own terms, which are the four `len` figures in the table above.
    expect(64 + 54 + 54 + 27).toBe(199)
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
 * **THE EXPERIMENT'S SUBJECT IS `transistor-preamp` SINCE 2026-10-26, AND THE SUBJECT HAS NOW
 * MOVED BETWEEN THE SAME TWO CIRCUITS TWICE. THAT IS THE FINDING THIS HEADER CARRIES.**
 *
 * - until 2026-10-25 it was `transistor-preamp`'s five drawing legs, by controller ruling **R38**,
 *   because the brief's own subject was unusable: *"all three `oc-*` blocks are among the seven the
 *   post-layout gates refuse, so there is no composed side to measure."*;
 * - boundary-node sizing (`docs/known-gaps.md` **G291**) made all seven `transistor-preamp` blocks
 *   draw, which `integratedExperiment`'s guard refuses, so the subject moved to
 *   `optical-compressor` at 2 of 3;
 * - **`edgesForNet`'s star (G293) leaves `optical-compressor` at 0 of 3** - `oc-power` and
 *   `oc-audio` both land a power symbol's VALUE text on their own parts and wires (**G296**) - so
 *   the subject moves back to `transistor-preamp`, now at 6 of 7 with `tp-leg-upper` refused.
 *
 * **THE GUARD WAS NOT RELAXED ANY OF THE THREE TIMES, AND WHAT THE THREE MOVES SHOW IS THAT
 * "the circuit where SOME blocks draw" IS NOT A PROPERTY OF A CIRCUIT.** It is a property of the
 * current geometry, so every geometry change can take it off whichever circuit holds it. Each
 * move is the guard going red and being answered, which is the behaviour `CLAUDE.md` asks of a
 * check that cannot run.
 *
 * **EVERY FIGURE BELOW IS A FIRST READING ON THIS SUBJECT AT THIS GEOMETRY, not a moved one**, and
 * the sums are what make them checkable rather than copied: five of the six composed figures are
 * the termwise sum of the six blocks', each of which is independently reported by
 * `tools/schgen/remeasure.ts`'s own twelve-row table in step 1 of this file.
 *
 * **R38's THIRD CLAUSE IS WHAT THIS FILE DOES ABOUT THE FLAT SIDE, verbatim: *"If the flat side
 * REFUSES, that refusal is the result."*** So the refusal is asserted with its gate and its
 * reason, and nothing here relaxes a gate to recover a figure.
 */
describe("step 4: the integrated experiment, on transistor-preamp's six blocks that draw", () => {
  it("has a FLAT side that REFUSES at the junction obligation, and R38 makes that refusal the result", () => {
    expect(experiment.circuit).toBe("transistor-preamp")
    expect(experiment.blocks).toEqual([
      "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b", "tp-leg-collector", "tp-leg-emitter-bypass", "tp-stage",
    ])
    expect(experiment.notDrawn.map((n) => n.id)).toEqual(["tp-leg-upper"])
    // SOME blocks draw, which is the condition the experiment is specified for (R38) and the
    // condition `optical-compressor` no longer meets at 0 of 3.
    expect(experiment.blocks.length).toBeGreaterThan(0)
    expect(experiment.notDrawn.length).toBeGreaterThan(0)
    // **THE REFUSAL, NAMED AT ITS GATE AND ITS OBLIGATION - AND IT IS A T-JUNCTION, WHICH MEANS
    // THE T DETECTION ADDED TO `junctionPoints` IS NOT COMPLETE.** Obligation 2: the canonical
    // topology says net `COLLECTOR` branches at (39.37, 111.76) and calls that branch a
    // `t-junction`, and the sheet emitter places no junction there. `junctionPoints` now DOES find
    // a T - a wire end strictly inside another wire of the same net - so a branch the topology
    // calls a T and the emitter still misses is a residual, recorded in **G296** rather than
    // read as the detection working.
    expect(experiment.flat.ok).toBe(false)
    if (experiment.flat.ok) return
    expect(experiment.flat.gate).toBe("lib/schgen/elk/adapt.ts (spec 1.4's realization contract)")
    expect(experiment.flat.refusal).toContain("the junctions the sheet emitter would place disagree")
    expect(experiment.flat.refusal).toContain("in 2 place(s)")
    expect(experiment.flat.refusal).toContain("net COLLECTOR branches at (39.37, 111.76) (t-junction)")
    // AND THE PER-BLOCK SIDE IS NOT REFUSED, which is what makes the line above a statement about
    // the flat graph rather than about this subject being undrawable.
    expect(experiment.composed.ok).toBe(true)
    expect(experiment.flatBackendOutput.ok, "the pre-gate figures are still taken").toBe(true)
  })

  /**
   * **THE COMPOSED SIDE, AND FIVE OF ITS SIX COUNTS ARE THE TERMWISE SUM OF THE SIX BLOCKS.** The
   * six blocks cross 0, 0, 0, 0, 0 and 11, run 64, 54, 54, 27, 45 and 512 grid steps, bend 5, 5,
   * 5, 5, 5 and 30, emit 11, 11, 11, 10, 11 and 67 segments and hold 3, 3, 3, 2, 2 and 16
   * placements; the composed drawing reports 11, 756, 55, 121 and 29. Seam B therefore adds no
   * crossing and no wire - which is the next test, taken as a difference rather than asserted.
   *
   * **EVERY ONE OF THOSE PER-BLOCK TERMS IS REPORTED BY A DIFFERENT DRIVER TOO**, which is what
   * makes the sums a check rather than an arrangement of one output: `tools/schgen/remeasure.ts`'s
   * twelve-row table in step 1 gives the same bends, crossings and lengths, and
   * `tests/schgen/readability/measures.test.ts` gives the same canonical segment counts.
   *
   * **`occupiedArea` IS THE ONE FIGURE THAT IS NOT A SUM, and that is by construction**: it is the
   * bounding box of the composition, 15 748 against the blocks' own 440 + 360 + 360 + 208 + 182 +
   * 3905 = 5455, because the packer leaves gaps between six frames. `aspect` is a ratio of that
   * box and is not a sum either. Both are reported as what they are.
   */
  it("has a COMPOSED side whose crossings are exactly the blocks' own", () => {
    expect(experiment.composed.ok).toBe(true)
    if (!experiment.composed.ok) return
    const f = experiment.composed.figures
    expect(f.placements).toBe(29)
    expect(f.wires).toBe(121)
    expect(f.nets).toBe(16)
    expect(f.measures.wireLength).toBe(756)
    expect(f.measures.bends).toBe(55)
    expect(f.measures.crossings).toBe(11)
    expect(f.measures.occupiedArea).toBe(15_748)
    expect(f.aspect?.toFixed(2)).toBe("1.02")
    // The per-block figures the composed total is made of, named so the sums below are checkable.
    expect(experiment.perBlock.map((b) => `${b.id} crossings=${b.figures.measures.crossings} len=${b.figures.measures.wireLength} bends=${b.figures.measures.bends} wires=${b.figures.wires} placements=${b.figures.placements}`)).toEqual([
      "tp-leg-feedback crossings=0 len=64 bends=5 wires=11 placements=3",
      "tp-leg-lower-a crossings=0 len=54 bends=5 wires=11 placements=3",
      "tp-leg-lower-b crossings=0 len=54 bends=5 wires=11 placements=3",
      "tp-leg-collector crossings=0 len=27 bends=5 wires=10 placements=2",
      "tp-leg-emitter-bypass crossings=0 len=45 bends=5 wires=11 placements=2",
      "tp-stage crossings=11 len=512 bends=30 wires=67 placements=16",
    ])
    expect(0 + 0 + 0 + 0 + 0 + 11).toBe(f.measures.crossings)
    expect(64 + 54 + 54 + 27 + 45 + 512).toBe(f.measures.wireLength)
    expect(5 + 5 + 5 + 5 + 5 + 30).toBe(f.measures.bends)
    expect(11 + 11 + 11 + 10 + 11 + 67).toBe(f.wires)
    expect(3 + 3 + 3 + 2 + 2 + 16).toBe(f.placements)
    // The one that is NOT a sum, asserted as not one so the pattern above cannot be over-read.
    expect(440 + 360 + 360 + 208 + 182 + 3905).not.toBe(f.measures.occupiedArea)
  })

  it("measures seam B adding NO crossing and NO wire, which is G208 re-taken", () => {
    expect(experiment.interBlockCrossings).toBe(0)
    expect(experiment.interBlockWireLength).toBe(0)
    expect(experiment.frameOverlaps).toEqual([])
  })

  /**
   * **THE STAGE-MATCHED COMPARISON, AND ITS SIGN HAS REVERSED BACK: 26 crossings FLAT against 11
   * in the BLOCKS.** Both sides here are the pre-snap canonical topology of what `elkjs` emitted,
   * so their difference is attributable to the decomposition rather than to the stage.
   *
   * **THE SIGN HAS NOW CHANGED TWICE AND BOTH TIMES WITH THE SUBJECT, which is what makes it a
   * statement about subjects rather than about decomposition.** On `transistor-preamp`'s five legs
   * it read 6 flat against 6 in blocks - free; on `optical-compressor` it read 4 against 6, so
   * decomposition COST two crossings (`docs/known-gaps.md` **G292**); on this subject it reads 26
   * against 11, so decomposition SAVES fifteen. **Three subjects, three signs. Nothing here
   * concludes a direction for decomposition in general**, and the spike's own 6.1x is still
   * NOT-COMPARABLE on this subject for the reasons `comparabilityOf` gives.
   *
   * The wire figures go the same way: 1287.22 grid steps flat against 751.40 summed, so the flat
   * graph draws 535.82 more wire as well as crossing fifteen times more. Bends are nearly level at
   * 61 against 55.
   *
   * **AND `crossingRatio` IS `null`, WHICH IS THE PRICE OF THE FLAT REFUSAL and is asserted as
   * null rather than recomputed from the backend-output figures.** `integratedExperiment` forms
   * the ratio from the ACCEPTED flat side, and that side refuses at obligation 2. Taking 26/11
   * from this test's own numbers instead would publish a ratio the module does not compute, at a
   * stage the ratio was never defined for.
   */
  it("is 26 crossings flat against 11 in blocks, and 1287.22 grid steps against 751.40", () => {
    expect(experiment.flatBackendOutput.ok).toBe(true)
    if (!experiment.flatBackendOutput.ok) return
    expect(experiment.flatBackendOutput.figures.measures.crossings).toBe(26)
    expect(experiment.flatBackendOutput.figures.measures.wireLength.toFixed(2)).toBe("1287.22")
    expect(experiment.flatBackendOutput.figures.measures.bends).toBe(61)
    expect(experiment.perBlockBackendOutput.reduce((n, b) => n + b.figures.measures.crossings, 0)).toBe(11)
    expect(experiment.perBlockBackendOutput.reduce((n, b) => n + b.figures.measures.wireLength, 0).toFixed(2)).toBe("751.40")
    expect(experiment.perBlockBackendOutput.reduce((n, b) => n + b.figures.measures.bends, 0)).toBe(55)
    // The blocks' side of this comparison is the SAME crossing total the accepted stage reports -
    // five zeros and tp-stage's eleven - so the pre-snap and post-snap readings of the decomposed
    // side agree, and the whole of the disagreement above is on the flat side.
    expect(experiment.perBlockBackendOutput.map((b) => b.figures.measures.crossings)).toEqual([0, 0, 0, 0, 0, 11])
    // The ratio has no numerator while the flat side refuses, and that is reported as null rather
    // than substituted from the figures above.
    expect(experiment.crossingRatio).toBeNull()
    expect(SPIKE_CROSSING_RATIO).not.toBeNull()
    // And the three not-comparable measures are still not-comparable: a matching subject does not
    // make a matching frontend.
    expect(comparabilityOf("bends")).toBe("not-comparable")
    expect(comparabilityOf("bendsPerEdge")).toBe("not-comparable")
    expect(comparabilityOf("wireLength")).toBe("not-comparable")
  })
})

describe("ruling R46: what stands between 8 of 12 blocks drawing and more", () => {
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
   * room the labels needed is reserved before the circuit is packed. **All six are still absent.**
   *
   * **AND FOUR NEW CLASSES ARRIVED ON 2026-10-26, EVERY ONE OF THEM A POWER SYMBOL'S VALUE TEXT**
   * (`docs/known-gaps.md` **G296**). `classOf` refused all four on the first run after the star
   * landed, which is the whitelist-that-throws firing on real data for the second time in this
   * module's life. They are `power-value-wire-overlap`, `power-value-body-overlap`,
   * `power-value-graphic-overlap` and `power-value-pin-overlap`, and `ob-buffer`'s old
   * `power-value-overlap` - value over value - is gone because `ob-buffer` now DRAWS.
   *
   * **SEVEN OF THE ELEVEN PROBLEMS IN THE CORPUS ARE ONE TEXT ON ONE BLOCK**, which is the single
   * most useful line in this census: `oc-power`'s `+9V_PROTECTED 1 at (33.02, 52.07)` is party to
   * all seven of its rows, against a wire, two bodies and four graphics. `oc-audio` has one text
   * against two wires and `tp-leg-upper` one text against a wire and a pin. **So the leverage is
   * three TEXTS, not eleven problems**, and the class counts below must be read with that: a
   * `partialBlocker` list of one block repeated across three classes is three obstacles under one
   * piece of text.
   *
   * **THE ONE THING THIS CENSUS STILL CANNOT SEE is a fallback field's own overlaps**, which
   * `textProblems` does not report by design (`render/text-scene.ts`'s `Named.fallback`): they are
   * carried by the `FieldFallback` records instead, counted per unit in
   * `tests/schgen/masked-problems.test.ts` and printed in every generation's `RENDER-REPORT.md`.
   * `docs/known-gaps.md` **G232**, **G257**, **G258**, **G260**, **G291**.
   */
  it("classifies every checkLayout problem of every declared block", () => {
    expect(renderCoverage(coverage)).toEqual([
      "ob-buffer DRAWS",
      "oc-power refused at obligation 4: checkLayout problems power-value-wire-overlap, power-value-body-overlap, power-value-body-overlap, power-value-graphic-overlap, power-value-graphic-overlap, power-value-graphic-overlap, power-value-graphic-overlap",
      "oc-audio refused at obligation 4: checkLayout problems power-value-wire-overlap, power-value-wire-overlap",
      "oc-sidechain refused at obligation 3: one transform, two readers",
      "pt-core DRAWS",
      "tp-leg-upper refused at obligation 4: checkLayout problems power-value-wire-overlap, power-value-pin-overlap",
      "tp-leg-feedback DRAWS",
      "tp-leg-lower-a DRAWS",
      "tp-leg-lower-b DRAWS",
      "tp-leg-collector DRAWS",
      "tp-leg-emitter-bypass DRAWS",
      "tp-stage DRAWS",
      "8 of 12 declared blocks draw",
      "class power-value-body-overlap: sole blocker of 0 block(s) (none), partial blocker of 1 (oc-power)",
      "class power-value-graphic-overlap: sole blocker of 0 block(s) (none), partial blocker of 1 (oc-power)",
      "class power-value-pin-overlap: sole blocker of 0 block(s) (none), partial blocker of 1 (tp-leg-upper)",
      "class power-value-wire-overlap: sole blocker of 1 block(s) (oc-audio), partial blocker of 2 (oc-power, tp-leg-upper)",
    ])
  })

  it("reports FOUR problem classes in the whole corpus, all of one text kind, and names the four blocks that do not draw", () => {
    // **THE DEFECT THAT CARRIED THIS DESCRIBE's NAME IS GONE FROM THE CENSUS ENTIRELY.** It is
    // asserted as absent rather than as zero: `leverageOf` lists a class only when some block
    // reported it, so `undefined` IS the measurement, and a class that still blocked a block
    // partially would come back defined and fail here.
    expect(leverageOf(coverage).find((l) => l.problemClass === "field-placement")).toBeUndefined()
    expect(coverage.filter((r) => r.draws).length).toBe(8)
    // **TASK 22's CEILING OF `5 + 2` IS SUPERSEDED, and it is asserted as superseded rather than
    // quietly dropped**: it was a bound on field placement, and three blocks drew past it by a
    // different mechanism. A test that still said `5 + 2` would now be wrong in a way that read
    // as a regression. It is still exceeded at 8, by one block rather than by three.
    expect(5 + 2).toBeLessThan(coverage.filter((r) => r.draws).length)
    // The SIX classes that left the census, asserted as absent by name, so a block that started
    // reporting one again fails here saying which.
    for (const gone of [
      "body-label-overlap", "label-body-overlap", "label-graphic-overlap",
      "label-label-overlap", "label-pin-text-overlap", "label-wire-overlap",
    ]) {
      expect(leverageOf(coverage).find((l) => l.problemClass === gone), gone).toBeUndefined()
    }
    // **AND THE ONE THAT USED TO REMAIN IS ALSO GONE, which is a gain and is asserted as one:**
    // `power-value-overlap` - value over value - was `ob-buffer`'s sole blocker, and `ob-buffer`
    // draws. So no class in this census is a value over another value any more.
    expect(leverageOf(coverage).find((l) => l.problemClass === "power-value-overlap")).toBeUndefined()
    // The four that are here, in `leverageOf`'s sorted order. EVERY ONE begins `power-value`,
    // which is the single-class claim this test makes and is stronger than the list.
    expect(leverageOf(coverage).map((l) => l.problemClass)).toEqual([
      "power-value-body-overlap", "power-value-graphic-overlap", "power-value-pin-overlap", "power-value-wire-overlap",
    ])
    expect(leverageOf(coverage).every((l) => l.problemClass.startsWith("power-value-"))).toBe(true)
    // Only ONE of the four is any block's SOLE blocker, which is the leverage R46 asks for: fixing
    // a power symbol's value over a wire alone would unblock `oc-audio` and nothing else.
    expect(leverageOf(coverage).filter((l) => l.soleBlocker.length > 0).map((l) => `${l.problemClass} ${l.soleBlocker.join(",")}`)).toEqual([
      "power-value-wire-overlap oc-audio",
    ])
    // And the four blocks that do not draw, named: three refused at checkLayout and one before it.
    expect(coverage.filter((r) => !r.draws).map((r) => r.block)).toEqual(["oc-power", "oc-audio", "oc-sidechain", "tp-leg-upper"])
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
   * **IT WAS TWO BLOCKS UNTIL 2026-10-25 AND IS ONE SINCE** (**G291**): `oc-audio` was refused at
   * obligation 1 - *"the snap collapsed geometry"* - and is now refused at obligation 4 instead,
   * so it carries classes either way and is not the early-refusal subject.
   *
   * **THE CONTROL CHANGED HANDS ON 2026-10-26 AND IS NOW STRONGER RATHER THAN WEAKER** (**G296**).
   * It used to rest on `ob-buffer`, the one other non-drawing block; `ob-buffer` draws, and the
   * contrast is now against THREE non-drawing blocks that all report classes - `oc-power`,
   * `oc-audio` and `tp-leg-upper`. So "no classes" stays distinguishable from "not refused here",
   * on three subjects instead of one.
   */
  it("leaves the one block refused at an earlier obligation with no problem classes at all", () => {
    const earlier = coverage.filter((r) => !r.draws && r.problemClasses.length === 0)
    expect(earlier.map((r) => `${r.block} ${r.gate}`)).toEqual([
      "oc-sidechain obligation 3: one transform, two readers",
    ])
    // The control: the other blocks that do not draw all report classes, so an empty list is a
    // statement about WHERE a block was refused and not about whether anything is wrong with it.
    const others = coverage.filter((r) => !r.draws && r.block !== "oc-sidechain")
    expect(others.map((r) => `${r.block} ${r.problemClasses.length}`)).toEqual([
      "oc-power 7", "oc-audio 2", "tp-leg-upper 2",
    ])
    expect(others.every((r) => r.problemClasses.length > 0)).toBe(true)
    // And `ob-buffer`, which was this control's subject, draws - asserted so the change of subject
    // reads as a measurement rather than as a quietly rewritten assertion.
    expect(coverage.find((r) => r.block === "ob-buffer")?.draws).toBe(true)
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
 *
 * **AND SINCE 2026-10-26 THE SUBJECT IS THREE LEGS, NOT FOUR: `tp-leg-upper` DOES NOT DRAW.**
 * `edgesForNet`'s star (`docs/known-gaps.md` **G293**, **G296**) puts its `VCC` power symbol's
 * VALUE text on `wire 9` and on `pin R1.1`, so the §1.4 clearance gate refuses it and it has no
 * accepted geometry at all. The row for it below is its REFUSAL, asserted by name, because a table
 * that silently went from four rows to three is how a measurement comes to be taken over a
 * different population than the claim it carries. **G296** records what that costs the formula
 * refutation in the third test of this describe; it is a real loss and it is not papered over here.
 */
describe("step 6: congruence, WITH the rail glyphs the instances actually get", () => {
  /**
   * **THE REFUSED LEG IS NAMED AND ITS REFUSAL IS PINNED**, so "three legs" cannot be read as
   * "the measurement is over the congruent set" and so a leg that silently rejoined or left the
   * set fails here rather than changing a table's length.
   */
  it("measures three of the four congruent legs and names the refusal of the fourth", () => {
    expect(legs.refused.map((r) => r.block)).toEqual(["tp-leg-upper"])
    expect(legs.refused[0]?.refusal).toContain("value of power symbol VCC 0 at (17.78, 6.35) overlaps wire 9 of tp-leg-upper (UPPER_JUMPED)")
    expect(legs.refused[0]?.refusal).toContain("value of power symbol VCC 0 at (17.78, 6.35) overlaps pin R1.1")
    expect(legs.shapes.map((l) => l.block)).toEqual(["tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b"])
  })

  it("gives the two -lower legs identical placements and the other one its own", () => {
    const [feedback, lowerA, lowerB] = legs.shapes
    expect(feedback).toBeDefined()
    // **EVERY `floor` IS AT ROTATION 90 AND EVERY `jumper` IS AT 180**, which is the two
    // orientation rules of this plan visible in one line. `floor` is the only two-terminal passive
    // in these legs with NO rail end - the trim's wiper side carries the rail - so it is the only
    // part `signalAxis` answers for, and it answers 90: pins left and right, axis along the
    // reading direction (`docs/known-gaps.md` **G292**).
    //
    // **THE JUMPER'S 180 IS THE SWITCH RULE REACHING A PART NOBODY MEANT IT TO REACH, and it is
    // asserted here rather than left as a coordinate shift** (**G296**).
    // `circuits/transistor-preamp/parts.ts`'s `jumper()` declares `kind: "switch"` - it is a
    // two-pin header with a shunt, modelled as a switch because that is what it electrically is -
    // so `switchFacesItsBank` turns it, although a two-pin jumper has no throws and no bank and
    // the rule's own reasoning says nothing about it. The trims keep rotation 0.
    expect(legs.shapes.map((l) => l.placements.filter((p) => p.endsWith("@90")).length), "one rotated part per leg").toEqual([1, 1, 1])
    expect(legs.shapes.every((l) => l.placements.some((p) => p.startsWith("floor#1@") && p.endsWith("@90"))), "and it is floor").toBe(true)
    expect(legs.shapes.every((l) => l.placements.some((p) => p.startsWith("jumper#1@") && p.endsWith("@180"))), "and every jumper is turned").toBe(true)
    expect(feedback?.placements).toEqual(["jumper#1@7620,6350@180", "floor#1@36830,2540@90", "trim#1@60960,7620@0"])
    expect(lowerA?.placements).toEqual(["jumper#1@7620,6350@180", "floor#1@30480,2540@90", "trim#1@48260,7620@0"])
    // THE SURVIVING CONGRUENCE, and it is a pair of DIFFERENT parts drawing alike.
    expect(lowerB?.placements, "the two -lower legs").toEqual(lowerA?.placements)
    // The other one differs from it, asserted so "congruent" cannot quietly come back meaning three.
    expect(feedback?.placements).not.toEqual(lowerA?.placements)
    // THE ANCHOR POSITIONS NO LONGER COINCIDE EITHER. One of the two is the same on all three -
    // (17780, 6350), the first-layer boundary - and the other moved with the block's own width,
    // which is what a wider reserved label does to a LAST_SEPARATE node's position. **The shared
    // position was (17780, 1270) and the move to (17780, 6350) is the STAR's, which was measured
    // rather than reasoned**: `[RAN]` these three legs on a tree with the star reverted and both
    // orientation rules kept, and the shared anchor is still at (17780, 1270) with the jumpers at
    // 180 - so turning the jumper did not move it (**G296**).
    const positions = (leg: LegShape): readonly string[] =>
      leg.anchors.map((a) => a.slice(a.indexOf("@") + 1).split("/")[0] ?? "").sort()
    expect(legs.shapes.every((l) => positions(l).includes("17780,6350")), "the first-layer anchor").toBe(true)
    expect(legs.shapes.map((l) => positions(l).filter((p) => p !== "17780,6350").join(""))).toEqual([
      "71120,7620", "58420,7620", "58420,7620",
    ])
  })

  it("gives two of the three a rail glyph and one of them NONE, which is G97's breaking condition", () => {
    // The rail-glyph pattern is the CLAIM here and it is unmoved by either orientation rule or by
    // the star - `powers` on the two `-lower` legs, `none` on `-feedback`, same nets, same sides.
    // Only the positions moved, and those are a record.
    expect(legs.shapes.map((l) => `${l.block} powers=${l.powers.join("|") || "none"} labels=${l.labels.join("|")}`)).toEqual([
      "tp-leg-feedback powers=none labels=COLLECTOR@17780,6350/right|BASE@71120,7620/right",
      "tp-leg-lower-a powers=GND/power:GND@58420,7620@0 labels=BASE@17780,6350/right",
      "tp-leg-lower-b powers=GND/power:GND@58420,7620@0 labels=BASE@17780,6350/right",
    ])
    expect(legs.shapes.filter((l) => l.powers.length === 0).map((l) => l.block)).toEqual(["tp-leg-feedback"])
    // AND THE LEG WHOSE RAIL GLYPH IS WHAT REFUSED IT IS THE ONE MISSING FROM THE TABLE, which is
    // the connection between this test and the one above: `tp-leg-upper` is the only leg whose
    // INBOUND boundary is a power symbol, and a power symbol's value text is what the gate caught.
    expect(legs.refused.map((r) => r.block)).toEqual(["tp-leg-upper"])
  })

  /**
   * **THE TWO-STEP REFUTATION OF THE SKIN'S FORMULA HAS LOST ITS SUBJECT, AND NOT ONE OF ITS
   * NUMBERS MOVED. That distinction is the whole content of this comment.**
   *
   * The refutation this test carried needed THREE distinct displacements, so that two consecutive
   * steps could be compared: from `-upper` to `-lower` the formula moves 12 px and the measurement
   * moved 13 grid steps, and from `-lower` to `-feedback` 6 px against 10. **13/12 is not 10/6**,
   * so no single factor carried the prediction onto the measurement.
   *
   * **`[RAN]` THE THREE TREES AND `jumperToTrim.dx` IS INVARIANT ACROSS ALL OF THEM:** 19, 42, 32,
   * 32 at the last green state, 19, 42, 32, 32 with both orientation rules added, and 19, 42, 32,
   * 32 with the star on top (`docs/known-gaps.md` **G296**). The `dy` moved - 4, then 9 with the
   * jumper turned, then 1 with the star - and the dx did not move at all. **So the refutation did
   * not weaken: `tp-leg-upper` stopped DRAWING, and with it went the 13/12 term.**
   *
   * **WHAT IS LEFT AND WHAT IT CAN AND CANNOT SAY, stated rather than quietly carried on:**
   *
   * - with two distinct predicted values (125 and 119) and two measured (42 and 32), an AFFINE
   *   relation cannot be refuted - two points always admit one - so the step comparison above is
   *   **gone, not narrowed**, and nothing here pretends otherwise;
   * - a pure PROPORTIONALITY still can be, and is: 42/125 = 0.336 against 32/119 = 0.269. That is
   *   a weaker claim than the one it replaces and it is asserted as the weaker claim it is.
   *
   * **WHAT WOULD BRING THE STRONGER FORM BACK** is `tp-leg-upper` drawing again, which is G296's
   * subject and not this test's; the three legs' own figures need no re-derivation when it does,
   * because they did not move.
   */
  it("measures a spread that 6*len(id)+5 does not predict proportionally, over the three legs that draw", () => {
    expect(legs.shapes.map((l) => l.predictedX)).toEqual([125, 119, 119])
    expect(skinIdWidth("upper_bias_jumper")).toBe(107)
    expect(skinIdWidth("feedback_bias_jumper")).toBe(125)
    expect(legs.shapes.map((l) => l.jumperToTrim)).toEqual([{ dx: 42, dy: 1 }, { dx: 32, dy: 1 }, { dx: 32, dy: 1 }])
    expect(new Set(legs.shapes.map((l) => l.predictedX)).size).toBeGreaterThan(1)
    // TWO distinct displacements over three legs, where the four-leg subject gave three. The count
    // is asserted because it is exactly what the lost refutation needed one more of.
    expect(new Set(legs.shapes.map((l) => l.jumperToTrim?.dx)).size).toBe(2)
    // The VERTICAL displacement is the same on all three, and it is asserted as a shared value
    // rather than left in the table: the three parts of every leg sit ONE grid step apart in y,
    // which is the star's doing - it was 4 before either change and 9 with the jumper turned.
    expect(new Set(legs.shapes.map((l) => l.jumperToTrim?.dy)).size).toBe(1)
    expect(legs.shapes[0]?.jumperToTrim?.dy).toBe(1)
    // THE SURVIVING CLAIM: the measurement is not a PROPORTIONAL image of the prediction, because
    // the two ratios differ. It cannot rule out an affine one, and the comment above says so.
    const [feedback, lowerA] = legs.shapes
    const ratio = (l: LegShape | undefined): number => (l?.jumperToTrim?.dx ?? 0) / (l?.predictedX ?? 1)
    expect([ratio(feedback).toFixed(3), ratio(lowerA).toFixed(3)]).toEqual(["0.336", "0.269"])
    expect(ratio(feedback)).not.toBe(ratio(lowerA))
  })
})

describe("step 7: disjointness at sheet level, over Task 15's packing", () => {
  /**
   * **THE CRITERION IS `inside=0` ON EVERY ROW AND IT IS UNMOVED; THE BOXES MOVED AND ONE ROW IS
   * GONE.** `tp-leg-upper` no longer draws (`docs/known-gaps.md` **G296**), so it has no extent to
   * take, and the other six boxes all changed under the star and the two orientation rules -
   * `-feedback` 55x14 to 55x8, both `-lower` legs 45x14 to 45x8, `-collector` 13x17 to 13x16,
   * `-emitter-bypass` 13x15 to 13x14, `tp-stage` 74x50 to 55x71. **Five of the six got SHORTER and
   * `tp-stage` got NARROWER AND TALLER**, which is the star's layering doing the opposite of what
   * a left-to-right arrangement is for on the one block big enough to show it.
   *
   * **EACH BOX IS CROSS-CHECKED AGAINST A DIFFERENT FUNCTION, so these are not six numbers read
   * off one output.** `w * h` is exactly the `occupiedArea`
   * `tests/schgen/readability/measures.test.ts` takes through `measuresOf` for the same block -
   * 440, 360, 360, 208, 182, 3905 - and the two are computed by `anchorExtent` and by
   * `measuresOf` respectively.
   *
   * **AND THE PERCENTAGE IS DERIVED, NOT MEASURED.** It is the box's area over A3's USABLE area,
   * which is `(420 - 2*12.7) x (297 - 2*12.7 - 38.1)` mm = 310.709 x 183.858 grid steps =
   * 57 126.36 sq. So 440 / 57 126.36 = 0.77%, 360 -> 0.63%, 208 -> 0.36%, 182 -> 0.32%,
   * 3905 -> 6.84%, every one to the printed digit. The denominator did not move.
   */
  it("puts no non-member inside any block's own extent, and overlaps no frame under either packer", () => {
    expect(groups.blocks.map((b) => `${b.block} ${b.members} members ${b.box.w}x${b.box.h} ${(100 * b.ofCanvas).toFixed(2)}% inside=${b.nonMembersInside.length}`)).toEqual([
      "tp-leg-feedback 3 members 55x8 0.77% inside=0",
      "tp-leg-lower-a 3 members 45x8 0.63% inside=0",
      "tp-leg-lower-b 3 members 45x8 0.63% inside=0",
      "tp-leg-collector 2 members 13x16 0.36% inside=0",
      "tp-leg-emitter-bypass 2 members 13x14 0.32% inside=0",
      "tp-stage 16 members 55x71 6.84% inside=0",
    ])
    // The criterion, asserted as the criterion rather than only inside the strings above.
    expect(groups.blocks.every((b) => b.nonMembersInside.length === 0)).toBe(true)
    // Each box's area against the figure measures.test.ts takes by a different function.
    expect(groups.blocks.map((b) => b.box.w * b.box.h)).toEqual([440, 360, 360, 208, 182, 3905])
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
    const drawing = layoutSheet(signal.circuit, "signal", signal.symbols, FLAG_LIB_ID, signal.elk, { paper: sheetOf(signal.circuit, "signal").paper, packing })
    expect(nonMemberContainments(signal.circuit, drawing)).toEqual([])
    const huge = {
      ...drawing,
      frames: drawing.frames.map((f, i) => (i === 0 ? { ...f, box: { minX: -1e9, minY: -1e9, maxX: 1e9, maxY: 1e9 } } : f)),
    }
    expect(nonMemberContainments(signal.circuit, huge).length).toBeGreaterThan(0)
  })

  /**
   * **`transistor-preamp`'s OWN DECLARED SHEET REFUSES AGAIN, AND G211's REFUTATION IS ITSELF
   * REFUTED. The reading taken here for one day is GONE, and that is this test's whole content.**
   *
   * The history, because three states in three days is the finding:
   *
   * 1. originally this test was *"cannot take the same reading on transistor-preamp's own sheet,
   *    and refuses rather than skipping"*, asserting `layoutSheet` THROWS because **G211**'s
   *    *"two of its seven blocks do not draw"*;
   * 2. boundary-node sizing (**G291**) drew all seven, the `lab` sheet composed on its declared A3,
   *    and the test took the reading - 7 frames, 131 wires, 29 non-members under the grown frame.
   *    **It was the first parity circuit whose own declared sheet composed**;
   * 3. `edgesForNet`'s star (**G293**, **G296**) stops `tp-leg-upper` drawing, and `sheetContents`
   *    refuses a sheet holding a block that cannot be realised - so the sheet refuses for exactly
   *    G211's reason, with one block instead of two.
   *
   * **SO NOT ONE PARITY CIRCUIT HAS A COMPOSABLE DECLARED SHEET AGAIN**, and
   * `tests/schgen/__fixtures__/composed.ts`'s header - *"not one of the four circuits has a sheet
   * that can be composed at all"* - is true once more. The 131-wire reading and the 29
   * non-members are recorded in **G296** rather than deleted, because they are what a fix to
   * `tp-leg-upper` should bring back.
   *
   * **THE BOARD CENSUS AGREES, BY A DIFFERENT DRIVER:** `bun tools/schgen/board-sheets.ts` refuses
   * `transistor-preamp-lab` with this same refusal text, so this is not an artefact of the probe.
   */
  it("cannot take the reading on transistor-preamp's own declared sheet again, and refuses rather than skipping", () => {
    expect(probe.drew.length).toBe(6)
    expect(probe.refused.map((r) => r.id).sort()).toEqual(["tp-leg-upper"])
    // THE REFUSAL IS ASSERTED WITH THE BLOCK AND THE OBLIGATION IN IT, so a sheet that started
    // refusing for some other reason fails here rather than passing as "still refused".
    expect(() => layoutSheet(probe.circuit, "lab", probe.symbols, FLAG_LIB_ID, probe.elk)).toThrow(/block tp-leg-upper/)
    expect(() => layoutSheet(probe.circuit, "lab", probe.symbols, FLAG_LIB_ID, probe.elk)).toThrow(
      /value of power symbol VCC 0 at \(17\.78, 6\.35\) overlaps wire 9 of tp-leg-upper/,
    )
    // AND THE CHECK COULD PASS: `mini`'s sheet in the test above lays out through the same
    // `layoutSheet`, so a throw here is a statement about this sheet and not about the function.
    expect(probe.drew.length).toBeGreaterThan(0)
  })
})
