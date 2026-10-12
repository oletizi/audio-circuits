/**
 * Task 18: `E1`, the net-cluster move - what is proposed, in what order the
 * gestures go out, and the `J` property the whole mechanism exists for.
 *
 * `E2`'s restarts, `E3`'s bound and `Q3`'s restart trigger are in
 * `./escapes-search.test.ts`, split off for the line ceiling at the seam the
 * task itself has: this file needs no `search` and that one needs no board
 * arithmetic. `./escapes-fixtures.ts` holds the boards both read.
 *
 * **WHAT THESE PROVE AND WHAT THEY DO NOT.** The spawn is injected, so what is
 * asserted here is the ENUMERATION, the ARGUMENT LISTS and the hole arithmetic
 * `J` is counted from - never that the fork lands a gesture where the model says
 * it will. That claim is `./seed-geometry.test.ts`'s, which holds the
 * transcribed arithmetic against the real binary and fails rather than skips
 * when it is absent, and `docs/stripboard/pipeline-verification.md` section 5
 * carries what the real binary did with a real climb.
 *
 * Every count below is hand-derived from the fixture, with the derivation in a
 * comment a reader can check, and written as a literal. Nothing here is
 * `expect(x).toBe(<the expression that computed x>)`.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import {
  applyMove,
  clusterAfter,
  clusterMove,
  clusterRefs,
  describeMove,
  enumerateMoves,
  gatherMove,
  gatherStrips,
  occupancyAfter,
  type Move,
} from "../../tools/stripboard/moves.ts"
import { DUMP, OCC, REFERENCE, freshRunDir } from "./climb-fixtures.ts"
import {
  holesOf,
  joinsOf,
  joinsOfDump,
  originOf,
  PARTS_WITH_A_PIN_ON_MID,
  SCATTERED,
  SCATTERED_OCC,
  SCATTERED_REFERENCE,
  SPREAD,
  SPREAD_OCC,
  SPREAD_REFERENCE,
  STACKED,
  STACKED_OCC,
  STACKED_REFERENCE,
  translated,
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

/** A spawn that refuses every invocation, as the fork does a gesture it will not take. */
const refusingSpawn: SpawnVeroroute = () => ({
  status: 1,
  stdout: "",
  stderr: "R1 cannot go to 1,0 - the hole is occupied and the part would be left floating\n",
})

function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

/** One cluster move, or a failure naming the board - never a non-null assertion. */
function clusterOrFail(
  occupancy: Occupancy,
  dump: BoardDump,
  reference: ReferenceNets,
  net: string,
  delta: readonly [number, number],
): Move {
  const move = clusterMove(occupancy, dump, reference, net, delta)
  if (move === undefined) {
    throw new Error(
      `this fixture was expected to admit a cluster of "${net}" by ${delta[0]},${delta[1]} and ` +
        "the model says it does not, so the test below would be asserting over a move nobody " +
        "made.",
    )
  }
  return move
}

const moveKind = (move: Move): move is Extract<Move, { kind: "move" }> => move.kind === "move"

const clusterKind = (move: Move): move is Extract<Move, { kind: "cluster" }> =>
  move.kind === "cluster"

test("E1 moves every on-board part with a pin on the net, enumerated over nets not parts", () => {
  // The refs come from the NET: `mid` names R1.1 and R2.1, so the cluster is
  // R1 and R2, and the expectation is the two refs read by hand off
  // SCATTERED_DUMP's `NODE 1` line rather than recomputed from the map.
  const { spawned, spawn } = recorder()
  const out = path.join(freshRunDir(), "candidate.vrt")
  const move = clusterOrFail(SCATTERED_OCC, SCATTERED, SCATTERED_REFERENCE, "mid", [0, 1])
  applyMove(scatteredBoardFile(), move, out, spawn)
  const moved = spawned
    .filter((args) => args[0] === "--move")
    .map((args) => args[args.indexOf("--ref") + 1] ?? "")
  expect([...moved].sort()).toEqual([...PARTS_WITH_A_PIN_ON_MID])
  // AND X1 AND Z1 ARE NOT MOVED, which is the half that makes the first
  // assertion mean something: both are on the board and neither has a pin on
  // `mid`.
  expect(moved).not.toContain("X1")
  expect(moved).not.toContain("Z1")
  // ONE DELTA FOR ALL OF THEM, in --move's own relative spelling, so no gesture
  // needs the part's current AT to be read a second time.
  for (const args of spawned) {
    expect(args[args.indexOf("--delta") + 1]).toBe("0,1")
  }
  // And the LAST gesture is the one that writes the candidate: everything before
  // it lands on a staged file, so a refused cluster leaves `out` absent.
  expect(spawned[spawned.length - 1]?.includes(out)).toBe(true)
  expect(spawned.slice(0, -1).some((args) => args.includes(out))).toBe(false)
})

test("E1's refs are the parts with a pin on the net, in the dump's part order", () => {
  // `clusterRefs` is the net -> parts half on its own, so the ORDER test below
  // is about ordering and not about membership.
  expect(clusterRefs(SCATTERED, SCATTERED_REFERENCE, "mid")).toEqual(["R1", "R2"])
  expect(clusterRefs(SCATTERED, SCATTERED_REFERENCE, "x")).toEqual(["X1"])
  // A net THIS NETLIST DOES NOT HAVE is a refusal, because the caller and the
  // netlist then disagree about what is on the board. A net the netlist has
  // whose parts are all floating is a different fact and yields an empty list,
  // which `clusterMove` declines to propose and `applyMove` refuses - a cluster
  // of no parts would write a candidate byte-identical to its own parent.
  expect(refusalFrom(() => clusterRefs(SCATTERED, SCATTERED_REFERENCE, "absent"))).toContain(
    'no net named "absent"',
  )
})

test("E1 moves the part furthest along the delta first, which is what makes it land", () => {
  // THE ONE CHOICE THIS COMPOUND MOVE MAKES. Every gesture in a cluster is a
  // pure translation, so the turn-and-stretch order question
  // (GESTURE_ORDERS) does not arise - at zero turns and zero stretch steps
  // seed-placement states both orders are the same sequence. What a cluster
  // has to choose is the order of the PARTS, and on STACKED_DUMP the two
  // orders differ in outcome: R1 at 0,0 and R2 directly under it at 1,0, a
  // cluster by 1,0, so R1's destination is R2's own footprint until R2 has
  // vacated it.
  const move = clusterOrFail(STACKED_OCC, STACKED, STACKED_REFERENCE, "mid", [1, 0])
  expect(move.kind === "cluster" ? move.refs : []).toEqual(["R2", "R1"])
  // And the two orders really do differ on this board, asserted through the
  // model rather than inferred from the refs above: the dump's order does not
  // fit and the projection order does.
  expect(clusterAfter(STACKED_OCC, STACKED.grid, ["R1", "R2"], [1, 0])).toBeUndefined()
  expect(clusterAfter(STACKED_OCC, STACKED.grid, ["R2", "R1"], [1, 0])).not.toBeUndefined()
  // The other direction reverses it: travelling up, the part at the TOP goes
  // first. `DUMP` is ./climb-fixtures.ts's board, where R1 is at row 2 and R2 at
  // row 7 and either order fits, so the refs here are reporting the rule rather
  // than the only sequence that works.
  const up = clusterOrFail(OCC, DUMP, REFERENCE, "left", [-1, 0])
  const down = clusterOrFail(OCC, DUMP, REFERENCE, "left", [1, 0])
  expect(up.kind === "cluster" ? up.refs : []).toEqual(["R1", "R2"])
  expect(down.kind === "cluster" ? down.refs : []).toEqual(["R2", "R1"])
})

test("E1 is the move that makes the dominant lever reachable in one step", () => {
  // THE PROPERTY, NOT THE MECHANISM, and it is the whole reason E1 is required
  // rather than optional. C = (N - S_occ) + J and J counts a net's extra
  // segments, so a net's J contribution falls only when its last stray hole
  // joins the rest.
  //
  // J ON SCATTERED_DUMP IS 3, counted by hand off the layout in the fixture's
  // own comment: column 0 reads mid | x | mid and column 1 reads y | x | y -
  // three segments each - while columns 2 and 3 carry one singleton net each,
  // so eight segments over five nets.
  const before = joinsOfDump(SCATTERED, SCATTERED_REFERENCE)
  expect(before).toBe(3)
  const holes = holesOf(SCATTERED)
  // SIX one-hole moves are enumerated, hand-counted: R1 can only go to 0,1
  // (row -1 is off the board, 1,0 is X1's, column -1 is off); R2 to 2,1 and
  // 3,0; Z1 to 0,2, 1,3 and 2,2; and X1 to nowhere at all. NOT ONE OF THEM
  // LOWERS J.
  const singles = enumerateMoves(SCATTERED_OCC, SCATTERED, SCATTERED_REFERENCE).filter(moveKind)
  expect(singles.map(describeMove).sort()).toEqual([
    "move R1 to 0,1",
    "move R2 to 2,1",
    "move R2 to 3,0",
    "move Z1 to 0,2",
    "move Z1 to 1,3",
    "move Z1 to 2,2",
  ])
  for (const single of singles) {
    const origin = originOf(SCATTERED, single.ref)
    const delta: readonly [number, number] = [single.to[0] - origin[0], single.to[1] - origin[1]]
    const after = joinsOf(
      translated(holes, SCATTERED, [single.ref], delta),
      SCATTERED_REFERENCE,
      SCATTERED.verticalStrips,
    )
    expect(after, `${describeMove(single)} changed J to ${after}`).toBeGreaterThanOrEqual(before)
  }
  // AND THE CLUSTER LOWERS IT BY TWO. Both `mid` parts move two rows down,
  // past X1's interrupting hole: column 0 becomes x | mid and column 1 becomes
  // x | y, so six segments over five nets.
  const clustered = joinsOf(
    translated(holes, SCATTERED, PARTS_WITH_A_PIN_ON_MID, [2, 0]),
    SCATTERED_REFERENCE,
    SCATTERED.verticalStrips,
  )
  expect(clustered).toBe(1)
  expect(clustered).toBeLessThan(before)
})

test("E1 refuses a cluster whose parts cannot all land, and writes nothing", () => {
  // TWO REFUSALS, AND THEY ARE DIFFERENT IN KIND. The model's comes first: a
  // cluster of `mid` by 1,0 on SCATTERED_DUMP puts R1 on 1,0, which is X1's
  // footprint, and X1 is not in the cluster and does not move - so the sequence
  // cannot be completed in EITHER order and the move is not proposed at all.
  expect(clusterMove(SCATTERED_OCC, SCATTERED, SCATTERED_REFERENCE, "mid", [1, 0])).toBeUndefined()
  // AND THE ENUMERATION IS NARROWED BY IT, hand-derived over the four unit
  // deltas: up takes R1 to row -1, off the board; down takes it onto X1;
  // leftwards takes it to column -1; only rightwards lands, and every assertion
  // is the full list rather than a membership check, which would pass over an
  // empty one.
  expect(enumerateMoves(SCATTERED_OCC, SCATTERED, SCATTERED_REFERENCE).filter(clusterKind).map(describeMove))
    .toEqual([
      "cluster mid by 0,1 (R1 R2)",
      "cluster y by 0,1 (R1 R2)",
      "cluster z1 by -1,0 (Z1)",
      "cluster z1 by 0,1 (Z1)",
      "cluster z1 by 1,0 (Z1)",
      "cluster z2 by -1,0 (Z1)",
      "cluster z2 by 0,1 (Z1)",
      "cluster z2 by 1,0 (Z1)",
    ])
  // The fork's comes second, for a caller holding a cluster the model admitted
  // and the binary refuses anyway: the run stops, the gesture is named, and
  // `out` is NOT created - every gesture but the last writes a staged file.
  const out = path.join(freshRunDir(), "refused.vrt")
  const move = clusterOrFail(STACKED_OCC, STACKED, STACKED_REFERENCE, "mid", [1, 0])
  const refusal = refusalFrom(() => applyMove("board.vrt", move, out, refusingSpawn))
  expect(refusal).toContain("cluster mid by 1,0")
  expect(refusal).toContain("the part would be left floating")
  expect(refusal).toContain("NOT retried")
  expect(fs.existsSync(out)).toBe(false)
})

test("E1 goes out as one --move-batch when the batched transport is asked for", () => {
  // Task 9's verb is TRANSACTIONAL - "either the whole batch applies and OUTPUT
  // is written, or the whole batch is refused and OUTPUT IS NEVER CREATED" -
  // which is what a compound gesture wants, and it is one launch instead of
  // one per part. The ops grammar's own relative spelling is used, bare verb
  // and no leading dashes.
  const ops: string[] = []
  const spawned: string[][] = []
  const spawn: SpawnVeroroute = (args) => {
    spawned.push([...args])
    const at = args.indexOf("--ops")
    if (at !== -1) {
      const file = args[at + 1]
      if (file === undefined) throw new Error("--move-batch with no --ops file")
      ops.push(fs.readFileSync(file, "utf8"))
    }
    const outAt = args.indexOf("-o")
    const out = args[outAt + 1]
    if (out === undefined) throw new Error(`no -o in ${args.join(" ")}`)
    fs.writeFileSync(out, `${args.join(" ")}\n`)
    return { status: 0, stdout: "", stderr: "" }
  }
  const out = path.join(freshRunDir(), "batched.vrt")
  const move = clusterOrFail(STACKED_OCC, STACKED, STACKED_REFERENCE, "mid", [1, 0])
  applyMove("board.vrt", move, out, spawn, "batched")
  expect(spawned.map((args) => args[0])).toEqual(["--move-batch"])
  expect(ops).toEqual(["move R2 --delta 1,0\nmove R1 --delta 1,0\n"])
})

test("the occupancy advances past a cluster through the same call that proposed it", () => {
  // There is no second occupancy advance in this pipeline: enumerateMoves
  // proposes a cluster exactly when this returns an occupancy, and the climb
  // advances its carried state with the same call. The rects below are
  // hand-written: both STACKED parts are 1 row by 2 columns, and a cluster by
  // 1,0 puts R1 at row 1 and R2 at row 2 with their columns unchanged.
  const move = clusterOrFail(STACKED_OCC, STACKED, STACKED_REFERENCE, "mid", [1, 0])
  const advanced = occupancyAfter(STACKED_OCC, STACKED, move)
  if (advanced === undefined) throw new Error("the cluster the model proposed could not be advanced")
  expect(advanced.get("R1")).toEqual({ row: 1, col: 0, rows: 1, cols: 2, across: false })
  expect(advanced.get("R2")).toEqual({ row: 2, col: 0, rows: 1, cols: 2, across: false })
  // And the original is untouched - the occupancy is a value the climb carries,
  // not a board it edits.
  expect(STACKED_OCC.get("R1")).toEqual({ row: 0, col: 0, rows: 1, cols: 2, across: false })
})


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

test("a gather's candidate strips are the net's own, and a net already on one gets none", () => {
  // THE DELTAS CROSS THE STRIPS AND NOTHING ELSE, so the candidates are the
  // strips the net's pins already sit on - hand-read off SPREAD_DUMP: `mid` at
  // columns 0, 2 and 4, each of its singleton neighbours at one column.
  expect(gatherStrips(SPREAD, SPREAD_REFERENCE, "mid")).toEqual([0, 2, 4])
  expect(gatherStrips(SPREAD, SPREAD_REFERENCE, "a")).toEqual([1])
  // A net whose pins are all on ONE strip is already gathered: every delta
  // would be zero, the fork refuses a zero delta, and no gather is proposed.
  expect(gatherMove(SPREAD_OCC, SPREAD, SPREAD_REFERENCE, "a", 1)).toBeUndefined()
  // SCATTERED_DUMP's `mid` is the same case for a different reason - its two
  // pins share column 0 and are INTERRUPTED there - which is why that board
  // needs the cluster and this one needs the gather.
  expect(gatherStrips(SCATTERED, SCATTERED_REFERENCE, "mid")).toEqual([0])
  expect(gatherMove(SCATTERED_OCC, SCATTERED, SCATTERED_REFERENCE, "mid", 0)).toBeUndefined()
  // And the enumeration over SPREAD_DUMP is exactly `mid`'s three, in the
  // netlist's net order and ascending by strip.
  expect(
    enumerateMoves(SPREAD_OCC, SPREAD, SPREAD_REFERENCE).filter(gatherKind).map(describeMove),
  ).toEqual([
    "gather mid onto strip 0 (R2 by 0,-2; R3 by 0,-4)",
    "gather mid onto strip 2 (R1 by 0,2; R3 by 0,-2)",
    "gather mid onto strip 4 (R1 by 0,4; R2 by 0,2)",
  ])
})

test("a gather goes out as one --move --delta per part, and as one batch when asked", () => {
  const { spawned, spawn } = recorder()
  const out = path.join(freshRunDir(), "gathered.vrt")
  const gather = gatherOrFail(SPREAD_OCC, SPREAD, SPREAD_REFERENCE, "mid", 0)
  applyMove("board.vrt", gather, out, spawn)
  // TWO GESTURES WITH DIFFERENT DELTAS, which is the whole difference from a
  // cluster, and only the last writes the candidate.
  expect(spawned.map((args) => args.join(" "))).toEqual([
    `--move board.vrt --ref R2 --delta 0,-2 -o ${out}.cluster-0.vrt`,
    `--move ${out}.cluster-0.vrt --ref R3 --delta 0,-4 -o ${out}`,
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

/**
 * A board file for the one test that hands `applyMove` a path.
 *
 * ITS CONTENT IS NOT THE FIXTURE'S DUMP TEXT AND DOES NOT NEED TO BE:
 * `applyMove` reads no board - it passes the path to the fork and the gestures
 * are the move's own - so what this file holds is never parsed. It exists so
 * that the first gesture's input is a real path.
 */
function scatteredBoardFile(): string {
  const file = path.join(freshRunDir(), "scattered.vrt")
  fs.writeFileSync(file, "written by tests/stripboard/escapes.test.ts, not by the fork\n")
  return file
}
