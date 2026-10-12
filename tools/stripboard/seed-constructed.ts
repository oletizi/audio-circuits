/**
 * The **constructed** arm: one net per strip, each part turned across the strips
 * of its two nets and stretched to reach, the junction's `SIP5` placed first as
 * a fixed sub-arrangement.
 *
 * *"Should land at or near `J = 0`"* is the conjecture this arm IS. The
 * arithmetic behind it - one net per strip costs zero cuts - is proved in COST
 * and stays there; that it is a good place to start searching from is this arm's
 * claim and the comparison's question. **Nothing here has tested that claim**:
 * the comparison needs a rate against random's over a real search, which is Task
 * 18's final step, and a start count is not a rate - a sentence that lives
 * beside `RETIREMENT` in `./seed-compare.ts`, where whoever reaches for the
 * retirement rule will read it.
 *
 * The split from `./seed-arms.ts` is at the seam between this arm, which is most
 * of the work, and the other two plus the driver they share. One file carrying
 * all three was 517 lines against this repository's 300-500 ceiling.
 */
import { TOOL_MAX_SPAN_HOLES, TOOL_MIN_SPAN_HOLES } from "../../lib/kicad/lead-span-model.ts"
import type { BoardDump, Part } from "../guide/dump.ts"
import { assignStrips, junctionNets, referenceNetsFor, type StripAssignment } from "./seed-arrangement.ts"
import { move, readBoard, rotate, stretch, type Gesture, type GestureSet } from "./seed-arms.ts"
import { occupancyOf } from "./seed-geometry.ts"
import { appliedGestures, GESTURE_ORDERS, rectOf } from "./seed-placement.ts"
import { netsByPart } from "./seed-nets.ts"
import type { SeedInput, SpawnVeroroute } from "./seed.ts"

/**
 * The strip coordinates one part's leads occupy.
 *
 * A hole's strip is its ROW under horizontal strips and its COLUMN under
 * vertical ones - the axis `VERTICAL_STRIPS` names, the same definition
 * `occupiedStrips` uses, and a definition rather than data: nothing in the dump
 * states it.
 */
function leadStrips(dump: BoardDump, part: Part): readonly number[] {
  const pins = dump.pins[part.ref] ?? []
  return pins.map((pin) => (dump.verticalStrips ? pin.col : pin.row))
}

/**
 * Whether this part's leads all sit on ONE strip, which is what `--import`'s
 * first-fit sweep leaves and what the constructed arm turns them off.
 *
 * Measured from the leads rather than from `DIRECTION`, because `DIRECTION` is
 * optional in the dump grammar - two frozen captures predate the field - and a
 * part whose direction is absent is still a part whose leads are readable.
 */
function alongOneStrip(dump: BoardDump, part: Part): boolean {
  const strips = leadStrips(dump, part)
  return strips.length > 1 && new Set(strips).size === 1
}

/** A part's lead span in holes, which no rotation changes: the Chebyshev reach plus one. */
function leadSpanHoles(dump: BoardDump, ref: string): number {
  const pins = dump.pins[ref] ?? []
  if (pins.length < 2) return 1
  const rows = pins.map((pin) => pin.row)
  const cols = pins.map((pin) => pin.col)
  return (
    Math.max(
      Math.max(...rows) - Math.min(...rows),
      Math.max(...cols) - Math.min(...cols),
    ) + 1
  )
}

/** The strip this net is assigned, refusing a net the arrangement does not carry. */
function stripFor(assignment: StripAssignment, net: string, board: string): number {
  const strip = assignment.get(net)
  if (strip === undefined) {
    throw new Error(
      `seedCandidate: net "${net}" is on this board's dump but has no strip in ${board}'s ` +
        "arrangement, so the dump and the target set were derived from different networks. It " +
        "is not placed on an arbitrary strip: a net with no strip is a net the construction " +
        "silently stopped arranging.",
    )
  }
  return strip
}

/**
 * The span a two-net part's construction asks for: `|strip a - strip b| + 1`,
 * refused when it is outside the TOOL's own range.
 *
 * **IT IS A PRE-FLIGHT AND IT RUNS OVER EVERY PART BEFORE ANY GESTURE.** A
 * construction that KNOWS it is asking for an unreachable span says so where the
 * remedy is rather than emitting a candidate for `HC5` to reject anonymously,
 * and refusing before the first gesture means a refused run has written nothing.
 *
 * **WHAT IT CAN KNOW IS THE TOOL'S RANGE AND NOT THE PART'S.** `SeedInput`
 * carries no footprint map, so the tighter per-footprint `maxSpanHoles` in
 * `lib/kicad/lead-span.ts` is unreachable from here and `HC5` is what applies
 * it. A span outside 2-16 holes is one no footprint's `maxSpanHoles` can
 * accommodate, so that is the subset this arm refuses on.
 *
 * **IT IS EXPORTED BECAUSE IT IS UNREACHABLE THROUGH `seedCandidate` ON EVERY
 * COMMITTED BOARD, AND A GUARD NO TEST CAN DRIVE IS A GUARD THAT HAS ALREADY
 * STOPPED WORKING.** The gathered arrangement's bandwidth is at most 11 (on
 * low-cut), so the widest span any of the five boards asks for is 12 - inside
 * the tool's 16 with margin. The refusal is for an arrangement nobody has
 * produced yet, which is exactly why it is tested directly.
 */
export function constructionSpan(ref: string, stripA: number, stripB: number, board: string): number {
  const needed = Math.abs(stripA - stripB) + 1
  if (needed > TOOL_MAX_SPAN_HOLES || needed < TOOL_MIN_SPAN_HOLES) {
    throw new Error(
      `seedCandidate: the construction puts ${ref}'s two nets on strips ${stripA} and ` +
        `${stripB} of ${board}, which asks for a span of ${needed} holes - outside the ` +
        `tool's own ${TOOL_MIN_SPAN_HOLES}-${TOOL_MAX_SPAN_HOLES}, so no footprint's ` +
        "maxSpanHoles in lib/kicad/lead-span.ts can accommodate it and no part can be bent " +
        "to it. It is refused here rather than emitted for HC5 to reject anonymously, " +
        "because the remedy is in the span data and in the arrangement, not in the layout.",
    )
  }
  return needed
}

/**
 * The **constructed** arm: one net per strip, each part turned across the strips
 * of its two nets and stretched to reach, the junction's `SIP5` placed first as
 * a fixed sub-arrangement.
 *
 * *"Should land at or near `J = 0`"* is the conjecture this arm IS. The
 * arithmetic behind it - one net per strip costs zero cuts - is proved in COST
 * and stays there; that it is a good place to start searching from is this arm's
 * claim and the comparison's question.
 *
 * **THE SPAN REFUSAL IS A PRE-FLIGHT OVER EVERY PART, BEFORE ANY GESTURE.** A
 * construction that KNOWS it is asking for an unreachable span says so where the
 * remedy is rather than emitting a candidate for `HC5` to reject anonymously -
 * and refusing before the first gesture means a refused run has written nothing.
 * What it can know is the TOOL's range: `SeedInput` carries no footprint map, so
 * the tighter per-footprint `maxSpanHoles` in `lib/kicad/lead-span.ts` is not
 * reachable from here and `HC5` is what applies it. A span outside 2-16 holes is
 * one no footprint's `maxSpanHoles` can accommodate, so that is the subset this
 * arm refuses on. **`leadSpanFor` is therefore NOT consumed by this task** -
 * the plan's interface list names it, and nothing here can call it.
 *
 * **WHAT THIS ARM DOES NOT CLAIM.** It emits the gestures its arrangement
 * implies. The MOVE comes first because the rotation measurement forces that
 * much - 16 of the import sweep's 17 parts cannot turn where it left them. The
 * seventeenth is `C18`, a 3x3 `CAP_FILM_WIDE`: its rect is square, so turning
 * about the rect's centre shifts it by nothing and the turn is accepted in
 * place. An earlier version of this sentence said NO part turns in place, which
 * is false by that one part - but a move-first order is still what the arm
 * emits, because one square footprint is not a rule to build on. Then **the order of the
 * turn and the stretch is CHOSEN, not forced**, and an earlier version of this
 * comment said the measurement forced it, which was the claim the 1225-origin
 * sweep disproved: `SI_HI_CUT_R1` places at 0 origins with the turn first and at
 * 19 with the shrinks first. `place` tries `GESTURE_ORDERS` in sequence and takes
 * the first that places.
 *
 * Whether the fork's rotation about the rect's centre leaves each lead exactly on
 * the strip the arrangement named is NOT asserted here and is not asserted
 * anywhere: the start proposes and `grade.ts` measures. What IS checked before
 * each gesture is emitted is that the fork will accept it, through the same
 * `appliedGestures` model the random arm draws through.
 */
export function constructedGestures(input: SeedInput, spawn: SpawnVeroroute): GestureSet {
  const { text, dump } = readBoard(spawn, input.importedBoard)
  const assignment = assignStrips(input.targets, input.seed)
  const junction = junctionNets(input.targets)
  const board = input.targets.board
  const nets = netsByPart(text, referenceNetsFor(input.targets), board)

  const junctionSet = new Set(junction)
  const junctionPart = dump.parts.find((part) => {
    const own = nets.get(part.ref) ?? []
    return own.length === junctionSet.size && own.every((net) => junctionSet.has(net))
  })
  if (junctionPart === undefined) {
    throw new Error(
      `seedCandidate: ${board}'s model carries a junction on nets ${junction.join(", ")}, but no ` +
        "part on this dump names exactly those nets, so the SIP5 sub-arrangement has nothing to " +
        "place. It is NOT skipped: the junction at 1-hole pitch is the only component on these " +
        "boards forcing more than two nets together, and a construction that quietly left it to " +
        "the general rule would put five nets on one strip and cost four cuts.",
    )
  }

  // PRE-FLIGHT: every part's required span, before anything is spawned.
  const plan: { part: Part; strips: readonly number[]; needed: number }[] = []
  for (const part of dump.parts) {
    if (part.ref === junctionPart.ref) continue
    const own = (nets.get(part.ref) ?? []).map((net) => stripFor(assignment, net, board))
    if (own.length === 0) {
      throw new Error(
        `seedCandidate: part ${part.ref} on ${board} names no net at all in the dump's NODE ` +
          "lines, so the construction has no strip to put it on. It is not left where it is: a " +
          "part the arrangement does not account for makes the one-net-per-strip claim false " +
          "about the board it produced.",
      )
    }
    if (own.length > 2) {
      throw new Error(
        `seedCandidate: part ${part.ref} on ${board} names ${own.length} nets, and the ` +
          "construction's rule turns a part across the strips of its TWO nets. The junction's " +
          "SIP5 is the only part with a sub-arrangement for more, and this is not it. It is " +
          "NOT laid along one strip instead: that would put every one of its nets on that " +
          "strip and cost a cut per net, silently, under a rule that claims zero.",
      )
    }
    const needed =
      own.length === 1
        ? leadSpanHoles(dump, part.ref)
        : constructionSpan(part.ref, own[0]!, own[1]!, board)
    plan.push({ part, strips: own, needed })
  }

  const gestures: Gesture[] = []
  const grid = dump.grid
  let working = occupancyOf(dump)

  /**
   * Place one part on the strip the arrangement gave it, at the FIRST column it
   * fits at and can take its own turn and stretches from.
   *
   * **THE STRIP IS DECIDED BY THE ARRANGEMENT AND THE COLUMN IS THE ONLY
   * FREEDOM**, so the column is searched rather than drawn: left to right, the
   * first one that admits the whole gesture sequence. That is deterministic
   * (this arm's only randomness is the seeded arrangement itself) and it is
   * narrowing rather than retrying - `appliedGestures` answers before anything
   * is emitted, so no refusal is discovered by attempting one.
   *
   * It replaced a cursor that advanced two columns per part and consulted
   * nothing. That cursor is deleted rather than kept beside this: it put parts
   * on top of each other and on top of the board's pads, and against the real
   * binary it stopped the arm on `junction_signals`' first gestures on four
   * seeds out of five.
   */
  const place = (ref: string, strip: number, turns: number, stretchBy: number): void => {
    // THE MOVE'S ROW IS NOT THE STRIP, AND ASSUMING IT WAS IS ONE OF THE TWO
    // THINGS THAT BROKE THIS ARM AGAINST THE REAL BINARY. `--move --to` names the
    // footprint's TOP-LEFT corner, and a quarter turn then shifts that corner by
    // `trunc((DY - DX) / 2)` rows - upwards for every part lying along a strip -
    // so a part sent to row 2 and turned lands at row 0 or above it and the fork
    // refuses the pan. The row is therefore SEARCHED, with the model answering
    // where each candidate ends up, rather than computed by a shift written out
    // here: the shift depends on the rect's dimensions at each step, and a second
    // copy of that arithmetic is what `./seed-placement.ts` exists to prevent.
    //
    // AND THE GESTURE ORDER IS CHOSEN, NOT ASSUMED, which was the other one. A
    // fixed move-turn-stretch reported `SI_HI_CUT_R1` as unplaceable on strip 0
    // when all 1225 origins were tried: the turned-but-unshrunk rect is 5 rows
    // tall and no column has that clearance. With the shrinks BEFORE the turn, 19
    // of the same 1225 place it, the first at `0,0`. So the orders are tried in
    // `GESTURE_ORDERS`' declared sequence and the first that places wins -
    // deliberately not swapped to shrink-first, which would trade one hardcoded
    // order for another with no evidence the new one is universally better.
    //
    // THE TARGET IS THE TURNED RECT'S TOP ROW. The occupancy model tracks rects
    // and not leads, and for every type `VEROROUTE_FOOTPRINT_ROWS` covers the
    // first lead sits on the rect's edge along the axis the leads run on - so the
    // rect's top row IS the strip the first lead lands on. That is a property of
    // those four footprints and not of footprints in general, which is one more
    // reason the whitelist refuses an unrecorded type.
    for (const order of GESTURE_ORDERS) {
      for (let row = 0; row < grid.rows; row += 1) {
        for (let col = 0; col < grid.cols; col += 1) {
          const after = appliedGestures(working, grid, ref, [row, col], turns, stretchBy, order)
          if (after === undefined) continue
          if (rectOf(after, ref).row !== strip) continue
          // THE ORDER IS RECORDED where this task has a channel for it: every
          // gesture's `what` is what a refusal quotes, so a run that stops after
          // this part says which order placed the ones before it. The per-run
          // manifest record is Task 18's.
          gestures.push(move(ref, row, col, `onto strip ${strip} (${order})`))
          const direction = stretchBy > 0 ? "grow" : "shrink"
          const turn = (): void => {
            for (let step = 0; step < turns; step += 1) gestures.push(rotate(ref, order))
          }
          const pull = (): void => {
            for (let step = 0; step < Math.abs(stretchBy); step += 1) {
              gestures.push(stretch(ref, direction, order))
            }
          }
          if (order === "turn-then-stretch") {
            turn()
            pull()
          } else {
            pull()
            turn()
          }
          working = after
          return
        }
      }
    }
    throw new Error(
      `seedCandidate: the construction puts ${ref} on strip ${strip} of ${board}, and no hole on ` +
        `this ${grid.rows}x${grid.cols} grid leaves it there after its ${turns} quarter turn(s) ` +
        `and ${Math.abs(stretchBy)} stretch step(s) in ANY of the orders tried ` +
        `(${GESTURE_ORDERS.join(", ")}), beside the parts already placed ` +
        `(${[...working.keys()].filter((other) => other !== ref).join(", ")}). It is NOT moved to ` +
        "another strip: the strip IS the arrangement, and a part on a strip the arrangement did " +
        "not give it makes the one-net-per-strip claim false about the board produced.\n" +
        "WHAT THIS ESTABLISHES, EXACTLY: no gesture order placed this part on this strip GIVEN " +
        "THE PARTS ALREADY DOWN. It does NOT establish that the arrangement is unrealisable on " +
        "this board. The packing is greedy and never backtracks - every earlier part took the " +
        "first order, row and column that worked for it, and one of those choices may be what " +
        "left this part nothing - so whether some other packing order would have placed it is " +
        "NOT KNOWN and is not claimed here. Both readings were tried for the gesture order " +
        "itself, because a fixed one produced exactly this refusal for a part that 19 origins " +
        "could place in the other; the packing order has had no such treatment. Reported per " +
        "seed rather than aborting the run.",
    )
  }

  // The junction first: its five 1-hole-pitch pins onto five consecutive strips,
  // the first of them on the strip its first pin's net was assigned. It never
  // stretches - a SIP5's pitch is fixed.
  place(
    junctionPart.ref,
    stripFor(assignment, junction[0]!, board),
    alongOneStrip(dump, junctionPart) ? 1 : 0,
    0,
  )

  for (const { part, strips, needed } of plan) {
    const turns = strips.length === 2 && alongOneStrip(dump, part) ? 1 : 0
    const stretchBy = strips.length === 2 ? needed - leadSpanHoles(dump, part.ref) : 0
    place(part.ref, strips[0]!, turns, stretchBy)
  }
  return { gestures, occupancy: working }
}
