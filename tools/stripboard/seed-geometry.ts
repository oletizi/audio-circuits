/**
 * What a gesture does to the board's geometry: the footprint rectangle a
 * `PutDown` has to find room for, the origins a part fits at, and the quarter
 * turn - **transcribed from `Board::RotateComps`, not inferred from behaviour**.
 *
 * THE AUTHORITY is `.tools/veroroute-perfboard/Src/Board_components.cpp:1146`
 * (`Board::RotateComps`), `Src/Headless_rotate.h`'s five recorded properties of
 * it, and `Src/CompTypes.h:548`'s `GetMakeInstructions` for the footprint
 * shapes. Every line of arithmetic below is one of theirs, named where it is
 * used. Where this module and those sources differ, the sources win and this
 * comment is the defect. `tests/stripboard/seed-geometry.test.ts` holds every
 * prediction below against the real binary and fails rather than skips when the
 * binary is absent.
 *
 * **WHY A MODEL AT ALL, RATHER THAN TRYING THE GESTURE.** The random arm draws
 * uniformly from an enumerated set, and a set whose members were discovered by
 * attempting them would make the arm a retry loop - which silently reshapes the
 * distribution the control arm exists to be. So the set is narrowed in advance,
 * by this model, and the arm says so. The fork remains the authority: a gesture
 * it refuses still stops the arm and names the part.
 *
 * **ROTATION IS AVAILABLE, AND THE BRIEF'S WARNING DOES NOT GENERALISE.**
 * Measured on an `--import --strips horizontal` low-boost board: 0 of 17 parts
 * rotate where the first-fit sweep left them, and 17 of 17 rotate after a move
 * to an interior origin. The "rotatable 0, refused 60" sweep was taken on the
 * COMMITTED boards, which is not where any arm starts. *Move before you turn*
 * is the rule and it works.
 *
 * **WHY `--import`'s OWN PARTS CANNOT BE TURNED IN PLACE**, read off the
 * arithmetic rather than guessed: a part `DY` rows by `DX` cols turns about its
 * rect's centre, which moves the rect's top-left by `dy = trunc((DY - DX) / 2)`
 * rows. A two-lead part lying along a strip is `1 x N`, so `dy` is
 * `-floor((N - 1) / 2)` - negative - and a part the sweep left at row 0 or row 1
 * therefore turns to a negative row, pans, and the verb refuses. Nothing about
 * row 0 is special; a `1 x 5` part refuses from row 1 as well.
 *
 * **THE OCCUPANCY IS TRACKED, NOT RE-READ.** `occupancyOf` builds every part's
 * rect from the dump ONCE, and `withPartMoved`/`withPartTurned` carry it forward
 * through the gestures the arm emits. That is not an optimisation: a dump does
 * not describe a TURNED part's footprint at all - `SPAN` is its column extent
 * and the stretched extent that became its row count appears nowhere - so a
 * model that re-derived each rect from the dump could follow a move and not a
 * turn. That was the bug: a later draw proposed a hole an earlier part's turn
 * had taken, and `--move` refused.
 */
import { usableDirection, type BoardDump, type Grid } from "../guide/dump.ts"

/**
 * A part's footprint rectangle - what `Board::PutDown` has to find room for,
 * and what `Board::GetFootprintBounds` returns for a single component.
 *
 * NOT THE LEAD HOLES. `PutDown` places the component's whole element grid, body
 * cells included, so two parts whose leads miss each other can still collide.
 * `C18` on the import-placed low-boost board is the worked example: `AT 0,0`,
 * `SPAN 3`, a three-row `CAP_FILM_WIDE` footprint, and both its leads in the
 * middle row - so two of its three rows hold no lead and are occupied anyway.
 */
export interface PartRect {
  readonly row: number
  readonly col: number
  readonly rows: number
  readonly cols: number
  /**
   * Whether the part's leads run along the ROWS - an odd number of quarter turns
   * from the `W`/`E` the import sweep leaves every part in.
   *
   * It is here because `--stretch` needs it and nothing else does: a stretch
   * keeps the part's `AT` fixed and grows AWAY from it along the axis the leads
   * run on. Measured on `R2`: facing `W` at `20,10`, `grow` takes `SPAN` 5 to 6
   * and lead 2 from column 14 to 15; turned to `N` at `18,12`, `grow` leaves
   * `AT` and `SPAN` alone and takes lead 2 from row 22 to 23.
   */
  readonly across: boolean
}

/**
 * Every rect on the board, by the ref that owns it: each `PART`'s footprint and
 * each free pad's single hole.
 *
 * A PAD IS NOT A `PART` AND IS STILL IN THE WAY. The dump prints a `PAD` line
 * and `PIN` lines for an off-board part's breakout holes, and
 * `tools/guide/dump.ts`'s `parseParts` reads `PART` lines only - so a pad never
 * appears in `dump.parts` and no arm ever moves one, but its hole is occupied
 * copper all the same. Ten of the low-boost board's holes are pads.
 */
export type Occupancy = ReadonlyMap<string, PartRect>

function refuseRef(ref: string, detail: string): never {
  throw new Error(`part "${ref}": ${detail}`)
}

/**
 * How many ROWS each VeroRoute component type's footprint occupies when the part
 * faces `W` or `E`, keyed by the type string `--dump-board` prints.
 *
 * **TRANSCRIBED FROM THE FORK, AND THE DUMP CANNOT SUPPLY IT.** `SPAN` is the
 * footprint's COLUMN count and varies with the stretch, so it is read off the
 * dump; the ROW count is a constant of the component type and appears in no dump
 * line at all. Its source is
 * `.tools/veroroute-perfboard/Src/CompTypes.h:548`'s
 * `CompTypes::GetMakeInstructions`, which returns each type's `rows`, `cols` and
 * cell map:
 *
 *   - `:557  case COMP::RESISTOR      : rows = 1; cols = 4; return "1++2"`
 *   - `:561  case COMP::CAP_FILM      : rows = 1; cols = 3; return "1+2"`
 *   - `:562  case COMP::CAP_FILM_WIDE : rows = 3; cols = 3; return "+++1+2+++"`
 *   - `:598  case COMP::SIP           : rows = 1; cols = 8; return "12345678"`
 *
 * **DERIVING IT FROM THE LEADS INSTEAD IS WHAT THE FIRST VERSION DID, AND IT WAS
 * WRONG BY ONE ON A REAL PART.** `CAP_FILM_WIDE`'s cell map puts its two leads
 * in the MIDDLE row of three, so a `C18` at `AT 0,0` prints its leads at row 1
 * and the lead extent reads 2 where the footprint is 3. The fork says so
 * outright when it refuses: *"C18 cannot go to 33,24 - its footprint would
 * occupy rows 33..35"*. One row of under-count made the random arm propose moves
 * and turns the fork then refused.
 *
 * **IT IS A WHITELIST THAT REFUSES BY NAME, AND DELIBERATELY SHORT.** These four
 * are every type the five Pultec boards place, which is every board these arms
 * seed. `SIP5`, `DIP16` and `BLOCK_200MIL3` show that the dump's type string is
 * a base type with a pin count appended, so a prefix rule would be a general
 * rule that quietly accepts a guess - the one thing this repository's footprint
 * lookups refuse to be (`lib/kicad/lead-span.ts`'s `LEAD_SPANS`/`UNSOURCED` is
 * the same shape). Extending it is a deliberate edit with a line of
 * `CompTypes.h` beside it and a row added to
 * `tests/stripboard/seed-geometry.test.ts`, which holds every entry against the
 * real binary.
 */
export const VEROROUTE_FOOTPRINT_ROWS: ReadonlyMap<string, number> = new Map([
  ["RESISTOR", 1],
  ["CAP_FILM", 1],
  ["CAP_FILM_WIDE", 3],
  ["SIP5", 1],
])

/**
 * Every rect on the board, read once.
 *
 * REFUSES rather than guessing, each condition because the rect it would return
 * is not the rect the fork will place: a FLOATING part, a part with no `PIN`
 * lines, a type with no recorded row count, a part already facing `N` or `S`,
 * and leads outside the rectangle the recorded figures describe.
 *
 * **A PART ALREADY FACING `N` OR `S` IS REFUSED, BY NAME.** For such a part
 * `SPAN` is the footprint's ROW count and its column extent - the stretched
 * length - is in no dump line, so there is no rect to read. Every arm starts
 * from `--import`'s output, where every part faces `W`, and after that the
 * occupancy is tracked rather than re-read; so this refusal is reachable only
 * from a board somebody turned by hand, where guessing would be worse than
 * stopping.
 */
export function occupancyOf(dump: BoardDump): Occupancy {
  const rects = new Map<string, PartRect>()
  const partRefs = new Set(dump.parts.map((part) => part.ref))
  for (const part of dump.parts) {
    if (part.placement === "floating") {
      refuseRef(
        part.ref,
        "it is FLOATING, so it prints no PIN lines and occupies no rectangle. It is NOT treated " +
          "as a bare hole at the origin: a floating part is also what --move and --rotate refuse " +
          "on (the shared FLOATING refusal), so the remedy is to place it before seeding.",
      )
    }
    const pins = dump.pins[part.ref] ?? []
    if (pins.length === 0) {
      refuseRef(
        part.ref,
        `it is placed at ${part.placement.row},${part.placement.col} and the dump reports no PIN ` +
          "lines for it, so there is nothing to check its footprint against. It is not assumed " +
          "to be a single hole: that would enumerate positions for a shape nobody measured.",
      )
    }
    const facing = usableDirection(part, "the stripboard seeding geometry")
    if (facing === "N" || facing === "S") {
      refuseRef(
        part.ref,
        `it faces ${facing}, and for a part across the strips SPAN is its footprint's ROW count ` +
          "while its column extent - the stretched length - appears in no dump line, so there " +
          "is no rectangle to read. It is NOT assumed square or unstretched. Every arm starts " +
          "from --import's output, where every part faces W; a board turned by hand has to be " +
          "turned back before it can be seeded from.",
      )
    }
    const rows = VEROROUTE_FOOTPRINT_ROWS.get(part.type)
    if (rows === undefined) {
      refuseRef(
        part.ref,
        `no footprint row count is recorded for VeroRoute type "${part.type}". SPAN gives the ` +
          "footprint's COLUMN count and no dump line gives its rows, so without an entry there " +
          "is no rectangle to place or turn. It is NOT guessed from the part's lead extent: " +
          "CAP_FILM_WIDE's leads sit in the middle row of three, so that reading is wrong by " +
          "one on a part this repository really places. Add an entry to " +
          "VEROROUTE_FOOTPRINT_ROWS in tools/stripboard/seed-geometry.ts with its line of " +
          ".tools/veroroute-perfboard/Src/CompTypes.h beside it, and a row in " +
          "tests/stripboard/seed-geometry.test.ts that holds it against the real binary. " +
          `Recorded: ${[...VEROROUTE_FOOTPRINT_ROWS.keys()].sort().join(", ")}.`,
      )
    }
    // `across: false` because a part facing N or S is refused above, so every
    // rect read from a dump has its leads along the columns.
    const rect = {
      row: part.placement.row,
      col: part.placement.col,
      rows,
      cols: part.span,
      across: false,
    }
    for (const pin of pins) {
      if (
        pin.row < rect.row ||
        pin.col < rect.col ||
        pin.row >= rect.row + rect.rows ||
        pin.col >= rect.col + rect.cols
      ) {
        refuseRef(
          part.ref,
          `its lead at ${pin.row},${pin.col} is outside the rectangle its AT ${rect.row},` +
            `${rect.col}, its ${rows}-row ${part.type} footprint and its SPAN ${part.span} ` +
            "describe. Either VEROROUTE_FOOTPRINT_ROWS's figure for this type is wrong or the " +
            "dump's AT is not the footprint's top-left corner; it is not widened to fit, " +
            "because a rect stretched to cover the leads would disagree with the one the fork " +
            "places by, so every turn predicted from it would be a guess.",
        )
      }
    }
    rects.set(part.ref, rect)
  }
  for (const ref of Object.keys(dump.pins)) {
    if (partRefs.has(ref)) continue
    for (const pin of dump.pins[ref] ?? []) {
      rects.set(ref, { row: pin.row, col: pin.col, rows: 1, cols: 1, across: false })
    }
  }
  return rects
}

/** One ref's rect, refusing a ref this occupancy does not carry. */
export function rectOf(occupancy: Occupancy, ref: string): PartRect {
  const rect = occupancy.get(ref)
  if (rect === undefined) {
    refuseRef(
      ref,
      `this board has no such part or pad. It carries ${[...occupancy.keys()].join(", ") || "(nothing)"}. ` +
        "It is not skipped: a part the geometry cannot find is a part the arm would never place.",
    )
  }
  return rect
}

function cellKey(row: number, col: number): string {
  return `${row},${col}`
}

/** Every cell some OTHER ref occupies. */
function cellsTakenBesides(occupancy: Occupancy, ref: string): ReadonlySet<string> {
  const taken = new Set<string>()
  for (const [other, rect] of occupancy) {
    if (other === ref) continue
    for (let row = rect.row; row < rect.row + rect.rows; row += 1) {
      for (let col = rect.col; col < rect.col + rect.cols; col += 1) taken.add(cellKey(row, col))
    }
  }
  return taken
}

function fits(rect: PartRect, grid: Grid, taken: ReadonlySet<string>): boolean {
  if (rect.row < 0 || rect.col < 0) return false
  if (rect.row + rect.rows > grid.rows || rect.col + rect.cols > grid.cols) return false
  for (let row = rect.row; row < rect.row + rect.rows; row += 1) {
    for (let col = rect.col; col < rect.col + rect.cols; col += 1) {
      if (taken.has(cellKey(row, col))) return false
    }
  }
  return true
}

/**
 * Every in-bounds origin at which `ref` fits beside everything already placed,
 * in row-major order.
 *
 * IN BOUNDS IS NOT FUSSINESS. `--move --to 40,5` on a 35x35 board exits 0 and
 * reports `GRID 41 35` - the board GREW - and `--move --to -5,5` lands the part
 * at `0,5` and moves three parts never named on the command line, because
 * `Pan()` runs before any wrap. Either renumbers every hole the next draw is
 * about to use, so a draw outside the grid is not a slightly worse placement; it
 * is a different board. `--move` refuses an off-board footprint outright and
 * names the rows it would have occupied, which is where the row count's
 * importance was measured.
 *
 * THE SET IS ENUMERATED AND THE DRAW IS AN INDEX INTO IT, which is what lets
 * `drawFrom` refuse: a part with nowhere to go refuses by name rather than
 * spinning in a retry loop or falling back to where it already was.
 */
export function admissibleOrigins(
  occupancy: Occupancy,
  grid: Grid,
  ref: string,
): readonly (readonly [number, number])[] {
  const rect = rectOf(occupancy, ref)
  const taken = cellsTakenBesides(occupancy, ref)
  const origins: (readonly [number, number])[] = []
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      if (fits({ ...rect, row, col }, grid, taken)) origins.push([row, col])
    }
  }
  return origins
}

/**
 * The same, from a dump: the signature Task 16's plan declares. It reads the
 * occupancy once and asks `admissibleOrigins`, so there is one enumeration and
 * not two.
 */
export function admissiblePositions(
  dump: BoardDump,
  ref: string,
): readonly (readonly [number, number])[] {
  return admissibleOrigins(occupancyOf(dump), dump.grid, ref)
}

/** `Board::RotateComps`'s own centring shift: `trunc((DY - DX) / 2)`, sign and all. */
function centringShift(before: number, after: number): number {
  const difference = before - after
  return difference > 0 ? Math.trunc(difference / 2) : -Math.trunc(-difference / 2)
}

/**
 * Where a part's rect lands after one clockwise quarter turn.
 *
 * `Board::RotateComps` for a single component, line by line: `DY` and `DX` are
 * the rect's height and width; `dy` and `dx` are the centring shifts
 * (`:1156-1160`); the rotated rect is `DX` rows by `DY` columns with its
 * top-left at `(rowMin + dy, colMin + dx)`. The function then adds `DY - 1` to
 * `dx` to find the new centre and subtracts `GetCompRows() - 1` back off again
 * (`:1176`, `:1198`), which for a single component cancels exactly - so the
 * part's own `AT` becomes the rotated rect's top-left.
 *
 * Checked against the binary on four real parts, where this arithmetic predicts
 * the `AT` the fork prints: a `1x3 CAP_FILM` at `20,10` turns to `19,11`, a
 * `1x5 RESISTOR` and a `1x5 SIP5` to `18,12`, and a `3x3 CAP_FILM_WIDE` stays at
 * `20,10`.
 */
export function turnedRect(rect: PartRect): PartRect {
  const dy = centringShift(rect.rows, rect.cols)
  const dx = centringShift(rect.cols, rect.rows)
  return {
    row: rect.row + dy,
    col: rect.col + dx,
    rows: rect.cols,
    cols: rect.rows,
    across: !rect.across,
  }
}

/**
 * Where a part's rect lands after one `--stretch --direction grow` (`by = 1`) or
 * `shrink` (`by = -1`).
 *
 * **`AT` DOES NOT MOVE AND THE GROWTH IS AWAY FROM IT**, which is measured
 * rather than assumed: `R2` facing `W` at `20,10` grows `SPAN` 5 to 6 with its
 * `AT` unchanged and its second lead moving from column 14 to 15; turned to `N`
 * at `18,12` it grows with `AT` and `SPAN` both unchanged and its second lead
 * moving from row 22 to 23. So the axis that changes is the one the leads run
 * along, which is what `across` records.
 *
 * The tool's own range is 2 to 16 holes for every stretchable family
 * (`CompTypes::GetMinLength`/`GetMaxLength`), and `lib/kicad/lead-span.ts` holds
 * the tighter per-footprint bound that `HC5` applies; neither is re-checked here,
 * because this function answers where the rect goes and not whether the part can
 * be bent to it.
 */
export function stretchedRect(rect: PartRect, by: 1 | -1): PartRect {
  return rect.across
    ? { ...rect, rows: rect.rows + by }
    : { ...rect, cols: rect.cols + by }
}

/**
 * Whether one clockwise quarter turn can be taken from where the part stands -
 * **the two refusals, both of them**.
 *
 * `--rotate` refuses a PAN: `RotateComps` computes the four overhangs of the
 * rotated bounds and calls `GrowThenPan` with them before touching anything
 * (`:1163-1171`), so a rotated rect reaching past any edge grows the grid and
 * renumbers every hole. And `Board::PutDown`'s result is DISCARDED (`:1238`), so
 * a rotated footprint that will not fit leaves the part floating and says
 * nothing - which the shared `VerifyNothingFloated` check turns into the second
 * refusal. Both are measured against the same rect arithmetic, which is why
 * there is one function and not two.
 */
export function turnable(occupancy: Occupancy, grid: Grid, ref: string): boolean {
  return fits(turnedRect(rectOf(occupancy, ref)), grid, cellsTakenBesides(occupancy, ref))
}

function replaced(occupancy: Occupancy, ref: string, rect: PartRect): Occupancy {
  const next = new Map(occupancy)
  next.set(ref, rect)
  return next
}

/** The same occupancy with one part's rect moved to a new origin. */
export function withPartMoved(
  occupancy: Occupancy,
  ref: string,
  to: readonly [number, number],
): Occupancy {
  const rect = rectOf(occupancy, ref)
  return replaced(occupancy, ref, { ...rect, row: to[0], col: to[1] })
}

/**
 * The same occupancy with one part turned a clockwise quarter turn.
 *
 * **THIS IS THE HALF THE FIRST VERSION OF THIS MODULE LEFT OUT, AND THE BUG IT
 * CAUSED.** Only moves were tracked, so a later draw proposed a hole an earlier
 * part's TURN had taken, and `--move` refused - measured as the random arm
 * stopping on `C23` at seed 4, and on a refused `--rotate` at the other four
 * seeds. A turn transposes a part's rect, so the occupancy has to follow every
 * gesture emitted, not only the moves.
 *
 * REFUSES A TURN THE MODEL SAYS CANNOT BE TAKEN rather than returning an
 * occupancy that disagrees with the board: the caller's job is to draw only from
 * origins the turn can be taken from, so reaching here is a defect in the caller
 * and not a state to carry forward.
 */
export function withPartTurned(occupancy: Occupancy, grid: Grid, ref: string): Occupancy {
  const rect = rectOf(occupancy, ref)
  if (!turnable(occupancy, grid, ref)) {
    refuseRef(
      ref,
      `one clockwise quarter turn from ${rect.row},${rect.col} (${rect.rows} by ${rect.cols}) ` +
        "would pan the board or leave the part floating, so the fork will refuse it. The " +
        "occupancy is not advanced past a gesture that cannot happen: a draw that reaches here " +
        "came from a set that was not narrowed by turnsTakeable(), which is " +
        "tools/stripboard/seed-arms.ts's job before it emits the move.",
    )
  }
  return replaced(occupancy, ref, turnedRect(rect))
}

/**
 * The occupancy after moving `ref` to `origin`, taking `turns` clockwise quarter
 * turns and applying `stretch` steps of `--stretch` - or `undefined` when any
 * one of those gestures is one the fork would refuse.
 *
 * **AN ORIGIN A PART CANNOT BE TURNED FROM IS NOT AN ADMISSIBLE ORIGIN FOR A
 * PART THAT IS ABOUT TO BE TURNED**, and the same goes for the stretch. Both
 * arms that place a part ask this question BEFORE emitting the move, so no
 * refusal is discovered by attempting one. Narrowing a set is not the same as
 * retrying on refusal: a retry would make the random arm's surviving draws
 * non-uniform over the set it claims to draw from, and the control arm's whole
 * value is that its distribution is stated.
 *
 * `stretch` is signed: positive grows, negative shrinks, zero does nothing.
 */
export function appliedGestures(
  occupancy: Occupancy,
  grid: Grid,
  ref: string,
  origin: readonly [number, number],
  turns: number,
  stretch: number,
): Occupancy | undefined {
  if (!fits({ ...rectOf(occupancy, ref), row: origin[0], col: origin[1] }, grid, cellsTakenBesides(occupancy, ref))) {
    return undefined
  }
  let working = withPartMoved(occupancy, ref, origin)
  for (let turn = 0; turn < turns; turn += 1) {
    if (!turnable(working, grid, ref)) return undefined
    working = withPartTurned(working, grid, ref)
  }
  const by = stretch > 0 ? 1 : -1
  for (let step = 0; step < Math.abs(stretch); step += 1) {
    const stretched = stretchedRect(rectOf(working, ref), by)
    if (stretched.rows < 1 || stretched.cols < 1) return undefined
    if (!fits(stretched, grid, cellsTakenBesides(working, ref))) return undefined
    working = replaced(working, ref, stretched)
  }
  return working
}

/**
 * Whether `turns` clockwise quarter turns can all be taken after moving `ref` to
 * `origin` - the boolean the random arm, which never stretches, asks for.
 */
export function turnsTakeable(
  occupancy: Occupancy,
  grid: Grid,
  ref: string,
  origin: readonly [number, number],
  turns: number,
): boolean {
  return appliedGestures(occupancy, grid, ref, origin, turns, 0) !== undefined
}
