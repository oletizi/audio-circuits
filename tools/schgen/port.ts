/**
 * The one-shot rewriter that ports `tools/schgen/` from
 * `digital-pedal-platform` into this repository, committed as evidence that
 * the port is a mechanical transcription and not a rewrite.
 *
 * It does, in order, up to three things to each source file: applies this
 * entry's declared `cuts` (a deliberate, auditable content deletion - see
 * `CutEntry`; most entries declare none), rewrites `@/schgen/<path>` imports
 * to this repository's explicit relative paths (per `port-manifest.json`'s
 * `files` entries) and the handful of external `@/...` imports the manifest
 * resolves (its `externals` map), rewrites the handful of bare module
 * specifiers the manifest renames (its `moduleRenames` map, e.g. a ported
 * test's `"vitest"` to `"bun:test"`), and prepends a provenance header.
 * Nothing else changes - `rewrite()` is exported so
 * `tests/schgen/port-fidelity.test.ts` can assert exactly that: every ported
 * file on disk equals `rewrite(source, entry, manifest)` applied to the
 * pedals source file.
 *
 * **Scope of this manifest.** It covers only files with no import this
 * repository cannot yet resolve: no `@/kicad/netlist`, `@/kicad/footprint`,
 * `@/kicad/libtable` or `@/kicad/components` (this repository's
 * `lib/kicad/netlist.ts` has a different shape from pedals' - adapting it is
 * Task 11's job, not this one's), and nothing reachable only through
 * `@/schgen/design`, `@/schgen/generate` or `@/schgen/gates/oscar/*` (the
 * same reason, plus `gates/oscar/` being Task 18's). `@/pinmap/*` is NOT in
 * this category any more: there is no MCU here, so Task 2 ported
 * `ir/build.ts` and `ir/types.ts` *with a cut* that removes the pin-map
 * branch outright (supersede means delete - see `docs/known-gaps.md`
 * **G112**) rather than waiting for it to resolve. A later task that
 * resolves one of the remaining gaps extends `port-manifest.json` with the
 * files that import it and re-runs this script; it never hand-edits a
 * previously ported file instead.
 */

import fs from "node:fs"
import path from "node:path"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { isRecord, rejectUnknown } from "../../lib/schgen/strict.ts"

/**
 * A declared, auditable content deletion applied to one file's source before
 * the import rewrite runs - `text` must appear in the pedals source exactly
 * `occurrences` times, or porting refuses rather than silently cutting the
 * wrong (or an extra, coincidentally-matching) spot. This is how a port
 * carries a deliberate cut (see `docs/superpowers/plans/2026-10-19-schematic-authoring-m1.md`
 * Task 2's "what is cut, and it is a cut rather than a port") without ever
 * hand-editing the ported file itself: the cut is data, in the manifest,
 * reviewable and re-derivable, and `rewrite()` applies it the same way on
 * every run.
 */
export interface CutEntry {
  readonly text: string
  readonly occurrences: number
}

export interface ManifestFileEntry {
  readonly from: string
  readonly to: string
  /** Applied in order, before the import rewrite. Omit when the file needs none. */
  readonly cuts?: readonly CutEntry[]
}

export interface PortManifest {
  readonly sourceEnvVar: string
  readonly externals: Readonly<Record<string, string>>
  /**
   * Bare (non-`@/`) import specifiers rewritten verbatim, e.g. the pedals
   * test suite's `"vitest"` to this repository's `"bun:test"`. Checked
   * before the `@/schgen/` and `externals` resolution, so it never competes
   * with them; it only ever touches specifiers nothing else would resolve.
   */
  readonly moduleRenames: Readonly<Record<string, string>>
  readonly files: readonly ManifestFileEntry[]
  /**
   * Every hand-written (never ported) `.ts` file this port's manifest
   * tracks, repo-relative - primarily under `lib/schgen/`, where
   * `tests/schgen/port-fidelity.test.ts` asserts this list plus `files[].to`
   * is the *complete* set of `.ts` files under that directory, so a new
   * hand-written file there must be added here deliberately, or the test
   * fails naming it, rather than silently passing as if it were ported. A
   * hand-written file outside `lib/schgen/` (e.g. a `tests/schgen/` test
   * written to give a `docs/known-gaps.md` entry a durable, re-runnable
   * home - not a port) may also be listed here for visibility, though the
   * completeness check does not scope to it.
   */
  readonly handWritten: readonly string[]
}

const MANIFEST_PATH = path.join(import.meta.dir, "port-manifest.json")

function readString(obj: Record<string, unknown>, key: string, where: string): string {
  const value = obj[key]
  if (typeof value !== "string" || value === "") throw new Error(`${where}: "${key}" must be a non-empty string`)
  return value
}

function readStringRecord(obj: Record<string, unknown>, key: string, where: string): Record<string, string> {
  const value = obj[key]
  if (!isRecord(value)) throw new Error(`${where}: "${key}" must be an object`)
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(value)) {
    if (typeof v !== "string") throw new Error(`${where}.${key}.${k}: must be a string`)
    out[k] = v
  }
  return out
}

function readCutEntry(value: unknown, where: string): CutEntry {
  if (!isRecord(value)) throw new Error(`${where}: each cuts[] entry must be an object`)
  rejectUnknown(value, ["text", "occurrences"], where)
  const text = readString(value, "text", where)
  const occurrences = value["occurrences"]
  if (typeof occurrences !== "number" || !Number.isInteger(occurrences) || occurrences < 1) {
    throw new Error(`${where}: "occurrences" must be a positive integer`)
  }
  return { text, occurrences }
}

function readFileEntry(value: unknown, where: string): ManifestFileEntry {
  if (!isRecord(value)) throw new Error(`${where}: each files[] entry must be an object`)
  rejectUnknown(value, ["from", "to", "cuts"], where)
  const cutsValue = value["cuts"]
  if (cutsValue === undefined) {
    return { from: readString(value, "from", where), to: readString(value, "to", where) }
  }
  if (!Array.isArray(cutsValue)) throw new Error(`${where}: "cuts" must be an array`)
  return {
    from: readString(value, "from", where),
    to: readString(value, "to", where),
    cuts: cutsValue.map((c, i) => readCutEntry(c, `${where}.cuts[${i}]`)),
  }
}

function readStringArray(obj: Record<string, unknown>, key: string, where: string): string[] {
  const value = obj[key]
  if (!Array.isArray(value)) throw new Error(`${where}: "${key}" must be an array`)
  return value.map((v, i) => {
    if (typeof v !== "string" || v === "") throw new Error(`${where}.${key}[${i}]: must be a non-empty string`)
    return v
  })
}

export function loadManifest(): PortManifest {
  const parsed: unknown = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"))
  if (!isRecord(parsed)) throw new Error(`${MANIFEST_PATH}: expected a JSON object at the top level`)
  rejectUnknown(parsed, ["sourceEnvVar", "externals", "moduleRenames", "files", "handWritten"], MANIFEST_PATH)
  const filesValue = parsed["files"]
  if (!Array.isArray(filesValue)) throw new Error(`${MANIFEST_PATH}: "files" must be an array`)
  return {
    sourceEnvVar: readString(parsed, "sourceEnvVar", MANIFEST_PATH),
    externals: readStringRecord(parsed, "externals", MANIFEST_PATH),
    moduleRenames: readStringRecord(parsed, "moduleRenames", MANIFEST_PATH),
    files: filesValue.map((entry, i) => readFileEntry(entry, `${MANIFEST_PATH}.files[${i}]`)),
    handWritten: readStringArray(parsed, "handWritten", MANIFEST_PATH),
  }
}

/** Every `@/<spec>` import specifier found in `from "..."` or `from '...'`. */
const IMPORT_SPEC = /from\s+(["'])(@\/[^"']+)\1/g

function relativeImport(fromFileRepoPath: string, toFileRepoPath: string): string {
  const fromDir = path.posix.dirname(fromFileRepoPath)
  let rel = path.posix.relative(fromDir, toFileRepoPath)
  if (!rel.startsWith(".")) rel = `./${rel}`
  return rel
}

function resolveSpecifier(spec: string, entry: ManifestFileEntry, manifest: PortManifest): string {
  // `externals` is checked first, even for an `@/schgen/` path: it is the escape valve a task
  // uses to point an import at a hand-written forward declaration (e.g. `render/library.ts`,
  // Task 2) that is not itself a manifest `files[]` entry - resolving it through the normal
  // `@/schgen/` lookup would require that file to BE a ported file, which it deliberately isn't.
  const externalTarget = manifest.externals[spec]
  if (externalTarget !== undefined) {
    return relativeImport(entry.to, externalTarget)
  }
  if (spec.startsWith("@/schgen/")) {
    const sourceRel = `${spec.slice("@/schgen/".length)}.ts`
    const target = manifest.files.find((f) => f.from === sourceRel)
    if (target === undefined) {
      throw new Error(
        `${entry.from}: imports "${spec}", but tools/schgen/port-manifest.json has no entry for ` +
          `"${sourceRel}". Port that file first (add it to the manifest) before porting ${entry.from}.`,
      )
    }
    return relativeImport(entry.to, target.to)
  }
  throw new Error(
    `${entry.from}: imports "${spec}", which tools/schgen/port-manifest.json does not resolve ` +
      `(not an @/schgen/ path and not in "externals"). Name its destination in the manifest before porting this file.`,
  )
}

/** A bare (non-relative, non-`@/`) import specifier found in `from "..."` or `from '...'`. */
const BARE_IMPORT_SPEC = /from\s+(["'])([a-zA-Z][\w-]*(?:\/[\w.-]+)*)\1/g

function rewriteModuleRenames(source: string, manifest: PortManifest): string {
  return source.replace(BARE_IMPORT_SPEC, (full: string, _quote: string, spec: string) => {
    const renamed = manifest.moduleRenames[spec]
    return renamed === undefined ? full : full.replace(spec, renamed)
  })
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle === "") return 0
  let count = 0
  let idx = 0
  while (true) {
    const found = haystack.indexOf(needle, idx)
    if (found === -1) return count
    count++
    idx = found + 1
  }
}

/**
 * Apply one file's declared `cuts`, in order, to its pedals source text -
 * each cut's `text` must appear exactly its declared `occurrences` times, or
 * this refuses rather than cutting the wrong (or an extra, coincidentally
 * matching) spot. This is the only way a ported file's *content*, not just
 * its imports, may differ from its pedals source - see `CutEntry`.
 */
function applyCuts(source: string, entry: ManifestFileEntry): string {
  if (entry.cuts === undefined) return source
  let text = source
  for (const cut of entry.cuts) {
    const found = countOccurrences(text, cut.text)
    if (found !== cut.occurrences) {
      throw new Error(
        `${entry.from}: cuts entry expected ${cut.occurrences} occurrence(s) of its text but found ${found} - ` +
          `the pedals source has drifted from what this cut was written against. Re-derive the cut against the ` +
          `current source (see tools/schgen/README.md or the Task 2 report) rather than guessing a fix:\n${cut.text}`,
      )
    }
    text = text.split(cut.text).join("")
  }
  return text
}

function header(entry: ManifestFileEntry): string {
  const cutNote =
    entry.cuts !== undefined && entry.cuts.length > 0
      ? ` plus this entry's declared\n * \`cuts\` (a deliberate content deletion - see \`docs/known-gaps.md\`),`
      : ""
  return (
    `/**\n` +
    ` * Ported from digital-pedal-platform's \`tools/schgen/${entry.from}\`, mechanically\n` +
    ` * rewritten by \`tools/schgen/port.ts\` (imports only,${cutNote} per\n` +
    ` * \`tools/schgen/port-manifest.json\`). Edit the pedals source and re-run the\n` +
    ` * port rather than hand-editing this file - see \`lib/schgen/README.md\`.\n` +
    ` */\n`
  )
}

/**
 * Apply the manifest's rewrite to one source file's text.
 *
 * The only things this function may change are: this entry's declared
 * `cuts` (a deliberate, auditable content deletion - see `CutEntry`), import
 * specifiers matched by `IMPORT_SPEC` or `BARE_IMPORT_SPEC`, and the
 * prepended header. Everything else in `source` passes through unchanged,
 * including the pedals project's semicolons and non-null assertions (see
 * `docs/superpowers/plans/2026-10-19-schematic-authoring-m1.md` decisions D7
 * and D8).
 */
export function rewrite(source: string, entry: ManifestFileEntry, manifest: PortManifest): string {
  const cut = applyCuts(source, entry)
  const importsResolved = cut.replace(IMPORT_SPEC, (full: string, _quote: string, spec: string) => {
    const resolved = resolveSpecifier(spec, entry, manifest)
    return full.replace(spec, resolved)
  })
  const body = rewriteModuleRenames(importsResolved, manifest)
  return header(entry) + "\n" + body
}

function runPort(): void {
  const manifest = loadManifest()
  const sourceRoot = process.env[manifest.sourceEnvVar]
  if (sourceRoot === undefined || sourceRoot === "") {
    throw new Error(
      `${manifest.sourceEnvVar} is not set. It must point at digital-pedal-platform's ` +
        `tools/schgen/ directory (the port's source tree) - nothing here defaults to a guessed path.`,
    )
  }
  const repoRoot = moduleRepoRoot()
  for (const entry of manifest.files) {
    const sourcePath = path.join(sourceRoot, entry.from)
    const source = fs.readFileSync(sourcePath, "utf8")
    const ported = rewrite(source, entry, manifest)
    const destPath = path.join(repoRoot, entry.to)
    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    fs.writeFileSync(destPath, ported)
    console.log(`ported ${entry.from} -> ${entry.to}`)
  }
}

if (import.meta.main) {
  runPort()
}
