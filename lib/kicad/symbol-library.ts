/**
 * KiCad symbol definitions, handled as raw text.
 *
 * A `.kicad_sch` embeds a copy of every symbol it uses (`lib_symbols`), so a
 * writer needs symbol TEXT it can paste. `parseSexpr` is used to read names and
 * pin geometry, but never to re-serialise: it drops whether an atom was quoted,
 * and KiCad distinguishes `yes` from `"yes"`.
 *
 * **IT HAS TWO CONSUMERS NOW AND THEY WANT DIFFERENT THINGS FROM IT.** It was
 * written for `lib/kicad/schematic.ts`, the stub writer `lib/schgen/` replaced
 * and `docs/known-gaps.md` **G248** records as kept rather than deleted.
 * `lib/schgen/render/stock-symbols.ts` is the second: it imports
 * `VENDORED_SYMBOLS`, `librarySymbols`, `splitLibId`, `flattenedSymbol`,
 * `vendoredSymbolFile` and `vendoredSymbolText` to build the nickname map
 * `createResolver` is handed, with the vendored set authoritative and the
 * installed stock directory a declared extension (its own header has the
 * deviation that decision cost). **So "the stub writer" below names the writer
 * that motivated a given sentence and never the only reader of this module** -
 * check which consumer a sentence is about before acting on it.
 *
 * The symbols live in `./symbols/<Library>/<Name>.sexpr`, copied from an
 * installed KiCad by `tools/kicad/vendor-symbols.ts`. For
 * `lib/kicad/schematic.ts`, which reads `vendoredSymbolText` and embeds the
 * result, that means its output never depends on whichever KiCad happens to be
 * installed, and needs none installed.
 *
 * **THERE IS A SECOND CONSUMER SINCE TASK 4 OF THE M1 SCHEMATIC PLAN, AND IT
 * USES THESE FILES THE OTHER WAY ROUND.** `lib/schgen/render/stock-symbols.ts`
 * resolves a library nickname to the INSTALLED KiCad's `.kicad_sym` and reads
 * the files here only to CHECK it, refusing when a vendored symbol and the
 * installed library's flattened text for the same name disagree. It cannot do
 * otherwise: `createResolver`'s map is keyed by nickname, so a single-symbol
 * `.sexpr` is not something it can be handed. So vendoring buys that consumer
 * a refusal rather than independence, and KiCad is a hard dependency of it.
 * See `./symbols/PROVENANCE.md` and `docs/known-gaps.md` **G119**.
 */
import fs from "node:fs"
import path from "node:path"
import { parseSexpr } from "./sexpr.ts"
import type { SNode } from "./sexpr.ts"

export const VENDORED_SYMBOLS: readonly string[] = [
  "Device:R",
  "Device:C_Polarized",
  "Device:R_Potentiometer_Trim",
  "Device:R_Potentiometer",
  "Transistor_BJT:2N3904",
  "Connector_Generic:Conn_01x02",
  "Connector:TestPoint",
  "Jumper:Jumper_2_Open",
]

const VENDORED_DIR = path.join(import.meta.dir, "symbols")

interface RawForm {
  readonly node: SNode
  readonly text: string
  readonly start: number
  readonly end: number
}

/** The direct child forms of the form starting at offset 0 of `text`, with their raw text
 * and offsets. Tracks quoting, so a parenthesis inside a quoted string is not structure. */
function directChildren(text: string): readonly RawForm[] {
  const out: RawForm[] = []
  let depth = 0
  let inQuote = false
  let start = -1
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuote) {
      if (ch === "\\") {
        i++
        continue
      }
      if (ch === '"') inQuote = false
      continue
    }
    if (ch === '"') {
      inQuote = true
      continue
    }
    if (ch === "(") {
      depth++
      if (depth === 2) start = i
      continue
    }
    if (ch === ")") {
      if (depth === 2) {
        const slice = text.slice(start, i + 1)
        out.push({ node: parseSexpr(slice), text: slice, start, end: i + 1 })
      }
      depth--
      if (depth === 0) return out
    }
  }
  throw new Error("unbalanced s-expression: the outer form never closed")
}

export function splitLibId(libId: string): { readonly library: string; readonly name: string } {
  const colon = libId.indexOf(":")
  if (colon <= 0 || colon === libId.length - 1) {
    throw new Error(`"${libId}" is not a KiCad lib id; expected Library:Name`)
  }
  return { library: libId.slice(0, colon), name: libId.slice(colon + 1) }
}

/** Every top-level symbol in a `.kicad_sym` library, name -> raw block text. */
export function librarySymbols(libraryText: string): ReadonlyMap<string, string> {
  const symbols = new Map<string, string>()
  for (const form of directChildren(libraryText)) {
    if (form.node.name !== "symbol") continue
    const name = form.node.atoms[0]
    if (name === undefined) throw new Error("a library (symbol) form has no name")
    symbols.set(name, form.text)
  }
  return symbols
}

/**
 * A library symbol made self-contained: an `(extends "Parent")` is replaced by
 * the parent's body, renamed to the child, with the child's properties
 * overriding or adding to the parent's. A schematic's embedded symbols must
 * not extend anything.
 */
export function flattenedSymbol(library: ReadonlyMap<string, string>, name: string): string {
  const block = library.get(name)
  if (block === undefined) throw new Error(`symbol "${name}" is not in this library`)
  const children = directChildren(block)
  const extendsForm = children.find((f) => f.node.name === "extends")
  if (extendsForm === undefined) return block
  const parentName = extendsForm.node.atoms[0]
  if (parentName === undefined) throw new Error(`symbol "${name}" has an (extends) with no parent name`)

  let flattened = flattenedSymbol(library, parentName)
    .replace(`(symbol "${parentName}"`, `(symbol "${name}"`)
    .split(`(symbol "${parentName}_`)
    .join(`(symbol "${name}_`)

  for (const property of children.filter((f) => f.node.name === "property")) {
    const key = property.node.atoms[0]
    const current = directChildren(flattened).filter((f) => f.node.name === "property")
    const existing = current.find((f) => f.node.atoms[0] === key)
    if (existing !== undefined) {
      flattened = flattened.slice(0, existing.start) + property.text + flattened.slice(existing.end)
      continue
    }
    const last = current[current.length - 1]
    if (last === undefined) throw new Error(`parent symbol "${parentName}" has no properties to extend`)
    flattened = `${flattened.slice(0, last.end)}\n\t\t${property.text}${flattened.slice(last.end)}`
  }
  return flattened
}

export interface SymbolPin {
  readonly number: string
  readonly x: number
  readonly y: number
  /** Direction, in degrees, from the connection point into the symbol body. */
  readonly angle: number
}

/**
 * The pins of a symbol's SUPPORTED units: unit 0 (pins and graphics common to
 * every unit) and unit 1 (the part's own body, which is every pin a
 * single-unit symbol has). KiCad names a unit sub-symbol
 * "Name_<unit>_<bodyStyle>": `<unit>` is 0 for the common unit or 1, 2, 3...
 * for a specific one, and `<bodyStyle>` is 0 or 1 for every vendored symbol
 * here (a De Morgan alternate would be 2 and is skipped, since this
 * repository has none). A unit sub-symbol with no name, or with a unit number
 * greater than 1, refuses: the superseded stub writer always emits a placed
 * symbol's `(unit 1)` and merges every returned pin onto it
 * (lib/kicad/schematic.ts), which silently drops or wrongly combines a genuine
 * multi-unit part's pins rather than being wrong about it loudly.
 *
 * **THE REFUSAL IS THE STUB WRITER'S LIMIT AND NOT THE REPOSITORY'S.**
 * `lib/schgen/` handles multi-unit packages - a UNIT is its unit of placement,
 * `lib/schgen/ir/` keys parts by `unitKey(label, unit)`, and
 * `tests/schgen/render/templates/opamp-stock.kicad.test.ts` draws a three-unit
 * op-amp through it. `lib/schgen/render/stock-symbols.ts` does not import this
 * function (it takes `VENDORED_SYMBOLS`, `librarySymbols`, `splitLibId`,
 * `flattenedSymbol`, `vendoredSymbolFile` and `vendoredSymbolText` and nothing
 * else), so **nothing in the generator's path meets this refusal.**
 */
export function symbolPins(block: string): readonly SymbolPin[] {
  const root = parseSexpr(block)
  const name = root.atoms[0] ?? "(unnamed)"
  const pins: SymbolPin[] = []
  for (const unit of root.nodes.filter((n) => n.name === "symbol")) {
    const unitName = unit.atoms[0]
    if (unitName === undefined) {
      throw new Error(`symbol "${name}" has a unit sub-symbol with no name; expected "Name_<unit>_<bodyStyle>"`)
    }
    const fields = unitName.split("_")
    const bodyStyle = fields[fields.length - 1]
    const unitNumberText = fields[fields.length - 2]
    const unitNumber = unitNumberText === undefined ? Number.NaN : Number(unitNumberText)
    if (!Number.isFinite(unitNumber)) {
      throw new Error(
        `symbol "${name}" unit "${unitName}" has no numeric unit field; expected "Name_<unit>_<bodyStyle>"`,
      )
    }
    if (unitNumber > 1) {
      throw new Error(
        `symbol "${name}" has unit ${unitNumber} ("${unitName}"): a multi-unit symbol. ` +
          "lib/kicad/schematic.ts always places a symbol as \"(unit 1)\" and merges every unit's " +
          "pins onto it, which is wrong once there is more than one unit. Multi-unit symbols are " +
          "not supported by the SUPERSEDED stub writer, this function's only production caller. " +
          "lib/schgen/ places units separately and draws them; if you reached this refusal, you " +
          "are on the stub writer's path and docs/known-gaps.md G248 says why it still exists.",
      )
    }
    if (bodyStyle !== "0" && bodyStyle !== "1") continue
    for (const pin of unit.nodes.filter((n) => n.name === "pin")) {
      const at = pin.nodes.find((n) => n.name === "at")
      const number = pin.nodes.find((n) => n.name === "number")?.atoms[0]
      if (at === undefined || number === undefined) {
        throw new Error(`symbol "${name}" has a pin with no (at) or no (number)`)
      }
      const [x, y, angle] = at.atoms.map(Number)
      if (x === undefined || y === undefined || angle === undefined ||
        !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(angle)) {
        throw new Error(`symbol "${name}" pin "${number}" has an unreadable (at ...)`)
      }
      if (pins.some((p) => p.number === number)) {
        throw new Error(`symbol "${name}" declares pin "${number}" twice`)
      }
      pins.push({ number, x, y, angle })
    }
  }
  return pins
}

/**
 * Where the vendored block for `libId` lives, whether or not it is there.
 * Exported so a caller can NAME the file in its own refusal without
 * re-deriving the path shape - `lib/schgen/render/stock-symbols.ts` reports
 * both sides of a vendored-versus-installed disagreement by path.
 */
export function vendoredSymbolFile(libId: string): string {
  const { library, name } = splitLibId(libId)
  return path.join(VENDORED_DIR, library, `${name}.sexpr`)
}

/** The vendored, already-flattened block for `libId`. */
export function vendoredSymbolText(libId: string): string {
  const file = vendoredSymbolFile(libId)
  if (!fs.existsSync(file)) {
    throw new Error(
      `no vendored KiCad symbol for "${libId}" (looked for ${file}). Vendored: ` +
        `${VENDORED_SYMBOLS.join(", ")}. Add it to VENDORED_SYMBOLS in lib/kicad/symbol-library.ts ` +
        "and run tools/kicad/vendor-symbols.ts.",
    )
  }
  return fs.readFileSync(file, "utf8")
}

/** A library block as a schematic's lib_symbols holds it: the top-level name becomes the
 * full lib id; the unit sub-symbols keep their bare names. */
export function embeddedSymbol(libId: string, block: string): string {
  const { name } = splitLibId(libId)
  const header = `(symbol "${name}"`
  if (!block.startsWith(header)) {
    throw new Error(`the block for "${libId}" does not start with ${header}`)
  }
  return `(symbol "${libId}"${block.slice(header.length)}`
}
