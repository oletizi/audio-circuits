// tests/draught/draw.test.ts
//
// Task 5 of .superpowers/sdd/2026-10-30-institutionalise-draughting: `make
// draw`, the verb that absorbs the mechanics five run directories under
// docs/research/ each hand-wrote. See tools/cli/draw.ts's own module comment
// for the order (check the toolchain; resolve the intent; verify it against
// the model; draft; render; measure; crop) and for why it never withholds a
// page over anything but a connectivity disagreement.
import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { readLock, type Toolchain } from "../../tools/draught/toolchain.ts"
import { runDraw } from "../../tools/cli/draw.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"

/**
 * The real pinned lock, plus one tool nothing on this machine will ever answer to - named
 * "definitely-not-a-tool" itself, not merely probed with that argv, so the rendered report's
 * per-tool line (`tools/cli/draught.ts`'s `renderToolchainReport`) names it literally.
 */
function lockWantingAMissingTool(): Toolchain {
  return {
    ...readLock(),
    "definitely-not-a-tool": { version: "1", probe: ["definitely-not-a-tool", "--version"] },
  }
}

test("draw refuses with the toolchain report when a pinned tool is missing", async () => {
  const result = await runDraw({ board: "pultec-hi-cut", lock: lockWantingAMissingTool() })
  expect(result.exitCode).not.toBe(0)
  expect(result.stderr).toContain("definitely-not-a-tool")
  expect(result.drew).toBe(false)
})

test("a board with no committed intent refuses, naming the board, rather than deriving one", async () => {
  // pultec-mid has a page under drafted/pultec/ but no entry in COMMITTED_INTENT yet - this
  // plan does not derive an intent from a Network, so it must refuse rather than guess.
  const result = await runDraw({ board: "pultec-mid" })
  expect(result.exitCode).not.toBe(0)
  expect(result.drew).toBe(false)
  expect(result.stderr).toContain("pultec-mid")
  expect(result.stderr).toContain("no committed copperhead intent")
})

test("a directory with no perfboard.json refuses, naming the directory, rather than crashing", async () => {
  const boardDir = path.join(moduleRepoRoot(), "boards")
  const result = await runDraw({ boardDir })
  expect(result.exitCode).not.toBe(0)
  expect(result.drew).toBe(false)
  expect(result.stderr).toContain("perfboard.json")
})

test("an intent whose net partition disagrees with the model refuses before drafting anything", async () => {
  const repoRoot = moduleRepoRoot()
  const committed = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, "docs/research/2026-10-29-hi-cut-full-run/intent-v4-blocks-mid-late.json"),
      "utf8",
    ),
  ) as { nets: { name: string; pins: string[] }[] }
  // Sever one real connection: drop a pin from the first net, which no longer agrees with
  // the model's committed netlist export.
  const corrupted = {
    ...committed,
    nets: committed.nets.map((net, index) => (index === 0 ? { ...net, pins: net.pins.slice(1) } : net)),
  }
  const scratchDir = fs.mkdtempSync(path.join(repoRoot, "build", "draw-test-"))
  const intentPath = path.join(scratchDir, "corrupted.intent.json")
  fs.writeFileSync(intentPath, JSON.stringify(corrupted))
  try {
    const result = await runDraw({ board: "pultec-hi-cut", intentPath })
    expect(result.exitCode).not.toBe(0)
    expect(result.drew).toBe(false)
    expect(result.stderr).toContain("disagrees with the model")
  } finally {
    fs.rmSync(scratchDir, { recursive: true, force: true })
  }
})

/**
 * THE REAL RUN. Drives the full loop against pultec-hi-cut's committed intent -
 * draft with copperhead, render with kicad-cli and ImageMagick, run the
 * measurement suite - the same tools `make draught-doctor` already confirms are
 * installed. It never withholds the page over a measurement finding
 * (EVALUATING-DRAWINGS.md §3): this test asserts the page and its crop exist
 * REGARDLESS of what the measurement suite reports, and separately asserts the
 * measurement suite's own output is present in the report.
 */
test("a real draw of pultec-hi-cut drafts, renders and measures without withholding the page", async () => {
  const repoRoot = moduleRepoRoot()
  const outDir = fs.mkdtempSync(path.join(repoRoot, "build", "draw-test-real-"))
  try {
    const result = await runDraw({ board: "pultec-hi-cut", outDir })
    expect(result.exitCode).toBe(0)
    expect(result.drew).toBe(true)

    expect(fs.existsSync(path.join(outDir, "pultec-hi-cut.kicad_sch"))).toBe(true)
    expect(fs.existsSync(path.join(outDir, "pultec-hi-cut.pdf"))).toBe(true)
    expect(fs.existsSync(path.join(outDir, "pultec-hi-cut.svg"))).toBe(true)
    expect(fs.existsSync(path.join(outDir, "crops", "pultec-hi-cut-whole-page.png"))).toBe(true)

    expect(result.stdout).toContain("crossings.py")
    expect(result.stdout).toContain("junction_audit.py")
    expect(result.stdout).toContain("label_survey.py")
    expect(result.stdout).toContain("TRUE CROSSINGS")
    expect(result.stdout).toContain("ORPHAN JUNCTIONS")
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true })
  }
})

test("nothing here touches drafted/ - the real run writes only its own outDir", async () => {
  const repoRoot = moduleRepoRoot()
  const draftedHiCut = path.join(repoRoot, "drafted", "pultec", "pultec-hi-cut")
  const before = fs
    .readdirSync(draftedHiCut)
    .sort()
    .map((name) => fs.readFileSync(path.join(draftedHiCut, name)).toString("base64"))
  const outDir = fs.mkdtempSync(path.join(repoRoot, "build", "draw-test-untouched-"))
  try {
    await runDraw({ board: "pultec-hi-cut", outDir })
    const after = fs
      .readdirSync(draftedHiCut)
      .sort()
      .map((name) => fs.readFileSync(path.join(draftedHiCut, name)).toString("base64"))
    expect(after).toEqual(before)
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true })
  }
})
