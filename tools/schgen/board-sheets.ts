/**
 * **WHAT `schgen` PRODUCES FOR EVERY BOARD IN `boards/`, board by board** - the measurement
 * `CLAUDE.md`'s *What this project is* asks for, committed so it is re-run rather than rebuilt
 * from a recipe in prose.
 *
 *   bun run tools/schgen/board-sheets.ts [--out <dir>] [--pdf]
 *
 * **WHY THE SUBJECT IS A BOARD AND NOT A BLOCK.** `tools/schgen/remeasure-coverage.ts` counts
 * declared BLOCKS that draw, which is the right unit for a layout defect and the wrong one for the
 * mandate: the owner's test is *"the schematics for the circuits we are currently building"*, and
 * what he builds is the eleven boards under `boards/`. **A census over blocks cannot answer it** -
 * five blocks drawing is compatible with zero boards drawing, which is exactly the state
 * `docs/known-gaps.md` **G259** records.
 *
 * **EVERY BOARD IS NAMED, INCLUDING THE ONES THIS PIPELINE CANNOT BE OFFERED.** Nine of the eleven
 * boards have no `SchematicAuthoring` declaration (**G247**), so `generate` cannot be called on
 * them at all. They are reported as `no-declaration` with the export that has none - never omitted,
 * never counted as a failure of the drawing code, and never counted as a pass. `CLAUDE.md`: *"a
 * skipped check must never look like a passing one."*
 *
 * **IT REPORTS THE FALLBACK FIELD PLACEMENTS OF EVERY SHEET IT PRODUCES.** A board that generates
 * is not thereby a board whose text is clear: `render/field-placement.ts` places a unit's Reference
 * and Value at the least-covered candidate slot when no slot is clear, rather than refusing the
 * drawing, and every such placement is counted here and in each generation's own
 * `RENDER-REPORT.md`. **A sheet with overlapping text must not read as a clean sheet**, so the
 * count is a column of this table and a non-zero total is printed as a warning line.
 *
 * It writes only under `--out` (a scratch directory by default) and never into `boards/` or into
 * any circuit directory.
 */

import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { PARITY_CASES, parityResolver, type ParityCase } from "./authoring-census.ts"
import { parityDesign } from "./gate-census.ts"
import { generate, writeGeneration, type GenerateEnv } from "./generate.ts"
import { exportPdf, kicadVersion } from "./kicad-run.ts"
import { stockSymbolDir } from "../../lib/schgen/render/library.ts"
import type { FieldFallback } from "../../lib/schgen/render/field-placement.ts"

/** One board directory as `boards/<name>/perfboard.json` declares it. */
export interface BoardRef {
  readonly name: string
  /** The circuit module the board's netlist is built from, relative to the board directory. */
  readonly circuit: string
  /** The exported builder in that module. */
  readonly export: string
}

/**
 * Every board under `boards/`, in directory order.
 *
 * **The board's own manifest is the authority for which circuit it is**, not a name match: a
 * directory called `pultec-hi-boost` says nothing about which TypeScript builds it, and
 * `perfboard.json` already carries `circuit` and `export` for the perfboard pipeline.
 */
export function boardRefs(repoRoot: string): readonly BoardRef[] {
  const dir = path.join(repoRoot, "boards")
  const names = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
  return names.map((name) => {
    const file = path.join(dir, name, "perfboard.json")
    if (!fs.existsSync(file)) {
      throw new Error(
        `board ${name} has no perfboard.json, so which circuit it is cannot be read. Every board ` +
          "directory carries one for the perfboard pipeline; a board without one is not skipped " +
          "here, because a row missing from this census is a board somebody would read as having " +
          "nothing to say.",
      )
    }
    const json: unknown = JSON.parse(fs.readFileSync(file, "utf8"))
    if (typeof json !== "object" || json === null) throw new Error(`${file} is not a JSON object`)
    const record = json as Record<string, unknown>
    const circuit = record["circuit"]
    const exported = record["export"]
    if (typeof circuit !== "string" || typeof exported !== "string") {
      throw new Error(`${file} must carry string "circuit" and "export" fields; it has ${JSON.stringify(record)}`)
    }
    return { name, circuit, export: exported }
  })
}

/**
 * The authoring declaration for a board's circuit, or null when none declares it.
 *
 * **The match is on the BUILDER, not on the circuit directory**, and that distinction is the whole
 * of **G247**: `circuits/transistor-preamp/` holds five board builders and ONE authoring
 * declaration, which is written against `transistorPreampLab()`. A match on the directory would
 * report four boards as declared that nothing declares, which is the inversion this tool exists to
 * make visible.
 */
export function declarationFor(board: BoardRef, cases: readonly ParityCase[] = PARITY_CASES): ParityCase | null {
  return cases.find((c) => c.entry === `${board.export}()`) ?? null
}

export interface BoardSheets {
  readonly board: string
  /** `generated`, `refused`, or `no-declaration`. */
  readonly outcome: "generated" | "refused" | "no-declaration"
  /** The blocker in full for `refused`, the reason for `no-declaration`, empty for `generated`. */
  readonly blocker: string
  readonly sheets: number
  /** Field placements the placer could not make clear, over every sheet of this board. */
  readonly fallbacks: readonly FieldFallback[]
  /** The written schematic root, and the PDF when one was exported. */
  readonly files: readonly string[]
}

export interface BoardSheetsOptions {
  readonly outDir: string
  readonly pdf: boolean
}

/** One board's schematic generation: what it produced, or the blocker in full. */
export async function boardSheets(board: BoardRef, repoRoot: string, options: BoardSheetsOptions): Promise<BoardSheets> {
  const declared = declarationFor(board)
  if (declared === null) {
    return {
      board: board.name,
      outcome: "no-declaration",
      blocker:
        `no SchematicAuthoring declaration for ${board.export}() (${board.circuit}). ` +
        "`generate` cannot be offered this board at all: docs/known-gaps.md G247.",
      sheets: 0,
      fallbacks: [],
      files: [],
    }
  }
  const outDir = path.join(options.outDir, board.name)
  fs.mkdirSync(outDir, { recursive: true })
  const design = { ...parityDesign(declared, parityResolver(), repoRoot, outDir) }
  const env: GenerateEnv = { kicadVersion: kicadVersion(), stockDir: stockSymbolDir(), initLock: true, acceptToolchain: true }
  try {
    const g = await generate(design, env)
    const written = writeGeneration(design, g)
    const files = [...written]
    if (options.pdf) {
      const root = path.join(outDir, `${design.spec.project}.kicad_sch`)
      const pdf = path.join(outDir, `${board.name}.pdf`)
      exportPdf(root, pdf)
      files.push(pdf)
    }
    return {
      board: board.name,
      outcome: "generated",
      blocker: "",
      sheets: g.drawings.length,
      fallbacks: g.drawings.flatMap((d) => d.fieldFallbacks),
      files,
    }
  } catch (caught) {
    return {
      board: board.name,
      outcome: "refused",
      blocker: caught instanceof Error ? caught.message : String(caught),
      sheets: 0,
      fallbacks: [],
      files: [],
    }
  }
}

export async function boardSheetsCensus(repoRoot: string, options: BoardSheetsOptions): Promise<readonly BoardSheets[]> {
  const out: BoardSheets[] = []
  for (const board of boardRefs(repoRoot)) out.push(await boardSheets(board, repoRoot, options))
  return out
}

/**
 * The census as lines.
 *
 * **THE FALLBACK TOTAL IS A LINE OF ITS OWN AND IS NEVER FOLDED INTO THE GENERATED COUNT.** Two
 * numbers that move independently - boards that produce a sheet, and text the placer could not
 * keep clear - read as one result the moment they share a line, and the second one is the price of
 * the first.
 */
export function renderBoardSheets(census: readonly BoardSheets[]): string {
  const lines: string[] = []
  for (const r of census) {
    const fb = r.fallbacks.length
    lines.push(`${r.board}: ${r.outcome}${r.outcome === "generated" ? ` (${r.sheets} sheet(s), ${fb} fallback field placement(s))` : ""}`)
    if (r.blocker !== "") for (const line of r.blocker.split("\n")) lines.push(`    ${line}`)
    for (const f of r.fallbacks) lines.push(`    FALLBACK ${f.block} ${f.key}: covers ${f.covers.join(", ")} (cost ${f.cost} um^2)`)
    for (const file of r.files) lines.push(`    wrote ${file}`)
  }
  const generated = census.filter((r) => r.outcome === "generated")
  const fallbacks = census.reduce((n, r) => n + r.fallbacks.length, 0)
  lines.push("")
  lines.push(`${generated.length} of ${census.length} boards produce a schematic`)
  lines.push(`${census.filter((r) => r.outcome === "refused").length} refused; ${census.filter((r) => r.outcome === "no-declaration").length} have no authoring declaration`)
  // **THE ZERO HAS TWO MEANINGS AND THEY ARE NOT THE SAME RESULT.** No fallback on sheets that
  // exist is a clean set of drawings; no fallback because no sheet was produced is no evidence at
  // all, and printing one sentence for both would make the emptiest possible run read as the best.
  lines.push(
    generated.length === 0
      ? "fallback field placements: NOT MEASURED - no board produced a sheet, so there is no placed text to count"
      : fallbacks === 0
        ? "0 fallback field placements: every Reference and Value on every produced sheet sits in a clear slot"
        : `WARNING: ${fallbacks} fallback field placement(s) across ${generated.filter((r) => r.fallbacks.length > 0).length} board(s). ` +
            "Those sheets carry text the placer could not keep clear; each generation's RENDER-REPORT.md names them per block and per unit.",
  )
  return lines.join("\n")
}

if (import.meta.main) {
  const argv = process.argv.slice(2)
  const outFlag = argv.indexOf("--out")
  const outDir = outFlag === -1 ? fs.mkdtempSync(path.join(os.tmpdir(), "schgen-board-sheets-")) : path.resolve(argv[outFlag + 1] ?? ".")
  const options: BoardSheetsOptions = { outDir, pdf: argv.includes("--pdf") }
  console.log(`writing generations under ${outDir}`)
  console.log(renderBoardSheets(await boardSheetsCensus(moduleRepoRoot(), options)))
}
