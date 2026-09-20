import { test, expect } from "bun:test"
import { compareResponses } from "../../lib/sim/compare.ts"
import type { AcSweep } from "../../lib/sim/ac.ts"

const base: AcSweep = {
  node: "out",
  points: [
    { frequency: 100, real: 0.9, imaginary: -0.1 },
    { frequency: 1000, real: 0.5, imaginary: -0.5 },
  ],
}

const tolerance = { magnitudeDb: 0.01, phaseDegrees: 0.1 }

test("identical sweeps produce no deviations", () => {
  expect(compareResponses(base, base, tolerance)).toEqual([])
})

test("a uniform 10 percent gain error is reported in dB at every point", () => {
  const scaled: AcSweep = {
    node: "out",
    points: base.points.map(p => ({ ...p, real: p.real * 1.1, imaginary: p.imaginary * 1.1 })),
  }
  const deviations = compareResponses(base, scaled, tolerance)
  expect(deviations).toHaveLength(2)
  expect(deviations[0].magnitudeDb).toBeCloseTo(20 * Math.log10(1.1), 9)
  expect(deviations[0].phaseDegrees).toBeCloseTo(0, 9)
})

test("phase deviation is wrapped to the shortest angle", () => {
  const flipped: AcSweep = {
    node: "out",
    points: [base.points[0], { frequency: 1000, real: 0.5, imaginary: 0.5 }],
  }
  const deviations = compareResponses(base, flipped, tolerance)
  expect(deviations).toHaveLength(1)
  expect(Math.abs(deviations[0].phaseDegrees)).toBeCloseTo(90, 9)
})

test("a mismatched frequency grid throws rather than interpolating", () => {
  const shifted: AcSweep = {
    node: "out",
    points: base.points.map(p => ({ ...p, frequency: p.frequency * 1.01 })),
  }
  expect(() => compareResponses(base, shifted, tolerance)).toThrow("Frequency grids differ")
})
