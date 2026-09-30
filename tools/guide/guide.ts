/**
 * The build guide page: one self-contained HTML file, printed from a browser.
 *
 * In order: the header (board, date, the layout and schematic it came
 * from); the three layout images, inline, one to a page; the build
 * checklist in the operator's order (see `checklist.ts`), every row with a
 * printed checkbox; then the power-up checks, with a blank for each
 * reading. Print CSS targets US Letter, draws nothing on a background and
 * breaks the page between the images and the checklist, so it reads the
 * same from a black-and-white laser printer as on screen.
 */
import type { ChecklistSection } from "./checklist.ts"
import type { PowerUpChecks } from "./power-up.ts"
import { escapeXml } from "./svg.ts"

export interface GuideImages {
  readonly designators: string
  readonly values: string
  readonly copper: string
}

export interface GuideInput {
  readonly boardName: string
  /** The day the packet was generated, as YYYY-MM-DD. */
  readonly generated: string
  readonly layoutPath: string
  readonly schematicPath: string
  readonly images: GuideImages
  readonly checklist: readonly ChecklistSection[]
  /** `undefined` when the circuit module declares no power-up checks. */
  readonly powerUpChecks: PowerUpChecks | undefined
}

const STYLE = `
@page { size: letter; margin: 0.5in; }
* { box-sizing: border-box; }
body { font: 11pt/1.35 "Helvetica Neue", Arial, sans-serif; color: #000; background: #fff; margin: 0 auto; max-width: 7.5in; padding: 0.25in 0; }
h1 { font-size: 18pt; margin: 0 0 4pt; }
h2 { font-size: 14pt; margin: 18pt 0 6pt; border-bottom: 1.5pt solid #000; padding-bottom: 2pt; }
h3 { font-size: 12pt; margin: 14pt 0 4pt; }
h1, h2, h3 { page-break-after: avoid; break-after: avoid; }
thead { display: table-header-group; }
.meta { margin: 0; }
.meta dt { font-weight: bold; float: left; clear: left; width: 1.1in; }
.meta dd { margin: 0 0 2pt 1.1in; font-family: Menlo, Consolas, monospace; font-size: 9.5pt; }
figure.layout { margin: 12pt 0 0; page-break-inside: avoid; break-inside: avoid; }
figure.layout svg { display: block; width: 100%; height: auto; max-height: 9.2in; }
figure.layout figcaption { font-weight: bold; margin-bottom: 4pt; }
.page { page-break-before: always; break-before: page; }
table { border-collapse: collapse; width: 100%; font-size: 10pt; }
th, td { border: 0.75pt solid #000; padding: 3pt 5pt; text-align: left; vertical-align: top; }
th { font-weight: bold; }
tr { page-break-inside: avoid; break-inside: avoid; }
td.tick { width: 0.3in; text-align: center; }
.box { display: inline-block; width: 11pt; height: 11pt; border: 1.25pt solid #000; vertical-align: middle; }
td.blank { width: 1.3in; }
.none { font-style: italic; }
.conditions { font-style: italic; }
@media print { body { padding: 0; max-width: none; } }
`

const CHECKBOX = '<td class="tick"><span class="box" aria-label="to do"></span></td>'

function header(input: GuideInput): string {
  return [
    `<h1>${escapeXml(input.boardName)} - build guide</h1>`,
    '<dl class="meta">',
    `<dt>Generated</dt><dd>${escapeXml(input.generated)}</dd>`,
    `<dt>Layout</dt><dd>${escapeXml(input.layoutPath)}</dd>`,
    `<dt>Schematic</dt><dd>${escapeXml(input.schematicPath)}</dd>`,
    "</dl>",
  ].join("\n")
}

function image(title: string, svg: string, pageBreak: boolean): string {
  const cls = pageBreak ? "layout page" : "layout"
  return `<figure class="${cls}"><figcaption>${escapeXml(title)}</figcaption>\n${svg.trim()}\n</figure>`
}

/** A table whose header row repeats on every printed page it spans. */
function tableWithHead(columns: readonly string[], bodyRows: readonly string[]): string {
  const head = `<thead><tr><th></th>${columns.map((column) => `<th>${escapeXml(column)}</th>`).join("")}</tr></thead>`
  return ["<table>", head, "<tbody>", ...bodyRows, "</tbody>", "</table>"].join("\n")
}

function table(columns: readonly string[], rows: readonly (readonly string[])[], cls: string): string {
  return tableWithHead(
    columns,
    rows.map((row) => `<tr class="${cls}">${CHECKBOX}${row.map((cell) => `<td>${escapeXml(cell)}</td>`).join("")}</tr>`),
  )
}

function checklistSection(section: ChecklistSection, index: number): string {
  const heading = `<h3>${index + 1}. ${escapeXml(section.title)}</h3>`
  if (section.rows.length === 0) {
    return `${heading}\n<p class="none">None on this board.</p>`
  }
  return `${heading}\n${table(section.columns, section.rows, "item")}`
}

function powerUp(powerUpChecks: PowerUpChecks | undefined): string {
  const heading = "<h2>Power-up checks</h2>"
  if (powerUpChecks === undefined) {
    return (
      `${heading}\n<p class="none">This board declares no power-up checks: its circuit module ` +
      "exports no <code>powerUpChecks()</code>.</p>"
    )
  }
  const rows = powerUpChecks.checks.map(
    (check) =>
      `<tr class="power-up">${CHECKBOX}<td>${escapeXml(check.label)}</td><td>${escapeXml(check.node)}</td>` +
      `<td>${check.expectedVolts.toFixed(2)} V</td><td class="blank"></td></tr>`,
  )
  return [
    heading,
    `<p class="conditions">${escapeXml(powerUpChecks.conditions)}</p>`,
    "<p>Power the board, then measure each node to ground with a DC voltmeter.</p>",
    tableWithHead(["Check", "Node", "Expected", "Measured"], rows),
  ].join("\n")
}

export function buildGuideHtml(input: GuideInput): string {
  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    `<title>${escapeXml(input.boardName)} build guide</title>`,
    `<style>${STYLE}</style>`,
    "</head>",
    "<body>",
    header(input),
    image("Component side - designators", input.images.designators, false),
    image("Component side - values", input.images.values, true),
    image("Copper side (mirrored) - cuts and solder bridges", input.images.copper, true),
    '<section class="page">',
    "<h2>Build checklist</h2>",
    "<p>In build order, top to bottom. Tick each item as it is done.</p>",
    ...input.checklist.map(checklistSection),
    "</section>",
    powerUp(input.powerUpChecks),
    "</body>",
    "</html>",
    "",
  ].join("\n")
}
