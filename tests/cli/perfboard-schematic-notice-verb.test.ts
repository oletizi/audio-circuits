/**
 * Tests for the `schematic-notice` verb dispatched from `runCli` in
 * tools/cli/perfboard.ts: the verb make/board.mk's `netlist-agrees` calls
 * when a board declares no "sch"/"netlist" pair, closing the silent-skip
 * where such a board got no freshness guard AND no indication that it had
 * none.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { runCli } from "../../tools/cli/perfboard.ts"

test("prints the notice naming this directory's own perfboard.json and exits 0", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "schematic-notice-cli-"))
  try {
    const lines: string[] = []
    const errors: string[] = []
    const code = await runCli(["schematic-notice"], {
      cwd: dir,
      log: (line) => lines.push(line),
      error: (line) => errors.push(line),
    })
    expect(code).toBe(0)
    expect(errors).toEqual([])
    expect(lines.length).toBeGreaterThan(1)
    expect(lines[0]).toMatch(/^NOTICE: /)
    expect(lines.join("\n")).toContain(path.join(dir, "perfboard.json"))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("honors -C the same way every other verb does", async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "schematic-notice-cli-c-"))
  const board = path.join(parent, "boards", "widget")
  fs.mkdirSync(board, { recursive: true })
  try {
    const lines: string[] = []
    const code = await runCli(["schematic-notice", "-C", board], {
      cwd: parent,
      log: (line) => lines.push(line),
    })
    expect(code).toBe(0)
    expect(lines.join("\n")).toContain(path.join(board, "perfboard.json"))
  } finally {
    fs.rmSync(parent, { recursive: true, force: true })
  }
})
