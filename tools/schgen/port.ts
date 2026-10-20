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
 * repository cannot yet resolve: no `@/kicad/footprint` or
 * `@/kicad/components`, and nothing reachable only through
 * `@/schgen/gates/oscar/*` beyond the hand-written `boundary.ts` forward
 * declaration (Task 6b, ruling R26 - `gates/oscar/` is Task 18's).
 *
 * **`@/kicad/libtable` IS resolved, through a SECOND DECLARED SOURCE ROOT**
 * (Task 6b, ruling R25). `kicadConfig.ts` needs `GlobalTable` from pedals'
 * `tools/kicad/libtable.ts`, which is outside `$SCHGEN_SOURCE`
 * (`<pedals>/tools/schgen/`), so `PortManifest.sourceRoots` declares the
 * parent directory and that entry carries `root`. It is a PORT - byte-checked
 * like every other `files[]` entry - rather than a hand transcription, which
 * is what R25's criterion requires. See `PortManifest.sourceRoots`.
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
import {
  loadManifest, sourcePathFor,
  type ManifestFileEntry, type PortManifest,
} from "./port-manifest.ts"

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
    // Only entries on the DEFAULT root can satisfy an `@/schgen/<path>` import: that specifier
    // names a file under the pedals `tools/schgen/` tree, and an entry with a declared `root`
    // names one somewhere else, so matching on `from` alone would let `tools/kicad/libtable.ts`
    // answer for a `@/schgen/kicad/libtable` that does not exist.
    const onDefaultRoot = (e: { readonly from: string; readonly root?: string }): boolean =>
      e.root === undefined && e.from === sourceRel
    const target = manifest.files.find(onDefaultRoot) ?? manifest.diverged.find(onDefaultRoot)
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

/**
 * The source path the provenance header prints, repo-relative inside `digital-pedal-platform`.
 *
 * **It is derived from the entry's ROOT, not hard-coded to `tools/schgen/`.** `$SCHGEN_SOURCE`
 * names that directory, so a default-root entry's `from` is relative to it; a `root` entry's is
 * relative to a declared sibling path. Printing `tools/schgen/` for an entry whose source is
 * `tools/kicad/libtable.ts` would put a path that does not exist at the top of a ported file -
 * and the header is the only provenance a reader of the file itself has.
 */
function sourceLabel(entry: ManifestFileEntry, manifest: PortManifest): string {
  const rel = entry.root === undefined ? "." : manifest.sourceRoots[entry.root]
  if (rel === undefined) throw new Error(`${entry.from}: undeclared source root "${entry.root ?? ""}"`)
  return path.posix.normalize(path.posix.join("tools/schgen", rel, entry.from))
}

function header(entry: ManifestFileEntry, manifest: PortManifest): string {
  const cutNote =
    entry.cuts !== undefined && entry.cuts.length > 0
      ? ` plus this entry's declared\n * \`cuts\` (a deliberate content deletion - see \`docs/known-gaps.md\`),`
      : ""
  return (
    `/**\n` +
    ` * Ported from digital-pedal-platform's \`${sourceLabel(entry, manifest)}\`, mechanically\n` +
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
  return header(entry, manifest) + "\n" + body
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
    const sourcePath = sourcePathFor(sourceRoot, entry, manifest)
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
