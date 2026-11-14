/**
 * WHAT JOINS SEPARATE PIECES OF THE POUR: ground tracks and vias, since fill by
 * definition does not.
 *
 * `docs/known-gaps.md` G313 records the owner being asked about "the narrowest
 * bridge between pour regions". Regions are the separate pieces of fill KiCad
 * saved on a layer; what a router uses to stitch two of them together is a track
 * (or a via to another layer), and neither is copper in the fill. So the bridge
 * is read here, from the tracks, and not from the fill - which is why the fill's
 * own constriction figure is `narrowestNeckMm` in `./pour-bridge.ts`, under a
 * name that does not promise the owner's quantity.
 *
 * A TRACK JOINS REGIONS when its centreline touches two or more separate
 * polygons on its layer, either by itself or through a chain of ground tracks
 * that share endpoints (within 1 micron). Its width is reported as the narrowest
 * track in the chain, which is NOT necessarily the bottleneck of the path
 * through it: a chain is not walked as a graph. An arc is read as a polyline
 * through its start, midpoint and end, so one that bulges past them is not
 * followed round the bulge.
 *
 * A VIA LINKS when its centre lies in fill of two or more different polygons
 * across the pour layers; this is what ties a back-layer island to a front-layer
 * pour. It carries no width, because a via's neck is not a track width and
 * reporting its diameter as one would be a number with the wrong meaning.
 *
 * NOT READ: zone-to-zone joins across layers by anything but a via, and tracks
 * on the layers the pour is not on.
 */
import type { Pt } from "./pour-geometry.ts"
import type { GroundPour } from "./pour-read.ts"
import type { GroundTrack, GroundVia } from "./pour-read-pads.ts"
import { SAMPLE_STEP_MM, polygonAt } from "./pour-sample.ts"
import { measured, unavailable } from "./pour-types.ts"
import type { Reading, RegionJoin, ViaLink } from "./pour-types.ts"

const SHARED_ENDPOINT_MM = 0.001

function alongPath(path: readonly Pt[]): readonly Pt[] {
  const out: Pt[] = []
  for (let i = 0; i + 1 < path.length; i += 1) {
    const a = path[i]
    const b = path[i + 1]
    if (a === undefined || b === undefined) continue
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / SAMPLE_STEP_MM))
    for (let k = 0; k <= steps; k += 1) out.push([a[0] + ((b[0] - a[0]) * k) / steps, a[1] + ((b[1] - a[1]) * k) / steps])
  }
  return out
}

function endpoints(track: GroundTrack): readonly Pt[] {
  const first = track.path[0]
  const last = track.path[track.path.length - 1]
  return first === undefined || last === undefined ? [] : [first, last]
}

export function regionJoins(pour: GroundPour, tracks: readonly GroundTrack[]): readonly RegionJoin[] {
  const joins: RegionJoin[] = []
  for (const layer of pour.layers) {
    const here = tracks.filter((t) => t.layer === layer)
    const parent = here.map((_, i) => i)
    const find = (i: number): number => ((parent[i] ?? i) === i ? i : (parent[i] = find(parent[i] ?? i)))
    for (let i = 0; i < here.length; i += 1) {
      for (let j = i + 1; j < here.length; j += 1) {
        const a = here[i]
        const b = here[j]
        if (a === undefined || b === undefined) continue
        const shared = endpoints(a).some((p) => endpoints(b).some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= SHARED_ENDPOINT_MM))
        if (shared) parent[find(i)] = find(j)
      }
    }
    const groups = new Map<number, number[]>()
    here.forEach((_, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), i]))
    for (const members of groups.values()) {
      const touched = new Set<number>()
      let width = Infinity
      for (const i of members) {
        const track = here[i]
        if (track === undefined) continue
        width = Math.min(width, track.widthMm)
        for (const p of alongPath(track.path)) {
          const id = polygonAt(pour, layer, p)
          if (id >= 0) touched.add(id)
        }
      }
      if (touched.size >= 2) joins.push({ layer, polygons: [...touched].sort((a, b) => a - b), widthMm: width })
    }
  }
  return joins
}

export function viaLinks(pour: GroundPour, vias: readonly GroundVia[]): readonly ViaLink[] {
  const links: ViaLink[] = []
  for (const via of vias) {
    const ids = new Set(pour.layers.map((layer) => polygonAt(pour, layer, via.at)).filter((id) => id >= 0))
    if (ids.size >= 2) links.push({ at: via.at, polygons: [...ids].sort((a, b) => a - b) })
  }
  return links
}

/** The narrowest join between regions that really are separate, or why there is none to report. */
export function narrowestBridge(
  regionsByLayer: ReadonlyMap<string, number>,
  joins: readonly RegionJoin[],
): Reading<number> {
  const separate = [...regionsByLayer].filter(([, count]) => count > 1).map(([layer]) => layer)
  if (separate.length === 0) {
    return unavailable("every pour layer is one connected piece of fill, so there are no separate regions to bridge.")
  }
  const relevant = joins.filter((j) => separate.includes(j.layer))
  if (relevant.length === 0) {
    return unavailable(
      `${separate.join(" and ")} ${separate.length === 1 ? "is" : "are"} in separate pieces of fill and no ground track joins ` +
        "them. Vias, if any, are listed in viaLinks; they carry no width.",
    )
  }
  return measured(Math.min(...relevant.map((j) => j.widthMm)))
}
