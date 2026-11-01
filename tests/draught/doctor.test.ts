// tests/draught/doctor.test.ts
import { expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { composeDraughtDoctorReport, renderToolchainReport, runDraughtDoctor } from "../../tools/cli/draught.ts"
import { readLock } from "../../tools/draught/toolchain.ts"
import { defaultAkcli } from "../../tools/draught/akcli-install.ts"

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
  expect(result.text).toContain("akcli doctor")
})

/**
 * FIX-ROUND 2 REGRESSION (task-2-review.md). Round 1 only closed the case
 * where `akcli doctor` could not run AT ALL. The reviewer built a stub
 * `akcli` that version-matches the lock (so `checkToolchain` reports no
 * problem) but EXITS NON-ZERO on `doctor` - a real failure of a kind
 * `checkToolchain` cannot see, since it only reads one version number and
 * `akcli doctor` additionally covers python, kicad-cli, ngspice, symbols,
 * config and network. Unfixed, this reproduces the same contradiction as
 * I-1 in a different shape: `exitCode` is correctly 0 (checkToolchain found
 * no version mismatch - the exit code correctly stays scoped to the lock),
 * but the text would carry a visible akcli-doctor failure directly above an
 * UNQUALIFIED "every tool matches", with no label saying which signal
 * governs. This is the pure half of that regression: it drives
 * `composeDraughtDoctorReport` directly with a problems list of zero and a
 * failing `AkcliDoctorReport`, with no subprocess and no filesystem writes
 * at all.
 */
test("fix round 2 regression (pure): a doctor-failing-but-version-matching akcli does not read as an unqualified pass", () => {
  const result = composeDraughtDoctorReport([], { ok: false, summary: "FAKE DOCTOR FAILURE: symbols library check FAILED" })
  expect(result.exitCode).toBe(0)
  expect(result.text).toContain("FAKE DOCTOR FAILURE")
  expect(result.text).toContain("ADVISORY")
  // The decisive assertion: the base message ALONE already contains neither
  // "ADVISORY" (that is the section header, present whenever akcli is in
  // scope at all) nor "FAKE DOCTOR FAILURE" (that is the stub's own text),
  // so the two assertions above would pass even against an unfixed
  // implementation that prints the header and the raw failure but never
  // qualifies the pass line itself. This is the one check that would not:
  // the exact sentence `qualifyPassForAdvisoryFailure` adds, which only
  // exists when the pass line was actually qualified.
  expect(result.text).toContain("does not make draught-doctor refuse")
  expect(result.text).not.toBe(renderToolchainReport([]))
})

/**
 * FIX-ROUND 2 REGRESSION (task-2-review.md), THE FULL REPRODUCTION. Builds a
 * real stub executable that prints the LOCK'S OWN pinned `akcli` version for
 * `--version` (so `checkToolchain`'s real probe finds no disagreement) and
 * exits 1 with a distinctive message for `doctor`, installs it at the exact
 * path `defaultAkcli()` resolves (the only path `runDraughtDoctor`'s real
 * probe will ever read - there is no override hook), runs the real
 * `runDraughtDoctor()` end to end, and removes exactly what it created
 * afterward.
 *
 * SAFETY: refuses outright, rather than silently skipping or overwriting,
 * if a real binary already exists at that path - this test must never touch
 * a genuine install. `firstMissingAncestor` finds the single topmost
 * directory this test needs to create, so cleanup removes exactly that
 * subtree and nothing that was already under `draughting/` (which holds
 * `tools.lock.json` and this plan's other committed files).
 */
function firstMissingAncestor(dir: string): string {
  if (fs.existsSync(dir)) {
    throw new Error(`${dir} already exists - refusing to treat it as this test's own stub.`)
  }
  let current = dir
  while (!fs.existsSync(path.dirname(current))) {
    current = path.dirname(current)
  }
  return current
}

test("fix round 2 regression (end to end): a real version-matching, doctor-failing akcli does not read as an unqualified pass", () => {
  // Trimmed to exclude copperhead, the one OTHER tool genuinely not
  // installed on this machine today - this test is about akcli alone, and
  // must reach the reviewer's own "with akcli present and every version
  // matching" state, which copperhead's own absence would otherwise spoil
  // with an unrelated disagreement.
  const fullLock = readLock()
  const lock = Object.fromEntries(Object.entries(fullLock).filter(([tool]) => tool !== "copperhead"))
  const akcliVersion = lock.akcli?.version
  if (akcliVersion === undefined) {
    throw new Error("draughting/tools.lock.json no longer names akcli - this test has nothing to stub.")
  }
  const resolvedAkcli = defaultAkcli()

  if (fs.existsSync(resolvedAkcli)) {
    throw new Error(
      `${resolvedAkcli} already exists - this test installs a temporary stub there for the ` +
        "duration of one run and must never do that against a real install.",
    )
  }

  // Built in the system temp directory first, exactly as instructed, before
  // being copied to the one path this verb's probe will actually read.
  const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), "draught-doctor-akcli-stub-"))
  const stubScript = path.join(stubDir, "akcli-stub.sh")
  fs.writeFileSync(
    stubScript,
    [
      "#!/bin/sh",
      'if [ "$1" = "--version" ]; then',
      `  echo "${akcliVersion}"`,
      "  exit 0",
      "fi",
      'if [ "$1" = "doctor" ]; then',
      '  echo "FAKE DOCTOR FAILURE: symbols library check FAILED"',
      "  exit 1",
      "fi",
      "exit 1",
      "",
    ].join("\n"),
  )
  fs.chmodSync(stubScript, 0o755)

  const resolvedDir = path.dirname(resolvedAkcli)
  const createdRoot = firstMissingAncestor(resolvedDir)
  fs.mkdirSync(resolvedDir, { recursive: true })
  fs.copyFileSync(stubScript, resolvedAkcli)
  fs.chmodSync(resolvedAkcli, 0o755)

  try {
    const result = runDraughtDoctor(lock)
    expect(result.exitCode).toBe(0)
    expect(result.text).toContain("FAKE DOCTOR FAILURE")
    expect(result.text).toContain("ADVISORY")
    // The decisive assertion, same reasoning as the pure test above: the
    // exact qualifying sentence, not just the header or the raw stub text.
    expect(result.text).toContain("does not make draught-doctor refuse")
    expect(result.text).not.toBe(renderToolchainReport([]))
  } finally {
    fs.rmSync(createdRoot, { recursive: true, force: true })
    fs.rmSync(stubDir, { recursive: true, force: true })
  }
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
