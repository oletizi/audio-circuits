/**
 * Where a Chromium-family browser lives on this machine, for printing the
 * build guide to PDF.
 *
 * This generalises the same per-platform-candidate pattern
 * `lib/kicad/install.ts` uses for `kicad-cli`, and for the same reason
 * (`docs/known-gaps.md` **G169**): a literal default good on only one
 * platform makes every other platform set an environment variable by hand,
 * with nothing telling the reader which.
 *
 * `./print-pdf.ts` deliberately takes its converter as a parameter and
 * carries no default of its own - its own module comment says "never a path
 * hardcoded in TypeScript." The one default that must exist lives in
 * `make/board.mk`'s `HTML_TO_PDF ?= ...` (Make cannot import TypeScript, so
 * it cannot call this file), and this module's only other consumer is
 * `tests/guide/print-pdf.test.ts`, which otherwise duplicated the Makefile's
 * macOS literal by hand with no other platform covered.
 */
import fs from "node:fs"

/**
 * Chromium-family browser candidates, in try order, one whitelist entry per
 * platform - never a guess:
 *
 *  - **darwin**: the path the Google Chrome `.dmg` installer writes, and the
 *    literal `make/board.mk`'s `HTML_TO_PDF ?= ...` already carries.
 *  - **linux**: `/usr/bin/google-chrome` is where the official
 *    `google-chrome-stable` `.deb`/`.rpm` installs its binary;
 *    `/usr/bin/chromium-browser` and `/usr/bin/chromium` are Debian/Ubuntu's
 *    and Fedora's own Chromium package names, respectively, at the path
 *    each distro's package puts them. **UNVERIFIED by this change**: no
 *    Linux machine exercised any of the three; see `docs/known-gaps.md`.
 *  - **win32**: the official Google Chrome Windows installer's default
 *    path. **UNVERIFIED by this change**: no Windows machine exercised it;
 *    see `docs/known-gaps.md`.
 */
const CANDIDATES: Readonly<Record<string, readonly string[]>> = {
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
  linux: ["/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium"],
  win32: ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"],
}

/**
 * A best-effort converter path for `platform`, never checked for existence
 * here - the point-of-use refusal is `./print-pdf.ts`'s own, which already
 * names `HTML_TO_PDF` when the converter it was handed does not run.
 *
 * An unrecognised platform throws by name rather than silently handing it
 * the macOS literal.
 */
export function defaultHtmlToPdf(platform: string = process.platform): string {
  const candidates = CANDIDATES[platform]
  if (candidates === undefined) {
    throw new Error(
      `no known Chromium-family browser default for platform "${platform}". Set HTML_TO_PDF - ` +
        "tools/guide/browser-install.ts has no candidate for this platform.",
    )
  }
  for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate
  return candidates[0] as string
}
