/**
 * THE MOVE GENERATOR: one part relocated **and** the wires that re-join its
 * nets, handed back as ONE candidate.
 *
 * **THIS IS THE MOVE THE OLD ARCHITECTURE COULD NOT EXPRESS, AND IT IS THE
 * REASON THE ARCHITECTURE WAS REWRITTEN.** `tools/stripboard/place.ts:239`
 * stated the old rule - **one gesture per candidate** - and using a wire needs
 * three decisions at once: move a lead onto another strip, move it to a column a
 * wire can reach, then run the wire. *"The first two pay nothing alone"*, so a
 * one-gesture climber could not see past the first and the third never became
 * available. Measured: a 20,000-evaluation run enumerated ONE `add-wire`
 * candidate and the fork refused it on reach.
 *
 * **THERE IS NO GESTURE TYPE AND THAT IS DELIBERATE.** A gesture vocabulary was
 * an artifact of driving VeroRoute's CLI, where `--move-batch` was the only
 * atomic primitive and accepted only `move` and `rotate`. A move here is a
 * function from `Candidate` to `Candidate`, so "several changes at once" is not
 * a feature that had to be built - it is the absence of a restriction that only
 * ever existed because the inner loop spoke to a subprocess.
 *
 * **THIS MODULE PROPOSES AND NEVER JUDGES.** Nothing here scores, ranks, sorts,
 * filters by cost or compares two proposals. `objectiveOf` in `./score.ts`
 * prices a candidate from the owner's weights and `violationsOf` in
 * `./invariants.ts` says whether it is sound, and **both belong to the caller**:
 * *"an agent may never author the acceptance criteria for the artifact it is
 * producing."* Unsound candidates and candidates worse than the base are
 * returned exactly like any other, and `tests/stripboard/model/moves.test.ts`
 * asserts that they are - a generator that quietly withheld them would be
 * choosing for the search.
 *
 * The one thing the list DOES have is a **declared order** - parts in the
 * candidate's own order, then displacement by strip and then by column, both
 * ascending - so that two runs over equal inputs return equal lists. That is a
 * reproducibility property and not a preference.
 *
 * **WHAT IS PROPOSED: a RIGID TRANSLATION of one placement, with every net that
 * placement touches re-joined from scratch.**
 *
 *   1. one part moves by `(dStrip, dColumn)`, every pin keeping its offset from
 *      every other. **So a lead separation is never changed**, which is why no
 *      span is re-checked: `HC5`/`HC9` bound how far apart a part's leads may be
 *      bent, a translation does not touch that, and a recorded band cannot be
 *      newly violated by one. A rotation and a re-span are further move families
 *      and are NOT in this one - see the end of this comment;
 *   2. every wire and bridge carrying one of the moved part's nets is dropped,
 *      and each of those nets is re-joined over the strips its leads now sit on,
 *      lowest to highest, by a bridge where two strips are adjacent and a wire
 *      where they are not. That is the same path-not-star rule `joinNets` in
 *      `./seed-place.ts` applies, and `./join-column.ts` - which used to be
 *      private to that file - is the single owner of which column a join runs
 *      in;
 *   3. nets the moved part does not touch keep their wires and bridges
 *      untouched, because a join is per net and nothing else moved.
 *
 * **SO A PROPOSAL MAY ADD WIRES, DROP THEM, OR SWAP A WIRE FOR A BRIDGE**, and
 * which of those happens is a consequence of where the leads land rather than a
 * decision taken here.
 *
 * **TWO HARD RULES ARE ENFORCED AND EVERY PREFERENCE IS LEFT TO THE CALLER**, and
 * both are the owner's, applied through `./seed-area.ts`'s `routedUnderRigid` and
 * `rigidOverlap` rather than restated here. Nothing is proposed that puts a lead
 * inside a RIGID part's area, in either direction (*"Rigid parts shouldn't be
 * routed through/under."*, 2026-10-14), and nothing whose areas OVERLAP when
 * either part is rigid, because the part that would have to give way cannot
 * (*"Rigid parts are rigid. You cant push them out of the way or rout under
 * them."*, 2026-10-15). Neither subsumes the other: a bodyless formable part's
 * rectangle is the bare line between its leads, so a lead can be under a rigid
 * part with the rectangles apart, and two rectangles can meet with neither part's
 * lead inside the other. **HIS DIRECTIVES OUTRANK HIS AS-BUILT BOARDS AND HE SAID
 * SO**: *"The as-built diagram is instructive, but my directives are more
 * authoritative than a file on disk."* Four of the five overlapping pairs on his
 * two boards are refused by these rules, and `./seed-area.ts` records which and
 * why that is the intended outcome. Both are REJECTIONS rather than tiers, here
 * and in `./seed-place.ts`, and `violationsOf` cannot see either - it answers
 * electrical soundness, not whether a person can get an iron to the joint.
 *
 * What is NOT enforced: **formable-on-formable body overlap** (*"Resistors,
 * diodes, most capacitors can be jostled out of the way of each other"* -
 * `buffered` has one such pair, `C3`/`R1`), comfort tiers, and a wire crossing a
 * part. Comfort is not even consulted - `comfortOf` ranks positions for a
 * CONSTRUCTOR choosing one, and a generator that preferred roomy positions would
 * be filtering its own proposals.
 *
 * **ONE LEAD PER HOLE IS KEPT, AND IT IS THE SEED'S STRICTER READING OF THE
 * OWNER'S RULE.** A relocated lead takes a hole no other part's hole and no
 * SURVIVING wire end or bridge occupies. His rule is about leads - *"I would
 * prefer leads not share holes - it makes building easier"* - and a bridge
 * soldered onto a lead's own hole is the ordinary case on his boards, so this is
 * stricter than it needs to be; it is what `./seed-place.ts` does, it costs
 * nothing measured, and it removes a question. A lead MAY land where a wire of
 * its own moved net used to end, because that wire is dropped before the hole is
 * tested - which is exactly the move the fork refused on
 * `tools/stripboard/seed-geometry.ts`'s record.
 *
 * **WHAT THIS FAMILY DOES NOT CONTAIN, said plainly rather than left to be
 * discovered.** No rotation (a turn re-maps a moulded field, which needs the
 * footprint geometry a translation does not); no change of lead span; no move of
 * two parts at once; no wire added or removed on its own; no cut proposed
 * directly, because cuts are DERIVED from the nets a board declares
 * (`./cuts.ts`) and are never authored. Each of those is a further generator the
 * search may be given, and none of them is needed for the claim this module
 * exists to establish.
 */
import { holeInFrame, type Candidate, type Hole, type PinPatterns, type Placement } from "./board.ts"
import { holeKey, significantContacts, type ReferenceNets } from "./cuts.ts"
import { joinColumnFor, type JoinSite } from "./join-column.ts"
import { rigidOverlap, routedUnderRigid } from "./seed-area.ts"
import type { BodyMargins, PartArea, Rect } from "./seed-area.ts"
import { bodyMarginsFor } from "./seed-parts.ts"
import { leadSpanFor } from "../kicad/lead-span.ts"
import type { LeadSpan } from "../kicad/lead-span-model.ts"

function refuse(key: string, body: string): never {
  throw new Error(`stripboard-moves-${key}: ${body}`)
}

/** What a part's own geometry contributes to a move: how rigid, and how big. */
interface PartGeometry {
  /** `LeadSpan.geometry.kind` - whether its terminals can be formed at all. */
  readonly rigid: boolean
  /** How far its body reaches past its outermost pads, in its own frame. */
  readonly margins: BodyMargins
}

/**
 * The two refusal families this module re-raises under its own key, and nothing
 * else.
 *
 * Following `geometryOf` in `./board.ts`: a `TypeError` from a bug in a
 * derivation would otherwise come back wearing this key and read as a missing
 * record. The two marks are the openings of `lib/stripboard/seed-parts.ts`'s
 * refusals and of `leadSpanFor`'s, which are the only two things consulted.
 */
const WRAPPED: readonly string[] = [
  "stripboard-seed-parts-",
  "no lead span is recorded for footprint",
]

function asMovesRefusal(error: unknown, footprint: string): never {
  const named = error instanceof Error && WRAPPED.some((mark) => error.message.startsWith(mark))
  if (!named) throw error
  throw new Error(
    `stripboard-moves-part-geometry-unreadable: movesFrom was handed a board carrying ` +
      `"${footprint}", and the two things a move has to know about that part - whether its ` +
      `terminals can be formed, and how far its body reaches past its pads - could not be ` +
      `read.\n${error.message}\nWHY NOTHING IS SUBSTITUTED: both figures decide whether a ` +
      "proposal is buildable. Rigidity is what both of the owner's hard geometric rules turn " +
      "on - nothing is routed under a part that cannot be jostled aside, and nothing overlaps " +
      "one either - and the body is where that part reaches. A part assumed formable is a board " +
      "with a joint under a trimmer, and a part given a guessed body is a part given the wrong " +
      "amount of room. Record the footprint, or hand movesFrom a span and pin-pattern map " +
      "that covers it: both are parameters for exactly this reason.",
  )
}

/** A footprint's rigidity and body, read once per footprint per call. */
function geometryFor(
  footprint: string,
  spans: ReadonlyMap<string, LeadSpan>,
  patterns: PinPatterns,
  cache: Map<string, PartGeometry>,
): PartGeometry {
  const known = cache.get(footprint)
  if (known !== undefined) return known
  let derived: PartGeometry
  try {
    derived = {
      rigid: leadSpanFor(footprint, spans).geometry.kind === "rigid",
      margins: bodyMarginsFor(footprint, { patterns, spans }),
    }
  } catch (error) {
    asMovesRefusal(error, footprint)
  }
  cache.set(footprint, derived)
  return derived
}

const FRAME_ORIGIN: Hole = { strip: 0, column: 0 }

function boxOf(strips: readonly number[], columns: readonly number[]): Rect {
  return {
    minStrip: Math.min(...strips),
    maxStrip: Math.max(...strips),
    minColumn: Math.min(...columns),
    maxColumn: Math.max(...columns),
  }
}

/**
 * The rectangle a placed part covers: its leads' bounding box grown by its body
 * margins, in the directions the part's own facing puts them.
 *
 * **IT TAKES THE LEADS AS PLACED RATHER THAN THE FOOTPRINT'S MOULDED PADS**,
 * which is what `areaRect` in `./seed-area.ts` does too and for the reason that
 * file states: a two-lead part stretched past its moulded pitch keeps its body
 * the same size while its leads move apart, and overstating a part's own space
 * errs towards more room - the direction the owner asked for - while
 * understating it wedges a part.
 *
 * **THE TWO UNIT VECTORS COME FROM `holeInFrame`, WHICH IS THIS MODEL'S ONE
 * OWNER OF THE FOUR QUARTER-TURNS.** Re-spelling the sign table here is the
 * mistake `./board.ts` names at that function: two places to keep in step, and a
 * layout that disagrees with its own geometry when they drift.
 */
function areaFor(placement: Placement, geometry: PartGeometry): PartArea {
  const leads = [...placement.pins.values()]
  const along = holeInFrame(FRAME_ORIGIN, placement.direction, 1, 0)
  const across = holeInFrame(FRAME_ORIGIN, placement.direction, 0, 1)
  const strips: number[] = []
  const columns: number[] = []
  for (const lead of leads) {
    for (const alongSteps of [-geometry.margins.beforeAlong, geometry.margins.afterAlong]) {
      for (const acrossSteps of [-geometry.margins.beforeAcross, geometry.margins.afterAcross]) {
        strips.push(lead.strip + alongSteps * along.strip + acrossSteps * across.strip)
        columns.push(lead.column + alongSteps * along.column + acrossSteps * across.column)
      }
    }
  }
  return { ref: placement.ref, rigid: geometry.rigid, rect: boxOf(strips, columns), leads }
}

/**
 * Every placed part's rigidity, rectangle and lead holes.
 *
 * **EXPORTED BECAUSE THE RULE AND THE CHECK OF IT MUST READ ONE GEOMETRY.** The
 * generator uses it to reject a position; `tests/stripboard/model/moves.test.ts`
 * uses it to verify that no proposal routes a lead under a rigid part; a search
 * may use it to report one. A second derivation in any of those is two answers
 * to "how big is this part".
 */
export function partAreasOf(
  candidate: Candidate,
  spans: ReadonlyMap<string, LeadSpan>,
  patterns: PinPatterns,
): readonly PartArea[] {
  const cache = new Map<string, PartGeometry>()
  return candidate.placements.map((placement) =>
    areaFor(placement, geometryFor(placement.footprint, spans, patterns, cache)),
  )
}

function shift(hole: Hole, dStrip: number, dColumn: number): Hole {
  return { strip: hole.strip + dStrip, column: hole.column + dColumn }
}

function shiftRect(rect: Rect, dStrip: number, dColumn: number): Rect {
  return {
    minStrip: rect.minStrip + dStrip,
    maxStrip: rect.maxStrip + dStrip,
    minColumn: rect.minColumn + dColumn,
    maxColumn: rect.maxColumn + dColumn,
  }
}

/**
 * `<ref>.<pin>` to its net.
 *
 * **IT DOES NOT RESTATE `./cuts.ts`'s REFUSALS AND MUST NOT.** A pin on two nets
 * and a placed pin on no net are both refused by `significantContacts`, which
 * `movesFrom` runs over the base board before it builds this map, so by the time
 * this is read the reference has been proven consistent. A second owner of those
 * messages is a second place to keep them true.
 */
function netByPin(reference: ReferenceNets): ReadonlyMap<string, string> {
  const out = new Map<string, string>()
  for (const [net, pins] of reference) {
    for (const pin of pins) out.set(pin, net)
  }
  return out
}

function netOfLead(nets: ReadonlyMap<string, string>, ref: string, pin: string): string {
  const net = nets.get(`${ref}.${pin}`)
  if (net === undefined) {
    // Unreachable through movesFrom: significantContacts refuses a placed pin
    // the reference puts on no net, by name, before this map is built. Stated
    // rather than defaulted, because a placeholder net here would be a lead
    // joined to a conductor no circuit asked for.
    refuse(
      "lead-on-no-net",
      `the board places "${ref}.${pin}" and the reference nets handed to movesFrom put that ` +
        "pin on no net, which significantContacts in lib/stripboard/cuts.ts should have refused " +
        "first. Fix that check; nothing is substituted.",
    )
  }
  return net
}

/** The strips a net's leads sit on after a move, ascending and without repeats. */
function stripsOfNet(placements: readonly Placement[], nets: ReadonlyMap<string, string>, net: string): readonly number[] {
  const strips = new Set<number>()
  for (const placement of placements) {
    for (const [pin, hole] of placement.pins) {
      if (netOfLead(nets, placement.ref, pin) === net) strips.add(hole.strip)
    }
  }
  return [...strips].sort((a, b) => a - b)
}

/** One placement translated bodily: origin, every pin and every occupied hole. */
function translated(placement: Placement, dStrip: number, dColumn: number): Placement {
  return {
    ref: placement.ref,
    footprint: placement.footprint,
    origin: shift(placement.origin, dStrip, dColumn),
    direction: placement.direction,
    holes: placement.holes.map((hole) => shift(hole, dStrip, dColumn)),
    pins: new Map([...placement.pins].map(([pin, hole]) => [pin, shift(hole, dStrip, dColumn)])),
  }
}

/**
 * One relocation, with the nets the moved part touches re-joined - or
 * `undefined` when the board cannot be built that way.
 *
 * The four ways it comes back empty, each a physical impossibility rather than a
 * judgement: a hole already holding a lead, a wire end or a surviving bridge; a
 * lead inside a rigid part's area; an area overlapping a rigid part's; and a join
 * with no column where both its end holes are free.
 *
 * **IT DOES NOT RE-TEST THE BOARD EDGE.** `movesFrom`'s displacement bounds are
 * derived from this part's own occupied holes and rectangle, so every
 * displacement reaching here keeps both on the stock. A second check would be a
 * predicate that cannot fire, which this plan has caught three times and now
 * refuses to add.
 */
function relocation(
  base: Candidate,
  nets: ReadonlyMap<string, string>,
  areas: readonly PartArea[],
  index: number,
  dStrip: number,
  dColumn: number,
): Candidate | undefined {
  const placement = base.placements[index]
  const area = areas[index]
  if (placement === undefined || area === undefined) {
    refuse(
      "placement-index-lost",
      `index ${index} names no placement, and this loop walks the candidate's own placement ` +
        "list. Fix movesFrom; nothing is substituted.",
    )
  }
  const moved = translated(placement, dStrip, dColumn)
  const movedArea: PartArea = {
    ref: area.ref,
    rigid: area.rigid,
    rect: shiftRect(area.rect, dStrip, dColumn),
    leads: [...moved.pins.values()],
  }
  const others = areas.filter((_, at) => at !== index)
  if (routedUnderRigid(movedArea, others) !== null) return undefined
  if (rigidOverlap(movedArea, others) !== null) return undefined

  const placements = base.placements.map((each, at) => (at === index ? moved : each))
  const affected = new Set(
    [...moved.pins.keys()].map((pin) => netOfLead(nets, moved.ref, pin)),
  )
  const wires = base.wires.filter((wire) => !affected.has(wire.net))
  const bridges = base.bridges.filter((bridge) => !affected.has(bridge.net))

  // ONE LEAD PER HOLE. The set is built from everything that is staying put -
  // the other parts' holes, and the wire ends and bridges of the nets this move
  // does not touch - and the moved part's holes are then tested against it. A
  // hole a DROPPED wire used to end in is free, which is the point: it is the
  // move the fork refused.
  const claimed = new Set<string>()
  for (const each of placements) {
    if (each === moved) continue
    for (const hole of each.holes) claimed.add(holeKey(hole))
  }
  for (const wire of wires) {
    claimed.add(holeKey(wire.from))
    claimed.add(holeKey(wire.to))
  }
  for (const bridge of bridges) {
    for (const strip of bridge.strips) claimed.add(holeKey({ strip, column: bridge.column }))
  }
  if (moved.holes.some((hole) => claimed.has(holeKey(hole)))) return undefined
  for (const hole of moved.holes) claimed.add(holeKey(hole))

  const nextAreas = areas.map((each, at) => (at === index ? movedArea : each))
  const site: JoinSite = { grid: base.grid, taken: claimed, areas: nextAreas, wires, bridges }
  for (const net of [...affected].sort()) {
    const strips = stripsOfNet(placements, nets, net)
    for (let at = 1; at < strips.length; at += 1) {
      const low = strips[at - 1]
      const high = strips[at]
      if (low === undefined || high === undefined) {
        // **A TYPE NARROWING AND NOT A GUARD**, and it REFUSES rather than
        // skipping, for the reason the skip would be wrong: a `continue` here
        // omits one join from the chain that makes `net` whole, so the proposal
        // comes back with an OPEN in it and reads to a search exactly like a
        // sound board. The honest "no column will serve" answer is the
        // `undefined` `joinColumnFor` returns, which rejects the whole
        // proposal; a dropped pair is neither. The loop runs `1 <= at <
        // strips.length` over the array `stripsOfNet` just returned, so the
        // branch is here only because `noUncheckedIndexedAccess` types an index
        // read `| undefined`. No test asserts it; a mutation run cannot kill it.
        refuse(
          "join-strip-index-lost",
          `index ${at} names no strip of net "${net}", and this loop walks the ${strips.length} ` +
            "strips stripsOfNet just returned, so the read cannot be absent.\nFix stripsOfNet " +
            "or this loop; nothing is substituted and the join is not quietly dropped.",
        )
      }
      const column = joinColumnFor(site, low, high)
      if (column === undefined) return undefined
      if (high - low === 1) bridges.push({ column, strips: [low, high], net })
      else wires.push({ from: { strip: low, column }, to: { strip: high, column }, net })
      claimed.add(holeKey({ strip: low, column }))
      claimed.add(holeKey({ strip: high, column }))
    }
  }
  return { grid: base.grid, placements, wires, bridges }
}

/**
 * Every board one part's translation can reach from this one, with that part's
 * nets re-joined - in a declared order, with nothing ranked and nothing
 * withheld.
 *
 * `base` is the board to move from; `reference` is the circuit's own account of
 * what is connected to what, which is what a re-joined net is re-joined
 * ACCORDING TO; `spans` is the recorded lead geometry, read only for whether a
 * part is rigid; `patterns` is the recorded pin patterns, read only for how far
 * a part's body reaches. Both tables are parameters for the reason `./score.ts`
 * gives for taking its weights as one: a caller must be able to hand in geometry
 * this repository does not record, and a core module reaching for the
 * module-level table is the defect `admitPattern` records about itself.
 *
 * **THE LIST IS AS LARGE AS THE BOARD.** Every translation of every part that
 * is physically possible is proposed - up to one per hole per part - because
 * bounding the neighbourhood to a radius or sampling it is a SEARCH STRATEGY
 * decision, and the strategy is the caller's: *"the algorithm is deliberately
 * not fixed"*. A caller that wants fewer takes fewer; one that wants them in
 * another order sorts them, with its own acceptance rule and its own weights.
 */
export function movesFrom(
  base: Candidate,
  reference: ReferenceNets,
  spans: ReadonlyMap<string, LeadSpan>,
  patterns: PinPatterns,
): readonly Candidate[] {
  if (base.placements.length === 0) {
    refuse(
      "no-placements",
      "movesFrom was handed a board with no placements, so there is no part to move and the " +
        "answer would be an empty list that reads exactly like a board nothing can be improved " +
        "on.\nNothing is substituted: a board with no parts is not a layout, and a generator " +
        "that returned [] for one would hide the fact that the search was started from nothing.",
    )
  }
  // For its refusals, not for its result: a pin on two reference nets, a placed
  // pin on no net, a wire or bridge carrying a net no pin reaches, and a contact
  // off the stock are all refused here, by name, in the module that owns those
  // messages - before this one proposes a board built on the same mistake.
  significantContacts(base, reference)
  const nets = netByPin(reference)
  const areas = partAreasOf(base, spans, patterns)
  const proposals: Candidate[] = []
  for (const [index, placement] of base.placements.entries()) {
    const area = areas[index]
    if (area === undefined) {
      // `areas` is `placements.map(...)`, so this cannot fire - and it REFUSES
      // rather than skipping the part for the reason the skip would be wrong:
      // a `continue` here drops one part's whole neighbourhood, and the result
      // reads exactly like "no feasible move for that part" to a search that
      // then reports a local optimum. Same condition, same loud answer as
      // `relocation`'s own guard above.
      refuse(
        "placement-index-lost",
        `index ${index} names no area, and the area list is built by mapping over this same ` +
          "placement list, so the two cannot differ in length. Fix partAreasOf or this loop; " +
          "nothing is substituted and the part is not quietly skipped.",
      )
    }
    const strips = [...placement.holes.map((hole) => hole.strip), area.rect.minStrip, area.rect.maxStrip]
    const columns = [
      ...placement.holes.map((hole) => hole.column),
      area.rect.minColumn,
      area.rect.maxColumn,
    ]
    const extent = boxOf(strips, columns)
    for (let dStrip = -extent.minStrip; dStrip + extent.maxStrip < base.grid.strips; dStrip += 1) {
      for (
        let dColumn = -extent.minColumn;
        dColumn + extent.maxColumn < base.grid.columns;
        dColumn += 1
      ) {
        if (dStrip === 0 && dColumn === 0) continue
        const next = relocation(base, nets, areas, index, dStrip, dColumn)
        if (next !== undefined) proposals.push(next)
      }
    }
  }
  return proposals
}
