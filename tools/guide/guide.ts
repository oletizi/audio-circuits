/**
 * The build guide page: one self-contained HTML file, printed from a browser.
 *
 * In order: the header (board, date, the layout and schematic it came
 * from); the no-schematic notice, when there is one; the layout images,
 * inline, one to a page - the three every board has, then the hatched
 * stand-in-groups image on a board that has groups; the stand-in groups section (see
 * `stand-in-section.ts`), which is the configuration decision the checklist's
 * Fit column then refers to; the build checklist in the operator's order
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
 *
 * **`kind: "withheld"` IS A DIFFERENT CLAIM FROM `"none"` AND PRINTS A
 * DIFFERENT NOTICE, AND IT IS ITSELF NOT ONE CLAIM BUT TWO.** `none` says
 * this board declares no schematic at all. `withheld` says `schgen` was
 * offered the board's own declaration and the result was judged unfit to
 * build from - and which of two things that means is `GuideSchematic`'s
 * `drawn` field, carried through from `tools/guide/schematic-source.ts`: a
 * sheet was actually drawn and withheld for what is on it (`drawn: true`),
 * or nothing was drawn at all - a refusal, or a generation that drew zero
 * sheets (`drawn: false`). The owner's own words are why `withheld` is a
 * gate rather than a softer warning: *"if the schematics are wonky, it's
 * worse than having nothing at all."* `kind: "generated"` is the fourth
 * state, printed as a schematic page like `"printed"` is, plus one line
 * saying the sheet came from `schgen` rather than a hand-drawn source.
 *
 * `GuideSchematic` itself, the header row and both notices live in
 * `./schematic-notice.ts` - split out to keep this file under the project's
 * 300-500 line ceiling, the same way `resolveSchematic` lives in
 * `./schematic-source.ts` rather than in `./packet.ts`.
 */
import type { ScaffoldDoc } from "../../lib/board/scaffold/doc.ts"
import type { ChecklistSection } from "./checklist.ts"
import type { PowerUpChecks } from "./power-up.ts"
import { generatedNote, header, noSchematicNotice, withheldSchematicNotice, type GuideSchematic } from "./schematic-notice.ts"
import { standInSection, type StandInGroupBlock, type StandInSection } from "./stand-in-section.ts"
import { escapeXml } from "./svg.ts"

export type { GuideSchematic } from "./schematic-notice.ts"

export interface GuideImages {
  readonly designators: string
  readonly values: string
  readonly copper: string
  /**
   * The stand-in-groups image: the component side with each group hatched, and
   * a legend naming the groups and saying what an unhatched part is.
   *
   * `undefined` on a board with no stand-in groups to show - it is not a
   * Pultec section, or its scaffold declares none (`./clusters.ts`). The page
   * is then absent and the **Stand-in groups** section below says in words
   * which of those two it is, rather than a hatch-free copy of the first image
   * whose legend announces groups the board does not have.
   *
   * Required and explicitly `undefined`, as `powerUpChecks` is: a caller
   * states which shape its packet has rather than omitting the field.
   */
  readonly clusters: string | undefined
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
  /**
   * The board's `wiring.md`, repository-relative - `undefined` when the
   * board has no such file on disk. This packet does not replace that
   * document; it only names it, on page one, so a reader holding this
   * packet knows there is more to read before they wire anything.
   */
  readonly wiringPath: string | undefined
  /**
   * The board's stand-in groups, straight off `BoardCircuit.scaffold` -
   * `undefined` when the board declares no `SCAFFOLD`, which prints the one
   * sentence `./stand-in-section.ts` holds for that case rather than nothing.
   *
   * Passed raw, the way `powerUpChecks` is, rather than pre-rendered by the
   * caller: `standInSection` below turns it into the section's content and
   * this file decides where that content sits on the page.
   */
  readonly scaffold: ScaffoldDoc | undefined
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
p.note { margin: 0 0 5pt; }
.conditions { font-style: italic; }
.notice { border: 2pt solid #000; padding: 7pt 9pt; margin: 12pt 0 0; page-break-inside: avoid; break-inside: avoid; }
.notice h2 { margin: 0 0 5pt; border-bottom: 0.75pt solid #000; }
.notice p { margin: 0 0 5pt; }
.notice p:last-child { margin-bottom: 0; }
.notice code { font-family: Menlo, Consolas, monospace; font-size: 9.5pt; }
p.build-line { font-size: 12pt; font-weight: bold; margin: 10pt 0 2pt; }
p.build-line .write-in { font-weight: normal; }
.write-in { display: inline-block; min-width: 2in; border-bottom: 1pt solid #000; }
.write-in.wide { min-width: 4in; }
ul.states { margin: 0 0 6pt; padding-left: 22pt; }
ul.states li { margin-bottom: 3pt; }
p.mark-one { font-style: italic; margin: 0 0 4pt; }
p.parts { margin: 0 0 5pt; }
.group { page-break-inside: avoid; break-inside: avoid; margin-bottom: 10pt; }
@media print { body { padding: 0; max-width: none; } }
`

const CHECKBOX = '<td class="tick"><span class="box" aria-label="to do"></span></td>'

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

/**
 * One checklist step: its heading, the sentence the section carries when it has
 * one, then the table.
 *
 * **THE NOTE IS PRINTED BEFORE THE TABLE AND ONLY WHEN THE SECTION SET ONE.**
 * `./checklist.ts` sets it only for rows that need it - today, that a row named
 * by a designator among the W-numbered wires is a part with no resistance, so
 * what goes in its holes is a wire or a solder bridge. It is printed above the
 * rows because a reader who meets the row first has already decided the sheet
 * is wrong, which is the cost the note exists to avoid. A section with no rows
 * prints no note either: there would be nothing for it to be about.
 */
function checklistSection(section: ChecklistSection, index: number): string {
  const heading = `<h3>${index + 1}. ${escapeXml(section.title)}</h3>`
  if (section.rows.length === 0) {
    return `${heading}\n<p class="none">None on this board.</p>`
  }
  const note = section.note === undefined ? [] : [`<p class="note">${escapeXml(section.note)}</p>`]
  return [heading, ...note, table(section.columns, section.rows, "item")].join("\n")
}

/** A table with no leading checkbox column: nothing in it is an item to tick. */
function plainTable(columns: readonly string[], rows: readonly (readonly string[])[], cls: string): string {
  const head = `<thead><tr>${columns.map((column) => `<th>${escapeXml(column)}</th>`).join("")}</tr></thead>`
  const body = rows.map(
    (row) => `<tr class="${cls}">${row.map((cell) => `<td>${escapeXml(cell)}</td>`).join("")}</tr>`,
  )
  return ["<table>", head, "<tbody>", ...body, "</tbody>", "</table>"].join("\n")
}

/**
 * One stand-in group: what it stands in for, its parts, the Fit cell they
 * carry in the checklist, and the three states it can be in.
 *
 * **THE THREE STATES ARE A LIST TO MARK ONE OF, NOT THREE CHECKBOXES AND NOT
 * ONE.** `./stand-in-section.ts`'s module comment has the reasoning: a box on
 * a group is unreadable either way round, so the group records which named
 * state it is in. The "carried on" state ends in a ruled blank, because that
 * state is not complete until the board carrying the group is written on it.
 */
function groupBlock(block: StandInGroupBlock, markOne: string): string {
  const parts = block.partCount === 1 ? "1 part" : `${block.partCount} parts`
  const states = block.states.map(
    (state) =>
      `<li>${escapeXml(state.text)}${state.writeIn ? ' <span class="write-in"></span>' : ""}</li>`,
  )
  return [
    '<div class="group">',
    `<h3>${escapeXml(block.section)} - ${parts}, standing in for the absent ${escapeXml(block.section)} section</h3>`,
    `<p class="parts">Parts: ${escapeXml(block.partIds.join(", "))}</p>`,
    // NAMED BY THE FIT CELL, NOT BY A SECTION OF THE CHECKLIST. A group's
    // parts do not sit together there: a stand-in that resolves to 0 Ω is a
    // row in **Wire links** while the rest of its group is among the
    // resistors or capacitors (`./checklist.ts`'s module comment), so a block
    // that sent a builder to one section would send them looking for a row
    // that is somewhere else. The cell is the one thing every row of this
    // group carries, wherever it landed.
    `<p class="parts">Every row in the build checklist whose Fit column reads ` +
      `<em>${escapeXml(block.fitLabel)}</em> is one of these, in whichever section that part's ` +
      "row sits.</p>",
    `<p class="mark-one">${escapeXml(markOne)}</p>`,
    '<ul class="states">',
    ...states,
    "</ul>",
    "</div>",
  ].join("\n")
}

/**
 * The stand-in groups section: on its own page AHEAD OF THE CHECKLIST when the
 * board HAS groups, and inline when it has none.
 *
 * The order is the builder's order, not the document's: the Fit column on a
 * part row names a group, and a reader who meets that cell before this page
 * has met a condition with nothing to resolve it against. So the decision is
 * taken here - which build, and which state each group is in - and the part
 * sections are then read with the answers in hand.
 *
 * **THE EMPTY ARM TAKES NO SHEET, AND THAT IS NOT A STYLE CHOICE.** The reason
 * above is about the groups arm only: a board that declares no `SCAFFOLD` has
 * no cells naming a group and no condition to resolve, so nothing on it needs
 * a page of its own. What the spec asked for on that board is **one sentence**,
 * citing the `NO_FOOTPRINT` / `NO_SPAN` precedent - a cell or a line, not a
 * sheet - and the shared `page` wrapper was quietly spending one on each of the
 * six boards that declare none. So the `"none"` arm is inline, the way the
 * "declares no power-up checks" notice below it is, and the page measurement is
 * in `docs/known-gaps.md`'s G62.
 */
function standIn(scaffold: ScaffoldDoc | undefined, wiringPath: string | undefined): readonly string[] {
  // THE SAME `wiringPath` THE HEADER'S Wiring guide ROW USES, so the section's
  // prose and page one cannot disagree about whether this board has a sheet.
  // `tools/guide/packet.ts` decides that by looking at disk rather than from the
  // scaffold, deliberately, and this threads the answer rather than re-deriving
  // it (`./stand-in-section.ts`'s `wiringSentence`).
  const section: StandInSection = standInSection(scaffold, wiringPath)
  if (section.kind === "none") {
    return [
      '<section class="stand-in">',
      "<h2>Stand-in groups</h2>",
      `<p>${escapeXml(section.sentence)}</p>`,
      "</section>",
    ]
  }
  return [
    '<section class="page stand-in">',
    "<h2>Stand-in groups</h2>",
    `<p class="build-line">${escapeXml(section.buildPrompt)} <span class="write-in wide"></span></p>`,
    "<p>Write the build you are on before anything below: this packet carries every build this " +
      "board can be part of, and no group decision below means anything until that line is filled " +
      "in. The table at the end of this section is where that line comes from.</p>",
    ...section.intro.map((paragraph) => `<p>${escapeXml(paragraph)}</p>`),
    ...section.rules.map((rule) => `<p><strong>${escapeXml(rule)}</strong></p>`),
    ...(section.noGroups === undefined ? [] : [`<p>${escapeXml(section.noGroups)}</p>`]),
    ...section.groups.map((block) => groupBlock(block, section.markOne)),
    "<h3>What to populate, by build</h3>",
    ...section.buildIntro.map((paragraph) => `<p>${escapeXml(paragraph)}</p>`),
    plainTable(section.buildColumns, section.buildRows, "build"),
    "</section>",
  ]
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
    ...generatedNote(input.schematic),
    ...noSchematicNotice(input.boardName, input.schematic),
    ...withheldSchematicNotice(input.boardName, input.schematic),
    image("Component side - designators", input.images.designators, false),
    image("Component side - values", input.images.values, true),
    image("Copper side (mirrored) - cuts and solder bridges", input.images.copper, true),
    // IMMEDIATELY BEFORE THE STAND-IN GROUPS SECTION, which is the decision it
    // informs: the picture shows where each group sits on the board, and the
    // page after it is where the builder records which groups this build
    // populates. Putting it among the first three images would separate the two
    // by the whole copper side.
    ...(input.images.clusters === undefined
      ? []
      : [image("Component side - stand-in groups (hatched)", input.images.clusters, true)]),
    ...standIn(input.scaffold, input.wiringPath),
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
