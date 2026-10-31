/**
 * **THE INTEGRATED EXPERIMENT: one circuit drawn FLAT against the same blocks drawn separately
 * and composed by seam B, on the same four measures.**
 *
 *   bun tools/schgen/remeasure-composed.ts
 *
 * Hand-written for Task 17 of the M1 schematic-authoring plan.
 *
 * **THE CRITERION, WHICH IS `docs/known-gaps.md` G105's:** *"an integrated measurement draws one
 * complete circuit with both template-drawn and ELK-drawn blocks, composes it onto sheets, and
 * reports the four measures against the FLAT whole-circuit baseline - so what survives of the bound
 * is a number rather than an assumption."*
 *
 * **THE SUBJECT IS `transistor-preamp`, AS A WHOLE CIRCUIT, SINCE 2026-10-26 - AND IT HAS MOVED
 * THREE TIMES. `docs/known-gaps.md` **G297** CARRIES THE HISTORY AND `SUBJECT_CIRCUIT` BELOW
 * CARRIES THE REASONING.** The brief's own mechanism was `optical-compressor`, *"because both ends
 * of the comparison already exist"* - whole gave 293 crossings / 3.18 bends per edge / 4.05:1 /
 * 159 967 and its three declared blocks gave 48 / 2.70 / 3.11:1 / 35 070. That circuit draws NONE
 * of its three blocks today (**G296**), so it is not available.
 *
 * **CONTROLLER RULING R38's SUB-CIRCUIT WAS A SUBSTITUTION AND IS NO LONGER NEEDED, WHICH IS THE
 * ONE THING TO UNDERSTAND BEFORE READING ANY FIGURE BELOW.** R38 substituted `transistor-preamp`
 * for the brief's subject because the brief's was *"unavailable: all three `oc-*` blocks are among
 * the seven the post-layout gates refuse, so there is no composed side to measure"*, and directed
 * *"the subject becomes the sub-circuit induced by the blocks that actually draw - at HEAD, the
 * five transistor-preamp legs."* **All seven of `transistor-preamp`'s blocks draw now, so the flat
 * side is the WHOLE circuit** - which is G105's criterion as written rather than a workaround for
 * it, and the guard that used to refuse this case is split in `integratedExperiment` below.
 *
 * **AND THE WHOLE-CIRCUIT SUBJECT BUYS WHAT R38's COULD NOT: A TWO-SIDED ACCEPTED-STAGE
 * COMPARISON.** On the five legs and on the six the flat probe was refused by the junction gate, so
 * *"the accepted column holds a composed drawing and a refusal"* and the only stage-matched
 * comparison was at `backend-output`. The seven-block flat probe is ACCEPTED, so G105's criterion -
 * *"reports the four measures against the FLAT whole-circuit baseline"* - has figures on both sides
 * of it at the stage the drawing is actually emitted from, and `crossingRatio` has a numerator for
 * the first time.
 *
 * **FOUR THINGS THAT TRAVEL WITH EVERY FIGURE THIS MODULE PRODUCES, per R38:**
 *
 * 1. **the spike's 6.1x is NOT RE-DERIVABLE here and is still reported NOT-COMPARABLE.** The
 *    spike's numbers came from a different frontend, with different node sizes and different port
 *    constraints, and G101's own caveat applies - and its subject was `optical-compressor`, which
 *    is not this one. Nothing is approximated, nothing is scaled, and no *"fraction of 6.1x
 *    survived"* is computed. The ratio below is the one measured here, named as that;
 * 2. **whether the flat side is a SUB-CIRCUIT is PRINTED and not assumed either way.** It is the
 *    whole circuit at the current geometry; `renderExperiment` says so in its own line, and says
 *    which blocks are left out when any are. **A composed-against-flat ratio over a subset is a
 *    narrower claim than the brief anticipated**, so the narrowness is printed beside the number
 *    rather than carried in this comment, which is how it came to be false for a day;
 * 3. **there is NO template in this comparison.** G105's criterion asks for *"both template-drawn
 *    and ELK-drawn blocks"*; the ported templates draw 0 of this repository's 12 blocks as declared
 *    (**G160**), so the composed side is seven ELK blocks. That half of the criterion is NOT met and
 *    saying so is the result;
 * 4. **a ratio below 1x is a legitimate outcome** and is reported as one - a finding about seam B,
 *    not a failure of the measurement.
 *
 * **THE FLAT SIDE IS A PROBE AND DECLARES NOTHING.** `flatSubgraphOf` - now in `./remeasure-edges.ts`,
 * where fix round 1 corrected it to rebuild `Circuit.unitBlock` - builds one `BlockSubgraph`
 * whose members are the union of the drawing blocks' members, hands it to the same
 * `elkInputOf` -> `layoutBlocks` -> `adaptElkLayoutReported` chain every block goes through, and
 * writes no file, no declaration and no authoring entry. It is the same posture
 * `tools/schgen/anchor-sweep.ts` takes and **G160** states for it: a brute-forced subject *"chooses
 * no arrangement, writes no declaration and emits nothing, so it is a measurement rather than an
 * authored criterion."* **Nothing in this repository declares a single block holding all of
 * `transistor-preamp` and this module does not propose one.**
 *
 * **AND THE COMPARISON IS TAKEN OVER BLOCK GEOMETRY ON BOTH SIDES, NEVER OVER FRAMES.** G208's own
 * caution for this step: *"the comparison against the flat baseline must compare like with like,
 * and the flat drawing has no frames and no interface glyphs at all."* So the four measures are
 * taken over wires and pin ends on both sides. The frame-inclusive sheet extent is printed
 * separately and labelled, because **G207** measured one sheet's extent moving from 185.42 x 38.10
 * to 109.22 x 71.12 mm under the two packers for identical content.
 */

import { circuitSpecFrom } from "../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../lib/schgen/ir/build.ts"
import { canonicalTopology } from "../../lib/schgen/elk/junctions.ts"
import { elkInputOf } from "../../lib/schgen/elk/graph.ts"
import { readElkGraph } from "../../lib/schgen/elk/read-graph.ts"
import { describeMismatch } from "../../lib/schgen/render/block-types.ts"
import { placedPins, subgraphOf } from "../../lib/schgen/render/blocks.ts"
import { adaptElkLayoutReported } from "../../lib/schgen/elk/adapt.ts"
import { blockContent, contentOffset, translateLayout } from "../../lib/schgen/render/frames.ts"
import { PAPER } from "../../lib/schgen/render/sheets.ts"
import { frameBoxOverlaps, framePlacements, packingMeasures } from "../../lib/schgen/elk/sheet-graph.ts"
import { measuresOf, type SchematicMeasures } from "../../lib/schgen/readability/measures.ts"
import { elkBackendFrom, elkPrePass, layoutBlocks } from "./elk/layout.ts"
import { packSheet } from "./elk/sheet-layout.ts"
import { PARITY_CASES, parityResolver, type ParityCase } from "./authoring-census.ts"
import { aspectOf } from "./remeasure.ts"
import { flatSubgraphOf } from "./remeasure-edges.ts"
import { SPIKE_BLOCKED_OPTICAL_COMPRESSOR, SPIKE_CROSSING_RATIO, SPIKE_WHOLE_OPTICAL_COMPRESSOR } from "./remeasure-spikes.ts"
import type { BlockLayout, BlockSubgraph } from "../../lib/schgen/render/block-types.ts"
import type { ElkOutcome } from "../../lib/schgen/elk/graph.ts"
import type { FrameContent } from "../../lib/schgen/render/frames.ts"
import type { BlockId } from "../../lib/schgen/ir/types.ts"
import type { PlacedPin } from "../../lib/schgen/render/unit-pins.ts"

/**
 * The circuit the experiment's subject comes from: the one where AT LEAST ONE block draws.
 *
 * **IT IS `transistor-preamp`, AND SINCE 2026-10-26 IT IS THE WHOLE CIRCUIT RATHER THAN A
 * SUB-CIRCUIT. THE SUBJECT HAS MOVED THREE TIMES AND THAT IS THE FINDING, NOT AN ANNOYANCE**
 * (`docs/known-gaps.md` **G297**). It was `transistor-preamp` until 2026-10-25, when all seven of
 * its blocks drew and the guard below refused that case; the subject moved to `optical-compressor`,
 * which drew two of its three. It moved back when `optical-compressor` came to draw NONE of its
 * three - `edgesForNet`'s star re-placed every block and `oc-power` and `oc-audio` both land one
 * power symbol's VALUE text on their own parts and wires (**G296**), while `oc-sidechain` has been
 * refused at obligation 3 throughout - at 6 of 7 with `tp-leg-upper` refused. **`tp-leg-upper`
 * draws again and the subject is now 7 of 7**, which the old guard refused.
 *
 * **THE GUARD WAS SPLIT RATHER THAN RELAXED, AND WHAT THE THREE MOVES SHOW IS THAT *"the circuit
 * where SOME blocks draw"* IS NOT A PROPERTY OF A CIRCUIT AT ALL** - it is a property of the
 * current geometry, and every geometry change can take it away from whichever circuit holds it.
 * That is exactly why the "all draw" half had to go: it made a WORKAROUND's precondition into a
 * requirement, so the one state satisfying G105's own criterion was the one state refused. The
 * "none draw" half stands, and the subject is named in one place so that a move is one edit and a
 * loud one.
 */
export const SUBJECT_CIRCUIT = "transistor-preamp"

export interface SideMeasures {
  readonly measures: SchematicMeasures
  readonly aspect: number | null
  readonly placements: number
  readonly wires: number
  readonly nets: number
}

/** What a side of the comparison came out as: measured, or refused with the refusal verbatim. */
export type Side =
  | { readonly ok: true; readonly figures: SideMeasures }
  | { readonly ok: false; readonly refusal: string; readonly gate: string }

function sideOf(layout: BlockLayout, pins: readonly PlacedPin[]): Side {
  const t = canonicalTopology(layout, pins)
  if (!t.ok) {
    return {
      ok: false,
      gate: "canonicalTopology (spec 1.4 revision 4, clause d)",
      refusal: `the canonical topology was refused: ${t.ambiguous.join("; ")}`,
    }
  }
  return {
    ok: true,
    figures: {
      measures: measuresOf(t, pins),
      aspect: aspectOf(t, pins),
      placements: layout.placements.length,
      wires: t.wires.length,
      nets: new Set(t.wires.map((w) => w.net)).size,
    },
  }
}

export interface IntegratedExperiment {
  readonly circuit: string
  readonly blocks: readonly BlockId[]
  readonly notDrawn: readonly { readonly id: BlockId; readonly reason: string }[]
  /** The drawing blocks as ONE graph through the same backend. */
  readonly flat: Side
  /**
   * The flat probe's figures at the `backend-output` stage - the PRE-SNAP canonical topology of
   * what `elkjs` emitted - **which exists whether or not the gates accept it.**
   *
   * **IT IS A DIFFERENT STAGE FROM `composed` AND NO RATIO IS TAKEN BETWEEN THE TWO.** It is
   * reported because a refusal with no figure beside it tells a later reader nothing about the
   * graph, and because it is exactly the stage `./remeasure.ts` reports for the two declared
   * blocks the gates refuse - so the flat probe sits in that table's own column rather than in a
   * column of its own.
   */
  readonly flatBackendOutput: Side
  /** The same blocks drawn separately, translated into their packed frames: the composed geometry. */
  readonly composed: Side
  /** Each block's own geometry before composition, so intra-block crossings can be separated. */
  readonly perBlock: readonly { readonly id: BlockId; readonly figures: SideMeasures }[]
  /**
   * The same blocks at the `backend-output` stage, so there is ONE comparison in this experiment
   * where both sides are at the same stage.
   *
   * **IT IS HERE BECAUSE THE ACCEPTED-STAGE COMPARISON HAS ONLY ONE SIDE.** The flat probe is
   * refused by the junction gate, so the accepted column holds a composed drawing and a refusal.
   * These rows and `flatBackendOutput` are both the pre-snap canonical topology of what `elkjs`
   * emitted, which makes their difference attributable to the decomposition rather than to the
   * stage. **It is NOT a drawing on either side**, and no figure here is reported as one.
   */
  readonly perBlockBackendOutput: readonly { readonly id: BlockId; readonly figures: SideMeasures }[]
  /** `composed.crossings - sum(perBlock.crossings)`: what composition itself contributed. */
  readonly interBlockCrossings: number | null
  /** `composed.wireLength - sum(perBlock.wireLength)`: what composition itself drew. */
  readonly interBlockWireLength: number | null
  /** `flat.crossings / composed.crossings`, or `null` where either side has no figure. */
  readonly crossingRatio: number | null
  readonly packedBy: "shelf" | "elk"
  /** The frame-inclusive sheet extent, which moves with the packer (**G207**) and is not compared. */
  readonly sheetExtent: { readonly w: number; readonly h: number; readonly aspect: number }
  readonly frameOverlaps: readonly string[]
}

/**
 * THE EXPERIMENT: both ends, measured here, on the blocks that draw.
 *
 * **IT REFUSES TO RUN ON A CIRCUIT WHERE NO BLOCK DRAWS**, because there is then no composed side
 * to compare the flat probe against. **It does NOT refuse the all-drawing case**: that is G105's
 * own *"one COMPLETE CIRCUIT … against the FLAT WHOLE-CIRCUIT baseline"*, and the guard inside
 * explains why reading it as a refusal inverted the criterion. `renderExperiment` states which case
 * a run is in, so no sub-circuit caveat is ever printed falsely.
 */
export async function integratedExperiment(name: string = SUBJECT_CIRCUIT, cases: readonly ParityCase[] = PARITY_CASES): Promise<IntegratedExperiment> {
  const found = cases.find((c) => c.name === name)
  if (found === undefined) {
    throw new Error(`no parity circuit is called ${name} (they are ${cases.map((c) => c.name).join(", ")})`)
  }
  const symbols = parityResolver()
  const circuit = buildCircuit(circuitSpecFrom(found.network, found.authoring, symbols), { symbols })
  const outcomes = await elkPrePass(circuit, symbols)
  const elk = elkBackendFrom(outcomes)

  const contents: FrameContent[] = []
  const drew: BlockId[] = []
  const notDrawn: { id: BlockId; reason: string }[] = []
  for (const block of circuit.blocks.values()) {
    try {
      contents.push(blockContent(circuit, block.id, symbols, elk))
      drew.push(block.id)
    } catch (e) {
      notDrawn.push({ id: block.id, reason: e instanceof Error ? e.message : String(e) })
    }
  }
  // **THIS GUARD REFUSED TWO DIFFERENT THINGS UNDER ONE MESSAGE AND HAS BEEN SPLIT, 2026-10-26.**
  // It read `drew.length === 0 || notDrawn.length === 0` and said the experiment "is specified for
  // a circuit where SOME blocks draw". The two halves are not the same claim:
  //
  // - **none drawing is a real refusal and stays.** There is no composed side at all, so there is
  //   nothing to compare the flat probe against.
  // - **all drawing is NOT a refusal, and reading it as one inverted G105's criterion.** That
  //   criterion, quoted in this module's header, asks for *"an integrated measurement [that] draws
  //   one COMPLETE CIRCUIT ... and reports the four measures against the FLAT WHOLE-CIRCUIT
  //   baseline"*. R38's sub-circuit subject was a SUBSTITUTION, taken because *"all three `oc-*`
  //   blocks are among the seven the post-layout gates refuse, so there is no composed side to
  //   measure"* - a workaround for an unavailable whole circuit, not a demand for a partial one.
  //   The old guard therefore refused the one state that satisfies the brief as written.
  //
  // What the second half was really protecting was a PRINTED CLAIM: the header's caveat that the
  // flat side is a sub-circuit would be false where nothing is left out. That is fixed by not
  // printing a false caveat - `renderExperiment` below states which case the run is in - rather
  // than by refusing the measurement. `docs/known-gaps.md` **G297**.
  if (drew.length === 0) {
    throw new Error(
      `${name}: none of its ${notDrawn.length} blocks draw, so there is no composed side to ` +
        "measure and no comparison to take. The subject is named at SUBJECT_CIRCUIT in this " +
        "module; move it to a circuit with at least one drawing block rather than relaxing this.",
    )
  }

  const paper = PAPER["A3"]
  const packing = await packSheet(contents, paper)
  if (!packing.ok) {
    throw new Error(
      `${name}: the ${drew.length} drawing blocks do not fit on A3 (at least ${packing.needed.w} x ` +
        `${packing.needed.h} um would be needed), so there is no composed geometry to measure.`,
    )
  }

  const placed: BlockLayout[] = []
  const perBlock: { id: BlockId; figures: SideMeasures }[] = []
  const composedPins: PlacedPin[] = []
  contents.forEach((f, i) => {
    const pos = packing.at[i]
    if (f.block === null || f.blockId === null || pos === undefined) return
    const own = sideOf(f.block.layout, placedPins(f.block.g, f.block.layout.placements))
    if (!own.ok) {
      throw new Error(
        `block ${f.blockId} drew and then its own geometry was refused by ${own.gate}: ${own.refusal}. ` +
          "A block that passed the realization contract cannot have an unreadable topology here; " +
          "this is a defect in lib/schgen/elk/adapt.ts rather than a row to omit.",
      )
    }
    perBlock.push({ id: f.blockId, figures: own.figures })
    const moved = translateLayout(f.block.layout, contentOffset(f, pos))
    placed.push(moved)
    composedPins.push(...placedPins(f.block.g, moved.placements))
  })
  const composed = sideOf(
    { placements: placed.flatMap((l) => l.placements), wires: placed.flatMap((l) => l.wires), anchors: placed.flatMap((l) => l.anchors) },
    composedPins,
  )

  const perBlockBackendOutput = drew.map((id) => {
    const outcome = outcomes.get(id)
    if (outcome === undefined || !outcome.ok) {
      throw new Error(
        `block ${id} drew, so elkPrePass must hold a laid-out outcome for it and holds ` +
          `${outcome === undefined ? "none" : "a raise"}. The backend-output column cannot be ` +
          "taken without it, and omitting the row would make the stage-matched comparison cover " +
          "fewer blocks than the accepted one while looking like the same subject.",
      )
    }
    const g = subgraphOf(circuit, id, symbols)
    const built = readElkGraph(g, outcome.graph)
    const own = sideOf({ placements: built.placements, wires: built.wires, anchors: built.anchors }, placedPins(g, built.placements))
    if (!own.ok) throw new Error(`block ${id}: its pre-snap topology was refused (${own.refusal}), so the backend-output column cannot be taken`)
    return { id, figures: own.figures }
  })

  const flatG = flatSubgraphOf(circuit, drew, symbols)
  const flatOutcomes = await layoutBlocks([elkInputOf(flatG)])
  const flat = flatSide(flatG, flatOutcomes.get(flatG.block.id))
  const flatBackendOutput = flatBackend(flatG, flatOutcomes.get(flatG.block.id))

  const intraCrossings = perBlock.reduce((n, b) => n + b.figures.measures.crossings, 0)
  const intraWire = perBlock.reduce((n, b) => n + b.figures.measures.wireLength, 0)
  const measures = packingMeasures(contents, packing.at, paper)
  return {
    circuit: name,
    blocks: drew,
    notDrawn,
    flat,
    flatBackendOutput,
    composed,
    perBlock,
    perBlockBackendOutput,
    interBlockCrossings: composed.ok ? composed.figures.measures.crossings - intraCrossings : null,
    interBlockWireLength: composed.ok ? composed.figures.measures.wireLength - intraWire : null,
    crossingRatio:
      flat.ok && composed.ok && composed.figures.measures.crossings > 0
        ? flat.figures.measures.crossings / composed.figures.measures.crossings
        : null,
    packedBy: packing.by,
    sheetExtent: { w: measures.extent.w, h: measures.extent.h, aspect: measures.aspect },
    frameOverlaps: frameBoxOverlaps(framePlacements(contents, packing.at), contents),
  }
}

/** The flat probe through the same backend chain every declared block goes through. */
function flatSide(g: BlockSubgraph, outcome: ElkOutcome | undefined): Side {
  if (outcome === undefined) return { ok: false, gate: "layoutBlocks", refusal: `no outcome for ${g.block.id}` }
  if (!outcome.ok) {
    return { ok: false, gate: `${"elkjs"} (a raise, docs/known-gaps.md G94)`, refusal: describeMismatch(outcome.mismatch) }
  }
  const report = adaptElkLayoutReported(g, outcome)
  if (!report.result.ok) {
    // R38: "If the flat side REFUSES, that refusal is the result." The measures are still taken over
    // the router's own output, which is the same stage ./remeasure.ts reports for the two blocks
    // the gates refuse - so the comparison has a figure and the figure says which stage it is from.
    return { ok: false, gate: "lib/schgen/elk/adapt.ts (spec 1.4's realization contract)", refusal: describeMismatch(report.result.mismatch) }
  }
  const layout = report.result.layout
  return sideOf(layout, placedPins(g, layout.placements))
}

/** The same probe at the `backend-output` stage: the pre-snap canonical topology elkjs produced. */
function flatBackend(g: BlockSubgraph, outcome: ElkOutcome | undefined): Side {
  if (outcome === undefined) return { ok: false, gate: "layoutBlocks", refusal: `no outcome for ${g.block.id}` }
  if (!outcome.ok) return { ok: false, gate: "elkjs (a raise)", refusal: describeMismatch(outcome.mismatch) }
  const built = readElkGraph(g, outcome.graph)
  return sideOf({ placements: built.placements, wires: built.wires, anchors: built.anchors }, placedPins(g, built.placements))
}

export function renderExperiment(x: IntegratedExperiment): readonly string[] {
  const side = (label: string, s: Side): string =>
    s.ok
      ? `${label}: placements ${s.figures.placements} wires ${s.figures.wires} nets ${s.figures.nets} ` +
        `bends ${s.figures.measures.bends} perEdge ${s.figures.measures.bendsPerEdge.toFixed(2)} ` +
        `crossings ${s.figures.measures.crossings} len ${s.figures.measures.wireLength.toFixed(2)} ` +
        `area ${s.figures.measures.occupiedArea.toFixed(2)} aspect ${s.figures.aspect?.toFixed(2) ?? "none"}`
      : `${label}: REFUSED by ${s.gate} - ${s.refusal.slice(0, 400)}`
  return [
    `subject ${x.circuit}, ${x.blocks.length} of ${x.blocks.length + x.notDrawn.length} declared blocks: ${x.blocks.join(", ")}`,
    x.notDrawn.length === 0
      ? "not drawn: none - the flat side is the WHOLE circuit, which is G105's criterion as written " +
        "and not R38's sub-circuit substitution; no sub-circuit caveat applies to these figures"
      : `not drawn: ${x.notDrawn.map((n) => n.id).join(", ")} - the flat side is a SUB-CIRCUIT and a ` +
        "composed-against-flat ratio over it is a narrower claim than G105 anticipated",
    side("FLAT (one graph, accepted stage)", x.flat),
    side("FLAT (one graph, backend-output stage)", x.flatBackendOutput),
    side("COMPOSED (seam B)", x.composed),
    ...x.perBlock.map((b) => `  block ${b.id} accepted: crossings ${b.figures.measures.crossings} len ${b.figures.measures.wireLength}`),
    ...x.perBlockBackendOutput.map((b) => `  block ${b.id} backend-output: crossings ${b.figures.measures.crossings} len ${b.figures.measures.wireLength.toFixed(2)} bends ${b.figures.measures.bends}`),
    `STAGE-MATCHED (backend-output both sides): flat crossings ${x.flatBackendOutput.ok ? x.flatBackendOutput.figures.measures.crossings : "not taken"} against blocks ${x.perBlockBackendOutput.reduce((n, b) => n + b.figures.measures.crossings, 0)}; ` +
      `flat wire ${x.flatBackendOutput.ok ? x.flatBackendOutput.figures.measures.wireLength.toFixed(2) : "not taken"} against blocks ${x.perBlockBackendOutput.reduce((n, b) => n + b.figures.measures.wireLength, 0).toFixed(2)}; ` +
      `flat bends ${x.flatBackendOutput.ok ? x.flatBackendOutput.figures.measures.bends : "not taken"} against blocks ${x.perBlockBackendOutput.reduce((n, b) => n + b.figures.measures.bends, 0)}`,
    `inter-block crossings ${x.interBlockCrossings ?? "not taken"}, inter-block wire ${x.interBlockWireLength ?? "not taken"}`,
    `crossing ratio flat/composed ${x.crossingRatio === null ? "not taken" : `${x.crossingRatio.toFixed(2)}x`} - measured on THIS subject, NOT the spike's 6.1x`,
    `the spike's paired control, NOT-COMPARABLE on this subject: whole ${SPIKE_WHOLE_OPTICAL_COMPRESSOR.crossings} against blocks ${SPIKE_BLOCKED_OPTICAL_COMPRESSOR.crossings} = ${SPIKE_CROSSING_RATIO}x on optical-compressor`,
    `packed by ${x.packedBy}, sheet extent ${(x.sheetExtent.w / 1000).toFixed(2)} x ${(x.sheetExtent.h / 1000).toFixed(2)} mm (${x.sheetExtent.aspect.toFixed(2)}:1) - moves with the packer, G207`,
    `frame overlaps: ${x.frameOverlaps.length === 0 ? "none" : x.frameOverlaps.join("; ")}`,
  ]
}

if (import.meta.main) {
  for (const line of renderExperiment(await integratedExperiment())) console.log(line)
}
