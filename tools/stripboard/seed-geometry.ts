/**
 * What a board's dump SAYS about its parts' geometry: the footprint rectangle a
 * `Board::PutDown` has to find room for, and the one table the dump cannot
 * supply.
 *
 * THE AUTHORITY for the footprint shapes is
 * `.tools/veroroute-perfboard/Src/CompTypes.h:548`'s
 * `CompTypes::GetMakeInstructions`. Where this module and that source differ the
 * source wins and this comment is the defect.
 * `tests/stripboard/seed-geometry.test.ts` holds every entry below against the
 * real binary and fails rather than skips when the binary is absent.
 *
 * **THE SPLIT FROM `./seed-placement.ts` IS THE READ/ARITHMETIC SEAM.** This
 * file READS a dump into rects; that file does the ARITHMETIC of moving, turning
 * and stretching them, transcribed from `Board::RotateComps`. One file carrying
 * both reached 494 lines against this repository's 300-500 ceiling, and
 * `VEROROUTE_FOOTPRINT_ROWS` is designed to grow - the next entry would have
 * breached 500 in the same edit that added it.
 *
 * **ROTATION IS AVAILABLE, AND THE BRIEF'S WARNING DOES NOT GENERALISE.**
 * Measured on an `--import --strips horizontal` low-boost board: one of 17 parts
 * turns where the first-fit sweep left it - `C18`, the only SQUARE footprint,
 * whose centring shift is therefore zero - and 17 of 17 turn after a move to an
 * interior origin. The "rotatable 0, refused 60" sweep was taken on the
 * COMMITTED boards, which is not where any arm starts. *Move before you turn* is
 * the rule and it works.
 */
import { usableDirection, type BoardDump } from "../guide/dump.ts"

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

/** Every refusal in these two modules, in one shape: the part, then what is wrong. */
export function refuseRef(ref: string, detail: string): never {
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
  // **EVERY WIRE IS IN HERE TOO, AND THE FORK IS WHY.** A wire occupies holes
  // exactly as a part does: `--move C19 --to 10,10` onto a wire's own span is
  // refused with the shared FLOATING refusal, whose own words are
  // *"Board::CanPutDown refuses a collision with occupied holes rather than
  // allowing an overlap"* - measured against the pinned binary on the
  // import-placed low-boost board with a wire at 10,10. So an occupancy without
  // wires proposes part gestures the fork refuses, and - the reason this gap
  // mattered - leaves `add-wire` with no model at all, because there is nothing
  // to check a wire's own landing against.
  //
  // THE RECT COMES FROM `ENDS` AND NOT FROM A FOOTPRINT TABLE: a wire's two end
  // holes bound it, so `rows` and `cols` are the span between them and `across`
  // says which axis its length runs along - which is what `stretchedRect` needs
  // and what `turnedRect` transposes. No `VEROROUTE_FOOTPRINT_ROWS` entry is
  // needed or wanted for a wire; the dump states the geometry outright.
  for (const wire of dump.wires) {
    if (rects.has(wire.name)) {
      refuseRef(
        wire.name,
        "is both a WIRE and a PART on this board, so one occupancy entry would have to describe " +
          "two things. It is not resolved by preferring either: which one a gesture naming that " +
          "ref would move is not in the data, and the fork's own --ref takes one name.",
      )
    }
    const [from, to] = wire.ends
    rects.set(wire.name, {
      row: Math.min(from.row, to.row),
      col: Math.min(from.col, to.col),
      rows: Math.abs(from.row - to.row) + 1,
      cols: Math.abs(from.col - to.col) + 1,
      across: from.row !== to.row,
    })
  }
  return rects
}

/**
 * Whether `--stretch` can change a part's length at all, and between which
 * bounds - the SECOND table the dump cannot supply, beside
 * `VEROROUTE_FOOTPRINT_ROWS`.
 *
 * **TRANSCRIBED FROM `Component::CanStretch`**
 * (`.tools/veroroute-perfboard/Src/FootPrint.h:55`), which is a fixed family
 * list returning `(grow && GetCols() < GetMaxLength(type)) || (!grow &&
 * GetCols() > GetMinLength(type))` and **`false` for every type not on it**,
 * with the bounds from `CompTypes::GetMinLength`/`GetMaxLength`
 * (`CompTypes.h:823,863`).
 *
 * **IT EXISTS BECAUSE A GEOMETRIC FIT IS NOT A STRETCHABLE PART, AND THE REAL
 * BINARY IS WHAT SHOWED THAT.** `./seed-placement.ts`'s `stretchedRect` says
 * outright that the family bound "is not re-checked here", and nothing was
 * checking it anywhere: the first real climb on the import-placed low-boost
 * board proposed `--stretch junction_grounds --direction grow`, which the fork
 * refused with *"junction_grounds cannot grow"* after 24 accepted gestures.
 *
 * **`SIP5` IS LISTED AS UNSTRETCHABLE ON A MEASUREMENT, NOT ON A READING OF
 * THE SOURCE.** `CanStretch` names `COMP::SIP` and `GetMinLength`/
 * `GetMaxLength` give it 1 and 255, which would allow both directions on a
 * five-column part - so the source as read predicts the opposite of what
 * happens. Measured on the import-placed low-boost board: both `SIP5` parts
 * refuse BOTH directions (`junction_grounds cannot grow`, `cannot shrink`, and
 * the same for `junction_signals`), while `RESISTOR` and `CAP_FILM_WIDE` parts
 * shrink on the same board. **Which `COMP` the dump's `SIP5` really is was not
 * established**, so the entry records the measurement and says the source
 * reading disagrees, rather than asserting a cause.
 *
 * **AN UNLISTED TYPE REFUSES BY NAME**, exactly as `VEROROUTE_FOOTPRINT_ROWS`
 * does and for the same reason: an absent entry means nobody has measured that
 * family, which is not the same claim as "it cannot stretch", and a general
 * rule that quietly accepts a guess is the one thing these lookups refuse to
 * be.
 */
export type StretchBound =
  | { readonly stretchable: false; readonly basis: string }
  | { readonly stretchable: true; readonly minLength: number; readonly maxLength: number }

export const VEROROUTE_STRETCH_BOUNDS: ReadonlyMap<string, StretchBound> = new Map([
  ["RESISTOR", { stretchable: true, minLength: 2, maxLength: 16 }],
  ["CAP_FILM", { stretchable: true, minLength: 2, maxLength: 16 }],
  ["CAP_FILM_WIDE", { stretchable: true, minLength: 2, maxLength: 16 }],
  // MEASURED ON THE PINNED BINARY, because a wire has no PART line and so no
  // type string in any dump - `WIRE` is the name this table gives it and
  // `./moves-wire.ts` is the only caller that asks. A wire created by
  // `--author --op add-wire` is three holes long; it shrinks once to two and
  // then refuses (`--stretch: Wire1 cannot shrink`), and it grows thirteen
  // times to sixteen and then refuses. Same 2-to-16 range the stretchable
  // families carry, arrived at by stepping the real verb rather than by reading
  // it off `CompTypes::GetMinLength`/`GetMaxLength` for a type nobody has
  // matched to a `COMP`.
  ["WIRE", { stretchable: true, minLength: 2, maxLength: 16 }],
  [
    "SIP5",
    {
      stretchable: false,
      basis:
        "measured on the import-placed low-boost board: --stretch refuses BOTH directions on " +
        "both SIP5 parts (junction_grounds and junction_signals, each 5 columns at DIRECTION W) " +
        "while RESISTOR and CAP_FILM_WIDE parts shrink on that same board. Component::CanStretch " +
        "names COMP::SIP with GetMinLength 1 and GetMaxLength 255, which predicts the opposite, " +
        "so which COMP the dump's SIP5 really is has NOT been established and this entry rests " +
        "on the measurement rather than on the source reading",
    },
  ],
])

/** One type's stretch bound, refusing a type nobody has measured. */
export function stretchBoundFor(type: string): StretchBound {
  const bound = VEROROUTE_STRETCH_BOUNDS.get(type)
  if (bound === undefined) {
    throw new Error(
      `no stretch bound is recorded for VeroRoute type "${type}". Component::CanStretch is a ` +
        "fixed family list and returns false for everything not on it, so a part's length can " +
        "only be changed where somebody has established which case it falls in. It is NOT " +
        "assumed unstretchable and NOT assumed stretchable: the first reads as a part the " +
        "search will never bend, and the second proposes gestures the fork refuses - which is " +
        "how the first real climb died after 24 accepted moves. Add an entry to " +
        "VEROROUTE_STRETCH_BOUNDS in tools/stripboard/seed-geometry.ts, with the line of " +
        ".tools/veroroute-perfboard/Src/FootPrint.h or the measurement it rests on, and a row " +
        `in tests/stripboard/seed-geometry.test.ts. Recorded: ${[...VEROROUTE_STRETCH_BOUNDS.keys()].sort().join(", ")}.`,
    )
  }
  return bound
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
