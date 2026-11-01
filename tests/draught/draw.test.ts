// tests/draught/draw.test.ts
//
// Task 5 of .superpowers/sdd/2026-10-30-institutionalise-draughting: `make
// draw`, the verb that absorbs the mechanics five run directories under
// docs/research/ each hand-wrote. See tools/cli/draw.ts's own module comment
// for the order (check the toolchain; resolve the intent; verify it against
// the model; draft; render; measure; crop) and for why it never withholds a
// page over anything but a connectivity disagreement.
//
// EVERY SCRATCH DIRECTORY HERE IS UNDER `os.tmpdir()`, AND THAT IS THE FINAL
// REVIEW'S CRITICAL FINDING (C-1), NOT A STYLE CHOICE. Seven `mkdtempSync`
// calls in this file used to target a repository-root `build/` directory.
// `build/` is gitignored and committed by nothing (`git ls-files build` is
// empty), nothing under `tests/`, `tools/` or `lib/` creates it, and
// `fs.mkdtempSync` into a missing parent throws `ENOENT` - so on a fresh
// clone this file failed before reaching anything it is about, which is the
// same "a timeout failure here was a lie about the code" shape the two
// 60_000 comments below argue against. `os.tmpdir()` is what every other
// `mkdtemp` site in this suite uses; it also brings these prefixes inside
// `make prune-temp`'s derivation (`tools/stripboard/prune-temp.ts`'s
// `derivePrefixes`), which reads the temp-call-then-`path.join`-then-literal
// form out of these sources and could never have seen a `build/` path.
//
// THE CALL IS NOT WRITTEN OUT IN THIS COMMENT, AND THE FULL SUITE IS WHY.
// `tests/stripboard/temp-scratch.test.ts` counts the scratch-call token in a
// file and compares that against the number of named `const` assignments of
// it, so naming the call in PROSE reports this file as having an unnamed
// scratch site - a finding about the comment, not about any code. Spelling it
// out here cost one full-suite failure; `tests/kicad/footprint-sweep.ts`'s own
// header records the same discipline for the same reason.
import { expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { readLock, type Toolchain } from "../../tools/draught/toolchain.ts"
import { fitStatusFromReport, repaperToUSLetter } from "../../tools/draught/draw-render.ts"
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
  const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), "draw-test-"))
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
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "draw-test-real-"))
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
    // M-5: the fit MEASUREMENT must have run and answered - not a particular
    // answer. This asserted `"fits: yes"` literally, which makes a legitimate
    // future overflow read as a test failure, when an overflow is a finding
    // about a board and never a withholding ground (EVALUATING-DRAWINGS.md
    // §3). Either token satisfies it; silence does not, which is the state
    // `fitStatusFromReport` calls "unmeasured".
    expect(result.stdout).toMatch(/fits: (yes|no)/)

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
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "repaper-test-"))
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
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "repaper-overshoot-test-"))
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
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "repaper-unmeasured-test-"))
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

/**
 * M-3 as a unit, because the third state is not reachable through a real
 * `paper_fit.py` without rewording that script - which is the very edit this
 * guards against. `fitStatusFromReport` is the whole decision, so the three
 * cases are driven directly: the two tokens, and an exit-0 report carrying
 * neither. The last one used to come back `"overflow"` - a finding about a
 * board, invented out of a check that did not answer.
 */
test("fitStatusFromReport answers from both tokens, and calls a report with neither unmeasured", () => {
  expect(fitStatusFromReport("content extent x: 1.000 .. 2.000\nfits: yes")).toBe("fits")
  expect(fitStatusFromReport("content extent x: 1.000 .. 2.000\n  overshoot east: 4.530 mm\nfits: no")).toBe("overflow")
  // A plausible rewording of that final line, which is all it would take.
  expect(fitStatusFromReport("content extent x: 1.000 .. 2.000\nfit: inside the frame")).toBe("unmeasured")
  expect(fitStatusFromReport("")).toBe("unmeasured")
})

test("repaperToUSLetter refuses rather than guessing when the (paper ...) token is not exactly one match", async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "repaper-no-token-test-"))
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

/**
 * M-7: THE SNAPSHOT IS RECURSIVE, AND IT WAS NOT.
 *
 * This read every entry of a non-recursive `readdirSync` with
 * `readFileSync`, so the first subdirectory anyone adds under
 * `drafted/pultec/pultec-hi-cut/` would make it throw `EISDIR` - a crash
 * about a directory entry, in a test whose subject is whether a file changed.
 * It also saw nothing INSIDE such a subdirectory, so a write there would have
 * passed. Keyed by path relative to the root so a failure names the file.
 */
function contentsByRelativePath(root: string): Record<string, string> {
  const out: Record<string, string> = {}
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else out[path.relative(root, full)] = fs.readFileSync(full).toString("base64")
    }
  }
  walk(root)
  return out
}

test("nothing here touches drafted/ - the real run writes only its own outDir", async () => {
  const repoRoot = moduleRepoRoot()
  const draftedHiCut = path.join(repoRoot, "drafted", "pultec", "pultec-hi-cut")
  const before = contentsByRelativePath(draftedHiCut)
  // The snapshot must have something in it, or comparing two empty objects
  // below would pass having compared nothing.
  expect(Object.keys(before).length).toBeGreaterThan(0)
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "draw-test-untouched-"))
  try {
    await runDraw({ board: "pultec-hi-cut", outDir })
    expect(contentsByRelativePath(draftedHiCut)).toEqual(before)
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true })
  }
  // 60_000, not bun's 5000ms default: this shells out to copperhead, kicad-cli
  // and python3. It runs in seconds alone and crossed 5s twice under full-suite
  // parallel load - a timeout failure here was a lie about the code, not a defect
  // in it. 60_000 is this repository's established figure for a real-tool test.
}, 60_000)
