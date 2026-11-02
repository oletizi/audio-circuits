/**
 * Renders a build guide's `guide.html` to `guide.pdf` with a headless browser.
 *
 * The guide page already carries `@page`, `@media print` and explicit
 * `page-break` rules (see `./guide.ts`), so the thing that knows how to turn
 * it into printable pages is a browser's own print engine. Nothing here
 * re-implements pagination; it drives Chrome's.
 *
 * **THE CONVERTER IS RESOLVED THE WAY `KICAD_CLI` IS** - an overridable make
 * variable with this repository's own contingent default
 * (`HTML_TO_PDF ?= ...` in make/board.mk), exported and passed down, never a
 * path hardcoded in TypeScript. A missing or broken converter REFUSES by
 * name. It does not fall back to "the HTML is there, print it yourself": a
 * packet quietly lacking its PDF is a skipped step that looks like a passing
 * one, which is the one failure mode the whole guide workflow exists to
 * prevent.
 *
 * **CHROME EXITS 0 WHEN IT PRINTS NOTHING.** Measured on this machine with
 * Chrome 155: pointed at a `file://` URL that does not exist, it writes no
 * PDF and still exits 0. So the exit status is NOT the check - the check is
 * that the output file exists and begins with `%PDF`. Removing that
 * verification restores a silent, successful-looking no-op.
 *
 * The converter is given its own throwaway `--user-data-dir`, because modern
 * headless Chrome otherwise opens the operator's real profile, and a build
 * step has no business writing there (or failing because a browser window is
 * already holding it).
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

/**
 * The first bytes of every PDF; what distinguishes a print from a no-op.
 *
 * EXPORTED, because `./merge-pdf.ts` checks the same four bytes on the file
 * this step produced, one step later: two copies of this constant would be
 * two things that could come to mean something else.
 */
export const PDF_MAGIC = "%PDF"

/**
 * The flags the converter is invoked with. Named here, and quoted in the
 * refusals, so an operator pointing `HTML_TO_PDF` at something else knows
 * exactly what that something else has to accept.
 */
export function printPdfArgs(profileDir: string, htmlPath: string, pdfPath: string): readonly string[] {
  return [
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--user-data-dir=${profileDir}`,
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).href,
  ]
}

const POINTER =
  "Set HTML_TO_PDF to a Chromium-family browser binary (Chrome, Chromium, Brave, Edge) that " +
  "accepts --headless --print-to-pdf, e.g. " +
  'make guide HTML_TO_PDF="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome". ' +
  "Nothing is substituted and no PDF-less packet is written: guide.pdf is what gets carried to " +
  "the bench, and a packet missing it would read as a complete one."

/**
 * Render `htmlPath` to `pdfPath`, or throw naming the converter.
 *
 * Writes through `node:fs` directly, as `defaultExportSchematicPdf` does:
 * this IS the real-filesystem path, and the injected `GuideFs` exists so no
 * test has to reach it.
 */
export function defaultPrintGuidePdf(htmlToPdf: string, htmlPath: string, pdfPath: string): void {
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "guide-pdf-profile-"))
  try {
    const args = printPdfArgs(profileDir, htmlPath, pdfPath)
    const result = spawnSync(htmlToPdf, args, { encoding: "utf8" })
    if (result.error) {
      throw new Error(
        `could not run the HTML-to-PDF converter at ${htmlToPdf}: ${result.error.message}.\n${POINTER}`,
      )
    }
    if (result.status !== 0) {
      const detail = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim()
      throw new Error(
        `${htmlToPdf} exited ${String(result.status)} printing ${htmlPath} to PDF` +
          `${detail === "" ? "" : `:\n${detail}`}\n` +
          `It was invoked as: ${args.join(" ")}\n${POINTER}`,
      )
    }
    assertPrinted(htmlToPdf, htmlPath, pdfPath, args)
  } finally {
    fs.rmSync(profileDir, { recursive: true, force: true })
  }
}

/**
 * The check the exit status cannot do. See this module's comment: a Chrome
 * that could not load the page reports success and prints nothing.
 */
function assertPrinted(
  htmlToPdf: string,
  htmlPath: string,
  pdfPath: string,
  args: readonly string[],
): void {
  if (!fs.existsSync(pdfPath)) {
    throw new Error(
      `${htmlToPdf} exited 0 but wrote no PDF at ${pdfPath}.\n` +
        `It was invoked as: ${args.join(" ")}\n` +
        `A headless Chrome that cannot load ${htmlPath} exits 0 and prints nothing, so this is ` +
        "that case, not a converter crash. Check that the file is readable and that the " +
        "converter is a Chromium-family browser accepting --print-to-pdf; no packet was written.",
    )
  }
  const head = fs.readFileSync(pdfPath).subarray(0, PDF_MAGIC.length).toString("latin1")
  if (head !== PDF_MAGIC) {
    throw new Error(
      `${htmlToPdf} wrote ${pdfPath}, but it does not begin with ${PDF_MAGIC} - it is not a PDF ` +
        `(first bytes: ${JSON.stringify(head)}).\n` +
        `It was invoked as: ${args.join(" ")}\n${POINTER}`,
    )
  }
}
