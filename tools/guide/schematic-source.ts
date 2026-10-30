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
 * circuit model is built from. FIVE outcomes now - the gates-classify reform
 * split the old `"refused"` into two, a board that drew nothing and a board
 * whose drawing the gates would not ratify - and only one of them earns a
 * page:
 *
 * - no `BoardRef` for this board, or `boardSheets` reports `declared: false`
 *   - `kind: "none"`, exactly today's behaviour for a board that genuinely
 *   has none.
 * - `boardSheets` wrote no schematic (`schematicRoot === undefined`) -
 *   `kind: "withheld"`, naming the blocker in full, `drawn: false`: nothing
 *   was drawn before the refusal.
 * - `boardSheets` wrote a schematic the gates would not RATIFY, which it
 *   reports as a non-empty `findings` - `kind: "withheld"`, `drawn: true`,
 *   naming the blocker. **This arm is where the gates-classify reform lands
 *   on this file.** Those boards used to arrive here as `"refused"` with no
 *   drawing at all; now the drawing exists and the census writes it, and the
 *   BUILD GUIDE still declines to print it, because the guide is the document
 *   somebody solders from - *"if the schematics are wonky, it's worse than
 *   having nothing at all."* Looking at an unratified sheet is what
 *   `build/schgen-boards/` is for; building from one is not.
 * - a schematic was written with no findings, but the gate does not clear - either
 *   zero sheets were drawn (nothing to examine, so this is NOT the same
 *   claim as a clean generation - `board-sheets.ts`'s own census makes the
 *   same distinction for its "fallback field placements" line, and `drawn`
 *   is `false` here too, for the same reason) or some sheet carries a
 *   fallback field placement, text the placer could not keep clear
 *   (`drawn: true`: a sheet WAS drawn here, and is withheld for what is on
 *   it) - `kind: "withheld"` naming which of the two it was. **This is the
 *   gate**: a generated sheet is not thereby a sheet fit to build from, and
 *   the owner's own words are why it is a gate rather than a softer warning -
 *   "if the schematics are wonky, it's worse than having nothing at all."
 *   **`drawn` is the field that keeps these two sub-cases from printing as
 *   one claim on the guide page** - see `GuideSchematic` in
 *   `./schematic-notice.ts`.
 * - a schematic was written with no findings, at least one sheet was drawn, and
 *   every sheet is clean - `kind: "generated"`, and the caller still has to
 *   export its PDF into the staging directory before this resolution's
 *   `tempDir` is removed.
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
    // **A DRAWING THE GATES WOULD NOT RATIFY IS NOT A PAGE FOR A BUILD GUIDE.** `drawn: true`: a
    // real sheet exists here - the census wrote it, classified, and that is the point of the
    // gates-classify reform - and it is withheld for what is on it rather than because nothing
    // exists to show. The spec's own line: a `defective` drawing "never reaches a build guide",
    // and a `usable` one whose gates still complained is withheld here for the same reason the
    // fallback gate below withholds, which is the owner's "worse than having nothing at all".
    if (result.findings.length > 0) {
      return {
        schematic: {
          kind: "withheld",
          declarationPath,
          circuitPath,
          reason: `${result.outcome}: ${result.blocker}`,
          drawn: true,
        },
        schematicRoot: undefined,
        tempDir,
      }
    }
    // THE GATE IS TWO CONDITIONS, NOT ONE: `[].every(...)` is `true`, so a
    // generation that drew nothing would otherwise pass having examined no text at all - a pass on
    // no evidence, which is this project's cardinal failure shape. `board-sheets.ts`'s own census
    // makes the same distinction for its own zero (`renderBoardSheets`'s "NOT MEASURED" line), and
    // this withholds for the same reason rather than reading an empty generation as a clean one.
    if (result.drawings.length === 0) {
      // `drawn: false` - a "generated" outcome that drew zero sheets is not a drawing anybody can
      // call withheld "over something": there is nothing to examine, the same distinction
      // `board-sheets.ts`'s own census makes for this zero. See `GuideSchematic`'s doc in
      // `./schematic-notice.ts`.
      return {
        schematic: {
          kind: "withheld",
          declarationPath,
          circuitPath,
          reason:
            "generated 0 sheets: NOT MEASURED - no sheet was drawn, so there is no placed text to " +
            "confirm clear, and that is not the same claim as a clean generation",
          drawn: false,
        },
        schematicRoot: undefined,
        tempDir,
      }
    }
    // A fallback field placement is text the placer could not keep clear, drawn over something -
    // worse than printing nothing - so ANY fallback on ANY sheet withholds the page. `drawn: true`:
    // unlike the two arms above, a real sheet WAS drawn here, and it is being withheld for what is
    // on it rather than because nothing exists to show.
    const clean = result.drawings.every((d) => d.fieldFallbacks.length === 0)
    if (!clean) {
      return {
        schematic: {
          kind: "withheld",
          declarationPath,
          circuitPath,
          reason: `${result.fallbacks.length} fallback field placement(s): text the placer could not keep clear`,
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
