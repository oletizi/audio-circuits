/**
 * Tests for the `scaffold-membership` verb dispatched from `runCli` in
 * `tools/cli/perfboard.ts` - the verb `make/board.mk`'s `check` target runs as a
 * prerequisite on every board.
 *
 * **WHY THE VERB IS TESTED AND NOT ONLY THE GUARD.** `make check` prints
 * `ok <path>` for a passing board and nothing else, so a guard whose having run
 * leaves no trace in the output is one an operator cannot tell from a guard that
 * was never wired in. These assert the PRINTED LINES on both statuses, which is
 * the half of the requirement a unit test of
 * `tools/perfboard/scaffold-membership.ts` cannot reach.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { runCli } from "../../tools/cli/perfboard.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"

const REPO_ROOT = moduleRepoRoot()

test("a Pultec section prints its counts and exits 0", async () => {
  const lines: string[] = []
  const errors: string[] = []
  const code = await runCli(["scaffold-membership"], {
    cwd: path.join(REPO_ROOT, "boards", "pultec-low-boost"),
    log: (line) => lines.push(line),
    error: (line) => errors.push(line),
  })
  expect(errors).toEqual([])
  expect(code).toBe(0)
  const printed = lines.join("\n")
  expect(printed).toContain("scaffold membership ok")
  expect(printed).toContain("4 stand-in group(s)")
  expect(printed).toContain("8 part(s)")
})

test("a board with no SCAFFOLD prints a NOTICE and still exits 0", async () => {
  const lines: string[] = []
  const errors: string[] = []
  const code = await runCli(["scaffold-membership"], {
    cwd: path.join(REPO_ROOT, "boards", "pt2399-core"),
    log: (line) => lines.push(line),
    error: (line) => errors.push(line),
  })
  expect(errors).toEqual([])
  expect(code).toBe(0)
  expect(lines[0]).toMatch(/^NOTICE: /)
  expect(lines.join("\n")).toContain("NOT checked")
})

test("run outside a board directory refuses rather than passing over nothing", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scaffold-membership-cli-"))
  try {
    const lines: string[] = []
    const errors: string[] = []
    const code = await runCli(["scaffold-membership"], {
      cwd: dir,
      log: (line) => lines.push(line),
      error: (line) => errors.push(line),
    })
    expect(code).toBe(1)
    expect(errors.length).toBeGreaterThan(0)
    expect(lines).toEqual([])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
