/**
 * THE NARROWEST NECK BETWEEN TWO BODIES OF A POUR, measured on a raster of the
 * filled copper - and what that number does and does not claim.
 *
 * **WHAT IS MEASURED.** Every filled polygon KiCad saved for one layer is
 * rasterised into a grid of `RESOLUTION_MM` pixels. Each copper pixel is given
 * its distance to the nearest non-copper pixel, which is the radius of the
 * largest disc centred on it that stays inside the copper. Pixels are then
 * visited from the widest outward, joining neighbours into bodies as they go:
 * the pixel that first joins two bodies sits on the widest path between them,
 * and its radius is the half-width of the narrowest point on that path. That is
 * the figure reported, as a width: the neck that the best connection between the
 * two bodies cannot be wider than.
 *
 * **WHAT COUNTS AS TWO BODIES.** A body is a copper area at least
 * `NOISE_FLOOR_PX` pixels wider (in radius) than the neck that joins it. That
 * constant is the resolution of this measuring technique, not an acceptance
 * criterion: without one, the ripple in a uniformly wide strip - a pixel of
 * quantisation here and there - would read as a string of bodies joined by
 * necks one pixel narrower than themselves, and the narrowest of them would be
 * the strip's own width. It decides what the figure resolves, and it is reported
 * with the result as `resolutionMm`. NOTHING HERE COMPARES THE RESULT TO A LIMIT.
 * The owner declined to set one (`docs/known-gaps.md` G313) and an agent may not
 * author the criteria for the artifact it is producing.
 *
 * **WHAT IT DOES NOT SEE.** Only fill. A track or a via that joins two bodies of
 * pour is not copper in the fill, so it is not a bridge here; a pour whose bodies
 * are joined only by a track reports them as separate regions. And a body that is
 * not joined to any other has no bridge, so a layer holding a single body reports
 * `null` for it: there is no pair to join, which is a different statement from a
 * neck of width zero.
 *
 * **ACCURACY.** A width is read off an integer pixel grid, so it can sit up to
 * one pixel (`resolutionMm`) under the true neck: a disc centred on a pixel
 * centre cannot always be centred on the true medial axis. It is never read over.
 */
import type { Pt } from "./pour-geometry.ts"

export const RESOLUTION_MM = 0.05
export const NOISE_FLOOR_PX = 2

export interface LayerBridge {
  /** The narrowest neck between two bodies on this layer, or null when there is no pair of bodies to join. */
  readonly narrowestBridgeMm: number | null
  /** Connected pieces of fill on this layer: bodies with NO copper joining them count separately. */
  readonly regions: number
}

interface Grid {
  readonly w: number
  readonly h: number
  readonly x0: number
  readonly y0: number
  readonly inside: Uint8Array
}

function rasterise(polygons: readonly (readonly Pt[])[], resolution: number): Grid {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const poly of polygons) {
    for (const [x, y] of poly) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  const x0 = minX - 2 * resolution
  const y0 = minY - 2 * resolution
  const w = Math.ceil((maxX - x0) / resolution) + 2
  const h = Math.ceil((maxY - y0) / resolution) + 2
  const inside = new Uint8Array(w * h)
  for (const poly of polygons) {
    const rows = new Map<number, number[]>()
    for (let i = 0; i < poly.length; i += 1) {
      const a = poly[i]
      const b = poly[(i + 1) % poly.length]
      if (a === undefined || b === undefined || a[1] === b[1]) continue
      const lo = Math.min(a[1], b[1])
      const hi = Math.max(a[1], b[1])
      // Rows whose centre line y lies in [lo, hi).
      const first = Math.ceil((lo - y0) / resolution - 0.5)
      const last = Math.ceil((hi - y0) / resolution - 0.5) - 1
      for (let row = first; row <= last; row += 1) {
        const y = y0 + (row + 0.5) * resolution
        const x = a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1])
        const at = rows.get(row)
        if (at === undefined) rows.set(row, [x])
        else at.push(x)
      }
    }
    for (const [row, xs] of rows) {
      xs.sort((p, q) => p - q)
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const from = Math.ceil(((xs[k] ?? 0) - x0) / resolution - 0.5)
        const to = Math.ceil(((xs[k + 1] ?? 0) - x0) / resolution - 0.5) - 1
        for (let col = Math.max(0, from); col <= Math.min(w - 1, to); col += 1) {
          inside[row * w + col] = 1
        }
      }
    }
  }
  return { w, h, x0, y0, inside }
}

/** Squared distance from every copper pixel to the nearest non-copper one (Felzenszwalb-Huttenlocher, exact). */
function squaredDistances(grid: Grid): Float64Array {
  const { w, h, inside } = grid
  const far = 1e20
  const d = new Float64Array(w * h)
  for (let i = 0; i < d.length; i += 1) d[i] = inside[i] === 1 ? far : 0
  const n = Math.max(w, h)
  const f = new Float64Array(n)
  const out = new Float64Array(n)
  const v = new Int32Array(n)
  const z = new Float64Array(n + 1)

  function pass(length: number): void {
    let k = 0
    v[0] = 0
    z[0] = -far
    z[1] = far
    for (let q = 1; q < length; q += 1) {
      let s = 0
      for (;;) {
        const p = v[k] ?? 0
        s = ((f[q] ?? 0) + q * q - ((f[p] ?? 0) + p * p)) / (2 * q - 2 * p)
        if (s <= (z[k] ?? 0) && k > 0) k -= 1
        else break
      }
      k += 1
      v[k] = q
      z[k] = s
      z[k + 1] = far
    }
    k = 0
    for (let q = 0; q < length; q += 1) {
      while ((z[k + 1] ?? far) < q) k += 1
      const p = v[k] ?? 0
      out[q] = (q - p) * (q - p) + (f[p] ?? 0)
    }
  }

  for (let x = 0; x < w; x += 1) {
    for (let y = 0; y < h; y += 1) f[y] = d[y * w + x] ?? 0
    pass(h)
    for (let y = 0; y < h; y += 1) d[y * w + x] = out[y] ?? 0
  }
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) f[x] = d[y * w + x] ?? 0
    pass(w)
    for (let x = 0; x < w; x += 1) d[y * w + x] = out[x] ?? 0
  }
  return d
}

/** Measures one layer's fill. `resolution` is a parameter so a test can state the quantisation it expects. */
export function measureLayer(polygons: readonly (readonly Pt[])[], resolution: number = RESOLUTION_MM): LayerBridge {
  if (polygons.length === 0) {
    throw new Error("measureLayer was given no polygons. An empty layer is not a pour with no bridge: it is absent.")
  }
  const grid = rasterise(polygons, resolution)
  const { w, h, inside } = grid
  const d2 = squaredDistances(grid)

  // Counting sort of the copper pixels by squared distance, widest first.
  let maxD2 = 0
  let count = 0
  for (let i = 0; i < inside.length; i += 1) {
    if (inside[i] !== 1) continue
    count += 1
    const value = Math.round(d2[i] ?? 0)
    if (value > maxD2) maxD2 = value
  }
  if (count === 0) {
    throw new Error(
      "the filled polygons rasterised to no copper pixels at all, so there is nothing to measure. " +
        "They are degenerate (zero area), and a pour of no area is not reported as having no bridge.",
    )
  }
  const buckets = new Int32Array(maxD2 + 2)
  for (let i = 0; i < inside.length; i += 1) {
    if (inside[i] !== 1) continue
    const counted = maxD2 - Math.round(d2[i] ?? 0) + 1
    buckets[counted] = (buckets[counted] ?? 0) + 1
  }
  for (let b = 1; b < buckets.length; b += 1) buckets[b] = (buckets[b] ?? 0) + (buckets[b - 1] ?? 0)
  const order = new Int32Array(count)
  for (let i = 0; i < inside.length; i += 1) {
    if (inside[i] !== 1) continue
    const slot = maxD2 - Math.round(d2[i] ?? 0)
    order[buckets[slot] ?? 0] = i
    buckets[slot] = (buckets[slot] ?? 0) + 1
  }

  const parent = new Int32Array(w * h).fill(-1)
  const peak = new Float64Array(w * h)
  function find(i: number): number {
    let root = i
    while ((parent[root] ?? root) !== root) root = parent[root] ?? root
    let at = i
    while ((parent[at] ?? at) !== root) {
      const next = parent[at] ?? root
      parent[at] = root
      at = next
    }
    return root
  }

  let regions = 0
  let narrowestPx: number | null = null
  for (let n = 0; n < count; n += 1) {
    const p = order[n] ?? 0
    const level = Math.sqrt(d2[p] ?? 0)
    parent[p] = p
    peak[p] = level
    regions += 1
    const col = p % w
    const neighbours = [col > 0 ? p - 1 : -1, col < w - 1 ? p + 1 : -1, p - w, p + w]
    for (const q of neighbours) {
      if (q < 0 || q >= w * h || (parent[q] ?? -1) === -1) continue
      const a = find(p)
      const b = find(q)
      if (a === b) continue
      const peakA = peak[a] ?? 0
      const peakB = peak[b] ?? 0
      if (Math.min(peakA, peakB) - level > NOISE_FLOOR_PX) {
        const width = 2 * level - 1
        if (narrowestPx === null || width < narrowestPx) narrowestPx = width
      }
      const [keep, drop] = peakA >= peakB ? [a, b] : [b, a]
      parent[drop] = keep
      peak[keep] = Math.max(peakA, peakB)
      regions -= 1
    }
  }
  return { narrowestBridgeMm: narrowestPx === null ? null : narrowestPx * resolution, regions }
}
