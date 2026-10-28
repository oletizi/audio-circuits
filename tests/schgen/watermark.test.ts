/**
 * **THE TWO MARKS AN UNRATIFIED DRAWING CARRIES, ASSERTED IN BOTH DIRECTIONS** - Task 5 of
 * `docs/superpowers/plans/2026-10-27-gates-classify.md`, against
 * `docs/superpowers/specs/2026-10-27-gates-ratify-they-do-not-hide-design.md` (revision 4), whose
 * authority is `docs/known-gaps.md` **G303**.
 *
 * The owner, on whether the mark is a title-block field or a watermark across the drawing:
 *
 * > *"Both. A watermark over the drawing that declares the drawing defective is a critical safety
 * > signal to NOT USE the drawing at the bench. As such, an unusable schematic doesn't need to be
 * > easy to read - it just needs to be possible to read"*
 *
 * **BOTH DIRECTIONS, BECAUSE ONE OF THEM IS THE ONE AN UNCONDITIONAL STAMP WOULD PASS.** A test
 * that only checked that a defective sheet is marked would go green on a generator that marked
 * every sheet it ever wrote, which would make the warning worthless by making it universal. The
 * sweep over the real census is what has teeth here: ten of the eleven boards are `usable` today,
 * and every one of them must come out clean.
 *
 * **AND THE OTHER DIRECTION HAS NO REAL BOARD TO STAND ON, WHICH IS WHY THERE IS A FIXTURE.** Zero
 * boards are `defective`, so nothing in `boards/` emits a watermark at all.
 * `tools/schgen/defective-fixture.ts` re-emits one real board's real geometry under one fabricated
 * `defective` finding; without it the mark would be code no test has ever caused to run.
 *
 * **A PASSING TEST IS NOT EVIDENCE THAT THE PAGE IS READABLE.** Nothing here establishes the weight
 * the owner set the bar for - only that the marks are present, that they survive `kicad-cli`, and
 * that they change no electrical reading of the sheet. The page itself was rendered and read in
 * `.superpowers/sdd/2026-10-27-gates-classify/task-5-report.md`; `CLAUDE.md`'s rule stands - render
 * it, print it, read it.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"
import type { RefusalClass } from "../../lib/schgen/findings.ts"
import { PAPER } from "../../lib/schgen/render/sheets.ts"
import { bandSize, markBandText, markItems, markStatusComment } from "../../lib/schgen/render/unratified-mark.ts"
import { defectiveFixture, writeFixture, FIXTURE_BOARD, type DefectiveFixture } from "../../tools/schgen/defective-fixture.ts"
import { boardSheetsCensus, type BoardSheets } from "../../tools/schgen/board-sheets.ts"
import { exportNetlist, exportPdf } from "../../tools/schgen/kicad-run.ts"

const REPO_ROOT = path.resolve(import.meta.dir, "../..")

const CLASSES: readonly RefusalClass[] = ["usable", "defective", "not-drawable", "generator-defect"]

/** Every string either mark can put on a sheet, for the direction that asserts a sheet carries NONE of them. */
const EVERY_MARK: readonly string[] = CLASSES.flatMap((c) => [markBandText(c), markStatusComment(c)]).filter((s): s is string => s !== null)

describe("which classes are marked, and which is not", () => {
  test("usable is the only unmarked class, in both marks", () => {
    expect(markBandText("usable")).toBeNull()
    expect(markStatusComment("usable")).toBeNull()
    for (const cls of CLASSES.filter((c) => c !== "usable")) {
      expect(markBandText(cls), `${cls} must carry a watermark`).not.toBeNull()
      expect(markStatusComment(cls), `${cls} must carry a title-block comment`).not.toBeNull()
    }
  })

  test("every mark says DO NOT BUILD, which is the whole message", () => {
    for (const mark of EVERY_MARK) expect(mark).toContain("DO NOT BUILD")
  })

  test("a usable sheet gets no watermark items at all", () => {
    expect(markItems("x", PAPER.A3, "usable")).toEqual([])
  })

  test("a marked sheet gets four bands, each with its own key", () => {
    const items = markItems("proj:sheet", PAPER.A3, "defective")
    expect(items.length).toBe(4)
    expect(new Set(items.map((i) => i.key)).size).toBe(items.length)
    for (const i of items) expect(i.key.startsWith("mark:proj:sheet:")).toBe(true)
  })

  // The band is sized from the paper, so it must land INSIDE the page on every paper this
  // generator can produce. A band wider than its page is clipped mid-word, which is how the first
  // probe lost the D of DEFECTIVE and the D of BUILD.
  test("a band fits its page, on every paper size and for every marked class", () => {
    for (const paper of Object.values(PAPER)) {
      for (const cls of CLASSES.filter((c) => c !== "usable")) {
        const line = markBandText(cls)
        if (line === null) throw new Error(`${cls} has no band text, which the test above already forbids`)
        const width = line.length * bandSize(paper, line)
        expect(width, `${cls} on a ${paper.w} um page`).toBeLessThan(paper.w)
        expect(width, `${cls} on a ${paper.w} um page is too small to be a warning`).toBeGreaterThan(paper.w * 0.75)
      }
    }
  })

  // A title-block comment is printed in a fixed-width strip; the operative words of these lines are
  // at the end, so a line that overruns loses exactly the part that matters.
  test("a status comment is short enough for KiCad's title-block strip", () => {
    for (const cls of CLASSES) {
      const comment = markStatusComment(cls)
      if (comment !== null) expect(comment.length, `${cls}'s comment`).toBeLessThanOrEqual(80)
    }
  })
})

describe("the deliberately defective fixture", () => {
  let fixture: DefectiveFixture | null = null
  let dir = ""

  beforeAll(async () => {
    dir = freshTempScratch("watermark-fixture-")
    fixture = await defectiveFixture(REPO_ROOT, path.join(dir, "scratch"))
  }, 300_000)

  afterAll(cleanUpTempScratch)

  /** A `beforeAll` that threw leaves this null, and an empty sweep passes every loop below silently. */
  function built(): DefectiveFixture {
    if (fixture === null) throw new Error("the defective fixture did not build: defectiveFixture threw in beforeAll")
    return fixture
  }

  const sheetOf = (files: ReadonlyMap<string, string>, name: string): string => {
    const text = files.get(name)
    if (text === undefined) throw new Error(`the fixture's file set has no ${name}`)
    return text
  }

  test("it is built from a real board that really draws", () => {
    expect(built().board).toBe(FIXTURE_BOARD)
    expect(built().sheetFiles.length, "a root and at least one child sheet").toBeGreaterThan(1)
  })

  test("EVERY sheet of the marked set carries BOTH marks, the root included", () => {
    for (const name of built().sheetFiles) {
      const text = sheetOf(built().marked, name)
      expect(text, `${name} must carry the watermark`).toContain(`(text "${markBandText("defective")}"`)
      expect(text, `${name} must carry the title-block comment`).toContain(`(comment 1 "${markStatusComment("defective")}")`)
    }
  })

  test("EVERY sheet of the ratified set carries NEITHER, over the same geometry", () => {
    for (const name of built().sheetFiles) {
      const text = sheetOf(built().ratified, name)
      for (const mark of EVERY_MARK) expect(text, `${name} is usable and must carry no mark`).not.toContain(mark)
    }
  })

  // **THE DRAWING UNDERNEATH IS THE SAME DRAWING**, which is what "the gate classifies, it does not
  // hide" means at file level: the mark adds items and removes none.
  test("the mark adds items and changes no drawn item", () => {
    for (const name of built().sheetFiles) {
      const clean = sheetOf(built().ratified, name)
      const marked = sheetOf(built().marked, name)
      for (const item of ["(symbol ", "(wire ", "(global_label ", "(junction ", "(rectangle"]) {
        const count = (s: string): number => s.split(item).length - 1
        expect(count(marked), `${name}: ${item.trim()} count must not change`).toBe(count(clean))
      }
      expect(marked.length, `${name} must have grown by the mark`).toBeGreaterThan(clean.length)
    }
  })
})

describe("kicad-cli reads a marked sheet", () => {
  let dir = ""
  let markedRoot = ""
  let ratifiedRoot = ""

  beforeAll(async () => {
    dir = freshTempScratch("watermark-kicad-")
    const fixture = await defectiveFixture(REPO_ROOT, path.join(dir, "scratch"))
    writeFixture(path.join(dir, "marked"), fixture.marked)
    writeFixture(path.join(dir, "ratified"), fixture.ratified)
    markedRoot = path.join(dir, "marked", fixture.rootFile)
    ratifiedRoot = path.join(dir, "ratified", fixture.rootFile)
  }, 300_000)

  afterAll(cleanUpTempScratch)

  // **IT FAILS RATHER THAN SKIPS.** `CLAUDE.md`: KiCad is a required tool here, not an optional
  // extra, and a watermark KiCad cannot read is a finding rather than something to engineer around.
  test("the marked schematic exports to PDF", () => {
    const pdf = path.join(dir, "marked.pdf")
    exportPdf(markedRoot, pdf)
    expect(fs.existsSync(pdf)).toBe(true)
    expect(fs.statSync(pdf).size, "an empty PDF is not an export").toBeGreaterThan(10_000)
  }, 300_000)

  /**
   * **THE OBLIGATION-5 EXEMPTION, MEASURED RATHER THAN ASSERTED.**
   *
   * `lib/schgen/elk/adapt.ts` exempts the mark from obligation 5 on the ground that it is not
   * circuit geometry - no net, no pin, no connectivity. That is a claim about what KiCad makes of
   * the file, so KiCad is asked: the components, their pins and every net of the marked sheet must
   * come back byte for byte what the unmarked one gives.
   *
   * **THE `<design>` HEADER IS EXCLUDED, AND NAMING WHAT IT HOLDS IS THE POINT OF EXCLUDING IT.**
   * It carries the source path, the export timestamp and the title-block comments - so it differs
   * between any two exports, and it differs HERE for a reason that is the mechanism working: the
   * status comment is a title-block field and KiCad reports title-block fields. That is the second
   * mark showing up in a netlist, not the watermark leaking into the circuit. Everything from
   * `<components>` on is the circuit, and that is what is compared.
   */
  test("the mark changes no component, no pin and no net KiCad reads", () => {
    const circuitPart = (xml: string): string => {
      const at = xml.indexOf("<components>")
      if (at === -1) throw new Error(`the exported netlist has no <components> section:\n${xml.slice(0, 400)}`)
      return xml.slice(at)
    }
    const marked = exportNetlist(markedRoot).xml
    const ratified = exportNetlist(ratifiedRoot).xml
    expect(circuitPart(marked)).toBe(circuitPart(ratified))
    // The exclusion above must not be able to hide an empty comparison.
    expect(circuitPart(ratified).length, "the compared section is too short to be a netlist").toBeGreaterThan(1000)
    // And the header really does differ, which is what the exclusion is for.
    expect(marked).toContain(`value="${markStatusComment("defective")}"`)
    expect(ratified).not.toContain("UNRATIFIED")
  }, 300_000)
})

describe("both directions over all eleven boards", () => {
  let census: readonly BoardSheets[] = []
  let outDir = ""

  beforeAll(async () => {
    outDir = freshTempScratch("watermark-census-")
    census = await boardSheetsCensus(REPO_ROOT, { outDir, pdf: false })
  }, 300_000)

  afterAll(cleanUpTempScratch)

  function rows(): readonly BoardSheets[] {
    expect(census.length, "the census did not run, and an empty census passes every sweep below").toBeGreaterThan(0)
    return census
  }

  /** Every `.kicad_sch` the census wrote for one board. */
  const sheetsOf = (r: BoardSheets): readonly string[] =>
    r.files.filter((f) => f.endsWith(".kicad_sch") && path.basename(f) !== "REFUSAL.kicad_sch")

  test("the sweep is not vacuous: boards exist, and some of them are usable", () => {
    expect(rows().length).toBe(11)
    expect(rows().filter((r) => r.outcome === "usable").length, "no usable board means the clean direction below proves nothing").toBeGreaterThan(0)
  })

  test("a usable board's every sheet carries NEITHER mark - an unconditional stamp fails here", () => {
    for (const r of rows().filter((x) => x.outcome === "usable")) {
      const sheets = sheetsOf(r)
      expect(sheets.length, `${r.board} is usable but wrote no sheet`).toBeGreaterThan(0)
      for (const file of sheets) {
        const text = fs.readFileSync(file, "utf8")
        for (const mark of EVERY_MARK) {
          expect(text, `${path.basename(file)} of usable board ${r.board} carries the mark "${mark}"`).not.toContain(mark)
        }
      }
    }
  })

  test("a defective board's every sheet carries BOTH marks", () => {
    for (const r of rows().filter((x) => x.outcome === "defective")) {
      const sheets = sheetsOf(r)
      expect(sheets.length, `${r.board} is defective but wrote no sheet`).toBeGreaterThan(0)
      for (const file of sheets) {
        const text = fs.readFileSync(file, "utf8")
        expect(text, `${path.basename(file)} of ${r.board}`).toContain(`(text "${markBandText("defective")}"`)
        expect(text, `${path.basename(file)} of ${r.board}`).toContain(`(comment 1 "${markStatusComment("defective")}")`)
      }
    }
  })

  // **THE RECORD OF WHAT THIS RUN FOUND, which is a measurement and not an expectation.** Zero
  // defective boards is why the fixture above exists; if this ever stops being zero, the sweep
  // above starts doing real work and this line is how a reader notices.
  test("no board in boards/ is defective today, so the fixture is the only exercise of the mark", () => {
    expect(rows().filter((r) => r.outcome === "defective").map((r) => r.board)).toEqual([])
  })

  test("a board with no drawing writes no sheet to mark, only its refusal page", () => {
    for (const r of rows().filter((x) => x.schematicRoot === undefined)) {
      expect(sheetsOf(r), `${r.board} produced no drawing, so there is no sheet to classify`).toEqual([])
      expect(r.files.some((f) => path.basename(f) === "REFUSAL.kicad_sch"), `${r.board} must still have an artifact`).toBe(true)
    }
  })
})
