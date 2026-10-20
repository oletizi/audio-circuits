/**
 * The one-shot rewriter that ports `tools/schgen/` from
 * `digital-pedal-platform` into this repository, committed as evidence that
 * the port is a mechanical transcription and not a rewrite.
 *
 * It does exactly two things to each source file: rewrites `@/schgen/<path>`
 * imports to this repository's explicit relative paths (per
 * `port-manifest.json`'s `files` entries), rewrites the handful of external
 * `@/...` imports the manifest resolves (its `externals` map), and prepends
 * a provenance header. Nothing else changes - `rewrite()` is exported so
 * `tests/schgen/port-fidelity.test.ts` can assert exactly that: every ported
 * file on disk equals `rewrite(source, entry, manifest)` applied to the
 * pedals source file.
 *
 * **Scope of this manifest.** It covers only files with no import this
 * repository cannot yet resolve: no `@/kicad/netlist`, `@/kicad/footprint`,
 * `@/kicad/libtable` or `@/kicad/components` (this repository's
 * `lib/kicad/netlist.ts` has a different shape from pedals' - adapting it is
 * Task 11's job, not this one's), no `@/pinmap/*` (there is no MCU here;
 * Task 2 removes the branch that needs it), and nothing reachable only
 * through `@/schgen/design`, `@/schgen/generate` or `@/schgen/gates/oscar/*`
 * (the same two reasons, plus `gates/oscar/` being Task 18's). A later task
 * that resolves one of those externals extends `port-manifest.json` with the
 * files that import it and re-runs this script; it never hand-edits a
 * previously ported file instead.
 */

import fs from "node:fs"
import path from "node:path"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { isRecord, rejectUnknown } from "../../lib/schgen/strict.ts"

export interface ManifestFileEntry {
  readonly from: string
  readonly to: string
}

export interface PortManifest {
  readonly sourceEnvVar: string
  readonly externals: Readonly<Record<string, string>>
  readonly files: readonly ManifestFileEntry[]
  /**
   * Every hand-written (never ported) `.ts` file under `lib/schgen/`, repo-
   * relative. `tests/schgen/port-fidelity.test.ts` asserts this list plus
   * `files[].to` is the *complete* set of `.ts` files under `lib/schgen/` -
   * so a new hand-written file must be added here deliberately, or the test
   * fails naming it, rather than silently passing as if it were ported.
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

function readFileEntry(value: unknown, where: string): ManifestFileEntry {
  if (!isRecord(value)) throw new Error(`${where}: each files[] entry must be an object`)
  rejectUnknown(value, ["from", "to"], where)
  return { from: readString(value, "from", where), to: readString(value, "to", where) }
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
  rejectUnknown(parsed, ["sourceEnvVar", "externals", "files", "handWritten"], MANIFEST_PATH)
  const filesValue = parsed["files"]
  if (!Array.isArray(filesValue)) throw new Error(`${MANIFEST_PATH}: "files" must be an array`)
  return {
    sourceEnvVar: readString(parsed, "sourceEnvVar", MANIFEST_PATH),
    externals: readStringRecord(parsed, "externals", MANIFEST_PATH),
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
  const externalTarget = manifest.externals[spec]
  if (externalTarget !== undefined) {
    return relativeImport(entry.to, externalTarget)
  }
  throw new Error(
    `${entry.from}: imports "${spec}", which tools/schgen/port-manifest.json does not resolve ` +
      `(not an @/schgen/ path and not in "externals"). Name its destination in the manifest before porting this file.`,
  )
}

function header(entry: ManifestFileEntry): string {
  return (
    `/**\n` +
    ` * Ported from digital-pedal-platform's \`tools/schgen/${entry.from}\`, mechanically\n` +
    ` * rewritten by \`tools/schgen/port.ts\` (imports only, per\n` +
    ` * \`tools/schgen/port-manifest.json\`). Edit the pedals source and re-run the\n` +
    ` * port rather than hand-editing this file - see \`lib/schgen/README.md\`.\n` +
    ` */\n`
  )
}

/**
 * Apply the manifest's rewrite to one source file's text.
 *
 * The only things this function may change are import specifiers matched by
 * `IMPORT_SPEC` and the prepended header - everything else in `source`
 * passes through unchanged, including the pedals project's semicolons and
 * non-null assertions (see `docs/superpowers/plans/2026-10-19-schematic-authoring-m1.md`
 * decisions D7 and D8).
 */
export function rewrite(source: string, entry: ManifestFileEntry, manifest: PortManifest): string {
  const body = source.replace(IMPORT_SPEC, (full: string, _quote: string, spec: string) => {
    const resolved = resolveSpecifier(spec, entry, manifest)
    return full.replace(spec, resolved)
  })
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
