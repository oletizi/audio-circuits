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
import { layoutSheet, sheetOf } from "../../lib/schgen/render/sheets.ts"
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
   * **EVERY `bends` AND `crossings` FIGURE HERE IS CROSS-CHECKED, which is what keeps this table a
   * measurement.** `tests/schgen/readability/measures.test.ts` takes both quantities through a
   * different driver - `readElkGraph` plus `canonicalTopology` for the pre-snap column, and
   * `measuresOf` over the accepted topology for the ten blocks that draw - and agrees on all
   * twelve: `ob-buffer` 21/6, `oc-sidechain` 30/8 pre-snap; `oc-power` 5/1, `oc-audio` 30/5,
   * `pt-core` 74/71, `tp-stage` 21/6 and 6/0 on every leg accepted. Each block's `len` and `area`
   * are checked there too, against `shapeMeasures` in micrometres and `anchorExtent` in grid
   * steps.
   */
  it("is these twelve rows of figures", () => {
    expect(rows.map(renderRow)).toEqual([
      "ob-buffer parts=9 units=11 placements=11 graphCells=14 ports=3 share=21.4% stage=backend-output bends=21 perEdge=0.72 crossings=6 len=439.57 area=3008.38 aspect=1.62 scale=about-a-serialization | no spike row",
      "oc-power parts=8 units=8 placements=8 graphCells=11 ports=3 share=27.3% stage=accepted bends=5 perEdge=0.19 crossings=1 len=221.00 area=1856.00 aspect=2.21 scale=about-a-serialization | spike oc-power moved",
      "oc-audio parts=12 units=14 placements=14 graphCells=18 ports=4 share=22.2% stage=accepted bends=30 perEdge=0.75 crossings=5 len=757.00 area=4716.00 aspect=3.64 scale=about-a-serialization | spike oc-audio moved",
      "oc-sidechain parts=17 units=19 placements=19 graphCells=24 ports=5 share=20.8% stage=backend-output bends=30 perEdge=0.61 crossings=8 len=1016.63 area=7690.71 aspect=3.34 scale=about-a-serialization | spike oc-sidechain moved",
      "pt-core parts=24 units=24 placements=24 graphCells=26 ports=2 share=7.7% stage=accepted bends=74 perEdge=1.03 crossings=71 len=2161.00 area=9520.00 aspect=2.06 scale=about-a-serialization | no spike row",
      "tp-leg-upper parts=3 units=3 placements=3 graphCells=5 ports=2 share=40.0% stage=accepted bends=6 perEdge=1.00 crossings=0 len=51.00 area=544.00 aspect=1.88 scale=about-the-circuit | spike leg-upper moved",
      "tp-leg-feedback parts=3 units=3 placements=3 graphCells=5 ports=2 share=40.0% stage=accepted bends=6 perEdge=1.00 crossings=0 len=71.00 area=770.00 aspect=3.93 scale=about-the-circuit | spike leg-feedback moved",
      "tp-leg-lower-a parts=3 units=3 placements=3 graphCells=5 ports=2 share=40.0% stage=accepted bends=6 perEdge=1.00 crossings=0 len=61.00 area=630.00 aspect=3.21 scale=about-the-circuit | spike leg-lowerA moved",
      "tp-leg-lower-b parts=3 units=3 placements=3 graphCells=5 ports=2 share=40.0% stage=accepted bends=6 perEdge=1.00 crossings=0 len=61.00 area=630.00 aspect=3.21 scale=about-the-circuit | spike leg-lowerB moved",
      "tp-leg-collector parts=2 units=2 placements=2 graphCells=4 ports=2 share=50.0% stage=accepted bends=6 perEdge=1.20 crossings=0 len=32.00 area=221.00 aspect=0.76 scale=about-the-circuit | spike leg-collector moved",
      "tp-leg-emitter-bypass parts=2 units=2 placements=2 graphCells=6 ports=4 share=66.7% stage=accepted bends=6 perEdge=1.00 crossings=0 len=50.00 area=195.00 aspect=0.87 scale=about-the-circuit | no spike row",
      "tp-stage parts=16 units=16 placements=16 graphCells=23 ports=7 share=30.4% stage=accepted bends=21 perEdge=0.54 crossings=6 len=505.00 area=3700.00 aspect=1.48 scale=about-a-serialization | no spike row",
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
   * **G216's 14 PLACEMENTS STAND AND ITS WIRE TOTAL HAS NOW MOVED TWICE: 224, then 298, now 276**
   * (**G291**, **G292**). Node sizing lengthened the wires that reach the labels; laying each
   * leg's floor resistor along the signal shortened them again, past where they started on three
   * of the five legs. **The 14 stands through both** because neither change moves a part between
   * blocks, and
   * that is what the two figures put side by side are for: a part count that moved with the wire
   * would say the subject had changed rather than the layout.
   *
   * 276 is cross-checked rather than copied: `tests/schgen/readability/measures.test.ts` takes it
   * over the same five blocks from the canonical topology, and
   * `tests/schgen/render/compose.test.ts` takes it from the REALISED layouts in micrometres
   * through `shapeMeasures` and gets 350 520 = 276 x 1270.
   */
  it("reproduces G216's five accepted rows, which is an arithmetic agreement and not a second reading", () => {
    const G216_ROWS = ["tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b", "tp-leg-collector"]
    const accepted = rows.filter((r) => G216_ROWS.includes(r.block))
    expect(accepted.length, "G216's five rows are all present and all still accepted").toBe(5)
    expect(accepted.every((r) => r.geometry.stage === "accepted")).toBe(true)
    expect(accepted.reduce((n, r) => n + r.geometry.placements, 0)).toBe(14)
    expect(accepted.reduce((n, r) => n + r.geometry.measures.wireLength, 0)).toBe(276)
    // The total against its own terms, which are the five `len` figures in the table above.
    expect(51 + 71 + 61 + 61 + 32).toBe(276)
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
 * **THE RE-SCOPE BOUGHT A MEASURING FLAT SIDE FOR ONE DAY AND THE ORIENTATION RULE TOOK IT
 * AWAY AGAIN, which is the live state and is recorded rather than engineered around**
 * (`docs/known-gaps.md` **G292**). On the five legs the flat probe was refused by the junction
 * gate, so the accepted column held *"a composed drawing and a refusal"*. On
 * `optical-compressor` the flat probe was ACCEPTED, and G105's criterion - *"reports the four
 * measures against the FLAT whole-circuit baseline"* - had figures on both sides at the stage a
 * drawing is emitted from. **Since a non-rail two-terminal passive is laid along the signal the
 * flat probe is refused at obligation 1**, the snap collapse, so the accepted-stage comparison has
 * one side again and the stage-matched one at `backend-output` is the only one with two.
 *
 * **R38's THIRD CLAUSE IS WHAT THIS FILE DOES ABOUT IT, verbatim: *"If the flat side REFUSES,
 * that refusal is the result."*** So the refusal is asserted with its gate and its reason, and
 * nothing here relaxes a gate to recover a figure.
 */
describe("step 4: the integrated experiment, on optical-compressor's two blocks that draw", () => {
  it("has a FLAT side that REFUSES at the snap, and R38 makes that refusal the result", () => {
    expect(experiment.circuit).toBe("optical-compressor")
    expect(experiment.blocks).toEqual(["oc-power", "oc-audio"])
    expect(experiment.notDrawn.map((n) => n.id)).toEqual(["oc-sidechain"])
    // SOME blocks draw, which is the condition the experiment is specified for (R38) and the
    // condition `transistor-preamp` no longer meets.
    expect(experiment.blocks.length).toBeGreaterThan(0)
    expect(experiment.notDrawn.length).toBeGreaterThan(0)
    // THE REFUSAL, NAMED AT ITS GATE AND ITS OBLIGATION. It is obligation 1 - a wire that was
    // 0.635 mm long before the snap and zero after it - which is the class `CLAUDE.md` calls the
    // one that must keep refusing, because the drawing would assert a connection the route did
    // not. `oc-power` and `oc-audio` each lay out and pass every gate on their own; it is the
    // UNION as one graph that the snap collapses.
    expect(experiment.flat.ok).toBe(false)
    if (experiment.flat.ok) return
    expect(experiment.flat.gate).toBe("lib/schgen/elk/adapt.ts (spec 1.4's realization contract)")
    expect(experiment.flat.refusal).toContain("snapping the ELK route onto KiCad's 1.27 mm grid collapsed geometry")
    expect(experiment.flat.refusal).toContain("wire 34 (net GND)")
    expect(experiment.flat.refusal).toContain("snapped to zero length at (224.79, 30.48)")
    // AND THE PER-BLOCK SIDE IS NOT REFUSED, which is what makes the line above a statement about
    // the flat graph rather than about this subject being undrawable.
    expect(experiment.composed.ok).toBe(true)
    expect(experiment.flatBackendOutput.ok, "the pre-gate figures are still taken").toBe(true)
  })

  /**
   * **THE COMPOSED SIDE, AND EVERY COUNT ON IT IS NOW THE TERMWISE SUM OF THE TWO BLOCKS.** The
   * two blocks cross 1 and 5, run 221 and 757 grid steps, bend 5 and 30, emit 31 and 70 segments
   * and hold 8 and 14 placements; the composed drawing reports 6, 978, 35, 101 and 22. Seam B
   * therefore adds no crossing and no wire - which is the next test, taken as a difference rather
   * than asserted.
   *
   * **`wires` USED TO BE THE ONE FIGURE THAT DID NOT ADD UP AND NOW IT DOES**, which is a small
   * result about the comparison rather than about the circuit: the composed side was 100 against
   * a flat 99, *"because the two blocks are routed independently and their segment lists do not
   * have to agree with a single graph's"*. The flat side is refused now, so there is nothing to
   * disagree with; against the blocks themselves it is 101 = 31 + 70 exactly.
   *
   * **`occupiedArea` IS THE ONE FIGURE THAT IS NOT A SUM, and that is by construction**: it is the
   * bounding box of the composition, 7992 against the blocks' own 1856 + 4716 = 6572, because the
   * packer leaves a gap between the two frames. `aspect` is a ratio of that box and is not a sum
   * either. Both are reported as what they are.
   */
  it("has a COMPOSED side whose crossings are exactly the blocks' own", () => {
    expect(experiment.composed.ok).toBe(true)
    if (!experiment.composed.ok) return
    const f = experiment.composed.figures
    expect(f.placements).toBe(22)
    expect(f.wires).toBe(101)
    expect(f.nets).toBe(12)
    expect(f.measures.wireLength).toBe(978)
    expect(f.measures.bends).toBe(35)
    expect(f.measures.crossings).toBe(6)
    expect(f.measures.occupiedArea).toBe(7992)
    expect(f.aspect?.toFixed(2)).toBe("5.84")
    // The per-block figures the composed total is made of, named so the sums below are checkable.
    expect(experiment.perBlock.map((b) => `${b.id} crossings=${b.figures.measures.crossings} len=${b.figures.measures.wireLength} bends=${b.figures.measures.bends} wires=${b.figures.wires} placements=${b.figures.placements}`)).toEqual([
      "oc-power crossings=1 len=221 bends=5 wires=31 placements=8",
      "oc-audio crossings=5 len=757 bends=30 wires=70 placements=14",
    ])
    expect(1 + 5).toBe(f.measures.crossings)
    expect(221 + 757).toBe(f.measures.wireLength)
    expect(5 + 30).toBe(f.measures.bends)
    expect(31 + 70).toBe(f.wires)
    expect(8 + 14).toBe(f.placements)
    // The one that is NOT a sum, asserted as not one so the pattern above cannot be over-read.
    expect(1856 + 4716).not.toBe(f.measures.occupiedArea)
  })

  it("measures seam B adding NO crossing and NO wire, which is G208 re-taken", () => {
    expect(experiment.interBlockCrossings).toBe(0)
    expect(experiment.interBlockWireLength).toBe(0)
    expect(experiment.frameOverlaps).toEqual([])
  })

  /**
   * **THE STAGE-MATCHED COMPARISON, AND IT HAS REVERSED SIGN: 4 crossings FLAT against 6 in the
   * BLOCKS.** Both sides here are the pre-snap canonical topology of what `elkjs` emitted, so
   * their difference is attributable to the decomposition rather than to the stage. It read 6
   * against 6 until the orientation rule (`docs/known-gaps.md` **G292**); on this subject
   * **decomposition now COSTS two crossings rather than being free**, and 1087.90 grid steps flat
   * against 977.60 summed says it buys 110 grid steps of wire for them.
   *
   * **THAT IS THE OPPOSITE DIRECTION FROM THE SPIKE'S CLAIM AND IS REPORTED AS A MEASUREMENT, NOT
   * AS A REFUTATION OF IT.** The spike's 6.1x says the flat whole-circuit drawing crosses far MORE
   * than its blocks do; here the flat graph crosses fewer. `comparabilityOf` still calls three of
   * the five measures not-comparable, the spike's figures came from a different frontend with
   * different node sizes and port constraints, and nothing scales one into the other - so this is
   * one subject disagreeing with the spike's direction, which is a finding about this subject.
   *
   * **AND `crossingRatio` IS `null`, WHICH IS THE PRICE OF THE FLAT REFUSAL and is asserted as
   * null rather than recomputed from the backend-output figures.** `integratedExperiment` forms
   * the ratio from the ACCEPTED flat side, and that side refuses. Taking 4/6 from this test's own
   * numbers instead would publish a ratio the module does not compute, at a stage the ratio was
   * never defined for. **On the previous subject the ratio had no DENOMINATOR; on this one it has
   * no NUMERATOR**, and the symmetry is worth keeping: a ratio with a missing side is a missing
   * figure both times.
   */
  it("is 4 crossings flat against 6 in blocks, and 1087.90 grid steps against 977.60", () => {
    expect(experiment.flatBackendOutput.ok).toBe(true)
    if (!experiment.flatBackendOutput.ok) return
    expect(experiment.flatBackendOutput.figures.measures.crossings).toBe(4)
    expect(experiment.flatBackendOutput.figures.measures.wireLength.toFixed(2)).toBe("1087.90")
    expect(experiment.flatBackendOutput.figures.measures.bends).toBe(29)
    expect(experiment.perBlockBackendOutput.reduce((n, b) => n + b.figures.measures.crossings, 0)).toBe(6)
    expect(experiment.perBlockBackendOutput.reduce((n, b) => n + b.figures.measures.wireLength, 0).toFixed(2)).toBe("977.60")
    expect(experiment.perBlockBackendOutput.reduce((n, b) => n + b.figures.measures.bends, 0)).toBe(35)
    // The blocks' side of this comparison is the SAME crossing total the accepted stage reports -
    // 1 + 5 - so the pre-snap and post-snap readings of the decomposed side agree, and the whole
    // of the disagreement above is on the flat side.
    expect(experiment.perBlockBackendOutput.map((b) => b.figures.measures.crossings)).toEqual([1, 5])
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
    // **EVERY `floor` IS NOW AT ROTATION 90 AND NO OTHER PART IS, which is the orientation half of
    // the owner's directive visible in one line** (`docs/known-gaps.md` **G292**). `floor` is the
    // only two-terminal passive in these legs with NO rail end - the jumper is a jumper and the
    // trim's wiper side carries the rail - so it is the only part `signalAxis` answers for, and it
    // answers 90: pins left and right, axis along the reading direction. The jumpers and trims keep
    // rotation 0 because a different rule or no rule reaches them.
    expect(legs.map((l) => l.placements.filter((p) => p.endsWith("@90")).length), "one rotated part per leg").toEqual([1, 1, 1, 1])
    expect(legs.every((l) => l.placements.some((p) => p.startsWith("floor#1@") && p.endsWith("@90"))), "and it is floor").toBe(true)
    expect(upper?.placements).toEqual(["jumper#1@7620,11430@0", "floor#1@21590,11430@90", "trim#1@31750,16510@0"])
    expect(feedback?.placements).toEqual(["jumper#1@7620,7620@0", "floor#1@36830,7620@90", "trim#1@60960,12700@0"])
    expect(lowerA?.placements).toEqual(["jumper#1@7620,7620@0", "floor#1@30480,7620@90", "trim#1@48260,12700@0"])
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
      "41910,22860", "71120,19050", "58420,19050", "58420,19050",
    ])
  })

  it("gives three of the four a rail glyph and one of them NONE, which is G97's breaking condition", () => {
    // The rail-glyph pattern is the CLAIM here and it is unmoved by the orientation rule
    // (`docs/known-gaps.md` **G292**) - three `powers`, one `none`, same three nets, same sides.
    // The second anchor's position moved on all four, which is the layout and is a record.
    expect(legs.map((l) => `${l.block} powers=${l.powers.join("|") || "none"} labels=${l.labels.join("|")}`)).toEqual([
      "tp-leg-upper powers=VCC/power:VCC@17780,1270@0 labels=BASE@41910,22860/right",
      "tp-leg-feedback powers=none labels=COLLECTOR@17780,1270/right|BASE@71120,19050/right",
      "tp-leg-lower-a powers=GND/power:GND@58420,19050@0 labels=BASE@17780,1270/right",
      "tp-leg-lower-b powers=GND/power:GND@58420,19050@0 labels=BASE@17780,1270/right",
    ])
    expect(legs.filter((l) => l.powers.length === 0).map((l) => l.block)).toEqual(["tp-leg-feedback"])
  })

  /**
   * **THE MEASURED SPREAD IS NO LONGER ZERO, SO THE OLD REFUTATION OF THE SKIN'S FORMULA IS GONE -
   * AND THE FORMULA IS STILL NOT WHAT PRODUCES IT.**
   *
   * The claim this test used to carry was clean: `6 * len(id) + 5` gives 107, 125, 119 and 119 for
   * the four jumpers' semantic ids, so it predicts the four x offsets DIFFER, **and all four
   * measured 14 grid steps.** A predicted spread against a measured zero.
   *
   * Node sizing made the four measure **16, 42, 32 and 32** grid steps (`docs/known-gaps.md`
   * **G291**) and the orientation rule made them **19, 42, 32 and 32** (**G292**) - only
   * `-upper`'s moved, and the `dy` went from 12 to **4** on all four, because `floor` is now laid
   * horizontally and the three parts sit nearly on one row. So what is asserted now is weaker
   * than the old clean refutation and is stated as weaker:
   *
   * - the measured displacements are NOT a scaling of the prediction. From `-upper` to `-lower`
   *   the formula moves 12 px and the measurement moves 13 grid steps; from `-lower` to
   *   `-feedback` the formula moves 6 px and the measurement moves 10. **13/12 is not 10/6**, so
   *   no single factor carries one into the other. The margin is NARROWER than it was at 16/12
   *   against 10/6, and saying so matters: a change that moved `-upper`'s displacement two steps
   *   further would make the two ratios agree and this refutation would stop being available on
   *   this subject;
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
      { dx: 19, dy: 4 }, { dx: 42, dy: 4 }, { dx: 32, dy: 4 }, { dx: 32, dy: 4 },
    ])
    expect(new Set(legs.map((l) => l.predictedX)).size).toBeGreaterThan(1)
    // The spread is real now - three distinct displacements where there was one.
    expect(new Set(legs.map((l) => l.jumperToTrim?.dx)).size).toBe(3)
    // The VERTICAL displacement is the same on all four, and it is asserted as a shared value
    // rather than left in the table: the three parts of every leg now sit four grid steps apart in
    // y, which is what laying `floor` along the signal did to these blocks.
    expect(new Set(legs.map((l) => l.jumperToTrim?.dy)).size).toBe(1)
    // AND IT IS NOT THE FORMULA'S SPREAD: the two step ratios disagree, so no single scale factor
    // maps the prediction onto the measurement. 13/12 = 1.08 against 10/6 = 1.67.
    const [upper, feedback, lowerA] = legs
    const predictedStep = (lowerA?.predictedX ?? 0) - (upper?.predictedX ?? 0)
    const measuredStep = (lowerA?.jumperToTrim?.dx ?? 0) - (upper?.jumperToTrim?.dx ?? 0)
    const predictedStep2 = (feedback?.predictedX ?? 0) - (lowerA?.predictedX ?? 0)
    const measuredStep2 = (feedback?.jumperToTrim?.dx ?? 0) - (lowerA?.jumperToTrim?.dx ?? 0)
    expect([predictedStep, measuredStep, predictedStep2, measuredStep2]).toEqual([12, 13, 6, 10])
    expect(measuredStep / predictedStep).not.toBe(measuredStep2 / predictedStep2)
  })
})

describe("step 7: disjointness at sheet level, over Task 15's packing", () => {
  /**
   * **THE CRITERION IS `inside=0` ON EVERY ROW AND IT IS UNMOVED; THE BOXES MOVED.** The
   * orientation rule (`docs/known-gaps.md` **G292**) re-places every block, so five of the
   * seven boxes are different - `tp-leg-upper` 29x24 to 32x17, `-feedback` 55x20 to 55x14, both
   * `-lower` legs 45x20 to 45x14, `tp-stage` 71x52 to 74x50. Four of the five got SHORTER, which
   * is what laying a signal-path part along the signal does to a block's height.
   *
   * **EACH BOX IS CROSS-CHECKED AGAINST A DIFFERENT FUNCTION, so these are not seven numbers read
   * off one output.** `w * h` is exactly the `occupiedArea`
   * `tests/schgen/readability/measures.test.ts` takes through `measuresOf` for the same block -
   * 544, 770, 630, 630, 221, 195, 3700 - and the two are computed by `anchorExtent` and by
   * `measuresOf` respectively.
   *
   * **AND THE PERCENTAGE IS DERIVED, NOT MEASURED.** It is the box's area over A3's USABLE area,
   * which is `(420 - 2*12.7) x (297 - 2*12.7 - 38.1)` mm = 310.709 x 183.858 grid steps =
   * 57 126.36 sq. So 544 / 57 126.36 = 0.95%, 770 -> 1.35%, 630 -> 1.10%, 221 -> 0.39%,
   * 195 -> 0.34%, 3700 -> 6.48%, every one to the printed digit. The denominator did not move.
   */
  it("puts no non-member inside any block's own extent, and overlaps no frame under either packer", () => {
    expect(groups.blocks.map((b) => `${b.block} ${b.members} members ${b.box.w}x${b.box.h} ${(100 * b.ofCanvas).toFixed(2)}% inside=${b.nonMembersInside.length}`)).toEqual([
      "tp-leg-upper 3 members 32x17 0.95% inside=0",
      "tp-leg-feedback 3 members 55x14 1.35% inside=0",
      "tp-leg-lower-a 3 members 45x14 1.10% inside=0",
      "tp-leg-lower-b 3 members 45x14 1.10% inside=0",
      "tp-leg-collector 2 members 13x17 0.39% inside=0",
      "tp-leg-emitter-bypass 2 members 13x15 0.34% inside=0",
      "tp-stage 16 members 74x50 6.48% inside=0",
    ])
    // The criterion, asserted as the criterion rather than only inside the strings above.
    expect(groups.blocks.every((b) => b.nonMembersInside.length === 0)).toBe(true)
    // Each box's area against the figure measures.test.ts takes by a different function.
    expect(groups.blocks.map((b) => b.box.w * b.box.h)).toEqual([544, 770, 630, 630, 221, 195, 3700])
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
    // Seven frames on the sheet's own declared paper, and 131 wires - which is `shapeMeasures`'
    // `segments` total over the same seven blocks in `tests/schgen/render/compose.test.ts`, where
    // it is also decomposed per block (12, 12, 12, 12, 11, 12, 60). **It was 142 until the
    // orientation rule** (`docs/known-gaps.md` **G292**): the router emits ELEVEN FEWER
    // segments carrying MORE wire, 1 055 370 um against 1 033 780, which is the straighter-runs
    // signature that change leaves everywhere in this file.
    expect(drawing.frames.length).toBe(7)
    expect(drawing.wires.length).toBe(131)
    expect(12 + 12 + 12 + 12 + 11 + 12 + 60, "the per-block segment counts").toBe(drawing.wires.length)
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
