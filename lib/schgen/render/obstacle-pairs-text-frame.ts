/**
 * Matrix rows `field-text`, `frame-border`, `no-connect-marker` and
 * `dnp-cross` — the last 10 of the 105 cells.
 *
 * Two of the four categories the research singled out as NOT obviously covered
 * are settled here, and both come out better than expected:
 *
 * - **`no-connect-marker` at a HIDDEN pin is modelled**, deliberately and with
 *   a comment naming the defect that forced it. `noConnectEnds`
 *   (`unit-pins.ts`) filters out only a pin that is BOTH hidden and typed
 *   `no_connect`; every other hidden NC pin gets its X and its obstacle box,
 *   and `unit-pins.ts` says why both come from one function: "so an X is never
 *   drawn without its obstacle or the reverse".
 * - **`dnp-cross` IS decided**, against one subset of `field-text` and
 *   deliberately not against the rest, with the reason in the code.
 *
 * `frame-border` is the one that comes out worse: it is decided against text
 * and constructed against everything else, and the construction lives in a
 * module this tree does not yet contain.
 *
 * Supporting data for `obstacle-matrix.ts`.
 */
import type { PairCoverage } from "./obstacle-matrix.ts"
import { CROSS_BOUND, FRAME_DERIVED } from "./obstacle-pairs-reasons.ts"

export const FIELD_TEXT_PAIRS: readonly PairCoverage[] = [
  {
    a: "field-text",
    b: "field-text",
    checkedBy:
      "textProblems (lib/schgen/render/text-scene.ts): " +
      "`for (const o of scene.texts.slice(i + 1)) if (boxesOverlap(t.box, o.box))` over every text the " +
      "scene holds — Reference, Value, power values, sheet texts, frame titles and DNP pin marks; AND " +
      "placeFields (field-placement.ts), where each field just placed is pushed onto `placed` and " +
      "becomes an obstacle for the next unit, and where each candidate is grown by " +
      "`MARGIN = GRID / 2` first so that two rows of text may not merely abut.",
    meaninglessBecause: null,
    asymmetric: null,
  },
  {
    a: "field-text",
    b: "frame-border",
    checkedBy:
      "textProblems (text-scene.ts), the frame clause: " +
      "`if (boxesOverlap(t.box, f.box) && !strictlyWithin(t.box, f.box))`. A frame's own TITLE is itself " +
      "a `texts` member (`frameTitleSpot`, text-boxes.ts, puts it two grid steps inside the top-left " +
      "corner), so a title is checked against its own border by this same clause.",
    meaninglessBecause: null,
    asymmetric:
      "Decided only for a text that MEETS a frame box: a text wholly inside passes `strictlyWithin` and " +
      "one wholly outside fails `boxesOverlap`, so the clause is silent on a sheet with no frames.",
  },
  {
    a: "field-text",
    b: "no-connect-marker",
    checkedBy:
      "textProblems (lib/schgen/render/text-scene.ts): `unitText`'s no-connect loop adds a " +
      "`GRID / 2`-radius box at every `noConnectEnds` pin into `decorations`, which `textScene` pushes " +
      "into `pinTexts`, and the loop is `for (const p of scene.pinTexts) if (boxesOverlap(t.box, " +
      "p.box))`; AND placeFields (field-placement.ts), whose `fixedMarks` obstacles carry the same " +
      "`decorations`. This is the pedals history's \"J_SWD's reference landed on the X of the stock " +
      "symbol's hidden KEY pin\" defect, and the loop's own comment names it.",
    meaninglessBecause: null,
    asymmetric:
      "**HIDDEN PINS INCLUDED, which is the whole point of this cell.** `noConnectEnds` " +
      "(unit-pins.ts) filters only `p.lib.hidden && p.lib.type === \"no_connect\"` — a stock KEY pin, " +
      "which KiCad ERC never flags and which has no drawn pin to mark — so every OTHER hidden NC pin " +
      "gets both the X and the obstacle. The one-way-ness worth naming is that `unitText`'s `visible` " +
      "filter excludes hidden pins from pin lines, numbers and names, while the no-connect loop runs over " +
      "`noConnectEnds` unconditionally: a hidden NC pin therefore contributes an obstacle and no pin " +
      "line, which is what KiCad draws.",
  },
  {
    a: "field-text",
    b: "dnp-cross",
    checkedBy:
      "textProblems (lib/schgen/render/text-scene.ts): " +
      "`if (t.mark === true) for (const x of scene.crosses) if (boxesOverlap(t.box, x.box)) … lies under " +
      "…`. `textScene` puts `dnpCross(u, pl)` into `crosses` and each `pinMarks(u, pl)` entry into " +
      "`texts` with `mark: true`.",
    meaninglessBecause: null,
    asymmetric:
      "**Decided for ONE SUBSET of field text only, and deliberately.** Only a DNP pin-polarity mark " +
      "(pin-marks.ts) is tested against a cross; a DNP part's own Reference and Value are exempt, and " +
      "`text-scene.ts` states the reason in the field's doc comment — \"KiCad's cross reaches them by " +
      "design\". `pinMarks` places each mark `OFFSET = 2 * GRID` off its pin line precisely to clear the " +
      "cross, and this clause is the check that proves it did. Every other member of `texts` — a label, " +
      "a sheet text, a frame title, a power value — is untested against a cross; see the " +
      "label-outline/dnp-cross cell for how thin the reason gets.",
  },
]

export const FRAME_BORDER_PAIRS: readonly PairCoverage[] = [
  {
    a: "frame-border",
    b: "frame-border",
    checkedBy:
      "packFrames (lib/schgen/render/pack.ts): shelf packing places each frame at `x`, advances " +
      "`x += s.w + GAP` with `GAP = 2 * GRID` = 2.54 mm, and starts a new shelf at `y += shelf + GAP`, " +
      "so two frames are never nearer than one gap. It refuses rather than overlapping when the paper is " +
      "too small, returning `{ ok: false, needed }` with the size it would have needed, and it refuses a " +
      "frame size that is not a whole number of grid steps.",
    meaninglessBecause: null,
    asymmetric:
      "Frames never overlap because they are PLACED apart, not because anything compares two boxes " +
      "afterwards. There is no refusal for a `Frame.box` some other producer set directly, and nothing " +
      "in this tree checks that a sheet's frames are in fact the ones `packFrames` returned.",
  },
  { a: "frame-border", b: "no-connect-marker", checkedBy: null, meaninglessBecause: `${FRAME_DERIVED}. A marker's box rides in \`scene.pinTexts\`, which \`blockContent\`'s \`drawnBoxes\` does not union — so, as for pin numbers, this cell's old sentence named the wrong function. The margin covers it with room to spare: \`unitText\` boxes a marker as \`at ± GRID / 2\`, 0.635 mm around a pin end that \`LibSymbol.boxes\` already reaches, against 2.54 mm of frame.`, asymmetric: null },
  {
    a: "frame-border",
    b: "dnp-cross",
    checkedBy: null,
    meaninglessBecause:
      `${FRAME_DERIVED}. And the cross is derived from its own part's body, so it is inside that ` +
      `part's extent: ${CROSS_BOUND}. ` +
      "**THIS WAS THE THINNEST CELL OF THE FRAME ROW AND THE TASK 6b RE-READ SETTLED IT, which is " +
      "the one place where the arrival of `render/frames.ts` made a cell STRONGER rather than " +
      "merely re-worded.** Round 1 said the two reasons' escape clauses met in exactly the " +
      "uncovered case: no `drawnBoxes` unions `scene.crosses`, so a frame-derived extent never " +
      "sees a cross, and a cross on a pin-free axis reaches 0.3 of a pin length (0.762 mm) beyond " +
      "the box the frame WAS derived from - neither reason covering that overhang. **The first " +
      "half is still true and the conclusion is not.** `frameSize` grows the extent by `4 * GRID` " +
      "and `contentOffset` insets the content by `2 * GRID`, so the frame is clear by 2.54 mm on " +
      "every side and the 0.762 mm overhang sits well inside it. The cell is covered by " +
      "arithmetic over two landed functions rather than by an extent union, and the gap round 1 " +
      "recorded is closed. Recorded in docs/known-gaps.md.",
    asymmetric: null,
  },
]

export const NO_CONNECT_MARKER_PAIRS: readonly PairCoverage[] = [
  {
    a: "no-connect-marker",
    b: "no-connect-marker",
    checkedBy: null,
    meaninglessBecause:
      "Two markers are two distinct pin ends, and `pinChecks` (wire-safety.ts) refuses any coincidence " +
      "involving an NC pin outright while `gridProblems` (layout-check.ts) holds every pin end to the " +
      "1.27 mm grid — so two markers are at least one grid step apart. Their boxes are one grid step " +
      "square centred on the end, so markers one grid step apart ABUT exactly, and `boxesOverlap` " +
      "(geometry.ts) is strict (`a.minX < b.maxX`), so abutment passes. That is deliberate: a row of NC " +
      "pins on a 2.54 mm-pitch connector leaves 1.27 mm between adjacent marker boxes and is what KiCad " +
      "draws.",
    asymmetric: null,
  },
  {
    a: "no-connect-marker",
    b: "dnp-cross",
    checkedBy: null,
    meaninglessBecause: `A DNP part's own NC pins are under its own cross by design — \`pin-marks.ts\` records that KiCad draws the cross over the body AND the pins, and the pin-polarity marks are the generator's answer to a cross covering a small part's own markings. Across parts: ${CROSS_BOUND}.`,
    asymmetric: null,
  },
]

export const DNP_CROSS_PAIRS: readonly PairCoverage[] = [
  {
    a: "dnp-cross",
    b: "dnp-cross",
    checkedBy: null,
    meaninglessBecause:
      "A cross belongs to one placed DNP unit and is derived from that unit's own body box, so two " +
      "crosses can meet only if their units' clearance boxes are nearer than the two margins together — " +
      "and `overlapProblems` (layout-check.ts) keeps those boxes from overlapping at all. The residual " +
      "is the bound in the body/dnp-cross cell: at most 0.3 of a pin length on an axis with no pins, so " +
      "two abutting DNP units could have crosses whose BOXES touch. KiCad draws a cross as two thin " +
      "diagonal strokes rather than a filled box (`pin-marks.ts`: SCH_SYMBOL::PlotDNP), so touching " +
      "bounding boxes do not imply touching ink, and the model here has no stroke-level cross to compare.",
    asymmetric: null,
  },
]
