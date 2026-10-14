/**
 * The MOVE SET: what a candidate layout can differ from the current one by, and
 * how one such difference is applied to a board file.
 *
 * THE AUTHORITY is `docs/superpowers/specs/
 * 2026-10-10-stripboard-placement-cost-design.md` §6.1, which names the five
 * single-part moves (`move`, `rotate`, `stretch`, `add-wire`, `delete-wire`),
 * and §7.4 of `docs/superpowers/specs/2026-10-10-stripboard-pipeline-design.md`,
 * which adds the net-cluster move. Where this module and those documents differ
 * the documents win and this comment is the defect - **with the two named
 * exceptions `./moves-model.ts`'s header carries, `gather` and `spread`, each
 * with the ruling or the owner's instruction that put it there.**
 *
 * **THE ORDER IS DECLARED, NEVER INCIDENTAL.** `enumerateMoves` iterates
 * `./movable.ts`'s union - the dump's `parts` ARRAY, then its placed `PAD`
 * lines in the order the dump prints them, so adding pads appended to the
 * sequence and moved no existing candidate's index - the dump's `wires` ARRAY,
 * this file's own `UNIT_DELTAS` and the reference netlist's `Map` - whose
 * iteration order is
 * its INSERTION order, which `referenceNetsFromExport` fills in the netlist's
 * own order. **No move's POSITION depends on a `Record`'s iteration:** where a
 * strip set is gathered off `dump.pins` - the spread's two, and `wireMovesFor`'s
 * - it goes into a `Set` and is then walked in ascending STRIP order, which is
 * `./targets.ts`'s `occupiedStrips`' own shape. A run whose move order varied
 * between runs could not be reproduced, and Task 13's `canonicalHash` exists to
 * prove runs reproduce. `tests/stripboard/moves.test.ts` holds the net order by
 * reversing the reference map and demanding the cluster moves reverse with it.
 * **The SPACING gestures take their order from the same union** - the dump's
 * `PAD` lines in their own order, then strips ascending, then positions along
 * each strip ascending - and `./moves-space.ts` states it there.
 *
 * **FOUR OF THE EIGHT KINDS ARE EXACTLY ONE GESTURE AND FOUR ARE COMPOUND** -
 * `move`, `rotate`, `stretch` and `delete-wire` against `add-wire`, `cluster`,
 * `gather` and `spread`. A compound gesture has to choose a SEQUENCE, and each
 * one's choice is stated and tested where that kind lives: the order of the
 * PARTS in `./moves-cluster.ts`, the turn-versus-stretch order in
 * `./moves-wire.ts` through `GESTURE_ORDERS`, and the relocations-then-wire
 * order in `./moves-spread.ts`. The three single-part kinds are one fork
 * invocation each and call `appliedGestures` with one of its two counts at zero,
 * where `./seed-placement.ts` states outright that "both orders are the same
 * sequence".
 *
 * **THE ENUMERATION IS NARROWED BY THE TRANSCRIBED MODEL, AND THE FORK REMAINS
 * THE AUTHORITY.** A move is proposed only when `tools/stripboard/
 * seed-placement.ts`'s arithmetic - transcribed from `Board::RotateComps` and
 * held against the real binary by `tests/stripboard/seed-geometry.test.ts` -
 * says the gesture lands in bounds and clear of the other parts. A set whose
 * members were discovered by attempting them would spend four invocations per
 * refusal. When the fork refuses anyway, `applyMove` stops the run and names
 * the gesture rather than skipping it - a divergence between the model and the
 * binary is a finding, not a candidate to drop quietly.
 *
 * **ONE OF THE EIGHT KINDS CANNOT BE APPLIED TODAY AND THAT IS DECLARED, NOT
 * DISCOVERED** - `delete-wire`, blocked on the FORK and not on this repository.
 * `DEFERRED_KINDS` names it with the reason, in one place, and both
 * `applicableMoves` and `applyMove` read it. It is still ENUMERATED, because
 * the enumeration is the spec's move set and a kind missing from it would be
 * invisible.
 */
import type { BoardDump } from "../guide/dump.ts"
import type { ReferenceNets } from "./equivalence.ts"
import { clusterMove, gatherMove, gatherStrips } from "./moves-cluster.ts"
import { movableRefs } from "./movable.ts"
import { occupancyAfter } from "./moves-advance.ts"
import { DEFERRED_KINDS, type Move } from "./moves-model.ts"
import { spacingMoves } from "./moves-space.ts"
import { spreadMove, spreadSourceStrips, spreadTargetStrips } from "./moves-spread.ts"
import { wireMovesFor } from "./moves-wire.ts"
import type { Occupancy } from "./seed-geometry.ts"
import { rectOf } from "./seed-placement.ts"
import type { SpawnVeroroute } from "./seed.ts"

/**
 * The move set's vocabulary, re-exported from `./moves-model.ts`: the union, the
 * one listing of its kinds, the declared deferrals, the description and the
 * applicable subset.
 *
 * This is the module the plan names and every consumer imports. The split is at
 * the what-is-a-move / which-moves-does-this-board-admit seam and was forced by
 * the 500-line ceiling when `gather` arrived.
 */
export {
  addsWire,
  applicableMoves,
  DEFERRED_KINDS,
  describeMove,
  MOVE_KINDS,
  type Move,
} from "./moves-model.ts"

/**
 * The spread model, re-exported from `./moves-spread.ts`: what one net's partial
 * relocation plus its rejoining wire IS, which two strips it may use, and where
 * that leaves the geometry. Same arrangement and reason as the cluster and the
 * wire below, at the what-is-a-spread seam.
 */
export {
  spreadAfter,
  spreadMove,
  spreadSourceStrips,
  spreadTargetStrips,
} from "./moves-spread.ts"

/**
 * The spacing model, re-exported from `./moves-space.ts`: the different-net
 * abutment count a packed pad row scores, the destinations the measure admits,
 * and the narrowed set the sweep takes.
 *
 * Same arrangement and reason as the blocks around it - this is the module every
 * consumer names. `spacingGestures` is exported rather than kept private
 * because a spacing gesture is a `move` and carries no kind of its own, so a
 * reader counting what the gesture did intersects the enumeration with it;
 * `./moves-space.ts`'s header records that decision and what it costs.
 */
export { padAbutments, spacingGestures, spacingMoves } from "./moves-space.ts"

/**
 * The occupancy advance, re-exported from `./moves-advance.ts`: what one gesture
 * does to the board's geometry, and whether the model says it lands at all.
 *
 * Same arrangement and same reason as the blocks above and below - this is the
 * module every consumer names - and the split is at the propose/advance seam,
 * forced by the 500-line ceiling when the move set learnt to see a pad.
 */
export { occupancyAfter } from "./moves-advance.ts"

/**
 * The four one-hole neighbours a `move` proposes, in the one order this file
 * declares: up, right, down, left.
 *
 * **ONE HOLE, AND IT IS AN UNMEASURED CHOICE WITH A STATED REASON.** A round is
 * a full sweep of the move set (COST §6.4), so the sweep's cost has to stay
 * linear in the number of parts: enumerating every origin on the grid would
 * make one round 1225 evaluations per part on a 35x35 board. The one-hole
 * neighbourhood is the smallest that can still reach any origin by composition
 * across rounds, which is what a hill climb does with it. **NOTHING HAS
 * MEASURED WHETHER IT IS THE RIGHT SHAPE OR SIZE** - not this file, not the
 * specs, not any run - and the order of the four carries no preference; it is
 * fixed so the sweep is reproducible. Widening it needs a run behind it.
 */
const UNIT_DELTAS: readonly (readonly [number, number])[] = [[-1, 0], [0, 1], [1, 0], [0, -1]]

/**
 * Every `move`, `rotate` and `stretch` the model admits, over the MOVABLE SET
 * in the dump's own order, with each ref's rect read from the CARRIED
 * occupancy.
 *
 * The order is the dump's and the geometry is the occupancy's, and the split
 * matters: the order has to be reproducible (Task 13's hash) while the geometry
 * has to survive a turn, which the dump's own `PART` line does not.
 *
 * **IT IS NO LONGER ONE KIND PER REF.** A pad gets `move` alone and a part gets
 * all three; the reason is stated at the `continue` below, where the narrowing
 * is.
 */
function partMoves(occupancy: Occupancy, dump: BoardDump, dumpText: string): readonly Move[] {
  const moves: Move[] = []
  const typeOf = new Map(dump.parts.map((part) => [part.ref, part.type]))
  // THE MOVABLE SET AND NOT `dump.parts`, WHICH IS THE WHOLE OF WHY NO BOARD
  // COULD BE FINISHED. An off-board pad - the hole a panel-mounted pot or
  // selector's wire lands in - is a `PAD` line and never a `PART` line, so this
  // loop could not name one and no arm ever moved one. The fork can; the
  // measurement and the union are `./movable.ts`'s.
  for (const one of movableRefs(dump, dumpText)) {
    const rect = rectOf(occupancy, one.ref)
    const type = typeOf.get(one.ref)
    const admits = (move: Move): boolean => occupancyAfter(occupancy, dump, move, type) !== undefined
    for (const [dRow, dCol] of UNIT_DELTAS) {
      const to: readonly [number, number] = [rect.row + dRow, rect.col + dCol]
      const move: Move = { kind: "move", ref: one.ref, to }
      if (admits(move)) moves.push(move)
    }
    // **A PAD GETS `move` AND NOTHING ELSE, MEASURED RATHER THAN PREFERRED.**
    // `--move` on a pad is measured (`./movable.ts`); `--rotate` on one is not
    // measured at all, so a turn's landing rect would be a claim about
    // arithmetic nobody has read against the fork - the same ground the
    // clockwise-only narrowing below stands on. `--stretch` cannot even be
    // asked: the bound comes from the part's VeroRoute TYPE and a `PAD` line
    // carries none, so `occupancyAfter` refuses by name rather than returning
    // `undefined`. Widening either is a deliberate edit with a fork run beside
    // it, exactly as `./seed-geometry.ts`'s whitelist entries are.
    //
    // **AND A PAD'S `move` IS NO LONGER ONLY THESE FOUR UNIT DELTAS.**
    // `./moves-space.ts`'s `spacingMoves`, enumerated beside this function in
    // `enumerateMoves`, proposes a pad's move to a free hole further off - for
    // the measured reason that a one-hole neighbourhood cannot unpack a row
    // `--import` packed: on the import-placed low-boost board eight of the ten
    // pads are boxed in on all four sides and THIS loop yields three pad
    // gestures in total. That widening is a `move` and not a ninth kind, and
    // the reason for that decision is recorded in that file's header.
    if (one.kind === "pad") continue
    // CLOCKWISE ONLY, AND THE REASON IS WHAT HAS BEEN TRANSCRIBED. `turnedRect`
    // is `Board::RotateComps`'s CLOCKWISE case, line by line, and nothing in
    // this repository has transcribed the anticlockwise one - so an enumerated
    // `ccw` would be a gesture whose landing rect no model predicts, testable
    // only by attempting it. The `Move` union admits `ccw` because `--rotate`
    // does, and `applyMove` applies either faithfully; only the PROPOSAL is
    // narrowed, and widening it means transcribing the other case with a row in
    // tests/stripboard/seed-geometry.test.ts beside it.
    //
    // WHAT CLOCKWISE-ONLY DOES AND DOES NOT COST, MEASURED THROUGH `turnedRect`
    // rather than argued. Four quarter turns are a full turn, so all four
    // facings are reachable in one, two or three steps - across rounds, each
    // step being its own move. And the rect cycle is SHORTER than that: on a
    // part the dump can describe (1 row by its span, leads along the columns)
    // TWO clockwise turns land it back on its own origin exactly - `2,1 1x6` ->
    // `0,3 6x1` -> `2,1 1x6`, and the same at spans 3, 5 and 7 - so the cw-only
    // set reaches exactly two rect positions, not four.
    // **SO IT IS NOT A FREE RESTRICTION, AND THE LIMIT IS STATED RATHER THAN
    // WAVED PAST:** reaching the third facing takes three successive turns and
    // each of them has to fit on its own, so a single `ccw` could be takeable
    // on a crowded board where the chain is not. Whether that happens is
    // unmeasured. `tests/stripboard/moves.test.ts` holds the two-turn cycle so
    // this claim fails rather than rots.
    const turn: Move = { kind: "rotate", ref: one.ref, direction: "cw" }
    if (admits(turn)) moves.push(turn)
    for (const direction of ["grow", "shrink"] as const) {
      const stretch: Move = { kind: "stretch", ref: one.ref, direction }
      if (admits(stretch)) moves.push(stretch)
    }
  }
  return moves
}

/**
 * Every `add-wire` the model admits, from `./moves-wire.ts`, and every
 * `delete-wire` the board's own `WIRE` lines name.
 *
 * `./moves-wire.ts` plans a wire created at a FREE hole - the fork anchors one
 * nowhere else - then turned across the strips and stretched to reach, one
 * candidate per pair of strips a net is split across; its reasons, the four fork
 * measurements and the narrowings are stated there.
 *
 * `delete-wire` is still enumerated and still refused by `DEFERRED_KINDS`, whose
 * entry carries the measurement rather than a reading: no verb and no
 * `--author` op removes a component, and `--update` leaves wires in place.
 */
function wireMoves(
  occupancy: Occupancy,
  dump: BoardDump,
  reference: ReferenceNets,
): readonly Move[] {
  const moves: Move[] = [...wireMovesFor(occupancy, dump, reference)]
  for (const wire of dump.wires) moves.push({ kind: "delete-wire", name: wire.name })
  return moves
}

/**
 * Every `cluster` the model admits: each net in the NETLIST'S order, by each of
 * the four unit deltas, with the parts and their gesture order from
 * `./moves-cluster.ts`.
 *
 * **IT IS NARROWED LIKE EVERY OTHER KIND.** A cluster whose sequence cannot be
 * completed is not proposed, for `partMoves`' reason: a set whose members were
 * discovered by attempting them would spend four invocations per refusal, and
 * this one would spend one per part on top.
 *
 * **THE DELTAS ARE THE SAME FOUR `UNIT_DELTAS` A SINGLE `move` USES, AND THAT IS
 * A LIMIT WORTH NAMING.** A cluster therefore translates a net's parts ONE HOLE
 * at a time, so a gathering that needs two holes takes two rounds and each
 * intermediate step has to fit on its own. Whether a wider neighbourhood would
 * pay is unmeasured, exactly as `UNIT_DELTAS` says of itself for the single-part
 * case; widening it is a deliberate edit with a run behind it.
 */
function clusterMoves(
  occupancy: Occupancy,
  dump: BoardDump,
  dumpText: string,
  reference: ReferenceNets,
): readonly Move[] {
  const moves: Move[] = []
  for (const [net] of reference) {
    for (const delta of UNIT_DELTAS) {
      const move = clusterMove(occupancy, dump, dumpText, reference, net, delta)
      if (move !== undefined) moves.push(move)
    }
  }
  return moves
}

/**
 * Every `gather` the model admits: each net in the NETLIST'S order, onto each of
 * the strips that net's own pins occupy, ascending.
 *
 * **THIS IS THE LEVER `cluster` TURNED OUT NOT TO BE**, and
 * `./moves-model.ts`'s `gather` arm carries the ruling and the measurement
 * behind that sentence. `./moves-cluster.ts` chooses the deltas and their order;
 * this function is only the enumeration, in the one order that makes a run
 * reproducible.
 *
 * **IT ASKS ABOUT EVERY STRIP AND NOT ONLY THE NET'S OWN**, which is the
 * widening `gatherStrips` carries the reason for: the narrow set proposed zero
 * gathers on a board with 32 empty rows and let that be written down as a
 * property of the board. The cost of asking is `nets x strips` model calls per
 * round - no fork invocation, because a candidate that does not fit is never
 * evaluated - and the cost of the ones that FIT is one evaluation each, which
 * §6.8 measures rather than estimates.
 */
function gatherMoves(
  occupancy: Occupancy,
  dump: BoardDump,
  dumpText: string,
  reference: ReferenceNets,
): readonly Move[] {
  const moves: Move[] = []
  for (const [net] of reference) {
    for (const strip of gatherStrips(dump)) {
      const move = gatherMove(occupancy, dump, dumpText, reference, net, strip)
      if (move !== undefined) moves.push(move)
    }
  }
  return moves
}

/**
 * Every `spread` the model admits: each net in the NETLIST'S order, off each
 * strip where that net's pins ABUT ANOTHER NET'S (ascending), onto each strip
 * holding NO PIN (ascending).
 *
 * **THIS IS THE LEVER THE OWNER CORRECTED US ON, and `./moves-spread.ts`'s
 * header carries his words, the identity's three cases and the whole account of
 * the gesture.** That module chooses the movers, the delta, the strip the wire
 * joins back to, the line the wire sits on AND which two strips are worth
 * asking about; this function is only the enumeration, in the one order that
 * makes a run reproducible.
 *
 * **THE TWO STRIP SETS ARE NARROW BECAUSE THE IDENTITY SAYS THE OTHERS CANNOT
 * PAY, not because asking was expensive.** A spread onto an occupied strip is
 * `dC = +1` and a spread that only adds a strip to a net is `dC = 0`, so both
 * are `+0.25` in `F` before anything is measured. That is a derivation and not
 * a cost guess - which matters, because `./moves-cluster.ts`'s `gatherStrips`
 * records what a cost guess did to this repository's own record.
 *
 * **WHAT IT COSTS TO ASK.** The attempts are
 * `nets x (that net's crowded strips) x (free strips)` per round - no fork
 * invocation, because a candidate that does not fit is never evaluated - and
 * the ones that FIT cost one evaluation each PLUS one `--update`, which
 * `addsWire` decides. The figure for the import-placed low-boost board is in
 * `docs/stripboard/pipeline-verification.md`, measured on the sweep this kind
 * was added for rather than projected here.
 */
function spreadMoves(
  occupancy: Occupancy,
  dump: BoardDump,
  dumpText: string,
  reference: ReferenceNets,
): readonly Move[] {
  const targets = spreadTargetStrips(dump)
  const moves: Move[] = []
  for (const [net] of reference) {
    for (const from of spreadSourceStrips(dump, dumpText, reference, net)) {
      for (const to of targets) {
        const move = spreadMove(occupancy, dump, dumpText, reference, net, from, to)
        if (move !== undefined) moves.push(move)
      }
    }
  }
  return moves
}

/**
 * The whole move set for one board, in `MOVE_KINDS`' order within a
 * deterministic order of parts, nets and wires.
 *
 * **IT READS NO OCCUPANCY AT ALL: the caller hands one in.** It used to derive
 * one with `occupancyOf`, and that is exactly what made a turn unenumerable -
 * a dump cannot describe a turned part's footprint. The refusals `occupancyOf`
 * raises for a board it cannot read now belong to whoever reads the FIRST
 * occupancy off a starting board, which is `seedCandidate` and nothing else in
 * the search.
 */
export function enumerateMoves(
  occupancy: Occupancy,
  dump: BoardDump,
  dumpText: string,
  reference: ReferenceNets,
): readonly Move[] {
  return [
    ...partMoves(occupancy, dump, dumpText),
    // THE SPACING GESTURES, IMMEDIATELY AFTER THE MOVES THEY WIDEN. They are
    // `move` gestures and not a ninth kind - `./moves-space.ts`'s header carries
    // the reason, and the consequence here is that `MOVE_KINDS`' order is
    // untouched: no kind appears for the first time at this position, so the
    // listing's "in the order enumerateMoves emits them" still reads true.
    ...spacingMoves(occupancy, dump, dumpText, reference),
    ...wireMoves(occupancy, dump, reference),
    ...clusterMoves(occupancy, dump, dumpText, reference),
    ...gatherMoves(occupancy, dump, dumpText, reference),
    ...spreadMoves(occupancy, dump, dumpText, reference),
  ]
}

/**
 * `applyMove` and its transport, re-exported from `./moves-apply.ts`.
 *
 * This is the module the plan names and every consumer imports, exactly as
 * `./seed.ts` re-exports `./seed-arms.ts` and `./seed-placement.ts`. The split
 * is at the enumerate/apply seam and was forced by the 500-line ceiling.
 */
export { applyMove, type GestureTransport } from "./moves-apply.ts"

/**
 * The net-cluster model, re-exported from `./moves-cluster.ts`: which parts a
 * net's cluster moves, in what order, and where that leaves the geometry.
 *
 * Same arrangement and same reason as the line above: this is the module the
 * plan names and every consumer imports, and the split is at the
 * what-is-a-cluster seam, forced by the 500-line ceiling.
 */
export {
  clusterAfter,
  clusterMove,
  clusterRefs,
  clusterSequence,
  gatherMove,
  gatherStrips,
  translationsAfter,
  type Translation,
} from "./moves-cluster.ts"

/**
 * The wire model, re-exported from `./moves-wire.ts`: the plan a compound
 * `add-wire` carries, the bridge arithmetic and the occupancy it leaves.
 *
 * Same arrangement and same reason as the lines above: this is the module the
 * plan names, and the split is at the what-is-an-add-wire seam.
 */
export {
  nextWireName,
  wireAfter,
  wireAlong,
  wireBridge,
  wireMovesFor,
  type WireLanding,
  type WirePlan,
} from "./moves-wire.ts"
