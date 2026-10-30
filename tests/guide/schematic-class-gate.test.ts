/**
 * **WHAT WITHHOLDS A SCHEMATIC PAGE FROM A BUILD GUIDE, AND WHAT NO LONGER DOES.**
 *
 * `tools/guide/schematic-source.ts` had two gates of its own on top of `lib/schgen/findings.ts`'s
 * classifier: any non-empty `findings` withheld the page, and any `fieldFallbacks` on any sheet
 * withheld it again. Both are deleted, 2026-10-30, on the owner's instruction:
 *
 * > *"we need to get rid of this stupid refusal to generate on error. If I can't look at it, I cant
 * > decide if the refusal is for dumb reasons. Is the refusal because of an electrical problem or
 * > for a dumb invented layout "problem" that agents have no business deciding?"*
 *
 * and, shouted: *"STOP PASSING JUDGEMENT ON LAYOUT!!! ... YOU MUST SHOW ME WHAT YOU THINK MIGHT BE
 * WRONG!!! YOU ARE NOT A QUALIFIED REVIEWER!!!"*
 *
 * **NEITHER GATE HAD A TEST, WHICH IS WHY THIS FILE IS NEW RATHER THAN EDITED.** The expectations
 * that did exist are in `./generated-schematic.test.ts`, and they are about what the NOTICE prints
 * for a `"withheld"` input - they never exercised the decision. So the decision is covered here
 * now, in both directions: a `usable` drawing carrying readability findings resolves to a PAGE, and
 * a `defective` one is still withheld. A rule with a test on one side only is how the deleted gates
 * survived as long as they did.
 *
 * The drawing handed to the resolver is a REAL `SheetDrawing` off the shared schgen fixture
 * circuit, laid out by `layoutSheet` - not a hand-built record. The resolver reads only whether a
 * sheet exists, so a fabricated one would have tested the same branch while asserting a geometry
 * nothing produced.
 */
import { describe, expect, it } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { buildCircuit } from "../../lib/schgen/ir/build.ts"
import { finding, type Finding } from "../../lib/schgen/findings.ts"
import { layoutSheet } from "../../lib/schgen/render/sheets.ts"
import type { SheetDrawing } from "../../lib/schgen/render/sheet-types.ts"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"
import { resolveSchematic } from "../../tools/guide/schematic-source.ts"
import type { BoardRef, BoardSheets } from "../../tools/schgen/board-sheets.ts"
import { RAILS, res, symbols } from "../schgen/__fixtures__/circuits.ts"
import { NO_PORT_DIRECTIONS, noOrientationPreferences } from "../schgen/__fixtures__/orientations.ts"

const REPO = "/repo"
const BOARD = "fixture-board"

const declaration: PerfboardDeclaration = {
  file: path.join(REPO, "boards", BOARD, "perfboard.json"),
  dir: path.join(REPO, "boards", BOARD),
  circuitPath: path.join(REPO, "circuits", "fixture", "fixture.ts"),
  exportName: "fixtureBoard",
  vrtPath: path.join(REPO, "boards", BOARD, `${BOARD}.perfboard.vrt`),
}

const ref: BoardRef = { name: BOARD, circuit: "../../circuits/fixture/fixture.ts", export: "fixtureBoard" }

/** One real sheet of geometry: a divider on sheet `s`, laid out by the production layout function. */
function realDrawing(): SheetDrawing {
  const parts = [res("R_T", "3V3", "TAP"), res("R_B", "TAP", "GND")]
  const c = buildCircuit(
    {
      parts,
      blocks: [
        {
          id: "DIV",
          sheet: "s",
          title: "Strap",
          members: ["R_T", "R_B"],
          checklist: [],
          rendering: { kind: "wired", template: "divider", anchor: null },
        },
      ],
      sheets: [{ id: "s", title: "S", file: "s.kicad_sch", paper: "A4", notes: [] }],
      rails: RAILS,
      orientations: noOrientationPreferences(parts),
      portDirections: NO_PORT_DIRECTIONS,
    },
    { symbols },
  )
  return layoutSheet(c, "s", symbols, "Pwr:PWR_FLAG")
}

const DRAWING = realDrawing()

/** A `BoardSheets` row as `boardSheets` builds one, with the findings and sheet count a case needs. */
function row(over: {
  readonly findings: readonly Finding[]
  readonly outcome: BoardSheets["outcome"]
  readonly drawings: readonly SheetDrawing[]
  readonly schematicRoot: string | undefined
  readonly blocker: string
}): BoardSheets {
  return {
    board: BOARD,
    outcome: over.outcome,
    declared: true,
    blocker: over.blocker,
    findings: over.findings,
    sheets: over.drawings.length,
    fallbacks: over.drawings.flatMap((d) => d.fieldFallbacks),
    files: [],
    drawings: over.drawings,
    schematicRoot: over.schematicRoot,
  }
}

/** Runs the resolver against a prepared row, and removes the temp directory it creates. */
async function resolve(prepared: BoardSheets): Promise<ReturnType<typeof resolveSchematic>> {
  const resolution = await resolveSchematic(
    declaration,
    undefined,
    REPO,
    BOARD,
    () => [ref],
    async (_board, _repoRoot, options) =>
      // The resolver hands `boardSheets` a directory it just created; a stub that ignored it would
      // not notice the day that stops happening.
      fs.existsSync(options.outDir)
        ? prepared
        : Promise.reject(new Error(`the resolver passed outDir ${options.outDir}, which does not exist`)),
  )
  if (resolution.tempDir !== undefined) fs.rmSync(resolution.tempDir, { recursive: true, force: true })
  return resolution
}

describe("the build guide withholds a drawing for its class, not for its layout", () => {
  it("prints a page for a usable drawing although readability findings stand against it", async () => {
    const root = path.join("/tmp", "fixture.kicad_sch")
    const { schematic, schematicRoot } = await resolve(
      row({
        outcome: "usable",
        // BOTH READABILITY SHAPES THE DELETED GATES CAUGHT: a `field-fallback` is what the second
        // gate read off `fieldFallbacks`, and a `body-clearance` is what the first gate read off
        // `findings`. `classOf` puts both in `usable` - "crowding is not incorrectness."
        findings: [
          finding("field-fallback", "R_T Value placed at the least-covered slot", "sheet s"),
          finding("body-clearance", "bodies of R_T#1 and R_B#1 are 0.3 mm apart", "sheet s"),
        ],
        drawings: [DRAWING],
        schematicRoot: root,
        blocker: "the drawing is UNRATIFIED (usable): 2 finding(s) over 1 sheet(s).",
      }),
    )
    expect(schematic.kind).toBe("generated")
    expect(schematicRoot).toBe(root)
  })

  it("withholds a defective drawing, which is the one ground EVALUATING-DRAWINGS.md permits", async () => {
    const { schematic, schematicRoot } = await resolve(
      row({
        outcome: "defective",
        findings: [finding("short", "wire 3 joins HI_BOOST_OUT and GND", "sheet s")],
        drawings: [DRAWING],
        schematicRoot: path.join("/tmp", "fixture.kicad_sch"),
        // The shape `boardSheets` builds: the headline, then one line per finding. The resolver
        // passes it through, so the notice on the page names the fault rather than only its class.
        blocker:
          "the drawing is UNRATIFIED (defective): 1 finding(s) over 1 sheet(s).\n" +
          "  - [short] sheet s: wire 3 joins HI_BOOST_OUT and GND",
      }),
    )
    expect(schematic.kind).toBe("withheld")
    if (schematic.kind !== "withheld") throw new Error("unreachable: the assertion above")
    // `drawn: true` - a sheet exists and is withheld for what it says about the circuit.
    expect(schematic.drawn).toBe(true)
    expect(schematic.reason).toContain("defective")
    expect(schematic.reason).toContain("wire 3 joins HI_BOOST_OUT and GND")
    expect(schematicRoot).toBeUndefined()
  })

  it("a usable class with a defective finding beside it is still withheld: worstClass decides", async () => {
    const { schematic } = await resolve(
      row({
        // The row's own `outcome` is NOT what the resolver reads: it re-derives the class from the
        // findings, so a row whose `outcome` disagreed with its evidence cannot smuggle a wrong
        // drawing onto a build guide.
        outcome: "usable",
        findings: [
          finding("field-fallback", "R_T Value placed at the least-covered slot", "sheet s"),
          finding("missing-junction", "split the wire at (120, 40)", "sheet s"),
        ],
        drawings: [DRAWING],
        schematicRoot: path.join("/tmp", "fixture.kicad_sch"),
        blocker: "the drawing is UNRATIFIED (defective): 2 finding(s) over 1 sheet(s).",
      }),
    )
    expect(schematic.kind).toBe("withheld")
  })

  it("a generation that drew zero sheets is an absent drawing, not a judged one", async () => {
    const { schematic } = await resolve(
      row({
        outcome: "usable",
        findings: [],
        drawings: [],
        schematicRoot: path.join("/tmp", "fixture.kicad_sch"),
        blocker: "",
      }),
    )
    expect(schematic.kind).toBe("withheld")
    if (schematic.kind !== "withheld") throw new Error("unreachable: the assertion above")
    expect(schematic.drawn).toBe(false)
    expect(schematic.reason).toContain("no sheet was drawn at all")
  })

  it("a generation that wrote nothing is withheld with nothing drawn", async () => {
    const { schematic } = await resolve(
      row({
        outcome: "not-drawable",
        findings: [finding("circuit-invalid", "part SW_MID: pin 12 is on no net", "validateCircuit")],
        drawings: [],
        schematicRoot: undefined,
        blocker: "circuit is invalid: part SW_MID: pin 12 is on no net",
      }),
    )
    expect(schematic.kind).toBe("withheld")
    if (schematic.kind !== "withheld") throw new Error("unreachable: the assertion above")
    expect(schematic.drawn).toBe(false)
    expect(schematic.reason).toContain("pin 12 is on no net")
  })
})
