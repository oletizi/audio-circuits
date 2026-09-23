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

  // The legacy format's grammar is a single outer form: ( <component form>* )
  // Exactly one top-level ")" is legitimate, and it must be the last token -
  // it is the terminal close of the outer form, not a token to be skipped.
  let i = 1
  let closedAt = -1
  while (i < tokens.length) {
    if (tokens[i] === ")") {
      closedAt = i
      i++
      break
    }
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

  if (closedAt === -1) {
    throw new Error("legacy netlist never closes its top-level form")
  }
  // EESchema always appends a bare "*" after the top-level close to mark
  // end-of-file. It is not structural - it never nests inside the form - but
  // real exports (and the VeroRoute-fed netlist for pt2399-core) always carry
  // it, so it must be accepted as the sole permitted trailing token.
  if (i === tokens.length - 1 && tokens[i] === "*") {
    i++
  }
  if (i !== tokens.length) {
    throw new Error(
      `unexpected trailing token "${tokens[i]}" after the top-level close of the legacy netlist`,
    )
  }

  if (components.length === 0) throw new Error("legacy netlist declares no components")
  for (const key of Object.keys(nets)) nets[key].sort()
  return { components, nets }
}

/**
 * Write an EESchema v1.1 netlist - the mirror of `importLegacyNetlist`.
 *
 * THE PACKAGE FIELD HOLDS A VEROROUTE IMPORT STRING, not a KiCad footprint
 * name. VeroRoute treats that field as its component Type, so a netlist
 * written this way imports a fully typed board with no Part Aliases entry.
 *
 * The uuid field is not carried by the canonical model and is not carried by
 * the reader either, so it is written as "/" plus the designator: unique,
 * stable across runs, and meaningful to a human reading the file. Nothing
 * downstream reads it - the reader discards it - which is precisely why a
 * generated one is safe.
 *
 * Layout matches the files KiCad itself produces (two spaces after "created",
 * two between the package and the designator, pin numbers right-aligned in
 * five columns) so a diff against a real export stays readable. None of that
 * spacing is load-bearing: the reader tokenises on whitespace.
 */
export interface WriteOptions {
  /** ISO 8601 timestamp for the header comment. Explicit so output is reproducible. */
  readonly createdAt: string
}

/**
 * The file format is a bare whitespace tokenizer (see `importLegacyNetlist`'s hazard
 * comment above): a field written empty, or written with embedded whitespace, shifts
 * the token stream, and the reader then throws pointing at whichever field happens to
 * fall out of alignment - not the field that is actually wrong. Every field that
 * becomes its own token is checked here, at write time, so a malformed input is
 * reported against the field that is actually at fault.
 */
function assertToken(value: string, field: string, context: string): void {
  if (value.length === 0) {
    throw new Error(`${context}: ${field} must not be empty`)
  }
  if (/\s/.test(value)) {
    throw new Error(`${context}: ${field} must not contain whitespace, got "${value}"`)
  }
}

export function writeLegacyNetlist(netlist: ImportedNetlist, options: WriteOptions): string {
  if (netlist.components.length === 0) {
    throw new Error("refusing to write a netlist with no components")
  }

  // Invert the net map once: the file is organized by component, the model by net.
  const pinsByDesignator = new Map<string, { pin: string; net: string }[]>()
  for (const [netName, members] of Object.entries(netlist.nets)) {
    assertToken(netName, "net name", `net "${netName}"`)
    for (const member of members) {
      const dot = member.lastIndexOf(".")
      if (dot === -1) {
        throw new Error(`net "${netName}" has a member "${member}" that is not designator.pin`)
      }
      const designator = member.slice(0, dot)
      const pin = member.slice(dot + 1)
      assertToken(pin, "pin label", `component ${designator} on net "${netName}"`)
      const existing = pinsByDesignator.get(designator)
      if (existing) existing.push({ pin, net: netName })
      else pinsByDesignator.set(designator, [{ pin, net: netName }])
    }
  }

  const lines: string[] = [`( { EESchema Netlist Version 1.1 created  ${options.createdAt} }`]

  for (const component of netlist.components) {
    assertToken(component.designator, "designator", `component ${component.designator}`)
    assertToken(component.value, "value", `component ${component.designator}`)

    const pins = pinsByDesignator.get(component.designator)
    if (pins === undefined || pins.length === 0) {
      throw new Error(
        `component ${component.designator} appears on no net. VeroRoute cannot place a part ` +
          "with no pins, and a netlist that declares one reads as a board with a missing part.",
      )
    }
    const footprint = component.footprint
    if (footprint === undefined || footprint.length === 0) {
      throw new Error(
        `component ${component.designator} has no package field. VeroRoute reads that field ` +
          "as its component Type and cannot import a part without one.",
      )
    }
    assertToken(footprint, "footprint", `component ${component.designator}`)
    lines.push(` ( /${component.designator} ${footprint}  ${component.designator} ${component.value}`)
    // Numeric pin order where the pins are numbers, lexical otherwise, so a
    // 16-pin DIP reads 1..16 rather than 1, 10, 11.
    const ordered = [...pins].sort((a, b) => {
      const left = Number(a.pin)
      const right = Number(b.pin)
      if (Number.isFinite(left) && Number.isFinite(right)) return left - right
      return a.pin.localeCompare(b.pin)
    })
    for (const { pin, net } of ordered) {
      lines.push(`  (${pin.padStart(5)} ${net} )`)
    }
    lines.push(" )")
  }

  lines.push(")", "*", "")
  return lines.join("\n")
}
