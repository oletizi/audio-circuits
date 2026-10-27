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
import { placedPins, subgraphOf } from "../../lib/schgen/render/blocks.ts"
import { canonicalTopology } from "../../lib/schgen/elk/junctions.ts"
import { measuresOf } from "../../lib/schgen/readability/measures.ts"
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
 * day and **is refused at obligation 1 since the orientation rule** (**G292**) - so the
 * experiment carries a flat refusal again, but it is the SNAP rather than the junction, on a
 * different circuit. **It is still not G229's figure**, which is why this file keeps it.
 *
 * **SO THE MEASUREMENT WAS ABOUT TO BECOME AN ENTRY WITH NO LIVE CHECK BEHIND IT**, which
 * `tests/schgen/pointers.test.ts` caught by name. It is re-driven here, over the same five blocks
 * and the same `flatSubgraphOf` this file already uses, so G229 keeps evidence that can fail.
 *
 * `[RAN]` **the refusal survived G291's node sizing byte-for-byte - same net, same coordinate -
 * and the ORIENTATION RULE (G292) MOVED THE COORDINATE**, from `(45.72, 48.26)` to
 * `(46.99, 43.18)`, with the obligation, the net, the kind and the count all unmoved.
 *
 * **AND SINCE 2026-10-26 THE FIVE-LEG PROBE HAS NO JUNCTION DISAGREEMENT AT ALL, so G229's figure
 * HAS NO LIVE CHECK ANYWHERE. That is a LOSS and it is the first thing this describe says**
 * (`docs/known-gaps.md` **G296**). The probe was refused at obligation 4 instead - a clearance
 * problem on `VCC`'s value text - and `adaptElkLayoutReported` runs obligation 2 BEFORE obligation
 * 4, so the junction obligation passed on it. The branch point that refused for three days was
 * gone from the geometry.
 *
 * **AND SINCE THE JUMPER TURN WAS DECLINED, BOTH PROBES ARE ACCEPTED OUTRIGHT** (**G297**).
 * `switchFacesItsBank` no longer turns `Jumper:Jumper_2_Open`, so `JP1`'s `VCC` end goes to the
 * top under the rail entry; the five-leg probe's obligation-4 clearance problem goes with it and
 * the seven-block probe's remaining `GND` branch point goes too. **Neither probe refuses at any
 * obligation, so this describe no longer holds a refusal of ANY kind** - which makes its two tests
 * acceptance checks rather than refusal checks, and both still fail if a refusal returns.
 *
 * **IT IS NOT THE T-JUNCTION CHANGE THAT DID IT, WHICH WAS MEASURED RATHER THAN ASSUMED.** `[RAN]`
 * both probes with `junctionPoints`' T detection rolled back to the chain-era version: **both
 * refusals were byte-identical** at G296. So the five-leg probe's junction obligation passed
 * because the star and the two 180-degree rules moved where the three legs' `BASE` pins meet, not
 * because the emitter learned to place a junction at a T.
 *
 * **WHAT G229 NEEDS NOW is a subject whose junction obligation refuses with ONE branch point on
 * `BASE`, and this repository has none at all.** It had the seven-block probe's `GND` yesterday
 * and the integrated experiment's six-block `COLLECTOR`; both are gone. **G229 is now an entry
 * with no live check behind it anywhere in the suite, which is a finding rather than a tidy-up**,
 * and it carries every coordinate it has ever quoted with the superseded ones marked, because its
 * text quotes a refusal verbatim and a reader who greps for an old string needs to find out why it
 * is gone.
 */
describe("G229's junction-obligation refusal, which no probe in this repository still reaches", () => {
  it("gets the five-leg flat probe PAST every obligation, so it is ACCEPTED and carries no refusal", async () => {
    const symbols = parityResolver()
    const c = PARITY_CASES.find((x) => x.name === "transistor-preamp")
    if (c === undefined) throw new Error("transistor-preamp is not a parity case")
    const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
    const legs = ["tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b", "tp-leg-collector"]
    const g = flatSubgraphOf(circuit, legs, symbols)
    expect(g.units.length, "the five legs hold fourteen units between them").toBe(14)
    const outcomes = await layoutBlocks([elkInputOf(g)])
    const outcome = outcomes.get(g.block.id)
    expect(outcome?.ok, "the flat graph LAYS OUT").toBe(true)
    if (outcome === undefined || !outcome.ok) return
    const report = adaptElkLayoutReported(g, outcome)
    // **ACCEPTED AT EVERY OBLIGATION, which is the strongest form of "the junction obligation
    // passes" and is a check that fails the moment any refusal returns.** The refusal text is
    // printed into the assertion message so a red here names the obligation rather than only the
    // boolean.
    expect(report.result.ok, report.result.ok ? "accepted" : describeMismatch(report.result.mismatch)).toBe(true)
    if (!report.result.ok) return
    // **THE FIGURES, SO "ACCEPTED" IS NOT THE ONLY THING PINNED.** 14 placements is the five legs'
    // 3 + 3 + 3 + 3 + 2, and `crossings 2` is the first non-zero crossing count any
    // `transistor-preamp` flat probe has reported - each leg on its own crosses nothing
    // (`tests/schgen/readability/measures.test.ts`), so both crossings are made by flattening.
    const layout = report.result.layout
    const pins = placedPins(g, layout.placements)
    const t = canonicalTopology(layout, pins)
    expect(t.ok, "the accepted layout has an unambiguous topology").toBe(true)
    if (!t.ok) return
    const m = measuresOf(t, pins)
    expect(layout.placements.length).toBe(14)
    expect(3 + 3 + 3 + 3 + 2).toBe(layout.placements.length)
    expect([m.bends, m.crossings, m.wireLength, m.occupiedArea]).toEqual([30, 2, 477, 5555])
    // EVERY REFUSAL STRING THIS PROBE HAS EVER CARRIED, asserted ABSENT by name rather than
    // dropped, so this test says which strings went away and no old quote can look live. They are
    // checked against the whole report - `report.notes` plus the result - because an accepted
    // result has no refusal text of its own to search.
    const everything = JSON.stringify(report)
    for (const gone of [
      "(45.72, 48.26)", "(46.99, 43.18)", "net BASE branches",
      "the junctions the sheet emitter would place disagree",
      "value of power symbol VCC 0 at (19.05, 22.86)",
    ]) {
      expect(everything, gone).not.toContain(gone)
    }
  }, 300_000)

  /**
   * **THE SEVEN-BLOCK FLAT PROBE WAS THE LAST JUNCTION-OBLIGATION REFUSAL IN THIS FILE AND IT IS
   * GONE. SO THIS FILE HOLDS NO JUNCTION REFUSAL AT ALL.** The history, because the separation
   * weakened twice and then the subject disappeared:
   *
   * 1. originally this probe refused at obligation 1, the snap collapse, *"on a `VCC` wire 10
   *    nanometres long"* - **an obligation apart** from G229's;
   * 2. the orientation rule (`docs/known-gaps.md` **G292**) moved it to obligation 2 on **two**
   *    branch points, `COLLECTOR` and `GND` - a different net and a different count;
   * 3. the star and the two 180-degree rules (**G296**) left it on **ONE** branch point, `GND` at
   *    `(55.88, 46.99)`, so the count no longer separated it from G229's figure either;
   * 4. declining the jumper turn (**G297**) leaves it **ACCEPTED**. The `GND` branch point is not
   *    at a different coordinate - it is not there.
   *
   * **WHAT THAT COSTS IS WORTH MORE THAN WHAT IT BUYS, AND IT IS THE FINDING HERE.** An accepted
   * seven-block flat probe is the first whole-circuit flat drawing this repository has produced,
   * and `tests/schgen/remeasure.test.ts`'s integrated experiment now has an accepted figure on
   * both sides of G105's ratio because of it. **But the junction obligation now has NO
   * real-geometry witness anywhere in the suite**: every refusal it ever produced here was a
   * property of one layout, and three successive geometry changes moved each of them off.
   *
   * **THE T-JUNCTION CHANGE DID NOT MOVE ANY OF THIS.** `[RAN]` with `junctionPoints`' T detection
   * rolled back: the G296 refusal was byte-identical. So the T detection was never what these
   * refusals were measuring, in either direction.
   */
  it("gets the seven-block flat probe PAST the junction obligation too, so NO probe here refuses", async () => {
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
    expect(report.result.ok, report.result.ok ? "accepted" : describeMismatch(report.result.mismatch)).toBe(true)
    if (!report.result.ok) return
    // **THE FIGURES, AND THEY ARE THE INTEGRATED EXPERIMENT'S FLAT SIDE TAKEN THROUGH THIS FILE'S
    // OWN DRIVER.** `tests/schgen/remeasure.test.ts` reports placements 32, wires 133, bends 58,
    // crossings 21, len 1292 and area 8829 for the accepted flat side of the same subject; this is
    // the second reading of all six, so neither can drift alone.
    const layout = report.result.layout
    const pins = placedPins(g, layout.placements)
    const t = canonicalTopology(layout, pins)
    expect(t.ok, "the accepted layout has an unambiguous topology").toBe(true)
    if (!t.ok) return
    const m = measuresOf(t, pins)
    expect([layout.placements.length, layout.wires.length]).toEqual([32, 133])
    expect([m.bends, m.crossings, m.wireLength, m.occupiedArea]).toEqual([58, 21, 1292, 8829])
    // EVERY BRANCH POINT AND SNAP REFUSAL THIS PROBE HAS CARRIED, asserted ABSENT by name rather
    // than dropped, so no superseded coordinate can look live in G229, G296 or G297.
    const everything = JSON.stringify(report)
    for (const gone of [
      "(41.91, 74.93)", "(111.76, 62.23)", "(55.88, 46.99)",
      "net COLLECTOR branches", "net GND branches", "net BASE branches",
      "the junctions the sheet emitter would place disagree",
      "snapping the ELK route onto KiCad's 1.27 mm grid collapsed geometry",
    ]) {
      expect(everything, gone).not.toContain(gone)
    }
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
