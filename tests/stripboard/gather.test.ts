/**
 * Task 18, after the controller's rulings of 2026-10-12: **the GATHER**, which
 * is the gesture `E1`'s own justification describes and the one-delta cluster
 * cannot perform.
 *
 * The cluster's own tests are in `./escapes.test.ts` and `E2`/`E3`'s are in
 * `./escapes-search.test.ts`; the three were one file until it passed the
 * 500-line ceiling, and the seam is the one the move set has - a cluster is one
 * delta for every part, a gather is one delta per part, and the two are
 * different moves named for what each does. `./escapes-fixtures.ts` holds the
 * boards.
 *
 * **WHAT THESE PROVE AND WHAT THEY DO NOT.** The spawn is injected, so what is
 * asserted here is the ENUMERATION, the ARGUMENT LISTS and the hole arithmetic
 * `J` is counted from - never that the fork lands a gesture where the model says
 * it will. `docs/stripboard/pipeline-verification.md` §6.6 and §6.8 carry what
 * the real binary did with the gather, including the one candidate that took `F`
 * from 15 to 11.
 *
 * Every count is hand-derived from the fixture with the derivation in a comment
 * a reader can check, and written as a literal.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import {
  applyMove,
  describeMove,
  enumerateMoves,
  gatherMove,
  gatherStrips,
  occupancyAfter,
  translationsAfter,
  type Move,
} from "../../tools/stripboard/moves.ts"
import { freshRunDir } from "./climb-fixtures.ts"
import {
  BLOCKED,
  BLOCKED_OCC,
  BLOCKED_REFERENCE,
  holesOf,
  joinsOf,
  joinsOfDump,
  originOf,
  SCATTERED,
  SCATTERED_OCC,
  SCATTERED_REFERENCE,
  SPREAD,
  SPREAD_OCC,
  SPREAD_REFERENCE,
  STACKED,
  STACKED_OCC,
  STACKED_REFERENCE,
  translatedEach,
} from "./escapes-fixtures.ts"
import type { SpawnVeroroute } from "../../tools/stripboard/seed.ts"
import type { Occupancy } from "../../tools/stripboard/seed-geometry.ts"
import type { ReferenceNets } from "../../tools/stripboard/equivalence.ts"
import type { BoardDump } from "../../tools/guide/dump.ts"

/** A spawn that records every invocation and writes every `-o`, with no dump in play. */
function recorder(): { readonly spawned: string[][]; readonly spawn: SpawnVeroroute } {
  const spawned: string[][] = []
  const spawn: SpawnVeroroute = (args) => {
    spawned.push([...args])
    const at = args.indexOf("-o")
    const out = args[at + 1]
    if (at === -1 || out === undefined) {
      throw new Error(`the recorder was given a write verb with no -o: ${args.join(" ")}`)
    }
    fs.writeFileSync(out, `${args.join(" ")}\n`)
    return { status: 0, stdout: "", stderr: "" }
  }
  return { spawned, spawn }
}

const moveKind = (move: Move): move is Extract<Move, { kind: "move" }> => move.kind === "move"

const clusterKind = (move: Move): move is Extract<Move, { kind: "cluster" }> =>
  move.kind === "cluster"

/* ------------------------------------------------------------------------- *
 * THE GATHER, which is the gesture E1's own justification describes.
 * ------------------------------------------------------------------------- */

/** One gather move, or a failure naming the net - never a non-null assertion. */
function gatherOrFail(
  occupancy: Occupancy,
  dump: BoardDump,
  reference: ReferenceNets,
  net: string,
  strip: number,
): Move {
  const move = gatherMove(occupancy, dump, reference, net, strip)
  if (move === undefined) {
    throw new Error(
      `this fixture was expected to admit a gather of "${net}" onto strip ${strip} and the model ` +
        "says it does not, so the test below would be asserting over a move nobody made.",
    )
  }
  return move
}

const gatherKind = (move: Move): move is Extract<Move, { kind: "gather" }> =>
  move.kind === "gather"

test("THE GATHER lowers J where neither a single-part move nor a one-delta cluster can", () => {
  // THIS IS THE LEVER, AND THE TEST IS THE WHOLE REASON THE KIND EXISTS. On
  // SPREAD_DUMP the net `mid` holds one pin on each of strips 0, 2 and 4, so
  // its three segments are two more than it needs. J = 6 - 4 = 2, counted by
  // hand off the layout in the fixture's own comment: one hole on each of six
  // occupied strips, four nets.
  const before = joinsOfDump(SPREAD, SPREAD_REFERENCE)
  expect(before).toBe(2)
  const holes = holesOf(SPREAD)
  const after = (gestures: readonly { readonly ref: string; readonly delta: readonly [number, number] }[]): number =>
    joinsOf(translatedEach(holes, SPREAD, gestures), SPREAD_REFERENCE, SPREAD.verticalStrips)

  // NOT ONE SINGLE-PART MOVE LOWERS IT: a one-hole move cannot close a
  // two-column gap, and every one of them leaves six segments standing.
  const moves = enumerateMoves(SPREAD_OCC, SPREAD, SPREAD_REFERENCE)
  const singles = moves.filter(moveKind)
  expect(singles.length).toBeGreaterThan(0)
  for (const single of singles) {
    const origin = originOf(SPREAD, single.ref)
    const delta: readonly [number, number] = [single.to[0] - origin[0], single.to[1] - origin[1]]
    expect(after([{ ref: single.ref, delta }]), describeMove(single)).toBeGreaterThanOrEqual(before)
  }

  // AND NOT ONE ONE-DELTA CLUSTER LOWERS IT EITHER, which is the measured
  // finding this kind exists because of: a cluster translates the net's parts
  // RIGIDLY, so `mid` keeps one pin on each of three strips wherever it goes.
  const clusters = moves.filter(clusterKind)
  expect(clusters.length).toBeGreaterThan(0)
  for (const cluster of clusters) {
    const gestures = cluster.refs.map((ref) => ({ ref, delta: cluster.delta }))
    expect(after(gestures), describeMove(cluster)).toBeGreaterThanOrEqual(before)
  }

  // THE GATHER TAKES IT TO ZERO. Onto strip 0: R1's pin is already there, R2
  // moves by 0,-2 and R3 by 0,-4 - three parts, two deltas, one candidate - so
  // `mid` becomes one segment and `a`, `b` and `c` pile onto strip 1 as three.
  // 4 segments over 4 nets.
  const gather = gatherOrFail(SPREAD_OCC, SPREAD, SPREAD_REFERENCE, "mid", 0)
  expect(gather.kind === "gather" ? gather.gestures : []).toEqual([
    { ref: "R2", delta: [0, -2] },
    { ref: "R3", delta: [0, -4] },
  ])
  expect(after(gather.kind === "gather" ? gather.gestures : [])).toBe(0)
  expect(after(gather.kind === "gather" ? gather.gestures : [])).toBeLessThan(before)
})

test("a gather asks about EVERY strip, including the empty ones", () => {
  // **THE WIDENING, AND THE FALSE CAUSE IT REPLACES.** The candidates were the
  // strips a net already occupied, which on the import-placed low-boost board
  // proposed ZERO gathers - and that was recorded as "a property of the board"
  // when the board has 32 empty rows the enumeration never asked about. The
  // candidates are now every strip, and `gatherMove` narrows by whether the
  // whole net FITS, which is a property of the arrangement and not of the
  // strip's index.
  //
  // SPREAD_DUMP is 8 columns wide with its strips down the columns, so the
  // candidates are columns 0 to 7.
  expect(gatherStrips(SPREAD)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  expect(gatherStrips(SCATTERED)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  // AND SEVEN OF THE EIGHT LAND, which is the half that proves the widening
  // reaches the empty room: `mid`'s three parts are each two columns wide, so a
  // gather onto column 7 would put a lead in column 8 and there is no column 8.
  // Columns 1, 3, 5 and 6 are empty of any `mid` pin and are now asked about;
  // under the old rule only 0, 2 and 4 were.
  expect(
    enumerateMoves(SPREAD_OCC, SPREAD, SPREAD_REFERENCE).filter(gatherKind).map(describeMove),
  ).toEqual([
    "gather mid onto strip 0 (R2 by 0,-2; R3 by 0,-4)",
    "gather mid onto strip 1 (R1 by 0,1; R2 by 0,-1; R3 by 0,-3)",
    "gather mid onto strip 2 (R1 by 0,2; R3 by 0,-2)",
    "gather mid onto strip 3 (R1 by 0,3; R2 by 0,1; R3 by 0,-1)",
    "gather mid onto strip 4 (R1 by 0,4; R2 by 0,2)",
    "gather mid onto strip 5 (R1 by 0,5; R2 by 0,3; R3 by 0,1)",
    "gather mid onto strip 6 (R1 by 0,6; R2 by 0,4; R3 by 0,2)",
  ])
})

test("a gather moves EVERY part of its net or is not proposed at all", () => {
  // **A PARTIAL GATHER IS THE ONE OUTCOME THAT WOULD MAKE THE MOVE'S NAME
  // FALSE**: the net's other parts moved onto a strip this one was never going
  // to reach is strictly worse than proposing nothing, because it spends an
  // evaluation to SPLIT the net it was asked to join.
  //
  // **BLOCKED_DUMP IS THE BOARD THAT CAN TELL THAT APART, AND SPREAD_DUMP
  // CANNOT** - which is a correction a review had to make, because the version
  // of this test that used SPREAD_DUMP alone claimed a kill it did not achieve.
  // On SPREAD_DUMP the only infeasible target is a column past the grid's edge,
  // and it is out of reach for all three of `mid`'s parts at once - so a rule
  // that proposed just the parts that fit would still propose nothing there. On
  // BLOCKED_DUMP a gather onto column 3 asks R1 onto X1's own footprint while
  // R2's destination is empty: ONE part fits and one does not.
  expect(gatherMove(BLOCKED_OCC, BLOCKED, BLOCKED_REFERENCE, "mid", 3)).toBeUndefined()
  // And R2's half really would land on its own, so the rejection is the
  // all-or-nothing rule rather than a board where nothing fits.
  expect(
    translationsAfter(BLOCKED_OCC, BLOCKED.grid, [{ ref: "R2", delta: [0, 3] }]),
  ).not.toBeUndefined()
  expect(
    translationsAfter(BLOCKED_OCC, BLOCKED.grid, [{ ref: "R1", delta: [0, 3] }]),
  ).toBeUndefined()
  // Columns 2 and 4 block R1 the same way and column 5 is off the grid for both,
  // so the only gather this board admits is onto column 1 - the full list, not a
  // membership check.
  expect(
    enumerateMoves(BLOCKED_OCC, BLOCKED, BLOCKED_REFERENCE).filter(gatherKind).map(describeMove),
  ).toEqual(["gather mid onto strip 1 (R1 by 0,1; R2 by 0,1)", "gather y onto strip 2 (R1 by 0,1; R2 by 0,1)"])
  const proposed = enumerateMoves(SPREAD_OCC, SPREAD, SPREAD_REFERENCE).filter(gatherKind)
  expect(proposed.map((move) => move.strip)).toEqual([0, 1, 2, 3, 4, 5, 6])
  // AND EVERY PROPOSED GATHER CARRIES EVERY PART WHOSE DELTA IS NON-ZERO -
  // `mid`'s three parts less however many already sit on the target. Counted by
  // hand off the fixture: columns 0, 2 and 4 each hold one `mid` pin, so a
  // gather onto one of those moves two parts and a gather onto any other column
  // moves three.
  for (const move of proposed) {
    const expected = [0, 2, 4].includes(move.strip) ? 2 : 3
    expect(move.gestures.length, describeMove(move)).toBe(expected)
    expect(new Set(move.gestures.map((one) => one.ref)).size).toBe(expected)
    for (const one of move.gestures) expect(one.delta).not.toEqual([0, 0])
  }
})

test("a net with fewer than two on-board parts gets no gather at all", () => {
  // A GATHERING OF ONE PART IS A PART RELOCATION, which the `move` kind owns
  // with its own declared one-hole neighbourhood - so proposing one here would
  // quietly widen that neighbourhood to the whole strip axis for every
  // single-part net. `a`, `b` and `c` each sit on one part of SPREAD_DUMP.
  for (const net of ["a", "b", "c"]) {
    for (const strip of gatherStrips(SPREAD)) {
      expect(
        gatherMove(SPREAD_OCC, SPREAD, SPREAD_REFERENCE, net, strip),
        `${net} onto ${strip}`,
      ).toBeUndefined()
    }
  }
  // And the nets that DO have two parts are proposed, so this is not passing
  // because nothing is: `mid` on SPREAD and both of SCATTERED's two-part nets.
  expect(
    enumerateMoves(SCATTERED_OCC, SCATTERED, SCATTERED_REFERENCE)
      .filter(gatherKind)
      .map((move) => move.net),
  ).toEqual(["mid", "mid", "mid", "mid", "mid", "mid", "y", "y", "y", "y", "y", "y"])
})

test("a gather goes out as one --move --delta per part, and as one batch when asked", () => {
  const { spawned, spawn } = recorder()
  const out = path.join(freshRunDir(), "gathered.vrt")
  const gather = gatherOrFail(SPREAD_OCC, SPREAD, SPREAD_REFERENCE, "mid", 0)
  applyMove("board.vrt", gather, out, spawn)
  // TWO GESTURES WITH DIFFERENT DELTAS, which is the whole difference from a
  // cluster, and only the last writes the candidate.
  expect(spawned.map((args) => args.join(" "))).toEqual([
    `--move board.vrt --ref R2 --delta 0,-2 -o ${out}.gather-0.vrt`,
    `--move ${out}.gather-0.vrt --ref R3 --delta 0,-4 -o ${out}`,
  ])
  // And the batched transport is one invocation with one ops line per part.
  const ops: string[] = []
  const batchSpawn: SpawnVeroroute = (args) => {
    const at = args.indexOf("--ops")
    const file = args[at + 1]
    if (file === undefined) throw new Error(`--move-batch with no --ops: ${args.join(" ")}`)
    ops.push(fs.readFileSync(file, "utf8"))
    const outAt = args.indexOf("-o")
    const target = args[outAt + 1]
    if (target === undefined) throw new Error(`no -o in ${args.join(" ")}`)
    fs.writeFileSync(target, `${args.join(" ")}\n`)
    return { status: 0, stdout: "", stderr: "" }
  }
  applyMove("board.vrt", gather, out, batchSpawn, "batched")
  expect(ops).toEqual(["move R2 --delta 0,-2\nmove R3 --delta 0,-4\n"])
})

test("the occupancy advances past a gather through the same call that proposed it", () => {
  // One advance for both compound kinds: `translationsAfter` underneath, which
  // is `appliedGestures` per part - the same call a single `move` makes. The
  // rects are hand-written: both moved parts are 1 row by 2 columns, R2 goes
  // from column 2 to column 0 and R3 from column 4 to column 0, and neither
  // changes row.
  const gather = gatherOrFail(SPREAD_OCC, SPREAD, SPREAD_REFERENCE, "mid", 0)
  const advanced = occupancyAfter(SPREAD_OCC, SPREAD, gather)
  if (advanced === undefined) throw new Error("the gather the model proposed could not be advanced")
  expect(advanced.get("R1")).toEqual({ row: 0, col: 0, rows: 1, cols: 2, across: false })
  expect(advanced.get("R2")).toEqual({ row: 2, col: 0, rows: 1, cols: 2, across: false })
  expect(advanced.get("R3")).toEqual({ row: 4, col: 0, rows: 1, cols: 2, across: false })
  // And a gather the sequence cannot complete is not proposed at all: on
  // STACKED_DUMP both parts' `mid` pins are on column 0 already, so there is no
  // gather there either - the board that needs an ORDER is the cluster's.
  expect(gatherMove(STACKED_OCC, STACKED, STACKED_REFERENCE, "mid", 0)).toBeUndefined()
})
