/**
 * Tests for `tools/guide/paper.ts`: the one question the build packet asks
 * about its own pages - is this page on the paper the rest of the document is
 * on, and if not, what paper does it need?
 *
 * The sizes below are MEASURED, not looked up: the A4 and A3 figures are what
 * `kicad-cli sch export pdf` wrote for the five Pultec sheets on 2026-10-30
 * (`pdfinfo` on each `schematic.pdf`), and the Letter figure is what headless
 * Chrome wrote for `guide.pdf` from `@page { size: letter }`. That is the
 * point: the name table has to recognise what the real tools produce, not
 * what the ISO standard says to three more decimal places.
 */
import { test, expect } from "bun:test"
import { describePaper, mmOf, paperName, samePaper } from "../../tools/guide/paper.ts"

const LETTER = { widthPt: 612, heightPt: 792 }
const LETTER_LANDSCAPE = { widthPt: 792, heightPt: 612 }
/** kicad-cli's A4 landscape export, measured on all four A4 Pultec sheets. */
const A4_LANDSCAPE = { widthPt: 841.896, heightPt: 595.296 }
/** kicad-cli's A3 landscape export, measured on pultec-mid. */
const A3_LANDSCAPE = { widthPt: 1190.52, heightPt: 841.896 }

test("the papers the real tools produce are named, orientation and all", () => {
  expect(paperName(LETTER)).toBe("US Letter, portrait")
  expect(paperName(LETTER_LANDSCAPE)).toBe("US Letter, landscape")
  expect(paperName(A4_LANDSCAPE)).toBe("A4, landscape")
  expect(paperName(A3_LANDSCAPE)).toBe("A3, landscape")
})

test("a size this tool does not know gets NO name rather than the nearest one", () => {
  // The failure being prevented is a reader loading a tray because a document
  // said "A4" about a page that is not A4. 10 mm off in one dimension is far
  // inside any paper's neighbours and still gets no name.
  expect(paperName({ widthPt: 612, heightPt: 820 })).toBeUndefined()
  expect(describePaper({ widthPt: 612, heightPt: 820 })).toBe("215.9 x 289.3 mm")
})

test("the same sheet in either orientation is the same paper, and Letter is not A4", () => {
  // Orientation is not part of it: both come off one tray. This is the
  // comparison the packet uses to decide whether to say anything at all.
  expect(samePaper(LETTER, LETTER_LANDSCAPE)).toBe(true)
  expect(samePaper(LETTER, A4_LANDSCAPE)).toBe(false)
  expect(samePaper(A4_LANDSCAPE, A3_LANDSCAPE)).toBe(false)
})

test("the tolerance absorbs two tools' rounding and still separates Letter from A4", () => {
  // kicad-cli writes A4 as 841.896 x 595.296 where ISO says 841.89 x 595.28:
  // 0.016 pt apart, and it must still read as A4. US Letter and A4 differ by
  // 16.7 pt of width, a factor of a thousand away from that noise.
  expect(paperName({ widthPt: 841.89, heightPt: 595.28 })).toBe("A4, landscape")
  expect(samePaper({ widthPt: 841.89, heightPt: 595.28 }, A4_LANDSCAPE)).toBe(true)
  expect(samePaper({ widthPt: 595.296, heightPt: 841.896 }, LETTER)).toBe(false)
})

test("the millimetre figures are the ones a person can hold a ruler to", () => {
  expect(mmOf(612)).toBe(215.9)
  expect(mmOf(792)).toBe(279.4)
  expect(describePaper(A4_LANDSCAPE)).toBe("297.0 x 210.0 mm (A4, landscape)")
  expect(describePaper(A3_LANDSCAPE)).toBe("420.0 x 297.0 mm (A3, landscape)")
})

test("a square page gets a name with no orientation word, because neither is true of it", () => {
  expect(paperName({ widthPt: 612, heightPt: 612 })).toBeUndefined()
  expect(describePaper({ widthPt: 612, heightPt: 612 })).toBe("215.9 x 215.9 mm")
})
