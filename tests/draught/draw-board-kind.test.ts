// tests/draught/draw-board-kind.test.ts
//
// Design change C2 of the H7 carrier plan: `make draw` for a `pcb` board that has never had a
// schematic. The board has no committed netlist export, so the pre-draft partition check
// cannot run, and the verb must say so rather than drafting as though it had.
//
// These live beside `draw.test.ts`, not in it: that file is at the repository's file-length
// ceiling. Scratch boards are built under `os.tmpdir()` with absolute `circuit` and `netlist`
// paths, which the declaration loader resolves as given.
import { expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { runDraw } from "../../tools/cli/draw.ts"
import { parseIntent } from "../../tools/draught/draw-draft.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"

const REPO = moduleRepoRoot()
const STAGED_CIRCUIT = path.join(REPO, "circuits", "transistor-preamp", "staged-board.ts")

function scratchBoard(declaration: Readonly<Record<string, string>>): { dir: string; outDir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "draw-kind-board-"))
  fs.writeFileSync(path.join(dir, "perfboard.json"), JSON.stringify(declaration))
  return { dir, outDir: path.join(dir, "out") }
}

test("a pcb board with no netlist drafts and says the partition check did not run", async () => {
  const { dir, outDir } = scratchBoard({
    kind: "pcb",
    circuit: STAGED_CIRCUIT,
    export: "transistorPreampStaged",
  })
  try {
    const result = await runDraw({ boardDir: dir, board: "scratch-pcb", outDir })
    expect(result.stderr).not.toContain("declares no \"netlist\" field")
    expect(result.exitCode).toBe(0)
    expect(result.drew).toBe(true)
    expect(result.stdout).toMatch(/^NO INDEPENDENT NETLIST:/m)
    expect(result.stdout).toContain("did NOT run")
    expect(result.stdout).toContain("kicad-cli")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}, 60_000)

test("a perfboard board with no netlist still refuses", async () => {
  const { dir, outDir } = scratchBoard({
    kind: "perfboard",
    circuit: STAGED_CIRCUIT,
    export: "transistorPreampStaged",
    vrt: "scratch.vrt",
  })
  try {
    const result = await runDraw({ boardDir: dir, board: "scratch-perfboard", outDir })
    expect(result.exitCode).not.toBe(0)
    expect(result.drew).toBe(false)
    expect(result.stderr).toContain('declares no "netlist" field')
    expect(result.stdout).not.toContain("NO INDEPENDENT NETLIST")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("a pcb board that declares a netlist still runs the partition check", async () => {
  const committed = parseIntent(path.join(REPO, "docs/research/2026-10-29-hi-cut-full-run/intent-v4-blocks-mid-late.json"))
  const corrupted = {
    ...committed,
    nets: committed.nets.map((net, index) => (index === 0 ? { ...net, pins: net.pins.slice(1) } : net)),
  }
  const { dir, outDir } = scratchBoard({
    kind: "pcb",
    sch: path.join(REPO, "drafted/pultec/pultec-hi-cut/pultec-hi-cut.generated-do-not-edit.kicad_sch"),
    circuit: path.join(REPO, "circuits/pultec/physical/hi-cut.ts"),
    export: "pultecHiCut",
    netlist: path.join(REPO, "tests/fixtures/pultec-hi-cut.net"),
  })
  const intentPath = path.join(dir, "corrupted.intent.json")
  fs.writeFileSync(intentPath, JSON.stringify(corrupted))
  try {
    const result = await runDraw({ boardDir: dir, board: "scratch-pcb-netlist", outDir, intentPath })
    expect(result.exitCode).not.toBe(0)
    expect(result.drew).toBe(false)
    expect(result.stderr).toContain("disagrees with the model")
    expect(result.stdout).not.toContain("NO INDEPENDENT NETLIST")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
