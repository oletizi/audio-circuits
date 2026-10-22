/**
 * **WHAT eeschema ACTUALLY DRAWS, measured off an SVG export of items THIS REPOSITORY'S OWN
 * EMITTER wrote.**
 *
 * Research probe for Task 1 of `docs/superpowers/plans/2026-10-22-text-handling-research.md`,
 * route 3 of its Step 2. **Nothing in `lib/` or any check calls it.**
 *
 * **THE ITEMS ARE BUILT BY `lib/schgen/render/emit-items.ts`, NOT HAND-WRITTEN.** A hand-written
 * `(property …)` or `(global_label …)` would be a transcription of the emitter, and
 * `CLAUDE.md`'s *"transcription is evidence, not memory"* cuts the other way here: the thing worth
 * measuring is what the emitter emits, so `partSymbol` and `globalLabel` are called directly and
 * the probe measures their output. The only hand-written parts are the file header and the
 * `(lib_symbols …)` entry, and the second of those is the resolver's own flattened node.
 *
 * **ONE ITEM PER ROW, ROWS FAR APART, AND EVERY PATH ASSIGNED TO EXACTLY ONE ROW.** A path whose
 * points straddle two row windows, or fall in none, makes the run refuse: a row silently measured
 * from a neighbour's geometry is the shape `docs/known-gaps.md` **G241** records five times, and a
 * mis-bucketed stroke would move a published extent.
 *
 * A symbol's own graphics and pin text are drawn too, so each probe symbol's body is parked in a
 * PARK COLUMN far from every measurement row and only its Reference and Value fields are placed on
 * rows. The park column is itself a row window, so if any of that geometry landed on a measurement
 * row the assignment check above would refuse.
 */

import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { KICAD_CLI } from "../../../lib/kicad/netlist.ts"
import { createResolver, type LibSymbol } from "../../../lib/schgen/render/library.ts"
import { symbolLibraries } from "../../../lib/schgen/render/stock-symbols.ts"
import { globalLabel, partSymbol, type ItemScope } from "../../../lib/schgen/render/emit-items.ts"
import { int, list, print, str, yesNo, type SListNode } from "../../../lib/schgen/render/sexpr-write.ts"
import { projectFile } from "../../../lib/schgen/render/project.ts"
import { GRID, type Rotation, type Side, type Um } from "../../../lib/schgen/render/geometry.ts"
import type { HJustify } from "../../../lib/schgen/render/text-boxes.ts"

/**
 * Rows this far apart in y. It has to exceed the LENGTH of a vertical item, not its height: a
 * field at rotation 90 and a global label on the `up`/`down` side both run along y, so a pitch
 * sized for horizontal text would let one row's glyphs fall in the next row's window.
 */
const ROW_PITCH: Um = 60 * GRID
const ROW_HALF: Um = ROW_PITCH / 2
/**
 * The first row sits far enough down that its window clears the sheet frame's top edge rulers.
 * The first version of this probe put it at `20 * GRID` and the first row of every sheet picked up
 * a border tick mark, which made that row 50 mm wide. Nothing silently dropped it: the extent was
 * absurd and visible in the output, which is why the rows print their own path counts.
 */
const FIRST_ROW_Y: Um = 48 * GRID
const ROW_X: Um = 40 * GRID
/** Half-width of the measurement band. Narrow enough to exclude the sheet frame's edge rulers. */
const X_BAND: Um = 30 * GRID
/** Rows per sheet, so the last row's window stays inside A0's drawable height. */
const ROWS_PER_SHEET = 10
/** Where probe symbols' bodies and pin text are parked: its own row window, clear of every other. */
const PARK_X: Um = 600 * GRID

export type RowSpec =
  | { readonly kind: "field"; readonly label: string; readonly text: string; readonly justify: HJustify; readonly rot: Rotation }
  | { readonly kind: "label"; readonly label: string; readonly net: string; readonly side: Side; readonly refs: string }

export interface RowExtent {
  readonly label: string
  /** Paths assigned to this row. */
  readonly paths: number
  readonly strokeWidths: readonly number[]
  /** Stroke centreline bounds relative to the row's anchor, in um. */
  readonly centreline: { readonly minX: Um; readonly minY: Um; readonly maxX: Um; readonly maxY: Um }
  /** Centrelines grown by half the widest stroke on the row: the ink box, in um. */
  readonly ink: { readonly minX: Um; readonly minY: Um; readonly maxX: Um; readonly maxY: Um }
}

const SCOPE: ItemScope = { project: "text-metrics-probe", sheet: "probe", path: "/00000000-0000-0000-0000-000000000000" }

const EMPTY_BOM = { Manufacturer: "", MPN: "", Supplier: "", SupplierPart: "", AbsMaxV: null } as const

function header(libSymbols: readonly SListNode[]): SListNode[] {
  return [
    list("version", int(20260306)),
    list("generator", str("schgen-text-metrics-probe")),
    list("generator_version", str("10.0")),
    list("uuid", str("00000000-0000-0000-0000-00000000c0de")),
    list("paper", str("A0")),
    list("lib_symbols", libSymbols),
  ]
}

/**
 * The probe schematic, plus the y of each row.
 *
 * A `field` row carries ONE of the two fields on a row: the Reference goes on the row and the Value
 * is parked, because measuring two stacked lines at once would report their union and the quantity
 * wanted is one line's.
 */
export function buildProbeSheet(rows: readonly RowSpec[], symbol: LibSymbol): { readonly text: string; readonly anchors: readonly { readonly label: string; readonly y: Um }[] } {
  const items: SListNode[] = []
  const anchors: { label: string; y: Um }[] = []
  rows.forEach((row, i) => {
    const y = FIRST_ROW_Y + i * ROW_PITCH
    anchors.push({ label: row.label, y })
    if (row.kind === "field") {
      items.push(
        partSymbol(SCOPE, {
          label: `P${i}`,
          lib: symbol,
          unit: 1,
          at: { x: PARK_X, y },
          rot: row.rot,
          fields: {
            reference: { at: { x: ROW_X, y }, justify: row.justify },
            value: { at: { x: PARK_X, y }, justify: "left" },
          },
          reference: row.text,
          value: "parked",
          footprint: "",
          dnp: false,
          bom: EMPTY_BOM,
        }).node,
      )
    } else {
      items.push(globalLabel("probe", { net: row.net, at: { x: ROW_X, y }, side: row.side, refs: row.refs }).node)
    }
  })
  return { text: `${print(list("kicad_sch", header([symbol.node]), items, list("embedded_fonts", yesNo(false))))}\n`, anchors }
}

/** `Device:R`, resolved from the installed stock libraries - the symbol every probe field hangs on. */
export function probeSymbol(): LibSymbol {
  return createResolver(symbolLibraries(["Device"])).resolve("Device:R")
}

interface SvgPath {
  readonly strokeWidth: number
  readonly points: readonly { readonly x: number; readonly y: number }[]
}

/**
 * Every path of an SVG export, with the stroke width in force where it sits. Lengths in mm.
 *
 * **A LINEAR SCAN, NOT A GROUP MATCH, BECAUSE THE GROUPS NEST.** `kicad-cli` wraps each string in
 * `<g class="stroked-text">` INSIDE the `<g style="…stroke-width…">` that sets the pen, so a
 * non-greedy `</g>` match closes the outer group at the first inner one and silently loses every
 * path after it. That is exactly how the first version of this probe reported a row as having drawn
 * nothing; the refusal in `rowExtents` is what caught it.
 */
export function svgPaths(svg: string): readonly SvgPath[] {
  const out: SvgPath[] = []
  let strokeWidth: number | null = null
  for (const m of svg.matchAll(/stroke-width:([\d.]+)|<path d="([\s\S]*?)"/g)) {
    if (m[1] !== undefined) {
      strokeWidth = Number(m[1])
      continue
    }
    if (strokeWidth === null) throw new Error("an SVG path appears before any stroke-width declaration, so its pen width is unknown")
    const nums = (m[2] ?? "").match(/-?\d+\.?\d*/g) ?? []
    const points: { x: number; y: number }[] = []
    for (let i = 0; i + 1 < nums.length; i += 2) points.push({ x: Number(nums[i]), y: Number(nums[i + 1]) })
    if (points.length > 0) out.push({ strokeWidth, points })
  }
  return out
}

/**
 * KiCad's own declared advance per drawn string: the `textLength` of the invisible `<text>` element
 * `kicad-cli` writes beside every stroked string, in um. A FOURTH independent reading of the same
 * geometry, free with the export, and `probe.ts` reports it against the font source's advance sum.
 */
export function svgTextLengths(svg: string): readonly { readonly text: string; readonly textLength: Um }[] {
  return [...svg.matchAll(/<text [^>]*?textLength="([\d.]+)"[^>]*>([^<]*)<\/text>/g)].map((m) => ({
    text: m[2] ?? "",
    textLength: Number(m[1]) * 1000,
  }))
}

/**
 * Per-row extents, in um relative to each row's anchor.
 *
 * **IT REFUSES A PATH IT CANNOT ASSIGN TO EXACTLY ONE ROW**, and the sheet frame and title block are
 * excluded by the one window they can never fall in rather than by a stroke-width guess: every
 * measurement row sits at `ROW_X`, and a path is a candidate only when all of its points lie within
 * one row's y window AND within the measurement x band.
 */
export function rowExtents(svg: string, anchors: readonly { readonly label: string; readonly y: Um }[]): readonly RowExtent[] {
  const paths = svgPaths(svg)
  const xBand = { lo: (ROW_X - X_BAND) / 1000, hi: (ROW_X + X_BAND) / 1000 }
  const ys = anchors.map((a) => a.y)
  const yRegion = { lo: (Math.min(...ys) - ROW_HALF) / 1000, hi: (Math.max(...ys) + ROW_HALF) / 1000 }
  const byRow = new Map<string, SvgPath[]>(anchors.map((a) => [a.label, []]))
  for (const p of paths) {
    const inBand =
      p.points.every((pt) => pt.x >= xBand.lo && pt.x <= xBand.hi) &&
      p.points.every((pt) => pt.y >= yRegion.lo && pt.y <= yRegion.hi)
    if (!inBand) continue
    const hits = anchors.filter((a) => p.points.every((pt) => Math.abs(pt.y * 1000 - a.y) <= ROW_HALF))
    if (hits.length === 0) {
      throw new Error(
        `a path inside the measurement x band falls in no row window: ${JSON.stringify(p.points.slice(0, 4))}. ` +
          "Refused rather than dropped - a path nobody assigned is geometry missing from a published extent. " +
          `Widen ROW_PITCH in tools/schgen/text-metrics/svg-probe.ts or park the item that drew it.`,
      )
    }
    if (hits.length > 1) {
      throw new Error(`a path falls in ${hits.length} row windows (${hits.map((h) => h.label).join(", ")}); ROW_PITCH is too small to separate the rows`)
    }
    byRow.get(hits[0]!.label)!.push(p)
  }
  return anchors.map((a) => {
    const ps = byRow.get(a.label) ?? []
    if (ps.length === 0) throw new Error(`row ${a.label} drew nothing; an extent of zero would be reported as a measurement`)
    const xs = ps.flatMap((p) => p.points.map((pt) => pt.x * 1000 - ROW_X))
    const ys = ps.flatMap((p) => p.points.map((pt) => pt.y * 1000 - a.y))
    const widths = [...new Set(ps.map((p) => p.strokeWidth))].sort((x, y) => x - y)
    const half = (Math.max(...widths) * 1000) / 2
    const centreline = { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
    return {
      label: a.label,
      paths: ps.length,
      strokeWidths: widths,
      centreline,
      ink: { minX: centreline.minX - half, minY: centreline.minY - half, maxX: centreline.maxX + half, maxY: centreline.maxY + half },
    }
  })
}

/**
 * A project file with the intersheet references switched OFF.
 *
 * **A DELIBERATE CONFIGURATION VARIANT, AND NOT A SECOND EMITTER.** `globalLabel` always writes the
 * `Intersheetrefs` property and `project.ts` always switches the display on, so every label KiCad
 * renders under this repository's own settings carries its references - which is the configuration
 * to measure. It is ALSO the reason the outline alone cannot be read off that rendering: the
 * references sit beyond it on the same row. Rendering the identical label with the display off
 * isolates the outline, and the difference between the two runs is the references' own contribution.
 * The emitted `.kicad_sch` is byte-identical between the two runs; only the project setting differs.
 */
function probeProjectFile(showIntersheetRefs: boolean): string {
  if (showIntersheetRefs) return projectFile("text-metrics-probe", [])
  const doc = {
    erc: { erc_exclusions: [] },
    meta: { filename: "text-metrics-probe.kicad_pro", version: 3 },
    schematic: { drawing: { intersheets_ref_show: false } },
  }
  return `${JSON.stringify(doc, null, 2)}\n`
}

/** A0, which `buildProbeSheet` writes; PDF coordinates need it to get back to schematic y. */
export const PAPER_HEIGHT_MM = 841

/** Write one probe sheet and its project file into `dir`; returns the file and each row's anchor. */
export function writeProbeSheet(
  rows: readonly RowSpec[],
  dir: string,
  showRefs: boolean,
  symbol: LibSymbol = probeSymbol(),
): { readonly sch: string; readonly anchors: readonly { readonly label: string; readonly y: Um }[]; readonly rowX: Um } {
  fs.mkdirSync(dir, { recursive: true })
  const { text, anchors } = buildProbeSheet(rows, symbol)
  const sch = path.join(dir, "text-metrics-probe.kicad_sch")
  fs.writeFileSync(sch, text)
  fs.writeFileSync(path.join(dir, "text-metrics-probe.kicad_pro"), probeProjectFile(showRefs))
  return { sch, anchors, rowX: ROW_X }
}

/** Write one probe sheet into `dir`, export it to SVG with `kicad-cli`, and measure every row. */
function measureSheet(rows: readonly RowSpec[], dir: string, symbol: LibSymbol, showRefs: boolean): readonly RowExtent[] {
  const { sch, anchors } = writeProbeSheet(rows, dir, showRefs, symbol)
  const svgDir = path.join(dir, "svg")
  fs.mkdirSync(svgDir, { recursive: true })
  const r = spawnSync(KICAD_CLI, ["sch", "export", "svg", "--no-background-color", "-o", svgDir, sch], { encoding: "utf8" })
  if (r.status !== 0) throw new Error(`kicad-cli sch export svg failed (${r.status ?? "signal"}):\n${r.stdout}\n${r.stderr}`)
  const file = path.join(svgDir, "text-metrics-probe.svg")
  if (!fs.existsSync(file)) throw new Error(`kicad-cli wrote no ${file}; it printed:\n${r.stdout}`)
  return rowExtents(fs.readFileSync(file, "utf8"), anchors)
}

/** Every row measured, in `ROWS_PER_SHEET` chunks so no row's window leaves A0's drawable height. */
export function measureRows(rows: readonly RowSpec[], dir: string, showIntersheetRefs = true): readonly RowExtent[] {
  const symbol = probeSymbol()
  const out: RowExtent[] = []
  for (let i = 0; i < rows.length; i += ROWS_PER_SHEET) {
    const chunk = rows.slice(i, i + ROWS_PER_SHEET)
    out.push(...measureSheet(chunk, path.join(dir, `sheet-${i / ROWS_PER_SHEET}`), symbol, showIntersheetRefs))
  }
  return out
}
