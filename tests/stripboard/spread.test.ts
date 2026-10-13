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
import { boardGeometry } from "../../tools/stripboard/copper.ts"
import { candidateRejected } from "../../tools/stripboard/climb.ts"
import { WIRE_NOT_REPLACEABLE, assignNodes } from "../../tools/stripboard/complete-apply.ts"
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
  //   shared  R1.2 on row 1 and R3.1 on row 3. Row 1 also carries R2's two
  //           leads, which are `crowd` and `far` - other nets, on a part this
  //           spread would not move - so row 1 is a source. Row 3 carries R3
  //           and nothing else, so vacating it would EMPTY it: S_occ would fall
  //           by one as the target's rose and the identity's -1 would cancel.
  //           Row 3 is therefore not offered.                      -> [1]
  //   crowd   R1.1 and R2.1, BOTH on row 1, and the only parts on row 1 are R1
  //           and R2 - which are exactly the movers. Discounting them leaves no
  //           other net's pin there, so the strip is not crowded for this net.
  //                                                                 -> []
  //   far     R2.2 on row 1 and R4.1 on row 6. Row 1 also carries R1's leads
  //           (`shared` and `crowd`), so it IS a source - the reach of a
  //           straight wire is a separate question, and `spreadMove`'s, not
  //           this function's.                                      -> [1]
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
  // TWO (net, source) PAIRS SURVIVE `spreadSourceStrips` - (shared, 1) and
  // (far, 1) - AND ONLY ONE OF THEM YIELDS A CANDIDATE, because the rejoining
  // wire is STRAIGHT.
  //
  //   far   its pin on row 1 is at column 5 and its pin on row 6 at column 0.
  //         No single line of holes is within one hole of both, so no straight
  //         wire can land one end on the net's copper on each strip and NO
  //         candidate is proposed. This is the measured limit of the kind.  = 0
  //   shared its pin on row 1 is at column 2 and its pin on row 3 at column 4,
  //         so column 3 is one hole from each and free on both rows. The five
  //         free strips are 0, 2, 4, 5 and 7, and THREE of them take it:
  //           to 0: the wire would span rows 0 to 3, and both gesture orders
  //                 anchor the fresh 1x3 at row 1 column 2 - whose columns 2,
  //                 3 and 4 include R2.1 at 1,4. Blocked.
  //           to 2: R1 lands on row 2 columns 1 to 2 and the fresh wire fits at
  //                 row 2 columns 3 to 5, shrinks to two holes and turns onto
  //                 rows 2 and 3 of column 3.                            TAKEN
  //           to 4: R1 lands on row 4 columns 1 to 2, which is where
  //                 turn-then-stretch would anchor the wire (4,2); and
  //                 stretch-then-turn anchors at row 3 column 3, whose column 4
  //                 is R3.1. Both blocked.
  //           to 5: fresh wire at row 4 columns 2 to 4, turned onto rows 3 to 5
  //                 of column 3.                                         TAKEN
  //           to 7: the same anchor, grown twice, rows 3 to 7 of column 3.
  //                                                                      TAKEN
  //                                                                        = 3
  //                                                                        ---
  //                                                                          3
  const found = spreads()
  expect(found.length).toBe(3)
  expect(found.map((move) => `${move.net} ${move.from}->${move.to} joined ${move.joined}`)).toEqual([
    "shared 1->2 joined 3",
    "shared 1->5 joined 3",
    "shared 1->7 joined 3",
  ])
  // ONE MOVER EACH, R1 - the only part whose pin on `shared` is on row 1.
  expect(found.every((move) => move.gestures.length === 1)).toBe(true)
  expect(found.map((move) => move.gestures[0]?.ref)).toEqual(["R1", "R1", "R1"])
  // AND THE WIRE RUNS DOWN COLUMN 3 IN EVERY ONE, which is the whole content of
  // the reach rule: one end beside the net's pin on row 1's vacated copper,
  // which travels with R1, and the other beside its pin on row 3.
  expect(found.map((move) => [move.ends[0], move.ends[1]])).toEqual([
    [
      [2, 3],
      [3, 3],
    ],
    [
      [3, 3],
      [5, 3],
    ],
    [
      [3, 3],
      [7, 3],
    ],
  ])
})

test("a net whose copper on the two strips no straight wire reaches gets no spread", () => {
  // `far` IS CROWDED ON ROW 1 AND IS STILL NOT PROPOSABLE, and the two facts
  // are separate: `spreadSourceStrips` offers row 1 (asserted above), and every
  // target is then declined because the wire cannot reach. Its pin on row 1 is
  // at column 5 and its pin on row 6 at column 0.
  //
  // **THIS IS THE KIND'S OWN LIMIT AND NOT A BOARD QUIRK.** The fork makes only
  // straight wires - a 1 x n or an n x 1 - so one line of holes has to carry
  // both ends. The join a person would draw here is an L: a wire ALONG row 6 to
  // bring `far`'s copper under column 5, then a wire ACROSS. That is two wires
  // and tools/stripboard/complete-joins.ts's own pair of planners; this kind
  // plans one.
  expect(spreadSourceStrips(CROWDED, CROWDED_NETS, "far")).toEqual([1])
  for (const to of spreadTargetStrips(CROWDED)) {
    expect(spreadMove(CROWDED_OCC, CROWDED, CROWDED_NETS, "far", 1, to)).toBeUndefined()
  }
})

test("the deltas cross the strips and never slide a part along one", () => {
  // THE SAME RULE `gatherMove` APPLIES, and here the strips are ROWS - so the
  // delta is (target - source, 0) for every mover and the column component is
  // zero. HAND-DERIVED from the source strip 1 and the three targets 2, 5 and 7.
  expect(spreads().map((move) => move.gestures[0]?.delta)).toEqual([
    [1, 0],
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
  // ONLY `shared` YIELDS CANDIDATES ON THIS BOARD, so reversing the net order
  // cannot reorder two blocks - it can only prove the enumeration still walks
  // the map rather than a sorted key list, which is what the ascending target
  // order inside the one block shows. The CLUSTER moves are what
  // ./moves.test.ts holds the reversal property on, over a board with two
  // contributing nets.
  expect(spreads(reversed).map(describeMove)).toEqual(forward)
  expect(spreads().map(describeMove)).toEqual(forward)
})

test("the occupancy advance moves the parts AND lands the wire", () => {
  // THE FIRST CANDIDATE, hand-walked through the transcribed arithmetic:
  //   R1 is a 1x2 rect at 1,1 and the delta is +1,0, so it lands at 2,1;
  //   the wire spans rows 2 to 3 of column 3 - two holes - so the fresh 1x3
  //     has to SHRINK, and the order recorded is stretch-then-turn because
  //     turn-then-stretch would anchor the fresh wire at row 3 column 2, whose
  //     columns include R3.1 at 3,4;
  //   stretch-then-turn anchors it at row 2 column 3, where columns 3, 4 and 5
  //     are free once R1 sits at columns 1 to 2;
  //   one shrink makes it 1x2 at 2,3, and the clockwise turn of a 1x2 moves its
  //     top-left by (0, 0) - trunc((2-1)/2) is zero - leaving a 2x1 at 2,3,
  //     which is rows 2 and 3 of column 3.
  const first = spreads()[0]
  expect(first).toBeDefined()
  if (first === undefined) return
  expect(first.wire.at).toEqual([2, 3])
  expect(first.wire.turns).toBe(1)
  expect(first.wire.stretch).toBe(-1)
  expect(first.wire.order).toBe("stretch-then-turn")
  expect(first.ends).toEqual([
    [2, 3],
    [3, 3],
  ])
  const after = occupancyAfter(CROWDED_OCC, CROWDED, first)
  expect(after).toBeDefined()
  if (after === undefined) return
  expect(rectOf(after, "R1")).toEqual({ row: 2, col: 1, rows: 1, cols: 2, across: false })
  expect(rectOf(after, "Wire1")).toEqual({ row: 2, col: 3, rows: 2, cols: 1, across: true })
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
  // STRETCH-THEN-TURN order - the shrink before the turn, because that is the
  // order whose anchor fits. Each reads the previous one's output and only the
  // LAST names `out`, so a refused gesture leaves the candidate absent.
  expect(spawned).toEqual([
    ["--move", path.join(runDir, "base.vrt"), "--ref", "R1", "--delta", "1,0", "-o", `${out}.spread-0.vrt`],
    ["--author", `${out}.spread-0.vrt`, "--op", "add-wire", "--at", "2,3", "-o", `${out}.spread-1.vrt`],
    ["--stretch", `${out}.spread-1.vrt`, "--ref", "Wire1", "--direction", "shrink", "-o", `${out}.spread-2.vrt`],
    ["--rotate", `${out}.spread-2.vrt`, "--ref", "Wire1", "--direction", "cw", "-o", out],
  ])
})

test("a wire --update will not put back is a rejected candidate, and any other failure is not", () => {
  // MEASURED ON THE PINNED FORK, on the constructed arm at seed 0 of the
  // import-placed low-boost board: round 0's candidate 83 added a wire and
  // --update exited 1 with "the layout's wire Wire1 (7,17 to 11,17, carrying
  // net ids 9 and 1) cannot be put back after reconciliation: its two ends are
  // no longer on one net." THAT STOPPED THE FIRST SPREAD SWEEP OUTRIGHT, and
  // the fork is right to refuse - its own source says "a board where a jumper
  // has become a short is not a board this tool may write" - so the candidate
  // is rejected and counted, exactly as an unresolved cut state is.
  const runDir = freshRunDir()
  const shorted: SpawnVeroroute = () => ({
    status: 1,
    stdout: "",
    stderr:
      "the layout's wire Wire1 (7,17 to 11,17, carrying net ids 9 and 1) cannot be put back " +
      "after reconciliation: its two ends are no longer on one net. Move or delete it in the " +
      "GUI, then run this again.\n",
  })
  let refusal = ""
  try {
    assignNodes(path.join(runDir, "c.vrt"), { netlist: "n.net" }, runDir, "t", shorted)
  } catch (error) {
    refusal = error instanceof Error ? error.message : String(error)
  }
  expect(refusal.startsWith(WIRE_NOT_REPLACEABLE)).toBe(true)
  expect(candidateRejected(refusal)).toBe(true)
  // AND EVERY OTHER `--update` FAILURE STILL STOPS THE RUN. An HC7 disagreement
  // between the board and the circuit is a finding, and a catch wide enough to
  // swallow it would be a skipped check that looks like a passing one.
  const broken: SpawnVeroroute = () => ({
    status: 1,
    stdout: "",
    stderr: "netlist names a component the board does not carry\n",
  })
  let other = ""
  try {
    assignNodes(path.join(runDir, "c.vrt"), { netlist: "n.net" }, runDir, "t", broken)
  } catch (error) {
    other = error instanceof Error ? error.message : String(error)
  }
  expect(candidateRejected(other)).toBe(false)
  expect(other).toContain("completionPass: --update exited 1")
})

test("a spread of a net wholly on one strip is not proposed, because that is a gather", () => {
  // `crowd` holds R1.2 and R2.1 and both are on row 1, so vacating row 1 moves
  // the WHOLE net - which is a gather, needs no wire, and would put one gesture
  // in the sweep twice under two names. spreadMove declines it directly, so the
  // decline is the move's own and not only the enumeration's narrowing.
  expect(spreadMove(CROWDED_OCC, CROWDED, CROWDED_NETS, "crowd", 1, 2)).toBeUndefined()
  // AND A ZERO DELTA IS DECLINED for the fork's own reason: a candidate
  // byte-identical to its own parent.
  expect(spreadMove(CROWDED_OCC, CROWDED, CROWDED_NETS, "shared", 1, 1)).toBeUndefined()
  // AND A TARGET THE NET ALREADY HOLDS leaves no two strips for a wire to span:
  // `shared`'s other pin is on row 3, so a relocation onto row 3 is a
  // consolidation needing no wire, which nothing in the move set performs.
  expect(spreadMove(CROWDED_OCC, CROWDED, CROWDED_NETS, "shared", 1, 3)).toBeUndefined()
})

test("a strip the net keeps a pin on is not a source, and the control differs by one pin's net", () => {
  // **THE CLAUSE THIS HOLDS WAS ABSENT AND THE OMISSION WAS MEASURED.** On
  // `random` seed 3's round-0 spread candidate the net's aimed pin moved off
  // strip 24 and the net STILL HELD that strip through a second part, so the
  // abutment the spread exists to remove was still there: measured per strip,
  // the net segments rose by one, `S_occ` did not move, and the fork's own cut
  // count went 21 to 22 against the arithmetic's predicted 21 to 20.
  //
  // THE TWO BOARDS BELOW ARE THE SAME GEOMETRY AND DIFFER IN ONE PIN'S NET, so
  // neither answer can be right by coincidence. `C` is a part ACROSS the strips
  // with a lead on row 1 and a lead on row 3; `B` lies along row 1; `A` puts
  // another net on row 1 so that the strip is crowded either way.
  //
  //   held = B.2, C.1, C.2   `C` keeps a pin of `held` on row 1 after `B` goes,
  //                          so row 1 is NOT a source
  //   held = B.2, C.1        the same hole is another net's, nothing of `held`
  //                          stays, and row 1 IS a source
  //
  // `occupancyOf` is never called on either board, which is why a part facing N
  // is admissible here: spreadSourceStrips reads the dump's PIN lines and the
  // reference netlist and no geometry at all.
  const text = [
    "GRID 8 12",
    "BOUNDS 1,0 3,5",
    "VERTICAL_STRIPS 0",
    "CUT_STATE COMPUTED",
    "PART A RESISTOR 10K AT 1,4 SPAN 2 DIRECTION W",
    "PART B RESISTOR 10K AT 1,2 SPAN 2 DIRECTION W",
    "PART C RESISTOR 10K AT 1,0 SPAN 3 DIRECTION N",
    "PIN A 1 AT 1,4",
    "PIN A 2 AT 1,5",
    "PIN B 1 AT 1,2",
    "PIN B 2 AT 1,3",
    "PIN C 1 AT 3,0",
    "PIN C 2 AT 1,0",
    "NODE 1 NAME held B.2 C.1 C.2",
    "NODE 2 NAME other A.1 B.1",
    "NODE 3 NAME spare A.2",
    "",
  ].join("\n")
  const board = boardGeometry(text)
  const keeps: ReferenceNets = new Map([
    ["held", ["B.2", "C.1", "C.2"]],
    ["other", ["A.1", "B.1"]],
    ["spare", ["A.2"]],
  ])
  expect(spreadSourceStrips(board, keeps, "held")).toEqual([])
  const control: ReferenceNets = new Map([
    ["held", ["B.2", "C.1"]],
    ["other", ["A.1", "B.1"]],
    ["spare", ["A.2", "C.2"]],
  ])
  expect(spreadSourceStrips(board, control, "held")).toEqual([1])
})
