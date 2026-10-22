/**
 * **THE THREE TEXT-GEOMETRY QUANTITIES OF TASK 1, each computed by arithmetic transcribed from
 * KiCad's own source at tag `10.0.5`, and each driven against the installed runtime by `probe.ts`.**
 *
 * Research probe for Task 1 of `docs/superpowers/plans/2026-10-22-text-handling-research.md`.
 * **Nothing in `lib/` or any check calls this.** It elects nothing: Step 0 of that task forbids the
 * producing agent from choosing which box governs a collision, so all three are computed and their
 * disagreements reported.
 *
 * Lengths are micrometres, which is this repository's unit (`lib/schgen/render/geometry.ts`).
 * KiCad's internal unit is nanometres, so `probe.ts` scales when it compares against `pcbnew`.
 *
 * **Q1 ADVANCE** - `STROKE_FONT::GetTextAsGlyphs`: `cursor.x += KiROUND( glyphExtents.x )` per
 * glyph, where `glyphExtents.x` is the glyph's advance times the text size. Space takes the same
 * path through `KiROUND( glyphSize.x * space_width )`. **Rounded per glyph, not once at the end** -
 * that is what the source does and it is why a ten-character string is not ten times a
 * one-character string to the micron.
 *
 * **Q2 INK** - the strokes' own extents, from the per-glyph stroke points, inflated by half the
 * drawn pen width. `probe.ts` measures the pen that eeschema actually plots with (0.1524 mm, 6 mil)
 * from an SVG export rather than assuming it.
 *
 * **Q3 KICAD'S OWN BOX** - `EDA_TEXT::GetTextBox`, which is what KiCad's clearance, selection and
 * hit-testing use. Composed, in the source's order:
 *   `FONT::StringBoundaryLimits` -> `drawMarkup` -> `GetTextAsGlyphs` sets the box end to
 *   `( cursor.x - KiROUND( size.x * INTER_CHAR ), cursor.y - size.y )`; `StringBoundaryLimits` then
 *   inflates a STROKE font's box by `KiROUND( thickness * 1.5 )` on every side; `GetTextBox` adds a
 *   `fudgeFactor` of `KiROUND( extents.y * 0.17 )` to the height for a stroke font. `thickness` is
 *   `GetEffectiveTextPenWidth()` called with NO default, which for non-bold text is
 *   `GetPenSizeForNormal( GetTextWidth() ) = KiROUND( size / 8.0 )` (`common/gr_text.cpp`) - and
 *   **that is NOT the pen eeschema plots with**, which `probe.ts` reports as a disagreement rather
 *   than reconciling silently.
 *
 * `GetTextBox`'s justification arms (`eda_text.cpp`) put the box at `[x, x+w]` for left,
 * `[x-w, x]` for right, `[x-w/2, x+w/2]` for centre, and `[y-h/2, y+h/2]` for the vertical centring
 * our emitter leaves at KiCad's default - **the same anchor-relative shape
 * `lib/schgen/render/text-boxes.ts`'s `textBox` already uses**, so Q3 differs from the current model
 * in its width and height alone and not in where the box sits.
 */

import { GRID, type Um } from "../../../lib/schgen/render/geometry.ts"
import { glyphFor, INTER_CHAR, type Glyph } from "./newstroke.ts"

/** KiCad's `KiROUND`: round half away from zero. */
const kiRound = (v: number): number => (v < 0 ? -Math.round(-v) : Math.round(v))

/** All schematic text this repository emits is 1.27 mm (`render/emit-items.ts`'s `font()`). */
export const TEXT_SIZE: Um = GRID

/**
 * `common/gr_text.cpp`: `GetPenSizeForNormal( aTextSize ) { return KiROUND( aTextSize / 8.0 ); }`.
 * Rounded at NANOMETRES, which is where KiCad rounds it: for 1.27 mm text the answer is 158.75 um,
 * and rounding at micrometres would give 159 and move every box by half a micrometre.
 */
export const boxPenWidth = (size: Um = TEXT_SIZE): Um => kiRound((size * 1000) / 8) / 1000

export interface Extent {
  readonly width: Um
  readonly height: Um
  /** `StringBoundaryLimits`'s `KiROUND( thickness * 1.5 )`, added on every side. */
  readonly inflate?: Um
  /** `GetTextBox`'s `fudgeFactor`, `KiROUND( extents.y * 0.17 )`, added to the height only. */
  readonly fudge?: Um
}

/** A box relative to the text anchor, x positive right and y positive down, as KiCad lays out. */
export interface AnchorBox {
  readonly minX: Um
  readonly minY: Um
  readonly maxX: Um
  readonly maxY: Um
}

/**
 * Q1 in NANOMETRES, which is KiCad's own internal unit.
 *
 * **The rounding happens per glyph and at nanometre resolution, because that is where KiCad does
 * it.** Rounding to whole micrometres instead disagreed with the installed runtime by up to 5.9 um
 * over a sixteen-character net name - small, and large enough to turn an exact agreement between
 * two independent routes into an approximate one, which is a worse thing to publish.
 */
export function advanceWidthNm(glyphs: readonly Glyph[], text: string, size: Um = TEXT_SIZE): number {
  let cursor = 0
  for (const ch of text) cursor += kiRound(glyphFor(glyphs, ch).glyph.advance * size * 1000)
  return cursor
}

/** Q1: how far the pen moves over the whole string. The current model's quantity to compare against. */
export function advanceWidth(glyphs: readonly Glyph[], text: string, size: Um = TEXT_SIZE): Um {
  return advanceWidthNm(glyphs, text, size) / 1000
}

/**
 * Q2: the strokes' own extents, relative to the pen's starting position and the baseline, BEFORE
 * the pen width is added. `null` for a string that draws nothing (all spaces), because a zero-size
 * box at the origin and "no ink at all" must not read as the same thing.
 */
export function inkCentrelines(glyphs: readonly Glyph[], text: string, size: Um = TEXT_SIZE): AnchorBox | null {
  let cursorNm = 0
  let box: { minX: number; minY: number; maxX: number; maxY: number } | null = null
  for (const ch of text) {
    const { glyph } = glyphFor(glyphs, ch)
    const cursor = cursorNm / 1000
    if (glyph.ink !== null) {
      const minX = cursor + glyph.ink.minX * size
      const maxX = cursor + glyph.ink.maxX * size
      const minY = glyph.ink.minY * size
      const maxY = glyph.ink.maxY * size
      box =
        box === null
          ? { minX, minY, maxX, maxY }
          : {
              minX: Math.min(box.minX, minX),
              minY: Math.min(box.minY, minY),
              maxX: Math.max(box.maxX, maxX),
              maxY: Math.max(box.maxY, maxY),
            }
    }
    cursorNm += kiRound(glyph.advance * size * 1000)
  }
  return box
}

/** Q2 as an extent: the stroke centrelines inflated by half the DRAWN pen width. */
export function inkExtent(glyphs: readonly Glyph[], text: string, drawnPen: Um, size: Um = TEXT_SIZE): Extent {
  const c = inkCentrelines(glyphs, text, size)
  if (c === null) return { width: 0, height: 0 }
  return { width: c.maxX - c.minX + drawnPen, height: c.maxY - c.minY + drawnPen }
}

/** Q3: `EDA_TEXT::GetTextBox`'s width and height, for single-line non-bold non-italic stroke text. */
export function kicadTextBoxExtent(glyphs: readonly Glyph[], text: string, size: Um = TEXT_SIZE): Extent {
  return kicadTextBoxExtentAtPen(glyphs, text, boxPenWidth(size), size)
}

/**
 * The same box computed with a pen of the caller's choosing.
 *
 * **It exists for ONE counterfactual and is not an invitation to pick a pen.** `GetTextBox` sizes
 * its box with `GetPenSizeForNormal(size)` while eeschema PLOTS with 152.4 um, and a reader
 * deciding which quantity governs a collision needs to know how much of the box's height that
 * disagreement accounts for. `probe.ts` drives both and reports the share.
 *
 * **NOTHING ELSE CALLS IT WITH ANYTHING BUT `boxPenWidth`, AND THAT IS CHECKED** -
 * `tests/schgen/text-metrics/pen-call-sites.test.ts` names the one loose call site and goes red on
 * a second. It was an unenforced sentence here until that test existed, which is the same shape as
 * a cross-check described and never performed.
 */
export function kicadTextBoxExtentAtPen(glyphs: readonly Glyph[], text: string, pen: Um, size: Um = TEXT_SIZE): Extent {
  const inflateNm = kiRound(kiRound(pen * 1000) * 1.5)
  const widthNm = advanceWidthNm(glyphs, text, size) - kiRound(size * 1000 * INTER_CHAR) + 2 * inflateNm
  const extentsYNm = size * 1000 + 2 * inflateNm
  return { width: widthNm / 1000, height: (extentsYNm + kiRound(extentsYNm * 0.17)) / 1000, inflate: inflateNm / 1000, fudge: kiRound(extentsYNm * 0.17) / 1000 }
}

/** The current model: `lib/schgen/render/text-boxes.ts:35`, `text.length * GRID`. */
export const estimatedWidth = (text: string): Um => text.length * GRID

/** The current model's line height: `textBox` spans `GRID / 2` either side of the anchor. */
export const ESTIMATED_HEIGHT: Um = GRID
