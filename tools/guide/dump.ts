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
 */

/** The board's size in holes, from its one `GRID <rows> <cols>` line. */
export interface Grid {
  readonly rows: number
  readonly cols: number
}

/** Where a part's pins land, or that it has none yet because it is unplaced. */
export type PartPlacement = { readonly row: number; readonly col: number } | "floating"

/** One `PART <ref> <type> <value> <FLOATING|AT <row>,<col>> SPAN <n>` line. */
export interface Part {
  readonly ref: string
  readonly type: string
  readonly value: string
  readonly placement: PartPlacement
  /** The footprint's own column span (body width for an electrolytic) - NOT a lead span. */
  readonly span: number
}

/** One `PIN <ref> <pin> AT <row>,<col>` line: one lead's actual hole. */
export interface Pin {
  readonly pin: string
  readonly row: number
  readonly col: number
}

/** A bare hole position, with no node id. */
export interface HolePosition {
  readonly row: number
  readonly col: number
}

/** A hole position paired with the node id painted there. */
export interface NodedHole extends HolePosition {
  readonly nodeId: string
}

/** One `WIRE <name> AT <row>,<col> ENDS <end> <end>` line: a placed wire's two ends. */
export interface Wire {
  readonly name: string
  readonly ends: readonly [HolePosition, HolePosition]
}

/** One computed cut: the two strip-adjacent holes to sever, each carrying its own net. */
export interface Cut {
  readonly a: NodedHole
  readonly b: NodedHole
}

/** One computed solder bridge: the two strip-adjacent holes to join. No node ids - see above. */
export interface Bridge {
  readonly a: HolePosition
  readonly b: HolePosition
}

/** A full, typed `--dump-board` report. */
export interface BoardDump {
  readonly grid: Grid
  readonly verticalStrips: boolean
  readonly parts: readonly Part[]
  /** Every placed part's leads, by ref. A ref with no entry here is floating. */
  readonly pins: Readonly<Record<string, readonly Pin[]>>
  readonly wires: readonly Wire[]
  /** Node id -> the net name stored for it (`-` when the board stores none). */
  readonly nodes: Readonly<Record<string, string>>
  readonly cutState: string
  readonly cuts: readonly Cut[]
  readonly bridges: readonly Bridge[]
}

/**
 * Every line in `dump` starting with `keyword`, split into whitespace-
 * separated fields (`fields[0]` is the keyword itself).
 *
 * Shared with `tools/perfboard/cut-state.ts`, which reads `NODE`/
 * `CUT_STATE`/`CUT_CONFLICT` lines out of this same grammar for a different
 * purpose (an unresolved-cuts explanation): one tokenizer for one grammar,
 * rather than two that could drift apart.
 */
export function dumpLineFields(dump: string, keyword: string): string[][] {
  return dump
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .filter((fields) => fields[0] === keyword)
}

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
    "unpinned or older veroroute fork; rebuild the pinned one " +
    '(`bun run perfboard veroroute`) and re-run --dump-board.'
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
      return { ref, type, value, placement: "floating" as const, span }
    }
    if (rest[0] === "AT") {
      const placement = parsePosition(rest[1], `PART ${ref}`)
      const span = parseSpan(rest[2], rest[3], rawLine)
      return { ref, type, value, placement, span }
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

const ROW_LETTERS = 26

/**
 * The lettered-row, numbered-column name of a hole: row 0 is `A`, 25 is
 * `Z`, 26 is `AA` (a bijective base-26 numbering, like a spreadsheet's
 * columns); column 0 is `1`. Used everywhere a position is written, per the
 * design's convention (borrowed from VeroDesigner, reimplemented here).
 */
export function holeName(row: number, col: number): string {
  if (!Number.isInteger(row) || row < 0) {
    throw new Error(`holeName: row must be a non-negative integer, got ${row}`)
  }
  if (!Number.isInteger(col) || col < 0) {
    throw new Error(`holeName: col must be a non-negative integer, got ${col}`)
  }
  let n = row + 1
  let letters = ""
  while (n > 0) {
    const remainder = (n - 1) % ROW_LETTERS
    letters = String.fromCharCode(65 + remainder) + letters
    n = Math.floor((n - 1) / ROW_LETTERS)
  }
  return `${letters}${col + 1}`
}
