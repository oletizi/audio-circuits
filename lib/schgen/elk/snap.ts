/**
 * SPEC §1.4 OBLIGATION 1: GRID SNAPPING, CHECKED FOR IDENTITY COLLAPSE RATHER THAN ASSUMED TO
 * PRESERVE IT.
 *
 * Hand-written for Task 13 of the M1 schematic-authoring plan.
 *
 * **THE CLAIM THIS EXISTS FOR** (spec §1.4): *"ELK coordinates are continuous; KiCad's electrical
 * grid is 1.27 mm. Snapping two distinct parallel segments onto the same grid line makes them
 * collinear and overlapping, which `schgen`'s wire-safety refusal already treats as a defect - and
 * if both land on a pin end they become one net. The contract is that snapping is checked for
 * identity collapse, not assumed to preserve it: after snapping, the set of distinct wire
 * geometries and the set of net memberships must both be unchanged from before snapping, and a
 * collapse refuses."*
 *
 * So this module computes **both** sets before and after, and the refusal names what merged.
 *
 * **IT REFUSES AND NEVER REPAIRS**, which is obligation 5's discipline reaching obligation 1: a
 * nudge that un-merges two segments is a second layout engine with no gate of its own, written at
 * the point in the pipeline with the least information. `adaptElkLayout` turns the refusal into an
 * `invalid-geometry` mismatch naming the pairs.
 */

import { GRID, samePoint, pointKey, type Point, type Um } from "../render/geometry.ts"
import { connectedComponents, fmtPoint, type ConnItem } from "../render/connectivity.ts"
import type { Anchor, BlockLayout, Placement, Wire } from "../render/block-types.ts"

export type SnapResult =
  | {
      readonly ok: true
      readonly placements: readonly Placement[]
      readonly wires: readonly Wire[]
      readonly anchors: readonly Anchor[]
    }
  /** Snapping merged distinct geometry or changed a net's membership: named pairs, and a refusal. */
  | { readonly ok: false; readonly collapsed: readonly string[] }

/**
 * One coordinate on the 1.27 mm grid: the NEAREST multiple, with a half-step going to the larger
 * value (`Math.round`'s rule, which is toward +infinity on both signs and therefore the same rule
 * everywhere on the sheet).
 *
 * **WHY NEAREST AND NOT `gridCeil`/`gridFloor`, which this module's inputs list offers.** Both of
 * those are in `render/geometry.ts` and both are used by the ported templates for SIZING - a frame
 * big enough, a column far enough. Neither is right for moving a point that is already where the
 * router put it: a uniform bias moves every coordinate the same way, which translates the whole
 * drawing by up to a grid step and is just as able to push one point across another's line as
 * nearest is, while moving every point further. Nearest minimises the displacement, which minimises
 * what can change - and the identity check below is what establishes whether anything did, so the
 * choice is not load-bearing for correctness. It is recorded because it is a choice.
 */
export function snapCoordinate(v: Um): Um {
  return Math.round(v / GRID) * GRID + 0
}

export function snapPoint(p: Point): Point {
  return { x: snapCoordinate(p.x), y: snapCoordinate(p.y) }
}

/** A wire's geometry, independent of its net and of which end was called `a`. */
function geometryKey(w: Wire): string {
  const ends = [pointKey(w.a), pointKey(w.b)].sort()
  return `${ends[0] ?? ""}|${ends[1] ?? ""}`
}

/**
 * The connectivity partition as a comparable value: one entry per connected component, holding the
 * sorted nets in it, with the entries themselves sorted.
 *
 * **WHAT "NET MEMBERSHIP" MEANS HERE, AND WHY IT IS NOT THE NET NAMES.** The names on the wires
 * never change under snapping - snapping moves coordinates. What CAN change is which items the
 * geometry joins, and that is what the obligation is about: *"if both land on a pin end they become
 * one net."* So the quantity compared is the partition, and two nets that were in separate
 * components and are now in one is a changed membership even though every wire still carries the
 * name it had.
 *
 * **IT IS COMPUTED OVER THE LAYOUT'S OWN ITEMS ONLY** - wires and anchors - because `snapToGrid`'s
 * declared input is a `BlockLayout` and a pin end needs the `BlockSubgraph` to compute. That is a
 * real limit and it is stated rather than papered over: a collapse visible only at a pin end is
 * caught downstream, by `checkLayout` after snapping, which `adaptElkLayout` runs and which reads
 * the subgraph. A placement that moved onto another placement's pins is `checkWireSafety`'s
 * *"pin end … coincides with pin end …"* there. What this function owns is the collapse that is
 * visible in the layout alone, and it owns it before anything else looks at the geometry.
 */
function partition(wires: readonly Wire[], anchors: readonly Anchor[]): readonly string[] {
  const items: ConnItem[] = [
    ...wires.map((w, i): ConnItem => ({ kind: "wire", a: w.a, b: w.b, net: w.net, what: `wire ${i}` })),
    ...anchors.map((a, i): ConnItem => ({ kind: "anchor", at: a.at, net: a.net, what: `anchor ${a.net} ${i}` })),
  ]
  return connectedComponents(items)
    .map((c) => [...c.nets].sort().join("+"))
    .sort()
}

/** Every pair of wires that became one geometry, named by index with the geometry they share. */
function mergedGeometries(before: readonly Wire[], after: readonly Wire[]): readonly string[] {
  const byKey = new Map<string, number[]>()
  after.forEach((w, i) => {
    const key = geometryKey(w)
    const seen = byKey.get(key)
    if (seen === undefined) byKey.set(key, [i])
    else seen.push(i)
  })
  const out: string[] = []
  for (const [, indices] of byKey) {
    if (indices.length < 2) continue
    for (let i = 0; i < indices.length; i += 1) {
      for (let j = i + 1; j < indices.length; j += 1) {
        const a = indices[i]
        const b = indices[j]
        if (a === undefined || b === undefined) continue
        const wa = before[a]
        const wb = before[b]
        const after_ = after[a]
        if (wa === undefined || wb === undefined || after_ === undefined) continue
        // Two wires that were ALREADY one geometry before snapping are not a snap collapse: they
        // are duplicate input, which `canonicalTopology` deduplicates and reports. Only a pair
        // that snapping brought together is named here, so the two defects stay distinguishable.
        if (geometryKey(wa) === geometryKey(wb)) continue
        out.push(
          `wire ${a} (net ${wa.net}, ${fmtPoint(wa.a)}-${fmtPoint(wa.b)}) and wire ${b} (net ${wb.net}, ` +
            `${fmtPoint(wb.a)}-${fmtPoint(wb.b)}) snapped onto the same geometry ` +
            `${fmtPoint(after_.a)}-${fmtPoint(after_.b)}`,
        )
      }
    }
  }
  return out
}

/**
 * Every point of `l` on the 1.27 mm grid, or a refusal naming what snapping merged.
 *
 * Three ways it refuses, each a distinct defect and each named as itself:
 *
 * 1. **a wire became zero-length** - both its ends snapped to one point, so a segment the router
 *    drew is gone. It is not dropped: a vanished wire is a connection the drawing no longer carries,
 *    and `canonicalTopology`'s zero-length handling is about segments ELK itself returned degenerate
 *    (measured at 1-8 per whole-circuit drawing), which is a different thing from one this step
 *    destroyed;
 * 2. **two distinct wires became one geometry** - obligation 1's own sentence;
 * 3. **the connectivity partition changed** - two pieces that were apart now touch, or the reverse.
 */
export function snapToGrid(l: BlockLayout): SnapResult {
  const placements = l.placements.map((p): Placement => ({ ...p, at: snapPoint(p.at) }))
  const wires = l.wires.map((w): Wire => ({ ...w, a: snapPoint(w.a), b: snapPoint(w.b) }))
  const anchors = l.anchors.map((a): Anchor => ({ ...a, at: snapPoint(a.at) }))

  const collapsed: string[] = []

  wires.forEach((w, i) => {
    if (!samePoint(w.a, w.b)) return
    const before = l.wires[i]
    if (before === undefined) return
    collapsed.push(
      `wire ${i} (net ${w.net}) ran ${fmtPoint(before.a)}-${fmtPoint(before.b)} and snapped to zero ` +
        `length at ${fmtPoint(w.a)}`,
    )
  })

  collapsed.push(...mergedGeometries(l.wires, wires))

  // The partition comparison needs well-shaped wires on both sides (connectedComponents asserts
  // orthogonal and non-degenerate), so it runs only once the zero-length arm above has had its say.
  if (collapsed.length === 0) {
    const was = partition(l.wires, l.anchors)
    const now = partition(wires, anchors)
    if (was.join(" / ") !== now.join(" / ")) {
      collapsed.push(
        `snapping changed which nets the geometry joins: ${was.length} connected piece(s) ` +
          `[${was.join(", ")}] became ${now.length} [${now.join(", ")}]`,
      )
    }
  }

  if (collapsed.length > 0) return { ok: false, collapsed }
  return { ok: true, placements, wires, anchors }
}
