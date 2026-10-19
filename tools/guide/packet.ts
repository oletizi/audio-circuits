/**
 * Writes a board's printable build packet into `boards/<board>/guide/`:
 *
 *   layout-designators.svg  component side, parts labelled by designator
 *   layout-values.svg       component side, parts labelled by value
 *   copper-side.svg         mirrored copper side: strips, cuts, bridges
 *   schematic.pdf           kicad-cli sch export pdf --black-and-white
 *   guide.html              the build guide, embedding the three images
 *   guide.pdf               that page printed, by a headless browser
 *
 * **`guide.pdf` IS WRITTEN BESIDE `guide.html`, NOT INSTEAD OF IT.** The HTML
 * is what the PDF is rendered from - the page's own `@page`/`@media print`
 * rules are the pagination - and `guide/` is regenerated whole and git-ignored,
 * so keeping both costs nothing and leaves the source of the printed pages
 * sitting next to them. The converter is resolved the way `kicad-cli` is and
 * REFUSES BY NAME when it is missing; see `./print-pdf.ts`.
 *
 * Everything is derived from the committed `.vrt`, schematic and circuit,
 * so `guide/` is regenerated whole each run and is git-ignored. It is
 * assembled in a staging directory beside it and swapped in only once every
 * file exists, so a failed run leaves the previous packet as it was rather
 * than half replaced.
 *
 * **`schematic.pdf` IS THERE IFF THE BOARD DECLARES A SCHEMATIC, AND ITS
 * ABSENCE IS PRINTED RATHER THAN SILENT.** A board whose `perfboard.json`
 * declares no `"sch"` used to be refused outright, which put the packet step
 * out of reach of the five Pultec sections: the only schematics in this
 * repository are the whole-EQ ones, and pointing a section at one would pair
 * a whole-EQ netlist against a section's board. So the packet is produced,
 * and `guide.html` carries a bordered notice on page one saying there is no
 * schematic, which declaration declares none, what the pages WERE checked
 * against, and what would put a schematic page there (`./guide.ts`'s
 * `GuideSchematic`). The thing being prevented is not the omission - it is a
 * four-page packet that reads as a five-page one with a page missing.
 *
 * The veroroute binary, kicad-cli, the circuit module and the filesystem
 * are injected, as they are for the other verbs, so no test needs any of
 * them.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { boardName, type PerfboardDeclaration } from "../perfboard/declaration.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { runnerFor, type VerbRun } from "../perfboard/verbs.ts"
import { wiringPath as boardWiringPath } from "../perfboard/wiring-sync.ts"
import type { Env } from "../perfboard/check.ts"
import { buildChecklist } from "./checklist.ts"
import { assertLayoutMatchesCircuit, componentAt, loadBoardCircuit, type BoardCircuit } from "./circuit.ts"
import { buildGuideHtml, type GuideSchematic } from "./guide.ts"
import { nodeMembers } from "./node-members.ts"
import { offBoardLabels, valueLabel } from "./off-board.ts"
import { padLabelOf } from "./pad-label.ts"
import { padTerminals } from "./pads.ts"
import { buildableDump } from "./preflight.ts"
import { defaultPrintGuidePdf } from "./print-pdf.ts"
import { renderLayout } from "./render.ts"
import { wireLinkRefs } from "./wire-links.ts"

/** The few filesystem operations the packet writer needs. */
export interface GuideFs {
  readonly makeDir: (dir: string) => void
  /** Removes a directory and everything in it; a missing one is not an error. */
  readonly removeDir: (dir: string) => void
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
  readonly runVeroroute?: (args: readonly string[]) => VerbRun
  readonly exportSchematicPdf?: (kicadCli: string, schPath: string, pdfPath: string) => void
  readonly printGuidePdf?: (htmlToPdf: string, htmlPath: string, pdfPath: string) => void
  readonly loadCircuit?: (declaration: PerfboardDeclaration) => Promise<BoardCircuit>
  readonly fs?: GuideFs
  readonly now?: () => Date
  readonly env?: Env
  readonly repoRoot?: string
}

export const SCHEMATIC_PDF = "schematic.pdf"
export const GUIDE_HTML = "guide.html"
export const GUIDE_PDF = "guide.pdf"

/**
 * The files one packet holds, in the order they are written.
 *
 * It takes `hasSchematic` rather than being a constant because the packet has
 * two shapes and a caller must say which one it is checking: a list that
 * always named `schematic.pdf` would make a board with no schematic look like
 * a packet missing a file, which is the confusion this whole path exists to
 * avoid.
 */
export function packetFiles(hasSchematic: boolean): readonly string[] {
  return [
    "layout-designators.svg",
    "layout-values.svg",
    "copper-side.svg",
    ...(hasSchematic ? [SCHEMATIC_PDF] : []),
    GUIDE_HTML,
    GUIDE_PDF,
  ]
}

const REAL_FS: GuideFs = {
  makeDir: (dir) => fs.mkdirSync(dir, { recursive: true }),
  removeDir: (dir) => fs.rmSync(dir, { recursive: true, force: true }),
  writeText: (file, text) => fs.writeFileSync(file, text),
  rename: (from, to) => fs.renameSync(from, to),
}

export function defaultExportSchematicPdf(kicadCli: string, schPath: string, pdfPath: string): void {
  const result = spawnSync(
    kicadCli,
    ["sch", "export", "pdf", "--black-and-white", "--output", pdfPath, schPath],
    { encoding: "utf8" },
  )
  if (result.error) {
    throw new Error(
      `could not run kicad-cli at ${kicadCli}: ${result.error.message}. Install KiCad, or set ` +
        "KICAD_CLI to your kicad-cli.",
    )
  }
  if (result.status !== 0) {
    const detail = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim()
    throw new Error(
      `kicad-cli exited ${String(result.status)} exporting ${schPath} to PDF` +
        `${detail === "" ? "" : `: ${detail}`}\n` +
        `Check that ${schPath} opens in KiCad's schematic editor, and that KICAD_CLI (${kicadCli}) ` +
        "points at a working kicad-cli; no packet was written.",
    )
  }
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
  const images = {
    designators: renderLayout(dump, designators, {
      view: "component",
      title: `${name} - designators`,
      edgeLabels,
      pads,
      padLabels,
      wireLinks,
    }),
    values: renderLayout(dump, values, {
      view: "component",
      title: `${name} - values`,
      edgeLabels,
      pads,
      padLabels,
      wireLinks,
    }),
    copper: renderLayout(dump, designators, {
      view: "copper",
      title: `${name} - copper side`,
      edgeLabels,
      pads,
      padLabels,
      wireLinks,
    }),
  }
  const repoRoot = deps.repoRoot ?? moduleRepoRoot()
  const schematic: GuideSchematic =
    schPath === undefined
      ? {
          kind: "none",
          declarationPath: path.relative(repoRoot, declaration.file),
          circuitPath: path.relative(repoRoot, declaration.circuitPath),
        }
      : { kind: "printed", path: path.relative(repoRoot, schPath) }
  // DETERMINED BY LOOKING, NOT BY `circuit.scaffold`: a board can carry a
  // `wiring.md` for reasons other than stand-in groups (off-board terminals,
  // a terminal block), and the two have in fact tracked each other only by
  // coincidence of what exists today - see `tools/perfboard/wiring-sync.ts`'s
  // own "no panel parts, no guide" rule. A board with none on disk gets no
  // row rather than a dangling name.
  const wiringFile = boardWiringPath(declaration)
  const wiringPath = fs.existsSync(wiringFile) ? path.relative(repoRoot, wiringFile) : undefined
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
  })

  const files = deps.fs ?? REAL_FS
  const guideDir = path.join(declaration.dir, "guide")
  const staging = path.join(declaration.dir, `.guide-staging-${process.pid}`)
  files.removeDir(staging)
  files.makeDir(staging)
  try {
    files.writeText(path.join(staging, "layout-designators.svg"), images.designators)
    files.writeText(path.join(staging, "layout-values.svg"), images.values)
    files.writeText(path.join(staging, "copper-side.svg"), images.copper)
    if (schPath !== undefined) {
      ;(deps.exportSchematicPdf ?? defaultExportSchematicPdf)(
        deps.kicadCli,
        schPath,
        path.join(staging, SCHEMATIC_PDF),
      )
    }
    // THE PRINT IS INSIDE THE STAGING GUARANTEE, not after the swap: a
    // converter that is missing or prints nothing must leave the previous
    // packet exactly as it was, the same as a failed kicad-cli does. Printing
    // after the rename would instead publish a packet whose PDF is absent or,
    // worse, left over from the last run.
    const htmlPath = path.join(staging, GUIDE_HTML)
    files.writeText(htmlPath, html)
    ;(deps.printGuidePdf ?? defaultPrintGuidePdf)(deps.htmlToPdf, htmlPath, path.join(staging, GUIDE_PDF))
    files.removeDir(guideDir)
    files.rename(staging, guideDir)
  } catch (caught) {
    files.removeDir(staging)
    throw caught
  }
  return [
    `Wrote the build packet for ${name} to ${guideDir}:`,
    ...packetFiles(schPath !== undefined).map((file) => `  ${file}`),
    // SAID IN THE CONSOLE AS WELL AS ON THE PAGE, and the page is the one that
    // matters: someone builds from paper, and a console line scrolls away.
    ...(schPath === undefined
      ? [
          `${name} declares no "sch", so this packet has no schematic page. guide.html says so on ` +
            `page one, naming ${declaration.file} and the circuit model the pages were checked against.`,
        ]
      : []),
  ].join("\n")
}
