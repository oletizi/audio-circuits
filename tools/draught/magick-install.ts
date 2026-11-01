/**
 * Where ImageMagick's `magick` lives on this machine, for every PDF-to-PNG
 * conversion and every crop the drawing-measurement loop makes (`TOOLING.md`).
 *
 * This is the same per-platform-candidate pattern `lib/kicad/install.ts` uses
 * for `kicad-cli`, `tools/guide/browser-install.ts` uses for the headless
 * browser, and `tools/guide/pdf-merge-install.ts` uses for `qpdf` - added here
 * for the same reason (`docs/known-gaps.md` **G170**): a literal default good
 * on only one platform makes every other platform set an environment variable
 * by hand, with nothing telling the reader which.
 *
 * `tools/draught/toolchain.ts`'s `checkToolchain` is this module's first
 * consumer, and the resolved path reaches it through `defaultMagick` directly
 * rather than through a shelled-out `tools/cli/resolved-default.ts` call -
 * that script exists because Make cannot import TypeScript, and
 * `checkToolchain` already runs inside TypeScript.
 */
import fs from "node:fs"

/**
 * `magick` candidates, in try order, one whitelist entry per platform - never
 * a guess:
 *
 *  - **darwin**: Homebrew's prefix on Apple silicon, then on Intel. The first
 *    is the one measured on this machine (`which magick` -
 *    `/opt/homebrew/bin/magick`, reported by Finding 7 of
 *    `.superpowers/sdd/2026-10-30-institutionalise-draughting/rulings.md`).
 *  - **linux**: `/usr/bin/magick` is where Debian/Ubuntu's and Fedora's
 *    `imagemagick` packages that ship ImageMagick 7's `magick` binary install
 *    it. **UNVERIFIED by this change**: no Linux machine exercised it, and
 *    some distributions still package ImageMagick 6, which has no `magick`
 *    binary at all - `./toolchain.ts`'s probe, not this default, is what
 *    reports that absence.
 *  - **win32**: the official ImageMagick Windows installer's default,
 *    versioned by the pinned release (`draughting/tools.lock.json`'s
 *    `7.1.1-47` is Q16-HDRI). **UNVERIFIED by this change**: no Windows
 *    machine exercised this candidate.
 */
const CANDIDATES: Readonly<Record<string, readonly string[]>> = {
  darwin: ["/opt/homebrew/bin/magick", "/usr/local/bin/magick"],
  linux: ["/usr/bin/magick"],
  win32: ["C:\\Program Files\\ImageMagick-7.1.1-Q16-HDRI\\magick.exe"],
}

/**
 * A best-effort `magick` path for `platform`, never checked for existence
 * here - the point-of-use refusal is `./toolchain.ts`'s own `checkToolchain`,
 * which reports `found: null` rather than throwing when the resolved
 * candidate does not run.
 *
 * An unrecognised platform throws by name rather than silently handing it the
 * macOS path.
 */
export function defaultMagick(platform: string = process.platform): string {
  const candidates = CANDIDATES[platform]
  if (candidates === undefined) {
    throw new Error(
      `no known ImageMagick default for platform "${platform}". Set MAGICK to your own magick ` +
        "binary's path - tools/draught/magick-install.ts has no candidate for this platform.",
    )
  }
  for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate
  return candidates[0] as string
}
