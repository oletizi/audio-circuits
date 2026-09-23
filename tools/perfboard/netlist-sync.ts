/**
 * Regenerate a board's KiCad netlist export and reconcile it with the
 * checked-in fixture, replacing the fixture only when the substantive
 * content differs.
 *
 * WHY NOT A MAKE MTIME RULE. `make/board.mk` used to declare a conventional
 * `$(NETLIST): $(SCH)` file rule: regenerate the export when the schematic
 * is newer. That is idiomatic make, and it is not sound here, for two facts
 * that both point the same direction and never the other way:
 *
 *   - git does not preserve mtimes. Checking out a branch that carries a
 *     STALE export stamps that file with the checkout time - possibly newer
 *     than a schematic last edited months ago - and mtime-based make then
 *     concludes "up to date" and vouches for a stale artifact.
 *   - the schematic lives in a DIFFERENT repository, one this repository's
 *     own checkouts never touch. So only the export side of the comparison
 *     can ever be falsely freshened by a checkout; the schematic side never
 *     is. Every mtime accident here makes stale look current, never the
 *     reverse.
 *
 * An export costs well under half a second, so there is no performance
 * argument for trusting a clock instead of just re-running it: this module
 * re-exports EVERY time `syncNetlistExport` is called and decides freshness
 * from content, never from a timestamp.
 *
 * WHY THE FIXTURE IS NOT UNCONDITIONALLY OVERWRITTEN. kicad-cli's export
 * embeds `(date "...")`, which changes on every run whether or not anything
 * about the circuit changed. Unconditionally overwriting the fixture would
 * dirty `git status` on every invocation and cascade into anything keyed off
 * that file's own mtime. So the fresh export and the existing fixture are
 * compared with that one line's value blanked out on both sides - ONLY that
 * line; nothing else is ignored, because a change to, say, the tool version
 * or the source path is exactly the kind of drift worth seeing - and the
 * fixture is rewritten only when what remains still differs.
 *
 * MACHINE-SPECIFIC PATHS ARE NORMALIZED BEFORE THE COMPARISON, NOT IGNORED
 * BY IT - so the FIXTURE ITSELF never carries a machine-specific path, and a
 * clone at a different location never rewrites it on its first run. Two
 * independent facts, established by experiment against the real binary,
 * both needed fixing:
 *
 *   - kicad-cli stamps the design section's `(source "...")` with the
 *     ABSOLUTE path it resolved the schematic to, unconditionally - passing
 *     a relative path produces the identical absolute line, and there is no
 *     flag to suppress it. `normalizeSourcePath` below rewrites that one
 *     line to a repository-relative path, derived from this repository's
 *     own root, after every export and before the fixture is ever written
 *     or compared. The per-sheet `title_block`'s OWN `(source ...)` is
 *     already just a bare filename - stable across machines already - and
 *     is deliberately left alone.
 *   - the per-component `Sheetfile` property is relative, but relative to
 *     kicad-cli's OWN invocation cwd, not to anything fixed. `defaultRunExport`
 *     below pins that cwd to this repository's root on every export, so
 *     `Sheetfile` is always repository-root-relative regardless of where the
 *     export was invoked from - a fixed cwd rather than after-the-fact text
 *     surgery, because it also gets every `Sheetfile` right, including in a
 *     hierarchical schematic with more than one distinct sheet file, with no
 *     need to guess which value belongs to which sheet.
 *
 * A consequence worth stating where the fixture is read as much as where
 * it's written: the checked-in `.net` file is no longer byte-identical to
 * what a raw, unpinned `kicad-cli sch export netlist` invocation would
 * produce. Regenerating it BY HAND (bypassing this module) reintroduces
 * exactly the machine-specific path this module exists to remove.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { moduleRepoRoot } from "./repo-root.ts"

/**
 * A line shaped like `(date "2026-09-23T11:25:33")`, whitespace and all,
 * with its quoted value blanked out for comparison. This is deliberately
 * narrower than "any line mentioning date": the title block's OWN `(date)`
 * (no quotes - it is always empty, never populated by this export) does not
 * match this pattern and is compared exactly as it stands. Only the design
 * section's timestamp is volatile; everything else about the header,
 * including that empty field, is a fact worth noticing if it ever changes.
 */
const DESIGN_DATE_LINE = /^(\s*\(date ")[^"]*("\)\s*)$/

/**
 * `content` with the volatile design date blanked out, for comparison only.
 * Never written to disk - the fixture always gets the fresh export verbatim,
 * date and all, so it stays a real, re-runnable kicad-cli output rather than
 * a doctored one.
 */
export function withoutVolatileDate(content: string): string {
  return content
    .split("\n")
    .map((line) => (DESIGN_DATE_LINE.test(line) ? line.replace(DESIGN_DATE_LINE, "$1$2") : line))
    .join("\n")
}

/** Whether two netlist exports agree once the volatile date line is set aside. */
export function netlistsAgree(fresh: string, existing: string): boolean {
  return withoutVolatileDate(fresh) === withoutVolatileDate(existing)
}

/**
 * The design section's `(source "...")` line - the FIRST `(source "...")`
 * line kicad-cli writes, always emitted before any per-sheet `title_block`'s
 * own `(source ...)`. Capturing (rather than blanking, as DESIGN_DATE_LINE
 * above does) because this value is replaced with a real, repository-
 * relative path, not erased.
 */
const SOURCE_LINE = /^(\s*\(source ")([^"]*)("\)\s*)$/

/**
 * `content` with the design section's `(source "...")` rewritten to
 * `repoRelativeSchPath` - a stable, repository-relative path in place of
 * kicad-cli's unconditional absolute one. See the module doc for why this
 * exists and why it targets only the first such line.
 *
 * Throws rather than silently leaving a machine-specific path in place: if
 * kicad-cli's export ever stops matching this shape, that is itself worth
 * knowing, loudly, not papering over.
 */
export function normalizeSourcePath(content: string, repoRelativeSchPath: string): string {
  const lines = content.split("\n")
  const index = lines.findIndex((line) => SOURCE_LINE.test(line))
  if (index === -1) {
    throw new Error(
      'kicad-cli\'s export has no "(source ...)" line to normalize - the export format may have ' +
        "changed; this module's SOURCE_LINE pattern needs updating to match it.",
    )
  }
  lines[index] = lines[index].replace(SOURCE_LINE, `$1${repoRelativeSchPath}$3`)
  return lines.join("\n")
}

/** `absolutePath`, relative to `repoRoot`, with forward slashes regardless of platform separator. */
export function repoRelativePath(repoRoot: string, absolutePath: string): string {
  return path.relative(repoRoot, absolutePath).split(path.sep).join("/")
}

export interface NetlistSyncDeps {
  /** Runs kicad-cli, writing the fresh export to outputPath. Injected so no test spawns the real binary. */
  readonly runExport?: (kicadCli: string, schPath: string, outputPath: string, repoRoot: string) => void
  /** Injected so no test touches the real filesystem to check kicad-cli's executable bit. */
  readonly kicadCliExists?: (kicadCliPath: string) => boolean
  /** This repository's root, for both the `(source ...)` rewrite and pinning kicad-cli's cwd. Defaults to the real one. */
  readonly repoRoot?: string
}

export interface NetlistSyncResult {
  readonly changed: boolean
  /** Set only when changed: what to tell the operator, and why it matters. */
  readonly message?: string
}

export function defaultKicadCliExists(kicadCliPath: string): boolean {
  try {
    fs.accessSync(kicadCliPath, fs.constants.X_OK)
    return true
  } catch {
    return false
  }
}

export function defaultRunExport(kicadCli: string, schPath: string, outputPath: string, repoRoot: string): void {
  // cwd is pinned to repoRoot deliberately - see the module doc's Sheetfile
  // paragraph. Without this, kicad-cli computes each component's Sheetfile
  // property relative to wherever THIS process happened to be invoked from,
  // which varies (a board directory today, only because make always drives
  // this via `-C` from there - a coupling nothing enforces). Pinning it here
  // makes Sheetfile repository-root-relative unconditionally, the same
  // stable form as the normalized `(source ...)` line.
  const result = spawnSync(
    kicadCli,
    ["sch", "export", "netlist", "--format", "kicadsexpr", "--output", outputPath, schPath],
    { encoding: "utf8", cwd: repoRoot },
  )
  if (result.error) {
    throw new Error(`could not run kicad-cli at ${kicadCli}: ${result.error.message}`)
  }
  if (result.status !== 0) {
    const stderr = typeof result.stderr === "string" ? result.stderr.trim() : ""
    throw new Error(
      `kicad-cli exited ${String(result.status)} exporting ${schPath}${stderr === "" ? "" : `: ${stderr}`}`,
    )
  }
}

/**
 * Regenerate `netlistPath` from `schPath`, in place, comparing before
 * writing.
 *
 * Throws when kicad-cli cannot even run - missing, or the export itself
 * fails - because every call now needs it: there is no longer a "the export
 * was already fresh, so kicad-cli was never needed" path to fall back to.
 * Returns, rather than throwing, for the two ordinary outcomes: unchanged
 * (nothing on disk is touched) and changed (the fixture is rewritten, with a
 * message naming what happened and why it matters).
 */
export function syncNetlistExport(
  schPath: string,
  netlistPath: string,
  kicadCli: string,
  deps: NetlistSyncDeps = {},
): NetlistSyncResult {
  const kicadCliExists = deps.kicadCliExists ?? defaultKicadCliExists
  const runExport = deps.runExport ?? defaultRunExport
  const repoRoot = deps.repoRoot ?? moduleRepoRoot()

  if (!kicadCliExists(kicadCli)) {
    throw new Error(
      `${netlistPath} needs regenerating from ${schPath} - every "netlist-agrees" run re-exports it ` +
        `rather than trusting a checked-out mtime - but no kicad-cli was found at ${kicadCli}.\n` +
        "  Install KiCad, or set KICAD_CLI to point at your own kicad-cli.",
    )
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "netlist-sync-"))
  try {
    const freshPath = path.join(dir, path.basename(netlistPath))
    runExport(kicadCli, schPath, freshPath, repoRoot)
    const fresh = normalizeSourcePath(
      fs.readFileSync(freshPath, "utf8"),
      repoRelativePath(repoRoot, schPath),
    )
    const existing = fs.existsSync(netlistPath) ? fs.readFileSync(netlistPath, "utf8") : undefined

    if (existing !== undefined && netlistsAgree(fresh, existing)) {
      return { changed: false }
    }

    fs.writeFileSync(netlistPath, fresh)
    return {
      changed: true,
      message:
        existing === undefined
          ? `${netlistPath} created from ${schPath}: no fixture was checked in yet.`
          : `${netlistPath} updated: its export from ${schPath} changed beyond just the timestamp. ` +
            'The schematic has moved - check whether the board\'s declared "circuit" transcription ' +
            "still agrees with it. The netlist-agrees test below catches it if not.",
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}
