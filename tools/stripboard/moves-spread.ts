/**
 * `spread`: relocating the part of one net that sits on ONE strip onto a strip
 * of its own, and ADDING THE WIRE THAT REJOINS THE NET, as a single candidate.
 *
 * **THE WARRANT IS THE OWNER'S OWN CORRECTION OF THE COST MODEL, in his words
 * (2026-10-12):**
 *
 * > "Wires let you spread nets across multiple strips so they don't collide
 * > with other nets that would otherwise have to share the same strip. That's
 * > the way wires reduce cuts. Otherwise you'd have to pack more nets adjacent
 * > to each other on a the same strip. Wires let you trade strips for cuts"
 *
 * That sentence names a mechanism no other kind in the move set can perform,
 * and it is the reason this file exists rather than a wider `gather`. Read in
 * the cost identity `C = N + J - S_occ` it is PIPELINE §8.1.1's SECOND lever -
 * *"spending strips, `S_occ -> N`"* - with the step §8.1.1 leaves out: a net
 * cannot leave a crowded strip unless its pins have somewhere else to go, and
 * somewhere else is another strip, which splits the net. **The wire is what
 * pays for the split**, and §8.1.1's table says of spending strips *"effect on
 * W: none at all"*, which is true of a whole net moved to one strip - that is
 * `gather` - and not of a net moved PARTLY off a shared one. The departure is
 * recorded in `docs/superpowers/plans/2026-10-10-stripboard-pipeline.md` under
 * *"Deviations from the specs"*.
 *
 * **THE GAIN IS THE VACATED ABUTMENT AND NOT THE OCCUPIED STRIP, which is what
 * decides THE ENUMERATION and was got wrong once.** Regroup the identity. `N +
 * J` is the total number of NET SEGMENTS - one per net per strip that net has
 * holes on - and `S_occ` is the number of strips holding a pin
 * (`./targets.ts`'s `occupiedStrips`, which is the one definition), so
 *
 *     C = (net segments) - (occupied strips) = sum over strips of (m_s - 1)
 *
 * where `m_s` is the number of net segments on strip `s`. **A cut sits exactly
 * where two net segments abut on one strip**, and three cases follow, each a
 * reading of that sum rather than a measurement:
 *
 *   1. ADD a strip to a net, keeping its holes on the old one, where the new
 *      strip was FREE: segments `+1`, occupied strips `+1`, **`dC = 0`** - and
 *      the wire the split then needs makes it `dF = +0.25`;
 *   2. the same onto an OCCUPIED strip: segments `+1`, occupied strips `+0`,
 *      **`dC = +1`**;
 *   3. VACATE a strip the net SHARES with another net, onto a FREE strip:
 *      the old strip loses a segment and stays occupied, the new one gains one
 *      and becomes occupied, so **`dC = -1`** against one wire, `dF = -0.75`.
 *
 * **So only the third shape can pay, and this file enumerates only the third
 * shape.** `spreadSourceStrips` offers only strips where the net's pins abut
 * ANOTHER net's on a part this spread would not move and where no pin of the net
 * stays behind; `spreadTargetStrips` offers only strips holding no pin at all.
 * An earlier draft offered every strip as a target and every strip of the net as
 * a source, which is cases 1 and 2 as well - candidates whose FIRST-ORDER effect
 * on `C` is zero or worse by the arithmetic above, so `+0.25` or worse in `F`
 * before a board is painted. **What those candidates then did is not asserted
 * here**: they were enumerated in one partial sweep and one of them was in fact
 * accepted, so "none could ever be taken" would be false. The narrowing is
 * DERIVED from the identity rather than measured, which is the honest statement
 * of its warrant; `./moves-cluster.ts`'s `gatherStrips` carries what a cost
 * GUESS did to this repository's record.
 *
 * **WHAT THE THIRD SHAPE'S `-1` DOES NOT ACCOUNT FOR, stated rather than
 * implied.** A relocated part carries ALL of its pins, so the nets its other
 * pins belong to also leave the source strip and arrive on the target. If every
 * net on the moved pins vacates the source, the arithmetic is still exactly
 * `-1` whatever their number: the target gains `k` segments for `k - 1` cuts
 * and the source loses `k`. If one of them keeps a hole on the source - a
 * second part of that net still there, or a second pin of a moved part - the
 * source keeps that segment and the figure erodes to zero. **That is first-order
 * arithmetic and not a prediction about a board**, and nothing here models it:
 * `F` is what says what the candidate did, one evaluation later.
 *
 * **WHY IT HAS TO BE ONE CANDIDATE, which is the shape of this file rather than
 * a remark about it.** Each half is rejected on its own, measured in
 * `docs/stripboard/pipeline-verification.md`:
 *
 *   - the RELOCATION alone splits a net that was whole, so `--check` calls it
 *     incomplete and `./climb-accepts.ts`'s first key rejects the candidate
 *     whatever `F` does - correctly, because CRITERIA §2 and `A1` both say
 *     *"Nothing is tradeable"*;
 *   - the WIRE alone is pure cost: §6.9 counted 7,417 `add-wire` candidates
 *     across eleven runs, none refused by the binary and none ever best,
 *     because a wire's ends are not pins and a wire therefore removes no cut by
 *     itself.
 *
 * So a strictly-improving climb cannot reach the pair by taking either step
 * first, and `worseAcceptance` is `null` in the committed rules, so no worse
 * intermediate is ever accepted either. The gather escaped the same trap by
 * moving every part of a net in ONE candidate; this kind does the same with the
 * relocation and the wire together, and the intermediate state is never
 * evaluated.
 *
 * **A FRESH WIRE'S HOLES CARRY NODE ID 0, SO A SPREAD CANDIDATE MUST BE
 * `--update`d BEFORE IT IS SCORED.** `./complete-apply.ts`'s `assignNodes`
 * carries the measurement: `--check`'s completeness floods from each net's pins
 * through holes that carry that net's node id, and a wire created by
 * `--author --op add-wire` lands on holes carrying none - so a wire that
 * physically joins two of a net's pins leaves the net reported incomplete until
 * `--update` assigns it. `./climb.ts` runs that one invocation for every move
 * `addsWire` names, and without it this kind's whole benefit is invisible and
 * the candidate is rejected for the wrong reason.
 *
 * **WHAT IT IS NOT, stated so the gap is named rather than found later.** A
 * relocation onto a strip the net ALREADY occupies needs no wire, and this file
 * declines to propose one: `joinTo` would be the target itself and the wire
 * would have no two strips to span. Such a consolidation is a real gesture, it
 * is in neither `gather` (which moves the WHOLE net) nor `move` (whose
 * neighbourhood is one hole), and **nothing in the move set performs it
 * today.** That is a gap, not a decision about whether it would pay.
 */
import type { BoardDump, Grid } from "../guide/dump.ts"
import { stripOf } from "./constraints-model.ts"
import type { ReferenceNets } from "./equivalence.ts"
import { aimedHoles, translationsAfter, type Translation } from "./moves-cluster.ts"
import type { Move } from "./moves-model.ts"
import {
  elbowAcrossLines,
  elbowAnchors,
  straightJoinLines,
  wireElbow,
} from "./moves-join.ts"
import {
  nextWireName,
  wireAfter,
  wireBridge,
  type WireLanding,
  type WirePlan,
} from "./moves-wire.ts"
import { stretchBoundFor, type Occupancy } from "./seed-geometry.ts"

/** The type name `VEROROUTE_STRETCH_BOUNDS` records a wire's length bound under. */
const WIRE_TYPE = "WIRE"

/**
 * Which net each of the board's pin holes belongs to, keyed `${ref}.${pin}`
 * exactly as the reference netlist keys them.
 *
 * **THE NET OF A HOLE COMES FROM THE REFERENCE NETLIST AND NEVER FROM THE
 * DUMP'S `NODE` NAMES**, because `--import` writes every `NODE` line `NAME -`:
 * on the board every arm starts from, the dump knows which pins share a node and
 * not what that node is called. `./moves-cluster.ts`'s `clusterRefs` and
 * `./seed-constructed.ts` reach the same wall and answer it the same way.
 *
 * A hole the reference does not carry gets no entry, and that is not a default:
 * such a hole is not a net segment, so it cannot make an abutment and must not
 * be counted as one.
 */
function netOfHole(reference: ReferenceNets): ReadonlyMap<string, string> {
  const owner = new Map<string, string>()
  for (const [net, pins] of reference) {
    for (const pin of pins) owner.set(pin, net)
  }
  return owner
}

/**
 * The strips this net can profitably be spread OFF: the ones where its aimed
 * pins sit beside **another net's pin on a part this spread would not move**,
 * ascending.
 *
 * **THAT IS CASE 3 OF THE ARITHMETIC IN THE HEADER AND NOTHING ELSE.** All three
 * halves of the test are load-bearing and each rules out a different way the
 * `dC = -1` fails:
 *
 *   - **another NET's pin** is the abutment itself. A strip carrying only this
 *     net's segment has no cut on it to remove, so vacating it buys nothing and
 *     costs a wire;
 *   - **on a part this spread would not move** is what keeps the source strip
 *     OCCUPIED. Every pin of a relocated part travels with it, so if the only
 *     other net on the strip is there through a part that is itself moving, the
 *     strip empties - `S_occ` falls by one as the target's rises, the terms
 *     cancel, and `dC` is zero again;
 *   - **and NO PIN OF THIS NET may stay behind**, or the net keeps its segment
 *     on the strip and the abutment is still there after the move. That clause
 *     was absent and the omission was measured: see the body.
 *
 * It is a model read of the dump's `PIN` lines and the reference netlist, so it
 * spends no fork invocation and needs no painted board. **It is NOT a reading of
 * the cut list**, and could not be: cuts are `AutoFillVero`'s and exist only
 * after a candidate is painted. What this computes is where an abutment IS, from
 * the hole positions and the net membership - which is the same quantity
 * `C = sum (m_s - 1)` counts.
 */
export function spreadSourceStrips(
  dump: BoardDump,
  reference: ReferenceNets,
  net: string,
): readonly number[] {
  const owner = netOfHole(reference)
  const aimed = aimedHoles(dump, reference, net)
  const strips = new Set<number>()
  for (const hole of aimed) strips.add(stripOf(hole, dump.verticalStrips))
  const crowded: number[] = []
  for (const strip of [...strips].sort((a, b) => a - b)) {
    const movers = new Set(
      aimed.filter((hole) => stripOf(hole, dump.verticalStrips) === strip).map((hole) => hole.ref),
    )
    let shared = false
    let kept = false
    for (const part of dump.parts) {
      if (movers.has(part.ref)) continue
      for (const pin of dump.pins[part.ref] ?? []) {
        if (stripOf(pin, dump.verticalStrips) !== strip) continue
        const own = owner.get(`${part.ref}.${pin.pin}`)
        if (own === undefined) continue
        if (own === net) kept = true
        else shared = true
      }
    }
    // **THE NET MUST LOSE ITS SEGMENT HERE, WHICH MEANS NO PIN OF ITS MAY STAY -
    // AND THIS CLAUSE IS HERE BECAUSE ITS ABSENCE WAS MEASURED.** A pin of this
    // net on a part the spread would NOT move keeps the net's copper on the
    // strip, so the abutment the spread exists to remove is still there
    // afterwards and the candidate pays a wire for nothing. Measured on
    // `random` seed 3's round-0 candidate, where the net's pin moved off strip
    // 24 and the net still held it through another part: the net segments rose
    // by one, `S_occ` did not move, and the fork's own cut count went 21 to 22
    // against a predicted 21 to 20.
    if (shared && !kept) crowded.push(strip)
  }
  return crowded
}

/**
 * The strips a spread may relocate ONTO: the ones holding **no pin at all**,
 * ascending.
 *
 * **A FREE STRIP IS WHAT MAKES `S_occ` RISE, which is the other half of case 3
 * in the header.** `./targets.ts`'s `occupiedStrips` counts the distinct strips
 * holding a lead and is the one definition of the quantity, so "free" here is
 * the complement of exactly that set: a strip with a pin on it is already
 * counted, and landing a segment there adds a cut instead of removing one.
 *
 * **A WIRE'S HOLES DO NOT MAKE A STRIP OCCUPIED FOR THIS PURPOSE, and that is
 * the identity's own doing rather than a simplification here**: `occupiedStrips`
 * reads `PIN` holes, so a strip carrying only a wire contributes nothing to
 * `S_occ`. It may still refuse the relocation geometrically - a part cannot be
 * placed on a wire's holes, measured against the fork - and the shared advance
 * is what reports that.
 */
export function spreadTargetStrips(dump: BoardDump): readonly number[] {
  const taken = new Set<number>()
  for (const own of Object.values(dump.pins)) {
    for (const pin of own) taken.add(stripOf(pin, dump.verticalStrips))
  }
  const count = dump.verticalStrips ? dump.grid.cols : dump.grid.rows
  const free: number[] = []
  for (let strip = 0; strip < count; strip += 1) {
    if (!taken.has(strip)) free.push(strip)
  }
  return free
}

/**
 * The occupancy after a spread: the relocations in the order the move records
 * them, then the wire - or `undefined` when the model says the fork would
 * refuse one of those gestures.
 *
 * **IT IS THE TWO EXISTING ADVANCES COMPOSED AND NOT A THIRD ONE.**
 * `translationsAfter` is the one advance both compound translation kinds use
 * and `wireAfter` is the one advance `add-wire` uses, so a spread's geometry is
 * computed by exactly the arithmetic its two halves are computed by. The wire
 * is planned and checked against the occupancy AFTER the relocation, which is
 * the only order that can be right: the holes the wire needs may be the holes
 * the relocated parts just left or just took.
 */
export function spreadAfter(
  occupancy: Occupancy,
  grid: Grid,
  gestures: readonly Translation[],
  wires: readonly WirePlan[],
): Occupancy | undefined {
  const moved = translationsAfter(occupancy, grid, gestures)
  if (moved === undefined) return undefined
  // EVERY WIRE THE CANDIDATE CARRIES, IN THE ORDER IT RECORDS THEM - one for the
  // straight join and two for the L (`./moves-join.ts`). It is `wireAfter`
  // folded and not a second advance: the L's own planning advances the occupancy
  // between its two halves by this same call, so what is replayed here is what
  // was checked there.
  let standing = moved
  for (const wire of wires) {
    const next = wireAfter(standing, grid, wire)
    if (next === undefined) return undefined
    standing = next
  }
  return standing
}

/**
 * The strip a spread's wire joins its target to: **the nearest strip the net
 * still occupies, ties to the lower.**
 *
 * **IT IS A DECLARED CHOICE AND NOT A DERIVATION, and its cost is unmeasured** -
 * exactly as `./moves.ts`'s `UNIT_DELTAS` says of its own neighbourhood. The
 * nearest remaining strip is the SHORTEST wire, which is the one most likely to
 * be inside the fork's own stretch bound and the shortest lead on the bench;
 * nothing here has measured whether joining a further strip would ever place a
 * wire this one cannot, and nothing has measured which join a person would
 * prefer. Ties break to the lower strip so that the enumeration is
 * reproducible, and that carries no preference.
 *
 * `undefined` when the net has no strip left - which `spreadMove` treats as the
 * gather's case rather than as a refusal.
 */
function nearestRemaining(staying: readonly number[], to: number): number | undefined {
  let best: number | undefined
  for (const strip of staying) {
    if (best === undefined) {
      best = strip
      continue
    }
    const closer = Math.abs(strip - to) < Math.abs(best - to)
    const tied = Math.abs(strip - to) === Math.abs(best - to)
    if (closer || (tied && strip < best)) best = strip
  }
  return best
}


/**
 * WHERE THE JOIN'S LINES AND THE L COME FROM, named here because this file no
 * longer computes either.
 *
 * `./moves-join.ts` holds both: `straightJoinLines` is the rule that a single
 * straight wire has to reach the net's own copper on BOTH strips - **measured,
 * and the measurement is why it is a requirement and not a preference**: the
 * first draft took the first line that FIT and every one of the first
 * twenty-five spread candidates on the import-placed board was refused by
 * `--update` with *"its two ends are no longer on one net"*. And `wireElbow` is
 * the L for the case no single line serves both ends, which was 313 of 1,389
 * triples (23%) in the funnel and the largest gate on both random arms. That
 * module carries what the L costs (`2 x rho_w`) and what it does not establish.
 */

/**
 * One net's spread from strip `from` to strip `to`, or `undefined` when the
 * model admits no such candidate.
 *
 * **WHAT MOVES: every part whose AIMED PIN on this net sits on `from`, by the
 * one delta that takes that pin to `to`.** The delta crosses the strips and
 * nothing else, which is `gatherMove`'s own rule and the same reading of
 * `stripOf`: a hole's strip is its column under `VERTICAL_STRIPS` and its row
 * otherwise, so the delta is `to - from` along that axis and zero along the
 * other. A spread therefore never slides a part ALONG a strip. Every mover
 * takes the SAME delta, because every mover's aimed pin starts on `from` - so
 * the relocation is one translation of a SUBSET of the net, which is the one
 * thing neither `cluster` (the whole net, one delta) nor `gather` (the whole
 * net, one strip) can express.
 *
 * **THE FIVE WAYS IT DECLINES, each a different fact and none of them a
 * refusal.** The caller enumerates and the absence IS the answer, exactly as
 * `partMoves` treats a turn that would pan the board:
 *
 *   1. `to === from` - a zero delta, which the fork refuses for its own stated
 *      reason: a candidate byte-identical to its own parent;
 *   2. no aimed pin on `from` - there is nothing to move;
 *   3. every aimed pin on `from` - the WHOLE net moves, which is a `gather` and
 *      needs no wire. Proposing it here would put one gesture in the sweep
 *      twice under two names, and would make this kind's own name false;
 *   4. the wire the join needs is longer than the fork will stretch one, which
 *      is `VEROROUTE_STRETCH_BOUNDS`' measured 16 holes and not a budget;
 *   5. the relocation or the wire does not fit, which the shared advance reports
 *      by returning no occupancy.
 *
 * **WHICH STRIPS ARE WORTH ASKING ABOUT IS THE ENUMERATION'S QUESTION AND NOT
 * THIS FUNCTION'S**, exactly as `gatherMove` leaves `gatherStrips` to decide its
 * targets. `spreadSourceStrips` and `spreadTargetStrips` are where the identity's
 * case 3 is applied; this function builds whatever pair it is handed, so a
 * caller naming an occupied target gets a candidate whose first-order `dC` is
 * zero or worse rather than a refusal. The division is deliberate - a move that
 * re-derived the narrowing would make the enumeration's own reading and the
 * move's two readings of one thing - and the cost of it is that this entry point
 * is wider than the sweep.
 *
 * **ONE WIRE, AT THE FIRST LINE OF HOLES THAT TAKES IT, ascending** - and both
 * narrowings are `./moves-wire.ts`'s own, with its reasons. A strip conducts
 * along its whole length, so two wires joining one pair of strips at different
 * lines join the same two strips and score the same `W`; what differs is which
 * holes they take from later gestures, and that is not modelled. And a net left
 * on three or more strips still needs further joins after this one: the spread
 * supplies the join its OWN relocation makes necessary and no more, so such a
 * net stays open and `--check` says so.
 *
 * **WHAT IS NOT CHECKED, and `wireMovesFor` says the same of itself:** whether
 * the wire's ends land in the same CUT SEGMENT as the net's pins on those
 * strips, and whether strip `from` was shared with another net at all - which
 * is to say whether there was a cut there to remove. Cuts are `AutoFillVero`'s
 * and exist only after the candidate is painted, so `F` is what says so, one
 * evaluation later.
 */
export function spreadMove(
  occupancy: Occupancy,
  dump: BoardDump,
  reference: ReferenceNets,
  net: string,
  from: number,
  to: number,
): Move | undefined {
  if (to === from) return undefined
  const step = to - from
  const delta: readonly [number, number] = dump.verticalStrips ? [0, step] : [step, 0]
  const gestures: Translation[] = []
  const movers = new Set<string>()
  const staying: number[] = []
  for (const hole of aimedHoles(dump, reference, net)) {
    const strip = stripOf(hole, dump.verticalStrips)
    if (strip === from) {
      gestures.push({ ref: hole.ref, delta })
      movers.add(hole.ref)
    } else staying.push(strip)
  }
  if (gestures.length === 0) return undefined
  // THE WHOLE NET MOVING IS A GATHER AND NOT A SPREAD - decline 3 above.
  if (staying.length === 0) return undefined
  const joined = nearestRemaining(staying, to)
  if (joined === undefined) return undefined
  // THE TARGET IS ALREADY ONE OF THE NET'S STRIPS, so there are no two strips
  // for a wire to span. It is the gap this module's header names: a
  // consolidation needing no wire, which nothing in the move set performs.
  if (joined === to) return undefined
  const low = Math.min(to, joined)
  const high = Math.max(to, joined)
  const bound = stretchBoundFor(WIRE_TYPE)
  if (!bound.stretchable || high - low + 1 > bound.maxLength) return undefined
  const moved = translationsAfter(occupancy, dump.grid, gestures)
  if (moved === undefined) return undefined
  const first = nextWireName(dump.wires.length)
  const second = nextWireName(dump.wires.length + 1)
  const spread = (wires: readonly WireLanding[]): Move => ({
    kind: "spread",
    net,
    from,
    to,
    joined,
    gestures,
    wires,
  })
  // ONE STRAIGHT WIRE FIRST, because it is the cheaper join - `rho_w` against
  // the L's `2 x rho_w` - and because an L on a pair a straight wire serves
  // would put one join in the sweep twice at twice the price.
  for (const along of straightJoinLines(dump, reference, net, from, joined, movers)) {
    const bridge = wireBridge(moved, dump, first, low, high, along)
    if (bridge === undefined) continue
    return spread([bridge])
  }
  // THEN THE L, for the 23% of triples no straight line can serve: the across
  // wire lands beside the relocated pins and the along wire carries the net's
  // copper under it. `./moves-join.ts` plans both and advances the occupancy
  // between them; the lines and the anchors are each tried tightest-first, so
  // the pair taken is the shortest the model admits and two runs agree.
  for (const along of elbowAcrossLines(dump, reference, net, from, joined, movers)) {
    for (const anchor of elbowAnchors(dump, reference, net, from, joined, movers, along)) {
      const elbow = wireElbow(moved, dump, [first, second], joined, anchor, along, low, high)
      if (elbow !== undefined) return spread(elbow)
    }
  }
  return undefined
}
