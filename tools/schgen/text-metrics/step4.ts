/**
 * **THE COLLISION FIGURES THIS REPOSITORY HAS PUBLISHED, RE-TAKEN ONCE PER MEASURED QUANTITY.**
 *
 * Research probe for Task 1 Step 4 of
 * `docs/superpowers/plans/2026-10-22-text-handling-research.md`. **It changes no production code.**
 *
 * Three populations, each named in `docs/known-gaps.md`:
 *
 * 1. **G239** - the inside field slots a small two-pin passive can use, over the four symbols that
 *    entry's own table measures.
 * 2. **G260** - the fifteen field pairs the placer could not keep clear, over the twelve declared
 *    blocks of the parity set, which is the population that entry counted.
 * 3. **G262 / the blocked boards** - the global-label overlaps that refuse three blocks.
 *
 * **EVERY RUN CARRIES ITS OWN CONTROL and the control can fail.** Population 2 is computed twice
 * under the current ruler: once by `lib/schgen/render/field-placement.ts` itself and once by the
 * parallel search in `placement.ts`. They must agree on block, unit, lib id, cost and every
 * `covers` string. They are two different code paths over the same geometry, so a disagreement is a
 * defect in the probe - and until they agree, nothing computed with a measured ruler means anything.
 */

import { adaptElkLayoutReported } from "../../../lib/schgen/elk/adapt.ts"
import { buildCircuit } from "../../../lib/schgen/ir/build.ts"
import { circuitSpecFrom } from "../../../lib/schgen/from-network.ts"
import { validateCircuit } from "../../../lib/schgen/ir/validate.ts"
import { selectRenderer, subgraphOf } from "../../../lib/schgen/render/blocks.ts"
import { TEMPLATES } from "../../../lib/schgen/render/templates/index.ts"
import { blockFields } from "../../../lib/schgen/render/field-placement.ts"
import { anchorsToSymbols, blockPowerLibs, powerText, valuesAlong } from "../../../lib/schgen/render/power-text.ts"
import { boxesOverlap, segmentHitsBox } from "../../../lib/schgen/render/geometry.ts"
import { createResolver } from "../../../lib/schgen/render/library.ts"
import { pinMarkBox, pinMarks } from "../../../lib/schgen/render/pin-marks.ts"
import { unitText } from "../../../lib/schgen/render/unit-text.ts"
import { symbolLibraries } from "../../../lib/schgen/render/stock-symbols.ts"
import { elkPrePass } from "../elk/layout.ts"
import { caseResolver, type ParityCase } from "../authoring-census.ts"
import { fallbacksUnder, insideSlotsThatFit, grownPairExtent, sceneOf, type Fallback, type TextGeometry } from "./placement.ts"
import type { BlockLayout, BlockSubgraph } from "../../../lib/schgen/render/block-types.ts"
import type { Box } from "../../../lib/schgen/render/lib-pins.ts"

/** The four symbols **G239**'s own amendment table measures, with the values it measured them at. */
export const G239_CASES: readonly { readonly libId: string; readonly value: string; readonly refPrefix: string }[] = [
  { libId: "Jumper:Jumper_2_Open", value: "Jumper_2_Open", refPrefix: "JP" },
  { libId: "Device:C", value: "100nF", refPrefix: "C" },
  { libId: "Device:C_Polarized", value: "4.7uF", refPrefix: "C" },
  { libId: "Audio:PT2399", value: "PT2399", refPrefix: "U" },
]

export interface SlotRow {
  readonly libId: string
  readonly body: Box
  /** Per geometry name: how many of the five inside slots hold the grown pair. */
  readonly fits: ReadonlyMap<string, number>
  /** Per geometry name: the grown pair's own extent at the centre slot. */
  readonly pair: ReadonlyMap<string, { readonly width: number; readonly height: number }>
}

export function g239Slots(geometries: readonly TextGeometry[]): readonly SlotRow[] {
  const nicknames = [...new Set(G239_CASES.map((c) => c.libId.split(":")[0] ?? ""))]
  const symbols = createResolver(symbolLibraries(nicknames))
  return G239_CASES.map((c) => {
    const lib = symbols.resolve(c.libId)
    const body = lib.bodies.get(1)
    if (body === undefined) throw new Error(`${c.libId} has no unit-1 body box, so G239's arithmetic cannot be re-taken for it`)
    const fits = new Map<string, number>()
    const pair = new Map<string, { width: number; height: number }>()
    for (const g of geometries) {
      fits.set(g.name, insideSlotsThatFit(g, body, c.refPrefix, c.value, c.libId).length)
      pair.set(g.name, grownPairExtent(g, body, "centre", c.refPrefix, c.value, c.libId))
    }
    return { libId: c.libId, body, fits, pair }
  })
}

export interface BlockRun {
  readonly circuit: string
  readonly block: string
  readonly production: readonly Fallback[]
  /** Per geometry name, the fallbacks that search produces. */
  readonly perGeometry: ReadonlyMap<string, readonly Fallback[]>
  /** Overlapping drawn-text pairs of the block's labels and power values, per geometry name. */
  readonly textOverlaps: ReadonlyMap<string, readonly string[]>
  readonly refusal: string
}

interface Laid {
  readonly circuit: string
  readonly block: string
  readonly g: BlockSubgraph
  readonly layout: BlockLayout
  readonly refusal: string
}

/** Every ELK block of `cases` that produced a grid-legal layout, with the refusal text where there is one. */
export async function laidOutBlocks(cases: readonly ParityCase[]): Promise<{ readonly laid: readonly Laid[]; readonly skipped: readonly string[] }> {
  const laid: Laid[] = []
  const skipped: string[] = []
  for (const c of cases) {
    const symbols = caseResolver([c])
    const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
    // **GATE 1 IS NOT APPLIED HERE, AND THAT IS WHAT MAKES THIS THE SAME POPULATION G260 COUNTED.**
    // `tools/schgen/masked-problems.ts` goes straight from `buildCircuit` to the ELK pre-pass, so
    // three of the four parity circuits contribute blocks although `validateCircuit` refuses them
    // on net names. Adding the gate here cut the population from twelve blocks to seven and from
    // fifteen fallbacks to four - a different measurement wearing the same entry's number.
    const problems = validateCircuit(circuit, symbols)
    if (problems.length > 0) skipped.push(`${c.name}: validateCircuit reports ${problems.length} problem(s) - its blocks are measured anyway, as masked-problems.ts measures them`)
    const outcomes = await elkPrePass(circuit, symbols)
    for (const block of circuit.blocks.values()) {
      if (block.rendering.kind === "bus") continue
      const g = subgraphOf(circuit, block.id, symbols)
      if (selectRenderer(g, TEMPLATES).kind !== "elk") continue
      const outcome = outcomes.get(block.id)
      if (outcome === undefined || !outcome.ok) {
        skipped.push(`${c.name}/${block.id}: the ELK pre-pass holds no layout`)
        continue
      }
      const report = adaptElkLayoutReported(g, outcome)
      if (report.checked === null) {
        skipped.push(`${c.name}/${block.id}: refused before checkLayout, so there is no grid-legal geometry to measure`)
        continue
      }
      laid.push({ circuit: c.name, block: block.id, g, layout: report.checked, refusal: report.result.ok ? "" : report.result.mismatch.reason })
    }
  }
  return { laid, skipped }
}

/**
 * What a block's global labels and power values run into under `geom`.
 *
 * **ONLY THE LABEL AND POWER-VALUE BOXES DEPEND ON THE RULER**; everything they are tested against
 * - unit bodies, pin text, interior graphics, pin marks and wires - is the production geometry,
 * imported. So a pair that appears or disappears between two columns did so because the text box
 * moved, which is the question Step 4 asks.
 *
 * **IT IS NOT `render/text-scene.ts`'s full clearance pass** and does not claim to be: that pass
 * grades more relations than overlap and is what `checkLayout` publishes. What this reproduces is
 * the subset the three blocked blocks refuse on, and `probe.ts` prints each block's own refusal
 * beside the table so a reader can see what is and is not re-taken here.
 */
function textOverlapsUnder(geom: TextGeometry, l: Laid): readonly string[] {
  const libs = blockPowerLibs(l.g)
  const { powers, labels } = anchorsToSymbols(l.g, l.layout.anchors, valuesAlong(l.g.block.rendering))
  const movable: { what: string; box: Box }[] = [
    ...labels.map((x) => ({ what: `label ${x.net} at (${x.at.x}, ${x.at.y})`, box: geom.labelBox(x) })),
    ...powers.map((p) => {
      const t = powerText(libs, p)
      return { what: `value of power ${p.net} at (${p.at.x}, ${p.at.y})`, box: geom.verticalBox(t.value, t.text) }
    }),
  ]
  const fixed: { what: string; box: Box }[] = []
  const strokes: { what: string; a: { x: number; y: number }; b: { x: number; y: number } }[] = l.layout.wires.map((w, i) => ({
    what: `wire ${i} (${w.net})`,
    a: w.a,
    b: w.b,
  }))
  for (const pl of l.layout.placements) {
    const u = l.g.units.find((x) => x.part.label === pl.part && x.unit === pl.unit)
    if (u === undefined) continue
    const t = unitText(u, pl)
    fixed.push({ what: `body of ${t.key}`, box: t.body })
    for (const d of t.decorations) fixed.push(d)
    for (const b of t.interiorBoxes) fixed.push(b)
    for (const m of pinMarks(u, pl)) fixed.push({ what: m.what, box: pinMarkBox(m) })
    for (const s of t.strokes) strokes.push(s)
    for (const s of t.pins) strokes.push(s)
  }
  const out: string[] = []
  for (let i = 0; i < movable.length; i += 1) {
    const a = movable[i]!
    for (let j = i + 1; j < movable.length; j += 1) {
      const b = movable[j]!
      if (boxesOverlap(a.box, b.box)) out.push(`${a.what} overlaps ${b.what}`)
    }
    for (const b of fixed) if (boxesOverlap(a.box, b.box)) out.push(`${a.what} overlaps ${b.what}`)
    for (const s of strokes) if (segmentHitsBox(s.a, s.b, a.box)) out.push(`${a.what} overlaps ${s.what}`)
  }
  return out
}

export async function blockRuns(cases: readonly ParityCase[], geometries: readonly TextGeometry[]): Promise<{
  readonly runs: readonly BlockRun[]
  readonly skipped: readonly string[]
}> {
  const { laid, skipped } = await laidOutBlocks(cases)
  const runs = laid.map((l): BlockRun => {
    const libs = blockPowerLibs(l.g)
    const production = blockFields(l.g, l.layout, libs).flatMap((u) => (u.fallback === null ? [] : [u.fallback]))
    const scene = sceneOf(l.g, l.layout, libs)
    const perGeometry = new Map<string, readonly Fallback[]>()
    const textOverlaps = new Map<string, readonly string[]>()
    for (const g of geometries) {
      perGeometry.set(g.name, fallbacksUnder(g, scene))
      textOverlaps.set(g.name, textOverlapsUnder(g, l))
    }
    return { circuit: l.circuit, block: l.block, production, perGeometry, textOverlaps, refusal: l.refusal }
  })
  return { runs, skipped }
}

/**
 * The control: the parallel search under the current ruler must reproduce production's own
 * fallbacks exactly. Returns the disagreements, which must be empty.
 */
export function controlDisagreements(runs: readonly BlockRun[], estimateName: string): readonly string[] {
  const out: string[] = []
  for (const r of runs) {
    const mine = r.perGeometry.get(estimateName)
    if (mine === undefined) {
      out.push(`${r.circuit}/${r.block}: the parallel search was not run under "${estimateName}"`)
      continue
    }
    const key = (f: Fallback): string => `${f.key}|${f.libId}|${f.cost}|${[...f.covers].sort().join("~")}`
    const a = r.production.map(key).sort()
    const b = mine.map(key).sort()
    if (a.length !== b.length || a.some((v, i) => v !== b[i])) {
      out.push(`${r.circuit}/${r.block}: production produced [${a.join(" ; ")}] and the parallel search produced [${b.join(" ; ")}]`)
    }
  }
  return out
}
