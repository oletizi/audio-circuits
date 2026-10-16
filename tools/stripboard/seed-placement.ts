/**
 * The ARITHMETIC of placing a part: where a move, a quarter turn and a stretch
 * each leave its rectangle, and which gestures the fork will accept -
 * **transcribed from `Board::RotateComps`, not inferred from behaviour**.
 *
 * THE AUTHORITY is `.tools/veroroute-perfboard/Src/Board_components.cpp:1146`
 * (`Board::RotateComps`) and `Src/Headless_rotate.h`'s five recorded properties
 * of it. Every line of arithmetic below is one of theirs, named where it is
 * used. `./seed-geometry.ts` reads a dump into the rects this file moves around;
 * the split is at that read/arithmetic seam.
 *
 * **WHY A MODEL AT ALL, RATHER THAN TRYING THE GESTURE.** The random arm draws
 * uniformly from an enumerated set, and a set whose members were discovered by
 * attempting them would make the arm a retry loop - which silently reshapes the
 * distribution the control arm exists to be. So the set is narrowed in advance,
 * by this model, and the arm says so. The fork remains the authority: a gesture
 * it refuses still stops the arm and names the part. Measured: 43 gestures driven
 * against the real binary with zero divergence from these predictions.
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
 * rect from the dump ONCE, and the functions here carry it forward through the
 * gestures an arm emits. That is not an optimisation: a dump does not describe a
 * TURNED part's footprint at all - `SPAN` is its column extent and the stretched
 * extent that became its row count appears nowhere - so a model that re-derived
 * each rect from the dump could follow a move and not a turn. That was a bug: a
 * later draw proposed a hole an earlier part's turn had taken.
 */
import type { BoardDump, Grid } from "../guide/dump.ts"
import { occupancyOf, rectOf, refuseRef, type Occupancy, type PartRect } from "./seed-geometry.ts"

/** `rectOf` re-exported, because every consumer of this module needs it beside these. */
export { rectOf } from "./seed-geometry.ts"

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
 * The two orders a part's quarter turns and its stretch steps can be applied in,
 * in the sequence `place` tries them.
 *
 * **IT IS A CHOICE AND NOT A CONVENTION, AND BAKING ONE IN WAS A BUG.** A
 * stretch changes the rect along the axis the LEADS run on, and a turn changes
 * which axis that is - so the two orders need different clearance and one can
 * place where the other cannot. Measured on `SI_HI_CUT_R1` going to strip 0 of
 * the import-placed low-boost board, 1 turn and 3 shrinks, over all 1225 origins
 * of a 35x35 grid: **turn first, 0 origins work**, because the turned-but-
 * unshrunk rect is 5 rows tall and no column has that clearance;
 * **shrink first, 19 work**, the first at `0,0` with the leads landing on rows 0
 * and 1 - the two strips the arrangement asked for. A fixed `turn-then-stretch`
 * therefore reported a construction that had never been tried.
 *
 * **NEITHER ORDER IS DECLARED BETTER.** `turn-then-stretch` is first only
 * because it was the original, so a board that placed before still places the
 * same way; nothing measured says it is universally preferable, and nothing here
 * says so either.
 */
export type GestureOrder = "turn-then-stretch" | "stretch-then-turn"

/** Both orders, in the sequence they are tried. */
export const GESTURE_ORDERS: readonly GestureOrder[] = [
  "turn-then-stretch",
  "stretch-then-turn",
]

/** One turn, or `undefined` when the fork would refuse it. */
function afterTurn(occupancy: Occupancy, grid: Grid, ref: string): Occupancy | undefined {
  if (!turnable(occupancy, grid, ref)) return undefined
  return withPartTurned(occupancy, grid, ref)
}

/** One stretch step, or `undefined` when it would not fit. */
function afterStretch(
  occupancy: Occupancy,
  grid: Grid,
  ref: string,
  by: 1 | -1,
): Occupancy | undefined {
  const stretched = stretchedRect(rectOf(occupancy, ref), by)
  if (stretched.rows < 1 || stretched.cols < 1) return undefined
  if (!fits(stretched, grid, cellsTakenBesides(occupancy, ref))) return undefined
  return replaced(occupancy, ref, stretched)
}

/**
 * The occupancy after moving `ref` to `origin` and applying `turns` clockwise
 * quarter turns and `stretch` steps of `--stretch` **in `order`** - or
 * `undefined` when any one of those gestures is one the fork would refuse.
 *
 * **AN ORIGIN A PART CANNOT BE TURNED FROM IS NOT AN ADMISSIBLE ORIGIN FOR A
 * PART THAT IS ABOUT TO BE TURNED**, and the same goes for the stretch. Every
 * arm that places a part asks this question BEFORE emitting the move, so no
 * refusal is discovered by attempting one. Narrowing a set is not the same as
 * retrying on refusal: a retry would make the random arm's surviving draws
 * non-uniform over the set it claims to draw from, and the control arm's whole
 * value is that its distribution is stated.
 *
 * `stretch` is signed: positive grows, negative shrinks, zero does nothing - and
 * at zero the two orders are the same sequence, which is why the random arm,
 * which never stretches, does not have to choose between them.
 */
export function appliedGestures(
  occupancy: Occupancy,
  grid: Grid,
  ref: string,
  origin: readonly [number, number],
  turns: number,
  stretch: number,
  order: GestureOrder,
): Occupancy | undefined {
  if (
    !fits(
      { ...rectOf(occupancy, ref), row: origin[0], col: origin[1] },
      grid,
      cellsTakenBesides(occupancy, ref),
    )
  ) {
    return undefined
  }
  let working: Occupancy | undefined = withPartMoved(occupancy, ref, origin)
  const by = stretch > 0 ? 1 : -1
  const turn = (): void => {
    for (let step = 0; step < turns && working !== undefined; step += 1) {
      working = afterTurn(working, grid, ref)
    }
  }
  const pull = (): void => {
    for (let step = 0; step < Math.abs(stretch) && working !== undefined; step += 1) {
      working = afterStretch(working, grid, ref, by)
    }
  }
  if (order === "turn-then-stretch") {
    turn()
    pull()
  } else {
    pull()
    turn()
  }
  return working
}

/**
 * Whether `turns` clockwise quarter turns can all be taken after moving `ref` to
 * `origin` - the boolean the random arm, which never stretches, asks for.
 *
 * It names an order because the signature requires one; with `stretch` at zero
 * both orders are the same sequence of gestures.
 */
export function turnsTakeable(
  occupancy: Occupancy,
  grid: Grid,
  ref: string,
  origin: readonly [number, number],
  turns: number,
): boolean {
  return appliedGestures(occupancy, grid, ref, origin, turns, 0, "turn-then-stretch") !== undefined
}
