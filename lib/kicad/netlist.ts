/**
 * Import a `kicad-cli` netlist export.
 *
 * The result is keyed by KiCad DESIGNATORS with PIN NUMBERS, not by semantic
 * ids and canonical pin names. That is deliberate: this reads someone else's
 * artefact, and translating it into our vocabulary requires a mapping the
 * caller supplies.
 */
import { attr, child, children, parseSexpr } from "./sexpr.ts"
import { defaultKicadCli } from "./install.ts"

/**
 * THE PATH TO `kicad-cli`, NOT A SPAWNER. Nothing here runs it; this is the
 * string two different consumers derive a path FROM.
 *
 * **Why it lives in this module.** `digital-pedal-platform`'s
 * `tools/kicad/netlist.ts` - the counterpart this file's name matches - exports
 * `KICAD_CLI`, and `lib/schgen/render/library.ts`'s ported `stockSymbolDir()`
 * imports it from there to derive
 * `dirname(KICAD_CLI)/../SharedSupport/symbols`. `tools/schgen/port-manifest.json`
 * resolves that `@/kicad/netlist` import to THIS file, so the specifier points
 * at the module it names rather than at a stand-in. Task 11 of the M1 schematic
 * plan adapts the rest of pedals' netlist API (`connectivityFromXml`) here; a
 * ported file that needs it before then fails `bun run typecheck` naming the
 * missing export.
 *
 * **THE DEFAULT IS NOW ONE TypeScript SOURCE OF TRUTH**
 * (`docs/known-gaps.md` **G169**, discharging **G121**'s point (b)):
 * `./install.ts`'s `defaultKicadCli()` is a per-platform candidate list, not
 * a bare macOS literal, and `tests/circuits/kicad-round-trip.ts` and
 * `tools/pultec/schematic-sync.ts` both now import THIS constant instead of
 * carrying their own copy. **It still duplicates the `KICAD_CLI ?=` default
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
}

export interface ImportedNetlist {
  readonly components: readonly ImportedComponent[]
  /** net name -> sorted "designator.pin" members */
  readonly nets: Readonly<Record<string, readonly string[]>>
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
    return {
      designator,
      value,
      ...(footprint !== undefined ? { footprint } : {}),
      ...(libPart !== undefined ? { libPart } : {}),
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
