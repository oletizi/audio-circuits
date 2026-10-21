/**
 * **THE INTEGRATED EXPERIMENT: one sub-circuit drawn FLAT against the same blocks drawn separately
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
 * **THE SUBJECT IS NOT THE ONE THE BRIEF NAMES, AND THE SUBSTITUTION IS CONTROLLER RULING R38.**
 * The brief's mechanism is `optical-compressor`, *"because both ends of the comparison already
 * exist"* - whole gave 293 crossings / 3.18 bends per edge / 4.05:1 / 159 967 and its three
 * declared blocks gave 48 / 2.70 / 3.11:1 / 35 070. **That mechanism is unavailable: all three
 * `oc-*` blocks are among the seven the post-layout gates refuse**, so there is no composed side to
 * measure. R38: *"the subject becomes the sub-circuit induced by the blocks that actually draw - at
 * HEAD, the five transistor-preamp legs. Measure BOTH ENDS HERE."*
 *
 * **FOUR THINGS THAT TRAVEL WITH EVERY FIGURE THIS MODULE PRODUCES, per R38:**
 *
 * 1. **the spike's 6.1x is NOT RE-DERIVABLE on this subject and is reported NOT-COMPARABLE.** It is
 *    not approximated, not scaled, and no *"fraction of 6.1x survived"* is computed against a
 *    different circuit. The ratio below is the one measured here, on this subject, named as that;
 * 2. **the flat side is a SUB-CIRCUIT and not a whole circuit.** The five legs are five of
 *    `transistor-preamp`'s seven declared blocks; `tp-leg-emitter-bypass` and `tp-stage` are on the
 *    same declared sheet and are left out because they do not draw. **A composed-against-flat ratio
 *    over a five-block subset of one circuit family is a much narrower claim than the brief
 *    anticipated**, and the narrowness is printed beside the number;
 * 3. **there is NO template in this comparison.** G105's criterion asks for *"both template-drawn
 *    and ELK-drawn blocks"*; the ported templates draw 0 of this repository's 12 blocks as declared
 *    (**G160**), so the composed side is five ELK blocks. That half of the criterion is NOT met and
 *    saying so is the result;
 * 4. **a ratio below 1x is a legitimate outcome** and is reported as one - a finding about seam B,
 *    not a failure of the measurement.
 *
 * **THE FLAT SIDE IS A PROBE AND DECLARES NOTHING.** `flatSubgraphOf` builds one `BlockSubgraph`
 * whose members are the union of five declared blocks' members, hands it to the same
 * `elkInputOf` -> `layoutBlocks` -> `adaptElkLayoutReported` chain every block goes through, and
 * writes no file, no declaration and no authoring entry. It is the same posture
 * `tools/schgen/anchor-sweep.ts` takes and **G160** states for it: a brute-forced subject *"chooses
 * no arrangement, writes no declaration and emits nothing, so it is a measurement rather than an
 * authored criterion."* **Nothing in this repository declares a five-leg block and this module does
 * not propose one.**
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
import { SPIKE_BLOCKED_OPTICAL_COMPRESSOR, SPIKE_CROSSING_RATIO, SPIKE_WHOLE_OPTICAL_COMPRESSOR } from "./remeasure-spikes.ts"
import type { BlockLayout, BlockSubgraph } from "../../lib/schgen/render/block-types.ts"
import type { ElkOutcome } from "../../lib/schgen/elk/graph.ts"
import type { FrameContent } from "../../lib/schgen/render/frames.ts"
import type { BlockId, Circuit, IrBlock } from "../../lib/schgen/ir/types.ts"
import type { PlacedPin } from "../../lib/schgen/render/unit-pins.ts"
import type { SymbolResolver } from "../../lib/schgen/render/library.ts"

/** The circuit the experiment's subject comes from: the one with blocks that draw. */
export const SUBJECT_CIRCUIT = "transistor-preamp"

/** The id the flat probe's block carries. The tilde marks it as a probe id, not a declared one. */
export const FLAT_PROBE_ID = "tp-drawing-legs~flat"

/**
 * ONE `BlockSubgraph` OVER THE UNION OF SEVERAL DECLARED BLOCKS' MEMBERS.
 *
 * **IT GOES THROUGH `subgraphOf` RATHER THAN BUILDING A SUBGRAPH BY HAND, and that is the whole
 * reason it is shaped this way.** Which nets are rails, which are ground, which are labelled and
 * external, which power symbols are needed and what intersheet reference each label prints are all
 * decided by `subgraphOf` from the circuit; a hand-merged subgraph would be a second answer to five
 * questions that already have one. So this builds an `IrBlock` whose `members` are the union, puts
 * it in a copy of the circuit, and asks `subgraphOf` about it.
 *
 * **WHAT THE COPY DOES NOT CHANGE:** the parts, the nets, the rails, the sheets, the orientations
 * and the port directions are the circuit's own, so every net classification the flat graph gets is
 * the one the declared blocks got. The union's external nets therefore include nets that are
 * internal to the union and still leave it - `BASE` reaches `tp-stage` and `COLLECTOR` reaches
 * `tp-stage` too - which is correct and is what makes the flat graph a sub-circuit rather than a
 * closed one.
 */
export function flatSubgraphOf(c: Circuit, ids: readonly BlockId[], symbols: SymbolResolver, id: string = FLAT_PROBE_ID): BlockSubgraph {
  const blocks = ids.map((b) => {
    const found = c.blocks.get(b)
    if (found === undefined) {
      throw new Error(
        `the flat probe was asked for block ${b} and this circuit has no such block (it has ` +
          `${[...c.blocks.keys()].join(", ")}). It is not skipped: a probe that quietly dropped a ` +
          "block would measure a different sub-circuit from the one the composed side draws, which " +
          "is the one thing this comparison must not do.",
      )
    }
    return found
  })
  const [first] = blocks
  if (first === undefined) throw new Error("the flat probe was given no blocks, so there is nothing to lay out flat")
  const flat: IrBlock = {
    id,
    sheet: first.sheet,
    title: `flat probe over ${ids.join(", ")}`,
    members: blocks.flatMap((b) => b.members),
    checklist: [],
    rendering: { kind: "auto" },
    order: first.order,
  }
  return subgraphOf({ ...c, blocks: new Map([...c.blocks, [id, flat]]) }, id, symbols)
}

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
  /** The five legs as ONE graph through the same backend. */
  readonly flat: Side
  /**
   * The flat probe's figures at the `backend-output` stage - the PRE-SNAP canonical topology of
   * what `elkjs` emitted - **which exists whether or not the gates accept it.**
   *
   * **IT IS A DIFFERENT STAGE FROM `composed` AND NO RATIO IS TAKEN BETWEEN THE TWO.** It is
   * reported because a refusal with no figure beside it tells a later reader nothing about the
   * graph, and because it is exactly the stage `./remeasure.ts` reports for the seven declared
   * blocks the gates refuse - so the flat probe sits in that table's own column rather than in a
   * column of its own.
   */
  readonly flatBackendOutput: Side
  /** The same five drawn as blocks, translated into their packed frames: the composed geometry. */
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
 * **IT REFUSES TO RUN ON A CIRCUIT WHOSE BLOCKS ALL DRAW OR NONE DRAW** - neither is a state this
 * repository is in, and both would make the comparison something other than what R38 directs. A
 * circuit with no drawing block has no composed side; one where every block draws would make the
 * flat side a whole circuit and the caveat in this module's header wrong.
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
  if (drew.length === 0 || notDrawn.length === 0) {
    throw new Error(
      `${name}: ${drew.length} of its ${drew.length + notDrawn.length} blocks draw. This experiment ` +
        "is specified for a circuit where SOME blocks draw (controller ruling R38): with none there " +
        "is no composed side, and with all of them the flat side would be a whole circuit and the " +
        "sub-circuit caveat this module prints would be false. Re-scope the experiment deliberately " +
        "rather than letting it report a claim it was not set up for.",
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
    // the router's own output, which is the same stage ./remeasure.ts reports for the seven blocks
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

/**
 * **G100's MECHANISM, RE-TAKEN: the EDGE COUNTS a decomposition removes.**
 *
 * G100 explains its 6.1x crossing reduction by *"the three blocks carry FEWER EDGES THAN THE WHOLE
 * - 96 against 139"*, and G105 turns that into the bound: *"they became connections BETWEEN blocks
 * ... each block was drawn on its own canvas, so the 43 edges were drawn nowhere at all and counted
 * as removed."* **This is the one part of the paired control that does not need a drawing**, so it
 * can be re-taken on `optical-compressor` itself although none of its three blocks draws.
 *
 * **THE ABSOLUTE COUNTS ARE NOT COMPARABLE AND THE RATIO IS COMPARABLE IN KIND.** The spike's edge
 * count came out of `netlistsvg`'s converter and nothing establishes that it builds a net's edges
 * the way `lib/schgen/elk/graph.ts` does (a net of degree n becomes n - 1 chain edges, **G220**). So
 * 139 and 96 are not set beside these numbers as the same quantity; what IS the same claim is
 * *"decomposition hands ELK a smaller graph"*, and the ratio measures it.
 */
export interface EdgeCensus {
  readonly circuit: string
  readonly blocks: readonly { readonly id: BlockId; readonly nodes: number; readonly edges: number }[]
  readonly blockEdgeTotal: number
  readonly flatNodes: number
  readonly flatEdges: number
  /** `flatEdges / blockEdgeTotal`: how much smaller a graph the decomposition hands ELK. */
  readonly ratio: number
}

export async function edgeCensus(name: string = "optical-compressor", cases: readonly ParityCase[] = PARITY_CASES): Promise<EdgeCensus> {
  const found = cases.find((c) => c.name === name)
  if (found === undefined) throw new Error(`no parity circuit is called ${name}`)
  const symbols = parityResolver()
  const circuit = buildCircuit(circuitSpecFrom(found.network, found.authoring, symbols), { symbols })
  const ids = [...circuit.blocks.values()].filter((b) => b.rendering.kind !== "bus").map((b) => b.id)
  const blocks = ids.map((id) => {
    const graph = elkInputOf(subgraphOf(circuit, id, symbols)).graph
    return { id, nodes: (graph.children ?? []).length, edges: (graph.edges ?? []).length }
  })
  const flat = elkInputOf(flatSubgraphOf(circuit, ids, symbols, `${name}~flat`)).graph
  const blockEdgeTotal = blocks.reduce((n, b) => n + b.edges, 0)
  return {
    circuit: name,
    blocks,
    blockEdgeTotal,
    flatNodes: (flat.children ?? []).length,
    flatEdges: (flat.edges ?? []).length,
    ratio: blockEdgeTotal === 0 ? 0 : (flat.edges ?? []).length / blockEdgeTotal,
  }
}

export function renderEdgeCensus(c: EdgeCensus): readonly string[] {
  return [
    ...c.blocks.map((b) => `  ${b.id}: ${b.nodes} nodes, ${b.edges} edges`),
    `${c.circuit}: flat ${c.flatNodes} nodes / ${c.flatEdges} edges against ${c.blocks.length} blocks totalling ${c.blockEdgeTotal} edges - ratio ${c.ratio.toFixed(3)}x`,
  ]
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
    `not drawn: ${x.notDrawn.map((n) => n.id).join(", ")}`,
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
  console.log("")
  for (const name of ["optical-compressor", SUBJECT_CIRCUIT]) {
    for (const line of renderEdgeCensus(await edgeCensus(name))) console.log(line)
  }
}
