/**
 * Tests for the `bom` verb's dispatch (tools/cli/perfboard-bom-verb.ts), reached
 * through `runCli`. The circuit module, simulator, catalog and filesystem are
 * injected (tests/bom/run-fixture.ts); only the board's perfboard.json is real.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { runCli } from "../../tools/cli/perfboard.ts"
import { bomJson, demoDeps, memoryFs } from "../bom/run-fixture.ts"
import { boardDir, tree } from "./perfboard-test-helpers.ts"

async function inTree(run: (root: string, dir: string) => Promise<void>): Promise<void> {
  const root = tree()
  try {
    await run(root, boardDir(root))
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test("bom reports unchosen lines, writes BOM.md and exits 1", async () => {
  await inTree(async (_root, dir) => {
    const files = memoryFs({ [path.join(dir, "bom.json")]: bomJson() })
    const lines: string[] = []
    const errors: string[] = []
    const code = await runCli(["bom"], {
      cwd: dir, log: (line) => lines.push(line), error: (line) => errors.push(line), bomDeps: demoDeps(files),
    })
    expect(code).toBe(1)
    expect(errors).toEqual([])
    expect(lines.join("\n")).toContain("line(s) with no part chosen")
    expect(files.writes).toEqual([path.join(dir, "BOM.md")])
  })
})

test("bom refuses a board with no bom.json, naming the file", async () => {
  await inTree(async (_root, dir) => {
    const files = memoryFs({})
    const errors: string[] = []
    const code = await runCli(["bom"], {
      cwd: dir, log: () => {}, error: (line) => errors.push(line), bomDeps: demoDeps(files),
    })
    expect(code).toBe(1)
    expect(errors.join("\n")).toContain(path.join(dir, "bom.json"))
    expect(files.writes).toEqual([])
  })
})

test("bom refuses from a directory that declares no board", async () => {
  await inTree(async (root) => {
    const errors: string[] = []
    const code = await runCli(["bom"], {
      cwd: root, log: () => {}, error: (line) => errors.push(line), bomDeps: demoDeps(memoryFs({})),
    })
    expect(code).toBe(1)
    expect(errors.join("\n")).toContain('"bom" verb acts on exactly one declared board')
  })
})

test("bom takes no flags", async () => {
  await inTree(async (_root, dir) => {
    const errors: string[] = []
    const code = await runCli(["bom", "--force"], {
      cwd: dir, log: () => {}, error: (line) => errors.push(line), bomDeps: demoDeps(memoryFs({})),
    })
    expect(code).toBe(1)
    expect(errors.join("\n")).toContain('"--force"')
  })
})

test("help lists the bom verb", async () => {
  const lines: string[] = []
  await runCli(["--help"], { log: (line) => lines.push(line) })
  expect(lines.join("\n")).toMatch(/\n {2}bom +/)
})
