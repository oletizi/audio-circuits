/**
 * **SPEC §1.1, §1.8, §3.3 AND §3.4 RE-TAKEN ON THE REAL PIPELINE - the BEFORE-measurement's
 * replacement, and nothing in here is an acceptance gate.**
 *
 *   bun tools/schgen/remeasure.ts
 *
 * Hand-written for Task 17 of the M1 schematic-authoring plan.
 *
 * **WHAT IS BEING CLEARED, AND THERE ARE TWO CONTAMINATIONS RATHER THAN ONE.** Both spikes drove
 * ELK through `netlistsvg` at `d3518f1` with its pinned `elkjs` 0.7.1, and Task 12's backend does
 * not. So (1) no template was in the loop, which is spec §5.6's gap, and (2) **a front end this
 * generator will not use was in the loop** - port glyphs were `netlistsvg`'s 30x20 `inputExt`
 * cells, the congruence formula `6*len(id) + 5` was its 10 px monospace font metrics, and
 * `direction=DOWN` was its analog skin's setting, none of them ELK's (`docs/known-gaps.md`
 * **G180**). **The spikes' RATIOS survive and their ABSOLUTES do not**, because a ratio taken under
 * identical conditions on both sides is unaffected by a skin that inflates both.
 *
 * **NOTHING HERE HAS A THRESHOLD, BY DESIGN.** Spec §3.3 gives the four measures none - *"no
 * published source anywhere states an acceptable number of wire crossings, bends or wire length"*
 * (**G71**) - and revision 4 adds that absent a dominance rule they are descriptive. A figure that
 * comes out unfavourably here is a finding to record, not a result to improve, and
 * `BlockSizeDecision` is a REPORTING bound for the same reason: plan decision **D1** says the
 * generator never cuts a block, so a numeric bound that refused one would refuse a declaration.
 *
 * **THE RULE THIS MODULE IS MOST AT RISK OF BREAKING, named first.** `CLAUDE.md`: *"an agent may
 * never author the acceptance criteria for the artifact it is producing."* This module measures the
 * pipeline this project's agents built. So **which figures are taken is fixed by the Task 17 brief
 * and by spec §1.1, §1.8, §3.3 and §3.4, and which are comparable is fixed by
 * `./remeasure-spikes.ts`'s `comparabilityOf`** - never by what comes out well. A measure that
 * cannot be taken is reported as not taken, per figure.
 *
 * **THE FOUR MEASURES ARE NOT WIDENED HERE.** `SchematicMeasures` is Task 16's and keeps its five
 * numbers; `aspect` is reported BESIDE them because spec §1.1 and the spike's own §3 table both
 * ask for it and because it is the one figure in that table whose unit survives the change of
 * frontend (`comparabilityOf("aspect")`). It is not a fifth measure and nothing composites them.
 *
 * **THE SEAM THIS FILE IS THE FRONT DOOR OF**, split for `CLAUDE.md`'s 300-500 line ceiling:
 *
 *   - `./remeasure-spikes.ts` - the spikes' published figures, transcribed, and the per-measure
 *     comparability table;
 *   - `./remeasure-ceiling.ts` - §1.8's ceiling: crossings against part count, and the
 *     declaration-order sweep that is the ceiling's SHAPE;
 *   - `./remeasure-composed.ts` - the integrated experiment: one sub-circuit drawn flat against the
 *     same blocks composed by seam B (ruling **R38**);
 *   - `./remeasure-criteria.ts` - §3.4's two criteria: congruence of the four bias legs with the
 *     rail glyphs they would actually get, and disjointness at sheet level;
 *   - `./remeasure-coverage.ts` - which gate refused each block that does not draw, and what one
 *     fix would unblock (ruling **R46**). `gateOf` lives there and is used here;
 *   - `./remeasure-edges.ts` - the flat probe and G100's edge mechanism, **corrected at fix round
 *     1**: round 1's flat subject inherited the blocked declaration's boundary nodes.
 */

import { circuitSpecFrom } from "../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../lib/schgen/ir/build.ts"
import { adaptElkLayoutReported } from "../../lib/schgen/elk/adapt.ts"
import { canonicalTopology, type CanonicalTopology } from "../../lib/schgen/elk/junctions.ts"
import { elkInputOf } from "../../lib/schgen/elk/graph.ts"
import { readElkGraph } from "../../lib/schgen/elk/read-graph.ts"
import { describeMismatch } from "../../lib/schgen/render/block-types.ts"
import { placedPins, selectRenderer, subgraphOf, type PlacedPin } from "../../lib/schgen/render/blocks.ts"
import { TEMPLATES } from "../../lib/schgen/render/templates/index.ts"
import { GRID } from "../../lib/schgen/render/geometry.ts"
import { measuresOf, type SchematicMeasures } from "../../lib/schgen/readability/measures.ts"
import { baselineScale, SCALE_INVARIANT_UPTO, SCALE_UNSTABLE_FROM, type BaselineScale } from "../../lib/schgen/readability/baseline.ts"
import { elkPrePass } from "./elk/layout.ts"
import { PARITY_CASES, parityResolver, type ParityCase } from "./authoring-census.ts"
import { comparabilityOf, spikeRowFor, type SpikeBlockRow } from "./remeasure-spikes.ts"
import { gateOf } from "./remeasure-coverage.ts"
import type { BlockId } from "../../lib/schgen/ir/types.ts"
import type { BlockLayout, BlockSubgraph } from "../../lib/schgen/render/block-types.ts"
import type { ElkOutcome } from "../../lib/schgen/elk/graph.ts"
import type { Point } from "../../lib/schgen/render/geometry.ts"

/** The committed document this task's figures are written up in, relative to the repository root. */
export const REMEASUREMENT_DOC = "docs/schematic/m1-remeasurement.md"

/**
 * WHICH GEOMETRY A ROW's FOUR MEASURES WERE TAKEN OVER - **ruling R40's label, and an unlabelled
 * mixture would be the worst of both.**
 *
 * Five of the twelve declared blocks pass `checkLayout` and seven do not, while **all twelve
 * produce ELK geometry** (**G185**). R40: that geometry *"is a legitimate subject for the ceiling,
 * and using it widens your subject set from five blocks to ten"* - *"if you use it, LABEL IT: say
 * how many subjects at each size are layouts the gates refuse, and say that the ceiling is
 * therefore a property of the backend's output rather than of the pipeline's accepted output."*
 *
 * - `accepted` - the geometry `adaptElkLayoutReported` returned: canonicalised, snapped,
 *   junction-checked and clearance-checked. This is the drawing a sheet would carry;
 * - `backend-output` - the PRE-SNAP canonical topology of what `elkjs` emitted, for a block the
 *   gates refuse. It is a real measurement of the router and it is NOT a drawing.
 */
export type Stage = "accepted" | "backend-output"

/**
 * One block's geometry at one stage, with everything a measure needs and the aspect beside it.
 *
 * `aspect` is width over height of the measured extent - the spike's §3 `canvas` column as a
 * dimensionless ratio. A degenerate extent has no aspect and carries `null` rather than a divide:
 * a block drawn on a line is not a 0:1 ribbon, it is a block with no aspect to report.
 */
export interface BlockGeometry {
  readonly stage: Stage
  /**
   * Units PLACED, which is what `baselineScale` keys on and what the spikes' tables call `cells`
   * (`leg-upper` is 3 cells there and holds 3 parts).
   *
   * **IT IS NOT `Remeasurement.graphCells`, AND `docs/known-gaps.md` G216 PUBLISHES BOTH UNDER ONE
   * NAME.** That entry's block-scale table says `tp-leg-upper | cells | 3` and its D1 report line
   * says `tp-leg-upper ... cells 5`: the first is placements and the second is ELK graph children,
   * which include the two zero-size boundary nodes. The two are named apart here.
   */
  readonly placements: number
  readonly topology: CanonicalTopology
  readonly pins: readonly PlacedPin[]
  readonly measures: SchematicMeasures
  readonly aspect: number | null
  /** `describeMismatch` of the refusal, where the gates refused this block; `null` where they did not. */
  readonly refusal: string | null
}

/**
 * ONE DECLARED BLOCK, RE-MEASURED.
 *
 * **THREE DEVIATIONS FROM THE TASK 17 BRIEF's `Produces` BLOCK, EACH FORCED AND EACH RECORDED in
 * `docs/known-gaps.md`.** The brief declares
 * `{ block, parts, ports, portGlyphShare, measures, drawnBy, spike }`:
 *
 * 1. **`measures` becomes `geometry`, which names its STAGE.** A flat `SchematicMeasures` cannot
 *    say whether it describes a drawing or a refused router output, and seven of the twelve blocks
 *    are the second. Ruling **R40** requires the label, and `CLAUDE.md` requires that a figure which
 *    could not be taken is never approximated;
 * 2. **`parts` is split into `parts` and `units`.** The spike's ceiling is stated in DISTINCT PARTS
 *    and `baselineScale` keys on CELLS, and the two differ on 3 of the 12 blocks - `ob-buffer` 9
 *    parts against 11 units, `oc-audio` 12 against 14, `oc-sidechain` 17 against 19. A single
 *    `parts` field would make one of the two comparisons wrong, silently;
 * 3. **`spike` carries a `SpikeBlockRow` and per-figure verdicts, not a `SchematicMeasures`.** The
 *    spikes published no bend count, no occupied area and no per-block wire length, so filling a
 *    `SchematicMeasures` for the spike side would mean inventing three numbers per row.
 */
export interface Remeasurement {
  readonly circuit: string
  readonly block: BlockId
  /** Distinct parts - the column `docs/schematic/elk-block-spike.md` §3 states its ceiling in. */
  readonly parts: number
  /** Units placed, which is what `baselineScale` and the ELK graph count. */
  readonly units: number
  /** Boundary nodes in the ELK graph: one per net crossing the block's boundary. */
  readonly ports: number
  /** Children of the ELK graph: one per placed unit plus one per boundary node. */
  readonly graphCells: number
  /** `ports / cells` in the graph ELK solves. **Not a share of drawn AREA** - see `BLOCK_SIZE`. */
  readonly portGlyphShare: number
  readonly geometry: BlockGeometry
  readonly drawnBy: "template" | "elk"
  readonly scale: BaselineScale
  /** The spike's row for this block, where it published one, and what reproduced. */
  readonly spike: SpikeComparison | null
}

export type FigureVerdict = "reproduced" | "moved" | "not-comparable"

export interface FigureComparison {
  readonly measure: string
  readonly spike: number
  readonly now: number | null
  readonly verdict: FigureVerdict
}

export interface SpikeComparison {
  readonly row: SpikeBlockRow
  readonly figures: readonly FigureComparison[]
  /**
   * `reproduced` only when every COMPARABLE figure reproduced, `moved` when one moved, and
   * `not-comparable` when no figure of this row is the same quantity at all.
   */
  readonly verdict: FigureVerdict
}

/**
 * Whether two figures agree, **to the precision the spike published and no finer.**
 *
 * The spike's §3 table prints integers for crossings and two decimals for aspect, so a comparison
 * to more digits than that would report a move the spike's own figure cannot support. This is a
 * stated rule and not a tuned one: it is the published precision, read off the table.
 */
function agrees(spike: number, now: number): boolean {
  return Math.abs(spike - now) < 0.005
}

const steps = (v: number): number => v / GRID

function extentOf(points: readonly Point[]): { readonly w: number; readonly h: number } | null {
  const [first, ...rest] = points
  if (first === undefined) return null
  let box = { minX: first.x, minY: first.y, maxX: first.x, maxY: first.y }
  for (const p of rest) {
    box = {
      minX: Math.min(box.minX, p.x), minY: Math.min(box.minY, p.y),
      maxX: Math.max(box.maxX, p.x), maxY: Math.max(box.maxY, p.y),
    }
  }
  return { w: steps(box.maxX - box.minX), h: steps(box.maxY - box.minY) }
}

/** Width over height of the extent `measuresOf` takes its area over, or `null` for a degenerate one. */
export function aspectOf(t: CanonicalTopology, pins: readonly PlacedPin[]): number | null {
  if (!t.ok) return null
  const box = extentOf([...t.wires.flatMap((w) => [w.a, w.b]), ...pins.map((p) => p.at)])
  if (box === null || box.h === 0) return null
  return box.w / box.h
}

function geometryOf(
  stage: Stage,
  placements: number,
  topology: CanonicalTopology,
  pins: readonly PlacedPin[],
  refusal: string | null,
): BlockGeometry {
  return { stage, placements, topology, pins, measures: measuresOf(topology, pins), aspect: aspectOf(topology, pins), refusal }
}

/** The spike's figures against this block's, figure by figure, with nothing comparable by default. */
export function compareToSpike(row: SpikeBlockRow, g: BlockGeometry): SpikeComparison {
  const taken: Readonly<Record<string, number | null>> = {
    crossings: g.measures.crossings,
    aspect: g.aspect,
    bends: g.measures.bends,
    bendsPerEdge: g.measures.bendsPerEdge,
    wireLength: g.measures.wireLength,
  }
  const spikeSide: Readonly<Record<string, number>> = {
    crossings: row.crossings,
    aspect: row.aspect,
    // The spike published no bend COUNT; the figure is its per-edge ratio, carried so the row is
    // not silently short of a measure, and marked not-comparable by `comparabilityOf`.
    bends: row.bendsPerEdge,
    bendsPerEdge: row.bendsPerEdge,
    // Its canvas width stands in for a length the spike never published per block. Also not comparable.
    wireLength: row.canvasW,
  }
  const figures: FigureComparison[] = Object.keys(spikeSide).sort().map((measure) => {
    const spike = spikeSide[measure]
    if (spike === undefined) throw new Error(`no spike figure for ${measure}`)
    const now = taken[measure] ?? null
    if (comparabilityOf(measure) === "not-comparable") return { measure, spike, now, verdict: "not-comparable" }
    if (now === null) return { measure, spike, now, verdict: "not-comparable" }
    return { measure, spike, now, verdict: agrees(spike, now) ? "reproduced" : "moved" }
  })
  const comparable = figures.filter((f) => f.verdict !== "not-comparable")
  const verdict: FigureVerdict =
    comparable.length === 0 ? "not-comparable" : comparable.every((f) => f.verdict === "reproduced") ? "reproduced" : "moved"
  return { row, figures, verdict }
}

/**
 * EVERY DECLARED BLOCK OF EVERY PARITY CIRCUIT, RE-MEASURED THROUGH THE REAL PIPELINE.
 *
 * **IT TAKES `ParityCase` AND NOT THE BRIEF's `ParityCircuit`**, which is a name no module in this
 * repository exports; `ParityCase` is the declared pairing of a `Network` with its
 * `SchematicAuthoring` and is what `PARITY_CASES` holds.
 *
 * **A `bus` BLOCK IS SKIPPED BEFORE `selectRenderer` SEES IT**, exactly as `elkPrePass` skips one,
 * because `candidatesFor` throws on one by design. None of the four circuits declares one today.
 *
 * **A BLOCK WITH NO ELK OUTCOME REFUSES RATHER THAN BEING DROPPED.** `elkPrePass` lays out every
 * block `selectRenderer` sends to ELK, so an absence means this function and that one disagree
 * about which blocks those are - and a row that quietly vanished is a measurement that stopped
 * being taken.
 */
export async function remeasure(cases: readonly ParityCase[] = PARITY_CASES): Promise<readonly Remeasurement[]> {
  const symbols = parityResolver()
  const out: Remeasurement[] = []
  for (const c of cases) {
    const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
    const outcomes = await elkPrePass(circuit, symbols)
    for (const block of circuit.blocks.values()) {
      if (block.rendering.kind === "bus") continue
      const g = subgraphOf(circuit, block.id, symbols)
      const selection = selectRenderer(g, TEMPLATES)
      if (selection.kind === "template") {
        throw new Error(
          `block ${c.name}/${block.id} is drawn by template ${selection.template}, and this ` +
            "re-measurement has no geometry path for a template-drawn block: every one of the " +
            "twelve declared blocks selects the ELK backend today (docs/known-gaps.md G160, G185). " +
            "A template-drawn block needs its layout taken from runTemplate rather than from the " +
            "ELK pre-pass, and that is not written here because nothing exercises it - adding an " +
            "untested path would be the skipped check that looks like a passing one.",
        )
      }
      if (selection.kind === "refused") {
        throw new Error(
          `block ${c.name}/${block.id}: selectRenderer REFUSED it - ${describeMismatch(selection.mismatch)}. ` +
            "Under spec §1.3 a declared template reporting a mismatch is a generation error nothing " +
            "may rescue, so it is not measured as if it had been drawn.",
        )
      }
      const outcome = outcomes.get(block.id)
      if (outcome === undefined) {
        throw new Error(
          `block ${c.name}/${block.id} selects the ELK backend and the pre-pass holds no outcome ` +
            `for it (it holds ${outcomes.size === 0 ? "none" : [...outcomes.keys()].join(", ")}). ` +
            "elkPrePass and this function must agree about which blocks reach ELK; a block missing " +
            "on one side is a defect in one of the two, not a row to skip.",
        )
      }
      const input = elkInputOf(g)
      const cellCount = (input.graph.children ?? []).length
      const portCount = (input.graph.children ?? []).filter((n) => n.id.startsWith("port:")).length
      if (!outcome.ok) {
        throw new Error(
          `block ${c.name}/${block.id}: the ELK backend RAISED on it - ${describeMismatch(outcome.mismatch)}. ` +
            "G185 measured 12 of 12 declared blocks laying out with 0 raises at the pinned " +
            "elkjs@0.9.3, so a raise here is a change in the dependency or in the graph and it is " +
            "not measured around: the geometry this row would report does not exist.",
        )
      }
      const report = adaptElkLayoutReported(g, outcome)
      const geometry = report.result.ok
        ? acceptedGeometry(g, report.result.layout)
        : backendGeometry(g, outcome, describeMismatch(report.result.mismatch))
      const row = spikeRowFor(block.id)
      out.push({
        circuit: c.name,
        block: block.id,
        parts: new Set(g.units.map((u) => u.part.label)).size,
        units: g.units.length,
        ports: portCount,
        graphCells: cellCount,
        portGlyphShare: portCount / cellCount,
        geometry,
        drawnBy: "elk",
        scale: baselineScale(geometry.placements),
        spike: row === null ? null : compareToSpike(row, geometry),
      })
    }
  }
  return out
}

/**
 * The four measures of the geometry a sheet would carry: `adaptElkLayoutReported`'s own output,
 * canonicalised once more so this module reads a `CanonicalTopology` and never a `Wire[]`.
 *
 * **IT IS THE SAME CALL `tests/schgen/readability/measures.test.ts` MAKES, DELIBERATELY**, so the
 * five accepted rows here reproduce **G216**'s table rather than offering a second reading of it.
 * The agreement that establishes is arithmetic, not geometric: both run over the geometry
 * `adaptElkLayoutReported` returns, which `lib/schgen/elk/adapt.ts` has already canonicalised
 * (**G216**'s own correction to its round-1 independence claim).
 */
export function acceptedGeometry(g: BlockSubgraph, layout: BlockLayout): BlockGeometry {
  const pins = placedPins(g, layout.placements)
  return geometryOf("accepted", layout.placements.length, canonicalTopology(layout, pins), pins, null)
}

/**
 * The four measures of the PRE-SNAP canonical topology of what `elkjs` emitted - **ruling R40's
 * subject, for a block the later gates refuse.**
 *
 * It is the stage `tests/schgen/readability/measures.test.ts`'s raw-versus-canonical comparison
 * reaches on all twelve blocks, which is why it is available for the seven that do not draw. **It
 * is not a drawing**, and `BlockGeometry.stage` says so on every row that uses it.
 */
export function backendGeometry(g: BlockSubgraph, outcome: ElkOutcome, refusal: string): BlockGeometry {
  if (!outcome.ok) {
    throw new Error(
      `block ${g.block.id}: backendGeometry was given a raised ElkOutcome, which carries no graph, ` +
        "so there is no router output to measure. A raise is reported as a raise by the caller.",
    )
  }
  const built = readElkGraph(g, outcome.graph)
  const pins = placedPins(g, built.placements)
  const t = canonicalTopology({ placements: built.placements, wires: built.wires, anchors: built.anchors }, pins)
  return geometryOf("backend-output", built.placements.length, t, pins, refusal)
}

/**
 * **SPEC §1.8's BLOCK-SIZE DECISION, D1 - BOTH BOUNDS AS MEASURED HERE, AND THE COST NAMED.**
 *
 * The figures are `./remeasure-ceiling.ts`'s, re-taken on this pipeline; **nothing here is relayed
 * from G101**, whose own caveat says the number nine was the tested frontend's.
 *
 * **IT IS A REPORTING BOUND AND REFUSES NOTHING** - plan decision **D1**: the generator never cuts
 * a block, so a numeric bound that refused one would refuse a declaration. `blocksOutside` says
 * which declared blocks sit above the ceiling and the generator still draws them.
 */
export interface BlockSizeDecision {
  /**
   * The largest block size at which the measured quality does NOT move under declaration
   * reordering, **in PLACEMENTS** - which is the unit the spikes' own `cells` column is in
   * (`leg-upper` is 3 cells there and holds 3 parts).
   *
   * Ruling **R39** widens this field to `number | "unmeasured"` only if Step 5 cannot measure a
   * ceiling. **It could**, so the field keeps the plan's `number` and the widening did not happen.
   */
  readonly ceiling: number
  /** Spec §1.8 rev 4: the floor was the tested frontend's. `"unmeasured"` is a legitimate value. */
  readonly floor: number | "unmeasured"
  readonly costPaid: string
  readonly evidence: string
}

/**
 * **THE CEILING IS 3 PLACEMENTS ON THIS PIPELINE, AND IT IS NOT 9.**
 *
 * `[RAN]` `./remeasure-ceiling.ts`, over all twelve declared blocks in four declaration orders:
 * the inter-net crossing count is **invariant at 2 and 3 placements** (`tp-leg-collector` and
 * `tp-leg-emitter-bypass` at 2, the four bias legs at 3; 0 crossings in every order) and **moves at
 * every larger size measured** - `oc-power` at 8 gives 1, 3, 2, 2, and `ob-buffer` 7, 7, 4, 8,
 * `oc-audio` 5, 12, 7, 6, `tp-stage` 7, 4, 5, 6, `oc-sidechain` 7, 14, 9, 19, `pt-core` 78, 53, 39,
 * 65. **Sizes 4 to 7 have no declared subject at all and are unmeasured**, so the ceiling is the
 * largest size where invariance was MEASURED and not the largest where it might hold.
 *
 * **THE SPIKE's SECOND CEILING MEASURE AGREES WITH THE FIRST HERE, AS IT DID THERE, AND THE NUMBER
 * IS STILL DIFFERENT.** G101 read the ceiling off *"inter-net crossings are ZERO on every block of
 * 8 parts or fewer"*; on this pipeline `oc-power`, at 8 parts, has **1** crossing in declaration
 * order, so the zero-crossing bound also lands between 3 and 8.
 */
export const BLOCK_SIZE: BlockSizeDecision = {
  ceiling: 3,
  floor: "unmeasured",
  costPaid:
    "THE CEILING's COST, on 7 of the 12 declared blocks. Above the ceiling the measured quality is " +
    "not a property of the circuit: the crossing count moves with the order the members are " +
    "declared in, by up to 3.0x (oc-power, 1 to 3; the largest absolute swing is pt-core's 39 to 78), so section 3.3's four measures over ob-buffer, " +
    "oc-power, oc-audio, oc-sidechain, pt-core and tp-stage are partly measurements of a " +
    "serialization. The FLOOR's cost is not being paid and cannot be: this backend emits a " +
    "zero-size boundary node, so a block whose cells are two-thirds boundary has a drawing with no " +
    "boundary area at all, and there is no interface-glyph cost for a small block to be dominated " +
    "by. What a small block does still cost is §1.6's cross-sheet mechanism - one global label or " +
    "power symbol per crossing net, drawn inside the block's own extent (G208) - and that cost is " +
    "glyphs and eye-travel rather than ink.",
  evidence:
    "bun tools/schgen/remeasure-ceiling.ts, and tests/schgen/remeasure-ceiling.test.ts pins every " +
    "figure - BOTH BOUNDS INCLUDED. That is the pointer a reader has to be able to trust: run " +
    "THAT file. tests/schgen/remeasure.test.ts no longer holds the pins and a constant perturbed " +
    "against it comes back GREEN (fix round 2, item A). " +
    "CONFIRMED by this writer: both bounds were run here, neither is relayed. THE CAVEAT TRAVELS " +
    "WITH THE FIGURE, AND THE CEILING's OWN SIZE IS THE THIN SPOT: the window comes from 12 " +
    "declared blocks of 4 circuits, and at size 3 - the ceiling itself - all FOUR subjects are ONE " +
    "topology, because the four bias legs draw byte-identically (G185), each swept over 3 of its 6 " +
    "possible permutations. Size 2 is the better-supported size, two distinct topologies swept " +
    "exhaustively, and size 2 is not the ceiling. The upper end rests on a single refused layout " +
    "at size 8. Across sizes 2 and 3 together there are three distinct topologies, which is true " +
    "and conceals both of those. And no declared block in this repository has more than 24 " +
    "placements, so nothing above that was tested at all. G101's own caveat applies unchanged: " +
    "the spikes' 18 blocks came from two unusual parents, a 76-part passive EQ and a 37-part " +
    "compressor with two dual op-amps.",
}

/** The declared blocks that sit ABOVE the ceiling: a report line, never a refusal (**D1**). */
export function blocksOutside(rows: readonly Remeasurement[], bound: BlockSizeDecision = BLOCK_SIZE): readonly string[] {
  return rows
    .filter((r) => r.geometry.placements > bound.ceiling)
    .map((r) => `${r.block} has ${r.geometry.placements} placements, above the ceiling of ${bound.ceiling}: ${r.scale.kind}`)
}

/** One row as a line: the per-block figures, the stage, and the spike verdict beside them. */
export function renderRow(r: Remeasurement): string {
  const m = r.geometry.measures
  const aspect = r.geometry.aspect === null ? "none" : r.geometry.aspect.toFixed(2)
  const spike = r.spike === null ? "no spike row" : `spike ${r.spike.row.spikeBlock} ${r.spike.verdict}`
  return (
    `${r.block} parts=${r.parts} units=${r.units} placements=${r.geometry.placements} ` +
    `graphCells=${r.graphCells} ports=${r.ports} ` +
    `share=${(100 * r.portGlyphShare).toFixed(1)}% stage=${r.geometry.stage} ` +
    `bends=${m.bends} perEdge=${m.bendsPerEdge.toFixed(2)} crossings=${m.crossings} ` +
    `len=${m.wireLength.toFixed(2)} area=${m.occupiedArea.toFixed(2)} aspect=${aspect} scale=${r.scale.kind} | ${spike}`
  )
}

if (import.meta.main) {
  const rows = await remeasure()
  for (const r of rows) console.log(renderRow(r))
  console.log("")
  for (const r of rows) {
    if (r.geometry.refusal !== null) console.log(`REFUSED ${r.block} at ${gateOf(r.geometry.refusal)}`)
  }
  console.log("")
  for (const line of blocksOutside(rows)) console.log(`OUTSIDE THE REPORTING BOUND ${line}`)
  console.log(`BLOCK_SIZE ceiling ${BLOCK_SIZE.ceiling} placements, floor ${BLOCK_SIZE.floor}`)
  console.log("")
  for (const r of rows) {
    if (r.spike === null) continue
    for (const f of r.spike.figures) {
      console.log(`${r.block} ${f.measure}: spike ${f.spike} now ${f.now ?? "not taken"} -> ${f.verdict}`)
    }
  }
}
