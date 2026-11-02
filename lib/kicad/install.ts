/**
 * ONE place that knows where KiCad lives on this machine: a per-platform
 * candidate list for `kicad-cli`, and the installed symbol and footprint
 * library roots DERIVED from wherever `kicad-cli` actually resolved to -
 * never written out separately, so a symbol or footprint root computed here
 * cannot name an install other than the one a run's own `kicad-cli` points
 * at.
 *
 * WHY THIS EXISTS. `docs/known-gaps.md` **G169** is the owner's directive -
 * *"treat kicad as a dependency. But make sure there are no hardcoded paths
 * unique to this machine. Paths should be configurable with sensible
 * defaults"* - and measured three things wrong before this file existed: the
 * macOS install path was duplicated across several sites behind several
 * different environment variables; every default but one was macOS-only; and
 * the symbol and footprint roots were written out by hand instead of derived
 * from one resolved install, so they could disagree with the `kicad-cli` a
 * run actually used. The schematic generator's ported
 * `lib/schgen/render/library.ts` carried the one exception, `stockSymbolDir()`
 * - `KICAD_SYMBOL_DIR`, then a path derived from `KICAD_CLI`, then a static
 * fallback - and this file generalised that pattern rather than leaving it a
 * special case. **That second implementation is gone with the generator** (Task
 * 9 of `docs/superpowers/plans/2026-10-30-remove-schgen.md`), so the functions
 * below are now the only ones, and the test that held the two to each other is
 * superseded rather than dropped - `tests/kicad/install.test.ts` says so where
 * it stood.
 *
 * WHAT THIS FILE DOES NOT DO: refuse. Every function here is a best-effort
 * DEFAULT, computed with nothing heavier than `existsSync`, and safe to call
 * from a module loaded unconditionally - `lib/kicad/pin-pattern-sources.ts`
 * and `lib/kicad/netlist.ts` both reach this file on every machine, with or
 * without KiCad installed, because `lib/stripboard/board.ts` imports the pin
 * patterns for pure placement logic that never opens a `.kicad_mod`. The
 * refusal belongs at the point something is actually opened, and every
 * existing refusal that does that - `tests/kicad/footprint-library.ts`'s
 * `readFootprintPads`, `tests/kicad/symbol-library-disk.ts`'s
 * `installedSymbolNames`, `tests/circuits/drafted-sheet.ts`'s
 * `exportDraftedSheet` - is unchanged by this file and still names the
 * environment variable to set.
 *
 * **THE WINDOWS GAP IS STILL OPEN AND ITS CAUSE HAS CHANGED.** While the
 * generator's ported `stockSymbolDir()` existed, this file could not fix its
 * Windows behaviour: neither of that function's two literal candidates matched
 * a Windows install, and a third could not be added without declaring the
 * ported file diverged. That obstacle is gone with the file, and what remains
 * is the ordinary one - **no Windows machine has exercised `defaultSymbolDir`,
 * `defaultFootprintDir` or `defaultKicadCli`'s `win32` arm for real.**
 * `tests/kicad/install.test.ts` exercises all three as pure path arithmetic and
 * says in its own header that it claims no more than that.
 */
import fs from "node:fs"
import path from "node:path"
import type { PlatformPath } from "node:path"

/**
 * The path FLAVOUR to compute candidates in is a property of the `platform`
 * PARAMETER, not of the host Node is actually running on - `node:path`'s
 * default export is the reverse (it is `path.win32` only when Node itself
 * runs on Windows), so a win32 candidate computed while testing on macOS or
 * Linux through the bare `path` import would parse its own backslashes as
 * literal characters instead of separators and silently return nonsense.
 * This is what makes `defaultSymbolDir(cli, "win32")` correct - and
 * testable - from any host.
 */
function pathFor(platform: string): PlatformPath {
  return platform === "win32" ? path.win32 : path.posix
}

/** The three platforms a candidate list is required to cover (G169, clause b). */
export type KicadPlatform = "darwin" | "linux" | "win32"

function isKicadPlatform(value: string): value is KicadPlatform {
  return value === "darwin" || value === "linux" || value === "win32"
}

/**
 * `kicad-cli` candidates, in try order, one whitelist entry per platform -
 * never a guess, each justified:
 *
 *  - **darwin**: the one path the official KiCad.org `.dmg` installer
 *    writes, and the path this repository's own tests have run against
 *    since it began (`lib/kicad/symbols/PROVENANCE.md`: "KiCad 10.0.5").
 *  - **linux**: `/usr/bin` is where a distro-packaged `kicad-cli` binary
 *    lands (Debian/Ubuntu and Fedora's `kicad` packages both install their
 *    binaries under `/usr/bin`) - the same prefix `STATIC_SHARED_DATA_DIR`
 *    below assumes for its own `/usr/share/kicad` fallback, which only makes
 *    sense if `kicad-cli` itself is under `/usr` too.
 *  - **win32**: the official Windows installer's default, versioned by
 *    major.minor under `Program Files` - pinned to `10.0` because that is
 *    the major.minor this repository vendors against
 *    (`lib/kicad/symbols/PROVENANCE.md`). **UNVERIFIED by this change**: no
 *    Windows machine exercised this candidate; see `docs/known-gaps.md`.
 */
const KICAD_CLI_CANDIDATES: Readonly<Record<KicadPlatform, readonly string[]>> = {
  darwin: ["/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"],
  linux: ["/usr/bin/kicad-cli"],
  win32: ["C:\\Program Files\\KiCad\\10.0\\bin\\kicad-cli.exe"],
}

/**
 * The static, cli-independent fallback for the installed support directory,
 * for platforms where package managers put it at a fixed location
 * regardless of where `kicad-cli` itself landed. It is the literal the
 * generator's deleted `stockSymbolDir()` tried unconditionally as its own
 * second candidate (`/usr/share/kicad/symbols`), generalised to also cover
 * footprints, and kept as a SINGLE entry because nothing in this repository
 * evidences a second one.
 */
const STATIC_SHARED_DATA_DIR = "/usr/share/kicad"

/** The first candidate that exists, or the list's first entry if none do. */
function firstExisting(candidates: readonly string[]): string {
  for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate
  return candidates[0] as string
}

/**
 * A best-effort `kicad-cli` path for `platform` - NEVER CHECKED FOR EXISTENCE
 * BY THE CALLS THAT MATTER, by design: `lib/kicad/netlist.ts`'s `KICAD_CLI`
 * computes this once at import time, and an import must not throw merely
 * because KiCad is not installed. The point-of-use refusals
 * (`exportDraftedSheet`, `exportCommittedSheet`, `defaultRunExport`) are what
 * check existence and name the variable to set.
 *
 * An unknown platform is the one case this throws: silently handing an
 * unrecognised platform the macOS literal is exactly the "general rule that
 * quietly accepts a guess" `CLAUDE.md` forbids, and there is no sensible
 * default for a platform nothing here has evidence for.
 */
export function defaultKicadCli(platform: string = process.platform): string {
  if (!isKicadPlatform(platform)) {
    throw new Error(
      `no known kicad-cli default for platform "${platform}". Set KICAD_CLI to your own ` +
        "kicad-cli binary's path - lib/kicad/install.ts has no candidate for this platform.",
    )
  }
  return firstExisting(KICAD_CLI_CANDIDATES[platform])
}

/**
 * Where `kicad-cli`'s own install puts its shared library data, derived from
 * the resolved cli path:
 *
 *  - **darwin**: `kicad-cli` sits at `<bundle>/Contents/MacOS/kicad-cli`, and
 *    the data is the sibling `Contents/SharedSupport`.
 *  - **linux and win32**: `kicad-cli` sits at `<prefix>/bin/kicad-cli[.exe]`,
 *    and the data is `<prefix>/share/kicad` - confirmed for linux by this
 *    repository's own prior fallback literal, `/usr/share/kicad/symbols`.
 *    **UNVERIFIED for win32**: no Windows machine exercised this layout; see
 *    `docs/known-gaps.md`.
 */
function sharedDataDirFromCli(cliPath: string, platform: string): string {
  const platformPath = pathFor(platform)
  const cliDir = platformPath.dirname(cliPath)
  if (platform === "darwin") return platformPath.join(cliDir, "..", "SharedSupport")
  return platformPath.join(cliDir, "..", "share", "kicad")
}

/**
 * A best-effort installed symbol directory, derived from `cliPath` with
 * `STATIC_SHARED_DATA_DIR/symbols` as the cli-independent second candidate.
 * Never checked for existence by import-time callers - see this file's module
 * comment.
 */
export function defaultSymbolDir(cliPath: string, platform: string = process.platform): string {
  const platformPath = pathFor(platform)
  return firstExisting([
    platformPath.join(sharedDataDirFromCli(cliPath, platform), "symbols"),
    platformPath.join(STATIC_SHARED_DATA_DIR, "symbols"),
  ])
}

/** The footprint-library counterpart of `defaultSymbolDir`. */
export function defaultFootprintDir(cliPath: string, platform: string = process.platform): string {
  const platformPath = pathFor(platform)
  return firstExisting([
    platformPath.join(sharedDataDirFromCli(cliPath, platform), "footprints"),
    platformPath.join(STATIC_SHARED_DATA_DIR, "footprints"),
  ])
}
