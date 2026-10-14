/**
 * Every committed board, through `candidateFromDump`, asserted BOARD BY BOARD.
 *
 * **ONE TEST PER BOARD AND NEVER AN AGGREGATE.** A loop that counted how many
 * of the seven imported would hide which one broke, and which one broke is the
 * only thing a reader of this file wants to know. So each board declares its own
 * outcome below and gets its own named test.
 *
 * **THE OUTCOMES ARE MEASURED AND THEY ARE NOT ALL SUCCESSES.** Two of the seven
 * import - `transistor-preamp-feedback`, which the owner laid out and BUILT, and
 * `transistor-preamp-loop`, which he laid out and did not build. The other five
 * refuse, each for a reason that is a finding rather than a defect in this
 * adapter:
 *
 *   - `pt2399-core` and `transistor-preamp-staged` fit parts whose footprints
 *     have no recorded pin pattern at all (`C_Disc_D5.0mm`,
 *     `CP_Radial_D5.0mm_P2.50mm`, `CP_Radial_D10.0mm_P5.00mm`,
 *     `PinHeader_1x03`), so there are no pads to put on holes.
 *   - both low-boost dumps carry `PAD` lines - VeroRoute's expansion of an
 *     off-board part's terminals - which the `Candidate` model has no
 *     vocabulary for.
 *   - `transistor-preamp-buffered`, the owner's OTHER built board, imports
 *     every one of its 21 parts and all four of its wires and refuses on ONE of
 *     its six solder bridges: `SOLDER 13,21 14,21` joins two holes that hold no
 *     pin and no wire end, and a `SOLDER` line carries no node id, so nothing in
 *     the dump says what net that bridge carries. The test below proves that it
 *     is the only thing standing in the way, by importing the same board with
 *     that one line removed.
 *
 * **NO CUT IS ASSERTED ANYWHERE IN THIS FILE.** Cuts do not exist in the model
 * yet; this task runs before the one that derives them, so that the differential
 * test there has one converter to use rather than a throwaway second one.
 */
import { expect, test } from "bun:test"
import { geometryOf, holesOverlap, type Candidate } from "../../lib/stripboard/board.ts"
import { PIN_PATTERNS } from "../../lib/kicad/pin-pattern.ts"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { candidateFromDump } from "../../tools/stripboard/vero-import.ts"
import {
  COMMITTED_BOARDS,
  dumpTextOf,
  footprintsOf,
  referenceOf,
  refusalFrom,
  type CommittedBoard,
} from "./vero-import-fixtures.ts"

/** What each committed board does, measured: it imports, or it refuses with this key and names this. */
const OUTCOMES: Readonly<Record<string, { readonly key: string; readonly names: string } | "imports">> = {
  "pt2399-core": { key: "vero-import-no-geometry", names: '"C1"' },
  "pultec-low-boost-frozen": { key: "vero-import-pad-line", names: '"RV_LO_BOOST_1"' },
  "pultec-low-boost-imported": { key: "vero-import-pad-line", names: '"RV_LO_BOOST_1"' },
  "transistor-preamp-buffered": { key: "vero-import-bridge-net-unknown", names: "SOLDER 13,21 14,21" },
  "transistor-preamp-feedback": "imports",
  "transistor-preamp-loop": "imports",
  "transistor-preamp-staged": { key: "vero-import-no-geometry", names: '"C7"' },
}

function importOf(board: CommittedBoard, dumpText: string = dumpTextOf(board)): Candidate {
  return candidateFromDump(dumpText, referenceOf(board), footprintsOf(board), PIN_PATTERNS)
}

function boardNamed(name: string): CommittedBoard {
  const found = COMMITTED_BOARDS.find((board) => board.name === name)
  if (found === undefined) throw new Error(`no committed board named "${name}"`)
  return found
}

for (const board of COMMITTED_BOARDS) {
  const outcome = OUTCOMES[board.name]
  if (outcome === undefined) throw new Error(`no declared outcome for "${board.name}"`)
  if (outcome === "imports") {
    test(`${board.name} imports, and its grid is the dump's own`, () => {
      const dump = parseBoardDump(dumpTextOf(board))
      const candidate = importOf(board)
      expect(candidate.grid, board.name).toEqual({ strips: dump.grid.rows, columns: dump.grid.cols })
    })
    continue
  }
  test(`${board.name} refuses, naming ${outcome.names}`, () => {
    const message = refusalFrom(() => importOf(board))
    // THE KEY IS ASSERTED AT THE FRONT OF THE MESSAGE. These refusals carry
    // paragraphs of explanation that mention the words a loose match would
    // find, so a regex over the whole message would be matching the reasoning
    // rather than the verdict.
    expect(message, board.name).toStartWith(`${outcome.key}: `)
    expect(message, `${board.name} names the component it refused`).toContain(outcome.names)
  })
}

/**
 * The faithfulness assertions, over the boards that import.
 *
 * `buffered` is here through the one-line edit its own refusal test describes:
 * the dump with `SOLDER 13,21 14,21` removed. That is this file manipulating a
 * copy of a fixture's TEXT, which is the only way to assert that the other
 * twenty-one parts, four wires and five bridges of the owner's second built
 * board do import - and the unedited file is asserted to refuse above, so the
 * edit cannot make the refusal disappear unnoticed.
 */
const FAITHFUL: readonly (readonly [string, string | null])[] = [
  ["transistor-preamp-feedback", null],
  ["transistor-preamp-loop", null],
  ["transistor-preamp-buffered", "SOLDER 13,21 14,21"],
]

function textFor(board: CommittedBoard, without: string | null): string {
  const text = dumpTextOf(board)
  if (without === null) return text
  const lines = text.split("\n")
  const kept = lines.filter((line) => line.trim() !== without)
  if (kept.length !== lines.length - 1) {
    throw new Error(`"${without}" is not one line of ${board.name}'s dump; the fixture has moved`)
  }
  return kept.join("\n")
}

for (const [name, without] of FAITHFUL) {
  const board = boardNamed(name)

  test(`${name}: every PART line is a placement, at the hole its own pin 1 is in`, () => {
    const text = textFor(board, without)
    const dump = parseBoardDump(text)
    const candidate = importOf(board, text)
    expect(candidate.placements.map((placement) => placement.ref), name).toEqual(
      dump.parts.map((part) => part.ref),
    )
    const footprints = footprintsOf(board)
    for (const placement of candidate.placements) {
      const pins = dump.pins[placement.ref] ?? []
      const first = pins.find((pin) => pin.pin === "1")
      expect(first, `${name} ${placement.ref} has a PIN 1 line`).toBeDefined()
      // THE ORIGIN IS THE HOLE THE FOOTPRINT'S OWN (0,0) LANDS ON, which for
      // all thirteen recorded footprints is pad 1's centre - asserted in
      // tests/kicad/footprint-extent.test.ts, not assumed here. The dump's own
      // `AT` field is NOT that hole: it is VeroRoute's element-grid corner,
      // which is a fact about the part's BODY, and bodies are not modelled.
      expect(placement.origin, `${name} ${placement.ref} origin`).toEqual({
        strip: first?.row ?? -1,
        column: first?.col ?? -1,
      })
      expect(placement.footprint, `${name} ${placement.ref} footprint`).toBe(
        footprints.get(placement.ref) ?? "",
      )
    }
  })

  test(`${name}: every PIN line's hole is in the placement, and nothing else is`, () => {
    const text = textFor(board, without)
    const dump = parseBoardDump(text)
    const candidate = importOf(board, text)
    for (const placement of candidate.placements) {
      const pins = dump.pins[placement.ref] ?? []
      expect([...placement.pins.keys()].sort(), `${name} ${placement.ref} pin names`).toEqual(
        pins.map((pin) => pin.pin).sort(),
      )
      for (const pin of pins) {
        expect(placement.pins.get(pin.pin), `${name} ${placement.ref}.${pin.pin}`).toEqual({
          strip: pin.row,
          column: pin.col,
        })
      }
      // A PLACEMENT IS ITS PINS (owner, 2026-10-14). The holes are the lead
      // holes and no body area is reconstructed, so this is an equality rather
      // than a containment: a body-derived hole appearing here would be a
      // placement claiming ground its leads are not in.
      expect(
        [...placement.holes].map((hole) => `${hole.strip},${hole.column}`).sort(),
        `${name} ${placement.ref} holes`,
      ).toEqual(pins.map((pin) => `${pin.row},${pin.col}`).sort())
    }
  })

  test(`${name}: every WIRE line is a wire carrying the net its own node id names`, () => {
    const text = textFor(board, without)
    const dump = parseBoardDump(text)
    const candidate = importOf(board, text)
    const reference = referenceOf(board)
    expect(candidate.wires.length, `${name} wire count`).toBe(dump.wires.length)
    for (const [index, wire] of dump.wires.entries()) {
      const imported = candidate.wires[index]
      expect(imported?.from, `${name} wire ${wire.name} from`).toEqual({
        strip: wire.ends[0].row,
        column: wire.ends[0].col,
      })
      expect(imported?.to, `${name} wire ${wire.name} to`).toEqual({
        strip: wire.ends[1].row,
        column: wire.ends[1].col,
      })
      // THE NET IS CROSS-CHECKED BY THE OTHER ROUTE. The importer resolves a
      // node id to a reference net through the node's MEMBER PINS, because the
      // two vocabularies differ ("GND" against "/GND") and stripping a
      // character is a rule that fails on a hierarchical sheet. Here the
      // node's NAME is compared instead, so the two routes have to agree.
      const nodeId = nodeIdOfWire(text, wire.name)
      const nodeName = dump.nodes[nodeId]
      expect(nodeName, `${name} wire ${wire.name} node ${nodeId} is in the NODE table`).toBeDefined()
      expect([nodeName, `/${nodeName ?? ""}`], `${name} wire ${wire.name} net`).toContain(
        imported?.net ?? "",
      )
      expect(reference.has(imported?.net ?? ""), `${name} wire ${wire.name} net is a reference net`).toBe(true)
    }
  })

  test(`${name}: every SOLDER line is a bridge on those two strips at that column`, () => {
    const text = textFor(board, without)
    const dump = parseBoardDump(text)
    const candidate = importOf(board, text)
    const reference = referenceOf(board)
    const expected = dump.bridges
      .map((bridge) => {
        const strips = [bridge.a.row, bridge.b.row].sort((left, right) => left - right)
        return `${bridge.a.col}:${strips.join("-")}`
      })
      .sort()
    expect(
      candidate.bridges.map((bridge) => `${bridge.column}:${bridge.strips.join("-")}`).sort(),
      `${name} bridges`,
    ).toEqual(expected)
    for (const bridge of candidate.bridges) {
      expect(
        reference.has(bridge.net),
        `${name} bridge ${bridge.column}:${bridge.strips.join("-")} carries a reference net`,
      ).toBe(true)
    }
  })
}

/**
 * Which of its own axes a footprint's pads run along, at the identity facing.
 *
 * It is a property of the FOOTPRINT and not of the placement: `PinHeader_1x02`
 * carries its two pads along y and `R_Axial_DIN0207` carries its two along x, so
 * one VeroRoute `DIRECTION` lands the two on different facings of this model.
 * Grouping by the board axis instead would group by the answer.
 */
function padAxisOf(footprint: string): string {
  const pads = [...geometryOf(footprint, { strip: 0, column: 0 }, "E", PIN_PATTERNS).pins.values()]
  if (new Set(pads.map((hole) => hole.strip)).size === 1) return "x"
  if (new Set(pads.map((hole) => hole.column)).size === 1) return "y"
  return "both axes"
}

/** The node id on one `WIRE` line, read a second way so the importer's reading is checked. */
function nodeIdOfWire(dumpText: string, name: string): string {
  for (const line of dumpText.split("\n")) {
    const fields = line.trim().split(/\s+/)
    if (fields[0] !== "WIRE" || fields[1] !== name) continue
    const last = fields[fields.length - 1] ?? ""
    return last.split(",")[2] ?? ""
  }
  throw new Error(`no WIRE line named "${name}"`)
}

/**
 * ONE LEAD PER HOLE, on every committed board - including the five that do not
 * import.
 *
 * The owner states it as a preference with a build reason: *"I would prefer
 * leads not share holes - it makes building easier."* It is NOT enforced inside
 * the importer, because a refusal there could not say which board broke it; it
 * is asserted here, where it can.
 *
 * **IT IS CHECKED TWO WAYS AND NEITHER IS SKIPPED.** For a board that imports,
 * `holesOverlap` reads the placements this adapter produced - which, under the
 * body ruling, is exactly a lead-sharing check, because a placement's holes are
 * its pins. For a board that refuses there are no placements to read, so the
 * `PIN` lines themselves are compared. A board whose import broke would
 * otherwise quietly stop being checked for this.
 */
for (const board of COMMITTED_BOARDS) {
  test(`${board.name} puts no two leads in one hole`, () => {
    const dump = parseBoardDump(dumpTextOf(board))
    const occupants = new Map<string, string[]>()
    for (const [ref, pins] of Object.entries(dump.pins)) {
      for (const pin of pins) {
        const key = `${pin.row},${pin.col}`
        const found = occupants.get(key) ?? []
        found.push(`${ref}.${pin.pin}`)
        occupants.set(key, found)
      }
    }
    const shared = [...occupants.entries()]
      .filter(([, leads]) => leads.length > 1)
      .map(([hole, leads]) => `${hole} holds ${leads.sort().join(" and ")}`)
    expect(shared, `${board.name} PIN lines`).toEqual([])
    if (OUTCOMES[board.name] !== "imports") return
    expect(holesOverlap(importOf(board)), `${board.name} placements`).toBeNull()
  })
}

/**
 * THE FIT IS CROSS-CHECKED AGAINST THE FORK'S OWN `DIRECTION` FIELD, on the two
 * dumps that carry one.
 *
 * Four of the seven captures predate that field, so the facing is solved from
 * the pins rather than read - which is a derivation, and a derivation nobody
 * checks is a guess with a type. Here it is checked: on a board where every
 * part carries a `DIRECTION`, the solved facing must be a FUNCTION of that
 * token and the axis the footprint's own pads run along. Nothing asserts WHICH
 * facing a token maps to - `lib/stripboard/board.ts` records that this
 * correspondence is not something it may claim - only that the map is
 * single-valued, which an arbitrary fit would not be.
 */
const DIRECTED: readonly string[] = ["transistor-preamp-loop", "transistor-preamp-buffered"]

for (const name of DIRECTED) {
  const board = boardNamed(name)
  test(`${name}: one dump DIRECTION and one pad axis give one facing`, () => {
    const without = FAITHFUL.find(([boardName]) => boardName === name)?.[1] ?? null
    const text = textFor(board, without)
    const dump = parseBoardDump(text)
    const candidate = importOf(board, text)
    const facings = new Map<string, Set<string>>()
    for (const placement of candidate.placements) {
      const part = dump.parts.find((candidatePart) => candidatePart.ref === placement.ref)
      expect(part?.direction, `${name} ${placement.ref} carries a DIRECTION`).toBeDefined()
      const key = `${part?.direction ?? ""} pads along ${padAxisOf(placement.footprint)}`
      const found = facings.get(key) ?? new Set<string>()
      found.add(placement.direction)
      facings.set(key, found)
    }
    for (const [key, solved] of facings) {
      expect([...solved].sort(), `${name}: ${key}`).toHaveLength(1)
    }
    expect(facings.size, `${name} has at least two groups to tell apart`).toBeGreaterThan(1)
  })
}
