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
 * that share endpoints (within 1 micron). Its width is the bottleneck at which the
 * chain makes them one (below). An arc is read as a polyline through its start,
 * midpoint and end, so one that bulges past them is not followed round the bulge.
 *
 * A VIA LINKS when its centre lies in fill of two or more different polygons
 * on the layers it pierces (its declared span and everything between, in stack
 * order); this is what ties a back-layer island to a front-layer
 * pour. It carries no width, because a via's neck is not a track width and
 * reporting its diameter as one would be a number with the wrong meaning.
 *
 * NOT READ: zone-to-zone joins across layers by anything but a via, and tracks
 * on the layers the pour is not on.
 *
 * **REUSE, CHECKED AND DECLINED, WITH THE REASON.** The engine ships the real
 * connectivity oracle for exactly this question: `py_router/kicad_exact_fill.py`
 * `exact_clusters`, which clusters a net's fill, tracks, vias and pads with a
 * deterministic union-find ("len(clusters) > 1 => KiCad demands links"). This
 * repository's rule is to reuse rather than invent, so declining it needs a stated
 * reason. Two. (1) `kicad_exact_fill.refill_islands` runs its refill through
 * `find_kicad_python()`, which returns KiCad's OWN bundled interpreter (measured:
 * the Python.framework inside KiCad.app), not the engine's venv - and every engine
 * invocation in this plan strips `PYTHONHOME` and `PYTHONPATH`, so reusing it walks
 * into a known environment hazard for one module's worth of benefit. (2) What it
 * would replace is this file's track, via and pad joins over a board that is
 * already saved and refilled, which is read here directly in this repository's
 * language and is mutation-tested. If a later task needs the oracle's pad-to-fill
 * and nearest-approach geometry as well, that is the point to revisit.
 */
import type { Pt } from "./pour-geometry.ts"
import { PourRefusal } from "./pour-refusal.ts"
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

/**
 * Ground track chains that join two or more separate pieces of fill on a layer,
 * each with the width at which they are joined.
 *
 * **THE WIDTH IS THE BOTTLENECK, NOT THE NARROWEST TRACK ANYWHERE IN THE CHAIN.**
 * Tracks are switched on from the widest down, each joining the tracks it shares an
 * endpoint with and the fill it touches; the width reported is that of the track
 * whose switching-on first made all the chain's pieces of fill one. A dead-end stub
 * hanging off a bridge never joins two pieces of fill, so it never sets the width:
 * two 0.5 mm tracks bridging two pieces still read 0.5 with a 0.2 mm stub off the
 * shared endpoint, where "the narrowest track in the chain" read 0.2. And two
 * parallel tracks from a shared endpoint that each bridge the same two pieces read
 * the WIDER one (1.0 mm and 0.2 mm read 1.0): it read 0.2 until a reviewer's
 * question was built as a test, because the merge took the narrower branch's width.
 */
export function regionJoins(pour: GroundPour, tracks: readonly GroundTrack[]): readonly RegionJoin[] {
  const joins: RegionJoin[] = []
  for (const layer of pour.layers) {
    const here = tracks.filter((t) => t.layer === layer)
    const order = here.map((_, i) => i).sort((i, j) => (here[j]?.widthMm ?? 0) - (here[i]?.widthMm ?? 0))
    // Chains are components of TRACKS joined by shared endpoints. They are deliberately not merged through the
    // fill they touch: two separate tracks bridging the same two pieces are two bridges, each at its own width.
    const parent = here.map((_, i) => i)
    const fill = here.map((t) => {
      const ids = new Set<number>()
      for (const p of alongPath(t.path)) {
        const id = polygonAt(pour, layer, p)
        if (id >= 0) ids.add(id)
      }
      return ids
    })
    const bottleneck = new Map<number, number>()
    const find = (i: number): number => ((parent[i] ?? i) === i ? i : (parent[i] = find(parent[i] ?? i)))
    const active: number[] = []
    for (const i of order) {
      const track = here[i]
      if (track === undefined) continue
      active.push(i)
      // A single track that already touches two pieces of fill joins them at its own width.
      if ((fill[i]?.size ?? 0) >= 2) bottleneck.set(i, track.widthMm)
      for (const j of active) {
        const other = here[j]
        if (j === i || other === undefined || find(i) === find(j)) continue
        const shared = endpoints(track).some((p) => endpoints(other).some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= SHARED_ENDPOINT_MM))
        if (!shared) continue
        const [ra, rb] = [find(i), find(j)]
        const [fa, fb] = [fill[ra] ?? new Set<number>(), fill[rb] ?? new Set<number>()]
        const union = new Set([...fa, ...fb])
        const [wa, wb] = [bottleneck.get(ra), bottleneck.get(rb)]
        // Which pieces of fill each side already joins decides the width of the whole. (A set of two or more
        // pieces always has a width, so a missing one means fewer than two pieces and nothing to carry.)
        //  - the same pieces both ways (two parallel tracks from a shared endpoint): the WIDER way across, never the narrower;
        //  - this side's pieces contain the other's: this side's width, the other joins nothing more;
        //  - the other side's contain this one's: the surviving root keeps its own width;
        //  - neither contains the other: this track is what first joins them, and that is the width.
        //    (Tracks are switched on widest first, so this one is never wider than anything already joined: its width is the minimum.)
        const survivor = rb
        parent[ra] = survivor
        fill[survivor] = union
        if (union.size === fa.size && union.size === fb.size) {
          if (wa !== undefined && wb !== undefined) bottleneck.set(survivor, Math.max(wa, wb))
        } else if (union.size === fa.size) {
          if (wa !== undefined) bottleneck.set(survivor, wa)
        } else if (union.size !== fb.size) {
          bottleneck.set(survivor, track.widthMm)
        }
      }
    }
    for (const root of new Set(here.map((_, i) => find(i)))) {
      const ids = fill[root] ?? new Set<number>()
      const width = bottleneck.get(root)
      if (ids.size >= 2 && width !== undefined) joins.push({ layer, polygons: [...ids].sort((x, y) => x - y), widthMm: width })
    }
  }
  return joins
}

/**
 * Ground vias whose centre lies in fill of two or more polygons ON THE LAYERS THE
 * VIA PIERCES: its declared span and every pour layer between its two ends in the
 * stack. A blind via from F.Cu to In1.Cu does not touch a B.Cu pour, and linking it
 * to one would join pieces of fill that nothing joins.
 */
export function viaLinks(pour: GroundPour, vias: readonly GroundVia[], copperStack: readonly string[]): readonly ViaLink[] {
  const links: ViaLink[] = []
  for (const via of vias) {
    const from = copperStack.indexOf(via.span[0])
    const to = copperStack.indexOf(via.span[1])
    if (from === -1 || to === -1) {
      throw new PourRefusal("board-shape", `a ground via spans ${via.span[0]} to ${via.span[1]}, and one of them is not a copper layer of this board.`)
    }
    const pierced = copperStack.slice(Math.min(from, to), Math.max(from, to) + 1)
    const ids = new Set(pour.layers.filter((l) => pierced.includes(l)).map((layer) => polygonAt(pour, layer, via.at)).filter((id) => id >= 0))
    if (ids.size >= 2) links.push({ at: via.at, polygons: [...ids].sort((x, y) => x - y) })
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
