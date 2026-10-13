/**
 * `spread`: the kind that vacates a crowded strip and wires the net back
 * together in one candidate.
 *
 * THE AUTHORITY is the owner's correction of the cost model (2026-10-12), quoted
 * in full at the head of `tools/stripboard/moves-spread.ts`, and the identity
 * arithmetic that module derives the enumeration from.
 *
 * **EVERY COUNT AND EVERY STRIP NUMBER BELOW IS HAND-DERIVED FROM
 * `./spread-fixtures.ts`' PICTURE**, with the derivation in a comment a reader
 * can check against the dump text. Nothing here is
 * `expect(x).toBe(<the expression that computed x>)` - the shape that looks like
 * a derivation, passes however wrong both sides are, and has been caught in
 * this suite three times.
 *
 * WHAT THESE TESTS DO NOT PROVE: that the gestures land where the model says.
 * That claim belongs to `./seed-geometry.test.ts`, which holds the transcribed
 * rotation and stretch arithmetic against the real binary and fails rather than
 * skips when it is absent. Here the spawn is injected and what is asserted is
 * the ENUMERATION, the OCCUPANCY ADVANCE and the ARGUMENT LISTS.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import {
  addsWire,
  applyMove,
  describeMove,
  enumerateMoves,
  occupancyAfter,
  spreadMove,
  spreadSourceStrips,
  spreadTargetStrips,
  type Move,
} from "../../tools/stripboard/moves.ts"
import type { ReferenceNets } from "../../tools/stripboard/equivalence.ts"
import { rectOf } from "../../tools/stripboard/seed-placement.ts"
import type { SpawnVeroroute } from "../../tools/stripboard/seed.ts"
import { CROWDED, CROWDED_NETS, CROWDED_OCC } from "./spread-fixtures.ts"
import { DUMP, OCC, REFERENCE, freshRunDir } from "./climb-fixtures.ts"

/** Every spread the fixture board admits, in the enumeration's own order. */
function spreads(nets: ReferenceNets = CROWDED_NETS): readonly Extract<Move, { kind: "spread" }>[] {
  const found: Extract<Move, { kind: "spread" }>[] = []
  for (const move of enumerateMoves(CROWDED_OCC, CROWDED, nets)) {
    if (move.kind === "spread") found.push(move)
  }
  return found
}

test("the targets are exactly the strips holding no pin", () => {
  // HAND-DERIVED FROM THE PICTURE: eight rows, and the PIN lines put leads on
  // rows 1 (R1, R2), 3 (R3) and 6 (R4). Rows 0, 2, 4, 5 and 7 hold no lead at
  // all, which is the complement of ./targets.ts's occupiedStrips - the one
  // definition of S_occ - so landing a net segment on one of them is the only
  // way the spread's dC = -1 can hold.
  expect(spreadTargetStrips(CROWDED)).toEqual([0, 2, 4, 5, 7])
})

test("the sources are the crowded strips only, and a net's private strip is not one", () => {
  // HAND-DERIVED, NET BY NET, from the picture and the NODE lines:
  //
  //   shared  R1.1 on row 1 and R3.1 on row 3. Row 1 also carries R2's two
  //           leads, which are `crowd` and `far` - other nets, on a part this
  //           spread would not move - so row 1 is a source. Row 3 carries R3
  //           and nothing else, so vacating it would EMPTY it: S_occ would fall
  //           by one as the target's rose and the identity's -1 would cancel.
  //           Row 3 is therefore not offered.                      -> [1]
  //   crowd   R1.2 and R2.1, BOTH on row 1, and the only parts on row 1 are R1
  //           and R2 - which are exactly the movers. Discounting them leaves no
  //           other net's pin there, so the strip is not crowded for this net.
  //                                                                 -> []
  //   far     R2.2 on row 1 and R4.1 on row 6. Row 1 also carries R1's leads
  //           (`shared` and `crowd`), so it is a source; row 6 is R4's alone.
  //                                                                 -> [1]
  //   lone    R3.2 on row 3 and R4.2 on row 6, each a strip its own part has to
  //           itself. Neither is crowded.                           -> []
  expect(spreadSourceStrips(CROWDED, CROWDED_NETS, "shared")).toEqual([1])
  expect(spreadSourceStrips(CROWDED, CROWDED_NETS, "crowd")).toEqual([])
  expect(spreadSourceStrips(CROWDED, CROWDED_NETS, "far")).toEqual([1])
  expect(spreadSourceStrips(CROWDED, CROWDED_NETS, "lone")).toEqual([])
})

test("a board where no net shares a strip is offered no spread at all", () => {
  // ./climb-fixtures.ts's BASE_DUMP under VERTICAL_STRIPS 1: `left` holds R1.1
  // at column 1 and R2.1 at column 2, `right` holds R1.2 at column 6 and R2.2
  // at column 7. Four pins, four columns, one net each - so no column carries
  // two nets and there is no abutment anywhere to vacate. **THAT IS THE
  // NARROWING WORKING AND NOT A GAP:** an earlier draft offered every strip of
  // every net as a source and every strip as a target, which proposed 62
  // candidates on this very board, every one of them dC = 0 or worse by the
  // identity and therefore +0.25 in F before anything was measured.
  for (const net of ["left", "right"]) {
    expect(spreadSourceStrips(DUMP, REFERENCE, net)).toEqual([])
  }
  const kinds = new Set(enumerateMoves(OCC, DUMP, REFERENCE).map((move) => move.kind))
  expect(kinds.has("spread")).toBe(false)
})

test("the enumeration is exactly the hand-counted spread set of the fixture board", () => {
  // HAND-DERIVED: two (net, source) pairs - (shared, 1) and (far, 1), from the
  // test above - by the five free strips 0, 2, 4, 5 and 7, and every one of the
  // ten fits. The wire each needs is short: `shared` joins its target to row 3
  // and `far` to row 6, the longest being row 0 to row 6 at seven holes against
  // the fork's measured bound of sixteen, and column 2 or 3 is clear of every
  // part for the whole span because R1, R2, R3 and R4 occupy only columns 0, 1,
  // 4 and 5.
  //
  //   shared from 1: targets 0, 2, 4, 5, 7                            = 5
  //   far    from 1: targets 0, 2, 4, 5, 7                            = 5
  //                                                                  ---
  //                                                                    10
  const found = spreads()
  expect(found.length).toBe(10)
  expect(found.map((move) => `${move.net} ${move.from}->${move.to} joined ${move.joined}`)).toEqual([
    "shared 1->0 joined 3",
    "shared 1->2 joined 3",
    "shared 1->4 joined 3",
    "shared 1->5 joined 3",
    "shared 1->7 joined 3",
    "far 1->0 joined 6",
    "far 1->2 joined 6",
    "far 1->4 joined 6",
    "far 1->5 joined 6",
    "far 1->7 joined 6",
  ])
  // THE JOIN IS THE NET'S OTHER STRIP, which is the only remaining one in both
  // cases: `shared`'s other aimed pin is R3.1 on row 3 and `far`'s is R4.1 on
  // row 6. A net left on three strips would still need further joins after
  // this one, and the spread supplies only the join its own relocation makes
  // necessary.
  expect(found.every((move) => move.gestures.length === 1)).toBe(true)
  expect(found.map((move) => move.gestures[0]?.ref)).toEqual([
    "R1",
    "R1",
    "R1",
    "R1",
    "R1",
    "R2",
    "R2",
    "R2",
    "R2",
    "R2",
  ])
})

test("the deltas cross the strips and never slide a part along one", () => {
  // THE SAME RULE `gatherMove` APPLIES, and here the strips are ROWS - so the
  // delta is (target - source, 0) for every mover and the column component is
  // zero. HAND-DERIVED from the source strip 1 and the five targets.
  expect(spreads().map((move) => move.gestures[0]?.delta)).toEqual([
    [-1, 0],
    [1, 0],
    [3, 0],
    [4, 0],
    [6, 0],
    [-1, 0],
    [1, 0],
    [3, 0],
    [4, 0],
    [6, 0],
  ])
})

test("the spread order is the netlist's, so reversing the reference reverses it", () => {
  // A Map iterates in INSERTION order and referenceNetsFromExport fills one in
  // the netlist's own order, so the enumeration's net order is the netlist's. An
  // enumeration that sorted the net names, or read them off a Set, would survive
  // every other assertion here and fail this one.
  const forward = spreads().map(describeMove)
  const reversed: ReferenceNets = new Map([...CROWDED_NETS.entries()].reverse())
  const backward = spreads(reversed).map(describeMove)
  // The two nets' blocks swap and each block's own ascending target order is
  // kept, because the targets are walked in strip order and not in map order.
  expect(backward).toEqual([...forward.slice(5), ...forward.slice(0, 5)])
  expect(spreads().map(describeMove)).toEqual(forward)
})

test("the occupancy advance moves the parts AND lands the wire", () => {
  // THE FIRST CANDIDATE, hand-walked through the transcribed arithmetic:
  //   R1 is a 1x2 rect at 1,0 and the delta is -1,0, so it lands at 0,0;
  //   the wire is created at 1,1 as a 1x3 - row 1 columns 1 to 3, all free once
  //     R1 has left columns 0 and 1, since R2 starts at column 4;
  //   the clockwise turn of a 1x3 at 1,1 moves its top-left by (-1,+1) to 0,2
  //     and makes it 3x1 (./seed-placement.ts's turnedRect, measured against
  //     the binary);
  //   one grow step then extends it away from AT to 4x1, rows 0 to 3 in column
  //     2 - which is the span the move records as its ends, 0,2 to 3,2.
  const first = spreads()[0]
  expect(first).toBeDefined()
  if (first === undefined) return
  expect(first.wire.at).toEqual([1, 1])
  expect(first.wire.turns).toBe(1)
  expect(first.wire.stretch).toBe(1)
  expect(first.ends).toEqual([
    [0, 2],
    [3, 2],
  ])
  const after = occupancyAfter(CROWDED_OCC, CROWDED, first)
  expect(after).toBeDefined()
  if (after === undefined) return
  expect(rectOf(after, "R1")).toEqual({ row: 0, col: 0, rows: 1, cols: 2, across: false })
  expect(rectOf(after, "Wire1")).toEqual({ row: 0, col: 2, rows: 4, cols: 1, across: true })
  // AND THE PARTS THAT DID NOT MOVE DID NOT MOVE. A spread relocates only the
  // movers it records; R2, R3 and R4 are where the dump put them.
  expect(rectOf(after, "R2")).toEqual(rectOf(CROWDED_OCC, "R2"))
  expect(rectOf(after, "R3")).toEqual(rectOf(CROWDED_OCC, "R3"))
  expect(rectOf(after, "R4")).toEqual(rectOf(CROWDED_OCC, "R4"))
})

test("a spread adds a wire, so its candidate is assigned to a net before it is scored", () => {
  // addsWire IS WHAT PUTS THE ONE `--update` IN FRONT OF THE MEASUREMENT, and
  // without it a wire that physically joins two of the net's pins leaves
  // --check calling the net incomplete - tools/stripboard/complete-apply.ts's
  // assignNodes carries the measurement. A spread answering false here would be
  // scored with its wire joining nothing.
  const first = spreads()[0]
  expect(first).toBeDefined()
  if (first === undefined) return
  expect(addsWire(first)).toBe(true)
})

test("the gestures are the relocations then the wire, and only the last writes the candidate", () => {
  const first = spreads()[0]
  expect(first).toBeDefined()
  if (first === undefined) return
  const runDir = freshRunDir()
  const out = path.join(runDir, "candidate.vrt")
  const spawned: string[][] = []
  const spawn: SpawnVeroroute = (args) => {
    spawned.push([...args])
    const at = args.indexOf("-o")
    const target = args[at + 1]
    if (target === undefined) throw new Error(`no -o in ${args.join(" ")}`)
    fs.writeFileSync(target, "written by tests/stripboard/spread.test.ts\n")
    return { status: 0, stdout: "", stderr: "" }
  }
  applyMove(path.join(runDir, "base.vrt"), first, out, spawn)
  // HAND-WRITTEN, from the plan the enumeration recorded: one --move --delta
  // for the one mover, then the three wire gestures in the planned
  // turn-then-stretch order. Each reads the previous one's output and only the
  // LAST names `out`, so a refused gesture leaves the candidate absent.
  expect(spawned).toEqual([
    ["--move", path.join(runDir, "base.vrt"), "--ref", "R1", "--delta", "-1,0", "-o", `${out}.spread-0.vrt`],
    ["--author", `${out}.spread-0.vrt`, "--op", "add-wire", "--at", "1,1", "-o", `${out}.spread-1.vrt`],
    ["--rotate", `${out}.spread-1.vrt`, "--ref", "Wire1", "--direction", "cw", "-o", `${out}.spread-2.vrt`],
    ["--stretch", `${out}.spread-2.vrt`, "--ref", "Wire1", "--direction", "grow", "-o", out],
  ])
})

test("a spread of a net wholly on one strip is not proposed, because that is a gather", () => {
  // `crowd` holds R1.2 and R2.1 and both are on row 1, so vacating row 1 moves
  // the WHOLE net - which is a gather, needs no wire, and would put one gesture
  // in the sweep twice under two names. spreadMove declines it directly, so the
  // decline is the move's own and not only the enumeration's narrowing.
  expect(spreadMove(CROWDED_OCC, CROWDED, CROWDED_NETS, "crowd", 1, 4)).toBeUndefined()
  // AND A ZERO DELTA IS DECLINED for the fork's own reason: a candidate
  // byte-identical to its own parent.
  expect(spreadMove(CROWDED_OCC, CROWDED, CROWDED_NETS, "shared", 1, 1)).toBeUndefined()
  // AND A TARGET THE NET ALREADY HOLDS leaves no two strips for a wire to span:
  // `shared`'s other pin is on row 3, so a relocation onto row 3 is a
  // consolidation needing no wire, which nothing in the move set performs.
  expect(spreadMove(CROWDED_OCC, CROWDED, CROWDED_NETS, "shared", 1, 3)).toBeUndefined()
})
