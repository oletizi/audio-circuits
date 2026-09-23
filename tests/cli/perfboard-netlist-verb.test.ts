/**
 * Tests for tools/cli/perfboard-netlist-verb.ts: the `netlist-sync` verb
 * dispatched from `runCli` in tools/cli/perfboard.ts.
 *
 * `netlist-sync` never spawns kicad-cli here - `netlistSyncDeps` always
 * injects `runExport`/`kicadCliExists`, matching this repository's own rule
 * that no test invokes kicad-cli or builds anything.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { runCli } from "../../tools/cli/perfboard.ts"

async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "netlist-sync-cli-"))
  try {
    await run(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

test("missing --sch/--netlist/--kicad-cli refuses naming every flag left out", async () => {
  const errors: string[] = []
  const code = await runCli(["netlist-sync"], { error: (line) => errors.push(line) })
  expect(code).toBe(1)
  const message = errors.join("\n")
  expect(message).toContain("--sch")
  expect(message).toContain("--netlist")
  expect(message).toContain("--kicad-cli")
})

test("an in-sync export logs nothing and exits 0", async () => {
  await withTempDir(async (dir) => {
    const netlistPath = path.join(dir, "board.net")
    fs.writeFileSync(netlistPath, '(export\n\t(source "board.kicad_sch")\n\t(date "2026-01-01")\n)\n')
    const lines: string[] = []
    const code = await runCli(
      ["netlist-sync", "--sch", "board.kicad_sch", "--netlist", netlistPath, "--kicad-cli", "kicad-cli"],
      {
        log: (line) => lines.push(line),
        netlistSyncDeps: {
          kicadCliExists: () => true,
          runExport: (_cli, _sch, outputPath) =>
            fs.writeFileSync(
              outputPath,
              '(export\n\t(source "/some/other/machine/board.kicad_sch")\n\t(date "2026-06-06")\n)\n',
            ),
        },
      },
    )
    expect(code).toBe(0)
    expect(lines).toEqual([])
  })
})

test("a changed export rewrites the fixture, exits 0, and logs why it matters", async () => {
  await withTempDir(async (dir) => {
    const netlistPath = path.join(dir, "board.net")
    fs.writeFileSync(
      netlistPath,
      '(export\n\t(source "board.kicad_sch")\n\t(date "2026-01-01")\n\t(tool "old")\n)\n',
    )
    const lines: string[] = []
    const code = await runCli(
      ["netlist-sync", "--sch", "board.kicad_sch", "--netlist", netlistPath, "--kicad-cli", "kicad-cli"],
      {
        log: (line) => lines.push(line),
        netlistSyncDeps: {
          kicadCliExists: () => true,
          runExport: (_cli, _sch, outputPath) =>
            fs.writeFileSync(
              outputPath,
              '(export\n\t(source "board.kicad_sch")\n\t(date "2026-06-06")\n\t(tool "new")\n)\n',
            ),
        },
      },
    )
    expect(code).toBe(0)
    expect(lines.join("\n")).toMatch(/schematic has moved/)
    expect(fs.readFileSync(netlistPath, "utf8")).toContain('(tool "new")')
  })
})

test("kicad-cli missing exits 1 and names both the netlist and the kicad-cli path", async () => {
  await withTempDir(async (dir) => {
    const netlistPath = path.join(dir, "board.net")
    fs.writeFileSync(netlistPath, "(export)\n")
    const errors: string[] = []
    const code = await runCli(
      ["netlist-sync", "--sch", "board.kicad_sch", "--netlist", netlistPath, "--kicad-cli", "/no/kicad-cli"],
      {
        error: (line) => errors.push(line),
        netlistSyncDeps: { kicadCliExists: () => false },
      },
    )
    expect(code).toBe(1)
    const message = errors.join("\n")
    expect(message).toContain(netlistPath)
    expect(message).toContain("/no/kicad-cli")
  })
})
