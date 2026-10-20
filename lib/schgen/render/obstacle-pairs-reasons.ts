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
 * **RE-READ AT TASK 6b AGAINST THE LANDED `render/frames.ts`, AND THE RE-READ CHANGED THE REASON
 * RATHER THAN CONFIRMING IT.** This constant used to rest on the module's absence and to name
 * `drawn-extent.ts`'s `drawnBoxes` as what sizes a frame. **Nothing sizes a frame from that
 * function.** `frames.ts` has a SECOND, private `drawnBoxes(symbols, parts)` of its own, and the
 * two do not return the same thing: `drawn-extent.ts`'s unions `scene.texts`, `scene.bodies`,
 * `scene.pinTexts` and the segment boxes (it is what a template measures its own drawing with, for
 * field placement), while `frames.ts`'s unions `scene.texts` and `scene.bodies` **only**. So the
 * old reason's conclusion was right and its mechanism named the wrong function - which is the
 * shape `docs/known-gaps.md` **G134** records for `NO_FLAG_PRODUCER` at Task 7.
 *
 * The task number was also wrong in four places at once before Task 7 (`Task 8` for what ruling
 * R14 had made Task 6b); that is settled and the module has now landed.
 */
export const FRAME_DERIVED =
  "A frame's box is not placed against what is inside it; it is DERIVED from it, and the derivation " +
  "leaves a 2.54 mm margin. `blockContent` (lib/schgen/render/frames.ts) unions the placed " +
  "`LibSymbol.boxes` of every placement, every wire END as a degenerate box, and its OWN private " +
  "`drawnBoxes`, which is `scene.texts` plus `scene.bodies` of a one-block `textScene` and NOTHING " +
  "else — not `pinTexts`, not `strokes`, not `crosses`. `frameSize` then grows that extent by " +
  "`4 * GRID` and `contentOffset` places the content `2 * GRID` inside the frame's corner, so there " +
  "is at least `2 * GRID` = 2.54 mm of clear frame on every side (more at the top, by the title " +
  "band). **THAT MARGIN, NOT THE EXTENT UNION, IS WHY THE THREE UNUNIONED CATEGORIES ARE INSIDE " +
  "THEIR BORDER**: a pin-number box reaches 1.905 mm off the pin line, a no-connect marker 0.635 mm " +
  "past the pin end, a DNP cross at most 0.762 mm past its own body on a pin-free axis — each less " +
  "than 2.54 mm, and each measured from geometry the union does cover. An enclosed item is therefore " +
  "inside its border by construction rather than by a refusal, which is why `textProblems`'s frame " +
  "clause tests only `texts`: a field is re-placed by the field placer after the extent was measured " +
  "and is the one thing that can move outward. See docs/known-gaps.md"

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
 * Which producer puts a `flag: true` PowerSymbol in a scene, and what still never does.
 *
 * **TASK 6b FALSIFIED THE CONCLUSION, not only the enumeration, and that is the reverse of what
 * Task 7 did to this same constant.** It used to open *"NOTHING IN THIS TREE PRODUCES A
 * `flag: true` PowerSymbol"*, with `render/frames.ts` named as the absent producer. That module
 * has landed and `flagsContent` is exactly that producer, so the sentence is deleted rather than
 * softened. What survives is the narrower, still-load-bearing half: **no BLOCK anchor ever
 * becomes a flag**, because `anchorsToSymbols` hard-codes `flag: false` and so does the
 * measurement-only symbol `anchorExtent` builds in `fanout-rows.ts` (the two sites Task 7 found -
 * `docs/known-gaps.md` **G134**).
 */
export const NO_FLAG_PRODUCER =
  "**A `flag: true` PowerSymbol HAS EXACTLY ONE PRODUCER, AND IT IS NOT A BLOCK**: `flagsContent` " +
  "(lib/schgen/render/frames.ts) emits, per flagged rail, the rail's own symbol and a PWR_FLAG at " +
  "the SAME point, and `layoutSheet` carries both into the sheet's `powers`, so this cell's check " +
  "is reachable at sheet level. No block ever produces one: `anchorsToSymbols` (power-text.ts) " +
  "hard-codes `flag: false`, and so does the measurement-only symbol `anchorExtent` builds in " +
  "fanout-rows.ts. So a flag only ever appears in its own frame, with no placement and no unit " +
  "beside it, which is why no cell here names a refusal that has fired"
