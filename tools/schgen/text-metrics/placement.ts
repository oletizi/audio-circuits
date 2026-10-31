/**
 * **THE FIELD PLACER'S SEARCH, RUN AGAIN WITH THE TEXT GEOMETRY SWAPPED OUT.**
 *
 * Research probe for Task 1 Step 4 of
 * `docs/superpowers/plans/2026-10-22-text-handling-research.md`. **It changes no production code**,
 * which is that task's binding constraint: `lib/schgen/render/text-boxes.ts`'s `textWidth` is the
 * subject of the research and is not edited by the agent researching it.
 *
 * **WHY A PARALLEL SEARCH AND NOT A FLAG ON THE REAL ONE.** `placeFields` takes its text boxes from
 * module-level functions with no seam, so measuring the same search under a different ruler needs
 * either an edit to that module or a second copy of the walk. The first is forbidden here. **So the
 * walk is duplicated and the duplicate is held to the original by a control**: `geometry.ts`'s
 * `estimateGeometry` is the current model exactly, and `probe.ts` requires this module to reproduce
 * production's fallback list - block, unit, cost and every `covers` string - before any figure
 * computed with a measured ruler is reported. A copy that cannot reproduce the original under the
 * original's own ruler is measuring itself, which is the failure `docs/known-gaps.md` **G241**
 * records five times.
 *
 * **EVERYTHING EXCEPT THE TEXT BOXES IS THE PRODUCTION CODE.** The obstacle construction, the
 * clear/covered predicate, the weighted area, the candidate list, the inside-containment rule and
 * the least-covered choice are all imported from `lib/schgen/render/`; only `textBox`, `labelBox`
 * and `powerValueBox` are replaced, because those three are the whole of what `textWidth` reaches.
 */

import { valueIsSymbolPartName } from "../../../lib/kicad/value-notation.ts"
import type { BlockLayout, BlockSubgraph, BlockUnit, Placement, Wire } from "../../../lib/schgen/render/block-types.ts"
import { boxesOverlap, GRID, growBox, segmentHitsBox, type Point, type Side, type Um } from "../../../lib/schgen/render/geometry.ts"
import type { Box } from "../../../lib/schgen/render/lib-pins.ts"
import { chooseLeastCovered, createOccupancy, MARK_WEIGHT } from "../../guide/occupancy.ts"
import { pinMarkBox, pinMarks } from "../../../lib/schgen/render/pin-marks.ts"
import { anchorsToSymbols, powerText, valuesAlong, type LibLookup } from "../../../lib/schgen/render/power-text.ts"
import type { GlobalLabel, PowerSymbol } from "../../../lib/schgen/render/sheet-types.ts"
import {
  besidePinFields, INSIDE_SLOTS, OUTSIDE_SLOTS, reservedReference, slotFields,
  type Fields, type FieldSlot, type HJustify, type LabelSpot, type PowerValueSpot, type TextSpot,
} from "../../../lib/schgen/render/text-boxes.ts"
import { unitText, type Obstacle, type Segment, type UnitText } from "../../../lib/schgen/render/unit-text.ts"
import type { BlockId } from "../../../lib/schgen/ir/types.ts"

/**
 * One ruler for drawn text. `estimateGeometry` in `geometry.ts` is `lib/schgen/render/text-boxes.ts`
 * exactly; the measured ones are built there from the font source and the installed runtime.
 */
export interface TextGeometry {
  readonly name: string
  /**
   * The box of one drawn line, placed against its anchor exactly as the model being measured says
   * it sits. **It is per string, not a width plus a constant offset**, because an ink box's
   * leading inset and its depth below the baseline both depend on which glyphs are in the string -
   * `R100` has no descender and `si_hi_cut_j4_p2` has two.
   */
  lineBox(spot: TextSpot, text: string): Box
  /** The same for a line rotated to read upward, which is how power values and up/down refs draw. */
  verticalBox(spot: PowerValueSpot, text: string): Box
  /** A global label's whole rendered box: its outline, its text and its intersheet references. */
  labelBox(l: LabelSpot): Box
  /** Width and height of one line in isolation, for the error table. */
  width(text: string): Um
  height(text: string): Um
}

/** `lib/schgen/render/field-placement.ts`'s `MARGIN`, `LINE_WIDTH` and `within`, unchanged. */
const MARGIN = GRID / 2
const LINE_WIDTH: Um = 152.4
const within = (inner: Box, outer: Box): boolean =>
  outer.minX < inner.minX && inner.maxX < outer.maxX && outer.minY < inner.minY && inner.maxY < outer.maxY

interface Prepared extends UnitText {
  readonly u: BlockUnit
  readonly freeSides: readonly Side[]
  readonly marks: readonly Obstacle[]
}

interface Candidate {
  readonly fields: Fields
  readonly inside: boolean
}

export interface Fallback {
  readonly block: BlockId
  readonly key: string
  readonly libId: string
  readonly cost: number
  readonly covers: readonly string[]
}

export interface Scene {
  readonly block: BlockId
  readonly units: readonly BlockUnit[]
  readonly placements: readonly Placement[]
  readonly wires: readonly Wire[]
  readonly powers: readonly PowerSymbol[]
  readonly labels: readonly GlobalLabel[]
  readonly libs: LibLookup
}

const lineObstacleBox = (s: Segment): Box =>
  growBox({ minX: Math.min(s.a.x, s.b.x), minY: Math.min(s.a.y, s.b.y), maxX: Math.max(s.a.x, s.b.x), maxY: Math.max(s.a.y, s.b.y) }, LINE_WIDTH / 2)

function prepare(u: BlockUnit, pl: Placement): Prepared {
  const t = unitText(u, pl)
  return { ...t, u, freeSides: OUTSIDE_SLOTS.filter((s) => !t.tips.has(s)), marks: pinMarks(u, pl).map((m) => ({ what: m.what, box: pinMarkBox(m) })) }
}

function allCandidates(p: Prepared): Candidate[] {
  return [
    ...p.freeSides.map((s) => ({ fields: slotFields(p.body, s), inside: false })),
    ...INSIDE_SLOTS.map((s: FieldSlot) => ({ fields: slotFields(p.body, s), inside: true })),
    ...OUTSIDE_SLOTS.flatMap((s) => besidePinFields(p.body, s, p.tips.get(s) ?? []).map((fields) => ({ fields, inside: false }))),
  ]
}

/** `placeFields`, with every text box taken from `g`. Returns one entry per unit that falls back. */
export function fallbacksUnder(g: TextGeometry, scene: Scene): readonly Fallback[] {
  const prepared = scene.placements.map((pl) => {
    const u = scene.units.find((x) => x.part.label === pl.part && x.unit === pl.unit)
    if (u === undefined) throw new Error(`block ${scene.block}: placement ${pl.part}#${pl.unit} is not a unit of the block`)
    return prepare(u, pl)
  })
  const segments: Segment[] = [...scene.wires.map((w, i) => ({ what: `wire ${i} (${w.net})`, a: w.a, b: w.b })), ...prepared.flatMap((p) => p.pins)]
  const powers = scene.powers.map((p) => ({ net: p.net, text: powerText(scene.libs, p) }))
  const fixedMarks: Obstacle[] = [
    ...prepared.flatMap((p) => p.decorations),
    ...prepared.flatMap((p) => p.marks),
    ...scene.labels.map((l) => ({ what: `label ${l.net}`, box: g.labelBox(l) })),
    ...powers.map(({ net, text }) => ({ what: `value of power ${net}`, box: g.verticalBox(text.value, text.text) })),
  ]
  const fixedBodies: Obstacle[] = powers.map(({ net, text }) => ({ what: `power ${net}`, box: text.glyph }))
  const placed: Obstacle[] = []
  const out: Fallback[] = []
  for (const p of prepared) {
    const others = prepared.filter((q) => q !== p).map((q) => ({ what: `body of ${q.key}`, box: q.body }))
    const texts = (f: Fields): Box[] => [
      g.lineBox(f.reference, reservedReference(p.u.part.refPrefix)),
      ...(valueIsSymbolPartName(p.u.symbol.libId, p.u.part.value) ? [] : [g.lineBox(f.value, p.u.part.value)]),
    ]
    const grown = (f: Fields): Box[] => texts(f).map((t) => growBox(t, MARGIN))
    const obstacles = (inside: boolean): readonly { readonly weight: number; readonly items: readonly Obstacle[] }[] => [
      { weight: 1, items: [...fixedBodies, ...others, ...(inside ? [] : [{ what: "own body", box: p.body }])] },
      { weight: MARK_WEIGHT, items: [...fixedMarks, ...placed, ...(inside ? p.interiorBoxes : [])] },
    ]
    const strokesOf = (inside: boolean): readonly Segment[] => (inside ? [...segments, ...p.strokes] : segments)
    const covered = (c: Candidate): string[] => {
      const names: string[] = []
      for (const b of grown(c.fields)) {
        for (const { items } of obstacles(c.inside)) for (const o of items) if (boxesOverlap(b, o.box)) names.push(o.what)
        for (const s of strokesOf(c.inside)) if (segmentHitsBox(s.a, s.b, b)) names.push(s.what)
      }
      return [...new Set(names)]
    }
    const area = (c: Candidate): number => {
      const bodies = createOccupancy(1)
      const marks = createOccupancy(MARK_WEIGHT)
      for (const { weight, items } of obstacles(c.inside)) for (const o of items) (weight === MARK_WEIGHT ? marks : bodies).add(o.box)
      for (const s of strokesOf(c.inside)) bodies.add(lineObstacleBox(s))
      return grown(c.fields).reduce((sum, b) => sum + bodies.overlap(b) + marks.overlap(b), 0)
    }
    const cands = allCandidates(p).filter((c) => !c.inside || grown(c.fields).every((b) => within(b, p.body)))
    const clear = cands.find((c) => covered(c).length === 0)
    const cand = clear ?? chooseLeastCovered(cands, area).candidate
    if (clear === undefined) {
      const covers = covered(cand)
      if (covers.length === 0) throw new Error(`block ${scene.block}: ${p.key}: no candidate is clear yet the chosen one covers nothing`)
      out.push({ block: scene.block, key: p.key, libId: p.u.symbol.libId, cost: Math.round(area(cand)), covers })
    }
    for (const [i, b] of texts(cand.fields).entries()) placed.push({ what: `${i === 0 ? "Reference" : "Value"} of ${p.key}`, box: b })
  }
  return out
}

export function sceneOf(g: BlockSubgraph, layout: BlockLayout, libs: LibLookup): Scene {
  const { powers, labels } = anchorsToSymbols(g, layout.anchors, valuesAlong(g.block.rendering))
  return { block: g.block.id, units: g.units, placements: layout.placements, wires: layout.wires, powers, labels, libs }
}

/** Inside slots a unit's grown field pair fits in, under `g` - the quantity **G239** publishes. */
export function insideSlotsThatFit(g: TextGeometry, body: Box, refPrefix: string, value: string, libId: string): readonly FieldSlot[] {
  return INSIDE_SLOTS.filter((slot) => {
    const f = slotFields(body, slot)
    const boxes: Box[] = [
      g.lineBox(f.reference, reservedReference(refPrefix)),
      ...(valueIsSymbolPartName(libId, value) ? [] : [g.lineBox(f.value, value)]),
    ]
    return boxes.map((b) => growBox(b, MARGIN)).every((b) => within(b, body))
  })
}

/** The grown Reference-and-Value pair's own box at a slot, for reporting what has to fit where. */
export function grownPairExtent(g: TextGeometry, body: Box, slot: FieldSlot, refPrefix: string, value: string, libId: string): { readonly width: Um; readonly height: Um } {
  const f = slotFields(body, slot)
  const boxes: Box[] = [
    g.lineBox(f.reference, reservedReference(refPrefix)),
    ...(valueIsSymbolPartName(libId, value) ? [] : [g.lineBox(f.value, value)]),
  ].map((b) => growBox(b, MARGIN))
  const minX = Math.min(...boxes.map((b) => b.minX))
  const maxX = Math.max(...boxes.map((b) => b.maxX))
  const minY = Math.min(...boxes.map((b) => b.minY))
  const maxY = Math.max(...boxes.map((b) => b.maxY))
  return { width: maxX - minX, height: maxY - minY }
}

export type { HJustify, Point }
