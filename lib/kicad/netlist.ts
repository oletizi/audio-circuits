/**
 * Import a `kicad-cli` netlist export.
 *
 * The result is keyed by KiCad DESIGNATORS with PIN NUMBERS, not by semantic
 * ids and canonical pin names. That is deliberate: this reads someone else's
 * artefact, and translating it into our vocabulary requires a mapping the
 * caller supplies.
 */
import { attr, child, children, parseSexpr } from "./sexpr.ts"
import type { SNode } from "./sexpr.ts"
import { defaultKicadCli } from "./install.ts"

/**
 * THE PATH TO `kicad-cli`, NOT A SPAWNER. Nothing here runs it; this is the
 * string two different consumers derive a path FROM.
 *
 * **Why it lives in this module.** `digital-pedal-platform`'s
 * `tools/kicad/netlist.ts` - the counterpart this file's name matches - exports
 * `KICAD_CLI`, and the schematic generator's ported `stockSymbolDir()` imported
 * it from there to derive `dirname(KICAD_CLI)/../SharedSupport/symbols`; the
 * port manifest resolved that `@/kicad/netlist` specifier to THIS file, so it
 * pointed at the module it named rather than at a stand-in. The port and every
 * file it brought in are deleted (Task 9 of
 * `docs/superpowers/plans/2026-10-30-remove-schgen.md`), so the name is now
 * just this repository's own; what still derives a path from it is
 * `./install.ts`'s `defaultSymbolDir`/`defaultFootprintDir`.
 *
 * **THE DEFAULT IS NOW ONE TypeScript SOURCE OF TRUTH**
 * (`docs/known-gaps.md` **G169**, discharging **G121**'s point (b)):
 * `./install.ts`'s `defaultKicadCli()` is a per-platform candidate list, not
 * a bare macOS literal, and every consumer imports THIS constant instead of
 * carrying its own copy - `./pin-pattern-sources.ts`,
 * `tools/pultec/schematic-sync.ts`, and on the test side
 * `tests/circuits/drafted-sheet.ts`, `tests/circuits/committed-schematic.ts`,
 * `tests/kicad/symbol-library-disk.ts` and `tests/kicad/footprint-library.ts`.
 * **It still duplicates the `KICAD_CLI ?=` default
 * in `make/board.mk`**, because Make cannot import TypeScript - that one
 * remaining duplicate is deliberate (the Makefile's own comment explains why)
 * and `tests/kicad/install.test.ts` checks the two literals agree rather than
 * letting them drift silently. An explicitly set `KICAD_CLI` always wins,
 * here and there.
 */
export const KICAD_CLI: string = process.env["KICAD_CLI"] ?? defaultKicadCli()

export interface ImportedComponent {
  readonly designator: string
  readonly value: string
  readonly footprint?: string
  readonly libPart?: string
  /**
   * The component's schematic link, as a board footprint's `(path ...)` wants
   * it: the sheet's `(sheetpath (tstamps ...))` joined to the component's own
   * `(tstamps ...)` by exactly one `/`. A root-sheet component, whose
   * sheetpath tstamps is `/`, therefore gets `/<comp-uuid>`.
   *
   * ABSENT, not empty, when the `(comp)` carries neither part: a footprint
   * placed with an invented path claims a link to a symbol that may not
   * exist, which is worse than having no link.
   */
  readonly uuidPath?: string
  /**
   * The `(fields)` block, `(field (name "X") "value")` by name. A field
   * written with no value - KiCad emits `(field (name "Datasheet"))` for an
   * empty one - carries the empty string, which is what it means; the KEY is
   * absent only when the `(comp)` has no `(fields)` block at all.
   */
  readonly fields?: Readonly<Record<string, string>>
}

export interface ImportedNetlist {
  readonly components: readonly ImportedComponent[]
  /** net name -> sorted "designator.pin" members */
  readonly nets: Readonly<Record<string, readonly string[]>>
}

/**
 * The `(comp)`'s schematic link, or undefined when either half is missing.
 * Joined by exactly one `/`, whichever way the two halves are punctuated.
 */
function uuidPathOf(comp: SNode): string | undefined {
  const sheetpath = child(comp, "sheetpath")
  const sheetTstamps = sheetpath === undefined ? undefined : attr(sheetpath, "tstamps")
  const own = attr(comp, "tstamps")
  if (sheetTstamps === undefined || own === undefined) return undefined
  return `${sheetTstamps.replace(/\/+$/, "")}/${own.replace(/^\/+/, "")}`
}

/** The `(fields)` block by field name, or undefined when there is no such block. */
function fieldsOf(comp: SNode): Readonly<Record<string, string>> | undefined {
  const fieldsNode = child(comp, "fields")
  if (fieldsNode === undefined) return undefined
  const fields: Record<string, string> = {}
  for (const field of children(fieldsNode, "field")) {
    const name = attr(field, "name")
    if (name === undefined) throw new Error("(field) with no (name)")
    fields[name] = field.atoms[0] ?? ""
  }
  return fields
}

export function importNetlist(text: string): ImportedNetlist {
  const root = parseSexpr(text)
  const componentsNode = child(root, "components")
  if (componentsNode === undefined) {
    throw new Error("netlist has no (components) section")
  }

  const components = children(componentsNode, "comp").map((comp): ImportedComponent => {
    const designator = attr(comp, "ref")
    if (designator === undefined) throw new Error("(comp) with no (ref)")
    const value = attr(comp, "value")
    if (value === undefined) throw new Error(`component "${designator}" has no (value)`)
    const libsource = child(comp, "libsource")
    const footprint = attr(comp, "footprint")
    const libPart = libsource === undefined ? undefined : attr(libsource, "part")
    const uuidPath = uuidPathOf(comp)
    const fields = fieldsOf(comp)
    return {
      designator,
      value,
      ...(footprint !== undefined ? { footprint } : {}),
      ...(libPart !== undefined ? { libPart } : {}),
      ...(uuidPath !== undefined ? { uuidPath } : {}),
      ...(fields !== undefined ? { fields } : {}),
    }
  })

  const declared = new Set(components.map((c) => c.designator))
  const netsNode = child(root, "nets")
  if (netsNode === undefined) {
    throw new Error("netlist has no (nets) section")
  }

  const nets: Record<string, readonly string[]> = {}
  for (const netNode of children(netsNode, "net")) {
    const name = attr(netNode, "name")
    if (name === undefined) throw new Error("(net) with no (name)")
    const members = children(netNode, "node").map((node) => {
      const ref = attr(node, "ref")
      const pin = attr(node, "pin")
      if (ref === undefined || pin === undefined) {
        throw new Error(`net "${name}" has a (node) missing (ref) or (pin)`)
      }
      if (!declared.has(ref)) {
        throw new Error(`net "${name}" references "${ref}", which is not declared in (components)`)
      }
      return `${ref}.${pin}`
    })
    nets[name] = [...members].sort()
  }

  return { components, nets }
}
