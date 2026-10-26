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
 * **NEITHER OF TASK 9's TWO GEOMETRY RULES IS CALLED BY NAME HERE, AND BOTH ARE NONETHELESS THE
 * RULE** - `docs/known-gaps.md` **G182**, closed for the rotation half by ruling **R29**.
 * `pinSidesFor(kind, symbol)` and `preferredOrientation(kind, context)` both key on
 * `ComponentKind`, which lives in `lib/model/types.ts` and reaches `lib/schgen/` only through
 * `from-network.ts`'s `Network`; a `BlockSubgraph` is made of `IrPart`s and **`IrPart` has no
 * kind**. So:
 *
 * - **the side** comes from `sideOfPin(rot, pin)`, which is the same rule: `pinSidesFor` is
 *   defined as `sideOfPin(0, pin)` per pin and its own doc comment says so. `kind` is read by its
 *   no-pin refusal alone, and the equivalent refusal is here;
 * - **the rotation is `u.rot`, which IS `preferredOrientation`'s answer.** It is computed in
 *   `from-network.ts` (where the `Network` is), carried on `CircuitSpec`/`Circuit` as
 *   `orientations`, and resolved onto `BlockUnit.rot` by `subgraphOf` through
 *   `drawnRotation`. **Task 12 built every node at a `GRAPH_ROTATION = 0` constant and spec §1.5's
 *   step-2 rule library therefore never ran at all**; it runs now, and it moves exactly one part
 *   of the 102 in the four parity circuits (`pt2399-core/C8`, rotation 180 - the measurement R29
 *   decided on). The whole question was ever only where the rotation came from: `pinEnd`,
 *   `placeBox` and `sideOfPin` are applied through ONE value either way, which is spec §1.4
 *   obligation 3's *"the transform is applied once ... and the result is what both ELK and the
 *   emitter see"*, and `lib/schgen/elk/adapt.ts` reads the same `u.rot`.
 */

import { pinEnd, placeBox, unionBox, type Point, type Side } from "../render/geometry.ts"
import { labelBox, powerRotation, powerValueBox } from "../render/text-boxes.ts"
import { blockPowerLibs, labelRefsOf, powerText } from "../render/power-text.ts"
import { GEOMETRY_SIDE, sideOfPin } from "../rules/pin-sides.ts"
import { negotiablePort } from "../authoring.ts"
import { BLOCK_OPTIONS, ELK_SIDE, LAYER_CONSTRAINT_KEY, NODE_OPTIONS, PORT_SIDE_KEY, layerConstraintFor } from "./options.ts"
import { serializeElkInput } from "./serialize.ts"
import type { BlockSubgraph, BlockUnit, Mismatch } from "../render/block-types.ts"
import type { BlockId, NetName } from "../ir/types.ts"
import type { Box, LibPin } from "../render/lib-pins.ts"
import type { ElkExtendedEdge, ElkNode, ElkPort } from "elkjs/lib/elk-api.js"

/**
 * The library frame's origin: every node's geometry is built relative to it and placed by ELK.
 *
 * **Exported because `adapt.ts` must undo exactly this translation.** A node's `x`/`y` come back
 * from ELK as its placed box's minimum corner, and recovering the `Placement.at` that produced it
 * means subtracting `placeBox(ORIGIN, u.rot, box)`'s own minimum. Two constants for one origin is
 * the second copy spec 1.4 obligation 3 forbids.
 */
export const ORIGIN: Point = { x: 0, y: 0 }

export interface ElkBlockInput {
  readonly blockId: BlockId
  /** The EXACT bytes the generation manifest (spec §2.1) and the baseline (§3.3) hash. */
  readonly serialized: string
  readonly graph: ElkNode
}

/**
 * What the layout pre-pass got back for one block: a laid-out graph, or the mismatch its backend
 * raised.
 *
 * **IT IS DECLARED HERE RATHER THAN BESIDE THE DRIVER, AND THE MOVE IS TASK 13's.** It was in
 * `tools/schgen/elk/layout.ts`, which drives `elkjs` and therefore spawns a worker; the plan's
 * global constraints say `lib/schgen/` *"spawns nothing"*, so `lib/schgen/elk/adapt.ts` cannot
 * import from there - a type-only import would be erased, but the dependency would still be written
 * down the wrong way round, `lib` on `tools`. It sits beside `ElkBlockInput` because the two are one
 * layer's input and output, and the driver re-exports it so nothing that imported it has moved.
 */
export type ElkOutcome =
  | { readonly ok: true; readonly blockId: BlockId; readonly serialized: string; readonly graph: ElkNode }
  | { readonly ok: false; readonly blockId: BlockId; readonly serialized: string; readonly mismatch: Mismatch }

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

/**
 * The library pin of `u` carrying `number`, or a refusal naming the symbol and the pin.
 *
 * **EXPORTED SINCE TASK 14, FOR THE SAME REASON `unitBoxOf` BELOW IS.** `tools/schgen/elk/
 * diagnose.ts` needs the same library pin to decide whether a two-terminal unit on a self-loop
 * net is drawn horizontally, and a second copy of this lookup - and its refusal - would be a
 * second place to keep correct.
 */
export function libPinOf(u: BlockUnit, number: string): LibPin {
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

/**
 * The symbol's own box for `u`'s unit, or a refusal naming the symbol and the unit.
 *
 * **One refusal, two readers.** `adapt.ts` needs the same box to recover a placement from an ELK
 * node position, and a second copy of this message would be a second place to keep correct.
 */
export function unitBoxOf(u: BlockUnit): Box {
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
  return box
}

interface UnitNode {
  readonly node: ElkNode
  /** Net -> the port ids of this unit on it, in pin order. */
  readonly terminals: ReadonlyMap<NetName, readonly string[]>
}

/**
 * One unit as an ELK node: its size is the symbol's own placed box and every CONNECTED pin is a
 * fixed-position port on the side the symbol's own `(at x y angle)` puts it, **both taken at
 * `u.rot`** - the one rotation `subgraphOf` resolved for this unit and the one `adapt.ts` will
 * recompute the pin ends at.
 *
 * A pin explicitly not connected (`net === null`) gets no port: it carries no edge, and a port
 * ELK must route nothing to is a constraint with no connection behind it.
 */
function unitNodeOf(u: BlockUnit): UnitNode {
  const box = unitBoxOf(u)
  const placed = placeBox(ORIGIN, u.rot, box)
  const nodeId = unitNodeId(u)
  const ports: ElkPort[] = []
  const terminals = new Map<NetName, string[]>()
  for (const pin of u.pins) {
    if (pin.net === null) continue
    const libPin = libPinOf(u, pin.pin)
    const end = pinEnd(ORIGIN, u.rot, libPin)
    const id = pinPortId(nodeId, pin.pin)
    ports.push({
      id,
      x: end.x - placed.minX,
      y: end.y - placed.minY,
      width: 0,
      height: 0,
      layoutOptions: { [PORT_SIDE_KEY]: ELK_SIDE[sideOfPin(u.rot, libPin)] },
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
 * The box a boundary net will actually occupy when it is drawn, at the origin, over every side
 * `negotiablePort` leaves open - **computed with the same functions the clearance checker uses**,
 * so the space ELK reserves and the space the checker measures cannot drift apart.
 *
 * A labelled net is drawn as a global label (`labelBox`); a rail is drawn as a power symbol glyph
 * plus its value text (`powerText` + `powerValueBox`), at the rotation `powerRotation` gives for
 * that side. Where more than one side is still open the union is taken, because the node must
 * hold whichever side the layout eventually picks.
 *
 * `valueAlong` is taken as BOTH, unioned, for the same reason: it is the block's rendering mode
 * (`valuesAlong`), which this function deliberately does not read - a size that depended on it
 * would be a second place for the rendering mode to be correct in.
 */
function boundaryBox(net: NetName, g: BlockSubgraph, sides: readonly Side[]): Box {
  const rail = g.railSpecs.get(net)
  const libs = blockPowerLibs(g)
  const boxes = sides.flatMap((side): Box[] => {
    if (rail === undefined) return [labelBox({ net, at: ORIGIN, side, refs: labelRefsOf(g, net) })]
    return [true, false].map((valueAlong) => {
      const t = powerText(libs, { net, libId: rail.symbol, at: ORIGIN, rot: powerRotation(rail.kind, side), flag: false, valueAlong })
      return unionBox(t.glyph, powerValueBox(t.value, t.text))
    })
  })
  const first = boxes[0]
  if (first === undefined) throw new Error(`boundary net ${net}: negotiablePort left no side open, so no drawn box can be computed`)
  return boxes.reduce(unionBox, first)
}

/**
 * A boundary net as an ELK node SIZED BY WHAT WILL BE DRAWN AT IT, pinned to a layer when the
 * reviewed rule gives it a single horizontal side.
 *
 * **THIS RETURNED `width: 0, height: 0` UNTIL 2026-10-24, AND THAT IS WHY GENERATED SHEETS WERE
 * CRAMPED.** The old comment called zero size *"the measured difference from both spikes, not an
 * omission"* and deferred the geometry: *"What a rail's power symbol or a label's outline occupies
 * is decided when it is drawn (seam B, D9), not here."* Deferring the DRAWING is right; deferring
 * the SIZE told ELK the text was dimensionless, so it packed the circuit around points and the
 * text was drawn afterwards into space that had never been reserved for it. The clearance checks
 * then refused the block - **blaming the text for not fitting a space allocated on the assumption
 * that it was not there.**
 *
 * **The owner saw it in a drawing before anyone saw it in this file**, 2026-10-24: *"There's no
 * good reason to cram everything so tightly and then complain there's no room for the text."*
 * `docs/known-gaps.md` **G291** has his words in full, the cause, and the measurement - sizing
 * these nodes drew `transistor-preamp-lab` for the first time and cleared
 * `transistor-preamp-loop`'s collisions outright, **with no clearance check relaxed**.
 *
 * **G101's floor is not contradicted.** That finding - *"a 1-part block's drawing is two-thirds
 * boundary"* - was about `netlistsvg` emitting a 30x20 `inputExt` GLYPH for a port, which this
 * backend still does not do. A port here has no glyph of its own; what it has is a label or a
 * power symbol that this repository draws and measures, and that is what is reserved.
 *
 * The side comes from `negotiablePort`, which is the reviewed rule already in the tree; this only
 * turns it into D4's flow through `layerConstraintFor`. **Both of its inputs are the subgraph's
 * own** since ruling R29: `g.portDirections` and `g.railSpecs`.
 */
function boundaryNodeOf(net: NetName, g: BlockSubgraph): ElkNode {
  const port = negotiablePort(net, { portDirections: g.portDirections, rails: [...g.railSpecs.values()] })
  const constraint = layerConstraintFor(port.sides)
  const box = boundaryBox(net, g, port.sides.map((s) => GEOMETRY_SIDE[s]))
  return {
    id: boundaryNodeId(net),
    width: box.maxX - box.minX,
    height: box.maxY - box.minY,
    layoutOptions:
      constraint === null ? { ...NODE_OPTIONS } : { ...NODE_OPTIONS, [LAYER_CONSTRAINT_KEY]: constraint },
  }
}

/**
 * A net's terminals as a STAR from its upstream terminal: **a net of degree n becomes n - 1
 * edges**, which is a tree and is what KiCad draws - a net is wire segments plus a junction at
 * every branch, never a hyperedge.
 *
 * **IT WAS A CHAIN UNTIL 2026-10-25 - `terminals[i-1] -> terminals[i]` - AND THE CHAIN WAS WHY A
 * PARALLEL BANK CAME OUT AS A STAIRCASE.** The sentence above is about DRAWING and is sound
 * there; the mistake was that **the same edges are what ELK LAYS OUT FROM**, and to a layered
 * algorithm `C1 -> C2 -> ... -> C10` is a series string ten layers deep. `docs/known-gaps.md`
 * **G293** has the measurement: `pultec-hi-cut`'s ten capacitors - a parallel bank selected by a
 * rotary switch - were placed at **ten distinct x positions, uniformly 12.7 mm apart**, one grid
 * step per layer. The drawing was a faithful rendering of a graph that said the wrong thing about
 * the circuit.
 *
 * The owner saw it in the picture before anyone measured it: *"my guess is that stacking all the
 * capacitors in the same column would eliminate hairpins and make the signal flows left much more
 * obvious."* A star puts every sibling ONE hop from the source instead of `i` hops, so siblings
 * share a depth, and nodes of equal depth share a layer, which is a column.
 *
 * **IT IS STILL A TREE AND STILL n - 1 EDGES**, so `../render/read-graph.ts`'s one-section-per-edge
 * contract is untouched and a hyperedge is still never emitted. What changes is where the branch
 * sits: at the source terminal rather than strung along the chain. **The junction checks must
 * therefore still agree** - a branch point with no junction is a connection KiCad does not make -
 * and G293 records that two boards refuse on exactly that check, so it is live.
 *
 * The boundary terminal goes FIRST when its layer constraint is `FIRST_SEPARATE` and LAST
 * otherwise, so an inbound net's edges run with the flow and every other boundary net is a sink.
 * That is D4's direction applied to `negotiablePort`'s own answer; it is not a choice about the
 * circuit.
 */
/**
 * THE OWNER'S *"signal flows left to right"*, made expressible: how far downstream each node is,
 * by breadth-first search from the block's INBOUND boundary nets.
 *
 * **WITHOUT THIS, WHAT ENDS UP LEFT AND WHAT ENDS UP RIGHT IS DECIDED BY THE ORDER SOMEBODY WROTE
 * THE COMPONENTS IN.** `edgesForNet` chains a net's terminals in list order, the list is built as
 * `g.units` is walked, and `layered` assigns layers from edge direction - so declaration order
 * became reading order. `docs/known-gaps.md` **G292** measured the visible consequence on
 * `pultec-hi-boost`: its rotary switch's throws feed a capacitor bank laid out UPSTREAM of the
 * switch, so every throw wire leaves rightward, turns, and runs back left. The owner's words for
 * it were *"fanned out to the top and bottom of the switch symbol"*.
 *
 * **THE SEED IS NOT INVENTED - it is the same fact `layerConstraintFor` already acts on.** A
 * boundary net whose only horizontal side is `left` gets `FIRST_SEPARATE`, which is this
 * repository's existing statement that the net enters here. Those are depth 0. Everything else
 * takes its depth from the search.
 *
 * **A NET NOT REACHED KEEPS ITS LIST ORDER**, deliberately: a block with no declared inbound net
 * has nothing to flow from, and inventing a direction for it would be choosing an arrangement by
 * taste - which is what §1.5 and `CLAUDE.md` forbid. Such a block lays out exactly as it did
 * before this function existed.
 */
function downstreamDepth(
  seeds: ReadonlySet<NetName>,
  terminals: ReadonlyMap<NetName, readonly string[]>,
  nodeOfTerminal: (t: string) => string,
): ReadonlyMap<string, number> {
  const netsOfNode = new Map<string, Set<NetName>>()
  for (const [net, on] of terminals) {
    for (const t of on) {
      const node = nodeOfTerminal(t)
      const nets = netsOfNode.get(node) ?? new Set<NetName>()
      nets.add(net)
      netsOfNode.set(node, nets)
    }
  }
  const depth = new Map<string, number>()
  const seenNets = new Set<NetName>()
  let frontier = [...seeds].filter((n) => terminals.has(n)).sort()
  for (const n of frontier) seenNets.add(n)
  for (let d = 0; frontier.length > 0; d += 1) {
    const next: NetName[] = []
    for (const net of frontier) {
      for (const t of terminals.get(net) ?? []) {
        const node = nodeOfTerminal(t)
        if (!depth.has(node)) depth.set(node, d)
        for (const other of netsOfNode.get(node) ?? []) {
          if (seenNets.has(other)) continue
          seenNets.add(other)
          next.push(other)
        }
      }
    }
    frontier = next.sort()
  }
  return depth
}

/** A boundary terminal is the whole node (`port:<net>`); a unit's is `<part>:<unit>#<pin>`. */
const isBoundaryTerminal = (t: string): boolean => !t.includes("#")

function edgesForNet(net: NetName, terminals: readonly string[]): ElkExtendedEdge[] {
  const out: ElkExtendedEdge[] = []
  if (terminals.length < 2) return out
  // THE HUB IS A UNIT TERMINAL WHEREVER ONE EXISTS, AND THAT IS NOT A PREFERENCE.
  // `../elk/read-graph.ts` refuses a boundary node that two edges reach - the anchor's side is
  // read off the single route arriving, and with two it would be *"read off whichever edge came
  // first in the list"*. A star hubbed on a boundary would give it degree n-1 and trip exactly
  // that guard, which is correct about an anchor and has nothing to do with the layering this
  // star is for. Hubbing on a unit keeps every boundary at degree one AND still puts every
  // sibling one hop from the hub, so they share a depth and therefore a column.
  const hubIndex = terminals.findIndex((t) => !isBoundaryTerminal(t))
  const hub = terminals[hubIndex === -1 ? 0 : hubIndex]
  if (hub === undefined) return out
  let n = 0
  for (let i = 0; i < terminals.length; i += 1) {
    const t = terminals[i]
    if (t === undefined) throw new Error(`net ${net}: terminal ${i} is missing from a list of ${terminals.length}`)
    if (t === hub) continue
    // An INBOUND boundary sits first in the list (`FIRST_SEPARATE`); it is upstream of the hub,
    // so the edge runs into the hub. Everything else is downstream and runs out of it. That is
    // D4's direction applied to `negotiablePort`'s own answer, exactly as the chain applied it.
    const upstream = i < hubIndex && isBoundaryTerminal(t)
    out.push(upstream ? { id: `${net}:${n}`, sources: [t], targets: [hub] } : { id: `${net}:${n}`, sources: [hub], targets: [t] })
    n += 1
  }
  return out
}

/**
 * The block's ELK graph, and the exact bytes that identify it.
 *
 * **IT TAKES THE SUBGRAPH AND NOTHING ELSE SINCE RULING R29, AND THAT IS `docs/known-gaps.md`
 * G186's CRITERION MET.** It used to take a whole `SchematicAuthoring` for the two things
 * `negotiablePort` reads. G186 measured that *"the rails half was already available"* -
 * `g.railSpecs` holds a `RailSpec` for exactly the nets in `g.rails`, built by `subgraphOf` from
 * `Circuit.rails` - and that *"`portDirections` is the only input genuinely missing from the IR"*.
 * R29 put it there, so both now arrive on the subgraph and `GenerateEnv.authoring` is deleted.
 *
 * **WHAT WENT WITH THE PARAMETER: a cross-check that can no longer fail, removed rather than
 * left.** The old refusal fired when the IR called a net a rail and the authoring file passed
 * alongside did not - a caller holding the wrong circuit's declaration. With the rails read from
 * the subgraph there is only one source, so the two cannot disagree and the check could never
 * fire. `CLAUDE.md`: *"a skipped check must never look like a passing one"* - a guard that cannot
 * fail is that shape, so it is deleted rather than kept for the comfort of having a guard.
 * `subgraphOf`'s own *"rail `n` has no spec"* throw is what now holds `railSpecs` complete.
 */
export function elkInputOf(g: BlockSubgraph): ElkBlockInput {
  if (g.units.length === 0) {
    throw new Error(
      `block ${g.block.id} holds no units, so there is nothing to lay out. A block with no members ` +
        "cannot be drawn and is not laid out as an empty graph, because an empty drawing that " +
        "succeeds looks exactly like a block that was drawn.",
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
  // `inboundNets` is collected here rather than re-derived: `FIRST_SEPARATE` is already this
  // repository's statement that a net ENTERS the block, and `downstreamDepth` seeds from it.
  // `readsFrom` is the block's own statement about its DRAWING and outranks the electrical
  // declaration, because a net can be a true `bidirectional` and the picture still have a side it
  // reads from - `docs/known-gaps.md` **G294**. Absent, the seed is `FIRST_SEPARATE` as before.
  const inboundNets = new Set<NetName>()
  if (g.block.readsFrom !== null) inboundNets.add(g.block.readsFrom)
  for (const net of boundaryNets(g)) {
    const node = boundaryNodeOf(net, g)
    claim(node.id, `the boundary of net ${net}`)
    children.push(node)
    const first = node.layoutOptions?.[LAYER_CONSTRAINT_KEY] === "FIRST_SEPARATE"
    if (first) inboundNets.add(net)
    const on = terminals.get(net) ?? []
    terminals.set(net, first ? [node.id, ...on] : [...on, node.id])
  }

  // THE SIGNAL ORDER, before any edge is made. `downstreamDepth`'s header says why this exists
  // and why a net it does not reach is left exactly as it was.
  const nodeOfTerminal = (t: string): string => {
    const hash = t.lastIndexOf("#")
    return hash === -1 ? t : t.slice(0, hash)
  }
  const depth = downstreamDepth(inboundNets, terminals, nodeOfTerminal)

  // Nets in the IR's own order, which `Circuit.nets` sorts by name: one iteration order, stated.
  const edges: ElkExtendedEdge[] = []
  for (const net of [...terminals.keys()].sort()) {
    const on = terminals.get(net)
    if (on === undefined) throw new Error(`net ${net} vanished from the terminal map of block ${g.block.id}`)
    // A STABLE sort by how far downstream each terminal's node is, so the chain runs with the
    // signal. Equal depths keep their existing order, which is what leaves an unreached net
    // byte-identical to what this produced before.
    const ordered = on.every((t) => depth.has(nodeOfTerminal(t)))
      ? [...on].sort((a, b) => (depth.get(nodeOfTerminal(a)) ?? 0) - (depth.get(nodeOfTerminal(b)) ?? 0))
      : on
    edges.push(...edgesForNet(net, ordered))
  }

  const graph: ElkNode = { id: g.block.id, layoutOptions: { ...BLOCK_OPTIONS }, children, edges }
  return { blockId: g.block.id, serialized: serializeElkInput(graph), graph }
}
