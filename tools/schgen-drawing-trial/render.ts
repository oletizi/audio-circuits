/**
 * **AN ATTEMPT'S SHEET RENDERED THE WAY THE APPROVED PAGES WERE: `renderSheet`, UNCHANGED.**
 *
 * `tools/draught/draw-render.ts`'s `renderSheet` runs `kicad-cli sch export pdf` and `svg`, then
 * `magick` at 200 dpi on the PDF for one whole-page PNG. That is the path the approved pages were
 * rasterised with, and `kicad-cli` 10.0.5 has no `sch export png` (`kicad-cli sch export --help`,
 * 2026-11-09). This module only names the outputs after the sheet - `<stem>.pdf`, `<stem>.svg`,
 * `<stem>.png` beside each other in OUT_DIR - and refuses when either tool is absent.
 *
 * CLI: `bun tools/schgen-drawing-trial/render.ts SHEET OUT_DIR`.
 */
import fs from "node:fs"
import path from "node:path"
import { renderSheet } from "../draught/draw-render.ts"
import { requireMagick, trialKicadCli } from "./kicad.ts"

export interface RenderedPage {
  readonly pdf: string
  readonly svg: string
  readonly png: string
}

export function renderPage(sheet: string, outDir: string): RenderedPage {
  trialKicadCli()
  requireMagick()
  if (!sheet.endsWith(".kicad_sch") || !fs.existsSync(sheet)) {
    throw new Error(`${sheet} is not an existing .kicad_sch; render.ts renders one sheet`)
  }
  fs.mkdirSync(outDir, { recursive: true })
  const stem = path.basename(sheet, ".kicad_sch")
  const outcome = renderSheet({ schematicPath: sheet, outDir, board: stem })
  if (!outcome.ok) throw new Error(`rendering ${sheet} failed: ${outcome.stderr}`)
  const crops = path.join(outDir, "crops")
  const png = path.join(outDir, `${stem}.png`)
  fs.renameSync(path.join(crops, `${stem}-whole-page.png`), png)
  fs.rmdirSync(crops)
  return { pdf: path.join(outDir, `${stem}.pdf`), svg: path.join(outDir, `${stem}.svg`), png }
}

function main(argv: readonly string[]): void {
  const [sheet, outDir] = argv
  if (sheet === undefined || outDir === undefined || argv.length !== 2) {
    throw new Error("usage: bun tools/schgen-drawing-trial/render.ts SHEET OUT_DIR")
  }
  process.stdout.write(`${JSON.stringify(renderPage(sheet, outDir))}\n`)
}

if (import.meta.main) main(process.argv.slice(2))
