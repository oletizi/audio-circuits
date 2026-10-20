/**
 * ONE SHEET'S FRAMES AS AN ELK GRAPH - SEAM B's HALF OF THE LAYERED ENGINE.
 *
 * Hand-written for Task 15 of the M1 schematic-authoring plan. Spec §1.6 calls seam B *"the second
 * place a layered orthogonal engine has something to offer"*: today `packFrames`
 * (`../render/pack.ts`) shelf-packs left to right and **knows nothing about which blocks are
 * connected**, which is why `docs/known-gaps.md` **G165** records *"eleven small frames sit in a
 * single row across the top and the lower three-quarters of every page is blank"*.
 *
 * **THIS IS A SECOND PACKER BESIDE THE FIRST, NOT A REPLACEMENT, AND THE SELECTION IS MECHANICAL**
 * (Task 15 brief): ELK packs when every frame's size is known and the sheet graph has at least one
 * inter-frame edge; the shelf packer is used otherwise. **That is not a fallback.** A sheet with no
 * inter-frame edges has no graph for a layered algorithm to lay out - it is a property of the
 * input, not a failure of the engine - and both packers return the same `SheetPacking`, so a
 * refusal reads the same either way. `packSheet` in `tools/schgen/elk/sheet-layout.ts` is where the
 * rule is stated once.
 *
 * **WHAT A FRAME IS CONNECTED TO: ITS LABELLED NON-RAIL NETS, AND THAT IS A DECLARED EDGE MODEL
 * RATHER THAN AN OBVIOUS ONE.** `BlockSubgraph.external` is *"labelled, non-rail nets touching this
 * block"*, so two frames share an edge when they share one. **A shared RAIL is deliberately NOT an
 * edge**: a rail is drawn as a power symbol at each end (Task 15's cross-sheet decision,
 * `../render/cross-sheet.ts`), so it implies no line between the two frames and nothing for the
 * engine to shorten - whereas a global-label pair is the thing a reader's eye traces from one frame
 * to the other. Were rails edges, every frame on a sheet would be adjacent to every other through
 * `GND` and the graph would say nothing. **This is this task's declaration, recorded in
 * `docs/known-gaps.md` so a later reader can dispute it.**
 *
 * **NO VALUE HERE WAS CHOSEN BECAUSE A PAGE LOOKED BETTER.** `../render/pack.ts`'s own reviewed
 * constants are the spacings and the padding - `MARGIN`, `GAP` and the `TITLE_BLOCK` strip it keeps
 * free - and the aspect ratio is the paper's own usable area. `docs/known-gaps.md` **G165**'s
 * criterion (b) *"deliberately refuses to let an implementer decide what 'better packing' means"*,
 * and this file obeys that: it states the input it packs to and measures the result. **It does not
 * choose between the two packings**; `../render/compose.ts`'s measures report both.
 *
 * **IT SPAWNS NOTHING**, like every other module under `lib/schgen/`: it builds the graph and reads
 * a laid-out one back. Driving `elkjs` is `tools/schgen/elk/sheet-layout.ts`'s, the same seam
 * `graph.ts` and `tools/schgen/elk/layout.ts` already draw.
 */

import { GRID, gridCeil, type Point, type Um } from "../render/geometry.ts"
import { frameSize, type FrameContent } from "../render/frames.ts"
import { GAP, MARGIN, TITLE_BLOCK, packFrames, type Size } from "../render/pack.ts"
import { serializeElkInput } from "./serialize.ts"
import type { ElkExtendedEdge, ElkNode } from "elkjs/lib/elk-api.js"
import type { NetName } from "../ir/types.ts"

export interface FramePlacement {
  readonly at: Point
  readonly size: Size
}

/**
 * What a packer returns, whichever packer it was.
 *
 * `by` names the packer so a report can say which one produced a page without re-deriving the
 * selection rule; the refusal arm carries `needed` exactly as `packFrames` does - *"the packer
 * never picks a larger paper; it reports the size it would have needed"*.
 */
export type SheetPacking =
  | { readonly ok: true; readonly at: readonly Point[]; readonly by: "shelf" | "elk" }
  | { readonly ok: false; readonly needed: Size }

/** A frame's ELK node id. Index-keyed, because a `FrameContent.blockId` is null for notes and flags. */
export function frameNodeId(index: number): string {
  return `frame:${index}`
}

/** The index a `frameNodeId` names, or null for an id this module did not make. */
export function frameIndexOf(nodeId: string): number | null {
  const match = /^frame:(\d+)$/.exec(nodeId)
  const digits = match?.[1]
  if (digits === undefined) return null
  return Number.parseInt(digits, 10)
}

/** Net -> the indices of the frames whose block touches it as a labelled non-rail net, in order. */
export function interFrameNets(contents: readonly FrameContent[]): ReadonlyMap<NetName, readonly number[]> {
  const out = new Map<NetName, number[]>()
  contents.forEach((f, i) => {
    if (f.block === null) return
    for (const net of f.block.g.external) {
      const on = out.get(net) ?? []
      on.push(i)
      out.set(net, on)
    }
  })
  return new Map([...out].filter(([, on]) => on.length > 1).sort((a, b) => (a[0] < b[0] ? -1 : 1)))
}

/**
 * A net's frames chained into a spanning path, exactly as `graph.ts`'s `edgesForNet` chains a
 * net's pins: **n frames become n - 1 edges**, never a hyperedge. One rule, two scales.
 */
function edgesForNet(net: NetName, frames: readonly number[]): ElkExtendedEdge[] {
  const out: ElkExtendedEdge[] = []
  for (let i = 1; i < frames.length; i += 1) {
    const from = frames[i - 1]
    const to = frames[i]
    if (from === undefined || to === undefined) {
      throw new Error(`net ${net}: frame ${i - 1} or ${i} is missing from a list of ${frames.length}`)
    }
    out.push({ id: `${net}:${i - 1}`, sources: [frameNodeId(from)], targets: [frameNodeId(to)] })
  }
  return out
}

/**
 * The paper's usable area: the whole sheet less the margins and less the bottom strip
 * `packFrames` keeps free for KiCad's title block.
 *
 * It is computed from `pack.ts`'s own constants rather than restated, so the two packers cannot
 * disagree about where a frame may go.
 */
export function usableArea(paper: Size): Size {
  return { w: paper.w - 2 * MARGIN, h: paper.h - 2 * MARGIN - TITLE_BLOCK }
}

/**
 * THE ROOT GRAPH's OPTIONS, AND WHERE EVERY VALUE COMES FROM.
 *
 * - `elk.algorithm = layered` and `elk.direction = RIGHT` - the same algorithm and the same
 *   decision **D4** as `options.ts`'s `BLOCK_OPTIONS`, because spec §1.7 requires *"one visual
 *   language"* and a sheet whose frames flowed one way around blocks that flow another would be
 *   two drawings stapled together by construction.
 * - `elk.edgeRouting = ORTHOGONAL` - for the same reason as at block scale, and because the sheet
 *   graph's edge geometry is **read by nothing**: no wire is drawn between two frames (every
 *   cross-frame connection is a label or a power symbol), so only the node positions are consumed.
 * - `elk.spacing.nodeNode` and `elk.layered.spacing.nodeNodeBetweenLayers = GAP` - `pack.ts`'s own
 *   reviewed gap between neighbouring frames, imported rather than restated.
 * - `elk.padding` - `MARGIN` on three sides and `MARGIN + TITLE_BLOCK` at the bottom: `pack.ts`'s
 *   own margins and its title-block strip, so a frame cannot land where the shelf packer would
 *   have refused to put one.
 * - `elk.aspectRatio` - **the usable area's own quotient of width by height**, which is what
 *   `elkjs` documents the option to be (*"the desired aspect ratio of the drawing, that is the
 *   quotient of width by height"*). It is a declared property of the paper, not a number anybody
 *   liked.
 * - `elk.layered.wrapping.strategy = MULTI_EDGE` - the option that makes `layered` honour
 *   `aspectRatio` at all, by cutting the layering into chunks placed side by side. **Why the
 *   unconstrained strategy and not `SINGLE_EDGE`:** a cut edge is *"wrapped around"* and would
 *   normally cost a long connector, but here **an inter-frame edge is drawn as nothing** - the
 *   connection is a global label at each end - so a cut costs nothing in ink, and `SINGLE_EDGE`'s
 *   restriction (cut only where one edge crosses) would constrain the wrap for a cost this drawing
 *   does not pay. **That reasoning is this task's and is recorded in `docs/known-gaps.md`**; it is
 *   a stated rule rather than a preference, but it is not a reviewed one.
 */
export function sheetOptions(paper: Size): Readonly<Record<string, string>> {
  const usable = usableArea(paper)
  return {
    "elk.algorithm": "layered",
    "elk.direction": "RIGHT",
    "elk.edgeRouting": "ORTHOGONAL",
    "elk.spacing.nodeNode": String(GAP),
    "elk.layered.spacing.nodeNodeBetweenLayers": String(GAP),
    "elk.padding": `[top=${MARGIN},left=${MARGIN},bottom=${MARGIN + TITLE_BLOCK},right=${MARGIN}]`,
    "elk.aspectRatio": String(usable.w / usable.h),
    "elk.layered.wrapping.strategy": "MULTI_EDGE",
  }
}

export interface SheetGraphInput {
  readonly graph: ElkNode
  /** The exact bytes identifying this layout input, on `serialize.ts`'s declared key order. */
  readonly serialized: string
}

/**
 * The sheet's ELK graph: one node per frame content at its own `frameSize`, one edge per
 * inter-frame step of each shared labelled net.
 *
 * It refuses an empty content list rather than laying out an empty graph, for `graph.ts`'s reason:
 * *"an empty drawing that succeeds looks exactly like a block that was drawn."*
 */
export function sheetGraphOf(contents: readonly FrameContent[], paper: Size): ElkNode {
  if (contents.length === 0) {
    throw new Error(
      "sheetGraphOf was given no frame contents, so there is nothing to pack. A sheet with no " +
        "frames is not laid out as an empty graph, because an empty page that succeeds looks " +
        "exactly like a page whose frames were dropped.",
    )
  }
  const children: ElkNode[] = contents.map((f, i) => {
    const size = frameSize(f)
    return { id: frameNodeId(i), width: size.w, height: size.h }
  })
  const edges = [...interFrameNets(contents)].flatMap(([net, frames]) => edgesForNet(net, frames))
  return { id: "sheet", layoutOptions: { ...sheetOptions(paper) }, children, edges }
}

/** The graph and the bytes that identify it, for a manifest or a report that must name the input. */
export function sheetGraphInputOf(contents: readonly FrameContent[], paper: Size): SheetGraphInput {
  const graph = sheetGraphOf(contents, paper)
  return { graph, serialized: serializeElkInput(graph) }
}

/** How many inter-frame edges a sheet graph carries: the ELK-packs half of the selection rule. */
export function interFrameEdgeCount(graph: ElkNode): number {
  return (graph.edges ?? []).length
}

/** The shelf packer's result, in `SheetPacking`'s shape. One rule, reported two ways. */
export function shelfPacking(contents: readonly FrameContent[], paper: Size): SheetPacking {
  const packed = packFrames(contents.map(frameSize), paper)
  return packed.ok ? { ok: true, at: packed.at, by: "shelf" } : { ok: false, needed: packed.needed }
}

/** The same `needed` arithmetic `packFrames` reports, from a set of placed frames. */
function neededFor(placements: readonly FramePlacement[], paper: Size): Size {
  const right = Math.max(...placements.map((p) => p.at.x + p.size.w))
  const bottom = Math.max(...placements.map((p) => p.at.y + p.size.h))
  return {
    w: Math.max(paper.w, right + MARGIN),
    h: Math.max(paper.h, bottom + MARGIN + TITLE_BLOCK),
  }
}

/**
 * A laid-out sheet graph read back as a packing: every frame's position snapped UP to the
 * electrical grid, in `contents` order.
 *
 * **SNAPPING IS NOT OPTIONAL AND IT IS UPWARD.** `contentOffset` adds grid multiples and
 * `translateLayout` asserts its offset is on grid, so a frame at a sub-grid position would refuse
 * downstream with a message about an offset rather than about a packer. `gridCeil` is used on both
 * axes, so the snap can only move a frame away from the margin it starts at: two frames snapped the
 * same way keep at least `GAP - GRID` between them, and `GAP` is two grid steps, so the snap cannot
 * close a gap. That is an argument, so the overlap is **checked** below rather than assumed.
 */
export function readSheetPacking(graph: ElkNode, contents: readonly FrameContent[], paper: Size): SheetPacking {
  const placements: FramePlacement[] = new Array<FramePlacement>(contents.length)
  let filled = 0
  for (const node of graph.children ?? []) {
    const index = frameIndexOf(node.id)
    if (index === null) {
      throw new Error(
        `the laid-out sheet graph carries a child "${node.id}" that is not a frame node. ` +
          "sheetGraphOf names every child `frame:<index>`; a different id means something else " +
          "built or edited this graph, and reading a position off it would place a frame by " +
          "accident.",
      )
    }
    const content = contents[index]
    if (content === undefined) throw new Error(`the laid-out sheet graph places frame ${index} and there are ${contents.length} frames`)
    if (node.x === undefined || node.y === undefined) {
      throw new Error(
        `ELK returned no position for frame ${index} (${content.title}). Every child of a laid-out ` +
          "graph carries x and y; a missing one is not defaulted to the origin, because every " +
          "frame would then stack in the top-left corner and the sheet would still be emitted.",
      )
    }
    if (placements[index] !== undefined) throw new Error(`the laid-out sheet graph places frame ${index} twice`)
    placements[index] = { at: { x: gridCeil(node.x), y: gridCeil(node.y) }, size: frameSize(content) }
    filled += 1
  }
  if (filled !== contents.length) {
    throw new Error(
      `the laid-out sheet graph places ${filled} of ${contents.length} frames. A frame with no ` +
        "position is not dropped, because a page missing a block looks exactly like a page whose " +
        "block was never declared.",
    )
  }
  const placed: readonly FramePlacement[] = placements
  const overlaps = frameBoxOverlaps(placed, contents)
  if (overlaps.length > 0) {
    throw new Error(
      `snapping ELK's frame positions to the ${GRID} um grid made ${overlaps.length} frame(s) ` +
        `overlap:\n  ${overlaps.join("\n  ")}\nThe snap is upward on both axes and GAP is two grid ` +
        "steps, so it should not be able to close a gap; this refuses rather than emitting " +
        "overlapping frames, because the whole-sheet text check accepts a text that is entirely " +
        "outside a frame (docs/known-gaps.md G165) and would not catch it.",
    )
  }
  const usable = usableArea(paper)
  const fits = placed.every((p) => p.at.x >= MARGIN && p.at.y >= MARGIN
    && p.at.x + p.size.w <= MARGIN + usable.w && p.at.y + p.size.h <= MARGIN + usable.h)
  if (!fits) return { ok: false, needed: neededFor(placed, paper) }
  return { ok: true, at: placed.map((p) => p.at), by: "elk" }
}

/** The frames as placed, for the measures below and for a report that prints positions. */
export function framePlacements(contents: readonly FrameContent[], at: readonly Point[]): readonly FramePlacement[] {
  return contents.map((f, i) => {
    const pos = at[i]
    if (pos === undefined) throw new Error(`the packer placed ${at.length} of ${contents.length} frames`)
    return { at: pos, size: frameSize(f) }
  })
}

/**
 * EVERY PAIR OF FRAMES WHOSE BOXES OVERLAP - spec §3.4's disjointness criterion, measured at the
 * scale where it is not trivial.
 *
 * Spec §3.4 revision 2: *"Inside a single block, disjointness is trivially satisfied, so a
 * block-scale measurement can neither pass nor fail it. It stands measured only at flat scale,
 * where it answers no ... and whatever mechanism composes blocks onto a sheet - seam B - is what it
 * will have to be measured against."* This is that measurement's first half.
 *
 * Boxes that merely TOUCH are not an overlap: `boxesOverlap` in `geometry.ts` is a strict test, and
 * two frames a `GAP` apart share no point at all.
 */
export function frameBoxOverlaps(
  placements: readonly FramePlacement[],
  contents: readonly FrameContent[],
): readonly string[] {
  const out: string[] = []
  const name = (i: number): string => contents[i]?.title ?? `frame ${i}`
  for (let i = 0; i < placements.length; i += 1) {
    for (let j = i + 1; j < placements.length; j += 1) {
      const a = placements[i]
      const b = placements[j]
      if (a === undefined || b === undefined) continue
      const overlaps = a.at.x < b.at.x + b.size.w && b.at.x < a.at.x + a.size.w
        && a.at.y < b.at.y + b.size.h && b.at.y < a.at.y + a.size.h
      if (overlaps) out.push(`frame "${name(i)}" overlaps frame "${name(j)}"`)
    }
  }
  return out
}

export interface PackingMeasures {
  readonly frames: number
  /** The bounding box of every placed frame, as width and height. */
  readonly extent: Size
  /** The sum of the frames' own areas, in square micrometres. */
  readonly frameArea: number
  /**
   * `frameArea` over the paper's usable area.
   *
   * **IT IS THE SAME FOR EVERY PACKING OF ONE CONTENT LIST, AND THAT IS WORTH KNOWING RATHER THAN
   * HIDING.** The frames' own sizes come from `frameSize`, which no packer touches, so how much
   * ink is on the page is a property of the blocks and not of the packing. The two measures below
   * are the ones a packing moves.
   */
  readonly occupancy: number
  /** `frameArea` over the bounding box of the placed frames: how densely the used region is filled. */
  readonly extentFill: number
  /** The bounding box's area over the paper's usable area: how much of the page the content spans. */
  readonly pageUse: number
  /** `extent.w / extent.h`, against the usable area's own aspect. */
  readonly aspect: number
  readonly usableAspect: number
  /** Manhattan distance between the centres of every connected frame pair, summed. */
  readonly interFrameSpan: Um
  readonly interFrameEdges: number
  readonly overlaps: readonly string[]
}

/**
 * The measures spec §3.3 gives no threshold to, computed over one packing.
 *
 * **NOTHING HERE RANKS TWO PACKINGS.** `docs/known-gaps.md` **G165**'s criterion (b) says which of
 * "report it" and "pack it better" is right *"is not an implementer's call"*, so this function
 * reports and the comparison stands. `interFrameSpan` is a Manhattan centre-to-centre distance and
 * not a wire length, because **no wire is drawn between two frames**: it is the distance a reader's
 * eye travels between the two ends of one global label, which is the quantity a connectivity-aware
 * packer could shorten.
 */
export function packingMeasures(contents: readonly FrameContent[], at: readonly Point[], paper: Size): PackingMeasures {
  const placements = framePlacements(contents, at)
  const minX = Math.min(...placements.map((p) => p.at.x))
  const minY = Math.min(...placements.map((p) => p.at.y))
  const maxX = Math.max(...placements.map((p) => p.at.x + p.size.w))
  const maxY = Math.max(...placements.map((p) => p.at.y + p.size.h))
  const usable = usableArea(paper)
  const centre = (p: FramePlacement): Point => ({ x: p.at.x + p.size.w / 2, y: p.at.y + p.size.h / 2 })
  let span = 0
  let edges = 0
  for (const [, frames] of interFrameNets(contents)) {
    for (let i = 1; i < frames.length; i += 1) {
      const a = placements[frames[i - 1] ?? -1]
      const b = placements[frames[i] ?? -1]
      if (a === undefined || b === undefined) continue
      span += Math.abs(centre(a).x - centre(b).x) + Math.abs(centre(a).y - centre(b).y)
      edges += 1
    }
  }
  const frameArea = placements.reduce((sum, p) => sum + p.size.w * p.size.h, 0)
  const extentArea = (maxX - minX) * (maxY - minY)
  return {
    frames: placements.length,
    extent: { w: maxX - minX, h: maxY - minY },
    frameArea,
    occupancy: frameArea / (usable.w * usable.h),
    extentFill: frameArea / extentArea,
    pageUse: extentArea / (usable.w * usable.h),
    aspect: (maxX - minX) / (maxY - minY),
    usableAspect: usable.w / usable.h,
    interFrameSpan: span,
    interFrameEdges: edges,
    overlaps: frameBoxOverlaps(placements, contents),
  }
}
