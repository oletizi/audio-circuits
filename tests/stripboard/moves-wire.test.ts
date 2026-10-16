/**
 * THE WIRE ENUMERATION'S NET MEMBERSHIP: that a net's off-board PAD is in it,
 * and what a wire can and cannot do once it is.
 *
 * `./wire.test.ts` holds the PLAN - which hole a wire is created at, how many
 * turns and stretch steps, in which order - on purpose-built boards. This file
 * holds the question `tools/stripboard/moves-wire-nets.ts` was split off for:
 * **which strips does the NETLIST say this net is split across**, on the real
 * low-boost board. The split is the module's, and so is the division of these
 * two files.
 *
 * **WHAT WAS BROKEN, MEASURED BEFORE IT WAS FIXED.**
 * `docs/stripboard/pipeline-verification.md` §12.4 measured that `wireMovesFor`
 * admitted ZERO `add-wire` candidates on the low-boost `import` arm - on the
 * start board, the before board and the after board - and that a 19,997-
 * candidate trace contained no `add-wire` entry at all. All seven still-open
 * nets were shape (b), *no wire plannable*. The cause was a spelling:
 * `netPinsAlongStrips` built its wanted set from the reference netlist, which
 * names a pad's pin `SW_LO_BOOST.3`, and tested it against the `PIN` line's own
 * id, which names it `SW_LO_BOOST_3.1`. Run on this fixture before the fix it
 * answered `j10_p2: {0: [5]}` - the capacitor's pin and not the pad's.
 *
 * **THE TWO BOARDS FACE OPPOSITE WAYS, and that is what makes the pair tight.**
 * A translation that saw a pad is worth nothing if it then invents candidates,
 * and mutation cannot catch a predicate that is too permissive:
 *
 *   - on the COMMITTED imported fixture the three nets are now whole in the
 *     membership sense and still on ONE strip, so there is no pair to bridge and
 *     **no candidate is admitted**;
 *   - on the SPACED board below - the shape Task 2's gesture produces - each of
 *     the three is split across two strips and **a wire is admitted for each**.
 *
 * Every figure is hand-derived from the fixture's own lines, with the derivation
 * beside it.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { referenceNetsFromExport } from "../../tools/stripboard/equivalence.ts"
import { describeMove, type Move } from "../../tools/stripboard/moves-model.ts"
import {
  netPinsAlongStrips,
  wireMovesFor,
} from "../../tools/stripboard/moves-wire-nets.ts"
import { occupancyOf } from "../../tools/stripboard/seed-geometry.ts"

const IMPORTED_TEXT = fs.readFileSync(
  "tests/fixtures/stripboard/pultec-low-boost-imported.dump",
  "utf8",
)
const NETLIST = fs.readFileSync(
  "tests/fixtures/stripboard/pultec-low-boost-frozen.netlist",
  "utf8",
)

const IMPORTED = parseBoardDump(IMPORTED_TEXT)
const REFERENCE = referenceNetsFromExport(NETLIST)

/** The three selector nets Task 3 measured as shape (b), by name. */
const SELECTOR_NETS = ["j10_p2", "j10_p3", "j10_p4"] as const

/**
 * The imported board with the three selector pads spaced onto strips 6, 7 and 8
 * and their capacitors off packed row 0.
 *
 * **IT IS THE SHAPE OF TASK 3'S AFTER BOARD AND NOT A COPY OF IT.** That board
 * was produced inside a 20,000-evaluation run whose candidate directories were
 * pruned (§12.8 records the 3.9 GB), so it is not available to assert against; its
 * reported `BOUNDS 0,0 8,26` say the climb had spread the parts over rows 0 to 8
 * and moved three selector pads onto strips 6, 7 and 8, which is what is
 * reconstructed here from the committed fixture by moving six components:
 *
 *   - `C19` from `0,3` to `4,3`, `C20` from `0,6` to `4,7`, `C21` from `0,9` to
 *     `4,11` - three `CAP_FILM` parts of `SPAN 3`, so each holds three columns
 *     of strip 4 and the three do not touch;
 *   - `SW_LO_BOOST_3` to `6,5`, `SW_LO_BOOST_4` to `7,9` and `SW_LO_BOOST_5` to
 *     `8,13`, each in the column of its own capacitor's far pin.
 *
 * **WHY THE CAPACITORS HAVE TO MOVE TOO - measured, and it is a finding rather
 * than a convenience.** With the pads spaced onto strips 6, 7 and 8 and the
 * capacitors LEFT in row 0, `netPinsAlongStrips` reports the split
 * (`j10_p2: {0: [5], 6: [5]}`), `wireEndLines` offers lines 5, 4 and 6 - and
 * **zero candidates are admitted**, because `--import` packs row 0 from column 0
 * to column 32 and every one of those three holes in row 0 is another part's.
 * `WIRE_END_REACH` is one hole. So pad spacing makes the split VISIBLE and a
 * wire is plannable only once the net's other pin has a free hole beside it:
 * the two conditions are separate and both are required.
 */
const SPACED_TEXT = ((): string => {
  const edits: readonly (readonly [string, string])[] = [
    ["PART C19 CAP_FILM .22uF AT 0,3 SPAN 3", "PART C19 CAP_FILM .22uF AT 4,3 SPAN 3"],
    ["PIN C19 1 AT 0,3", "PIN C19 1 AT 4,3"],
    ["PIN C19 2 AT 0,5", "PIN C19 2 AT 4,5"],
    ["PART C20 CAP_FILM .12uF AT 0,6 SPAN 3", "PART C20 CAP_FILM .12uF AT 4,7 SPAN 3"],
    ["PIN C20 1 AT 0,6", "PIN C20 1 AT 4,7"],
    ["PIN C20 2 AT 0,8", "PIN C20 2 AT 4,9"],
    ["PART C21 CAP_FILM .068uF AT 0,9 SPAN 3", "PART C21 CAP_FILM .068uF AT 4,11 SPAN 3"],
    ["PIN C21 1 AT 0,9", "PIN C21 1 AT 4,11"],
    ["PIN C21 2 AT 0,11", "PIN C21 2 AT 4,13"],
    ["PAD SW_LO_BOOST_3 SW_Rotary AT 0,28", "PAD SW_LO_BOOST_3 SW_Rotary AT 6,5"],
    ["PIN SW_LO_BOOST_3 1 AT 0,28", "PIN SW_LO_BOOST_3 1 AT 6,5"],
    ["PAD SW_LO_BOOST_4 SW_Rotary AT 0,29", "PAD SW_LO_BOOST_4 SW_Rotary AT 7,9"],
    ["PIN SW_LO_BOOST_4 1 AT 0,29", "PIN SW_LO_BOOST_4 1 AT 7,9"],
    ["PAD SW_LO_BOOST_5 SW_Rotary AT 0,30", "PAD SW_LO_BOOST_5 SW_Rotary AT 8,13"],
    ["PIN SW_LO_BOOST_5 1 AT 0,30", "PIN SW_LO_BOOST_5 1 AT 8,13"],
  ]
  let text = IMPORTED_TEXT
  for (const [from, to] of edits) {
    // THE EDIT IS HELD TO THE FIXTURE'S OWN LINES. A `replace` whose pattern is
    // absent silently returns the subject unchanged, which would leave this
    // board quietly equal to the imported one and every assertion below testing
    // nothing.
    if (!text.includes(from)) {
      throw new Error(`pultec-low-boost-imported.dump carries no line "${from}" to move`)
    }
    text = text.replace(from, to)
  }
  return text
})()

const SPACED = parseBoardDump(SPACED_TEXT)

const wireKind = (move: Move): move is Extract<Move, { kind: "add-wire" }> =>
  move.kind === "add-wire"

/** The message a call refused with, or "" when it did not refuse. */
function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

test("a placed pad's hole is in its net, keyed the export's way and not the board's", () => {
  // HAND-DERIVED FROM THE FIXTURE'S OWN LINES. The frozen export's `NODE 3` is
  // `C19.2 SW_LO_BOOST.3`; the dump puts `PIN C19 2 AT 0,5` and
  // `PAD SW_LO_BOOST_3 ... AT 0,28 FROM SW_LO_BOOST.3`. Strips are ROWS
  // (`VERTICAL_STRIPS 0`), so both pins are on strip 0 at columns 5 and 28, and
  // the pad's column is there only through its `FROM` field - its `PIN` line is
  // named `SW_LO_BOOST_3.1`, which the netlist has never heard of.
  //
  // **THE COLUMN IS THE DISCRIMINATING FACT AND THE STRIP IS NOT.** Before the
  // translation this call answered `{0: [5]}` on each of the three: the strip
  // was right and the pad was missing, so an assertion on the strip set alone
  // would have passed against the defect.
  expect([...netPinsAlongStrips(IMPORTED, IMPORTED_TEXT, REFERENCE, "j10_p2")]).toEqual([
    [0, [5, 28]],
  ])
  expect([...netPinsAlongStrips(IMPORTED, IMPORTED_TEXT, REFERENCE, "j10_p3")]).toEqual([
    [0, [8, 29]],
  ])
  expect([...netPinsAlongStrips(IMPORTED, IMPORTED_TEXT, REFERENCE, "j10_p4")]).toEqual([
    [0, [11, 30]],
  ])
})

test("and the imported board still admits no wire, because one strip is not a pair", () => {
  // **THE NEGATIVE HALF, AND IT IS WHY THE TRANSLATION IS NOT A WIDENING.** A
  // wire joins two of a net's segments, so the enumeration needs a PAIR of
  // strips; on the board `--import` produces, every one of these nets has both
  // its pins on strip 0 - the capacitor's at columns 5, 8 and 11 and the pad's
  // at 28, 29 and 30 - split ALONG one strip, where `wireBridge` has nothing to
  // bridge. §12.4's finding that the three nets are repairable is about the board
  // the SPACING gesture produces, and it took both changes.
  expect(
    wireMovesFor(occupancyOf(IMPORTED), IMPORTED, IMPORTED_TEXT, REFERENCE)
      .filter(wireKind)
      .map(describeMove),
  ).toEqual([])
})

test("the spaced board's three selector nets are each split across two strips", () => {
  // HAND-DERIVED FROM THE EDITS ABOVE: `C19.2` moves to `4,5` and its pad to
  // `6,5`, `C20.2` to `4,9` and its pad to `7,9`, `C21.2` to `4,13` and its pad
  // to `8,13`. So each net holds one hole on strip 4 and one on strip 6, 7 or 8
  // - the shape Task 3 measured the gesture creating and the shape a wire
  // repairs.
  expect([...netPinsAlongStrips(SPACED, SPACED_TEXT, REFERENCE, "j10_p2")]).toEqual([
    [4, [5]],
    [6, [5]],
  ])
  expect([...netPinsAlongStrips(SPACED, SPACED_TEXT, REFERENCE, "j10_p3")]).toEqual([
    [4, [9]],
    [7, [9]],
  ])
  expect([...netPinsAlongStrips(SPACED, SPACED_TEXT, REFERENCE, "j10_p4")]).toEqual([
    [4, [13]],
    [8, [13]],
  ])
})

test("each of the three nets then gets an add-wire, and the count is a measurement", () => {
  const wires = wireMovesFor(occupancyOf(SPACED), SPACED, SPACED_TEXT, REFERENCE).filter(wireKind)
  // **A NON-ZERO COUNT AND NOT A PREDICTED ONE.** How many candidates this
  // board admits is a figure this change MEASURES - §12.9 records it - so the
  // assertion is that the generator proposes something at all and that it
  // proposes for each of the three nets by name. A literal total here would be
  // this test asserting the number it was written from.
  expect(wires.length).toBeGreaterThan(0)
  for (const net of SELECTOR_NETS) {
    expect(
      wires.filter((move) => move.net === net).length,
      `${net} is split across two strips and must be offered a wire`,
    ).toBeGreaterThan(0)
  }
  // AND ONE CANDIDATE IS READ IN FULL, because a count cannot tell a repair from
  // a wire landing somewhere absurd. `j10_p2`'s pins are at `4,5` and `6,5`, so
  // `wireEndLines` offers column 5 (cost 0), then 4 and 6 (cost 2 each, ties
  // breaking to the lower line). Column 5 is refused by the occupancy - the
  // wire's own ends would sit ON `C19.2` at `4,5` and on the pad at `6,5` - and
  // column 4 is refused too, being `C19`'s body cell at `4,4` (`SPAN 3` from
  // column 3). Column 6 is free in rows 4, 5 and 6, so the wire spans rows 4 to
  // 6 there, one hole from each of the net's own pins. Strips 4 and 6 are three
  // holes apart, which is exactly a fresh wire's length, so the stretch is zero;
  // strips are rows, so it is turned once; and `turnedRect` of a `1 x 3` at
  // `(r, c)` is a `3 x 1` at `(r - 1, c + 1)`, so it is created at `5,5`.
  expect(wires.filter((move) => move.net === "j10_p2").map(describeMove)).toEqual([
    "add-wire j10_p2 joining 4,6 to 6,6 (at 5,5 as Wire1, 1 turn(s), stretch 0, turn-then-stretch)",
  ])
})

test("a placed pad with no provenance refuses rather than being dropped from its net", () => {
  // THE `NOPROVENANCE` CASE THE PARSER ALREADY MODELS. Such a pad's hole cannot
  // be attributed to any net, and dropping it silently is the SAME defect this
  // function was fixed for: a net that looks whole, a wire that is never
  // proposed, and a board reported as unrepairable for a reason nothing names.
  const stripped = IMPORTED_TEXT.replace(
    "PAD SW_LO_BOOST_3 SW_Rotary AT 0,28 FROM SW_LO_BOOST.3",
    "PAD SW_LO_BOOST_3 SW_Rotary AT 0,28 NOPROVENANCE",
  )
  expect(stripped).not.toBe(IMPORTED_TEXT)
  // THE VERDICT AT THE FRONT OF THE MESSAGE, never a /NOPROVENANCE/ match on
  // the prose that follows it - five times in this repository a regex has
  // matched a refusal's reasoning instead of its verdict.
  expect(
    refusalFrom(() => netPinsAlongStrips(parseBoardDump(stripped), stripped, REFERENCE, "j10_p2")),
  ).toStartWith("netPinsAlongStrips: the placed PAD SW_LO_BOOST_3 says NOPROVENANCE")
})

test("a placed pad with two PIN lines refuses rather than putting one net on two strips", () => {
  // A `PADS<n>` component expands into n ONE-HOLE pads, so a placed pad has
  // exactly one `PIN` line. With the translation in place, a second line would
  // be attributed to the SAME reference pin, so the net would appear split
  // across a strip it is not on and a wire would be planned for a split that
  // does not exist - which is worse than the gate it replaced, and is why this
  // is a refusal rather than a first-line-wins.
  const doubled = IMPORTED_TEXT.replace(
    "PIN SW_LO_BOOST_3 1 AT 0,28",
    "PIN SW_LO_BOOST_3 1 AT 0,28\nPIN SW_LO_BOOST_3 2 AT 6,5",
  )
  expect(doubled).not.toBe(IMPORTED_TEXT)
  expect(
    refusalFrom(() => netPinsAlongStrips(parseBoardDump(doubled), doubled, REFERENCE, "j10_p2")),
  ).toStartWith("netPinsAlongStrips: the placed PAD SW_LO_BOOST_3 has 2 PIN lines on this board")
})

test("a FLOATING pad is left out and is not refused, which is the honest report", () => {
  // A floating pad prints no `PIN` line, so it contributes no hole and has no
  // strip to be on - `./movable.ts`'s own exclusion, and `referencePinHoles`'
  // too, where it is recorded as the honest report: the reference pin then
  // refuses as `reference-pin-not-on-board` in `equivalence.ts`, which names the
  // netlist's own spelling, rather than being absent here under the board's.
  //
  // So `j10_p2` comes back with the capacitor's hole alone, and NOTHING throws.
  const floated = IMPORTED_TEXT.replace(
    "PAD SW_LO_BOOST_3 SW_Rotary AT 0,28 FROM SW_LO_BOOST.3",
    "PAD SW_LO_BOOST_3 SW_Rotary FLOATING FROM SW_LO_BOOST.3",
  ).replace("PIN SW_LO_BOOST_3 1 AT 0,28\n", "")
  expect(floated).not.toBe(IMPORTED_TEXT)
  const dump = parseBoardDump(floated)
  expect([...netPinsAlongStrips(dump, floated, REFERENCE, "j10_p2")]).toEqual([[0, [5]]])
})
