/**
 * Import an EESchema v1.1 netlist - the format VeroRoute consumes.
 *
 * This is the authoritative artefact for pt2399-core: it is what the built
 * board was laid out from.
 *
 * Shape:
 *   ( { header comment }
 *    ( /uuid FOOTPRINT REF VALUE
 *     (    1 NetName )
 *     (    2 NetName ) ) ... )
 *
 * HAZARD: generated net names contain parentheses, e.g. "Net-(U1-LPF2-IN)".
 * A tokeniser that treats every "(" and ")" as structural, or that strips a
 * trailing ")" from an atom, corrupts those names into "Net-(U1-LPF2-IN".
 *
 * EESchema writes structural parentheses whitespace-delimited, so tokenising on
 * whitespace and treating a token as structural ONLY when it is exactly "(" or
 * ")" reads net names intact. The "net names containing parentheses survive
 * tokenising" test guards this; if it ever fails, the assumption about
 * whitespace has been violated and the tokeniser needs a real parser, not a
 * patch.
 */
import type { ImportedComponent, ImportedNetlist } from "./netlist.ts"

function stripComments(text: string): string {
  return text.replace(/\{[^}]*\}/g, " ")
}

function tokenise(text: string): string[] {
  return text.split(/\s+/).filter((token) => token.length > 0)
}

export function importLegacyNetlist(text: string): ImportedNetlist {
  const tokens = tokenise(stripComments(text))
  if (tokens[0] !== "(") throw new Error("legacy netlist does not open with (")

  const components: ImportedComponent[] = []
  const nets: Record<string, string[]> = {}

  let i = 1
  while (i < tokens.length) {
    if (tokens[i] === ")") { i++; continue }
    if (tokens[i] !== "(") {
      throw new Error(`unexpected token "${tokens[i]}" at the top level of the legacy netlist`)
    }
    i++ // into the component form

    const uuid = tokens[i++] ?? ""
    if (!uuid.startsWith("/")) {
      throw new Error(`expected a /uuid at the head of a component form, got "${uuid}"`)
    }
    const footprint = tokens[i++] ?? ""
    const designator = tokens[i++] ?? ""
    const value = tokens[i++] ?? ""
    if (designator.length === 0 || value.length === 0) {
      throw new Error(`component form for "${uuid}" is missing a designator or value`)
    }
    components.push({ designator, value, footprint })

    while (i < tokens.length && tokens[i] === "(") {
      i++ // into the pin form
      const pin = tokens[i++] ?? ""
      const netName = tokens[i++] ?? ""
      if (tokens[i] !== ")") {
        throw new Error(`pin form for ${designator}.${pin} did not close where expected`)
      }
      i++
      ;(nets[netName] ??= []).push(`${designator}.${pin}`)
    }
    if (tokens[i] !== ")") {
      throw new Error(`component form for "${designator}" did not close where expected`)
    }
    i++
  }

  if (components.length === 0) throw new Error("legacy netlist declares no components")
  for (const key of Object.keys(nets)) nets[key].sort()
  return { components, nets }
}
