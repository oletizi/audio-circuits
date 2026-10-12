/**
 * The ranking: how to choose among candidates that are all ADMISSIBLE.
 *
 * THE AUTHORITY for everything below is `OBJ3` in
 * `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md`. Where
 * this module and that document differ, the document wins and this comment
 * is the defect.
 *
 * `F` (`./score.ts`) decides whether the search accepts a candidate at all,
 * and `grade.ts` (Task 14) decides whether a candidate may be considered -
 * ADMISSIBLE or not. Neither of those is this module's job. **A RANKING TERM
 * IS NOT A TERM IN `F` AND CANNOT MAKE THE SEARCH ACCEPT A WORSE ONE.** This
 * module only orders candidates that are already admissible, and Task 17's
 * plateau acceptance asserts the separation directly: a smaller `A_occ` never
 * licenses keeping a candidate `F` would otherwise reject.
 *
 * `RANKING` carries the declared order and the reason for each position,
 * beside the ranker rather than buried in a spec only this file's author
 * read - the sibling placement pipeline's own `RANKING` constant
 * (`tools/placement/routeAll.ts` in the pedals repositories) is the shape
 * this follows: one reviewable string, not a weighted sum with tuned
 * coefficients nobody can see the reasoning behind.
 */
import { boundsOf, type BoardDump } from "../guide/dump.ts"
import { parseHoleKey, pinHoles, type HoleKey } from "./copper.ts"
import type { ReferenceNets } from "./equivalence.ts"
import type { Score } from "./score.ts"

/**
 * The declared order, and the reason for each position.
 *
 * Cuts, then wire bridges, then solder bridges: `F`'s own three construction
 * costs, in `F`'s own order, because a ranking that reordered them would rank
 * two candidates `F` already distinguishes by some OTHER number - which is
 * exactly the "legibility, tidiness or neatness term" `OBJ2` forbids.
 *
 * `A_occ` sits below all three because a smaller board that costs more to
 * build is not an improvement, and lexicographic order is what makes that
 * true by construction rather than by convention: no value of `A_occ` can
 * move a worse-`F` candidate ahead of a better one, because the comparison
 * never reaches the fourth position until the first three are tied.
 *
 * Pin-bounding-box wirelength sits last, below `A_occ`, because `A_occ` is
 * read directly off `BOUNDS` while wirelength is a labelled PROXY for track
 * length - a quantity nothing in this pipeline derives (limit `H-11`) - and a
 * measured number outranks an approximated one.
 */
export const RANKING =
  "cuts (fewest first: each is construction work the floor already prices in, and a smaller " +
  "board that costs more cuts to build is not an improvement), then wire bridges (fewest first: " +
  "each is a hand-run patch wire soldered across two strips, the costliest join this pipeline " +
  "makes), then solder bridges (fewest first: each is one blob of solder joining two strips, " +
  "which the owner does not build as a blob - \"A solder blob will turn into a wire on my " +
  "bench\" - so it is priced as a wire and ordered below one only because VeroRoute chooses " +
  "where it goes while a wire is placed deliberately; either way it is a join a tighter layout " +
  "can avoid), then A_occ " +
  "(smallest first: the occupied board area read straight off BOUNDS, settled strictly below " +
  "every construction-cost term above so a smaller board can never outrank one that is cheaper " +
  "to build, and present only to break a tie the three costs above leave equal), then " +
  "pin-bounding-box wirelength (smallest first: a labelled proxy for track length, which " +
  "nothing in this pipeline derives (limit H-11), placed last because approximating a quantity " +
  "ranks below measuring one)."

/**
 * `A_occ`: the occupied board area, read straight off `BOUNDS`.
 *
 * `(maxRow - minRow + 1) * (maxCol - minCol + 1)`, both ends inclusive, which
 * is `BOUNDS`'s own rectangle and nothing else.
 *
 * REFUSES THROUGH `boundsOf` RATHER THAN DEFINING A SECOND REFUSAL FOR THE
 * SAME CONDITION. `tools/guide/dump.ts` already states, deliberately, that an
 * absent `BOUNDS` line does not refuse at parse time - two frozen fixtures
 * predate the line and are evidence that may not be regenerated - and that
 * "the refusal belongs to the consumer that needs the figure". `occupiedArea`
 * is such a consumer, so it reaches `BOUNDS` through `boundsOf` and inherits
 * that refusal (naming `BOUNDS` by name) instead of writing a second wording
 * of one condition.
 *
 * **THIS IS NOT `HC6`'S FABRICATION EXTENT, AND THE TWO DELIBERATELY STAY
 * APART.** `tools/stripboard/extent.ts`'s `fabricationExtent` computes a
 * DIFFERENT and LARGER figure: the union of `BOUNDS` with every required
 * feature hole (every `PIN`, both holes of every `CUT`, both holes of every
 * `SOLDER`, both ends of every placed `WIRE`), because `HC6` answers *which
 * board can this be cut from* - a feature that reaches past `BOUNDS` still
 * has to survive the cut. `occupiedArea` answers a different question entirely
 * - *which of two equal-cost admissible layouts is tighter* - and for that
 * question the direct `BOUNDS` reading is the settled term (`OBJ3`).
 * Substituting either figure for the other would change a decision while
 * looking like an implementation detail (`D19`), so neither function calls
 * the other and this one does not read `dump.pins`, `dump.cuts`,
 * `dump.bridges` or `dump.wires` at all.
 */
export function occupiedArea(dump: BoardDump): number {
  const bounds = boundsOf(dump, "A_occ (OBJ3's ranking term)")
  return (bounds.maxRow - bounds.minRow + 1) * (bounds.maxCol - bounds.minCol + 1)
}

/**
 * A PROXY for track length, and labelled as one in its own name and in this
 * comment: nothing in this pipeline derives actual routed track length
 * (limit `H-11`), so this function does not measure it.
 *
 * The half-perimeter of each reference net's pin holes, summed over every
 * net: for each net, the span of rows plus the span of columns its on-board
 * pins occupy. This is the ordinary bounding-box estimate placement tools use
 * when they have not yet routed anything - cheap to compute and monotone with
 * how spread out a net's pins are, which is all a RANKING term below `A_occ`
 * needs to be.
 *
 * A net with fewer than two on-board pins contributes nothing: a single pin
 * has no span, and a net none of whose pins the dump reports a `PIN` line for
 * is a net belonging to a floating part - a legitimate state
 * (`tools/guide/dump.ts`'s own rule: a floating part prints no `PIN` lines),
 * not a defect this proxy should refuse over.
 */
export function pinBoundingBoxWirelength(dump: BoardDump, reference: ReferenceNets): number {
  const holes = pinHoles(dump)
  let total = 0
  for (const [, pins] of reference) {
    const positions = pins
      .map((pin) => holes.get(pin))
      .filter((hole): hole is HoleKey => hole !== undefined)
      .map((hole) => parseHoleKey(hole))
    if (positions.length < 2) continue
    const rows = positions.map((position) => position.row)
    const cols = positions.map((position) => position.col)
    total += Math.max(...rows) - Math.min(...rows) + (Math.max(...cols) - Math.min(...cols))
  }
  return total
}

/**
 * One candidate's position in `RANKING`'s order: cuts, wire bridges, solder
 * bridges, `A_occ`, pin-bounding-box wirelength.
 *
 * Every entry is a plain count or a plain dump reading - nothing here is a
 * term of `F`, and nothing here is scaled or weighted. `compareRanking` is
 * the only thing that gives this tuple meaning.
 */
export function rankingTuple(
  score: Score,
  dump: BoardDump,
  reference: ReferenceNets,
): readonly number[] {
  return [
    score.cuts,
    score.wires,
    score.solder,
    occupiedArea(dump),
    pinBoundingBoxWirelength(dump, reference),
  ]
}

/**
 * Lexicographic comparison over two `rankingTuple` results: negative when `a`
 * ranks ahead of `b`, positive when `b` ranks ahead of `a`, zero when neither
 * term distinguishes them.
 *
 * Every position is "smaller first" (`RANKING`'s own order), so this is a
 * plain lexicographic `<` and never a weighted combination: the first
 * position that differs decides the comparison outright, which is the
 * property that makes `A_occ` unable to buy back a cut, a wire bridge or a
 * solder bridge - the comparison never REACHES the fourth position until the
 * first three are tied.
 *
 * REFUSES ON A LENGTH MISMATCH rather than treating a missing position as
 * equal: both tuples can only have come from `rankingTuple`, which always
 * produces the same five positions, so a mismatch means one of the two was
 * built by hand with a term dropped or duplicated - defaulting the missing
 * position to anything would silently rank that candidate by fewer terms than
 * the other.
 */
export function compareRanking(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `compareRanking: the two tuples have different lengths (${a.length} and ${b.length}), so ` +
        "they cannot be compared position by position. Both must come from rankingTuple, which " +
        "always returns RANKING's five positions in its own order; a mismatch means one of the " +
        "two was built by hand with a term missing or duplicated. Rebuild both through " +
        "rankingTuple rather than comparing them as given.",
    )
  }
  for (let index = 0; index < a.length; index += 1) {
    const difference = a[index] - b[index]
    if (difference !== 0) return difference
  }
  return 0
}
