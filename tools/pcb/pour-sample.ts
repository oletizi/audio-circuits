/**
 * READING THE FILL ALONG A CLOSED LOOP: which piece of copper each sample lies
 * on, and where the loop leaves the copper.
 *
 * Samples are tested against the saved polygons themselves, not a raster. A run
 * narrower than `SAMPLE_STEP_MM` could be missed; a thermal spoke is an order of
 * magnitude wider than it. Measured on this repository's board with a full-board
 * pour, moving the step from 0.05 to 0.5 mm moved a loop's covered fraction by
 * under 0.01 and changed no spoke count.
 */
import { pointInPolygon } from "./pour-geometry.ts"
import type { Pt } from "./pour-geometry.ts"
import type { GroundPour } from "./pour-read.ts"

export const SAMPLE_STEP_MM = 0.05

/** The id of the pour polygon on `layer` that contains `p`, or -1. */
export function polygonAt(pour: GroundPour, layer: string, p: Pt): number {
  for (const poly of pour.polygons) {
    if (poly.layer !== layer) continue
    const [x0, y0, x1, y1] = poly.bounds
    if (p[0] < x0 || p[0] > x1 || p[1] < y0 || p[1] > y1) continue
    if (pointInPolygon(p, poly.points)) return poly.id
  }
  return -1
}

/** Length of a closed polyline, in mm. */
export function closedLength(loop: readonly Pt[]): number {
  let total = 0
  for (let i = 0; i < loop.length; i += 1) {
    const a = loop[i]
    const b = loop[(i + 1) % loop.length]
    if (a !== undefined && b !== undefined) total += Math.hypot(b[0] - a[0], b[1] - a[1])
  }
  return total
}

export interface LoopReading {
  /** The polygon id under each sample, -1 where there is none. */
  readonly hits: readonly number[]
  readonly coveredFraction: number
  /** Covered-to-uncovered transitions round the loop. 0 for a loop with no uncovered sample AND for one with no covered one. */
  readonly spokes: number
  /** Lengths in mm of each uncovered run, longest first, given the loop's total length. */
  readonly breaksMm: readonly number[]
  readonly polygons: ReadonlySet<number>
}

/** Reads a closed loop of samples against one layer's fill. */
export function readLoop(pour: GroundPour, layer: string, loop: readonly Pt[]): LoopReading {
  const perimeterMm = closedLength(loop)
  const hits = loop.map((p) => polygonAt(pour, layer, p))
  const covered = hits.map((id) => id >= 0)
  const n = covered.length
  let spokes = 0
  for (let i = 0; i < n; i += 1) {
    if (covered[i] === true && covered[(i + 1) % n] === false) spokes += 1
  }
  // Start walking from a covered sample so a run that wraps the start is counted once.
  const start = covered.indexOf(true)
  const breaks: number[] = []
  if (start === -1) {
    breaks.push(perimeterMm)
  } else {
    let run = 0
    for (let k = 1; k <= n; k += 1) {
      if (covered[(start + k) % n] === true) {
        if (run > 0) breaks.push((run / n) * perimeterMm)
        run = 0
      } else {
        run += 1
      }
    }
  }
  return {
    hits,
    coveredFraction: covered.filter(Boolean).length / n,
    spokes,
    breaksMm: breaks.sort((a, b) => b - a),
    polygons: new Set(hits.filter((id) => id >= 0)),
  }
}
