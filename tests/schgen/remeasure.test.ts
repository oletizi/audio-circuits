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
   * **NINE OF THE TWELVE DECLARED BLOCKS DRAW SINCE 2026-10-26, AND THE ONE THAT REJOINED IS
   * `tp-leg-upper`, WITH A SINGLE ATTRIBUTABLE CAUSE** (`docs/known-gaps.md` **G297**). It was 5,
   * then 7 at field placement, then 10 at boundary-node sizing (**G291**), then 8 under the star
   * and the two 180 rules (**G296**).
   *
   * `[RAN]` the census on four trees, with each change rolled back on its own and the
   * both-rolled-back tree as the control that the probe reproduces the last green state exactly:
   *
   * | tree | draws | the set |
   * | --- | --- | --- |
   * | chain, no 180 (control) | **10 of 12** | the ten this table held until 2026-10-26 |
   * | chain + the two 180 rules | **8 of 12** | loses `pt-core` and `tp-stage` |
   * | star + no 180 | **7 of 12** | loses `oc-audio`, `pt-core`, `tp-leg-upper` |
   * | star + the two 180 rules | **8 of 12** | loses `oc-power`, `oc-audio`, `tp-leg-upper`; gains `ob-buffer` |
   * | the same, with the 180 declined where it cannot move a pin's side | **9 of 12** | `tp-leg-upper` rejoins |
   *
   * **NEITHER OF THE FIRST TWO CHANGES IS AN IMPROVEMENT ON ITS OWN AND THE TWO INTERACT, which is
   * the finding that survives.** `pt-core` is lost by EITHER change alone and drawn by both
   * together; `oc-power` is lost by NEITHER alone and by both together. So no row of the first four
   * can be attributed to one change, and nothing here claims one.
   *
   * **THE LAST ROW IS THE EXCEPTION AND ITS ATTRIBUTION IS EXACT, which is why it is worth having.**
   * `switchFacesItsBank` declines the turn where 180 cannot change which side any pin faces, so
   * `JP1` - `Jumper:Jumper_2_Open`, one end on `VCC` - stops being turned 180 and takes the rail
   * entry's 270 instead. `tp-leg-upper` holds exactly three parts and `JP1` is one of them, so
   * the re-placement is the whole of the change, and the block's refusal was ONE power symbol's
   * value text over its own `wire 9 (UPPER_JUMPED)` and `pin R1.1`. At 270 the `VCC` glyph lands
   * at `(8.89, 1.27)` and the overlap is gone. **Its topology did NOT move** - `bends 5`,
   * `perEdge 0.83`, `crossings 0`, the same three figures it reported at the backend-output stage -
   * so what moved is the STAGE the row is taken at, which is the "re-packed rather than re-routed"
   * signature **G291** names.
   *
   * **ALL THREE REMAINING REFUSALS ARE ONE DEFECT CLASS AND IT IS NOT A NEW ONE.** `oc-power` and
   * `oc-audio` each refuse at `checkLayout` on ONE power symbol's VALUE text drawn over the
   * block's own parts, wires or pins - **G262**'s class, whose power-symbol half that entry records
   * as never having been re-driven. `oc-sidechain` refuses at obligation 3 as it has throughout,
   * where `elkjs` returns a port coordinate that disagrees with the pin end recomputed from the
   * placement.
   */
  it("is 9 accepted and 3 refused, and names the gate that refused each", () => {
    expect(rows.map((r) => `${r.block} ${r.geometry.stage}${r.geometry.refusal === null ? "" : ` ${gateOf(r.geometry.refusal)}`}`)).toEqual([
      "ob-buffer accepted",
      "oc-power backend-output obligation 4: checkLayout",
      "oc-audio backend-output obligation 4: checkLayout",
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
    expect(rows.filter((r) => r.geometry.stage === "accepted").length).toBe(9)
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
   * **ONE COLUMN SPLIT THE CORPUS EXACTLY IN TWO BY SIZE AND IT IS WORTH NAMING: `aspect`,**
   * which is `box.w / box.h`. It **FELL on all six blocks holding more than three placements** -
   * `ob-buffer` 1.62 to 0.75, `oc-power` 2.21 to 0.64, `oc-audio` 3.64 to 0.91, `oc-sidechain`
   * 3.34 to 0.79, `pt-core` 2.06 to 0.46, `tp-stage` 1.48 to 0.77 - and **ROSE on all six holding
   * three or fewer**: `tp-leg-feedback` 3.93 to 6.88, both `-lower` legs 3.21 to 5.63,
   * `tp-leg-upper` 1.88 to 3.98, `-collector` 0.76 to 0.81, `-emitter-bypass` 0.87 to 0.93. **Six
   * and six, with the cut exactly at the placement count**, which was asserted as an
   * observation and not explained: every one of the six that fell went from wider-than-tall to
   * taller-than-wide, so the six biggest blocks all stopped reading left to right, which is the
   * opposite of what **G292**'s directive asked for. Whether that is better or worse on A3 is the
   * owner's judgement and **G293**'s open criterion, not this file's.
   *
   * **THE SIX-AND-SIX IS NO LONGER A PROPERTY OF THIS TABLE AND IS KEPT AS HISTORY ONLY, which is
   * the honest state of a pattern that held for one day.** `tp-leg-upper`'s `3.98` was a
   * backend-output figure; at the accepted stage it reads **1.39**, so the small-block side of the
   * split now holds a figure that FELL from its own last accepted reading (1.88 to 1.39). The
   * split was over a column mixing two stages, which is exactly why **G296** required the stage to
   * be printed in the row.
   *
   * **EVERY `bends` AND `crossings` FIGURE HERE IS CROSS-CHECKED, which is what keeps this table a
   * measurement.** `tests/schgen/readability/measures.test.ts` takes both quantities through a
   * different driver - `readElkGraph` plus `canonicalTopology` for the pre-snap column, and
   * `measuresOf` over the accepted topology for the nine blocks that draw - and agrees on all
   * twelve: pre-snap `oc-power` 23/2, `oc-audio` 30/9, `oc-sidechain` 46/13; accepted `ob-buffer`
   * 20/6, `pt-core` 85/54, `tp-stage` 30/11 and 5/0 on every leg accepted, `tp-leg-upper` now
   * among them. Each block's `len` and `area` are checked there too, against `shapeMeasures` in
   * micrometres and `anchorExtent` in grid steps.
   *
   * **`tp-leg-upper`'s `area` CARRIES A THIRD READING AND THE THREE AGREE ARITHMETICALLY:** step 7
   * below measures its box as `25x18` grid steps through `disjointness`, and `25 * 18 = 450` is
   * this row's `area` while `25 / 18 = 1.3889` is its `aspect` to the printed digit.
   */
  it("is these twelve rows of figures", () => {
    expect(rows.map(renderRow)).toEqual([
      "ob-buffer parts=9 units=11 placements=11 graphCells=14 ports=3 share=21.4% stage=accepted bends=20 perEdge=0.71 crossings=6 len=293.00 area=2028.00 aspect=0.75 scale=about-a-serialization | no spike row",
      "oc-power parts=8 units=8 placements=8 graphCells=11 ports=3 share=27.3% stage=backend-output bends=23 perEdge=0.96 crossings=2 len=528.50 area=3394.54 aspect=0.64 scale=about-a-serialization | spike oc-power moved",
      "oc-audio parts=12 units=14 placements=14 graphCells=18 ports=4 share=22.2% stage=backend-output bends=30 perEdge=0.79 crossings=9 len=623.21 area=3503.63 aspect=0.91 scale=about-a-serialization | spike oc-audio moved",
      "oc-sidechain parts=17 units=19 placements=19 graphCells=24 ports=5 share=20.8% stage=backend-output bends=46 perEdge=1.00 crossings=13 len=1034.70 area=8623.57 aspect=0.79 scale=about-a-serialization | spike oc-sidechain moved",
      "pt-core parts=24 units=24 placements=24 graphCells=26 ports=2 share=7.7% stage=accepted bends=85 perEdge=1.25 crossings=54 len=1978.00 area=7068.00 aspect=0.46 scale=about-a-serialization | no spike row",
      "tp-leg-upper parts=3 units=3 placements=3 graphCells=5 ports=2 share=40.0% stage=accepted bends=5 perEdge=0.83 crossings=0 len=34.00 area=450.00 aspect=1.39 scale=about-the-circuit | spike leg-upper moved",
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
   * **IT IS G216's FIVE BY NAME SINCE TASK 24, NOT "whatever is accepted today".** Nine blocks
   * are accepted now, and summing all of them would compare a 9-block total against a 5-block
   * table - two different quantities, which is exactly the comparison **G220** names as the
   * failure. The five are named so that the agreement stays an agreement.
   *
   * **ALL FIVE ARE ACCEPTED AGAIN SINCE 2026-10-26** (**G297**). For one day only four were, and
   * the sum was taken over those four with the fifth named rather than dropped; that reading was
   * **199** and it is superseded here rather than deleted, because it is the only figure in this
   * entry's history that is NOT comparable with the others.
   *
   * **G216's WIRE TOTAL HAS NOW MOVED FOUR TIMES: 224, then 298, then 276, then 199 over four
   * rows, and now 233 over the five again.** 233 IS comparable with 276 - same five terms - and
   * **every one of the five fell**: `-upper` 51 to 34, `-feedback` 71 to 64, both `-lower` legs 61
   * to 54, `-collector` 32 to 27. The 199 is comparable with neither, which is what a four-term
   * sum under a five-row heading costs. **The PLACEMENT total is back to 14**: 3 + 3 + 3 + 3 + 2.
   *
   * 233 is cross-checked rather than copied: `tests/schgen/readability/measures.test.ts` takes the
   * same five `len` figures over the canonical topology through a different driver.
   */
  it("reproduces G216's five rows, which is an arithmetic agreement and not a second reading", () => {
    const G216_ROWS = ["tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b", "tp-leg-collector"]
    const five = rows.filter((r) => G216_ROWS.includes(r.block))
    expect(five.length, "G216's five rows are all present as rows").toBe(5)
    // THE SUBJECT IS STILL THE FIVE BY NAME, so a leg that stopped drawing would be named here
    // rather than silently reducing the sum to four terms, which is what happened for one day.
    expect(five.filter((r) => r.geometry.stage !== "accepted").map((r) => r.block)).toEqual([])
    const accepted = five.filter((r) => r.geometry.stage === "accepted")
    expect(accepted.length).toBe(5)
    expect(accepted.reduce((n, r) => n + r.geometry.placements, 0)).toBe(14)
    expect(accepted.reduce((n, r) => n + r.geometry.measures.wireLength, 0)).toBe(233)
    // The total against its own terms, which are the five `len` figures in the table above.
    expect(34 + 64 + 54 + 54 + 27).toBe(233)
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
 * **THE EXPERIMENT'S SUBJECT IS `transistor-preamp`, AND SINCE 2026-10-26 IT IS THE WHOLE CIRCUIT
 * RATHER THAN A SUB-CIRCUIT. THAT IS THE FINDING THIS HEADER CARRIES** (`docs/known-gaps.md`
 * **G297**).
 *
 * - until 2026-10-25 it was `transistor-preamp`'s five drawing legs, by controller ruling **R38**,
 *   because the brief's own subject was unusable: *"all three `oc-*` blocks are among the seven the
 *   post-layout gates refuse, so there is no composed side to measure."*;
 * - boundary-node sizing (`docs/known-gaps.md` **G291**) made all seven `transistor-preamp` blocks
 *   draw, which `integratedExperiment`'s guard refused, so the subject moved to
 *   `optical-compressor` at 2 of 3;
 * - `edgesForNet`'s star (G293) left `optical-compressor` at 0 of 3 - `oc-power` and `oc-audio`
 *   both land a power symbol's VALUE text on their own parts and wires (**G296**) - so the subject
 *   moved back to `transistor-preamp`, at 6 of 7 with `tp-leg-upper` refused;
 * - **`tp-leg-upper` draws again and the subject is now 7 of 7**, which the old guard refused as a
 *   state the experiment *"was not set up for"*.
 *
 * **THE GUARD WAS SPLIT RATHER THAN RELAXED, AND THE HALF THAT WENT WAS REFUSING G105's OWN
 * CRITERION.** That criterion asks for *"an integrated measurement [that] draws one COMPLETE
 * CIRCUIT ... and reports the four measures against the FLAT WHOLE-CIRCUIT baseline"*; R38's
 * sub-circuit was a substitution forced by there being no whole circuit available. "None draw" is
 * still a refusal - there is no composed side at all - and that half is untouched.
 *
 * **WHAT THE WHOLE-CIRCUIT SUBJECT BUYS IS THE THING THREE EARLIER SUBJECTS COULD NOT GET: BOTH
 * SIDES ACCEPTED, AT THE STAGE THE DRAWING IS EMITTED FROM.** On the five legs and on the six the
 * flat probe was refused at obligation 2, so *"the accepted column holds a composed drawing and a
 * refusal"* and only `backend-output` was stage-matched. The seven-block flat probe is ACCEPTED,
 * so `crossingRatio` has a numerator for the first time: **1.91x**, and it is G105's ratio rather
 * than a pre-snap substitute.
 *
 * **THE FLAT PROBE'S OBLIGATION-2 REFUSAL WAS GEOMETRY-CONTINGENT, WHICH IS WORTH MORE THAN THE
 * RATIO.** The six-block probe refused because the canonical topology called a branch of net
 * `COLLECTOR` at (39.37, 111.76) a `t-junction` and the sheet emitter placed none there. Adding
 * `tp-leg-upper`'s three parts to the same probe makes the refusal go away - the branch is placed
 * elsewhere - so **that refusal was never a statement about the T detection in `junctionPoints`
 * being incomplete for this circuit; it was a statement about one layout.** `tests/schgen/
 * remeasure-edges.test.ts` is where the probe's refusals are pinned and **G297** carries this.
 *
 * **EVERY FIGURE BELOW IS A FIRST READING ON THIS SUBJECT AT THIS GEOMETRY, not a moved one**, and
 * the sums are what make them checkable rather than copied: five of the six composed figures are
 * the termwise sum of the seven blocks', each of which is independently reported by
 * `tools/schgen/remeasure.ts`'s own twelve-row table in step 1 of this file.
 */
describe("step 4: the integrated experiment, on transistor-preamp as a WHOLE circuit", () => {
  it("has a FLAT side that is ACCEPTED, so G105's ratio has both its terms for the first time", () => {
    expect(experiment.circuit).toBe("transistor-preamp")
    expect(experiment.blocks).toEqual([
      "tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b", "tp-leg-collector",
      "tp-leg-emitter-bypass", "tp-stage",
    ])
    // NOTHING IS LEFT OUT, so no sub-circuit caveat applies - which is asserted here rather than
    // left to be read off a count, because for three subjects running it meant the opposite.
    expect(experiment.notDrawn.map((n) => n.id)).toEqual([])
    // **THE FLAT SIDE IS THE WHOLE CIRCUIT AND IT IS THE WHOLE CIRCUIT BY COUNT, NOT BY ASSERTION.**
    // Its 32 placements are the twelve-row table's `tp-*` placement figures summed: 3 + 3 + 3 + 3
    // + 2 + 2 + 16. A part belonging to no declared block would break this and not the list above.
    expect(experiment.flat.ok).toBe(true)
    if (!experiment.flat.ok) return
    expect(experiment.flat.figures.placements).toBe(32)
    expect(3 + 3 + 3 + 3 + 2 + 2 + 16).toBe(experiment.flat.figures.placements)
    expect(experiment.flat.figures.wires).toBe(133)
    expect(experiment.flat.figures.nets).toBe(18)
    expect(experiment.flat.figures.measures.crossings).toBe(21)
    expect(experiment.flat.figures.measures.bends).toBe(58)
    expect(experiment.flat.figures.measures.wireLength).toBe(1292)
    expect(experiment.flat.figures.measures.occupiedArea).toBe(8829)
    // The ratio is now computed from the ACCEPTED side on both ends, which is what the module
    // forms it from, and it is 21 / 11 to the printed digit rather than a figure copied out.
    expect(experiment.composed.ok).toBe(true)
    expect(experiment.crossingRatio?.toFixed(2)).toBe("1.91")
    expect((21 / 11).toFixed(2)).toBe("1.91")
    expect(experiment.flatBackendOutput.ok, "the pre-gate figures are still taken").toBe(true)
  })

  /**
   * **THE COMPOSED SIDE, AND FIVE OF ITS SIX COUNTS ARE THE TERMWISE SUM OF THE SEVEN BLOCKS.** The
   * seven blocks cross 0, 0, 0, 0, 0, 0 and 11, run 34, 64, 54, 54, 27, 45 and 512 grid steps,
   * bend 5 six times and 30, emit 11, 11, 11, 11, 10, 11 and 67 segments and hold 3, 3, 3, 3, 2, 2
   * and 16 placements; the composed drawing reports 11, 790, 60, 132 and 32. Seam B therefore adds
   * no crossing and no wire - which is the next test, taken as a difference rather than asserted.
   *
   * **EVERY ONE OF THOSE PER-BLOCK TERMS IS REPORTED BY A DIFFERENT DRIVER TOO**, which is what
   * makes the sums a check rather than an arrangement of one output: `tools/schgen/remeasure.ts`'s
   * twelve-row table in step 1 gives the same bends, crossings and lengths, and
   * `tests/schgen/readability/measures.test.ts` gives the same canonical segment counts.
   *
   * **THE COMPOSED `wires` COUNT IS ONE BELOW THE FLAT PROBE's 133 AND THAT IS NOT A SUM ERROR.**
   * The composed side is seven separately-routed blocks translated into frames and the flat side is
   * one graph; the two agree on `placements` (32) and `nets` (18) because those are properties of
   * the circuit, and differ by one segment because they are two different routings. Nothing here
   * treats the flat side's segment count as a check on the composed one.
   *
   * **`occupiedArea` IS THE ONE FIGURE THAT IS NOT A SUM, and that is by construction**: it is the
   * bounding box of the composition, 20 832 against the blocks' own 450 + 440 + 360 + 360 + 208 +
   * 182 + 3905 = 5905, because the packer leaves gaps between seven frames. `aspect` is a ratio of
   * that box and is not a sum either. Both are reported as what they are.
   */
  it("has a COMPOSED side whose crossings are exactly the blocks' own", () => {
    expect(experiment.composed.ok).toBe(true)
    if (!experiment.composed.ok) return
    const f = experiment.composed.figures
    expect(f.placements).toBe(32)
    expect(f.wires).toBe(132)
    expect(f.nets).toBe(18)
    expect(f.measures.wireLength).toBe(790)
    expect(f.measures.bends).toBe(60)
    expect(f.measures.crossings).toBe(11)
    expect(f.measures.occupiedArea).toBe(20_832)
    expect(f.aspect?.toFixed(2)).toBe("1.35")
    // The per-block figures the composed total is made of, named so the sums below are checkable.
    expect(experiment.perBlock.map((b) => `${b.id} crossings=${b.figures.measures.crossings} len=${b.figures.measures.wireLength} bends=${b.figures.measures.bends} wires=${b.figures.wires} placements=${b.figures.placements}`)).toEqual([
      "tp-leg-upper crossings=0 len=34 bends=5 wires=11 placements=3",
      "tp-leg-feedback crossings=0 len=64 bends=5 wires=11 placements=3",
      "tp-leg-lower-a crossings=0 len=54 bends=5 wires=11 placements=3",
      "tp-leg-lower-b crossings=0 len=54 bends=5 wires=11 placements=3",
      "tp-leg-collector crossings=0 len=27 bends=5 wires=10 placements=2",
      "tp-leg-emitter-bypass crossings=0 len=45 bends=5 wires=11 placements=2",
      "tp-stage crossings=11 len=512 bends=30 wires=67 placements=16",
    ])
    expect(0 + 0 + 0 + 0 + 0 + 0 + 11).toBe(f.measures.crossings)
    expect(34 + 64 + 54 + 54 + 27 + 45 + 512).toBe(f.measures.wireLength)
    expect(5 + 5 + 5 + 5 + 5 + 5 + 30).toBe(f.measures.bends)
    expect(11 + 11 + 11 + 11 + 10 + 11 + 67).toBe(f.wires)
    expect(3 + 3 + 3 + 3 + 2 + 2 + 16).toBe(f.placements)
    // The one that is NOT a sum, asserted as not one so the pattern above cannot be over-read.
    expect(450 + 440 + 360 + 360 + 208 + 182 + 3905).not.toBe(f.measures.occupiedArea)
  })

  it("measures seam B adding NO crossing and NO wire, which is G208 re-taken", () => {
    expect(experiment.interBlockCrossings).toBe(0)
    expect(experiment.interBlockWireLength).toBe(0)
    expect(experiment.frameOverlaps).toEqual([])
  })

  /**
   * **THE STAGE-MATCHED COMPARISON: 21 crossings FLAT against 11 in the BLOCKS.** Both sides here
   * are the pre-snap canonical topology of what `elkjs` emitted, so their difference is
   * attributable to the decomposition rather than to the stage.
   *
   * **THE SIGN HAS NOW CHANGED TWICE AND BOTH TIMES WITH THE SUBJECT, which is what makes it a
   * statement about subjects rather than about decomposition.** On `transistor-preamp`'s five legs
   * it read 6 flat against 6 in blocks - free; on `optical-compressor` it read 4 against 6, so
   * decomposition COST two crossings (`docs/known-gaps.md` **G292**); on the six drawing blocks it
   * read 26 against 11 and on the whole seven it reads 21 against 11, so decomposition SAVES ten.
   * **Four readings, three signs. Nothing here concludes a direction for decomposition in
   * general**, and the spike's own 6.1x is still NOT-COMPARABLE on this subject for the reasons
   * `comparabilityOf` gives.
   *
   * The wire figures go the same way: 1292.02 grid steps flat against 784.00 summed, so the flat
   * graph draws 508.02 more wire as well as crossing ten times more. **Bends go the OTHER way, by
   * two: 58 flat against 60 summed**, so the decomposed side bends slightly more while crossing
   * half as much, and that is reported rather than folded into a verdict.
   *
   * **`crossingRatio` IS NO LONGER `null`, AND THIS IS THE ONE CHANGE HERE THAT IS NOT A MOVED
   * FIGURE BUT A FIGURE EXISTING AT ALL.** It was null on the six-block subject because the module
   * forms it from the ACCEPTED flat side and that side refused at obligation 2. The seven-block
   * flat probe is accepted, so the ratio is taken where it was defined - 21 / 11 at the accepted
   * stage, asserted in the first test of this describe - and the deliberate refusal to substitute
   * the backend-output figures for it is no longer needed. **The two stages happen to agree on
   * `crossings` here (21 and 21), which is a coincidence of this layout and not a licence to read
   * one stage off the other.**
   */
  it("is 21 crossings flat against 11 in blocks, and 1292.02 grid steps against 784.00", () => {
    expect(experiment.flatBackendOutput.ok).toBe(true)
    if (!experiment.flatBackendOutput.ok) return
    expect(experiment.flatBackendOutput.figures.measures.crossings).toBe(21)
    expect(experiment.flatBackendOutput.figures.measures.wireLength.toFixed(2)).toBe("1292.02")
    expect(experiment.flatBackendOutput.figures.measures.bends).toBe(58)
    expect(experiment.perBlockBackendOutput.reduce((n, b) => n + b.figures.measures.crossings, 0)).toBe(11)
    expect(experiment.perBlockBackendOutput.reduce((n, b) => n + b.figures.measures.wireLength, 0).toFixed(2)).toBe("784.00")
    expect(experiment.perBlockBackendOutput.reduce((n, b) => n + b.figures.measures.bends, 0)).toBe(60)
    // The blocks' side of this comparison is the SAME crossing total the accepted stage reports -
    // six zeros and tp-stage's eleven - so the pre-snap and post-snap readings of the decomposed
    // side agree, and the whole of the disagreement above is on the flat side.
    expect(experiment.perBlockBackendOutput.map((b) => b.figures.measures.crossings)).toEqual([0, 0, 0, 0, 0, 0, 11])
    // The ratio now HAS a numerator, taken from the accepted side on both ends.
    expect(experiment.crossingRatio).not.toBeNull()
    expect(SPIKE_CROSSING_RATIO).not.toBeNull()
    // And the three not-comparable measures are still not-comparable: a matching subject does not
    // make a matching frontend.
    expect(comparabilityOf("bends")).toBe("not-comparable")
    expect(comparabilityOf("bendsPerEdge")).toBe("not-comparable")
    expect(comparabilityOf("wireLength")).toBe("not-comparable")
  })
})

describe("ruling R46: what stands between 9 of 12 blocks drawing and more", () => {
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
   * module's life. They were `power-value-wire-overlap`, `power-value-body-overlap`,
   * `power-value-graphic-overlap` and `power-value-pin-overlap`, and `ob-buffer`'s old
   * `power-value-overlap` - value over value - is gone because `ob-buffer` now DRAWS.
   *
   * **THREE OF THOSE FOUR REMAIN AND `power-value-pin-overlap` IS GONE WITH `tp-leg-upper`**
   * (**G297**). It is still in `classOf`'s whitelist and must stay: a class leaves the CENSUS when
   * no block reports it, which is not the same as the shape being impossible. `leverageOf` lists a
   * class only when some block reported it, so its absence below is the measurement.
   *
   * **SEVEN OF THE NINE PROBLEMS IN THE CORPUS ARE ONE TEXT ON ONE BLOCK**, which is the single
   * most useful line in this census: `oc-power`'s `+9V_PROTECTED 1 at (33.02, 52.07)` is party to
   * all seven of its rows, against a wire, two bodies and four graphics. `oc-audio` has one text
   * against two wires. **So the leverage is two TEXTS, not nine problems**, and the class counts
   * below must be read with that: a `partialBlocker` list of one block repeated across three
   * classes is three obstacles under one piece of text.
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
      "tp-leg-upper DRAWS",
      "tp-leg-feedback DRAWS",
      "tp-leg-lower-a DRAWS",
      "tp-leg-lower-b DRAWS",
      "tp-leg-collector DRAWS",
      "tp-leg-emitter-bypass DRAWS",
      "tp-stage DRAWS",
      "9 of 12 declared blocks draw",
      "class power-value-body-overlap: sole blocker of 0 block(s) (none), partial blocker of 1 (oc-power)",
      "class power-value-graphic-overlap: sole blocker of 0 block(s) (none), partial blocker of 1 (oc-power)",
      "class power-value-wire-overlap: sole blocker of 1 block(s) (oc-audio), partial blocker of 1 (oc-power)",
    ])
  })

  it("reports THREE problem classes in the whole corpus, all of one text kind, and names the three blocks that do not draw", () => {
    // **THE DEFECT THAT CARRIED THIS DESCRIBE's NAME IS GONE FROM THE CENSUS ENTIRELY.** It is
    // asserted as absent rather than as zero: `leverageOf` lists a class only when some block
    // reported it, so `undefined` IS the measurement, and a class that still blocked a block
    // partially would come back defined and fail here.
    expect(leverageOf(coverage).find((l) => l.problemClass === "field-placement")).toBeUndefined()
    expect(coverage.filter((r) => r.draws).length).toBe(9)
    // **TASK 22's CEILING OF `5 + 2` IS SUPERSEDED, and it is asserted as superseded rather than
    // quietly dropped**: it was a bound on field placement, and three blocks drew past it by a
    // different mechanism. A test that still said `5 + 2` would now be wrong in a way that read
    // as a regression. It is still exceeded at 9, by two blocks rather than by three.
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
    // **AND `power-value-pin-overlap` LEFT THE CENSUS WITH `tp-leg-upper`** (**G297**), which is
    // the same shape of gain and is asserted the same way. It remains in `classOf`'s whitelist on
    // purpose: a class nothing currently reports is not a shape that cannot occur, and deleting
    // the entry would turn its next occurrence into a refusal rather than a row.
    expect(leverageOf(coverage).find((l) => l.problemClass === "power-value-pin-overlap")).toBeUndefined()
    expect(classOf("value of power symbol VCC 0 at (1, 2) overlaps pin R1.1")).toBe("power-value-pin-overlap")
    // The three that are here, in `leverageOf`'s sorted order. EVERY ONE begins `power-value`,
    // which is the single-class claim this test makes and is stronger than the list.
    expect(leverageOf(coverage).map((l) => l.problemClass)).toEqual([
      "power-value-body-overlap", "power-value-graphic-overlap", "power-value-wire-overlap",
    ])
    expect(leverageOf(coverage).every((l) => l.problemClass.startsWith("power-value-"))).toBe(true)
    // Only ONE of the four is any block's SOLE blocker, which is the leverage R46 asks for: fixing
    // a power symbol's value over a wire alone would unblock `oc-audio` and nothing else.
    expect(leverageOf(coverage).filter((l) => l.soleBlocker.length > 0).map((l) => `${l.problemClass} ${l.soleBlocker.join(",")}`)).toEqual([
      "power-value-wire-overlap oc-audio",
    ])
    // And the three blocks that do not draw, named: two refused at checkLayout and one before it.
    expect(coverage.filter((r) => !r.draws).map((r) => r.block)).toEqual(["oc-power", "oc-audio", "oc-sidechain"])
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
   * contrast is now against the non-drawing blocks that report classes. **It was three for one day
   * and is two since `tp-leg-upper` rejoined** (**G297**) - `oc-power` and `oc-audio` - so "no
   * classes" stays distinguishable from "not refused here", on two subjects rather than one.
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
      "oc-power 7", "oc-audio 2",
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
 * **THE SUBJECT WAS THREE LEGS FOR ONE DAY AND IS FOUR AGAIN SINCE 2026-10-26** (**G297**).
 * `edgesForNet`'s star together with the switch turn (`docs/known-gaps.md` **G293**, **G296**) put
 * `tp-leg-upper`'s `VCC` power symbol's VALUE text on `wire 9` and on `pin R1.1`, so the §1.4
 * clearance gate refused it and it had no accepted geometry at all. `switchFacesItsBank` no longer
 * turns `JP1` - it is a two-pin jumper, and 180 cannot change which side either of its pins faces -
 * so the jumper takes the rail entry's 270, the leg is re-placed, and the overlap is gone.
 *
 * **THE RE-JOINING MOVED THE OTHER THREE LEGS' FIGURES TOO, WHICH REFUTES A PREDICTION THIS FILE
 * MADE.** The third test of this describe said that when `tp-leg-upper` drew again *"the three
 * legs' own figures need no re-derivation ... because they did not move"*. They did: every leg's
 * `jumperToTrim.dy` went from 1 back to 4, because every jumper in every leg stopped being turned,
 * not only `JP1`'s. **The prediction was about one block and the change was about a rule.**
 */
describe("step 6: congruence, WITH the rail glyphs the instances actually get", () => {
  /**
   * **ALL FOUR LEGS ARE MEASURED AGAIN AND THE REFUSED LIST IS ASSERTED EMPTY**, so "four legs"
   * cannot be read as "the measurement is over the congruent set" and so a leg that silently
   * rejoined or left the set fails here rather than changing a table's length.
   */
  it("measures all four legs, with none refused", () => {
    expect(legs.refused.map((r) => r.block)).toEqual([])
    expect(legs.shapes.map((l) => l.block)).toEqual([
      "tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b",
    ])
  })

  it("gives the two -lower legs identical placements and the other two their own", () => {
    const [upper, feedback, lowerA, lowerB] = legs.shapes
    expect(upper).toBeDefined()
    // **EVERY `floor` IS AT ROTATION 90 AND NO `jumper` IS AT 180 ANY MORE**, which is this plan's
    // two orientation rules and the correction to the second, visible in three lines. `floor` is
    // the only two-terminal passive in these legs with NO rail end - the trim's wiper side carries
    // the rail - so it is the only part `signalAxis` answers for, and it answers 90: pins left and
    // right, axis along the reading direction (`docs/known-gaps.md` **G292**).
    //
    // **THE JUMPERS' 180 IS GONE AND THE TWO ROTATIONS THAT REPLACED IT ARE DIFFERENT FROM EACH
    // OTHER, which is the point** (**G297**). `switchFacesItsBank` declines a part whose pins
    // cannot change side under 180, so `Jumper:Jumper_2_Open` falls through, and what it falls
    // through TO depends on the leg:
    //
    // - `-feedback`, `-lower-a` and `-lower-b` have a jumper on no rail at all (`COLLECTOR` or
    //   `BASE`, and the leg's own `_JUMPED` node), so `signalAxis` answers **0** - pin 1 left and
    //   pin 2 right, which for this symbol is rotation 0 already;
    // - `-upper`'s `JP1` has pin 1 on `VCC`, so the RAIL entry answers first and puts that end at
    //   the top: **270**. That is the only rotation of the four that does.
    expect(legs.shapes.map((l) => l.placements.filter((p) => p.endsWith("@90")).length), "one rotated part per leg").toEqual([1, 1, 1, 1])
    expect(legs.shapes.every((l) => l.placements.some((p) => p.startsWith("floor#1@") && p.endsWith("@90"))), "and it is floor").toBe(true)
    expect(legs.shapes.every((l) => l.placements.every((p) => !p.endsWith("@180"))), "and nothing is turned 180").toBe(true)
    expect(legs.shapes.map((l) => l.placements.find((p) => p.startsWith("jumper#1@"))?.split("@").pop())).toEqual(["270", "0", "0", "0"])
    expect(upper?.placements).toEqual(["jumper#1@1270,7620@270", "floor#1@12700,13970@90", "trim#1@22860,19050@0"])
    expect(feedback?.placements).toEqual(["jumper#1@7620,2540@0", "floor#1@36830,2540@90", "trim#1@60960,7620@0"])
    expect(lowerA?.placements).toEqual(["jumper#1@7620,2540@0", "floor#1@30480,2540@90", "trim#1@48260,7620@0"])
    // THE SURVIVING CONGRUENCE, and it is a pair of DIFFERENT parts drawing alike.
    expect(lowerB?.placements, "the two -lower legs").toEqual(lowerA?.placements)
    // The other two differ from it, asserted so "congruent" cannot quietly come back meaning four.
    expect(feedback?.placements).not.toEqual(lowerA?.placements)
    expect(upper?.placements).not.toEqual(lowerA?.placements)
    // THE ANCHOR POSITIONS COINCIDE ON THREE OF THE FOUR AND NOT ON `-upper`, and the reason is
    // the boundary TEXT rather than the parts: (17780, 6350) is the first-layer boundary of a leg
    // whose inbound boundary is a LABEL, and `-upper`'s inbound boundary is a `VCC` POWER SYMBOL on
    // the top edge, which is a different glyph of a different size on a different side. **The
    // shared position was (17780, 1270) and the move to (17780, 6350) is the STAR's, which was
    // measured rather than reasoned**: `[RAN]` these legs on a tree with the star reverted and both
    // orientation rules kept, and the shared anchor is still at (17780, 1270) (**G296**).
    const positions = (leg: LegShape): readonly string[] =>
      leg.anchors.map((a) => a.slice(a.indexOf("@") + 1).split("/")[0] ?? "").sort()
    expect(legs.shapes.filter((l) => positions(l).includes("17780,6350")).map((l) => l.block)).toEqual([
      "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b",
    ])
    expect(legs.shapes.map((l) => positions(l).filter((p) => p !== "17780,6350").join("|"))).toEqual([
      "33020,19050|8890,1270", "71120,7620", "58420,7620", "58420,7620",
    ])
  })

  it("gives three of the four a rail glyph and one of them NONE, which is G97's breaking condition", () => {
    // The rail-glyph pattern is the CLAIM here and it is unmoved by any orientation rule or by the
    // star - `powers` on `-upper` and the two `-lower` legs, `none` on `-feedback`, same nets, same
    // sides. Only the positions moved, and those are a record.
    expect(legs.shapes.map((l) => `${l.block} powers=${l.powers.join("|") || "none"} labels=${l.labels.join("|")}`)).toEqual([
      "tp-leg-upper powers=VCC/power:VCC@8890,1270@0 labels=BASE@33020,19050/right",
      "tp-leg-feedback powers=none labels=COLLECTOR@17780,6350/right|BASE@71120,7620/right",
      "tp-leg-lower-a powers=GND/power:GND@58420,7620@0 labels=BASE@17780,6350/right",
      "tp-leg-lower-b powers=GND/power:GND@58420,7620@0 labels=BASE@17780,6350/right",
    ])
    expect(legs.shapes.filter((l) => l.powers.length === 0).map((l) => l.block)).toEqual(["tp-leg-feedback"])
    // **AND `-upper`'s GLYPH IS THE ONE THAT USED TO REFUSE IT, SO ITS POSITION IS THE ASSERTION
    // THAT CARRIES THE FIX.** It is the only leg whose INBOUND boundary is a power symbol, and that
    // symbol's VALUE text over `wire 9` and `pin R1.1` is what the §1.4 clearance gate caught while
    // `JP1` was turned 180. At `(8890, 1270)` it is clear, and the leg has an accepted geometry.
    expect(legs.refused.map((r) => r.block)).toEqual([])
    expect(legs.shapes[0]?.powers).toEqual(["VCC/power:VCC@8890,1270@0"])
  })

  /**
   * **THE TWO-STEP REFUTATION OF THE SKIN'S FORMULA IS BACK, WITH ITS THIRD TERM RE-MEASURED
   * RATHER THAN RESTORED FROM MEMORY. That distinction is the whole content of this comment.**
   *
   * The refutation needs THREE distinct displacements, so that two consecutive steps can be
   * compared. It has them again: `-upper` 107 predicted against 17 measured, `-lower` 119 against
   * 32, `-feedback` 125 against 42. From `-upper` to `-lower` the formula moves **12** px and the
   * measurement **15** grid steps; from `-lower` to `-feedback` **6** against **10**. **15/12 =
   * 1.25 is not 10/6 = 1.667**, so no single factor carries the prediction onto the measurement and
   * no AFFINE relation fits either - three points with two different slopes admit none.
   *
   * **THE THIRD TERM IS 15 AND NOT THE 13 THIS FILE RECORDED, WHICH REFUTES AN INVARIANCE CLAIM IT
   * ALSO RECORDED** (`docs/known-gaps.md` **G297**). The claim was *"`[RAN]` the three trees and
   * `jumperToTrim.dx` IS INVARIANT ACROSS ALL OF THEM: 19, 42, 32, 32"* on each. It reads **17**,
   * 42, 32, 32 now: `-upper`'s dx moved by 2 when `JP1`'s rotation went from 180 to 270, which is
   * the one leg whose jumper the rail entry answers. **So dx was invariant across three trees and
   * is not invariant in general**, and the step from 107 to 119 is 15 rather than 13.
   *
   * **AND THE `dy` WENT BACK TO 4 ON THE THREE LEGS WHOSE JUMPER IS NOT ON A RAIL**, which is where
   * it sat before any of this: 4 at the last green state, 9 with the jumper turned 180, 1 with the
   * star on top of that, and 4 again now that nothing turns a jumper. `-upper`'s is 9, alone,
   * because its jumper is the vertical one.
   *
   * **WHAT THE RESTORED FORM CAN AND CANNOT SAY:** it refutes both a proportional and an affine
   * relation, which is the stronger pair of claims; it says nothing about any wider family, and no
   * figure here is a threshold.
   */
  it("measures a spread that 6*len(id)+5 does not predict, affinely or proportionally, over all four legs", () => {
    expect(legs.shapes.map((l) => l.predictedX)).toEqual([107, 125, 119, 119])
    expect(skinIdWidth("upper_bias_jumper")).toBe(107)
    expect(skinIdWidth("feedback_bias_jumper")).toBe(125)
    expect(legs.shapes.map((l) => l.jumperToTrim)).toEqual([
      { dx: 17, dy: 9 }, { dx: 42, dy: 4 }, { dx: 32, dy: 4 }, { dx: 32, dy: 4 },
    ])
    expect(new Set(legs.shapes.map((l) => l.predictedX)).size).toBeGreaterThan(1)
    // THREE distinct displacements over four legs, which is one more than the three-leg subject
    // had and is exactly what the step comparison below needs.
    expect(new Set(legs.shapes.map((l) => l.jumperToTrim?.dx)).size).toBe(3)
    // The VERTICAL displacement is shared by the three legs whose jumper is on no rail, and
    // `-upper`'s is its own - asserted as two values rather than one, because "they all agree" was
    // true only while every jumper was turned the same way.
    expect(new Set(legs.shapes.map((l) => l.jumperToTrim?.dy)).size).toBe(2)
    expect(legs.shapes.map((l) => l.jumperToTrim?.dy)).toEqual([9, 4, 4, 4])
    // THE RESTORED CLAIM, AS TWO STEPS: the prediction moves 12 then 6, the measurement 15 then
    // 10, and the two step ratios differ - so no affine map, and a fortiori no proportional one.
    const [upper, feedback, lowerA] = legs.shapes
    expect((lowerA?.predictedX ?? 0) - (upper?.predictedX ?? 0)).toBe(12)
    expect((lowerA?.jumperToTrim?.dx ?? 0) - (upper?.jumperToTrim?.dx ?? 0)).toBe(15)
    expect((feedback?.predictedX ?? 0) - (lowerA?.predictedX ?? 0)).toBe(6)
    expect((feedback?.jumperToTrim?.dx ?? 0) - (lowerA?.jumperToTrim?.dx ?? 0)).toBe(10)
    expect((15 / 12).toFixed(3)).not.toBe((10 / 6).toFixed(3))
    // And the weaker proportional form, kept because it is the one the test's name carries.
    const ratio = (l: LegShape | undefined): number => (l?.jumperToTrim?.dx ?? 0) / (l?.predictedX ?? 1)
    expect([ratio(upper).toFixed(3), ratio(feedback).toFixed(3), ratio(lowerA).toFixed(3)]).toEqual(["0.159", "0.336", "0.269"])
    expect(ratio(feedback)).not.toBe(ratio(lowerA))
  })
})

describe("step 7: disjointness at sheet level, over Task 15's packing", () => {
  /**
   * **THE CRITERION IS `inside=0` ON EVERY ROW AND IT IS UNMOVED; THE BOXES MOVED AND THE ROW THAT
   * WENT MISSING IS BACK.** `tp-leg-upper` draws again (`docs/known-gaps.md` **G297**) so it has an
   * extent to take, at **25x18**, and the other six boxes all changed under the star and the two
   * orientation rules - `-feedback` 55x14 to 55x8, both `-lower` legs 45x14 to 45x8, `-collector`
   * 13x17 to 13x16, `-emitter-bypass` 13x15 to 13x14, `tp-stage` 74x50 to 55x71. **Five of the six
   * got SHORTER and `tp-stage` got NARROWER AND TALLER**, which is the star's layering doing the
   * opposite of what a left-to-right arrangement is for on the one block big enough to show it.
   *
   * **`tp-leg-upper`'s 25x18 IS THE ONE BOX THAT IS NOT WIDE AND FLAT, and that is its jumper's
   * 270.** Its three parts climb from (1270, 7620) to (22860, 19050) rather than running along a
   * row, because the rail entry puts `JP1`'s `VCC` end at the top. The leg's own aspect is
   * therefore 1.39 where the other three legs are 6.88 and 5.63 - which is a record, not a verdict.
   *
   * **EACH BOX IS CROSS-CHECKED AGAINST A DIFFERENT FUNCTION, so these are not seven numbers read
   * off one output.** `w * h` is exactly the `occupiedArea`
   * `tests/schgen/readability/measures.test.ts` takes through `measuresOf` for the same block -
   * 450, 440, 360, 360, 208, 182, 3905 - and the two are computed by `anchorExtent` and by
   * `measuresOf` respectively.
   *
   * **AND THE PERCENTAGE IS DERIVED, NOT MEASURED.** It is the box's area over A3's USABLE area,
   * which is `(420 - 2*12.7) x (297 - 2*12.7 - 38.1)` mm = 310.709 x 183.858 grid steps =
   * 57 126.36 sq. So 450 / 57 126.36 = 0.79%, 440 -> 0.77%, 360 -> 0.63%, 208 -> 0.36%,
   * 182 -> 0.32%, 3905 -> 6.84%, every one to the printed digit. The denominator did not move.
   */
  it("puts no non-member inside any block's own extent, and overlaps no frame under either packer", () => {
    expect(groups.blocks.map((b) => `${b.block} ${b.members} members ${b.box.w}x${b.box.h} ${(100 * b.ofCanvas).toFixed(2)}% inside=${b.nonMembersInside.length}`)).toEqual([
      "tp-leg-upper 3 members 25x18 0.79% inside=0",
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
    expect(groups.blocks.map((b) => b.box.w * b.box.h)).toEqual([450, 440, 360, 360, 208, 182, 3905])
    // The derived percentages, against the stated denominator rather than against the strings.
    expect((100 * 450 / 57_126.36).toFixed(2)).toBe("0.79")
    expect((100 * 3905 / 57_126.36).toFixed(2)).toBe("6.84")
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
   * **`transistor-preamp`'s OWN DECLARED SHEET COMPOSES AGAIN, AND THE FOUR STATES IN FOUR DAYS
   * ARE THE FINDING RATHER THAN ANY ONE OF THEM.**
   *
   * 1. originally this test was *"cannot take the same reading on transistor-preamp's own sheet,
   *    and refuses rather than skipping"*, asserting `layoutSheet` THROWS because **G211**'s
   *    *"two of its seven blocks do not draw"*;
   * 2. boundary-node sizing (**G291**) drew all seven, the `lab` sheet composed on its declared A3,
   *    and the test took the reading - 7 frames, 142 wires, 29 non-members under the grown frame.
   *    **It was the first parity circuit whose own declared sheet composed**;
   * 3. `edgesForNet`'s star (**G293**, **G296**) stopped `tp-leg-upper` drawing, and
   *    `sheetContents` refuses a sheet holding a block that cannot be realised - so the sheet
   *    refused for exactly G211's reason, with one block instead of two;
   * 4. the jumper turn is declined (**G297**), `tp-leg-upper` draws, and the sheet composes again -
   *    7 frames, **132** wires, 29 non-members.
   *
   * **THE WIRE COUNT DID NOT COME BACK TO ITS OLD VALUE AND THAT IS NOT A DISCREPANCY: 142 WAS A
   * DIFFERENT GEOMETRY.** State 2 was the chain with no 180 rules; state 4 is the star with the
   * turn declined for jumpers. Same seven blocks, same sheet, ten fewer segments. **The 29 is the
   * figure that DID return, and it returned because it is derivable rather than measured**: the
   * grown frame is `tp-leg-upper`'s, which has 3 members, and the sheet carries 32 placements, so
   * 32 - 3 = 29 non-members. It would be 29 under any routing of the same circuit.
   *
   * **132 IS CROSS-CHECKED BY TWO OTHER DRIVERS:** it is the composed side's `wires` figure in
   * step 4 of this file, summed there from the seven blocks' own segment counts
   * (11 + 11 + 11 + 11 + 10 + 11 + 67), and it is `shapeMeasures`' `segments` total over the same
   * seven blocks in `tests/schgen/render/compose.test.ts`.
   *
   * **THE BOARD CENSUS AGREES, BY A DIFFERENT DRIVER:** `bun tools/schgen/board-sheets.ts`
   * generates `transistor-preamp-lab`, so this is not an artefact of the probe.
   */
  it("takes the reading on transistor-preamp's own declared sheet, which it could not yesterday", () => {
    expect(probe.drew.length).toBe(7)
    expect(probe.refused.map((r) => r.id).sort()).toEqual([])
    const drawing = layoutSheet(probe.circuit, "lab", probe.symbols, FLAG_LIB_ID, probe.elk)
    expect(drawing.frames.length).toBe(7)
    expect(drawing.wires.length).toBe(132)
    expect(11 + 11 + 11 + 11 + 10 + 11 + 67).toBe(drawing.wires.length)
    expect(nonMemberContainments(probe.circuit, drawing)).toEqual([])
    // NOT VACUOUS: a frame grown to swallow the sheet reports every symbol that is not its own
    // block's, and the count is derived - 32 placements less `tp-leg-upper`'s 3 members.
    const huge = {
      ...drawing,
      frames: drawing.frames.map((f, i) => (i === 0 ? { ...f, box: { minX: -1e9, minY: -1e9, maxX: 1e9, maxY: 1e9 } } : f)),
    }
    expect(nonMemberContainments(probe.circuit, huge).length).toBe(29)
    expect(32 - 3).toBe(29)
  })
})
