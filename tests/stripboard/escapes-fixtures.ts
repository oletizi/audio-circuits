/**
 * The boards `E1` is asserted on, and the hole arithmetic `J` is counted from:
 * what `tests/stripboard/escapes.test.ts` reads.
 *
 * IT IS NOT A `.test.ts` FILE: it is a helper a test file imports, following
 * `./climb-fixtures.ts`, `./seed-compare-fixtures.ts` and four others. Six tasks
 * have converged on that seam and the one cut here is the same: the assertions
 * are in the test file and the material they are checked against is here.
 *
 * **`./search-fixtures.ts` IS THE OTHER HALF**, holding the search's inputs and
 * the two injected spawns. The two were one file until it passed the 500-line
 * ceiling; the seam is the task's own - the boards and the arithmetic here, the
 * run's wiring there - and nothing crosses it.
 *
 * **`joinsOf` IS A SECOND, INDEPENDENT READING OF `J`, AND THAT IS WHY IT IS
 * HERE RATHER THAN IMPORTED.** `tools/stripboard/score.ts` derives `J` from the
 * identity `J = C − N + S_occ`, where `C` is the fork's own `CUT` line count -
 * so it can only be read off a board `AutoFillVero` has painted, which no
 * injected spawn produces. The function below counts the same quantity from the
 * other side of the identity: `J` is the number of segments beyond one per net,
 * and a net's segments are its maximal runs of consecutive OCCUPIED holes along
 * each strip. An unoccupied hole does NOT break a run, because a cut is placed
 * between two adjacent holes carrying DIFFERENT nets and an empty hole carries
 * none. Two readings of one quantity is the point: `E1`'s whole justification is
 * a claim about `J`, and a claim checked by the module that computes it is a
 * claim checked against itself.
 *
 * **NOTHING HERE SIMULATES A TURN OR A STRETCH, AND THE BOUND IS THE SAME ONE
 * `./seed-fixtures.ts` STATES.** A dump does not describe a turned part's
 * footprint, so where a turned part's leads land is not derivable from a dump at
 * all - which is why the climb carries an occupancy. The hole arithmetic below
 * therefore covers translations only, and `escapes.test.ts`'s `J` property is
 * asserted over the `move` and `cluster` kinds for exactly that reason.
 */
import { boardGeometry } from "../../tools/stripboard/copper.ts"
import { stripOf } from "../../tools/stripboard/constraints-model.ts"
import type { ReferenceNets } from "../../tools/stripboard/equivalence.ts"
import { occupancyOf } from "../../tools/stripboard/seed-geometry.ts"
import type { BoardDump } from "../../tools/guide/dump.ts"

/**
 * The board `E1`'s property is asserted on: **a net whose two parts are
 * separated, on one strip, by a part that cannot move.**
 *
 * STRIPS ARE COLUMNS here (`VERTICAL_STRIPS 1`), for `./climb-fixtures.ts`'s
 * reason: a two-lead part laid along a row shorts its own two nets under
 * horizontal strips, and `occupancyOf` refuses a part turned across them, so a
 * board that is both enumerable and sensible has its parts along the rows and
 * its strips down the columns.
 *
 * THE LAYOUT, and every figure `escapes.test.ts` asserts is counted off it:
 *
 * ```
 *        col 0   col 1   col 2   col 3
 * row 0  R1.1    R1.2
 *        (mid)   (y)
 * row 1  X1.1    X1.2    Z1.1    Z1.2
 *        (x)     (x)     (z1)    (z2)
 * row 2  R2.1    R2.2
 *        (mid)   (y)
 * ```
 *
 * `mid` holds `R1.1` at `0,0` and `R2.1` at `2,0` - column 0, with `X1.1` at
 * `1,0` BETWEEN them - so column 0 reads `mid | x | mid` and `mid` costs two
 * segments where one would do. `y` is interrupted the same way in column 1.
 * `J = 8 − 5 = 3`: eight segments (3 in column 0, 3 in column 1, 1 each in
 * columns 2 and 3) over five nets.
 *
 * **`X1` IS BOXED IN, AND THAT IS WHAT MAKES THE PROPERTY TESTABLE RATHER THAN
 * ACCIDENTAL.** Moving the interrupter out of column 0 would merge `mid` by a
 * single-part move, and an earlier draft of this fixture had exactly that hole
 * in it. So `X1` has no gesture at all: `0,0` is `R1`'s and `2,0` is `R2`'s, its
 * column-1 neighbour `1,1` would put its far lead on `1,2` which is `Z1`'s, its
 * column -1 neighbour is off the board, its clockwise turn lands a 2x1 rect on
 * `1,0`-`2,0` and `2,0` is `R2`'s, growing needs `1,2` which is `Z1`'s, and
 * shrinking would take a `RESISTOR` below `Component::CanStretch`'s minimum of
 * two holes. `Z1` is there to block that one growth and that one move, and it
 * carries two singleton nets so it contributes two segments wherever it stands.
 */
export const SCATTERED_DUMP = [
  "GRID 8 8",
  "BOUNDS 0,0 2,3",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 1",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR 10K AT 0,0 SPAN 2 DIRECTION W",
  "PART X1 RESISTOR 10K AT 1,0 SPAN 2 DIRECTION W",
  "PART R2 RESISTOR 10K AT 2,0 SPAN 2 DIRECTION W",
  "PART Z1 RESISTOR 10K AT 1,2 SPAN 2 DIRECTION W",
  "PIN R1 1 AT 0,0",
  "PIN R1 2 AT 0,1",
  "PIN X1 1 AT 1,0",
  "PIN X1 2 AT 1,1",
  "PIN R2 1 AT 2,0",
  "PIN R2 2 AT 2,1",
  "PIN Z1 1 AT 1,2",
  "PIN Z1 2 AT 1,3",
  "NODE 1 NAME mid R1.1 R2.1",
  "NODE 2 NAME y R1.2 R2.2",
  "NODE 3 NAME x X1.1 X1.2",
  "NODE 4 NAME z1 Z1.1",
  "NODE 5 NAME z2 Z1.2",
  "",
].join("\n")

export const SCATTERED: BoardDump = boardGeometry(SCATTERED_DUMP)
export const SCATTERED_OCC = occupancyOf(SCATTERED)

/**
 * The five nets of `SCATTERED_DUMP`, written as a `ReferenceNets` directly.
 *
 * `referenceNetsFromExport` is the production route and `./climb-fixtures.ts`
 * uses it, because its boards are also GRADED and the grader joins a netlist
 * export against the board. Nothing grades this board: it exists for the move
 * enumeration and for `joinsOf`, both of which read a net's pin names and
 * nothing else, so a netlist export would be ten lines of format standing
 * between the fixture and the five facts it is about. The net ORDER is the
 * netlist's order in production (`Map` insertion order, which
 * `referenceNetsFromExport` fills from the export) and it is the insertion order
 * here for the same reason.
 */
export const SCATTERED_REFERENCE: ReferenceNets = new Map([
  ["mid", ["R1.1", "R2.1"]],
  ["y", ["R1.2", "R2.2"]],
  ["x", ["X1.1", "X1.2"]],
  ["z1", ["Z1.1"]],
  ["z2", ["Z1.2"]],
])

/**
 * Two parts on one net, on ADJACENT ROWS: the board on which the cluster's
 * gesture ORDER is the difference between a move that lands and one the fork
 * would refuse.
 *
 * `R1` sits at `0,0` and `R2` directly under it at `1,0`, both on `mid` and `y`.
 * A cluster by `1,0` moves both down one row. Taken in the DUMP's part order,
 * `R1` goes first and its destination `1,0` is `R2`'s own footprint, which
 * `--move` refuses - `Board::PutDown`'s result is discarded and the part is left
 * floating, which the shared `VerifyNothingFloated` check turns into a refusal.
 * Taken furthest-along-the-delta first, `R2` vacates `1,0` before `R1` arrives
 * and both land.
 *
 * It exists because `SCATTERED_DUMP`'s two `mid` parts are two rows apart, where
 * both orders work and a deleted ordering rule would change nothing.
 */
export const STACKED_DUMP = [
  "GRID 8 8",
  "BOUNDS 0,0 1,1",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 1",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR 10K AT 0,0 SPAN 2 DIRECTION W",
  "PART R2 RESISTOR 10K AT 1,0 SPAN 2 DIRECTION W",
  "PIN R1 1 AT 0,0",
  "PIN R1 2 AT 0,1",
  "PIN R2 1 AT 1,0",
  "PIN R2 2 AT 1,1",
  "NODE 1 NAME mid R1.1 R2.1",
  "NODE 2 NAME y R1.2 R2.2",
  "",
].join("\n")

export const STACKED: BoardDump = boardGeometry(STACKED_DUMP)
export const STACKED_OCC = occupancyOf(STACKED)

/** `STACKED_DUMP`'s two nets, in the order its `NODE` lines carry them. */
export const STACKED_REFERENCE: ReferenceNets = new Map([
  ["mid", ["R1.1", "R2.1"]],
  ["y", ["R1.2", "R2.2"]],
])

/**
 * Three parts of one net on THREE DIFFERENT STRIPS: the board the GATHER is
 * asserted on, and the one `E1`'s one-delta cluster cannot do anything about.
 *
 * ```
 *        col 0   col 1   col 2   col 3   col 4   col 5
 * row 0  R1.1    R1.2
 *        (mid)   (a)
 * row 2                  R2.1    R2.2
 *                        (mid)    (b)
 * row 4                                  R3.1    R3.2
 *                                        (mid)    (c)
 * ```
 *
 * `mid` holds one pin on each of strips 0, 2 and 4 - three segments where one
 * would do - and `a`, `b` and `c` are singletons on strips 1, 3 and 5. `J` is
 * `6 - 4 = 2`: six segments over four nets, one hole on each occupied strip.
 *
 * **A COMMON DELTA CANNOT TOUCH IT.** A cluster of `mid` translates all three
 * parts rigidly, so the net keeps one pin on each of three strips wherever it
 * goes; and no one-hole single-part move can close a two-column gap. A GATHER
 * onto strip 0 moves `R2` by `0,-2` and `R3` by `0,-4` - different deltas, one
 * candidate - and `mid` becomes one segment while `a`, `b` and `c` pile onto
 * strip 1 as three: `4 - 4 = 0`.
 *
 * The parts are two rows apart so that the gathered arrangement is clear in the
 * ROW axis, which is what makes the gather land at all: translating across the
 * strips never changes a part's rows.
 */
export const SPREAD_DUMP = [
  "GRID 8 8",
  "BOUNDS 0,0 4,5",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 1",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR 10K AT 0,0 SPAN 2 DIRECTION W",
  "PART R2 RESISTOR 10K AT 2,2 SPAN 2 DIRECTION W",
  "PART R3 RESISTOR 10K AT 4,4 SPAN 2 DIRECTION W",
  "PIN R1 1 AT 0,0",
  "PIN R1 2 AT 0,1",
  "PIN R2 1 AT 2,2",
  "PIN R2 2 AT 2,3",
  "PIN R3 1 AT 4,4",
  "PIN R3 2 AT 4,5",
  "NODE 1 NAME mid R1.1 R2.1 R3.1",
  "NODE 2 NAME a R1.2",
  "NODE 3 NAME b R2.2",
  "NODE 4 NAME c R3.2",
  "",
].join("\n")

export const SPREAD: BoardDump = boardGeometry(SPREAD_DUMP)
export const SPREAD_OCC = occupancyOf(SPREAD)

/** `SPREAD_DUMP`'s four nets, in the order its `NODE` lines carry them. */
export const SPREAD_REFERENCE: ReferenceNets = new Map([
  ["mid", ["R1.1", "R2.1", "R3.1"]],
  ["a", ["R1.2"]],
  ["b", ["R2.2"]],
  ["c", ["R3.2"]],
])

/**
 * The parts with a pin on `mid`, HAND-READ off `SCATTERED_DUMP`'s two `NODE 1`
 * pin names and written as a literal.
 *
 * It is not computed from the reference map, which is what the implementation
 * does: an expectation computed the way the subject computes it passes however
 * wrong both sides are.
 */
export const PARTS_WITH_A_PIN_ON_MID: readonly string[] = ["R1", "R2"]

/** Where one lead sits. */
export interface Hole {
  readonly row: number
  readonly col: number
}

/** Every lead on the board, keyed `${ref}.${pin}` - the `PIN` lines, read once. */
export function holesOf(dump: BoardDump): ReadonlyMap<string, Hole> {
  const holes = new Map<string, Hole>()
  for (const [ref, pins] of Object.entries(dump.pins)) {
    for (const pin of pins) holes.set(`${ref}.${pin.pin}`, { row: pin.row, col: pin.col })
  }
  return holes
}

/** Which part a pin name belongs to, from the dump's own `PIN` lines. */
function partOfPin(dump: BoardDump): ReadonlyMap<string, string> {
  const owner = new Map<string, string>()
  for (const [ref, pins] of Object.entries(dump.pins)) {
    for (const pin of pins) owner.set(`${ref}.${pin.pin}`, ref)
  }
  return owner
}

/**
 * The same holes with every lead of every ref in `refs` translated by `delta`.
 *
 * A TRANSLATION AND NOTHING ELSE - see the module comment on what is not
 * simulated here. `move` is expressed as a translation too, by the caller
 * working out the delta from the part's own `AT`, so there is one arithmetic
 * rather than two.
 */
export function translated(
  holes: ReadonlyMap<string, Hole>,
  dump: BoardDump,
  refs: readonly string[],
  delta: readonly [number, number],
): ReadonlyMap<string, Hole> {
  const owner = partOfPin(dump)
  const moved = new Map<string, Hole>()
  const carried = new Set(refs)
  for (const [pin, hole] of holes) {
    const ref = owner.get(pin)
    if (ref === undefined) {
      throw new Error(`translated: no PART owns pin ${pin}, so this board's PIN lines are not its own`)
    }
    moved.set(
      pin,
      carried.has(ref) ? { row: hole.row + delta[0], col: hole.col + delta[1] } : hole,
    )
  }
  return moved
}

/**
 * `J`: the segments this layout needs beyond one per net - **counted from the
 * holes, which is the identity's other side.** See the module comment.
 *
 * A net with no on-board pin is not counted at all: it has no segment and it is
 * not an extra one either. Every net of `SCATTERED_DUMP` is on the board, so
 * that clause does not fire there; it is written down because a reader checking
 * the arithmetic against five nets should know what the denominator is.
 */
export function joinsOf(
  holes: ReadonlyMap<string, Hole>,
  reference: ReferenceNets,
  verticalStrips: boolean,
): number {
  const netOf = new Map<string, string>()
  for (const [net, pins] of reference) {
    for (const pin of pins) netOf.set(pin, net)
  }
  // Every occupied hole, by strip, in the order the strip runs.
  const byStrip = new Map<number, { readonly along: number; readonly net: string }[]>()
  const present = new Set<string>()
  for (const [pin, hole] of holes) {
    const net = netOf.get(pin)
    if (net === undefined) continue
    present.add(net)
    const strip = stripOf(hole, verticalStrips)
    const along = verticalStrips ? hole.row : hole.col
    const held = byStrip.get(strip) ?? []
    held.push({ along, net })
    byStrip.set(strip, held)
  }
  let segments = 0
  for (const holesOnStrip of byStrip.values()) {
    const ordered = [...holesOnStrip].sort((a, b) => a.along - b.along)
    let previous: string | undefined
    for (const entry of ordered) {
      if (entry.net !== previous) segments += 1
      previous = entry.net
    }
  }
  return segments - present.size
}

/**
 * The same holes with EACH named part translated by ITS OWN delta: a gather's
 * effect, folded out of the one-delta arithmetic above.
 *
 * It folds `translated` one gesture at a time rather than carrying a second
 * arithmetic, which is the same reason `translationsAfter` is one function in
 * the model: a cluster and a gather differ in the deltas and in nothing else.
 */
export function translatedEach(
  holes: ReadonlyMap<string, Hole>,
  dump: BoardDump,
  gestures: readonly { readonly ref: string; readonly delta: readonly [number, number] }[],
): ReadonlyMap<string, Hole> {
  let moved = holes
  for (const one of gestures) moved = translated(moved, dump, [one.ref], one.delta)
  return moved
}

/** `joinsOf` over a board's own holes: the figure before any gesture. */
export function joinsOfDump(dump: BoardDump, reference: ReferenceNets): number {
  return joinsOf(holesOf(dump), reference, dump.verticalStrips)
}

/** The `AT` of one part, from the dump - the origin a `move`'s delta is measured from. */
export function originOf(dump: BoardDump, ref: string): readonly [number, number] {
  const part = dump.parts.find((entry) => entry.ref === ref)
  if (part === undefined || part.placement === "floating") {
    throw new Error(
      `originOf: ${ref} is not a placed PART of this board, so it has no AT to measure a move's ` +
        "delta from.",
    )
  }
  return [part.placement.row, part.placement.col]
}