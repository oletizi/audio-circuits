/**
 * **THE FOUR RULERS: the one this repository uses, and the three quantities Task 1 Step 0 names.**
 *
 * Research probe for Task 1 of `docs/superpowers/plans/2026-10-22-text-handling-research.md`.
 * **Nothing in `lib/` or any check calls it, and it elects nothing**: Step 0 forbids this task from
 * choosing which of the three governs a collision, so all three are built and `probe.ts` reports
 * where they disagree.
 *
 * - `estimateGeometry` - `lib/schgen/render/text-boxes.ts` exactly, by calling it. It is the
 *   CONTROL: `probe.ts` requires the parallel search in `placement.ts` to reproduce production's
 *   own fallback list under this ruler before any measured figure is published.
 * - `advanceGeometry` - Q1. The current model's `textWidth` replaced by the glyph advance sum and
 *   NOTHING ELSE, because advance is a horizontal quantity and says nothing about a line's height.
 * - `inkGeometry` - Q2. Where the strokes actually are, from the font source, placed against the
 *   anchor by three constants measured off an eeschema SVG export (`svg-probe.ts`).
 * - `kicadBoxGeometry` - Q3. `EDA_TEXT::GetTextBox`, and for a global label the outline
 *   `SCH_GLOBALLABEL::CreateGraphicShape` builds out of it.
 *
 * **THE GLOBAL-LABEL OUTLINE IS TRANSCRIBED FROM `eeschema/sch_label.cpp` AT TAG 10.0.5**, read:
 *
 *     margin    = KiROUND( m_LabelSizeRatio * GetTextSize().y )   // DEFAULT_LABEL_SIZE_RATIO 0.375
 *     halfSize  = GetTextHeight() / 2 + margin
 *     linewidth = GetPenWidth()                                   // SCH_TEXT: GetEffectiveTextPenWidth()
 *     symb_len  = GetTextBox().GetWidth() + 2 * margin
 *     x = symb_len + linewidth + 3 ;  y = halfSize + linewidth + 3
 *
 * and for `L_BIDI`, which is the shape `render/emit-items.ts` writes, the outline runs
 * `x + 2 * halfSize` along the label's side and `y` either side of it. `probe.ts` drives that
 * against the PDF export's own vector coordinates.
 */

import { GRID, type Um } from "../../../lib/schgen/render/geometry.ts"
import type { Box } from "../../../lib/schgen/render/lib-pins.ts"
import {
  labelExtent, labelBox as productionLabelBox, powerValueBox, REFS_GAP, refsSpot, textBox,
  type LabelSpot, type PowerValueSpot, type TextSpot,
} from "../../../lib/schgen/render/text-boxes.ts"
import type { TextGeometry } from "./placement.ts"
import { advanceWidth, ESTIMATED_HEIGHT, estimatedWidth, inkCentrelines, kicadTextBoxExtent, TEXT_SIZE } from "./metrics.ts"
import type { Glyph } from "./newstroke.ts"

const kiRound = (v: number): number => (v < 0 ? -Math.round(-v) : Math.round(v))

/** `eeschema/default_values.h`: `#define DEFAULT_LABEL_SIZE_RATIO 0.375`. */
export const LABEL_SIZE_RATIO = 0.375

/**
 * Three numbers measured off an eeschema SVG export of the emitter's own symbol fields
 * (`svg-probe.ts`), not assumed. `probe.ts` measures them and passes them here.
 */
export interface Measured {
  /** The pen eeschema plots schematic text with: the SVG's own `stroke-width`. */
  readonly drawnPen: Um
  /** Anchor to the pen's starting position along the reading direction, for a left-justified field. */
  readonly fieldLeadX: Um
  /** Anchor to the text baseline, for a vertically centred field. */
  readonly fieldBaselineY: Um
}

/** A box placed from an advance-box origin, given the justification the emitter wrote. */
function originFor(justify: TextSpot["justify"], anchor: Um, lead: Um, advance: Um): Um {
  if (justify === "left") return anchor + lead
  if (justify === "right") return anchor - lead - advance
  return anchor - advance / 2
}

/** The ruler `lib/schgen/render/text-boxes.ts` uses today, by calling it rather than restating it. */
export const estimateGeometry: TextGeometry = {
  name: "length x GRID (current model)",
  lineBox: (spot, text) => textBox(spot, text),
  verticalBox: (spot, text) => powerValueBox(spot, text),
  labelBox: (l) => productionLabelBox(l),
  width: (text) => estimatedWidth(text),
  height: () => ESTIMATED_HEIGHT,
}

/** Q1: the current model with `textWidth` replaced by the glyph advance sum, and nothing else. */
export function advanceGeometry(glyphs: readonly Glyph[]): TextGeometry {
  const w = (text: string): Um => advanceWidth(glyphs, text, TEXT_SIZE)
  const half = GRID / 2
  const extent = (net: string, refs: string): Um => w(net) + 2 * GRID + (refs === "" ? 0 : REFS_GAP + w(refs))
  return {
    name: "glyph advance sum",
    lineBox: (spot, text) => {
      const width = w(text)
      const { x, y } = spot.at
      const [minX, maxX] = spot.justify === "left" ? [x, x + width] : spot.justify === "right" ? [x - width, x] : [x - width / 2, x + width / 2]
      return { minX, minY: y - half, maxX, maxY: y + half }
    },
    verticalBox: (spot, text) => {
      if (!spot.vertical) return advanceGeometry(glyphs).lineBox(spot, text)
      const width = w(text)
      const { x, y } = spot.at
      const [minY, maxY] = spot.justify === "left" ? [y - width, y] : spot.justify === "right" ? [y, y + width] : [y - width / 2, y + width / 2]
      return { minX: x - half, minY, maxX: x + half, maxY }
    },
    labelBox: (l) => sidedBox(l, extent(l.net, l.refs), GRID),
    width: w,
    height: () => ESTIMATED_HEIGHT,
  }
}

/** A label's box from its anchor along its side, as `text-boxes.ts`'s `labelBox` lays one out. */
function sidedBox(l: LabelSpot, extent: Um, across: Um): Box {
  const { at, side } = l
  switch (side) {
    case "right": return { minX: at.x, minY: at.y - across, maxX: at.x + extent, maxY: at.y + across }
    case "left": return { minX: at.x - extent, minY: at.y - across, maxX: at.x, maxY: at.y + across }
    case "up": return { minX: at.x - across, minY: at.y - extent, maxX: at.x + across, maxY: at.y }
    case "down": return { minX: at.x - across, minY: at.y, maxX: at.x + across, maxY: at.y + extent }
  }
}

const merge = (a: Box, b: Box): Box => ({
  minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY),
})

/** Q3's global-label outline: `SCH_GLOBALLABEL::CreateGraphicShape` for `L_BIDI`, in um. */
export function labelOutlineExtent(glyphs: readonly Glyph[], net: string): { readonly along: Um; readonly across: Um; readonly constant: Um } {
  // **ALL OF IT IN NANOMETRES, because that is where KiCad rounds.** An earlier version of this
  // function rounded at micrometres and put the outline's fixed part at 3333.003 um where KiCad's
  // own arithmetic puts it at 3333.753 - three quarters of a micrometre, immaterial to every
  // conclusion and still a number no run could have produced.
  const sizeNm = TEXT_SIZE * 1000
  const marginNm = kiRound(LABEL_SIZE_RATIO * sizeNm)
  const halfSizeNm = Math.trunc(sizeNm / 2) + marginNm
  // GetPenWidth() for a SCH_TEXT is GetEffectiveTextPenWidth() with no settings (sch_text.cpp:280),
  // which is KiROUND(size/8) - NOT the pen the plotter draws with. The difference is recorded.
  const linewidthNm = kiRound(sizeNm / 8)
  const symbLenNm = kicadTextBoxExtent(glyphs, net, TEXT_SIZE).width * 1000 + 2 * marginNm
  // `+ 3` is CreateGraphicShape's own three nanometres, carried so the transcription is exact.
  const xNm = symbLenNm + linewidthNm + 3
  const yNm = halfSizeNm + linewidthNm + 3
  return {
    along: (xNm + 2 * halfSizeNm) / 1000,
    across: yNm / 1000,
    /** What the outline adds to `GetTextBox`'s width: the part that does not depend on the string. */
    constant: (2 * marginNm + linewidthNm + 3 + 2 * halfSizeNm) / 1000,
  }
}

/** Q3: `EDA_TEXT::GetTextBox`, and the label outline KiCad builds from it. */
export function kicadBoxGeometry(glyphs: readonly Glyph[]): TextGeometry {
  const w = (text: string): Um => kicadTextBoxExtent(glyphs, text, TEXT_SIZE).width
  const h = (text: string): Um => kicadTextBoxExtent(glyphs, text, TEXT_SIZE).height
  const line = (spot: TextSpot, text: string): Box => {
    const width = w(text)
    const half = h(text) / 2
    const { x, y } = spot.at
    const [minX, maxX] = spot.justify === "left" ? [x, x + width] : spot.justify === "right" ? [x - width, x] : [x - width / 2, x + width / 2]
    return { minX, minY: y - half, maxX, maxY: y + half }
  }
  return {
    name: "EDA_TEXT::GetTextBox",
    lineBox: line,
    verticalBox: (spot, text) => {
      if (!spot.vertical) return line(spot, text)
      const width = w(text)
      const half = h(text) / 2
      const { x, y } = spot.at
      const [minY, maxY] = spot.justify === "left" ? [y - width, y] : spot.justify === "right" ? [y, y + width] : [y - width / 2, y + width / 2]
      return { minX: x - half, minY, maxX: x + half, maxY }
    },
    labelBox: (l) => {
      const o = labelOutlineExtent(glyphs, l.net)
      const body = sidedBox(l, o.along, o.across)
      if (l.refs === "") return body
      const r = refsSpot(l)
      return merge(body, kicadBoxGeometry(glyphs).verticalBox(r, l.refs))
    },
    width: w,
    height: h,
  }
}

/** Q2: where the strokes are, from the font source and the three measured placement constants. */
export function inkGeometry(glyphs: readonly Glyph[], m: Measured): TextGeometry {
  const halfPen = m.drawnPen / 2
  const centre = (text: string) => inkCentrelines(glyphs, text, TEXT_SIZE)
  const w = (text: string): Um => {
    const c = centre(text)
    return c === null ? 0 : c.maxX - c.minX + m.drawnPen
  }
  const h = (text: string): Um => {
    const c = centre(text)
    return c === null ? 0 : c.maxY - c.minY + m.drawnPen
  }
  const line = (spot: TextSpot, text: string): Box => {
    const c = centre(text)
    if (c === null) return { minX: spot.at.x, minY: spot.at.y, maxX: spot.at.x, maxY: spot.at.y }
    const origin = originFor(spot.justify, spot.at.x, m.fieldLeadX, advanceWidth(glyphs, text, TEXT_SIZE))
    const base = spot.at.y + m.fieldBaselineY
    return { minX: origin + c.minX - halfPen, minY: base + c.minY - halfPen, maxX: origin + c.maxX + halfPen, maxY: base + c.maxY + halfPen }
  }
  return {
    name: "rendered ink",
    lineBox: line,
    verticalBox: (spot, text) => {
      if (!spot.vertical) return line(spot, text)
      const c = centre(text)
      if (c === null) return { minX: spot.at.x, minY: spot.at.y, maxX: spot.at.x, maxY: spot.at.y }
      // A vertical line reads upward, so the along-axis coordinate is -(y - anchor): the horizontal
      // rule applied in that coordinate, then mapped back. The across axis maps x <- y with the same
      // sign, which `probe.ts` drives (an `up` label's box is the `right` label's box transposed).
      const origin = originFor(spot.justify === "left" ? "left" : spot.justify === "right" ? "right" : "center", 0, m.fieldLeadX, advanceWidth(glyphs, text, TEXT_SIZE))
      const base = spot.at.x + m.fieldBaselineY
      return {
        minX: base + c.minY - halfPen,
        minY: spot.at.y - (origin + c.maxX + halfPen),
        maxX: base + c.maxY + halfPen,
        maxY: spot.at.y - (origin + c.minX - halfPen),
      }
    },
    labelBox: (l) => {
      const o = labelOutlineExtent(glyphs, l.net)
      const body = sidedBox(l, o.along + halfPen, o.across + halfPen)
      if (l.refs === "") return body
      return merge(body, inkGeometry(glyphs, m).verticalBox(refsSpot(l), l.refs))
    },
    width: w,
    height: h,
  }
}

export { labelExtent }
