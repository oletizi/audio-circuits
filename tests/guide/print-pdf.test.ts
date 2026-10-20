/**
 * Tests for the real HTML-to-PDF converter (tools/guide/print-pdf.ts).
 *
 * Four of these drive stand-in converters - a path that is not there,
 * `/usr/bin/false`, `/bin/echo`, and a script that writes something that is
 * not a PDF - because each is one way the step can fail, and three of the
 * four would otherwise fail SILENTLY.
 *
 * **THE LAST ONE RUNS THE REAL BROWSER AND FAILS RATHER THAN SKIPS**, on the
 * precedent of tests/circuits/kicad-round-trip.ts: `make guide` now needs a
 * converter the way `make check` needs kicad-cli, so it is part of the
 * toolchain, and it is the only proof that the flags this repository passes
 * still produce a PDF on the machine in front of us. Chrome's headless flags
 * have changed across versions; a unit test with an injected converter cannot
 * notice that.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { defaultHtmlToPdf } from "../../tools/guide/browser-install.ts"
import { defaultPrintGuidePdf } from "../../tools/guide/print-pdf.ts"

/**
 * Still duplicates the default `HTML_TO_PDF ?= ...` line in make/board.mk,
 * as tests/circuits/kicad-round-trip.ts duplicates KICAD_CLI's: a constant
 * shared between make and TypeScript is not possible, so keep the two in
 * sync by hand - `tests/kicad/install.test.ts` checks they agree. What
 * changed (`docs/known-gaps.md` **G169**) is that the default itself is now
 * a per-platform candidate list (`./browser-install.ts`), not a bare macOS
 * literal. The `HTML_TO_PDF` env var overrides both.
 */
const HTML_TO_PDF = process.env["HTML_TO_PDF"] ?? defaultHtmlToPdf()

const PAGE = [
  "<html><head><style>@page { size: letter; margin: 0.5in; }</style></head>",
  "<body><h1>probe board - build guide</h1><p>page one</p>",
  '<div style="page-break-before: always"><h2>second page</h2></div>',
  "</body></html>",
].join("\n")

/**
 * The guide page, written into `dir`, with the two paths the converter takes.
 *
 * `mkdtempSync` IS DELIBERATELY NOT IN HERE. tests/stripboard/temp-scratch.test.ts
 * holds every mkdtemp site under `tests/` to removing the directory it named,
 * and a factory that handed one back would have to be waved through that check
 * to pass - so each test below makes its own `dir` and removes `dir`.
 */
function pageIn(dir: string): { readonly html: string; readonly pdf: string } {
  const html = path.join(dir, "guide.html")
  fs.writeFileSync(html, PAGE)
  return { html, pdf: path.join(dir, "guide.pdf") }
}

test("a converter that is not there is refused by name, with the HTML_TO_PDF pointer", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guide-print-pdf-"))
  try {
    const { html, pdf } = pageIn(dir)
    const missing = path.join(dir, "no-such-browser")
    expect(() => defaultPrintGuidePdf(missing, html, pdf)).toThrow(
      new RegExp(`could not run the HTML-to-PDF converter at ${missing}[\\s\\S]*Set HTML_TO_PDF`),
    )
    expect(fs.existsSync(pdf)).toBe(false)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("a converter that exits non-zero is refused, quoting how it was invoked", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guide-print-pdf-"))
  try {
    const { html, pdf } = pageIn(dir)
    expect(() => defaultPrintGuidePdf("/usr/bin/false", html, pdf)).toThrow(
      /\/usr\/bin\/false exited 1 printing [\s\S]*It was invoked as: --headless[\s\S]*--print-to-pdf=/,
    )
    expect(fs.existsSync(pdf)).toBe(false)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("a converter that exits 0 and prints nothing is refused - the case the exit status hides", () => {
  // MEASURED, NOT HYPOTHETICAL: headless Chrome pointed at a file:// URL it
  // cannot load exits 0 and writes no PDF. /bin/echo stands in for exactly
  // that shape. Without the file check this run would report success and the
  // packet would be published without its PDF.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guide-print-pdf-"))
  try {
    const { html, pdf } = pageIn(dir)
    expect(() => defaultPrintGuidePdf("/bin/echo", html, pdf)).toThrow(
      new RegExp(`/bin/echo exited 0 but wrote no PDF at ${pdf}`),
    )
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("a converter that writes something that is not a PDF is refused, naming %PDF", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guide-print-pdf-"))
  try {
    const { html, pdf } = pageIn(dir)
    const script = path.join(dir, "fake-browser.sh")
    fs.writeFileSync(
      script,
      [
        "#!/bin/sh",
        'for arg in "$@"; do',
        '  case "$arg" in',
        '    --print-to-pdf=*) printf "GIF89a not a pdf" > "${arg#--print-to-pdf=}" ;;',
        "  esac",
        "done",
        "exit 0",
        "",
      ].join("\n"),
    )
    fs.chmodSync(script, 0o755)
    expect(() => defaultPrintGuidePdf(script, html, pdf)).toThrow(
      /does not begin with %PDF - it is not a PDF \(first bytes: "GIF8"\)/,
    )
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("the real converter prints a multi-page PDF from a page with the guide's print CSS", () => {
  if (!fs.existsSync(HTML_TO_PDF)) {
    throw new Error(
      `the HTML-to-PDF converter was not found at ${HTML_TO_PDF}. Install Google Chrome (or ` +
        "another Chromium-family browser) or set HTML_TO_PDF. This test does not skip: it is " +
        "the only proof that the flags make/board.mk passes still produce a PDF on this machine.",
    )
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guide-print-pdf-"))
  try {
    const { html, pdf } = pageIn(dir)
    defaultPrintGuidePdf(HTML_TO_PDF, html, pdf)
    const printed = fs.readFileSync(pdf)
    expect(printed.subarray(0, 4).toString("latin1")).toBe("%PDF")
    // Two `/Type /Page` objects, because the page asked for a break: proof the
    // converter honoured the @page/page-break rules rather than emitting one
    // screen-shaped sheet.
    const pageObjects = printed.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []
    expect(pageObjects.length).toBe(2)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
