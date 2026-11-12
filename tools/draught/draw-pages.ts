/**
 * `make draw` FOR A MULTI-PAGE BOARD (design change C3): one sheet per block, each drafted,
 * re-papered, rendered and measured exactly as a one-page board's sheet is (`./draw-sheet.ts`),
 * into `<outDir>/<block>/<block>.kicad_sch`, with each page's derived intent beside its directory
 * at `<outDir>/<block>.intent.json` (never inside it - copperhead's draft empties the directory).
 *
 * Before drafting, the partition check runs per block (`./draw-partition.ts`
 * `checkPagesPartition`); with no independent netlist it prints the C2 `NO INDEPENDENT NETLIST:`
 * block once for the board.
 *
 * It stops where `make draw` always stops: the pages it writes are copperhead drafts with
 * copperhead's labels. The hierarchical labels (`./hierarchical-labels.ts`) and the root sheet
 * (`./assemble-root.ts`) are op-lists the repair applies, so that they are committed and replayed
 * with the rest of the repair (`TOOLING.md` step 5.5) rather than done out of sight here.
 */
import fs from "node:fs"
import path from "node:path"
import type { PerfboardDeclaration } from "../perfboard/declaration.ts"
import { projectSymbolLibrariesFor } from "./draw-intent.ts"
import { checkPagesPartition } from "./draw-partition.ts"
import { draftRenderMeasure } from "./draw-sheet.ts"
import type { DrawingPage } from "./drawing-pages.ts"

export interface PagesResult {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
  readonly drew: boolean
}

export async function runDrawPages(opts: {
  readonly board: string
  readonly declaration: PerfboardDeclaration
  readonly pages: readonly DrawingPage[]
  readonly outDir: string
  /** `tools/cli/draw.ts`'s scope disclosure, printed first as on a one-page board. */
  readonly scope: string
  readonly advisory: readonly string[]
}): Promise<PagesResult> {
  const { board, outDir } = opts
  const refuse = (stderr: string): PagesResult => ({ exitCode: 1, drew: false, stdout: opts.advisory.join("\n\n"), stderr })

  const partition = checkPagesPartition({ board, declaration: opts.declaration, pages: opts.pages })
  if (partition.kind === "refused") return refuse(partition.message)

  let projectSymbolLibraries: readonly string[]
  try {
    projectSymbolLibraries = await projectSymbolLibrariesFor(opts.declaration)
  } catch (error) {
    return refuse(error instanceof Error ? error.message : String(error))
  }

  const stdout: string[] = [
    opts.scope,
    `${board} is drawn one page per block (design change C3): ${opts.pages.map((p) => p.block).join(", ")}. ` +
      "Each page below is a copperhead draft with copperhead's labels; the hierarchical labels and the root " +
      "sheet are the repair's op-lists (tools/draught/hierarchical-labels.ts, tools/draught/assemble-root.ts).",
    ...(partition.kind === "not-run" ? [partition.notice] : []),
    ...opts.advisory,
  ]
  const stderr: string[] = []
  // Pages from an earlier run of a board whose blocks have since changed must not survive beside
  // this run's: the whole board directory is this run's output.
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(outDir, { recursive: true })
  for (const page of opts.pages) {
    const intentPath = path.join(outDir, `${page.block}.intent.json`)
    fs.writeFileSync(intentPath, JSON.stringify(page.intent, null, 2) + "\n")
    const sheet = draftRenderMeasure({ outDir: path.join(outDir, page.block), name: page.block, intentPath, projectSymbolLibraries })
    stdout.push(`page ${page.block}:\n${sheet.stdout.join("\n\n")}`)
    if (sheet.stderr.length > 0) stderr.push(`page ${page.block}:\n${sheet.stderr.join("\n\n")}`)
    if (!sheet.ok) {
      if (sheet.drafted) {
        stderr.push(
          `note: ${sheet.schematicPath} exists on disk from this run - a later step failed, but that file was ` +
            "not deleted or hidden. It can still be opened directly in KiCad.",
        )
      }
      return { exitCode: 1, drew: false, stdout: stdout.join("\n\n"), stderr: stderr.join("\n\n") }
    }
  }
  return { exitCode: 0, drew: true, stdout: stdout.join("\n\n") + "\n", stderr: stderr.join("\n\n") }
}
