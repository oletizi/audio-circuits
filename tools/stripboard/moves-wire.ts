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

/**
 * How far along a strip a wire's end may land from a pin OF THE NET IT JOINS,
 * in holes.
 *
 * **ONE HOLE, AND THE RULE IS `b725c19`'s RATHER THAN A TOLERANCE INVENTED
 * HERE.** A strip conducts until `AutoFillVero` cuts it, and it cuts between
 * holes carrying DIFFERENT node ids - so an end beside the net's own pin is in
 * that pin's segment, while an end chosen for geometric convenience lands on
 * whatever copper is at that line, which on a crowded strip is another net's.
 * That is not a cost but a SHORT, and the fork refuses to reconcile it
 * (`--update`: *"its two ends are no longer on one net"*).
 *
 * **MEASURED, AND IT IS WHY THIS NOW GOVERNS `add-wire` TOO.** `wireMovesFor`
 * used to take the first line that geometrically fit: over two instrumented
 * runs **103 of 187 `add-wire` candidates (55%) were refused by `--update`
 * before any acceptance key saw them**, every one with that message.
 * `.superpowers/sdd/2026-10-10-stripboard-pipeline/necessary-cuts-report.md` §7.
 *
 * **NECESSARY AND NOT SUFFICIENT:** a cut can sit between a pin and the hole
 * beside it, because the cut list exists only after a candidate is painted, so
 * a candidate the fork still refuses is still counted as unscoreable.
 */
export const WIRE_END_REACH = 1

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
 * The lines of holes at which a wire can land ONE END beside each of two given
 * sets of along-strip coordinates, cheapest first.
 *
 * `firstEnd` and `secondEnd` are the along-strip coordinates of the net's pins
 * that each end has to reach - one list per strip the wire spans. A line
 * qualifies when it is within `WIRE_END_REACH` of a coordinate in BOTH lists,
 * and the order is by total distance from the two nearest pins, then by line, so
 * the first line a caller tries is the tightest one and two runs agree.
 *
 * **IT IS THE ONE IMPLEMENTATION OF THE REACH RULE, and that is the point of it
 * being here.** `wireMovesFor` below and `./moves-join.ts`'s spread lines are the
 * two callers; each decides WHICH pins its ends must reach (a spread's mover pins
 * travel to the target strip and its stayers do not), and neither one spells the
 * arithmetic out again. A second copy would be two readings of one rule, and the
 * rule is the difference between a wire and a short.
 *
 * An empty list on either side yields NO line, not every line: a wire with no
 * pin of its net to reach on one of the two strips has no end that could be in
 * the net's own copper there.
 */
export function wireEndLines(
  dump: BoardDump,
  firstEnd: readonly number[],
  secondEnd: readonly number[],
): readonly number[] {
  if (firstEnd.length === 0 || secondEnd.length === 0) return []
  const nearest = (holes: readonly number[], line: number): number => {
    let best = Number.POSITIVE_INFINITY
    for (const along of holes) best = Math.min(best, Math.abs(along - line))
    return best
  }
  const lines = dump.verticalStrips ? dump.grid.rows : dump.grid.cols
  const reachable: { readonly line: number; readonly cost: number }[] = []
  for (let line = 0; line < lines; line += 1) {
    const first = nearest(firstEnd, line)
    const second = nearest(secondEnd, line)
    if (first > WIRE_END_REACH || second > WIRE_END_REACH) continue
    reachable.push({ line, cost: first + second })
  }
  return reachable.sort((a, b) => a.cost - b.cost || a.line - b.line).map((one) => one.line)
}

/**
 * Where a net's pins sit ALONG each strip, keyed by strip - the dump's `PIN`
 * lines read through the reference netlist.
 *
 * A wire end may land only beside a pin of the net it joins, so an enumerator
 * needs the along-strip positions and not merely which strips are occupied.
 * `./moves-join.ts` is the other caller.
 */
export function netPinsAlongStrips(
  dump: BoardDump,
  reference: ReferenceNets,
  net: string,
): ReadonlyMap<number, readonly number[]> {
  const wanted = new Set(reference.get(net) ?? [])
  const byStrip = new Map<number, number[]>()
  // **IT WALKS `dump.pins`, SO IT ALREADY SEES AN OFF-BOARD PAD'S HOLE AND GATES
  // IT OUT ON THE SPELLING**: `wanted` is keyed the EXPORT's way, a pad's `PIN`
  // line the BOARD's way. It is the FOURTH site pad net membership moves, needs
  // no new iterator, and `./moves-cluster.ts`'s `clusterRefs` carries the bridge
  // (`PadLine.source`) and why it is deferred rather than blocked.
  for (const [ref, own] of Object.entries(dump.pins)) {
    for (const pin of own) {
      if (!wanted.has(`${ref}.${pin.pin}`)) continue
      const strip = stripOf(pin, dump.verticalStrips)
      const along = dump.verticalStrips ? pin.row : pin.col
      const holes = byStrip.get(strip) ?? []
      holes.push(along)
      byStrip.set(strip, holes)
    }
  }
  return byStrip
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
 * cut. **MEASURED, and the measurement is what this function is for:** on the
 * `--import`-placed low-boost board - every part packed into rows 0 to 4 - a
 * completion pass with only `wireBridge` planned **not one wire** of the twelve
 * open nets' twenty-one joins. The board's shape is why a one-strip pair is
 * common there: six of the net `0`'s components sit on row 0 alone, at columns
 * 2, 4, 7, 10, 13, 16 and 23 with cuts between. **What was NOT measured is how
 * many of those twenty-one pairs were on one strip** as against out of the
 * fork's stretch or blocked by a part, so the zero is not read as though it
 * were. Before this function existed the case was recorded as a declared limit,
 * on the strength of the constructed arm, where it does not arise.
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
 * **ITS ENDS LAND BESIDE THE NET'S OWN PINS, AND THAT REPLACED "THE FIRST LINE
 * THAT FITS".** The line is chosen by `wireEndLines` - within `WIRE_END_REACH`
 * of a pin of this net on EACH of the two strips, tightest first - rather than
 * by walking every line of the board until the geometry admits one. The old
 * rule was measured: it proposed wires whose ends sat on whatever copper
 * happened to be at that line, and the fork refused **103 of 187 of them**
 * (55%) with *"its two ends are no longer on one net"* - a short, not a cost,
 * and a candidate no acceptance key ever saw. `WIRE_END_REACH` carries the
 * measurement and the rule's own limit.
 *
 * **WHAT IT STILL DOES NOT CHECK:** whether a CUT sits between the end hole and
 * the pin beside it. Cuts are `AutoFillVero`'s and exist only after the
 * candidate is painted, so the reach rule is necessary and not sufficient, and a
 * candidate the fork still refuses is still counted as unscoreable. A pair of
 * strips with no line serving both ends yields NO candidate here - which is the
 * shape `./moves-join.ts`'s elbow exists for, and this kind does not plan one:
 * a lone wire that cannot reach the net's own copper joins nothing at all.
 */
export function wireMovesFor(
  occupancy: Occupancy,
  dump: BoardDump,
  reference: ReferenceNets,
): readonly Move[] {
  const name = nextWireName(dump.wires.length)
  const bound = stretchBoundFor(WIRE_TYPE)
  const moves: Move[] = []
  for (const [net] of reference) {
    const alongByStrip = netPinsAlongStrips(dump, reference, net)
    const ordered = [...alongByStrip.keys()].sort((a, b) => a - b)
    for (let first = 0; first < ordered.length; first += 1) {
      for (let second = first + 1; second < ordered.length; second += 1) {
        const from = ordered[first]
        const to = ordered[second]
        if (from === undefined || to === undefined) continue
        if (!bound.stretchable || to - from + 1 > bound.maxLength) continue
        // THE LINES THE NET'S OWN PINS CAN BE REACHED AT, not every line of the
        // board: see WIRE_END_REACH for the 103-of-187 measurement that put this
        // call here.
        const lines = wireEndLines(dump, alongByStrip.get(from) ?? [], alongByStrip.get(to) ?? [])
        for (const along of lines) {
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
