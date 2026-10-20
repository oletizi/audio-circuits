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

/** Every `.ts` file under `dir`, repo-relative, posix-separated. */
function listTsFiles(repoRoot: string, dir: string): string[] {
  const out: string[] = []
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    if (fs.statSync(full).isDirectory()) {
      out.push(...listTsFiles(repoRoot, full))
    } else if (name.endsWith(".ts")) {
      out.push(path.relative(repoRoot, full).split(path.sep).join("/"))
    }
  }
  return out
}

/**
 * The manifest's `files[].to` entries that land under `lib/schgen/`, plus
 * the `handWritten` entries that do too, must be the *complete* set of
 * `.ts` files under `lib/schgen/` - not just a subset the manifest happens
 * to mention. Without this, a file that is hand-written or hand-patched
 * without a manifest or allowlist entry is invisible to the test above
 * (which only iterates `manifest.files`), so "every ported file is its
 * source" stays green while a file under `lib/schgen/` silently is not.
 *
 * `files[].to` and `handWritten` entries outside `lib/schgen/` - a ported
 * test under `tests/schgen/`, or a hand-written one listed there "for
 * visibility" per `PortManifest.handWritten`, both since Task 2 - are a
 * different kind of claim (that *this* destination is on disk, checked by
 * the first test above, or by `bun test` simply failing to find the file)
 * and are deliberately excluded here rather than compared against a
 * `lib/schgen/` directory listing they never claimed to be complete over.
 */
test("every .ts file under lib/schgen/ is either ported (in the manifest) or declared hand-written", () => {
  const manifest = loadManifest()
  const repoRoot = moduleRepoRoot()
  const onDisk = new Set(listTsFiles(repoRoot, path.join(repoRoot, "lib/schgen")))
  const underLibSchgen = (p: string): boolean => p.startsWith("lib/schgen/")
  const portedUnderLibSchgen = manifest.files.map((f) => f.to).filter(underLibSchgen)
  const handWrittenUnderLibSchgen = manifest.handWritten.filter(underLibSchgen)
  const accountedFor = new Set([...portedUnderLibSchgen, ...handWrittenUnderLibSchgen])

  const unaccountedOnDisk = [...onDisk].filter((f) => !accountedFor.has(f)).sort()
  const accountedButMissing = [...accountedFor].filter((f) => !onDisk.has(f)).sort()

  expect(unaccountedOnDisk, "on disk under lib/schgen/ but in neither files[] nor handWritten").toEqual([])
  expect(accountedButMissing, "in files[] or handWritten but not on disk under lib/schgen/").toEqual([])
})
