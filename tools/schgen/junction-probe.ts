/**
 * **THE TWO SIDES OF SPEC 1.4 OBLIGATION 2, PRINTED SIDE BY SIDE FOR ONE POINT.**
 *
 *   bun tools/schgen/junction-probe.ts --board pultec-mid
 *   bun tools/schgen/junction-probe.ts --board pultec-mid --block pultec-mid-own --at 26.67,93.98
 *
 * `lib/schgen/elk/adapt.ts` refuses a block when the junctions the sheet emitter would place
 * disagree with the branch points of the canonical topology. The refusal names the point and the
 * net and nothing else, and that is the right amount of detail for a refusal - but it leaves the
 * reader with two independent computations and no way to see which of them is wrong without
 * re-deriving both by hand. **This tool is that derivation, run rather than reasoned about.**
 *
 * It prints, for each point:
 *
 * - **the REQUIREMENT side** - `canonicalTopology`'s `branches` entry, with the `incidenceAt`
 *   figures (`ends`, `through`) and the pin term that produced its degree, per net;
 * - **the EMISSION side** - every `layoutItems` item whose geometry touches the point, with its
 *   kind, net, endpoints and whether the point is one of its ENDS or in its INTERIOR; the end
 *   count `junctionPoints`' first arm computes there; and whether its G293 T-arm finds an end of
 *   this point's net strictly inside a same-net wire.
 *
 * With no `--at` it prints every point the two sides disagree about, for every block of the board.
 * With `--at` it prints that one point whether they disagree or not, which is what a point that is
 * *expected* to carry a junction needs.
 *
 * **IT RE-DERIVES NOTHING THE GENERATOR DOES NOT.** The subgraph, the ELK outcome and the adapted
 * layout all come from the same functions `tools/schgen/remeasure.ts` and the generator itself
 * call, and the layout it reads is `AdaptReport.result.layout` - the geometry that survives the
 * missing-junction arm, so this tool works on exactly the drawing that was refused rather than on
 * a re-route of it.
 */

import { circuitSpecFrom } from "../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../lib/schgen/ir/build.ts"
import { adaptElkLayoutReported } from "../../lib/schgen/elk/adapt.ts"
import { canonicalTopology } from "../../lib/schgen/elk/junctions.ts"
import { describeMismatch, refusedLayout } from "../../lib/schgen/render/block-types.ts"
import { placedPins, selectRenderer, subgraphOf } from "../../lib/schgen/render/blocks.ts"
import { layoutItems } from "../../lib/schgen/render/layout-check.ts"
import { junctionPoints, onSegment, strictlyInside, fmtPoint, type ConnItem } from "../../lib/schgen/render/connectivity.ts"
import { pointKey, samePoint, type Point } from "../../lib/schgen/render/geometry.ts"
import { TEMPLATES } from "../../lib/schgen/render/templates/index.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { ALL_DECLARED_CASES } from "./board-declarations.ts"
import { boardRefs, declarationFor } from "./board-sheets.ts"
import { caseResolver } from "./authoring-census.ts"
import { elkPrePass } from "./elk/layout.ts"
import type { BlockLayout, BlockSubgraph } from "../../lib/schgen/render/block-types.ts"
import type { PlacedPin } from "../../lib/schgen/render/unit-pins.ts"

/** One block's geometry as the generator adapted it, with the pins the two sides were both given. */
interface BlockProbe {
  readonly blockId: string
  readonly g: BlockSubgraph
  readonly layout: BlockLayout
  readonly pins: readonly PlacedPin[]
  /**
   * Which renderer produced `layout`.
   *
   * **IT IS PRINTED, because obligation 2's gate runs on one of them and not the other.**
   * `lib/schgen/elk/adapt.ts` is the only caller of `junctionProblems`, so a `template` block's
   * two sides are compared here and are refused nowhere - `connectivity.ts`'s module comment calls
   * `junctionPoints` cosmetic for template geometry. A disagreement on a template block is a
   * finding about that block and NOT a board-level refusal; saying so is the point of this field.
   */
  readonly drawnBy: "elk" | "template"
  /** The renderer's own refusal text, empty when it accepted the geometry. */
  readonly refusal: string
}

/** Millimetres as written on a refusal, to the integer micrometres every `Point` here holds. */
function parsePoint(text: string): Point {
  const parts = text.split(",")
  if (parts.length !== 2) {
    throw new Error(`--at wants "x,y" in millimetres as a refusal prints them, e.g. 26.67,93.98; got "${text}"`)
  }
  const um = parts.map((s) => {
    const v = Number(s.trim())
    if (!Number.isFinite(v)) throw new Error(`--at: "${s.trim()}" is not a number`)
    const scaled = Math.round(v * 1000)
    if (Math.abs(scaled - v * 1000) > 1e-6) throw new Error(`--at: ${v} mm is not a whole micrometre`)
    return scaled
  })
  const [x, y] = um
  if (x === undefined || y === undefined) throw new Error(`--at: could not read a point from "${text}"`)
  return { x, y }
}

/** Every declared block of one board, adapted, with the layout the generator would draw. */
async function probesFor(boardName: string, repoRoot: string): Promise<readonly BlockProbe[]> {
  const board = boardRefs(repoRoot).find((b) => b.name === boardName)
  if (board === undefined) {
    throw new Error(`no board directory named "${boardName}" under boards/; this tool takes a board name as tools/schgen/board-sheets.ts prints it`)
  }
  const declared = declarationFor(board, ALL_DECLARED_CASES)
  if (declared === null) {
    throw new Error(
      `board "${boardName}" has no SchematicAuthoring declaration (its builder is ${board.export}()), so there is no drawing to probe. ` +
        "G247: a board generate cannot be offered is not a board whose junctions can be compared.",
    )
  }
  const symbols = caseResolver([declared])
  const circuit = buildCircuit(circuitSpecFrom(declared.network, declared.authoring, symbols), { symbols })
  const outcomes = await elkPrePass(circuit, symbols)
  const out: BlockProbe[] = []
  for (const block of circuit.blocks.values()) {
    if (block.rendering.kind === "bus") continue
    const g = subgraphOf(circuit, block.id, symbols)
    const selection = selectRenderer(g, TEMPLATES)
    if (selection.kind === "refused") {
      throw new Error(
        `block ${block.id} of ${boardName}: selectRenderer REFUSED it - ${describeMismatch(selection.mismatch)}. There is no geometry whose ` +
          "junctions can be compared, and a refusal is not probed as if it had been drawn.",
      )
    }
    if (selection.kind === "template") {
      out.push({ blockId: block.id, g, layout: selection.layout, pins: placedPins(g, selection.layout.placements), drawnBy: "template", refusal: "" })
      continue
    }
    const outcome = outcomes.get(block.id)
    if (outcome === undefined) throw new Error(`block ${block.id} selects the ELK backend and the pre-pass holds no outcome for it`)
    if (!outcome.ok) throw new Error(`block ${block.id}: the ELK backend RAISED on it - ${describeMismatch(outcome.mismatch)}`)
    const report = adaptElkLayoutReported(g, outcome)
    const result = report.result
    const layout = refusedLayout(result)
    if (layout === null) {
      if (result.ok) throw new Error(`block ${block.id} of ${boardName}: refusedLayout returned null for an ACCEPTED result, which cannot happen`)
      throw new Error(
        `block ${block.id} of ${boardName}: the adaptation refused WITHOUT carrying geometry - ${describeMismatch(result.mismatch)}. ` +
          "There is no drawing to probe: the refusal happened before a layout existed (an ambiguous overlap, a snap collapse, an elkjs " +
          "raise), not at the junction gate, which carries its geometry through.",
      )
    }
    out.push({
      blockId: block.id,
      g,
      layout,
      pins: placedPins(g, layout.placements),
      drawnBy: "elk",
      refusal: result.ok ? "" : describeMismatch(result.mismatch),
    })
  }
  return out
}

/** How `junctionPoints`' first arm sees one point: the ends it counts, named. */
function endsAt(p: Point, items: readonly ConnItem[]): readonly ConnItem[] {
  return items.filter((item) => {
    if (item.kind === "anchor") return false
    const ends = item.kind === "wire" ? [item.a, item.b] : [item.at]
    return ends.some((q) => samePoint(q, p))
  })
}

/** Every item whose geometry touches the point at all - an end of it, or its interior. */
function touchingAt(p: Point, items: readonly ConnItem[]): readonly { readonly item: ConnItem; readonly how: "end" | "interior" }[] {
  const out: { item: ConnItem; how: "end" | "interior" }[] = []
  for (const item of items) {
    if (item.kind === "wire") {
      if (samePoint(p, item.a) || samePoint(p, item.b)) out.push({ item, how: "end" })
      else if (onSegment(p, item.a, item.b)) out.push({ item, how: "interior" })
      continue
    }
    if (samePoint(p, item.at)) out.push({ item, how: "end" })
  }
  return out
}

function describeItem(item: ConnItem): string {
  const net = item.net === null ? "<no net>" : item.net
  if (item.kind === "wire") return `${item.kind.padEnd(6)} ${item.what} net=${net} ${fmtPoint(item.a)}-${fmtPoint(item.b)}`
  return `${item.kind.padEnd(6)} ${item.what} net=${net} at ${fmtPoint(item.at)}`
}

/** The requirement side's own arithmetic at one point, per net, recomputed from the canonical wires. */
function incidenceLines(p: Point, layout: BlockLayout, pins: readonly PlacedPin[]): readonly string[] {
  const nets = [...new Set(layout.wires.map((w) => w.net))].sort()
  const out: string[] = []
  for (const net of nets) {
    const segments = layout.wires.filter((w) => w.net === net)
    let ends = 0
    let through = 0
    for (const s of segments) {
      if (samePoint(p, s.a)) ends += 1
      if (samePoint(p, s.b)) ends += 1
      if (strictlyInside(p, s.a, s.b)) through += 1
    }
    const atPin = pins.some((q) => q.net === net && samePoint(q.at, p))
    const degree = ends + 2 * through + (atPin ? 1 : 0)
    if (degree === 0) continue
    out.push(`    net ${net}: ends=${ends} through=${through} atPin=${atPin ? "yes" : "no"} -> degree ${degree}${degree >= 3 ? " (BRANCH)" : ""}`)
  }
  return out
}

function reportPoint(probe: BlockProbe, p: Point): void {
  const items = layoutItems(probe.g, probe.layout)
  const topology = canonicalTopology(probe.layout, probe.pins)
  const emitted = junctionPoints(items)
  const emittedHere = emitted.some((q) => samePoint(q, p))
  const branches = topology.ok ? topology.branches.filter((b) => samePoint(b.at, p)) : []

  console.log(`  point ${fmtPoint(p)}`)
  console.log(`    REQUIREMENT: ${branches.length === 0 ? "no branch recorded here" : branches.map((b) => `net ${b.net} (${b.kind})`).join(", ")}`)
  console.log(`    EMISSION:    ${emittedHere ? "a junction IS emitted here" : "NO junction is emitted here"}`)
  console.log("    the degree arithmetic branchesOf computes, over the canonical wires:")
  for (const line of incidenceLines(p, probe.layout, probe.pins)) console.log(line)

  const ends = endsAt(p, items)
  console.log(`    junctionPoints arm 1 counts ${ends.length} item end(s) here (anchors skipped, any net); it emits at 3 or more`)
  for (const item of ends) console.log(`      ${describeItem(item)}`)

  const wires = items.filter((i): i is Extract<ConnItem, { kind: "wire" }> => i.kind === "wire")
  const tArm = items.flatMap((item) => {
    if (item.kind === "anchor" || item.net === null) return []
    const itemEnds = item.kind === "wire" ? [item.a, item.b] : [item.at]
    if (!itemEnds.some((q) => samePoint(q, p))) return []
    return wires.filter((w) => w !== item && w.net === item.net && strictlyInside(p, w.a, w.b)).map((w) => `${describeItem(item)} ends INSIDE ${describeItem(w)}`)
  })
  console.log(`    junctionPoints arm 2 (G293, same-net T) finds ${tArm.length} end-inside-wire relation(s) here`)
  for (const line of tArm) console.log(`      ${line}`)

  const touching = touchingAt(p, items)
  console.log(`    every item whose geometry touches this point (${touching.length}):`)
  for (const t of touching) console.log(`      [${t.how.padEnd(8)}] ${describeItem(t.item)}`)
}

/**
 * Every branch point of a block, with the SHAPE that made it one and whether a junction is emitted.
 *
 * **The shape is what a working example has to be compared on.** Two branch points with the same
 * degree can have different shapes - three ends meeting, one end on another segment's interior, two
 * interiors crossing - and `junctionPoints` has an arm for the first two and none for the third.
 * A census of degrees alone cannot show that; a census of shapes can.
 */
function branchLines(probe: BlockProbe): readonly string[] {
  const topology = canonicalTopology(probe.layout, probe.pins)
  if (!topology.ok) return [`  the canonical topology was REFUSED: ${topology.ambiguous.join("; ")}`]
  const emitted = junctionPoints(layoutItems(probe.g, probe.layout))
  return topology.branches.map((b) => {
    const segments = probe.layout.wires.filter((w) => w.net === b.net)
    let ends = 0
    let through = 0
    for (const s of segments) {
      if (samePoint(b.at, s.a)) ends += 1
      if (samePoint(b.at, s.b)) ends += 1
      if (strictlyInside(b.at, s.a, s.b)) through += 1
    }
    const shape = through === 0 ? `${ends} ends` : ends === 0 ? `${through} interiors crossing` : `${ends} end(s) on ${through} interior(s)`
    const has = emitted.some((q) => samePoint(q, b.at))
    return `  ${fmtPoint(b.at).padEnd(20)} net ${b.net.padEnd(22)} ${b.kind.padEnd(11)} ${shape.padEnd(26)} junction ${has ? "emitted" : "MISSING"}`
  })
}

/** Every point the two sides disagree about, in the order `junctionProblems` would name them. */
function disagreements(probe: BlockProbe): readonly Point[] {
  const topology = canonicalTopology(probe.layout, probe.pins)
  if (!topology.ok) return []
  const emitted = junctionPoints(layoutItems(probe.g, probe.layout))
  const emittedKeys = new Set(emitted.map(pointKey))
  const requiredKeys = new Set(topology.branches.map((b) => pointKey(b.at)))
  const out = new Map<string, Point>()
  for (const b of topology.branches) if (!emittedKeys.has(pointKey(b.at))) out.set(pointKey(b.at), b.at)
  for (const p of emitted) if (!requiredKeys.has(pointKey(p))) out.set(pointKey(p), p)
  return [...out.values()].sort((a, b) => a.y - b.y || a.x - b.x)
}

function flag(name: string, argv: readonly string[]): string | undefined {
  const i = argv.indexOf(name)
  return i === -1 ? undefined : argv[i + 1]
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const boardName = flag("--board", argv)
  if (boardName === undefined) {
    throw new Error("--board <name> is required; it is a directory under boards/, as tools/schgen/board-sheets.ts prints it")
  }
  const blockFilter = flag("--block", argv)
  const atText = flag("--at", argv)
  const at = atText === undefined ? null : parsePoint(atText)
  const survey = argv.includes("--branches")

  const repoRoot = moduleRepoRoot()
  const probes = await probesFor(boardName, repoRoot)
  for (const probe of probes) {
    if (blockFilter !== undefined && probe.blockId !== blockFilter) continue
    const gate = probe.drawnBy === "elk" ? "obligation 2's gate runs on it" : "obligation 2's gate does NOT run on it; junctionPoints is cosmetic here"
    console.log(`block ${probe.blockId} of ${boardName}: drawn by ${probe.drawnBy} - ${gate}`)
    console.log(`  ${probe.layout.wires.length} wire(s) as the renderer returned them, ${probe.pins.length} placed pin(s)`)
    if (probe.refusal !== "") console.log(`  the adaptation refused it: ${probe.refusal}`)
    if (survey) {
      const lines = branchLines(probe)
      console.log(`  ${lines.length} branch point(s):`)
      for (const line of lines) console.log(line)
      continue
    }
    const points = at === null ? disagreements(probe) : [at]
    if (points.length === 0) {
      console.log("  the two sides agree at every point of this block")
      continue
    }
    for (const p of points) reportPoint(probe, p)
  }
}

if (import.meta.main) {
  await main()
}
