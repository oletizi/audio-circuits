/**
 * `movableRefs` - the union of the dump's placed `PART` lines and its placed
 * `PAD` lines, which is what every move generator now enumerates over.
 *
 * The frozen low-boost fixture is the one real board in this repository
 * carrying `PAD` lines, so the happy path reads it. The three refusal and
 * exclusion boards are hand-written dump text for the reason
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
import type { ReferenceNets } from "../../tools/stripboard/equivalence.ts"

const DUMP = fs.readFileSync("tests/fixtures/stripboard/pultec-low-boost-frozen.dump", "utf8")

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
  // THE END-TO-END CLAIM, AND IT CANNOT BE DRIVEN ON THE FROZEN FIXTURE: that
  // capture predates the `DIRECTION` field, so `occupancyOf` refuses it by name
  // (`Part.direction` in tools/guide/dump-model.ts carries why the field is
  // optional on a placed part and why the capture may not be regenerated). So
  // this is a hand-written board with the field present, one resistor and one
  // pad, and `enumerateMoves` is driven over it whole rather than over
  // `movableRefs` alone - a union nothing enumerated would be invisible.
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
