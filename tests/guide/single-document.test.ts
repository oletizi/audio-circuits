/**
 * The packet is ONE printable document, end to end through the two real
 * tools: a real build guide page, printed by the real headless browser, with a
 * real schematic page merged in by the real merge tool, and every page
 * measured afterwards.
 *
 * **WHAT ONLY THIS FILE CAN CHECK.** `./merge-pdf.ts`'s tests drive the merge
 * on hand-built PDFs, and `./packet.test.ts` drives the packet with both tools
 * faked. Neither one can notice the thing that would quietly make the printed
 * document's own claims false:
 *
 *  - **`GUIDE_PAPER`'s points are what its CSS keyword MEANS.** The notice on
 *    page one says this document is `215.9 x 279.4 mm (US Letter)`, from
 *    `tools/guide/paper.ts`'s constant, while what actually sets the page size
 *    is `@page { size: letter }` handed to a browser. A figure in prose is a
 *    transcription with a date on it; this prints a real guide and measures
 *    every page of it.
 *  - **The schematic really lands at `SCHEMATIC_PAGE`, and keeps its own
 *    size.** Measured on the merged file, against the standalone export.
 *
 * **IT FAILS RATHER THAN SKIPS** when either tool is absent, on the precedent
 * `./print-pdf.test.ts` and `tests/circuits/kicad-round-trip.ts` set: a
 * skipped check must never look like a passing one.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { defaultHtmlToPdf } from "../../tools/guide/browser-install.ts"
import { buildGuideHtml, type GuideInput } from "../../tools/guide/guide.ts"
import {
  SCHEMATIC_PAGE,
  defaultMergeSchematicPage,
  defaultPdfPageSizes,
} from "../../tools/guide/merge-pdf.ts"
import { GUIDE_PAPER, samePaper } from "../../tools/guide/paper.ts"
import { defaultPdfMerge } from "../../tools/guide/pdf-merge-install.ts"
import { defaultPrintGuidePdf } from "../../tools/guide/print-pdf.ts"

const HTML_TO_PDF = process.env["HTML_TO_PDF"] ?? defaultHtmlToPdf()
const PDF_MERGE = process.env["PDF_MERGE"] ?? defaultPdfMerge()

function requireTools(): void {
  for (const [name, variable] of [
    [HTML_TO_PDF, "HTML_TO_PDF"],
    [PDF_MERGE, "PDF_MERGE"],
  ] as const) {
    if (!fs.existsSync(name)) {
      throw new Error(
        `${variable} resolved to ${name}, which is not there. Install it or set ${variable}. This ` +
          "test does not skip: it is the only check that the paper the printed notices CLAIM this " +
          "document is on is the paper the browser actually prints.",
      )
    }
  }
}

/** A real guide page, with the real stylesheet, long enough to span pages. */
function guidePage(): string {
  const rows = Array.from({ length: 40 }, (_, i) => ({
    title: `step ${String(i + 1)}`,
    columns: ["Item", "Where"],
    rows: [[`part ${String(i + 1)}`, "somewhere on the board"]],
    note: undefined,
  }))
  const input: GuideInput = {
    boardName: "single-document-probe",
    generated: "2026-10-30",
    layoutPath: "boards/probe/probe.vrt",
    schematic: { kind: "printed", path: "drafted/probe/probe.kicad_sch" },
    images: {
      designators: "<svg viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"none\" stroke=\"black\"/></svg>",
      values: "<svg viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"none\" stroke=\"black\"/></svg>",
      copper: "<svg viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"none\" stroke=\"black\"/></svg>",
      clusters: undefined,
    },
    checklist: rows,
    powerUpChecks: undefined,
    wiringPath: undefined,
    scaffold: undefined,
    schematicPaper: GUIDE_PAPER,
  }
  return buildGuideHtml(input)
}

test("every page the real browser prints from a real guide is GUIDE_PAPER", () => {
  // THE CHECK UNDER `GUIDE_PAPER`'s POINTS. If `@page { size: letter }` and
  // 612 x 792 pt ever disagreed, every paper notice this packet prints would
  // be making a false claim about the document a reader is holding, and
  // nothing else in the suite would notice.
  requireTools()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "single-document-"))
  try {
    const html = path.join(dir, "guide.html")
    const pdf = path.join(dir, "guide-pages.pdf")
    fs.writeFileSync(html, guidePage())
    defaultPrintGuidePdf(HTML_TO_PDF, html, pdf)
    const sizes = defaultPdfPageSizes(PDF_MERGE, pdf)
    expect(sizes.length, "a guide this long spans several pages").toBeGreaterThan(1)
    for (const [index, size] of sizes.entries()) {
      expect({ page: index + 1, size }).toEqual({ page: index + 1, size: { widthPt: 612, heightPt: 792 } })
      expect(samePaper(size, GUIDE_PAPER)).toBe(true)
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}, 120_000)

test("the merged document is the guide plus one page, with the schematic at SCHEMATIC_PAGE", () => {
  requireTools()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "single-document-"))
  try {
    const html = path.join(dir, "guide.html")
    const pages = path.join(dir, "guide-pages.pdf")
    fs.writeFileSync(html, guidePage())
    defaultPrintGuidePdf(HTML_TO_PDF, html, pages)
    const guideSizes = defaultPdfPageSizes(PDF_MERGE, pages)
    // The "schematic" is a second print, at a size the guide is NOT on, so
    // that the page can be told apart from its neighbours by measurement
    // alone - the same way the real A4 sheets can.
    const schematicHtml = path.join(dir, "schematic.html")
    const schematic = path.join(dir, "schematic.pdf")
    fs.writeFileSync(
      schematicHtml,
      '<html><head><style>@page { size: A4 landscape; margin: 0 }</style></head>' +
        "<body><h1>probe schematic</h1></body></html>",
    )
    defaultPrintGuidePdf(HTML_TO_PDF, schematicHtml, schematic)
    const [schematicSize] = defaultPdfPageSizes(PDF_MERGE, schematic)
    if (schematicSize === undefined) throw new Error("test: the schematic print has no page")
    expect(samePaper(schematicSize, GUIDE_PAPER), "the probe page is deliberately NOT the guide's paper").toBe(false)

    const merged = path.join(dir, "guide.pdf")
    defaultMergeSchematicPage(PDF_MERGE, pages, schematic, merged)
    const mergedSizes = defaultPdfPageSizes(PDF_MERGE, merged)
    expect(mergedSizes.length).toBe(guideSizes.length + 1)
    // UNSCALED, measured: the inserted page is the same size in the merged
    // document as it was standing alone.
    expect(mergedSizes[SCHEMATIC_PAGE - 1]).toEqual(schematicSize)
    // AND THE GUIDE'S OWN PAGES ARE WHERE THE MERGE SAID: page one before it,
    // the rest after, all still on the guide's paper.
    expect(mergedSizes[0]).toEqual(guideSizes[0])
    for (const size of mergedSizes.slice(SCHEMATIC_PAGE)) {
      expect(samePaper(size, GUIDE_PAPER)).toBe(true)
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}, 120_000)
