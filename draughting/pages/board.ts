/**
 * THE BOARD A PAGE TOOL IS RUN FOR, named by its drafted directory (`drafted/<family>/<board>/`) on
 * the command line - never by an environment variable. Every tool in `draughting/pages/` takes that
 * directory as its first argument and reaches the board through this file.
 *
 * Two things come from it:
 *
 * - THE MODEL. The board's name is the directory's basename, and `boards/<name>/perfboard.json` (the
 *   board's existing declaration, which `make draw` reads) names the circuit module and its export.
 *   The module must also export `DESIGNATORS`, `PIN_NUMBERS`, `drawingPages()` and
 *   `PROJECT_SYMBOL_LIBRARY`, as `circuits/h7-platform/module-board.ts` does; each is checked here and
 *   refused, naming what is missing, rather than defaulted, because a page compared against a guessed
 *   designator map or pin table would pass or fail on the guess.
 * - THE TABLES, in `<board-dir>/repair/tools/` (`./tables.ts`): the board's own declared data.
 *
 * Moved from `drafted/h7-platform/h7-module/repair/tools/` (H7 pedal plan Task 4), where each tool
 * imported `h7Module()` and its tables directly. The messages name `modelName` and `circuitRel`
 * where they named `h7Module()` and `circuits/h7-platform/module-board.ts`, so for the module they
 * read as before.
 */
import fs from "node:fs"
import path from "node:path"
import { isRecord } from "../../lib/guards.ts"
import type { PinNumbers } from "../../lib/kicad/from-network.ts"
import type { Network } from "../../lib/model/index.ts"
import { isNetwork } from "../../tools/draught/akcli-ops.ts"
import type { DrawingPage } from "../../tools/draught/drawing-pages.ts"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { importCircuitModule } from "../../tools/perfboard/load.ts"

/** The repository root: this file is `draughting/pages/board.ts`. */
export const REPO_ROOT = path.resolve(import.meta.dir, "..", "..")

export interface PageBoard {
  /** The drafted directory, absolute: it holds the root sheet `<name>.kicad_sch` and `repair/`. */
  readonly dir: string
  /** The board's name: the directory's basename, and `boards/<name>/`. */
  readonly name: string
  /** `<dir>/repair`: the committed repair record (op-lists, `pins.json` per block). */
  readonly repairDir: string
  /** `<dir>/repair/tools`: the board's declared tables. */
  readonly tablesDir: string
  /** The circuit module, relative to the repository root, for messages. */
  readonly circuitRel: string
  /** The model's builder as a reader would call it, `<export>()`, for messages. */
  readonly modelName: string
  readonly network: Network
  readonly designators: Readonly<Record<string, string>>
  readonly pinNumbers: PinNumbers
  /** The circuit's `PROJECT_SYMBOL_LIBRARY`: the committed `.kicad_sym` its project symbols resolve from. */
  readonly projectSymbolLibrary: string
  /** The circuit's `drawingPages()`, checked on each call. */
  readonly drawingPages: () => readonly DrawingPage[]
}

function stringRecord(value: unknown, what: string): Readonly<Record<string, string>> {
  if (!isRecord(value)) throw new Error(`${what} is not an object`)
  const out: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== "string") throw new Error(`${what}["${key}"] is not a string`)
    out[key] = entry
  }
  return out
}

function pinNumberTable(value: unknown, what: string): PinNumbers {
  if (!isRecord(value)) throw new Error(`${what} is not an object`)
  const out: Record<string, Readonly<Record<string, string>>> = {}
  for (const [key, entry] of Object.entries(value)) out[key] = stringRecord(entry, `${what}["${key}"]`)
  return out
}

function isPagePort(value: unknown): boolean {
  if (!isRecord(value)) return false
  const pins = value["pins"]
  return typeof value["name"] === "string" && typeof value["net"] === "string" && typeof value["drafted"] === "boolean" &&
    Array.isArray(pins) && pins.every((p: unknown) => typeof p === "string")
}

function isDrawingPage(value: unknown): value is DrawingPage {
  if (!isRecord(value)) return false
  const ports = value["ports"]
  return typeof value["block"] === "string" && isRecord(value["intent"]) && Array.isArray(ports) && ports.every(isPagePort)
}

/** Load the board whose drafted directory is `boardDir`, refusing - naming the file - when any part of it is missing. */
export async function loadBoard(boardDir: string): Promise<PageBoard> {
  const dir = path.resolve(boardDir)
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`draughting/pages: the board directory ${dir} does not exist; name a drafted board directory, drafted/<family>/<board>/`)
  }
  const name = path.basename(dir)
  const declarationFile = path.join(REPO_ROOT, "boards", name, "perfboard.json")
  if (!fs.existsSync(declarationFile)) {
    throw new Error(
      `draughting/pages: ${declarationFile} does not exist. The board directory ${dir} is named "${name}", and boards/${name}/perfboard.json ` +
        "is where the circuit module and its export are declared; it is not guessed from the directory, because a page checked against the wrong model passes or fails on the guess.",
    )
  }
  const declaration = loadDeclaration(declarationFile)
  const module = await importCircuitModule(declaration)
  const circuitRel = path.relative(REPO_ROOT, declaration.circuitPath)
  const need = (key: string): unknown => {
    const value = module[key]
    if (value === undefined) {
      throw new Error(
        `draughting/pages: ${circuitRel} exports no ${key}. A board drawn through draughting/pages exports ${declaration.exportName}, ` +
          "DESIGNATORS, PIN_NUMBERS, drawingPages and PROJECT_SYMBOL_LIBRARY, as circuits/h7-platform/module-board.ts does; none is defaulted.",
      )
    }
    return value
  }
  const builder = need(declaration.exportName)
  if (typeof builder !== "function") throw new Error(`draughting/pages: ${circuitRel}'s ${declaration.exportName} is not a function`)
  const network: unknown = builder()
  if (!isNetwork(network)) throw new Error(`draughting/pages: ${circuitRel}'s ${declaration.exportName}() did not return a Network with blocks`)
  const library = need("PROJECT_SYMBOL_LIBRARY")
  if (typeof library !== "string") throw new Error(`draughting/pages: ${circuitRel}'s PROJECT_SYMBOL_LIBRARY is not a path`)
  const pagesExport = need("drawingPages")
  if (typeof pagesExport !== "function") throw new Error(`draughting/pages: ${circuitRel}'s drawingPages is not a function`)
  const drawingPages = (): readonly DrawingPage[] => {
    const pages: unknown = pagesExport()
    if (!Array.isArray(pages) || !pages.every(isDrawingPage)) {
      throw new Error(`draughting/pages: ${circuitRel}'s drawingPages() did not return an array of { block, intent, ports }`)
    }
    return pages
  }
  return {
    dir,
    name,
    repairDir: path.join(dir, "repair"),
    tablesDir: path.join(dir, "repair", "tools"),
    circuitRel,
    modelName: `${declaration.exportName}()`,
    network,
    designators: stringRecord(need("DESIGNATORS"), `${circuitRel}'s DESIGNATORS`),
    pinNumbers: pinNumberTable(need("PIN_NUMBERS"), `${circuitRel}'s PIN_NUMBERS`),
    projectSymbolLibrary: library,
    drawingPages,
  }
}

/** The block `prefix` of the board's model, or a refusal naming the blocks there are. */
export function blockOf(board: PageBoard, prefix: string): Network["blocks"][number] {
  const record = board.network.blocks.find((b) => b.prefix === prefix)
  if (record === undefined) {
    throw new Error(`${board.modelName} has no block "${prefix}"; its blocks are ${board.network.blocks.map((b) => b.prefix).join(", ")}`)
  }
  return record
}

/** The first command-line argument as a loaded board, refusing with `usage` when it is absent. */
export async function boardFromArgs(argv: readonly string[], usage: string): Promise<{ board: PageBoard; rest: readonly string[] }> {
  const [dir, ...rest] = argv
  if (dir === undefined) throw new Error(`usage: ${usage} - the board's drafted directory is required first`)
  return { board: await loadBoard(dir), rest }
}
