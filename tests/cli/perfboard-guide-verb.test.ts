/**
 * Tests for the `guide` verb's dispatch (tools/cli/perfboard-binary-verbs.ts),
 * reached through `runCli`. The binary, kicad-cli and circuit module are
 * injected; the filesystem is a real throwaway tree, so the staging-and-swap
 * into `guide/` is exercised for real.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { runCli } from "../../tools/cli/perfboard.ts"
import { PACKET_FILES, type GuideDeps } from "../../tools/guide/packet.ts"
import { DUMP_TEXT, fixtureCircuit } from "../guide/fixture.ts"

function boardTree(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-guide-"))
  const dir = path.join(root, "boards", "demo")
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(
    path.join(dir, "perfboard.json"),
    JSON.stringify({ circuit: "c.ts", export: "demo", vrt: "demo.vrt", sch: "demo.kicad_sch", netlist: "demo.net" }),
  )
  return root
}

const kicadCalls: string[][] = []
const DEPS: Omit<GuideDeps, "kicadCli"> = {
  runVeroroute: () => ({ status: 0, output: DUMP_TEXT }),
  exportSchematicPdf: (cli, sch, pdf) => {
    kicadCalls.push([cli, sch, pdf])
    fs.writeFileSync(pdf, "%PDF-fake")
  },
  loadCircuit: async () => fixtureCircuit(),
}

test("guide writes the five-file packet into the board's guide/ directory", async () => {
  const root = boardTree()
  try {
    const dir = path.join(root, "boards", "demo")
    const lines: string[] = []
    const errors: string[] = []
    const code = await runCli(["guide", "--kicad-cli", "/fake/kicad-cli"], {
      cwd: dir, log: (line) => lines.push(line), error: (line) => errors.push(line), guideDeps: DEPS, repoRoot: root,
    })
    expect(errors).toEqual([])
    expect(code).toBe(0)
    expect(fs.readdirSync(path.join(dir, "guide")).sort()).toEqual([...PACKET_FILES].sort())
    expect(fs.readdirSync(dir).filter((name) => name.startsWith(".guide-staging"))).toEqual([])
    expect(kicadCalls.at(-1)?.[0]).toBe("/fake/kicad-cli")
    expect(fs.readFileSync(path.join(dir, "guide", "guide.html"), "utf8")).toContain("boards/demo/demo.vrt")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("guide refuses without --kicad-cli, writing nothing", async () => {
  const root = boardTree()
  try {
    const dir = path.join(root, "boards", "demo")
    const errors: string[] = []
    const code = await runCli(["guide"], { cwd: dir, log: () => {}, error: (line) => errors.push(line), guideDeps: DEPS })
    expect(code).toBe(1)
    expect(errors.join("\n")).toContain("--kicad-cli")
    expect(fs.existsSync(path.join(dir, "guide"))).toBe(false)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("guide refuses from a directory that declares no board", async () => {
  const root = boardTree()
  try {
    const errors: string[] = []
    const code = await runCli(["guide", "--kicad-cli", "/fake/kicad-cli"], {
      cwd: root, log: () => {}, error: (line) => errors.push(line), guideDeps: DEPS,
    })
    expect(code).toBe(1)
    expect(errors.join("\n")).toContain('"guide" verb acts on exactly one declared board')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
