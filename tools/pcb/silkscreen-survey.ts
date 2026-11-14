/**
 * THE SILKSCREEN GRAPHIC LINE WIDTHS A BOARD ACTUALLY CARRIES, read off the
 * `.kicad_pcb` with `../../lib/kicad/sexpr.ts`.
 *
 * WHY THIS IS A MEASUREMENT AND NOT A GATE. `docs/standards/pcbway-fab-rules.md`
 * lists silkscreen graphic line width under "Not enforced", because KiCad has no
 * design rule for it at all: the project sets a minimum TEXT stroke, which DRC
 * checks, and says nothing about the width of a line, arc, rectangle or circle
 * on a silkscreen layer. There is therefore nothing to refuse and nothing to
 * relax, and the consequence of a thin outline is a faint legend rather than a
 * rejected or dearer board. This module reports; it never throws over a width.
 *
 * WHY IT IS CODE RATHER THAN A FIGURE IN THAT DOCUMENT. A width written into
 * prose is a transcription with a date on it, and these widths belong to the
 * stock KiCad footprints the board happens to use - they change when the board's
 * parts change and when KiCad's libraries are upgraded. The re-running
 * measurement is `tests/pcb/silkscreen-widths.test.ts`, which is where the
 * standard and the spec point.
 *
 * READ FROM THE BOARD, NOT FROM THE LIBRARIES. The board holds the footprints as
 * they will be fabricated, libraries included by value; a library read would
 * measure what a future update might place rather than what this board has, and
 * it would not see a graphic edited on the board. NO LIBRARY READ WAS TAKEN, so
 * nothing here claims the two agree - a sentence asserting they did stood in
 * this comment and was struck, because an unmeasured figure in prose is exactly
 * what this module exists to avoid.
 *
 * TEXT IS DELIBERATELY EXCLUDED. `fp_text` and a footprint's `property` fields
 * carry a font thickness, not a graphic stroke, and the standard already sets
 * and DRC already checks that one. Mixing the two quantities under one figure is
 * exactly the confusion the standard's own silkscreen note warns about.
 */
import fs from "node:fs"
import { parseSexpr, children, child, attr } from "../../lib/kicad/sexpr.ts"
import type { SNode } from "../../lib/kicad/sexpr.ts"

/** The graphic forms a footprint can put on a silkscreen layer. `fp_text` is not one - see the header. */
const GRAPHIC_FORMS = ["fp_line", "fp_rect", "fp_circle", "fp_arc", "fp_poly", "fp_curve"] as const

/** The silkscreen layers, as KiCad 10 spells them in a `.kicad_pcb`. */
const SILKSCREEN_LAYERS = ["F.SilkS", "B.SilkS"] as const

export interface SilkscreenItem {
  /** The footprint's library id, e.g. `Package_DIP:DIP-16_W7.62mm`. */
  readonly fpid: string
  /** The footprint's reference designator, e.g. `U1`. */
  readonly reference: string
  readonly layer: string
  /** The s-expression form, e.g. `fp_line`. */
  readonly form: string
  readonly widthMm: number
}

export interface FootprintSilkscreen {
  readonly fpid: string
  /** Every reference designator on the board placing this library footprint, sorted. */
  readonly references: readonly string[]
  readonly graphics: number
  readonly widthsMm: readonly number[]
  readonly minWidthMm: number
  readonly maxWidthMm: number
}

export interface SilkscreenSurvey {
  readonly items: readonly SilkscreenItem[]
  /** One row per distinct library footprint, sorted by fpid. */
  readonly byFootprint: readonly FootprintSilkscreen[]
}

function referenceOf(footprint: SNode): string {
  for (const property of children(footprint, "property")) {
    if (property.atoms[0] === "Reference") return property.atoms[1] ?? ""
  }
  return ""
}

function strokeWidthOf(node: SNode): number | undefined {
  // KiCad 10 writes `(stroke (width W) (type solid))`. The bare `(width W)` is
  // the KiCad 5/6 form and is read too, because a board upgraded in place can
  // still carry it and reading only one form would silently measure nothing.
  const stroke = child(node, "stroke")
  const raw = stroke === undefined ? attr(node, "width") : attr(stroke, "width")
  if (raw === undefined) return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

export function surveySilkscreenText(text: string, boardLabel: string): SilkscreenSurvey {
  const board = parseSexpr(text)
  const items: SilkscreenItem[] = []
  for (const footprint of children(board, "footprint")) {
    const fpid = footprint.atoms[0] ?? ""
    const reference = referenceOf(footprint)
    for (const node of footprint.nodes) {
      if (!(GRAPHIC_FORMS as readonly string[]).includes(node.name)) continue
      const layer = attr(node, "layer")
      if (layer === undefined || !(SILKSCREEN_LAYERS as readonly string[]).includes(layer)) continue
      const widthMm = strokeWidthOf(node)
      if (widthMm === undefined) {
        // NOT defaulted to zero and not skipped. A silkscreen graphic whose
        // width this reader cannot find is a measurement that was not taken,
        // and reporting it as 0 mm - or dropping it - would read as a figure
        // somebody measured. This is the one thing here that throws, and it is
        // about the reader, never about the width.
        throw new Error(
          `${boardLabel}: the ${node.name} on ${layer} in footprint ${reference} (${fpid}) has neither a ` +
            "(stroke (width ...)) nor a bare (width ...), so its line width cannot be measured. Nothing is " +
            "assumed for it: add the form to strokeWidthOf in tools/pcb/silkscreen-survey.ts once you know " +
            "where KiCad puts the width for it.",
        )
      }
      items.push({ fpid, reference, layer, form: node.name, widthMm })
    }
  }

  const grouped = new Map<string, { references: Set<string>; widths: number[] }>()
  for (const item of items) {
    const row = grouped.get(item.fpid) ?? { references: new Set<string>(), widths: [] }
    row.references.add(item.reference)
    row.widths.push(item.widthMm)
    grouped.set(item.fpid, row)
  }
  const byFootprint = [...grouped.entries()]
    .map(([fpid, row]) => ({
      fpid,
      references: [...row.references].sort(),
      graphics: row.widths.length,
      widthsMm: [...new Set(row.widths)].sort((a, b) => a - b),
      minWidthMm: Math.min(...row.widths),
      maxWidthMm: Math.max(...row.widths),
    }))
    .sort((a, b) => (a.fpid < b.fpid ? -1 : a.fpid > b.fpid ? 1 : 0))

  return { items, byFootprint }
}

export function surveySilkscreen(boardPath: string): SilkscreenSurvey {
  if (!fs.existsSync(boardPath)) {
    throw new Error(
      `no board at ${boardPath}, so its silkscreen graphics cannot be measured. This survey reads a real ` +
        "board file and has nothing to fall back to.",
    )
  }
  return surveySilkscreenText(fs.readFileSync(boardPath, "utf8"), boardPath)
}

/**
 * The rows whose thinnest graphic is below `thresholdMm`. A DISCLOSURE helper:
 * the caller decides what to do with the list, and nothing here treats a
 * non-empty result as a failure. The threshold is passed in rather than written
 * here, because the only published figure this project has is PCBWay's
 * character-width minimum, which is a different quantity - see the silkscreen
 * note in `docs/standards/pcbway-fab-rules.md`.
 */
export function belowThreshold(
  survey: SilkscreenSurvey,
  thresholdMm: number,
): readonly FootprintSilkscreen[] {
  return survey.byFootprint.filter((row) => row.minWidthMm < thresholdMm)
}

/** A fixed-width table of the survey, for a person to read in a test's output. */
export function formatSilkscreenSurvey(survey: SilkscreenSurvey, thresholdMm: number): string {
  const width = Math.max(...survey.byFootprint.map((row) => row.fpid.length), 9)
  const lines = [
    `${"footprint".padEnd(width)}  graphics  widths (mm)        vs ${thresholdMm} mm`,
    `${"-".repeat(width)}  --------  -----------------  ----------`,
  ]
  for (const row of survey.byFootprint) {
    const widths = row.widthsMm.map((w) => w.toString()).join(", ")
    const verdict = row.minWidthMm < thresholdMm ? "BELOW" : "at or above"
    lines.push(`${row.fpid.padEnd(width)}  ${String(row.graphics).padStart(8)}  ${widths.padEnd(17)}  ${verdict}`)
  }
  return lines.join("\n")
}
