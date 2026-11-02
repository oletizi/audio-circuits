// tests/not-source.test.ts
//
// THE BRIDGE BETWEEN `lib/not-source.ts` AND THE TWO CONFIG FILES THAT
// CANNOT IMPORT IT. `tsconfig.json`'s `exclude` and `bunfig.toml`'s
// `[test] root` each independently learned, by hand, that
// `draughting/copperhead` is not this repository's own source - and
// nothing before this test proved either of them still agrees with
// `lib/not-source.ts`'s own list. The same bridge reasoning as
// `tools/cli/resolved-default.ts` (a shelled-out script reaching values a
// Makefile cannot import) and `docs/known-gaps.md` G170: a config file
// cannot import TypeScript, so the thing that holds the two together has to
// be a check that reads both and can fail.
import { expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import { VENDORED_CHECKOUTS } from "../lib/not-source.ts"
import bunfigConfig from "../bunfig.toml"

const REPO_ROOT = path.resolve(import.meta.dir, "..")

function readTsconfig(): { readonly exclude?: readonly string[] } {
  const raw = readFileSync(path.join(REPO_ROOT, "tsconfig.json"), "utf8")
  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("tsconfig.json did not parse to an object - nothing here to check an exclude list against.")
  }
  const exclude = (parsed as Record<string, unknown>).exclude
  if (exclude !== undefined && !Array.isArray(exclude)) {
    throw new Error('tsconfig.json\'s "exclude" is present but not an array.')
  }
  return { exclude: exclude as readonly string[] | undefined }
}

test("every vendored checkout is named, and every basename is unique", () => {
  // The floor this whole file rests on: if this list goes empty, every test
  // below passes over nothing, which is the skipped-check-that-looks-like-a-
  // pass this repository's own rule forbids.
  expect(VENDORED_CHECKOUTS.length).toBeGreaterThanOrEqual(2)
  const basenames = VENDORED_CHECKOUTS.map((c) => c.basename)
  expect(new Set(basenames).size).toBe(basenames.length)
})

test("a dot-exempt checkout's basename actually starts with a dot - the exemption's own premise, checked rather than assumed", () => {
  for (const checkout of VENDORED_CHECKOUTS) {
    if (checkout.dotExempt) {
      expect(checkout.basename.startsWith("."), checkout.basename).toBe(true)
    }
  }
  // And the converse must not silently hold either: a non-dot-exempt entry
  // whose basename DOES start with a dot would be claiming it needs explicit
  // config protection it does not actually need, and this repository's own
  // measurement (lib/not-source.ts's module comment) is that tsc's `include`
  // and `bun test`'s discovery both already skip a dot-prefixed directory.
  for (const checkout of VENDORED_CHECKOUTS) {
    if (!checkout.dotExempt) {
      expect(checkout.basename.startsWith("."), checkout.basename).toBe(false)
    }
  }
})

test("every NON-dot-exempt vendored checkout is excluded from bun run typecheck's program", () => {
  const { exclude } = readTsconfig()
  if (exclude === undefined) {
    throw new Error("tsconfig.json has no \"exclude\" at all - nothing excludes a vendored checkout from typecheck.")
  }
  const missing = VENDORED_CHECKOUTS.filter(
    (checkout) => !checkout.dotExempt && !exclude.includes(checkout.repoRelativePath),
  )
  expect(
    missing.map((c) => c.repoRelativePath),
    "tsconfig.json's \"exclude\" must name every vendored checkout's repo-relative path - a " +
      "fetched third-party project's own type errors are not this repository's to fix",
  ).toEqual([])
})

test("every NON-dot-exempt vendored checkout falls outside bun test's discovery root", () => {
  const testConfig = (bunfigConfig as { test?: { root?: unknown } }).test
  const root = testConfig?.root
  if (typeof root !== "string" || root.trim() === "") {
    throw new Error('bunfig.toml has no usable [test].root - nothing restricts bun test\'s own discovery.')
  }
  // The restriction must be real, not a no-op that still covers the whole
  // repository.
  expect(root).not.toBe(".")
  expect(root).not.toBe("")
  const rootPrefix = `${root}${path.sep}`
  const leaking = VENDORED_CHECKOUTS.filter(
    (checkout) => !checkout.dotExempt && checkout.repoRelativePath.startsWith(rootPrefix),
  )
  expect(
    leaking.map((c) => c.repoRelativePath),
    `bunfig.toml's [test].root ("${root}") must not contain a vendored checkout - a fetched ` +
      "third-party project's own test suite is not this repository's to run",
  ).toEqual([])
})

/**
 * M-6 (final review): EXACTLY ONE DIRECTORY CARRIES EACH VENDORED BASENAME,
 * SO A BASENAME SKIP-SET IS SAFE TO KEEP.
 *
 * `VENDORED_CHECKOUT_NAMES` is matched against `entry.name` by three walkers
 * (the footprint sweep, the symbol-name sweep, perfboard discovery), so a
 * second directory anywhere in the tree named `copperhead` or `.tools` would
 * be skipped by all three - and the symptom is a sweep that reports NOTHING
 * about it, not an error. This is the check that makes "exactly one" a
 * measurement rather than an assumption: a second one fails here, naming its
 * path, instead of quietly disappearing from three sweeps.
 *
 * The walk reads the git index rather than the filesystem, deliberately:
 * `git ls-files` lists tracked paths only, so it cannot be confused by the
 * fetched checkouts' own contents (which is the state this whole file is
 * about) or by anything under `build/`.
 */
test("exactly one tracked directory carries each vendored checkout's basename", () => {
  const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: REPO_ROOT, encoding: "utf8" })
    .split("\0")
    .filter((line) => line !== "")
  expect(tracked.length).toBeGreaterThan(0)

  const offenders: string[] = []
  for (const checkout of VENDORED_CHECKOUTS) {
    // Every directory prefix of every tracked path whose last segment is this
    // basename - the set of places a walker's `entry.name` check would fire.
    const directories = new Set<string>()
    for (const file of tracked) {
      const segments = file.split("/")
      for (let depth = 1; depth < segments.length; depth += 1) {
        if (segments[depth - 1] === checkout.basename) directories.add(segments.slice(0, depth).join("/"))
      }
    }
    for (const directory of directories) {
      if (directory === checkout.repoRelativePath) continue
      offenders.push(`${checkout.basename}: also at ${directory}`)
    }
  }
  expect(
    offenders,
    "these tracked directories share a vendored checkout's basename, so the footprint sweep, " +
      "the symbol-name sweep and perfboard discovery all skip them silently - see " +
      "VENDORED_CHECKOUT_NAMES in lib/not-source.ts. Either rename the directory or make those " +
      "three walkers compare a root-relative path instead of entry.name.",
  ).toEqual([])
})
