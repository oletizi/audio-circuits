/**
 * Where `make draw` gets a board's copperhead intent - one of exactly two
 * declared sources, never both and never a guess:
 *
 *   - `COMMITTED_INTENT` (`./draw-draft.ts`): an intent FILE already on disk
 *     from an earlier run. The Pultec boards' path - that circuit is
 *     schematic-authoritative, and its intents were transcribed by hand.
 *   - a `drawingIntent()` export on the circuit module the board's
 *     `perfboard.json` names: an intent GENERATED from the model
 *     (`./intent-from-network.ts`). The model-authoritative path.
 *
 * A board with both refuses: two declarations of one board's drawing input
 * are two places for one fact to be wrong. A board with neither refuses,
 * naming both, rather than inventing an intent.
 *
 * A generated intent is written to `derivedIntentPath` on every run, so the
 * file copperhead reads is the one this run derived - a derived artifact,
 * regenerated every run and never committed (`CLAUDE.md`).
 */
import fs from "node:fs"
import path from "node:path"
import type { PerfboardDeclaration } from "../perfboard/declaration.ts"
import { importCircuitModule } from "../perfboard/load.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { COMMITTED_INTENT, parseIntent, type Intent } from "./draw-draft.ts"

export type DrawIntent = {
  readonly source: "committed" | "override" | "derived"
  readonly path: string
  readonly intent: Intent
}

export type DrawIntentResolution = DrawIntent | { readonly refusal: string }

export async function resolveDrawIntent(opts: {
  readonly board: string
  readonly declaration: PerfboardDeclaration
  /** Test-only: draft from this file, bypassing both sources. */
  readonly override: string | undefined
  readonly derivedIntentPath: string
  /** Test-only: replaces COMMITTED_INTENT. */
  readonly committed?: Readonly<Record<string, string>>
}): Promise<DrawIntentResolution> {
  if (opts.override !== undefined) {
    const abs = path.resolve(opts.override)
    if (!fs.existsSync(abs)) return { refusal: `--intent override ${opts.override} does not exist.` }
    return { source: "override", path: abs, intent: parseIntent(abs) }
  }

  const registry = opts.committed ?? COMMITTED_INTENT
  const committed = registry[opts.board]
  const module = await importCircuitModule(opts.declaration)
  const exported = module["drawingIntent"]
  const circuit = opts.declaration.circuitPath

  if (committed !== undefined && exported !== undefined) {
    return {
      refusal:
        `${opts.board} declares a copperhead intent from both sources: COMMITTED_INTENT in ` +
        `tools/draught/draw-draft.ts names ${committed}, and ${circuit} exports drawingIntent. A board ` +
        "with both refuses: two declarations of one board's drawing input are two places for one fact " +
        "to be wrong - remove one. A model-authoritative circuit keeps the export; a " +
        "schematic-authoritative one keeps the committed file.",
    }
  }

  if (committed !== undefined) {
    const abs = path.join(moduleRepoRoot(), committed)
    return { source: "committed", path: abs, intent: parseIntent(abs) }
  }

  if (exported === undefined) {
    const known = Object.keys(registry).sort().join(", ")
    return {
      refusal:
        `no copperhead intent is declared for board "${opts.board}". Either add it to COMMITTED_INTENT in ` +
        `tools/draught/draw-draft.ts, pointing at a committed intent file (boards with one: [${known}]), ` +
        `or export drawingIntent() from ${circuit}, generated from the model by ` +
        "tools/draught/intent-from-network.ts. Neither is guessed.",
    }
  }
  if (typeof exported !== "function") {
    return { refusal: `${circuit} exports drawingIntent as a ${typeof exported}, not a function returning an intent.` }
  }

  const generated: unknown = exported()
  fs.mkdirSync(path.dirname(opts.derivedIntentPath), { recursive: true })
  fs.writeFileSync(opts.derivedIntentPath, JSON.stringify(generated, null, 2) + "\n")
  return { source: "derived", path: opts.derivedIntentPath, intent: parseIntent(opts.derivedIntentPath) }
}

/**
 * The project symbol libraries a board's drawing needs (spec C4), read from the board's circuit
 * module: an exported `PROJECT_SYMBOL_LIBRARY`, the absolute path of a committed `.kicad_sym`.
 * A module that exports none needs none, and the draft runs exactly as it does for every
 * stock-symbol board. `draftWithCopperhead` names the library in the draft's `sym-lib-table`.
 *
 * Read from the module, never written here: which library a circuit draws from is a fact about
 * the circuit, so this file holds no path of its own.
 */
export async function projectSymbolLibrariesFor(declaration: PerfboardDeclaration): Promise<readonly string[]> {
  const module = await importCircuitModule(declaration)
  const exported = module["PROJECT_SYMBOL_LIBRARY"]
  if (exported === undefined) return []
  const circuit = declaration.circuitPath
  if (typeof exported !== "string") {
    throw new Error(`${circuit} exports PROJECT_SYMBOL_LIBRARY as a ${typeof exported}; it must be the absolute path of a .kicad_sym.`)
  }
  if (!path.isAbsolute(exported) || !exported.endsWith(".kicad_sym")) {
    throw new Error(`${circuit} exports PROJECT_SYMBOL_LIBRARY "${exported}", which is not an absolute path to a .kicad_sym.`)
  }
  if (!fs.existsSync(exported)) {
    throw new Error(`${circuit} exports PROJECT_SYMBOL_LIBRARY "${exported}", which does not exist; the drawing names symbols in it.`)
  }
  return [exported]
}
