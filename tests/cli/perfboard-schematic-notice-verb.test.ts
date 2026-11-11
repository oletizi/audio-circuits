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
    const code = await runCli(["schematic-notice", "--kind", "perfboard"], {
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
    const code = await runCli(["schematic-notice", "--kind", "perfboard", "-C", board], {
      cwd: parent,
      log: (line) => lines.push(line),
    })
    expect(code).toBe(0)
    expect(lines.join("\n")).toContain(path.join(board, "perfboard.json"))
  } finally {
    fs.rmSync(parent, { recursive: true, force: true })
  }
})

test("a pcb board's notice says no layout check exists and names the test that does run", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "schematic-notice-cli-pcb-"))
  try {
    const lines: string[] = []
    const code = await runCli(["schematic-notice", "--kind", "pcb"], {
      cwd: dir,
      log: (line) => lines.push(line),
      error: () => {},
    })
    expect(code).toBe(0)
    const text = lines.join("\n")
    expect(lines[0]).toMatch(/^NOTICE: /)
    expect(text).toContain("no layout check exists")
    expect(text).toContain("tests/circuits/")
    // The perfboard wording claims a check ran against a layout; a pcb board has none.
    expect(text).not.toContain("the check below still ran")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("the perfboard wording is unchanged and still says the layout check ran", async () => {
  const lines: string[] = []
  const code = await runCli(["schematic-notice", "--kind", "perfboard"], {
    cwd: os.tmpdir(),
    log: (line) => lines.push(line),
  })
  expect(code).toBe(0)
  expect(lines.join("\n")).toContain("the check below still ran, against the layout this")
})

test("a missing or unknown --kind refuses rather than guessing a wording", async () => {
  for (const argv of [["schematic-notice"], ["schematic-notice", "--kind", "stripboard"]]) {
    const errors: string[] = []
    const lines: string[] = []
    const code = await runCli(argv, { cwd: os.tmpdir(), log: (l) => lines.push(l), error: (l) => errors.push(l) })
    expect(code).toBe(1)
    expect(lines).toEqual([])
    expect(errors.join("\n")).toContain("--kind")
  }
})
