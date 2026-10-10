/**
 * The 0.1 inch hole grid, and the one tolerance for calling a metric lead pitch
 * a whole number of steps on it.
 *
 * EXTRACTED SO THERE IS ONE OF IT. Two modules need the same rounding and the
 * same tolerance - `import-string.ts`, deciding a VeroRoute type's span suffix,
 * and `lead-span.ts`, deciding the span a part's own footprint pitch sits at.
 * A second copy of 2.54 with a second copy of the tolerance is a pair that
 * drifts, and the drift shows up as a footprint that imports but mounts on the
 * wrong holes. `schematic.ts`'s `STUB` is also 2.54 and is NOT this: it is a
 * schematic-sheet wire stub length, which has nothing to do with a hole.
 */

/** Millimetres per 100-mil grid step. */
export const GRID_MM = 2.54

/**
 * How far a lead pitch may sit from the grid and still be accepted.
 *
 * Sized for one specific phenomenon: KiCad names imperial parts in rounded
 * metric. `P2.50mm` IS a 0.1in part and is 0.04mm off; `P7.50mm` IS a 0.3in
 * part and is 0.12mm off; `P10.16mm` is exact. A tighter tolerance refuses
 * real, correct footprints. A much looser one starts accepting genuinely
 * off-pitch parts as though they fitted their holes.
 */
export const PITCH_TOLERANCE_MM = 0.15

/** A pitch resolved onto the grid: how many steps, and how far off it sat. */
export interface GridSteps {
  readonly steps: number
  readonly errorMm: number
}

/**
 * The nearest whole number of grid steps to a lead pitch, with the residual.
 *
 * It does NOT judge the residual - `PITCH_TOLERANCE_MM` is exported beside it
 * and each caller refuses in its own vocabulary, because "this footprint has no
 * VeroRoute import string" and "this part cannot be mounted at this span" are
 * different failures that want different remedies.
 */
export function nearestGridSteps(pitchMm: number): GridSteps {
  if (!Number.isFinite(pitchMm)) {
    throw new Error(`a lead pitch must be a finite number of millimetres, not ${pitchMm}`)
  }
  const steps = Math.round(pitchMm / GRID_MM)
  return { steps, errorMm: Math.abs(pitchMm - GRID_MM * steps) }
}

/**
 * Float slack for comparing a pitch against the grid with `floor`/`ceil`.
 *
 * NOT a tolerance, and not `PITCH_TOLERANCE_MM`'s job. `10.16 / 2.54` is
 * 4.000000000000001 in IEEE754, so `Math.ceil` of it is 5 and a part whose
 * datasheet pitch is exactly four steps gets credited with five. One part in
 * 10^9 of a step cannot be a real dimensional claim, so it is absorbed.
 */
const GRID_FLOAT_SLACK = 1e-9

/** The largest whole step count whose pitch does not exceed `pitchMm`. */
export function gridStepsAtMost(pitchMm: number): number {
  return Math.floor(pitchMm / GRID_MM + GRID_FLOAT_SLACK)
}

/** The smallest whole step count whose pitch is not below `pitchMm`. */
export function gridStepsAtLeast(pitchMm: number): number {
  return Math.ceil(pitchMm / GRID_MM - GRID_FLOAT_SLACK)
}

/** Holes a span of `steps` grid steps occupies: a 1-step span lands on 2 holes. */
export function holesForSteps(steps: number): number {
  return steps + 1
}

/** The pitch, in millimetres, between the first and last of `holes` holes. */
export function pitchForHoles(holes: number): number {
  return (holes - 1) * GRID_MM
}
