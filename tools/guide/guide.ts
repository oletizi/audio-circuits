/**
 * The build guide page: one self-contained HTML file, printed from a browser.
 *
 * In order: the header (board, date, the layout and schematic it came
 * from); the no-schematic notice, when there is one; the three layout
 * images, inline, one to a page; the build checklist in the operator's order
 * (see `checklist.ts`), every row with a printed checkbox; then the power-up
 * checks, with a blank for each reading. Print CSS targets US Letter, draws
 * nothing on a background and breaks the page between the images and the
 * checklist, so it reads the same from a black-and-white laser printer as on
 * screen.
 *
 * **A PACKET WITHOUT A SCHEMATIC SAYS SO ON THE PAPER.** `GuideSchematic` is
 * a union rather than an optional path precisely so the absence is a shape
 * this file has to handle rather than a field it can skip: `kind: "none"`
 * prints the header row as "none" AND a bordered notice on page one, above
 * the first image, naming the board, the declaration that declares no
 * schematic, the circuit model the pages were checked against instead, and
 * what would put a schematic page here. The failure being prevented is a
 * reader holding four pages and concluding the fifth fell out of the
 * stapler - a skipped step that looks like a passing one.
 */
import type { ChecklistSection } from "./checklist.ts"
import type { PowerUpChecks } from "./power-up.ts"
import { escapeXml } from "./svg.ts"

export interface GuideImages {
  readonly designators: string
  readonly values: string
  readonly copper: string
}

/**
 * The packet's schematic: the repository-relative path of the one it printed,
 * or the two paths the notice needs when there is none to print.
 *
 * Both members of `"none"` are REQUIRED and neither is defaulted. The notice
 * has to send a reader somewhere - to the file that would declare a schematic,
 * and to the model the printed pages were actually checked against - and a
 * notice that merely announced an absence would be the silence this union
 * exists to break.
 */
export type GuideSchematic =
  | { readonly kind: "printed"; readonly path: string }
  | {
      readonly kind: "none"
      /** Repository-relative perfboard.json: the only place a board names its schematic. */
      readonly declarationPath: string
      /** Repository-relative circuit module: what the layout and checklist were checked against. */
      readonly circuitPath: string
    }

export interface GuideInput {
  readonly boardName: string
  /** The day the packet was generated, as YYYY-MM-DD. */
  readonly generated: string
  readonly layoutPath: string
  readonly schematic: GuideSchematic
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
.notice { border: 2pt solid #000; padding: 7pt 9pt; margin: 12pt 0 0; page-break-inside: avoid; break-inside: avoid; }
.notice h2 { margin: 0 0 5pt; border-bottom: 0.75pt solid #000; }
.notice p { margin: 0 0 5pt; }
.notice p:last-child { margin-bottom: 0; }
.notice code { font-family: Menlo, Consolas, monospace; font-size: 9.5pt; }
@media print { body { padding: 0; max-width: none; } }
`

const CHECKBOX = '<td class="tick"><span class="box" aria-label="to do"></span></td>'

/** The one-line Schematic entry in the header: the path, or a pointer to the notice. */
function schematicRow(schematic: GuideSchematic): string {
  const text =
    schematic.kind === "printed"
      ? schematic.path
      : 'none - see "No schematic in this packet" below'
  return `<dt>Schematic</dt><dd>${escapeXml(text)}</dd>`
}

function header(input: GuideInput): string {
  return [
    `<h1>${escapeXml(input.boardName)} - build guide</h1>`,
    '<dl class="meta">',
    `<dt>Generated</dt><dd>${escapeXml(input.generated)}</dd>`,
    `<dt>Layout</dt><dd>${escapeXml(input.layoutPath)}</dd>`,
    schematicRow(input.schematic),
    "</dl>",
  ].join("\n")
}

/**
 * The printed statement that stands where the schematic page would be.
 *
 * It is a page-one block, between the header and the first image, so it
 * cannot be mistaken for a page that fell out of the stapler: a reader sees
 * it before any layout. No lines at all when a schematic WAS printed - the
 * notice must never appear on a complete packet, where it would be a false
 * alarm.
 */
function noSchematicNotice(boardName: string, schematic: GuideSchematic): readonly string[] {
  if (schematic.kind === "printed") return []
  const code = (text: string): string => `<code>${escapeXml(text)}</code>`
  return [
    '<section class="notice">',
    "<h2>No schematic in this packet</h2>",
    `<p><strong>This packet prints no schematic, and no schematic page has gone missing from it: ` +
      `there is no schematic for ${escapeXml(boardName)} to print.</strong></p>`,
    `<p>A board names its schematic in its own ${code("perfboard.json")}, and ` +
      `${code(schematic.declarationPath)} names none - so no file in this repository claims to be ` +
      `this board's schematic. What these pages were built from and checked against instead is the ` +
      `circuit model in ${code(schematic.circuitPath)}: every part, value, lead and connection in ` +
      `the checklist comes from that model, and this packet refuses to build at all if the layout ` +
      `and the model disagree about any part.</p>`,
    `<p>What would put a schematic page here: declare this board's schematic in ` +
      `${code(schematic.declarationPath)} as an ${code('"sch"')} / ${code('"netlist"')} pair, then ` +
      `run ${code("make guide")} again. The packet prints the schematic on every board that ` +
      `declares one.</p>`,
    "</section>",
  ]
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
    ...noSchematicNotice(input.boardName, input.schematic),
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
