/**
 * WHICH PIECES OF GROUND FILL ARE ONE ELECTRICAL PIECE, so that "the loop touches
 * three pieces of fill" can be told from "the loop touches three pieces that
 * are really one" - the difference between a pour that is shredded and one that
 * merely has voids in it.
 *
 * A COUNT OF POLYGONS IS NOT CONNECTIVITY. KiCad saves one polygon per connected
 * piece of fill on a layer, so two polygons are, by construction, not joined BY
 * FILL; they may still be joined by a ground track, a ground via, a through-hole
 * ground pad (copper on every layer, so it ties together whatever fill it sits in
 * on all of them), or by fill on the other layer. Reporting only the count would
 * hand a reader a number that looks like an answer and is not.
 *
 * What is joined, here: polygons a ground track chain touches (`./pour-joins.ts`),
 * polygons a ground via sits in on two layers, and the polygons the ring round
 * each ground pad touches on the layers that pad is on. Anything that joins
 * ground by a route this tool does not read is not counted, so `connectedGroups`
 * can overstate separation but never joins two pieces that nothing joins.
 */
import type { GroundPour } from "./pour-read.ts"
import type { BoardPad } from "./pour-read-pads.ts"
import { ringReadings } from "./pour-pads.ts"
import type { RegionJoin, ViaLink } from "./pour-types.ts"

/** Polygon id -> the id of its electrical group. */
export function groundGroups(
  pour: GroundPour,
  groundPads: readonly BoardPad[],
  joins: readonly RegionJoin[],
  links: readonly ViaLink[],
): ReadonlyMap<number, number> {
  const parent = new Map<number, number>(pour.polygons.map((p) => [p.id, p.id]))
  const find = (i: number): number => {
    const p = parent.get(i) ?? i
    if (p === i) return i
    const root = find(p)
    parent.set(i, root)
    return root
  }
  const join = (ids: readonly number[]): void => {
    const [first, ...rest] = ids
    if (first === undefined) return
    for (const id of rest) parent.set(find(id), find(first))
  }
  for (const j of joins) join(j.polygons)
  for (const l of links) join(l.polygons)
  for (const pad of groundPads) {
    const touched = new Set<number>()
    for (const r of ringReadings(pour, pad).values()) for (const id of r.polygons) touched.add(id)
    join([...touched])
  }
  return new Map(pour.polygons.map((p) => [p.id, find(p.id)]))
}
