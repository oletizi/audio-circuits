/**
 * THE SPACING GESTURE: one off-board pad moved out of a packed row, to a hole
 * where it does not sit beside another net.
 *
 * **WHY IT EXISTS, AND THE OBJECTIVE IS THE PLAN'S AND NOT THIS MODULE'S.**
 * `--import` lays a `PADS<n>` component down as **n adjacent holes**. Adjacent
 * pads of one off-board part are usually on DIFFERENT NETS - `SW_LO_BOOST.2`
 * through `.7` are six selector throws - so every abutment in that row is a cut,
 * and a net whose every hole is filled by a pad has nowhere for a wire to
 * anchor. On the import-placed low-boost board the ten pads sit in row 0 at
 * columns 23..32, contiguously, against a part's lead at column 22; the owner's
 * own hand layout spaces the same six selector pads every third hole on strip 3
 * and those nets close.
 * `.superpowers/sdd/2026-10-13-buildable-pultec-layouts/`'s Task 2 brief is the
 * authority for what this gesture is FOR and for the quantity it drives down -
 * *"propose a pad's move to a free hole that reduces the number of same-strip
 * abutments between different nets, and let `accepts` decide"*. Where this
 * module and that brief differ the brief wins and this comment is the defect.
 *
 * `./moves-space-measure.ts` holds the quantity and its arithmetic, and carries
 * the statement that no preferred spacing is encoded anywhere in the pair: no
 * target gap, no "every third hole", no magic number. This file is only *which
 * gestures does this board admit against that measure*.
 *
 * **IT IS A WIDENING OF `move`'s NEIGHBOURHOOD FOR PADS AND NOT A NINTH KIND.**
 * Every gesture here is `{ kind: "move" }` - one `--move --ref <pad> --to
 * <row>,<col>`, the verb `./movable.ts` measured against the pinned binary, the
 * advance `./moves-advance.ts` already models, and the argument list
 * `./moves-apply.ts` already emits. What is new is WHICH DESTINATIONS `move` is
 * asked about, which is `./moves.ts`' question and exactly what `UNIT_DELTAS`
 * is. A ninth kind was considered and rejected: `MOVE_KINDS` is held against
 * CRITERIA and PIPELINE, every kind past the sixth carries a recorded ruling
 * (`./moves-model.ts`'s header), and this gesture has none - so adding one would
 * be an agent widening the specified move set on its own authority. The cost of
 * the decision, stated rather than discovered: a run record cannot tell a
 * spacing gesture from any other `move` by its kind, so a reader who wants the
 * count intersects the enumeration with `spacingGestures` - which is why that
 * function is exported and re-exported from `./moves.ts` rather than kept
 * private.
 *
 * **WHETHER A SINGLE SPACING GESTURE CAN BE ACCEPTED AT ALL - MEASURED AGAINST
 * THE FORK, BECAUSE IT DECIDES WHETHER THE KIND IS REACHABLE AND BECAUSE THE
 * FIRST VERSION OF THIS PARAGRAPH GOT IT WRONG BY SEVEN-FOLD IN THE DIRECTION
 * THAT UNDERSTATES IT.** `docs/stripboard/pipeline-verification.md` section 11
 * carries the whole measurement, its commands and its limits; this is the
 * derivation and the headline.
 *
 * Acceptance is lexicographic (`./climb-accepts.ts`): **`openNets` FIRST**, then
 * `F = C + 0.25W + 0.25B`, then `RANKING` at `dF = 0`, with `worseAcceptance`
 * null in the committed rules so no worse intermediate is ever taken. A `move`
 * can neither create nor destroy a `WIRE` or a `SOLDER` line, so `W` and `B` are
 * fixed and **`dF = dC`**.
 *
 * `C` IS A BLOCK COUNT AND NOT A `(net, strip)` PAIR COUNT, which is where the
 * first version went wrong. With `blocks_s` the number of maximal runs of ONE
 * net in the sequence of OCCUPIED holes along strip `s`, in position order:
 *
 *     C = sum over strips of (blocks_s - 1) = sum(blocks_s) - S_occ
 *
 * A model of exactly that, keyed by the board's own fourteen-net export,
 * reproduces the fork's `dC` for all 315 of this board's candidates bucket for
 * bucket (section 11.2). **A block boundary is OCCUPATION-ORDER adjacency and
 * not physical adjacency:** two different-net holes two apart with nothing
 * between them are still consecutive in the sequence and still take a cut.
 *
 * **THE CONTROLLING CONDITION FOR `dC < 0` IS THAT THE PAD'S HOLE IS ITS OWN
 * NET-BLOCK ON THE STRIP IT LEAVES** - both of its occupation-order neighbours
 * there are other nets, or absent. Its departure then removes a block, or TWO
 * when the neighbours it sat between are one net and merge. Measured on the
 * import-placed low-boost board, the predicate has no false positive and no
 * false negative over the nine pads the gesture names: the seven that are their
 * own block reduce `C` on 35 of 35 (`RV_LO_BOOST_1`, whose departure merges) and
 * 32 of 35 (each `SW_LO_BOOST_2..7`, missing only their three occupied-strip
 * destinations), and the two that sit INSIDE their net's block
 * (`RV_LO_BOOST_2` and `SW_LO_BOOST_1`, in `lo_boost_in`'s run of columns
 * 24-26) reduce it on 0 of 35.
 *
 * **THE FORK'S OWN HISTOGRAM over all 315: `dC` = -2 (x33), -1 (x194), 0 (x84),
 * +1 (x4) - so 227 of 315 STRICTLY REDUCE `C`**, each a straight improvement in
 * `F` needing no plateau at all. **84 are `dC = 0`** and fall to `RANKING`'s
 * fourth and fifth positions (`A_occ` off `BOUNDS`, then the pin bounding-box
 * wirelength proxy), which `strictlyBetter` consults exactly at `dF = 0`; **that
 * plateau already exists and this kind does not add one** - `accepts`,
 * `strictlyBetter` and `compareRanking` are untouched. **And 4 are `dC = +1` and
 * are rejected on `F`**, which is the shape the first version of this paragraph
 * flatly denied by saying a within-strip or occupied-strip move is always
 * `dC = 0`: a departure that removes no block, with an arrival that adds one.
 *
 * **`openNets` IS THE FIRST GATE AND IS MEASURED INERT ON THIS BOARD, NOT
 * ASSUMED SO.** All 315 candidates were `--check`ed: `dOpenNets = 0` for every
 * one, including all 70 that name a pad on `lo_boost_in`. The reason is specific
 * - `lo_boost_in` is ALREADY one of the 13 nets `--check` calls incomplete,
 * because the net-`0` hole of `RV_LO_BOOST_1` sits between its column 22 and its
 * columns 24-26 and the cuts either side already split it, and a net already
 * counted cannot raise a count of nets. **On a board where such a net were
 * whole, lifting one of its holes onto a strip of its own WOULD raise `openNets`
 * and be rejected outright whatever it did to `F`.** So the gate is named here
 * because it is first, and its inertness is this board's property rather than
 * the gesture's.
 *
 * **THE KIND EXHAUSTS ITSELF, which is the reachability figure that matters.**
 * The guard is a strict reduction in a pad's OWN abutment count, so a pad that
 * leaves the row stops being named: applying one gesture at a time takes the
 * proposal count 315 -> 245 -> 210 -> 175 -> 140 -> 105 -> 70 -> 0 in seven
 * steps, about 1,260 extra evaluations in total - under 11% of one §6.9-sized
 * climb - rather than a standing tax on every round. Section 11.6 has the ladder
 * and the units; it is a hand-picked sequence and not a prediction of what the
 * climb would choose, which is section 11.7's first limit.
 */
import type { BoardDump } from "../guide/dump.ts"
import { stripOf } from "./constraints-model.ts"
import type { ReferenceNets } from "./equivalence.ts"
import { occupancyAfter } from "./moves-advance.ts"
import type { Move } from "./moves-model.ts"
import {
  abutmentsAt,
  holeKey,
  holesWithCopper,
  netOfHoles,
  placedPads,
} from "./moves-space-measure.ts"
import type { Occupancy } from "./seed-geometry.ts"

/**
 * The measure, re-exported from `./moves-space-measure.ts`: how many
 * different-net abutments each placed pad has where it stands.
 *
 * Same arrangement and reason as `./moves.ts`' own re-export blocks - this pair
 * has one module its consumers name - and the split is at the
 * what-is-the-quantity / which-gestures-does-the-board-admit seam, forced by the
 * 500-line ceiling when the reachability derivation above was written down.
 */
export { padAbutments } from "./moves-space-measure.ts"

/**
 * The one arm of `Move` this file produces: a single `move` with a `ref` and a
 * destination.
 *
 * **IT IS NARROWER THAN `Move` ON PURPOSE.** Every gesture here is a `move`, so
 * a consumer reading `.ref` and `.to` off one should not have to narrow a union
 * it was never handed. The alternative was measured rather than argued: with
 * `readonly Move[]` as the return type, `tests/stripboard/moves-space.test.ts`
 * failed `bun run typecheck` with *"Property 'to' does not exist on type
 * 'Move'"* on every assertion about a destination, and the only ways out are a
 * cast - which this repository forbids - or a narrowing guard in each test for a
 * union the function cannot return. `Extract` is a type-level reading of the
 * union itself rather than a second declaration of its shape, so the two cannot
 * drift.
 */
export type PadMove = Extract<Move, { readonly kind: "move" }>

/**
 * Every spacing gesture the MEASURE admits: each placed pad, moved to each hole
 * the dump states no copper on where it would abut fewer other nets.
 *
 * **THE ORDER IS DECLARED, NEVER INCIDENTAL** - the dump's `PAD` lines in their
 * own order, then strips ascending, then positions along each strip ascending.
 * `./moves.ts`'s header says why at length: a run whose move order varied
 * between runs could not be reproduced, and Task 13's `canonicalHash` exists to
 * prove runs reproduce.
 *
 * **THE WHOLE BOARD IS ASKED ABOUT AND NOT ONLY THE PAD'S OWN STRIP**, and the
 * reason is measured rather than preferred. On the import-placed low-boost board
 * row 0 is occupied from column 0 to column 32 of 35, so a within-strip
 * rearrangement has two holes to work with and cannot space ten pads at all -
 * the parts are in the way, and the owner's own layout puts the selector row on
 * a strip of its own. A narrowing that cannot reach the arrangement the gesture
 * exists for is the mistake `./moves-cluster.ts`'s `gatherStrips` records
 * against itself. **And the measurement says the same from the other side:** of
 * the 315 candidates this board admits, only nine are within-strip at all - row
 * 0 has two free holes and the collapse below takes one per strip - and exactly
 * ONE of them is among the 227 that reduce `C` (`move RV_LO_BOOST_1 to 0,33`,
 * at `dC = -1`). A within-strip-only generator would therefore reach one
 * improving candidate out of 227.
 *
 * **IT STRICTLY REDUCES OR IT IS NOT PROPOSED, which is the already-spaced
 * guard and is the whole of it.** A pad with no different-net abutment is named
 * by no gesture, because no destination can lower zero - so on a board whose pad
 * row is already spaced this returns the empty list and the gesture is not
 * proposed forever. Equality is not enough: a candidate that moves a pad without
 * improving the measure is an evaluation spent on a gesture whose own reason for
 * existing it does not serve. `tests/stripboard/moves-space.test.ts` records the
 * mutation that proves this line is load-bearing, and the one that proved an
 * earlier second guard was not.
 *
 * **WHAT IS NOT CHECKED HERE**: whether the pad FITS at the destination.
 * `./moves-space-measure.ts`'s `holesWithCopper` names the gap - a part's body
 * cells hold no `PIN` and are occupied all the same - and `spacingMoves` below
 * is where the one advance answers it. Nothing is silently dropped: that
 * function walks these candidates in order and takes the first that lands, so no
 * strip is lost because its lowest free-looking hole was a body cell.
 */
export function spacingGestures(
  dump: BoardDump,
  dumpText: string,
  reference: ReferenceNets,
): readonly PadMove[] {
  const nets = netOfHoles(dump, dumpText, reference)
  const copper = holesWithCopper(dump)
  const strips = dump.verticalStrips ? dump.grid.cols : dump.grid.rows
  const positions = dump.verticalStrips ? dump.grid.rows : dump.grid.cols
  const moves: PadMove[] = []
  for (const pad of placedPads(dump, dumpText, reference)) {
    const net = pad.net
    if (net === undefined) continue
    const origin = holeKey(pad.row, pad.col)
    // THE PAD'S COUNT WHERE IT STANDS, AND IT IS READ ONCE RATHER THAN GUARDED
    // ON. An `if (standing === 0) continue` stood here and was REMOVED when a
    // mutation could not kill it: the strict comparison below already declines
    // every destination for a quiet pad (nothing is `< 0`), so the early exit
    // was a second spelling of one guard, and a guard a mutation survives is a
    // guard that proves nothing. **There is exactly one already-spaced guard in
    // this file and it is the `>=` below.** What the removal costs, measured
    // rather than asserted: the strip x position loop now runs for a quiet pad
    // too, which is 1,225 abutment reads per quiet pad on a 35x35 board and puts
    // `spacingGestures` on the frozen hand layout - ten quiet pads, the worst
    // case - at 0.65 ms per call, against four fork spawns per evaluation at
    // roughly 11.7 ms each.
    const standing = abutmentsAt(dump, nets, pad.row, pad.col, net, origin)
    for (let strip = 0; strip < strips; strip += 1) {
      for (let position = 0; position < positions; position += 1) {
        const to: readonly [number, number] = dump.verticalStrips
          ? [position, strip]
          : [strip, position]
        const key = holeKey(to[0], to[1])
        // THE PAD'S OWN HOLE IS NOT A DESTINATION: the fork refuses a zero
        // delta for its own stated reason - a candidate byte-identical to its
        // own parent.
        if (key === origin) continue
        // A ONE-HOLE NEIGHBOUR IS NOT A DESTINATION EITHER, AND THE REASON IS
        // THAT IT IS ALREADY IN THE SWEEP. `./moves.ts`' `partMoves` proposes
        // all four of `UNIT_DELTAS`' neighbours for a pad, so a spacing gesture
        // naming one would put a single gesture in the sweep twice under two
        // generators and spend a second evaluation on a byte-identical
        // candidate - which is `./moves-spread.ts`'s decline 3, in its own
        // words: *"Proposing it here would put one gesture in the sweep twice
        // under two names"*. It is MEASURED and not theoretical: on the
        // import-placed low-boost board `move SW_LO_BOOST_7 to 0,33` is both the
        // pad's right-hand unit delta and the first free hole on its own strip.
        // Nothing is lost by the exclusion - `partMoves` proposes exactly the
        // unit deltas the shared advance admits, which is the same test
        // `spacingMoves` applies - and the per-strip slot below is left for the
        // next free hole rather than consumed by the duplicate.
        if (Math.abs(to[0] - pad.row) + Math.abs(to[1] - pad.col) === 1) continue
        if (copper.has(key)) continue
        if (abutmentsAt(dump, nets, to[0], to[1], net, origin) >= standing) continue
        moves.push({ kind: "move", ref: pad.ref, to })
      }
    }
  }
  return moves
}

/**
 * The spacing gestures the move set actually sweeps: **the first destination on
 * each strip, per pad, that the shared advance says lands.**
 *
 * **ONE PER (PAD, STRIP), AND THE IDENTITY BEHIND IT IS WEAKER THAN THIS
 * COMMENT FIRST CLAIMED.** The claim was `./moves-wire.ts`' own - *"two wires
 * joining one pair of strips at different lines join the same two strips and
 * score the same `W`; what differs is which holes they take from later gestures,
 * and that is not modelled"* - read across to a pad's position along a strip. It
 * **holds for a strip NO PIN IS ON** (the arrival is the strip's only block
 * wherever it lands) and **fails for an OCCUPIED one**, because a destination's
 * occupation-order neighbours change with its position and the module comment's
 * block count is what charges for them. So the collapse is sound on 32 of this
 * board's 35 strips by the identity, and on the other three by measurement
 * rather than by the rule.
 *
 * **THE MEASUREMENT, because the gap above is exactly where a tie-break can
 * silently take a worse hole.** Every admissible destination on each of the
 * three occupied strips was scored against the fork - 27 `(pad, strip)` slots,
 * 157 destinations, `docs/stripboard/pipeline-verification.md` section 11.5 has
 * the table: **in 0 of the 27 is the ascending-first hole worse than the best on
 * its strip, and in 0 does a strictly better hole exist.** The cause is not
 * luck - `--import`'s first-fit sweep leaves each occupied strip's free holes in
 * ONE contiguous run at the high end (row 0 from column 33, row 1 from 31, row 2
 * from 23), so every proposed hole on one strip has the same occupation-order
 * predecessor and no successor, and therefore the same arrival cost. **A
 * destination-choice rule was written and NOT taken**: it would have put a
 * second notion of adjacency in this module for a measured benefit of zero, and
 * the standing is `./moves.ts`' `UNIT_DELTAS`' own - changing it needs a run
 * behind it, and the run done here says changing it buys nothing.
 *
 * **IT IS NOT COLLAPSED ACROSS STRIPS, AND THAT DIFFERENCE IS REAL.** Two holes
 * on one strip are the same copper; two on different strips are not, and the
 * module comment's block arithmetic gives them different `dC` outright - a free
 * strip pays nothing for the arrival and an occupied one may pay `+1`. So the
 * collapse is as wide as the identity licenses and no wider: one candidate per
 * strip, 35 on this board, and `F` then `RANKING` tell them apart.
 *
 * **THE ASCENDING TIE-BREAK IS FOR REPRODUCIBILITY.** Ties break to the lowest
 * position so two runs agree, exactly as `./moves-spread.ts`'s
 * `nearestRemaining` breaks its own. It is systematically at the LOW END of a
 * strip, which is not neutral with respect to `RANKING`'s `A_occ` and
 * wirelength positions; what it DOES produce, measured rather than feared, is
 * the ladder in section 11.6, whose seven destinations came out as columns 0, 2,
 * 4, 6, 8, 10 and 12 of strip 3 - **every second hole, a gap emergent from the
 * measure with no gap encoded anywhere in the pair.**
 *
 * **WHAT IT COSTS TO ASK, MEASURED ON 2026-10-13 AND WITH THE UNITS KEPT
 * STRAIGHT, because the first version of this paragraph mixed a run's budget
 * with a climb's rounds.** The proposal pass is `pads x strips x positions`
 * model reads and no fork invocation - a candidate the advance refuses is never
 * evaluated. Measured on the import-placed low-boost board: `spacingGestures`
 * 2.0 ms per call, `spacingMoves` 6.1 ms, and `enumerateMoves` **31.3 ms
 * without this generator and 40.9 ms with it** - so the enumeration costs about
 * 9.6 ms more per round, against a round of 374 evaluations at four fork spawns
 * each, which at PIPELINE 4.6's governing 11.71 ms per invocation is about 17.5
 * seconds. **The model pass is a fifth of a percent of the round it enumerates**
 * and is not where the cost is. (`./movable.ts` records *"4.7 ms for a whole
 * `enumerateMoves` on the real low-boost board"*; that figure does not
 * reproduce - the same call on the same fixture with this generator removed is
 * 31.3 ms - and section 11.7 records the discrepancy rather than this comment
 * citing it.)
 *
 * **The survivors cost one evaluation each, and on that board there are 315**,
 * taking its whole move set from 59 to 374.
 *
 *   - **That 6.3x is ROUND 0 ONLY**, the smallest round a climb has. §6.9's
 *     `random` seed 3 is 11,842 evaluations over 63 rounds, so a round there
 *     averages **188**; 315 on top of that is a round of about 503, a **~2.7x**
 *     marginal multiplier mid-climb.
 *   - **CRITERIA `Q5`'s 20,000 cap is RUN-LEVEL and divided** -
 *     `./search.ts` hands each climb `evaluationCap: remaining` - while §6.9's
 *     round counts are PER CLIMB. At the committed five seeds a climb would get
 *     about 4,000, so about **8 rounds at 503 against §6.9's 63**; driven at one
 *     seed it gets the whole 20,000, so about **40**.
 *   - **But the kind exhausts itself**, so neither squeeze is the real figure:
 *     the whole ladder from 315 to 0 is about **1,260 extra evaluations**, under
 *     11% of one §6.9-sized climb. Section 11.6 has it.
 *
 * It is reported rather than narrowed on a guess, which is what
 * `./moves-cluster.ts`'s `gatherStrips` records a cost guess doing to this
 * repository's record. **Section 11.3 names one narrowing that IS available with
 * its exact size** - the own-block predicate would take 315 to 245 and remove
 * exactly the 70 candidates that cannot reduce `C` - and says why it was not
 * taken: 66 of those 70 are `dC = 0` candidates whose benefit, if any, is in the
 * ranking, and §6.11 records what excluding such candidates on a first-order
 * cost argument cost this repository last time.
 */
export function spacingMoves(
  occupancy: Occupancy,
  dump: BoardDump,
  dumpText: string,
  reference: ReferenceNets,
): readonly PadMove[] {
  const taken = new Set<string>()
  const moves: PadMove[] = []
  for (const move of spacingGestures(dump, dumpText, reference)) {
    const key = `${move.ref}@${stripOf({ row: move.to[0], col: move.to[1] }, dump.verticalStrips)}`
    if (taken.has(key)) continue
    // NO `type` ARGUMENT, AND THE OMISSION IS CORRECT RATHER THAN LAZY: a `PAD`
    // line carries no VeroRoute type, and `occupancyAfter` needs one only for a
    // `stretch` - which `./moves.ts`' `partMoves` already refuses to propose for
    // a pad, and which this file never proposes at all.
    if (occupancyAfter(occupancy, dump, move) === undefined) continue
    taken.add(key)
    moves.push(move)
  }
  return moves
}
