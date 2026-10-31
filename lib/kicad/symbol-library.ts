/**
 * KiCad symbol definitions, handled as raw text.
 *
 * A `.kicad_sch` embeds a copy of every symbol it uses (`lib_symbols`), so a
 * writer needs symbol TEXT it can paste. `parseSexpr` is used to read names and
 * pin geometry, but never to re-serialise: it drops whether an atom was quoted,
 * and KiCad distinguishes `yes` from `"yes"`.
 *
 * **IT HAD TWO CONSUMERS; IT HAS ONE NOW.** It was written for
 * `lib/kicad/schematic.ts`, the stub writer `lib/schgen/` replaced - that
 * file is deleted (Task 6, `docs/superpowers/plans/2026-10-30-remove-schgen.md`,
 * discharging `docs/known-gaps.md` **G248**'s non-deletion). The one consumer
 * left is `lib/schgen/render/stock-symbols.ts`: it imports `VENDORED_SYMBOLS`,
 * `librarySymbols`, `splitLibId`, `flattenedSymbol`, `vendoredSymbolFile` and
 * `vendoredSymbolText` to build the nickname map `createResolver` is handed,
 * with the vendored set authoritative and the installed stock directory a
 * declared extension (its own header has the deviation that decision cost).
 * **It does not import `symbolPins` or the `supportedUnitSymbols` helper
 * below them**, so those two now have ZERO production callers - every
 * remaining caller of either is a test. State this as a fact about today, not
 * a judgement to act on: whether a test-only function should move or go is
 * not this comment's call, and Task 9 of the same plan deletes
 * `lib/schgen/render/stock-symbols.ts` itself, which will change the answer
 * again - check who imports what at the time you read this rather than
 * trusting the count above it.
 *
 * The symbols live in `./symbols/<Library>/<Name>.sexpr`, copied from an
 * installed KiCad by `tools/kicad/vendor-symbols.ts`. The deleted stub writer
 * read `vendoredSymbolText` and embedded the result verbatim, so its output
 * never depended on whichever KiCad happened to be installed, and needed none
 * installed. Nothing left imports `vendoredSymbolText` for that purpose; see
 * the next paragraph for how the surviving consumer uses it instead.
 *
 * **THE SURVIVING CONSUMER USES THESE FILES THE OTHER WAY ROUND.**
 * `lib/schgen/render/stock-symbols.ts` resolves a library nickname to the
 * INSTALLED KiCad's `.kicad_sym` and reads the files here only to CHECK it,
 * refusing when a vendored symbol and the installed library's flattened text
 * for the same name disagree. It cannot do otherwise: `createResolver`'s map
 * is keyed by nickname, so a single-symbol `.sexpr` is not something it can
 * be handed. So vendoring buys that consumer a refusal rather than
 * independence, and KiCad is a hard dependency of it. See
 * `./symbols/PROVENANCE.md` and `docs/known-gaps.md` **G119**.
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
  // Vendored for DRIFT DETECTION rather than for embedding: `lib/schgen/ir/mechanical-pins.ts`
  // exempts this symbol's `MP` pin from `pinsDeclared`, and that exemption is only as good as
  // the claim that `MP` is still the mount lug. Vendoring puts the symbol under
  // `lib/schgen/render/stock-symbols.ts`' byte-exact refusal, so a KiCad that moves the pin
  // fails loudly instead of silently exempting whatever ends up with that number.
  // `docs/superpowers/specs/2026-10-24-mechanical-pins-design.md` section 3.5.
  "Switch:SW_Rotary_1x6_MP",
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
  /**
   * The electrical type KiCad stores on the pin itself (`passive`, `power_in`,
   * `bidirectional`, ...). **This is not reliable evidence that a pin is mechanical rather
   * than electrical** - an ordinary two-leg part and a mounting lug on the same symbol can
   * both be typed `passive` (`lib/schgen/ir/mechanical-pins.ts`'s own header measures this:
   * both terminals of `Device:R` and six of eight TL072 pins would misclassify under a
   * type-based rule). It is exposed because a caller may still want to assert it, not because
   * it answers "is this pin reached by a conductor" - `strokeEndpointsAt` below answers that.
   */
  readonly type: string
  /** The pin's own name, as KiCad draws it - often `""`, and sometimes the pin's own number
   * re-used as its name (e.g. every pin of `Switch:SW_Rotary_1x12`). */
  readonly name: string
  /** How far the pin's own drawn leg runs from `(at x y angle)` into the symbol body. */
  readonly length: number
}

/**
 * The library's own name for a unit sub-symbol, `symbol.atoms[0]` of a `(symbol "Name_<unit>_
 * <bodyStyle>" ...)` form - refusing an unnamed one so every caller gets the same message.
 */
function unitSubSymbolName(unit: SNode, symbolName: string): string {
  const unitName = unit.atoms[0]
  if (unitName === undefined) {
    throw new Error(`symbol "${symbolName}" has a unit sub-symbol with no name; expected "Name_<unit>_<bodyStyle>"`)
  }
  return unitName
}

/**
 * This symbol's SUPPORTED unit sub-symbols: unit 0 (pins and graphics common to every unit)
 * and unit 1 (the part's own body, which is every pin and every graphic a single-unit symbol
 * has). KiCad names a unit sub-symbol "Name_<unit>_<bodyStyle>": `<unit>` is 0 for the common
 * unit or 1, 2, 3... for a specific one, and `<bodyStyle>` is 0 or 1 for every vendored symbol
 * here (a De Morgan alternate would be 2 and is skipped, since this repository has none). A
 * unit sub-symbol with no name, or with a unit number greater than 1, refuses: the now-deleted
 * stub writer (`lib/kicad/schematic.ts`, removed by Task 6 of
 * `docs/superpowers/plans/2026-10-30-remove-schgen.md`) always placed a symbol's `(unit 1)` and
 * merged every returned pin onto it, which would have silently dropped or wrongly combined a
 * genuine multi-unit part's pins or graphics rather than being wrong about it loudly - the
 * refusal below is what made that loud while the stub writer was this function's caller.
 *
 * **THE REFUSAL WAS THE STUB WRITER'S LIMIT AND NEVER THE REPOSITORY'S.**
 * `lib/schgen/` handles multi-unit packages - a UNIT is its unit of placement,
 * `lib/schgen/ir/` keys parts by `unitKey(label, unit)`, and
 * `tests/schgen/render/templates/opamp-stock.kicad.test.ts` draws a three-unit
 * op-amp through it. `lib/schgen/render/stock-symbols.ts` does not import this
 * function (it takes `VENDORED_SYMBOLS`, `librarySymbols`, `splitLibId`,
 * `flattenedSymbol`, `vendoredSymbolFile` and `vendoredSymbolText` and nothing
 * else), so **nothing in the generator's path meets this refusal - and now that
 * the stub writer is deleted, nothing in production calls `symbolPins`, or this
 * function through it, at all: every remaining caller of either is a test.**
 * See this file's own header for the same count and why it is stated rather
 * than acted on here.
 *
 * **SHARED BY `symbolPins` AND `symbolStrokeSegments`**, so a pin walk and a graphics walk of
 * the same block can never disagree about which unit sub-symbols are in scope - the one thing
 * that would make a stroke-endpoint comparison between the two meaningless.
 */
function supportedUnitSymbols(block: string): { readonly name: string; readonly units: readonly SNode[] } {
  const root = parseSexpr(block)
  const name = root.atoms[0] ?? "(unnamed)"
  const units: SNode[] = []
  for (const unit of root.nodes.filter((n) => n.name === "symbol")) {
    const unitName = unitSubSymbolName(unit, name)
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
        `symbol "${name}" has unit ${unitNumber} ("${unitName}"): a multi-unit symbol. This ` +
          "function does not support multi-unit symbols: lib/kicad/schematic.ts, the now-" +
          "deleted stub writer that was once its only caller, always placed a symbol as " +
          "\"(unit 1)\" and merged every unit's pins onto it, which would have been wrong once " +
          "there was more than one unit. lib/schgen/ places units separately and draws them " +
          "through a different path that does not call this function; if you reached this " +
          "refusal, you are calling symbolPins or symbolStrokeSegments directly on a multi-" +
          "unit block, which neither supports.",
      )
    }
    if (bodyStyle !== "0" && bodyStyle !== "1") continue
    units.push(unit)
  }
  return { name, units }
}

export function symbolPins(block: string): readonly SymbolPin[] {
  const { name, units } = supportedUnitSymbols(block)
  const pins: SymbolPin[] = []
  for (const unit of units) {
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
      const type = pin.atoms[0]
      if (type === undefined) {
        throw new Error(`symbol "${name}" pin "${number}" has no electrical type (expected "(pin <type> <style> ...)")`)
      }
      const pinName = pin.nodes.find((n) => n.name === "name")?.atoms[0]
      if (pinName === undefined) {
        throw new Error(`symbol "${name}" pin "${number}" has no (name ...)`)
      }
      const lengthText = pin.nodes.find((n) => n.name === "length")?.atoms[0]
      const length = lengthText === undefined ? Number.NaN : Number(lengthText)
      if (!Number.isFinite(length)) {
        throw new Error(`symbol "${name}" pin "${number}" has no numeric (length ...)`)
      }
      if (pins.some((p) => p.number === number)) {
        throw new Error(`symbol "${name}" declares pin "${number}" twice`)
      }
      pins.push({ number, x, y, angle, type, name: pinName, length })
    }
  }
  return pins
}

/** A straight stroke's two endpoints, in the library frame (raw mm, not snapped to any grid). */
export type SymbolSegment = readonly [readonly [number, number], readonly [number, number]]

/** The two numbers of an `(xy x y)`-shaped child of `node` named `childName`, or undefined if absent. */
function xyOf(node: SNode, childName: string): readonly [number, number] | undefined {
  const child = node.nodes.find((n) => n.name === childName)
  if (child === undefined) return undefined
  const [x, y] = child.atoms.map(Number)
  if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) return undefined
  return [x, y]
}

/** Consecutive points turned into legs: `[p0,p1], [p1,p2], ...` - a single-segment `(pts ...)`
 * (every polyline this repository has read off Switch.kicad_sym) becomes exactly one leg. */
function legsOf(points: readonly (readonly [number, number])[]): SymbolSegment[] {
  const legs: SymbolSegment[] = []
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (a === undefined || b === undefined) continue
    legs.push([a, b])
  }
  return legs
}

/**
 * The straight strokes a symbol's supported units draw, BESIDES the pins' own legs: rectangle
 * edges, polyline/bezier legs, and a circle's bounding-box edges (which is what
 * `lib/schgen/render/lib-graphics.ts`'s `drawn()` - the function this ports the one assertion
 * of - also puts into its `segments` list; an `arc` there contributes to `blocks`, a
 * text-avoidance concern, and never to `segments`, so arcs are deliberately not read here
 * either). **This is scoped to exactly what `strokeEndpointsAt` needs - a stroke's ENDPOINTS -
 * and nothing past that**: no de-duplication, no bounding-box union, no µm snapping. The
 * original ported those for ITS OWN purpose (placement clearance and text avoidance in a
 * generator this repository is deleting); reproducing them here would be writing a second
 * symbol parser for a purpose nothing in this repository has. Coordinates stay in the raw mm
 * floats `symbolPins` already returns, which is why `strokeEndpointsAt` can compare a pin's
 * computed body-side point against these endpoints without converting either side's units.
 */
export function symbolStrokeSegments(block: string): readonly SymbolSegment[] {
  const { units } = supportedUnitSymbols(block)
  const segments: SymbolSegment[] = []
  for (const unit of units) {
    for (const item of unit.nodes) {
      if (item.name === "polyline" || item.name === "bezier") {
        const pts = item.nodes.find((n) => n.name === "pts")
        if (pts === undefined) continue
        const points = pts.nodes
          .filter((n) => n.name === "xy")
          .map((n): readonly [number, number] | undefined => {
            const [x, y] = n.atoms.map(Number)
            return x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)
              ? undefined
              : [x, y]
          })
          .filter((p): p is readonly [number, number] => p !== undefined)
        segments.push(...legsOf(points))
      } else if (item.name === "rectangle") {
        const start = xyOf(item, "start")
        const end = xyOf(item, "end")
        if (start === undefined || end === undefined) continue
        const [x0, y0] = start
        const [x1, y1] = end
        segments.push(...legsOf([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]))
      } else if (item.name === "circle") {
        const center = xyOf(item, "center")
        const radiusText = item.nodes.find((n) => n.name === "radius")?.atoms[0]
        const radius = radiusText === undefined ? Number.NaN : Number(radiusText)
        if (center === undefined || !Number.isFinite(radius)) continue
        const [cx, cy] = center
        segments.push(...legsOf([
          [cx - radius, cy - radius], [cx + radius, cy - radius],
          [cx + radius, cy + radius], [cx - radius, cy + radius], [cx - radius, cy - radius],
        ]))
      }
    }
  }
  return segments
}

/** Coordinates equal within float noise from two independently-evaluated expressions over the
 * same decimal literals (addition on one side, direct parse on the other). */
const COINCIDENT_EPSILON = 1e-6

/**
 * Where a pin's own drawn leg ends, at its body-side (inward) connection point - the point
 * `strokeEndpointsAt` asks whether any OTHER stroke in the symbol also ends at.
 *
 * Carried over from `endpointsAt` in `tests/schgen/ir/mechanical-pins.test.ts`: `angle` is
 * always a multiple of 90 on every symbol this repository reads, so `Math.round` on `cos`/`sin`
 * turns the trig functions' float noise (`cos(90deg)` is not exactly 0) into the exact -1/0/1
 * the direction actually is.
 */
export function pinBodyEnd(pin: SymbolPin): readonly [number, number] {
  const rad = (pin.angle * Math.PI) / 180
  return [pin.x + pin.length * Math.round(Math.cos(rad)), pin.y + pin.length * Math.round(Math.sin(rad))]
}

/**
 * How many of the symbol's OTHER strokes (`symbolStrokeSegments`, which never includes the
 * pins' own legs) have an endpoint at `pin`'s body-side connection point. Zero means no
 * conductor drawn inside the symbol reaches that pin - the geometric test
 * `lib/schgen/ir/mechanical-pins.ts`'s header and `tests/schgen/ir/mechanical-pins.test.ts`'s
 * arm 1 used to tell a mounting lug from an electrical pin, both `passive` in the library data
 * alike. Ported assertion, not a re-derivation: see that test's `endpointsAt` for the original.
 */
export function strokeEndpointsAt(block: string, pin: SymbolPin): number {
  const [ix, iy] = pinBodyEnd(pin)
  const at = (p: number, q: number): boolean => Math.abs(p - ix) < COINCIDENT_EPSILON && Math.abs(q - iy) < COINCIDENT_EPSILON
  return symbolStrokeSegments(block).filter(([a, b]) => at(a[0], a[1]) || at(b[0], b[1])).length
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
