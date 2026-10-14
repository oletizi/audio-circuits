/**
 * THE JOIN A SPREAD NEEDS: which lines of holes can carry its rejoining wire,
 * and the L OF TWO WIRES for the case no single straight one can.
 *
 * **IT COMPOSES `./moves-wire.ts`'s TWO PLANNERS AND IS NOT A THIRD ONE.**
 * `wireAlong` plans a wire that runs along one strip and over a cut,
 * `wireBridge` plans one that spans two strips, and `wireAfter` is the one
 * occupancy advance either of them is checked by. This module calls those three
 * in one order and adds no arithmetic of its own about how a wire is created,
 * turned or stretched. `./complete-joins.ts` composes the same pair for the
 * completion pass; the two compositions answer different questions - *which
 * joins does an OPEN net need* there, *which join does THIS RELOCATION need*
 * here - and neither reaches into the other.
 *
 * **ITS OWN MODULE AT THE ENUMERATE/PLAN SEAM AND FOR THE 300-500 LINE
 * CEILING**, the same split `./moves.ts` and `./moves-apply.ts` already have:
 * `./moves-spread.ts` answers *which (net, source, target) triples are worth
 * asking about*, `./moves-wire.ts` answers *how one wire is shaped*, and this
 * file answers *how the two halves of a spread are joined back together*.
 *
 * **WHY THE L EXISTS, AND IT IS A MEASUREMENT RATHER THAN A SHAPE SOMEBODY
 * LIKED.** A spread relocates the net's pins off a crowded strip onto a free
 * one; the pins keep their position ALONG the strip, so the net's copper on the
 * target strip sits at the movers' old along-coordinates, and its copper on the
 * strip it keeps sits at the stayers'. A single straight wire can only join the
 * two where those overlap within `WIRE_END_REACH` - and on the four boards the
 * funnel was run over, **313 of 1,389 triples (23%) died for exactly that
 * reason, the largest gate on both random arms (115 of 231 and 34 of 108)**.
 * `.superpowers/sdd/2026-10-10-stripboard-pipeline/necessary-cuts-report.md` §6
 * carries the funnel. `./moves-spread.ts`'s header already named the remedy -
 * *"the join a human would draw there is an L - a wire ALONG one strip to bring
 * the net's copper under the other strip's, then a wire ACROSS"* - and said it
 * would be a deliberate edit with a run behind it. This is that edit.
 *
 * **WHAT THE L COSTS, AND IT IS NOT HIDDEN FROM `F`.** Two wires, so
 * `2 x rho_w = 0.5` against the one cut the spread removes, against the straight
 * form's `0.25`. Nothing here prices it: `F` charges `W` off the dump's `WIRE`
 * lines like any other wire, so an L that does not pay loses on cost one
 * evaluation later, which is where this pipeline decides such things.
 *
 * **WHAT IT DOES NOT ESTABLISH.** That the two wires land in the cut segments
 * the net's pins are in - cuts are `AutoFillVero`'s and exist only after the
 * candidate is painted, so the reach rule is necessary and not sufficient
 * (`WIRE_END_REACH` carries that limit) - and that the along wire's far end and
 * the bridge's end on that strip are in ONE segment, which holds while nothing
 * cuts between two adjacent holes of one net's own copper and is not proven
 * here. `--check` and `F` are what say so.
 */
import type { BoardDump } from "../guide/dump.ts"
import { stripOf } from "./constraints-model.ts"
import type { ReferenceNets } from "./equivalence.ts"
import { movableRefs } from "./movable.ts"
import {
  WIRE_END_REACH,
  wireAfter,
  wireAlong,
  wireBridge,
  wireEndLines,
  type WireLanding,
} from "./moves-wire.ts"
import type { Occupancy } from "./seed-geometry.ts"

/** A net's pin positions along two strips, as the two ends of a join have to reach them. */
interface JoinEnds {
  /** Along-strip coordinates the net's copper will have on the TARGET strip. */
  readonly leaving: readonly number[]
  /** Along-strip coordinates it has on the strip the net KEEPS. */
  readonly staying: readonly number[]
}

/**
 * Where the net's copper will be along the two strips the join has to connect.
 *
 * **A MOVER'S PIN TRAVELS AND A STAYER'S DOES NOT**, which is why the two lists
 * are kept apart rather than keyed by strip: the net's copper on the target
 * strip is whatever the movers carry there, and a spread's delta crosses the
 * strips only, so a mover's coordinate ALONG the strip is the one it already
 * has on `from`. That is why this is handed `from` and the mover refs rather
 * than the target strip.
 */
export function joinEndsFor(
  dump: BoardDump,
  dumpText: string,
  reference: ReferenceNets,
  net: string,
  from: number,
  joined: number,
  movers: ReadonlySet<string>,
): JoinEnds {
  const owner = new Map<string, string>()
  for (const [name, pins] of reference) for (const pin of pins) owner.set(pin, name)
  const alongOf = (hole: { readonly row: number; readonly col: number }): number =>
    dump.verticalStrips ? hole.row : hole.col
  const leaving: number[] = []
  const staying: number[] = []
  // THE MOVABLE SET AND NOT `dump.parts` - see `./movable.ts`. The iterator is
  // corrected here so there is one answer to what is on the board.
  //
  // **NO PAD CONTRIBUTES AN END HERE, AND THE BRIDGE EXISTS**: `owner` is keyed
  // by the REFERENCE netlist's pin id while a pad's `PIN` line is named the
  // BOARD's way, and the mapping is `PadLine.source`, which is already in the
  // export's spelling. `./moves-cluster.ts`'s `clusterRefs` carries the four
  // sites, which of them is translated - `./moves-wire-nets.ts`'s
  // `netPinsAlongStrips`, on §12's measurement - and the measured reason this
  // one, that one and `./moves-spread.ts`'s `spreadSourceStrips` are declined:
  // translating them widens the move set by 60% in the kinds whose measured
  // acceptance is 0 of 1,787 and 2 of 9,086.
  for (const one of movableRefs(dump, dumpText)) {
    for (const pin of dump.pins[one.ref] ?? []) {
      if (owner.get(`${one.ref}.${pin.pin}`) !== net) continue
      const strip = stripOf(pin, dump.verticalStrips)
      if (strip === from && movers.has(one.ref)) leaving.push(alongOf(pin))
      if (strip === joined && !movers.has(one.ref)) staying.push(alongOf(pin))
    }
  }
  return { leaving, staying }
}

/**
 * The lines a SINGLE straight wire can rejoin the net at: within
 * `WIRE_END_REACH` of the net's copper on BOTH strips, cheapest first.
 *
 * It is `wireEndLines` over `joinEndsFor`'s two lists and nothing else, so the
 * reach rule has one implementation and `add-wire`'s enumeration reads the same
 * one.
 */
export function straightJoinLines(
  dump: BoardDump,
  dumpText: string,
  reference: ReferenceNets,
  net: string,
  from: number,
  joined: number,
  movers: ReadonlySet<string>,
): readonly number[] {
  const ends = joinEndsFor(dump, dumpText, reference, net, from, joined, movers)
  return wireEndLines(dump, ends.leaving, ends.staying)
}

/**
 * The lines an L's ACROSS wire can run at: within `WIRE_END_REACH` of the net's
 * copper on the TARGET strip, whatever the other strip's copper is doing.
 *
 * **IT IS THE STRAIGHT TEST WITH ONE END RELAXED, which is the whole of what
 * the L buys.** The across wire still has to land beside the relocated pins -
 * nothing else puts its end in the net's own copper on the target strip - but
 * its other end no longer has to be beside a stayer's pin, because the along
 * wire is what carries the net's copper there.
 */
export function elbowAcrossLines(
  dump: BoardDump,
  dumpText: string,
  reference: ReferenceNets,
  net: string,
  from: number,
  joined: number,
  movers: ReadonlySet<string>,
): readonly number[] {
  const ends = joinEndsFor(dump, dumpText, reference, net, from, joined, movers)
  return wireEndLines(dump, ends.leaving, ends.leaving)
}

/**
 * The L: a wire ALONG `alongStrip` from beside the pin at `fromPin` to beside
 * `line`, then a wire ACROSS strips `low` to `high` at `line` - or `undefined`
 * when either half does not place.
 *
 * **THE TWO ENDS THAT MATTER ARE THE OUTER ONES**, and the arithmetic says
 * exactly where they go. The along wire starts at the hole NEXT TO the pin
 * (`fromPin + step`) rather than on it, because a pin's hole is occupied and
 * `wireAfter` refuses the collision; it stops at the hole BEFORE `line`
 * (`line - step`), because the across wire's own end takes `line` on that
 * strip. The two therefore sit on adjacent holes of the same strip, joined by
 * the strip's own copper.
 *
 * **IT DECLINES WHEN THE ALONG WIRE WOULD BE SHORTER THAN TWO HOLES**, which is
 * `|line - fromPin| < 3`. That case needs no L at all: a pin two holes from the
 * line means some line is within one hole of both ends, which is the straight
 * form, and proposing an L there would put one join in the sweep twice.
 *
 * The order is ALONG first, then ACROSS, and the occupancy is advanced between
 * them by `wireAfter` - the same composition `./moves-spread.ts`'s `spreadAfter`
 * replays when the climb asks what the candidate did, so the sequence the fork
 * is asked for is the sequence the model checked.
 */
export function wireElbow(
  occupancy: Occupancy,
  dump: BoardDump,
  names: readonly [string, string],
  alongStrip: number,
  fromPin: number,
  line: number,
  low: number,
  high: number,
): readonly [WireLanding, WireLanding] | undefined {
  if (Math.abs(line - fromPin) < WIRE_END_REACH + 2) return undefined
  const step = line > fromPin ? 1 : -1
  const near = fromPin + step
  const far = line - step
  const [first] = names
  const second = names[1]
  if (second === undefined) return undefined
  const along = wireAlong(
    occupancy,
    dump,
    first,
    Math.min(near, far),
    Math.max(near, far),
    alongStrip,
  )
  if (along === undefined) return undefined
  const advanced = wireAfter(occupancy, dump.grid, along.plan)
  if (advanced === undefined) return undefined
  const across = wireBridge(advanced, dump, second, low, high, line)
  if (across === undefined) return undefined
  return [along, across]
}

/** The stayers' along-strip positions, nearest to `line` first: which pin an L reaches back to. */
export function elbowAnchors(
  dump: BoardDump,
  dumpText: string,
  reference: ReferenceNets,
  net: string,
  from: number,
  joined: number,
  movers: ReadonlySet<string>,
  line: number,
): readonly number[] {
  const ends = joinEndsFor(dump, dumpText, reference, net, from, joined, movers)
  return [...new Set(ends.staying)].sort(
    (a, b) => Math.abs(a - line) - Math.abs(b - line) || a - b,
  )
}
