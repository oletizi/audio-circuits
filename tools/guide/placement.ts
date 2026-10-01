import type { Box } from "./svg.ts"

/**
 * A record of what is already drawn where, so labels and checkboxes can be
 * put somewhere they do not cover a body, a cut mark or another label.
 */
export interface Occupancy {
  add(box: Box): void
  /** Area of `box` already covered (counted once per occupant), times this occupancy's weight. */
  overlap(box: Box): number
}

export function createOccupancy(weight: number): Occupancy {
  const boxes: Box[] = []
  return {
    add(box) {
      boxes.push(box)
    },
    overlap(box) {
      let total = 0
      for (const other of boxes) {
        const w = Math.min(box.maxX, other.maxX) - Math.max(box.minX, other.minX)
        const h = Math.min(box.maxY, other.maxY) - Math.max(box.minY, other.minY)
        if (w > 0 && h > 0) {
          total += w * h
        }
      }
      return total * weight
    },
  }
}

/**
 * How far a placed tag's recorded area is grown, so later tags keep a
 * visible gap from it rather than merely not overlapping.
 */
export const TAG_CLEARANCE = 3

/** What is already drawn where, by kind, for placing numbers and labels. */
export interface Occupied {
  /** Every part body. */
  readonly bodies: Occupancy
  /** Every lead line. */
  readonly leads: Occupancy
  /** Cuts, bridges, wires, pin dots, polarity marks and labels already placed. */
  readonly marks: Occupancy
}

/**
 * Covering a mark (another tag, a cut, a pin) is what makes a printout
 * ambiguous; crossing a lead or a body outline under a haloed label is only
 * untidy. So when nothing is clear, marks weigh more.
 */
const MARK_WEIGHT = 2

export function createOccupied(): Occupied {
  return { bodies: createOccupancy(1), leads: createOccupancy(1), marks: createOccupancy(MARK_WEIGHT) }
}

/** All three kinds together, for a placement that should avoid everything. */
export function everything(occupied: Occupied): readonly Occupancy[] {
  return [occupied.bodies, occupied.leads, occupied.marks]
}

/**
 * The first candidate that covers nothing already drawn, or - when every
 * candidate covers something, as on a crowded board - the one that covers
 * least. Candidates are given in order of preference.
 */
export function leastCovered<T>(candidates: readonly T[], boxOf: (candidate: T) => Box, occupied: readonly Occupancy[]): T {
  let best: T | undefined
  let bestScore = Infinity
  for (const candidate of candidates) {
    const box = boxOf(candidate)
    const score = occupied.reduce((sum, occupancy) => sum + occupancy.overlap(box), 0)
    if (score === 0) {
      return candidate
    }
    if (score < bestScore) {
      best = candidate
      bestScore = score
    }
  }
  if (best === undefined) {
    throw new Error("leastCovered: no candidate positions were offered")
  }
  return best
}
