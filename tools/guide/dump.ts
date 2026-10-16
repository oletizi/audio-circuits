/**
 * A typed reading of the pinned VeroRoute fork's `--dump-board` text.
 *
 * The grammar is fixed by veroroute itself, never guessed at or
 * reimplemented from memory: every field parsed here is transcribed from
 * `veroroute --help`'s `--dump-board` section, from the C++ source of truth
 * (`.tools/veroroute-perfboard/Src/Headless_dump.cpp` and
 * `Headless_dump_pins.cpp`), and cross-checked against a real dump of the
 * staged board (`.superpowers/sdd/2026-09-29-build-guide/staged-dump.txt`).
 *
 * TWO DELIBERATE DEPARTURES FROM A NAIVE READING OF THAT GRAMMAR:
 *
 * - A part's `SPAN` field is its footprint's own column count - body width
 *   for an electrolytic, and 1 for a two-pin part mounted vertically - never
 *   a lead span. It is parsed and kept on `Part`, but a lead's actual hole
 *   comes ONLY from a `PIN` line; nothing here derives a position from SPAN.
 * - The grammar's `SOLDER <row>,<col> <row>,<col>` line carries no node id
 *   at either hole, unlike `CUT`, whose two hole fields are
 *   `<row>,<col>,<nodeId>` (Headless_dump.cpp's own grammar comment above
 *   `PrintDumpLine` confirms this is not a truncation). `bridges` is typed
 *   to match: two bare hole positions, no node ids. The design
 *   (`docs/superpowers/specs/2026-09-29-build-guide-design.md`) agrees this
 *   is enough - a solder bridge's checklist item is "number, the two
 *   holes", unlike a cut's, which needs the two net names.
 *
 * `GRID`, `VERTICAL_STRIPS` and `CUT_STATE` are, per the fork's own comment,
 * "always emitted" regardless of whether anything is placed - so their
 * absence always refuses here, never falls back to an invented size or
 * state. `PIN` lines are legitimately absent when nothing on the board is
 * placed (a floating part prints none), so their absence only refuses when
 * some part actually needs one.
 *
 * `BOUNDS` AND `DIRECTION` ARE OPTIONAL HERE, WHICH IS NOT WHAT THE FORK
 * DOES. The pinned fork always emits `BOUNDS` and always appends `DIRECTION`
 * to a placed `PART` line, so a dump from it carries both; but a dump
 * CAPTURED BEFORE EITHER EXISTED is still a readable board, and two such
 * captures in this repository are frozen evidence with provenance that may
 * not be regenerated. A reader that refused them would reject files nobody
 * is allowed to change, triggered by a one-line change to `veroroute.pin`.
 * So the rule, whose authority is
 * `docs/stripboard/pipeline-verification.md` section 2.6 and not this file:
 * both fields optional - including `DIRECTION` on a PLACED part; the refusal
 * owned by the CONSUMER that acts on the value (`boundsOf`,
 * `usableDirection`), never by this reader; the CONTRADICTION still refused,
 * which is a `FLOATING` part carrying a direction; a present-but-unreadable
 * line still refused, because that is the grammar moving rather than an old
 * capture; and `UNKNOWN` received, narrowed by comparison rather than cast,
 * and refused by name rather than read as `W`.
 *
 * THE TYPES AND THE CONSUMER-SIDE REFUSALS LIVE IN `./dump-model.ts` and are
 * re-exported from here, so every consumer still imports this module. Task 7's
 * two new fields took the single file past this repository's 300-500 line
 * ceiling; the split follows `lead-span-model.ts` / `lead-span.ts`'s own
 * precedent, and nothing moved but location.
 */
import { dumpLineFields } from "../perfboard/dump-lines.ts"
import {
  boundsOf,
  holeName,
  noPinLinesMessage,
  REBUILD_PINNED_FORK,
  rowName,
  usableDirection,
  type BoardDump,
  type Bounds,
  type Bridge,
  type Cut,
  type Grid,
  type HolePosition,
  type NodedHole,
  type Part,
  type PartDirection,
  type PartPlacement,
  type Pin,
  type Wire,
} from "./dump-model.ts"

/**
 * The grammar's types and the consumer-side refusals, re-exported because this
 * is the module every consumer was told to import. `./dump-model.ts` holds the
 * declarations; this file holds the reading of the text.
 */
export {
  boundsOf,
  holeName,
  noPinLinesMessage,
  REBUILD_PINNED_FORK,
  rowName,
  usableDirection,
  type BoardDump,
  type Bounds,
  type Bridge,
  type Cut,
  type Grid,
  type HolePosition,
  type NodedHole,
  type Part,
  type PartDirection,
  type PartPlacement,
  type Pin,
  type Wire,
}

/** The five direction tokens the dump prints, narrowed by comparison never by cast. */
const PART_DIRECTIONS: readonly PartDirection[] = ["W", "E", "N", "S", "UNKNOWN"]

function onlyLine(dump: string, keyword: string): string[] | undefined {
  return dumpLineFields(dump, keyword)[0]
}

function parsePosition(field: string | undefined, context: string): HolePosition {
  const match = field === undefined ? null : /^(\d+),(\d+)$/.exec(field)
  if (match === null) {
    throw new Error(`${context}: unreadable hole position "${field ?? ""}"`)
  }
  const [, rowStr, colStr] = match
  if (rowStr === undefined || colStr === undefined) {
    throw new Error(`${context}: unreadable hole position "${field ?? ""}"`)
  }
  return { row: Number(rowStr), col: Number(colStr) }
}

function parseNodedHole(field: string | undefined, context: string): NodedHole {
  const match = field === undefined ? null : /^(\d+),(\d+),(\d+)$/.exec(field)
  if (match === null) {
    throw new Error(`${context}: unreadable noded hole position "${field ?? ""}"`)
  }
  const [, rowStr, colStr, nodeId] = match
  if (rowStr === undefined || colStr === undefined || nodeId === undefined) {
    throw new Error(`${context}: unreadable noded hole position "${field ?? ""}"`)
  }
  return { row: Number(rowStr), col: Number(colStr), nodeId }
}

function noPinnedForkFix(lineKind: string, consequence: string): string {
  return (
    `--dump-board produced no ${lineKind} line, so ${consequence}. This dump is from an ` +
    `unpinned or older veroroute fork; ${REBUILD_PINNED_FORK}.`
  )
}


function parseGrid(dump: string): Grid {
  const fields = onlyLine(dump, "GRID")
  if (fields === undefined) {
    throw new Error(noPinnedForkFix("GRID", "this board's size in holes is unknown"))
  }
  const [, rowsField, colsField] = fields
  const rows = rowsField === undefined ? NaN : Number(rowsField)
  const cols = colsField === undefined ? NaN : Number(colsField)
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 0 || cols < 0) {
    throw new Error(`unreadable GRID line: "${fields.join(" ")}"`)
  }
  return { rows, cols }
}

function parseVerticalStrips(dump: string): boolean {
  const fields = onlyLine(dump, "VERTICAL_STRIPS")
  if (fields === undefined) {
    throw new Error(noPinnedForkFix("VERTICAL_STRIPS", "whether this board uses vertical strips is unknown"))
  }
  const value = fields[1]
  if (value !== "0" && value !== "1") {
    throw new Error(`unreadable VERTICAL_STRIPS line: "${fields.join(" ")}"`)
  }
  return value === "1"
}

function parseCutState(dump: string): string {
  const fields = onlyLine(dump, "CUT_STATE")
  const state = fields?.[1]
  if (state === undefined) {
    throw new Error(noPinnedForkFix("CUT_STATE", "whether this board's cuts can be worked out is unknown"))
  }
  return state
}

/**
 * The `BOUNDS` rect, or `undefined` for an absent line and for `BOUNDS - -`.
 *
 * Unlike `GRID`, `VERTICAL_STRIPS` and `CUT_STATE`, an absent `BOUNDS` line
 * does NOT refuse here. It is not that the pinned fork omits it - it always
 * emits it - but that a dump captured before the line existed is still a
 * readable board, and two such captures are frozen evidence with provenance
 * (`tests/fixtures/pultec-low-boost-c19-floated.dump` and the frozen low-boost
 * benchmark). A refusal here would reject files nobody is allowed to change;
 * the refusal belongs to `boundsOf`, called by the consumer that needs a rect.
 *
 * A line that is PRESENT and unreadable still refuses: that is the grammar
 * moving under the parser, which is a different fault from the line not being
 * there, and reading it as "no bounds" would make a grammar change look like
 * an old capture.
 */
function parseBounds(dump: string): Bounds | undefined {
  const fields = onlyLine(dump, "BOUNDS")
  if (fields === undefined) return undefined
  const rawLine = fields.join(" ")
  const [, minField, maxField] = fields
  if (fields.length !== 3) {
    throw new Error(
      `unreadable BOUNDS line (expected two hole positions, or "- -" for a board with ` +
        `nothing on it): "${rawLine}"`,
    )
  }
  if (minField === "-" && maxField === "-") return undefined
  const min = parsePosition(minField, "BOUNDS min")
  const max = parsePosition(maxField, "BOUNDS max")
  if (max.row < min.row || max.col < min.col) {
    throw new Error(
      `unreadable BOUNDS line: "${rawLine}" names a rect whose maximum is below its minimum. ` +
        'Board::GetBounds leaves wrong-ended sentinels behind when it reports failure, and the ' +
        'dump spells that case "BOUNDS - -" rather than printing them; a rect in this shape ' +
        "therefore means the grammar moved, not that the board is empty, and it is not " +
        "normalised by swapping the ends.",
    )
  }
  return { minRow: min.row, minCol: min.col, maxRow: max.row, maxCol: max.col }
}

/**
 * The `DIRECTION <W|E|N|S|UNKNOWN>` field of one `PART` line, or `undefined`
 * when the line carries none.
 *
 * `rest` is the part of the line after `SPAN <n>`. An empty tail is the
 * capture-is-older-than-the-grammar case (`Part.direction`); a tail that is
 * anything other than exactly `DIRECTION <value>` refuses, because a field
 * nobody can read is the grammar moving rather than a field that is absent.
 */
function parseDirection(
  rest: readonly (string | undefined)[],
  placement: PartPlacement,
  ref: string,
  rawLine: string,
): PartDirection | undefined {
  const tail = rest.filter((field): field is string => field !== undefined)
  if (tail.length === 0) return undefined
  const [keyword, value] = tail
  if (keyword !== "DIRECTION" || value === undefined || tail.length !== 2) {
    throw new Error(
      `unreadable PART line (the fields after SPAN must be exactly "DIRECTION <W|E|N|S|UNKNOWN>" ` +
        `or nothing at all): "${rawLine}"`,
    )
  }
  // Narrowed by COMPARISON against the whitelist, never cast: `value as
  // PartDirection` would make every sixth token a valid direction at the type
  // level and a wrong placement at runtime.
  const direction = PART_DIRECTIONS.find((candidate) => candidate === value)
  if (direction === undefined) {
    throw new Error(
      `unreadable PART DIRECTION value "${value}" on PART ${ref}: "${rawLine}". The dump prints ` +
        "W, E, N, S or UNKNOWN - UNKNOWN being what it prints for a .vrt carrying a raw " +
        "direction char that is none of the four. A sixth value means the grammar moved; it is " +
        "not read as W.",
    )
  }
  if (placement === "floating") {
    throw new Error(
      `PART ${ref} is FLOATING and carries DIRECTION ${direction}: "${rawLine}". No build prints ` +
        "this, and it means two fields on one line disagree about whether the part is on the " +
        "board. A floating component prints no DIRECTION field, exactly as it prints no PIN " +
        "line. This is the one direction fault the reader refuses rather than handing to a " +
        `consumer: there is no value to hand over. ${REBUILD_PINNED_FORK}.`,
    )
  }
  return direction
}


function parseSpan(spanKeyword: string | undefined, spanValue: string | undefined, rawLine: string): number {
  if (spanKeyword !== "SPAN" || spanValue === undefined) {
    throw new Error(`unreadable PART line (expected "SPAN <n>"): "${rawLine}"`)
  }
  const span = Number(spanValue)
  if (!Number.isInteger(span) || span < 1) {
    throw new Error(`unreadable PART SPAN value: "${rawLine}"`)
  }
  return span
}

function parseParts(dump: string): Part[] {
  return dumpLineFields(dump, "PART").map((fields) => {
    const rawLine = fields.join(" ")
    const [, ref, type, value, ...rest] = fields
    if (ref === undefined || type === undefined || value === undefined) {
      throw new Error(`unreadable PART line: "${rawLine}"`)
    }
    if (rest[0] === "FLOATING") {
      const span = parseSpan(rest[1], rest[2], rawLine)
      const placement = "floating" as const
      const direction = parseDirection(rest.slice(3), placement, ref, rawLine)
      return { ref, type, value, placement, span, direction }
    }
    if (rest[0] === "AT") {
      const placement = parsePosition(rest[1], `PART ${ref}`)
      const span = parseSpan(rest[2], rest[3], rawLine)
      const direction = parseDirection(rest.slice(4), placement, ref, rawLine)
      return { ref, type, value, placement, span, direction }
    }
    throw new Error(`unreadable PART line (expected FLOATING or AT <row>,<col>): "${rawLine}"`)
  })
}

function parsePins(dump: string): Record<string, Pin[]> {
  const pins: Record<string, Pin[]> = {}
  for (const fields of dumpLineFields(dump, "PIN")) {
    const [, ref, pin, atKeyword, posField] = fields
    if (ref === undefined || pin === undefined || atKeyword !== "AT" || posField === undefined) {
      throw new Error(`unreadable PIN line: "${fields.join(" ")}"`)
    }
    const { row, col } = parsePosition(posField, `PIN ${ref}.${pin}`)
    const existing = pins[ref] ?? []
    existing.push({ pin, row, col })
    pins[ref] = existing
  }
  return pins
}

function parseWireEnd(end: string | undefined, name: string, rawLine: string): HolePosition {
  if (end === "-") {
    throw new Error(`WIRE ${name} is floating (unplaced), so it has no hole positions to report: "${rawLine}"`)
  }
  const match = end === undefined ? null : /^(\d+),(\d+),\d+,\d+$/.exec(end)
  if (match === null) {
    throw new Error(`unreadable WIRE end "${end ?? ""}" on WIRE ${name}: "${rawLine}"`)
  }
  const [, rowStr, colStr] = match
  if (rowStr === undefined || colStr === undefined) {
    throw new Error(`unreadable WIRE end "${end ?? ""}" on WIRE ${name}: "${rawLine}"`)
  }
  return { row: Number(rowStr), col: Number(colStr) }
}

function parseWires(dump: string): Wire[] {
  return dumpLineFields(dump, "WIRE").map((fields) => {
    const rawLine = fields.join(" ")
    const [, name] = fields
    if (name === undefined) {
      throw new Error(`unreadable WIRE line: "${rawLine}"`)
    }
    const endsIndex = fields.indexOf("ENDS")
    if (endsIndex === -1) {
      throw new Error(`unreadable WIRE line (no ENDS field): "${rawLine}"`)
    }
    const rawEnds = fields.slice(endsIndex + 1)
    const [endA, endB] = rawEnds
    if (rawEnds.length !== 2 || endA === undefined || endB === undefined) {
      throw new Error(`unreadable WIRE line (expected exactly two ENDS fields): "${rawLine}"`)
    }
    const ends: readonly [HolePosition, HolePosition] = [
      parseWireEnd(endA, name, rawLine),
      parseWireEnd(endB, name, rawLine),
    ]
    return { name, ends }
  })
}

function parseNodes(dump: string): Record<string, string> {
  const nodes: Record<string, string> = {}
  for (const fields of dumpLineFields(dump, "NODE")) {
    const [, id, nameKeyword, name] = fields
    if (id === undefined || nameKeyword !== "NAME" || name === undefined) {
      throw new Error(`unreadable NODE line: "${fields.join(" ")}"`)
    }
    nodes[id] = name
  }
  return nodes
}

function parseCuts(dump: string): Cut[] {
  return dumpLineFields(dump, "CUT").map((fields) => {
    const [, aField, bField] = fields
    return { a: parseNodedHole(aField, "CUT"), b: parseNodedHole(bField, "CUT") }
  })
}

function parseBridges(dump: string): Bridge[] {
  return dumpLineFields(dump, "SOLDER").map((fields) => {
    const [, aField, bField] = fields
    return { a: parsePosition(aField, "SOLDER"), b: parsePosition(bField, "SOLDER") }
  })
}

/**
 * Parse `--dump-board`'s text into a typed `BoardDump`.
 *
 * Refuses, naming the missing line kind and the fix, when `GRID`,
 * `VERTICAL_STRIPS` or `CUT_STATE` are absent (the pinned fork always emits
 * all three, so their absence means an unpinned or older binary produced
 * this dump - never something this function should paper over with an
 * invented size or state), or when there are placed parts but no `PIN`
 * lines at all (a floating-only board legitimately has none).
 */
export function parseBoardDump(dump: string): BoardDump {
  const parts = parseParts(dump)
  const pins = parsePins(dump)
  const anyPlaced = parts.some((part) => part.placement !== "floating")
  if (anyPlaced && Object.keys(pins).length === 0) {
    throw new Error(noPinnedForkFix("PIN", "placed parts' lead positions are unknown"))
  }

  return {
    grid: parseGrid(dump),
    bounds: parseBounds(dump),
    verticalStrips: parseVerticalStrips(dump),
    parts,
    pins,
    wires: parseWires(dump),
    nodes: parseNodes(dump),
    cutState: parseCutState(dump),
    cuts: parseCuts(dump),
    bridges: parseBridges(dump),
  }
}

