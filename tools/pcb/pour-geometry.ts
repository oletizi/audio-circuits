/**
 * THE PLANE GEOMETRY UNDER `./pour.ts`: rotations, point-in-polygon, and the
 * closed loop a pad's thermal gap is read along. Pure functions over numbers;
 * nothing here knows what a pour or a board is.
 *
 * KiCad rotates clockwise-positive on a y-down page, so a rotation by `degrees`
 * is applied as an angle of `-degrees` in the usual maths frame. That is the
 * same convention `./board-outline.ts` uses for footprints, and a pad's angle in
 * a saved `.kicad_pcb` is ABSOLUTE (it already includes its footprint's - measured
 * on this repository's own board, where a footprint at 270 carries pads at 270),
 * so a pad's own angle is used as written and never added to the footprint's.
 */

export type Pt = readonly [number, number]

/** `local` rotated by `degrees` about the origin, then moved to `at`. */
export function toBoard(local: Pt, at: Pt, degrees: number): Pt {
  const rad = (-degrees * Math.PI) / 180
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  return [at[0] + local[0] * c - local[1] * s, at[1] + local[0] * s + local[1] * c]
}

/**
 * A pad's copper outline: a rectangle of half-sizes `hx` by `hy` with corner
 * radius `radius`, centred on `centre` and turned by `degrees`. A circle is the
 * case `hx === hy === radius`, an oval has `radius === min(hx, hy)`, a plain
 * rectangle has `radius === 0`. Those four are the shapes `./pour-read.ts`
 * accepts; anything else is refused there rather than approximated here.
 */
export interface PadOutline {
  readonly centre: Pt
  readonly hx: number
  readonly hy: number
  readonly radius: number
  readonly degrees: number
}

/** Even-odd containment. Points exactly on an edge are not guaranteed either way. */
export function pointInPolygon(p: Pt, poly: readonly Pt[]): boolean {
  let inside = false
  const [x, y] = p
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const a = poly[i]
    const b = poly[j]
    if (a === undefined || b === undefined) continue
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside
  }
  return inside
}

/** Distance from `p` to the pad's copper; negative inside it. */
export function signedDistanceToPad(p: Pt, pad: PadOutline): number {
  const rad = (pad.degrees * Math.PI) / 180
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  const dx = p[0] - pad.centre[0]
  const dy = p[1] - pad.centre[1]
  // The inverse of `toBoard`'s rotation.
  const lx = dx * c - dy * s
  const ly = dx * s + dy * c
  const qx = Math.abs(lx) - (pad.hx - pad.radius)
  const qy = Math.abs(ly) - (pad.hy - pad.radius)
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - pad.radius
}

/** A closed polyline resampled so consecutive points are `step` apart along it. */
function resampleClosed(poly: readonly Pt[], step: number): readonly Pt[] {
  const lengths: number[] = []
  let total = 0
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    if (a === undefined || b === undefined) continue
    const length = Math.hypot(b[0] - a[0], b[1] - a[1])
    lengths.push(length)
    total += length
  }
  const count = Math.max(8, Math.ceil(total / step))
  const out: Pt[] = []
  let edge = 0
  let edgeStart = 0
  for (let k = 0; k < count; k += 1) {
    const along = (k / count) * total
    while (edge < lengths.length - 1 && edgeStart + (lengths[edge] ?? 0) < along) {
      edgeStart += lengths[edge] ?? 0
      edge += 1
    }
    const a = poly[edge]
    const b = poly[(edge + 1) % poly.length]
    if (a === undefined || b === undefined) continue
    const length = lengths[edge] ?? 0
    const t = length === 0 ? 0 : (along - edgeStart) / length
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
  }
  return out
}

/**
 * Sample points, about `stepMm` apart, on the closed curve that lies `offsetMm`
 * outside the pad's copper everywhere - which for any of the four shapes is
 * itself a rounded rectangle, so it is walked directly rather than found.
 */
export function ringAroundPad(pad: PadOutline, offsetMm: number, stepMm: number): readonly Pt[] {
  const a = pad.hx + offsetMm
  const b = pad.hy + offsetMm
  const r = pad.radius + offsetMm
  const corners: readonly (readonly [number, number, number])[] = [
    [a - r, -(b - r), -90],
    [a - r, b - r, 0],
    [-(a - r), b - r, 90],
    [-(a - r), -(b - r), 180],
  ]
  const arcSteps = Math.max(2, Math.ceil(((Math.PI / 2) * r) / stepMm))
  const outline: Pt[] = []
  for (const [cx, cy, start] of corners) {
    for (let k = 0; k <= arcSteps; k += 1) {
      const angle = ((start + (90 * k) / arcSteps) * Math.PI) / 180
      outline.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
    }
  }
  return resampleClosed(outline, stepMm).map((p) => toBoard(p, pad.centre, pad.degrees))
}

/** Sample points, about `stepMm` apart, around the boundary of an axis-aligned box. */
export function ringAroundBox(box: { x0: number; y0: number; x1: number; y1: number }, stepMm: number): readonly Pt[] {
  return resampleClosed(
    [
      [box.x0, box.y0],
      [box.x1, box.y0],
      [box.x1, box.y1],
      [box.x0, box.y1],
    ],
    stepMm,
  )
}
