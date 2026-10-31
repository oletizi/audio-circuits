/**
 * **THE TWO MARKS AN UNRATIFIED DRAWING CARRIES** - Task 5 of
 * `docs/superpowers/plans/2026-10-27-gates-classify.md`, against
 * `docs/superpowers/specs/2026-10-27-gates-ratify-they-do-not-hide-design.md` (revision 4), whose
 * authority is `docs/known-gaps.md` **G303**.
 *
 * Hand-written. Nothing here is ported.
 *
 * **THE OWNER SET THE BAR AND HE SET IT IN BOTH DIRECTIONS.** Asked whether the mark should be a
 * discreet title-block field, a watermark across the drawing, or both - the objection to a
 * watermark being that it degrades the very drawing someone is trying to read - he said:
 *
 * > *"Both. A watermark over the drawing that declares the drawing defective is a critical safety
 * > signal to NOT USE the drawing at the bench. As such, an unusable schematic doesn't need to be
 * > easy to read - it just needs to be possible to read"*
 *
 * **POSSIBLE TO READ, NOT EASY.** Heavy enough that nobody could mistake the sheet for a build
 * document; light enough that the geometry underneath can still be examined, which is the entire
 * point of classifying a drawing rather than hiding it. A ratified drawing is the one that gets to
 * be easy to read; an unratified one has a different job.
 *
 * **BOTH MARKS, BECAUSE EACH SURVIVES WHAT THE OTHER DOES NOT.** The watermark is what a person
 * sees at a glance and at any zoom over the drawing area; the title-block comment is what survives
 * a crop, a thumbnail or a zoom into one corner where no band is in frame. Neither alone covers
 * both cases, which is why the owner answered *"Both"* and why dropping one was caught in review of
 * an earlier revision of the spec.
 *
 * **THE WEIGHT WAS CHOSEN BY LOOKING AT RENDERED PAGES, NOT BY REASONING ABOUT NUMBERS.** Seven
 * variants of (alpha x stroke thickness x band count) were exported through `kicad-cli` to PDF and
 * rasterised at 150 dpi over a real generated sheet (`pultec-hi-boost`'s `hi-boost.kicad_sch`, A3,
 * 24 parts). What that reading found, and what each constant below is therefore set to:
 *
 * - **alpha alone is not enough.** At alpha 0.3 with KiCad's default hairline stroke the bands are
 *   a ghost: present if you look for them, missable if you do not. The glyphs are STROKED, not
 *   filled, so a thin pen leaves almost no ink on the page.
 * - **`thickness` is the control that makes it unmissable**, and 0.15 x size is the value where
 *   the bands read as a warning from across a desk.
 * - **alpha 0.5 at that thickness is too much**: it swallowed `RV1 47k` and `C7 1000pF` whole, and
 *   a drawing whose part values cannot be read is not "possible to read".
 * - **alpha 0.35 at that thickness is the setting below**, where every wire, value and net label of
 *   that sheet stayed traceable through the bands.
 *
 * **THE BANDS ARE HORIZONTAL, AND NOT BECAUSE DIAGONAL WOULD BE WORSE.** A diagonal watermark is
 * the conventional shape and would cover more of the page per band. KiCad's schematic text item
 * takes its angle from a four-way spin style, so a 45-degree band is not a thing this file can ask
 * for without discovering at export time whether the angle survived. **An unverified angle is not
 * worth the risk on the one item whose whole job is to be legible**, so the bands are horizontal,
 * which is verified.
 */

import type { RefusalClass } from "../findings.ts"
import type { Keyed } from "./emit-items.ts"
import type { Point, Um } from "./geometry.ts"
import { int, list, mm, str, sym, yesNo } from "./sexpr-write.ts"
import { uuidV5 } from "./uuid.ts"

/** A landscape sheet's drawn extent, as `PAPER` in `sheets.ts` gives it. */
export interface MarkPaper {
  readonly w: Um
  readonly h: Um
}

/**
 * The band text for a class, or `null` for a class that carries no mark.
 *
 * **`usable` IS THE ONLY UNMARKED CLASS, AND THAT IS THE OWNER'S LINE RATHER THAN A CHOICE HERE.**
 * `usable` is the one class that asserts *a drawing exists and is correct about the circuit* - it
 * may be ugly, and ugly ships. Every other class says something that must reach a person before he
 * reaches for a soldering iron.
 *
 * **`not-drawable` AND `generator-defect` ARE GIVEN TEXT ALTHOUGH NO SHEET IS EMITTED UNDER THEM
 * TODAY**, and the alternative was to return `null` for them and state that they are unreachable.
 * That would be a hole with a comment over it: a `generator-defect` finding does not have to come
 * with an absent drawing - a checker could add one and still leave a complete, emittable
 * generation - and the sheet it produced would then go out unmarked. The classes that mean *no
 * artifact was produced* are handled by `tools/schgen/board-artifacts.ts`'s refusal sheet, which
 * declares itself in its own first line; this is the belt for the case where a sheet exists anyway.
 *
 * **THE SWITCH HAS NO `default` ARM**, for the reason `findings.ts`'s `classOf` states at length: a
 * class added without a decision here must fail to compile rather than fall through to silence.
 */
export function markBandText(cls: RefusalClass): string | null {
  switch (cls) {
    case "usable":
      return null
    case "defective":
      return "DEFECTIVE - DO NOT BUILD"
    case "not-drawable":
      return "UNRATIFIED - DO NOT BUILD"
    case "generator-defect":
      return "GENERATOR DEFECT - DO NOT BUILD"
  }
}

/**
 * The title-block comment for a class, or `null` for a class that carries no mark.
 *
 * **IT SAYS WHAT IS WRONG, NOT ONLY THAT SOMETHING IS.** `CLAUDE.md`'s rule for a refusal is that
 * it names what is missing and why; a warning on a drawing is held to the same standard, and
 * *"unratified"* on its own would send a reader looking for a document to tell him what that means.
 *
 * It is kept under 80 characters because KiCad prints the comment fields in a fixed-width strip of
 * the title block - about 80 characters of 1.27 mm text on A3 - and a comment that runs off the end
 * of that strip loses its last words, which on a line of this kind are the operative ones.
 */
export function markStatusComment(cls: RefusalClass): string | null {
  switch (cls) {
    case "usable":
      return null
    case "defective":
      return "UNRATIFIED - DEFECTIVE: this drawing is WRONG ABOUT THE CIRCUIT - DO NOT BUILD"
    case "not-drawable":
      return "UNRATIFIED - NOT DRAWABLE: no geometry could be produced - DO NOT BUILD"
    case "generator-defect":
      return "UNRATIFIED - GENERATOR DEFECT: schgen broke an invariant - DO NOT BUILD"
  }
}

/**
 * How much of the sheet's width one band spans.
 *
 * KiCad's drawing frame eats roughly 10 mm of each edge, and a band that runs under the frame is
 * clipped mid-word: the first probe lost the `D` of `DEFECTIVE` and the `D` of `BUILD` that way.
 */
const BAND_WIDTH = 0.86

/**
 * Where the bands sit down the page, as fractions of its height.
 *
 * **THE LAST BAND STOPS WELL ABOVE THE TITLE BLOCK ON PURPOSE.** KiCad draws the title block in the
 * bottom-right corner, and that is where the OTHER mark is printed. A watermark that strikes
 * through its own title-block comment destroys the half of the pair that survives a crop - the
 * probe at four evenly spaced bands did exactly that, and the comment line underneath came out
 * half-legible.
 */
const BAND_TOP = 0.14
const BAND_PITCH = 0.2
const BAND_COUNT = 4

/**
 * Stroke width as a fraction of the glyph size, and the ink the mark actually leaves.
 *
 * KiCad's default for schematic text is a hairline relative to a 20 mm glyph, which is why the
 * first probe was a ghost. See this file's header for the readings.
 */
const BAND_THICKNESS = 0.15

/** Red, and translucent enough to read the drawing through. The alpha is a literal because KiCad's colour alpha is a float and `sexpr-write.ts` emits only integers and bare symbols. */
const BAND_RGB = { r: 200, g: 0, b: 0 } as const
const BAND_ALPHA = "0.35"

/**
 * The glyph size that fits `line` across `BAND_WIDTH` of the paper.
 *
 * **ONE CHARACTER PER GLYPH SIZE is `text-boxes.ts`'s measured convention** - *"a character is taken
 * as one grid step wide (conservative for KiCad's stroke font)"* at the 1.27 mm size everything else
 * on the sheet is drawn at. It is conservative in the right direction here too: the rendered probe
 * at size 20 on A3 measured about 0.92 x size per character, so a band computed this way comes out
 * slightly narrower than its budget rather than clipped by the frame.
 */
export function bandSize(paper: MarkPaper, line: string): Um {
  if (line.length === 0) throw new Error("unratified mark: the band text is empty, so no size can be computed for it")
  return Math.round((paper.w * BAND_WIDTH) / line.length)
}

function bandItem(key: string, line: string, at: Point, size: Um): Keyed {
  const node = list(
    "text",
    str(line),
    list("exclude_from_sim", yesNo(false)),
    list("at", mm(at.x), mm(at.y), int(0)),
    list(
      "effects",
      list(
        "font",
        list("size", mm(size), mm(size)),
        list("thickness", mm(Math.round(size * BAND_THICKNESS))),
        list("color", int(BAND_RGB.r), int(BAND_RGB.g), int(BAND_RGB.b), sym(BAND_ALPHA)),
      ),
    ),
    list("uuid", str(uuidV5(key))),
  )
  return { key, node }
}

/**
 * The watermark as graphic `text` items, empty for a class that carries no mark.
 *
 * **IT IS IN THE `.kicad_sch` AND NOT APPLIED AT EXPORT, which is the spec's requirement and the
 * reason this function exists at all.** A mark stamped onto a PDF leaves the editable file - the
 * one `kicad-cli` reads, the one a person opens in Eeschema, the one another tool consumes -
 * looking exactly like a ratified drawing.
 *
 * **IT IS NOT CIRCUIT GEOMETRY.** No net, no pin, no connectivity: a `text` item is graphic, and
 * KiCad's netlist exporter does not see it. That is what makes it exempt from obligation 5, and
 * `lib/schgen/elk/adapt.ts` states that exemption where the obligation is stated.
 *
 * `scope` namespaces the UUIDs - the sheet id, or the project for the root - so two sheets of one
 * project do not derive the same UUID for their first band.
 */
export function markItems(scope: string, paper: MarkPaper, cls: RefusalClass): Keyed[] {
  const line = markBandText(cls)
  if (line === null) return []
  const size = bandSize(paper, line)
  const items: Keyed[] = []
  for (let i = 0; i < BAND_COUNT; i += 1) {
    const at: Point = { x: Math.round(paper.w / 2), y: Math.round(paper.h * (BAND_TOP + i * BAND_PITCH)) }
    items.push(bandItem(`mark:${scope}:${i}`, line, at, size))
  }
  return items
}
