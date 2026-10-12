/**
 * `E1`, the NET-CLUSTER MOVE: which parts one net's cluster moves, in what order
 * the gestures go out, and where that leaves the part geometry.
 *
 * THE AUTHORITY is `docs/superpowers/specs/
 * 2026-10-10-stripboard-pipeline-design.md` §7.4's `E1` row - *"the move set
 * gains a move that takes every on-board part with a pin on net X and applies
 * one delta, or one rotation, to all of them. Enumerated over the nets, not over
 * the parts."* Where this module and that document differ the document wins and
 * this comment is the defect.
 *
 * **SPLIT FROM `./moves.ts` FOR THE LINE CEILING, AT THE SEAM THAT FILE ALREADY
 * HAD**: `./moves.ts` answers *what can a candidate differ by* and this one
 * answers *what IS a cluster* - which parts, which order, which landing. The
 * same division as `./moves-apply.ts`, `./climb-accepts.ts` and
 * `./seed-placement.ts`. `./moves.ts` stays the module the plan names and
 * re-exports this file, so no consumer imports it directly.
 *
 * **WHY THE MOVE IS WORTH HAVING, from the identity rather than from search
 * folklore.** `C = (N − S_occ) + J`, and `J` counts a net's extra segments, so a
 * net's `J` contribution falls only when its last stray hole joins the rest.
 * Moving one of a net's scattered parts one hole typically changes `J` by zero
 * and may raise it; moving all of them together changes the net's relationship
 * to every OTHER net's holes in one step. `tests/stripboard/escapes.test.ts`
 * holds that property on a board where six single-part moves all leave `J` at 3
 * and one cluster takes it to 1.
 *
 * **WHAT A COMMON DELTA CANNOT DO, measured rather than assumed, because the
 * spec's own sentence invites the wrong reading.** §7.4 says *"moving all three
 * together to one strip removes a whole cut"*, and a cluster by ONE DELTA cannot
 * gather a net's parts onto one strip: a translation preserves their relative
 * positions, so the strips the net's own holes sit on shift together and its
 * segment count ACROSS strips is unchanged. What the move does change is where
 * the net's holes sit RELATIVE TO THE OTHER NETS' holes on the strips they share
 * - which is what merges two runs of one net separated by a third net's hole, and
 * is how `J` falls on the fixture named above. The gathering move the sentence
 * describes is a different gesture: several different deltas, one per part, or
 * §7.4's *"or one rotation"*, which the `Move` union as declared cannot express
 * (it carries a delta and no rotation). Both are recorded in
 * `docs/stripboard/pipeline-verification.md` section 6 as findings rather than
 * silently implemented, because widening the move set is a deliberate edit with
 * a run behind it.
 *
 * **THE GESTURE ORDER IS THIS MODULE'S ONE CHOICE, AND IT IS THE ORDER OF THE
 * PARTS.** A cluster is the first compound gesture in this pipeline, so it is
 * the first that has to choose a sequence. The turn-versus-stretch question
 * `./seed-placement.ts`'s `GESTURE_ORDERS` exists for does not arise here and is
 * not re-answered: every gesture in a cluster is a pure translation, and at zero
 * turns and zero stretch steps that module states outright that *"both orders
 * are the same sequence"* - so `appliedGestures` is called with both counts at
 * zero, exactly as `occupancyAfter` already calls it for a single `move`.
 */
import type { BoardDump, Grid } from "../guide/dump.ts"
import type { ReferenceNets } from "./equivalence.ts"
import type { Move } from "./moves.ts"
import { appliedGestures, rectOf } from "./seed-placement.ts"
import type { Occupancy } from "./seed-geometry.ts"

/**
 * The one gesture order named in this file, and naming it chooses nothing: every
 * call below passes zero for both of `appliedGestures`' counts, where
 * `./seed-placement.ts` states that both orders are then the same sequence. The
 * choice a cluster really makes is `clusterSequence`'s.
 */
const TRANSLATION_ONLY_ORDER = "turn-then-stretch" as const

/**
 * The on-board parts with a pin on `net`, in the DUMP'S PART ORDER.
 *
 * **THE NET'S PINS COME FROM THE REFERENCE NETLIST AND NEVER FROM THE DUMP'S
 * `NODE` NAMES**, because `--import` writes every `NODE` line `NAME -`: on the
 * board every arm starts from, the dump knows which pins share a node and not
 * what that node is called. `./seed-constructed.ts` reaches the same wall and
 * answers it the same way, by joining the netlist's own nets.
 *
 * **WHICH PART OWNS A PIN IS READ OFF THE DUMP'S `PIN` LINES, NOT BY SPLITTING
 * THE PIN NAME.** `pinHoles` keys a hole `${ref}.${pin}`, and a ref may contain
 * a dot - `SI_HI_BOOST_RV_HI_BOOST.ccw-wiper` is a real part on a real Pultec
 * board - so taking the text before the first or the last dot is a guess about
 * one of them. The dump states the pairing, so this reads it.
 *
 * A net whose pins are all off the board yields an EMPTY list, which is not a
 * refusal: a floating part prints no `PIN` lines and that is a legitimate state
 * (`./moves.ts`'s `wireMoves` says the same of itself). `clusterMove` then
 * proposes nothing, and `applyMove` refuses an empty cluster - a gesture list of
 * none would write a candidate byte-identical to its own parent.
 *
 * A net the REFERENCE does not carry is a refusal, because the caller asked
 * about a net this netlist does not have.
 */
export function clusterRefs(
  dump: BoardDump,
  reference: ReferenceNets,
  net: string,
): readonly string[] {
  const pins = reference.get(net)
  if (pins === undefined) {
    throw new Error(
      `clusterRefs: the reference netlist carries no net named "${net}", so there is no pin set ` +
        "to cluster. It is NOT treated as a net with no parts: an unknown name and a net whose " +
        "parts are all floating are different facts, and the second one legitimately yields no " +
        "cluster while the first means the caller and the netlist disagree about what is on " +
        `this board. The netlist's nets are: ${[...reference.keys()].join(", ")}.`,
    )
  }
  const wanted = new Set(pins)
  const refs: string[] = []
  for (const part of dump.parts) {
    const own = dump.pins[part.ref] ?? []
    if (own.some((pin) => wanted.has(`${part.ref}.${pin.pin}`))) refs.push(part.ref)
  }
  return refs
}

/**
 * The same refs in the ORDER THE GESTURES GO OUT: the part furthest along the
 * delta first.
 *
 * **THE PART THAT IS FURTHEST IN THE DIRECTION OF TRAVEL VACATES BEFORE ITS
 * FOLLOWER ARRIVES**, which is the whole content of the rule. The fork applies
 * one gesture at a time - `--move` per part, or one ops line per part inside one
 * `--move-batch` - so an intermediate arrangement has to fit even when the final
 * one would: two parts on adjacent rows moving down one row collide if the upper
 * one goes first, and do not if the lower one does.
 * `tests/stripboard/escapes.test.ts` holds that on a board where the dump's own
 * order fails and this one lands.
 *
 * The key is the origin's projection onto the delta, sorted DESCENDING, and ties
 * keep the input order - which is the dump's part order, so the sequence is
 * reproducible for Task 13's hash.
 *
 * **IT IS ONE DECLARED ORDER AND NOT A SEARCH OVER ORDERS**, and the limit that
 * leaves is stated rather than waved past: a cluster this order cannot sequence
 * is not proposed, and that is NOT a claim that no order could. Nothing has
 * measured how often another order would have landed one this rejects. Trying
 * more orders is a deliberate edit with a run behind it, and it would have to
 * declare which it tries in which sequence, exactly as `GESTURE_ORDERS` does.
 */
export function clusterSequence(
  occupancy: Occupancy,
  refs: readonly string[],
  delta: readonly [number, number],
): readonly string[] {
  const along = (ref: string): number => {
    const rect = rectOf(occupancy, ref)
    return rect.row * delta[0] + rect.col * delta[1]
  }
  return [...refs].sort((a, b) => along(b) - along(a))
}

/**
 * The occupancy after translating every ref in `refs` by `delta`, IN THE ORDER
 * GIVEN - or `undefined` when the model says the fork would refuse one of those
 * gestures.
 *
 * Each part goes through `appliedGestures` with zero turns and zero stretch
 * steps, which is the same call `occupancyAfter` makes for a single `move`, so
 * there is one arithmetic for where a translated part lands and not two. The
 * check is against the WORKING occupancy, so a part moving into a hole an
 * earlier part of the same cluster has already left is admitted and one moving
 * into a hole still occupied is not.
 *
 * It takes the refs in the order it is given and does NOT reorder them:
 * `clusterSequence` is where the order is chosen, and a function that both chose
 * and applied one would make the order the move RECORDS and the order the model
 * CHECKED two different things.
 */
export function clusterAfter(
  occupancy: Occupancy,
  grid: Grid,
  refs: readonly string[],
  delta: readonly [number, number],
): Occupancy | undefined {
  let working: Occupancy = occupancy
  for (const ref of refs) {
    const rect = rectOf(working, ref)
    const origin: readonly [number, number] = [rect.row + delta[0], rect.col + delta[1]]
    const advanced = appliedGestures(working, grid, ref, origin, 0, 0, TRANSLATION_ONLY_ORDER)
    if (advanced === undefined) return undefined
    working = advanced
  }
  return working
}

/**
 * One net's cluster move by one delta, or `undefined` when the model admits no
 * such candidate.
 *
 * Three ways it declines, each a different fact and none of them a refusal: the
 * net has no part on the board, so there is no gesture; the net has parts and the
 * sequence `clusterSequence` chose cannot be completed; or - which is the same
 * answer by a different route - a part's destination is off the grid, which
 * `appliedGestures` reports by not fitting. The caller enumerates and the
 * absence IS the answer, exactly as `partMoves` treats a turn that would pan the
 * board.
 *
 * **THE RETURNED MOVE CARRIES ITS REFS, IN GESTURE ORDER, AND THAT IS WHY IT
 * CAN.** The order depends on the carried occupancy, which only the enumerator
 * has - `applyMove` is handed a board path and a spawn and no geometry at all -
 * so a cluster whose order was recomputed at apply time would be a second
 * implementation of this rule in a module that cannot see the state it needs.
 * The refs on the move are therefore the one claim, and `net` stays beside them
 * as what the cluster IS, for `describeMove` and the run record.
 *
 * `Move` is imported from `./moves.ts` as a TYPE ONLY, which erases, so there is
 * no runtime cycle between the two files - only a type-level one, which the
 * compiler resolves. The same arrangement as `./seed-arms.ts` and `./seed.ts`.
 */
export function clusterMove(
  occupancy: Occupancy,
  dump: BoardDump,
  reference: ReferenceNets,
  net: string,
  delta: readonly [number, number],
): Move | undefined {
  const refs = clusterRefs(dump, reference, net)
  if (refs.length === 0) return undefined
  const ordered = clusterSequence(occupancy, refs, delta)
  if (clusterAfter(occupancy, dump.grid, ordered, delta) === undefined) return undefined
  return { kind: "cluster", net, delta, refs: ordered }
}
