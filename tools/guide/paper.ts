/**
 * Paper sizes, for the one question the build packet has to answer about its
 * own pages: **is this page on the same sheet of paper as the rest of the
 * document, and if not, what sheet does it need?**
 *
 * The packet is one printable document (`./merge-pdf.ts`), and the owner,
 * 2026-10-30: *"We also need to change the page size of the schematics - I
 * don't have an A3-capable printer. I live in california and have a printer
 * capable of printing US letter 8.5x11"."* A page this tool cannot print at
 * full size is not a page to shrink silently - **nothing here scales
 * anything** - it is a page the document has to NAME, which is what these
 * functions are for.
 *
 * Everything is in PostScript points, because that is the unit a PDF's
 * `/MediaBox` is in and `./merge-pdf.ts` reads the sizes straight off the
 * artifact rather than from any declaration about it. Millimetres are
 * computed for printing only.
 *
 * **THE NAME TABLE IS A WHITELIST THAT REFUSES RATHER THAN GUESSING.** A size
 * it does not recognise gets no name at all and prints as its measurement -
 * never a nearest-match, because "this page is A4" is a claim a reader will
 * act on by loading a tray.
 */

/** One page's size, in PostScript points, as a PDF's `/MediaBox` states it. */
export interface PageSize {
  readonly widthPt: number
  readonly heightPt: number
}

/**
 * How far apart two point measurements may be and still be the same paper:
 * one point, 0.35 mm.
 *
 * It exists because the sizes being compared are produced by different tools
 * and neither rounds the same way - `kicad-cli` exports A4 as
 * 841.896 x 595.296 pt where the ISO definition is 841.89 x 595.28 - and
 * because the smallest difference it must still SEE is US Letter against A4
 * at 16.7 pt of width. There is a factor of sixteen between the noise and the
 * signal, so this is not a tolerance anybody has to tune.
 */
const SAME_SIZE_PT = 1

/**
 * The papers this tool can name, portrait (short edge first), in points.
 *
 * US Letter is here because it is the paper the build guide prints on
 * (`./guide.ts`'s `GUIDE_PAPER`); A4 and A3 because they are what the Pultec
 * schematic sheets declare today; the rest because they are the neighbours a
 * reader would otherwise have to tell apart by eye from a millimetre figure.
 */
const PAPERS: readonly (readonly [string, number, number])[] = [
  ["US Letter", 612, 792],
  ["US Legal", 612, 1008],
  ["US Tabloid", 792, 1224],
  ["A4", 595.28, 841.89],
  ["A3", 841.89, 1190.55],
  ["A2", 1190.55, 1683.78],
  ["A1", 1683.78, 2383.94],
]

/**
 * The paper the build guide's own pages print on, and the CSS keyword that
 * makes them print on it.
 *
 * **ONE OBJECT, BECAUSE THE TWO HALVES ARE ONE FACT.** `cssSize` goes into
 * `./guide.ts`'s `@page { size: ... }` and the points are what that keyword
 * MEANS, which the printed page can be measured against and is - see
 * `tests/guide/single-document.test.ts`, which prints a real guide with the
 * real browser and measures every page with the real merge tool. A figure in
 * prose is a transcription with a date on it; this one has a check under it.
 *
 * It is US Letter because that is the paper the owner can print. 2026-10-30:
 * *"I don't have an A3-capable printer. I live in california and have a
 * printer capable of printing US letter 8.5x11"."*
 */
export const GUIDE_PAPER: PageSize & { readonly cssSize: string } = {
  cssSize: "letter",
  widthPt: 612,
  heightPt: 792,
}

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= SAME_SIZE_PT
}

/** The page's dimensions, smallest first - the pair that identifies the SHEET. */
function edges(size: PageSize): readonly [number, number] {
  return size.widthPt <= size.heightPt
    ? [size.widthPt, size.heightPt]
    : [size.heightPt, size.widthPt]
}

/**
 * Whether two pages are on the same sheet of paper, **in either
 * orientation**.
 *
 * Orientation is deliberately not part of it: a landscape US Letter page and
 * a portrait US Letter page come off the same tray, and a document that mixes
 * them prints at full size. What this predicate is for is the question a
 * printer tray answers, not the question a reader's wrist does.
 */
export function samePaper(a: PageSize, b: PageSize): boolean {
  const [aShort, aLong] = edges(a)
  const [bShort, bLong] = edges(b)
  return close(aShort, bShort) && close(aLong, bLong)
}

/** Points to millimetres, to one decimal place: what a reader can hold a ruler to. */
export function mmOf(points: number): number {
  return Math.round((points * 25.4) / 72 * 10) / 10
}

/**
 * The paper's name and orientation - `"A4, landscape"`, `"US Letter"` - or
 * `undefined` for a size this tool does not recognise.
 *
 * A square page gets no orientation word, because neither is true of it.
 */
export function paperName(size: PageSize): string | undefined {
  const [short, long] = edges(size)
  const match = PAPERS.find(([, w, h]) => close(w, short) && close(h, long))
  if (match === undefined) return undefined
  const [name] = match
  if (close(size.widthPt, size.heightPt)) return name
  return size.widthPt > size.heightPt ? `${name}, landscape` : `${name}, portrait`
}

/**
 * The page's size as a sentence fragment a person can act on:
 * `"297.0 x 210.0 mm (A4, landscape)"`, or just the measurement when the size
 * is not one this tool can name.
 */
export function describePaper(size: PageSize): string {
  const measured = `${mmOf(size.widthPt).toFixed(1)} x ${mmOf(size.heightPt).toFixed(1)} mm`
  const name = paperName(size)
  return name === undefined ? measured : `${measured} (${name})`
}
