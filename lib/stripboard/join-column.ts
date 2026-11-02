/**
 * WHICH COLUMN A JOIN RUNS IN: the clearest route first, then a column where
 * this wire does not lie on top of another wire, then one where a wire and a
 * bridge do not sit on each other, and only then the lowest column.
 *
 * **IT IS ITS OWN MODULE SO THAT THE RULE HAS ONE OWNER.** It was private to
 * `./seed-place.ts`, where the constructive seed joins a net's strips; the move
 * generator in `./moves.ts` has to make exactly the same decision when a
 * relocated lead needs a wire back to its net, and a second copy of these three
 * ranking keys is two places to keep in step and a board that disagrees with its
 * own rule when they drift. The seed's private copy is DELETED rather than left
 * beside this one.
 *
 * **EVERY KEY IS MEASURED ON THE OWNER'S OWN TWO BOARDS AND NONE IS CHOSEN
 * HERE.** The figures, carried over from the seed's round-2 rework with the
 * owner driving it:
 *
 *   - **7 of his 8 wires cross no part's area at all** - one crosses a formable
 *     capacitor on `transistor-preamp-feedback` and one crosses a rigid trimmer
 *     on `transistor-preamp-buffered` - so a crossing is ORDERED LAST and never
 *     refused;
 *   - **0 wire-on-wire pairs in 8 wires**, so a wire lying on another wire is
 *     something he never does;
 *   - **3 bridge-on-wire pairs in 9 bridges**, so a bridge sitting on a wire is
 *     something he does about a third of the time.
 *
 * Hence the order: wire-on-wire is avoided first and a wire-bridge crossing
 * second, which is what those two counts state rather than what the physics
 * suggests. The first version of the rule exempted bridges outright, on the
 * grounds that a bridge is solder on the COPPER side and a wire is a jumper over
 * the COMPONENT side so the two share no space - true about space and wrong
 * about reading, because where a bridge sits on a wire the drawing cannot say
 * whether the wire ENDS at the bridge or PASSES THROUGH it, and those are
 * different builds. The owner asked the question that found it: *"can you figure
 * out how to place the overlapping wires and bridges?"*
 *
 * **ALL THREE ARE PREFERENCES AND NOT REFUSALS, AND THE SAMPLE SIZE IS WHY.**
 * Eight wires is thin evidence for a hard constraint, and he DID share a column
 * where two spans do not overlap (`feedback` has two wires in column 3, strips
 * 0-5 and 8-14). So this follows the clearance round: leads under a rigid part
 * are refused because 85 leads hold that rule universally, and everything
 * measured on a smaller sample orders positions instead of rejecting them. A
 * board with nowhere clear left still gets built.
 *
 * **THE LOWEST-COLUMN TIE-BREAK IS LAST FOR A REASON THIS PROJECT PAID FOR
 * TWICE.** Taking the lowest free column was the whole rule once, in two
 * separate functions: the first produced a 31 x 3 ribbon the owner called
 * *"kafkaesque"*, and the second put nine of ten wires in column 5 with 24 of
 * the 45 pairs physically on top of each other. The drawing was faithful and the
 * board was a bundle. It survives only as the last key, so that two runs over
 * equal inputs return equal boards.
 */
import type { Bridge, Grid, Hole, Wire } from "./board.ts"
import { holeKey } from "./cuts.ts"
import { ROUTE_ORDER, routeOf, type PartArea } from "./seed-area.ts"

/**
 * Everything the rule reads about a board - and nothing it may change.
 *
 * **`Workspace` IN `./seed-place.ts` SATISFIES IT STRUCTURALLY**, so the seed
 * hands its own state straight in with no adapter and no field copied across;
 * `./moves.ts` builds one from a `Candidate`. Declaring the five fields the rule
 * reads, rather than taking either of those types, is what keeps this module
 * from depending on a constructor's bookkeeping or on a candidate's shape.
 */
export interface JoinSite {
  readonly grid: Grid
  /** `holeKey` of every hole already holding a lead, a wire end or a bridge. */
  readonly taken: ReadonlySet<string>
  /** Every placed part's rectangle, which is what a route is read against. */
  readonly areas: readonly PartArea[]
  readonly wires: readonly Wire[]
  readonly bridges: readonly Bridge[]
}

/** On the stock, and not already holding a lead, a wire end or a bridge. */
export function freeHole(site: JoinSite, hole: Hole): boolean {
  return (
    hole.strip >= 0 &&
    hole.column >= 0 &&
    hole.strip < site.grid.strips &&
    hole.column < site.grid.columns &&
    !site.taken.has(holeKey(hole))
  )
}

/** Does `low`-`high` in `column` overlap a WIRE already placed? Inclusive at both ends. */
function underWire(site: JoinSite, column: number, low: number, high: number): boolean {
  return site.wires.some((wire) => {
    if (wire.from.column !== column || wire.to.column !== column) return false
    const lo = Math.min(wire.from.strip, wire.to.strip)
    const hi = Math.max(wire.from.strip, wire.to.strip)
    return low <= hi && lo <= high
  })
}

/** Does `low`-`high` in `column` overlap a BRIDGE already placed? Inclusive at both ends. */
function overBridge(site: JoinSite, column: number, low: number, high: number): boolean {
  return site.bridges.some((bridge) => {
    if (bridge.column !== column) return false
    const lo = Math.min(bridge.strips[0], bridge.strips[1])
    const hi = Math.max(bridge.strips[0], bridge.strips[1])
    return low <= hi && lo <= high
  })
}

/** Lexicographic: is `a` the better rank? Equal-length by construction. */
function better(a: readonly number[], b: readonly number[]): boolean {
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index]
    const right = b[index]
    if (left === undefined || right === undefined) {
      throw new Error("unreachable: joinColumnFor builds every rank with the same keys")
    }
    if (left !== right) return left < right
  }
  return false
}

/**
 * The column to join strips `low` and `high` in, or `undefined` when no column
 * has a free hole on both.
 *
 * **A ONE-STRIP GAP IS A BRIDGE AND ANYTHING WIDER IS A WIRE**, which is the
 * caller's rule and is read here only to decide which of the two overlap keys
 * applies: a wire can lie on another wire and a bridge cannot, so the second key
 * is skipped for a bridge and the third compares a bridge against the wires
 * rather than the other way round.
 */
export function joinColumnFor(site: JoinSite, low: number, high: number): number | undefined {
  const isWire = high - low > 1
  let best: { readonly column: number; readonly rank: readonly number[] } | undefined
  for (let column = 0; column < site.grid.columns; column += 1) {
    const from = { strip: low, column }
    const to = { strip: high, column }
    if (!freeHole(site, from) || !freeHole(site, to)) continue
    const rank = [
      ROUTE_ORDER.indexOf(routeOf(from, to, site.areas)),
      isWire && underWire(site, column, low, high) ? 1 : 0,
      (isWire ? overBridge : underWire)(site, column, low, high) ? 1 : 0,
    ]
    if (best === undefined || better(rank, best.rank)) best = { column, rank }
  }
  return best?.column
}
