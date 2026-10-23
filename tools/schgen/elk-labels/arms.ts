/**
 * **NINE WAYS OF HANDING ELK THE SAME GRAPH, AND WHAT IS MEASURED ABOUT WHAT COMES BACK.**
 *
 * Research probe for Task 2 Step 5 of
 * `docs/superpowers/plans/2026-10-22-text-handling-research.md`. **Nothing in `lib/` or any check
 * calls it, and it changes no production code**: every arm decorates a `structuredClone` of the
 * graph `lib/schgen/elk/graph.ts` built, and the production graph is never touched.
 *
 * **TWO ARMS THAT CAN ANSWER DIFFERENTLY ARE THE POINT**, which a third-party review of the plan
 * required and this file is built around: `e` is the case that should succeed - the symbol's box
 * kept, the label above it, which is where this emitter puts a Reference - and `f` is constrained to
 * ELK's own default for `layered`, which is an EMPTY placement hint. If ELK placed labels
 * unconditionally both would come back placed; if it ignored labels entirely neither would move the
 * layout. `docs/known-gaps.md` **G241** records five probes whose controls all returned the
 * treatment's answer, which is the failure this shape is guarding against.
 *
 * **NOTHING HERE DECIDES WHETHER A PLACEMENT IS GOOD.** The columns are counts - space reserved,
 * coordinates returned, overlaps, grid legality - and each could have come out the other way.
 */

import { boxesOverlap, GRID, segmentHitsBox, type Point, type Um } from "../../../lib/schgen/render/geometry.ts"
import { labelFor, SENTINEL, type BlockGraph } from "./corpus.ts"
import type { Box } from "../../../lib/schgen/render/lib-pins.ts"
import type { ElkLabel, ElkNode, LayoutOptions } from "elkjs/lib/elk-api.js"

/** The one capability of `elkjs` this module needs, so nothing here constructs a worker. */
export interface Layouter {
  layout(graph: ElkNode): Promise<ElkNode>
}

/** One arm: how it decorates a copy of the graph, and what it is meant to answer. */
export interface Arm {
  readonly name: string
  readonly what: string
  decorate(g: ElkNode, b: BlockGraph, height: Um): void
}

const nodeLabelArm = (name: string, what: string, opts: LayoutOptions, seed = false, minimum = false): Arm => ({
  name,
  what,
  decorate(g: ElkNode, b: BlockGraph, height: Um): void {
    for (const c of g.children ?? []) {
      c.labels = [labelFor(c.id, b, height, seed)]
      const extra: LayoutOptions = minimum ? { "elk.nodeSize.minimum": `(${c.width ?? 0},${c.height ?? 0})` } : {}
      c.layoutOptions = { ...c.layoutOptions, ...opts, ...extra }
    }
  },
})

export const ARMS: readonly Arm[] = [
  {
    name: "a baseline, no labels",
    what: "the control: the graph exactly as lib/schgen/elk/graph.ts builds it today",
    decorate(): void {},
  },
  nodeLabelArm(
    "b node labels, size free",
    "SizeConstraint NODE_LABELS alone - ELK may resize a node to fit its label",
    { "elk.nodeSize.constraints": "[NODE_LABELS]", "elk.nodeLabels.placement": "[H_CENTER, V_CENTER, INSIDE]" },
  ),
  nodeLabelArm(
    "c node labels, size free + minimum",
    "NODE_LABELS with the symbol's own box as nodeSize.minimum - the nearest thing to a schematic",
    { "elk.nodeSize.constraints": "[NODE_LABELS, MINIMUM_SIZE]", "elk.nodeLabels.placement": "[H_CENTER, V_CENTER, INSIDE]" },
    false,
    true,
  ),
  nodeLabelArm(
    "d node labels, size FIXED, inside",
    "this repository's real constraint - a node IS the symbol's box - with the label inside it",
    { "elk.nodeSize.constraints": "[]", "elk.nodeLabels.placement": "[H_CENTER, V_CENTER, INSIDE]" },
  ),
  nodeLabelArm(
    "e node labels, size FIXED, outside",
    "the same, with the label above the body, which is where this emitter puts a Reference",
    { "elk.nodeSize.constraints": "[]", "elk.nodeLabels.placement": "[H_CENTER, V_TOP, OUTSIDE]" },
  ),
  nodeLabelArm(
    "f node labels, NO placement, seeded",
    "layered's own default (NodeLabelPlacement.fixed(), i.e. EMPTY), with a sentinel seeded",
    { "elk.nodeSize.constraints": "[]" },
    true,
  ),
  nodeLabelArm(
    "g node labels, NO placement, unseeded",
    "the same arm without the sentinel, so the space ELK reserves for a label it never places shows",
    { "elk.nodeSize.constraints": "[]" },
  ),
  {
    name: "h port labels (pin text)",
    what: "a pin number as an ELK port label, at layered's default PortLabelPlacement.outside()",
    decorate(g: ElkNode, b: BlockGraph, height: Um): void {
      for (const c of g.children ?? []) {
        c.layoutOptions = { ...c.layoutOptions, "elk.nodeSize.constraints": "[]" }
        for (const p of c.ports ?? []) p.labels = [labelFor(p.id, b, height, false)]
      }
    },
  },
  {
    name: "i edge labels (net names)",
    what: "a NET NAME as an ELK edge label - the one label class layered declares as a supported feature",
    decorate(g: ElkNode, b: BlockGraph, height: Um): void {
      for (const e of g.edges ?? []) e.labels = [labelFor(e.id, b, height, false)]
    },
  },
  // **THE TWO ARMS THAT MAKE THE OTHERS MINIMAL PAIRS, and they were missing.** A reviewer of fix
  // round 0 pointed out that arms b-i differ from the baseline in the LAYOUT OPTION as well as in
  // the label, so a graph that grew could have grown because of either. These two set the option and
  // send NO label. If they match the baseline on every block, the growth in b-i is attributable to
  // the label; if one of them moved a layout by itself, every "blocks moved" figure above would be
  // confounded and the table would have to be re-read. **The reviewer drove the first of them and it
  // matched on 48 of 48 - but a control that lives in a review is a control nobody can re-drive**,
  // which is the `.superpowers/` failure in a different costume, so both are arms here and the log
  // carries them.
  {
    name: "j e's options, NO label",
    what: "the control for arms d-g: fixed size plus an outside placement hint, and no label at all",
    decorate(g: ElkNode): void {
      for (const c of g.children ?? []) {
        c.layoutOptions = { ...c.layoutOptions, "elk.nodeSize.constraints": "[]", "elk.nodeLabels.placement": "[H_CENTER, V_TOP, OUTSIDE]" }
      }
    },
  },
  {
    name: "k b's options, NO label",
    what: "the control for arm b: SizeConstraint NODE_LABELS and an inside hint, and no label at all",
    decorate(g: ElkNode): void {
      for (const c of g.children ?? []) {
        c.layoutOptions = { ...c.layoutOptions, "elk.nodeSize.constraints": "[NODE_LABELS]", "elk.nodeLabels.placement": "[H_CENTER, V_CENTER, INSIDE]" }
      }
    },
  },
  // **ARM c's OWN CONTROL, WHICH ARM k IS NOT.** Fix round 1 added k and called it "the control for
  // arms b-c"; k carries arm **b**'s option set, and arm **c** adds `MINIMUM_SIZE` with the
  // symbol's own box as the minimum, which is a different arm. The re-reviewer ran the missing one
  // and reported 144 nodes resized, worst 20.0 um, 46 of 48 blocks moved. **It is an arm here so
  // the log carries it and anyone can re-drive it** - a control that lives only in a review is a
  // control nobody can re-drive, which is this probe's own recorded lesson.
  {
    name: "l c's options, NO label",
    what: "the control arm c lacked: NODE_LABELS plus MINIMUM_SIZE at the symbol's own box, and no label",
    decorate(g: ElkNode): void {
      for (const c of g.children ?? []) {
        c.layoutOptions = {
          ...c.layoutOptions,
          "elk.nodeSize.constraints": "[NODE_LABELS, MINIMUM_SIZE]",
          "elk.nodeSize.minimum": `(${c.width ?? 0},${c.height ?? 0})`,
          "elk.nodeLabels.placement": "[H_CENTER, V_CENTER, INSIDE]",
        }
      }
    },
  },
]

interface Placed {
  readonly owner: string
  readonly box: Box
  readonly unplaced: boolean
  readonly noCoordinates: boolean
}

export interface ArmResult {
  readonly raised: string
  readonly width: Um
  readonly height: Um
  /** Nodes whose RETURNED size differs from the size `elkInputOf` sent - the symbol's own box. */
  readonly resized: number
  readonly worstResize: Um
  readonly labelsSent: number
  readonly labelsBack: number
  /** Labels that came back still carrying `SENTINEL`: ELK did not place them and did not say so. */
  readonly unplaced: number
  readonly noCoordinates: number
  readonly labelLabelOverlaps: number
  readonly labelBodyOverlaps: number
  /**
   * Labels overlapping the body of the very element they belong to.
   *
   * **Counted separately, and it is not noise.** `INSIDE` placement means exactly this, so for a
   * graph-drawing tool it is the intended outcome; for a KiCad symbol it is a Value printed over the
   * symbol's own graphics, which is one of the relations `lib/schgen/render/text-scene.ts` grades.
   * Which reading governs is an acceptance criterion, so the number is reported and nothing is
   * concluded from it here.
   */
  readonly labelOwnBodyOverlaps: number
  readonly labelWireHits: number
  readonly onGrid: number
}

const EMPTY: ArmResult = {
  raised: "", width: 0, height: 0, resized: 0, worstResize: 0, labelsSent: 0, labelsBack: 0,
  unplaced: 0, noCoordinates: 0, labelLabelOverlaps: 0, labelBodyOverlaps: 0, labelOwnBodyOverlaps: 0,
  labelWireHits: 0, onGrid: 0,
}

/** Every label of a laid-out graph, in the graph's own coordinates. */
function placedLabels(out: ElkNode): readonly Placed[] {
  const got: Placed[] = []
  const take = (owner: string, ls: readonly ElkLabel[] | undefined, ox: number, oy: number): void => {
    for (const l of ls ?? []) {
      const x = l.x ?? 0
      const y = l.y ?? 0
      got.push({
        owner,
        unplaced: x === SENTINEL && y === SENTINEL,
        noCoordinates: l.x === undefined || l.y === undefined,
        box: { minX: ox + x, minY: oy + y, maxX: ox + x + (l.width ?? 0), maxY: oy + y + (l.height ?? 0) },
      })
    }
  }
  for (const c of out.children ?? []) {
    take(c.id, c.labels, c.x ?? 0, c.y ?? 0)
    for (const p of c.ports ?? []) take(`${c.id}/${p.id}`, p.labels, (c.x ?? 0) + (p.x ?? 0), (c.y ?? 0) + (p.y ?? 0))
  }
  // An edge's label is relative to the coordinate system its EDGE is relative to - the graph's, not
  // a node's - which is ELK's own coordinate-system page and not an assumption made here.
  for (const e of out.edges ?? []) take(e.id, e.labels, 0, 0)
  return got
}

/** Every routed wire segment of a laid-out graph. */
function segments(out: ElkNode): readonly { readonly a: Point; readonly b: Point }[] {
  const segs: { a: Point; b: Point }[] = []
  for (const e of out.edges ?? []) {
    for (const s of e.sections ?? []) {
      const pts: Point[] = [s.startPoint, ...(s.bendPoints ?? []), s.endPoint]
      for (let i = 1; i < pts.length; i += 1) segs.push({ a: pts[i - 1]!, b: pts[i]! })
    }
  }
  return segs
}

/** Every node that occupies area. A boundary node is 0 x 0 and is not a body. */
function bodyBoxes(out: ElkNode): readonly { readonly id: string; readonly box: Box }[] {
  return (out.children ?? [])
    .filter((c) => (c.width ?? 0) > 0 && (c.height ?? 0) > 0)
    .map((c) => ({ id: c.id, box: { minX: c.x ?? 0, minY: c.y ?? 0, maxX: (c.x ?? 0) + (c.width ?? 0), maxY: (c.y ?? 0) + (c.height ?? 0) } }))
}

/**
 * One arm over one block.
 *
 * **The overlap predicates are production's own** - `boxesOverlap` and `segmentHitsBox` from
 * `lib/schgen/render/geometry.ts` - so an overlap counted here is an overlap by the same rule
 * `render/text-scene.ts` grades with, and not a second definition of touching.
 */
export async function runArm(elk: Layouter, arm: Arm, b: BlockGraph, height: Um): Promise<ArmResult> {
  const g = structuredClone(b.graph)
  const sent = new Map<string, { w: Um; h: Um }>()
  for (const c of g.children ?? []) sent.set(c.id, { w: c.width ?? 0, h: c.height ?? 0 })
  arm.decorate(g, b, height)
  let labelsSent = 0
  for (const c of g.children ?? []) {
    labelsSent += (c.labels ?? []).length
    for (const p of c.ports ?? []) labelsSent += (p.labels ?? []).length
  }
  for (const e of g.edges ?? []) labelsSent += (e.labels ?? []).length
  let out: ElkNode
  try {
    out = await elk.layout(g)
  } catch (e) {
    return { ...EMPTY, raised: e instanceof Error ? e.message : String(e), labelsSent }
  }
  let resized = 0
  let worstResize = 0
  for (const c of out.children ?? []) {
    const was = sent.get(c.id)
    if (was === undefined) continue
    const d = Math.max(Math.abs((c.width ?? 0) - was.w), Math.abs((c.height ?? 0) - was.h))
    if (d > 0) {
      resized += 1
      worstResize = Math.max(worstResize, d)
    }
  }
  const labels = placedLabels(out)
  const bodies = bodyBoxes(out)
  const segs = segments(out)
  let labelLabelOverlaps = 0
  for (let i = 0; i < labels.length; i += 1) {
    for (let j = i + 1; j < labels.length; j += 1) {
      const a = labels[i]!
      const c = labels[j]!
      if (a.unplaced || c.unplaced) continue
      if (boxesOverlap(a.box, c.box)) labelLabelOverlaps += 1
    }
  }
  let labelBodyOverlaps = 0
  let labelOwnBodyOverlaps = 0
  let labelWireHits = 0
  let onGrid = 0
  for (const l of labels) {
    if (l.unplaced) continue
    if (l.box.minX % GRID === 0 && l.box.minY % GRID === 0) onGrid += 1
    for (const body of bodies) {
      if (!boxesOverlap(l.box, body.box)) continue
      if (body.id === l.owner || l.owner.startsWith(`${body.id}/`)) labelOwnBodyOverlaps += 1
      else labelBodyOverlaps += 1
    }
    for (const s of segs) if (segmentHitsBox(s.a, s.b, l.box)) labelWireHits += 1
  }
  return {
    raised: "",
    width: out.width ?? 0,
    height: out.height ?? 0,
    resized,
    worstResize,
    labelsSent,
    labelsBack: labels.length,
    unplaced: labels.filter((l) => l.unplaced).length,
    noCoordinates: labels.filter((l) => l.noCoordinates).length,
    labelLabelOverlaps,
    labelBodyOverlaps,
    labelOwnBodyOverlaps,
    labelWireHits,
    onGrid,
  }
}

export function sum(rows: readonly ArmResult[], pick: (r: ArmResult) => number): number {
  return rows.reduce((t, r) => t + pick(r), 0)
}
