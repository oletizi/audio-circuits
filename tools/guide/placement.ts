/**
 * What is already drawn where, by kind, for placing the printed guide's numbers and labels.
 *
 * **THE PRIMITIVE MOVED AND NOTHING IT COMPUTES DID.** `createOccupancy`, `leastCovered` and the
 * `MARK_WEIGHT` of 2 now live in `lib/schgen/render/occupancy.ts` and are re-exported here, so the
 * schematic's field placer and this guide weigh an overlap the same way instead of carrying two
 * weightings. That module's header says why it sits in that directory; this file keeps the
 * categories, which are the guide's own and mean nothing to a schematic.
 */
import { createOccupancy, leastCovered, MARK_WEIGHT, type Occupancy } from "../../lib/schgen/render/occupancy.ts"

export { createOccupancy, leastCovered }
export type { Occupancy }

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

export function createOccupied(): Occupied {
  return { bodies: createOccupancy(1), leads: createOccupancy(1), marks: createOccupancy(MARK_WEIGHT) }
}

/** All three kinds together, for a placement that should avoid everything. */
export function everything(occupied: Occupied): readonly Occupancy[] {
  return [occupied.bodies, occupied.leads, occupied.marks]
}
