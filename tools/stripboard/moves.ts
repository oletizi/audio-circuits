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
 * **THE ORDER IS DECLARED, NEVER INCIDENTAL.** `enumerateMoves` iterates the
 * dump's `parts` ARRAY, the dump's `wires` ARRAY, this file's own
 * `UNIT_DELTAS` and the reference netlist's `Map` - whose iteration order is
 * its INSERTION order, which `referenceNetsFromExport` fills in the netlist's
 * own order. **No move's POSITION depends on a `Record`'s iteration:** where a
 * strip set is gathered off `dump.pins` - the spread's two, and `wireMovesFor`'s
 * - it goes into a `Set` and is then walked in ascending STRIP order, which is
 * `./targets.ts`'s `occupiedStrips`' own shape. A run whose move order varied
 * between runs could not be reproduced, and Task 13's `canonicalHash` exists to
 * prove runs reproduce. `tests/stripboard/moves.test.ts` holds the net order by
 * reversing the reference map and demanding the cluster moves reverse with it.
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
import {
  clusterAfter,
  clusterMove,
  gatherMove,
  gatherStrips,
  translationsAfter,
} from "./moves-cluster.ts"
import { DEFERRED_KINDS, type Move } from "./moves-model.ts"
import {
  spreadAfter,
  spreadMove,
  spreadSourceStrips,
  spreadTargetStrips,
} from "./moves-spread.ts"
import { wireAfter, wireMovesFor } from "./moves-wire.ts"
import { stretchBoundFor, type Occupancy } from "./seed-geometry.ts"
import { appliedGestures, rectOf } from "./seed-placement.ts"
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
 * relocation plus its rejoining wire IS, and where that leaves the geometry.
 *
 * Same arrangement and same reason as the cluster and the wire below: this is
 * the module the plan names and every consumer imports, and the split is at the
 * what-is-a-spread seam.
 */
export {
  spreadAfter,
  spreadMove,
  spreadSourceStrips,
  spreadTargetStrips,
} from "./moves-spread.ts"


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
 * specs, not any run - and the order of the four carries no preference either;
 * it is fixed so that the sweep is reproducible. Widening it is a deliberate
 * edit with a run behind it.
 */
const UNIT_DELTAS: readonly (readonly [number, number])[] = [[-1, 0], [0, 1], [1, 0], [0, -1]]

/**
 * The ONE gesture order named in this file, and naming it chooses nothing:
 * every call below passes zero for one of `appliedGestures`' two counts, where
 * `./seed-placement.ts` states outright that at zero "both orders are the same
 * sequence". Task 18's cluster move is the first compound gesture and the
 * choice is its.
 */
const SINGLE_GESTURE_ORDER = "turn-then-stretch" as const

/**
 * The occupancy after `move` is applied, or `undefined` when the model says the
 * fork would refuse the gesture.
 *
 * **THIS IS THE ONE PLACE A GESTURE'S EFFECT ON THE PART GEOMETRY IS COMPUTED,
 * AND IT IS TASK 16'S `appliedGestures` UNDERNEATH** - transcribed from
 * `Board::RotateComps` and held against the real binary across 43 gestures and
 * 11 placements with zero divergence. **There is no second occupancy advance in
 * this pipeline:** `enumerateMoves` proposes a move exactly when this returns
 * an occupancy, and `climb` advances its carried state with the same call, so
 * the set the search sweeps and the state it carries cannot disagree about what
 * a gesture does.
 *
 * **WHY THE CLIMB CARRIES AN OCCUPANCY AT ALL rather than re-reading one from
 * each dump.** A dump does not describe a TURNED part's footprint: for a part
 * facing `N` or `S`, `SPAN` is the footprint's ROW count and its stretched
 * length appears in no dump line (COST §7.3 item 2 - `GetCompRows`, which
 * `--dump-board` does not report). So `occupancyOf` REFUSES such a board, and a
 * climb that re-derived its geometry each round could take a turn and then be
 * unable to read the result. Measured, before this was carried: the climb
 * accepted gestures through round 0 and then refused with `part "C18": it faces
 * N`, which is why `rotate` was briefly in `DEFERRED_KINDS` and is not any
 * more. `./seed-placement.ts` reached the same wall and states the same answer:
 * *"THE OCCUPANCY IS TRACKED, NOT RE-READ."*
 *
 * The family bound is checked HERE and not only at the proposal, so the two
 * cannot drift: `Component::CanStretch` returns `false` outright for a family
 * not on its list, and a geometric fit is not a stretchable part.
 */
export function occupancyAfter(
  occupancy: Occupancy,
  dump: BoardDump,
  move: Move,
  type?: string,
): Occupancy | undefined {
  // THE WIRE KINDS. An `add-wire` PUTS A RECT ON THE BOARD - `occupancyOf` reads
  // every wire's own rect now, measured against the fork, which is what let this
  // kind out of DEFERRED_KINDS at all - so its advance is the plan applied to the
  // occupancy, through the same `appliedGestures` every other kind uses.
  if (move.kind === "add-wire") {
    return wireAfter(occupancy, dump.grid, move.plan)
  }
  if (move.kind === "delete-wire") {
    throw new Error(
      "occupancyAfter: a \"delete-wire\" move's effect is not modelled, and the reason is the " +
        "FORK rather than this module: no verb and no --author op removes a component, and " +
        "--update leaves wires in place (both measured - see DEFERRED_KINDS). So there is no " +
        "gesture to advance past. It is in DEFERRED_KINDS, so applicableMoves keeps it out of " +
        "the sweep and this is unreachable from climb; reaching it means a caller advanced past " +
        "a gesture it had not applied.",
    )
  }
  // THE TWO COMPOUND KINDS, THROUGH THE SAME `appliedGestures` THE SINGLE MOVE
  // USES, one part at a time in the order the move itself records - see `Move`'s
  // cluster and gather arms for why the order travels on the move. A cluster is
  // one delta for every part and a gather is one delta per part; underneath,
  // both are `translationsAfter`, so there is one advance and not three.
  if (move.kind === "cluster") {
    return clusterAfter(occupancy, dump.grid, move.refs, move.delta)
  }
  if (move.kind === "gather") {
    return translationsAfter(occupancy, dump.grid, move.gestures)
  }
  // THE THIRD COMPOUND KIND, AND IT IS THE OTHER TWO ADVANCES COMPOSED: the
  // relocations through `translationsAfter`, then the wire through `wireAfter`.
  // `./moves-spread.ts`'s `spreadAfter` is that composition and nothing else, so
  // a spread's geometry is computed by exactly the arithmetic its halves are.
  if (move.kind === "spread") {
    return spreadAfter(occupancy, dump.grid, move.gestures, move.wire)
  }
  if (move.kind === "move") {
    return appliedGestures(occupancy, dump.grid, move.ref, move.to, 0, 0, SINGLE_GESTURE_ORDER)
  }
  const rect = rectOf(occupancy, move.ref)
  const origin: readonly [number, number] = [rect.row, rect.col]
  if (move.kind === "rotate") {
    if (move.direction === "ccw") {
      throw new Error(
        "occupancyAfter: an anticlockwise turn has no modelled landing rect. " +
          "tools/stripboard/seed-placement.ts's turnedRect is Board::RotateComps's CLOCKWISE " +
          "case, line by line, and nothing in this repository has transcribed the anticlockwise " +
          "one - so the occupancy cannot be advanced past this gesture and the search must not " +
          "propose it. It is NOT assumed to be the mirror of the clockwise case: that is a " +
          "claim about arithmetic nobody has read. Transcribe the other case with a row in " +
          "tests/stripboard/seed-geometry.test.ts beside it, or keep proposing cw only.",
      )
    }
    return appliedGestures(occupancy, dump.grid, move.ref, origin, 1, 0, SINGLE_GESTURE_ORDER)
  }
  if (type === undefined) {
    throw new Error(
      `occupancyAfter: a stretch of ${move.ref} needs the part's VeroRoute TYPE to find its ` +
        "family's length bound, and none was given. Component::CanStretch is a fixed family " +
        "list and a geometric fit is not a stretchable part - that is what refused a --stretch " +
        "on a SIP5 after 24 accepted gestures. Pass the dump's PART type.",
    )
  }
  const bound = stretchBoundFor(type)
  if (!bound.stretchable) return undefined
  // THE BOUND IS CHECKED AGAINST THE EXTENT THAT STRETCHES, WHICH IS THE AXIS
  // THE LEADS RUN ALONG - `rect.rows` once the part has been turned across the
  // strips, `rect.cols` while it lies along them. It is the SAME axis
  // `stretchedRect` moves, and reading `rect.cols` for every part regardless of
  // its facing is the defect this replaces: measured on the arm comparison's
  // own run, where a turned CAP_FILM_WIDE already at its minimum length was
  // proposed a shrink and the fork refused it, stopping the run after seven
  // rounds (`docs/stripboard/pipeline-verification.md` section 6.3). A square
  // footprint hides it - a 3x3 rect reads the same on both axes - which is why
  // it survived every fixture until a real board turned a 2x3 one.
  const along = rect.across ? rect.rows : rect.cols
  if (move.direction === "grow" && !(along < bound.maxLength)) return undefined
  if (move.direction === "shrink" && !(along > bound.minLength)) return undefined
  const by = move.direction === "grow" ? 1 : -1
  return appliedGestures(occupancy, dump.grid, move.ref, origin, 0, by, SINGLE_GESTURE_ORDER)
}

/**
 * Every `move`, `rotate` and `stretch` the model admits, in the DUMP'S PART
 * ORDER with each part's rect read from the CARRIED occupancy.
 *
 * The order is the dump's and the geometry is the occupancy's, and the split
 * matters: the order has to be reproducible (Task 13's hash) while the geometry
 * has to survive a turn, which the dump's own `PART` line does not.
 */
function partMoves(occupancy: Occupancy, dump: BoardDump): readonly Move[] {
  const moves: Move[] = []
  for (const part of dump.parts) {
    const rect = rectOf(occupancy, part.ref)
    const admits = (move: Move): boolean =>
      occupancyAfter(occupancy, dump, move, part.type) !== undefined
    for (const [dRow, dCol] of UNIT_DELTAS) {
      const to: readonly [number, number] = [rect.row + dRow, rect.col + dCol]
      const move: Move = { kind: "move", ref: part.ref, to }
      if (admits(move)) moves.push(move)
    }
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
    const turn: Move = { kind: "rotate", ref: part.ref, direction: "cw" }
    if (admits(turn)) moves.push(turn)
    for (const direction of ["grow", "shrink"] as const) {
      const stretch: Move = { kind: "stretch", ref: part.ref, direction }
      if (admits(stretch)) moves.push(stretch)
    }
  }
  return moves
}

/**
 * Every `add-wire` the model admits, from `./moves-wire.ts`, and every
 * `delete-wire` the board's own `WIRE` lines name.
 *
 * **THE ADD-WIRE ENUMERATION MOVED AND CHANGED SHAPE.** It used to propose a
 * wire anchored at a PIN hole for each consecutive cross-strip pair of a net's
 * pins - which `DEFERRED_KINDS` then had to refuse, because the fork anchors a
 * wire only at a FREE hole. The kind is compound now: `./moves-wire.ts` plans a
 * wire that is created at a free hole, turned across the strips and stretched to
 * reach, one candidate per pair of strips a net is split across. The reasons,
 * the four fork measurements and the narrowings are all stated there.
 *
 * `delete-wire` is still enumerated and still refused by `DEFERRED_KINDS`, whose
 * entry now carries the measurement rather than a reading: no verb and no
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
 * **IT IS NARROWED LIKE EVERY OTHER KIND, AND THAT IS A CHANGE FROM TASK 17**,
 * which emitted all four deltas of every net unconditionally because nothing
 * could apply them yet. A cluster whose sequence cannot be completed is not
 * proposed, for `partMoves`' reason: a set whose members were discovered by
 * attempting them would spend four invocations per refusal, and this one would
 * spend one per part on top.
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
  reference: ReferenceNets,
): readonly Move[] {
  const moves: Move[] = []
  for (const [net] of reference) {
    for (const delta of UNIT_DELTAS) {
      const move = clusterMove(occupancy, dump, reference, net, delta)
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
  reference: ReferenceNets,
): readonly Move[] {
  const moves: Move[] = []
  for (const [net] of reference) {
    for (const strip of gatherStrips(dump)) {
      const move = gatherMove(occupancy, dump, reference, net, strip)
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
  reference: ReferenceNets,
): readonly Move[] {
  const targets = spreadTargetStrips(dump)
  const moves: Move[] = []
  for (const [net] of reference) {
    for (const from of spreadSourceStrips(dump, reference, net)) {
      for (const to of targets) {
        const move = spreadMove(occupancy, dump, reference, net, from, to)
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
  reference: ReferenceNets,
): readonly Move[] {
  return [
    ...partMoves(occupancy, dump),
    ...wireMoves(occupancy, dump, reference),
    ...clusterMoves(occupancy, dump, reference),
    ...gatherMoves(occupancy, dump, reference),
    ...spreadMoves(occupancy, dump, reference),
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
