/**
 * What is already drawn where, by kind, for placing the printed guide's numbers and labels.
 *
 * **THE PRIMITIVE IS BESIDE THIS FILE, AND NOTHING IT COMPUTES HAS CHANGED.** `createOccupancy`,
 * `leastCovered` and the `MARK_WEIGHT` of 2 are `./occupancy.ts`, in this directory, and are
 * re-exported here so the guide's own placement helpers reach them through one name. The module
 * used to sit at `lib/schgen/render/occupancy.ts` so the schematic's field placer could weigh an
 * overlap the same way under one hashed library directory; it moved back here in Task 7 of
 * `docs/superpowers/plans/2026-10-30-remove-schgen.md`, because `lib/schgen/` is deleted in that
 * plan's Task 9. `lib/schgen/render/field-placement.ts` still imports it from here for as long as
 * `lib/schgen/` exists. This file keeps the `Occupied` categories, which are the guide's own and
 * mean nothing to a schematic.
 */
import { createOccupancy, leastCovered, MARK_WEIGHT, type Occupancy } from "./occupancy.ts"

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
