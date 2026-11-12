// Design change C3, Step 2: `make draw` for a board whose circuit module exports drawingPages().
// Each block is drafted into <outDir>/<block>/<block>.kicad_sch and re-papered, rendered and
// measured; the pre-draft partition check runs per block; with no independent netlist the C2
// notice prints once for the board. And a one-page board's draft is byte-for-byte what it was.
//
// Scratch boards live under os.tmpdir() with absolute paths: a perfboard.json committed beside
// the fixture would be found by the repository-wide declaration walk and checked as a board.
import { expect, test } from "bun:test"
import { createHash } from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { runDraw } from "../../tools/cli/draw.ts"
import { verifyPageAgainstModel } from "../../tools/draught/draw-draft.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { drawingPages } from "../fixtures/two-block-board/two-block-board.ts"

const REPO = moduleRepoRoot()
const FIXTURE = path.join(REPO, "tests", "fixtures", "two-block-board", "two-block-board.ts")
const CARRIER_DRAFT = "f5c427e8c6558c2e744762890dc8dd2a24bd39ff52784d29af9e4ad89c27419f"

function scratch(declaration: Readonly<Record<string, string>>, board: string): { dir: string; outDir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "draw-pages-"))
  fs.writeFileSync(path.join(dir, "perfboard.json"), JSON.stringify(declaration))
  return { dir, outDir: path.join(dir, "build", "draw", board) }
}

test("a board exporting drawingPages() drafts, re-papers and renders one sheet per block, with one NO INDEPENDENT NETLIST block", async () => {
  const { dir, outDir } = scratch({ kind: "pcb", circuit: FIXTURE, export: "twoBlockBoard" }, "two-block-board")
  try {
    const result = await runDraw({ boardDir: dir, board: "two-block-board", outDir })
    expect(result.stderr).not.toMatch(/did not produce|failed/)
    expect(result.exitCode).toBe(0)
    expect(result.drew).toBe(true)
    for (const block of ["a", "b"]) {
      const sheet = path.join(outDir, block, `${block}.kicad_sch`)
      expect(fs.existsSync(sheet), sheet).toBe(true)
      expect(fs.readFileSync(sheet, "utf8")).toContain('(paper "USLetter")')
      expect(fs.existsSync(path.join(outDir, block, `${block}.svg`)), `${block}.svg`).toBe(true)
      expect(fs.existsSync(path.join(outDir, `${block}.intent.json`)), `${block}.intent.json`).toBe(true)
    }
    expect([...result.stdout.matchAll(/^NO INDEPENDENT NETLIST:/gm)]).toHaveLength(1)
    // each page's measurement is reported under its own heading
    expect([...result.stdout.matchAll(/^page a:/gm)]).toHaveLength(1)
    expect([...result.stdout.matchAll(/^page b:/gm)]).toHaveLength(1)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}, 120_000)

test("a module exporting both drawingIntent() and drawingPages() refuses: two declarations of one drawing", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "draw-pages-both-"))
  const module = path.join(dir, "both.ts")
  fs.writeFileSync(
    module,
    `export { twoBlockBoard, drawingPages } from ${JSON.stringify(FIXTURE)}\nexport function drawingIntent() { return {} }\n`,
  )
  fs.writeFileSync(path.join(dir, "perfboard.json"), JSON.stringify({ kind: "pcb", circuit: module, export: "twoBlockBoard" }))
  try {
    const result = await runDraw({ boardDir: dir, board: "both", outDir: path.join(dir, "out") })
    expect(result.exitCode).not.toBe(0)
    expect(result.drew).toBe(false)
    expect(result.stderr).toContain("drawingPages")
    expect(result.stderr).toContain("drawingIntent")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("the per-block partition check compares a page with the model's nets restricted to that block's parts", () => {
  const [a] = drawingPages()
  if (a === undefined) throw new Error("the fixture has no first page")
  // The whole board's nets as a hierarchical export names them: 3V3 and GND span both blocks.
  const board = {
    "/3V3": ["R1.1", "R3.1"],
    "/GND": ["C1.2", "C2.2", "R2.2", "R4.2"],
    "/a/FB": ["C1.1", "R1.2", "R2.1"],
    "/b/FB": ["C2.1", "R3.2", "R4.1"],
  }
  expect(verifyPageAgainstModel(a, board)).toEqual({ agrees: true })
  // the control: move R2.1 from FB to GND, and block a's page no longer agrees
  const moved = { ...board, "/GND": [...board["/GND"], "R2.1"], "/a/FB": ["C1.1", "R1.2"] }
  const outcome = verifyPageAgainstModel(a, moved)
  expect(outcome.agrees).toBe(false)
  if (!outcome.agrees) expect(outcome.disagreements.join("\n")).toContain("R2.1")
})

test("a one-page board's draft is byte-for-byte unchanged: the h7-carrier still drafts to its REPLAY.md start sha256", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "draw-pages-carrier-"))
  const outDir = path.join(dir, "h7-carrier")
  try {
    const result = await runDraw({ boardDir: path.join(REPO, "boards", "h7-carrier"), board: "h7-carrier", outDir })
    expect(result.exitCode).toBe(0)
    const sha = createHash("sha256").update(fs.readFileSync(path.join(outDir, "h7-carrier.kicad_sch"))).digest("hex")
    expect(sha).toBe(CARRIER_DRAFT)
    expect(result.stdout).not.toMatch(/^page /m)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}, 180_000)

test("with the root's export declared as its netlist, the per-block check runs, agrees, and prints no NO INDEPENDENT NETLIST block", async () => {
  const { dir, outDir } = scratch({
    kind: "pcb",
    sch: path.join(REPO, "tests/fixtures/two-block-board/drafted/two-block-board.kicad_sch"),
    netlist: path.join(REPO, "tests/fixtures/two-block-board/two-block-board.net"),
    circuit: FIXTURE,
    export: "twoBlockBoard",
  }, "two-block-board")
  try {
    const result = await runDraw({ boardDir: dir, board: "two-block-board", outDir })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).not.toContain("NO INDEPENDENT NETLIST")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}, 120_000)

test("with a declared netlist that moves one block-a pin, the per-block check refuses before drafting, naming the block", async () => {
  const text = fs.readFileSync(path.join(REPO, "tests/fixtures/two-block-board/two-block-board.net"), "utf8")
  // R2 pin 1 is on /a/FB; renaming that node's pin to 2 puts a second R2 pin on FB and none on GND
  const moved = text.replace(/\(node\s+\(ref "R2"\)\s+\(pin "1"\)/, '(node (ref "R2") (pin "2")')
  expect(moved, "the netlist edit found no R2 pin 1 node").not.toBe(text)
  const { dir, outDir } = scratch({ kind: "pcb", circuit: FIXTURE, export: "twoBlockBoard" }, "two-block-board")
  const netlist = path.join(dir, "moved.net")
  fs.writeFileSync(netlist, moved)
  fs.writeFileSync(path.join(dir, "perfboard.json"), JSON.stringify({ kind: "pcb", sch: path.join(dir, "x.kicad_sch"), netlist, circuit: FIXTURE, export: "twoBlockBoard" }))
  try {
    const result = await runDraw({ boardDir: dir, board: "two-block-board", outDir })
    expect(result.exitCode).not.toBe(0)
    expect(result.drew).toBe(false)
    expect(result.stderr).toContain("block a:")
    expect(fs.existsSync(path.join(outDir, "a", "a.kicad_sch"))).toBe(false)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
