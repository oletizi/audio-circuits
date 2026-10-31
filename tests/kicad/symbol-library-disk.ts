/**
 * The INSTALLED KiCad symbol libraries, read off disk - the symbol-side
 * counterpart of `./footprint-library.ts`.
 *
 * **WHY IT EXISTS.** Until this helper landed, the footprint axis had a
 * disk-backed check and the symbol axis had none: the only symbol list verified
 * against files was `VENDORED_SYMBOLS` (`lib/kicad/symbol-library.ts`), which is
 * the small set `tools/kicad/vendor-symbols.ts` copies into
 * `lib/kicad/symbols/`, so any symbol outside it was never looked up anywhere.
 * `circuits/pultec/physical/parts.ts` consequently carried
 * `Switch:SW_Rotary` - a name `grep -c '(symbol "SW_Rotary"' Switch.kicad_sym`
 * answers 0 for - into the value field of every generated Pultec netlist. That
 * is the third KiCad name this repository has shipped that does not exist; the
 * first two were footprints, and the footprint check is why there was not a
 * fourth.
 *
 * **IT REFUSES AND DOES NOT SKIP**, for the reason `./footprint-library.ts` and
 * `tests/circuits/kicad-round-trip.ts` both give: a green suite on a machine
 * with no KiCad would be a check that looked like it had passed while reading
 * nothing, which is the one failure mode this workflow exists to prevent.
 *
 * **IT IS TEST-SIDE ONLY.** Nothing in `lib/` or `tools/` opens a `.kicad_sym`
 * at run time; a generated schematic embeds the VENDORED copies instead. So this
 * reads whichever KiCad is installed, and `lib/kicad/symbols/PROVENANCE.md`
 * records the vendored ones separately.
 */
import fs from "node:fs"
import path from "node:path"
import { defaultSymbolDir } from "../../lib/kicad/install.ts"
import { KICAD_CLI } from "../../lib/kicad/netlist.ts"
import { flattenedSymbol, librarySymbols, splitLibId, symbolPins } from "../../lib/kicad/symbol-library.ts"

/**
 * Overridable the way `KICAD_FOOTPRINTS` is, and DERIVED from the same
 * resolved `kicad-cli` rather than a separate hand-written literal
 * (`docs/known-gaps.md` **G169**, clause a) - a per-platform candidate list,
 * not a macOS-only default (clause b).
 */
export const SYMBOL_LIBRARY_ROOT = process.env["KICAD_SYMBOLS"] ?? defaultSymbolDir(KICAD_CLI)

/** `<Library>:<Name>` as a part spec spells it, to `<root>/<Library>.kicad_sym`. */
export function symbolLibraryFile(libId: string): string {
  const { library } = splitLibId(libId)
  return path.join(SYMBOL_LIBRARY_ROOT, `${library}.kicad_sym`)
}

/**
 * Parsing a `.kicad_sym` is not free and `Device.kicad_sym` is read once per
 * symbol in it, so each library is parsed once per process. `PARSED` keeps the
 * derived NAME set so a sweep over hundreds of symbols does not rebuild it.
 */
const LIBRARIES = new Map<string, ReadonlyMap<string, string>>()
const PARSED = new Map<string, ReadonlySet<string>>()

/**
 * The installed library `libId` names, symbol name -> raw block text. Throws,
 * naming the path and the override, when the library file is not there - this
 * does NOT skip.
 */
function installedLibrary(libId: string): ReadonlyMap<string, string> {
  const file = symbolLibraryFile(libId)
  const cached = LIBRARIES.get(file)
  if (cached !== undefined) return cached
  if (!fs.existsSync(file)) {
    throw new Error(
      `symbol library for "${libId}" is not at ${file}. Install KiCad or set KICAD_SYMBOLS. ` +
        "This test does not skip: it is the only check that a symbol this repository names in " +
        "a part spec is a symbol some KiCad can resolve, and this repository has three times " +
        "shipped a KiCad name that does not exist.",
    )
  }
  const library = librarySymbols(fs.readFileSync(file, "utf8"))
  if (library.size === 0) {
    throw new Error(
      `${file} declares no symbols, which cannot be right - a parsed-but-empty library would ` +
        "make every name checked against it pass for the wrong reason.",
    )
  }
  LIBRARIES.set(file, library)
  return library
}

/** Every top-level symbol name in the installed library `libId` names. Refuses an absent library. */
export function installedSymbolNames(libId: string): ReadonlySet<string> {
  const file = symbolLibraryFile(libId)
  const cached = PARSED.get(file)
  if (cached !== undefined) return cached
  const names = new Set(installedLibrary(libId).keys())
  PARSED.set(file, names)
  return names
}

/** Whether `libId` resolves to a symbol in the installed libraries. Refuses an absent library. */
export function symbolExistsOnDisk(libId: string): boolean {
  const { name } = splitLibId(libId)
  return installedSymbolNames(libId).has(name)
}

/**
 * The PIN NUMBERS the installed symbol `libId` has, flattened through any
 * `(extends)`, in library order.
 *
 * **IT REFUSES AN ABSENT SYMBOL RATHER THAN RETURNING AN EMPTY LIST**, which is
 * the whole point of it: a table that names a pin of a symbol nobody can find
 * would otherwise pass a "does this symbol have this pin" check vacuously,
 * which is the shape of every false green this repository catalogues. The
 * absent LIBRARY case refuses one level down, in `installedLibrary`.
 */
export function installedSymbolPinNumbers(libId: string): readonly string[] {
  const { name } = splitLibId(libId)
  const library = installedLibrary(libId)
  if (!library.get(name)) {
    throw new Error(
      `symbol "${libId}" is not in ${symbolLibraryFile(libId)}, so there are no pins to read ` +
        "off it. Either the name is a typo or the installed KiCad has moved it; re-verify it " +
        "against the library rather than relaxing the caller. An empty pin list returned here " +
        "would make every claim about this symbol's pins pass for the wrong reason.",
    )
  }
  return symbolPins(flattenedSymbol(library, name)).map((p) => p.number)
}
