/**
 * `movableRefs` - the union of the dump's placed `PART` lines and its placed
 * `PAD` lines, which is what every move generator now enumerates over.
 *
 * **TWO REAL BOARDS, AND THEY ANSWER DIFFERENT QUESTIONS.** The FROZEN
 * low-boost fixture is read for the union itself; it cannot be driven through
 * `enumerateMoves`, because that capture predates the `DIRECTION` field and
 * `occupancyOf` refuses it by name (`Part.direction` in
 * `tools/guide/dump-model.ts` records why the field is optional on a placed
 * part and why the capture may not be regenerated). The IMPORTED low-boost
 * fixture carries `DIRECTION`, so `occupancyOf` accepts it and the move set is
 * driven over it whole - which is what makes the production capability visible
 * in this suite rather than inferred from `movableRefs` alone.
 *
 * The refusal and exclusion boards are hand-written dump text for the reason
 * `tests/stripboard/pad-provenance.test.ts` says: a fork that printed a ref
 * under both a `PART` and a `PAD` line, or an `AT` with no hole after it,
 * would be the fault the refusal exists to report, so it cannot be produced
 * by the pinned binary.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import { movableRefs } from "../../tools/stripboard/movable.ts"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { describeMove, enumerateMoves } from "../../tools/stripboard/moves.ts"
import { occupancyOf } from "../../tools/stripboard/seed-geometry.ts"
import {
  referenceNetsFromExport,
  type ReferenceNets,
} from "../../tools/stripboard/equivalence.ts"

const DUMP = fs.readFileSync("tests/fixtures/stripboard/pultec-low-boost-frozen.dump", "utf8")

/**
 * The same circuit as `DUMP` after `--import`'s first-fit sweep, and the
 * schematic's own netlist export.
 *
 * **THE NETLIST IS THE FROZEN ONE AND THAT IS NOT A MISMATCH:** a
 * `ReferenceNets` is derived from the SCHEMATIC, not from a board, and both
 * fixtures are the same low-boost circuit. The imported dump's own 14 `NODE`
 * lines all read `NAME -`, so it carries no net names of its own at all.
 */
const IMPORTED = fs.readFileSync(
  "tests/fixtures/stripboard/pultec-low-boost-imported.dump",
  "utf8",
)
const NETLIST = fs.readFileSync(
  "tests/fixtures/stripboard/pultec-low-boost-frozen.netlist",
  "utf8",
)

/** One strip, one resistor and one pad - the smallest board with both kinds on it. */
const SMALL = [
  "GRID 1 3",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR4 1k AT 0,0 SPAN 1",
  "PAD SW_2 SW_Rotary AT 0,1 FROM SW.2",
  "PIN R1 1 AT 0,0",
  "PIN SW_2 1 AT 0,1",
].join("\n")

/** The message a call refused with, or "" when it did not refuse. */
function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

test("an off-board pad is movable, and is reported as a pad rather than a part", () => {
  const movable = movableRefs(parseBoardDump(DUMP), DUMP)
  const pad = movable.find((m) => m.ref === "SW_LO_BOOST_2")
  expect(pad, "the pad row's second pad is movable").toBeDefined()
  expect(pad?.kind).toBe("pad")
  // THE HAND LAYOUT'S OWN POSITION, so a parser that invented a position fails.
  // Measured from the committed fixture's own PAD line:
  //   PAD SW_LO_BOOST_2 SW_Rotary_1x6_MP AT 3,11 FROM SW_LO_BOOST.2
  // If the frozen fixture's row differs from the live board's, trust the
  // FIXTURE and correct these two numbers - the fixture is what the test reads.
  expect(pad?.row).toBe(3)
  expect(pad?.col).toBe(11)
})

test("every part is still movable, so pads were added and nothing was traded away", () => {
  const dump = parseBoardDump(DUMP)
  const movable = movableRefs(dump, DUMP)
  for (const part of dump.parts) {
    if (part.placement === "floating") continue
    expect(movable.some((m) => m.ref === part.ref), part.ref).toBe(true)
  }
  expect(movable.length).toBeGreaterThan(dump.parts.length)
})

test("a ref carried by both a PART line and a PAD line refuses, naming the ref and both kinds", () => {
  const collision = SMALL.replace("PAD SW_2 SW_Rotary", "PAD R1 SW_Rotary")
  const dump = parseBoardDump(collision)
  // THE VERDICT, NOT THE REASONING. The refusal's prose also mentions WIRE and
  // PART, because it cites seed-geometry.ts's twin refusal, so a /PART/ match
  // would pass on the explanation rather than the finding. The discriminating
  // text is the ref plus the two kinds, at the front of the message.
  expect(refusalFrom(() => movableRefs(dump, collision))).toStartWith(
    'movableRefs: the ref "R1" is named by both a PART line and a PAD line on this board',
  )
})

test("two lines of ONE kind read as \"two PAD lines\", not \"both a PAD line and a PAD line\"", () => {
  // THE LIKELIER OF THE TWO COLLISIONS ON A HAND-EDITED .vrt, and the wording
  // that came out of the first version was nonsense for it. The discriminating
  // text is the whole phrase, so a message that reverted to the two-kind
  // template fails here rather than reading oddly in a refusal nobody rereads.
  const twice = SMALL.replace(
    "PAD SW_2 SW_Rotary AT 0,1 FROM SW.2",
    "PAD SW_2 SW_Rotary AT 0,1 FROM SW.2\nPAD SW_2 SW_Rotary AT 0,2 FROM SW.3",
  )
  expect(refusalFrom(() => movableRefs(parseBoardDump(twice), twice))).toStartWith(
    'movableRefs: the ref "SW_2" is named by two PAD lines on this board',
  )
})

test("a FLOATING pad is excluded, because --move refuses a component with no hole to leave", () => {
  const floated = SMALL.replace("AT 0,1 FROM SW.2", "FLOATING FROM SW.2").replace(
    "\nPIN SW_2 1 AT 0,1",
    "",
  )
  const movable = movableRefs(parseBoardDump(floated), floated)
  expect(movable.map((one) => one.ref)).toEqual(["R1"])
})

test("an AT with no readable hole after it refuses rather than moving the pad from 0,0", () => {
  const broken = SMALL.replace("AT 0,1 FROM SW.2", "AT - FROM SW.2")
  const dump = parseBoardDump(broken)
  // `pad-unreadable` is the refusal identifier and it leads the message; the
  // rest of the message is geometry-contract prose that every HC8 refusal
  // shares, so matching on it would not tell this refusal from any other.
  expect(refusalFrom(() => movableRefs(dump, broken))).toStartWith(
    'pad-unreadable: PAD line "PAD SW_2 SW_Rotary AT - FROM SW.2" says AT and then "-"',
  )
})

test("the union is larger than dump.parts by exactly the board's placed PAD lines", () => {
  const dump = parseBoardDump(DUMP)
  const movable = movableRefs(dump, DUMP)
  const pads = movable.filter((one) => one.kind === "pad")
  // The frozen fixture's ten PAD lines, all placed - the measurement
  // tools/stripboard/pad-provenance.ts's module comment records.
  expect(pads.length).toBe(10)
  expect(movable.length).toBe(dump.parts.length + 10)
})

test("the move set now proposes gestures naming a pad, and only the one the fork was measured on", () => {
  // **THE NARROWING IN ISOLATION, ON A BOARD BUILT TO SHOW IT.** The REAL
  // imported board is driven in the test below and is the evidence that the
  // capability works in production; this one exists because it is UNCROWDED, so
  // all four of the pad's one-hole neighbours land and the full candidate list
  // is short enough to write out. On the real board eight of the ten pads are
  // boxed in, which would hide a regression that dropped three of the four
  // deltas.
  const text = [
    "GRID 6 8",
    "BOUNDS 1,1 3,3",
    "VERTICAL_STRIPS 0",
    "CUT_STATE COMPUTED",
    "PART R1 RESISTOR 10K AT 1,1 SPAN 2 DIRECTION W",
    "PAD SW_1 SW_Rotary AT 3,3 FROM SW.1",
    "PIN R1 1 AT 1,1",
    "PIN R1 2 AT 1,2",
    "PIN SW_1 1 AT 3,3",
    "NODE 1 NAME left R1.1",
    "NODE 2 NAME right R1.2 SW_1.1",
    "",
  ].join("\n")
  const dump = parseBoardDump(text)
  const reference: ReferenceNets = new Map([
    ["left", ["R1.1"]],
    ["right", ["R1.2", "SW.1"]],
  ])
  // THE FULL LIST AND NOT A MEMBERSHIP CHECK. The pad sits at 3,3 with room on
  // all four sides, so all four of `UNIT_DELTAS`' neighbours land; the resistor
  // is hand-derived the same way and is here so a regression that dropped the
  // parts to gain the pads fails this too.
  expect(enumerateMoves(occupancyOf(dump), dump, text, reference).map(describeMove)).toEqual([
    "move R1 to 0,1",
    "move R1 to 1,2",
    "move R1 to 2,1",
    "move R1 to 1,0",
    "rotate R1 cw",
    "stretch R1 grow",
    "move SW_1 to 2,3",
    "move SW_1 to 3,4",
    "move SW_1 to 4,3",
    "move SW_1 to 3,2",
  ])
  // AND NO `rotate` OR `stretch` NAMES THE PAD, which is the narrowing stated in
  // tools/stripboard/moves.ts's `partMoves`: `--move` on a pad is measured
  // against the pinned fork, `--rotate` on one is not, and `--stretch` needs a
  // `PART` type a `PAD` line does not carry. A test that only checked the pad's
  // moves were present would pass on a version that proposed all three.
  expect(
    enumerateMoves(occupancyOf(dump), dump, text, reference).filter(
      (move) => (move.kind === "rotate" || move.kind === "stretch") && move.ref === "SW_1",
    ),
  ).toEqual([])
})

test("on the REAL imported board the move set proposes exactly three pad gestures", () => {
  // **THE PRODUCTION CAPABILITY, DRIVEN RATHER THAN INFERRED.** This is the
  // board `--import` leaves and the one the pipeline actually climbs from, and
  // before this change it yielded ZERO gestures naming a pad. It yields three,
  // and the list is asserted EXACTLY so that four or two fails: a membership
  // check would pass on a version that proposed a pad move for every pad.
  //
  // WHY ONLY THREE GESTURES OUT OF TEN PADS, hand-derived from the fixture's
  // own lines rather than read back off the implementation. The ten `PAD` lines
  // sit in ROW 0 at columns 23..32, CONTIGUOUSLY, which is what `--import`'s
  // first-fit sweep leaves. So for every pad the neighbour above is off the
  // board and the neighbours left and right are other pads - except the last
  // pad's right. Measured against the same occupancy the model reads: row 0 is
  // free from column 33 on, and row 1 is free from column 31 on.
  //   SW_LO_BOOST_6 at 0,31   down to 1,31 is free                    -> 1
  //   SW_LO_BOOST_7 at 0,32   right to 0,33 and down to 1,32 are free -> 2
  //   the other eight         boxed in on all four sides              -> 0
  // The figure is a fact about THIS capture and not about the gesture: it is
  // the pad row being packed tight, which is the remedial work Task 2's
  // spacing moves exist to undo.
  const dump = parseBoardDump(IMPORTED)
  const reference = referenceNetsFromExport(NETLIST)
  const moves = enumerateMoves(occupancyOf(dump), dump, IMPORTED, reference)
  const pads = new Set(
    movableRefs(dump, IMPORTED)
      .filter((one) => one.kind === "pad")
      .map((one) => one.ref),
  )
  expect(pads.size, "the imported capture's ten PAD lines are all placed").toBe(10)
  expect(moves.filter((move) => move.kind === "move" && pads.has(move.ref)).map(describeMove))
    .toEqual([
      "move SW_LO_BOOST_6 to 1,31",
      "move SW_LO_BOOST_7 to 0,33",
      "move SW_LO_BOOST_7 to 1,32",
    ])
  // AND NO `rotate` OR `stretch` NAMES A PAD HERE EITHER, which is the
  // narrowing tools/stripboard/moves.ts's `partMoves` states - asserted on the
  // real board and not only on the hand-written one above.
  expect(
    moves.filter(
      (move) =>
        (move.kind === "rotate" || move.kind === "stretch") && pads.has(move.ref),
    ),
  ).toEqual([])
  // The parts are still enumerated, so this is not passing on an empty set.
  expect(moves.length).toBeGreaterThan(3)
})
