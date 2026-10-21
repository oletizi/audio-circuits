/**
 * SPEC §3.3's FOUR MEASURES: the fixture-level claims, the five blocks that draw, and the two
 * sheets that emit.
 *
 * **THE FIXTURES ARE HERE BECAUSE THE REAL CORPUS CANNOT DRIVE THREE OF THE CLAIMS, AND THAT IS A
 * MEASUREMENT RATHER THAN AN EXCUSE.** `[RAN]` Over all five blocks the ELK backend draws,
 * `crossings` is **0, 0, 0, 0, 0** and the pin set extends the drawn extent by **nothing at all** -
 * the wires already span every pin. So a crossing test and an area test taken only over the corpus
 * would both pass over a term that is zero, which is the second of the two failures the Task 13
 * review found in one guard (*"its second ran over a fixture where the term under test was zero"*).
 * The fixtures put a non-zero value under every term; the corpus pins the figures the register
 * quotes.
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

/** Every block of the four parity circuits the ELK backend actually draws (G200: five of twelve). */
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
   * number in these entries nobody else could reproduce"*. These five rows are
   * `docs/known-gaps.md`'s Task 16 entry, and a change in the generator that moved any of them
   * turns this red naming the block.
   */
  it("is the five transistor-preamp legs, with these four measures each", () => {
    const rows = blocks.map((b) => {
      const m = measuresOf(b.topology, b.pins)
      return `${b.id} cells=${b.cells} bends=${m.bends} perEdge=${m.bendsPerEdge.toFixed(2)} crossings=${m.crossings} len=${m.wireLength} area=${m.occupiedArea}`
    })
    expect(rows).toEqual([
      "tp-leg-upper cells=3 bends=8 perEdge=1.33 crossings=0 len=48 area=513",
      "tp-leg-feedback cells=3 bends=8 perEdge=1.33 crossings=0 len=48 area=513",
      "tp-leg-lower-a cells=3 bends=8 perEdge=1.33 crossings=0 len=48 area=513",
      "tp-leg-lower-b cells=3 bends=8 perEdge=1.33 crossings=0 len=48 area=513",
      "tp-leg-collector cells=2 bends=6 perEdge=1.20 crossings=0 len=32 area=221",
    ])
  })

  it("sums to G200's own figures for the same five blocks, which were taken independently", () => {
    // G200: 14 placements and 224.0 grid steps of wire over the five blocks that draw. Computed
    // here from the canonical topology rather than from the raw wire list, so an agreement is a
    // real cross-check: the two measurements come from different code.
    expect(blocks.reduce((n, b) => n + b.cells, 0)).toBe(14)
    expect(blocks.reduce((n, b) => n + measuresOf(b.topology, b.pins).wireLength, 0)).toBe(224)
  })

  it("measures ZERO crossings on every one of them, which is why the fixtures above exist", () => {
    expect(blocks.map((b) => measuresOf(b.topology, b.pins).crossings)).toEqual([0, 0, 0, 0, 0])
  })

  it("and the pin set enlarges NONE of their areas, which is the other reason", () => {
    // Measured, and recorded in docs/known-gaps.md: on this corpus the wires already span every
    // pin, so an area test taken only here would run over a term that cannot move.
    for (const b of blocks) {
      expect(measuresOf(b.topology, b.pins).occupiedArea, b.id).toBe(measuresOf(b.topology, []).occupiedArea)
    }
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
   */
  it("is mini's two sheets, with these four measures each", () => {
    const rows = g.drawings.map((d) => `${d.sheet.id}: ${renderMeasures(sheetMeasuresOf(d))}`)
    expect(rows).toEqual([
      "power: bends 3  bends/edge 0.30  crossings 0  wire length 93 grid steps  occupied area 4380.00 sq grid steps",
      "signal: bends 5  bends/edge 0.16  crossings 0  wire length 154 grid steps  occupied area 19300.00 sq grid steps",
    ])
  })

  it("generates a MANIFEST.json whose layout-input record is EMPTY for this design", () => {
    // Every mini block is drawn by a reviewed template, so none was handed to a layout backend.
    // Recorded in docs/known-gaps.md: the manifest's drawing-identity claim covers 0 of 10 blocks
    // here, and the ABSENCE of an entry means "no layout backend input", never "no drawing".
    expect(Object.keys(g.manifestSources.layoutInputs)).toEqual([])
  })
})
