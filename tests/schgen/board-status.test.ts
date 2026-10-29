/**
 * **EVERY BOARD GETS AN ARTIFACT, AND THE ARTIFACT CARRIES ITS CLASS.**
 *
 * Hand-written for Task 4 of `docs/superpowers/plans/2026-10-27-gates-classify.md`, against
 * `docs/superpowers/specs/2026-10-27-gates-ratify-they-do-not-hide-design.md` (revision 4), whose
 * authority is `docs/known-gaps.md` **G303**.
 *
 * The owner, after four attempts to get past a gate produced no picture: *"this is a persistent
 * pathology: a gate halts rendering and we never look at the picture so we can't tell if the gate
 * is insane or not"*, then *"gates can still refuse to ratify an output, but they shouldn't HIDE
 * the output. The output should still be available, but clearly classified as unratified."*
 *
 * **THIS FILE RUNS THE CENSUS, which had exactly one caller before it: its own `import.meta.main`.**
 * A census nothing but a CLI invokes is a measurement that no committed check can disagree with.
 *
 * **WHAT IS COMMITTED HERE AND WHAT IS DELIBERATELY NOT.** **Every one of the eleven boards
 * produces a drawing**, and no board is `generator-defect`. **The usable/defective split is NOT
 * asserted**, and that is the spec's instruction rather than an omission: revision 2 of the spec
 * predicted a split and Codex disproved it from a gate its table had missed, so predicting again
 * before the refusal sites were enumerated would be guessing twice. What the run reported on
 * 2026-10-27 is recorded in the task report, not pinned here.
 *
 * **THIS SAID `pultec-mid` IS `not-drawable` UNTIL 2026-10-29**, and it was the last board that
 * was. It refused at `pinsDeclared` because `SW_MID` - the eleven-position mid-frequency selector,
 * drawn with `Switch:SW_Rotary_1x12` on the owner's part choice of a twelve-position switch with
 * its stop set to eleven - left pin 12, the unused twelfth detent, neither on a net nor declared.
 * Declaring that one pin no-connect by number through `ComponentOverride.ncPins` closed it;
 * `tests/schgen/nc-pins.test.ts` is where that mechanism's arms live, including the negative
 * controls that prove `pinsDeclared` still refuses an undeclared pin. **`pultec-mid` now draws and
 * is classified `defective`** on one `missing-junction` finding, which is a different question
 * from this one and the first time anybody could see it - `CLAUDE.md`'s **G303**: *"a gate halts
 * rendering and we never look at the picture so we can't tell if the gate is insane or not"*.
 *
 * **AND A PASSING TEST IS NOT EVIDENCE THAT A PAGE IS WORTH LOOKING AT.** Nothing below establishes
 * that any of these drawings is readable. Three of them were rendered to PNG and read by a person
 * for the first time in this task; that reading is in
 * `.superpowers/sdd/2026-10-27-gates-classify/task-4-report.md` and `CLAUDE.md`'s rule stands -
 * render it, print it, read it.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"
import { worstClass, type RefusalClass } from "../../lib/schgen/findings.ts"
import {
  BOARD_OUTPUT_DIR,
  boardOutputRoot,
  prepareBoardOutput,
  refusalSheet,
  refusalSheetLines,
  statusMarkdown,
  type BoardStatus,
} from "../../tools/schgen/board-artifacts.ts"
import {
  boardDirectoryNames,
  boardSheetsCensus,
  classWithoutDrawing,
  renderBoardSheets,
  type BoardSheets,
} from "../../tools/schgen/board-sheets.ts"

const REPO_ROOT = path.resolve(import.meta.dir, "../..")

/**
 * The board directory names, read here with `fs` and nothing else.
 *
 * **IT IS NOT `boardRefs` AND NOT `boardDirectoryNames` EITHER**, although the second reads the
 * same names: the census calls that one, so asserting the census against it would compare a list
 * to a list it was built from. `docs/schematic/false-greens.md` catalogues that mechanism. The
 * anchor is the count, which `tests/schgen/board-declarations.test.ts` also pins at eleven.
 */
const BOARD_DIRS: readonly string[] = fs
  .readdirSync(path.join(REPO_ROOT, "boards"), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort()

/** True when any character of `s` is below the first printable one. No escape is typed; the code builds it. */
const hasControlByte = (s: string): boolean => [...s].some((c) => c.charCodeAt(0) < 32)

const CLASSES: readonly RefusalClass[] = ["usable", "defective", "not-drawable", "generator-defect"]

let CENSUS: readonly BoardSheets[] = []
let OUT_DIR = ""

// **THE EXPLICIT TIMEOUT IS LOAD-BEARING.** One census is eleven generations - about five and a
// half seconds on this machine - and bun's default hook timeout is five, so without it this file
// fails on a busy machine for a reason that has nothing to do with what it asserts.
beforeAll(async () => {
  OUT_DIR = freshTempScratch("board-status-")
  CENSUS = await boardSheetsCensus(REPO_ROOT, { outDir: OUT_DIR, pdf: false })
}, 300_000)

// The census directory holds eleven generations and must outlive every test in this file, so it is
// registered rather than removed in the scope that made it - `tests/support/temp-scratch.ts` is
// the one registry, and `tests/stripboard/temp-scratch.test.ts` fails any mkdtemp site that does
// neither. The `prepareBoardOutput` fixture below removes its own directory in its own scope,
// which is the other accepted shape.
afterAll(cleanUpTempScratch)

/**
 * Every test below starts here.
 *
 * **A `beforeAll` THAT THREW LEAVES `CENSUS` EMPTY, AND AN EMPTY SWEEP PASSES EVERY `for` LOOP
 * SILENTLY.** `CLAUDE.md`: a skipped check must never look like a passing one. This is the guard
 * that turns that into a named failure rather than a green run over nothing.
 */
function census(): readonly BoardSheets[] {
  expect(CENSUS.length, "the census did not run: boardSheetsCensus threw in beforeAll, and an empty census passes every sweep below").toBeGreaterThan(0)
  return CENSUS
}

const row = (board: string): BoardSheets => {
  const found = census().find((r) => r.board === board)
  if (found === undefined) throw new Error(`no census row for ${board}; this test names that board deliberately`)
  return found
}

describe("the census covers boards/ exactly", () => {
  test("boards/ holds eleven directories, so the sweeps below iterate something", () => {
    expect(BOARD_DIRS.length).toBe(11)
  })

  test("every board directory has exactly one row, and every row names a board directory", () => {
    const names = census().map((r) => r.board)
    expect([...names].sort()).toEqual([...BOARD_DIRS])
    expect(new Set(names).size, "no board is counted twice").toBe(names.length)
  })

  test("boardDirectoryNames, which the census asserts against, reads the same set", () => {
    expect([...boardDirectoryNames(REPO_ROOT)]).toEqual([...BOARD_DIRS])
  })
})

describe("the committed expectations, which this run may disagree with", () => {
  test("NO BOARD is not-drawable: every circuit validates, so geometry exists for all eleven", () => {
    // The last one that did not was `pultec-mid` - see this file's header for the pin and the fix.
    // Asserted as a LIST rather than a count, because a board that falls back out of drawing is a
    // thing to read rather than a number to compare.
    expect(census().filter((r) => r.outcome === "not-drawable").map((r) => r.board)).toEqual([])
    expect(census().filter((r) => r.findings.some((f) => f.kind === "circuit-invalid")).map((r) => r.board)).toEqual([])
  })

  test("pultec-mid, the board that was not-drawable, now draws - and its findings are about the DRAWING", () => {
    const r = row("pultec-mid")
    expect(r.schematicRoot, "pultec-mid produced no drawing; the ncPins declaration for SW_MID pin 12 is what unblocked it").toBeDefined()
    expect(r.drawings.length).toBeGreaterThan(0)
    // NOT `circuit-invalid`: the circuit is valid now, and whatever is left is a property of the
    // geometry. The class itself is deliberately not asserted - see this file's header.
    expect(r.findings.map((f) => f.kind)).not.toContain("circuit-invalid")
    expect(["usable", "defective"]).toContain(r.outcome)
  })

  test("NO BOARD IS generator-defect; one that is would be a bug report, not a status", () => {
    const defects = census().filter((r) => r.outcome === "generator-defect")
    expect(
      defects.map((r) => `${r.board}: ${r.blocker}`),
      "a generator-defect means an invariant of the schematic generator broke. It is NOT a property " +
        "of the circuit and NOT a board status: fix the generator, or convert the plain Error that " +
        "reached tools/schgen/board-sheets.ts into a SchgenRefusal carrying its findings.",
    ).toEqual([])
  })

  test("every board produces a drawing, classified usable or defective", () => {
    for (const r of census()) {
      expect(r.schematicRoot, `${r.board} produced no drawing; a gate was misclassified`).toBeDefined()
      expect(r.drawings.length, `${r.board} wrote a schematic root but drew no sheet`).toBeGreaterThan(0)
      // The split between the two is NOT asserted - see this file's header for why.
      expect(["usable", "defective"], `${r.board} drew something, so it is one of the two classes that mean "a drawing exists"`).toContain(r.outcome)
    }
  })

  test("every row's class is one of the four, and is the one its own findings give it", () => {
    for (const r of census()) {
      expect(CLASSES, `${r.board}`).toContain(r.outcome)
      // The class is READ OFF the findings, never set beside them: a row whose class and evidence
      // disagree is the thing a reader cannot check by looking.
      const expected = r.schematicRoot === undefined ? classWithoutDrawing(worstClass(r.findings)) : worstClass(r.findings)
      expect(r.outcome, `${r.board}: the class must follow from its own findings`).toBe(expected)
      if (r.findings.length === 0) expect(r.blocker, `${r.board} has no findings, so nothing should be blocking it`).toBe("")
    }
  })

  test("every board is declared, so no row is a check that was skipped", () => {
    expect(census().filter((r) => !r.declared).map((r) => r.board)).toEqual([])
  })
})

describe("every board has an artifact on disk a person can open", () => {
  test("a STATUS.md names the class, for every board including the clean ones", () => {
    for (const r of census()) {
      const status = path.join(OUT_DIR, r.board, "STATUS.md")
      expect(fs.existsSync(status), `${r.board} has no STATUS.md`).toBe(true)
      const textOf = fs.readFileSync(status, "utf8")
      expect(textOf, `${r.board}'s STATUS.md must name its class`).toContain(r.outcome.toUpperCase())
      expect(textOf).toContain(r.board)
      for (const f of r.findings) expect(textOf, `${r.board}'s STATUS.md must carry finding ${f.kind}`).toContain(f.kind)
    }
  })

  // **BOTH HALVES OF THIS STILL FAIL IF THEY ARE WRONG, although no board takes the first branch
  // today**: every board must be shown to have a drawing on disk AND no refusal page beside it, so
  // a board that stops drawing is caught here by name. The refusal page's own CONTENT is asserted
  // against a fabricated status in the test below, for the reason given there.
  test("a board with no drawing gets a one-page refusal sheet; one with a drawing gets none", () => {
    for (const r of census()) {
      const sheet = path.join(OUT_DIR, r.board, "REFUSAL.kicad_sch")
      expect(fs.existsSync(sheet), `${r.board}: a refusal sheet exists exactly when no drawing does`).toBe(r.schematicRoot === undefined)
      if (r.schematicRoot !== undefined) expect(fs.existsSync(r.schematicRoot), `${r.board}'s schematic root was reported but not written`).toBe(true)
    }
  })

  /**
   * **BUILT BY HAND, because no real board is `not-drawable` any more.** It read `pultec-mid`'s
   * own `REFUSAL.kicad_sch` until that board began to draw, and the honest replacement is a
   * fabricated status rather than a deleted test: the refusal page is still the artifact a board
   * gets when its circuit does not validate, and a page nothing has ever caused to be written is a
   * page nobody has read. The reason text is the refusal `pinsDeclared` actually produced for
   * `SW_MID` pin 12, so what it asserts is a shape this generator really emits.
   */
  test("the refusal sheet names the board and the reason, and draws no circuit", () => {
    const fabricated: BoardStatus = {
      board: "pultec-mid",
      outcome: "not-drawable",
      blocker: "part SW_MID: pin 12 (12) is neither on a net nor declared not connected",
      findings: [{ kind: "circuit-invalid", what: "part SW_MID: pin 12 (12) is neither on a net nor declared not connected", where: "pultec-mid" }],
      schematicRoot: undefined,
    }
    const sheet = refusalSheet(fabricated)
    expect(sheet).toContain("pultec-mid")
    expect(sheet).toContain("SW_MID")
    expect(sheet).toContain("not-drawable")
    // Nothing on it is a circuit: no symbol, no wire, no net, so it cannot be read as a drawing.
    for (const item of ["(symbol ", "(wire ", "(global_label ", "(junction "]) {
      expect(sheet, `a refusal sheet must carry no ${item.trim()} item`).not.toContain(item)
    }
  })

  test("the census's files list names what it wrote, so the CLI's `wrote` lines are not a claim", () => {
    for (const r of census()) {
      expect(r.files.length, `${r.board} wrote nothing at all`).toBeGreaterThan(0)
      for (const f of r.files) expect(fs.existsSync(f), `${r.board} reported writing ${f}, which does not exist`).toBe(true)
    }
  })
})

describe("the census line says what the run found", () => {
  test("it prints the drawing count WITH its split, and the no-drawing count with its own", () => {
    const rendered = renderBoardSheets(census())
    const drew = census().filter((r) => r.schematicRoot !== undefined).length
    const usable = census().filter((r) => r.outcome === "usable").length
    const defective = census().filter((r) => r.outcome === "defective").length
    expect(rendered).toContain(`${drew} of ${census().length} boards produce a drawing: ${usable} usable, ${defective} defective`)
    expect(rendered).toContain(`${census().length - drew} produce none:`)
    // A board with no drawing must say so on its own line rather than being read as a quiet zero.
    for (const r of census().filter((x) => x.schematicRoot === undefined)) {
      expect(rendered).toContain(`${r.board}: ${r.outcome} - NO DRAWING`)
    }
  })

  test("a generator-defect prints as a bug report, over a census that has none", () => {
    // Built by hand, because no real board reports this class and the line must still be proven to
    // exist: a warning nothing exercises is a warning nobody has read.
    const fabricated: BoardSheets = {
      board: "fixture-board",
      outcome: "generator-defect",
      declared: true,
      blocker: "undefined is not an object",
      findings: [{ kind: "invariant-violated", what: "undefined is not an object", where: "somewhere" }],
      sheets: 0,
      fallbacks: [],
      files: [],
      drawings: [],
      schematicRoot: undefined,
    }
    const rendered = renderBoardSheets([fabricated])
    expect(rendered).toContain("GENERATOR DEFECT on fixture-board")
    expect(rendered).toContain("BUG REPORT, not a board status")
    expect(renderBoardSheets(census()), "no real board prints that line today").not.toContain("GENERATOR DEFECT")
  })
})

describe("the class a board with no drawing gets", () => {
  test("is not-drawable, whatever its findings said, because usable asserts a drawing exists", () => {
    expect(classWithoutDrawing("usable")).toBe("not-drawable")
    expect(classWithoutDrawing("defective")).toBe("not-drawable")
    expect(classWithoutDrawing("not-drawable")).toBe("not-drawable")
  })

  test("except generator-defect, which is never rewritten into a fact about a circuit", () => {
    expect(classWithoutDrawing("generator-defect")).toBe("generator-defect")
  })
})

describe("the output directory", () => {
  test("is durable and gitignored, named once so the CLI and .gitignore cannot drift", () => {
    expect(BOARD_OUTPUT_DIR).toBe("build/schgen-boards")
    expect(boardOutputRoot(REPO_ROOT)).toBe(path.join(REPO_ROOT, "build/schgen-boards"))
    const ignore = fs.readFileSync(path.join(REPO_ROOT, ".gitignore"), "utf8")
    expect(ignore, "the census's output directory must be gitignored by name").toContain(`${BOARD_OUTPUT_DIR}/`)
  })

  test("is replaced wholly, so last run's drawing cannot sit beside this run's status", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "board-output-"))
    fs.writeFileSync(path.join(dir, "stale.kicad_sch"), "a drawing from a previous run")
    prepareBoardOutput(dir)
    expect(fs.readdirSync(dir)).toEqual([])
    fs.rmSync(dir, { recursive: true, force: true })
  })

  test("refuses to empty a filesystem root rather than defaulting to somewhere safe", () => {
    expect(() => prepareBoardOutput(path.parse(process.cwd()).root)).toThrow(/will not empty/)
  })
})

describe("the status note and the refusal sheet as text", () => {
  const sample: BoardStatus = {
    board: "a-board",
    outcome: "defective",
    blocker: "net GND branches at (0, 6.35) and no junction is emitted there",
    findings: [{ kind: "missing-junction", what: "net GND branches", where: "block B" }],
    schematicRoot: undefined,
  }

  test("the status note says what the class MEANS, not only what it is", () => {
    const md = statusMarkdown(sample)
    expect(md).toContain("a-board: DEFECTIVE")
    expect(md).toContain("WRONG ABOUT THE CIRCUIT")
    expect(md).toContain("missing-junction")
    expect(md).toContain("REFUSAL.kicad_sch")
  })

  test("every refusal-sheet line is its own item and carries no control byte", () => {
    const lines = refusalSheetLines(sample)
    expect(lines.length).toBeGreaterThan(5)
    for (const line of lines) {
      // `sexpr-write.ts`'s `str` refuses a control character outright - one text item per line -
      // and CLAUDE.md spends a section on what a stray control byte does to a file nobody re-reads.
      // **THE TEST IS A CHAR-CODE COMPARISON AND NOT A REGEX RANGE, because writing one of those
      // into a tool parameter put TWO REAL CONTROL BYTES into this very file on its first draft** -
      // a NUL and a 0x1f, which bun reported as "range out of order in character class" and which a
      // rendered diff showed as the four characters that were typed. Built in code, per CLAUDE.md.
      expect(hasControlByte(line), `"${line}" must hold no control character`).toBe(false)
      expect(line.length, `"${line}" must fit the page width`).toBeLessThanOrEqual(110)
    }
    const emitted = refusalSheet(sample)
    for (const line of lines.filter((l) => l !== "")) expect(emitted).toContain(line)
  })
})
