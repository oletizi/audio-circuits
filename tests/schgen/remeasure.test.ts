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
import { BLOCK_SIZE, blocksOutside, gateOf, remeasure, renderRow, type Remeasurement } from "../../tools/schgen/remeasure.ts"
import { comparabilityOf, SPIKE_BLOCKS, spikeRowFor } from "../../tools/schgen/remeasure-spikes.ts"
import { floorEvidence, orderSweep, renderSweep, sizeCoverage, type OrderSweepRow } from "../../tools/schgen/remeasure-ceiling.ts"
import { edgeCensus, integratedExperiment, type IntegratedExperiment } from "../../tools/schgen/remeasure-composed.ts"
import { disjointness, legShapes, skinIdWidth, type Disjointness, type LegShape } from "../../tools/schgen/remeasure-criteria.ts"
import { nonMemberContainments } from "../../lib/schgen/render/compose.ts"
import { layoutSheet } from "../../lib/schgen/render/sheets.ts"
import { packSheet } from "../../tools/schgen/elk/sheet-layout.ts"
import { FLAG_LIB_ID } from "../../tools/schgen/generate.ts"

afterAll(cleanUpTempScratch)

let rows: readonly Remeasurement[]
let sweep: readonly OrderSweepRow[]
let experiment: IntegratedExperiment
let legs: readonly LegShape[]
let groups: Disjointness
let probe: DrawnBlocks
let signal: ComposedSubject

beforeAll(async () => {
  rows = await remeasure()
  sweep = await orderSweep()
  experiment = await integratedExperiment()
  legs = await legShapes()
  groups = await disjointness()
  probe = await composedLegs("transistor-preamp")
  signal = await miniSheet("signal")
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

  it("has a COMPOSED side that reproduces G200's and G209's own figures", () => {
    expect(experiment.composed.ok).toBe(true)
    if (!experiment.composed.ok) return
    const f = experiment.composed.figures
    expect(f.placements).toBe(14)
    expect(f.wires).toBe(67)
    expect(f.measures.wireLength).toBe(224)
    expect(f.measures.bends).toBe(38)
    expect(f.measures.crossings).toBe(0)
    expect(f.measures.occupiedArea).toBe(7038)
    expect(f.aspect?.toFixed(2)).toBe("3.33")
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

describe("step 3's mechanism: the edge counts a decomposition removes, which is G100's explanation", () => {
  /**
   * **THE RATIO IS EXACTLY 1.000x ON BOTH CIRCUITS, SO G100's STATED MECHANISM DOES NOT EXIST ON
   * THIS BACKEND.** That entry explains its 6.1x by *"the three blocks carry FEWER EDGES THAN THE
   * WHOLE - 96 against 139"*. Here the flat graph and the blocks carry the SAME number of edges,
   * for a structural reason: a net that crosses a block boundary becomes a boundary NODE in each
   * block it touches, and the chain edge reaching that node replaces exactly the chain edge the
   * split removed. **The assertion is an equality in both directions**, so a change in the edge
   * model moves it either way rather than only when it grows.
   */
  it("is 72 edges flat and 72 in blocks on optical-compressor, and 53 and 53 on transistor-preamp", async () => {
    const oc = await edgeCensus("optical-compressor")
    expect(oc.blocks.map((b) => `${b.id} ${b.nodes}/${b.edges}`)).toEqual([
      "oc-power 11/15", "oc-audio 18/25", "oc-sidechain 24/32",
    ])
    expect(oc.flatNodes).toBe(46)
    expect(oc.flatEdges).toBe(72)
    expect(oc.blockEdgeTotal).toBe(72)
    expect(oc.ratio).toBe(1)
    const tp = await edgeCensus("transistor-preamp")
    expect(tp.flatNodes).toBe(39)
    expect(tp.flatEdges).toBe(53)
    expect(tp.blockEdgeTotal).toBe(53)
    expect(tp.ratio).toBe(1)
  }, 300_000)

  it("counts 46 flat nodes against the spike's 9 ports on a 37-part parent, which is the same parent", async () => {
    // A check that could have failed: the spike's §3 parent row reports 37 parts and 9 ports, and
    // this flat graph holds 41 UNITS (37 parts, four of them multi-unit) plus 5 boundary nodes.
    // So the two graphs are not the same graph even for one circuit, which is why the edge
    // ABSOLUTES are not compared and only the ratio is.
    const oc = await edgeCensus("optical-compressor")
    expect(oc.flatNodes - oc.blocks.reduce((n, b) => n + b.nodes, 0)).toBe(-7)
  }, 300_000)
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
