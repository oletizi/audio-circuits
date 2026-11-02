/**
 * The build packet's schematic PAGE: exporting it from a `.kicad_sch` and
 * measuring what came out.
 *
 * Split out of `tools/guide/packet.ts` (which the one-document change pushed
 * past this project's 500-line ceiling) rather than left there, the same way
 * `resolveSchematic` lives in `./schematic-source.ts`: deciding WHETHER there
 * is a schematic to print is that file's job, and turning the answer into one
 * PDF page of a known size is this one's.
 *
 * **THE MEASUREMENT IS WHY THIS IS MORE THAN AN EXPORT.** The page is merged
 * into the printed guide (`./merge-pdf.ts`) and the document has to be able to
 * say whether it can all be printed on one paper, so the exported page's size
 * is read off the artifact - never from the sheet's `(paper ...)` text, never
 * from a table of what a board "should" be on.
 */
import { spawnSync } from "node:child_process"
import { SCHEMATIC_PAGE } from "./merge-pdf.ts"
import type { PageSize } from "./paper.ts"

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

/**
 * The one page an exported schematic is, or a refusal naming how many it was.
 *
 * **THE PACKET'S PRINTED CLAIMS ARE SINGULAR, SO THIS IS A GATE RATHER THAN A
 * LOOP.** The header row says `page SCHEMATIC_PAGE of this document` and the
 * paper notice says `every page except page SCHEMATIC_PAGE`; both would be
 * wrong about a two-page schematic, and the merge would happily insert both
 * pages while the document went on describing one. Every schematic this
 * repository exports today is one sheet and therefore one page - measured on
 * all five Pultec boards - so a second page means something changed that the
 * printed page structure has not been taught, and that is a refusal rather
 * than a guess at which page to name.
 */
export function onePage(name: string, sizes: readonly PageSize[]): PageSize {
  const [first] = sizes
  if (sizes.length !== 1 || first === undefined) {
    throw new Error(
      `${name}'s exported schematic is ${String(sizes.length)} pages, and this packet's printed ` +
        `structure names exactly one ("page ${String(SCHEMATIC_PAGE)} of this document", in the ` +
        "header's Schematic row). Merging it would produce a document that describes one page and " +
        "holds several. Teach tools/guide/schematic-notice.ts and tools/guide/merge-pdf.ts to name a " +
        "range of pages first; no packet was written.",
    )
  }
  return first
}
