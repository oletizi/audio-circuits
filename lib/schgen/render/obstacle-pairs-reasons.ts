/**
 * The reason fragments several matrix cells share, written once.
 *
 * These are not decoration. A `meaninglessBecause` that repeats is a sign that
 * one geometric fact decides several cells, and naming the fact once makes the
 * disagreement cheap: a reader who thinks `NUMBER_BOX_RESOLUTION` is wrong
 * knows, from one place, exactly which cells fall with it. Each fragment is
 * phrased so it can be checked against the source it names.
 *
 * Supporting data for `obstacle-matrix.ts`; see that file for the frame.
 */

/**
 * Why `overlapProblems` buys so many cells, and what it does not buy.
 * `LibSymbol.boxes` is `lib-pins.ts`'s `unitBoxes`, which takes
 * `[[p.x, p.y], pinEnd(p)]` per pin — both ends — so the box spans to the pin
 * tips and contains everything between the graphics and the tips.
 */
export const CLEARANCE_BOX =
  "`overlapProblems` (lib/schgen/render/layout-check.ts, private, reached from `checkLayout`) places " +
  "`LibSymbol.boxes` for every placement and refuses `boxesOverlap(p.box, q.box)` for every pair of them. " +
  "`boxes` is `lib-pins.ts`'s `unitBoxes`: graphics plus BOTH pin ends, so it spans to the pin tips"

/**
 * Why no cell naming `frame-border` against a non-text category names a function.
 *
 * **THE TASK NUMBER IS 6b, NOT 8, AND IT WAS WRONG IN FOUR PLACES AT ONCE.**
 * Controller ruling R14 split Task 6 around Task 7, and `render/frames.ts`
 * belongs to **Task 6b** - see `docs/known-gaps.md` **G131** and **G135**.
 * This constant, the `body`/`pwr-flag-glyph` cell, `NO_FLAG_PRODUCER` and
 * `NOT_IN_THIS_TREE["frames.ts"]` all said Task 8; correcting one of them at
 * Task 7 turned inherited staleness into a contradiction inside the one
 * module whose whole purpose is that its citations are checkable. All four
 * now say Task 6b.
 */
export const FRAME_DERIVED =
  "A frame's box is not placed against what is inside it; it is DERIVED from it. `drawnBoxes` " +
  "(lib/schgen/render/drawn-extent.ts) returns every box a block layout draws — `scene.texts`, " +
  "`scene.bodies`, `scene.pinTexts` and the bounding boxes of `scene.segments` — and `boundsOf` unions " +
  "them, and that union is what a frame is sized from. An enclosed item is inside its border by " +
  "construction rather than by a refusal, which is why `textProblems`'s frame clause tests only `texts`: " +
  "a field is re-placed by the field placer after the extent was measured and is the one thing that can " +
  "move outward. **THIS REASON RESTS ON `render/frames.ts`, WHICH IS NOT IN THIS TREE** (Task 6b); it is " +
  "verified here only as far as `drawn-extent.ts` goes. See docs/known-gaps.md"

/** Why a DNP cross needs no cell against a foreign category — arithmetic, not a test. */
export const CROSS_BOUND =
  "`dnpCross` (lib/schgen/render/pin-marks.ts) grows the unit's own `unitText(u, pl).body` by " +
  "`mx = max(0.6·ox, 0.3·oy)` then `my = max(0.6·oy, 0.3·mx)`, where `ox`/`oy` are the pins' overhang " +
  "beyond that body. Along an axis that carries pins the margin is at most 0.6 of the overhang, so the " +
  "cross stays inside that part's own clearance box (`LibSymbol.boxes`, which spans to the pin tips), and " +
  "every foreign unit is kept out of that box by `overlapProblems`. It leaves the box only on an axis " +
  "carrying NO pins, where `mx = 0.3·oy` — at most 0.3 of a pin length, 0.762 mm for a 2.54 mm pin. That " +
  "arithmetic over the source is the whole reason; it is not a test"

/** Why `junction` needs no cell: it is derived from items that are already checked. */
export const JUNCTION_DERIVED =
  "A junction is cosmetic and derived, not placed: `junctionPoints` (lib/schgen/render/connectivity.ts) " +
  "returns exactly the points where three or more wire ends and pin ends coincide, and `sheet-types.ts` " +
  "states the invariant for a sheet — \"Cosmetic only: exactly the junctionPoints() of the sheet's items\". " +
  "So a junction is never anywhere a wire end or pin end is not, and every such point is already governed " +
  "by `checkWireSafety` and `sceneClearanceProblems`. A dot adds no reach of its own"

/**
 * The single most load-bearing reason in the matrix: why a pin number is an
 * obstacle for text and for nothing else. `GRID` is 1270 µm in
 * `geometry.ts`, so `(3 * GRID) / 2` is 1905 µm.
 */
export const NUMBER_BOX_RESOLUTION =
  "A pin-number box is a deliberate over-estimate. `unitText` boxes it as " +
  "`along(tip, dx, dy, p.length, (3 * GRID) / 2)` — `GRID` is 1270 µm here, so the box reaches 1.905 mm " +
  "EITHER SIDE of the pin line (3.81 mm across) to cover a number KiCad may draw on either side of it, " +
  "and its own comment says so. That is more than the 1.27 mm half-gap between pins on KiCad's " +
  "conventional 2.54 mm symbol pitch, so one pin's number box always reaches its neighbour's pin line, " +
  "and it always covers its own unit's body-side pin end. A test at this text resolution would refuse " +
  "every multi-pin unit against itself, which is exactly why `textProblems` makes `pinTexts` an obstacle " +
  "for `texts` and for nothing else"

/** What `symbolTextOverlaps` decides, and the one thing it is silent about. */
export const SELF_TEXT_ONLY =
  "WITHIN one unit of one symbol only, and in `symbol-self-text.ts`'s OWN text model (`run`, with " +
  "`ACROSS = GRID + 254`) rather than `unitText`'s `along` — two models of the same geometry, which is a " +
  "finding in its own right and is recorded in docs/known-gaps.md. Two DIFFERENT units' pin texts, placed " +
  "side by side on a sheet, are compared by nothing: `textProblems` has `pinTexts` as an obstacle for " +
  "`texts` and never for `pinTexts`, and `overlapProblems` keeps the two units' clearance boxes apart, " +
  "which does not keep their 3.81 mm-wide number boxes apart"

/**
 * Why nothing in this tree exercises a `pwr-flag-glyph` cell yet.
 *
 * **BOTH SITES ARE NAMED BECAUSE TASK 7 FALSIFIED THE ENUMERATION AND NOT THE
 * CONCLUSION.** Round 1 named `anchorsToSymbols` as the one site hard-coding
 * `flag: false`; `fanout-rows.ts`'s `anchorExtent` builds a second
 * `PowerSymbol` the same way, to measure a row's far anchor rather than to
 * draw it. That makes the conclusion stronger, not weaker - there is still no
 * `flag: true` producer - but a reader checking the claim against one file
 * would have found a site the reason did not mention. See
 * `docs/known-gaps.md` **G134**.
 */
export const NO_FLAG_PRODUCER =
  "**NOTHING IN THIS TREE PRODUCES A `flag: true` PowerSymbol**: `anchorsToSymbols` (power-text.ts) " +
  "hard-codes `flag: false`, and so does the measurement-only symbol `anchorExtent` builds in " +
  "fanout-rows.ts; the only producer is `render/frames.ts`'s flag content, which is not " +
  "ported (Task 6b). So this cell is a claim about the named check's shape, exercised by nothing here yet"
