/**
 * THE OCCUPANCY ADVANCE: what one gesture does to the board's geometry.
 *
 * **ITS OWN FILE FOR THE 500-LINE CEILING**, and the seam is the one `./moves.ts`'s
 * own header already draws between proposing a difference and computing its
 * effect. That file was parked at exactly 499 lines, so the first addition to it
 * broke the rule; the split is at the propose/advance seam rather than inside the
 * enumeration, because the enumeration's ORDER is a single declared thing that
 * `enumerateMoves` has to keep in one place.
 *
 * `./moves.ts` re-exports `occupancyAfter`, exactly as it re-exports
 * `./moves-apply.ts`'s `applyMove` and `./moves-cluster.ts`'s cluster model, so
 * every existing importer is unaffected and there is one module a consumer
 * names.
 *
 * **NOTHING HERE PROPOSES A MOVE.** `./moves.ts` decides which gestures to ask
 * about and in what order; this answers only whether one lands and where it
 * leaves the geometry.
 */
import type { BoardDump } from "../guide/dump.ts"
import { clusterAfter, translationsAfter } from "./moves-cluster.ts"
import type { Move } from "./moves-model.ts"
import { spreadAfter } from "./moves-spread.ts"
import { wireAfter } from "./moves-wire.ts"
import { stretchBoundFor, type Occupancy } from "./seed-geometry.ts"
import { appliedGestures, rectOf } from "./seed-placement.ts"

/**
 * The ONE gesture order named in this file, and naming it chooses nothing: every
 * call below passes zero for one of `appliedGestures`' two counts, where
 * `./seed-placement.ts` states that at zero "both orders are the same sequence".
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
    return spreadAfter(occupancy, dump.grid, move.gestures, move.wires.map((one) => one.plan))
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
