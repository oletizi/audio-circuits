/**
 * Every type the pinned fork's `--dump-board` grammar names, and the three
 * refusals a CONSUMER of one makes.
 *
 * WHY THIS IS A SEPARATE FILE FROM THE PARSER, and it is this repository's own
 * split rather than a new one: `lead-span-model.ts` / `lead-span.ts` and
 * `pin-pattern-model.ts` / `pin-pattern.ts` already divide the same way, and
 * the fork divides `Headless_dump.cpp` from `Headless_dump_pins.cpp` for the
 * same reason. `./dump.ts` reads the text; this file says what the text means
 * and holds the refusals that belong to whoever ACTS on a field rather than to
 * whoever read it. Task 7's two new fields took the single file past this
 * repository's 300-500 line ceiling, which is what forced the split; nothing
 * moved but location, and `./dump.ts` re-exports all of it so no consumer
 * changed.
 *
 * THE THREE CONSUMER-SIDE REFUSALS, and why they are not the parser's.
 * `noPinLinesMessage`, `boundsOf` and `usableDirection` each answer a
 * question the TEXT cannot: whether a field's absence matters depends on what
 * wanted it. A dump with no `BOUNDS` line and a placed part with no
 * `DIRECTION` are both READABLE BOARDS - every committed `.dump` fixture here
 * is one, two of them frozen evidence that may not be regenerated - so a
 * reader that refused them would reject files nobody is allowed to change.
 * `docs/stripboard/pipeline-verification.md` section 2.6 is the authority for
 * that rule, and it is not this file's to change.
 */

/** The board's size in holes, from its one `GRID <rows> <cols>` line. */
export interface Grid {
  readonly rows: number
  readonly cols: number
}

/** Where a part's pins land, or that it has none yet because it is unplaced. */
export type PartPlacement = { readonly row: number; readonly col: number } | "floating"

/**
 * One `BOUNDS <minRow>,<minCol> <maxRow>,<maxCol>` line's rect, INCLUSIVE at
 * both ends.
 *
 * READ WHAT IT IS BEFORE READING IT. `Board::GetBounds` (`Src/Board.h`)
 * returns the union of THREE sources and reports failure only when all three
 * are empty: painted copper and pin holes; every component's
 * `GetFootprintRect()`, filtered on NEITHER `GetIsPlaced()` nor type, so an
 * unplaced part still contributes the rect it last sat in; and every TEXT
 * LABEL's rect, which is an annotation and not a physical feature. So the line
 * can OVER-state, it is NOT the fabrication extent, and nothing in the dump
 * attributes any of its four numbers to one of the three sources.
 * `docs/stripboard/pipeline-verification.md` section 2.1 carries the
 * measurements: on `transistor-preamp-staged` `BOUNDS` reaches five columns
 * further right than any hole the dump enumerates, while on `pultec-low-boost`
 * and `pt2399-core` the two coincide exactly - so a comparison on one board
 * concludes the wrong thing about both.
 */
export interface Bounds {
  readonly minRow: number
  readonly minCol: number
  readonly maxRow: number
  readonly maxCol: number
}

/**
 * A placed part's `DIRECTION` field: `Component::GetDirection()`.
 *
 * `UNKNOWN` IS A RECEIVED VALUE AND NOT A PARSE FAILURE. `Component::Load`
 * reads the direction as a raw char out of the `.vrt`, so a damaged or
 * hand-edited board can carry a value that is none of the four, and the dump
 * prints `UNKNOWN` rather than inventing `W`. It is narrowed by comparison
 * here, never cast and never normalised, and the consumer that acts on a
 * direction refuses it BY NAME (`usableDirection`) - which is what the dump
 * itself does rather than guessing.
 */
export type PartDirection = "W" | "E" | "N" | "S" | "UNKNOWN"

const PART_DIRECTIONS: readonly PartDirection[] = ["W", "E", "N", "S", "UNKNOWN"]

/** One `PART <ref> <type> <value> <FLOATING|AT <row>,<col>> SPAN <n> [DIRECTION <d>]` line. */
export interface Part {
  readonly ref: string
  readonly type: string
  readonly value: string
  readonly placement: PartPlacement
  /** The footprint's own column span (body width for an electrolytic) - NOT a lead span. */
  readonly span: number
  /**
   * The part's orientation, when the dump states one.
   *
   * `undefined` MEANS "THE DUMP DID NOT SAY", AND THAT INCLUDES A PLACED
   * PART. The field is optional on a placed part too, and the reason is
   * recorded beside the type rather than left to be rediscovered: a capture is
   * older than the grammar by construction. Every committed dump text in this
   * repository - the `.dump` fixtures and the hand-written dump literals in
   * tests - carries placed `PART` lines with no `DIRECTION` field, because they
   * were captured before the field existed, and two of those captures are
   * frozen evidence that may not be regenerated. A contract reading "undefined
   * exactly when the part is floating" would have refused all of them at once
   * the moment `veroroute.pin` advanced - a mass failure of files nobody is
   * allowed to change, triggered by a one-line pin bump
   * (`docs/stripboard/pipeline-verification.md` section 2.6, which is the
   * authority for this rule).
   *
   * WHAT IS STILL REFUSED IS THE CONTRADICTION: a `FLOATING` part carrying a
   * direction, which no build prints and which would mean two fields on one
   * line disagree. The refusal for a consumer that NEEDS a direction and has
   * none, or has `UNKNOWN`, belongs to that consumer: `usableDirection`.
   */
  readonly direction: PartDirection | undefined
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
  /**
   * The `BOUNDS` rect, when the dump carries one that names a rect.
   *
   * `undefined` COVERS TWO DIFFERENT THINGS AND NEITHER IS A DEFAULT: the line
   * is absent, because the capture predates the grammar; or the line reads
   * `BOUNDS - -`, which is `GetBounds` reporting failure on a board with
   * nothing on it at all - no copper, no pin, no component, no label - whose
   * wrong-ended sentinels would read as a one-hole board if they were parsed as
   * a rect. The refusal belongs to the consumer that needs the figure
   * (`boundsOf`), not to this reader; see `Part.direction` for why.
   */
  readonly bounds: Bounds | undefined
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

/** The fix for a dump that lacks what the pinned fork always prints. */
export const REBUILD_PINNED_FORK =
  "rebuild the pinned veroroute fork (`make veroroute` in the board's directory) and run this again"


/**
 * The refusal for a placed part with no PIN lines: its leads' holes are
 * unknown. One wording for every step that needs a part's leads.
 *
 * **IT NAMES TWO CAUSES, BECAUSE IT USED TO NAME ONE AND THE ONE WAS WRONG.**
 * The message asserted *"the dump came from an unpinned or older veroroute
 * fork"*, which is a diagnosis and not an observation - and
 * `docs/stripboard/pipeline-verification.md` §6.9 measured it being false: one
 * run in fifteen refused here while the pinned fork produced 763,545 other
 * invocations in the same sweep, a replay of the same arm, seed, board and code
 * passed the refusal point twice, and 333 of 333 of that seed's candidates
 * re-dumped with every placed part pinned. A refusal that names the wrong fix
 * sends a reader to rebuild a binary that is already correct, so this one now
 * says how to tell the two apart: **re-dump the same board.** An unpinned
 * binary never prints `PIN` lines, so the re-dump is identical; an incomplete
 * dump from a binary that normally prints them comes back clean.
 */
export function noPinLinesMessage(part: Part): string {
  return (
    `part ${part.ref} (${part.type}) is placed but the dump has no PIN lines for it, so where its leads go ` +
    "is unknown. TWO CAUSES, TOLD APART BY RE-DUMPING THE SAME BOARD: an unpinned or older " +
    `veroroute fork never prints them, the re-dump is identical, and the fix is to ${REBUILD_PINNED_FORK}; ` +
    "or one dump came back incomplete from a binary that does print them, the re-dump is clean, and " +
    "the fix is to repeat the step rather than the build (docs/stripboard/pipeline-verification.md " +
    "section 6.9 measures one such case). It is refused either way rather than read as a part with no " +
    "leads."
  )
}

/**
 * The `BOUNDS` rect for a consumer that needs one, refusing by name when the
 * dump has none.
 *
 * THE REFUSAL IS HERE AND NOT IN THE PARSER, and the choice is section 2.6's:
 * a dump with no `BOUNDS` line is still a readable board, so the reader of the
 * text records its absence and the consumer that acts on the figure is what
 * refuses. `context` says which consumer asked, because "no BOUNDS" is
 * actionable only together with what wanted it.
 *
 * IT IS NOT DEFAULTED TO THE EXTENT OF THE ENUMERATED HOLES, and that is the
 * substitution this function exists to prevent: the hole extent is a LOWER
 * bound on physical extent, because a part's body overhangs its leads, so
 * standing it in for `BOUNDS` would silently LOOSEN whatever constraint asked -
 * a board graded as fitting the stock that does not. Capture the board again
 * with the pinned fork instead.
 */
export function boundsOf(dump: BoardDump, context: string): Bounds {
  if (dump.bounds === undefined) {
    throw new Error(
      `${context} needs this board's BOUNDS rect and the dump states none - either the line is ` +
        'absent, because the capture predates it, or it reads "BOUNDS - -" for a board with ' +
        "nothing on it.\nThis is NOT defaulted to the extent of the holes the dump enumerates: " +
        "that extent is a LOWER bound on physical extent, since a body overhangs its leads, so " +
        `substituting it would silently loosen the check.\n${REBUILD_PINNED_FORK}, which always ` +
        "emits BOUNDS, and capture this board again.",
    )
  }
  return dump.bounds
}

/**
 * One of the four real directions for a consumer that needs to act on it,
 * refusing by name for an absent field and for `UNKNOWN`.
 *
 * The two faults are separate messages because the fixes differ: an absent
 * field is a capture older than the grammar, and `UNKNOWN` is a `.vrt`
 * carrying a direction char that is none of the four. Neither is read as `W`.
 */
export function usableDirection(part: Part, context: string): "W" | "E" | "N" | "S" {
  if (part.direction === undefined) {
    throw new Error(
      `${context} needs PART ${part.ref}'s DIRECTION and the dump's PART line carries no such ` +
        "field. The field is optional on a placed part because a capture is older than the " +
        "grammar by construction (docs/stripboard/pipeline-verification.md section 2.6), so the " +
        `refusal belongs here rather than in the reader.\n${REBUILD_PINNED_FORK} and capture ` +
        "this board again.",
    )
  }
  if (part.direction === "UNKNOWN") {
    throw new Error(
      `${context} needs PART ${part.ref}'s DIRECTION and the dump reports UNKNOWN, which is what ` +
        "it prints for a .vrt carrying a raw direction char that is none of W, E, N or S " +
        "(Component::Load reads it unvalidated, and Component::Rotate ignores an unknown char " +
        "rather than normalising it).\nThis is NOT read as W: a guessed orientation is a " +
        "guessed placement. Open the board in VeroRoute and rotate the part to a known " +
        "direction, or fix the .vrt that carries the damaged char.",
    )
  }
  return part.direction
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

/** A row's letters alone: row 0 is `A`, 26 is `AA` (see `holeName`). */
export function rowName(row: number): string {
  return holeName(row, 0).slice(0, -1)
}
