/**
 * Task 17: the move set - what is enumerated, in what order, and what one move
 * does to a board file.
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
  applicableMoves,
  applyMove,
  DEFERRED_KINDS,
  describeMove,
  enumerateMoves,
  MOVE_KINDS,
  occupancyAfter,
  type Move,
} from "../../tools/stripboard/moves.ts"
import type { ReferenceNets } from "../../tools/stripboard/equivalence.ts"
import type { SpawnVeroroute } from "../../tools/stripboard/seed.ts"
import { turnedRect } from "../../tools/stripboard/seed-placement.ts"
import { occupancyOf, stretchBoundFor, type Occupancy } from "../../tools/stripboard/seed-geometry.ts"
import { boardGeometry } from "../../tools/stripboard/copper.ts"
import type { PartRect } from "../../tools/stripboard/seed-geometry.ts"
import {
  BETTER,
  BETTER_OCC,
  DUMP,
  OCC,
  TOP_EDGE,
  TOP_EDGE_OCC,
  freshRunDir,
  recordingSpawn,
  REFERENCE,
  IMPROVES_THEN_STALLS,
} from "./climb-fixtures.ts"
import fs from "node:fs"
import path from "node:path"

/** A spawn that records and answers every write verb, with no dump in play. */
function recorder(): { readonly spawned: string[][]; readonly spawn: SpawnVeroroute } {
  const spawned: string[][] = []
  return { spawned, spawn: recordingSpawn(spawned, IMPROVES_THEN_STALLS) }
}

/** A spawn that refuses every invocation, for the non-zero-exit refusal. */
const refusingSpawn: SpawnVeroroute = () => ({
  status: 1,
  stdout: "",
  stderr: "R1 cannot go to -1,1 - its footprint would occupy rows -1..-1\n",
})

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

test("every move kind the spec names is enumerated, and no eighth kind appears", () => {
  const kinds = new Set(enumerateMoves(OCC, DUMP, REFERENCE).map((move) => move.kind))
  expect([...kinds].sort()).toEqual([
    "add-wire",
    "cluster",
    "delete-wire",
    "gather",
    "move",
    "rotate",
    "stretch",
  ])
  // `gather` is the SEVENTH kind and the documents name six: it is here by the
  // controller's ruling of 2026-10-12, because E1's one-delta cluster cannot
  // change the quantity E1 exists to change. tools/stripboard/moves-model.ts's
  // `gather` arm carries the ruling and the measurement behind it.
  //
  // MOVE_KINDS is the one listing, so the enumeration and the declaration
  // cannot drift: an eighth kind added to `Move` and to MOVE_KINDS but never
  // emitted fails here.
  expect([...kinds].sort()).toEqual([...MOVE_KINDS].sort())
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
  //   add-wire    net `left` holds 2,1 and 7,2, so strips 1 and 2, and net
  //               `right` holds 2,6 and 7,7, so strips 6 and 7: one pair of
  //               strips each, one wire per pair at the first ROW that takes
  //               it. Strips are columns here, so the fresh 1x3 wire already
  //               lies across them and the plan is no turn and one shrink    = 2
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
  //                                                                        ---
  //                                                                         93
  const moves = enumerateMoves(OCC, DUMP, REFERENCE)
  const counted = new Map<Move["kind"], number>()
  for (const move of moves) counted.set(move.kind, (counted.get(move.kind) ?? 0) + 1)
  expect(counted.get("move")).toBe(7)
  expect(counted.get("rotate")).toBe(2)
  expect(counted.get("stretch")).toBe(4)
  expect(counted.get("add-wire")).toBe(2)
  expect(counted.get("delete-wire")).toBe(2)
  expect(counted.get("cluster")).toBe(6)
  expect(counted.get("gather")).toBe(70)
  expect(moves.length).toBe(93)
  // And the applicable subset is the 93 less the ONE deferred kind's 2: the two
  // delete-wires. It was 14 while `cluster` was deferred as well, 22 before
  // `gather` existed, 26 while the gather asked only about the strips a net
  // already occupied, and 92 while `add-wire` was deferred too - which is
  // exactly what this figure moving is meant to signal. `rotate` was deferred
  // for one round of Task 17 and is also back: a turn's result is carried in the
  // occupancy rather than re-read from a dump that cannot describe it.
  expect(applicableMoves(moves).length).toBe(91)
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

test("a net whose holes share one strip gets no add-wire, and the second board shows it", () => {
  // BETTER_DUMP aligns R2 under R1, so net `left` sits entirely on strip 1 and
  // net `right` entirely on strip 6. A wire across either would add a W to F
  // and no connectivity, so none is proposed - while BASE_DUMP, whose nets
  // straddle two strips each, gets two. The pair is the point: a test on one
  // board alone could not tell "never proposed" from "not proposed here".
  const onBetter = enumerateMoves(BETTER_OCC, BETTER, REFERENCE).filter((move) => move.kind === "add-wire")
  const onBase = enumerateMoves(OCC, DUMP, REFERENCE).filter((move) => move.kind === "add-wire")
  expect(onBetter.length).toBe(0)
  // HAND-DERIVED, and the plan is the part that moved: strips are COLUMNS on
  // this board, so a fresh 1x3 wire already lies across them and needs no turn;
  // bridging columns 1 and 2 is two holes, so the plan shrinks it once; and the
  // line it is placed on is the first ROW where all three of the fresh wire's
  // holes are free, which is row 0. The board carries W1 and W2 already, so the
  // name the fork will give the next one is Wire3.
  expect(onBase.map(describeMove)).toEqual([
    "add-wire left joining 0,1 to 0,2 (at 0,1 as Wire3, 0 turn(s), stretch -1, turn-then-stretch)",
    "add-wire right joining 0,6 to 0,7 (at 0,6 as Wire3, 0 turn(s), stretch -1, turn-then-stretch)",
  ])
})

test("each applicable kind spawns the fork's own verb, with -o and never in place", () => {
  const { spawned, spawn } = recorder()
  const out = path.join(freshRunDir(), "candidate.vrt")
  applyMove("board.vrt", { kind: "move", ref: "R1", to: [3, 4] }, out, spawn)
  applyMove("board.vrt", { kind: "rotate", ref: "R1", direction: "cw" }, out, spawn)
  applyMove("board.vrt", { kind: "stretch", ref: "R1", direction: "grow" }, out, spawn)
  // add-wire is COMPOUND now and has its own test in ./wire.test.ts; the three
  // one-gesture kinds are what this one is about.
  // Hand-written argument lists, in the grammar the fork's own headers state.
  expect(spawned).toEqual([
    ["--move", "board.vrt", "--ref", "R1", "--to", "3,4", "-o", out],
    ["--rotate", "board.vrt", "--ref", "R1", "--direction", "cw", "-o", out],
    ["--stretch", "board.vrt", "--ref", "R1", "--direction", "grow", "-o", out],
  ])
})

test("the batched transport writes one ops line in --move-batch's own grammar", () => {
  const spawned: string[][] = []
  const ops: string[] = []
  const spawn = recordingSpawn(spawned, IMPROVES_THEN_STALLS, ops)
  const out = path.join(freshRunDir(), "candidate.vrt")
  applyMove("board.vrt", { kind: "move", ref: "R1", to: [3, 4] }, out, spawn, "batched")
  applyMove("board.vrt", { kind: "rotate", ref: "R2", direction: "cw" }, out, spawn, "batched")
  // The verb is the BARE word, with no leading dashes: the fork refuses
  // "--move" in an ops file by name, "because that spelling is the command
  // line's and quietly accepting both would make the file's grammar a matter of
  // taste" (Headless_move_batch.h).
  expect(ops).toEqual(["move R1 --to 3,4\n", "rotate R2 --direction cw\n"])
  expect(spawned.map((args) => args[0])).toEqual(["--move-batch", "--move-batch"])
  expect(fs.existsSync(`${out}.ops`)).toBe(true)
})

test("a kind --move-batch cannot carry takes its one-gesture verb even when batched", () => {
  // The ops grammar is move and rotate and "Nothing else is accepted"
  // (Headless_move_batch.h), so the transport cannot reach a stretch or an
  // add-wire. That is the verb's declared scope rather than a fallback, and the
  // gesture applied is the same one either way.
  const { spawned, spawn } = recorder()
  const out = path.join(freshRunDir(), "candidate.vrt")
  applyMove("board.vrt", { kind: "stretch", ref: "R1", direction: "shrink" }, out, spawn, "batched")
  expect(spawned).toEqual([
    ["--stretch", "board.vrt", "--ref", "R1", "--direction", "shrink", "-o", out],
  ])
})

test("a delete-wire refuses naming the fork, which is where the block is", () => {
  // THE CLUSTER HALF OF THIS TEST IS GONE RATHER THAN SKIPPED, because the
  // refusal it asserted is gone: Task 18 implemented the kind, so
  // DEFERRED_KINDS no longer carries it and applyMove applies it.
  // `./escapes.test.ts` is where the cluster's own behaviour is held.
  const { spawn } = recorder()
  const out = path.join(freshRunDir(), "candidate.vrt")
  const wire = refusalFrom(() =>
    applyMove("board.vrt", { kind: "delete-wire", name: "W1" }, out, spawn),
  )
  expect(wire).toContain("no verb in the pinned fork deletes a placed component")
  // ONE WORDING for each, read out of DEFERRED_KINDS by both applyMove and
  // applicableMoves - so the climb's omission and the refusal cannot drift.
  const reason = DEFERRED_KINDS.get("delete-wire")
  expect(reason === undefined).toBe(false)
  expect(wire).toContain(reason ?? "<absent>")
  // AND THE REFUSAL NOW CARRIES THE MEASUREMENT rather than a reading of a help
  // text: --update is the one verb that rewrites a board's component set from a
  // netlist, and it leaves wires in place.
  expect(wire).toContain("still carries TWO wires afterwards")
  // And `add-wire` is NOT in here any more: it was deferred beside this one
  // until `occupancyOf` learned about wires, and ./wire.test.ts is where its
  // behaviour is held now.
  expect(DEFERRED_KINDS.has("add-wire")).toBe(false)
})

test("a gesture the fork refuses stops the run and quotes it, rather than being skipped", () => {
  const out = path.join(freshRunDir(), "candidate.vrt")
  const refusal = refusalFrom(() =>
    applyMove("board.vrt", { kind: "move", ref: "R1", to: [-1, 1] }, out, refusingSpawn),
  )
  expect(refusal).toContain("move R1 to -1,1")
  expect(refusal).toContain("--move board.vrt --ref R1 --to -1,1 -o")
  expect(refusal).toContain("its footprint would occupy rows -1..-1")
  expect(refusal).toContain("NOT retried")
})
