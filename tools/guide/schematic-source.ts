/**
 * The build packet's second schematic source: a board whose `perfboard.json`
 * declares no `"sch"` is not necessarily a board with no schematic to print -
 * `schgen` may be able to generate the missing per-section sheet from the
 * same declaration the circuit model is built from. `resolveSchematic` is
 * what `tools/guide/packet.ts`'s `writeGuidePacket` calls to find out.
 *
 * Split out of `tools/guide/packet.ts` (which was pushing this project's
 * 500-line ceiling) rather than left there, so the schgen-specific part of
 * this decision - the gate, the temp directory it works in, and the two
 * different `kicad-cli` resolutions it straddles (see the comment on
 * `resolveSchematic` below) - has one file to itself.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { worstClass } from "../../lib/schgen/findings.ts"
import type { PerfboardDeclaration } from "../perfboard/declaration.ts"
import type { BoardRef, BoardSheets, BoardSheetsOptions } from "../schgen/board-sheets.ts"
import type { GuideSchematic } from "./guide.ts"

/**
 * What `resolveSchematic` found: the `GuideSchematic` the page prints, the
 * absolute path to a clean generated sheet's `.kicad_sch` root (so the caller
 * can export its PDF once the staging directory exists - `undefined` for
 * every other outcome), and the scratch directory `boardSheets()` wrote into
 * (`undefined` when nothing was generated, because then nothing was written).
 */
export interface SchematicResolution {
  readonly schematic: GuideSchematic
  readonly schematicRoot: string | undefined
  readonly tempDir: string | undefined
}

/**
 * The packet's second schematic source: a board that declares no `"sch"` is
 * not necessarily a board with no schematic to print - `schgen` may be able
 * to generate the missing per-section sheet from the same declaration the
 * circuit model is built from.
 *
 * **ONE GROUND WITHHOLDS A DRAWING HERE, AND IT IS THE OWNER'S: THE DRAWING
 * IS WRONG ABOUT THE CIRCUIT.** `lib/schgen/findings.ts`'s `classOf` sorts
 * every finding a gate can raise into four classes, *"the owner's and not
 * this file's to revise"*, and it puts the four readability kinds -
 * `body-clearance`, `glyph-clearance`, `text-clearance`, `field-fallback` -
 * in `usable`: *"crowding is not incorrectness."* This file used to override
 * that with a second, independent judgement of its own, and the owner struck
 * it, 2026-10-30:
 *
 * > *"we need to get rid of this stupid refusal to generate on error. If I
 * > can't look at it, I cant decide if the refusal is for dumb reasons. Is
 * > the refusal because of an electrical problem or for a dumb invented
 * > layout "problem" that agents have no business deciding?"*
 *
 * and, shouted: *"STOP PASSING JUDGEMENT ON LAYOUT!!! ... YOU MUST SHOW ME
 * WHAT YOU THINK MIGHT BE WRONG!!! YOU ARE NOT A QUALIFIED REVIEWER!!!"*
 *
 * **TWO ARMS WERE DELETED RATHER THAN SOFTENED, AND THEIR OWN HISTORY IS THE
 * ARGUMENT.** `DEVELOPMENT-LOG.md` §2 records the fallback gate hiding a
 * whole drawing over a `VCC` label brushing a pin number - both legible -
 * while `R4`'s value rendering as `1<dot>5K`, where `1.5K` and `15K` are
 * indistinguishable, passed it ungated. A gate that hides the page is also a
 * gate nobody can see past, which is the pathology
 * `docs/superpowers/plans/2026-10-27-gates-classify/` exists to end.
 *
 * FIVE outcomes, and the two that earn no page say so because NO ARTIFACT
 * EXISTS or because the drawing is `defective`, never because of what the
 * placer did with a piece of text:
 *
 * - no `BoardRef` for this board, or `boardSheets` reports `declared: false`
 *   - `kind: "none"`, exactly today's behaviour for a board that genuinely
 *   has none.
 * - `boardSheets` wrote no schematic (`schematicRoot === undefined`) -
 *   `kind: "withheld"`, naming the blocker in full, `drawn: false`: nothing
 *   was drawn, so the no-drawing notice is the honest output and there is no
 *   page being kept from anybody.
 * - a schematic was written but zero sheets were drawn - `kind: "withheld"`,
 *   `drawn: false`, for the same reason as the arm above and not for a
 *   readability one: a root sheet with no sheet under it is not a page a
 *   builder can hold.
 * - a drawing exists and `worstClass(findings)` is anything but `usable` -
 *   `kind: "withheld"`, `drawn: true`, naming the class and the blocker.
 *   `defective` is the one ground `EVALUATING-DRAWINGS.md` §3 permits, a
 *   drawing that is WRONG ABOUT THE CIRCUIT; `not-drawable` and
 *   `generator-defect` arrive here only through a drawing whose own producer
 *   says it broke an invariant, and neither is a judgement about layout.
 *   **A `usable` class no longer reaches this arm**, however many
 *   readability findings stand behind it. Looking at the drawing is what
 *   `build/schgen-boards/` is for, and now so is page
 *   `SCHEMATIC_PAGE` of the guide.
 * - a drawing exists, at least one sheet was drawn, and its class is
 *   `usable` - `kind: "generated"`, and the caller still has to export its
 *   PDF into the staging directory before this resolution's `tempDir` is
 *   removed. **`usable` INCLUDES A DRAWING WITH FINDINGS ON IT**, which is
 *   the change: a crowded page prints, and a builder who can see it can
 *   judge it.
 *
 * **WHAT A `usable` PAGE'S FINDINGS REACH FROM HERE: NOTHING ON THE PAGE,
 * TODAY.** `boardSheets` writes a `STATUS.md` and a `RENDER-REPORT.md`
 * naming every finding per block and per unit - but into the temp directory
 * this function creates, which the caller deletes once the PDF is exported.
 * `bun tools/schgen/board-sheets.ts` writes the same artifacts durably under
 * `build/schgen-boards/`, and that is where a reader sees them. Carrying them
 * onto the guide page needs a field on `GuideSchematic`'s `"generated"` arm
 * and a notice to print it; that is not added here, because no instruction
 * asked for one and inventing a mechanism is how the gate this change
 * removes got built.
 *
 * Writes only under a temp directory this function creates with
 * `fs.mkdtempSync` - never into `boards/` or any circuit directory. On a
 * normal return (every branch above) the temp directory is handed back in
 * `tempDir` and the CALLER owns removing it, because a clean generation's
 * `.kicad_sch` has to still be on disk when the PDF is exported from it. If
 * this function itself throws - `boardSheetsFn` can, straight through:
 * `boardSheets()` wraps only `generate()` in its own try, so
 * `kicadVersion()`, `stockSymbolDir()` and `parityDesign()` throw past it -
 * the inner `try`/`finally` below removes the temp directory before the
 * throw reaches the caller, because a caller that never receives a
 * `SchematicResolution` has no `tempDir` to clean up.
 *
 * `boardRefsFn`/`boardSheetsFn` default to the real `tools/schgen/board-sheets.ts` functions and
 * exist as parameters for the same reason `loadCircuit` and `exportSchematicPdf` are injected on
 * `GuideDeps`: both do real work against the real `boards/` directory on disk, and a test whose
 * `repoRoot` is not a real repository must be able to replace them instead of finding that out
 * from an `ENOENT`.
 *
 * **PARKED: `deps.kicadCli` (`--kicad-cli` on `make guide`) DOES NOT REACH THIS STEP.** It governs
 * only the PDF export - the `schPath`-declared branch in `writeGuidePacket`, and the
 * `defaultExportSchematicPdf` call its caller makes for a clean `"generated"` result. The
 * generation itself, through `boardSheetsFn` here, resolves its OWN `kicad-cli` independently:
 * `tools/schgen/kicad-run.ts` reads `KICAD_CLI` from `lib/kicad/netlist.ts`, which is
 * `process.env["KICAD_CLI"] ?? defaultKicadCli()` - a module-level constant read from the
 * environment or a platform default, never from a `--kicad-cli` flag or a `GuideDeps` field. An
 * operator whose working `kicad-cli` is only at the `make`-resolved path can see a board that used
 * to print a schematic start refusing here instead. **What to check on an unexpected refusal**:
 * whether the `KICAD_CLI` environment variable (or, unset, `tools/schgen/kicad-run.ts`'s own
 * default) points at the same `kicad-cli` that `--kicad-cli`/`deps.kicadCli` does - they can
 * disagree silently. Threading one resolution through to the other is schgen's territory (it
 * ripples into `boardSheets`'s own census tool) and is being left for a task of its own rather than
 * folded into this one; this comment is that task's placeholder, not a fix.
 */
export async function resolveSchematic(
  declaration: PerfboardDeclaration,
  schPath: string | undefined,
  repoRoot: string,
  name: string,
  boardRefsFn: (repoRoot: string) => readonly BoardRef[],
  boardSheetsFn: (board: BoardRef, repoRoot: string, options: BoardSheetsOptions) => Promise<BoardSheets>,
): Promise<SchematicResolution> {
  if (schPath !== undefined) {
    return {
      schematic: { kind: "printed", path: path.relative(repoRoot, schPath) },
      schematicRoot: undefined,
      tempDir: undefined,
    }
  }
  const declarationPath = path.relative(repoRoot, declaration.file)
  const circuitPath = path.relative(repoRoot, declaration.circuitPath)
  const none: GuideSchematic = { kind: "none", declarationPath, circuitPath }
  const ref = boardRefsFn(repoRoot).find((r) => r.name === name)
  if (ref === undefined) {
    return { schematic: none, schematicRoot: undefined, tempDir: undefined }
  }
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pultec-guide-schgen-"))
  try {
    const result = await boardSheetsFn(ref, repoRoot, { outDir: tempDir, pdf: false })
    if (!result.declared) {
      return { schematic: none, schematicRoot: undefined, tempDir }
    }
    if (result.schematicRoot === undefined) {
      // `drawn: false` - schgen produced no sheet at all, so there is no sheet to have withheld
      // "over something". See `GuideSchematic`'s doc in `./schematic-notice.ts`.
      return {
        schematic: { kind: "withheld", declarationPath, circuitPath, reason: result.blocker, drawn: false },
        schematicRoot: undefined,
        tempDir,
      }
    }
    // NO SHEET UNDER THE ROOT IS NO PAGE, and that is the whole of this arm's claim now. It used to
    // be half of a two-condition gate - the other half was a fallback check reading
    // `drawings.every(...)`, and `[].every(...)` is `true`, so a generation that drew nothing would
    // have passed it having examined no text at all. That half is deleted (see this file's header),
    // and what is left is the honest part: a root sheet with nothing drawn under it is not a page a
    // builder can hold. `drawn: false`, the same distinction `board-sheets.ts`'s census makes for
    // this zero. See `GuideSchematic`'s doc in `./schematic-notice.ts`.
    if (result.drawings.length === 0) {
      return {
        schematic: {
          kind: "withheld",
          declarationPath,
          circuitPath,
          reason:
            "generated 0 sheets: no sheet was drawn at all, so there is no schematic page to print - " +
            "this is an absent drawing, not a drawing anybody judged",
          drawn: false,
        },
        schematicRoot: undefined,
        tempDir,
      }
    }
    // **THE ONE GROUND THAT WITHHOLDS A DRAWING THAT EXISTS: ITS CLASS, FROM THE OWNER'S OWN
    // CLASSIFIER.** `worstClass` reads `lib/schgen/findings.ts`'s mapping, where the four
    // readability kinds are `usable` - *"crowding is not incorrectness"* - so a crowded page falls
    // through to `"generated"` below and PRINTS. `defective` means the drawing is wrong about the
    // circuit, which `EVALUATING-DRAWINGS.md` §3 makes the only ground for withholding one;
    // `generator-defect` and `not-drawable` on a drawing that exists are its producer reporting its
    // own breakage, which is not a layout judgement either.
    //
    // **IT IS NOT `findings.length > 0`, AND THAT IS THE FIX.** That test withheld a page the
    // classifier had already called `usable`, a second independent judgement made downstream of the
    // mapping that is *"the owner's and not this file's to revise"* - and it is the shape
    // `DEVELOPMENT-LOG.md` §2 catches hiding a legible drawing over a label brushing a pin number.
    const worst = worstClass(result.findings)
    if (worst !== "usable") {
      return {
        schematic: {
          kind: "withheld",
          declarationPath,
          circuitPath,
          reason: `${worst}: ${result.blocker}`,
          drawn: true,
        },
        schematicRoot: undefined,
        tempDir,
      }
    }
    // The guard that stood here - *"reported generated but wrote no schematicRoot"* - is DELETED
    // rather than kept, because the arm above now takes that case first and by name: a row with no
    // `schematicRoot` is withheld before any of this runs, so the guard could not fire and a guard
    // that cannot fire is a check somebody would later trust. `CLAUDE.md`: supersede means delete.
    return {
      schematic: { kind: "generated" },
      schematicRoot: result.schematicRoot,
      tempDir,
    }
  } catch (caught) {
    // THIS FUNCTION'S OWN LEAK GUARD: a normal return above hands `tempDir` to the caller, whose
    // `finally` removes it once it is actually done being read from (the clean-generation PDF
    // export happens after this function returns). A THROW never reaches that caller's `finally` -
    // there is no `SchematicResolution` for it to read `tempDir` off of - so this `catch` is the
    // only thing that would otherwise remove it, and the refusal above (and any throw out of
    // `boardSheetsFn` - `kicadVersion()`, `stockSymbolDir()` and `parityDesign()` all throw straight
    // through `boardSheets()`'s own try, which wraps only `generate()`) would leak a temp directory
    // without it.
    fs.rmSync(tempDir, { recursive: true, force: true })
    throw caught
  }
}
