/**
 * **KiCad's STROKE FONT, read from KiCad's own source, as a per-glyph advance and ink table.**
 *
 * Research probe for Task 1 of `docs/superpowers/plans/2026-10-22-text-handling-research.md`.
 * **It changes nothing and nothing in `lib/` or any check calls it.** It exists because every text
 * extent in this repository is `text.length * GRID` (`lib/schgen/render/text-boxes.ts:35`) and
 * nobody had measured the error in that.
 *
 * **IT PINS ITS INPUT AND REFUSES A DIFFERENT ONE** (controller ruling R4 of that plan: a probe
 * whose numbers reach a document must be committed and must pin what it measured). The font file is
 * 2.9 MB and is NOT vendored here; fetch it and the probe checks its SHA-256:
 *
 *     curl -sSL -o /tmp/newstroke_font.cpp \
 *       https://gitlab.com/kicad/code/kicad/-/raw/10.0.5/common/newstroke_font.cpp
 *
 * `FONT_SOURCE_SHA256` below is that blob at tag `10.0.5`, which is the version of `kicad-cli`
 * this repository runs (`tools/schgen/kicad-run.ts`'s `kicadVersion()`). A different hash refuses,
 * naming both, rather than reporting numbers off an unknown font.
 *
 * **THE ARITHMETIC IS TRANSCRIBED FROM `common/font/stroke_font.cpp` AT THE SAME TAG**, read, not
 * remembered - `loadNewStrokeFont` and `GetTextAsGlyphs`:
 *
 * - `STROKE_FONT_SCALE = 1/21` and `FONT_OFFSET = -8`;
 * - a glyph record's FIRST TWO characters encode `glyphStartX` and `glyphEndX` as `c - 'R'`, and
 *   `glyphWidth = glyphEndX - glyphStartX` scaled by `STROKE_FONT_SCALE`. **That is the advance**:
 *   `GetTextAsGlyphs` does `cursor.x += KiROUND( glyphExtents.x )` where `glyphExtents` is the
 *   glyph bounding box's end scaled by the text size, and `buildGlyphBoundingBox` sets that box's
 *   x range to `[0, glyphWidth]` FROM THE WIDTH FIELDS AND NOT FROM THE STROKE POINTS;
 * - a stroke point is `x = (c0 - 'R')/21 - glyphStartX`, `y = (c1 - 'R' - 8)/21`, and `" R"` raises
 *   the pen. **Because the glyph box's x range is imposed rather than measured, a stroke CAN lie
 *   outside `[0, advance]`** - which is the third-party review's claim, and `inkOutsideAdvance()`
 *   below is what settles it rather than assuming it either way.
 *
 * Every length here is in EM units (multiples of the text size). `probe.ts` scales by `GRID`.
 */

import { createHash } from "node:crypto"
import fs from "node:fs"

/** SHA-256 of `common/newstroke_font.cpp` at KiCad tag `10.0.5`. */
export const FONT_SOURCE_SHA256 = "dd686d654166869bad4866b107c81e538736c057721ddbf70036a50d8e844de9"

export const FONT_SOURCE_URL = "https://gitlab.com/kicad/code/kicad/-/raw/10.0.5/common/newstroke_font.cpp"

/** `common/font/stroke_font.cpp`: `static constexpr double STROKE_FONT_SCALE = 1.0 / 21.0;` */
const STROKE_FONT_SCALE = 1 / 21

/** `common/font/stroke_font.cpp`: `static constexpr int FONT_OFFSET = -8;` */
const FONT_OFFSET = -8

/** `STROKE_FONT::GetTextAsGlyphs`: `constexpr double INTER_CHAR = 0.2;` */
export const INTER_CHAR = 0.2

/** The first glyph record in `newstroke_font[]` is U+0020. */
const FIRST_CODE_POINT = 0x20

export interface Glyph {
  /** The code point this record serves. */
  readonly code: number
  /** How far the pen moves, in em: `glyphEndX - glyphStartX`. */
  readonly advance: number
  /** Stroke extents in em, relative to the pen position. Null for a glyph with no strokes (space). */
  readonly ink: { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number } | null
}

function unescapeCLiteral(lit: string, where: string): string {
  const out: string[] = []
  let i = 0
  while (i < lit.length) {
    const ch = lit[i] ?? ""
    if (ch !== "\\") {
      out.push(ch)
      i += 1
      continue
    }
    const next = lit[i + 1]
    if (next === "\\") out.push("\\")
    else if (next === '"') out.push('"')
    else {
      throw new Error(
        `newstroke_font.cpp ${where}: unhandled C escape "\\${next ?? "<end>"}". The parser handles ` +
          `\\\\ and \\" because those are the only escapes the pinned blob contains; a new one is not ` +
          "guessed at, because a mis-decoded character is a wrong advance in a published table.",
      )
    }
    i += 2
  }
  return out.join("")
}

/** The glyph table of the pinned font source, indexed by `code - 0x20`. */
export function loadGlyphs(fontSourcePath: string): readonly Glyph[] {
  if (!fs.existsSync(fontSourcePath)) {
    throw new Error(
      `no font source at ${fontSourcePath}. This probe measures KiCad's own stroke font and will not ` +
        `invent an advance table: fetch it with\n    curl -sSL -o ${fontSourcePath} ${FONT_SOURCE_URL}`,
    )
  }
  const raw = fs.readFileSync(fontSourcePath)
  const sha = createHash("sha256").update(raw).digest("hex")
  if (sha !== FONT_SOURCE_SHA256) {
    throw new Error(
      `${fontSourcePath} has SHA-256 ${sha}, not the pinned ${FONT_SOURCE_SHA256} (KiCad tag 10.0.5, ` +
        `${FONT_SOURCE_URL}). Refused rather than measured: a figure published from an unknown font blob ` +
        "is not reproducible, which is the failure controller ruling R4 exists to prevent. Either fetch " +
        "the pinned blob or change the constant deliberately, with the new numbers re-driven.",
    )
  }
  const text = raw.toString("utf8")
  const start = text.indexOf("const char* const newstroke_font[] =")
  if (start < 0) throw new Error(`${fontSourcePath} holds no "const char* const newstroke_font[]" array declaration`)
  const tail = text.slice(start)
  const end = tail.indexOf("\nconst int newstroke_font_bufsize")
  if (end < 0) throw new Error(`${fontSourcePath}: the newstroke_font[] array is not terminated by newstroke_font_bufsize`)
  // Comments are stripped first so that comment prose can never be read as a glyph record.
  const body = tail.slice(0, end).replace(/\/\*[\s\S]*?\*\//g, "")
  const records = [...body.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m, i) => unescapeCLiteral(m[1] ?? "", `record ${i}`))
  if (records.length === 0) throw new Error(`${fontSourcePath}: no glyph records parsed out of the newstroke_font[] array`)
  return records.map((rec, i) => glyphOf(rec, FIRST_CODE_POINT + i))
}

function glyphOf(rec: string, code: number): Glyph {
  if (rec.length < 2) throw new Error(`newstroke_font.cpp record for U+${code.toString(16)} is shorter than its two width characters`)
  const startX = (rec.charCodeAt(0) - 0x52) * STROKE_FONT_SCALE
  const endX = (rec.charCodeAt(1) - 0x52) * STROKE_FONT_SCALE
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 2; i + 1 < rec.length; i += 2) {
    if (rec[i] === " " && rec[i + 1] === "R") continue // pen up
    xs.push((rec.charCodeAt(i) - 0x52) * STROKE_FONT_SCALE - startX)
    ys.push((rec.charCodeAt(i + 1) - 0x52 + FONT_OFFSET) * STROKE_FONT_SCALE)
  }
  const ink =
    xs.length === 0
      ? null
      : { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
  return { code, advance: endX - startX, ink }
}

/**
 * The glyph a character is drawn with. `GetTextAsGlyphs` substitutes `?` for anything outside the
 * table, so this does the same - and says so, rather than throwing, because a corpus character
 * KiCad draws as `?` is a fact about the corpus that the caller must be able to report.
 */
export function glyphFor(glyphs: readonly Glyph[], ch: string): { readonly glyph: Glyph; readonly substituted: boolean } {
  const dd = ch.codePointAt(0)
  if (dd === undefined) throw new Error("glyphFor: empty character")
  const idx = dd - FIRST_CODE_POINT
  const direct = glyphs[idx]
  if (idx >= 0 && direct !== undefined) return { glyph: direct, substituted: false }
  const q = glyphs["?".codePointAt(0)! - FIRST_CODE_POINT]
  if (q === undefined) throw new Error("glyphFor: the font table has no '?' glyph to substitute")
  return { glyph: q, substituted: true }
}

/** Every character of the pinned table whose strokes leave `[0, advance]`, with the overhang in em. */
export function inkOutsideAdvance(glyphs: readonly Glyph[], chars: readonly string[]): readonly {
  readonly ch: string
  readonly leftOverhang: number
  readonly rightOverhang: number
}[] {
  const out: { ch: string; leftOverhang: number; rightOverhang: number }[] = []
  for (const ch of chars) {
    const { glyph } = glyphFor(glyphs, ch)
    if (glyph.ink === null) continue
    const left = -glyph.ink.minX
    const right = glyph.ink.maxX - glyph.advance
    if (left > 1e-9 || right > 1e-9) out.push({ ch, leftOverhang: left, rightOverhang: right })
  }
  return out
}
