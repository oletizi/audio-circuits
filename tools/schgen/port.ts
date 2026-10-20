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
 * **A THIRD CATEGORY, since Task 8: `diverged`.** A file that was ported and
 * has since deliberately changed its content for a stated reason is declared
 * there - see `DivergedEntry`. The porter never writes one (it lists them
 * instead, so a run is not mistaken for a refresh), `resolveSpecifier`
 * resolves imports that point at one, and `port-fidelity.test.ts` holds the
 * three categories to being disjoint and complete. Nothing re-derives a
 * diverged file, which is the cost, and `docs/known-gaps.md` **G139** sizes
 * it. A change that is PURELY a deletion is a `cuts` entry, not a
 * divergence.
 *
 * **Scope of this manifest.** It covers only files with no import this
 * repository cannot yet resolve: no `@/kicad/footprint`, `@/kicad/libtable`
 * or `@/kicad/components`, and nothing reachable only through
 * `@/schgen/design`, `@/schgen/generate` or `@/schgen/gates/oscar/*` (the
 * same reason, plus `gates/oscar/` being Task 18's).
 *
 * **`@/kicad/netlist` IS resolved, but only for `KICAD_CLI`** (Task 4). Pedals'
 * `tools/kicad/netlist.ts` exports both that path constant and
 * `connectivityFromXml`; `render/library.ts`'s `stockSymbolDir()` needs only
 * the constant, so `lib/kicad/netlist.ts` gained it and `externals` points the
 * specifier at the module it names rather than at a stand-in. **This repository's
 * `lib/kicad/netlist.ts` still has a different shape from pedals' for everything
 * else** (`importNetlist`/`ImportedNetlist` here versus `connectivityFromXml`
 * there) and adapting gate 3 to it is still Task 11's job. The consequence of
 * resolving the specifier is that a later file importing `connectivityFromXml`
 * no longer refuses at port time; it fails `bun run typecheck` naming the
 * missing export instead. Recorded in `docs/known-gaps.md`.
 *
 * `@/pinmap/*` is NOT in
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

/**
 * A file that has **deliberately stopped being a port** - it was ported once,
 * a later task changed its CONTENT for a stated reason, and it no longer
 * re-derives from the pedals source by `rewrite()` alone.
 *
 * This exists because `cuts` cannot express it. A cut is deletion-only, and
 * the changes that earn an entry here are modifications: Task 8 widens
 * `RealiseResult` from two outcomes to five across `render/block-types.ts`,
 * the seven templates and five helper modules, and deletes the `labels`
 * rendering the pedals source has (plan decision **D3**) - which the pedals
 * source will always have, so no rewrite rule can reconcile the two.
 *
 * **What it buys.** `tests/schgen/port-fidelity.test.ts` byte-checks every
 * `files[]` entry and nothing else, so without a declaration a diverged file
 * would have to leave the manifest, taking its provenance with it, and
 * nothing afterwards would record that it ever was a port or what it was a
 * port OF. An entry here keeps `from` (checked to exist in the pedals source),
 * says which task diverged it and why, and keeps the bidirectional
 * `lib/schgen/` completeness check whole: a file under `lib/schgen/` is
 * ported, hand-written **or** diverged, exactly one of the three, and an
 * undeclared hand edit to a still-ported file still fails the byte-check.
 *
 * **What it COSTS, and it is not small.** Nothing compares a diverged file
 * against its source again. A fix made upstream in `digital-pedal-platform`
 * will not arrive here by re-running the porter, and a drift between the two
 * is invisible to every check in this repository. `docs/known-gaps.md`
 * **G139** records the measured size of that loss: after Task 8 the three
 * lists are 64 ported, 26 diverged and 10 hand-written.
 *
 * **A PURE DELETION IS NOT A DIVERGENCE.** If the only content change a file
 * needs is removing text that is in the source, declare a `cuts` entry and
 * leave it in `files[]` - it stays byte-checked and re-derivable. Task 8 does
 * exactly that for `ir/validate.ts`'s one-line `labels` clause. This list is
 * for a change a cut cannot express.
 */
export interface DivergedEntry {
  /** The pedals source file this was ported from, relative to `$SCHGEN_SOURCE`. */
  readonly from: string
  readonly to: string
  /** The task that diverged it, e.g. "Task 8". */
  readonly task: string
  /** Why it diverged: what changed and what rule or decision required it. */
  readonly why: string
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
   * Every file that was ported and has since deliberately diverged - see
   * `DivergedEntry`. The porter never writes these; `runPort()` lists them so
   * a run cannot be mistaken for having refreshed them.
   */
  readonly diverged: readonly DivergedEntry[]
  /**
   * Every hand-written (never ported) `.ts` file **under `lib/schgen/`**,
   * repo-relative. `tests/schgen/port-fidelity.test.ts` asserts this list
   * plus `files[].to` is the *complete* set of `.ts` files under that
   * directory, so a new hand-written file there must be added here
   * deliberately, or the test fails naming it, rather than silently passing
   * as if it were ported.
   *
   * **A PATH OUTSIDE `lib/schgen/` DOES NOT BELONG HERE**, and
   * `port-fidelity.test.ts` fails on one. The field carried two
   * `tests/schgen/` entries "for visibility" (Tasks 2 and 3) while three
   * other hand-written files under `tests/schgen/` were not listed, so it was
   * neither a complete inventory of hand-written files nor no inventory at
   * all - a reader could not use it as either. `bun test` discovers test
   * files by glob and reads nothing here, so the declaration bought nothing
   * while the inconsistency misled. Narrowed in Task 4 under Controller
   * ruling R6.
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

function readDivergedEntry(value: unknown, where: string): DivergedEntry {
  if (!isRecord(value)) throw new Error(`${where}: each diverged[] entry must be an object`)
  rejectUnknown(value, ["from", "to", "task", "why"], where)
  return {
    from: readString(value, "from", where),
    to: readString(value, "to", where),
    task: readString(value, "task", where),
    why: readString(value, "why", where),
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
  rejectUnknown(parsed, ["sourceEnvVar", "externals", "moduleRenames", "files", "diverged", "handWritten"], MANIFEST_PATH)
  const filesValue = parsed["files"]
  if (!Array.isArray(filesValue)) throw new Error(`${MANIFEST_PATH}: "files" must be an array`)
  const divergedValue = parsed["diverged"]
  if (!Array.isArray(divergedValue)) throw new Error(`${MANIFEST_PATH}: "diverged" must be an array`)
  return {
    sourceEnvVar: readString(parsed, "sourceEnvVar", MANIFEST_PATH),
    externals: readStringRecord(parsed, "externals", MANIFEST_PATH),
    moduleRenames: readStringRecord(parsed, "moduleRenames", MANIFEST_PATH),
    files: filesValue.map((entry, i) => readFileEntry(entry, `${MANIFEST_PATH}.files[${i}]`)),
    diverged: divergedValue.map((entry, i) => readDivergedEntry(entry, `${MANIFEST_PATH}.diverged[${i}]`)),
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
    // `diverged` is searched beside `files`: a file that has stopped being a port still OCCUPIES
    // its destination, so a still-ported file importing it resolves to the same place it always
    // did. Leaving it out would make every re-run of the porter refuse on an import that is in
    // fact satisfied - see `DivergedEntry`.
    const target = manifest.files.find((f) => f.from === sourceRel) ?? manifest.diverged.find((d) => d.from === sourceRel)
    if (target === undefined) {
      throw new Error(
        `${entry.from}: imports "${spec}", but tools/schgen/port-manifest.json has no entry for ` +
          `"${sourceRel}" in "files" or "diverged". Port that file first (add it to the manifest) before porting ${entry.from}.`,
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
  // Said out loud, every run: a diverged file keeps its destination and its provenance but is
  // NOT rewritten, so a run that printed only the ported files would read as a full refresh.
  for (const d of manifest.diverged) {
    console.log(`DIVERGED, not rewritten: ${d.to} (was ${d.from}; diverged by ${d.task}: ${d.why})`)
  }
}

if (import.meta.main) {
  runPort()
}
