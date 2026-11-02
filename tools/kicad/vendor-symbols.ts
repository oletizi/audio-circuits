/**
 * Regenerate lib/kicad/symbols/ from an installed KiCad's symbol libraries.
 *
 *   bun tools/kicad/vendor-symbols.ts <kicad-symbols-dir>
 *
 * This tool takes the directory as an argument rather than defaulting it,
 * so it carries no platform-specific literal of its own to go stale - find
 * yours with `lib/kicad/install.ts`'s `defaultSymbolDir(KICAD_CLI)`
 * (`docs/known-gaps.md` **G169**), which on macOS is
 * /Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols. Every symbol in
 * VENDORED_SYMBOLS is flattened (see flattenedSymbol) and written to
 * lib/kicad/symbols/<Library>/<Name>.sexpr. Record the KiCad version in
 * lib/kicad/symbols/PROVENANCE.md whenever this is re-run.
 */
import fs from "node:fs"
import path from "node:path"
import { VENDORED_SYMBOLS, flattenedSymbol, librarySymbols, splitLibId } from "../../lib/kicad/symbol-library.ts"

const [symbolsDir] = process.argv.slice(2)
if (symbolsDir === undefined) {
  throw new Error("usage: bun tools/kicad/vendor-symbols.ts <kicad-symbols-dir>")
}

const outDir = path.join(import.meta.dir, "..", "..", "lib", "kicad", "symbols")
const libraries = new Map<string, ReadonlyMap<string, string>>()

for (const libId of VENDORED_SYMBOLS) {
  const { library, name } = splitLibId(libId)
  let symbols = libraries.get(library)
  if (symbols === undefined) {
    const file = path.join(symbolsDir, `${library}.kicad_sym`)
    if (!fs.existsSync(file)) throw new Error(`no symbol library at ${file}`)
    symbols = librarySymbols(fs.readFileSync(file, "utf8"))
    libraries.set(library, symbols)
  }
  const target = path.join(outDir, library, `${name}.sexpr`)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, `${flattenedSymbol(symbols, name)}\n`)
  console.log(`wrote ${target}`)
}
