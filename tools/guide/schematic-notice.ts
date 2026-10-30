/**
 * The build guide's header and schematic notices: `GuideSchematic`, the
 * `<h1>`/`<dl class="meta">` header block, and the two bordered notices that
 * stand in for a missing or withheld schematic page.
 *
 * Split out of `tools/guide/guide.ts` (which was pushing this project's
 * 300-500 line ceiling) rather than left there, for the same reason
 * `tools/guide/schematic-source.ts` was split out of `tools/guide/packet.ts`:
 * the schematic-specific part of the page - what `GuideSchematic` can be and
 * what gets printed for each shape of it - has one file to itself.
 */
import { SCHEMATIC_PAGE } from "./merge-pdf.ts"
import { describePaper, GUIDE_PAPER, samePaper, type PageSize } from "./paper.ts"
import { escapeXml } from "./svg.ts"

/**
 * The packet's schematic: the repository-relative path of the one it printed,
 * a generated one `schgen` drew from the board's own declaration, or the
 * paths the notice needs when there is none to print or none fit to print.
 *
 * Both members of `"none"` are REQUIRED and neither is defaulted. The notice
 * has to send a reader somewhere - to the file that would declare a schematic,
 * and to the model the printed pages were actually checked against - and a
 * notice that merely announced an absence would be the silence this union
 * exists to break.
 *
 * **`"withheld"` is a FOURTH variant, never collapsed into `"none"`.** `none`
 * means this board declares no schematic at all. `withheld` means `schgen`
 * was offered the board's declaration and the result was judged unfit to
 * build from - refused outright, drawn nothing at all, or drawn with text the
 * placer could not keep clear. Those are different claims about different
 * situations, and printing one notice for all of them would be exactly the
 * silent skip this file's own module comment names as the failure to avoid.
 */
export type GuideSchematic =
  | { readonly kind: "printed"; readonly path: string }
  // NO `path`, UNLIKE `"printed"`, and the absence is the point: a generated
  // sheet has no committed source file to name - it was drawn from the board's
  // own declaration into a temporary directory and exported from there. The
  // field it used to carry was the string `"schematic.pdf"`, which named the
  // packet's SECOND FILE; that file is gone (the page is merged into the one
  // document now), so the field named nothing and is deleted rather than left
  // for somebody to find and trust. `generatedNote` below is what says where
  // this page came from.
  | { readonly kind: "generated" }
  | {
      readonly kind: "withheld"
      /** Repository-relative perfboard.json. */
      readonly declarationPath: string
      /** Repository-relative circuit module: what the pages WERE checked against. */
      readonly circuitPath: string
      /** Why it was withheld, in the words the gate used. Never empty. */
      readonly reason: string
      /**
       * Whether `schgen` actually drew a sheet before it was judged unfit to
       * build from. `false` for a refusal or a zero-sheet generation - there
       * is no sheet, so there is nothing drawn "over something" to withhold.
       * `true` only when a sheet was drawn and carries a field-placement
       * fallback: text the placer drew over something real. The printed
       * notice reads this field rather than assuming every `"withheld"` drew
       * a sheet - see `withheldSchematicNotice` below.
       */
      readonly drawn: boolean
    }
  | {
      readonly kind: "none"
      /** Repository-relative perfboard.json: the only place a board names its schematic. */
      readonly declarationPath: string
      /** Repository-relative circuit module: what the layout and checklist were checked against. */
      readonly circuitPath: string
    }

/** The few header fields the Schematic/Wiring rows need - a subset of `GuideInput`. */
export interface GuideHeaderInput {
  readonly boardName: string
  /** The day the packet was generated, as YYYY-MM-DD. */
  readonly generated: string
  readonly layoutPath: string
  readonly schematic: GuideSchematic
  readonly wiringPath: string | undefined
}

/**
 * The one-line Schematic entry in the header: **where in THIS document the
 * schematic is**, or a pointer to the notice saying why it is not here.
 *
 * **IT NAMED THE `.kicad_sch`, AND A BUILDER AT A BENCH CANNOT OPEN ONE.**
 * That is the defect this row's wording fixes, reported in
 * `docs/research/2026-10-29-guides-with-approved-schematics.md` §6.1: the four
 * declared boards printed
 * `drafted/pultec/pultec-hi-cut/pultec-hi-cut.generated-do-not-edit.kicad_sch`
 * in a row headed `Schematic`, while the printable page sat unnamed beside it
 * in a second file. A page number in the document the reader is holding is a
 * pointer they can follow; a path to a KiCad source file is not, on paper.
 *
 * The source sheet is still named, after the page number, because provenance
 * is worth a line - but it is now plainly the SOURCE of page
 * `SCHEMATIC_PAGE`, not an instruction about where to look.
 */
function schematicRow(schematic: GuideSchematic): string {
  const page = `page ${String(SCHEMATIC_PAGE)} of this document`
  const text =
    schematic.kind === "printed"
      ? `${page}, printed from ${schematic.path}`
      : schematic.kind === "generated"
        ? `${page}, generated by schgen - see the note below`
        : schematic.kind === "withheld"
          ? 'withheld - see "Schematic withheld" below'
          : 'none - see "No schematic in this packet" below'
  return `<dt>Schematic</dt><dd>${escapeXml(text)}</dd>`
}

/**
 * The printed statement that this document's schematic page is not on the
 * paper the rest of it is on.
 *
 * **IT EXISTS BECAUSE THE ALTERNATIVE IS A DOCUMENT THAT SILENTLY NEEDS A
 * PRINTER THE READER MAY NOT OWN.** The owner, 2026-10-30: *"I don't have an
 * A3-capable printer. I live in california and have a printer capable of
 * printing US letter 8.5x11"."* Four of the five Pultec sheets declare A4 and
 * the fifth declares A3, so every packet today carries one page that is not
 * US Letter. Nothing in this repository scales it - `./merge-pdf.ts` refuses a
 * merge that resized any page - so the reader's own printer would, by a factor
 * nobody chose. This notice is what makes that visible before the paper comes
 * out of the tray.
 *
 * No lines at all when the schematic page IS on the guide's paper, which is
 * the state this notice is waiting for: a notice printed on a document that
 * prints fine would be the false alarm that devalues it everywhere it is true.
 */
export function schematicPaperNotice(
  schematic: GuideSchematic,
  schematicPaper: PageSize | undefined,
): readonly string[] {
  if (schematicPaper === undefined) return []
  if (schematic.kind !== "printed" && schematic.kind !== "generated") return []
  if (samePaper(schematicPaper, GUIDE_PAPER)) return []
  const code = (text: string): string => `<code>${escapeXml(text)}</code>`
  const source = schematic.kind === "printed" ? schematic.path : "the sheet schgen generated"
  return [
    '<section class="notice">',
    `<h2>Page ${String(SCHEMATIC_PAGE)} is not on this document's paper</h2>`,
    `<p><strong>Every page of this document is ${escapeXml(describePaper(GUIDE_PAPER))} except page ` +
      `${String(SCHEMATIC_PAGE)}, the schematic, which is ${escapeXml(describePaper(schematicPaper))}.` +
      "</strong></p>",
    `<p>Nothing here has scaled it: the page goes in exactly as it was exported, and the packet ` +
      `refuses to publish a merge that resized any page. So a printer given this document and ` +
      `${escapeXml(describePaper(GUIDE_PAPER))} paper will either shrink page ` +
      `${String(SCHEMATIC_PAGE)} by a factor nobody here chose, or clip it. Print that page on its ` +
      `own paper, or accept the printer's reduction knowingly.</p>`,
    `<p>The page's size comes from the ${code("(paper ...)")} setting in ${code(source)}, not from ` +
      "this packet. Changing it moves the sheet frame and title block, so it is a change the " +
      "drawing's reviewer has to approve - it is not something this tool does on its own.</p>",
    "</section>",
  ]
}

/**
 * The one line that distinguishes a `schgen`-drawn sheet from a hand-authored
 * one, printed right after the header on a `"generated"` packet and nowhere
 * else: a reader holding a generated sheet is looking at a different kind of
 * artifact than a hand-drawn schematic, even though this packet treats both
 * as fit to build from.
 */
export function generatedNote(schematic: GuideSchematic): readonly string[] {
  if (schematic.kind !== "generated") return []
  return [
    '<p class="note">This schematic was generated by <code>schgen</code> from the board\'s own ' +
      "authoring declaration; it is not hand-drawn.</p>",
  ]
}

/**
 * The one-line Wiring guide entry: only present when the board has a
 * `wiring.md` on disk. It names the file and says plainly that this packet
 * does not replace it, because the checklist and images here cover the
 * board itself - not the off-board terminals, stand-in groups and builds
 * `wiring.md` describes.
 */
function wiringRow(wiringPath: string): string {
  return (
    `<dt>Wiring guide</dt><dd>${escapeXml(wiringPath)} - this packet does not replace it, ` +
    "read it alongside this one</dd>"
  )
}

export function header(input: GuideHeaderInput): string {
  return [
    `<h1>${escapeXml(input.boardName)} - build guide</h1>`,
    '<dl class="meta">',
    `<dt>Generated</dt><dd>${escapeXml(input.generated)}</dd>`,
    `<dt>Layout</dt><dd>${escapeXml(input.layoutPath)}</dd>`,
    schematicRow(input.schematic),
    ...(input.wiringPath === undefined ? [] : [wiringRow(input.wiringPath)]),
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
export function noSchematicNotice(boardName: string, schematic: GuideSchematic): readonly string[] {
  if (schematic.kind !== "none") return []
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

/**
 * The printed statement that stands where a schematic from `schgen` was
 * withheld: a DIFFERENT claim from `noSchematicNotice` above, and printed only
 * for `"withheld"`.
 *
 * **`withheld` COVERS TWO DIFFERENT CLAIMS, AND `schematic.drawn` IS WHICH ONE
 * THIS NOTICE MAKES.** `drawn: true` means a sheet WAS generated from this
 * board's own declaration and judged unfit to build from - text the placer
 * could not keep clear, drawn over something. `drawn: false` means `schgen`
 * never produced a sheet to judge at all - it refused outright, or reported
 * "generated" having drawn zero sheets. Printing the `drawn: true` sentence
 * for a `drawn: false` result would assert a drawing exists when none does,
 * which is the live defect this field was added to close (the finding: *"an
 * operator ... gets a bench page claiming a schematic was generated when none
 * was"*). Collapsing either case into the no-schematic notice would read as
 * the quieter claim - "this board has none" - instead of what actually
 * happened, which is the worse of the two things CLAUDE.md says about this
 * packet: *"if the schematics are wonky, it's worse than having nothing at
 * all."*
 */
export function withheldSchematicNotice(boardName: string, schematic: GuideSchematic): readonly string[] {
  if (schematic.kind !== "withheld") return []
  const code = (text: string): string => `<code>${escapeXml(text)}</code>`
  const claim = schematic.drawn
    ? `schgen generated one from this board's own declaration and it was withheld as not fit to build from.`
    : `schgen was offered this board's own declaration and produced no sheet to judge, so there is ` +
      `nothing drawn to withhold - see the reason below for why nothing was drawn.`
  return [
    '<section class="notice">',
    "<h2>Schematic withheld</h2>",
    `<p><strong>This packet prints no schematic for ${escapeXml(boardName)}: ${claim}</strong></p>`,
    `<p>Declared in ${code(schematic.declarationPath)}. What these pages were checked against instead ` +
      `is the circuit model in ${code(schematic.circuitPath)}: every part, value, lead and connection ` +
      "in the checklist comes from that model, independently of whatever schgen did or did not draw.</p>",
    `<p>Withheld because: ${escapeXml(schematic.reason)}</p>`,
    `<p>Reproduce this measurement with ${code("bun run tools/schgen/board-geometry.ts")}.</p>`,
    "</section>",
  ]
}
