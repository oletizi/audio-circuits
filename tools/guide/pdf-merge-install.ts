/**
 * Where the PDF merge tool lives on this machine, for joining the schematic
 * page into the printed build guide so one board's packet is ONE printable
 * document.
 *
 * This is the same per-platform-candidate pattern `lib/kicad/install.ts` uses
 * for `kicad-cli` and `./browser-install.ts` uses for the headless browser,
 * and it exists for the same reason: a literal default good on only one
 * platform makes every other platform set an environment variable by hand,
 * with nothing telling the reader which.
 *
 * `./merge-pdf.ts` deliberately takes the tool as a parameter and carries no
 * default of its own - never a path hardcoded in TypeScript. The one default
 * that must exist lives in `make/board.mk`'s `PDF_MERGE` (Make cannot import
 * TypeScript, so it reaches this file through
 * `tools/cli/resolved-default.ts`), and this module's other consumer is
 * `tests/guide/merge-pdf.test.ts`.
 *
 * **IT IS qpdf, AND THE CHOICE IS NOT ARBITRARY.** Three tools on this
 * machine can join two PDFs - `qpdf`, `pdfunite` and `gs`. `gs` re-distills
 * the content streams, which is a re-render of an approved drawing and
 * therefore not available here at any price. Of the remaining two, qpdf is
 * the one that can also ANSWER for what it did: `--show-npages` and
 * `--json` report the merged file's page count and every page's
 * `/MediaBox`, which is what `./merge-pdf.ts` verifies the merge with. A
 * merge tool that cannot be interrogated would leave the exit status as the
 * only evidence, and `./print-pdf.ts` records what that is worth.
 */
import fs from "node:fs"

/**
 * qpdf candidates, in try order, one whitelist entry per platform - never a
 * guess:
 *
 *  - **darwin**: Homebrew's prefix on Apple silicon, then on Intel. Both are
 *    where `brew install qpdf` puts the binary; the first is the one measured
 *    on this machine.
 *  - **linux**: `/usr/bin/qpdf` is where Debian/Ubuntu's and Fedora's `qpdf`
 *    packages install it. **UNVERIFIED by this change**: no Linux machine
 *    exercised it.
 *  - **win32**: the path the official qpdf Windows installer uses.
 *    **UNVERIFIED by this change**: no Windows machine exercised it.
 */
const CANDIDATES: Readonly<Record<string, readonly string[]>> = {
  darwin: ["/opt/homebrew/bin/qpdf", "/usr/local/bin/qpdf"],
  linux: ["/usr/bin/qpdf"],
  win32: ["C:\\Program Files\\qpdf\\bin\\qpdf.exe"],
}

/**
 * A best-effort merge-tool path for `platform`, never checked for existence
 * here - the point-of-use refusal is `./merge-pdf.ts`'s own, which names
 * `PDF_MERGE` when the tool it was handed does not run.
 *
 * An unrecognised platform throws by name rather than silently handing it the
 * macOS path.
 */
export function defaultPdfMerge(platform: string = process.platform): string {
  const candidates = CANDIDATES[platform]
  if (candidates === undefined) {
    throw new Error(
      `no known PDF merge tool default for platform "${platform}". Set PDF_MERGE - ` +
        "tools/guide/pdf-merge-install.ts has no candidate for this platform.",
    )
  }
  for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate
  return candidates[0] as string
}
