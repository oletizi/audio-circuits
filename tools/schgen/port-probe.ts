/**
 * Ask, for each pedals source file named on the command line, whether every one of its imports
 * resolves against the CURRENT `port-manifest.json` - without writing anything.
 *
 * It exists because the porter stops at its first refusal, so finding out which of a dozen
 * candidate files are portable meant running it a dozen times with a dozen provisional manifests.
 * Tasks 5, 6 and 7 each did that by hand and each recorded the refusals in `docs/known-gaps.md`
 * (**G124**, **G131**, **G135**); this is the same probe, committed, so the next task's evidence is
 * reproducible rather than re-typed.
 *
 * It adds one provisional `files[]` entry at a time to an IN-MEMORY copy of the manifest and calls
 * `rewrite()`. The committed manifest is untouched and nothing is written to disk, which is the
 * property that makes it safe to run on a dirty tree.
 *
 *   SCHGEN_SOURCE=... bun run tools/schgen/port-probe.ts render/sheets.test.ts render/bus.test.ts
 *
 * `OK` means every import resolves, not that the file type-checks or that its assertions pass -
 * those are `bun run typecheck` and `bun test`, and a file can be import-clean and still fail
 * both.
 */

import fs from "node:fs"
import path from "node:path"
import { rewrite } from "./port.ts"
import { loadManifest, sourcePathFor, type ManifestFileEntry } from "./port-manifest.ts"

/** The destination a probe pretends the file would land at: it only affects relative import paths. */
function provisionalTo(from: string): string {
  const base = path.posix.basename(from)
  const dir = path.posix.dirname(from)
  const kebab = base.replace(/([a-z0-9])([A-Z])/g, (_m, a: string, b: string) => `${a}-${b.toLowerCase()}`)
  const root = from.endsWith(".test.ts") || dir.startsWith("__fixtures__") ? "tests/schgen" : "lib/schgen"
  return path.posix.join(root, dir === "." ? "" : dir, kebab)
}

function probe(from: string): string {
  const manifest = loadManifest()
  const sourceRoot = process.env[manifest.sourceEnvVar]
  if (sourceRoot === undefined || sourceRoot === "") {
    throw new Error(`${manifest.sourceEnvVar} is not set; nothing here defaults to a guessed path.`)
  }
  const entry: ManifestFileEntry = { from, to: provisionalTo(from) }
  const widened = { ...manifest, files: [...manifest.files, entry] }
  const source = fs.readFileSync(sourcePathFor(sourceRoot, entry, widened), "utf8")
  try {
    rewrite(source, entry, widened)
    return `OK       ${from} -> ${entry.to}: every import resolves`
  } catch (e) {
    return `REFUSES  ${e instanceof Error ? e.message : String(e)}`
  }
}

if (import.meta.main) {
  const files = process.argv.slice(2)
  if (files.length === 0) {
    throw new Error(
      "usage: SCHGEN_SOURCE=... bun run tools/schgen/port-probe.ts <pedals path>... " +
        "(e.g. render/sheets.test.ts), each relative to $SCHGEN_SOURCE",
    )
  }
  for (const f of files) console.log(probe(f))
}
