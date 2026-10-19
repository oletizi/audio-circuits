import { test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { loadManifest, rewrite } from "../../tools/schgen/port.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"

/**
 * Every file `tools/schgen/port-manifest.json` lists is the pedals source
 * file, rewritten only by `rewrite()` - never hand-edited afterwards. A hand
 * edit smuggled into a ported file makes this fail, naming the file.
 *
 * `SCHGEN_SOURCE` must point at `digital-pedal-platform`'s `tools/schgen/`
 * directory. This test FAILS rather than skips when it is unset: a fidelity
 * check that silently skips looks like a passing one, which `CLAUDE.md` and
 * this repository's own conventions both name as the failure to avoid.
 */
test("every ported file is its source, rewritten only by the manifest", () => {
  const sourceRoot = process.env["SCHGEN_SOURCE"]
  if (sourceRoot === undefined || sourceRoot === "") {
    throw new Error(
      "SCHGEN_SOURCE is not set. It must point at digital-pedal-platform's tools/schgen/ " +
        "directory so this test can compare every ported file against its source - " +
        "nothing here defaults to a guessed path.",
    )
  }

  const manifest = loadManifest()
  const repoRoot = moduleRepoRoot()

  expect(manifest.files.length).toBeGreaterThan(0)

  for (const entry of manifest.files) {
    const source = fs.readFileSync(path.join(sourceRoot, entry.from), "utf8")
    const ported = fs.readFileSync(path.join(repoRoot, entry.to), "utf8")
    expect(rewrite(source, entry, manifest), entry.to).toBe(ported)
  }
})
