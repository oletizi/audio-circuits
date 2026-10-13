/**
 * Task 17: the move set - WHAT IS ENUMERATED, and in what order.
 *
 * What one move DOES to a board file - the transport, the argument lists and the
 * two refusals - is `./moves-apply.test.ts`, split off for the 500-line ceiling
 * at the seam this header already named when it covered both.
 *
 * THE AUTHORITY is the brief at
 * `.superpowers/sdd/2026-10-10-stripboard-pipeline/task-17-brief.md` and, behind
 * it, COST §6.1's move set and PIPELINE §7.4's net-cluster move.
 *
 * **EVERY COUNT BELOW IS HAND-DERIVED FROM THE FIXTURE AND WRITTEN AS A
 * LITERAL**, with the derivation in a comment a reader can check against the
 * dump text. Nothing here is `expect(x).toBe(<the expression that computed x>)`
 * - the shape that looks like a derivation, passes however wrong both sides
 * are, and has been caught in this suite three times (Tasks 11, 15 and 16).
 *
 * WHAT THESE TESTS DO NOT PROVE: that the gestures land where the model says.
 * That claim belongs to `./seed-geometry.test.ts`, which holds the transcribed
 * rotation and stretch arithmetic against the real binary and fails rather than
 * skips when it is absent. Here the spawn is injected and what is asserted is
 * the ENUMERATION and the ARGUMENT LISTS.
 */
import { expect, test } from "bun:test"
import {
  addsWire,
  applicableMoves,
  DEFERRED_KINDS,
  describeMove,
  enumerateMoves,
  MOVE_KINDS,
  occupancyAfter,
  type Move,
} from "../../tools/stripboard/moves.ts"
import type { ReferenceNets } from "../../tools/stripboard/equivalence.ts"
import { turnedRect } from "../../tools/stripboard/seed-placement.ts"
import { occupancyOf, stretchBoundFor, type Occupancy } from "../../tools/stripboard/seed-geometry.ts"
import { boardGeometry } from "../../tools/stripboard/copper.ts"
import type { PartRect } from "../../tools/stripboard/seed-geometry.ts"
import {
  CROWDED,
  CROWDED_NETS,
  CROWDED_OCC,
} from "./spread-fixtures.ts"
import { BASE_DUMP } from "./climb-boards.ts"
import {
  BETTER,
  BETTER_OCC,
  DUMP,
  OCC,
  TOP_EDGE,
  TOP_EDGE_OCC,
  REFERENCE,
} from "./climb-fixtures.ts"

function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

test("the move enumeration is deterministic and does not iterate a hash map", () => {
  const first = enumerateMoves(OCC, DUMP, REFERENCE).map(describeMove)
  const second = enumerateMoves(OCC, DUMP, REFERENCE).map(describeMove)
  expect(first).toEqual(second)
  // The nets arrive in the netlist's order, so reordering the reference map
  // reorders the cluster moves - which is what makes the order explicit rather
  // than incidental. A `Map` iterates in INSERTION order, and
  // referenceNetsFromExport fills it in the netlist's own order; an enumeration
  // that sorted the keys, or read them off a Set, would survive the first
  // assertion above and fail this one.
  const reversed: ReferenceNets = new Map([...REFERENCE.entries()].reverse())
  const clusters = (nets: ReferenceNets): readonly string[] =>
    enumerateMoves(occupancyOf(DUMP), DUMP, nets)
      .filter((move) => move.kind === "cluster")
      .map((move) => (move.kind === "cluster" ? move.net : ""))
  // THREE DELTAS PER NET AND NOT FOUR: W1 sits at 3,1-3,2 and W2 at 3,6-3,7, and
  // the occupancy carries wires now - so the cluster by 1,0, which would put R1
  // on row 3, does not fit. `./seed-geometry.ts` records the measurement that
  // put wires in there: the fork refuses a part moved onto a wire's holes.
  expect(clusters(REFERENCE)).toEqual(["left", "left", "left", "right", "right", "right"])
  expect(clusters(reversed)).toEqual([...clusters(REFERENCE)].reverse())
})

test("every move kind the spec names is enumerated, and no ninth kind appears", () => {
  // TWO BOARDS, AND THE SECOND ONE IS NOT PADDING. `spread` is proposed only off
  // a strip where one net's pins abut another's, and BASE_DUMP has no such strip
  // - its two nets hold one column each (./spread.test.ts derives that and
  // asserts it). So the kind would be invisible here on one board, which is
  // exactly the shape of defect this test exists to catch, and the union is
  // taken over BASE_DUMP and ./spread-fixtures.ts' crowded board instead.
  const kinds = new Set([
    ...enumerateMoves(OCC, DUMP, REFERENCE).map((move) => move.kind),
    ...enumerateMoves(CROWDED_OCC, CROWDED, CROWDED_NETS).map((move) => move.kind),
  ])
  expect([...kinds].sort()).toEqual([
    "add-wire",
    "cluster",
    "delete-wire",
    "gather",
    "move",
    "rotate",
    "spread",
    "stretch",
  ])
  // THE DOCUMENTS NAME SIX AND THERE ARE EIGHT, each extra one with its own
  // authority recorded in tools/stripboard/moves-model.ts's header: `gather` by
  // the controller's ruling of 2026-10-12, because E1's one-delta cluster cannot
  // change the quantity E1 exists to change; and `spread` on the owner's own
  // correction of the cost model the same day, quoted in full at the head of
  // tools/stripboard/moves-spread.ts.
  //
  // MOVE_KINDS is the one listing, so the enumeration and the declaration
  // cannot drift: a ninth kind added to `Move` and to MOVE_KINDS but never
  // emitted fails here.
  expect([...kinds].sort()).toEqual([...MOVE_KINDS].sort())
})

test("addsWire names exactly the kinds that put a new wire on the board", () => {
  // IT DECIDES WHETHER A CANDIDATE GETS THE ONE `--update` THAT ASSIGNS ITS WIRE
  // TO A NET, which is what makes the wire visible to --check's completeness at
  // all (tools/stripboard/complete-apply.ts's assignNodes carries the
  // measurement). So this is asserted over the enumerated set rather than over a
  // hand-written list of kinds: a kind that starts adding a wire and is not
  // named here would be scored with its wire joining nothing.
  const byKind = new Map<Move["kind"], boolean>()
  for (const move of [
    ...enumerateMoves(OCC, DUMP, REFERENCE),
    ...enumerateMoves(CROWDED_OCC, CROWDED, CROWDED_NETS),
  ]) {
    byKind.set(move.kind, addsWire(move))
  }
  expect([...byKind.entries()].filter(([, adds]) => adds).map(([kind]) => kind).sort()).toEqual([
    "add-wire",
    "spread",
  ])
  expect([...byKind.entries()].filter(([, adds]) => !adds).map(([kind]) => kind).sort()).toEqual([
    "cluster",
    "delete-wire",
    "gather",
    "move",
    "rotate",
    "stretch",
  ])
})

test("the enumeration is exactly the hand-counted move set of the fixture board", () => {
  // DERIVED BY HAND FROM BASE_DUMP, which places R1 at 2,1 and R2 at 7,2, each
  // 1 row by 6 columns, on a 12 x 40 grid with two nets and two WIRE lines:
  //
  //   move        2 parts x 4 one-hole neighbours, all four clear on both
  //               EXCEPT R1's step down onto row 3, where W1 sits: the
  //               occupancy carries wires now, measured against the fork,
  //               which refuses a part moved onto a wire's holes            = 7
  //   rotate      1 clockwise turn each, both takeable from an interior row = 2
  //   stretch     grow and shrink, both clear on both parts                 = 4
  //   add-wire    NONE, and the reason changed when `WIRE_END_REACH` began
  //               governing this kind. Net `left` holds 2,1 and 7,2 and net
  //               `right` 2,6 and 7,7, so each straddles two strips (columns)
  //               - but their pins sit FIVE holes apart along those strips,
  //               rows 2 and 7, and a wire's end must land within one hole of
  //               a pin of its own net on BOTH strips. No row is within one of
  //               both, so neither pair is offered. The old rule took the
  //               first row that geometrically fit - row 0, seven holes from
  //               one pin - and the fork refused that shape in 103 of 187
  //               candidates over two instrumented runs. The L join is what
  //               this shape needs and only the spread plans one             = 0
  //   delete-wire the two WIRE lines, W1 and W2                            = 2
  //   cluster     2 nets x 4 one-hole deltas less the one that does not land:
  //               each net holds a pin of BOTH parts, so every cluster moves
  //               R1 and R2 together, and the step DOWN puts R1 on row 3
  //               where W1 is                                               = 6
  //   gather      each net with TWO OR MORE on-board parts onto EVERY strip of
  //               the board that the whole net fits on. Strips are COLUMNS here
  //               and the grid is 12 x 40. `left` holds R1.1 at column 1 and
  //               R2.1 at column 2, both parts six columns wide and on
  //               different rows, so neither can block the other and the
  //               landing bound is the grid: columns 0 to 34 inclusive, which
  //               is 35. `right` holds R1.2 at column 6 and R2.2 at column 7,
  //               five columns from each part's own AT, so its bound is
  //               columns 5 to 39, which is 35 again. No candidate is dropped
  //               for a zero delta, because no single column makes BOTH
  //               parts' deltas zero                                       = 70
  //   spread      NONE, and that is a fact about this board rather than a gap:
  //               a spread vacates a strip where one net's pins abut another
  //               net's, and here every net has its column to itself - `left`
  //               at columns 1 and 2, `right` at 6 and 7. ./spread.test.ts
  //               derives that and asserts it, on this very dump          = 0
  //                                                                        ---
  //                                                                         91
  const moves = enumerateMoves(OCC, DUMP, REFERENCE)
  const counted = new Map<Move["kind"], number>()
  for (const move of moves) counted.set(move.kind, (counted.get(move.kind) ?? 0) + 1)
  expect(counted.get("move")).toBe(7)
  expect(counted.get("rotate")).toBe(2)
  expect(counted.get("stretch")).toBe(4)
  expect(counted.get("add-wire")).toBeUndefined()
  expect(counted.get("delete-wire")).toBe(2)
  expect(counted.get("cluster")).toBe(6)
  expect(counted.get("gather")).toBe(70)
  expect(counted.get("spread")).toBeUndefined()
  expect(moves.length).toBe(91)
  // And the applicable subset is the 91 less the ONE deferred kind's 2: the two
  // delete-wires. It was 14 while `cluster` was deferred as well, 22 before
  // `gather` existed, 26 while the gather asked only about the strips a net
  // already occupied, and 92 while `add-wire` was deferred too - which is
  // exactly what this figure moving is meant to signal. `rotate` was deferred
  // for one round of Task 17 and is also back: a turn's result is carried in
  // the occupancy rather than re-read from a dump that cannot describe it.
  expect(applicableMoves(moves).length).toBe(89)
  expect([...DEFERRED_KINDS.keys()].sort()).toEqual(["delete-wire"])
})

test("only the clockwise turn is proposed, because only that case is transcribed", () => {
  // tools/stripboard/seed-placement.ts's turnedRect is Board::RotateComps's
  // CLOCKWISE case, line by line; nothing in this repository has transcribed
  // the anticlockwise one. The `Move` union admits "ccw" because --rotate does.
  const directions = enumerateMoves(OCC, DUMP, REFERENCE)
    .filter((move) => move.kind === "rotate")
    .map((move) => (move.kind === "rotate" ? move.direction : ""))
  expect(directions).toEqual(["cw", "cw"])
})

test("no stretch is proposed for a family the fork will not stretch, and an unknown type refuses", () => {
  // A GEOMETRIC FIT IS NOT A STRETCHABLE PART, which the first real climb found
  // the hard way: it proposed `--stretch junction_grounds --direction grow` on
  // the import-placed low-boost board - geometrically clear - and the fork
  // refused with "junction_grounds cannot grow" after 24 accepted gestures.
  //
  // SIP5 is recorded as unstretchable (measured; see VEROROUTE_STRETCH_BOUNDS),
  // RESISTOR is recorded stretchable between 2 and 16 columns, and a type
  // nobody has measured refuses by name rather than being guessed either way.
  expect(stretchBoundFor("SIP5").stretchable).toBe(false)
  const resistor = stretchBoundFor("RESISTOR")
  expect(resistor.stretchable).toBe(true)
  if (resistor.stretchable) {
    expect([resistor.minLength, resistor.maxLength]).toEqual([2, 16])
  }
  expect(refusalFrom(() => stretchBoundFor("BLOCK_200MIL3"))).toContain(
    'no stretch bound is recorded for VeroRoute type "BLOCK_200MIL3"',
  )
  // And the enumeration proposes nothing for a part at its own upper bound: a
  // 16-column RESISTOR may shrink and may not grow.
  const atCeiling = boardGeometry(
    [
      "GRID 12 40",
      "BOUNDS 2,1 2,16",
      "VERTICAL_STRIPS 1",
      "CUT_STATE COMPUTED",
      "PART R1 RESISTOR 10K AT 2,1 SPAN 16 DIRECTION W",
      "PIN R1 1 AT 2,1",
      "PIN R1 2 AT 2,16",
      "NODE 1 NAME left R1.1",
      "NODE 2 NAME right R1.2",
      "",
    ].join("\n"),
  )
  const directions = enumerateMoves(occupancyOf(atCeiling), atCeiling, REFERENCE)
    .filter((move) => move.kind === "stretch")
    .map((move) => (move.kind === "stretch" ? move.direction : ""))
  expect(directions).toEqual(["shrink"])
})

test("a TURNED part's stretch bound is read along its leads, not along its columns", () => {
  // MEASURED, AND THE MEASUREMENT IS WHAT FOUND IT: on the arm comparison's own
  // run (docs/stripboard/pipeline-verification.md section 6.3) the model
  // proposed `--stretch C18 --direction shrink` on a turned CAP_FILM_WIDE that
  // was already at its minimum length, and the fork refused with "C18 cannot
  // shrink" - stopping the run after seven rounds. The two probes that settle
  // what the fork thinks the length is, on that same board:
  //
  //   --stretch --ref C18 --direction grow   exit 0, and the leads move from
  //                                          31,25 / 32,25 to 31,25 / 33,25
  //                                          while AT and SPAN stay 31,24 and 3
  //   --stretch --ref C18 --direction shrink exit 0 on the grown board
  //
  // So for a part facing N the length that stretches is the LEAD DISTANCE ALONG
  // THE ROWS, which appears in no dump line at all, and `SPAN` is the body's
  // column count. The occupancy tracks it as the rect's ROW extent once the
  // part is across the strips, which is the axis `stretchedRect` already moves.
  //
  // HAND-BUILT TO DISCRIMINATE: a turned CAP_FILM_WIDE two rows long and three
  // columns wide. CAP_FILM_WIDE's recorded minimum is 2, so the part is AT the
  // minimum and no shrink may be proposed - while a reading of `rect.cols`
  // sees 3 and proposes one. The grow is admitted either way, which is what
  // makes the pair a discrimination and not a one-sided assertion.
  const turnedDump = boardGeometry(
    [
      "GRID 35 35",
      "BOUNDS 10,10 11,12",
      "VERTICAL_STRIPS 1",
      "CUT_STATE COMPUTED",
      "PART C1 CAP_FILM_WIDE .33uF AT 10,10 SPAN 3 DIRECTION N",
      "PIN C1 1 AT 10,11",
      "PIN C1 2 AT 11,11",
      "NODE 1 NAME left C1.1",
      "NODE 2 NAME right C1.2",
      "",
    ].join("\n"),
  )
  const turned: Occupancy = new Map([
    ["C1", { row: 10, col: 10, rows: 2, cols: 3, across: true }],
  ])
  const shrink: Move = { kind: "stretch", ref: "C1", direction: "shrink" }
  const grow: Move = { kind: "stretch", ref: "C1", direction: "grow" }
  expect(occupancyAfter(turned, turnedDump, shrink, "CAP_FILM_WIDE")).toBeUndefined()
  expect(occupancyAfter(turned, turnedDump, grow, "CAP_FILM_WIDE")).not.toBeUndefined()
  // And the enumeration therefore proposes the grow and not the shrink.
  expect(
    enumerateMoves(turned, turnedDump, REFERENCE)
      .filter((move) => move.kind === "stretch")
      .map(describeMove),
  ).toEqual(["stretch C1 grow"])
  // THE SAME RECT LYING ALONG THE STRIPS IS THE OTHER HALF: three rows by two
  // columns, `across` false, so the length is the COLUMN extent - 2, at the
  // minimum again - and the answers are the same for the opposite reason.
  const flat: Occupancy = new Map([
    ["C1", { row: 10, col: 10, rows: 3, cols: 2, across: false }],
  ])
  expect(occupancyAfter(flat, turnedDump, shrink, "CAP_FILM_WIDE")).toBeUndefined()
  expect(occupancyAfter(flat, turnedDump, grow, "CAP_FILM_WIDE")).not.toBeUndefined()
})

test("no rotate is proposed where the turn would pan the board", () => {
  // THE GUARD NEEDS A BOARD WHERE IT SAYS NO, and this was a mutation survivor
  // before it existed: on both graded fixtures every part turns, so deleting
  // the turnsTakeable guard outright left their rotate counts at 2 and nothing
  // noticed. TOP_EDGE_DUMP puts a 1x6 part at row 0, whose turn lands at row -2
  // and pans the board, so --rotate would refuse it.
  const moves = enumerateMoves(TOP_EDGE_OCC, TOP_EDGE, REFERENCE)
  expect(moves.filter((move) => move.kind === "rotate").length).toBe(0)
  // And the part IS otherwise enumerated, so this is not passing because
  // nothing was enumerated at all: three of its four one-hole neighbours fit
  // (row -1 does not), and both stretch directions do.
  expect(moves.filter((move) => move.kind === "move").map(describeMove)).toEqual([
    "move R1 to 0,2",
    "move R1 to 1,1",
    "move R1 to 0,0",
  ])
  expect(moves.filter((move) => move.kind === "stretch").length).toBe(2)
})

test("two clockwise turns return a part to its own origin, so cw-only reaches two rects", () => {
  // THE CLAIM THE cw-ONLY ENUMERATION RESTS ON, held here so it fails rather
  // than rots. All four FACINGS are reachable in one, two or three cw steps
  // because four quarter turns are a full turn; the RECT cycle is shorter than
  // that, and these figures come from turnedRect driven by hand - a 1x6 part at
  // 2,1 turns to 0,3 (6 rows by 1 column) and back to 2,1, and the same holds
  // at spans 3, 5 and 7. So the restriction cw-only imposes is on the ROUTE to
  // the third facing - three turns, each needing to fit on its own - and not on
  // which facings exist.
  const cases: readonly (readonly [number, readonly [number, number]])[] = [
    [3, [1, 2]],
    [5, [0, 3]],
    [6, [0, 3]],
    [7, [-1, 4]],
  ]
  for (const [span, turned] of cases) {
    const start: PartRect = { row: 2, col: 1, rows: 1, cols: span, across: false }
    const once = turnedRect(start)
    expect([once.row, once.col]).toEqual([...turned])
    expect([once.rows, once.cols]).toEqual([span, 1])
    expect(once.across).toBe(true)
    const twice = turnedRect(once)
    expect([twice.row, twice.col]).toEqual([2, 1])
    expect([twice.rows, twice.cols]).toEqual([1, span])
    expect(twice.across).toBe(false)
  }
  expect(cases.length).toBe(4)
})

test("an add-wire needs BOTH a strip pair and a line its ends can reach the net on", () => {
  // THREE BOARDS, BECAUSE THERE ARE NOW TWO WAYS TO GET NO CANDIDATE and a test
  // on one board could not tell them apart - nor either from "never proposed".
  //
  //   BETTER_DUMP: each net is whole on ONE strip, so there is no pair to
  //     bridge at all. A wire there would add a `W` to `F` and no connectivity.
  //   BASE_DUMP: each net straddles two strips, so the pair exists - and still
  //     gets nothing, because its pins are five holes apart ALONG those strips
  //     (rows 2 and 7) and no line is within `WIRE_END_REACH` of a pin on both.
  //     This is the case the spread's L join exists for, which this kind does
  //     not plan: a lone wire that reaches neither segment joins nothing.
  //   ALIGNED: the same two parts with R2 moved so that `left`'s two pins share
  //     a ROW - 2,1 and 2,2 - which puts a line within reach of both ends. One
  //     candidate, and the plan is hand-derived: strips are COLUMNS here, so a
  //     fresh 1x3 wire already lies across them and needs no turn; columns 1 to
  //     2 is two holes, so it shrinks once; and the line is row 1, one hole from
  //     both pins, because row 2 itself holds them.
  const onBetter = enumerateMoves(BETTER_OCC, BETTER, REFERENCE).filter((move) => move.kind === "add-wire")
  const onBase = enumerateMoves(OCC, DUMP, REFERENCE).filter((move) => move.kind === "add-wire")
  expect(onBetter.length).toBe(0)
  expect(onBase.length).toBe(0)
  const aligned = boardGeometry(
    BASE_DUMP.replace("PART R2 RESISTOR 22K AT 7,2", "PART R2 RESISTOR 22K AT 2,2")
      .replace("PIN R2 1 AT 7,2", "PIN R2 1 AT 2,2")
      .replace("PIN R2 2 AT 7,7", "PIN R2 2 AT 2,7"),
  )
  const onAligned = enumerateMoves(occupancyOf(aligned), aligned, REFERENCE).filter(
    (move) => move.kind === "add-wire",
  )
  expect(onAligned.map(describeMove)).toEqual([
    "add-wire left joining 1,1 to 1,2 (at 1,1 as Wire3, 0 turn(s), stretch -1, turn-then-stretch)",
    "add-wire right joining 1,6 to 1,7 (at 1,6 as Wire3, 0 turn(s), stretch -1, turn-then-stretch)",
  ])
})
