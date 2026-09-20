import type { AcSweep } from "./ac.ts"

export interface Tolerance {
  readonly magnitudeDb: number
  readonly phaseDegrees: number
}

export interface ResponseDeviation {
  readonly frequency: number
  readonly magnitudeDb: number
  readonly phaseDegrees: number
}

function wrapDegrees(degrees: number): number {
  return ((degrees + 180) % 360 + 360) % 360 - 180
}

/** Returns one entry per frequency exceeding either tolerance. Empty means agreement. */
export function compareResponses(
  reference: AcSweep,
  candidate: AcSweep,
  tolerance: Tolerance,
): readonly ResponseDeviation[] {
  if (reference.points.length !== candidate.points.length) {
    throw new Error(`Frequency grids differ: ${reference.points.length} vs ${candidate.points.length} points`)
  }
  const deviations: ResponseDeviation[] = []
  for (const [index, referencePoint] of reference.points.entries()) {
    const candidatePoint = candidate.points[index]
    if (Math.abs(candidatePoint.frequency - referencePoint.frequency) > referencePoint.frequency * 1e-9) {
      throw new Error(`Frequency grids differ at index ${index}: ${referencePoint.frequency} vs ${candidatePoint.frequency}`)
    }
    const referenceMagnitude = Math.hypot(referencePoint.real, referencePoint.imaginary)
    const candidateMagnitude = Math.hypot(candidatePoint.real, candidatePoint.imaginary)
    if (referenceMagnitude === 0 || candidateMagnitude === 0) {
      throw new Error(`Zero magnitude at ${referencePoint.frequency} Hz cannot be compared in dB`)
    }
    const magnitudeDb = 20 * Math.log10(candidateMagnitude / referenceMagnitude)
    const phaseDegrees = wrapDegrees(
      ((Math.atan2(candidatePoint.imaginary, candidatePoint.real) -
        Math.atan2(referencePoint.imaginary, referencePoint.real)) * 180) / Math.PI,
    )
    if (Math.abs(magnitudeDb) > tolerance.magnitudeDb || Math.abs(phaseDegrees) > tolerance.phaseDegrees) {
      deviations.push({ frequency: referencePoint.frequency, magnitudeDb, phaseDegrees })
    }
  }
  return deviations
}
