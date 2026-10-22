/**
 * **A GLOBAL LABEL'S OUTLINE, READ OFF THE PDF EXPORT'S OWN VECTOR COORDINATES.**
 *
 * Research probe for Task 1 of `docs/superpowers/plans/2026-10-22-text-handling-research.md`.
 * **Nothing in `lib/` or any check calls it.**
 *
 * **WHY A SECOND EXPORT FORMAT EXISTS HERE AT ALL, which is itself one of this task's findings:
 * `kicad-cli sch export svg` (10.0.5) DOES NOT EMIT THE GLOBAL-LABEL OUTLINE.** The label's text is
 * in the SVG and the six-sided outline around it is not; `export pdf` of the same file draws both.
 * That was found by this probe's own refusal - the SVG row measured 1.27 mm across where an outline
 * would have made it 2.7 mm - and it means an SVG export cannot answer *"how much room does a
 * global label take"* at all. The PDF can, exactly: its content stream carries the outline as six
 * `m`/`l` operands in user units.
 *
 * **IT READS COORDINATES, NOT PIXELS.** A rastered page was tried first and agreed to about one
 * pixel (0.074 mm at 4000 px across A4), which is the same order as the quantities being compared;
 * the content stream is exact and needs no resolution argument.
 *
 * PDF y runs up from the bottom of the page and schematic y runs down from the top, so `paperHeight`
 * is required to put a measurement back into schematic coordinates. It is not defaulted: a wrong
 * page height silently mirrors every y.
 */

import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import zlib from "node:zlib"
import { KICAD_CLI } from "../../../lib/kicad/netlist.ts"
import type { Um } from "../../../lib/schgen/render/geometry.ts"

export interface PdfPath {
  readonly points: readonly { readonly x: Um; readonly y: Um }[]
}

/**
 * Every stroked path of a one-page KiCad PDF, in schematic micrometres.
 *
 * The scale comes from the content stream's own `cm` matrix (`a 0 0 d 0 0 cm`), never assumed:
 * KiCad writes `0.0072 0 0 0.0072 0 0 cm`, so one user unit is `0.0072` PostScript points.
 */
export function pdfPaths(file: string, paperHeightMm: number): readonly PdfPath[] {
  const data = fs.readFileSync(file)
  const streams = [...data.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)endstream/g)].map((m) => Buffer.from(m[1] ?? "", "latin1"))
  const contents: string[] = []
  for (const s of streams) {
    let text: string
    try {
      text = zlib.inflateSync(s).toString("latin1")
    } catch {
      continue
    }
    if (/\bcm\b/.test(text) && /\bm\b/.test(text)) contents.push(text)
  }
  if (contents.length === 0) throw new Error(`${file}: no inflatable content stream carries a path; this parser cannot read it`)
  const out: PdfPath[] = []
  for (const content of contents) {
    const cm = /([\d.]+) 0 0 ([\d.]+) 0 0 cm/.exec(content)
    if (cm?.[1] === undefined || cm[2] === undefined) continue
    if (cm[1] !== cm[2]) throw new Error(`${file}: the content stream's cm matrix is anisotropic (${cm[1]} vs ${cm[2]}); this parser assumes one scale`)
    // user unit -> PostScript point -> mm -> um
    const unit = Number(cm[1]) * (25.4 / 72) * 1000
    let current: { x: number; y: number }[] = []
    for (const m of content.matchAll(/(-?[\d.]+) (-?[\d.]+) (m|l)\b|\b(S|f|B)\b/g)) {
      if (m[3] !== undefined) {
        const x = Number(m[1]) * unit
        const y = paperHeightMm * 1000 - Number(m[2]) * unit
        if (m[3] === "m" && current.length > 0) {
          out.push({ points: current })
          current = []
        }
        current.push({ x, y })
      } else if (current.length > 0) {
        out.push({ points: current })
        current = []
      }
    }
    if (current.length > 0) out.push({ points: current })
  }
  return out
}

/** Export `sch` to PDF with `kicad-cli` and return every stroked path, in schematic micrometres. */
export function pdfPathsOf(sch: string, outDir: string, paperHeightMm: number): readonly PdfPath[] {
  fs.mkdirSync(outDir, { recursive: true })
  const pdf = path.join(outDir, "probe.pdf")
  const r = spawnSync(KICAD_CLI, ["sch", "export", "pdf", "-o", pdf, sch], { encoding: "utf8" })
  if (r.status !== 0) throw new Error(`kicad-cli sch export pdf failed (${r.status ?? "signal"}):\n${r.stdout}\n${r.stderr}`)
  return pdfPaths(pdf, paperHeightMm)
}

/**
 * The one closed six-sided outline within `radius` of `at` - a global label's body.
 *
 * **It refuses when it finds none or more than one.** A label outline is the only seven-point
 * closed path this repository's emitter puts on a sheet, so two of them in one window means the
 * probe's rows are too close together and a measurement would be of the wrong label.
 */
export function labelOutlineNear(paths: readonly PdfPath[], at: { readonly x: Um; readonly y: Um }, radius: Um): PdfPath {
  const hits = paths.filter(
    (p) => p.points.length === 7 && p.points.every((q) => Math.abs(q.x - at.x) <= radius && Math.abs(q.y - at.y) <= radius),
  )
  if (hits.length !== 1) {
    throw new Error(
      `expected exactly one seven-point label outline within ${radius} um of (${at.x}, ${at.y}); found ${hits.length}. ` +
        "Refused rather than taking the first: a measurement of the wrong label reads exactly like a measurement of the right one.",
    )
  }
  return hits[0]!
}
