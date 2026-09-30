/**
 * The `bom` command and the `check` hook: derive what a board needs, compare it
 * with the board's `bom.json` and the shared catalog, and either write `BOM.md`
 * (`runBom`) or compare a fresh rendering with the committed one (`checkBoardBom`).
 *
 * WHAT IT READS: the board's circuit module (imported ONCE, so the network,
 * DESIGNATORS, PIN_NUMBERS and bomConditions all come from one import), the
 * board's `bom.json`, and every `<repo>/parts/*.json`.
 *
 * WHAT IT WRITES: `runBom` writes the board's `BOM.md` and nothing else. It never
 * edits `bom.json` or the catalog - a choice is made by a person or by the
 * researcher agent, never here. `checkBoardBom` writes nothing at all.
 *
 * Today's date matters only for which prices are reported stale, on the console;
 * `BOM.md` carries no date (tools/bom/render.ts), so `check` can compare it.
 *
 * Design: docs/superpowers/specs/2026-09-30-bom-design.md ("The command")
 */
import nodeFs from "node:fs"
import path from "node:path"
import type { Network } from "../../lib/model/types.ts"
import { parseBoardBom } from "./board-bom.ts"
import { loadCatalog, type CatalogEntry } from "./catalog.ts"
import { declaredBomConditions, highestRailVolts, type BomConditions } from "./conditions.ts"
import { resistorDissipation } from "./dissipation.ts"
import { localDate } from "./local-date.ts"
import { deriveNeeds } from "./needs.ts"
import { renderBomMarkdown } from "./render.ts"
import { compareBom, isComplete, reportText, type BomReport } from "./report.ts"
import { boardCircuitFrom } from "../perfboard/board-circuit.ts"
import { assertDesignators, assertPinNumbers } from "../perfboard/circuit-exports.ts"
import { boardName, type PerfboardDeclaration } from "../perfboard/declaration.ts"
import { circuitFromModule, importCircuitModule } from "../perfboard/load.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"

/** A price whose `checked` date is more than this many days old is reported stale. */
export const STALE_PRICE_DAYS = 45

/** What a board's `bom.json` must hold at minimum; quoted in the refusal. */
export const MINIMAL_BOM_JSON =
  '{ "purchasing": { "mode": "prototype", "shrinkage": 0.1, "stockQuantity": 100 }, "lines": {}, "extras": [] }'

export interface BomFs {
  readonly exists: (file: string) => boolean
  readonly readText: (file: string) => string
  readonly writeText: (file: string, text: string) => void
}

export interface BomDeps {
  readonly fs?: BomFs
  /** Injected so tests need no circuit module on disk. */
  readonly importModule?: (declaration: PerfboardDeclaration) => Promise<Readonly<Record<string, unknown>>>
  /** Injected so tests run no operating-point simulation. */
  readonly dissipation?: (network: Network, conditions: BomConditions) => Promise<ReadonlyMap<string, number>>
  /** Injected so tests read no real `parts/` directory. */
  readonly loadCatalog?: (dir: string) => ReadonlyMap<string, CatalogEntry>
  /** Today as "YYYY-MM-DD"; injected so staleness tests do not depend on the clock. */
  readonly today?: () => string
  readonly repoRoot?: string
}

const REAL_FS: BomFs = {
  exists: (file) => nodeFs.existsSync(file),
  readText: (file) => nodeFs.readFileSync(file, "utf8"),
  writeText: (file, text) => nodeFs.writeFileSync(file, text),
}

export function bomJsonPath(declaration: PerfboardDeclaration): string {
  return path.join(declaration.dir, "bom.json")
}

export function bomMarkdownPath(declaration: PerfboardDeclaration): string {
  return path.join(declaration.dir, "BOM.md")
}

interface Evaluation {
  readonly conditions: BomConditions
  readonly report: BomReport
  readonly markdown: string
}

function readBoardBom(file: string, fs: BomFs) {
  const text = fs.readText(file)
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`${file}: could not parse as JSON: ${detail}`)
  }
  return parseBoardBom(json, file)
}

async function evaluate(declaration: PerfboardDeclaration, deps: BomDeps): Promise<Evaluation> {
  const fs = deps.fs ?? REAL_FS
  const bomFile = bomJsonPath(declaration)
  if (!fs.exists(bomFile)) {
    throw new Error(
      `${bomFile}: this board has no bom.json, so there is nothing to compare its needs with. ` +
        `Create it with at least: ${MINIMAL_BOM_JSON}`,
    )
  }
  const bom = readBoardBom(bomFile, fs)

  const module = await (deps.importModule ?? importCircuitModule)(declaration)
  const network = circuitFromModule(module, declaration)
  const circuit = boardCircuitFrom(
    network,
    assertDesignators(module["DESIGNATORS"], declaration),
    assertPinNumbers(module["PIN_NUMBERS"], declaration),
  )
  const conditions = await declaredBomConditions(module, declaration.circuitPath)
  const dissipation = await (deps.dissipation ?? resistorDissipation)(network, conditions)
  const lines = deriveNeeds(circuit, highestRailVolts(conditions), dissipation)

  const catalogDir = path.join(deps.repoRoot ?? moduleRepoRoot(), "parts")
  const catalog = (deps.loadCatalog ?? loadCatalog)(catalogDir)
  const today = (deps.today ?? (() => localDate(new Date())))()

  return {
    conditions,
    report: compareBom(lines, bom, catalog, today, STALE_PRICE_DAYS),
    markdown: renderBomMarkdown({
      boardName: boardName(declaration), conditions: conditions.description, lines, bom, catalog,
    }),
  }
}

export interface BomRun {
  /** 0 when the list is complete, 1 when anything is unchosen, removed, unmet or unknown. */
  readonly exitCode: 0 | 1
  readonly output: string
}

/**
 * Compare, report and rewrite `BOM.md`. `BOM.md` is written whether or not the list is
 * complete, so an incomplete list is visible in the file as well as in the exit code.
 * Throws (writing nothing) for a board with no `bom.json`.
 */
export async function runBom(declaration: PerfboardDeclaration, deps: BomDeps = {}): Promise<BomRun> {
  const { conditions, report, markdown } = await evaluate(declaration, deps)
  const target = bomMarkdownPath(declaration)
  ;(deps.fs ?? REAL_FS).writeText(target, markdown)
  return {
    exitCode: isComplete(report) ? 0 : 1,
    output: [`Conditions: ${conditions.description}`, "", reportText(report), "", `wrote ${target}`].join("\n"),
  }
}

export type BomCheck =
  | { readonly applies: false }
  | { readonly applies: true; readonly ok: boolean; readonly report: string }

/**
 * The `check` hook. A board with no `bom.json` is untouched. Otherwise it fails when
 * the committed `BOM.md` is missing or differs from a fresh in-memory rendering, when
 * a chosen part no longer meets its line, or when a chosen catalog id does not exist
 * (such a part cannot meet its line). Unchosen lines and stale prices do not fail it:
 * those are `make bom`'s to report. Writes nothing.
 */
export async function checkBoardBom(declaration: PerfboardDeclaration, deps: BomDeps = {}): Promise<BomCheck> {
  const fs = deps.fs ?? REAL_FS
  if (!fs.exists(bomJsonPath(declaration))) return { applies: false }

  const { report, markdown } = await evaluate(declaration, deps)
  const problems: string[] = []
  const target = bomMarkdownPath(declaration)
  if (!fs.exists(target)) {
    problems.push(`${target} is missing - run make bom and commit it.`)
  } else if (fs.readText(target) !== markdown) {
    problems.push(`${target} is out of date with the circuit, bom.json or the catalog - run make bom and commit it.`)
  }
  for (const item of report.unmet) {
    const fields = item.misfits.map((misfit) => `${misfit.field}: needed ${misfit.needed}, found ${misfit.found}`)
    problems.push(`${item.line.key}: "${item.part}" no longer meets its line (${fields.join("; ")}).`)
  }
  for (const id of report.unknownParts) {
    problems.push(`bom.json names catalog id "${id}", which does not exist in parts/.`)
  }
  return { applies: true, ok: problems.length === 0, report: problems.join("\n") }
}
