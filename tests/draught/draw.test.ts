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
import { repaperToUSLetter } from "../../tools/draught/draw-render.ts"
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
test("a real draw of pultec-hi-cut drafts, re-papers to USLetter, renders and measures without withholding the page", async () => {
  const repoRoot = moduleRepoRoot()
  const outDir = fs.mkdtempSync(path.join(repoRoot, "build", "draw-test-real-"))
  try {
    const result = await runDraw({ board: "pultec-hi-cut", outDir })
    expect(result.exitCode).toBe(0)
    expect(result.drew).toBe(true)

    const schematicPath = path.join(outDir, "pultec-hi-cut.kicad_sch")
    expect(fs.existsSync(schematicPath)).toBe(true)
    expect(fs.existsSync(path.join(outDir, "pultec-hi-cut.pdf"))).toBe(true)
    expect(fs.existsSync(path.join(outDir, "pultec-hi-cut.svg"))).toBe(true)
    expect(fs.existsSync(path.join(outDir, "crops", "pultec-hi-cut-whole-page.png"))).toBe(true)

    // I-1 (fix round 1): every approved Pultec page is USLetter, not copperhead's own A4 pick -
    // the drafted sheet itself must carry the USLetter token, not merely a stdout claim.
    expect(fs.readFileSync(schematicPath, "utf8")).toContain('(paper "USLetter")')
    expect(result.stdout).toContain("re-paper (US Letter)")
    expect(result.stdout).toContain("fits: yes")

    // The scope disclosure (fix round 1): this verb says plainly it is a mechanical draft and
    // that repair is a separate step it did not run.
    expect(result.stdout).toContain("MECHANICAL draft")
    expect(result.stdout).toContain("does NOT run akcli repairs")

    expect(result.stdout).toContain("crossings.py")
    expect(result.stdout).toContain("junction_audit.py")
    expect(result.stdout).toContain("label_survey.py")
    expect(result.stdout).toContain("TRUE CROSSINGS")
    expect(result.stdout).toContain("ORPHAN JUNCTIONS")
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true })
  }
  // 60_000, not bun's 5000ms default: this shells out to copperhead, kicad-cli
  // and python3. It runs in seconds alone and crossed 5s twice under full-suite
  // parallel load - a timeout failure here was a lie about the code, not a defect
  // in it. 60_000 is this repository's established figure for a real-tool test.
}, 60_000)

/**
 * I-1 (fix round 1) regression: `repaperToUSLetter` on a real committed Pultec page (already
 * US Letter, already fits) must leave the fit measurement reporting "fits" - one of three
 * states (fix round 2), mirrored by the overshoot and unmeasurable-sheet tests below.
 */
test('repaperToUSLetter reports fitStatus "fits" on content that comfortably sits inside the US Letter frame', async () => {
  const repoRoot = moduleRepoRoot()
  const scratch = fs.mkdtempSync(path.join(repoRoot, "build", "repaper-test-"))
  try {
    const copy = path.join(scratch, "sheet.kicad_sch")
    fs.copyFileSync(
      path.join(repoRoot, "drafted", "pultec", "pultec-hi-cut", "pultec-hi-cut.generated-do-not-edit.kicad_sch"),
      copy,
    )
    const result = repaperToUSLetter(copy)
    expect(result.ok).toBe(true)
    expect(result.fitStatus).toBe("fits")
    expect(fs.readFileSync(copy, "utf8")).toContain('(paper "USLetter")')
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
})

/**
 * The negative half: content moved far past the US Letter frame must report `fitStatus:
 * "overflow"` rather than silently passing - the same drive-by-sabotage discipline this file's
 * other controls use, kept as a permanent regression rather than a one-off manual drive.
 */
test('repaperToUSLetter reports fitStatus "overflow" when content overshoots the frame', async () => {
  const repoRoot = moduleRepoRoot()
  const scratch = fs.mkdtempSync(path.join(repoRoot, "build", "repaper-overshoot-test-"))
  try {
    const source = path.join(
      repoRoot,
      "drafted",
      "pultec",
      "pultec-hi-cut",
      "pultec-hi-cut.generated-do-not-edit.kicad_sch",
    )
    const text = fs.readFileSync(source, "utf8")
    // Target the first (xy ...) AFTER a (wire token specifically - a bare (xy ...) earlier in
    // the file can sit inside lib_symbols' own symbol-local graphics, which the body-extent
    // measurement deliberately excludes (paper_fit.py / kicad_sheet.py), so corrupting one of
    // those would not move the number this test is driving.
    const wireIndex = text.indexOf("(wire")
    if (wireIndex === -1) throw new Error("fixture has no (wire token to corrupt a point after")
    const xyPattern = /\(xy ([\d.]+) ([\d.]+)\)/
    const rest = text.slice(wireIndex)
    const match = rest.match(xyPattern)
    if (match === null) throw new Error("fixture has no (xy ...) point after its first (wire token")
    const matchStart = wireIndex + (match.index ?? 0)
    const corrupted = text.slice(0, matchStart) + `(xy 999.0 ${match[2]})` + text.slice(matchStart + match[0].length)
    const copy = path.join(scratch, "sheet.kicad_sch")
    fs.writeFileSync(copy, corrupted)
    const result = repaperToUSLetter(copy)
    expect(result.ok).toBe(true)
    expect(result.fitStatus).toBe("overflow")
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
})

/**
 * THE FIX ROUND 2 DEFECT, as its own permanent regression. When `paper_fit.py` cannot measure
 * a sheet - here, a sheet with no body coordinates at all, the exact case the reviewer
 * reproduced - the REWRITE still succeeded (the page is still written, `ok: true`), but there
 * is no fit measurement to report. `fitStatus` must come back "unmeasured", never "overflow":
 * the earlier shape returned a bare `fits: false` for both "the tool broke" and "it does not
 * fit", which is a false finding about the board wearing a broken-check's clothes.
 */
test('repaperToUSLetter reports fitStatus "unmeasured", not "overflow", when the fit check itself cannot run', async () => {
  const repoRoot = moduleRepoRoot()
  const scratch = fs.mkdtempSync(path.join(repoRoot, "build", "repaper-unmeasured-test-"))
  try {
    const copy = path.join(scratch, "sheet.kicad_sch")
    // A syntactically valid, parseable sheet with exactly one (paper ...) token and NO wires,
    // symbols, labels or rectangles - paper_fit.py's body_extent finds nothing and refuses
    // rather than reporting an empty extent as a fit, which is the case this test drives.
    fs.writeFileSync(copy, '(kicad_sch (version 1) (generator x) (paper "A4"))')
    const result = repaperToUSLetter(copy)
    expect(result.ok).toBe(true)
    expect(result.fitStatus).toBe("unmeasured")
    expect(result.stderr).toContain("could not measure")
    expect(result.stderr).not.toContain("does not fit")
    // The rewrite itself still happened - the page is not withheld over an unmeasurable check.
    expect(fs.readFileSync(copy, "utf8")).toContain('(paper "USLetter")')
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
})

test("repaperToUSLetter refuses rather than guessing when the (paper ...) token is not exactly one match", async () => {
  const repoRoot = moduleRepoRoot()
  const scratch = fs.mkdtempSync(path.join(repoRoot, "build", "repaper-no-token-test-"))
  try {
    const copy = path.join(scratch, "sheet.kicad_sch")
    fs.writeFileSync(copy, "(kicad_sch (version 1) (generator x))")
    const result = repaperToUSLetter(copy)
    expect(result.ok).toBe(false)
    expect(result.stderr).toContain("found 0")
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
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
  // 60_000, not bun's 5000ms default: this shells out to copperhead, kicad-cli
  // and python3. It runs in seconds alone and crossed 5s twice under full-suite
  // parallel load - a timeout failure here was a lie about the code, not a defect
  // in it. 60_000 is this repository's established figure for a real-tool test.
}, 60_000)
