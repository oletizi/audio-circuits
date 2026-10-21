/**
 * SPEC §3.3's FOUR MEASURES, TAKEN OVER A CANONICAL TOPOLOGY, AND REPORTED SIDE BY SIDE WITH NO
 * COMPOSITE.
 *
 * Hand-written for Task 16 of the M1 schematic-authoring plan.
 *
 * **WHAT WOULD BE WRONG IF THESE WERE TAKEN OVER A RAW SEGMENT LIST, which is why
 * `measuresOf` takes a `CanonicalTopology` and not a `Wire[]`.** `docs/known-gaps.md` **G106**,
 * from the spikes: *"duplicate wire segments: 30-187 per drawing. Any measure that does not
 * collapse them double-counts crossings"* - and **those duplicates are already in the geometry
 * this layer measures**, not something a later stage introduces. On this driver the figure is
 * milder and real (**G106**'s Task 13 amendment: 0-24 exact duplicates per block, plus the
 * same-net collinear CONTAINMENTS of **G189**), so the inflation is not hypothetical:
 *
 * - **wire length** counts a duplicated segment twice and a containment's inner span twice;
 * - **crossings** counts one cross-net contact once per duplicate pair that touches there;
 * - **bends** and **bends per edge** are computed from vertex degree, and a duplicate turns a
 *   degree-2 corner into a degree-4 vertex, which stops being a bend and starts being a node -
 *   so the raw figure can move in EITHER direction and nothing says which;
 * - **occupied area** is the one measure a duplicate cannot move, because the bounding box of a
 *   point set is unchanged by repeating a point. It is stated because a measure that cannot be
 *   wrong in a given way should say so rather than borrow the credibility of the ones that can.
 *
 * Spec §1.4 revision 4 states the criterion - *"a canonical wire topology is established before
 * serialization"* - and `lib/schgen/elk/junctions.ts` is the one implementation of it. **Nothing
 * here canonicalises anything of its own**: `measuresOf` is handed the topology, and
 * `sheetMeasuresOf` calls `canonicalTopology` rather than reimplementing it.
 *
 * **THERE IS NO SCORE, AND THAT IS A DECISION WITH A PUBLISHED REASON RATHER THAN A GAP.** Spec
 * §3.3: *"no published source anywhere states an acceptable number of wire crossings, bends or
 * wire length"* - not IEC 61082-1, not ANSI Y14.15 (*"as few as possible"*) - and the one
 * composite shape that was available, AEM's, is *"a composite whose four sub-terms are
 * unpublished"*. Adopting it *"would produce a number that looks cited, trades the four measures
 * against each other at weights nobody chose, and answers 'crossings down, length doubled' by
 * hiding the trade rather than showing it. Four numbers reported side by side show it."*
 * `renderMeasures` therefore emits exactly five numbers and `tests/schgen/readability/measures.test.ts`
 * counts them, so a fifth summarising figure cannot be added quietly.
 *
 * **THE ORDER IS BENDS FIRST, THEN CROSSINGS, AND THAT ORDERS THE REPORT WITHOUT WEIGHTING
 * ANYTHING.** It is the order the literature puts them in and is consistent with the one user
 * study in evidence, which attributes the harm to right-angle bends and finds **no correlation
 * between crossing count and task performance at all** while declaring its own sample too small
 * to be conclusive. A schematic is orthogonal by convention, so bends are intrinsic to the form.
 * **It does not weight a score, because there is no score.**
 *
 * **AND THESE FOUR ARE DIAGNOSTICS, NOT AN ACCEPTANCE RESULT.** Spec §3.3 revision 4: absent a
 * dominance rule, four numbers moving in different directions *"cannot be resolved into a verdict
 * by anything in this document"*. Acceptance rests on the hard geometric checks (§1.4, §3.2) and
 * on independent render approval (§3.3's baseline registry, §3.5's reviewer). Nothing in this
 * module returns a verdict, a boolean or a grade, and `./baseline.ts` carries the type-level
 * reason a caller cannot read one out of a comparison either.
 */

import { canonicalTopology, crossings, type CanonicalTopology } from "../elk/junctions.ts"
import { GRID, pointKey, type Point, type Um } from "../render/geometry.ts"
import type { Wire } from "../render/block-types.ts"
import type { PlacedPin } from "../render/unit-pins.ts"
import type { SheetDrawing } from "../render/sheet-types.ts"
import type { Box } from "../render/lib-pins.ts"

export interface SchematicMeasures {
  readonly bends: number
  readonly bendsPerEdge: number
  readonly crossings: number
  /** Total, in grid steps. */
  readonly wireLength: number
  /** The extent actually used, in square grid steps. */
  readonly occupiedArea: number
}

const isHorizontal = (w: Wire): boolean => w.a.y === w.b.y

/** `v`'s span along its own axis, as `[lo, hi]`; only compared against a segment on the same line. */
function alongOf(w: Wire): (p: Point) => number {
  return isHorizontal(w) ? (p: Point) => p.x : (p: Point) => p.y
}

/** True when `p` lies on the closed segment `a`-`b` (axis-aligned). */
function onClosed(p: Point, a: Point, b: Point): boolean {
  if (a.x === b.x) return p.x === a.x && p.y >= Math.min(a.y, b.y) && p.y <= Math.max(a.y, b.y)
  if (a.y === b.y) return p.y === a.y && p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x)
  return false
}

const strictlyBetween = (p: Point, a: Point, b: Point): boolean =>
  onClosed(p, a, b) && pointKey(p) !== pointKey(a) && pointKey(p) !== pointKey(b)

/**
 * One net's segments divided so that every contact between two of them is at an ENDPOINT.
 *
 * **IT IS A COUNTING NORMALISATION AND NOT A SECOND CANONICALISATION, and the difference matters.**
 * `canonicalTopology` has already merged duplicates and containments, refused ambiguous overlaps
 * and split every segment at a same-net END that lay strictly inside another (ruling **R33**). The
 * one same-net contact it leaves unsplit is an interior CROSSING of one net - two perpendicular
 * segments of the same net meeting where neither ends - because R33 splits at ends, not at
 * intersections. **That point is a degree-4 vertex and must be read as one**, or the two segments
 * through it would each be counted as one unbroken edge and the vertex would be invisible to both
 * the bend count and the edge count.
 *
 * Nothing moves, nothing merges and no reading is chosen: the ink is identical, exactly as R33's
 * own justification says of a split at a branch point.
 */
function dividedAtContacts(segments: readonly Wire[]): readonly Wire[] {
  const out: Wire[] = []
  for (const s of segments) {
    const cuts = new Map<string, Point>()
    for (const other of segments) {
      if (other === s) continue
      if (isHorizontal(other) === isHorizontal(s)) continue
      const h = isHorizontal(s) ? s : other
      const v = isHorizontal(s) ? other : s
      const at: Point = { x: v.a.x, y: h.a.y }
      if (onClosed(at, h.a, h.b) && onClosed(at, v.a, v.b) && strictlyBetween(at, s.a, s.b)) {
        cuts.set(pointKey(at), at)
      }
    }
    if (cuts.size === 0) {
      out.push(s)
      continue
    }
    const along = alongOf(s)
    const forward = along(s.a) < along(s.b)
    const ordered = [...cuts.values()].sort((x, y) => (forward ? along(x) - along(y) : along(y) - along(x)))
    const points = [s.a, ...ordered, s.b]
    for (let k = 1; k < points.length; k += 1) {
      const a = points[k - 1]
      const b = points[k]
      if (a === undefined || b === undefined) continue
      out.push({ a, b, net: s.net })
    }
  }
  return out
}

/** Union-find over vertex keys, so a net's route can be split into connected components. */
class Components {
  private readonly parent = new Map<string, string>()

  find(key: string): string {
    const seen = this.parent.get(key)
    if (seen === undefined) {
      this.parent.set(key, key)
      return key
    }
    if (seen === key) return key
    const root = this.find(seen)
    this.parent.set(key, root)
    return root
  }

  join(a: string, b: string): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

interface NetShape {
  readonly bends: number
  readonly edges: number
}

/**
 * One net's bends and EDGES.
 *
 * **WHAT AN EDGE IS HERE, said plainly because the spec's table says *"bends, count and per edge"*
 * and leaves the denominator to the implementation.** An edge is a **maximal polyline of one net
 * between two NODES**, where a node is a point of that net whose degree is anything but two - a
 * free end, or a branch. A degree-2 point is either a BEND (its two segments are perpendicular) or
 * a straight continuation (they are collinear, which is what a split at a branch point or at a
 * pin leaves behind), and neither ends an edge. That is the graph-drawing sense of the phrase, and
 * it is the only one computable from a canonical topology, which deliberately keeps no edge
 * identity of its own.
 *
 * **IT IS NOT THE DENOMINATOR THE SPIKES USED, AND THE TWO FIGURES MUST NOT BE COMPARED.** The
 * spike figures in `docs/known-gaps.md` **G96** (1.72 for the probe, 2.19-3.27 over fourteen
 * whole-circuit runs) divide ELK's own `bendPoints` by ELK's own EDGE count, which for this
 * backend is *"a net of degree n becomes n - 1 edges"* (`lib/schgen/elk/graph.ts`) - a count of
 * the two-terminal connections in the spanning chain, not of the polylines the route came out as.
 * The two denominators agree for a two-terminal net and diverge for every other, and this one is
 * also defined for a template-drawn block, where there is no ELK graph at all. **Reporting this
 * number against those is the "looks cited" failure §3.3 refuses**, so the difference is stated
 * here and recorded in `docs/known-gaps.md`.
 *
 * **A PURE CYCLE COUNTS AS ONE EDGE.** A component with no node at all is a closed loop of one
 * net; it has no polyline ends to divide it, and calling it zero edges would make a net with ink
 * in it contribute nothing to the denominator.
 */
function shapeOfNet(segments: readonly Wire[]): NetShape {
  const divided = dividedAtContacts(segments)
  const incident = new Map<string, Wire[]>()
  const at = new Map<string, Point>()
  const components = new Components()
  for (const s of divided) {
    for (const end of [s.a, s.b]) {
      const key = pointKey(end)
      at.set(key, end)
      const list = incident.get(key) ?? []
      list.push(s)
      incident.set(key, list)
    }
    components.join(pointKey(s.a), pointKey(s.b))
  }

  let bends = 0
  const nodeDegree = new Map<string, number>()
  for (const [key, list] of incident) {
    if (list.length === 2) {
      const [first, second] = list
      if (first === undefined || second === undefined) continue
      if (isHorizontal(first) !== isHorizontal(second)) bends += 1
      continue
    }
    nodeDegree.set(key, list.length)
  }

  const degreeByComponent = new Map<string, number>()
  for (const [key, degree] of nodeDegree) {
    const root = components.find(key)
    degreeByComponent.set(root, (degreeByComponent.get(root) ?? 0) + degree)
  }
  const roots = new Set([...at.keys()].map((key) => components.find(key)))
  let edges = 0
  for (const root of roots) {
    const degree = degreeByComponent.get(root)
    // No node in this component: it is a closed loop, and it is one edge. With nodes, every
    // polyline has two node ends, so the node degrees sum to twice the polyline count.
    edges += degree === undefined ? 1 : degree / 2
  }
  return { bends, edges }
}

/** The box a point set spans, or `null` for the empty set. */
function spanOf(points: readonly Point[]): Box | null {
  const [first, ...rest] = points
  if (first === undefined) return null
  let box: Box = { minX: first.x, minY: first.y, maxX: first.x, maxY: first.y }
  for (const p of rest) {
    box = {
      minX: Math.min(box.minX, p.x),
      minY: Math.min(box.minY, p.y),
      maxX: Math.max(box.maxX, p.x),
      maxY: Math.max(box.maxY, p.y),
    }
  }
  return box
}

const steps = (v: Um): number => v / GRID

/** The extent of `points`, in square grid steps. Nothing drawn is zero area, not a refusal. */
function areaOf(points: readonly Point[]): number {
  const box = spanOf(points)
  if (box === null) return 0
  return steps(box.maxX - box.minX) * steps(box.maxY - box.minY)
}

function lengthOf(wires: readonly Wire[]): number {
  let total = 0
  for (const w of wires) total += Math.abs(w.b.x - w.a.x) + Math.abs(w.b.y - w.a.y)
  return steps(total)
}

/** The four measures of a canonical topology's wires, with the `edges` denominator summed per net. */
function measuresOfWires(wires: readonly Wire[], extent: readonly Point[], inter: number): SchematicMeasures {
  const nets = [...new Set(wires.map((w) => w.net))].sort()
  let bends = 0
  let edges = 0
  for (const net of nets) {
    const shape = shapeOfNet(wires.filter((w) => w.net === net))
    bends += shape.bends
    edges += shape.edges
  }
  return {
    bends,
    // With no edge there is no wire and therefore no bend, so zero is the MEASURED value here and
    // not a substituted one: `bends` is necessarily zero whenever `edges` is.
    bendsPerEdge: edges === 0 ? 0 : bends / edges,
    crossings: inter,
    wireLength: lengthOf(wires),
    occupiedArea: areaOf(extent),
  }
}

/**
 * Spec §1.4 rev 4: measures are taken over a CANONICAL topology, never over a raw segment list.
 *
 * **A REFUSED TOPOLOGY IS A REFUSAL HERE TOO, not four numbers with a caveat.** When
 * `canonicalTopology` reports an ambiguous overlap it is saying the wire topology has more than
 * one reading and none of them has been chosen; measuring one of them would publish a figure about
 * a drawing nobody picked, and the figure would look exactly like a figure about a drawing that
 * was.
 *
 * **`pins` IS READ, AND IT IS READ FOR THE AREA.** A block's extent is the ground its wires and
 * its pin ends cover: a placed unit whose pins reach beyond the last wire end occupies that space
 * whether a wire goes there or not, and an area taken over wire ends alone would shrink as a
 * drawing got more compact in wiring and no less wide in parts. The other three measures do not
 * read it, which is why `./measures.test.ts` drives the area with an empty pin list and with a
 * full one and asserts they differ.
 */
export function measuresOf(t: CanonicalTopology, pins: readonly PlacedPin[]): SchematicMeasures {
  if (!t.ok) {
    throw new Error(
      `the canonical topology was refused (${t.ambiguous.length} ambiguous overlap(s)), so these ` +
        "measures would be taken over a geometry with more than one reading and none chosen. It " +
        "is NOT measured anyway with a caveat: spec 1.4 revision 4 clause (d) refuses rather than " +
        "repairs, and a published figure about one arbitrary reading is indistinguishable from a " +
        "figure about a drawing somebody decided on. Fix the overlaps the topology named: " +
        t.ambiguous.join("; "),
    )
  }
  const extent = [...t.wires.flatMap((w) => [w.a, w.b]), ...pins.map((p) => p.at)]
  return measuresOfWires(t.wires, extent, crossings(t).length)
}

/**
 * The same four measures over a whole emitted sheet.
 *
 * **IT CANONICALISES, because a sheet's wires have not been.** A sheet composed of ELK blocks
 * carries wires that `lib/schgen/elk/adapt.ts` already made canonical, but a sheet of
 * template-drawn blocks has never been through `canonicalTopology` at all - and the measure must
 * mean one thing on both.
 *
 * **IT IS HANDED NO PINS, AND THE CONSEQUENCE IS EXACTLY ONE THING.** `SheetDrawing` carries
 * `PlacedSymbol`s, which know where a unit sits and what box it covers but not which net each pin
 * is on, so the pin list cannot be rebuilt here without the symbol library. For the EDGE count
 * this costs nothing: a node is a point whose degree is not two, which is a property of the
 * segments alone, and a pin sitting mid-run leaves a collinear degree-2 vertex either way. For the
 * AREA it is replaced by something stronger - `PlacedSymbol.box` is the placed box *including pin
 * tips*, so the symbols' boxes cover every pin end and more.
 *
 * **THE FRAMES ARE INCLUDED IN THE AREA AND THAT MAKES IT PARTLY A PACKER MEASURE.** §3.3 asks for
 * *"sheet extent actually used"*, and a frame is drawn ink; but `docs/known-gaps.md` **G207**
 * measured that the two packers give one sheet extents of 185.42 x 38.10 mm and 109.22 x 71.12 mm
 * for the SAME content, so a sheet's `occupiedArea` moves with `packSheet` and must never be read
 * as a property of how a block was drawn. The per-block figure is the one that is.
 */
export function sheetMeasuresOf(d: SheetDrawing): SchematicMeasures {
  const t = canonicalTopology({ placements: [], wires: d.wires, anchors: [] }, [])
  if (!t.ok) {
    throw new Error(
      `sheet ${d.sheet.id}: the canonical topology of its wires was refused (${t.ambiguous.length} ` +
        "ambiguous overlap(s)), so its four measures would be taken over a geometry with more than " +
        "one reading. It is refused rather than measured on one of them: " +
        t.ambiguous.join("; "),
    )
  }
  const corners = (b: Box): readonly Point[] => [
    { x: b.minX, y: b.minY },
    { x: b.maxX, y: b.maxY },
  ]
  const extent: Point[] = [
    ...t.wires.flatMap((w) => [w.a, w.b]),
    ...d.symbols.flatMap((s) => corners(s.box)),
    ...d.frames.flatMap((f) => corners(f.box)),
    ...d.powers.map((p) => p.at),
    ...d.labels.map((l) => l.at),
    ...d.junctions,
    ...d.noConnects,
    ...d.texts.map((x) => x.at),
  ]
  return measuresOfWires(t.wires, extent, crossings(t).length)
}

/**
 * The four measures as a line, with FIVE numbers and nothing that summarises them.
 *
 * **BENDS FIRST, THEN CROSSINGS** - the order the literature puts them in; see this module's
 * header for why that orders the report and weights nothing.
 *
 * **THERE IS NO SIXTH NUMBER AND NO DIGIT ANYWHERE ELSE IN THE LINE**, which is what makes
 * `./measures.test.ts`'s count of numeric tokens a check that can fail: a composite added to this
 * line, or a section reference like "3.3" spelled with digits, both turn it red.
 */
export function renderMeasures(m: SchematicMeasures): string {
  const whole = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(2))
  return [
    `bends ${whole(m.bends)}`,
    `bends/edge ${m.bendsPerEdge.toFixed(2)}`,
    `crossings ${whole(m.crossings)}`,
    `wire length ${whole(m.wireLength)} grid steps`,
    `occupied area ${m.occupiedArea.toFixed(2)} sq grid steps`,
  ].join("  ")
}
