/**
 * THE ELK GRAPH: FIXED PORTS ON THE SYMBOL'S OWN SIDES, AND A NET AS A TREE.
 *
 * Hand-written for Task 12 of the M1 schematic-authoring plan. The first test is spec §1.2's one
 * transferable mechanism made into a check that can fail - *"every symbol declares which SIDE each
 * pin leaves from, and ELK is told those port positions are FIXED"* - and the second is the
 * net-as-a-tree obligation KiCad imposes: a net is wire segments plus a junction at every branch,
 * never a hyperedge.
 */

import { expect, test } from "bun:test"
import { elkInputOf, boundaryNodeId, pinPortId, unitNodeId } from "../../../lib/schgen/elk/graph.ts"
import { ELK_SIDE, ELK_SIDES, LAYER_CONSTRAINT_KEY, NODE_SEPARATION, LAYER_SEPARATION, PORT_SIDE_KEY, layerConstraintFor, wholeGridSteps } from "../../../lib/schgen/elk/options.ts"
import { sideOfPin } from "../../../lib/schgen/rules/pin-sides.ts"
import { placeBox } from "../../../lib/schgen/render/geometry.ts"
import { autoBlock, dividerSubgraph, groundedPinOneBlock, groundOfDegreeSix, inboundAndOutboundBlock } from "./fixtures.ts"
import { cap, res, symbols } from "../__fixtures__/circuits.ts"
import { subgraphOf } from "../../../lib/schgen/render/blocks.ts"
import { blockCircuit } from "../__fixtures__/circuits.ts"
import { LIBRARY_FRAME } from "../../../lib/schgen/rules/orientation.ts"
import { twoPin, UNNAMED } from "../../../lib/schgen/ir/author.ts"
import { TEST_BOM } from "../__fixtures__/fixture-lib.ts"
import type { PartLabel } from "../../../lib/schgen/ir/types.ts"
import type { Rotation } from "../../../lib/schgen/render/geometry.ts"

test("every connected pin becomes a fixed-position port on its symbol's own side", () => {
  const { graph } = elkInputOf(dividerSubgraph())
  const children = graph.children ?? []
  expect(children.length).toBeGreaterThan(0)
  let ports = 0
  for (const node of children) {
    expect(node.layoutOptions?.["elk.portConstraints"], `node ${node.id}`).toBe("FIXED_POS")
    for (const port of node.ports ?? []) {
      ports += 1
      expect(ELK_SIDES, `port ${port.id}`).toContain(port.layoutOptions?.[PORT_SIDE_KEY] ?? "(no side)")
    }
  }
  // Two resistors, two pins each: a zero-port run would pass the loop above and say nothing.
  expect(ports).toBe(4)
})

test("a port's side is the one the symbol's own (at x y angle) gives it, not a declaration", () => {
  const g = dividerSubgraph()
  const { graph } = elkInputOf(g)
  const top = g.units.find((u) => u.part.label === "R_TOP")
  expect(top).toBeDefined()
  if (top === undefined) return
  const node = (graph.children ?? []).find((c) => c.id === unitNodeId(top))
  expect(node).toBeDefined()
  for (const libPin of top.symbol.pins) {
    const port = (node?.ports ?? []).find((p) => p.id === pinPortId(unitNodeId(top), libPin.number))
    expect(port, `pin ${libPin.number}`).toBeDefined()
    expect(port?.layoutOptions?.[PORT_SIDE_KEY]).toBe(ELK_SIDE[sideOfPin(top.rot, libPin)])
  }
})

test("a port sits at its library pin's own end, relative to the node's placed box", () => {
  const g = dividerSubgraph()
  const { graph } = elkInputOf(g)
  const unit = g.units[0]
  expect(unit).toBeDefined()
  if (unit === undefined) return
  const box = unit.symbol.boxes.get(unit.unit)
  expect(box).toBeDefined()
  if (box === undefined) return
  const placed = placeBox({ x: 0, y: 0 }, unit.rot, box)
  const node = (graph.children ?? []).find((c) => c.id === unitNodeId(unit))
  expect(node?.width).toBe(placed.maxX - placed.minX)
  expect(node?.height).toBe(placed.maxY - placed.minY)
  // Every port is inside its own node: a pin end outside the box is geometry ELK cannot honour.
  for (const port of node?.ports ?? []) {
    expect(port.x ?? -1).toBeGreaterThanOrEqual(0)
    expect(port.y ?? -1).toBeGreaterThanOrEqual(0)
    expect(port.x ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(node?.width ?? 0)
    expect(port.y ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(node?.height ?? 0)
  }
})

test("a net of degree n becomes n-1 edges", () => {
  const { graph } = elkInputOf(groundOfDegreeSix())
  expect((graph.edges ?? []).filter((e) => e.id.startsWith("GND:")).length).toBe(5)
})

test("a pin explicitly not connected gets no port", () => {
  const g = autoBlock([res("R_A", "3V3", "GND"), cap("C_A", "3V3", "GND")])
  const { graph } = elkInputOf(g)
  const wired = g.units.flatMap((u) => u.pins.filter((p) => p.net !== null))
  const ports = (graph.children ?? []).flatMap((c) => c.ports ?? [])
  expect(ports.length).toBe(wired.length)
})

test("each boundary net is one zero-size node, and an inbound one is pinned to the first layer", () => {
  const { graph } = elkInputOf(dividerSubgraph())
  const supply = (graph.children ?? []).find((c) => c.id === boundaryNodeId("3V3"))
  const ground = (graph.children ?? []).find((c) => c.id === boundaryNodeId("GND"))
  expect(supply).toBeDefined()
  expect(ground).toBeDefined()
  // G101's floor was ENTIRELY netlistsvg's 30x20 `inputExt` glyph; this backend emits none.
  expect(supply?.width).toBe(0)
  expect(supply?.height).toBe(0)
  expect(supply?.ports ?? []).toEqual([])
  // 3V3 is a declared SUPPLY rail, so negotiablePort puts it on the top edge, which is not a
  // layer under direction=RIGHT - so no layer constraint, which is the honest answer.
  expect(supply?.layoutOptions?.[LAYER_CONSTRAINT_KEY]).toBeUndefined()
  expect(ground?.layoutOptions?.[LAYER_CONSTRAINT_KEY]).toBeUndefined()
})

test("a non-rail inbound net is pinned to the first layer and an outbound one to the last", () => {
  expect(layerConstraintFor(["left"])).toBe("FIRST_SEPARATE")
  expect(layerConstraintFor(["right"])).toBe("LAST_SEPARATE")
  expect(layerConstraintFor(["left", "right"])).toBeNull()
  expect(layerConstraintFor(["top"])).toBeNull()
  expect(layerConstraintFor(["bottom"])).toBeNull()
})

/**
 * **THE INBOUND PATH, WHICH NOTHING REACHED UNTIL REVIEW ROUND 2** (Important 4). All twelve
 * declared blocks produce 38 boundary nodes: 34 unconstrained, 4 `LAST_SEPARATE`, **0
 * `FIRST_SEPARATE`** - and every other fixture passes `external: []`, so neither
 * `boundaryNodeOf`'s `FIRST_SEPARATE` arm nor `edgesForNet`'s boundary-terminal-first branch had
 * ever executed. These two tests drive the constraint and the edge ORDERING together, because the
 * ordering is what makes an inbound net's edges run with the flow and it is decided by the
 * constraint.
 */
test("an inbound net's boundary node is pinned to the first layer, an outbound one's to the last", () => {
  const { graph } = elkInputOf(inboundAndOutboundBlock())
  const children = graph.children ?? []
  const inbound = children.find((c) => c.id === boundaryNodeId("IN"))
  const outbound = children.find((c) => c.id === boundaryNodeId("OUT"))
  expect(inbound, "the fixture must produce a non-rail inbound boundary node").toBeDefined()
  expect(outbound).toBeDefined()
  expect(inbound?.layoutOptions?.[LAYER_CONSTRAINT_KEY]).toBe("FIRST_SEPARATE")
  expect(outbound?.layoutOptions?.[LAYER_CONSTRAINT_KEY]).toBe("LAST_SEPARATE")
})

test("an inbound net's edges run FROM its boundary, an outbound net's run TO it", () => {
  const { graph } = elkInputOf(inboundAndOutboundBlock())
  const edges = graph.edges ?? []
  const inbound = edges.filter((e) => e.id.startsWith("IN:"))
  const outbound = edges.filter((e) => e.id.startsWith("OUT:"))
  expect(inbound.length).toBeGreaterThan(0)
  expect(outbound.length).toBeGreaterThan(0)
  // FIRST_SEPARATE: the boundary terminal is first in the chain, so edge 0 leaves it.
  expect(inbound[0]?.sources).toEqual([boundaryNodeId("IN")])
  expect(inbound.flatMap((e) => e.targets)).not.toContain(boundaryNodeId("IN"))
  // Everything else: the boundary terminal is last, so the final edge arrives at it.
  expect(outbound[outbound.length - 1]?.targets).toEqual([boundaryNodeId("OUT")])
  expect(outbound.flatMap((e) => e.sources)).not.toContain(boundaryNodeId("OUT"))
})

test("both spacings are whole grid steps, which is what the plan asks of them", () => {
  expect(wholeGridSteps(NODE_SEPARATION)).toBe(true)
  expect(wholeGridSteps(LAYER_SEPARATION)).toBe(true)
  expect(wholeGridSteps(NODE_SEPARATION + 1)).toBe(false)
})

/**
 * **RULING R29's CHECK, AND NOTHING ELSE IN THE SUITE COULD HAVE FAILED FOR IT.**
 *
 * Task 12 built every node at a `GRAPH_ROTATION = 0` constant, so spec §1.5's step-2 rule library
 * had no effect on any drawing (`docs/known-gaps.md` **G182**). The rotation now comes from
 * `BlockUnit.rot`, which `subgraphOf` resolves from `Circuit.orientations` through
 * `drawnRotation`. These two tests are the difference, driven: the same resistor at the library
 * frame and at 180, with the port sides SWAPPED - `Fix:R` puts pin 1 at angle 270 (`top` at 0,
 * `bottom` at 180) and pin 2 at angle 90.
 *
 * It also pins obligation 3's clause that matters: the port's coordinate and the port's side come
 * from the SAME rotation, so a change that rotated one without the other turns this red.
 */
test("a part with no preferred orientation is built at the library frame", () => {
  const g = dividerSubgraph()
  for (const u of g.units) expect(u.rot, `${u.part.label}`).toBe(LIBRARY_FRAME)
  const node = (elkInputOf(g).graph.children ?? []).find((c) => c.id === unitNodeId(g.units[0] ?? g.units[0]!))
  expect(node).toBeDefined()
})

test("a part the orientation rule turns is built at THAT rotation, sides and positions together", () => {
  const flipped = groundedPinOneBlock()
  const unit = flipped.units.find((u) => u.part.label === "R_FLIP")
  expect(unit, "the fixture must hold R_FLIP").toBeDefined()
  if (unit === undefined) return
  expect(unit.rot).toBe(180)

  const sideOf = (g: typeof flipped, label: PartLabel, pin: string): string | undefined => {
    const u = g.units.find((x) => x.part.label === label)
    if (u === undefined) return undefined
    const node = (elkInputOf(g).graph.children ?? []).find((c) => c.id === unitNodeId(u))
    return (node?.ports ?? []).find((pt) => pt.id === pinPortId(unitNodeId(u), pin))?.layoutOptions?.[PORT_SIDE_KEY]
  }

  // The same resistor, same nets, at the library frame: the fixture's own map is the only difference.
  const plain = subgraphOf(
    blockCircuit([res("R_FLIP", "GND", "3V3")], { kind: "auto" }, {
      external: [],
      orientations: new Map<PartLabel, Rotation | null>([["R_FLIP", null]]),
    }),
    "B",
    symbols,
  )
  expect(plain.units.find((u) => u.part.label === "R_FLIP")?.rot).toBe(LIBRARY_FRAME)

  expect(sideOf(plain, "R_FLIP", "1")).toBe(ELK_SIDE.top)
  expect(sideOf(plain, "R_FLIP", "2")).toBe(ELK_SIDE.bottom)
  // 180 swaps them, which is the whole observable effect of the rule reaching the backend.
  expect(sideOf(flipped, "R_FLIP", "1")).toBe(ELK_SIDE.bottom)
  expect(sideOf(flipped, "R_FLIP", "2")).toBe(ELK_SIDE.top)

  // And the port COORDINATE moved with the side: one transform, applied once (spec 1.4, obl. 3).
  const endY = (g: typeof flipped, pin: string): number | undefined => {
    const u = g.units.find((x) => x.part.label === "R_FLIP")
    if (u === undefined) return undefined
    const node = (elkInputOf(g).graph.children ?? []).find((c) => c.id === unitNodeId(u))
    return (node?.ports ?? []).find((pt) => pt.id === pinPortId(unitNodeId(u), pin))?.y
  }
  expect(endY(plain, "1")).not.toBe(endY(flipped, "1"))
})

/**
 * **THE WRINKLE R29 NAMES AS "TO HANDLE RATHER THAN DISCOVER": the map is per-PART and an ELK node
 * is per-UNIT.** It cannot fire on anything in this repository today, because the rule library's
 * one entry applies only to single-unit passives - which is exactly why it is driven here with a
 * map stated by hand. The guess it refuses is applying one part-level rotation to every section of
 * a multi-unit package, turning the section the rule was never asked about.
 */
test("a multi-unit package carrying an orientation preference REFUSES rather than guessing", () => {
  const amp = twoPin({
    label: "U_A", refPrefix: "U", libId: "Fix:OPAMP2X", value: "OPAMP2X", footprint: "F", bom: TEST_BOM,
    nets: ["3V3", "GND"], identities: UNNAMED, checklist: [], source: "fixture", dnp: false,
  })
  expect(symbols.resolve("Fix:OPAMP2X").unitCount).toBeGreaterThan(1)
  const withPreference = (preferred: Rotation | null) =>
    subgraphOf(
      blockCircuit([amp], { kind: "auto" }, {
        external: [],
        orientations: new Map<PartLabel, Rotation | null>([["U_A", preferred]]),
      }),
      "B",
      symbols,
    )
  // The refusal is `subgraphOf`'s, because that is where the per-part map meets a per-unit node.
  expect(() => withPreference(180)).toThrow(/keyed per PART and an ELK node is per UNIT/)
  // Null for the same package is NOT a refusal: the rule declined and every unit draws the same.
  expect(() => withPreference(null)).not.toThrow()
  expect(withPreference(null).units.every((u) => u.rot === LIBRARY_FRAME)).toBe(true)
})

test("a block with no units refuses rather than laying out an empty graph", () => {
  const g = dividerSubgraph()
  const empty = { ...g, units: [] }
  expect(() => elkInputOf(empty)).toThrow(/holds no units/)
})
