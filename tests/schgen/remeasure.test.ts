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
import { comparabilityOf, SPIKE_BLOCKS, spikeRowFor } from "../../tools/schgen/remeasure-spikes.ts"
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
   * **THE CONTROLLER's READING OF HEAD, MEASURED.** Five of the twelve declared blocks draw - the
   * four congruent bias legs and `tp-leg-collector` - and seven do not. All five that draw are
   * two- and three-cell blocks of ONE circuit family.
   */
  it("is 5 accepted and 7 refused, and names the gate that refused each", () => {
    expect(rows.map((r) => `${r.block} ${r.geometry.stage}${r.geometry.refusal === null ? "" : ` ${gateOf(r.geometry.refusal)}`}`)).toEqual([
      "ob-buffer backend-output obligation 4: checkLayout",
      "oc-power backend-output obligation 4: checkLayout",
      "oc-audio backend-output obligation 1: the snap collapsed geometry",
      "oc-sidechain backend-output obligation 3: one transform, two readers",
      "pt-core backend-output obligation 4: checkLayout",
      "tp-leg-upper accepted",
      "tp-leg-feedback accepted",
      "tp-leg-lower-a accepted",
      "tp-leg-lower-b accepted",
      "tp-leg-collector accepted",
      "tp-leg-emitter-bypass backend-output obligation 4: checkLayout",
      "tp-stage backend-output obligation 4: checkLayout",
    ])
  })

  it("draws 0 of 12 by TEMPLATE, which is the other axis and has not moved", () => {
    // Ruling R41: `realised` means a template drew the block, and that is still 0 of 12.
    expect(rows.every((r) => r.drawnBy === "elk")).toBe(true)
  })

  /** The twelve rows `docs/schematic/m1-remeasurement.md` prints, to the digit. */
  it("is these twelve rows of figures", () => {
    expect(rows.map(renderRow)).toEqual([
      "ob-buffer parts=9 units=11 placements=11 graphCells=14 ports=3 share=21.4% stage=backend-output bends=28 perEdge=0.97 crossings=7 len=436.80 area=3233.45 aspect=1.24 scale=about-a-serialization | no spike row",
      "oc-power parts=8 units=8 placements=8 graphCells=11 ports=3 share=27.3% stage=backend-output bends=5 perEdge=0.19 crossings=1 len=163.00 area=1056.00 aspect=2.64 scale=about-a-serialization | spike oc-power moved",
      "oc-audio parts=12 units=14 placements=14 graphCells=18 ports=4 share=22.2% stage=backend-output bends=30 perEdge=0.75 crossings=5 len=636.81 area=4076.47 aspect=2.20 scale=about-a-serialization | spike oc-audio moved",
      "oc-sidechain parts=17 units=19 placements=19 graphCells=24 ports=5 share=20.8% stage=backend-output bends=27 perEdge=0.55 crossings=7 len=811.92 area=6638.13 aspect=1.78 scale=about-a-serialization | spike oc-sidechain moved",
      "pt-core parts=24 units=24 placements=24 graphCells=26 ports=2 share=7.7% stage=backend-output bends=83 perEdge=1.15 crossings=78 len=2469.63 area=12668.79 aspect=1.22 scale=about-a-serialization | no spike row",
      "tp-leg-upper parts=3 units=3 placements=3 graphCells=5 ports=2 share=40.0% stage=accepted bends=8 perEdge=1.33 crossings=0 len=48.00 area=513.00 aspect=1.42 scale=about-the-circuit | spike leg-upper moved",
      "tp-leg-feedback parts=3 units=3 placements=3 graphCells=5 ports=2 share=40.0% stage=accepted bends=8 perEdge=1.33 crossings=0 len=48.00 area=513.00 aspect=1.42 scale=about-the-circuit | spike leg-feedback moved",
      "tp-leg-lower-a parts=3 units=3 placements=3 graphCells=5 ports=2 share=40.0% stage=accepted bends=8 perEdge=1.33 crossings=0 len=48.00 area=513.00 aspect=1.42 scale=about-the-circuit | spike leg-lowerA moved",
      "tp-leg-lower-b parts=3 units=3 placements=3 graphCells=5 ports=2 share=40.0% stage=accepted bends=8 perEdge=1.33 crossings=0 len=48.00 area=513.00 aspect=1.42 scale=about-the-circuit | spike leg-lowerB moved",
      "tp-leg-collector parts=2 units=2 placements=2 graphCells=4 ports=2 share=50.0% stage=accepted bends=6 perEdge=1.20 crossings=0 len=32.00 area=221.00 aspect=0.76 scale=about-the-circuit | spike leg-collector moved",
      "tp-leg-emitter-bypass parts=2 units=2 placements=2 graphCells=6 ports=4 share=66.7% stage=backend-output bends=6 perEdge=1.00 crossings=0 len=48.40 area=153.60 aspect=1.10 scale=about-the-circuit | no spike row",
      "tp-stage parts=16 units=16 placements=16 graphCells=23 ports=7 share=30.4% stage=backend-output bends=24 perEdge=0.62 crossings=7 len=375.57 area=2201.61 aspect=1.30 scale=about-a-serialization | no spike row",
    ])
  })

  /**
   * **THE FIVE ACCEPTED ROWS REPRODUCE G216's TABLE, AND WHAT THAT ESTABLISHES IS NARROW.** Both
   * sides run over the geometry `adaptElkLayoutReported` returns, which is already canonicalised -
   * G216's own correction to its round-1 independence claim. **Two implementations agreeing is a
   * check on the arithmetic and NOT a cross-check of the geometry.**
   */
  it("reproduces G216's five accepted rows, which is an arithmetic agreement and not a second reading", () => {
    const accepted = rows.filter((r) => r.geometry.stage === "accepted")
    expect(accepted.reduce((n, r) => n + r.geometry.placements, 0)).toBe(14)
    expect(accepted.reduce((n, r) => n + r.geometry.measures.wireLength, 0)).toBe(224)
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

describe("step 4: the integrated experiment, on the five blocks that draw", () => {
  it("has a FLAT side that refuses, at the junction obligation, and that refusal is the result", () => {
    expect(experiment.blocks).toEqual(["tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b", "tp-leg-collector"])
    expect(experiment.notDrawn.map((n) => n.id)).toEqual(["tp-leg-emitter-bypass", "tp-stage"])
    expect(experiment.flat.ok).toBe(false)
    if (experiment.flat.ok) return
    expect(experiment.flat.gate).toContain("spec 1.4's realization contract")
    expect(experiment.flat.refusal).toContain("the junctions the sheet emitter would place disagree")
    expect(experiment.flat.refusal).toContain("net BASE branches at (45.72, 48.26) (t-junction) and no junction is emitted")
  })

  /**
   * **TWO OF THESE SEVEN FIGURES MOVED AT TASK 21 AND FIVE DID NOT, which is what says the ROUTE
   * did not move.** `occupiedArea` 7038 -> **7152** and `aspect` 3.326 -> **3.104**; placements,
   * wires, wire length, bends and crossings are all unchanged. Four of the five blocks that draw
   * hold a jumper valued `Jumper_2_Open` - its symbol's own part name - which is now emitted
   * hidden and is no longer drawn text, so those blocks' drawn EXTENTS lost the widest text on
   * them and `packSheet` arranged them differently.
   *
   * **THE AREA WENT UP WHILE THE BLOCKS GOT SMALLER, AND THE TWO FIGURES TOGETHER SAY HOW:** the
   * composed bounding box went from **153.0 x 46.0** grid steps to **149.0 x 48.0** - four
   * narrower, two taller - so the packer traded width it no longer needed for a row it did. The
   * area is partly a property of the packing, as this file's `measures.test.ts` sibling says of
   * the same figure. `docs/known-gaps.md` **G257**.
   */
  it("has a COMPOSED side that reproduces G200's and G209's own figures", () => {
    expect(experiment.composed.ok).toBe(true)
    if (!experiment.composed.ok) return
    const f = experiment.composed.figures
    expect(f.placements).toBe(14)
    expect(f.wires).toBe(67)
    expect(f.measures.wireLength).toBe(224)
    expect(f.measures.bends).toBe(38)
    expect(f.measures.crossings).toBe(0)
    expect(f.measures.occupiedArea).toBe(7152)
    expect(f.aspect?.toFixed(2)).toBe("3.10")
  })

  it("measures seam B adding NO crossing and NO wire, which is G208 re-taken", () => {
    expect(experiment.interBlockCrossings).toBe(0)
    expect(experiment.interBlockWireLength).toBe(0)
    expect(experiment.frameOverlaps).toEqual([])
  })

  /**
   * **THE ONE STAGE-MATCHED COMPARISON, AND THE RATIO IS NOT TAKEN.** Both sides here are the
   * pre-snap canonical topology of what `elkjs` emitted. The crossing ratio has no denominator
   * because the blocks measure ZERO, which is a result about this subject and not a missing figure.
   */
  it("is 1 crossing flat against 0 in blocks, and 360.20 grid steps against 227.60", () => {
    expect(experiment.flatBackendOutput.ok).toBe(true)
    if (!experiment.flatBackendOutput.ok) return
    expect(experiment.flatBackendOutput.figures.measures.crossings).toBe(1)
    expect(experiment.flatBackendOutput.figures.measures.wireLength.toFixed(2)).toBe("360.20")
    expect(experiment.flatBackendOutput.figures.measures.bends).toBe(38)
    expect(experiment.perBlockBackendOutput.reduce((n, b) => n + b.figures.measures.crossings, 0)).toBe(0)
    expect(experiment.perBlockBackendOutput.reduce((n, b) => n + b.figures.measures.wireLength, 0).toFixed(2)).toBe("227.60")
    expect(experiment.perBlockBackendOutput.reduce((n, b) => n + b.figures.measures.bends, 0)).toBe(38)
    // NOT the spike's 6.1x and not a fraction of it: the ratio has no denominator on this subject.
    expect(experiment.crossingRatio).toBeNull()
  })
})

describe("ruling R46: what stands between 5 of 12 blocks drawing and more", () => {
  /**
   * **ONE DEFECT WAS THE SOLE BLOCKER OF FOUR BLOCKS; SINCE TASK 21 IT IS THREE, AND THE FOURTH
   * BLOCK STILL DOES NOT DRAW.** `tp-leg-emitter-bypass`'s field-placement refusal was the jumper
   * `JP5#1 (Jumper:Jumper_2_Open)`, whose Value is its symbol's own part name; that Value is now
   * emitted hidden and the fields place. **The block then reported a problem nothing had ever
   * seen** - `label BYPASS_JUMPED ... overlaps label BYPASS_CAP ...` - because
   * `layout-check.ts`'s `textClearanceProblems` returns a field-placement refusal ALONE and never
   * runs the text-clearance pass behind it.
   *
   * **SO THE LEVERAGE FIGURE IS AN UPPER BOUND AND NOT A COUNT**, for all three blocks that
   * remain: `5 + 3 = 8` assumes none of them is masking a second problem the way this one was, and
   * nothing has looked. `docs/known-gaps.md` **G232**, **G257** and **G258**.
   */
  it("classifies every checkLayout problem of every declared block", () => {
    expect(renderCoverage(coverage)).toEqual([
      "ob-buffer refused at obligation 4: checkLayout problems field-placement",
      "oc-power refused at obligation 4: checkLayout problems field-placement",
      "oc-audio refused at obligation 1: the snap collapsed geometry",
      "oc-sidechain refused at obligation 3: one transform, two readers",
      "pt-core refused at obligation 4: checkLayout problems field-placement",
      "tp-leg-upper DRAWS",
      "tp-leg-feedback DRAWS",
      "tp-leg-lower-a DRAWS",
      "tp-leg-lower-b DRAWS",
      "tp-leg-collector DRAWS",
      "tp-leg-emitter-bypass refused at obligation 4: checkLayout problems label-label-overlap",
      "tp-stage refused at obligation 4: checkLayout problems body-label-overlap, body-label-overlap, field-placement",
      "5 of 12 declared blocks draw",
      "class body-label-overlap: sole blocker of 0 block(s) (none), partial blocker of 1 (tp-stage)",
      "class field-placement: sole blocker of 3 block(s) (ob-buffer, oc-power, pt-core), partial blocker of 1 (tp-stage)",
      "class label-label-overlap: sole blocker of 1 block(s) (tp-leg-emitter-bypass), partial blocker of 0 (none)",
    ])
  })

  it("is ONE defect and not three, and names the three blocks it alone blocks", () => {
    const field = leverageOf(coverage).find((l) => l.problemClass === "field-placement")
    expect(field).toBeDefined()
    expect(field?.soleBlocker).toEqual(["ob-buffer", "oc-power", "pt-core"])
    expect(field?.partialBlocker).toEqual(["tp-stage"])
    // 5 draw now; the three above would take it to 8 at most - see this describe's comment for why
    // that is a bound and not a count. A check that could have failed: the sole/partial SPLIT is
    // asserted, so a class that blocks nothing by itself cannot be read as leverage -
    // body-label-overlap is sole blocker of ZERO and that is asserted too.
    expect(coverage.filter((r) => r.draws).length).toBe(5)
    expect(coverage.filter((r) => r.draws).length + (field?.soleBlocker.length ?? 0)).toBe(8)
    const overlap = leverageOf(coverage).find((l) => l.problemClass === "body-label-overlap")
    expect(overlap?.soleBlocker).toEqual([])
    // And the class Task 21 uncovered is its own: a label over a label, sole blocker of one block.
    const labels = leverageOf(coverage).find((l) => l.problemClass === "label-label-overlap")
    expect(labels?.soleBlocker).toEqual(["tp-leg-emitter-bypass"])
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
   * HAVING NONE.** Nothing has looked at `oc-audio`'s or `oc-sidechain`'s clearances, so their
   * empty lists must not be read as clean.
   */
  it("leaves the two blocks refused at earlier obligations with no problem classes at all", () => {
    const earlier = coverage.filter((r) => !r.draws && r.problemClasses.length === 0)
    expect(earlier.map((r) => `${r.block} ${r.gate}`)).toEqual([
      "oc-audio obligation 1: the snap collapsed geometry",
      "oc-sidechain obligation 3: one transform, two readers",
    ])
  })
})

describe("step 6: congruence, WITH the rail glyphs the instances actually get", () => {
  it("gives the four legs identical placements and identical anchor positions", () => {
    const [upper, feedback, lowerA, lowerB] = legs
    expect(upper).toBeDefined()
    expect(upper?.placements).toEqual(["jumper#1@7620,3810@0", "floor#1@19050,8890@0", "trim#1@25400,19050@0"])
    for (const leg of [feedback, lowerA, lowerB]) expect(leg?.placements, leg?.block).toEqual(upper?.placements)
    // The two anchor POSITIONS are the same pair of points on all four legs; what differs is which
    // net arrives at which point and the side its glyph points.
    for (const leg of legs) {
      const positions = leg.anchors.map((a) => a.slice(a.indexOf("@") + 1).split("/")[0]).sort()
      expect(positions, leg.block).toEqual(["17780,1270", "35560,25400"])
    }
  })

  it("gives three of the four a rail glyph and one of them NONE, which is G97's breaking condition", () => {
    expect(legs.map((l) => `${l.block} powers=${l.powers.join("|") || "none"} labels=${l.labels.join("|")}`)).toEqual([
      "tp-leg-upper powers=VCC/power:VCC@17780,1270@0 labels=BASE@35560,25400/right",
      "tp-leg-feedback powers=none labels=COLLECTOR@17780,1270/right|BASE@35560,25400/right",
      "tp-leg-lower-a powers=GND/power:GND@35560,25400@0 labels=BASE@17780,1270/right",
      "tp-leg-lower-b powers=GND/power:GND@35560,25400@0 labels=BASE@17780,1270/right",
    ])
  })

  /**
   * **THE SKIN's FORMULA PREDICTS A SPREAD AND THE MEASURED SPREAD IS ZERO.** `6 * len(id) + 5`
   * gives 107, 125, 119 and 119 for the four jumpers' semantic ids, so it predicts the four x
   * offsets DIFFER. They do not: all four are 14 grid steps.
   */
  it("measures ZERO spread where 6*len(id)+5 predicts 18 grid units of it", () => {
    expect(legs.map((l) => l.predictedX)).toEqual([107, 125, 119, 119])
    expect(skinIdWidth("upper_bias_jumper")).toBe(107)
    expect(skinIdWidth("feedback_bias_jumper")).toBe(125)
    expect(legs.map((l) => l.jumperToTrim)).toEqual([
      { dx: 14, dy: 12 }, { dx: 14, dy: 12 }, { dx: 14, dy: 12 }, { dx: 14, dy: 12 },
    ])
    expect(new Set(legs.map((l) => l.predictedX)).size).toBeGreaterThan(1)
    expect(new Set(legs.map((l) => l.jumperToTrim?.dx)).size).toBe(1)
  })
})

describe("step 7: disjointness at sheet level, over Task 15's packing", () => {
  it("puts no non-member inside any block's own extent, and overlaps no frame under either packer", () => {
    expect(groups.blocks.map((b) => `${b.block} ${b.members} members ${b.box.w}x${b.box.h} ${(100 * b.ofCanvas).toFixed(2)}% inside=${b.nonMembersInside.length}`)).toEqual([
      "tp-leg-upper 3 members 27x19 0.90% inside=0",
      "tp-leg-feedback 3 members 27x19 0.90% inside=0",
      "tp-leg-lower-a 3 members 27x19 0.90% inside=0",
      "tp-leg-lower-b 3 members 27x19 0.90% inside=0",
      "tp-leg-collector 2 members 13x17 0.39% inside=0",
    ])
    expect(groups.frameOverlapsElk).toEqual([])
    expect(groups.frameOverlapsShelf).toEqual([])
  })

  /**
   * The frame-box reading of the same criterion, on the ONE design that composes - `transistor-
   * preamp`'s single declared sheet cannot be laid out at all, because two of its seven blocks do
   * not draw (**G211**).
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

  it("cannot take the same reading on transistor-preamp's own sheet, and refuses rather than skipping", () => {
    expect(probe.drew.length).toBe(5)
    expect(probe.refused.map((r) => r.id).sort()).toEqual(["tp-leg-emitter-bypass", "tp-stage"])
    expect(() => layoutSheet(probe.circuit, "lab", probe.symbols, FLAG_LIB_ID, probe.elk)).toThrow()
  })
})
