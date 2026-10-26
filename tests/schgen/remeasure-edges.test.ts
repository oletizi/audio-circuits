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
import { adaptElkLayoutReported } from "../../lib/schgen/elk/adapt.ts"
import { describeMismatch } from "../../lib/schgen/render/block-types.ts"
import { layoutBlocks } from "../../tools/schgen/elk/layout.ts"
import { subgraphOf } from "../../lib/schgen/render/blocks.ts"
import { PARITY_CASES, parityResolver } from "../../tools/schgen/authoring-census.ts"
import { blockCircuit, res } from "./__fixtures__/circuits.ts"

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
   * every circuit this IR builds.
   *
   * **THE GOVERNING SET HAS FOUR CLAUSES** - crossing inside the subject, not a rail, not
   * off-sheet, and does not leave the subject - of which the first three are what
   * `crossingNonRailNets` computes circuit-wide and the fourth is what `governingNetsOf` adds for a
   * subject. **Round 1's published sentence named two of them**, which is why one printed figure was
   * false as literally stated (fix round 2, item B). The four-clause set is non-empty on both whole
   * circuits and a circuit could have none of it.
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

  /**
   * **THE PUBLISHED LISTS ARE IN DEFAULT `Array.sort()` ORDER - AND THIS ASSERTION CANNOT CATCH A
   * COMPARATOR, which fix round 3 claimed it could. The claim was false and is withdrawn.**
   *
   * `[RAN]` Fix round 5's review put `localeCompare` back into BOTH name-returning functions - where
   * it has to go to do harm, since the shared helper's two `.sort()` calls erase it - and the whole
   * suite came back **3593 pass / 0 fail, identical to the clean tree**; this file alone, 14 pass /
   * 0 fail. **The cause: both published lists are FIXED POINTS of both comparators.**
   * `expect(x).toEqual([...x].sort())` can only fail when the two orders differ, and divergence
   * needs a `_` adjacent to an alphanumeric in a particular position. `OUT_PRE, VBIAS, VBIAS_RAW`
   * and `BASE, BYPASS_CAP, BYPASS_JUMPED, COLLECTOR, EMITTER` have no such pair.
   *
   * **IT IS NOT VACUOUS IN GENERAL AND IT IS KEPT FOR WHAT IT DOES CATCH - and the three
   * perturbations are NOT interchangeable, which an earlier version of this comment got wrong.**
   * `[RAN]` This round, each comparator put into BOTH name-returning functions:
   *
   * | comparator | this file | does the fixture test below fail? |
   * | --- | --- | --- |
   * | `a.localeCompare(b)` - locale ascending, the one it was built for | 14 pass / 1 fail | **yes** |
   * | `(a, b) => b.localeCompare(a)` - locale REVERSAL | 13 pass / 2 fail | **NO - it passes** |
   * | code-unit descending | 12 pass / 3 fail | **yes** |
   *
   * **So this assertion catches locale-reversal and code-unit descending, and NOT the locale
   * ascending it was written for** - that is the next test's job. And locale-reversal leaves the
   * fixture pair in default order (`BYPASSED, BYPASS_CAP`), which is why the fixture test passes
   * there: reversal and code-unit descending are different perturbations and the earlier comment
   * conflated them.
   */
  it("returns both published lists in default-sort order - which a REVERSING comparator breaks and a collation one does not", () => {
    expect(oc.crossingNonRail).toEqual([...oc.crossingNonRail].sort())
    expect(tp.crossingNonRail).toEqual([...tp.crossingNonRail].sort())
    const symbols = parityResolver()
    for (const name of ["optical-compressor", "transistor-preamp"]) {
      const found = PARITY_CASES.find((c) => c.name === name)
      if (found === undefined) throw new Error(`no ${name} parity case`)
      const circuit = buildCircuit(circuitSpecFrom(found.network, found.authoring, symbols), { symbols })
      const governing = governingNetsOf(circuit, [...circuit.blocks.keys()])
      expect(governing, name).toEqual([...governing].sort())
    }
  })

  /**
   * **THE CHECK THAT ACTUALLY CATCHES THE COMPARATOR - fix round 5, item 1.** The assertion above
   * cannot, because the real nets are fixed points of both orders. This one drives the two
   * name-returning functions over a FIXTURE whose crossing non-rail nets are a pair the two
   * comparators order differently, so `localeCompare` in either function reddens it.
   *
   * **WHERE THE PAIR COMES FROM: ONE REAL NET AND ONE CONSTRUCTED NAME - and it HAD to be
   * constructed.** `BYPASS_CAP` is a real `transistor-preamp` net; **`BYPASSED` is not a net of any
   * circuit in this repository.** It is a name of the diverging shape, built for this fixture.
   *
   * **The reason it had to be built is the interesting part.** `[RAN]` Over all 153 pairs of
   * `transistor-preamp`'s 18 declared nets, **0 diverge** between the two comparators - including
   * `BYPASS_CAP` against `BYPASS_JUMPED`, which both orders put the same way round. **So no two
   * real nets of that circuit would have served**, and the term under test is one the real corpus
   * cannot drive at all - the same justification the fixtures in
   * `tests/schgen/readability/measures.test.ts` rest on.
   *
   * **The SHAPE is derived rather than guessed**, and `docs/known-gaps.md` **G236** carries the
   * sweep it came from with its candidate set defined, since that script is not committed: `_` is 0x5F,
   * after letters and digits by code unit and before them under ICU collation, so two names diverge
   * exactly when the first position at which they differ holds `_` in one and an alphanumeric in
   * the other. **An earlier round of this task wrote a provenance sentence that did not reproduce**
   * - it called `BYPASSED` a real net - and `docs/known-gaps.md` **G237** records that.
   *
   * **THE FIXTURE IS A REAL `Circuit`, NOT A HAND-BUILT OBJECT.** `blockCircuit` goes through
   * `buildCircuit`, and each `external` net gets a peer resistor in a second block - so both nets
   * genuinely cross a block boundary and neither is a rail, which is what puts them in the
   * governing set. **It is test data in test code**, which is what `CLAUDE.md` permits: the real
   * corpus cannot drive this term because no declared circuit has a diverging pair.
   */
  it("REDDENS under a collation comparator, over a fixture whose nets the two orders disagree about", () => {
    // The computation the pair is chosen by, asserted rather than described.
    const pair = ["BYPASS_CAP", "BYPASSED"]
    const byDefault = [...pair].sort()
    const byCollation = [...pair].sort((a, b) => a.localeCompare(b))
    expect(byDefault, "default sort puts _ after E, by code unit").toEqual(["BYPASSED", "BYPASS_CAP"])
    expect(byCollation, "ICU collation puts _ before E").toEqual(["BYPASS_CAP", "BYPASSED"])
    // The two literals above differ, so this pair discriminates the comparators. That was an
    // `expect(byDefault).not.toEqual(byCollation)` and it is now a comment: it is ENTAILED by the
    // two assertions above and could never have been the cause of a failure, which made it the
    // fourth check-that-cannot-fail on this task (G237).

    const circuit = blockCircuit([res("R1", "BYPASS_CAP", "BYPASSED")], { kind: "auto" }, { external: pair })
    // Both nets cross from block "B" into the peer block, and neither is a rail, so both are in the
    // governing set - which is what makes this fixture able to fail.
    expect(crossingNonRailNets(circuit).length, "the fixture must produce the diverging pair").toBe(2)
    expect(
      crossingNonRailNets(circuit),
      "crossingNonRailNets must use the default Array.sort(): a collation comparator orders this " +
        "pair the other way, and both of this module's published lists are compared with toEqual.",
    ).toEqual(["BYPASSED", "BYPASS_CAP"])
    expect(
      governingNetsOf(circuit, [...circuit.blocks.keys()]),
      "governingNetsOf must use the same default sort, for the same reason.",
    ).toEqual(["BYPASSED", "BYPASS_CAP"])
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
   * difference is the number of nets that cross a block boundary inside the subject, are not rails,
   * are not off-sheet, **and do not leave the subject**. For the five-leg union the FOUR-clause set
   * is EMPTY, and **only the fourth clause makes it so**: `BASE` and `COLLECTOR` cross between legs
   * and are not rails, so the three-clause set is `{BASE, COLLECTOR}` - which the assertions below
   * compute and prove - and both of them reach `tp-stage`, so both leave the subject and cancel.
   * **So the rule predicts equality, and the measurement is 24 against 24.**
   *
   * This is what makes the corrected rule a measurement rather than round 1's theorem: the same
   * rule predicts a difference of 3 and 5 on the two whole circuits and a difference of 0 here, and
   * all three agree with what was measured.
   */
  it("predicts EQUALITY on the five-leg union, where the FOUR-clause set is empty, and 24 against 24 is measured", () => {
    // Fix round 2, item B: the set is COMPUTED by governingNetsOf, with all four clauses, rather
    // than read off g.external as a proxy. Under the TWO-clause sentence round 1 published, the
    // union's set is {BASE, COLLECTOR} and not empty - it is empty only once the fourth clause,
    // does-not-leave-the-subject, is applied, and both of those nets reach tp-stage.
    const symbols = parityResolver()
    const found = PARITY_CASES.find((c) => c.name === "transistor-preamp")
    if (found === undefined) throw new Error("no transistor-preamp parity case")
    const circuit = buildCircuit(circuitSpecFrom(found.network, found.authoring, symbols), { symbols })
    const legs = ["tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b", "tp-leg-collector"]
    const g = flatSubgraphOf(circuit, legs, symbols, "legs~flat", "flat")
    // THE THREE-CLAUSE SET - the clauses the CODE tests, which is one more than round 1's
    // sentence named: NOT empty.
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

/**
 * **G229's REFUSAL, RE-HOMED HERE 2026-10-25 BECAUSE THE EXPERIMENT STOPPED CARRYING IT.**
 *
 * `docs/known-gaps.md` **G229** records that `transistor-preamp`'s five drawing blocks, drawn as
 * ONE flat graph, are refused by spec §1.4 obligation 2 - the junction obligation - with the net
 * and the coordinate in the refusal text. Its stated evidence was
 * `tests/schgen/remeasure.test.ts`'s *"has a FLAT side that refuses, at the junction obligation"*,
 * and **that test is gone**: boundary-node sizing made all seven `transistor-preamp` blocks draw
 * (**G291**), `integratedExperiment`'s guard refuses a circuit where every block draws, and the
 * experiment's subject moved to `optical-compressor`. That subject's flat side was ACCEPTED for a
 * day and **is refused at obligation 1 since the signal-order change** (**G292**) - so the
 * experiment carries a flat refusal again, but it is the SNAP rather than the junction, on a
 * different circuit. **It is still not G229's figure**, which is why this file keeps it.
 *
 * **SO THE MEASUREMENT WAS ABOUT TO BECOME AN ENTRY WITH NO LIVE CHECK BEHIND IT**, which
 * `tests/schgen/pointers.test.ts` caught by name. It is re-driven here, over the same five blocks
 * and the same `flatSubgraphOf` this file already uses, so G229 keeps evidence that can fail.
 *
 * `[RAN]` **the refusal survived G291's node sizing byte-for-byte - same net, same coordinate -
 * and the signal-order change (G292) MOVED THE COORDINATE, which is the sharper of the two
 * results.** Node sizing moved the boundary rather than the branch, so `(45.72, 48.26)` held
 * through a change that moved wire length or occupied area on ten of twelve blocks. Ordering a
 * net's ELK edges by downstream depth moves where the three legs' `BASE` pins MEET, so the branch
 * point itself moved, to **`(46.99, 43.18)`**.
 *
 * **WHAT IS UNMOVED IS THE WHOLE OF WHAT G229 IS ABOUT**: the obligation (2, the junction
 * obligation), the net (`BASE`), the kind (`t-junction`) and the count (one place). The coordinate
 * is a record. G229 carries both coordinates, the old one marked superseded, because its text
 * quotes a refusal verbatim and a reader who greps for the old string needs to find out why it is
 * gone rather than find nothing.
 */
describe("G229's junction-obligation refusal, which the integrated experiment no longer reaches", () => {
  it("refuses the five-leg flat probe at the junction obligation, naming the net and the point", async () => {
    const symbols = parityResolver()
    const c = PARITY_CASES.find((x) => x.name === "transistor-preamp")
    if (c === undefined) throw new Error("transistor-preamp is not a parity case")
    const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
    const legs = ["tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b", "tp-leg-collector"]
    const g = flatSubgraphOf(circuit, legs, symbols)
    expect(g.units.length, "the five legs hold fourteen units between them").toBe(14)
    const outcomes = await layoutBlocks([elkInputOf(g)])
    const outcome = outcomes.get(g.block.id)
    expect(outcome?.ok, "the flat graph LAYS OUT, and is refused after it").toBe(true)
    if (outcome === undefined || !outcome.ok) return
    const report = adaptElkLayoutReported(g, outcome)
    expect(report.result.ok).toBe(false)
    if (report.result.ok) return
    const refusal = describeMismatch(report.result.mismatch)
    expect(refusal).toContain("the junctions the sheet emitter would place disagree")
    // ONE place, asserted as the count, because that is the half of G229's figure the coordinate is
    // not: a second branch point appearing here would be a different measurement.
    expect(refusal).toContain("disagree with the branch points of the canonical topology in 1 place(s)")
    expect(refusal).toContain("net BASE branches at (46.99, 43.18) (t-junction) and no junction is emitted")
    // The coordinate G229 quoted until 2026-10-25, asserted ABSENT rather than dropped, so this
    // test says which string went away and the entry's old quote cannot look live.
    expect(refusal).not.toContain("(45.72, 48.26)")
  }, 300_000)

  /**
   * **AND THE SEVEN-BLOCK FLAT PROBE REFUSES AT THE SAME OBLIGATION NOW, WHICH REFUTES THIS
   * TEST'S OWN PREVIOUS REASON FOR EXISTING.** This test was `refuses the seven-block flat probe
   * at the SNAP, which is a different obligation`, and its comment said the seven-block union
   * *"refuses at obligation 1 - the snap collapse - on a `VCC` wire 10 nanometres long, not at
   * obligation 2, so it is a measurement of a different thing"*. **Since the signal-order change
   * (`docs/known-gaps.md` **G292**) it refuses at obligation 2** - the junction obligation - and
   * the snap no longer collapses anything on it at all.
   *
   * **SO "a different obligation" IS NO LONGER WHY THE FIVE ARE STILL THE SUBJECT.** What is still
   * true, and is what this test now asserts: the seven-block probe refuses on **two** branch
   * points, on `COLLECTOR` and `GND`, where G229's figure is **one**, on `BASE`. A different net,
   * a different count and a different coordinate is still not a successor to that figure - but it
   * is a weaker separation than an obligation apart, and the weakening is recorded rather than
   * papered over.
   */
  it("refuses the seven-block flat probe on TWO branch points, not on G229's one", async () => {
    const symbols = parityResolver()
    const c = PARITY_CASES.find((x) => x.name === "transistor-preamp")
    if (c === undefined) throw new Error("transistor-preamp is not a parity case")
    const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
    const g = flatSubgraphOf(circuit, [...circuit.blocks.keys()], symbols)
    expect(g.units.length, "all seven blocks hold thirty-two units between them").toBe(32)
    const outcomes = await layoutBlocks([elkInputOf(g)])
    const outcome = outcomes.get(g.block.id)
    if (outcome === undefined || !outcome.ok) throw new Error("the seven-block flat probe did not lay out")
    const report = adaptElkLayoutReported(g, outcome)
    expect(report.result.ok).toBe(false)
    if (report.result.ok) return
    const refusal = describeMismatch(report.result.mismatch)
    expect(refusal).toContain("the junctions the sheet emitter would place disagree")
    expect(refusal).toContain("disagree with the branch points of the canonical topology in 2 place(s)")
    expect(refusal).toContain("net COLLECTOR branches at (41.91, 74.93) (t-junction)")
    expect(refusal).toContain("net GND branches at (111.76, 62.23) (t-junction)")
    // THE SNAP IS CLEAN ON THIS PROBE NOW, asserted as absent: the `VCC` wire 10 nanometres long
    // that this test used to be named after is gone, and saying so is what stops a later reader
    // taking the obligation-1 claim as still live.
    expect(refusal).not.toContain("snapping the ELK route onto KiCad's 1.27 mm grid collapsed geometry")
    // AND IT IS NOT G229's FIGURE: a different net and a different count, on the same obligation.
    expect(refusal).not.toContain("net BASE branches")
    expect(refusal).not.toContain("in 1 place(s)")
  }, 300_000)
})

describe("the report line", () => {
  it("names the direction, the prediction and the subject that is not a baseline", () => {
    const lines = renderEdgeCensus(oc).join("\n")
    expect(lines).toContain("ADDS 3")
    expect(lines).toContain("AGREES")
    expect(lines).toContain("NOT a flat baseline")
  })
})
