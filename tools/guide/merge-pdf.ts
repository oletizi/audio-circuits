/**
 * Joins the schematic page into the printed build guide, so a board's packet
 * is **ONE printable document** instead of two.
 *
 * The owner, 2026-10-30: *"merge them. I want a single printable document"* -
 * the builder was printing and holding `guide.pdf` and `schematic.pdf`, and
 * nothing in the packet said there were two.
 *
 * **NOTHING HERE SCALES, CROPS OR RE-DISTILLS A PAGE, AND THAT IS THE WHOLE
 * DESIGN.** The schematic page goes in exactly as `kicad-cli` exported it,
 * and the verification below REFUSES, naming the page, if the merge tool
 * resized anything. A drawing shrunk to fit is a drawing nobody approved, and
 * by how much a page must shrink to reach a tray is the printer's decision and
 * the owner's, never this tool's. Where the schematic page is on a different
 * sheet of paper from the guide, the document SAYS SO on page one
 * (`./schematic-notice.ts`) rather than quietly needing a printer the reader
 * may not own.
 *
 * **THE TOOL IS RESOLVED THE WAY `KICAD_CLI` AND `HTML_TO_PDF` ARE** - an
 * overridable make variable with this repository's own contingent default
 * (`PDF_MERGE` in make/board.mk, through `./pdf-merge-install.ts`), exported
 * and passed down, never a path hardcoded in TypeScript. A missing or broken
 * tool REFUSES by name. It does not fall back to leaving two files: a packet
 * that is quietly two documents is the thing this module was written to end.
 *
 * **THE EXIT STATUS IS NOT THE CHECK.** `./print-pdf.ts` records the measured
 * reason - Chrome exits 0 when it prints nothing - and the merge step is worse
 * off, because a merge that drops a page writes a *valid* PDF. So the check is
 * four things the artifact itself can be asked:
 *
 *   1. the output exists;
 *   2. it begins with `%PDF`;
 *   3. it has as many pages as the two inputs had between them;
 *   4. every page is the same size as the page it came from.
 *
 * (3) is the one that catches a dropped schematic page, which would otherwise
 * publish a packet that reads as complete and is not. (4) is the one that
 * catches a tool that fitted the schematic to the guide's paper.
 *
 * **qpdf EXITS 3 WHEN IT SUCCEEDS WITH WARNINGS**, measured here: handed a
 * PDF whose pages carry no `/Resources`, it repairs them, says so, writes a
 * correct file and exits 3. That is treated as a refusal rather than waved
 * through, because a warning means one of the two inputs is malformed - and
 * the inputs are this repository's own printed guide and an approved
 * schematic sheet's export, neither of which has any business needing repair.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
// THE SAME FOUR BYTES `./print-pdf.ts` CHECKS FOR, imported rather than
// restated: the two steps verify the same kind of artifact one after the
// other, and a second copy of this constant is a second thing that could
// come to mean something else.
import { PDF_MAGIC } from "./print-pdf.ts"
import { describePaper, type PageSize } from "./paper.ts"

/**
 * Which page of the merged document the schematic is.
 *
 * **Page 2, immediately after the guide's own page one, and this is the one
 * place that fact lives** - `./merge-pdf.ts` builds the page ranges from it
 * and `./schematic-notice.ts`'s header row prints it, so the printed `Schematic`
 * row and the merge cannot disagree about where the page went.
 *
 * Why there, rather than first or last:
 *
 * - **The header names it.** Page one is the header block - board, date,
 *   layout, schematic - and the `Schematic` row's job is to send a reader to
 *   the drawing. A row pointing at the very next page is a pointer somebody
 *   holding paper can follow.
 * - **It is a reference, so it arrives before the work.** Everything after it
 *   is something a builder DOES - the layout images, the stand-in groups
 *   decision, then the checklist whose section 1 is where a build starts. The
 *   schematic is what the rest is checked against, so it is in hand before
 *   the first step rather than behind eleven pages of it.
 * - **The document still opens on what it is.** Putting the schematic first
 *   would make a reader meet a drawing before the page naming the board, the
 *   date and the layout it was generated from - and would put page one's
 *   notices, which exist to be seen before any other page, on page two.
 */
export const SCHEMATIC_PAGE = 2

const POINTER =
  "Set PDF_MERGE to a qpdf-compatible binary that accepts --show-npages, --json=latest and " +
  '--empty --pages <file> <range> ... -- <out>, e.g. make guide PDF_MERGE=/opt/homebrew/bin/qpdf. ' +
  "Nothing is substituted and no packet is written: the merged PDF is the single document that " +
  "gets carried to the bench, and a packet left as two files would read as one."

/**
 * The arguments one merge is invoked with. Named here, and quoted in the
 * refusals, so an operator pointing `PDF_MERGE` at something else knows
 * exactly what that something else has to accept.
 *
 * `guidePages` is the printed guide's own page count, and it is a parameter
 * rather than something read in here because the caller has already read it to
 * check the result against. The last range is OMITTED when the guide has
 * nothing after the insertion point: qpdf refuses an out-of-range page range
 * rather than ignoring it, so a `2-z` on a one-page guide would fail the whole
 * merge.
 */
export function mergeArgs(
  guidePdf: string,
  schematicPdf: string,
  guidePages: number,
  outPath: string,
): readonly string[] {
  if (!Number.isInteger(guidePages) || guidePages < 1) {
    throw new Error(
      `cannot merge a schematic into a guide of ${String(guidePages)} pages: the printed guide must ` +
        "have at least one page for the schematic to follow. This is a defect in the caller - the " +
        "page count comes from the merge tool's own --show-npages - not a missing declaration.",
    )
  }
  // BOTH RANGES ARE CONDITIONAL, because qpdf refuses an out-of-range or
  // empty page range rather than ignoring it. `before` is absent if the
  // schematic is page one (nothing of the guide precedes it) and `after` is
  // absent if the guide has nothing past the insertion point - the second of
  // which a one-page guide really produces, and has a test.
  const before = SCHEMATIC_PAGE > 1 ? [guidePdf, `1-${SCHEMATIC_PAGE - 1}`] : []
  const after = guidePages >= SCHEMATIC_PAGE ? [guidePdf, `${SCHEMATIC_PAGE}-z`] : []
  return ["--empty", "--pages", ...before, schematicPdf, "1-z", ...after, "--", outPath]
}

/** One invocation of the merge tool, or a throw naming it and how it was called. */
function run(pdfMerge: string, args: readonly string[], what: string): string {
  const result = spawnSync(pdfMerge, [...args], { encoding: "utf8", maxBuffer: 128 * 1024 * 1024 })
  if (result.error) {
    throw new Error(`could not run the PDF merge tool at ${pdfMerge}: ${result.error.message}.\n${POINTER}`)
  }
  if (result.status !== 0) {
    const detail = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim()
    throw new Error(
      `${pdfMerge} exited ${String(result.status)} ${what}` +
        `${detail === "" ? "" : `:\n${detail}`}\n` +
        `It was invoked as: ${args.join(" ")}\n` +
        "qpdf exits 3 when it SUCCEEDS WITH WARNINGS - a repaired input - and that is refused here " +
        "too: a warning means one of the inputs is malformed, and the inputs are this repository's " +
        `own printed guide and an approved sheet's export.\n${POINTER}`,
    )
  }
  return result.stdout ?? ""
}

/** How many pages `pdf` has, according to the merge tool itself. */
export function defaultPdfPageCount(pdfMerge: string, pdf: string): number {
  const args = ["--show-npages", pdf]
  const out = run(pdfMerge, args, `counting the pages of ${pdf}`).trim()
  const count = Number(out)
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(
      `${pdfMerge} --show-npages ${pdf} printed ${JSON.stringify(out)}, which is not a page count.\n` +
        `It was invoked as: ${args.join(" ")}\n${POINTER}`,
    )
  }
  return count
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Every page's size in `pdf`, in page order, read off each page object's own
 * `/MediaBox` through the merge tool's `--json`.
 *
 * **READ FROM THE ARTIFACT, NOT FROM ANY DECLARATION ABOUT IT**, and through
 * the tool's own parser rather than a regex over the bytes: a second PDF
 * parser written for one step is a second thing that can be wrong, and this
 * repository has already produced one false reading that way
 * (`docs/research/2026-10-29-guides-with-approved-schematics.md` §3).
 *
 * A page with no `/MediaBox` of its own is REFUSED rather than inherited from
 * its `/Pages` parent. Inheritance is legal PDF, and implementing it here
 * would be a guess at which parent in a tree this tool has not been shown;
 * every PDF this step handles - Chrome's print, `kicad-cli`'s export, qpdf's
 * own output - states a `/MediaBox` per page, measured.
 */
export function defaultPdfPageSizes(pdfMerge: string, pdf: string): readonly PageSize[] {
  const args = ["--json=latest", "--json-key=pages", "--json-key=qpdf", pdf]
  const out = run(pdfMerge, args, `reading the page sizes of ${pdf}`)
  const refuse = (why: string): never => {
    throw new Error(
      `could not read the page sizes of ${pdf} from ${pdfMerge} --json=latest: ${why}.\n` +
        `It was invoked as: ${args.join(" ")}\n${POINTER}`,
    )
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(out)
  } catch (caught) {
    return refuse(`its output is not JSON (${caught instanceof Error ? caught.message : String(caught)})`)
  }
  if (!isRecord(parsed)) return refuse("its output is not a JSON object")
  const pages = parsed["pages"]
  if (!Array.isArray(pages)) return refuse('it has no "pages" array')
  const container = parsed["qpdf"]
  if (!Array.isArray(container) || container.length < 2) return refuse('it has no "qpdf" object table')
  const objects = container[1]
  if (!isRecord(objects)) return refuse('its "qpdf" object table is not an object')
  return pages.map((page, index) => {
    if (!isRecord(page) || typeof page["object"] !== "string") {
      return refuse(`page ${index + 1} has no object reference`)
    }
    const object = objects[`obj:${page["object"]}`]
    if (!isRecord(object) || !isRecord(object["value"])) {
      return refuse(`page ${index + 1}'s object ${page["object"]} is not in the object table`)
    }
    const box = object["value"]["/MediaBox"]
    if (!Array.isArray(box) || box.length !== 4 || box.some((n) => typeof n !== "number")) {
      return refuse(
        `page ${index + 1} states no /MediaBox of its own (an inherited one is not read here - see ` +
          "tools/guide/merge-pdf.ts)",
      )
    }
    const [x1, y1, x2, y2] = box
    if (typeof x1 !== "number" || typeof y1 !== "number" || typeof x2 !== "number" || typeof y2 !== "number") {
      return refuse(`page ${index + 1}'s /MediaBox is not four numbers`)
    }
    return { widthPt: Math.abs(x2 - x1), heightPt: Math.abs(y2 - y1) }
  })
}

/**
 * Merge `schematicPdf` into `guidePdf` at `SCHEMATIC_PAGE`, writing
 * `outPath`, or throw naming the merge tool and what it did.
 *
 * Writes through `node:fs` directly, as `defaultExportSchematicPdf` and
 * `defaultPrintGuidePdf` do: this IS the real-filesystem path, and the
 * injected `GuideFs` exists so no test has to reach it.
 */
export function defaultMergeSchematicPage(
  pdfMerge: string,
  guidePdf: string,
  schematicPdf: string,
  outPath: string,
): void {
  // READ BEFORE THE MERGE, because they are what the result is checked
  // against: a count and a set of sizes read from the output alone would be
  // a reading with nothing to disagree with.
  const guidePages = defaultPdfPageCount(pdfMerge, guidePdf)
  const schematicPages = defaultPdfPageCount(pdfMerge, schematicPdf)
  const guideSizes = defaultPdfPageSizes(pdfMerge, guidePdf)
  const schematicSizes = defaultPdfPageSizes(pdfMerge, schematicPdf)
  if (guideSizes.length !== guidePages || schematicSizes.length !== schematicPages) {
    throw new Error(
      `${pdfMerge} reports ${String(guidePages)}/${String(schematicPages)} pages in ${guidePdf} and ` +
        `${schematicPdf} with --show-npages, but ${String(guideSizes.length)}/` +
        `${String(schematicSizes.length)} with --json=latest. The two readings disagree, so neither ` +
        "can check the merge; no packet was written.",
    )
  }
  const expected = expectedPages(guidePdf, schematicPdf, guideSizes, schematicSizes)
  const args = mergeArgs(guidePdf, schematicPdf, guidePages, outPath)
  run(pdfMerge, args, `merging ${schematicPdf} into ${guidePdf}`)
  assertMerged(pdfMerge, outPath, args, expected, guidePages, schematicPages)
}

/** One page the merged document must hold: its size, and where that size came from. */
interface ExpectedPage {
  readonly size: PageSize
  /** Named in the refusal, so a resized page says which input page it was. */
  readonly source: string
}

/**
 * The sizes the merged document must have, **in the merged order** - which is
 * not the two inputs concatenated: the schematic goes in at `SCHEMATIC_PAGE`,
 * so the guide's own pages are split around it exactly as `mergeArgs` splits
 * their ranges.
 *
 * Built from the same constant the ranges are, for that reason. The first
 * version of this function concatenated the inputs instead, and the
 * real-tool test caught it immediately - the check fired on a correct merge,
 * naming page 2 - which is the shape of a verification that would have had to
 * be loosened to pass and would then have checked nothing.
 */
function expectedPages(
  guidePdf: string,
  schematicPdf: string,
  guideSizes: readonly PageSize[],
  schematicSizes: readonly PageSize[],
): readonly ExpectedPage[] {
  const fromGuide = (size: PageSize, index: number): ExpectedPage => ({
    size,
    source: `page ${String(index + 1)} of ${guidePdf}`,
  })
  const head = guideSizes.slice(0, SCHEMATIC_PAGE - 1).map(fromGuide)
  const tail = guideSizes
    .slice(SCHEMATIC_PAGE - 1)
    .map((size, offset) => fromGuide(size, offset + SCHEMATIC_PAGE - 1))
  const schematic = schematicSizes.map((size, index) => ({
    size,
    source: schematicSizes.length === 1 ? schematicPdf : `page ${String(index + 1)} of ${schematicPdf}`,
  }))
  return [...head, ...schematic, ...tail]
}

/**
 * The checks the exit status cannot make. See this module's comment: a merge
 * that drops the schematic page writes a valid PDF and reports success, and a
 * merge that scales it to the guide's paper reports success too.
 */
function assertMerged(
  pdfMerge: string,
  outPath: string,
  args: readonly string[],
  expected: readonly ExpectedPage[],
  guidePages: number,
  schematicPages: number,
): void {
  if (!fs.existsSync(outPath)) {
    throw new Error(
      `${pdfMerge} exited 0 but wrote no PDF at ${outPath}.\n` +
        `It was invoked as: ${args.join(" ")}\n` +
        "A merge tool that exits 0 and writes nothing leaves the packet with no document at all, " +
        `which is why the exit status is not the check here.\n${POINTER}`,
    )
  }
  const head = fs.readFileSync(outPath).subarray(0, PDF_MAGIC.length).toString("latin1")
  if (head !== PDF_MAGIC) {
    throw new Error(
      `${pdfMerge} wrote ${outPath}, but it does not begin with ${PDF_MAGIC} - it is not a PDF ` +
        `(first bytes: ${JSON.stringify(head)}).\n` +
        `It was invoked as: ${args.join(" ")}\n${POINTER}`,
    )
  }
  const total = guidePages + schematicPages
  const merged = defaultPdfPageCount(pdfMerge, outPath)
  if (merged !== total) {
    throw new Error(
      `the merged PDF ${outPath} has ${String(merged)} pages, not the ${String(total)} expected ` +
        `(${String(guidePages)} guide + ${String(schematicPages)} schematic).\n` +
        `It was invoked as: ${args.join(" ")}\n` +
        "A merge that drops a page still writes a valid PDF and still exits 0, so this count is the " +
        "only thing that notices. A packet missing its schematic page would read as a complete one; " +
        `none was written.\n${POINTER}`,
    )
  }
  const sizes = defaultPdfPageSizes(pdfMerge, outPath)
  if (sizes.length !== expected.length) {
    throw new Error(
      `the merged PDF ${outPath} reports ${String(merged)} pages with --show-npages and ` +
        `${String(sizes.length)} with --json=latest; the two readings disagree, so neither can be ` +
        "trusted to say the pages are unscaled. No packet was written.",
    )
  }
  for (const [index, want] of expected.entries()) {
    const got = sizes[index]
    // THE SIZE, NOT THE SHEET: `samePaper` is deliberately orientation-blind
    // (see ./paper.ts) and would wave through a merge that turned a landscape
    // schematic on its side. Both dimensions are compared, each within the
    // same one point of rounding noise two different tools produce.
    const unchanged =
      got !== undefined &&
      Math.abs(want.size.widthPt - got.widthPt) <= 1 &&
      Math.abs(want.size.heightPt - got.heightPt) <= 1
    if (!unchanged) {
      throw new Error(
        `page ${String(index + 1)} of the merged PDF ${outPath} is ` +
          `${got === undefined ? "missing" : describePaper(got)}, but ${want.source} is ` +
          `${describePaper(want.size)} - the merge RESIZED or ROTATED it.\n` +
          `It was invoked as: ${args.join(" ")}\n` +
          "Nothing in this packet may scale a page: a drawing shrunk to fit is a drawing nobody " +
          "approved, and whether to accept one is the owner's decision. Point PDF_MERGE at a tool " +
          "that copies pages without fitting them, or change the schematic sheet's own paper " +
          "setting - which is a change its reviewer has to approve. No packet was written.",
      )
    }
  }
}
