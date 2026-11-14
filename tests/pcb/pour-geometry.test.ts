/**
 * THE PLANE GEOMETRY UNDER THE POUR MEASUREMENT, against figures worked out by
 * hand rather than by the same functions.
 *
 * It exists because a mutation sweep of `./pour.test.ts` found that every pad
 * in the board fixtures is a circle, which no rotation, no sign of a rotation
 * and no corner radius can distinguish from another - so the three could be
 * broken without any board-level test noticing. An oval pad turned 45 degrees can
 * tell them apart, and the real-KiCad test in `./pour-refill.test.ts` covers the
 * 90-degree cases against the relief KiCad actually cut.
 */
import { test, expect } from "bun:test"
import { pointInPolygon, ringAroundBox, ringAroundPad, signedDistanceToPad, toBoard } from "../../tools/pcb/pour-geometry.ts"
import type { PadOutline, Pt } from "../../tools/pcb/pour-geometry.ts"

const near = (actual: number, expected: number, tolerance = 1e-9): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
}

test("KiCad's positive rotation turns a point counter-clockwise on the page, which is toward negative y", () => {
  const [x, y] = toBoard([1, 0], [10, 10], 90)
  near(x, 10)
  near(y, 9)
  const [x2, y2] = toBoard([0, 2], [0, 0], 90)
  near(x2, 2)
  near(y2, 0)
})

test("an oval pad 3.0 x 1.6 turned 45 degrees ends 1.5 mm from its centre along the up-right diagonal, and not along the other", () => {
  const pad: PadOutline = { centre: [10, 10], hx: 1.5, hy: 0.8, radius: 0.8, degrees: 45 }
  const s = Math.SQRT1_2
  // On the long axis, at the tip of the stadium: on the boundary.
  near(signedDistanceToPad([10 + 1.5 * s, 10 - 1.5 * s], pad), 0)
  // 0.3 mm beyond the tip, still on the axis.
  near(signedDistanceToPad([10 + 1.8 * s, 10 - 1.8 * s], pad), 0.3)
  // The mirror-image diagonal is across the pad's width, 0.8 mm half-height: 1.5 - 0.8 = 0.7 outside.
  near(signedDistanceToPad([10 + 1.5 * s, 10 + 1.5 * s], pad), 0.7)
  // The centre is 0.8 mm inside.
  near(signedDistanceToPad([10, 10], pad), -0.8)
})

test("a rectangle's corner is measured from the corner and a circle's rim from its radius", () => {
  const rect: PadOutline = { centre: [0, 0], hx: 2, hy: 1, radius: 0, degrees: 0 }
  near(signedDistanceToPad([5, 5], rect), Math.hypot(3, 4))
  near(signedDistanceToPad([0, 3], rect), 2)
  const circle: PadOutline = { centre: [3, 3], hx: 0.8, hy: 0.8, radius: 0.8, degrees: 0 }
  near(signedDistanceToPad([3 + 1.05, 3], circle), 0.25)
})

const SHAPES: readonly [string, number, number, number][] = [
  ["circle", 0.8, 0.8, 0.8],
  ["oval", 1.5, 0.8, 0.8],
  ["rect", 1.5, 0.8, 0],
  ["roundrect", 1.2, 0.8, 0.25],
]

test("every sample on a ring lies the stated distance from the pad (to a micron: the ring is a polyline round the curve), for each shape at each of four angles", () => {
  for (const [name, hx, hy, radius] of SHAPES) {
    for (const degrees of [0, 45, 90, 270]) {
      const pad: PadOutline = { centre: [7, -3], hx, hy, radius, degrees }
      const ring = ringAroundPad(pad, 0.25, 0.05)
      expect(ring.length).toBeGreaterThan(50)
      for (const p of ring) {
        const d = signedDistanceToPad(p, pad)
        if (Math.abs(d - 0.25) > 1e-3) throw new Error(`${name} at ${degrees} degrees: a ring sample is ${d} from the pad, not 0.25`)
      }
    }
  }
})

test("a ring is a closed walk about the stated step apart, and it goes all the way round", () => {
  const pad: PadOutline = { centre: [0, 0], hx: 0.8, hy: 0.8, radius: 0.8, degrees: 0 }
  const ring = ringAroundPad(pad, 0.25, 0.05)
  // Circumference of a 1.05 mm circle is 6.597 mm.
  expect(ring.length).toBeGreaterThanOrEqual(131)
  expect(ring.length).toBeLessThanOrEqual(133)
  const angles = ring.map((p) => Math.atan2(p[1], p[0]))
  expect(Math.max(...angles) - Math.min(...angles)).toBeGreaterThan(2 * Math.PI - 0.1)
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    if (a === undefined || b === undefined) throw new Error("ring index")
    expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeLessThanOrEqual(0.06)
  }
})

test("a box ring covers all four sides at the stated spacing", () => {
  const ring = ringAroundBox({ x0: 28, y0: 16, x1: 32, y1: 26 }, 0.05)
  expect(ring.length).toBe(560)
  const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9
  const on = (p: Pt): boolean => close(p[0], 28) || close(p[0], 32) || close(p[1], 16) || close(p[1], 26)
  expect(ring.every(on)).toBe(true)
})

test("point-in-polygon is even-odd: the hole of a keyholed outline is outside", () => {
  const keyholed: readonly Pt[] = [
    [0, 0], [10, 0], [10, 10], [0, 10],
    [0, 4], [4, 4], [4, 6], [6, 6], [6, 4], [4, 4], [0, 4],
  ]
  expect(pointInPolygon([2, 2], keyholed)).toBe(true)
  expect(pointInPolygon([5, 5], keyholed)).toBe(false)
  expect(pointInPolygon([11, 5], keyholed)).toBe(false)
})
