/**
 * Writes a board's printable build packet into `boards/<board>/guide/`:
 *
 *   layout-designators.svg  component side, parts labelled by designator
 *   layout-values.svg       component side, parts labelled by value
 *   copper-side.svg         mirrored copper side: strips, cuts, bridges
 *   schematic.pdf           kicad-cli sch export pdf --black-and-white
 *   guide.html              the build guide, embedding the three images
 *
 * Everything is derived from the committed `.vrt`, schematic and circuit,
 * so `guide/` is regenerated whole each run and is git-ignored. It is
 * assembled in a staging directory beside it and swapped in only once all
 * five files exist, so a failed run leaves the previous packet as it was
 * rather than half replaced.
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
import type { Env } from "../perfboard/check.ts"
import { buildChecklist } from "./checklist.ts"
import { assertLayoutMatchesCircuit, loadBoardCircuit, type BoardCircuit } from "./circuit.ts"
import { buildGuideHtml } from "./guide.ts"
import { offBoardLabels } from "./off-board.ts"
import { buildableDump } from "./preflight.ts"
import { renderLayout } from "./render.ts"

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
  readonly runVeroroute?: (args: readonly string[]) => VerbRun
  readonly exportSchematicPdf?: (kicadCli: string, schPath: string, pdfPath: string) => void
  readonly loadCircuit?: (declaration: PerfboardDeclaration) => Promise<BoardCircuit>
  readonly fs?: GuideFs
  readonly now?: () => Date
  readonly env?: Env
  readonly repoRoot?: string
}

export const PACKET_FILES = [
  "layout-designators.svg",
  "layout-values.svg",
  "copper-side.svg",
  "schematic.pdf",
  "guide.html",
] as const

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
 * cuts are unresolved, a part is floating, the board declares no schematic,
 * or any step fails.
 */
export async function writeGuidePacket(declaration: PerfboardDeclaration, deps: GuideDeps): Promise<string> {
  const schPath = declaration.schPath
  if (schPath === undefined) {
    throw new Error(
      `${declaration.file} declares no "sch", so the packet has no schematic to print. Declare the ` +
        'board\'s schematic ("sch" with its "netlist") in perfboard.json.',
    )
  }
  const dump = buildableDump(dumpBoard(declaration, deps), declaration.vrtPath)
  const circuit = await (deps.loadCircuit ?? loadBoardCircuit)(declaration)
  assertLayoutMatchesCircuit(dump, circuit)
  const edgeLabels = offBoardLabels(circuit)
  const checklist = buildChecklist(dump, circuit, edgeLabels)

  const name = boardName(declaration)
  const designators = new Map(dump.parts.map((part) => [part.ref, part.ref]))
  const values = new Map(dump.parts.map((part) => [part.ref, part.value]))
  const images = {
    designators: renderLayout(dump, designators, { view: "component", title: `${name} - designators`, edgeLabels }),
    values: renderLayout(dump, values, { view: "component", title: `${name} - values`, edgeLabels }),
    copper: renderLayout(dump, designators, { view: "copper", title: `${name} - copper side`, edgeLabels }),
  }
  const repoRoot = deps.repoRoot ?? moduleRepoRoot()
  const html = buildGuideHtml({
    boardName: name,
    generated: isoDate((deps.now ?? (() => new Date()))()),
    layoutPath: path.relative(repoRoot, declaration.vrtPath),
    schematicPath: path.relative(repoRoot, schPath),
    images,
    checklist,
    powerUpChecks: circuit.powerUpChecks,
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
    ;(deps.exportSchematicPdf ?? defaultExportSchematicPdf)(deps.kicadCli, schPath, path.join(staging, "schematic.pdf"))
    files.writeText(path.join(staging, "guide.html"), html)
    files.removeDir(guideDir)
    files.rename(staging, guideDir)
  } catch (caught) {
    files.removeDir(staging)
    throw caught
  }
  return [`Wrote the build packet for ${name} to ${guideDir}:`, ...PACKET_FILES.map((file) => `  ${file}`)].join("\n")
}
