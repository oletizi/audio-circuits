/**
 * The ONE registry for every scratch directory this test suite makes under the
 * system temp directory, and the hook that removes them.
 *
 * **IT EXISTS BECAUSE THE FIX THAT ALREADY WORKED WAS APPLIED TO ONLY ONE OF
 * THE TWO PLACES FIXTURES WRITE.** `../stripboard/run-scratch.ts` carries the
 * measurement: at roughly **4,606** directories in one directory, `spawnSync`
 * of the pinned VeroRoute fork began returning exit status 0 with EMPTY STDOUT,
 * and twenty-three tests in nine unrelated files failed with *"--dump-board
 * produced no GRID line"* - a refusal pointing at the fork, about a fork that
 * was fine. That fix registered what the fixtures wrote under
 * `build/stripboard/`, and a full suite leaves zero there. Nothing ever
 * registered what the fixtures wrote under `os.tmpdir()`.
 *
 * **AND THE SUCCESS METRIC MEASURED THE WRONG DIRECTORY.** "Zero run
 * directories" was reported repeatedly as a clean bill of health; it counted
 * `build/stripboard/` - the directory already fixed - while `TMPDIR` filled up
 * unnoticed. On 2026-10-13 it held over **60,000** directories across eight
 * prefixes and the owner's disk filled. One `bun test` run leaked **134**:
 * `stripboard-rules-` 65, `stripboard-climb-` 55, `stripboard-search-` 40,
 * `stripboard-stock-` 10, `checkpoint-` 8, `stripboard-complete-` 7,
 * `wiring-sync-` 2, `stripboard-seed-geometry-` 2. At 134 a run, thirty-four
 * runs reaches the threshold above.
 *
 * **A SITE THAT REMOVES ITS OWN DIRECTORY IN A `finally` IS ALREADY CORRECT AND
 * IS NOT ROUTED THROUGH HERE.** Twenty-seven files under `tests/` do exactly
 * that, and an immediate removal in the scope that made the directory is a
 * stronger guarantee than a hook at the end of the file - converting them would
 * be churn that weakens them. `../stripboard/temp-scratch.test.ts` is what
 * holds the line between the two shapes: every `mkdtemp` site under `tests/`
 * must either name its directory and remove it, or register it here.
 *
 * **`cleanUpTempScratch` RETURNS THE COUNT IT REMOVED** so a hook that silently
 * does nothing cannot read as a passing one. A registry that is empty when a
 * fixture has just run is the exact failure this module exists to catch, and a
 * `void` return would hide it from the guard.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

/** Every directory made through this module, for `cleanUpTempScratch` to remove. */
const CREATED: string[] = []

/**
 * A unique, empty scratch directory under the system temp directory, registered
 * for removal.
 *
 * The prefix is the fixture's own, kept as it was so the per-prefix counts in
 * this module's comment stay comparable against a future measurement. It must
 * end in `-` and name no directory of its own: a prefix carrying a separator
 * would put scratch somewhere `cleanUpTempScratch` still removes but no
 * measurement looks, which is the mistake this whole module is about.
 */
export function freshTempScratch(prefix: string): string {
  if (prefix.length === 0 || !prefix.endsWith("-")) {
    throw new Error(
      `freshTempScratch("${prefix}"): a scratch prefix must be non-empty and end in "-", so the ` +
        "directories one fixture makes are countable by prefix in TMPDIR. Pass the fixture's own " +
        'prefix, as in freshTempScratch("stripboard-rules-"). It is not defaulted because a ' +
        "shared default prefix would make the per-fixture leak counts in this module's comment " +
        "unmeasurable.",
    )
  }
  if (prefix.includes(path.sep) || prefix.includes("/")) {
    throw new Error(
      `freshTempScratch("${prefix}"): a scratch prefix may not contain a path separator. It names ` +
        "an entry directly under TMPDIR, because that is the only level a leak measurement " +
        `counts - see this module's comment. Fix the caller to pass a bare prefix.`,
    )
  }
  const created = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  CREATED.push(created)
  return created
}

/**
 * Register a directory a caller made itself.
 *
 * For a directory whose path another tool chose - a run directory, a nested
 * copy - where `freshTempScratch` could not have made it.
 */
export function registerTempScratch(created: string): void {
  CREATED.push(created)
}

/**
 * Remove every registered directory, and return how many were registered.
 *
 * **EVERY TEST FILE THAT REACHES A REGISTERING FIXTURE CALLS IT IN `afterAll`**,
 * which is the only place that can: a fixture cannot know when the last test
 * that reads it has finished. A module-level `afterAll` in this file would NOT
 * do it - Bun evaluates a module once for the whole run, so the hook would
 * attach to whichever test file imported it first and to no other. That was
 * measured, not assumed.
 *
 * `force: true` so a directory a site already removed is not an error, and the
 * registry is emptied so a second call is a no-op rather than a second walk.
 * The return value is the count BEFORE emptying - see this module's comment for
 * why it is not `void`.
 */
export function cleanUpTempScratch(): number {
  const count = CREATED.length
  for (const created of CREATED) fs.rmSync(created, { recursive: true, force: true })
  CREATED.length = 0
  return count
}

/** How many directories are registered and not yet removed. */
export function registeredTempScratch(): number {
  return CREATED.length
}

/**
 * Every entry directly under the system temp directory whose name starts with
 * `prefix`.
 *
 * `fs.readdirSync` and a `startsWith`, never a shell glob: a zsh glob like
 * `${TMPDIR}adopt-*` ABORTS THE WHOLE EXPANSION on a no-match rather than
 * expanding to nothing, which silently produced a wrong count during this
 * task's own measurement.
 */
export function tempScratchMatching(prefix: string): readonly string[] {
  const root = os.tmpdir()
  return fs
    .readdirSync(root)
    .filter((entry) => entry.startsWith(prefix))
    .map((entry) => path.join(root, entry))
    .sort()
}
