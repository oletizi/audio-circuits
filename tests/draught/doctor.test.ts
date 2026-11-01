// tests/draught/doctor.test.ts
import { expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import path from "node:path"
import { renderToolchainReport, runDraughtDoctor } from "../../tools/cli/draught.ts"
import { readLock } from "../../tools/draught/toolchain.ts"

test("the report names the tool, what is wanted, what was found and how to fix it", () => {
  const text = renderToolchainReport([
    { tool: "akcli", wanted: "0.22.0", found: "0.21.0", how: "pip install 'akcli-kicad==0.22.0'" },
  ])
  expect(text).toContain("akcli")
  expect(text).toContain("0.22.0")
  expect(text).toContain("0.21.0")
  expect(text).toContain("pip install 'akcli-kicad==0.22.0'")
})

test("an empty problem list renders a line saying the toolchain matches, not an empty string", () => {
  expect(renderToolchainReport([]).trim()).not.toBe("")
})

/**
 * FIX-ROUND 1 REGRESSION, Important 1 (task-2-review.md). Reproduces the
 * reviewer's exact repro state: a lock trimmed to ONLY the tools genuinely
 * installed on this machine today (kicad-cli, magick, qpdf - per
 * tools/draught/toolchain.ts's own module comment, these three are the ones
 * confirmed working here), with `akcli` not a key of it at all. The
 * unfixed `runDraughtDoctor` ran `akcli doctor` unconditionally regardless
 * of whether `akcli` was even being checked, which on this machine (akcli
 * is Task 3's to install and is not here yet) printed an unconditional
 * "could not run... ENOENT" directly beside an unconditional exit 0 "every
 * tool matches" - a visible error next to a success, indistinguishable from
 * each other to a reader. This test would FAIL against that implementation:
 * exitCode would still be 0 (correct), but the text would contain "akcli
 * doctor" and "ENOENT" for a tool this run was never checking at all.
 */
test("I-1 regression: a lock without akcli runs no akcli doctor check, so a clean pass carries no unconditional error", () => {
  const fullLock = readLock()
  const installedOnly = Object.fromEntries(
    Object.entries(fullLock).filter(([tool]) => tool !== "akcli" && tool !== "copperhead"),
  )
  expect("akcli" in installedOnly).toBe(false)
  const result = runDraughtDoctor(installedOnly)
  expect(result.exitCode).toBe(0)
  expect(result.text).not.toContain("akcli doctor")
  expect(result.text).not.toContain("ENOENT")
  expect(result.text).not.toContain("could not run")
})

test("a lock that DOES name akcli still folds akcli doctor's own report in", () => {
  const result = runDraughtDoctor(readLock())
  // Whether akcli is actually installed on the machine running this test or
  // not, the section header must appear - this is the other half of the
  // gate the regression test above proves the absence of.
  expect(result.text).toContain("akcli doctor:")
})

/**
 * M-1 (task-2-review.md): drives `runDraughtDoctor` itself, not only the
 * pure `renderToolchainReport`, so the exit-code line and the akcli fold-in
 * both have a test that exercises the real function rather than only its
 * rendering half. The perturbation is synthetic (a version nothing on any
 * machine will ever report) rather than relying on this machine's current
 * install state, so it is robust wherever the suite runs.
 */
test("runDraughtDoctor's exit code is non-zero and names the tool when checkToolchain finds a problem", () => {
  const lock = { ...readLock(), "kicad-cli": { ...readLock()["kicad-cli"], version: "0.0.1-m1-test" } }
  const result = runDraughtDoctor(lock)
  expect(result.exitCode).toBe(1)
  expect(result.text).toContain("kicad-cli")
  expect(result.text).toContain("0.0.1-m1-test")
})

/**
 * I-2 (task-2-review.md): nothing guarded `make help`'s own content before
 * this - the verb existed and worked but was undiscoverable. Checked from
 * BOTH an aggregate directory (the repository root, make/aggregate.mk) and a
 * declared board directory (make/board.mk), because the two files each own
 * a separate copy of the help text and the reviewer's own finding was that
 * one of the two is easy to edit while forgetting the other.
 */
const REPO_ROOT = path.join(import.meta.dir, "..", "..")
const PROBE_BOARD = path.join(REPO_ROOT, "boards", "pt2399-core")

test("make help, from the repository root, lists draught-doctor", () => {
  const output = execFileSync("make", ["help"], { cwd: REPO_ROOT, encoding: "utf8" })
  expect(output).toContain("draught-doctor")
})

test("make help, from a declared board directory, lists draught-doctor", () => {
  const output = execFileSync("make", ["help"], { cwd: PROBE_BOARD, encoding: "utf8" })
  expect(output).toContain("draught-doctor")
})
