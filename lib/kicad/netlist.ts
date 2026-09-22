/**
 * Import a `kicad-cli` netlist export.
 *
 * The result is keyed by KiCad DESIGNATORS with PIN NUMBERS, not by semantic
 * ids and canonical pin names. That is deliberate: this reads someone else's
 * artefact, and translating it into our vocabulary requires a mapping the
 * caller supplies.
 */
import { attr, child, children, parseSexpr } from "./sexpr.ts"

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
  const nets: Record<string, readonly string[]> = {}
  const netsNode = child(root, "nets")
  for (const netNode of netsNode === undefined ? [] : children(netsNode, "net")) {
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
