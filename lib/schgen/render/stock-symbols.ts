/**
 * WHICH `.kicad_sym` LIBRARY FILE EACH NICKNAME RESOLVES TO - the one map
 * `createResolver` (`./library.ts`) is handed, built from this repository's
 * VENDORED symbols and from the installed KiCad's stock symbol directory.
 *
 * Hand-written, not ported: `digital-pedal-platform` has no vendored symbol
 * set and therefore no such file. Task 4 of the M1 schematic-authoring plan
 * decided *"both, with the vendored set authoritative and the stock directory
 * a declared extension"*, and this is that decision in code.
 *
 * **THE TWO SOURCES DO NOT HAVE THE SAME SHAPE, AND THE PLAN'S MECHANISM
 * CANNOT BE FOLLOWED LITERALLY** (`docs/known-gaps.md` **G117**, Controller
 * ruling **R8**). `createResolver(libs)` takes nickname-to-`.kicad_sym`
 * LIBRARY file, each holding many symbols. The vendored set is eight files at
 * `lib/kicad/symbols/<Nickname>/<Name>.sexpr`, each ONE bare `(symbol …)`
 * definition with no `(kicad_symbol_lib …)` wrapper. So "the vendored
 * directory first and the stock directory second" cannot mean two maps of the
 * same kind merged by nickname: the vendored side has no library file to name,
 * and the five nicknames it touches (`Device`, `Transistor_BJT`,
 * `Connector_Generic`, `Connector`, `Jumper`) are all present in the stock
 * directory too, so a nickname-level "refuse when both resolve to files with
 * different SHA-256" would compare a five-symbol set against a 536-symbol
 * library and refuse on every run.
 *
 * **WHAT IS DONE INSTEAD, AND IT IS A DEVIATION - RECORDED, NOT SILENT.** The
 * authority the vendored set carries is applied at SYMBOL granularity: a
 * nickname resolves to the installed library file, and every vendored symbol
 * under that nickname must be byte-identical to the installed library's own
 * flattened text, or this REFUSES, naming both files and both SHA-256 hashes
 * and saying that nothing is preferred. The criterion the ruling set -
 * **no drawing depends on the machine when a symbol is vendored** - is met by
 * that equality rather than by which file is opened: either the installed
 * bytes are the vendored bytes, in which case the drawing is the same on
 * every machine, or this refuses and there is no drawing. A machine-dependent
 * drawing cannot be produced silently either way, which is the point.
 *
 * The alternative considered and rejected: have `tools/kicad/vendor-symbols.ts`
 * also emit a per-nickname `.kicad_sym` wrapper library and point the map at
 * that. It reads vendored bytes directly, but a nickname then resolves to a
 * library holding ONLY the vendored symbols, so `Device:C` - which the parity
 * circuits need and nothing vendors - stops resolving at all. Merging the two
 * into a generated library would restore it at the cost of writing files from
 * a module `lib/schgen/README.md` says is pure.
 *
 * **NO FALLBACK ANYWHERE.** A nickname in neither source refuses, naming both
 * roots and the two ways to fix it. KiCad is a required tool in this
 * repository (`CLAUDE.md`), so an absent stock directory refuses too, via
 * `stockSymbolDir()`.
 */

import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import {
  VENDORED_SYMBOLS,
  flattenedSymbol,
  librarySymbols,
  splitLibId,
  vendoredSymbolFile,
  vendoredSymbolText,
} from "../../kicad/symbol-library.ts"
import { stockSymbolDir } from "./library.ts"

/** The library nicknames the vendored set covers, in `VENDORED_SYMBOLS` order. */
export function vendoredNicknames(): readonly string[] {
  const seen: string[] = []
  for (const libId of VENDORED_SYMBOLS) {
    const { library } = splitLibId(libId)
    if (!seen.includes(library)) seen.push(library)
  }
  return seen
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex")
}

/** Every `<Nickname>.kicad_sym` in the installed stock symbol directory. */
function stockLibraries(dir: string): ReadonlyMap<string, string> {
  const out = new Map<string, string>()
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".kicad_sym")) continue
    out.set(name.slice(0, -".kicad_sym".length), path.join(dir, name))
  }
  if (out.size === 0) {
    throw new Error(
      `${dir} holds no .kicad_sym library, which cannot be right - an empty stock directory ` +
        "would make every nickname looked up in it refuse for the wrong reason. Point " +
        "KICAD_SYMBOL_DIR at a real KiCad symbol directory.",
    )
  }
  return out
}

/**
 * Every vendored symbol under `nickname` is byte-identical to the installed
 * library's flattened text for the same name, or this refuses.
 *
 * Both sides are flattened by `lib/kicad/symbol-library.ts`'s `flattenedSymbol`,
 * which is the function `tools/kicad/vendor-symbols.ts` used to write the
 * vendored copies, so equality here is exact and not an approximation: the
 * installed library's symbol - and, for an `(extends …)` symbol like
 * `Transistor_BJT:2N3904`, its parent too - is what was vendored.
 */
function checkVendoredAgreement(nickname: string, stockFile: string): void {
  const installed = librarySymbols(fs.readFileSync(stockFile, "utf8"))
  for (const libId of VENDORED_SYMBOLS) {
    const { library, name } = splitLibId(libId)
    if (library !== nickname) continue
    const vendoredFile = vendoredSymbolFile(libId)
    const vendored = vendoredSymbolText(libId)
    if (!installed.has(name)) {
      throw new Error(
        `"${libId}" is vendored at ${vendoredFile} but ${stockFile} holds no symbol "${name}". ` +
          "Nothing is preferred: the vendored copy pins what a drawing of this symbol looks " +
          "like on every machine, and an installed library that no longer has it cannot be " +
          "checked against. Re-run tools/kicad/vendor-symbols.ts against this KiCad and " +
          "update lib/kicad/symbols/PROVENANCE.md, or point KICAD_SYMBOL_DIR at the version " +
          "that was vendored from.",
      )
    }
    const installedText = `${flattenedSymbol(installed, name)}\n`
    if (installedText === vendored) continue
    throw new Error(
      `"${libId}" differs between the vendored copy and the installed library:\n` +
        `  ${vendoredFile}\n    sha256 ${sha256(vendored)}\n` +
        `  ${stockFile}\n    sha256 ${sha256(installedText)}\n` +
        "NOTHING IS PREFERRED. Preferring the installed one would make the drawing depend on " +
        "which KiCad is on the machine; preferring the vendored one would draw a symbol this " +
        "KiCad does not have. Re-run tools/kicad/vendor-symbols.ts against this KiCad and " +
        "update lib/kicad/symbols/PROVENANCE.md if the drift is intended, or point " +
        "KICAD_SYMBOL_DIR at the version PROVENANCE.md names.",
    )
  }
}

/**
 * The nickname-to-library-file map for exactly `nicknames`, with every
 * vendored symbol under each one checked against the installed library.
 *
 * Takes the nicknames it is asked for rather than returning all 200-odd
 * installed libraries: the map becomes `SymbolResolver.files`, which the
 * version lock fingerprints, and a lock over every library a machine happens
 * to have installed would be a fingerprint of the machine.
 */
export function symbolLibraries(nicknames: Iterable<string>): ReadonlyMap<string, string> {
  const dir = stockSymbolDir()
  const stock = stockLibraries(dir)
  const vendored = vendoredNicknames()
  const out = new Map<string, string>()
  const unresolvable: string[] = []
  for (const nickname of nicknames) {
    if (out.has(nickname)) continue
    const file = stock.get(nickname)
    if (file === undefined) {
      unresolvable.push(nickname)
      continue
    }
    if (vendored.includes(nickname)) checkVendoredAgreement(nickname, file)
    out.set(nickname, file)
  }
  if (unresolvable.length > 0) {
    throw new Error(
      `no symbol library for nickname(s) ${unresolvable.join(", ")}. Looked in the installed ` +
        `stock directory ${dir}; the vendored set covers ${vendored.join(", ")} and nothing ` +
        "else. Either install the KiCad library that provides it (or point KICAD_SYMBOL_DIR " +
        "at one that has it), or add the symbol to VENDORED_SYMBOLS in " +
        "lib/kicad/symbol-library.ts and run tools/kicad/vendor-symbols.ts - a nickname is " +
        "never guessed at and never silently dropped, because a dropped nickname is a symbol " +
        "missing from a drawing nobody was told about.",
    )
  }
  return out
}
