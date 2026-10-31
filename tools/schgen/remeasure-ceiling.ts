/**
 * **SPEC §1.8's TWO BOUNDS, RE-DERIVED ON THIS PIPELINE: the ceiling's SHAPE, and the floor's
 * basis.**
 *
 *   bun tools/schgen/remeasure-ceiling.ts
 *
 * Hand-written for Task 17 of the M1 schematic-authoring plan.
 *
 * **THE CEILING IS A SHAPE AND NOT A NUMBER, which is what the re-derivation is of.** `[RELAYED]`
 * **G101**: *"the ceiling's SHAPE survives and the number nine does not. The shape - crossings are
 * zero up to some size then grow, and below that size the count stops moving when the source file
 * is reordered - rests on comparisons taken under identical conditions on both sides... The number
 * is read off crossing counts that depend on node sizes and on the port constraints the skin
 * declared."* So two measurements, both of them here:
 *
 * 1. **crossings against part count**, which `./remeasure.ts` takes per block;
 * 2. **invariance of the crossing count under declaration reordering**, which is this module's
 *    sweep and is the half **G95** measured.
 *
 * **WHAT A "DECLARATION ORDER" IS HERE, said precisely, because the spikes' subject was a netlist
 * file and this pipeline's is a `BlockSubgraph`.** `lib/schgen/elk/graph.ts` emits one ELK child per
 * unit **in `g.units` order**, then the boundary nodes, and then one edge list per net whose
 * terminals are in that same order. `g.units` is `block.members` order, which is the order the
 * authoring declaration lists the block's members in. **So permuting `g.units` is exactly
 * G95's *"reordering the `.capacitor(...)` calls"*, reached at the one place this pipeline exposes
 * it**, and nothing about the circuit, the partition or the symbols changes.
 *
 * **THE PERMUTATIONS ARE SEEDED AND STATED, NOT CHOSEN.** G95 used *"declaration order plus three
 * seeded shuffles"*; this uses declaration order plus three shuffles from the fixed-seed generator
 * below. **A hand-picked permutation would be this module choosing a result**, which is the failure
 * `CLAUDE.md`'s *"an agent may never author the acceptance criteria for the artifact it is
 * producing"* names. Re-running gives the same orders, so the figures are reproducible.
 *
 * **EVERY SUBJECT IS REAL AND NOTHING IS SYNTHESISED - ruling R40.** *"What you may NOT do is
 * construct synthetic graphs at 3, 4, 8, 9, 13, 17 and 28 cells to fill the sizes out... If no real
 * subject exists at a size, that size is unmeasured and you say so, per size."* `sizeCoverage`
 * below is that statement, per size, with the subject count and how many of those subjects are
 * geometry the gates refuse.
 *
 * **THE STAGE IS UNIFORM ACROSS ALL TWELVE AND THAT IS WHY IT IS THE PRE-SNAP ONE.** Seven of the
 * twelve blocks have no accepted drawing, so an accepted-geometry sweep would cover five blocks of
 * one circuit family at two sizes. Measuring the router's own output covers twelve blocks at eight
 * sizes - and the ceiling is a claim about what ELK emits, not about what the gates accept (R40).
 * **A mixture of the two stages would be the worst of both**, so there is none: this module reads
 * `backend-output` for every row, including the five that draw.
 */

import { circuitSpecFrom } from "../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../lib/schgen/ir/build.ts"
import { canonicalTopology } from "../../lib/schgen/elk/junctions.ts"
import { elkInputOf } from "../../lib/schgen/elk/graph.ts"
import { readElkGraph } from "../../lib/schgen/elk/read-graph.ts"
import { adaptElkLayoutReported } from "../../lib/schgen/elk/adapt.ts"
import { placedPins, selectRenderer, subgraphOf } from "../../lib/schgen/render/blocks.ts"
import { TEMPLATES } from "../../lib/schgen/render/templates/index.ts"
import { measuresOf } from "../../lib/schgen/readability/measures.ts"
import { elkPrePass, layoutBlocks } from "./elk/layout.ts"
import { PARITY_CASES, parityResolver, type ParityCase } from "./authoring-census.ts"
import type { ElkBlockInput, ElkOutcome } from "../../lib/schgen/elk/graph.ts"
import type { BlockSubgraph, BlockUnit } from "../../lib/schgen/render/block-types.ts"
import type { BlockId } from "../../lib/schgen/ir/types.ts"

/** The sizes `docs/schematic/elk-block-spike.md` §2.1 ran its shuffle at, in PLACEMENTS. */
export const SPIKE_SWEEP_SIZES: readonly number[] = [3, 4, 8, 9, 13, 17, 28]

/** How many orders each block is laid out in: declaration order plus three seeded shuffles. */
export const ORDERS_PER_BLOCK = 4

/** The seed, fixed and stated, so the three shuffles are the same three on every run. */
export const SHUFFLE_SEED = 2026_10_17

/**
 * A 32-bit LCG - Numerical Recipes' constants - used for nothing but choosing the permutations.
 *
 * It is written out rather than reaching for `Math.random` because a random shuffle would make
 * every run report different crossing counts, and a figure nobody else can reproduce is the one
 * thing `docs/known-gaps.md` **G209** says a measurement must not be.
 */
function lcg(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(1_664_525, state) + 1_013_904_223) >>> 0
    return state / 4_294_967_296
  }
}

/** `ORDERS_PER_BLOCK` orders of `units`: declaration order first, then seeded Fisher-Yates. */
export function ordersOf(units: readonly BlockUnit[]): readonly (readonly BlockUnit[])[] {
  const random = lcg(SHUFFLE_SEED)
  const out: (readonly BlockUnit[])[] = [units]
  for (let n = 1; n < ORDERS_PER_BLOCK; n += 1) {
    const shuffled = [...units]
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1))
      const a = shuffled[i]
      const b = shuffled[j]
      if (a === undefined || b === undefined) continue
      shuffled[i] = b
      shuffled[j] = a
    }
    out.push(shuffled)
  }
  return out
}

const orderKey = (units: readonly BlockUnit[]): string => units.map((u) => `${u.part.label}#${u.unit}`).join(",")

/** One block's crossing count in one declaration order, or why it could not be taken. */
export interface OrderResult {
  readonly order: number
  readonly key: string
  readonly crossings: number | null
  /** Why `crossings` is null, verbatim; empty when it was taken. */
  readonly notTaken: string
}

export interface OrderSweepRow {
  readonly circuit: string
  readonly block: BlockId
  readonly parts: number
  readonly placements: number
  readonly results: readonly OrderResult[]
  /** Distinct orders actually laid out: a 2-unit block has only two permutations, not four. */
  readonly distinctOrders: number
  /**
   * True when every order that was taken gave the same crossing count. **A single distinct order
   * makes this VACUOUS**, so `distinctOrders` travels with it and `renderSweep` prints both.
   */
  readonly invariant: boolean
  /** Whether this block's accepted geometry is refused by the post-layout gates (ruling **R40**). */
  readonly gatesRefuse: boolean
}

/**
 * Every declared block laid out in `ORDERS_PER_BLOCK` declaration orders, with its crossing count
 * in each.
 *
 * **THE BLOCK ID IS SUFFIXED PER ORDER, AND THE CONTROL FOR THAT IS BUILT IN.** `layoutBlocks`
 * refuses two inputs for one block id, so each order is laid out under `<id>~o<n>`; the root id is
 * the only thing that changes and `elkjs` has no documented use for it. **Order 0 IS declaration
 * order**, so its crossing count must equal the one `./remeasure.ts` reports for the unsuffixed
 * block - and `tests/schgen/remeasure-ceiling.test.ts` asserts exactly that, which is what makes the
 * suffixing a checked assumption rather than a hope.
 */
export async function orderSweep(cases: readonly ParityCase[] = PARITY_CASES): Promise<readonly OrderSweepRow[]> {
  const symbols = parityResolver()
  const rows: OrderSweepRow[] = []
  for (const c of cases) {
    const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
    const accepted = await elkPrePass(circuit, symbols)
    for (const block of circuit.blocks.values()) {
      if (block.rendering.kind === "bus") continue
      const g = subgraphOf(circuit, block.id, symbols)
      if (selectRenderer(g, TEMPLATES).kind !== "elk") continue
      rows.push(await sweepOne(c.name, g, gatesRefuseOf(g, accepted.get(block.id))))
    }
  }
  return rows
}

function gatesRefuseOf(g: BlockSubgraph, outcome: ElkOutcome | undefined): boolean {
  if (outcome === undefined) {
    throw new Error(
      `block ${g.block.id} selects the ELK backend and elkPrePass holds no outcome for it, so ` +
        "whether the gates refuse it is unknown. It is not defaulted either way: reporting a " +
        "refused layout as accepted would mislabel the ceiling's subject, which is exactly what " +
        "ruling R40 forbids.",
    )
  }
  return !adaptElkLayoutReported(g, outcome).result.ok
}

async function sweepOne(circuit: string, g: BlockSubgraph, gatesRefuse: boolean): Promise<OrderSweepRow> {
  const seen = new Set<string>()
  const inputs: { readonly order: number; readonly key: string; readonly g: BlockSubgraph; readonly input: ElkBlockInput }[] = []
  ordersOf(g.units).forEach((units, order) => {
    const key = orderKey(units)
    if (seen.has(key)) return
    seen.add(key)
    const permuted: BlockSubgraph = { ...g, block: { ...g.block, id: `${g.block.id}~o${order}` }, units }
    inputs.push({ order, key, g: permuted, input: elkInputOf(permuted) })
  })
  const outcomes = await layoutBlocks(inputs.map((i) => i.input))
  const results: OrderResult[] = inputs.map(({ order, key, g: permuted }) => {
    const outcome = outcomes.get(permuted.block.id)
    if (outcome === undefined) {
      return { order, key, crossings: null, notTaken: `layoutBlocks returned no outcome for ${permuted.block.id}` }
    }
    if (!outcome.ok) return { order, key, crossings: null, notTaken: `elkjs raised: ${outcome.mismatch.reason}` }
    const built = readElkGraph(permuted, outcome.graph)
    const pins = placedPins(permuted, built.placements)
    const t = canonicalTopology({ placements: built.placements, wires: built.wires, anchors: built.anchors }, pins)
    if (!t.ok) {
      return { order, key, crossings: null, notTaken: `the canonical topology was refused: ${t.ambiguous.join("; ")}` }
    }
    return { order, key, crossings: measuresOf(t, pins).crossings, notTaken: "" }
  })
  const taken = results.flatMap((r) => (r.crossings === null ? [] : [r.crossings]))
  return {
    circuit,
    block: g.block.id,
    parts: new Set(g.units.map((u) => u.part.label)).size,
    placements: g.units.length,
    results,
    distinctOrders: results.length,
    invariant: new Set(taken).size <= 1,
    gatesRefuse,
  }
}

export interface SizeCoverage {
  readonly placements: number
  readonly subjects: readonly BlockId[]
  readonly refusedSubjects: number
  /** True when no declared block of this repository has this many placements. */
  readonly unmeasured: boolean
}

/**
 * The spike's seven sweep sizes against the subjects this repository actually declares - **ruling
 * R40's per-size statement.**
 */
export function sizeCoverage(rows: readonly OrderSweepRow[], sizes: readonly number[] = SPIKE_SWEEP_SIZES): readonly SizeCoverage[] {
  return sizes.map((placements) => {
    const subjects = rows.filter((r) => r.placements === placements)
    return {
      placements,
      subjects: subjects.map((r) => r.block),
      refusedSubjects: subjects.filter((r) => r.gatesRefuse).length,
      unmeasured: subjects.length === 0,
    }
  })
}

/**
 * **THE FLOOR's BASIS, MEASURED: every boundary node this backend emits, and its size.**
 *
 * **G101**'s floor rested on `netlistsvg` emitting a 30x20 `inputExt` CELL per declared port, so
 * *"a 1-part block's drawing was two-thirds boundary"*.
 *
 * **THIS COMMENT SAID `boundaryNodeOf` EMITS A NODE OF WIDTH 0 AND HEIGHT 0, SO THE QUANTITY THE
 * FLOOR WAS A BOUND ON *"does not exist on this backend"*. THAT IS REFUTED SINCE 2026-10-25.**
 * `boundaryNodeOf` sizes each node by the box the label or power symbol drawn at it will occupy
 * (`docs/known-gaps.md` **G291**), and this function now measures **38 of 38 non-zero**. So the
 * reason the floor was reported unmeasured is gone, and **nothing has replaced it.**
 *
 * **WHAT THIS FUNCTION ESTABLISHES IS THEREFORE NARROWER THAN IT WAS, AND SAYING SO IS THE
 * RESULT.** It reports every boundary node's size and the worst port-glyph share of graph cells.
 * It does **NOT** derive a floor from them: a floor is a spec §1.8 claim, and a tool that measured
 * one and then graded drawings against it would be authoring the criterion its own output is
 * judged by (`CLAUDE.md`). `BLOCK_SIZE.floor` stays `"unmeasured"` with the change of basis
 * recorded beside it.
 *
 * It is re-taken here rather than relayed from **G216** because this task's criterion is that the
 * figure is measured on this pipeline, and because a floor reported as unmeasured has to be
 * unmeasured for a stated reason that a check could have contradicted. **It was contradicted.**
 */
export interface FloorEvidence {
  readonly boundaryNodes: number
  readonly zeroSized: number
  readonly nonZeroSized: readonly string[]
  /** The largest port-glyph share of graph cells across the declared blocks. */
  readonly worstShare: number
  readonly worstShareBlock: BlockId
}

export function floorEvidence(cases: readonly ParityCase[] = PARITY_CASES): FloorEvidence {
  const symbols = parityResolver()
  let boundaryNodes = 0
  let zeroSized = 0
  const nonZeroSized: string[] = []
  let worstShare = -1
  let worstShareBlock = ""
  for (const c of cases) {
    const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
    for (const block of circuit.blocks.values()) {
      if (block.rendering.kind === "bus") continue
      const g = subgraphOf(circuit, block.id, symbols)
      if (selectRenderer(g, TEMPLATES).kind !== "elk") continue
      const children = elkInputOf(g).graph.children ?? []
      const boundary = children.filter((n) => n.id.startsWith("port:"))
      boundaryNodes += boundary.length
      for (const node of boundary) {
        if ((node.width ?? 0) === 0 && (node.height ?? 0) === 0) zeroSized += 1
        else nonZeroSized.push(`${block.id}/${node.id} is ${node.width ?? 0} x ${node.height ?? 0}`)
      }
      const share = boundary.length / children.length
      if (share > worstShare) {
        worstShare = share
        worstShareBlock = block.id
      }
    }
  }
  if (boundaryNodes === 0) {
    throw new Error(
      "no declared block emitted a single boundary node, so the floor's basis cannot be measured " +
        "at all - and reporting 'every boundary node has zero size' over an empty set would be a " +
        "vacuous pass. Twelve declared blocks emit 38 between them (docs/known-gaps.md G216); an " +
        "empty set here means the graph builder or the declarations changed.",
    )
  }
  return { boundaryNodes, zeroSized, nonZeroSized, worstShare, worstShareBlock }
}

export function renderSweep(rows: readonly OrderSweepRow[]): readonly string[] {
  return rows.map((r) => {
    const counts = r.results.map((x) => (x.crossings === null ? `not taken (${x.notTaken})` : String(x.crossings))).join(", ")
    return (
      `${r.block} parts=${r.parts} placements=${r.placements} orders=${r.distinctOrders} ` +
      `crossings ${counts} ${r.invariant ? "INVARIANT" : "MOVES"}${r.gatesRefuse ? " [gates refuse]" : ""}`
    )
  })
}

if (import.meta.main) {
  const rows = await orderSweep()
  for (const line of renderSweep(rows)) console.log(line)
  console.log("")
  for (const s of sizeCoverage(rows)) {
    console.log(
      `size ${s.placements}: ${s.unmeasured ? "UNMEASURED - no declared block of this size" : `${s.subjects.length} subject(s) ${s.subjects.join(", ")}, ${s.refusedSubjects} refused by the gates`}`,
    )
  }
  console.log("")
  const floor = floorEvidence()
  console.log(
    `boundary nodes ${floor.boundaryNodes}, zero-sized ${floor.zeroSized}, non-zero ${floor.nonZeroSized.length ? floor.nonZeroSized.join("; ") : "none"}, ` +
      `worst port-glyph share ${(100 * floor.worstShare).toFixed(1)}% on ${floor.worstShareBlock}`,
  )
}
