/**
 * Reading a symbol's pins for the pedal's part checks (h7 pedal pages plan, Task 2), and the
 * comparison rule CR-PEDAL-PIN-MATCH (docs/h7-platform/decisions.md) states:
 *
 * - **Number:** exact.
 * - **Name:** exact and case-sensitive, after KiCad's subscript markup `_{...}` is rendered to its
 *   text on both sides (`V_{DD}` is VDD drawn with DD lowered, which is how the data sheets draw it).
 *   An overbar `~{...}` is NOT removed: it marks an active-low pin and is part of the name.
 * - **Electrical type:** exact.
 * - **Hidden:** a symbol pin is hidden only where the table says so (`hidden: true`). A hidden pin
 *   cannot be seen or wired on a page, and a hidden `power_in` pin is an implicit global net in KiCad,
 *   so a stand-in that hides a pin the data sheet's part has to show does not match.
 *
 * Pins are read unit by unit (`symbolUnitPins`) and merged, so a multi-unit symbol is compared as the
 * one package it is; a pin number declared twice refuses there, as it does for copperhead.
 */
import fs from "node:fs"
import { librarySymbols, splitLibId, symbolUnitPins } from "../../lib/kicad/symbol-library.ts"
import type { SymbolUnitPins } from "../../lib/kicad/symbol-library.ts"
import {
  SYMBOL_LIBRARY_ROOT, installedFlattenedSymbol, installedSymbolNames, installedSymbolUnitPins,
} from "../kicad/symbol-library-disk.ts"
import { PROJECT_SYMBOL_LIBRARY } from "../../circuits/h7-platform/parts.ts"
import type { DatasheetPin } from "../../circuits/h7-platform/pedal-pin-tables.ts"

const PROJECT_NICKNAME = "h7-platform"

/** KiCad's subscript markup rendered to its text: `V_{OUT}R-` -> `VOUTR-`. Overbars are kept. */
export function renderedName(name: string): string {
  return name.replace(/_\{([^}]*)\}/g, "$1")
}

/** A symbol's pins unit by unit: the project library for `h7-platform:`, the installed KiCad otherwise. */
export function unitPinsOf(libId: string): readonly SymbolUnitPins[] {
  const { library, name } = splitLibId(libId)
  if (library === PROJECT_NICKNAME) return symbolUnitPins(projectBlock(name))
  return installedSymbolUnitPins(libId)
}

function projectBlock(name: string): string {
  const block = librarySymbols(fs.readFileSync(PROJECT_SYMBOL_LIBRARY, "utf8")).get(name)
  if (block === undefined) throw new Error(`${PROJECT_SYMBOL_LIBRARY} defines no symbol "${name}"`)
  return block
}

/**
 * The pin numbers a symbol block hides: a `(hide yes)` form, or the older bare `hide` atom, in the
 * pin's own form before its name (`symbolUnitPins` does not read the flag).
 */
export function hiddenPinNumbers(block: string): ReadonlySet<string> {
  const hidden = new Set<string>()
  const pin = /\(pin \w+ \w+([\s\S]*?)\(name "(?:[^"\\]|\\.)*"[\s\S]*?\(number "([^"]*)"/g
  for (const m of block.matchAll(pin)) {
    if (/\(hide yes\)|\shide(\s|\))/.test(m[1] ?? "")) hidden.add(m[2] ?? "")
  }
  return hidden
}

/** One symbol pin as compared: name, type and whether it is hidden. */
export interface SymbolPinFacts extends DatasheetPin {
  readonly hidden: boolean
}

/** Every pin of the symbol, all units merged: number -> name, type and hidden flag. */
export function pinTableOf(libId: string): ReadonlyMap<string, SymbolPinFacts> {
  const { library, name } = splitLibId(libId)
  const hidden = hiddenPinNumbers(library === PROJECT_NICKNAME ? projectBlock(name) : installedFlattenedSymbol(libId))
  const table = new Map<string, SymbolPinFacts>()
  for (const unit of unitPinsOf(libId)) {
    for (const pin of unit.pins) table.set(pin.number, { name: pin.name, type: pin.type, hidden: hidden.has(pin.number) })
  }
  return table
}

/**
 * Where the symbol disagrees with the data sheet table, one line per pin: a pin missing on either
 * side, a name differing after rendering, a type differing, or a pin hidden (or shown) against the
 * table. Empty means it matches.
 */
export function pinMismatches(table: Readonly<Record<string, DatasheetPin>>, symbolPins: ReadonlyMap<string, SymbolPinFacts>): string[] {
  const numbers = [...new Set([...Object.keys(table), ...symbolPins.keys()])]
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
  const out: string[] = []
  for (const n of numbers) {
    const want = table[n]
    const got = symbolPins.get(n)
    if (want === undefined) { out.push(`${n}: not in the data sheet table`); continue }
    if (got === undefined) { out.push(`${n}: not on the symbol`); continue }
    if (renderedName(want.name) !== renderedName(got.name)) out.push(`${n}: name "${got.name}", data sheet "${want.name}"`)
    if (want.type !== got.type) out.push(`${n}: type ${got.type}, data sheet ${want.type}`)
    if ((want.hidden ?? false) !== got.hidden) out.push(`${n}: ${got.hidden ? "hidden" : "shown"} on the symbol, ${want.hidden === true ? "hidden" : "shown"} in the table`)
  }
  return out
}

/** Every installed library's name, sorted. */
export function installedLibraries(): readonly string[] {
  return fs.readdirSync(SYMBOL_LIBRARY_ROOT).filter((f) => f.endsWith(".kicad_sym"))
    .map((f) => f.slice(0, -".kicad_sym".length)).sort()
}

/** The result of one scan of every installed symbol against several data sheet tables. */
export interface ScanResult {
  /** Table key -> every installed symbol matching it in full (number, name, type). */
  readonly matches: ReadonlyMap<string, readonly string[]>
  /** How many symbols were compared, and how many the reader refused (a pin number declared twice). */
  readonly compared: number
  readonly refused: number
}

/**
 * Compares every installed symbol against each table. A symbol is a candidate only if it has as many
 * pins as the table, which every full match must; the rest are counted, not compared further.
 */
export function scanInstalled(tables: Readonly<Record<string, Readonly<Record<string, DatasheetPin>>>>): ScanResult {
  const matches = new Map<string, string[]>(Object.keys(tables).map((k) => [k, []]))
  let compared = 0
  let refused = 0
  for (const library of installedLibraries()) {
    for (const name of installedSymbolNames(`${library}:x`)) {
      const libId = `${library}:${name}`
      let pins: ReadonlyMap<string, SymbolPinFacts>
      try {
        pins = pinTableOf(libId)
      } catch (e) {
        if (e instanceof Error && /declares pin .* twice/.test(e.message)) { refused++; continue }
        throw e
      }
      compared++
      for (const [key, table] of Object.entries(tables)) {
        if (Object.keys(table).length !== pins.size) continue
        if (pinMismatches(table, pins).length === 0) matches.get(key)?.push(libId)
      }
    }
  }
  return { matches, compared, refused }
}
