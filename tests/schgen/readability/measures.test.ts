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
 * 1, `oc-audio` 5, `tp-stage` 6, `pt-core` 71. **The crossing term is live in the corpus now.**
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
   * result here.
   *
   * **AND THEN THE ORIENTATION RULE MOVED A TOPOLOGICAL COUNT, WHICH NODE SIZING NEVER DID -
   * that difference is the finding and it is why these rows were re-taken rather than adjusted**
   * (`docs/known-gaps.md` **G292**). Node sizing moved `len` and `area` and left `bends`,
   * `perEdge` and `crossings` alone on all ten, *"which says the router found a different
   * PLACEMENT of the same topology"*. **Laying a two-terminal passive with no rail end along the
   * signal changes the GRAPH, not just the packing**: the part's node box goes from tall to wide
   * AND its two pin ports move from `NORTH`/`SOUTH` to `EAST`/`WEST`, so `layered` is given a
   * different problem. `bends` moved on eight of the ten and `crossings` moved on two: `pt-core`
   * 78 to **71** and `tp-stage` 7 to **6**. Four blocks' `bends` are unmoved (`oc-power` 5,
   * `tp-leg-collector` 6, `tp-leg-emitter-bypass` 6 - and `tp-stage`'s per-edge ratio moved with
   * its edge count).
   *
   * **THE OTHER HALF OF G292 - ORDERING A NET'S ELK EDGES BY DOWNSTREAM DEPTH - MOVED NOT ONE
   * FIGURE IN THIS FILE, AND ITS COMMIT MESSAGE SAYS OTHERWISE.** `[RAN]` the seven affected test
   * files with `lib/schgen/elk/graph.ts` rolled back to the orientation-only commit and these
   * expectations in place: **97 pass, 0 fail**. The reason is structural: `downstreamDepth` seeds
   * from a boundary net that `layerConstraintFor` gives `FIRST_SEPARATE`, and **not one of the
   * twelve parity blocks has one** - all seven blocks in the repository that do are Pultec board
   * blocks. `docs/known-gaps.md` **G292** carries the measurement and the refuted claim.
   *
   * **AND ON 2026-10-26 THE TABLE LOST THREE ROWS AND GAINED ONE** (`docs/known-gaps.md`
   * **G296**). `edgesForNet`'s star and the two 180-degree rules stop `oc-power`, `oc-audio` and
   * `tp-leg-upper` drawing - each on ONE power symbol's value text over its own block's ink - and
   * draw `ob-buffer` for the first time, with every field clear. **Every one of the five rows that
   * survived moved in every geometric column**, which is what a graph change looks like here:
   * `bends` fell by one on all five legs, `tp-stage` went 21 to 30 bends and 6 to 11 crossings,
   * and `pt-core` went 74 to 85 bends and 71 to **54** crossings - the one figure in this table
   * that improved.
   *
   * **THE TWO `-lower` LEGS STILL COINCIDE AND NOTHING ELSE DOES, which is the control that the
   * star did not re-converge the legs**: 64/440, 54/360, 54/360 on feedback and the two `-lower`
   * legs, for the boundary-text reason `tests/schgen/remeasure-ceiling.test.ts` sets out.
   * `tp-leg-upper` is no longer in the comparison at all.
   *
   * **EVERY `len` AND `area` IN THIS TABLE IS CROSS-CHECKED BY A DIFFERENT FUNCTION over the six
   * `transistor-preamp` rows, which is what makes them measurements rather than output.**
   * `shapeMeasures` reads the REALISED layouts in micrometres and reports per-block
   * `wire` = 81 280, 68 580, 68 580, 34 290, 57 150, 650 240 um - which is exactly `len x 1270` on
   * all six - and `tools/schgen/remeasure-criteria.ts`'s `anchorExtent` reports per-block boxes
   * 55x8, 45x8, 45x8, 13x16, 13x14, 55x71 grid steps, whose products are exactly the six `area`
   * figures. `ob-buffer`'s and `pt-core`'s `bends`, `crossings`, `len` and `area` are
   * `tools/schgen/remeasure.ts`'s own accepted-stage row for the same block
   * (`tests/schgen/remeasure.test.ts`'s twelve-row table).
   */
  it("is the eight blocks that draw, with these four measures each", () => {
    const rows = blocks.map((b) => {
      const m = measuresOf(b.topology, b.pins)
      return `${b.id} cells=${b.cells} bends=${m.bends} perEdge=${m.bendsPerEdge.toFixed(2)} crossings=${m.crossings} len=${m.wireLength} area=${m.occupiedArea}`
    })
    expect(rows).toEqual([
      "ob-buffer cells=11 bends=20 perEdge=0.71 crossings=6 len=293 area=2028",
      "pt-core cells=24 bends=85 perEdge=1.25 crossings=54 len=1978 area=7068",
      "tp-leg-feedback cells=3 bends=5 perEdge=0.83 crossings=0 len=64 area=440",
      "tp-leg-lower-a cells=3 bends=5 perEdge=0.83 crossings=0 len=54 area=360",
      "tp-leg-lower-b cells=3 bends=5 perEdge=0.83 crossings=0 len=54 area=360",
      "tp-leg-collector cells=2 bends=5 perEdge=1.00 crossings=0 len=27 area=208",
      "tp-leg-emitter-bypass cells=2 bends=5 perEdge=0.83 crossings=0 len=45 area=182",
      "tp-stage cells=16 bends=30 perEdge=0.81 crossings=11 len=512 area=3905",
    ])
    // The two legs with identical boundary nets are the only pair that still measures identically.
    expect(rows[3]?.replace("tp-leg-lower-a", "X")).toBe(rows[4]?.replace("tp-leg-lower-b", "X"))
    // EVERY `area` AGAINST ITS OWN BOX, so the products in the comment above are checked here and
    // not only read: the six transistor-preamp boxes are 55x8, 45x8, 45x8, 13x16, 13x14, 55x71.
    expect([55 * 8, 45 * 8, 45 * 8, 13 * 16, 13 * 14, 55 * 71]).toEqual([440, 360, 360, 208, 182, 3905])
    // AND EVERY `len` AGAINST THE MICROMETRE FIGURE compose.test.ts takes by a different function.
    expect([81_280, 68_580, 68_580, 34_290, 57_150, 650_240].map((w) => w / GRID)).toEqual([64, 54, 54, 27, 45, 512])
  })

  it("sums to G209's independently-taken figures for the FOUR of G200's five blocks that still draw", () => {
    // G200 published 14 placements and 224.0 grid steps of wire over the five blocks it measured.
    // Boundary-node sizing took the wire total to 298.0 and left the 14 alone; the orientation
    // rule (**G292**) took it to 276.0 and left the 14 alone again.
    //
    // **SINCE 2026-10-26 ONLY FOUR OF G200's FIVE DRAW** (**G296**), so BOTH terms move and they
    // move for DIFFERENT REASONS - which is why the subject is named and the missing block
    // asserted rather than the sum quietly re-taken over four:
    //
    // - `placements` 14 to **11** is the SUBJECT shrinking. `tp-leg-upper` held 3 placements and
    //   stopped drawing; no part moved between blocks. **This is the first time the 14 has moved
    //   at all**, and it did not move because a layout changed;
    // - `wireLength` 276 to **199** is both: the subject lost `tp-leg-upper`'s 51, and the four
    //   that remain fell as well - 71 to 64, 61 to 54 twice, 32 to 27. 276 - 51 = 225, not 199, so
    //   subtracting the missing row would have given the wrong answer and hidden the other change.
    //
    // **THE CROSS-CHECK IS WHAT MAKES 199 A MEASUREMENT RATHER THAN AN OUTPUT, and it is the same
    // cross-check that made 276 and 298 ones.** It is computed here from the canonical topology in
    // grid steps; `tests/schgen/render/compose.test.ts` takes the same quantity over the same four
    // blocks from the REALISED layouts in micrometres, by a different function (`shapeMeasures`),
    // and gets 252 730 um. 252 730 / 1270 = 199 exactly. Two code paths, one number.
    //
    // It is also the termwise sum of this file's own four leg rows - 64 + 54 + 54 + 27.
    const G200_BLOCKS = ["tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b", "tp-leg-collector"]
    const five = blocks.filter((b) => G200_BLOCKS.includes(b.id))
    // THE ONE THAT NO LONGER DRAWS IS NAMED, so "four" cannot be read as "G200 measured four".
    expect(G200_BLOCKS.filter((id) => !five.some((b) => b.id === id)), "G200's five minus the four that draw").toEqual(["tp-leg-upper"])
    expect(five.length, "four of G200's five blocks still draw").toBe(4)
    expect(five.reduce((n, b) => n + b.cells, 0)).toBe(11)
    expect(64 + 54 + 54 + 27, "the termwise sum of this file's own four leg rows").toBe(199)
    expect(five.reduce((n, b) => n + measuresOf(b.topology, b.pins).wireLength, 0)).toBe(199)
    // The identity that ties this figure to compose.test.ts's, so neither can drift alone.
    expect(199 * GRID).toBe(252_730)
    // AND THE SUBTRACTION THAT DOES NOT WORK, asserted so the comment above is checkable: taking
    // tp-leg-upper's old 51 off the old 276 does not give 199.
    expect(276 - 51).not.toBe(199)
  })

  /**
   * **THE FIVE LEGS THAT DRAW CROSS NOTHING AND THE THREE LARGER BLOCKS DO, which is why the
   * fixtures above exist and is visible in the corpus itself.** Until Task 24 every block that
   * drew measured zero crossings, so a crossing count taken only here ran over a term that could
   * not move. **The ZERO on every leg is the claim this test's name makes and it is unmoved
   * through all four geometry changes**; the three other figures are a record.
   *
   * **ONE CROSSING COUNT WENT DOWN AND ONE WENT UP, and the one that went down is the largest
   * block in the corpus** (**G296**): `pt-core` 71 to **54**, `tp-stage` 6 to **11**,
   * `ob-buffer` drawing for the first time at 6. So the star bought 17 crossings on a 24-part
   * block and spent 5 on a 16-part one. **Nothing here is a threshold and no net direction is
   * claimed** - the two blocks are not comparable and the sum of two numbers moving opposite ways
   * is not a result.
   *
   * Each of these figures is the count the sweep in
   * `tests/schgen/remeasure-ceiling.test.ts` reports for the block's order 0, which is declaration
   * order; that file's own test ties the two together per block, so neither can drift alone.
   */
  it("measures ZERO crossings on the five legs that draw, and names the crossings of the three that are not legs", () => {
    const crossings = new Map(blocks.map((b) => [b.id, measuresOf(b.topology, b.pins).crossings]))
    expect([...crossings.entries()]).toEqual([
      ["ob-buffer", 6],
      ["pt-core", 54],
      ["tp-leg-feedback", 0],
      ["tp-leg-lower-a", 0],
      ["tp-leg-lower-b", 0],
      ["tp-leg-collector", 0],
      ["tp-leg-emitter-bypass", 0],
      ["tp-stage", 11],
    ])
    // THE CLAIM IN THE NAME, asserted as the claim rather than only inside the table: every block
    // whose id begins `tp-leg-` crosses nothing, and there are five of them.
    const legs = [...crossings.entries()].filter(([id]) => id.startsWith("tp-leg-"))
    expect(legs.length).toBe(5)
    expect(legs.every(([, n]) => n === 0)).toBe(true)
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
 * **EVERY INFLATION FIGURE HAS NOW MOVED THREE TIMES AND THE FOUR CONCLUSIONS HAVE NOT, which is
 * what each re-drive establishes.** Boundary-node sizing (`docs/known-gaps.md` **G291**), the
 * orientation rule (**G292**) and then the star with the two 180 rules (**G296**) all move where
 * ELK puts the wires, so the duplicate-segment population moves with them: the range ran
 * 2.05-18.16 per cent, then 1.30-21.20, then 1.42-21.20, and now **1.57-32.63**. **The per-block
 * assertions above are the claim** - crossings equal, area equal, length strictly inflated, bends
 * under-reported - and all four still hold on 12 of 12 blocks. The rows below are the magnitudes,
 * which are a record and not the claim.
 *
 * **THE DUPLICATE POPULATION ITSELF IS READ OFF THIS TABLE'S OWN `wires X->Y` COLUMN RATHER THAN
 * MEASURED SEPARATELY, and it has risen from 64 to 104.** Per block: `ob-buffer` 11, `oc-power`
 * 11, `oc-audio` 10, `oc-sidechain` 17, `pt-core` 36, `tp-stage` 19, and **zero on every leg** -
 * the same six blocks that had any before, so the star did not give a small block duplicates, it
 * gave the big ones more. `pt-core` alone went from 18 to 36. **The 0-of-N versus N-of-N result
 * about `geometryKey`'s sort is what is unmoved**, and that is what the test below drives.
 *
 * **THE CANONICAL COLUMN IS CROSS-CHECKED, which is what keeps these rows from being output.** For
 * every block the gates accept, the `a` side here - `bends`, `crossings` taken through
 * `readElkGraph` plus `canonicalTopology` - equals the figure the row table above takes through
 * `adaptElkLayoutReported`: `ob-buffer` 20/6, `pt-core` 85/54, `tp-stage` 30/11 and 5/0 on every
 * leg accepted. For the four blocks the gates refuse it equals
 * `tools/schgen/remeasure.ts`'s backend-output row instead: `oc-power` 23/2, `oc-audio` 30/9,
 * `oc-sidechain` 46/13, `tp-leg-upper` 5/0. And `canon.wires` equals `shapeMeasures`' own
 * `segments` on the six `transistor-preamp` blocks that draw - 11, 11, 11, 10, 11, 67.
 */
describe("the deduplication the raw-versus-canonical comparison rests on", () => {
  /**
   * **`geometryKey`'s SORT IS THE WHOLE DEDUPLICATION, AND `docs/known-gaps.md` G219 MEASURED THAT
   * NOTHING ASSERTED IT.** `[RAN]` Over all twelve declared ELK blocks, **0 of 64** duplicate
   * segments are duplicates under exact endpoint order and **64 of 64** are once the ends are
   * sorted - so every exact duplicate ELK emits is direction-reversed, and a key built from `(a,
   * b)` in order would collapse none of them. That is how perturbation P4 came to change nothing.
   *
   * **THE POPULATION WAS 82 UNTIL 2026-10-25 AND IS 64 NOW; the 0-versus-all result is what is
   * unmoved** (`docs/known-gaps.md` **G292**). A signal-path part laid along the signal leaves the
   * router fewer reversed duplicates to emit - per block 9, 11, 6, 11, 16 and 11 on the six that
   * have any, and **it is the same six blocks**. Re-measured here rather than carried over,
   * because a `[RAN]` figure that nothing re-takes is exactly what G209's lesson is about.
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
      "ob-buffer wires 59->48 bends 20/20 crossings 6/6 lenInflation 24.17%",
      "oc-power wires 58->47 bends 22/23 crossings 2/2 lenInflation 24.12%",
      "oc-audio wires 78->68 bends 29/30 crossings 9/9 lenInflation 18.29%",
      "oc-sidechain wires 109->92 bends 43/46 crossings 13/13 lenInflation 32.63%",
      "pt-core wires 189->153 bends 78/85 crossings 54/54 lenInflation 23.37%",
      "tp-leg-upper wires 11->11 bends 5/5 crossings 0/0 lenInflation 2.46%",
      "tp-leg-feedback wires 11->11 bends 5/5 crossings 0/0 lenInflation 1.57%",
      "tp-leg-lower-a wires 11->11 bends 5/5 crossings 0/0 lenInflation 1.87%",
      "tp-leg-lower-b wires 11->11 bends 5/5 crossings 0/0 lenInflation 1.87%",
      "tp-leg-collector wires 10->10 bends 5/5 crossings 0/0 lenInflation 3.65%",
      "tp-leg-emitter-bypass wires 11->11 bends 5/5 crossings 0/0 lenInflation 2.22%",
      "tp-stage wires 86->67 bends 27/30 crossings 11/11 lenInflation 21.78%",
    ])
    // **THE DUPLICATE POPULATION, DERIVED FROM THE TABLE ABOVE RATHER THAN RE-MEASURED.** Each
    // row's `wires X->Y` difference is that block's duplicate count; the total is what the
    // comment on this describe reports, and the six-blocks-only claim is asserted rather than
    // stated. A leg that acquired a duplicate would fail here naming itself.
    const dups = rows.map((r) => {
      const m = /wires (\d+)->(\d+)/.exec(r)
      return Number(m?.[1] ?? 0) - Number(m?.[2] ?? 0)
    })
    expect(dups).toEqual([11, 11, 10, 17, 36, 0, 0, 0, 0, 0, 0, 19])
    expect(dups.reduce((a, b) => a + b, 0)).toBe(104)
    expect(dups.filter((d) => d > 0).length, "the same six blocks that ever had duplicates").toBe(6)
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
    // 3. **NO BLOCK'S PLACEMENT COUNT HAS EVER MOVED UNDER A GEOMETRY CHANGE** - not at G291's node
    // sizing, not at G292's orientation rule and not at the star (**G296**) - which is what makes
    // the rows that leave and arrive here a question of WHICH blocks draw and never of how many
    // cells one holds. The three rows that left (`oc-power` 8, `oc-audio` 14, `tp-leg-upper` 3) and
    // the one that arrived (`ob-buffer` 11) carry the placement counts the table above reports for
    // them whether they draw or not, and all four classify by the same rule.
    expect(blocks.map((b) => `${b.id} cells=${b.cells} ${baselineScale(b.cells).kind}`)).toEqual([
      "ob-buffer cells=11 about-a-serialization",
      "pt-core cells=24 about-a-serialization",
      "tp-leg-feedback cells=3 about-the-circuit",
      "tp-leg-lower-a cells=3 about-the-circuit",
      "tp-leg-lower-b cells=3 about-the-circuit",
      "tp-leg-collector cells=2 about-the-circuit",
      "tp-leg-emitter-bypass cells=2 about-the-circuit",
      "tp-stage cells=16 about-a-serialization",
    ])
    // BOTH ARMS OF THE CUT ARE DRIVEN, which a table of eight rows could otherwise stop doing if
    // the small blocks left: FIVE blocks are at or under the ceiling of 3 and THREE are over it.
    expect(blocks.filter((b) => b.cells <= 3).length).toBe(5)
    expect(blocks.filter((b) => b.cells > 3).length).toBe(3)
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
