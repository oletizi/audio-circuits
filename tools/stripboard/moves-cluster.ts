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
 * describes is a DIFFERENT GESTURE - several deltas, one per part - and it is
 * `gatherMove` at the foot of this file, built on the controller's ruling of
 * 2026-10-12 after this module's own measurement showed the one-delta cluster
 * changing `F` on no arm of the comparison
 * (`docs/stripboard/pipeline-verification.md` §6.4, and §6.6 for what the gather
 * then did). §7.4's *"or one rotation"* is still unbuilt and still recorded in
 * §6.1 rather than silently added, because the `Move` union carries a delta and
 * no rotation and widening the move set is a deliberate edit with a run behind
 * it.
 *
 * **THE GESTURE ORDER IS THIS MODULE'S ONE CHOICE, AND IT IS THE ORDER OF THE
 * PARTS**, for both compound kinds. A cluster was the first compound gesture in
 * this pipeline, so it was the first that had to choose a sequence; the gather
 * chooses one the same way and `translationsAfter` is the one fit model under
 * both. The turn-versus-stretch question
 * `./seed-placement.ts`'s `GESTURE_ORDERS` exists for does not arise here and is
 * not re-answered: every gesture in a cluster is a pure translation, and at zero
 * turns and zero stretch steps that module states outright that *"both orders
 * are the same sequence"* - so `appliedGestures` is called with both counts at
 * zero, exactly as `occupancyAfter` already calls it for a single `move`.
 */
import type { BoardDump, Grid } from "../guide/dump.ts"
import { stripOf } from "./constraints-model.ts"
import type { ReferenceNets } from "./equivalence.ts"
import type { Move } from "./moves-model.ts"
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
  // ONE DELTA FOR EVERY REF IS A TRANSLATION LIST, so this CALLS the shared loop
  // rather than repeating it. It duplicated the loop until a review found the
  // copy, which made `translationsAfter`'s own "IT IS THE ONE ADVANCE FOR BOTH
  // COMPOUND KINDS" false - the claim is made true here rather than softened
  // there.
  return translationsAfter(
    occupancy,
    grid,
    refs.map((ref) => ({ ref, delta })),
  )
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

/* ------------------------------------------------------------------------- *
 * `E1`'s GATHER: the same net, each part by its own delta, onto one strip.
 * ------------------------------------------------------------------------- */

/** One part's translation, as the move records it. */
export interface Translation {
  readonly ref: string
  readonly delta: readonly [number, number]
}

/**
 * The occupancy after applying `translations` IN THE ORDER GIVEN, or `undefined`
 * when the model says the fork would refuse one of them.
 *
 * **IT IS THE ONE ADVANCE FOR BOTH COMPOUND KINDS**: `clusterAfter` is this
 * function over one shared delta, and a gather's own deltas differ per part.
 * Each part goes through `appliedGestures` with zero turns and zero stretch
 * steps - the same call `occupancyAfter` makes for a single `move` - so there is
 * one arithmetic for where a translated part lands and not three.
 */
export function translationsAfter(
  occupancy: Occupancy,
  grid: Grid,
  translations: readonly Translation[],
): Occupancy | undefined {
  let working: Occupancy = occupancy
  for (const one of translations) {
    const rect = rectOf(working, one.ref)
    const origin: readonly [number, number] = [rect.row + one.delta[0], rect.col + one.delta[1]]
    const advanced = appliedGestures(working, grid, one.ref, origin, 0, 0, TRANSLATION_ONLY_ORDER)
    if (advanced === undefined) return undefined
    working = advanced
  }
  return working
}

/**
 * Where each part's pin on `net` sits, in the DUMP'S PART ORDER: the hole the
 * gather aims at a common strip.
 *
 * **A PART WITH TWO PINS ON ONE NET AIMS ITS FIRST, IN THE DUMP'S `PIN` ORDER,
 * AND THAT IS A DECLARED CHOICE RATHER THAN A DERIVATION.** Such a part shorts
 * the net to itself, and it cannot put both of its pins on one strip unless its
 * leads already run along that strip - so there is no delta that satisfies both
 * and which one to aim is not in the data. Aiming the first is reproducible and
 * says what it did; the other pin goes wherever the same translation takes it,
 * which is the gather's effect on `J` like any other hole it moves.
 */
function aimedHoles(
  dump: BoardDump,
  reference: ReferenceNets,
  net: string,
): readonly { readonly ref: string; readonly row: number; readonly col: number }[] {
  const wanted = new Set(reference.get(net) ?? [])
  const aimed: { readonly ref: string; readonly row: number; readonly col: number }[] = []
  for (const ref of clusterRefs(dump, reference, net)) {
    const pin = (dump.pins[ref] ?? []).find((own) => wanted.has(`${ref}.${own.pin}`))
    if (pin === undefined) {
      throw new Error(
        `aimedHoles: ${ref} is in the cluster of "${net}" and the dump reports no PIN line of ` +
          "its on that net, which cannot both be true - clusterRefs selected it BY one of those " +
          "pins. It is not skipped: a gather that quietly left a part out would move the net's " +
          "other parts onto a strip this one was never going to reach.",
      )
    }
    aimed.push({ ref, row: pin.row, col: pin.col })
  }
  return aimed
}

/**
 * One net's gather onto `strip`, or `undefined` when the model admits no such
 * candidate.
 *
 * **THE DELTA IS PER PART AND CROSSES THE STRIPS AND NOTHING ELSE.** A hole's
 * strip is its column under `VERTICAL_STRIPS` and its row otherwise
 * (`./constraints-model.ts`'s `stripOf`, the one definition), so the delta that
 * takes a pin from its strip to `strip` is `strip - current` along that axis and
 * zero along the other. The gather therefore never slides a part ALONG a strip:
 * it only changes which strip each of the net's pins is on, which is the
 * quantity `J` counts.
 *
 * **THE ORDER IS A DECLARED SCHEDULE AND NOT A SEARCH OVER ORDERS.** Repeated
 * passes in the dump's part order: on each pass every part whose destination
 * fits NOW is moved, and the pass repeats while anything moved. The parts that
 * are still unplaced when a pass moves nothing mean the gather is not proposed.
 * That is strictly stronger than one pass - a part blocked by another that has
 * not moved yet gets its turn after it does - and it is deterministic, which
 * Task 13's hash needs. **It is NOT a claim that no order could place a gather
 * this schedule rejects**, and nothing has measured how often another would.
 *
 * `translationsAfter` is the fit model, so the sequence recorded on the move is
 * the sequence the model checked, and `applyMove` needs no geometry at all.
 */
export function gatherMove(
  occupancy: Occupancy,
  dump: BoardDump,
  reference: ReferenceNets,
  net: string,
  strip: number,
): Move | undefined {
  const aimed = aimedHoles(dump, reference, net)
  // **A NET WITH FEWER THAN TWO ON-BOARD PARTS GETS NO GATHER, and that is what
  // the move IS rather than a cost dodge.** §7.4 defines `E1` over *every
  // on-board part with a pin on net X*, and a gathering of one part is a part
  // RELOCATION - which the `move` kind owns, with its own declared one-hole
  // neighbourhood. Proposing one here would quietly widen that neighbourhood to
  // the whole strip axis for every single-part net, which is a different change
  // to the move set and one nobody has reviewed. It also could not pay on its
  // own terms: a one-part net's pins keep their relative strips under any
  // translation, so its own segment count cannot fall.
  //
  // THE COST THIS BOUNDS, measured on the import-placed low-boost board so the
  // choice is visible: every strip for every net is 490 candidate attempts per
  // round and 384 that fit; every strip for the nets with two or more parts is
  // the figure §6.8 records. Dropping the rule is a one-line edit and the
  // enumeration is the only thing it changes.
  if (aimed.length < 2) return undefined
  const wanted: Translation[] = []
  for (const hole of aimed) {
    const current = stripOf(hole, dump.verticalStrips)
    const step = strip - current
    // A part already on the target strip is left out: its delta is zero, and the
    // fork refuses a zero delta rather than writing a candidate identical to its
    // parent.
    if (step === 0) continue
    const delta: readonly [number, number] = dump.verticalStrips ? [0, step] : [step, 0]
    wanted.push({ ref: hole.ref, delta })
  }
  // A gather that moves nothing is not a gesture - which is the case where every
  // one of the net's pins is already on this strip.
  if (wanted.length === 0) return undefined

  // ONE PASS, IN THE DUMP'S PART ORDER, AND ALL OF IT OR NONE. The whole list
  // goes through the shared advance: if any part's destination does not fit, the
  // gather is not proposed at all. A PARTIAL gather - the net's other parts moved
  // onto a strip this one was never going to reach - is the one outcome that
  // would make the move's own name false, and it is also strictly worse than not
  // proposing: it spends an evaluation to split the net it was asked to join.
  //
  // **A REPEATED-PASS SCHEDULE WAS HERE AND IS GONE, AND THE REASON IS AN
  // ARGUMENT RATHER THAN A PREFERENCE.** The cluster needs an order because its
  // parts all translate by one delta, so one part's destination is routinely
  // another's current footprint and the follower must wait - measured on
  // `STACKED_DUMP`. A gather cannot have that structure. Every part keeps its
  // coordinate on the non-strip axis and every part's pin ends on the SAME strip,
  // so take any two parts of the net: if their footprints overlap on the
  // non-strip axis they would have to end on top of each other and the gather is
  // impossible in every order; if they do not overlap, neither can ever block the
  // other. A part of some OTHER net never moves during a gather, so a destination
  // it blocks stays blocked. There is therefore no case where a second pass
  // places something the first could not, which is why the repeated-pass loop
  // survived its own mutation: nothing could tell the two schedules apart.
  //
  // IF THAT ARGUMENT MISSES A CASE, the cost is a gather NOT PROPOSED rather than
  // a gesture the fork refuses - the same direction every narrowing in this file
  // errs in.
  const advanced = translationsAfter(occupancy, dump.grid, wanted)
  if (advanced === undefined) return undefined
  return { kind: "gather", net, strip, gestures: wanted }
}

/**
 * **EVERY STRIP OF THE BOARD, ascending: the gather's candidate targets.**
 *
 * **IT WAS THE NET'S OWN STRIPS, AND THAT NARROWING RECORDED A FALSE CAUSE.**
 * The cost argument for it was real - a round is a full sweep, and every strip is
 * `nets x strips` candidate ATTEMPTS, 14 x 35 = 490 on the low-boost board
 * against the 21 the net-own set measured there. What was not defensible is what
 * the narrowing then made the run record SAY: on the import-placed board the
 * enumeration proposed ZERO gathers and
 * `docs/stripboard/pipeline-verification.md` wrote that down as *"a property of
 * the board"* and *"the gather needs room, and the import arm's own start does
 * not have any"*. **That board has 32 empty rows.** The parts are packed into
 * rows 0-2 of a 35-row grid and the net-own set offers destinations only where a
 * net ALREADY has parts, so every candidate landed on top of something - and the
 * enumeration never asked about rows 3 to 34. Widening it finds 384 gathers that
 * fit on that same board, 32 each for 12 of its 14 nets. §6.8 carries the
 * measurement and the per-round cost the widening buys it with.
 *
 * **AND THE NARROW SET WAS NOT NEUTRAL BETWEEN THE ARMS**, which is the reason
 * the widening is not optional: offering destinations only where a net already
 * has parts rewards a start whose nets are already spread across distinct strips,
 * which is precisely what the constructed arm builds. A comparison run on that
 * set could not tell the construction's advantage from the enumeration's shape.
 *
 * **IT IS NOT BOUNDED TIGHTER THAN "EVERY STRIP", AND THAT IS DELIBERATE.** The
 * only principled narrowing is the one `gatherMove` already applies - the whole
 * net must FIT on the target - and that is a property of the arrangement rather
 * than of the strip's index, so it cannot be read off a bound. Any tighter rule
 * would be a guess about which strips are worth asking about, and the previous
 * guess is what put a false cause in the record.
 */
export function gatherStrips(dump: BoardDump): readonly number[] {
  const count = dump.verticalStrips ? dump.grid.cols : dump.grid.rows
  return Array.from({ length: count }, (unused, index) => index)
}
