/**
 * **THE FLAT PROBE, AND G100's EDGE MECHANISM RE-TAKEN: does decomposition hand ELK a smaller
 * graph?**
 *
 *   bun tools/schgen/remeasure-edges.ts
 *
 * Hand-written for Task 17 of the M1 schematic-authoring plan; **corrected at fix round 1, where
 * the first version's answer was wrong in sign.**
 *
 * **THE DEFECT THE REVIEW FOUND, FIRST, BECAUSE EVERY NUMBER BELOW DEPENDS ON IT.** Round 1's
 * `flatSubgraphOf` spread `{...c, blocks}` and **never rebuilt `c.unitBlock`**. `labelledNets`
 * reaches `blockOfPin`, which reads `unitBlock`, so the "flat" probe was still told that `BASE` and
 * `OUT_PRE` span several blocks - and `lib/schgen/ir/classify.ts:47` labels every net with
 * `blocks.size > 1`. A labelled net becomes `BlockSubgraph.external`, and an external net becomes a
 * boundary NODE. **So the flat side was handed a boundary node for exactly the nets the split
 * created: it inherited the decomposition it was the control for**, and the measured 1.000x was the
 * cancellation of one artefact against another. `unitBlock` is rebuilt below and the answer changes
 * sign.
 *
 * **WHAT THE CORRECTED MEASUREMENT SAYS, AND IT IS A STRONGER REFUTATION THAN THE FIRST VERSION.**
 * `docs/known-gaps.md` **G100** explains its 6.1x crossing reduction by *"the three blocks carry
 * FEWER EDGES THAN THE WHOLE - 96 against 139"*, and **G105** turns the 43 missing edges into the
 * bound. On this backend **decomposition does not merely fail to shed edges - it ADDS them**: 72
 * against a genuinely flat 69 on `optical-compressor` and 53 against 48 on `transistor-preamp`.
 * **The spike's stated mechanism is refuted either way, and more strongly this way.**
 *
 * **TWO SUBJECTS, AND BOTH ARE REPORTED BECAUSE THEY ANSWER DIFFERENT QUESTIONS.** `BoundarySource`
 * names them, so neither can be reached by accident again:
 *
 *   - **`flat`** - the circuit declared as ONE block, so no net is multi-block and only a rail or an
 *     off-sheet net gets a boundary node. **This is the control the comparison needs and it is the
 *     headline.** It is the less flattering number.
 *   - **`declared-blocks`** - the same union, with the boundary nodes the BLOCKED declaration
 *     produces still imposed on it. **It is what round 1 measured by accident**, and it is kept as a
 *     named subject because it isolates one quantity exactly: whether a boundary node replaces the
 *     chain edge the split removed. It does, to the edge, which is why it reads 1.000x. **It is NOT
 *     a flat baseline and nothing may quote it as one.**
 *
 * **THE PER-NET RULE, STATED SO IT CAN BE REFUTED - and this time it can be.** Round 1 stated a
 * rule whose refutation route could not fire: it said the counts differ by one edge per
 * *"multi-block net that is neither a rail nor a labelled net"*, and `classify.ts:47` makes that set
 * EMPTY in every circuit this IR builds, so the claim was a theorem wearing a measurement's
 * clothes. **The set that actually governs the difference is a different one and is not empty:**
 *
 * > `edgesForNet` makes a net of degree n into n - 1 chain edges. Under the BLOCKED declaration a
 * > net crossing k blocks is labelled, so it is external in each of them and gains a boundary
 * > terminal in each: it contributes `(U + k) - k = U` edges. Under the FLAT declaration the same
 * > net is internal unless it is a rail or off-sheet, so it contributes `U - 1`. A rail is a
 * > boundary net on both sides and contributes `U` on both. **So blocked minus flat is exactly the
 * > number of nets that cross a block boundary and are NOT rails.**
 *
 * **That set is measurable and non-empty here - three nets on `optical-compressor` and five on
 * `transistor-preamp` - and `crossingNonRailNets` counts it, so the prediction is shown agreeing
 * with the measurement rather than asserted.** A circuit whose every cross-block net is a rail
 * would measure 1.000x, and that is the refutation route: it can fire, and nothing here makes it
 * unable to.
 *
 * **WHAT IS STILL A PROPERTY OF THE IR RATHER THAN AN OUTCOME, said plainly.** That a cross-block
 * net is ALWAYS labelled, and therefore always gets a boundary node in each block, is
 * `classify.ts:47` and not a measurement. **Whether labelling every multi-block net is right for the
 * generator is a design question this task does not answer and does not touch.**
 */

import { circuitSpecFrom } from "../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../lib/schgen/ir/build.ts"
import { elkInputOf } from "../../lib/schgen/elk/graph.ts"
import { blockOfPin } from "../../lib/schgen/ir/classify.ts"
import { subgraphOf } from "../../lib/schgen/render/blocks.ts"
import { unitKey } from "../../lib/schgen/ir/types.ts"
import { PARITY_CASES, parityResolver, type ParityCase } from "./authoring-census.ts"
import type { BlockSubgraph } from "../../lib/schgen/render/block-types.ts"
import type { BlockId, Circuit, IrBlock, NetName } from "../../lib/schgen/ir/types.ts"
import type { SymbolResolver } from "../../lib/schgen/render/library.ts"

/**
 * The id the Step 4 flat probe's block carries. The tilde marks it as a probe id, not a declared
 * one.
 *
 * **IT IS NOT RENAMED, and the reason is that `docs/known-gaps.md` G229 quotes a refusal that
 * carries it verbatim.** Renaming the default would leave that entry quoting a block id no run
 * produces, which is the shape of defect **R42** is about. The edge census passes its own ids.
 */
export const FLAT_PROBE_ID = "tp-drawing-legs~flat"

/**
 * Where the flat probe's boundary nodes come from - see this module's header.
 *
 * **`flat` IS THE CONTROL AND `declared-blocks` IS NOT A BASELINE.** The second exists so that the
 * quantity round 1 measured by accident has a name and can be cited for what it does establish,
 * and for no other reason.
 */
export type BoundarySource = "flat" | "declared-blocks"

/**
 * ONE `BlockSubgraph` OVER THE UNION OF SEVERAL DECLARED BLOCKS' MEMBERS.
 *
 * **IT GOES THROUGH `subgraphOf` RATHER THAN BUILDING A SUBGRAPH BY HAND**, so which nets are
 * rails, which are ground, which are labelled and external, which power symbols are needed and what
 * intersheet reference each label prints are all decided by the circuit's own rules; a hand-merged
 * subgraph would be a second answer to five questions that already have one.
 *
 * **`unitBlock` IS REBUILT, AND THAT IS THE WHOLE OF THE FIX.** Every member of the flat block is
 * re-keyed to the flat block's id, so `labelledNets` sees one block for them and a net internal to
 * the union stops being multi-block. **Without it the probe is handed the split's own boundary
 * nodes** - the defect this module's header opens with.
 *
 * **A SUB-CIRCUIT PROBE IS STILL CORRECT UNDER THE FIX, which is why there is one function and not
 * two.** When `ids` is a subset, the units outside it keep their own block ids, so a net that
 * leaves the union is still multi-block, still labelled, and still gets its boundary node - which
 * is the truth about a sub-circuit. The five `transistor-preamp` legs measure identically before
 * and after the fix for exactly that reason: every net crossing between legs also reaches
 * `tp-stage`.
 */
export function flatSubgraphOf(
  c: Circuit,
  ids: readonly BlockId[],
  symbols: SymbolResolver,
  id: string = FLAT_PROBE_ID,
  boundaries: BoundarySource = "flat",
): BlockSubgraph {
  const blocks = ids.map((b) => {
    const found = c.blocks.get(b)
    if (found === undefined) {
      throw new Error(
        `the flat probe was asked for block ${b} and this circuit has no such block (it has ` +
          `${[...c.blocks.keys()].join(", ")}). It is not skipped: a probe that quietly dropped a ` +
          "block would measure a different sub-circuit from the one it is compared against, which " +
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
  const unitBlock = new Map(c.unitBlock)
  if (boundaries === "flat") {
    for (const m of flat.members) unitBlock.set(unitKey(m.part, m.unit), id)
  }
  return subgraphOf({ ...c, blocks: new Map([...c.blocks, [id, flat]]), unitBlock }, id, symbols)
}

/**
 * **THE NETS THAT GOVERN THE EDGE DIFFERENCE: those crossing a declared block boundary that are NOT
 * rails.** Blocked minus flat is exactly this count - see this module's header.
 *
 * It is measured from `unitBlock` and `rails` directly rather than from `labelledNets`, because
 * `labelledNets` folds four conditions together and only one of them is the one at issue.
 */
export function crossingNonRailNets(c: Circuit): readonly NetName[] {
  const blocksOfNet = new Map<NetName, Set<BlockId>>()
  for (const pin of c.pins) {
    if (pin.net === null) continue
    const set = blocksOfNet.get(pin.net) ?? new Set<BlockId>()
    set.add(blockOfPin(c, pin))
    blocksOfNet.set(pin.net, set)
  }
  const out: NetName[] = []
  for (const [net, blocks] of blocksOfNet) {
    if (blocks.size > 1 && !c.rails.has(net) && !c.offSheet.has(net)) out.push(net)
  }
  return out.sort()
}

export interface EdgeCensus {
  readonly circuit: string
  readonly blocks: readonly { readonly id: BlockId; readonly nodes: number; readonly edges: number }[]
  readonly blockEdgeTotal: number
  readonly blockNodeTotal: number
  /** The genuinely flat declaration: one block, boundary nodes for rails and off-sheet nets only. */
  readonly flatNodes: number
  readonly flatEdges: number
  /** The same union with the blocked declaration's boundary nodes imposed - NOT a flat baseline. */
  readonly inheritedNodes: number
  readonly inheritedEdges: number
  /** Nets crossing a declared block boundary that are not rails: the predicted difference. */
  readonly crossingNonRail: readonly NetName[]
  /** `flatEdges / blockEdgeTotal`. Below 1 means the decomposition ADDS edges. */
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
  const flat = elkInputOf(flatSubgraphOf(circuit, ids, symbols, `${name}~flat`, "flat")).graph
  const inherited = elkInputOf(flatSubgraphOf(circuit, ids, symbols, `${name}~inherited`, "declared-blocks")).graph
  const blockEdgeTotal = blocks.reduce((n, b) => n + b.edges, 0)
  const flatEdges = (flat.edges ?? []).length
  return {
    circuit: name,
    blocks,
    blockEdgeTotal,
    blockNodeTotal: blocks.reduce((n, b) => n + b.nodes, 0),
    flatNodes: (flat.children ?? []).length,
    flatEdges,
    inheritedNodes: (inherited.children ?? []).length,
    inheritedEdges: (inherited.edges ?? []).length,
    crossingNonRail: crossingNonRailNets(circuit),
    ratio: blockEdgeTotal === 0 ? 0 : flatEdges / blockEdgeTotal,
  }
}

export function renderEdgeCensus(c: EdgeCensus): readonly string[] {
  const added = c.blockEdgeTotal - c.flatEdges
  return [
    ...c.blocks.map((b) => `  ${b.id}: ${b.nodes} nodes, ${b.edges} edges`),
    `${c.circuit} HEADLINE: genuinely flat ${c.flatNodes} nodes / ${c.flatEdges} edges against ` +
      `${c.blocks.length} blocks totalling ${c.blockNodeTotal} nodes / ${c.blockEdgeTotal} edges - ` +
      `ratio ${c.ratio.toFixed(3)}x, so the decomposition ${added === 0 ? "changes no edge" : added > 0 ? `ADDS ${added}` : `removes ${-added}`}`,
    `  predicted difference: ${c.crossingNonRail.length} net(s) crossing a block boundary and not a ` +
      `rail (${c.crossingNonRail.join(", ") || "none"}); measured difference ${added} - ` +
      `${c.crossingNonRail.length === added ? "AGREES" : "DISAGREES"}`,
    `  the inherited-boundary subject, NOT a flat baseline: ${c.inheritedNodes} nodes / ` +
      `${c.inheritedEdges} edges, ratio ${(c.inheritedEdges / c.blockEdgeTotal).toFixed(3)}x - it ` +
      "isolates whether a boundary node replaces the chain edge the split removed",
  ]
}

if (import.meta.main) {
  for (const name of ["optical-compressor", "transistor-preamp"]) {
    for (const line of renderEdgeCensus(await edgeCensus(name))) console.log(line)
  }
}
