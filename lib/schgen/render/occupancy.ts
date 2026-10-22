/**
 * **THE REPOSITORY'S WEIGHTED-OVERLAP PLACEMENT PRIMITIVE, IN ONE PLACE.** It was written for the
 * printed build guide (`tools/guide/placement.ts`, committed 2026-09-29) and is moved here
 * unchanged so the schematic's field placer uses the same arithmetic and the same weights rather
 * than a second set of its own. That tool now imports it; nothing about what it computes moved, and
 * `tests/guide/` is what holds that claim.
 *
 * **WHY THIS DIRECTORY AND NOT A NEUTRAL ONE.** `lib/placement/` would read better and would be
 * hashed by nothing: `tools/schgen/generate.ts`'s `TEMPLATE_LIBRARY_DIR` is `lib/schgen/render`,
 * and spec §2.1 has the generation manifest record the library version that graded a drawing. A
 * cost function the placer reads and the manifest does not hash is a library input that can change
 * with nothing failing - `CLAUDE.md`'s *"a skipped check must never look like a passing one"* in a
 * hash's clothing. So it lives in the tree that is hashed, and the cost is that the build guide
 * imports a module under `lib/schgen/`. `docs/known-gaps.md` records that cost rather than hiding
 * it.
 *
 * **THE SHAPE IS THE ONE THE LITERATURE PRESCRIBES, which is why it is reused rather than
 * reinvented.** `docs/schematic/text-placement-prior-art.md` establishes it: point-feature label
 * placement is a combinatorial optimisation with candidates in a preference order and a cost that
 * is overlap AMOUNT rather than a boolean (Christensen, Marks & Shieber 1995, after Yoeli 1972),
 * and every greedy algorithm in that literature terminates with a labelling - *"it can be labeled
 * even though a label overlap or feature obscuration results"* - rather than refusing the drawing.
 * KiCad's own field autoplacer does the same thing and cannot fail.
 */

/** Any axis-aligned box. Structural, so both `tools/guide/svg.ts`'s `Box` and `lib-pins.ts`'s fit. */
export interface Box {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * A record of what is already drawn where, so labels and text can be put somewhere they do not
 * cover a body, a cut mark or another label.
 */
export interface Occupancy {
  add(box: Box): void;
  /** Area of `box` already covered (counted once per occupant), times this occupancy's weight. */
  overlap(box: Box): number;
}

export function createOccupancy(weight: number): Occupancy {
  const boxes: Box[] = [];
  return {
    add(box) {
      boxes.push(box);
    },
    overlap(box) {
      let total = 0;
      for (const other of boxes) {
        const w = Math.min(box.maxX, other.maxX) - Math.max(box.minX, other.minX);
        const h = Math.min(box.maxY, other.maxY) - Math.max(box.minY, other.minY);
        if (w > 0 && h > 0) {
          total += w * h;
        }
      }
      return total * weight;
    },
  };
}

/**
 * **THE SECOND TIER OF THE TWO-TIER SEVERITY, AND THE REASON IS THE GUIDE'S OWN, VERBATIM:**
 * *"Covering a mark (another tag, a cut, a pin) is what makes a printout ambiguous; crossing a lead
 * or a body outline under a haloed label is only untidy. So when nothing is clear, marks weigh
 * more."*
 *
 * The discriminator is therefore AMBIGUITY against UNTIDINESS, not the kind of thing covered, which
 * is what lets a second drawing use the same number: whatever can be MISREAD weighs 2 and whatever
 * merely looks untidy weighs 1. KiCad's autoplacer reaches the same two tiers independently
 * (`COLLIDE_OBJECTS` against `COLLIDE_H_WIRES`, where a side conflicting only with horizontal wires
 * is PREFERRED), which is recorded in `docs/schematic/text-placement-prior-art.md` §5(d).
 */
export const MARK_WEIGHT = 2;

export interface Chosen<T> {
  readonly candidate: T;
  /** The weighted overlap area the choice accepts; 0 when the candidate covers nothing. */
  readonly cost: number;
}

/**
 * The first candidate that covers nothing already drawn, or - when every candidate covers
 * something, as on a crowded board - the one that covers least, with its cost. Candidates are given
 * in order of preference.
 *
 * `costOf` rather than a box and an occupancy list, because two callers need two different things
 * from it: the guide weighs ONE box per candidate against a fixed occupancy set, and the schematic
 * field placer weighs TWO text boxes against a set that differs between an inside and an outside
 * slot. Both are argmin over the same preference order with the same early exit, and that is what
 * is shared.
 *
 * It throws only when no candidate was offered at all, which is a defect in the candidate
 * generator rather than a crowded drawing.
 */
export function chooseLeastCovered<T>(candidates: readonly T[], costOf: (candidate: T) => number): Chosen<T> {
  let best: T | undefined;
  let bestCost = Infinity;
  for (const candidate of candidates) {
    const cost = costOf(candidate);
    if (cost === 0) return { candidate, cost: 0 };
    if (cost < bestCost) {
      best = candidate;
      bestCost = cost;
    }
  }
  if (best === undefined) throw new Error("chooseLeastCovered: no candidate positions were offered");
  return { candidate: best, cost: bestCost };
}

/** `chooseLeastCovered` over one box per candidate and a fixed occupancy set: the build guide's shape. */
export function leastCovered<T>(candidates: readonly T[], boxOf: (candidate: T) => Box, occupied: readonly Occupancy[]): T {
  return chooseLeastCovered(candidates, (candidate) => {
    const box = boxOf(candidate);
    return occupied.reduce((sum, occupancy) => sum + occupancy.overlap(box), 0);
  }).candidate;
}
