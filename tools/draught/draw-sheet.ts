/**
 * `make draw`'s per-sheet mechanics, shared by a one-page board and by each page of a multi-page
 * one (design change C3): draft with copperhead, re-paper to US Letter, render, measure. What a
 * block page shares with a one-page board is exactly this sequence; what differs (the intent's
 * source, the partition check, the labels a block page goes on to get) is decided by the caller.
 *
 * Moved out of `tools/cli/draw.ts` unchanged in order and in every section's wording, so a
 * one-page board's run reads as it did; `tests/draught/draw-pages.test.ts` holds the h7-carrier
 * draft to its recorded sha256.
 */
import { draftWithCopperhead } from "./draw-draft.ts"
import { renderSheet, repaperToUSLetter, runMeasurementSuite } from "./draw-render.ts"

export interface SheetRun {
  /** Every step ran; a measurement script failing does not clear this (it is reported, never withholding). */
  readonly ok: boolean
  /** Whether copperhead wrote the sheet - so a later failure names the file left on disk. */
  readonly drafted: boolean
  readonly schematicPath: string
  readonly stdout: readonly string[]
  readonly stderr: readonly string[]
}

export function draftRenderMeasure(opts: {
  readonly outDir: string
  /** The sheet's stem: the board for a one-page board, the block for a page. */
  readonly name: string
  readonly intentPath: string
  readonly projectSymbolLibraries: readonly string[]
}): SheetRun {
  const { outDir, name } = opts
  const draft = draftWithCopperhead({ outDir, board: name, intentPath: opts.intentPath, projectSymbolLibraries: opts.projectSymbolLibraries })
  const stdout: string[] = [`draft (copperhead, intent ${opts.intentPath}):\n${draft.stdout}`.trim()]
  const stderr: string[] = []
  if (draft.stderr.trim() !== "") stderr.push(`draft:\n${draft.stderr.trim()}`)
  const result = (ok: boolean, drafted: boolean): SheetRun => ({ ok, drafted, schematicPath: draft.schematicPath, stdout, stderr })
  if (!draft.ok) return result(false, false)

  // Re-paper to USLetter - every approved page's paper; copperhead's own draft engine cannot be
  // asked to target it directly (see draw-draft.ts's draftWithCopperhead).
  const repaper = repaperToUSLetter(draft.schematicPath)
  stdout.push(`re-paper (US Letter):\n${repaper.stdout}`.trim())
  if (repaper.stderr.trim() !== "") stderr.push(`re-paper:\n${repaper.stderr.trim()}`)
  if (!repaper.ok) return result(false, true)
  // THREE OUTCOMES, NOT TWO (Task 5 fix round 2) - "overflow" is a finding about the board;
  // "unmeasured" is the fit check itself not having run, and must read as exactly that, never
  // as a claim about the board's content.
  if (repaper.fitStatus === "overflow") {
    stderr.push(
      `re-paper: ${name}'s content does not fit US Letter's inner frame after re-papering - see the ` +
        "paper_fit.py measurement above. This is a finding, not a withholding ground " +
        "(EVALUATING-DRAWINGS.md §3): the page is still rendered below.",
    )
  } else if (repaper.fitStatus === "unmeasured") {
    stderr.push(
      `re-paper: whether ${name}'s content fits US Letter's inner frame could not be determined - ` +
        "see the paper_fit.py output above for why. This is the fit CHECK not running, not a " +
        "finding about the board; the page is still rendered below.",
    )
  }

  // Render, and the one crop a mechanical pass can write.
  const render = renderSheet({ schematicPath: draft.schematicPath, outDir, board: name })
  stdout.push(`render (kicad-cli + ImageMagick):\n${render.stdout}`.trim())
  if (render.stderr.trim() !== "") stderr.push(`render:\n${render.stderr.trim()}`)
  if (!render.ok) return result(false, true)

  // The measurement suite. Findings are printed beside the page, never used to withhold it.
  const measurement = runMeasurementSuite(draft.schematicPath)
  stdout.push(`measurement suite (draughting/measure/):\n${measurement.report}`)
  if (!measurement.ok) stderr.push("measurement suite: at least one script did not run cleanly - see stdout.")
  return result(true, true)
}
