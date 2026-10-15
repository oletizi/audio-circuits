/**
 * The standing guard that the core model runs with the forked VeroRoute absent.
 *
 * **IT IS THE OWNER'S BOUNDARY, AND IT IS HERE BECAUSE A PRINCIPLE NOBODY
 * ENFORCES IS NOT A BOUNDARY.** His words: *"I think being tied to a forked gui
 * for our core logic is a bad idea. We can use veroroute as a reference and a
 * witness - even a human starting point, but the core agent-focused layout
 * solution code should be ours."* The plan that quotes that then makes a custom
 * fork feature necessary to MATERIALIZE a selected candidate, so the dependency
 * is pushed outward with nothing standing between it and creeping back in. This
 * file is that thing. The fork is invoked for exactly three jobs - importing an
 * existing layout, materializing a candidate, and independent comparison - and
 * none of them lives in `lib/stripboard/`.
 *
 * **THE DISTINCTION BETWEEN A TEST AND A STATED PRINCIPLE IS THE WHOLE POINT.**
 * This repository has repeatedly shipped principles nothing checked: a renderer
 * that could not draw its own boards, a leak metric that counted
 * `build/stripboard/` while the leak was in `TMPDIR`, an `[external]`
 * provenance mark on a sentence an agent wrote, and a comment in `board.ts`
 * claiming three consumers for a field that had one. A boundary with no test is
 * that same shape.
 *
 * **THE CORE IS ENUMERATED FROM THE DIRECTORY, NEVER LISTED HERE.** Today
 * `lib/stripboard/` is `board.ts`, `connectivity.ts` and `cuts.ts`; Tasks 4-7
 * add `score.ts`, `invariants.ts`, `seed.ts` and `moves.ts`. A hard-coded list
 * would stop covering the core the moment it grew, and nothing would say so -
 * which is exactly the failure class this file exists to prevent. The only
 * hard-coded names below are a FLOOR: the three modules the boundary was drawn
 * around must still be found, so an enumeration that comes back empty or
 * shrinks fails instead of passing over nothing.
 *
 * **THE FORK IS MADE UNAVAILABLE THROUGH `VEROROUTE`, AND NOTHING ON DISK IS
 * TOUCHED.** An earlier draft proposed renaming the binary aside and restoring
 * it in a `finally`, which mutates shared tool state and leaves the environment
 * damaged if the process is killed - which has happened here. No renaming is
 * needed. Every fork invocation in this repository resolves its binary through
 * `tools/perfboard/check.ts`'s `verorouteBinary`, which calls
 * `tools/perfboard/acquire.ts`'s `resolveBinary`, which reads `VEROROUTE`
 * (grepped, not remembered: `verbs.ts`, `check.ts`, `buildability-input.ts` and
 * `tools/stripboard/place.ts` are its only callers). A subprocess with
 * `VEROROUTE` pointed at a path that does not exist therefore has no fork at
 * all - in "explicit" mode `verorouteBinary` returns the path unchecked, so a
 * spawn of it fails - and the resolution is asserted below rather than assumed,
 * because a subprocess that quietly still found the fork would pass this test
 * while proving nothing.
 *
 * **TESTS MAY IMPORT `tools/`.** The boundary binds production code under
 * `lib/stripboard/`. This file imports `tools/perfboard/acquire.ts` itself, to
 * check its claim about `VEROROUTE` against the real resolver.
 */
import { expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { importClosure } from "../../../lib/import-closure.ts"
import { resolveBinary } from "../../../tools/perfboard/acquire.ts"

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..", "..")

/** The core the boundary binds. Enumerated, never listed. */
const CORE_DIR = "lib/stripboard"

/** The core's own suite, the one run below with the fork made unavailable. */
const SUITE_DIR = "tests/stripboard/model"

/**
 * The three modules `lib/stripboard/` held when the boundary was drawn.
 *
 * This is a FLOOR and not the list the guard walks: a module added by a later
 * task is covered without an edit here, while an enumeration that finds nothing
 * - a renamed directory, a moved core - fails rather than passing vacuously.
 */
const CORE_FLOOR: readonly string[] = ["board.ts", "connectivity.ts", "cuts.ts"]

/**
 * A path under `.tools/` that does not exist, handed to the subprocess as
 * `VEROROUTE`.
 *
 * It is inside the repository rather than at `/nonexistent/...` so that a
 * machine which happens to have a stray `/nonexistent` cannot make this test
 * meaningless, and its absence is asserted before it is used.
 */
const ABSENT_FORK = path.join(REPO_ROOT, ".tools", "no-such-veroroute-binary")

/** This file, excluded from the suite it spawns - see `coreSuite` below. */
const SELF = path.basename(import.meta.path)

/** Tokens by which a module reaches a process. Matched by name, not by pattern. */
const SPAWN_MARKS: readonly string[] = [
  "node:child_process",
  "spawnSync",
  "execSync",
  "execFileSync",
  "Bun.spawn",
  "Bun.$",
]

/** Every `.ts` file directly in `relativeDir`, as repository-relative paths. */
function typescriptFilesIn(relativeDir: string): readonly string[] {
  const absolute = path.join(REPO_ROOT, relativeDir)
  if (!fs.existsSync(absolute)) {
    throw new Error(
      `${relativeDir}: not a directory under ${REPO_ROOT}. This guard enumerates the directory ` +
        "rather than carrying a list of modules, so a directory that is not there means the " +
        "guard is walking nothing while reporting a pass. Point CORE_DIR or SUITE_DIR in " +
        "tests/stripboard/model/no-fork.test.ts at wherever the core moved to; it is not " +
        "defaulted because there is no second place to look that would not be a guess.",
    )
  }
  const names = fs
    .readdirSync(absolute)
    .filter((name) => name.endsWith(".ts"))
    .sort()
  if (names.length === 0) {
    throw new Error(
      `${relativeDir}: holds no .ts files. Every assertion this guard makes is over that set, ` +
        "so an empty one passes while checking nothing - the shape of failure this file exists " +
        "to prevent. Fix CORE_DIR or SUITE_DIR in tests/stripboard/model/no-fork.test.ts.",
    )
  }
  return names.map((name) => `${relativeDir}/${name}`)
}

/**
 * The `.test.ts` files of the core's own suite, with THIS file excluded.
 *
 * The exclusion is recursion and nothing else: `bun test` over the whole
 * directory would spawn this file again inside its own subprocess, forever. It
 * is asserted rather than assumed - the one excluded path must be this file -
 * so moving this file out of `SUITE_DIR` fails here instead of silently
 * dropping the exclusion or the suite.
 */
function coreSuite(): readonly string[] {
  const all = typescriptFilesIn(SUITE_DIR).filter((file) => file.endsWith(".test.ts"))
  const excluded = all.filter((file) => path.basename(file) === SELF)
  expect(excluded).toEqual([`${SUITE_DIR}/${SELF}`])
  return all.filter((file) => path.basename(file) !== SELF)
}

test("no module in lib/stripboard/ reaches tools/", () => {
  const core = typescriptFilesIn(CORE_DIR)
  expect(core).toEqual(expect.arrayContaining(CORE_FLOOR.map((name) => `${CORE_DIR}/${name}`)))

  // One string per violation, naming BOTH the entry module and the file it
  // reached: "something under lib/stripboard/ reaches tools/" is not actionable
  // when the closure is twelve files deep and the edge may be in any of them.
  const violations: string[] = []
  for (const entry of core) {
    for (const reached of [...importClosure(entry)].sort()) {
      if (reached.startsWith("tools/")) violations.push(`${entry} reaches ${reached}`)
    }
  }
  expect(violations).toEqual([])
})

test("no module the core reaches spawns a process", () => {
  // The import closure skips `node:` specifiers, so a core module could import
  // node:child_process and the closure walk above would not see it. Spawning is
  // how the fork is invoked, so it is checked directly, over the text of every
  // file in every core closure.
  const reached = new Set<string>()
  for (const entry of typescriptFilesIn(CORE_DIR)) {
    for (const file of importClosure(entry)) reached.add(file)
  }
  expect(reached.size).toBeGreaterThan(CORE_FLOOR.length)

  const violations: string[] = []
  for (const file of [...reached].sort()) {
    const text = fs.readFileSync(path.join(REPO_ROOT, file), "utf8")
    for (const mark of SPAWN_MARKS) {
      if (text.includes(mark)) violations.push(`${file} mentions ${mark}`)
    }
  }
  expect(violations).toEqual([])
})

test("VEROROUTE is how the fork is located, so a bad value is a fork that is not there", () => {
  expect(fs.existsSync(ABSENT_FORK)).toBe(false)

  // "explicit" is the mode that returns the path unchanged with no existence
  // check - the operator pointing at their own build. A spawn of it is an
  // ENOENT, which is the fork being unavailable rather than a different one
  // being chosen. If this came back "acquired", the subprocess below would be
  // running against the binary in .tools/ and would prove nothing.
  const resolution = resolveBinary({ VEROROUTE: ABSENT_FORK }, REPO_ROOT)
  expect(resolution.mode).toBe("explicit")
  expect(resolution.path).toBe(ABSENT_FORK)
})

test("the core's own suite passes with the fork unavailable", () => {
  const suite = coreSuite()
  const run = spawnSync(process.execPath, ["test", ...suite], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: { ...process.env, VEROROUTE: ABSENT_FORK },
  })
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`
  if (run.status !== 0) {
    throw new Error(
      `the core's own suite exited ${run.status} with VEROROUTE pointed at ${ABSENT_FORK}. ` +
        "The core model, its cut derivation and its connectivity verifier are required to run " +
        "with the forked VeroRoute absent; the fork is for importing a layout, materializing a " +
        `candidate and comparing independently, none of which is in ${CORE_DIR}.\n${output}`,
    )
  }

  // A `bun test` invocation whose file arguments matched nothing would also
  // exit 0, so the count of tests it actually ran is asserted: a guard that
  // passes by running no tests is the failure this file is built against.
  const ran = output.match(/Ran (\d+) tests across (\d+) files/)
  if (ran === null) {
    throw new Error(
      "the subprocess exited 0 but printed no \"Ran N tests across M files\" line, so how many " +
        "tests it ran is unknown. An exit code alone cannot distinguish a passing suite from " +
        `one that matched no files.\n${output}`,
    )
  }
  expect(Number(ran[1])).toBeGreaterThan(0)
  expect(Number(ran[2])).toBe(suite.length)
})
