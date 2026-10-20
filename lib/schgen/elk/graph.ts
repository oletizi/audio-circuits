/**
 * ONE BLOCK'S ELK LAYOUT GRAPH, BUILT FROM THE SYMBOL LIBRARY'S OWN PIN GEOMETRY.
 *
 * Hand-written for Task 12 of the M1 schematic-authoring plan. Spec §1.2 names what transfers
 * from `netlistsvg` and what does not: **what transfers is that every symbol declares which SIDE
 * each pin leaves from and ELK is told those port positions are FIXED** - *"that one constraint is
 * what turns a generic layered graph drawing into something that reads like a circuit"* - and
 * **what does not transfer is the code path.** `netlistsvg` emits SVG through a skin; this emits
 * `.kicad_sch`. So:
 *
 * | the spikes, through `netlistsvg` | here |
 * | --- | --- |
 * | a node's size is a skin template's declared extent | `u.symbol.boxes.get(u.unit)`, placed, in micrometres |
 * | a port is a 30x20 `inputExt` CELL (**G101**'s floor) | a `LibPin`'s transformed end, and a boundary port node of zero size |
 * | the x-offset between congruent blocks is `6 * len(id) + 5` (**G97**) | nothing here draws an id, so that formula is the skin's |
 * | `direction = DOWN` (the analog skin's) | `RIGHT`, plan decision **D4** |
 *
 * **So no spike number in G94-G101 is a prediction about this graph**, and Task 17 is the
 * re-measurement that says which ones survive. `docs/known-gaps.md` **G180** records the caveat
 * against each.
 *
 * **TWO OF TASK 9's THREE RULES CANNOT BE REACHED FROM HERE, AND IT IS STRUCTURAL.**
 * `pinSidesFor(kind, symbol)` and `preferredOrientation(kind, context)` both key on
 * `ComponentKind`, which lives in `lib/model/types.ts` and reaches `lib/schgen/` only through
 * `from-network.ts`'s `Network`. A `BlockSubgraph` is made of `IrPart`s, and **`IrPart` has no
 * kind** - so neither rule is callable from `elkInputOf`'s declared inputs. What this module does
 * instead, and what it costs, is `docs/known-gaps.md` **G182**:
 *
 * - **the side** comes from `sideOfPin(rot, pin)`, which is the same rule: `pinSidesFor` is
 *   defined as `sideOfPin(0, pin)` per pin and its own doc comment says so. `kind` is read by its
 *   no-pin refusal alone, and the equivalent refusal is here;
 * - **the rotation** is `GRAPH_ROTATION` - see its comment. The orientation rule is unreachable,
 *   so this is the symbol's own library frame rather than a stand-in for the rule's answer.
 */

import { pinEnd, placeBox, type Point, type Rotation } from "../render/geometry.ts"
import { sideOfPin } from "../rules/pin-sides.ts"
import { negotiablePort } from "../authoring.ts"
import { BLOCK_OPTIONS, ELK_SIDE, LAYER_CONSTRAINT_KEY, NODE_OPTIONS, PORT_SIDE_KEY, layerConstraintFor } from "./options.ts"
import { serializeElkInput } from "./serialize.ts"
import type { BlockSubgraph, BlockUnit } from "../render/block-types.ts"
import type { BlockId, NetName } from "../ir/types.ts"
import type { LibPin } from "../render/library.ts"
import type { SchematicAuthoring } from "../authoring.ts"
import type { ElkExtendedEdge, ElkNode, ElkPort } from "elkjs/lib/elk-api.js"

/** The library frame's origin: every node's geometry is built relative to it and placed by ELK. */
const ORIGIN: Point = { x: 0, y: 0 }

/**
 * The rotation every unit's geometry is transformed through, and **it is the library frame rather
 * than a default standing in for spec §1.5's orientation rule.**
 *
 * §1.5's authority order is: a reviewed template's explicit orientation, else a circuit-context
 * rule, else *"ELK then places, subject to fixed port geometry, and may choose among orientations
 * the rules leave open"*. `rules/orientation.ts` holds exactly one entry and returns `null` for
 * everything else, and `null` means step 3 - **not** rotation 0.
 *
 * **It is not consulted here because it cannot be.** It keys on `ComponentKind` and a
 * `BlockSubgraph` carries none (see the module comment and **G182**). And step 3's freedom is not
 * available either: ELK is handed FIXED_POS ports, so a rotation has to be fixed before the graph
 * exists. Rotation 0 is the orientation the symbol library itself draws the part in, which is a
 * stated frame rather than a guess, and `pinEnd`, `placeBox` and `sideOfPin` are all applied
 * through this one value - so the side and the position agree, which is spec §1.4 obligation 3's
 * *"the transform is applied once ... and the result is what both ELK and the emitter see."*
 *
 * **The deviation this leaves open is Task 13's**: its brief takes `rot` from
 * `preferredOrientation`, and a placement rotated after the ports were fixed at 0 would be the
 * second transform obligation 3 forbids. **G182** carries the criterion.
 */
export const GRAPH_ROTATION: Rotation = 0

export interface ElkBlockInput {
  readonly blockId: BlockId
  /** The EXACT bytes the generation manifest (spec §2.1) and the baseline (§3.3) hash. */
  readonly serialized: string
  readonly graph: ElkNode
}

/** A placed unit's node id. `:` separates the part label from the unit; neither may contain one. */
export function unitNodeId(u: BlockUnit): string {
  return `${u.part.label}:${u.unit}`
}

/** A boundary net's node id, in a namespace no unit node can collide with. */
export function boundaryNodeId(net: NetName): string {
  return `port:${net}`
}

/** A pin's ELK port id. */
export function pinPortId(nodeId: string, pinNumber: string): string {
  return `${nodeId}#${pinNumber}`
}

/** The library pin of `u` carrying `number`, or a refusal naming the symbol and the pin. */
function libPinOf(u: BlockUnit, number: string): LibPin {
  const pin = u.symbol.pins.find((p) => p.number === number && (p.unit === u.unit || p.unit === 0))
  if (pin === undefined) {
    throw new Error(
      `${u.part.label} unit ${u.unit} is wired on pin ${number} and ${u.symbol.libId} has no such ` +
        `pin in that unit (it has ${u.symbol.pins.filter((p) => p.unit === u.unit || p.unit === 0).map((p) => p.number).join(", ") || "none"}). ` +
        "The ELK graph positions a port at the library pin's own end, so there is nothing to " +
        "position; it is not skipped, because a dropped port is a connection the drawing would " +
        "not carry.",
    )
  }
  return pin
}

interface UnitNode {
  readonly node: ElkNode
  /** Net -> the port ids of this unit on it, in pin order. */
  readonly terminals: ReadonlyMap<NetName, readonly string[]>
}

/**
 * One unit as an ELK node: its size is the symbol's own placed box and every CONNECTED pin is a
 * fixed-position port on the side the symbol's own `(at x y angle)` puts it.
 *
 * A pin explicitly not connected (`net === null`) gets no port: it carries no edge, and a port
 * ELK must route nothing to is a constraint with no connection behind it.
 */
function unitNodeOf(u: BlockUnit): UnitNode {
  const box = u.symbol.boxes.get(u.unit)
  if (box === undefined) {
    throw new Error(
      `${u.symbol.libId} has no unit box for unit ${u.unit}, so ${u.part.label} has no size for ` +
        "the ELK graph. `LibSymbol.boxes` is built per unit by `unitBoxes` in " +
        "lib/schgen/render/lib-pins.ts; a missing entry means the symbol declares no geometry for " +
        "that unit. It is not defaulted, because a node sized by a guess is a drawing laid out " +
        "against geometry the schematic does not have.",
    )
  }
  const placed = placeBox(ORIGIN, GRAPH_ROTATION, box)
  const nodeId = unitNodeId(u)
  const ports: ElkPort[] = []
  const terminals = new Map<NetName, string[]>()
  for (const pin of u.pins) {
    if (pin.net === null) continue
    const libPin = libPinOf(u, pin.pin)
    const end = pinEnd(ORIGIN, GRAPH_ROTATION, libPin)
    const id = pinPortId(nodeId, pin.pin)
    ports.push({
      id,
      x: end.x - placed.minX,
      y: end.y - placed.minY,
      width: 0,
      height: 0,
      layoutOptions: { [PORT_SIDE_KEY]: ELK_SIDE[sideOfPin(GRAPH_ROTATION, libPin)] },
    })
    const on = terminals.get(pin.net) ?? []
    on.push(id)
    terminals.set(pin.net, on)
  }
  return {
    node: {
      id: nodeId,
      width: placed.maxX - placed.minX,
      height: placed.maxY - placed.minY,
      layoutOptions: { ...NODE_OPTIONS },
      ports,
    },
    terminals,
  }
}

/**
 * The nets that must reach the block's boundary: its declared rails and its labelled non-rail
 * nets, which is exactly the set every ported template draws an `Anchor` for.
 *
 * In `g.rails` order then `g.external` order, so the node list is deterministic without sorting
 * the two together and losing which is which.
 */
function boundaryNets(g: BlockSubgraph): readonly NetName[] {
  return [...g.rails, ...g.external]
}

/**
 * A boundary net as an ELK node of ZERO size, pinned to a layer when the reviewed rule gives it a
 * single horizontal side.
 *
 * **Zero size is the measured difference from both spikes, not an omission.** G101's floor - *"a
 * 1-part block's drawing is two-thirds boundary"* - was *"ENTIRELY the skin's"*: a port became a
 * drawn cell only because `netlistsvg` emits a 30x20 `inputExt` glyph for it. This backend emits
 * no port glyph. What a rail's power symbol or a label's outline occupies is decided when it is
 * drawn (seam B, **D9**), not here.
 *
 * The side comes from `negotiablePort`, which is the reviewed rule already in the tree; this only
 * turns it into D4's flow through `layerConstraintFor`.
 */
function boundaryNodeOf(net: NetName, authoring: SchematicAuthoring): ElkNode {
  const port = negotiablePort(net, { portDirections: authoring.portDirections, rails: authoring.rails })
  const constraint = layerConstraintFor(port.sides)
  return {
    id: boundaryNodeId(net),
    width: 0,
    height: 0,
    layoutOptions:
      constraint === null ? { ...NODE_OPTIONS } : { ...NODE_OPTIONS, [LAYER_CONSTRAINT_KEY]: constraint },
  }
}

/**
 * A net's terminals, chained into a spanning path: **a net of degree n becomes n - 1 edges**,
 * which is a tree and is what KiCad draws - a net is wire segments plus a junction at every
 * branch, never a hyperedge.
 *
 * The boundary terminal goes FIRST when its layer constraint is `FIRST_SEPARATE` and LAST
 * otherwise, so an inbound net's edges run with the flow and every other boundary net is a sink.
 * That is D4's direction applied to `negotiablePort`'s own answer; it is not a choice about the
 * circuit.
 */
function edgesForNet(net: NetName, terminals: readonly string[]): ElkExtendedEdge[] {
  const out: ElkExtendedEdge[] = []
  for (let i = 1; i < terminals.length; i += 1) {
    const from = terminals[i - 1]
    const to = terminals[i]
    if (from === undefined || to === undefined) {
      throw new Error(`net ${net}: terminal ${i - 1} or ${i} is missing from a list of ${terminals.length}`)
    }
    out.push({ id: `${net}:${i - 1}`, sources: [from], targets: [to] })
  }
  return out
}

/**
 * The block's ELK graph, and the exact bytes that identify it.
 *
 * `authoring` is read for two things and nothing else: `portDirections` and `rails`, both through
 * `negotiablePort`. Every other input is the subgraph's own.
 *
 * **AND ONE OF THOSE TWO IS IN THE SUBGRAPH TOO, which matters for where a port direction should
 * eventually live** (review round 2, Important 5). `g.railSpecs` holds a `RailSpec` for exactly
 * the nets in `g.rails`, built by `subgraphOf` from `Circuit.rails`, and it carries everything
 * `negotiablePort` reads - so the rail half could be served from the subgraph alone.
 * **`portDirections` is the only input the IR has no slot for.** What taking the rails from the
 * declaration buys is the cross-check below: it refuses when the IR calls a net a rail and this
 * declaration does not, which is a caller holding the wrong circuit's authoring file.
 * `docs/known-gaps.md` **G186**.
 */
export function elkInputOf(g: BlockSubgraph, authoring: SchematicAuthoring): ElkBlockInput {
  if (g.units.length === 0) {
    throw new Error(
      `block ${g.block.id} holds no units, so there is nothing to lay out. A block with no members ` +
        "cannot be drawn and is not laid out as an empty graph, because an empty drawing that " +
        "succeeds looks exactly like a block that was drawn.",
    )
  }
  const declaredRails = new Set(authoring.rails.map((r) => r.net))
  const undeclared = [...g.rails].filter((n) => !declaredRails.has(n))
  if (undeclared.length > 0) {
    throw new Error(
      `block ${g.block.id}: the IR says ${undeclared.join(", ")} ${undeclared.length === 1 ? "is a rail" : "are rails"} ` +
        "and the authoring declaration passed here does not declare them. `negotiablePort` reads " +
        "the declaration to decide where a rail attaches (ground at the bottom, supply at the " +
        "top), so it would place them as ordinary signal nets. Pass the authoring file this " +
        "circuit was built from; it is not guessed from the IR, because a rail drawn on the wrong " +
        "edge is a drawing nobody chose.",
    )
  }

  const children: ElkNode[] = []
  const terminals = new Map<NetName, string[]>()
  const seen = new Set<string>()
  const claim = (id: string, what: string): void => {
    if (seen.has(id)) {
      throw new Error(
        `block ${g.block.id}: two nodes claim the ELK id "${id}" (the second is ${what}). Node ids ` +
          "are `<part>:<unit>` for a placed unit and `port:<net>` for a boundary net; a collision " +
          "means a part label or a net name contains the separator. It refuses rather than " +
          "overwriting, because ELK would silently lay out one node and drop the other.",
      )
    }
    seen.add(id)
  }

  for (const u of g.units) {
    const built = unitNodeOf(u)
    claim(built.node.id, `unit ${u.unit} of ${u.part.label}`)
    children.push(built.node)
    for (const [net, ids] of built.terminals) {
      const on = terminals.get(net) ?? []
      on.push(...ids)
      terminals.set(net, on)
    }
  }

  // Boundary nodes after the units, so a unit's own ports are numbered before any boundary.
  for (const net of boundaryNets(g)) {
    const node = boundaryNodeOf(net, authoring)
    claim(node.id, `the boundary of net ${net}`)
    children.push(node)
    const first = node.layoutOptions?.[LAYER_CONSTRAINT_KEY] === "FIRST_SEPARATE"
    const on = terminals.get(net) ?? []
    terminals.set(net, first ? [node.id, ...on] : [...on, node.id])
  }

  // Nets in the IR's own order, which `Circuit.nets` sorts by name: one iteration order, stated.
  const edges: ElkExtendedEdge[] = []
  for (const net of [...terminals.keys()].sort()) {
    const on = terminals.get(net)
    if (on === undefined) throw new Error(`net ${net} vanished from the terminal map of block ${g.block.id}`)
    edges.push(...edgesForNet(net, on))
  }

  const graph: ElkNode = { id: g.block.id, layoutOptions: { ...BLOCK_OPTIONS }, children, edges }
  return { blockId: g.block.id, serialized: serializeElkInput(graph), graph }
}
