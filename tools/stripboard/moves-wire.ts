/**
 * `add-wire` AS A COMPOUND GESTURE: where a wire is created, how it is turned
 * and stretched to bridge two strips, and where that leaves the occupancy.
 *
 * THE AUTHORITY is `docs/superpowers/specs/
 * 2026-10-10-stripboard-placement-cost-design.md` §6.1's move set and the fork's
 * own `--author --op add-wire`, `--rotate` and `--stretch`. Where this module and
 * those differ the documents win and this comment is the defect.
 *
 * **WHY IT EXISTS NOW, WHEN THE SAME KIND WAS DEFERRED FOR THREE SWEEPS.** The
 * deferral's first reason was that one gesture cannot bridge two strips - true,
 * measured, and superseded the moment compound gestures arrived. Its second was
 * the occupancy: *"a wire's own holes are not in the occupancy at all, which is a
 * limit of `occupancyOf` rather than a decision here"* - and that was OUR gap,
 * not the fork's, because `dump.wires` reports exactly what was missing.
 * `occupancyOf` now carries every wire's rect, measured against the binary (a
 * part cannot be placed on a wire's holes: `Board::CanPutDown` refuses the
 * collision), so a wire has a landing model and this kind has one too.
 *
 * **WHAT IT COST TO LEAVE IT DEFERRED, which is the reason the owner asked.**
 * `stripboard/rules.json`'s own note for `rhoWire` says the value exists so that
 * *"the optimiser will spend up to four wires to remove one cut and not five, and
 * a wire-heavy board is a PERMITTED outcome rather than a symptom."* With both
 * wire kinds deferred, `W` was frozen at whatever the start carried, so that
 * exchange was unavailable in every run this repository has measured.
 * `docs/stripboard/pipeline-verification.md` §6.9 is the first sweep in which it
 * is not.
 *
 * **AND IT BOUGHT NOTHING, WHICH IS A FACT ABOUT THE COST MODEL AND NOT ABOUT
 * THIS MODULE.** §6.9 measured it: 7,417 `add-wire` candidates across the eleven
 * of fifteen runs whose candidates could be classified, none refused by the
 * binary, and `W = 0` in every best board - `F`, `C`
 * and `W` identical seed for seed to the sweep without this kind. The three
 * measurements behind that, each reproduced in §6.9:
 *
 *   1. at `random` seed 1's stalled board (`F = 12, C = 12, W = 0, B = 0`) ALL 21
 *      of the final round's wire candidates score `F = 12.25, C = 12` - identical
 *      in `N`, `P`, `S_occ`, `J` and `κ` too. **A WIRE DOES NOT REMOVE A CUT**:
 *      `C` is the fork's own cut derivation and `S_occ` counts `PIN` holes, and a
 *      wire's ends are not pins, so a wire is invisible to `C = N + J - S_occ`
 *      and appears only as its own `ρ_w`;
 *   2. the one wire in the sweep that DID pay for itself displaced a `SOLDER`
 *      bridge (`B` 1 -> 0, `F` 20 -> 19.25) and still lost its round to a
 *      candidate scoring 17, because the climb takes the round's best;
 *   3. `worseAcceptance` is `null`, so `E3` does not run and no candidate worse
 *      than the incumbent is ever accepted. A gesture whose payoff needs a SECOND
 *      step can therefore never be the first one.
 *
 * So `rhoWire`'s exchange - four wires for a cut - is not reachable through this
 * move set as scored. What would make it reachable is a configured `E3` bound or
 * a compound gesture that adds the wire AND makes the move it enables, scored as
 * one candidate. Neither is invented here, and the deferral that was lifted was
 * NOT what held `W` at zero.
 *
 * **THE THREE GESTURES, AND THE FOUR MEASUREMENTS BEHIND THEM.** All four were
 * taken on the pinned binary on the import-placed low-boost board:
 *
 *   1. `--author <board> --op add-wire --at 10,10 -o out` exits 0, prints
 *      NOTHING, and creates `WIRE Wire1 AT 10,10 ENDS 10,10 10,12` - three holes
 *      ALONG THE ROW, anchored at a FREE hole;
 *   2. the names are sequential: a second add makes `Wire2` and a third `Wire3`,
 *      so a board carrying `n` wires names the next one `Wire<n+1>`;
 *   3. `--rotate --ref Wire1 --direction cw` works ON A WIRE and prints
 *      `ROTATED Wire1 CW FROM W AT 10,10 HOLES 1x3 TO N AT 9,11 HOLES 3x1`,
 *      which is exactly what `./seed-placement.ts`'s `turnedRect` predicts for a
 *      1x3 rect - so the transcribed arithmetic already covers wires;
 *   4. `--stretch --ref Wire1` works on a wire in both directions, between 2 and
 *      16 holes (`./seed-geometry.ts`'s `VEROROUTE_STRETCH_BOUNDS` carries the
 *      measurement).
 *
 * So a wire that bridges two strips is: create it at a free hole, turn it across
 * the strips if the strips run along the rows, stretch it to the span. **The
 * gesture-order question is REAL here and is `GESTURE_ORDERS`' own**, unlike the
 * cluster's and the gather's: a turn and a stretch need different clearance in
 * each order, so both orders are tried in the sequence that module declares and
 * the first that fits is the one recorded on the move.
 *
 * **`delete-wire` IS STILL REFUSED, AND THE REFUSAL IS NOW MEASURED RATHER THAN
 * READ.** `./moves-model.ts`'s `DEFERRED_KINDS` carries it: the fork's twelve
 * shipped verbs and three test verbs are read out of `Headless.cpp` and
 * `--author`'s six ops out of `Headless_author.cpp`, none of which removes a
 * component; and `--update`, the one verb that rewrites a board's component set
 * from a netlist, LEAVES BOTH WIRES IN PLACE - measured, two before and two
 * after.
 */
import type { BoardDump, Grid } from "../guide/dump.ts"
import { stripOf } from "./constraints-model.ts"
import type { ReferenceNets } from "./equivalence.ts"
import type { Move } from "./moves-model.ts"
import { GESTURE_ORDERS, appliedGestures, type GestureOrder } from "./seed-placement.ts"
import { stretchBoundFor, type Occupancy, type PartRect } from "./seed-geometry.ts"

/** The length, in holes, of the wire `--author --op add-wire` creates. Measured. */
const FRESH_WIRE_HOLES = 3

/** The type name `VEROROUTE_STRETCH_BOUNDS` records a wire's length bound under. */
const WIRE_TYPE = "WIRE"

/**
 * The name the fork will give the next wire on a board that already has `count`
 * of them.
 *
 * **IT IS A PREDICTION, MEASURED AND LOUD WHEN WRONG.** `add-wire` prints
 * nothing, so the name is not readable from the gesture that creates it; the
 * three adds measured on the real binary produced `Wire1`, `Wire2` and `Wire3`
 * in order. Nothing in this pipeline deletes a wire - `delete-wire` is refused
 * and the refusal is measured - so within a run the count only grows and the
 * next index is the count plus one. **If the prediction is ever wrong the
 * follow-up `--rotate --ref` fails, `applyMove` stops the run and names the
 * gesture**, which is the same contract every other gesture has; it cannot pass
 * silently.
 *
 * The alternative was a `--dump-board` between the add and the turn, a fifth
 * invocation per candidate of a kind that already costs three or four.
 */
export function nextWireName(count: number): string {
  return `Wire${count + 1}`
}

/**
 * One `add-wire` candidate's plan: where the wire is created, the gestures that
 * shape it, and the ends it is predicted to finish on.
 *
 * The plan travels ON THE MOVE for the reason the cluster's refs do:
 * `applyMove` is handed a board path and a spawn and has no geometry, and the
 * turn count, the stretch steps and the order are all the model's conclusions.
 */
export interface WirePlan {
  /** The `--op add-wire --at` anchor: a free hole, where a 1x3 wire fits. */
  readonly at: readonly [number, number]
  readonly name: string
  readonly turns: number
  /** Signed: positive grows, negative shrinks, zero leaves the length alone. */
  readonly stretch: number
  readonly order: GestureOrder
}

/** The rect `--op add-wire --at` creates: three holes along the row. */
function freshRect(at: readonly [number, number]): PartRect {
  return { row: at[0], col: at[1], rows: 1, cols: FRESH_WIRE_HOLES, across: false }
}

/**
 * The occupancy after creating a wire by `plan` and applying its gestures, or
 * `undefined` when the model says the fork would refuse one of them.
 *
 * **IT IS `appliedGestures` UNDERNEATH, WITH THE WIRE ALREADY IN THE
 * OCCUPANCY**: the fresh rect is added under the planned name and then the same
 * call every other kind uses moves it nowhere and applies the turns and the
 * stretch steps in the planned order. So the add's own clearance - all three
 * holes free, which is what the fork's anchor rule requires - is `fits`' first
 * check inside that call, and every intermediate rect is checked by the same
 * arithmetic the single-part gestures are.
 */
export function wireAfter(
  occupancy: Occupancy,
  grid: Grid,
  plan: WirePlan,
): Occupancy | undefined {
  if (occupancy.has(plan.name)) return undefined
  const bound = stretchBoundFor(WIRE_TYPE)
  if (!bound.stretchable) return undefined
  const holes = FRESH_WIRE_HOLES + plan.stretch
  if (holes < bound.minLength || holes > bound.maxLength) return undefined
  const seeded = new Map(occupancy)
  seeded.set(plan.name, freshRect(plan.at))
  return appliedGestures(seeded, grid, plan.name, plan.at, plan.turns, plan.stretch, plan.order)
}

/**
 * The plan that bridges strips `from` and `to` at `along`, and the ends it
 * lands on - or `undefined` when no order of the gestures places it.
 *
 * **THE ARITHMETIC IS THE FORK'S OWN, RUN FORWARD.** Under VERTICAL strips the
 * strips are columns and a fresh wire already lies across them, so the wire is
 * created at `(along, from)` with no turn and stretched to the span: `AT` does
 * not move under a stretch and the growth is away from it, so the final span is
 * columns `from .. from + L - 1`. Under HORIZONTAL strips the strips are rows
 * and the wire has to be turned: `turnedRect` of a `1 x 3` at `(r, c)` is a
 * `3 x 1` at `(r - 1, c + 1)`, so the wire is created at `(from + 1, along - 1)`
 * and finishes spanning rows `from .. from + L - 1` in column `along`.
 *
 * `L` is `to - from + 1` and the stretch is `L - 3`, because the fork creates
 * three holes - signed, so a two-hole bridge SHRINKS the fresh wire and the
 * intermediate three-hole rect still has to fit, which `wireAfter` checks.
 *
 * **BOTH ORDERS ARE TRIED, IN `GESTURE_ORDERS`' OWN SEQUENCE.** This is the kind
 * the order question is real for: a turn and a stretch need different clearance
 * in each order, measured on `SI_HI_CUT_R1` at 0 origins against 19. The first
 * order that fits is recorded on the move, so the sequence the fork is asked for
 * is the sequence the model checked.
 */
export function wireBridge(
  occupancy: Occupancy,
  dump: BoardDump,
  name: string,
  from: number,
  to: number,
  along: number,
): WireLanding | undefined {
  return shapedWire(occupancy, dump, name, dump.verticalStrips ? 0 : 1, from, to, along)
}

/**
 * The plan that joins two points `from` and `to` ALONG ONE STRIP `strip`, and
 * the ends it lands on - or `undefined` when no order of the gestures places it.
 *
 * **IT EXISTS BECAUSE A CUT SEVERS A STRIP, which `wireBridge` has no spelling
 * for.** `wireBridge` joins two DIFFERENT strips; two of a net's pins can sit on
 * ONE strip in two different copper components, with `AutoFillVero`'s cut
 * between them, and the wire that joins those runs along the strip and over the
 * cut. Measured on the `--import`-placed low-boost board, where every part is
 * packed into rows 0 to 4: on the board one search left, **every** component
 * pair of **every** one of the twelve open nets lies on a single strip, so a
 * completion pass with only `wireBridge` planned not one wire. That measurement
 * is what this function is for; before it, the case was recorded as a declared
 * limit on the strength of the constructed arm, where it does not arise.
 *
 * **IT IS `wireBridge`'S OWN ARITHMETIC WITH THE TURN COUNT COMPLEMENTED, AND
 * THAT IS THE WHOLE DIFFERENCE.** A fresh wire lies along a ROW, so a wire that
 * runs along a row needs no turn and one down a column needs one - and which of
 * those is "along a strip" is exactly what `VERTICAL_STRIPS` decides. Both
 * functions go through `shapedWire` below, so there is one anchor arithmetic and
 * one reading of where the wire landed.
 */
export function wireAlong(
  occupancy: Occupancy,
  dump: BoardDump,
  name: string,
  from: number,
  to: number,
  strip: number,
): WireLanding | undefined {
  return shapedWire(occupancy, dump, name, dump.verticalStrips ? 1 : 0, from, to, strip)
}

/** A planned wire and the two holes the model says it will finish on. */
export interface WireLanding {
  readonly plan: WirePlan
  readonly ends: readonly [readonly [number, number], readonly [number, number]]
}

/**
 * The shared body: span `from` to `to` at the fixed coordinate `along`, with
 * `turns` quarter-turns, trying both gesture orders.
 *
 * `turns` decides which axis the wire finishes on - 0 leaves it along a ROW, 1
 * turns it down a COLUMN - and therefore what `from`, `to` and `along` mean.
 * `wireBridge` and `wireAlong` are the two callers and each names them in its
 * own comment; nothing else may call this, which is why it is not exported.
 */
function shapedWire(
  occupancy: Occupancy,
  dump: BoardDump,
  name: string,
  turns: number,
  from: number,
  to: number,
  along: number,
): WireLanding | undefined {
  if (to <= from) return undefined
  const holes = to - from + 1
  const stretch = holes - FRESH_WIRE_HOLES
  for (const order of GESTURE_ORDERS) {
    const at = wireAnchor(dump, from, along, holes, turns, order)
    if (at === undefined) continue
    const plan: WirePlan = { at, name, turns, stretch, order }
    const after = wireAfter(occupancy, dump.grid, plan)
    if (after === undefined) continue
    const landed = after.get(plan.name)
    if (landed === undefined) continue
    // **THE ENDS ARE READ OFF THE RECT THE MODEL LANDED, NOT COMPUTED A SECOND
    // TIME.** The two orders land a stretched wire in DIFFERENT places - a
    // stretch grows away from `AT` and a turn moves `AT` by the centring shift,
    // so the composition does not commute for any length but three - and an
    // `ends` derived from one order's arithmetic while the other order's
    // gestures were recorded would be a prediction about a board nobody was
    // going to produce. This way the two cannot disagree: whichever order fit
    // is the one whose rect this reads.
    const ends: readonly [readonly [number, number], readonly [number, number]] = [
      [landed.row, landed.col],
      [landed.row + landed.rows - 1, landed.col + landed.cols - 1],
    ]
    return { plan, ends }
  }
  return undefined
}

/**
 * Where the wire has to be CREATED for `order`'s gestures to land it spanning
 * strips `from` to `from + holes - 1` at `along`.
 *
 * **ONE ANCHOR PER ORDER, because the two orders do not commute.** A fresh wire
 * is `1 x 3` along the row.
 *
 * - **turn-then-stretch**: the turn moves a `1 x 3`'s top-left by `(-1, +1)`
 *   (`turnedRect`'s centring shift at that shape, measured against the binary),
 *   and the stretch then grows along the rows away from the turned `AT`. So the
 *   final span starts where the turned wire starts: create at `(from + 1,
 *   along - 1)`.
 * - **stretch-then-turn**: the wire first grows along the row to `1 x holes`,
 *   and the turn of a `1 x holes` moves its top-left by
 *   `(-trunc((holes - 1) / 2), +trunc((holes - 1) / 2))`. So create at
 *   `(from + t, along - t)` with `t` that shift.
 *
 * With no turn - `VERTICAL_STRIPS`, where a fresh wire already lies across the
 * strips - both orders are the same sequence and the anchor is the span's own
 * corner, which is `./seed-placement.ts`'s own statement about a zero count.
 */
function wireAnchor(
  dump: BoardDump,
  from: number,
  along: number,
  holes: number,
  turns: number,
  order: GestureOrder,
): readonly [number, number] | undefined {
  if (turns === 0) {
    const at: readonly [number, number] = [along, from]
    return at[0] < 0 || at[1] < 0 ? undefined : at
  }
  const shift = order === "turn-then-stretch" ? 1 : Math.trunc((holes - 1) / 2)
  const at: readonly [number, number] = [from + shift, along - shift]
  return at[0] < 0 || at[1] < 0 ? undefined : at
}

/**
 * Every `add-wire` the model admits: for each net in the NETLIST's order, for
 * each PAIR of distinct strips its on-board pins occupy, one wire bridging that
 * pair at the first line of holes that takes it.
 *
 * **IT IS ENUMERATED OVER THE NET'S OWN STRIP PAIRS, which is what makes a wire
 * a repair rather than a decoration.** A wire's whole purpose in the cost
 * identity is to join two of a net's segments, so the pairs that matter are the
 * strips the net is already split across. A pair further apart than the fork
 * will stretch a wire (16 holes) is not proposed.
 *
 * **ONE CANDIDATE PER PAIR, AT THE FIRST LINE THAT FITS, ascending** - and the
 * narrowing is an equivalence rather than a budget: a strip conducts along its
 * whole length, so two wires bridging the same pair at different lines join the
 * same two strips and score the same `W`. What differs is which holes they take
 * from later gestures and what they do to the occupied extent `HC6` measures,
 * and NEITHER is modelled here - so "the first that fits" is a declared choice
 * whose cost is unmeasured, exactly as `UNIT_DELTAS` says of its own
 * neighbourhood.
 *
 * **WHAT IT DOES NOT CHECK, and `./moves.ts`'s own `wireMoves` said the same:**
 * whether the wire's end holes are in the same CUT SEGMENT as the net's pins on
 * those strips. Cuts are `AutoFillVero`'s and exist only after the candidate is
 * painted, so a wire that lands on an isolated piece of its strip buys nothing -
 * and `F` is what says so, one evaluation later. The enumerator reads pin holes
 * and the strip axis and nothing else.
 */
export function wireMovesFor(
  occupancy: Occupancy,
  dump: BoardDump,
  reference: ReferenceNets,
): readonly Move[] {
  const name = nextWireName(dump.wires.length)
  const lines = dump.verticalStrips ? dump.grid.rows : dump.grid.cols
  const bound = stretchBoundFor(WIRE_TYPE)
  const moves: Move[] = []
  for (const [net, pins] of reference) {
    const wanted = new Set(pins)
    const strips = new Set<number>()
    for (const [ref, own] of Object.entries(dump.pins)) {
      for (const pin of own) {
        if (wanted.has(`${ref}.${pin.pin}`)) strips.add(stripOf(pin, dump.verticalStrips))
      }
    }
    const ordered = [...strips].sort((a, b) => a - b)
    for (let first = 0; first < ordered.length; first += 1) {
      for (let second = first + 1; second < ordered.length; second += 1) {
        const from = ordered[first]
        const to = ordered[second]
        if (from === undefined || to === undefined) continue
        if (!bound.stretchable || to - from + 1 > bound.maxLength) continue
        for (let along = 0; along < lines; along += 1) {
          const bridge = wireBridge(occupancy, dump, name, from, to, along)
          if (bridge === undefined) continue
          moves.push({ kind: "add-wire", net, ends: bridge.ends, plan: bridge.plan })
          break
        }
      }
    }
  }
  return moves
}
