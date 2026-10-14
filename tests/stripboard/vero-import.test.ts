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
 *   - `pultec-low-boost-frozen` imports its seven parts and all ten of its
 *     `PAD` lines and refuses on `board_terminals`, a Phoenix terminal block
 *     with no recorded pin pattern and no recorded lead span - a part nobody has
 *     looked at yet rather than one this importer cannot read.
 *   - `pultec-low-boost-imported` refuses because no committed footprint map
 *     covers the synthetic refs an `--import` run invents
 *     (`SI_HI_BOOST_RV_HI_BOOST.ccw-wiper`); the frozen board's map is the
 *     nearest one there is and it names eight designators of the seventeen.
 *   - `transistor-preamp-buffered`, the owner's OTHER built board, imports
 *     every one of its 21 parts and all four of its wires and refuses on ONE of
 *     its six solder bridges: `SOLDER 13,21 14,21` joins two holes that hold no
 *     pin and no wire end, and a `SOLDER` line carries no node id, so nothing in
 *     the dump says what net that bridge carries. The test below proves that it
 *     is the only thing standing in the way, by importing the same board with
 *     that one line removed.
 *
 * **A `PAD` LINE IS A ONE-HOLE PLACEMENT, and the owner settled why:** *"yeah -
 * a single pad has no orientation. It's just a place to solder an off-board wire
 * or a test point to."* So it has no facing to solve and no footprint to check,
 * and the three assertions the `PART` lines are held to do not apply to it - it
 * gets its own test instead, asserting the one thing that matters about it:
 * that its `ref.pin` is the reference pin its `FROM` field names, and that that
 * pin is on a net of the reference netlist.
 *
 * **NO CUT IS ASSERTED ANYWHERE IN THIS FILE.** Cuts do not exist in the model
 * yet; this task runs before the one that derives them, so that the differential
 * test there has one converter to use rather than a throwaway second one.
 */
import { expect, test } from "bun:test"
import {
  geometryOf,
  holesOverlap,
  type Candidate,
  type Hole,
  type Placement,
} from "../../lib/stripboard/board.ts"
import { PIN_PATTERNS } from "../../lib/kicad/pin-pattern.ts"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { spanHoles } from "../../tools/stripboard/constraints-model.ts"
import { leadSpanFor } from "../../lib/kicad/lead-span.ts"
import { candidateFromDump, OFF_BOARD_TERMINAL } from "../../tools/stripboard/vero-import.ts"
import { padLines } from "../../tools/stripboard/pad-provenance.ts"
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
  "pultec-low-boost-frozen": { key: "vero-import-no-geometry", names: '"board_terminals"' },
  "pultec-low-boost-imported": {
    key: "vero-import-footprint-unmapped",
    names: '"SI_HI_BOOST_RV_HI_BOOST.ccw-wiper"',
  },
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
 * The one part of the frozen low-boost board this importer cannot read, and the
 * bridge that lands in one of its holes.
 *
 * `board_terminals` is fitted with
 * `TerminalBlock_Phoenix:TerminalBlock_Phoenix_MKDS-1,5-3-5.08_1x03_P5.08mm_Horizontal`,
 * which has **no recorded pin pattern and no recorded lead span** - it is in
 * neither `PIN_PATTERNS` nor `LEAD_SPANS` nor `lead-span.ts`'s `UNSOURCED`, so
 * nobody has yet looked at it. Recording one is a datasheet transcription with a
 * test beside it, and this plan's rule is to stop and report rather than widen a
 * table to make something pass.
 *
 * The `SOLDER` line goes with it rather than being a second concession: the
 * bridge's own holes are `9,6` and `10,6`, and `board_terminals.1` is the only
 * contact in either, so removing the part removes the only statement of what net
 * that bridge carries.
 */
const TERMINAL_BLOCK_LINES: readonly string[] = [
  "PART board_terminals BLOCK_200MIL3 Conn_01x03 AT 4,5 SPAN 3",
  "PIN board_terminals 1 AT 9,6",
  "PIN board_terminals 2 AT 7,6",
  "PIN board_terminals 3 AT 5,6",
  "SOLDER 9,6 10,6",
]

/**
 * The faithfulness assertions, over the boards that import.
 *
 * **TWO BOARDS ARE HERE THROUGH AN EDIT TO A COPY OF THE FIXTURE'S TEXT**, each
 * removing exactly the lines its own refusal test names, and each unedited file
 * is asserted to refuse above - so an edit cannot make a refusal disappear
 * unnoticed. It is the only way to assert what the REST of a board does:
 * `buffered`'s other twenty-one parts, four wires and five bridges, and the
 * frozen low-boost's seven parts and ten pads.
 */
const FAITHFUL: readonly (readonly [string, readonly string[]])[] = [
  ["transistor-preamp-feedback", []],
  ["transistor-preamp-loop", []],
  ["transistor-preamp-buffered", ["SOLDER 13,21 14,21"]],
  ["pultec-low-boost-frozen", TERMINAL_BLOCK_LINES],
]

function textFor(board: CommittedBoard, without: readonly string[]): string {
  const text = dumpTextOf(board)
  if (without.length === 0) return text
  const lines = text.split("\n")
  const kept = lines.filter((line) => !without.includes(line.trim()))
  if (kept.length !== lines.length - without.length) {
    throw new Error(
      `${without.length} lines were named for removal from ${board.name}'s dump and ` +
        `${lines.length - kept.length} matched; the fixture has moved`,
    )
  }
  return kept.join("\n")
}

for (const [name, without] of FAITHFUL) {
  const board = boardNamed(name)

  test(`${name}: every PART line is a placement, at the hole its own pin 1 is in`, () => {
    const text = textFor(board, without)
    const dump = parseBoardDump(text)
    const candidate = importOf(board, text)
    // THE PADS ARE EXCLUDED HERE AND ASSERTED ON THEIR OWN BELOW. A pad is not a
    // PART line, is not named the way the board names it, and has no footprint
    // to check - so holding it to any of the three below would be holding it to
    // a contract it is not under.
    const parts = fittedParts(candidate)
    expect(parts.map((placement) => placement.ref), name).toEqual(
      dump.parts.map((part) => part.ref),
    )
    const footprints = footprintsOf(board)
    for (const placement of parts) {
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
    for (const placement of fittedParts(candidate)) {
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

  test(`${name}: every PAD line is a one-hole placement named the way the netlist names it`, () => {
    const text = textFor(board, without)
    const candidate = importOf(board, text)
    const pads = padLines(text)
    const imported = candidate.placements.filter(
      (placement) => placement.footprint === OFF_BOARD_TERMINAL,
    )
    expect(imported.length, `${name} pad count`).toBe(pads.length)
    const reference = referenceOf(board)
    for (const [index, pad] of pads.entries()) {
      const placement = imported[index]
      const entries = [...(placement?.pins ?? new Map<string, Hole>())]
      const first = entries[0]
      expect(entries.length, `${name} pad ${pad.ref} is one hole`).toBe(1)
      // ITS IDENTITY IS THE `FROM <ref>.<pin>` FIELD, which is the only place the
      // dump records which reference pin an expanded pad is - so `ref.pin`
      // resolves in the netlist export, and this asserts that it does rather
      // than only that it is spelled that way.
      expect(`${placement?.ref ?? ""}.${first?.[0] ?? ""}`, `${name} pad ${pad.ref} id`).toBe(
        pad.source ?? "",
      )
      const net = [...reference].find(([, members]) => members.includes(pad.source ?? ""))
      expect(net?.[0], `${name} pad ${pad.ref} is on a reference net`).toBeDefined()
      // ITS HOLE IS ITS PIN LINE'S, AND THE PAD LINE'S OWN `AT` AGREES - the
      // importer refuses when they do not, so this is the agreement itself.
      expect(placement?.origin, `${name} pad ${pad.ref} hole`).toEqual(
        pad.placement === "floating"
          ? { strip: -1, column: -1 }
          : { strip: pad.placement.row, column: pad.placement.col },
      )
      expect(placement?.holes, `${name} pad ${pad.ref} occupies its one hole`).toEqual([
        first?.[1] ?? { strip: -1, column: -1 },
      ])
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

/** Every placement that came from a `PART` line, which is every one with a real footprint. */
function fittedParts(candidate: Candidate): readonly Placement[] {
  return candidate.placements.filter((placement) => placement.footprint !== OFF_BOARD_TERMINAL)
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
 * WHICH PLACEMENTS ARE OUTSIDE THEIR RECORDED LEAD SPAN, per board, because the
 * importer deliberately does not apply the bound and a claim about it was wrong
 * once already.
 *
 * `./vero-import-facing.ts` states that `HC5`/`HC9` own these bounds and that
 * this adapter is not a second owner of them. That is a licence to be silent
 * about the figures, so they are asserted here instead - and the first version
 * of the claim was an off-by-one: `spanHoles` is INCLUSIVE
 * (`max(|dRow|, |dCol|) + 1`), so two leads in adjacent holes span TWO, which is
 * exactly the DIN0207's floor rather than one under it.
 *
 * It reads the dump rather than the candidate, so the five boards that do not
 * import are measured too.
 */
const SPAN_FINDINGS: Readonly<Record<string, readonly string[]>> = {
  "pt2399-core": [],
  "pultec-low-boost-frozen": [],
  "pultec-low-boost-imported": [],
  "transistor-preamp-buffered": [],
  "transistor-preamp-feedback": [],
  "transistor-preamp-loop": [],
  // The one already-recorded HC5 failure in this repository, and the only
  // placement on any committed board outside its own recorded bound.
  "transistor-preamp-staged": ["C8 spans 14 holes, outside 2..11"],
}

for (const board of COMMITTED_BOARDS) {
  test(`${board.name}: lead spans against the recorded bounds`, () => {
    const dump = parseBoardDump(dumpTextOf(board))
    const footprints = footprintsOf(board)
    const outside: string[] = []
    for (const [ref, pins] of Object.entries(dump.pins)) {
      const span = spanHoles(pins)
      const footprint = footprints.get(ref)
      if (span === undefined || footprint === undefined) continue
      let bounds
      try {
        bounds = leadSpanFor(footprint)
      } catch {
        // A footprint with no recorded span bounds nothing; geometryOf refuses
        // such a part anyway, under its own key.
        continue
      }
      if (span < bounds.minSpanHoles || span > bounds.maxSpanHoles) {
        outside.push(`${ref} spans ${span} holes, outside ${bounds.minSpanHoles}..${bounds.maxSpanHoles}`)
      }
    }
    expect(outside.sort(), board.name).toEqual([...(SPAN_FINDINGS[board.name] ?? ["UNDECLARED"])])
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
    const without = FAITHFUL.find(([boardName]) => boardName === name)?.[1] ?? []
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
