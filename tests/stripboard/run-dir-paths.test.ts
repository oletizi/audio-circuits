/**
 * `runDirectory`'s path, and the gitignore property that replaces the
 * brief's own `expect(ignore).toContain("build/stripboard/")`.
 *
 * CONTROLLER RULING 2 (2026-10-10 stripboard-pipeline Task 13) measured
 * that substring check wrong on both sides: `.gitignore` line 6 is already
 * `build/`, which already ignores the whole run-directory tree, so adding
 * a redundant `build/stripboard/` line to pass the string match would be
 * editing the ignore file to satisfy a string rather than to make anything
 * true - this plan's central failure mode. The property this test wants is
 * "a path inside the run directory is ignored, and a tracked source file is
 * NOT" - the second half is required, because without it the test would
 * pass just as well against a `.gitignore` that ignored the entire
 * repository.
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { test, expect } from "bun:test"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { runDirectory } from "../../tools/stripboard/run-dir.ts"

test("the run directory is under build/stripboard/", () => {
  expect(runDirectory("pultec-low-boost", "s")).toContain("build/stripboard/pultec-low-boost/s")
})

test("a run-directory path is gitignored, and a tracked source file is not", () => {
  const runFile = path.join(runDirectory("pultec-low-boost", "s"), "run.json")
  const ignored = spawnSync("git", ["check-ignore", runFile], { cwd: moduleRepoRoot() })
  expect(ignored.status).toBe(0)

  const tracked = spawnSync("git", ["check-ignore", "tools/stripboard/run-dir.ts"], {
    cwd: moduleRepoRoot(),
  })
  expect(tracked.status).toBe(1)
})
