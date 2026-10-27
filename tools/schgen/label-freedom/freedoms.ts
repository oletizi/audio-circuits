/**
 * **THE DEGREES OF FREEDOM ACTUALLY AVAILABLE TO A BLOCKED BLOCK's GLOBAL LABELS, MEASURED BY
 * RE-GRADING PERTURBED GEOMETRY WITH THE PRODUCTION CHECKER.**
 *
 * Research apparatus for Task 5 Step 3 of
 * `docs/superpowers/plans/2026-10-22-text-handling-research.md`. **This is a measurement and not a
 * fix.** Nothing here edits `lib/`, and the plan is research-only: a perturbation that clears a
 * block is recorded as an untried MECHANISM and not made.
 *
 * **WHY `checkLayout` RATHER THAN A RE-IMPLEMENTED OVERLAP TEST.** `lib/schgen/render/
 * layout-check.ts`'s `checkLayout(g, layout)` is a pure function of the subgraph and the layout, so
 * a perturbed `BlockLayout` can be handed to the GRADER THAT REFUSES THE BLOCK rather than to a
 * copy of part of it. Two things follow, and both matter:
 *
 * 1. Every relation the production pass grades is graded here - not just box overlap. §1.10 records
 *    that §1's own re-take covered the overlap subset only.
 * 2. **An electrically illegal perturbation CANNOT silently clear an overlap.** `checkLayout` runs
 *    `checkWireSafety`, `danglingWireEnds`, `componentProblems` and `anchorProblems`, so an anchor
 *    moved off its own net's wire, onto a foreign wire, onto a pin end, onto another anchor or to a
 *    wire crossing is REPORTED as a problem. A candidate counts as clearing a block only when the
 *    whole problem list is empty, which includes connectivity.
 *
 * **WHICH RULER.** The label boxes here are `lib/schgen/render/text-boxes.ts`'s - the `length x
 * GRID` estimate, which is the ruler that produces the refusals this task is measuring. §1's three
 * measured quantities are NOT re-driven here (they need a 2.9 MB font blob fetched outside the
 * repository and KiCad's Python bindings, so a figure taken under them would not be re-drivable
 * from a clean checkout). **The election between the three is the owner's, recorded as G265 clause
 * 4, and nothing here elects one.** What is reported instead is each candidate's CLEARANCE MARGIN,
 * so a reader can see whether a verdict turns on micrometres or on millimetres.
 */

import { checkLayout } from "../../../lib/schgen/render/layout-check.ts"
import { GRID, type Point, type Side } from "../../../lib/schgen/render/geometry.ts"
import { onSegment } from "../../../lib/schgen/render/connectivity.ts"
import { anchorsToSymbols, valuesAlong } from "../../../lib/schgen/render/power-text.ts"
import type { Anchor, BlockLayout, BlockSubgraph, Wire } from "../../../lib/schgen/render/block-types.ts"

export const SIDES: readonly Side[] = ["right", "left", "up", "down"]

/** A problem line that names a global label, and the label names it names. */
export function labelsIn(problem: string): readonly string[] {
  return [...problem.matchAll(/\blabel ([^\s]+) at \(/g)].map((m) => m[1] ?? "")
}

export const labelProblems = (problems: readonly string[]): readonly string[] => problems.filter((p) => labelsIn(p).length > 0)

/** The anchors of `layout` that `anchorsToSymbols` draws as global labels (the rest are power symbols). */
export function labelAnchorIndices(g: BlockSubgraph, layout: BlockLayout): readonly number[] {
  const { labels } = anchorsToSymbols(g, layout.anchors, valuesAlong(g.block.rendering))
  const byNet = new Set(labels.map((l) => l.net))
  return layout.anchors.flatMap((a, i) => (byNet.has(a.net) ? [i] : []))
}

const withAnchors = (layout: BlockLayout, anchors: readonly Anchor[]): BlockLayout => ({ ...layout, anchors })

const set = <T>(list: readonly T[], at: number, v: T): readonly T[] => list.map((x, i) => (i === at ? v : x))

/** Grid points on the axis-aligned segment `w`, ends included. */
function gridPointsOn(w: Wire): readonly Point[] {
  const out: Point[] = []
  if (w.a.x === w.b.x) {
    const [lo, hi] = [Math.min(w.a.y, w.b.y), Math.max(w.a.y, w.b.y)]
    for (let y = Math.ceil(lo / GRID) * GRID; y <= hi; y += GRID) out.push({ x: w.a.x, y })
  } else {
    const [lo, hi] = [Math.min(w.a.x, w.b.x), Math.max(w.a.x, w.b.x)]
    for (let x = Math.ceil(lo / GRID) * GRID; x <= hi; x += GRID) out.push({ x, y: w.a.y })
  }
  return out
}

const key = (p: Point): string => `${p.x},${p.y}`

export interface AnchorCandidates {
  /** Grid points on the segment(s) of the net that already carry the anchor - freedom 2. */
  readonly sameSegment: readonly Point[]
  /** Grid points on the net's OTHER segments - freedom 4's "which segment of a net it attaches to". */
  readonly otherSegments: readonly Point[]
}

/**
 * Where this net's anchor could sit without the wires moving: the grid points of its own net's
 * wires, split into the segment(s) the anchor is already on and the rest.
 *
 * **The split is the brief's, and the code reading behind it is in `connectivity.ts`'s own header:**
 * *"A label anchor also connects anywhere on a wire's interior."* So the repository's connectivity
 * model already admits every point below; the generator chooses one of them.
 */
export function anchorCandidates(layout: BlockLayout, anchor: Anchor): AnchorCandidates {
  const mine = layout.wires.filter((w) => w.net === anchor.net)
  const carrying = mine.filter((w) => onSegment(anchor.at, w.a, w.b))
  const on = new Set(carrying.flatMap((w) => gridPointsOn(w).map(key)))
  const same: Point[] = []
  const other: Point[] = []
  const seen = new Set<string>()
  for (const w of mine) {
    for (const p of gridPointsOn(w)) {
      const k = key(p)
      if (seen.has(k)) continue
      seen.add(k)
      ;(on.has(k) ? same : other).push(p)
    }
  }
  return { sameSegment: same, otherSegments: other }
}

/**
 * Freedom 3's bounded form: the segment the anchor sits at the end of, extended outward along its
 * own direction by `k` grid steps, with the anchor carried out to the new end.
 *
 * **It is bounded deliberately.** "Adjust the surrounding wire geometry" is unbounded in general -
 * this generator draws every wire - and an unbounded search would be a placement algorithm, which
 * is not this task's output. Lengthening a stub is the smallest geometry change that buys room, it
 * is what Task 3 found KiCad's `fitFieldsBetweenWires` does NOT do, and it is the row §4 found this
 * generator emptiest on. `null` when the anchor is not at a wire end, so there is nothing to extend.
 */
export function extendedStub(layout: BlockLayout, anchor: Anchor, k: number): { readonly layout: BlockLayout; readonly at: Point } | null {
  const at = layout.anchors.indexOf(anchor)
  if (at < 0) throw new Error("extendedStub was given an anchor that is not in this layout")
  const i = layout.wires.findIndex((w) => w.net === anchor.net && ((w.a.x === anchor.at.x && w.a.y === anchor.at.y) || (w.b.x === anchor.at.x && w.b.y === anchor.at.y)))
  if (i < 0) return null
  const w = layout.wires[i]
  if (w === undefined) return null
  const atA = w.a.x === anchor.at.x && w.a.y === anchor.at.y
  const far = atA ? w.b : w.a
  const dx = Math.sign(anchor.at.x - far.x)
  const dy = Math.sign(anchor.at.y - far.y)
  if (dx === 0 && dy === 0) return null
  const moved: Point = { x: anchor.at.x + dx * k * GRID, y: anchor.at.y + dy * k * GRID }
  const grown: Wire = atA ? { ...w, a: moved } : { ...w, b: moved }
  return {
    layout: { ...layout, wires: set(layout.wires, i, grown), anchors: set(layout.anchors, at, { ...anchor, at: moved }) },
    at: moved,
  }
}

export interface SweepResult {
  /** How many candidates were graded. */
  readonly tried: number
  /** The best candidate's total problem count, and its description. */
  readonly bestTotal: number
  readonly bestTotalAt: string
  /**
   * The problems the best-by-total candidate still has.
   *
   * **It is reported because the first version of this probe reported only the count, and the count
   * hid the most consequential thing it found**: on several blocks the best anchor relocation clears
   * every label overlap and leaves ONE problem, and that problem is `danglingWireEnds` complaining
   * that the wire the anchor left has an end touching nothing. That is a rule of THIS repository,
   * not of KiCad, and a count could not say so.
   */
  readonly bestTotalProblems: readonly string[]
  /** The best candidate's count of problems that name a global label. */
  readonly bestLabel: number
  readonly bestLabelAt: string
  /**
   * **THE FEWEST TOTAL PROBLEMS REACHED BY ANY CANDIDATE THAT CLEARS EVERY LABEL PROBLEM**, and that
   * candidate's remaining problems. `Infinity` and `[]` when no candidate cleared the label problems.
   *
   * **This exists because two simpler metrics both answered the question wrongly, in opposite
   * directions, and the second was found only by driving it.** `G269` asks *"once relocation has
   * removed the label overlaps, what is left"*:
   *
   * - **best by TOTAL under-counts it.** On `tp-follower` the lowest-total candidate is the
   *   UNPERTURBED layout, so the residue reported is the original overlap rather than anything
   *   relocation leaves. A reviewer found the entry said two blocks where three was right.
   * - **best by LABEL COUNT over-counts it**, and that was measured here: many candidates tie at
   *   zero label problems, the accumulator keeps whichever arrives first, and `anchorAndSide`
   *   iterates points before sides - so a relocation that strands a wire end beats an in-place side
   *   change that leaves nothing at all. It reported EIGHT blocks, five of which are the Pultec
   *   junction blocks that a side change alone draws cleanly.
   *
   * **Neither failure is visible in a count**; both are visible in the residue, which is why the
   * residue is carried rather than the number. This field is tie-free: it minimises TOTAL over the
   * candidates that clear the labels, so an in-place side change reaching zero always wins.
   */
  readonly clearTotal: number
  readonly clearProblems: readonly string[]
  /**
   * The problems the best-by-LABEL-COUNT candidate still has - **kept only so that the metric which
   * OVER-counted the finding stays driven rather than described.** The summary prints what all three
   * metrics give, and a number reconstructed in prose after the fact would be unfalsifiable.
   */
  readonly bestLabelProblems: readonly string[]
  /** True when some candidate produced an EMPTY problem list - the block draws. */
  readonly clearsBlock: boolean
  /** True when some candidate produced no problem naming a global label. */
  readonly clearsLabels: boolean
  /** Set when the candidate space was larger than the cap and was not exhausted. */
  readonly capped: string
}

const EMPTY: SweepResult = {
  tried: 0,
  bestTotal: Number.POSITIVE_INFINITY,
  bestTotalAt: "(nothing tried)",
  bestTotalProblems: [],
  bestLabel: Number.POSITIVE_INFINITY,
  bestLabelAt: "(nothing tried)",
  clearTotal: Number.POSITIVE_INFINITY,
  clearProblems: [],
  bestLabelProblems: [],
  clearsBlock: false,
  clearsLabels: false,
  capped: "",
}

/** Grade every candidate layout in `candidates` and keep the best by total problems and by label problems. */
export function sweep(g: BlockSubgraph, candidates: Iterable<{ readonly what: string; readonly layout: BlockLayout }>, cap: number): SweepResult {
  let r = EMPTY
  for (const c of candidates) {
    if (r.tried >= cap) return { ...r, capped: `stopped at the cap of ${cap} candidates` }
    let problems: readonly string[]
    try {
      problems = checkLayout(g, c.layout).map((f) => f.what)
    } catch (e) {
      // A perturbation the grader cannot even grade is recorded as such rather than skipped: a
      // candidate that vanishes quietly would make a clearance look more reachable than it is.
      problems = [`checkLayout THREW on this candidate: ${e instanceof Error ? e.message : String(e)}`]
    }
    const labels = labelProblems(problems).length
    const next = { ...r, tried: r.tried + 1 }
    r = {
      ...next,
      bestTotal: problems.length < r.bestTotal ? problems.length : r.bestTotal,
      bestTotalAt: problems.length < r.bestTotal ? c.what : r.bestTotalAt,
      bestTotalProblems: problems.length < r.bestTotal ? problems : r.bestTotalProblems,
      bestLabel: labels < r.bestLabel ? labels : r.bestLabel,
      bestLabelAt: labels < r.bestLabel ? c.what : r.bestLabelAt,
      bestLabelProblems: labels < r.bestLabel ? problems : r.bestLabelProblems,
      clearTotal: labels === 0 && problems.length < r.clearTotal ? problems.length : r.clearTotal,
      clearProblems: labels === 0 && problems.length < r.clearTotal ? problems : r.clearProblems,
      clearsBlock: r.clearsBlock || problems.length === 0,
      clearsLabels: r.clearsLabels || labels === 0,
    }
  }
  return r
}

/** Every assignment of the four sides to the `n` label anchors named by `idx`, as perturbed layouts. */
export function* sideAssignments(layout: BlockLayout, idx: readonly number[]): Generator<{ what: string; layout: BlockLayout }> {
  const total = 4 ** idx.length
  for (let code = 0; code < total; code += 1) {
    let anchors = layout.anchors
    const parts: string[] = []
    let c = code
    for (const i of idx) {
      const side = SIDES[c % 4] ?? "right"
      c = Math.floor(c / 4)
      const a = anchors[i]
      if (a === undefined) throw new Error(`anchor index ${i} is not in this layout`)
      anchors = set(anchors, i, { ...a, side })
      parts.push(`${a.net}:${side}`)
    }
    yield { what: parts.join(" "), layout: withAnchors(layout, anchors) }
  }
}

/** Every (anchor point, side) for ONE label anchor, with every other anchor left as laid out. */
export function* anchorAndSide(
  layout: BlockLayout,
  i: number,
  points: readonly Point[],
  sides: readonly Side[],
): Generator<{ what: string; layout: BlockLayout }> {
  const a = layout.anchors[i]
  if (a === undefined) throw new Error(`anchor index ${i} is not in this layout`)
  for (const p of points) {
    for (const side of sides) {
      yield {
        what: `${a.net} at (${p.x / 1000}, ${p.y / 1000}) side ${side}`,
        layout: withAnchors(layout, set(layout.anchors, i, { ...a, at: p, side })),
      }
    }
  }
}
