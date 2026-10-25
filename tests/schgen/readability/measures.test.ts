/**
 * SPEC §3.3's FOUR MEASURES: the fixture-level claims, the ten blocks that draw, and the two
 * sheets that emit.
 *
 * **THE FIXTURES ARE HERE BECAUSE THE REAL CORPUS COULD NOT DRIVE THREE OF THE CLAIMS, AND THAT IS
 * A MEASUREMENT RATHER THAN AN EXCUSE.** `[RAN]` Over the five blocks the ELK backend drew when
 * this file was written, `crossings` was **0, 0, 0, 0, 0** and the pin set extended the drawn
 * extent by **nothing at all** - the wires already spanned every pin. So a crossing test and an
 * area test taken only over the corpus would both have passed over a term that was zero, which is
 * the second of the two failures the Task 13 review found in one guard (*"its second ran over a
 * fixture where the term under test was zero"*).
 *
 * **HALF OF THAT IS NO LONGER TRUE AND HALF OF IT STILL IS, which is why the fixtures stay.** Ten
 * blocks draw since 2026-10-25 (`docs/known-gaps.md` **G291**) and four of them cross: `oc-power`
 * 1, `oc-audio` 5, `tp-stage` 7, `pt-core` 78. **The crossing term is live in the corpus now.**
 * The AREA term is not: the pin set still extends the drawn extent by nothing on all ten, which
 * the test named *"and the pin set enlarges NONE of their areas"* asserts per block. So the
 * fixtures are still the only subject that puts a non-zero value under every term, and the corpus
 * pins the figures the register quotes.
 */
import { beforeAll, describe, expect, it } from "bun:test"
import path from "node:path"
import { cleanUpTempScratch, freshTempScratch } from "../../support/temp-scratch.ts"
import { design as miniDesign } from "../__fixtures__/designs/mini/index.ts"
import { MINI_DESIGN_FILE } from "../__fixtures__/designs/mini/run.ts"
import { afterAll } from "bun:test"
import { measuresOf, renderMeasures, sheetMeasuresOf } from "../../../lib/schgen/readability/measures.ts"
import { circuitSpecFrom } from "../../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../../lib/schgen/ir/build.ts"
import { placedPins, selectRenderer, subgraphOf } from "../../../lib/schgen/render/blocks.ts"
import { TEMPLATES } from "../../../lib/schgen/render/templates/index.ts"
import { adaptElkLayoutReported } from "../../../lib/schgen/elk/adapt.ts"
import { canonicalTopology, type CanonicalTopology } from "../../../lib/schgen/elk/junctions.ts"
import { elkPrePass } from "../../../tools/schgen/elk/layout.ts"
import { generate, type Generation } from "../../../tools/schgen/generate.ts"
import { kicadVersion } from "../../../tools/schgen/kicad-run.ts"
import { stockSymbolDir } from "../../../lib/schgen/render/library.ts"
import { PARITY_CASES, parityResolver } from "../../../tools/schgen/authoring-census.ts"
import { elkInputOf } from "../../../lib/schgen/elk/graph.ts"
import { readElkGraph } from "../../../lib/schgen/elk/read-graph.ts"
import { baselineScale } from "../../../lib/schgen/readability/baseline.ts"
import { GRID } from "../../../lib/schgen/render/geometry.ts"
import type { Wire } from "../../../lib/schgen/render/block-types.ts"
import type { LoadedDesign } from "../../../lib/schgen/design.ts"
import type { BlockId, NetName } from "../../../lib/schgen/ir/types.ts"
import type { PlacedPin } from "../../../lib/schgen/render/unit-pins.ts"

afterAll(cleanUpTempScratch)

const at = (x: number, y: number) => ({ x: x * GRID, y: y * GRID })
const wire = (net: NetName, ax: number, ay: number, bx: number, by: number): Wire => ({ a: at(ax, ay), b: at(bx, by), net })

/** A topology literal: `measuresOf` reads `wires` and never `branches`, so the counts are zero. */
const topology = (wires: readonly Wire[]): CanonicalTopology => ({
  ok: true,
  wires,
  branches: [],
  collapsed: 0,
  zeroLength: 0,
  contained: 0,
  split: 0,
})

const pin = (net: NetName | null, x: number, y: number): PlacedPin => ({ part: "P1", unit: 1, pin: "1", at: at(x, y), net })

describe("measuresOf over fixtures", () => {
  it("a four-bend route measures four bends, over one edge, in whole grid steps", () => {
    const route = topology([
      wire("N", 0, 0, 2, 0),
      wire("N", 2, 0, 2, 2),
      wire("N", 2, 2, 4, 2),
      wire("N", 4, 2, 4, 4),
      wire("N", 4, 4, 6, 4),
    ])
    const m = measuresOf(route, [])
    expect(m.bends).toBe(4)
    // One polyline: both free ends are the only nodes, so every corner is interior to one edge.
    expect(m.bendsPerEdge).toBe(4)
    expect(m.wireLength).toBe(10)
  })

  it("a straight run split into two collinear pieces is no bend and no extra edge", () => {
    // This is what ruling R33's split at a branch point leaves behind, and it must not read as a
    // corner: the vertex has degree two and its two segments are collinear.
    const split = topology([wire("N", 0, 0, 2, 0), wire("N", 2, 0, 4, 0)])
    const m = measuresOf(split, [])
    expect(m.bends).toBe(0)
    expect(m.bendsPerEdge).toBe(0)
    expect(m.wireLength).toBe(4)
  })

  it("two SAME-net wires crossing are not a crossing", () => {
    const sameNet = topology([wire("N", 0, 2, 4, 2), wire("N", 2, 0, 2, 4)])
    expect(measuresOf(sameNet, []).crossings).toBe(0)
  })

  it("two DIFFERENT-net wires crossing are one crossing", () => {
    const crossNet = topology([wire("A", 0, 2, 4, 2), wire("B", 2, 0, 2, 4)])
    expect(measuresOf(crossNet, []).crossings).toBe(1)
  })

  it("the occupied area reads the pins, and a pin beyond the last wire end enlarges it", () => {
    const small = topology([wire("N", 0, 0, 2, 0), wire("N", 2, 0, 2, 2)])
    const withoutPins = measuresOf(small, []).occupiedArea
    const withFarPin = measuresOf(small, [pin("N", 10, 10)]).occupiedArea
    expect(withoutPins).toBe(4)
    expect(withFarPin).toBe(100)
    expect(withFarPin).toBeGreaterThan(withoutPins)
  })

  it("refuses a topology that was refused, rather than measuring one reading of it", () => {
    const refused: CanonicalTopology = { ok: false, ambiguous: ["wire 0 and wire 1 overlap"], collapsed: 0, zeroLength: 0, contained: 0, split: 0 }
    expect(() => measuresOf(refused, [])).toThrow(/the canonical topology was refused/)
  })
})

describe("renderMeasures", () => {
  const m = measuresOf(topology([wire("A", 0, 2, 4, 2), wire("B", 2, 0, 2, 4)]), [pin("A", 0, 0)])

  it("the report has four numbers and no composite", () => {
    expect(renderMeasures(m).match(/\d+(\.\d+)?/g)?.length).toBe(5)
    expect(renderMeasures(m).toLowerCase()).not.toContain("score")
  })

  it("puts bends first and crossings second, which is the order the literature uses", () => {
    const text = renderMeasures(m)
    expect(text.indexOf("bends")).toBeLessThan(text.indexOf("crossings"))
    expect(text.indexOf("crossings")).toBeLessThan(text.indexOf("wire length"))
  })
})

/** One drawn block of a parity circuit, with everything a measure needs. */
interface DrawnBlock {
  readonly circuit: string
  readonly id: BlockId
  readonly cells: number
  readonly topology: CanonicalTopology
  readonly pins: readonly PlacedPin[]
}

/** Every block of the four parity circuits the ELK backend actually draws (G291: ten of twelve). */
async function drawnBlocks(): Promise<readonly DrawnBlock[]> {
  const symbols = parityResolver()
  const out: DrawnBlock[] = []
  for (const c of PARITY_CASES) {
    const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
    const outcomes = await elkPrePass(circuit, symbols)
    for (const block of circuit.blocks.values()) {
      const g = subgraphOf(circuit, block.id, symbols)
      if (selectRenderer(g, TEMPLATES).kind !== "elk") continue
      const outcome = outcomes.get(block.id)
      if (outcome === undefined || !outcome.ok) continue
      const report = adaptElkLayoutReported(g, outcome)
      if (!report.result.ok) continue
      const layout = report.result.layout
      const pins = placedPins(g, layout.placements)
      out.push({ circuit: c.name, id: block.id, cells: layout.placements.length, topology: canonicalTopology(layout, pins), pins })
    }
  }
  return out
}

describe("the four measures of every block that draws", () => {
  let blocks: readonly DrawnBlock[]
  beforeAll(async () => {
    blocks = await drawnBlocks()
  })

  /**
   * **THE FIGURES THE REGISTER QUOTES, PINNED HERE SO A LATER READER CAN RE-RUN THEM.** G209's own
   * lesson: Task 15's first round computed its numbers in a scratch script and *"were the only
   * number in these entries nobody else could reproduce"*. The five leg rows are
   * `docs/known-gaps.md`'s Task 16 entry, and a change in the generator that moved any of them
   * turns this red naming the block.
   *
   * **TASK 24 ADDED TWO ROWS AND MOVED NONE.** `oc-power` and `pt-core` drew for the first time,
   * because `render/field-placement.ts` places a unit with no clear slot at the least-covered
   * candidate instead of refusing the block. **Every leg figure was byte-identical**, which was
   * the control that the change moved text and not geometry - a field's position is not a wire's.
   *
   * **2026-10-25 ADDED THREE MORE ROWS AND MOVED SEVEN OF THE SEVEN THAT WERE HERE, AND THAT IS
   * THE OPPOSITE CONTROL.** Boundary-node sizing (`docs/known-gaps.md` **G291**) drew `oc-audio`,
   * `tp-leg-emitter-bypass` and `tp-stage`. It is a GEOMETRY change - ELK is told how much room
   * the labels and power symbols need - so a leg figure that did NOT move would be the suspicious
   * result here. What moved, and what did not:
   *
   * - `len` and `area` moved on every block but `pt-core` and `tp-leg-collector`;
   * - `cells`, `bends`, `perEdge` and `crossings` moved on NO block at all. Not one of the ten
   *   changed its bend count or its crossing count, which says the router found a different
   *   PLACEMENT of the same topology rather than a different topology;
   * - the four bias legs **stopped being congruent**: 55/696, 77/1100, 67/900, 67/900 where all
   *   four read 48/513. `COLLECTOR` reserves more room than `BASE`, and `VCC`'s glyph is not
   *   `GND`'s, so the two `-lower` legs are the only pair with identical boundary nets and the
   *   only pair that still coincides. `tests/schgen/remeasure-ceiling.test.ts` carries the table.
   */
  it("is the ten blocks that draw, with these four measures each", () => {
    const rows = blocks.map((b) => {
      const m = measuresOf(b.topology, b.pins)
      return `${b.id} cells=${b.cells} bends=${m.bends} perEdge=${m.bendsPerEdge.toFixed(2)} crossings=${m.crossings} len=${m.wireLength} area=${m.occupiedArea}`
    })
    expect(rows).toEqual([
      "oc-power cells=8 bends=5 perEdge=0.19 crossings=1 len=221 area=1856",
      "oc-audio cells=14 bends=29 perEdge=0.72 crossings=5 len=641 area=4708",
      "pt-core cells=24 bends=83 perEdge=1.15 crossings=78 len=2472 area=12648",
      "tp-leg-upper cells=3 bends=8 perEdge=1.33 crossings=0 len=55 area=696",
      "tp-leg-feedback cells=3 bends=8 perEdge=1.33 crossings=0 len=77 area=1100",
      "tp-leg-lower-a cells=3 bends=8 perEdge=1.33 crossings=0 len=67 area=900",
      "tp-leg-lower-b cells=3 bends=8 perEdge=1.33 crossings=0 len=67 area=900",
      "tp-leg-collector cells=2 bends=6 perEdge=1.20 crossings=0 len=32 area=221",
      "tp-leg-emitter-bypass cells=2 bends=6 perEdge=1.00 crossings=0 len=50 area=195",
      "tp-stage cells=16 bends=24 perEdge=0.62 crossings=7 len=466 area=3692",
    ])
    // The two legs with identical boundary nets are the only pair that still measures identically.
    expect(rows[5]?.replace("tp-leg-lower-a", "X")).toBe(rows[6]?.replace("tp-leg-lower-b", "X"))
  })

  it("sums to G209's independently-taken figures for the same five blocks", () => {
    // G200 published 14 placements and 224.0 grid steps of wire over the five blocks it measured.
    // **The 224 is SUPERSEDED and the 14 is not**: boundary-node sizing lengthened the wires that
    // reach the labels and moved no part count. The new figure is 298.0 grid steps.
    //
    // **THE CROSS-CHECK IS WHAT MAKES 298 A MEASUREMENT RATHER THAN AN OUTPUT.** It is computed
    // here from the canonical topology in grid steps; `tests/schgen/render/compose.test.ts` takes
    // the same quantity over the same five blocks from the REALISED layouts in micrometres, by a
    // different function (`shapeMeasures`), and gets 378 460 um. 378 460 / 1270 = 298 exactly.
    // Two code paths, one number.
    //
    // **THE FIVE ARE NAMED SINCE TASK 24**, when `oc-power` and `pt-core` started drawing: summing
    // every drawn block would compare a ten-block total against a five-block table, which is two
    // different quantities wearing one number (**G220**).
    const G200_BLOCKS = ["tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b", "tp-leg-collector"]
    const five = blocks.filter((b) => G200_BLOCKS.includes(b.id))
    expect(five.length, "G200's five blocks all still draw").toBe(5)
    expect(five.reduce((n, b) => n + b.cells, 0)).toBe(14)
    expect(five.reduce((n, b) => n + measuresOf(b.topology, b.pins).wireLength, 0)).toBe(298)
    // The identity that ties this figure to compose.test.ts's, so neither can drift alone.
    expect(298 * GRID).toBe(378_460)
  })

  /**
   * **THE SIX LEGS CROSS NOTHING AND THE FOUR LARGER BLOCKS DO, which is why the fixtures above
   * exist and is now visible in the corpus itself.** Until Task 24 every block that drew measured
   * zero crossings, so a crossing count taken only here ran over a term that could not move; four
   * blocks move it now - `pt-core` draws with **78**, `tp-stage` with 7, `oc-audio` with 5 and
   * `oc-power` with 1.
   *
   * **NOT ONE CROSSING COUNT MOVED AT G291's NODE SIZING**, including on the three blocks that
   * started drawing: `tp-stage`'s 7 and `oc-audio`'s 5 are the counts the sweep in
   * `tests/schgen/remeasure-ceiling.test.ts` already reported for them at the backend-output
   * stage, before they passed the gates.
   */
  it("measures ZERO crossings on the six legs, and names the crossings of the four that are not legs", () => {
    const crossings = new Map(blocks.map((b) => [b.id, measuresOf(b.topology, b.pins).crossings]))
    expect([...crossings.entries()]).toEqual([
      ["oc-power", 1],
      ["oc-audio", 5],
      ["pt-core", 78],
      ["tp-leg-upper", 0],
      ["tp-leg-feedback", 0],
      ["tp-leg-lower-a", 0],
      ["tp-leg-lower-b", 0],
      ["tp-leg-collector", 0],
      ["tp-leg-emitter-bypass", 0],
      ["tp-stage", 7],
    ])
  })

  it("and the pin set enlarges NONE of their areas, which is the other reason", () => {
    // Measured, and recorded in docs/known-gaps.md: on this corpus the wires already span every
    // pin, so an area test taken only here would run over a term that cannot move.
    for (const b of blocks) {
      expect(measuresOf(b.topology, b.pins).occupiedArea, b.id).toBe(measuresOf(b.topology, []).occupiedArea)
    }
  })
})

/**
 * **D1's REPORT LINE, PINNED - plan decision D1 and spec §1.8 revision 4.** D1: *"Task 16's report
 * prints, per block, its part count, its port-glyph share of cells, and where it sits against the
 * ceiling's shape and against the interface cost - with the cost named, and with the floor reported
 * as unmeasured rather than as a bound the block is inside or outside. It is a report line, never a
 * refusal."*
 *
 * **THE PORT-GLYPH SHARE IS A COUNT SHARE AND NOT A DRAWN-AREA SHARE, AND IT IS NOT AN AREA SHARE
 * IN THE GRAPH EITHER.** G101's floor rested on `netlistsvg` emitting a 30 by 20 `inputExt` glyph
 * per declared port, so *"a 1-part block's drawing was two-thirds boundary"*. **This comment used
 * to add that `boundaryNodeOf` emits a node of ZERO width and height, and the assertion below used
 * to check exactly that - both are superseded** (`docs/known-gaps.md` **G291**): every boundary
 * node is now sized by the label or power symbol drawn at it. What is asserted instead is that
 * each one has a NON-zero size, which is the inverse guard: it goes red if the dimensionless point
 * ever comes back.
 *
 * **THE SHARE ITSELF IS UNMOVED, ROW FOR ROW, AND THAT IS THE POINT OF REPORTING IT.** It is
 * `ports / cells` - two counts - so no size enters it, and the twelve rows below are byte-identical
 * to the ones taken before the node sizes changed. **The floor stays unmeasured**, and its stated
 * basis does not: `tests/schgen/remeasure-ceiling.test.ts` carries the refutation.
 */
/**
 * **THE SIZE OF `docs/known-gaps.md` G106's DEFECT ON THIS DRIVER, which that entry says
 * *"nobody has measured yet"*.** It is taken PRE-SNAP on both sides, so the only difference between
 * the two columns is the canonicalisation: same ELK geometry, once as the router emitted it and
 * once through `canonicalTopology`.
 *
 * **IT CORRECTS G106's OWN EXPECTATION IN THREE OF FIVE NUMBERS**, which is why it is pinned here
 * rather than only written down. That entry says *"every one of the four measures the spec requires
 * - bends, bends per edge, crossings, wire length - is then inflated by an unknown amount"*. On this
 * driver: wire length IS inflated, on 12 of 12 blocks; crossings do not move on any of them; and
 * bends and bends per edge move the OTHER way - the raw list reports FEWER bends, because a
 * duplicate segment turns a degree-2 corner into a higher-degree node and a node is not a bend.
 *
 * **EVERY INFLATION FIGURE MOVED ON 2026-10-25 AND THE FOUR CONCLUSIONS DID NOT, which is what the
 * re-drive establishes.** Boundary-node sizing (`docs/known-gaps.md` **G291**) changes where ELK
 * puts the wires, so the duplicate-segment population changes with them: the range went from 2.05
 * to 18.16 per cent to 1.30 to 21.20 per cent, and `oc-audio`'s canonical wire count went 70 to 69
 * with its bends 28/30 to 27/29. **The per-block assertions above are the claim** - crossings
 * equal, area equal, length strictly inflated, bends under-reported - and all four still hold on
 * 12 of 12 blocks. The rows below are the magnitudes, which are a record and not the claim.
 */
describe("the deduplication the raw-versus-canonical comparison rests on", () => {
  /**
   * **`geometryKey`'s SORT IS THE WHOLE DEDUPLICATION, AND `docs/known-gaps.md` G219 MEASURED THAT
   * NOTHING ASSERTED IT.** `[RAN]` Over all twelve declared ELK blocks, **0 of 82** duplicate
   * segments are duplicates under exact endpoint order and **82 of 82** are once the ends are
   * sorted - so every exact duplicate ELK emits is direction-reversed, and a key built from `(a,
   * b)` in order would collapse none of them. That is how perturbation P4 came to change nothing.
   *
   * This check is here rather than in `tests/schgen/elk/junctions.test.ts` because it is what the
   * comparison below rests on: if the sort went away, the raw and canonical columns would agree on
   * the six blocks that have duplicates and the inflation table would read as zero.
   */
  it("collapses two REVERSED copies of one segment, which a direction-sensitive key would not", () => {
    const forward = wire("N", 0, 0, 4, 0)
    const backward = wire("N", 4, 0, 0, 0)
    const t = canonicalTopology({ placements: [], wires: [forward, backward], anchors: [] }, [])
    if (!t.ok) throw new Error("two collinear copies of one segment are not an ambiguous overlap")
    expect(t.collapsed, "the reversed copy is a duplicate").toBe(1)
    expect(t.wires.length).toBe(1)
    expect(measuresOf(t, []).wireLength, "and the length is counted once").toBe(4)
    // The control: the same two segments on DIFFERENT nets are not duplicates at all - they are a
    // short drawn as one line, which clause (d) refuses. So the collapse above is keyed on the net
    // as well as on the geometry, and this half would pass even if the net were ignored.
    const crossNet = canonicalTopology({ placements: [], wires: [forward, { ...backward, net: "M" }], anchors: [] }, [])
    expect(crossNet.ok, "a cross-net collinear overlap is refused, never deduplicated").toBe(false)
  })
})

describe("raw segment list versus canonical topology, over every block that lays out", () => {
  it("inflates wire length on all twelve, leaves crossings and area alone, and UNDER-reports bends", async () => {
    const symbols = parityResolver()
    const rows: string[] = []
    for (const c of PARITY_CASES) {
      const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
      const outcomes = await elkPrePass(circuit, symbols)
      for (const block of circuit.blocks.values()) {
        const g = subgraphOf(circuit, block.id, symbols)
        if (selectRenderer(g, TEMPLATES).kind !== "elk") continue
        const o = outcomes.get(block.id)
        if (o === undefined || !o.ok) continue
        const built = readElkGraph(g, o.graph)
        const pins = placedPins(g, built.placements)
        const canon = canonicalTopology({ placements: built.placements, wires: built.wires, anchors: built.anchors }, pins)
        if (!canon.ok) throw new Error(`${block.id}: the pre-snap topology was refused, so this comparison cannot be made`)
        const raw = topology(built.wires)
        const a = measuresOf(canon, pins)
        const b = measuresOf(raw, pins)
        expect(b.crossings, `${block.id} crossings`).toBe(a.crossings)
        expect(b.occupiedArea, `${block.id} area`).toBe(a.occupiedArea)
        expect(b.wireLength, `${block.id} length`).toBeGreaterThan(a.wireLength)
        expect(b.bends, `${block.id} bends`).toBeLessThanOrEqual(a.bends)
        rows.push(
          `${block.id} wires ${built.wires.length}->${canon.wires.length} bends ${b.bends}/${a.bends} ` +
            `crossings ${b.crossings}/${a.crossings} lenInflation ${(100 * (b.wireLength / a.wireLength - 1)).toFixed(2)}%`,
        )
      }
    }
    expect(rows).toEqual([
      "ob-buffer wires 65->57 bends 26/28 crossings 7/7 lenInflation 10.17%",
      "oc-power wires 42->31 bends 4/5 crossings 1/1 lenInflation 21.20%",
      "oc-audio wires 82->69 bends 27/29 crossings 5/5 lenInflation 8.47%",
      "oc-sidechain wires 91->76 bends 26/27 crossings 7/7 lenInflation 12.78%",
      "pt-core wires 179->155 bends 81/83 crossings 78/78 lenInflation 11.36%",
      "tp-leg-upper wires 14->14 bends 8/8 crossings 0/0 lenInflation 1.84%",
      "tp-leg-feedback wires 14->14 bends 8/8 crossings 0/0 lenInflation 1.30%",
      "tp-leg-lower-a wires 14->14 bends 8/8 crossings 0/0 lenInflation 1.50%",
      "tp-leg-lower-b wires 14->14 bends 8/8 crossings 0/0 lenInflation 1.50%",
      "tp-leg-collector wires 11->11 bends 6/6 crossings 0/0 lenInflation 3.09%",
      "tp-leg-emitter-bypass wires 12->12 bends 6/6 crossings 0/0 lenInflation 2.00%",
      "tp-stage wires 75->63 bends 21/24 crossings 7/7 lenInflation 16.50%",
    ])
  })
})

describe("D1's report line, per declared ELK block", () => {
  it("prints parts, cells and the port-glyph share, and every port glyph is sized by what is drawn at it", () => {
    const symbols = parityResolver()
    const rows: string[] = []
    let glyphs = 0
    for (const c of PARITY_CASES) {
      const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
      for (const block of circuit.blocks.values()) {
        const g = subgraphOf(circuit, block.id, symbols)
        if (selectRenderer(g, TEMPLATES).kind !== "elk") continue
        const children = elkInputOf(g).graph.children ?? []
        const boundary = children.filter((n) => n.id.startsWith("port:"))
        glyphs += boundary.length
        for (const node of boundary) {
          // A label is at least (1 + 2) grid steps along its side and 2 across; a rail's glyph is
          // 2 grid steps tall before its value text is added. So one whole grid step is below
          // every form, and anything at or under it is the dimensionless point G291 removed.
          expect(node.width ?? 0, `${block.id} boundary ${node.id} width`).toBeGreaterThan(GRID)
          expect(node.height ?? 0, `${block.id} boundary ${node.id} height`).toBeGreaterThan(GRID)
        }
        rows.push(`${block.id} parts=${g.units.length} cells=${children.length} portGlyphs=${boundary.length} share=${((100 * boundary.length) / children.length).toFixed(1)}%`)
      }
    }
    // A non-zero denominator for the size claim: an empty boundary set would pass the loop above
    // over nothing, which is the "term under test was zero" failure.
    expect(glyphs, "no port glyph at all would make the size assertion vacuous").toBe(38)
    expect(rows).toEqual([
      "ob-buffer parts=11 cells=14 portGlyphs=3 share=21.4%",
      "oc-power parts=8 cells=11 portGlyphs=3 share=27.3%",
      "oc-audio parts=14 cells=18 portGlyphs=4 share=22.2%",
      "oc-sidechain parts=19 cells=24 portGlyphs=5 share=20.8%",
      "pt-core parts=24 cells=26 portGlyphs=2 share=7.7%",
      "tp-leg-upper parts=3 cells=5 portGlyphs=2 share=40.0%",
      "tp-leg-feedback parts=3 cells=5 portGlyphs=2 share=40.0%",
      "tp-leg-lower-a parts=3 cells=5 portGlyphs=2 share=40.0%",
      "tp-leg-lower-b parts=3 cells=5 portGlyphs=2 share=40.0%",
      "tp-leg-collector parts=2 cells=4 portGlyphs=2 share=50.0%",
      "tp-leg-emitter-bypass parts=2 cells=6 portGlyphs=4 share=66.7%",
      "tp-stage parts=16 cells=23 portGlyphs=7 share=30.4%",
    ])
  })

  it("classifies each drawn block against the CEILING's shape, and names no floor", async () => {
    const blocks = await drawnBlocks()
    // `cells` here is PLACEMENTS, and the classification is `baselineScale`'s cut at the ceiling of
    // 3: no block's placement count moved at G291's node sizing, so every row that was here reads
    // the same and the three new rows classify by the same rule.
    expect(blocks.map((b) => `${b.id} cells=${b.cells} ${baselineScale(b.cells).kind}`)).toEqual([
      "oc-power cells=8 about-a-serialization",
      "oc-audio cells=14 about-a-serialization",
      "pt-core cells=24 about-a-serialization",
      "tp-leg-upper cells=3 about-the-circuit",
      "tp-leg-feedback cells=3 about-the-circuit",
      "tp-leg-lower-a cells=3 about-the-circuit",
      "tp-leg-lower-b cells=3 about-the-circuit",
      "tp-leg-collector cells=2 about-the-circuit",
      "tp-leg-emitter-bypass cells=2 about-the-circuit",
      "tp-stage cells=16 about-a-serialization",
    ])
    // The floor is UNMEASURED for this backend (spec 1.8 revision 4), so nothing here reports one:
    // the classification has three arms and none of them is a lower bound.
    for (const b of blocks) expect(baselineScale(b.cells).why).not.toContain("floor")
  })
})

describe("the four measures of every sheet that emits", () => {
  let g: Generation
  beforeAll(async () => {
    const dir = path.dirname(MINI_DESIGN_FILE)
    const d: LoadedDesign = { file: MINI_DESIGN_FILE, dir, spec: miniDesign, outDir: freshTempScratch("schgen-measures-") }
    g = await generate(d, { kicadVersion: kicadVersion(), stockDir: stockSymbolDir(), initLock: true, acceptToolchain: false })
  })

  /**
   * **THE SHEET FIGURES, AND THE CAVEAT THAT GOES WITH THE FOURTH.** `occupiedArea` includes the
   * frames, so it moves with `packSheet` - `docs/known-gaps.md` **G207** measured the two packers
   * giving one sheet extents of 185.42 x 38.10 mm and 109.22 x 71.12 mm for the same content. The
   * first three are properties of the drawing; the fourth is partly a property of the packing, and
   * the generator's own selection rule decides which packing a sheet gets.
   *
   * **THE `signal` SHEET's AREA MOVED FROM 19300 TO 18100 AT TASK 21, and it is the change doing
   * exactly what it was for.** A Value that is nothing but its symbol's own part name is now
   * emitted hidden and is no longer drawn text, so it contributes no box to the sheet's extent -
   * and mini's `signal` sheet carries several (`Conn_01x02`, `OPA1678`, `W25X40CLSS`). Nothing
   * about the ROUTE changed: bends, bends per edge, crossings and wire length are all unmoved on
   * both sheets, which is what says this is a text-extent move and not a layout one.
   * `docs/known-gaps.md` **G257**.
   */
  it("is mini's two sheets, with these four measures each", () => {
    const rows = g.drawings.map((d) => `${d.sheet.id}: ${renderMeasures(sheetMeasuresOf(d))}`)
    expect(rows).toEqual([
      "power: bends 3  bends/edge 0.30  crossings 0  wire length 93 grid steps  occupied area 4380.00 sq grid steps",
      "signal: bends 5  bends/edge 0.16  crossings 0  wire length 154 grid steps  occupied area 18100.00 sq grid steps",
    ])
  })

  it("generates a MANIFEST.json whose layout-input record is EMPTY for this design", () => {
    // Every mini block is drawn by a reviewed template, so none was handed to a layout backend.
    // Recorded in docs/known-gaps.md: the manifest's drawing-identity claim covers 0 of 10 blocks
    // here, and the ABSENCE of an entry means "no layout backend input", never "no drawing".
    expect(Object.keys(g.manifestSources.layoutInputs)).toEqual([])
  })
})
