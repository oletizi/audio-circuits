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
import { DRAFT_TOOLS } from "../../tools/draught/draw-draft.ts"
import { RENDER_TOOLS, fitStatusFromReport, repaperToUSLetter } from "../../tools/draught/draw-render.ts"
import { derivedIntentPathFor, runDraw } from "../../tools/cli/draw.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"

/**
 * The real pinned lock, plus one tool nothing on this machine will ever answer to - named
 * "definitely-not-a-tool" itself, not merely probed with that argv, so the rendered report's
 * per-tool line (`tools/cli/draught.ts`'s `renderToolchainReport`) names it literally.
 *
 * **IT IS NOT A DRAWING-PATH TOOL, AND AFTER CONTROLLER RULING 1 THAT IS THE POINT.** A
 * disagreement on it is reported and does not block - see the advisory test below. The
 * blocking half is driven with a real drawing-path tool instead.
 */
function lockWantingAMissingTool(): Toolchain {
  return {
    ...readLock(),
    "definitely-not-a-tool": { version: "1", probe: ["definitely-not-a-tool", "--version"] },
  }
}

/**
 * CONTROLLER RULING 1, THE BLOCKING HALF: a disagreement on a tool the drawing path USES
 * refuses before anything is drafted.
 *
 * `kicad-cli` is a real `RENDER_TOOLS` member, pinned to a version nothing will ever
 * report, so the perturbation is synthetic while the TOOL is real - this must not pass by
 * naming a tool that happens to be absent on the machine running it.
 */
test("draw refuses before drafting when a tool the drawing path uses disagrees with the lock", async () => {
  const lock = { ...readLock(), "kicad-cli": { ...readLock()["kicad-cli"], version: "0.0.1-ruling-1" } }
  const result = await runDraw({ board: "pultec-hi-cut", lock })
  expect(result.exitCode).not.toBe(0)
  expect(result.drew).toBe(false)
  expect(result.stderr).toContain("kicad-cli")
  expect(result.stderr).toContain("0.0.1-ruling-1")
})

/**
 * CONTROLLER RULING 1, THE OTHER HALF, AND THE ONE THE RULING WAS MADE FOR: a disagreement
 * on a tool the drawing path does NOT use must not block the draft, and must still be
 * reported.
 *
 * Before the ruling, `runDraw` refused on ANY lock disagreement, so a missing `numpy` -
 * pinned for `framegeom.py`, which this verb never calls - stopped a page being drawn. The
 * owner's words behind `docs/known-gaps.md` G303: *"if I can't look at it, I cant decide if
 * the refusal is for dumb reasons"*, and the controller's: *"'numpy is missing' is a dumb
 * reason not to draw a schematic."*
 *
 * **BOTH HALVES ARE ASSERTED, because either alone is satisfiable the wrong way.** A test
 * that only checked the draft succeeded would pass against an implementation that dropped
 * the finding silently - which is the "a skipped check must never look like a passing one"
 * failure wearing a fix's clothes.
 */
test("a lock disagreement on a tool the drawing path does not use is reported and does not block the draft", async () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "draw-test-advisory-"))
  try {
    const result = await runDraw({ board: "pultec-hi-cut", lock: lockWantingAMissingTool(), outDir })
    expect(result.exitCode).toBe(0)
    expect(result.drew).toBe(true)
    expect(fs.existsSync(path.join(outDir, "crops", "pultec-hi-cut-whole-page.png"))).toBe(true)
    // Reported, labelled as not gating, and naming the tool.
    expect(result.stdout).toContain("definitely-not-a-tool")
    expect(result.stdout).toContain("ADVISORY")
    expect(result.stdout).toContain("does not block this draft")
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true })
  }
}, 60_000)

/**
 * RULING 1'S DECLARATION CANNOT GO STALE SILENTLY: the set of drawing-path tools is
 * cross-checked against the source of the three modules that make up that path.
 *
 * `DRAFT_TOOLS` and `RENDER_TOOLS` are hand-written beside their own `spawnSync` calls,
 * which is the right home for them - but a hand-written list is exactly what this branch
 * has twice found going stale (`VENDORED_CHECKOUT_NAMES`' six copies, the `make help`
 * verb). So: for every tool in the lock, its resolver identifier must appear in those
 * modules' source if and only if the tool is declared. A tool whose resolver gets called
 * from the draw path without being declared would otherwise fail LATER, with a worse
 * message, in the middle of a draft.
 *
 * `RESOLVER_FOR` must cover every key of the real lock, asserted first - a table that
 * silently skips a tool is a check that cannot fail for it.
 */
const RESOLVER_FOR: Readonly<Record<string, string>> = {
  copperhead: "defaultCopperheadTsx",
  "kicad-cli": "defaultKicadCli",
  magick: "defaultMagick",
  akcli: "defaultAkcli",
  qpdf: "defaultQpdf",
  numpy: "defaultAkcliVenvPython",
  pillow: "defaultAkcliVenvPython",
}

test("the drawing-path tool declaration matches what the drawing-path modules actually resolve", () => {
  const lock = readLock()
  const uncovered = Object.keys(lock).filter((tool) => RESOLVER_FOR[tool] === undefined)
  expect(
    uncovered,
    "these lock tools have no resolver identifier in this test's table, so nothing below checks " +
      "them. Add each one before relying on this test.",
  ).toEqual([])

  const repoRoot = moduleRepoRoot()
  const source = ["tools/cli/draw.ts", "tools/draught/draw-draft.ts", "tools/draught/draw-render.ts"]
    .map((file) => fs.readFileSync(path.join(repoRoot, file), "utf8"))
    .join("\n")
  // Only the CODE, so the prose in those modules' comments (which names akcli, numpy and
  // pillow at length, precisely to say they are NOT used here) cannot satisfy this.
  const code = source
    .split("\n")
    .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line))
    .join("\n")

  const declared = [...DRAFT_TOOLS, ...RENDER_TOOLS]
  const wrong: string[] = []
  for (const [tool, resolver] of Object.entries(RESOLVER_FOR)) {
    if (lock[tool] === undefined) continue
    const resolved = new RegExp(String.raw`\b${resolver}\(`).test(code)
    const isDeclared = declared.includes(tool)
    if (resolved && !isDeclared) wrong.push(`${tool}: the draw path calls ${resolver}() but does not declare it`)
    if (!resolved && isDeclared) wrong.push(`${tool}: declared as a drawing-path tool but ${resolver}() is never called`)
  }
  expect(
    wrong,
    "DRAFT_TOOLS (tools/draught/draw-draft.ts) and RENDER_TOOLS (tools/draught/draw-render.ts) are " +
      "what runDraw's pre-draft gate refuses on - controller Ruling 1. A tool missing from them is " +
      "a tool whose absence surfaces as a late, worse error in the middle of a draft; a tool listed " +
      "in them but never called blocks a page for no reason.",
  ).toEqual([])
})

test("a board with no intent from either source refuses, naming the board and both sources", async () => {
  // pultec-mid has a page under drafted/pultec/, no COMMITTED_INTENT entry, and its circuit
  // module exports no drawingIntent - so there is nothing to draft from, and it must refuse
  // rather than guess.
  const result = await runDraw({ board: "pultec-mid" })
  expect(result.exitCode).not.toBe(0)
  expect(result.drew).toBe(false)
  expect(result.stderr).toContain("pultec-mid")
  expect(result.stderr).toContain("COMMITTED_INTENT")
  expect(result.stderr).toContain("drawingIntent")
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

    // CONTROLLER RULING 2: the suite's own selftest runs FIRST, which is what spec §2
    // asks for and what runMeasurementSuite did not do. The ordering is the whole of the
    // finding - the control itself was never lost, since ./measure-suite.test.ts runs
    // selftest.py on every bun test - so this asserts the POSITION, not merely the
    // presence. A test that only checked it appeared would pass with it printed last,
    // which is the state the ruling corrected.
    expect(result.stdout).toContain("selftest.py")
    expect(result.stdout).toContain("every one moved or fired")
    const selftestAt = result.stdout.indexOf("selftest.py")
    for (const script of ["crossings.py", "junction_audit.py", "label_survey.py"]) {
      expect(selftestAt, `selftest.py must be reported before ${script}`).toBeLessThan(
        result.stdout.indexOf(script),
      )
    }
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true })
  }
  // 60_000, not bun's 5000ms default: this shells out to copperhead, kicad-cli
  // and python3. It runs in seconds alone and crossed 5s twice under full-suite
  // parallel load - a timeout failure here was a lie about the code, not a defect
  // in it. 60_000 is this repository's established figure for a real-tool test.
}, 60_000)

/**
 * Fix round 1: the model-authoritative path end to end - no earlier test here drives
 * `runDraw` all the way through a `drawingIntent()` export rather than a committed file.
 * transistor-preamp-staged's circuit module exports one (../../circuits/transistor-preamp/
 * staged-board.ts, generated by tools/draught/intent-from-network.ts), so this is the real
 * run for the derived path, not a synthetic one: draft, re-paper, render and measure, and the
 * derived intent written beside outDir (../../tools/cli/draw.ts's own module comment).
 */
test("a real draw of transistor-preamp-staged drafts from its circuit's drawingIntent() export", async () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "draw-test-derived-"))
  const derivedIntentPath = derivedIntentPathFor(outDir)
  try {
    const result = await runDraw({ board: "transistor-preamp-staged", outDir })
    expect(result.exitCode).toBe(0)
    expect(result.drew).toBe(true)
    expect(result.stdout).toContain(derivedIntentPath)
    expect(fs.existsSync(derivedIntentPath)).toBe(true)
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true })
    fs.rmSync(derivedIntentPath, { force: true })
  }
  // 60_000, the same established figure the real hi-cut draw test above uses: this
  // shells out to copperhead, kicad-cli and python3, and a timeout failure here would
  // be a lie about the code, not a defect in it.
}, 60_000)

/**
 * Minor 8, final review: a trailing-slash `outDir` must still derive a path
 * BESIDE `outDir`, never inside it - `draftWithCopperhead` empties `outDir`
 * with `rmSync` before every draft, so a derived intent landing inside it
 * would not survive to be read. Before the fix this was
 * `${outDir}.intent.json`, a bare template that turns "build/draw/foo/" into
 * "build/draw/foo/.intent.json" - inside the directory, not beside it. No
 * real tool runs here; this is the path computation alone.
 */
test("derivedIntentPathFor normalises a trailing slash so the path lands beside outDir, not inside it", () => {
  const withoutSlash = derivedIntentPathFor("/tmp/build/draw/some-board")
  const withSlash = derivedIntentPathFor("/tmp/build/draw/some-board/")
  expect(withSlash).toBe(withoutSlash)
  expect(withSlash.startsWith("/tmp/build/draw/some-board/")).toBe(false)
  expect(withSlash).toBe("/tmp/build/draw/some-board.intent.json")
})

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
