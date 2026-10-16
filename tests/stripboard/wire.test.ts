/**
 * `add-wire` as a COMPOUND GESTURE, and `delete-wire`'s measured refusal.
 *
 * `./moves.test.ts` holds the move set's own counts, `./escapes.test.ts` the
 * cluster, `./gather.test.ts` the gather and `./escapes-search.test.ts` the
 * restarts; this file is the wire, split off for the 500-line ceiling at the
 * seam the move set has.
 *
 * **WHAT THESE PROVE AND WHAT THEY DO NOT.** The spawn is injected, so what is
 * asserted here is the PLAN - which hole the wire is created at, how many turns,
 * how many stretch steps, in which order - and the ARGUMENT LISTS those produce.
 * That the fork lands a wire where the model says is four measurements on the
 * real binary, recorded in `tools/stripboard/moves-wire.ts` and quoted in the
 * assertions below rather than re-run here: `--op add-wire` creates a 1x3 wire
 * along the row at a FREE hole and prints nothing, the names are sequential,
 * `--rotate` turns a wire exactly as `turnedRect` predicts, and `--stretch`
 * moves its length between 2 and 16 holes.
 *
 * Every figure is hand-derived from the fixture with the derivation beside it.
 */
import { afterAll, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { cleanUpTempScratch } from "../support/temp-scratch.ts"
import {
  applyMove,
  DEFERRED_KINDS,
  describeMove,
  enumerateMoves,
  nextWireName,
  occupancyAfter,
  wireAfter,
  wireBridge,
  type Move,
} from "../../tools/stripboard/moves.ts"
import { occupancyOf } from "../../tools/stripboard/seed-geometry.ts"
import { boardGeometry } from "../../tools/stripboard/copper.ts"
import { BASE_DUMP, DUMP, OCC, REFERENCE, freshRunDir } from "./climb-fixtures.ts"
import type { SpawnVeroroute } from "../../tools/stripboard/seed.ts"

afterAll(cleanUpTempScratch)

/** A spawn that records every invocation and writes every `-o`. */
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

function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

const wireKind = (move: Move): move is Extract<Move, { kind: "add-wire" }> =>
  move.kind === "add-wire"

/**
 * A board whose strips run along the ROWS, where a wire has to be TURNED to
 * bridge two of them - which is the case the gesture-order question is real for.
 *
 * `R1` holds net `mid` at `0,0` and `R2` holds it at `2,0`, so `mid` is split
 * across strips 0 and 2 and a three-hole wire spans them exactly.
 */
const ACROSS_DUMP = [
  "GRID 8 8",
  "BOUNDS 0,0 2,1",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR 10K AT 0,0 SPAN 2 DIRECTION W",
  "PART R2 RESISTOR 10K AT 2,0 SPAN 2 DIRECTION W",
  "PIN R1 1 AT 0,0",
  "PIN R1 2 AT 0,1",
  "PIN R2 1 AT 2,0",
  "PIN R2 2 AT 2,1",
  "NODE 1 NAME mid R1.1 R2.1",
  "NODE 2 NAME y R1.2 R2.2",
  "",
].join("\n")

const ACROSS = boardGeometry(ACROSS_DUMP)
const ACROSS_OCC = occupancyOf(ACROSS)

/** The reference nets of `ACROSS_DUMP`, in its own `NODE` order. */
const ACROSS_REFERENCE: ReadonlyMap<string, readonly string[]> = new Map([
  ["mid", ["R1.1", "R2.1"]],
  ["y", ["R1.2", "R2.2"]],
])

test("the occupancy carries every wire, which is what let add-wire out of the deferrals", () => {
  // **THE GAP THAT BLOCKED THIS KIND FOR THREE SWEEPS WAS OURS.** The refusal
  // said so itself: "a wire's own holes are not in the occupancy at all, which
  // is a limit of occupancyOf rather than a decision here". `dump.wires` was
  // always there.
  //
  // ./climb-fixtures.ts's BASE_DUMP carries W1 at 3,1-3,2 and W2 at 3,6-3,7,
  // both along the row, so each is a 1x2 rect with its length on the COLUMN axis
  // - `across` false, which is what `stretchedRect` reads to know which way a
  // stretch grows.
  expect(OCC.get("W1")).toEqual({ row: 3, col: 1, rows: 1, cols: 2, across: false })
  expect(OCC.get("W2")).toEqual({ row: 3, col: 6, rows: 1, cols: 2, across: false })
  // AND THE FORK IS WHY THEY BELONG THERE: `--move C19 --to 10,10` onto a wire's
  // own span is refused with the shared FLOATING refusal, whose own words are
  // "Board::CanPutDown refuses a collision with occupied holes rather than
  // allowing an overlap" - measured on the import-placed low-boost board. So the
  // move set must see a wire as an obstacle, and here it does: R1 sits at row 2
  // and its step DOWN onto row 3 is W1's, so that move is not proposed.
  expect(
    enumerateMoves(OCC, DUMP, BASE_DUMP, REFERENCE)
      .filter((move) => move.kind === "move" && move.ref === "R1")
      .map(describeMove),
  ).toEqual(["move R1 to 1,1", "move R1 to 2,2", "move R1 to 2,0"])
})

test("an add-wire that must cross the rows is planned as create, turn, stretch", () => {
  // HAND-DERIVED FROM THE FORK'S OWN ARITHMETIC. Strips are ROWS on
  // ACROSS_DUMP, so the wire has to be turned. `--op add-wire --at r,c` creates
  // a 1x3 along the row; `turnedRect` of a 1x3 at (r,c) is a 3x1 at
  // (r-1, c+1) - measured against the binary, which printed exactly that for a
  // wire. To finish spanning rows 0 to 2 in some column the wire is therefore
  // created at row 1, one column to the left of where it lands, and `mid`'s two
  // strips are three holes apart so the fresh wire's length is already right and
  // the stretch is zero.
  const bridge = wireBridge(ACROSS_OCC, ACROSS, "Wire1", 0, 2, 2)
  if (bridge === undefined) throw new Error("the fixture was expected to admit this bridge")
  expect(bridge.plan).toEqual({
    at: [1, 1],
    name: "Wire1",
    turns: 1,
    stretch: 0,
    order: "turn-then-stretch",
  })
  expect(bridge.ends).toEqual([[0, 2], [2, 2]])
  // And the occupancy it leaves is the turned rect: three rows by one column at
  // row 0 of column 2, with its length now on the ROW axis.
  const after = wireAfter(ACROSS_OCC, ACROSS.grid, bridge.plan)
  if (after === undefined) throw new Error("the plan the model admitted could not be applied")
  expect(after.get("Wire1")).toEqual({ row: 0, col: 2, rows: 3, cols: 1, across: true })
})

test("the enumeration proposes a wire only where its ENDS can reach the net's own pins", () => {
  // HAND-DERIVED, AND THE DERIVATION CHANGED WHEN `WIRE_END_REACH` BEGAN
  // GOVERNING THIS KIND. Strips are rows. `mid` holds 0,0 and 2,0 and `y` holds
  // 0,1 and 2,1, so both are split across strips 0 and 2 - but a wire bridging
  // those rows can only land in column 2: columns 0 and 1 are the parts' own
  // lead holes. Column 2 is ONE hole from `y`'s pins and TWO from `mid`'s, so
  // `y` gets its candidate and **`mid` gets none**.
  //
  // THAT IS THE FIX AND NOT A LOSS. `mid`'s old candidate put both ends on
  // column 2, where the net has no pin at all - copper belonging to whatever
  // segment row 0 and row 2 have there - which is the shape the fork refused in
  // 103 of 187 `add-wire` candidates over two instrumented runs ("its two ends
  // are no longer on one net"). A wire that joins neither of the net's segments
  // is not a cheaper repair; it is a candidate that cannot be evaluated.
  // tools/stripboard/moves-wire.ts's `WIRE_END_REACH` carries the measurement.
  expect(enumerateMoves(ACROSS_OCC, ACROSS, ACROSS_DUMP, ACROSS_REFERENCE).filter(wireKind).map(describeMove))
    .toEqual([
      "add-wire y joining 0,2 to 2,2 (at 1,1 as Wire1, 1 turn(s), stretch 0, turn-then-stretch)",
    ])
  // A net on ONE strip gets none: there is no pair to bridge. Both of
  // ACROSS_DUMP's nets are split, so this is asserted on the aligned board,
  // where ./moves.test.ts shows the same thing from the other side.
  const alignedText = ACROSS_DUMP.replace("PART R2 RESISTOR 10K AT 2,0", "PART R2 RESISTOR 10K AT 0,3").replace("PIN R2 1 AT 2,0", "PIN R2 1 AT 0,3").replace("PIN R2 2 AT 2,1", "PIN R2 2 AT 0,4")
  const aligned = boardGeometry(alignedText)
  expect(enumerateMoves(occupancyOf(aligned), aligned, alignedText, ACROSS_REFERENCE).filter(wireKind)).toEqual([])
})

test("a wire longer than the fork will stretch is not proposed", () => {
  // Measured: a wire stretches between 2 and 16 holes - 3 shrinks once and then
  // refuses, and grows thirteen times and then refuses.
  //
  // **IT IS ASSERTED ON A BOARD BIG ENOUGH FOR THE LONG WIRE TO FIT, which is
  // what makes it a test of the BOUND rather than of the grid.** On the 8x8
  // ACROSS_DUMP an eighteen-hole wire runs off the board, so deleting the bound
  // changed nothing there and the mutation survived. This board is 24x24 and
  // empty but for two pads, so a seventeen-hole wire is geometrically fine and
  // still must not be proposed.
  const roomy = boardGeometry(
    [
      "GRID 24 24",
      "BOUNDS 0,0 0,0",
      "VERO_TRACKS 1",
      "VERTICAL_STRIPS 0",
      "CUT_STATE COMPUTED",
      "PIN P1 1 AT 0,0",
      "PIN P2 1 AT 19,0",
      "NODE 1 NAME mid P1.1 P2.1",
      "",
    ].join("\n"),
  )
  const open = occupancyOf(roomy)
  // Sixteen holes is the bound and is admitted: thirteen grows on top of the
  // fresh three.
  const sixteen = wireBridge(open, roomy, "Wire1", 0, 15, 5)
  if (sixteen === undefined) throw new Error("a sixteen-hole bridge was expected to be admitted")
  expect(sixteen.plan.stretch).toBe(13)
  expect(sixteen.ends).toEqual([[0, 5], [15, 5]])
  // Seventeen is one past it, on a board with room for twenty.
  expect(wireBridge(open, roomy, "Wire1", 0, 16, 5)).toBeUndefined()
  expect(wireBridge(open, roomy, "Wire1", 0, 19, 5)).toBeUndefined()
  // And a pair in the wrong order, or the same strip twice, is not a bridge.
  expect(wireBridge(ACROSS_OCC, ACROSS, "Wire1", 2, 0, 2)).toBeUndefined()
  expect(wireBridge(ACROSS_OCC, ACROSS, "Wire1", 2, 2, 2)).toBeUndefined()
})

test("the three gestures go out in the plan's own order, and only the last writes the candidate", () => {
  const { spawned, spawn } = recorder()
  const out = path.join(freshRunDir(), "wired.vrt")
  const move = enumerateMoves(ACROSS_OCC, ACROSS, ACROSS_DUMP, ACROSS_REFERENCE).filter(wireKind)[0]
  if (move === undefined) throw new Error("the fixture proposed no add-wire")
  applyMove("board.vrt", move, out, spawn)
  // HAND-WRITTEN, in the fork's own grammar: create at 1,2, then one clockwise
  // turn naming the wire the plan predicted, and nothing else because the
  // stretch is zero. The created wire lands on a staged file named for the kind
  // and the turn writes the candidate.
  expect(spawned.map((args) => args.join(" "))).toEqual([
    `--author board.vrt --op add-wire --at 1,1 -o ${out}.add-wire-0.vrt`,
    `--rotate ${out}.add-wire-0.vrt --ref Wire1 --direction cw -o ${out}`,
  ])
})

test("a stretch in the plan goes out as one gesture per hole, after or before the turn", () => {
  // A four-hole bridge needs one grow on top of the fresh three, and a two-hole
  // bridge needs one shrink - signed, which is what the plan records. Strips 0
  // and 3 of ACROSS_DUMP are four holes apart.
  const grown = wireBridge(ACROSS_OCC, ACROSS, "Wire1", 0, 3, 2)
  if (grown === undefined) throw new Error("the fixture was expected to admit a four-hole bridge")
  expect(grown.plan.stretch).toBe(1)
  expect(grown.plan.at).toEqual([1, 1])
  const { spawned, spawn } = recorder()
  const out = path.join(freshRunDir(), "grown.vrt")
  applyMove("board.vrt", { kind: "add-wire", net: "mid", ends: grown.ends, plan: grown.plan }, out, spawn)
  expect(spawned.map((args) => args.join(" "))).toEqual([
    `--author board.vrt --op add-wire --at 1,1 -o ${out}.add-wire-0.vrt`,
    `--rotate ${out}.add-wire-0.vrt --ref Wire1 --direction cw -o ${out}.add-wire-1.vrt`,
    `--stretch ${out}.add-wire-1.vrt --ref Wire1 --direction grow -o ${out}`,
  ])
  // AND THE ORDER IS THE PLAN'S, not this module's: a plan that says
  // stretch-then-turn emits them the other way round. That is the one kind the
  // GESTURE_ORDERS question is real for - a turn and a stretch need different
  // clearance in each order - and the enumerator tries both and records the one
  // that fits.
  const other = recorder()
  const swapped: Move = {
    kind: "add-wire",
    net: "mid",
    ends: grown.ends,
    plan: { ...grown.plan, order: "stretch-then-turn" },
  }
  applyMove("board.vrt", swapped, out, other.spawn)
  expect(other.spawned.map((args) => args[0])).toEqual(["--author", "--stretch", "--rotate"])
})

/**
 * A board with one single-hole obstacle, placed exactly where the
 * TURN-THEN-STRETCH anchor would go.
 *
 * A `PIN` line with no `PART` of its own is a one-hole rect in the occupancy -
 * which is what the dump's `PAD` lines are - so this blocks one hole and nothing
 * else. For a five-hole bridge of strips 0 to 4 at column 4, the two orders
 * anchor in different places: turn-then-stretch at `1,3` and stretch-then-turn
 * at `2,2`, because the turn of a `1 x 5` moves its top-left by two rather than
 * by one. Blocking `1,3` therefore leaves exactly one order that works.
 */
const ONE_ORDER_DUMP = [
  "GRID 10 10",
  "BOUNDS 0,0 0,0",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "PIN P1 1 AT 1,3",
  "NODE 1 NAME mid P1.1",
  "",
].join("\n")

test("both gesture orders are tried, and this is the kind that question is real for", () => {
  // **THE ORDER MATTERS HERE AND NOWHERE ELSE IN THE MOVE SET.** A cluster and a
  // gather are pure translations, so `GESTURE_ORDERS` has nothing to decide for
  // them; a wire is created, TURNED and STRETCHED, and `./seed-placement.ts`
  // measured what that costs: on SI_HI_CUT_R1, 0 of 1225 origins work with the
  // turn first and 19 with the shrinks first.
  //
  // HAND-DERIVED: a five-hole bridge of strips 0 to 4 landing on column 4
  // anchors at 1,3 under turn-then-stretch (the turn of a 1x3 moves its
  // top-left by -1,+1) and at 2,2 under stretch-then-turn (the turn of a 1x5
  // moves it by -2,+2). With nothing in the way the first order wins, because
  // GESTURE_ORDERS tries it first.
  const open = boardGeometry(ONE_ORDER_DUMP.replace("PIN P1 1 AT 1,3", "PIN P1 1 AT 9,9"))
  const first = wireBridge(occupancyOf(open), open, "Wire1", 0, 4, 4)
  if (first === undefined) throw new Error("the open board was expected to admit the bridge")
  expect(first.plan.order).toBe("turn-then-stretch")
  expect(first.plan.at).toEqual([1, 3])
  // AND WITH THAT ONE HOLE TAKEN, THE OTHER ORDER IS THE ONLY ONE LEFT - the
  // same bridge, a different anchor, the same ends.
  const blocked = boardGeometry(ONE_ORDER_DUMP)
  const second = wireBridge(occupancyOf(blocked), blocked, "Wire1", 0, 4, 4)
  if (second === undefined) throw new Error("the blocked board was expected to admit the bridge")
  expect(second.plan.order).toBe("stretch-then-turn")
  expect(second.plan.at).toEqual([2, 2])
  expect(second.ends).toEqual(first.ends)
  // THE ENDS ARE READ OFF THE RECT THE MODEL LANDED, which is why the two orders
  // can agree on them at all: computing them from one order's arithmetic while
  // recording the other order's gestures would be a prediction about a board
  // nobody was going to produce.
  expect(second.ends).toEqual([[0, 4], [4, 4]])
})

test("the wire's name is the fork's next index, predicted and loud when wrong", () => {
  // MEASURED: three adds on one board produced Wire1, Wire2 and Wire3 in order,
  // and `--op add-wire` prints nothing - so the name cannot be read off the
  // gesture that creates it. Nothing in this pipeline deletes a wire, so the
  // count only grows.
  expect(nextWireName(0)).toBe("Wire1")
  expect(nextWireName(2)).toBe("Wire3")
  // A BOARD CARRYING TWO WIRES NAMES ITS NEXT ONE Wire3, which is what the
  // enumeration puts on the plan.
  //
  // **IT IS DRIVEN ON `ACROSS` WITH TWO WIRES ADDED AND NO LONGER ON
  // `BASE_DUMP`**, because `BASE_DUMP` now yields no `add-wire` at all: its
  // nets' pins sit five holes apart ALONG the two strips they straddle (rows 2
  // and 7), so no line of holes is within `WIRE_END_REACH` of a pin on both -
  // the case the spread's L join exists for (tools/stripboard/moves-join.ts),
  // which this kind does not plan. The two wires here sit on rows 5 and 6, clear
  // of the column-2 landing, so the only thing they change is the name.
  const withWiresText = ACROSS_DUMP.replace(
    "NODE 1 NAME mid R1.1 R2.1",
    "WIRE W1 AT 5,5 ENDS 5,5,0,0 5,6,0,0\nWIRE W2 AT 6,5 ENDS 6,5,0,0 6,6,0,0\nNODE 1 NAME mid R1.1 R2.1",
  )
  const withWires = boardGeometry(withWiresText)
  expect(withWires.wires.length).toBe(2)
  expect(
    enumerateMoves(occupancyOf(withWires), withWires, withWiresText, ACROSS_REFERENCE)
      .filter(wireKind)
      .map((move) => move.plan.name),
  ).toEqual(["Wire3"])
  // And a plan whose name is already on the board is refused rather than
  // applied: two rects would have to be one.
  const taken = wireAfter(OCC, DUMP.grid, {
    at: [0, 0],
    name: "W1",
    turns: 0,
    stretch: 0,
    order: "turn-then-stretch",
  })
  expect(taken).toBeUndefined()
})

test("delete-wire is refused, and the refusal is measured rather than read", () => {
  const { spawn } = recorder()
  const out = path.join(freshRunDir(), "deleted.vrt")
  const refusal = refusalFrom(() =>
    applyMove("board.vrt", { kind: "delete-wire", name: "W1" }, out, spawn),
  )
  // THE FORK IS THE BLOCK, AND BOTH HALVES ARE MEASURED: the verb table and the
  // --author ops are read out of the source, and --update - the one verb that
  // rewrites a board's component set from a netlist - leaves wires in place.
  expect(refusal).toContain("no verb in the pinned fork deletes a placed component")
  expect(refusal).toContain("still carries TWO wires afterwards")
  expect(refusal).toContain("NOT SKIPPED")
  // It is the ONLY deferred kind left, and it is still enumerated so the move
  // set in the record stays the spec's.
  expect([...DEFERRED_KINDS.keys()]).toEqual(["delete-wire"])
  expect(enumerateMoves(OCC, DUMP, BASE_DUMP, REFERENCE).filter((move) => move.kind === "delete-wire").length)
    .toBe(2)
  // And the occupancy cannot be advanced past one either, for the same reason.
  expect(
    refusalFrom(() => occupancyAfter(OCC, DUMP, { kind: "delete-wire", name: "W1" })),
  ).toContain("--update leaves wires in place")
})
