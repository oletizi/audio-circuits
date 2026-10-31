/**
 * Writes a board's printable build packet into `boards/<board>/guide/`:
 *
 *   layout-designators.svg  component side, parts labelled by designator
 *   layout-values.svg       component side, parts labelled by value
 *   copper-side.svg         mirrored copper side: strips, cuts, bridges
 *   layout-clusters.svg     component side, each stand-in group hatched
 *                           (only on a board that declares stand-in groups)
 *   guide.html              the build guide, embedding the three images
 *   guide.pdf               THE document: that page printed, with the
 *                           schematic merged in as page SCHEMATIC_PAGE
 *
 * **`guide.pdf` IS ONE DOCUMENT AND THERE IS NO SECOND PDF.** The owner,
 * 2026-10-30: *"merge them. I want a single printable document"*. It used to
 * be two - an eleven-page `guide.pdf` and a one-page `schematic.pdf` beside
 * it - and **nothing in the packet said there were two**: the guide's header
 * row named the `.kicad_sch`, which is useless on paper, while the printable
 * schematic page sat unnamed in the same directory. So the schematic is now a
 * page of the same PDF (`./merge-pdf.ts`), the header row names that page, and
 * `schematic.pdf` is an INTERMEDIATE this function removes before it publishes
 * anything - not a packet file. `SCHEMATIC_PDF` below is that intermediate's
 * name and nothing more.
 *
 * **`guide.pdf` IS WRITTEN BESIDE `guide.html`, NOT INSTEAD OF IT.** The HTML
 * is what all but one of its pages are rendered from - the page's own
 * `@page`/`@media print` rules are the pagination - and `guide/` is
 * regenerated whole and git-ignored, so keeping both costs nothing. The
 * converter and the merge tool are both resolved the way `kicad-cli` is and
 * both REFUSE BY NAME when missing; see `./print-pdf.ts` and `./merge-pdf.ts`.
 *
 * **NOTHING HERE SCALES A PAGE.** The schematic page goes in at whatever size
 * `kicad-cli` exported it, the merge step refuses a merge that resized
 * anything, and when that size is not the paper the guide prints on the
 * document SAYS SO on page one (`./schematic-notice.ts`'s
 * `schematicPaperNotice`). The owner prints US Letter; a drawing silently
 * shrunk to reach that tray is a drawing nobody approved.
 *
 * Everything is derived from the committed `.vrt`, schematic and circuit. The
 * packet is assembled in a staging directory beside `guide/` and swapped in
 * only once every file exists, so a failed run leaves the previous packet as
 * it was rather than half replaced.
 *
 * **THE SCHEMATIC PAGE IS THERE IFF THE BOARD HAS A SCHEMATIC, AND ITS
 * ABSENCE IS PRINTED RATHER THAN SILENT.** A board whose `perfboard.json`
 * declares no `"sch"` used to be refused outright, which put the packet step
 * out of reach of the five Pultec sections. So the packet is produced, and
 * `guide.html` carries a bordered notice on page one saying there is no
 * schematic, which declaration declares none, what the pages WERE checked
 * against, and what would put a schematic page there (`./guide.ts`'s
 * `GuideSchematic`). The thing being prevented is not the omission - it is a
 * four-page packet that reads as a five-page one with a page missing.
 *
 * The veroroute binary, kicad-cli, the circuit module and the filesystem
 * are injected, as they are for the other verbs, so no test needs any of
 * them.
 */
import fs from "node:fs"
import path from "node:path"
import { boardName, type PerfboardDeclaration } from "../perfboard/declaration.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { runnerFor, type VerbRun } from "../perfboard/verbs.ts"
import { wiringPath as boardWiringPath } from "../perfboard/wiring-sync.ts"
import type { Env } from "../perfboard/check.ts"
import { buildChecklist } from "./checklist.ts"
import { assertLayoutMatchesCircuit, componentAt, loadBoardCircuit, type BoardCircuit } from "./circuit.ts"
import { clusterMarking } from "./clusters.ts"
import { buildGuideHtml, type GuideImages } from "./guide.ts"
import { nodeMembers } from "./node-members.ts"
import { offBoardLabels, valueLabel } from "./off-board.ts"
import { padLabelOf } from "./pad-label.ts"
import { padTerminals } from "./pads.ts"
import { buildableDump } from "./preflight.ts"
import {
  defaultMergeSchematicPage,
  defaultPdfPageSizes,
  SCHEMATIC_PAGE,
} from "./merge-pdf.ts"
import { describePaper, GUIDE_PAPER, samePaper, type PageSize } from "./paper.ts"
import { defaultPrintGuidePdf } from "./print-pdf.ts"
import { renderLayout } from "./render.ts"
import { defaultExportSchematicPdf, onePage } from "./schematic-export.ts"
import { resolveSchematic } from "./schematic-source.ts"
import { wireLinkRefs } from "./wire-links.ts"

export { SCHEMATIC_PAGE } from "./merge-pdf.ts"
// RE-EXPORTED, not moved back: `defaultExportSchematicPdf` is the default
// behind `GuideDeps.exportSchematicPdf`, and every caller that overrides it
// imports the interface from here. It lives in `./schematic-export.ts` because
// the one-document change pushed this file past the 500-line ceiling.
export { defaultExportSchematicPdf } from "./schematic-export.ts"

/** The few filesystem operations the packet writer needs. */
export interface GuideFs {
  readonly makeDir: (dir: string) => void
  /** Removes a directory and everything in it; a missing one is not an error. */
  readonly removeDir: (dir: string) => void
  /**
   * Removes ONE file; a missing one is not an error.
   *
   * It exists for the two staging INTERMEDIATES - the printed-but-unmerged
   * guide and the exported schematic page - which are written inside the
   * staging directory, consumed by the merge, and must not reach the published
   * packet. Removing the whole directory is not an option: the rest of it is
   * the packet.
   */
  readonly removeFile: (file: string) => void
  readonly writeText: (file: string, text: string) => void
  readonly rename: (from: string, to: string) => void
}

export interface GuideDeps {
  /** The kicad-cli executable; required, never defaulted (make passes its own KICAD_CLI). */
  readonly kicadCli: string
  /**
   * The headless browser that prints `guide.html` to `guide.pdf`; required,
   * never defaulted here, exactly as `kicadCli` is - make/board.mk resolves
   * HTML_TO_PDF with its own default and passes it down.
   */
  readonly htmlToPdf: string
  /**
   * The tool that merges the schematic page into the printed guide so the
   * packet is one document; required, never defaulted here, exactly as
   * `kicadCli` and `htmlToPdf` are - make/board.mk resolves PDF_MERGE with its
   * own contingent default and passes it down. See `./merge-pdf.ts`.
   */
  readonly pdfMerge: string
  readonly runVeroroute?: (args: readonly string[]) => VerbRun
  readonly exportSchematicPdf?: (kicadCli: string, schPath: string, pdfPath: string) => void
  readonly printGuidePdf?: (htmlToPdf: string, htmlPath: string, pdfPath: string) => void
  /**
   * Joins the exported schematic page into the printed guide. Optional,
   * defaulting to the real one, and overridden for the reason
   * `printGuidePdf` is: a test driving an in-memory `GuideFs` has no real PDF
   * on disk for a real merge tool to read.
   */
  readonly mergeSchematicPage?: (
    pdfMerge: string,
    guidePdf: string,
    schematicPdf: string,
    outPath: string,
  ) => void
  /**
   * Reads the page sizes of the exported schematic, which is how the printed
   * page comes to know whether this document can be printed on one paper.
   * Optional and overridden for the same reason as `mergeSchematicPage`.
   */
  readonly pdfPageSizes?: (pdfMerge: string, pdf: string) => readonly PageSize[]
  readonly loadCircuit?: (declaration: PerfboardDeclaration) => Promise<BoardCircuit>
  readonly fs?: GuideFs
  readonly now?: () => Date
  readonly env?: Env
  readonly repoRoot?: string
}

export const CLUSTERS_SVG = "layout-clusters.svg"
export const GUIDE_HTML = "guide.html"
export const GUIDE_PDF = "guide.pdf"

/**
 * The printed guide before the schematic page is merged into it, and the
 * exported schematic page itself. **BOTH ARE STAGING INTERMEDIATES, NEITHER
 * IS A PACKET FILE**: they are written inside the staging directory, consumed
 * by `./merge-pdf.ts`, and removed before anything is published.
 *
 * `SCHEMATIC_PDF` kept its name because that is what the packet's second
 * document was called until 2026-10-30, and a reader of a `make guide` log or
 * an older report will look for it. What changed is that it no longer survives
 * the run: see this module's comment.
 */
export const GUIDE_PAGES_PDF = "guide-pages.pdf"
export const SCHEMATIC_PDF = "schematic.pdf"

/**
 * The files one packet holds, in the order they are written.
 *
 * **IT NO LONGER TAKES `hasSchematic`.** It did, because the packet had two
 * shapes - with and without a second `schematic.pdf` - and a caller had to say
 * which it was checking. The schematic is a PAGE of `guide.pdf` now, so the
 * file list is the same either way and a parameter distinguishing them would
 * be a distinction with nothing behind it. What tells a reader whether this
 * packet carries a schematic is the document itself: the header's `Schematic`
 * row, and the notice on page one when there is none.
 *
 * `hasClusters` remains, and for the reason it always had: a board that is not
 * one section of a shared ladder has no groups to hatch (`./clusters.ts`), and
 * naming `layout-clusters.svg` unconditionally would make such a board's
 * packet read as one with an image missing.
 */
export function packetFiles(hasClusters: boolean): readonly string[] {
  return [
    "layout-designators.svg",
    "layout-values.svg",
    "copper-side.svg",
    ...(hasClusters ? [CLUSTERS_SVG] : []),
    GUIDE_HTML,
    GUIDE_PDF,
  ]
}

const REAL_FS: GuideFs = {
  makeDir: (dir) => fs.mkdirSync(dir, { recursive: true }),
  removeDir: (dir) => fs.rmSync(dir, { recursive: true, force: true }),
  removeFile: (file) => fs.rmSync(file, { force: true }),
  writeText: (file, text) => fs.writeFileSync(file, text),
  rename: (from, to) => fs.renameSync(from, to),
}

function dumpBoard(declaration: PerfboardDeclaration, deps: GuideDeps): string {
  const run = runnerFor(deps)(["--dump-board", declaration.vrtPath])
  if (run.status !== 0) {
    throw new Error(
      `veroroute --dump-board ${declaration.vrtPath} exited ${run.status}; no guide was written.\n${run.output}`,
    )
  }
  return run.output
}

/** The local calendar day, YYYY-MM-DD: the day the operator ran it, not UTC's. */
function isoDate(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Build the packet for one declared board and return a one-line-per-file
 * report of what was written. Throws, writing nothing, when the layout's
 * cuts are unresolved, a part is floating, or any step fails. A board that
 * declares no schematic is NOT an error: see this module's comment.
 */
export async function writeGuidePacket(declaration: PerfboardDeclaration, deps: GuideDeps): Promise<string> {
  const schPath = declaration.schPath
  const dumpText = dumpBoard(declaration, deps)
  const dump = buildableDump(dumpText, declaration.vrtPath)
  // READ FROM THE TEXT, because a `BoardDump` carries no `PAD` lines - see
  // `./pads.ts`. A board with no off-board terminals gets an empty list; a
  // Pultec section gets one entry per panel-control terminal, and the images
  // then say so rather than leaving them off in silence.
  const pads = padTerminals(dumpText)
  const circuit = await (deps.loadCircuit ?? loadBoardCircuit)(declaration)
  assertLayoutMatchesCircuit(dump, circuit, pads)
  const edgeLabels = offBoardLabels(circuit)
  // ONE PAD-LABEL MAP, SHARED BY THE CHECKLIST AND ALL THREE IMAGES, built
  // here rather than inside the renderer or the checklist - the same
  // division as `designators` and `values` below. `componentAt` is valid
  // because `assertLayoutMatchesCircuit` has already run: every `pad.ref` it
  // reads is a circuit component. Built BEFORE the checklist, and handed to
  // it, so the junction table's pad rows and the images' pad labels can
  // never print two different answers for one pad.
  const padLabels = new Map(pads.map((pad) => [pad.identity, padLabelOf(componentAt(circuit, pad.ref), pad.pin)]))
  // ONE NODE-MEMBERS MAP, same reason and same place as padLabels just
  // above: the Cuts section's Separates column reads a NODE line's members
  // from the dump TEXT (`./node-members.ts`), and building it here, once,
  // keeps the checklist from being the second place that text gets read.
  const members = nodeMembers(dumpText)
  const checklist = buildChecklist(dump, circuit, edgeLabels, pads, padLabels, members)

  const name = boardName(declaration)
  const designators = new Map(dump.parts.map((part) => [part.ref, part.ref]))
  const values = new Map(dump.parts.map((part) => [part.ref, valueLabel(dump, part, circuit, "image")]))
  // ONE WIRE-LINK SET, SHARED BY ALL THREE IMAGES, built here for the reason
  // `padLabels` above is: the renderer holds no circuit knowledge, and a part
  // that resolves to 0 Ω must not be drawn as a resistor in one image and a
  // wire in another. The checklist asks the same question of the same circuit
  // through the same predicate (`lib/model/zero-ohm.ts`), which is what keeps
  // the printed table and these pictures from disagreeing about one part.
  const wireLinks = wireLinkRefs(dump, circuit)
  // ONE MARKING, BUILT HERE for the reason `padLabels` and `wireLinks` are:
  // which parts stand in for an absent section is a fact about the board's
  // `ScaffoldDoc` and the renderer holds no circuit knowledge. `undefined` on
  // a board with no stand-in groups, which is how the packet comes to have no
  // fourth image rather than an unhatched copy of the first.
  // THROUGH `circuit.designators`, NOT AGAINST THE DUMP'S REFS: a group's
  // partIds are component ids and this dump is keyed by designator, and
  // DESIGNATORS is the only place those two vocabularies meet (`./clusters.ts`,
  // and `tools/perfboard/scaffold-membership.ts` for the same rule on the
  // `make check` side of the same question).
  const clusters = clusterMarking(circuit.scaffold, circuit.designators, dump)
  const images: GuideImages = {
    designators: renderLayout(dump, designators, {
      view: "component",
      title: `${name} - designators`,
      edgeLabels,
      pads,
      padLabels,
      wireLinks,
      clusters: undefined,
    }),
    values: renderLayout(dump, values, {
      view: "component",
      title: `${name} - values`,
      edgeLabels,
      pads,
      padLabels,
      wireLinks,
      clusters: undefined,
    }),
    copper: renderLayout(dump, designators, {
      view: "copper",
      title: `${name} - copper side`,
      edgeLabels,
      pads,
      padLabels,
      wireLinks,
      clusters: undefined,
    }),
    // LABELLED BY DESIGNATOR, like the first image: the hatch says which group
    // a part is in and the designator is what the checklist's rows are keyed
    // by, so the two pages cross-reference without a third per-part string
    // inside the board outline (docs/known-gaps.md's G2 and G17).
    clusters:
      clusters === undefined
        ? undefined
        : renderLayout(dump, designators, {
            view: "component",
            title: `${name} - stand-in groups`,
            edgeLabels,
            pads,
            padLabels,
            wireLinks,
            clusters,
          }),
  }
  const repoRoot = deps.repoRoot ?? moduleRepoRoot()
  const { schematic } = resolveSchematic(declaration, schPath, repoRoot)
  // DETERMINED BY LOOKING, NOT BY `circuit.scaffold`: a board can carry a
  // `wiring.md` for reasons other than stand-in groups (off-board terminals,
  // a terminal block), and the two have in fact tracked each other only by
  // coincidence of what exists today - see `tools/perfboard/wiring-sync.ts`'s
  // own "no panel parts, no guide" rule. A board with none on disk gets no
  // row rather than a dangling name.
  const wiringFile = boardWiringPath(declaration)
  const wiringPath = fs.existsSync(wiringFile) ? path.relative(repoRoot, wiringFile) : undefined

  const files = deps.fs ?? REAL_FS
  const guideDir = path.join(declaration.dir, "guide")
  const staging = path.join(declaration.dir, `.guide-staging-${process.pid}`)
  const schematicPdf = path.join(staging, SCHEMATIC_PDF)
  const carriesSchematic = schematic.kind === "printed"
  files.removeDir(staging)
  files.makeDir(staging)
  let schematicPaper: PageSize | undefined
  try {
    files.writeText(path.join(staging, "layout-designators.svg"), images.designators)
    files.writeText(path.join(staging, "layout-values.svg"), images.values)
    files.writeText(path.join(staging, "copper-side.svg"), images.copper)
    if (images.clusters !== undefined) {
      files.writeText(path.join(staging, CLUSTERS_SVG), images.clusters)
    }
    // THE SCHEMATIC IS EXPORTED AND MEASURED BEFORE THE GUIDE IS BUILT, which
    // reverses the order this function used until 2026-10-30. The page that
    // announces the schematic now has to say WHERE it is and, when it is not
    // on this document's paper, what paper it needs - and that size is a
    // measurement of the exported PDF, not a declaration anybody wrote down.
    // So the export comes first and `buildGuideHtml` is handed the result.
    if (schPath !== undefined) {
      ;(deps.exportSchematicPdf ?? defaultExportSchematicPdf)(deps.kicadCli, schPath, schematicPdf)
    }
    if (carriesSchematic) {
      schematicPaper = onePage(name, (deps.pdfPageSizes ?? defaultPdfPageSizes)(deps.pdfMerge, schematicPdf))
    }
    const html = buildGuideHtml({
      boardName: name,
      generated: isoDate((deps.now ?? (() => new Date()))()),
      layoutPath: path.relative(repoRoot, declaration.vrtPath),
      schematic,
      images,
      checklist,
      powerUpChecks: circuit.powerUpChecks,
      wiringPath,
      // STRAIGHT OFF THE CIRCUIT, undefined and all: a board that declares no
      // SCAFFOLD prints the sentence `tools/guide/stand-in-section.ts` holds
      // for that case, and collapsing undefined into an empty doc here would
      // make "this board is not a Pultec section" print as "this section has
      // no groups" - two different claims (`./circuit.ts`'s field comment).
      scaffold: circuit.scaffold,
      schematicPaper,
    })
    // THE PRINT AND THE MERGE ARE BOTH INSIDE THE STAGING GUARANTEE, not
    // after the swap: a converter or a merge tool that is missing, or that
    // succeeds while producing nothing usable, must leave the previous packet
    // exactly as it was, the same as a failed kicad-cli does. Printing or
    // merging after the rename would instead publish a packet whose document
    // is absent or, worse, left over from the last run.
    const htmlPath = path.join(staging, GUIDE_HTML)
    files.writeText(htmlPath, html)
    const guidePdf = path.join(staging, GUIDE_PDF)
    // PRINTED STRAIGHT TO `guide.pdf` WHEN THERE IS NOTHING TO MERGE, and to
    // an intermediate when there is. A board with no schematic page needs no
    // merge tool to produce its one document, and requiring one would refuse
    // a packet that was already complete.
    const printed = carriesSchematic ? path.join(staging, GUIDE_PAGES_PDF) : guidePdf
    ;(deps.printGuidePdf ?? defaultPrintGuidePdf)(deps.htmlToPdf, htmlPath, printed)
    if (carriesSchematic) {
      ;(deps.mergeSchematicPage ?? defaultMergeSchematicPage)(deps.pdfMerge, printed, schematicPdf, guidePdf)
      // THE TWO INTERMEDIATES GO, so the published packet is the file list
      // `packetFiles` names and nothing else. A `schematic.pdf` left beside
      // the merged document would be the same printable page twice with
      // nothing saying which to print - the state the owner asked to end.
      files.removeFile(printed)
      files.removeFile(schematicPdf)
    }
    files.removeDir(guideDir)
    files.rename(staging, guideDir)
  } catch (caught) {
    files.removeDir(staging)
    throw caught
  }
  return [
    `Wrote the build packet for ${name} to ${guideDir}:`,
    ...packetFiles(images.clusters !== undefined).map((file) => `  ${file}`),
    // ONE DOCUMENT, SAID IN THE CONSOLE AS WELL AS ON THE PAGE: the packet
    // was two PDFs until 2026-10-30 and an operator who remembers that will
    // look for the second one.
    ...(carriesSchematic
      ? [
          `${GUIDE_PDF} is ONE document: page ${String(SCHEMATIC_PAGE)} is the schematic. There is ` +
            `no separate ${SCHEMATIC_PDF} any more.`,
          ...(schematicPaper === undefined || samePaper(schematicPaper, GUIDE_PAPER)
            ? []
            : [
                `BUT page ${String(SCHEMATIC_PAGE)} is ${describePaper(schematicPaper)}, not ` +
                  `${describePaper(GUIDE_PAPER)} like the rest of it. Nothing was scaled; ` +
                  `${GUIDE_HTML} says so on page one. The size comes from the sheet's own ` +
                  '"(paper ...)" setting, and changing that is a change its reviewer has to approve.',
              ]),
        ]
      : []),
    // SAID IN THE CONSOLE AS WELL AS ON THE PAGE, and the page is the one that
    // matters: someone builds from paper, and a console line scrolls away.
    ...(schematic.kind === "none"
      ? [
          `${name} declares no "sch", so this packet has no schematic page. guide.html says so on ` +
            `page one, naming ${declaration.file} and the circuit model the pages were checked against.`,
        ]
      : []),
  ].join("\n")
}
