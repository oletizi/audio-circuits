/**
 * Reconstruct a KiCad value string from a canonical component.
 *
 * WHY THIS EXISTS. `lib/model/builder.ts` parses values on the way in -
 * `parameters: { farads: parseValue(value) }` - so ".1uF" is 1e-7 by the time
 * a Network exists, and neither Parameters nor PartSpec nor Provenance keeps
 * the spelling. VeroRoute compares values as TEXT, so a netlist saying "100nF"
 * where the board holds ".1uF" produces a Schematic delta line per part and
 * `--check` never reaches exit 0.
 *
 * Formatting from the numeric parameter was chosen over retaining the source
 * spelling in the model, because spelling is a display concern and the model
 * deliberately excludes those - Provenance is annotated "deliberately excluded
 * from electrical identity comparison", and value spelling is the same kind of
 * fact.
 *
 * DECADES THE BOARD DOES NOT EXERCISE ARE REFUSED. Extending this is a
 * deliberate one-line decision with a test, never a silent guess that surfaces
 * as a value delta on a board nobody has checked.
 *
 * This whole module is an artifact of the fork treating values as opaque
 * strings. If the fork ever compares values semantically it is deleted, and
 * its removal is a completion rather than a regression.
 */
import type { Component } from "../model/types.ts"

/** Capacitances below this are spelled in pF; at or above it, in uF. */
const PF_UF_BOUNDARY_FARADS = 1e-8

const MIN_FARADS = 1e-12
// Exclusive upper bound: spec says "farads at or above 1000uF are refused" (line 253)
const MAX_FARADS = 1e-3
const MIN_OHMS = 1000
const MAX_OHMS = 999000

/**
 * A number as KiCad spells it: no exponent, no trailing zeros, no leading zero.
 *
 * `toPrecision(10)` then `Number` collapses the float noise that unit scaling
 * introduces - 4.7e-6 * 1e6 is 4.699999999999999 - without hard-coding a
 * decimal count that would round 5600 or .01 wrongly.
 */
function decimal(value: number): string {
  const text = String(Number(value.toPrecision(10)))
  if (text.includes("e")) {
    throw new Error(`value ${value} does not have a plain decimal spelling`)
  }
  return text.startsWith("0.") ? text.slice(1) : text
}

function capacitanceText(farads: number, id: string): string {
  if (!Number.isFinite(farads) || farads < MIN_FARADS || farads >= MAX_FARADS) {
    throw new Error(
      `capacitance ${farads}F on "${id}" is outside the range this formatter has been ` +
        "proven over (1pF up to but not including 1000uF). Extend lib/kicad/value-notation.ts with a test " +
        "rather than letting it guess a spelling.",
    )
  }
  return farads < PF_UF_BOUNDARY_FARADS
    ? `${decimal(farads * 1e12)}pF`
    : `${decimal(farads * 1e6)}uF`
}

function resistanceText(ohms: number, id: string): string {
  if (!Number.isFinite(ohms) || ohms < MIN_OHMS || ohms > MAX_OHMS) {
    throw new Error(
      `resistance ${ohms}R on "${id}" is outside the range this formatter has been proven ` +
        "over (1k to 999k). Extend lib/kicad/value-notation.ts with a test rather than " +
        "letting it guess a spelling.",
    )
  }
  return `${decimal(ohms / 1000)}K`
}

/** "Connector_Generic:Conn_01x05" -> "Conn_01x05". */
function symbolPartName(symbol: string): string {
  const colon = symbol.indexOf(":")
  return colon === -1 ? symbol : symbol.slice(colon + 1)
}

/**
 * A part's value as the netlist spells it.
 *
 * For a passive this is derived from its parameter. For a part with no
 * electrical parameter - an IC, a connector - KiCad's value field holds the
 * part name, so it comes from `part.mpn` where there is a genuine one and from
 * the symbol's part name otherwise. A part with neither refuses: an empty
 * value field would reconcile as a value change against every board.
 */
export function valueFor(component: Component): string {
  if (component.kind === "capacitor") {
    const farads: unknown = Reflect.get(component.parameters, "farads")
    if (typeof farads !== "number") {
      throw new Error(`capacitor "${component.id}" has no numeric farads parameter`)
    }
    return capacitanceText(farads, component.id)
  }
  if (component.kind === "resistor") {
    const ohms: unknown = Reflect.get(component.parameters, "ohms")
    if (typeof ohms !== "number") {
      throw new Error(`resistor "${component.id}" has no numeric ohms parameter`)
    }
    return resistanceText(ohms, component.id)
  }

  const mpn = component.part?.mpn
  if (mpn !== undefined) return mpn
  const symbol = component.part?.symbol
  if (symbol !== undefined) return symbolPartName(symbol)
  throw new Error(
    `component "${component.id}" (kind ${component.kind}) has neither an mpn nor a symbol, ` +
      "so there is nothing to put in the netlist's value field.",
  )
}
