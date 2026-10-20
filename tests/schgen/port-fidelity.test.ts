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
function requireSourceRoot(): string {
  const sourceRoot = process.env["SCHGEN_SOURCE"]
  if (sourceRoot === undefined || sourceRoot === "") {
    throw new Error(
      "SCHGEN_SOURCE is not set. It must point at digital-pedal-platform's tools/schgen/ " +
        "directory so this test can compare every ported file against its source - " +
        "nothing here defaults to a guessed path.",
    )
  }
  return sourceRoot
}

test("every ported file is its source, rewritten only by the manifest", () => {
  const sourceRoot = requireSourceRoot()
  const manifest = loadManifest()
  const repoRoot = moduleRepoRoot()

  expect(manifest.files.length).toBeGreaterThan(0)

  for (const entry of manifest.files) {
    const source = fs.readFileSync(path.join(sourceRoot, entry.from), "utf8")
    const ported = fs.readFileSync(path.join(repoRoot, entry.to), "utf8")
    expect(rewrite(source, entry, manifest), entry.to).toBe(ported)
  }
})

/**
 * The fixture symbol libraries the ported tests read are NOT `.ts`, so
 * `port.ts` does not rewrite them and the test above never sees them - they
 * are copied verbatim from the pedals source by hand (Task 4). This is the
 * check that keeps a transcription honest: a hand-edited or drifted copy
 * changes what every fixture-backed assertion in `tests/schgen/` measures,
 * silently, and `CLAUDE.md`'s rule is that a transcription checked only
 * against itself is one nobody verified.
 */
const COPIED_FIXTURES: readonly { readonly from: string; readonly to: string }[] = [
  { from: "__fixtures__/symbols/Fix.kicad_sym", to: "tests/schgen/__fixtures__/symbols/Fix.kicad_sym" },
  { from: "__fixtures__/symbols/Pwr.kicad_sym", to: "tests/schgen/__fixtures__/symbols/Pwr.kicad_sym" },
]

test("every copied (non-.ts) fixture is byte-identical to its pedals source", () => {
  const sourceRoot = requireSourceRoot()
  const repoRoot = moduleRepoRoot()
  expect(COPIED_FIXTURES.length, "a list nothing iterates is a check that cannot fail")
    .toBeGreaterThan(0)
  for (const { from, to } of COPIED_FIXTURES) {
    const source = fs.readFileSync(path.join(sourceRoot, from), "utf8")
    const copied = fs.readFileSync(path.join(repoRoot, to), "utf8")
    expect(copied, `${to} has drifted from ${from}; re-copy it rather than editing it here`)
      .toBe(source)
  }
})

/**
 * `handWritten` MEANS `lib/schgen/`, and this is where that is enforced
 * (`docs/known-gaps.md` G114, Controller ruling R6).
 *
 * Two claims, both of which can fail. **Existence:** an entry naming a path
 * that is not on disk fails here, whatever directory it names. The
 * completeness test below cannot catch that for a path outside `lib/schgen/`,
 * because it filters such entries out of both arms, and the comment that
 * claimed `bun test` would catch it was simply wrong - a missing test file is
 * one the glob never discovers, so the suite reports fewer tests and stays
 * green. **Scope:** the field is narrowed to `lib/schgen/`. It previously
 * carried two `tests/schgen/` entries "for visibility" while three other
 * hand-written files under `tests/schgen/` were not listed, which was neither
 * a complete inventory nor no inventory at all; `bun test` discovers test
 * files by glob, so a declaration list it does not read bought nothing.
 */
test("every handWritten entry is under lib/schgen/ and is on disk", () => {
  const manifest = loadManifest()
  const repoRoot = moduleRepoRoot()
  expect(manifest.handWritten.length, "an empty handWritten list is a check that cannot fail")
    .toBeGreaterThan(0)
  const outsideLibSchgen = manifest.handWritten.filter((p) => !p.startsWith("lib/schgen/")).sort()
  const missing = manifest.handWritten.filter((p) => !fs.existsSync(path.join(repoRoot, p))).sort()
  expect(
    outsideLibSchgen,
    "handWritten declares hand-written files under lib/schgen/ and nothing else - a " +
      "hand-written test under tests/schgen/ is discovered by bun test's glob and needs no " +
      "declaration. Remove these, or change the rule in PortManifest.handWritten and here.",
  ).toEqual([])
  expect(
    missing,
    "these handWritten paths are not on disk. A typo here is otherwise invisible: the " +
      "completeness check below filters a non-lib/schgen/ entry out of both arms, and bun " +
      "test never discovers a file it cannot find.",
  ).toEqual([])
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
 * A `files[].to` destination outside `lib/schgen/` - a ported test under
 * `tests/schgen/`, since Task 2 - is a different kind of claim, that *this*
 * destination is on disk holding exactly the rewritten source, and the first
 * test above is what checks it. Such an entry is excluded here rather than
 * compared against a `lib/schgen/` directory listing it never claimed to be
 * complete over.
 *
 * **`handWritten` has no entry outside `lib/schgen/` to exclude**, and the
 * test above is what holds it to that. The earlier version of this comment
 * said a non-`lib/schgen/` entry was covered "by `bun test` simply failing to
 * find the file", which was false in both directions: `bun test` discovers
 * test files by glob, so a misspelt entry names a file nothing looks for and
 * the suite stays green with fewer tests - `docs/known-gaps.md` G114.
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
