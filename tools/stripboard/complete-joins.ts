/**
 * THE COMPLETION PASS'S CANDIDATE GENERATOR: for one open net, the wires that
 * would close it.
 *
 * THE AUTHORITY for what a join is is `docs/superpowers/specs/
 * 2026-10-10-stripboard-placement-cost-design.md` §1.5's three join mechanisms
 * and `./copper.ts`'s reconstruction of them. THE AUTHORITY for what the pass
 * is trying to achieve is `docs/superpowers/specs/
 * 2026-10-10-stripboard-acceptance-criteria.md` `HC1`. Where this module and
 * those documents differ the documents win and this comment is the defect. The
 * pass itself, its objective and the CRITERIA reading behind it are
 * `./complete.ts`'s; this file only answers *which wires*.
 *
 * **WHY A SEPARATE GENERATOR AT ALL, WHICH IS A MEASURED ANSWER AND NOT A
 * PREFERENCE.** `./moves-wire.ts`'s `wireMovesFor` enumerates ONE wire per pair
 * of STRIPS a net's pins occupy, and the main search accepts a candidate only
 * when it is strictly better in an ordering whose first key is the open-net
 * count. Two facts measured on the import-placed low-boost board make that
 * combination unable to close a net:
 *
 *   1. **A net's pins fall into COPPER COMPONENTS, not strips, and a cut severs
 *      a strip.** On `constructed` seed 0's best board the net `j10_p1` has both
 *      its pins on different strips but the net `0` has eleven pins on ONE strip
 *      and three components in total, because `AutoFillVero`'s cuts divide it.
 *      Strip count and component count are different numbers and the join count
 *      is the second one.
 *   2. **A net on `m` components needs `m - 1` joins, and one wire supplies
 *      one.** Measured over the ten best boards of the first completeness sweep:
 *      every open net needs one to seven joins and the boards need 12, 12, 13,
 *      14, 14 and 21 in total. A single wire therefore leaves the net open
 *      except when `m` is exactly 2 - so `openNets` does not fall, `F` rises by
 *      `ρ_w`, and a strictly-improving rule rejects it. §6.9 counted 7,417
 *      `add-wire` candidates across one sweep and none was ever best.
 *
 * So the generator here emits, per open net, **every wire that net needs, as
 * one candidate.** That is the whole difference from the main search's wire
 * move, and it is why a wire can be accepted in this pass without any change to
 * the acceptance rule: the candidate is sized so that `openNets` really falls.
 *
 * **IT PLANS A SINGLE WIRE PER JOIN, WHICH IS THE ONE LIMIT THAT BINDS.** Two
 * components are joined by one wire running either ACROSS the strips
 * (`./moves-wire.ts`'s `wireBridge`) or ALONG one of them over a cut
 * (`wireAlong`) - both are tried, and the second exists because the first alone
 * planned not one wire on the `--import`-placed board, where every part sits in
 * rows 0 to 4 and every component pair of every open net is on a single strip.
 * What is NOT planned is a wire PATH: two components whose nearest holes are
 * further apart than the fork will stretch a wire (16 holes) can still be joined
 * by two wires through a free strip between them, and no such dogleg is
 * proposed. The limit is REPORTED on the net rather than hidden -
 * `NetJoinPlan.shortfall` names the component pair that stopped the plan - and
 * `.superpowers/sdd/2026-10-10-stripboard-pipeline/completion-pass-report.md`
 * measures how often it binds on each arm.
 *
 * **NOTHING HERE DECIDES ANYTHING ABOUT COST.** It proposes; `./complete.ts`'s
 * acceptance rule - which is the search's own `accepts`, unchanged - decides.
 */
import { alongOf, copperGraph, holeKey, parseHoleKey, type HoleKey } from "./copper.ts"
import { stripOf } from "./constraints-model.ts"
import type { BoardDump } from "../guide/dump.ts"
import type { ReferenceNets } from "./equivalence.ts"
import type { Move } from "./moves-model.ts"
import { nextWireName, wireAfter, wireAlong, wireBridge, type WireLanding } from "./moves-wire.ts"
import { referencePinHoles } from "./pad-provenance.ts"
import type { Occupancy } from "./seed-geometry.ts"

/**
 * One open net's plan: the wires that would close it, and the geometry they
 * leave behind.
 *
 * **`wires.length === components - 1` IS WHAT MAKES THIS A PLAN TO CLOSE THE
 * NET RATHER THAN A PLAN TO IMPROVE IT**, and `shortfall` is non-null exactly
 * when that does not hold. A partial plan is still reported - a reader wants to
 * know that three of a net's four joins are plannable - but `./complete.ts`
 * does NOT propose it as a candidate: a candidate that cannot close the net is
 * the main search's wire move again, and the measurement above says what that
 * buys.
 */
export interface NetJoinPlan {
  readonly net: string
  /** How many copper components this net's reference pins fall into. */
  readonly components: number
  /** One `add-wire` move per join, in the order they must be applied. */
  readonly wires: readonly Move[]
  /** The part geometry after every wire in `wires` has been placed. */
  readonly occupancy: Occupancy
  /** `null` when `wires` closes every join this net needs; otherwise why not. */
  readonly shortfall: string | null
}

/** What the generator reads: one board, its geometry, and which nets are open. */
export interface JoinInput {
  /** The `--dump-board` text of the PAINTED board - the same string the score was read from. */
  readonly dumpText: string
  readonly dump: BoardDump
  /** The part geometry of the UNPAINTED board the wires will be applied to. */
  readonly occupancy: Occupancy
  readonly reference: ReferenceNets
  /** `--check`'s `incomplete` nets, in the report's own order. */
  readonly openNets: readonly string[]
}

/** Every hole of every copper component, keyed by component id. */
function holesByComponent(dump: BoardDump): ReadonlyMap<number, readonly HoleKey[]> {
  const graph = copperGraph(dump)
  const byComponent = new Map<number, HoleKey[]>()
  for (const [hole, component] of graph.components) {
    const own = byComponent.get(component) ?? []
    own.push(hole)
    byComponent.set(component, own)
  }
  // ASCENDING, SO TWO RUNS OVER ONE DUMP PROPOSE THE SAME WIRE. `copperGraph`
  // assigns component numbers in row-major order of first appearance and its
  // map iterates in insertion order, which is already row-major - this sorts
  // anyway rather than relying on that, because the ordering of the wires this
  // module proposes is the reproducibility `V6` rests on and a second file's
  // iteration order is not a thing to depend on silently.
  for (const own of byComponent.values()) own.sort()
  return byComponent
}

/**
 * Which component each of `net`'s reference pins sits in, by component id.
 *
 * **IT GOES THROUGH `referencePinHoles` AND NOT `pinHoles`, AND THAT IS NOT A
 * STYLE CHOICE.** VeroRoute expands an off-board `PADS<n>` part into one-hole
 * pads with board names of their own, so the netlist's `SW_LO_BOOST.2` is the
 * dump's `SW_LO_BOOST_2.1`. On the low-boost board ten of twenty-seven pins are
 * pads - every terminal of the level pot and the rotary switch - and reading
 * them by `PIN` name alone loses all ten, which made an earlier draft of this
 * generator report six nets as having one pin on the board and nothing to join.
 * `./pad-provenance.ts` is the mapping and its module comment is the
 * measurement.
 */
function componentsOfNet(
  net: string,
  input: JoinInput,
  byHole: ReadonlyMap<HoleKey, number>,
): { readonly components: readonly number[]; readonly absent: readonly string[] } {
  const pins = input.reference.get(net)
  if (pins === undefined) {
    throw new Error(
      `componentsOfNet: --check reports "${net}" incomplete and the reference netlist has no ` +
        "such net, so there are no pins to locate and no join to plan. It is NOT skipped: the " +
        "two sides are read from one netlist file by one run (the fork is handed --netlist and " +
        "tools/stripboard/equivalence.ts parses the same export), so a name on one side and not " +
        "the other means the completion pass was handed a check report and a reference built " +
        "from two different netlists. Check the netlist path the pass and the fork were given.",
    )
  }
  const holes = referencePinHoles(input.dumpText)
  const components = new Set<number>()
  const absent: string[] = []
  for (const pin of pins) {
    const hole = holes.get(pin)
    if (hole === undefined) {
      absent.push(pin)
      continue
    }
    const component = byHole.get(hole)
    if (component === undefined) {
      throw new Error(
        `componentsOfNet: reference pin ${pin} of "${net}" sits at hole ${hole} and ` +
          "copperGraph assigned that hole no component. Every hole of the GRID is seeded, so " +
          "this cannot happen for a hole inside the board - it means the pin's hole is outside " +
          "the grid the dump declares, which tools/stripboard/copper.ts's assertInBounds " +
          "refuses. Reaching here means the graph and the pin holes were read from two " +
          "different dumps.",
      )
    }
    components.add(component)
  }
  return { components: [...components].sort((a, b) => a - b), absent }
}

/** A hole as the pair the strip axis decomposes it into. */
interface Decomposed {
  readonly strip: number
  readonly along: number
}

/**
 * Every hole of a component, grouped by one coordinate with the other sorted
 * ascending.
 *
 * `key` picks which coordinate groups and which varies, so one function serves
 * both searches below: grouping by `along` finds the lines across the strips
 * where two components meet, and grouping by `strip` finds the strips they
 * share.
 */
function grouped(
  holes: readonly HoleKey[],
  verticalStrips: boolean,
  key: (hole: Decomposed) => readonly [number, number],
): ReadonlyMap<number, readonly number[]> {
  const map = new Map<number, number[]>()
  for (const name of holes) {
    const hole = parseHoleKey(name)
    const [group, member] = key({
      strip: stripOf(hole, verticalStrips),
      along: alongOf(hole, verticalStrips),
    })
    const own = map.get(group) ?? []
    own.push(member)
    map.set(group, own)
  }
  for (const own of map.values()) own.sort((a, b) => a - b)
  return map
}

/** The holes two component groupings share a group on, ascending. */
function sharedGroups(
  first: ReadonlyMap<number, readonly number[]>,
  second: ReadonlyMap<number, readonly number[]>,
): readonly number[] {
  return [...first.keys()].filter((group) => second.has(group)).sort((a, b) => a - b)
}

/**
 * The wire that joins a hole of `from` to a hole of `to`, or `undefined` when
 * the model admits none.
 *
 * **TWO SEARCHES, IN A FIXED ORDER THAT CARRIES NO PREFERENCE.** First a wire
 * ACROSS the strips, over every line where both components have a hole,
 * ascending; then a wire ALONG a strip both are on, over every such strip,
 * ascending. Either costs exactly one `WIRE` line, so the order decides nothing
 * about `F` - it is fixed because the sequence of wires this module proposes is
 * the reproducibility `V6` rests on, and an order chosen by which search
 * happened to be written first is still an order a run can be replayed against.
 *
 * **THE FIRST THAT FITS WINS** - the same narrowing `wireMovesFor` states for
 * itself, for the same reason: a strip conducts along its whole length, so two
 * wires joining the same two components at two different lines join the same two
 * components and score the same `W`. What differs is which holes they take from
 * a later wire in the same candidate, and that is not modelled - so "the first
 * that fits" is a declared choice whose cost is unmeasured.
 *
 * **THE ARITHMETIC IS `./moves-wire.ts`'S AND IS NOT RE-DERIVED HERE.** This
 * function chooses two holes and asks that module whether a wire reaches between
 * them; it then **checks that the wire landed on the two holes it asked for**
 * rather than assuming it did, because both entry points try two gesture orders
 * and report where the one that fit put the wire. A wire that landed elsewhere
 * would join two components nobody chose, which is a short rather than a repair.
 */
function bridgeBetween(
  occupancy: Occupancy,
  dump: BoardDump,
  name: string,
  net: string,
  from: readonly HoleKey[],
  to: readonly HoleKey[],
): { readonly move: Move; readonly occupancy: Occupancy } | undefined {
  const vertical = dump.verticalStrips
  const holeAt = (strip: number, along: number): HoleKey =>
    holeKey(vertical ? { row: along, col: strip } : { row: strip, col: along })
  const take = (landing: WireLanding, first: HoleKey, second: HoleKey) => {
    const landed = landing.ends.map((end) => holeKey({ row: end[0], col: end[1] })).sort()
    if (landed.join(" ") !== [first, second].sort().join(" ")) return undefined
    const advanced = wireAfter(occupancy, dump.grid, landing.plan)
    if (advanced === undefined) {
      throw new Error(
        `bridgeBetween: a wire plan for ${name} came back from tools/stripboard/moves-wire.ts ` +
          "and wireAfter now says the occupancy cannot be advanced past it. The two cannot " +
          "disagree - the planner calls wireAfter to find the plan it returns - so this is a " +
          "defect in one of them rather than a wire to skip, and the occupancy is NOT left " +
          "unadvanced: a state that disagreed with the board would make every later wire in " +
          "this candidate land on holes that are already taken.",
      )
    }
    return {
      move: { kind: "add-wire", net, ends: landing.ends, plan: landing.plan } satisfies Move,
      occupancy: advanced,
    }
  }

  // ACROSS THE STRIPS: group by the line, vary the strip.
  const fromLines = grouped(from, vertical, (hole) => [hole.along, hole.strip])
  const toLines = grouped(to, vertical, (hole) => [hole.along, hole.strip])
  for (const along of sharedGroups(fromLines, toLines)) {
    for (const first of fromLines.get(along) ?? []) {
      for (const second of toLines.get(along) ?? []) {
        if (first === second) continue
        const low = Math.min(first, second)
        const high = Math.max(first, second)
        const landing = wireBridge(occupancy, dump, name, low, high, along)
        if (landing === undefined) continue
        const taken = take(landing, holeAt(low, along), holeAt(high, along))
        if (taken !== undefined) return taken
      }
    }
  }

  // ALONG ONE STRIP, over a cut: group by the strip, vary the line.
  const fromStrips = grouped(from, vertical, (hole) => [hole.strip, hole.along])
  const toStrips = grouped(to, vertical, (hole) => [hole.strip, hole.along])
  for (const strip of sharedGroups(fromStrips, toStrips)) {
    for (const first of fromStrips.get(strip) ?? []) {
      for (const second of toStrips.get(strip) ?? []) {
        if (first === second) continue
        const low = Math.min(first, second)
        const high = Math.max(first, second)
        const landing = wireAlong(occupancy, dump, name, low, high, strip)
        if (landing === undefined) continue
        const taken = take(landing, holeAt(strip, low), holeAt(strip, high))
        if (taken !== undefined) return taken
      }
    }
  }
  return undefined
}

/**
 * One open net's plan: a wire for each of the `m - 1` joins its `m` components
 * need, each applied to the geometry the one before it left.
 *
 * **THE COMPONENTS ARE JOINED IN A CHAIN, ASCENDING BY COMPONENT ID, AND THE
 * GRAPH IS NOT RECOMPUTED BETWEEN WIRES.** A chain over `m` components is
 * `m - 1` joins and leaves them connected, which is all `HC1` asks for; a
 * recomputation after each wire would need a paint and a dump per wire, which is
 * four invocations per join for an answer the chain already has. What the chain
 * does NOT claim is that it is the cheapest spanning set - `F` is the same
 * either way, because it counts wires and every spanning set of `m` components
 * has `m - 1` of them.
 */
function planFor(
  net: string,
  input: JoinInput,
  byHole: ReadonlyMap<HoleKey, number>,
  byComponent: ReadonlyMap<number, readonly HoleKey[]>,
): NetJoinPlan {
  const located = componentsOfNet(net, input, byHole)
  const components = located.components
  if (located.absent.length > 0) {
    return {
      net,
      components: components.length,
      wires: [],
      occupancy: input.occupancy,
      shortfall:
        `${located.absent.length} of its reference pins are on no hole of this board ` +
        `(${located.absent.join(", ")}), so no wire can reach them. That is HC3's signal read ` +
        "from the other side - a floating part or an unplaced pad prints no PIN line - and it " +
        "is a placement fault rather than a missing join.",
    }
  }
  if (components.length < 2) {
    return {
      net,
      components: components.length,
      wires: [],
      occupancy: input.occupancy,
      shortfall:
        `its pins lie in ${components.length} copper component(s), so it needs no join at all ` +
        "and --check calls it incomplete for some other reason. Nothing here can repair that: " +
        "the pass joins copper and this net's copper is already one piece.",
    }
  }
  const wires: Move[] = []
  let occupancy = input.occupancy
  for (let index = 1; index < components.length; index += 1) {
    const previous = components[index - 1]
    const current = components[index]
    if (previous === undefined || current === undefined) {
      throw new Error(
        `planFor: the component list for "${net}" has a hole at index ${index}, which a sorted ` +
          "array of numbers cannot. Reaching here means componentsOfNet returned something " +
          "other than a dense array.",
      )
    }
    const from = byComponent.get(previous)
    const to = byComponent.get(current)
    if (from === undefined || to === undefined) {
      throw new Error(
        `planFor: component ${from === undefined ? previous : current} holds a pin of "${net}" ` +
          "and holesByComponent lists no hole for it. Every hole of the grid is assigned a " +
          "component, so a component with a pin in it has at least that pin's hole - reaching " +
          "here means the graph and the component index were built from two different dumps.",
      )
    }
    const name = nextWireName(input.dump.wires.length + wires.length)
    const bridged = bridgeBetween(occupancy, input.dump, name, net, from, to)
    if (bridged === undefined) {
      return {
        net,
        components: components.length,
        wires,
        occupancy,
        shortfall:
          `no single wire the model admits joins its copper components ${previous} and ` +
          `${current}: every line across the strips where both have a hole, and every strip ` +
          "both sit on, is either blocked by a part or another wire or further apart than the " +
          "fork will stretch a wire (2 to 16 holes). A WIRE PATH through a free strip between " +
          "them is not planned - see the module comment - so this is a limit of this generator " +
          `as well as of the board. ${wires.length} of this net's ${components.length - 1} ` +
          "joins were plannable and are NOT proposed on their own: a candidate that cannot " +
          "close the net is the main search's wire move, which was measured to buy nothing.",
      }
    }
    wires.push(bridged.move)
    occupancy = bridged.occupancy
  }
  return { net, components: components.length, wires, occupancy, shortfall: null }
}

/**
 * One plan per open net, in `--check`'s own report order.
 *
 * The order is the report's because it is the order the fork prints and
 * therefore reproducible, and because the pass sweeps every plan against one
 * base board - so the order decides nothing about which candidate wins, only
 * the order they are tried in. `./complete.ts`'s acceptance rule picks.
 */
export function netJoinPlans(input: JoinInput): readonly NetJoinPlan[] {
  const graph = copperGraph(input.dump)
  const byComponent = holesByComponent(input.dump)
  return input.openNets.map((net) => planFor(net, input, graph.components, byComponent))
}
