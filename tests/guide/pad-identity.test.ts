import { test, expect } from "bun:test"
import { PIN_PATTERNS } from "../../lib/kicad/pin-pattern.ts"
import { pinId, pinIdParts } from "../../lib/stripboard/pin-id.ts"
import { OFF_BOARD_TERMINAL } from "../../lib/stripboard/board.ts"
import { candidateFromDump } from "../../tools/stripboard/vero-import.ts"
import { layoutDocument } from "../../tools/stripboard/vero-export.ts"
import { holeName, parseBoardDump } from "../../tools/guide/dump.ts"
import { placedPads } from "../../tools/guide/pads.ts"
import { renderLayout } from "../../tools/guide/render.ts"
import { attr, elements, holeCentre, num } from "./svg-query.ts"
import {
  COMMITTED_BOARDS,
  dumpTextOf,
  footprintsOf,
  referenceOf,
  refusalFrom,
  type CommittedBoard,
} from "../stripboard/vero-import-fixtures.ts"

/**
 * Task 2: a landing pad keeps its identity - component AND terminal - all the
 * way from a dump, through the model, to a layout document.
 *
 * **WHY IT IS IN `tests/guide/`.** The plan put it beside Task 1's file, and
 * that is where the third side of the round trip is: the wiring guide reads a
 * pad through `tools/guide/pads.ts`, and the identity it reads has to be the
 * same string the exporter writes. The importer and the exporter are asserted
 * board-by-board in `tests/stripboard/vero-import.test.ts`; what is new here is
 * the pair being held together across all three.
 *
 * **THE CASE THE SPEC NAMES.** `RV_LO_BOOST` is one potentiometer with three
 * terminals, and the fork expands it into three one-hole pads with board names
 * of its own invention (`RV_LO_BOOST_1`, `_2`, `_3`). Those invented names are
 * exactly what must NOT propagate: the owner ref off each `PAD` line's
 * `FROM <ref>.<pin>` field is the component, and the pin is the terminal.
 *
 * **EVERY EXPECTATION BELOW COMES OFF THE FIXTURE, NOT OFF THE CODE.** The refs
 * and pins asserted are read from the frozen dump's own `FROM` fields, so a
 * derivation that agreed with itself and disagreed with the board would fail
 * rather than pass.
 */

function boardNamed(name: string): CommittedBoard {
  const found = COMMITTED_BOARDS.find((board) => board.name === name)
  if (found === undefined) throw new Error(`no committed board named "${name}"`)
  return found
}

const FROZEN = boardNamed("pultec-low-boost-frozen")

/**
 * The frozen low-boost dump without its terminal block, which
 * `tests/stripboard/vero-import.test.ts` measures as the one part of that board
 * the importer cannot read - a Phoenix block with no recorded pin pattern and no
 * recorded lead span. Its `SOLDER` line goes with it because
 * `board_terminals.1` is the only contact in either of that bridge's holes.
 *
 * The unedited file is asserted to refuse in that file, so this edit cannot make
 * a refusal disappear unnoticed, and nothing here widens a table to make a part
 * fit.
 */
const TERMINAL_BLOCK_LINES: readonly string[] = [
  "PART board_terminals BLOCK_200MIL3 Conn_01x03 AT 4,5 SPAN 3",
  "PIN board_terminals 1 AT 9,6",
  "PIN board_terminals 2 AT 7,6",
  "PIN board_terminals 3 AT 5,6",
  "SOLDER 9,6 10,6",
]

function frozenText(): string {
  const lines = dumpTextOf(FROZEN).split("\n")
  const kept = lines.filter((line) => !TERMINAL_BLOCK_LINES.includes(line.trim()))
  if (kept.length !== lines.length - TERMINAL_BLOCK_LINES.length) {
    throw new Error(
      `${TERMINAL_BLOCK_LINES.length} lines were named for removal from the frozen low-boost dump ` +
        `and ${lines.length - kept.length} matched; the fixture has moved`,
    )
  }
  return kept.join("\n")
}

const TEXT = frozenText()

/** Every `FROM <ref>.<pin>` the fixture itself prints, in the fixture's order. */
function fixtureProvenance(): readonly string[] {
  return TEXT.split("\n")
    .filter((line) => line.trim().startsWith("PAD "))
    .map((line) => {
      const fields = line.trim().split(/\s+/)
      const from = fields.indexOf("FROM")
      const source = fields[from + 1]
      if (from === -1 || source === undefined) {
        throw new Error(`the frozen low-boost dump has a PAD line with no FROM field: "${line}"`)
      }
      return source
    })
}

/** The `PAD <identity> AT <hole>` lines of the document the exporter writes. */
function exportedPads(): readonly string[] {
  const reference = referenceOf(FROZEN)
  const candidate = candidateFromDump(TEXT, reference, footprintsOf(FROZEN), PIN_PATTERNS)
  return layoutDocument(candidate, reference)
    .split("\n")
    .filter((line) => line.startsWith("PAD "))
}

/** The identity field of a `PAD` statement - the whole of it, never half. */
function identityOf(line: string): string {
  const identity = line.split(/\s+/)[1]
  if (identity === undefined) throw new Error(`a PAD statement with no identity field: "${line}"`)
  return identity
}

/** The component half of a `PAD` statement's identity, through the one split. */
function refOf(line: string): string {
  const parts = pinIdParts(identityOf(line))
  if (parts === undefined) {
    throw new Error(
      `the exported statement "${line}" does not carry a <ref>.<pin> identity, so the component ` +
        "it belongs to cannot be read back out of it",
    )
  }
  return parts.ref
}

test("three pads of one pot round-trip with their terminals distinct", () => {
  const pads = exportedPads().filter((line) => identityOf(line).startsWith("RV_LO_BOOST."))
  expect(pads.length, "the premise: this board has a three-terminal panel pot").toBe(3)
  const identities = new Set(pads.map(identityOf))
  expect(identities.size, "three terminals, three identities").toBe(3)
  expect(new Set(pads.map(refOf)).size, "and one component reference").toBe(1)
  // AND THE REFERENCE IS THE ONE THE BOARD NAMES, not merely a single value: a
  // derivation that collapsed all three onto the fork's invented RV_LO_BOOST_1
  // would also report one ref.
  expect([...new Set(pads.map(refOf))], "the pot's own reference").toEqual(["RV_LO_BOOST"])
})

test("every pad the board prints is exported under the identity its FROM field names", () => {
  const expected = fixtureProvenance()
  // Asserted FIRST: an empty provenance list would make the comparison below
  // pass over nothing, which is the shape of every vacuous check.
  expect(expected.length, "the premise: the frozen low-boost prints PAD lines with provenance").toBe(10)
  const pads = exportedPads()
  expect(pads.length, "one PAD statement per PAD line").toBe(expected.length)
  // SORTED, because the document's pad order is the dump's own and the point
  // here is the SET of identities rather than their sequence.
  expect([...pads.map(identityOf)].sort(), "the identities are the dump's own FROM fields").toEqual(
    [...expected].sort(),
  )
  // TWO COMPONENTS, TEN TERMINALS: the invented per-pad refs (RV_LO_BOOST_1 ..
  // SW_LO_BOOST_7) would make this ten.
  expect(new Set(pads.map(refOf)).size, "ten terminals of two components").toBe(2)
})

test("the imported pad placement and the exported statement agree on both halves", () => {
  const reference = referenceOf(FROZEN)
  const candidate = candidateFromDump(TEXT, reference, footprintsOf(FROZEN), PIN_PATTERNS)
  const pads = candidate.placements.filter((placement) => placement.footprint === OFF_BOARD_TERMINAL)
  expect(pads.length, "the premise: the frozen low-boost imports ten pads").toBe(10)
  const fromPlacements = pads
    .map((placement) => {
      const entries = [...placement.pins]
      expect(entries.length, `the pad on "${placement.ref}" carries one pin`).toBe(1)
      const only = entries[0]
      if (only === undefined) throw new Error(`no pin on the pad placement for "${placement.ref}"`)
      return pinId(placement.ref, only[0])
    })
    .sort()
  expect(fromPlacements, "the placement's own ref and pin re-form the exported identity").toEqual(
    [...exportedPads().map(identityOf)].sort(),
  )
})

test("the guide reads each pad under the same identity, and keeps the hole the dump gives it", () => {
  const pads = placedPads(TEXT)
  expect(pads.length, "the premise: the guide sees ten placed pads").toBe(10)
  expect([...pads.map((pad) => pad.identity)].sort(), "the guide's identities are the exporter's").toEqual(
    [...exportedPads().map(identityOf)].sort(),
  )
  // THE HOLE COMES FROM THE PAD LINE AND IS ASSERTED AGAINST THE FIXTURE'S OWN
  // TEXT: a guide that read the identity correctly and the hole from somewhere
  // else would draw a terminal in the wrong place.
  const wiper = pads.find((pad) => pad.identity === "RV_LO_BOOST.1")
  expect(wiper, "RV_LO_BOOST.1 is one of them").toBeDefined()
  expect({ row: wiper?.row, col: wiper?.col }, "at the hole its PAD line names").toEqual({ row: 5, col: 28 })
  expect(new Set(pads.map((pad) => pad.ref)).size, "ten terminals of two components").toBe(2)
})

test("the drawn board shows every pad, each under its own identity and its own checkbox", () => {
  const dump = parseBoardDump(TEXT)
  const pads = placedPads(TEXT)
  const labels = new Map(dump.parts.map((part) => [part.ref, part.ref]))
  const svg = renderLayout(dump, labels, {
    view: "component",
    title: "pultec low boost - pads",
    edgeLabels: [],
    pads,
  })
  // ONE RING PER PAD, counted off the drawing rather than off the input.
  expect(elements(svg, "circle", "pad-body").length, "a ring over every pad's hole").toBe(10)
  // AND A CHECKBOX PER PAD, each naming a DIFFERENT terminal. Keyed by the ref
  // alone there would be two: three pads of RV_LO_BOOST and seven of
  // SW_LO_BOOST, with the builder given two boxes for ten wires.
  const boxes = elements(svg, "rect", "checkbox")
    .map((element) => attr(element, "data-for"))
    .filter((forWhat) => forWhat.startsWith("pad:"))
  expect(new Set(boxes).size, "one checkbox per terminal, not one per component").toBe(10)
  expect([...new Set(boxes)].sort(), "each names its own terminal").toEqual(
    [...pads.map((pad) => `pad:${pad.identity}`)].sort(),
  )
  // THE IDENTITY IS ON THE SHEET, because it is what a builder matches against
  // the schematic to know which wire goes in which hole.
  for (const identity of ["RV_LO_BOOST.1", "RV_LO_BOOST.2", "RV_LO_BOOST.3"]) {
    expect(svg, `${identity} is printed`).toContain(`>${identity}<`)
  }
  // AND THE SUMMARY SAYS HOW MANY, so a board whose pads went missing again
  // would say so in the header rather than saying nothing.
  // Seven parts, not eight: `frozenText` removes the terminal block, for the
  // reason its own comment gives.
  expect(svg, "the header counts them").toContain("7 parts, 10 off-board pads,")
  // THE RING IS OVER THE HOLE THE PAD LINE NAMES. `holeCentre` reads the drawn
  // hole out of the same image, so this compares the drawing with itself in the
  // one way that can disagree: ring position against hole position.
  const wiper = pads.find((pad) => pad.identity === "RV_LO_BOOST.1")
  if (wiper === undefined) throw new Error("RV_LO_BOOST.1 is not among the pads")
  const centre = holeCentre(svg, holeName(wiper.row, wiper.col))
  const ring = elements(svg, "circle", "pad-body").find(
    (element) => num(element, "cx") === centre.x && num(element, "cy") === centre.y,
  )
  expect(ring, `a ring centred on ${holeName(wiper.row, wiper.col)}`).toBeDefined()
})

test("a pin id's two halves survive being joined and split, and an unusable half refuses", () => {
  // THE PROPERTY, over the shapes a real board produces: a numbered terminal, a
  // named one, and a ref that itself contains a dot (an --import run invents
  // them, and tools/stripboard/moves-cluster.ts records one).
  for (const [ref, pin] of [
    ["RV_LO_BOOST", "1"],
    ["SW_LO_BOOST", "7"],
    ["SI_HI_BOOST_RV_HI_BOOST.ccw-wiper", "1"],
  ] as const) {
    expect(pinIdParts(pinId(ref, pin)), `${ref} / ${pin}`).toEqual({ ref, pin })
  }
  // AND THE REFUSALS, each asserted at the FRONT of the message: these carry
  // paragraphs that mention the words a loose match would find.
  expect(refusalFrom(() => pinId("", "1"))).toStartWith("stripboard-pin-id-no-ref: ")
  expect(refusalFrom(() => pinId("RV_LO_BOOST", ""))).toStartWith("stripboard-pin-id-no-pin: ")
  expect(refusalFrom(() => pinId("RV_LO_BOOST", "a.b"))).toStartWith("stripboard-pin-id-dotted-pin: ")
  // Not a pin id at all, and the caller is the one that refuses - see the
  // function's comment for why that line is drawn there.
  expect(pinIdParts("RV_LO_BOOST"), "no dot").toBeUndefined()
  expect(pinIdParts(".1"), "no ref").toBeUndefined()
  expect(pinIdParts("RV_LO_BOOST."), "no pin").toBeUndefined()
})
