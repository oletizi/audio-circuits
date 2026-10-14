/**
 * The SPACING GESTURE: a pad moved out of a packed row, and the measure that
 * decides whether there is anything to space.
 *
 * **THE TWO BOARDS FACE OPPOSITE WAYS AND BOTH ARE REAL.** A generator that
 * proposes unconditionally is as useless as one that never proposes, so the
 * contiguous case and the already-spaced case are asserted separately:
 *
 *   - `tests/fixtures/stripboard/pultec-low-boost-imported.dump` is what
 *     `--import` leaves - ten `PAD` lines in row 0 at columns 23..32,
 *     contiguously - and it is the board the pipeline actually climbs from.
 *     The gesture must fire on it.
 *   - `tests/fixtures/stripboard/pultec-low-boost-frozen.dump` is the OWNER'S
 *     OWN hand layout, whose `SW_LO_BOOST` row sits on strip 3 at columns 11,
 *     14, 17, 20, 23 and 26. The gesture must fire on nothing there.
 *
 * **THE SECOND BOARD IS WHY `spacingGestures` TAKES NO `Occupancy`, and it is a
 * measured reason rather than a convenience.** `occupancyOf` cannot read the
 * hand layout at all: re-dumped with the pinned binary it prints
 * `DIRECTION S` on six of its eight parts and `DIRECTION N` on the seventh, and
 * `occupancyOf` refuses a part across the strips by name - *"for a part across
 * the strips SPAN is its footprint's ROW count while its column extent ...
 * appears in no dump line"*. So the one board that proves the gesture STOPS
 * proposing is a board no occupancy can be read from, and a measure that needed
 * one could not be asserted against it. `spacingMoves` is where the occupancy
 * joins in, and it is asserted on the imported board below.
 *
 * THE MEASURE LIVES IN `tools/stripboard/moves-space-measure.ts` and the
 * generators in `tools/stripboard/moves-space.ts`, which re-exports it; one test
 * file covers the pair, because the two opposite-facing board assertions below
 * are about the measure and the generator TOGETHER and splitting them would put
 * half of each question in each file.
 *
 * **THE MUTATIONS RUN AGAINST THESE TESTS, RECORDED SO THE RESULT IS NOT
 * RE-DERIVED.** Three, on 2026-10-13:
 *
 *   - `>=` to `>` in the strict-reduction guard (so an EQUAL destination is
 *     proposed): three tests fail, including the already-spaced one. The guard
 *     has teeth.
 *   - the `copper.has(key)` guard removed: the occupied-destination test fails
 *     and nothing else does. It is the only test holding that condition, and it
 *     holds it.
 *   - an `if (standing === 0) continue` early exit removed: **NOTHING failed**,
 *     which is why that line is no longer in the module. It was a second
 *     spelling of the strict comparison, and a guard a mutation survives proves
 *     nothing. `tools/stripboard/moves-space.ts` carries the removal and what it
 *     costs.
 *
 * Mutation cannot catch a predicate that is too PERMISSIVE - it proves a check
 * exists, not that it is tight - which is why the two board tests face opposite
 * ways and why the measure itself is asserted per pad below.
 *
 * THE NETLIST IS THE FROZEN EXPORT FOR BOTH BOARDS, which is `movable.test.ts`'
 * own arrangement and its stated reason: a `ReferenceNets` is derived from the
 * SCHEMATIC and not from a board, both fixtures are the same low-boost circuit,
 * and the imported dump's own fourteen `NODE` lines all read `NAME -`.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { referenceNetsFromExport } from "../../tools/stripboard/equivalence.ts"
import { movableRefs } from "../../tools/stripboard/movable.ts"
import { occupancyAfter } from "../../tools/stripboard/moves-advance.ts"
import { describeMove } from "../../tools/stripboard/moves-model.ts"
import { padAbutments, spacingGestures, spacingMoves } from "../../tools/stripboard/moves-space.ts"
import { occupancyOf } from "../../tools/stripboard/seed-geometry.ts"

const IMPORTED_TEXT = fs.readFileSync(
  "tests/fixtures/stripboard/pultec-low-boost-imported.dump",
  "utf8",
)
const FROZEN_TEXT = fs.readFileSync(
  "tests/fixtures/stripboard/pultec-low-boost-frozen.dump",
  "utf8",
)
const NETLIST = fs.readFileSync(
  "tests/fixtures/stripboard/pultec-low-boost-frozen.netlist",
  "utf8",
)

const IMPORTED = parseBoardDump(IMPORTED_TEXT)
const FROZEN = parseBoardDump(FROZEN_TEXT)
const REFERENCE = referenceNetsFromExport(NETLIST)

/** Every hole the imported dump states a `PIN` on - what "free" is measured against. */
const IMPORTED_PIN_HOLES = new Set(
  Object.values(IMPORTED.pins).flatMap((own) => own.map((pin) => `${pin.row},${pin.col}`)),
)

/** The message a call refused with, or "" when it did not refuse. */
function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

test("a contiguous pad row yields a spacing gesture naming one pad and a free hole", () => {
  const candidates = spacingGestures(IMPORTED, IMPORTED_TEXT, REFERENCE)
  expect(candidates.length, "a contiguous row has somewhere to go").toBeGreaterThan(0)
  const first = candidates[0]
  // IT NAMES A PAD AND NOT A PART, asserted by MEMBERSHIP IN THE PAD SET rather
  // than by a /^SW_/ regex on the ref. The brief's sketch used that regex and it
  // would have been testing the DUMP'S ORDER instead of the gesture: the first
  // of the ten `PAD` lines is `RV_LO_BOOST_1`, so /^SW_/ fails here for a
  // perfectly correct generator, and passes for one that happened to enumerate
  // the selector first. `movableRefs`' own `kind` field is the discriminating
  // fact.
  const pads = new Set(
    movableRefs(IMPORTED, IMPORTED_TEXT).filter((one) => one.kind === "pad").map((one) => one.ref),
  )
  expect(first, "the list is not empty").toBeDefined()
  expect(pads.has(first?.ref ?? ""), `${first?.ref ?? ""} is a pad`).toBe(true)
  // AND THE DESTINATION IS A FREE HOLE. `--move` refuses an occupied one, so a
  // candidate naming one wastes an evaluation and could never apply.
  expect(IMPORTED_PIN_HOLES.has(`${first?.to[0] ?? -1},${first?.to[1] ?? -1}`)).toBe(false)
})

test("every proposed destination is a hole the dump states no PIN on", () => {
  // THE WHOLE LIST AND NOT ONLY ITS HEAD. A generator that got the first
  // candidate right and then walked over the pad row itself would pass the test
  // above.
  const occupied = spacingGestures(IMPORTED, IMPORTED_TEXT, REFERENCE).filter((move) =>
    IMPORTED_PIN_HOLES.has(`${move.to[0]},${move.to[1]}`),
  )
  expect(occupied.map(describeMove)).toEqual([])
})

test("no spacing gesture names a one-hole neighbour, so nothing is in the sweep twice", () => {
  // `./moves.ts`' `partMoves` already proposes all four unit deltas for a pad,
  // so a spacing gesture naming one would spend a second evaluation on a
  // byte-identical candidate. THE OVERLAP IS REAL ON THIS BOARD AND NOT
  // HYPOTHETICAL: `move SW_LO_BOOST_7 to 0,33` is both the pad's right-hand unit
  // delta and the first free hole on its own strip, so it is named here as the
  // worked case rather than left to the distance check below.
  const holes = new Map(
    movableRefs(IMPORTED, IMPORTED_TEXT).map((one) => [one.ref, one] as const),
  )
  const candidates = spacingGestures(IMPORTED, IMPORTED_TEXT, REFERENCE)
  expect(
    candidates.filter((move) => describeMove(move) === "move SW_LO_BOOST_7 to 0,33"),
  ).toEqual([])
  const adjacent = candidates.filter((move) => {
    const from = holes.get(move.ref)
    if (from === undefined) return false
    return Math.abs(move.to[0] - from.row) + Math.abs(move.to[1] - from.col) <= 1
  })
  expect(adjacent.map(describeMove)).toEqual([])
})

test("the owner's own spaced pad row yields nothing, so the gesture is not proposed forever", () => {
  // THE HAND-LAID FIXTURE: strip 3, columns 11/14/17/20/23/26 for the selector,
  // and the three pot terminals at 5,28 / 9,3 / 10,3. Measured from the
  // committed capture's own `PAD` lines.
  expect(spacingGestures(FROZEN, FROZEN_TEXT, REFERENCE)).toEqual([])
})

test("the hand layout has no different-net abutment on any pad, which is why it yields nothing", () => {
  // **THE DISCRIMINATING FACT BEHIND THE TEST ABOVE, ASSERTED DIRECTLY.** An
  // empty list is agreement with many wrong implementations - one that reads no
  // pads at all would pass it - so the measure the guard reads is held here too.
  // Hand-derived from the fixture: each of the owner's selector pads sits two
  // holes or one hole from the capacitor pin on ITS OWN net (C18.2/j10_p1 at
  // 3,9 beside SW_LO_BOOST_2 at 3,11; C19.2/j10_p2 at 3,13 beside
  // SW_LO_BOOST_3 at 3,14; and so on), and no two different nets are ever in
  // adjacent holes on one strip.
  const measured = padAbutments(FROZEN, FROZEN_TEXT, REFERENCE)
  expect([...measured.keys()].sort()).toEqual([
    "RV_LO_BOOST_1",
    "RV_LO_BOOST_2",
    "RV_LO_BOOST_3",
    "SW_LO_BOOST_1",
    "SW_LO_BOOST_2",
    "SW_LO_BOOST_3",
    "SW_LO_BOOST_4",
    "SW_LO_BOOST_5",
    "SW_LO_BOOST_6",
    "SW_LO_BOOST_7",
  ])
  expect([...measured.values()]).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
})

test("the imported row's abutments are the packing --import left, counted per pad", () => {
  // **HAND-DERIVED FROM THE FIXTURE'S OWN LINES**, so a measure that read its
  // answer off the implementation fails. Row 0 of the imported capture, with
  // each hole's net from the frozen export (a pad's through its `FROM` field):
  //   22 lo_boost_in (R2)   23 "0" (RV_1)   24 lo_boost_in (RV_2)
  //   25 lo_boost_in (RV_3) 26 lo_boost_in (SW_1)   27 j10_p1 (SW_2)
  //   28 j10_p2 (SW_3)      29 j10_p3 (SW_4)        30 j10_p4 (SW_5)
  //   31 j10_p5 (SW_6)      32 j10_p6 (SW_7)
  // So RV_1 abuts a different net on BOTH sides (2); RV_3 abuts `lo_boost_in`
  // on both sides, which is its OWN net, so it abuts nothing (0); and every
  // other pad has one or two.
  const measured = padAbutments(IMPORTED, IMPORTED_TEXT, REFERENCE)
  expect(Object.fromEntries(measured)).toEqual({
    RV_LO_BOOST_1: 2,
    RV_LO_BOOST_2: 1,
    RV_LO_BOOST_3: 0,
    SW_LO_BOOST_1: 1,
    SW_LO_BOOST_2: 2,
    SW_LO_BOOST_3: 2,
    SW_LO_BOOST_4: 2,
    SW_LO_BOOST_5: 2,
    SW_LO_BOOST_6: 2,
    SW_LO_BOOST_7: 1,
  })
})

test("a pad the measure says abuts nothing is named by no gesture at all", () => {
  // `RV_LO_BOOST_3` sits between two holes of its OWN net on the imported
  // board, so no destination can lower its count and the guard must leave it
  // out. **THIS IS THE ALREADY-SPACED GUARD ASSERTED ON THE BOARD WHERE THE
  // GESTURE DOES FIRE**, which the frozen fixture cannot do: there every pad is
  // quiet, so an implementation that proposed for a quiet pad whenever ANY pad
  // was loud would still pass that test.
  const named = new Set(
    spacingGestures(IMPORTED, IMPORTED_TEXT, REFERENCE).map((move) => move.ref),
  )
  expect(named.has("RV_LO_BOOST_3")).toBe(false)
  expect(named.has("SW_LO_BOOST_4"), "and the loud pads are still named").toBe(true)
})

test("spacingMoves narrows to one destination per pad and strip, and the count is 315", () => {
  const occupancy = occupancyOf(IMPORTED)
  const moves = spacingMoves(occupancy, IMPORTED, IMPORTED_TEXT, REFERENCE)
  // **315 IS HAND-DERIVED AND WRITTEN AS A LITERAL**, which is
  // `tests/stripboard/moves.test.ts`' own rule: nothing here is
  // `expect(x).toBe(<the expression that computed x>)`. Nine of the ten pads
  // abut another net (`RV_LO_BOOST_3` sits between two holes of its own net);
  // the dump's `GRID 35 35` under `VERTICAL_STRIPS 0` makes 35 strips, one per
  // row; and every strip offers at least one free hole whose strip-neighbours
  // are clear - columns 33, 31 and 23 on rows 0, 1 and 2, past where the parts
  // and pads end, and column 0 on each of rows 3..34, which `--import` left
  // empty. So 9 x 35.
  expect(moves.length).toBe(315)
  const keys = moves.map((move) => `${move.ref}@${move.to[0]}`)
  expect(new Set(keys).size, "no (pad, strip) pair twice").toBe(keys.length)
  // THE FIRST THREE DESTINATIONS SPELLED OUT, so a regression that narrowed to
  // the empty rows alone - losing the in-row spacing the gesture is named for -
  // fails here rather than passing on a count.
  expect(moves.slice(0, 4).map(describeMove)).toEqual([
    "move RV_LO_BOOST_1 to 0,33",
    "move RV_LO_BOOST_1 to 1,31",
    "move RV_LO_BOOST_1 to 2,23",
    "move RV_LO_BOOST_1 to 3,0",
  ])
  // EVERY SURVIVOR LANDS, which is the whole reason the occupancy is consulted:
  // a candidate the fork would refuse is an evaluation spent on nothing. This
  // re-asks the one advance rather than trusting the filter that used it.
  for (const move of moves) {
    expect(
      occupancyAfter(occupancy, IMPORTED, move),
      describeMove(move),
    ).not.toBeUndefined()
  }
})

test("a placed pad with more than one PIN line refuses rather than picking one hole", () => {
  // A `PADS<n>` expands into n ONE-HOLE pads, so a placed pad has exactly one
  // `PIN` line - the fact `tools/stripboard/pad-provenance.ts` records and this
  // module's measure rests on. A second line would make "the pad's hole"
  // ambiguous, and the abutment count is computed AT that hole.
  const doubled = IMPORTED_TEXT.replace(
    "PIN SW_LO_BOOST_4 1 AT 0,29",
    "PIN SW_LO_BOOST_4 1 AT 0,29\nPIN SW_LO_BOOST_4 2 AT 0,33",
  )
  expect(doubled).not.toBe(IMPORTED_TEXT)
  const dump = parseBoardDump(doubled)
  // THE VERDICT AT THE FRONT OF THE MESSAGE, never a /PAD/ match on the prose
  // that follows it.
  expect(refusalFrom(() => padAbutments(dump, doubled, REFERENCE))).toStartWith(
    "padAbutments: the placed PAD SW_LO_BOOST_4 has 2 PIN lines on this board",
  )
})
