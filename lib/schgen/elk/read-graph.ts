/**
 * READING ELK's LAID-OUT GRAPH: NODES TO PLACEMENTS, SECTIONS TO WIRES, BOUNDARY NODES TO ANCHORS.
 *
 * Hand-written for Task 13 of the M1 schematic-authoring plan, and split out of `./adapt.ts` because
 * it is a different job: **this module translates one representation into another, and `adapt.ts`
 * enforces spec §1.4's realization contract over the result.** Nothing here canonicalises, snaps,
 * counts a junction or runs a clearance check - and nothing in `adapt.ts` reads an `ElkNode`.
 *
 * **IT IS WHERE OBLIGATION 3 IS OBEYED RATHER THAN CHECKED.** Every attachment point is recomputed
 * as `pinEnd(placement.at, placement.rot, libPin)` at the SAME `u.rot` `graph.ts` fixed the ELK port
 * at (ruling **R29**), so a wire's end comes from the library geometry and never from a returned
 * port coordinate. ELK's own port positions are read too, and kept in `elkPositions` for exactly one
 * purpose: `adapt.ts` compares them against the recomputed ends, and a difference is a refusal.
 * Keeping them for anything else would be the second copy the obligation forbids.
 */

import { pinEnd, placeBox, samePoint, type Point, type Side } from "../render/geometry.ts"
import { fmtPoint } from "../render/connectivity.ts"
import { ORIGIN, boundaryNodeId, pinPortId, unitBoxOf, unitNodeId } from "./graph.ts"
import type { Anchor, BlockSubgraph, BlockUnit, Placement, Wire } from "../render/block-types.ts"
import type { LibPin } from "../render/lib-pins.ts"
import type { NetName } from "../ir/types.ts"
import type { ElkEdgeSection, ElkExtendedEdge, ElkNode } from "elkjs/lib/elk-api.js"

/**
 * An ELK coordinate as integer micrometres.
 *
 * **THIS IS A TYPE CONVERSION AND IT IS NOT GRID SNAPPING.** `elkjs` works in doubles; `Um` is
 * integer micrometres, and `fmtMm` refuses a non-integer outright. Rounding to the nearest
 * micrometre is the unit the model is in - a thousandth of a millimetre, four orders of magnitude
 * below the 1.27 mm electrical grid - so it cannot be what moves a point onto another's line. Grid
 * snapping is `snapToGrid`'s job, it happens later, and it is checked for identity collapse; this is
 * only what makes an ELK double expressible as the model's own unit.
 */
function um(v: number): number {
  if (!Number.isFinite(v)) {
    throw new Error(
      `elkjs returned a non-finite coordinate (${String(v)}). Every coordinate in a laid-out graph ` +
        "is a position on the sheet, so there is nothing to round; it is not clamped, because a " +
        "NaN silently becoming 0 would place a part at the origin and look like a layout.",
    )
  }
  return Math.round(v)
}

/** A required coordinate of a laid-out element, or a refusal naming what is missing. */
function coordinate(v: number | undefined, what: string): number {
  if (v === undefined) {
    throw new Error(
      `${what} came back from elkjs with no coordinate. Every child of a laid-out graph carries an ` +
        "x and a y; an absent one means the graph was not laid out (layoutBlocks' outcome was ok) " +
        "or that the node is not the one this adapter asked for. It is not defaulted to 0, because " +
        "a part at the origin is indistinguishable from a part that was placed there.",
    )
  }
  return um(v)
}

/** The laid-out child of `graph` with `id`, or a refusal naming both. */
function childOf(graph: ElkNode, id: string, what: string): ElkNode {
  const node = (graph.children ?? []).find((c) => c.id === id)
  if (node === undefined) {
    throw new Error(
      `the laid-out graph of block ${String(graph.id)} has no child "${id}" (${what}). Its children ` +
        `are ${(graph.children ?? []).map((c) => String(c.id)).join(", ") || "none"}. elkjs returns ` +
        "the children it was given, so a missing one means this adapter and elkInputOf disagree " +
        "about the graph; it is not skipped, because a unit with no placement is a part the " +
        "drawing would not carry.",
    )
  }
  return node
}

/**
 * The `Placement` that produced `node`'s position.
 *
 * `graph.ts` sizes a node as `placeBox(ORIGIN, u.rot, box)` and ELK returns its `x`/`y` as that
 * box's minimum corner on the sheet. `placeBox` is translation-equivariant, so the placement origin
 * is the node's corner less the box's own corner at the same rotation - which is why `ORIGIN` and
 * `unitBoxOf` are exported from `graph.ts` rather than restated here.
 */
function placementOf(u: BlockUnit, node: ElkNode): Placement {
  const base = placeBox(ORIGIN, u.rot, unitBoxOf(u))
  const x = coordinate(node.x, `node ${String(node.id)}`)
  const y = coordinate(node.y, `node ${String(node.id)}`)
  return { part: u.part.label, unit: u.unit, at: { x: x - base.minX, y: y - base.minY }, rot: u.rot }
}

/** One terminal of an edge: a unit's pin, or a net's boundary node. */
export type Terminal =
  | { readonly kind: "pin"; readonly net: NetName; readonly at: Point; readonly what: string }
  | { readonly kind: "boundary"; readonly net: NetName; readonly at: Point; readonly what: string }

export interface Adapted {
  readonly placements: readonly Placement[]
  readonly wires: readonly Wire[]
  readonly anchors: readonly Anchor[]
  /** Every terminal of the block, by ELK id, each carrying its RECOMPUTED attachment point. */
  readonly terminals: ReadonlyMap<string, Terminal>
  /** ELK's own absolute position per terminal id, kept ONLY so obligation 3 can be measured. */
  readonly elkPositions: ReadonlyMap<string, Point>
}

/** The library pin of `u` carrying `number`, or a refusal. Mirrors `graph.ts`'s own, by necessity. */
function libPinOf(u: BlockUnit, number: string): LibPin {
  const pin = u.symbol.pins.find((p) => p.number === number && (p.unit === u.unit || p.unit === 0))
  if (pin === undefined) {
    throw new Error(
      `${u.part.label} unit ${u.unit} carries a wire on pin ${number} and ${u.symbol.libId} has no ` +
        "such pin in that unit. The adapter recomputes every attachment point from the library " +
        "pin's own geometry (spec 1.4 obligation 3), so there is nothing to recompute from.",
    )
  }
  return pin
}

/** Every terminal of the block, by the ELK id that names it. */
function terminalsOf(g: BlockSubgraph, graph: ElkNode, placements: readonly Placement[]): {
  readonly terminals: ReadonlyMap<string, Terminal>
  readonly elkPositions: ReadonlyMap<string, Point>
} {
  const terminals = new Map<string, Terminal>()
  const elkPositions = new Map<string, Point>()
  for (const u of g.units) {
    const nodeId = unitNodeId(u)
    const node = childOf(graph, nodeId, `unit ${u.unit} of ${u.part.label}`)
    const pl = placements.find((p) => p.part === u.part.label && p.unit === u.unit)
    if (pl === undefined) throw new Error(`unreachable: no placement was built for ${nodeId}`)
    const nodeX = coordinate(node.x, `node ${nodeId}`)
    const nodeY = coordinate(node.y, `node ${nodeId}`)
    for (const pin of u.pins) {
      if (pin.net === null) continue
      const id = pinPortId(nodeId, pin.pin)
      // **Obligation 3: the attachment point is RECOMPUTED, never carried.**
      const at = pinEnd(pl.at, pl.rot, libPinOf(u, pin.pin))
      terminals.set(id, { kind: "pin", net: pin.net, at, what: `${u.part.label}.${pin.pin}` })
      const port = (node.ports ?? []).find((p) => p.id === id)
      if (port !== undefined) {
        elkPositions.set(id, { x: nodeX + um(port.x ?? 0), y: nodeY + um(port.y ?? 0) })
      }
    }
  }
  for (const net of [...g.rails, ...g.external]) {
    const id = boundaryNodeId(net)
    const node = childOf(graph, id, `the boundary of net ${net}`)
    const at: Point = { x: coordinate(node.x, `node ${id}`), y: coordinate(node.y, `node ${id}`) }
    terminals.set(id, { kind: "boundary", net, at, what: `boundary ${net}` })
    elkPositions.set(id, at)
  }
  return { terminals, elkPositions }
}

/** The terminal an edge end names, or a refusal. An edge here always has exactly one of each. */
function endpointOf(edge: ElkExtendedEdge, ids: readonly string[], which: string, terminals: ReadonlyMap<string, Terminal>): Terminal {
  if (ids.length !== 1) {
    throw new Error(
      `edge ${edge.id} has ${ids.length} ${which}s. elkInputOf builds a net of degree n as n-1 ` +
        "two-terminal edges (a tree, which is what KiCad draws), so every edge has exactly one " +
        "source and one target. A hyperedge here means the graph builder changed and this adapter " +
        "did not; it is not taken apart heuristically, because which section attaches to which " +
        "terminal would then be a guess.",
    )
  }
  const id = ids[0]
  const terminal = id === undefined ? undefined : terminals.get(id)
  if (terminal === undefined) {
    throw new Error(
      `edge ${edge.id} names ${which} "${String(id)}", which is not a terminal of this block. The ` +
        "adapter resolves a terminal by LOOKUP and never by parsing the id, so an unknown id means " +
        "the graph and the subgraph disagree.",
    )
  }
  return terminal
}

/** `section`'s polyline, in order, as integer micrometres. */
function polylineOf(section: ElkEdgeSection): readonly Point[] {
  const bends = (section.bendPoints ?? []).map((p): Point => ({ x: um(p.x), y: um(p.y) }))
  return [
    { x: um(section.startPoint.x), y: um(section.startPoint.y) },
    ...bends,
    { x: um(section.endPoint.x), y: um(section.endPoint.y) },
  ]
}

/**
 * One edge's polyline, with **both ends replaced by the recomputed pin ends** - obligation 3.
 *
 * A section's own start and end are where ELK put the port. They are not read as attachment points;
 * they are compared against the recomputed ends by `portCoordinateDisagreements`, and
 * `adaptElkLayout` refuses on a difference. Here the recomputed value is simply used.
 */
function routeOfEdge(edge: ElkExtendedEdge, source: Terminal, target: Terminal): readonly Point[] {
  if (source.net !== target.net) {
    throw new Error(
      `edge ${edge.id} runs from ${source.what} (net ${source.net}) to ${target.what} (net ` +
        `${target.net}). elkInputOf only ever joins terminals of ONE net, so an edge across two is ` +
        "a wire that would short them; it is not drawn on either net, because either choice would " +
        "assert a connection the circuit does not declare.",
    )
  }
  const sections = edge.sections ?? []
  if (sections.length !== 1) {
    throw new Error(
      `edge ${edge.id} came back with ${sections.length} sections. A two-terminal orthogonal edge ` +
        "has one, and the section-to-terminal mapping for several would come from elkjs's " +
        "incomingShape/outgoingShape, which this graph never produces. It refuses rather than " +
        "taking the first, which would silently drop the rest of the route.",
    )
  }
  const section = sections[0]
  if (section === undefined) throw new Error(`unreachable: edge ${edge.id} has one section and it is absent`)
  const points = [...polylineOf(section)]
  points[0] = source.at
  points[points.length - 1] = target.at
  return points
}

/**
 * The side an anchor faces, taken from the direction the route arrives from.
 *
 * **IT IS DERIVED FROM ELK's OWN ROUTE AND NOT FROM `negotiablePort`'s DECLARED SIDES, AND THE
 * REASON IS THAT THE DECLARATION ANSWERS A DIFFERENT QUESTION.** `negotiablePort` says which EDGE
 * of the block a net may be reached from, and `graph.ts` already spent that answer: it is what pins
 * the boundary node to the first or last layer (`layerConstraintFor`). `Anchor.side` is read by
 * `anchorsToSymbols`, which turns it into a glyph ROTATION through `powerRotation` - so it decides
 * which way a power symbol points, and a glyph pointing one way with its wire arriving from another
 * is the shape §3.2's clearance checks grade badly and a reader reads as wrong.
 *
 * Under `elk.direction = RIGHT` (decision **D4**) a boundary node is placed in a layer, so a rail
 * declared `bottom` is reached by a route that arrives horizontally - and `powerRotation` has an
 * answer for all four sides of both rail kinds, so taking the route's direction costs nothing and
 * lines the glyph up with its own wire. **The disagreement between a rail's declared edge and the
 * direction its route arrives from is recorded in `docs/known-gaps.md`**; it is a fact about
 * `direction = RIGHT`, not something this function decides.
 */
function anchorSide(at: Point, route: readonly Point[]): Side {
  for (let i = route.length - 2; i >= 0; i -= 1) {
    const p = route[i]
    if (p === undefined || samePoint(p, at)) continue
    if (p.x !== at.x) return at.x > p.x ? "right" : "left"
    return at.y > p.y ? "down" : "up"
  }
  throw new Error(
    `the anchor at ${fmtPoint(at)} is reached by a route with no segment of any extent, so there is ` +
      "no direction to read its side from. Anchor.side becomes a power symbol's rotation " +
      "(powerRotation, render/text-boxes.ts) and a glyph pointing nowhere is not a default this " +
      "layer may pick: it means elkjs routed an edge to a boundary node that is on top of its own " +
      "neighbour.",
  )
}

/** Nodes, edges and boundary nodes as a `BlockLayout`, with ELK's port positions kept for the check. */
export function readElkGraph(g: BlockSubgraph, graph: ElkNode): Adapted {
  const placements = g.units.map((u) => placementOf(u, childOf(graph, unitNodeId(u), `unit ${u.unit} of ${u.part.label}`)))
  const { terminals, elkPositions } = terminalsOf(g, graph, placements)

  const wires: Wire[] = []
  const routesToBoundary = new Map<string, readonly Point[]>()
  for (const edge of graph.edges ?? []) {
    const source = endpointOf(edge, edge.sources, "source", terminals)
    const target = endpointOf(edge, edge.targets, "target", terminals)
    const route = routeOfEdge(edge, source, target)
    for (let i = 1; i < route.length; i += 1) {
      const a = route[i - 1]
      const b = route[i]
      if (a === undefined || b === undefined) continue
      wires.push({ a, b, net: source.net })
    }
    // A boundary terminal is first or last in its net's chain, so exactly one edge reaches it, and
    // the route is read from its own end inwards - reversed for the source, as drawn for the target.
    const claim = (terminal: Terminal, inwards: readonly Point[]): void => {
      if (terminal.kind !== "boundary") return
      if (routesToBoundary.has(terminal.what)) {
        throw new Error(
          `two edges reach the ${terminal.what} node. elkInputOf puts a boundary terminal first or ` +
            "last in its net's spanning chain, so it has degree one and exactly one edge arrives; " +
            "two means the chain was built differently and the anchor's side would be read off " +
            "whichever edge came first in the list.",
        )
      }
      routesToBoundary.set(terminal.what, inwards)
    }
    claim(source, [...route].reverse())
    claim(target, route)
  }

  const anchors: Anchor[] = []
  for (const net of [...g.rails, ...g.external]) {
    const terminal = terminals.get(boundaryNodeId(net))
    if (terminal === undefined) throw new Error(`unreachable: boundary terminal for ${net} was not built`)
    const route = routesToBoundary.get(terminal.what)
    if (route === undefined) {
      throw new Error(
        `net ${net} crosses block ${g.block.id}'s boundary and no edge reaches its boundary node, ` +
          "so there is no route to read its anchor's side from. elkInputOf adds the boundary node " +
          "to the net's chain, so this means the net has degree one in the graph - a single-pin " +
          "net, which the IR's own `singlePinNets` rule refuses before this point.",
      )
    }
    anchors.push({ net, at: terminal.at, side: anchorSide(terminal.at, route) })
  }

  return { placements, wires, anchors, terminals, elkPositions }
}
