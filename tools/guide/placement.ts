import type { Box } from "./svg.ts"

/**
 * A record of what is already drawn where, so labels and checkboxes can be
 * put somewhere they do not cover a body, a cut mark or another label.
 */
export interface Occupancy {
  add(box: Box): void
  /** Total area of `box` already covered (overlaps counted once per occupant). */
  overlap(box: Box): number
}

export function createOccupancy(): Occupancy {
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
      return total
    },
  }
}

/** What is already drawn where, by kind, for placing numbers and labels. */
export interface Occupied {
  /** Every part body. */
  readonly bodies: Occupancy
  /** Every lead line. */
  readonly leads: Occupancy
  /** Cuts, bridges, wires, pin dots, polarity marks and labels already placed. */
  readonly marks: Occupancy
}

export function createOccupied(): Occupied {
  return { bodies: createOccupancy(), leads: createOccupancy(), marks: createOccupancy() }
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
