/**
 * **G100's EDGE MECHANISM, RE-TAKEN AND THEN CORRECTED: the decomposition ADDS edges on this
 * backend.**
 *
 * Hand-written for Task 17 of the M1 schematic-authoring plan, **split out of
 * `./remeasure.test.ts` and rewritten at fix round 1.**
 *
 * **WHAT ROUND 1 GOT WRONG, because every assertion below is shaped by it.** Its flat probe never
 * rebuilt `Circuit.unitBlock`, so `labelledNets` still saw the original block declaration and
 * handed the "flat" subject a boundary node for exactly the nets the split created. **The control
 * inherited the decomposition it was controlling for**, and the resulting 1.000x was one artefact
 * cancelling another. The fix is in `tools/schgen/remeasure-edges.ts`; the figures below are the
 * corrected ones and the superseded reading is kept as a NAMED subject so it cannot be reached by
 * accident a second time.
 *
 * **THE CONCLUSION IS NOT WEAKENED BY THE CORRECTION - it is strengthened.** The spike's stated
 * mechanism for its 6.1x is that decomposition sheds 43 edges. On this backend it sheds none under
 * the charitable reading and **ADDS 3 and 5 under the correct one.**
 */
import { beforeAll, describe, expect, it } from "bun:test"
import { crossingNonRailNets, edgeCensus, flatSubgraphOf, governingNetsOf, renderEdgeCensus, type EdgeCensus } from "../../tools/schgen/remeasure-edges.ts"
import { circuitSpecFrom } from "../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../lib/schgen/ir/build.ts"
import { elkInputOf } from "../../lib/schgen/elk/graph.ts"
import { subgraphOf } from "../../lib/schgen/render/blocks.ts"
import { PARITY_CASES, parityResolver } from "../../tools/schgen/authoring-census.ts"

let oc: EdgeCensus
let tp: EdgeCensus

beforeAll(async () => {
  oc = await edgeCensus("optical-compressor")
  tp = await edgeCensus("transistor-preamp")
}, 300_000)

describe("the corrected headline: a genuinely flat declaration against the blocked one", () => {
  it("is 69 flat against 72 blocked on optical-compressor, so the decomposition ADDS 3 edges", () => {
    expect(oc.flatEdges).toBe(69)
    expect(oc.blockEdgeTotal).toBe(72)
    expect(oc.flatNodes).toBe(43)
    expect(Number(oc.ratio.toFixed(3))).toBe(0.958)
    // The DIRECTION is asserted, not only the magnitude: a ratio below 1 means added edges, and
    // reading it the other way round is the mistake round 1 published.
    expect(oc.blockEdgeTotal - oc.flatEdges).toBe(3)
    expect(oc.ratio).toBeLessThan(1)
  })

  it("is 48 flat against 53 blocked on transistor-preamp, so it ADDS 5 edges", () => {
    expect(tp.flatEdges).toBe(48)
    expect(tp.blockEdgeTotal).toBe(53)
    expect(tp.flatNodes).toBe(34)
    expect(Number(tp.ratio.toFixed(3))).toBe(0.906)
    expect(tp.blockEdgeTotal - tp.flatEdges).toBe(5)
    expect(tp.ratio).toBeLessThan(1)
  })

  it("refutes the spike's mechanism on both circuits, which is what the figure is FOR", () => {
    // G100: "the three blocks carry FEWER EDGES THAN THE WHOLE - 96 against 139". On this backend
    // the blocks carry MORE on both circuits. The absolutes are not compared against 139 and 96
    // (different edge model); the DIRECTION of the claim is what is refuted.
    for (const c of [oc, tp]) expect(c.blockEdgeTotal).toBeGreaterThan(c.flatEdges)
  })
})

describe("the per-net rule, shown AGREEING with the measurement rather than asserted", () => {
  /**
   * **ROUND 1's RULE COULD NOT BE REFUTED AND THIS ONE CAN.** It said the difference is one edge
   * per *"multi-block net that is neither a rail nor a labelled net"* - and
   * `lib/schgen/ir/classify.ts:47` labels every net with `blocks.size > 1`, so that set is empty in
   * every circuit this IR builds. The governing set is *nets that cross a block boundary and are
   * not rails*, which is non-empty here and which a circuit could have none of.
   */
  it("predicts the difference from the crossing non-rail nets, on both circuits", () => {
    // On a WHOLE circuit the fourth clause is vacuous - nothing can leave the subject - so the
    // three-clause set and the four-clause set agree. This is what makes the whole-circuit figures
    // right under either sentence, and it is asserted rather than assumed.
    expect(oc.crossingNonRail).toEqual(["OUT_PRE", "VBIAS", "VBIAS_RAW"])
    expect(tp.crossingNonRail).toEqual(["BASE", "BYPASS_CAP", "BYPASS_JUMPED", "COLLECTOR", "EMITTER"])
    // The prediction and the measurement are compared, which is the check round 1 skipped.
    expect(oc.crossingNonRail.length).toBe(oc.blockEdgeTotal - oc.flatEdges)
    expect(tp.crossingNonRail.length).toBe(tp.blockEdgeTotal - tp.flatEdges)
  })

  it("agrees with the four-clause set on a WHOLE circuit, where clause four is vacuous", () => {
    const symbols = parityResolver()
    for (const name of ["optical-compressor", "transistor-preamp"]) {
      const found = PARITY_CASES.find((c) => c.name === name)
      if (found === undefined) throw new Error(`no ${name} parity case`)
      const circuit = buildCircuit(circuitSpecFrom(found.network, found.authoring, symbols), { symbols })
      const all = [...circuit.blocks.keys()]
      expect(governingNetsOf(circuit, all).slice().sort(), name).toEqual(crossingNonRailNets(circuit).slice().sort())
    }
  })

  it("counts a set that is NON-EMPTY, so the rule is not vacuously satisfied", () => {
    // Round 1 claimed these circuits had none of the governing set. They have three and five, and
    // asserting non-emptiness is what stops the agreement above being 0 === 0.
    expect(oc.crossingNonRail.length).toBeGreaterThan(0)
    expect(tp.crossingNonRail.length).toBeGreaterThan(0)
  })

  it("excludes rails, which is the clause that makes the rule refutable", () => {
    // A circuit whose every cross-block net is a rail would measure 1.000x. Both circuits here
    // DO have cross-block rails, and they are absent from the governing set - so the exclusion is
    // exercised rather than declared.
    const symbols = parityResolver()
    const found = PARITY_CASES.find((c) => c.name === "transistor-preamp")
    if (found === undefined) throw new Error("no transistor-preamp parity case")
    const circuit = buildCircuit(circuitSpecFrom(found.network, found.authoring, symbols), { symbols })
    const crossing = crossingNonRailNets(circuit)
    expect([...circuit.rails.keys()].length).toBeGreaterThan(0)
    for (const rail of circuit.rails.keys()) expect(crossing, `rail ${rail}`).not.toContain(rail)
  })
})

describe("the rule's SCOPE, and the falsifier the review found", () => {
  /**
   * **THE CLAIM HOLDS FOR CIRCUITS WITH NO BUS BLOCK, AND THAT IS ALL FOUR OF THIS REPOSITORY's -
   * measured, not assumed.** `edgeCensus` drops `rendering.kind === "bus"` blocks from BOTH sides
   * while their units keep their own block ids, so a non-rail net touching a bus block costs a
   * boundary terminal on both sides and cancels - while `crossingNonRailNets` still counts it.
   * `[RELAYED]` The review re-declared `tp-leg-upper` as a bus block and changed nothing else:
   * blocked 48 / flat 44 / difference 4 against a predicted 5, **DISAGREES**.
   *
   * **This assertion is the scope boundary, so it has to be able to fail:** a circuit here that
   * started declaring a bus block would turn it red, which is the signal that the prediction in
   * G100 needs the falsifier's caveat applied to it rather than quietly going wrong.
   */
  it("holds because no circuit here declares a bus block, on all four", () => {
    const symbols = parityResolver()
    for (const c of PARITY_CASES) {
      const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
      const bus = [...circuit.blocks.values()].filter((b) => b.rendering.kind === "bus")
      expect(
        bus.map((b) => b.id),
        `${c.name} declares a bus block, which is the condition G100's falsifier describes: the ` +
          "edge-difference prediction can disagree with the measurement there, and the entry's " +
          "scope statement needs revisiting rather than the figures being trusted.",
      ).toEqual([])
    }
  })
})

describe("the two flat subjects are DIFFERENT subjects, and only one is a baseline", () => {
  /**
   * **THE INHERITED-BOUNDARY SUBJECT IS KEPT AND NAMED, AND IT READS 1.000x.** It is what round 1
   * measured by accident. It establishes one thing exactly - that a boundary node replaces the
   * chain edge a split removes, to the edge - and it is NOT a flat baseline.
   */
  it("reads 1.000x with the blocked declaration's boundaries imposed, and that is the artefact", () => {
    expect(oc.inheritedEdges).toBe(72)
    expect(oc.inheritedNodes).toBe(46)
    expect(tp.inheritedEdges).toBe(53)
    expect(tp.inheritedNodes).toBe(39)
    // Exactly the blocked total on both: the cancellation, isolated.
    expect(oc.inheritedEdges).toBe(oc.blockEdgeTotal)
    expect(tp.inheritedEdges).toBe(tp.blockEdgeTotal)
  })

  it("differs from the genuinely flat subject in NODES as well as edges, which is the defect's signature", () => {
    // The inherited subject carries one boundary node per crossing non-rail net that the flat
    // subject does not: 46 against 43, and 39 against 34.
    expect(oc.inheritedNodes - oc.flatNodes).toBe(oc.crossingNonRail.length)
    expect(tp.inheritedNodes - tp.flatNodes).toBe(tp.crossingNonRail.length)
  })

  it("rebuilds unitBlock, and WITHOUT that rebuild the flat probe is handed the split's boundaries", () => {
    // The fix, driven. Same union, same circuit, same function - only the boundary source differs,
    // and the edge count moves by the governing set's size.
    const symbols = parityResolver()
    const found = PARITY_CASES.find((c) => c.name === "optical-compressor")
    if (found === undefined) throw new Error("no optical-compressor parity case")
    const circuit = buildCircuit(circuitSpecFrom(found.network, found.authoring, symbols), { symbols })
    const ids = [...circuit.blocks.values()].map((b) => b.id)
    const flat = elkInputOf(flatSubgraphOf(circuit, ids, symbols, "probe~flat", "flat")).graph
    const inherited = elkInputOf(flatSubgraphOf(circuit, ids, symbols, "probe~inherited", "declared-blocks")).graph
    expect((flat.edges ?? []).length).toBe(69)
    expect((inherited.edges ?? []).length).toBe(72)
  })

  /**
   * **THE REFUTATION ROUTE FIRING IN THE OTHER DIRECTION, ON A REAL SUBJECT.** The rule says the
   * difference is the number of nets crossing a block boundary that are not rails. For the
   * five-leg union that set is EMPTY - every net crossing between legs either leaves the union
   * (`BASE`, `COLLECTOR` reach `tp-stage`) or is a rail (`VCC`, `GND`) - **so the rule predicts
   * equality, and the measurement is 24 against 24.**
   *
   * This is what makes the corrected rule a measurement rather than round 1's theorem: the same
   * rule predicts a difference of 3 and 5 on the two whole circuits and a difference of 0 here, and
   * all three agree with what was measured.
   */
  it("predicts EQUALITY on the five-leg union, where the governing set is empty, and 24 against 24 is measured", () => {
    // Fix round 2, item B: the set is COMPUTED by governingNetsOf, with all four clauses, rather
    // than read off g.external as a proxy. Under the three-clause sentence round 1 published, the
    // union's set is {BASE, COLLECTOR} and not empty - it is empty only once the fourth clause,
    // does-not-leave-the-subject, is applied, and both of those nets reach tp-stage.
    const symbols = parityResolver()
    const found = PARITY_CASES.find((c) => c.name === "transistor-preamp")
    if (found === undefined) throw new Error("no transistor-preamp parity case")
    const circuit = buildCircuit(circuitSpecFrom(found.network, found.authoring, symbols), { symbols })
    const legs = ["tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b", "tp-leg-collector"]
    const g = flatSubgraphOf(circuit, legs, symbols, "legs~flat", "flat")
    // THE THREE-CLAUSE SET, which is what round 1's sentence literally named: NOT empty.
    const threeClause = crossingNonRailNets(circuit).filter((net) =>
      legs.some((id) => {
        const block = circuit.blocks.get(id)
        return block?.members.some((m) => circuit.pins.some((pin) => pin.part === m.part && pin.net === net)) ?? false
      }),
    )
    expect(threeClause.sort()).toEqual(["BASE", "COLLECTOR"])
    // THE FOUR-CLAUSE SET, which is the rule: empty, because both of those leave the union.
    expect(governingNetsOf(circuit, legs)).toEqual([])
    // A net leaving the union is still multi-block and still gets its boundary node, which is the
    // truth about a sub-circuit - and is why Step 4's five-leg figures did not move when the fix
    // landed.
    expect([...g.external].sort()).toEqual(["BASE", "COLLECTOR"])
    const flatEdges = (elkInputOf(g).graph.edges ?? []).length
    const blockedEdges = legs.reduce((n, id) => n + (elkInputOf(subgraphOf(circuit, id, symbols)).graph.edges ?? []).length, 0)
    expect(flatEdges).toBe(24)
    expect(blockedEdges).toBe(24)
    expect(blockedEdges - flatEdges).toBe(0)
  })
})

describe("the report line", () => {
  it("names the direction, the prediction and the subject that is not a baseline", () => {
    const lines = renderEdgeCensus(oc).join("\n")
    expect(lines).toContain("ADDS 3")
    expect(lines).toContain("AGREES")
    expect(lines).toContain("NOT a flat baseline")
  })
})
