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
// Both ends were widened independently and both widenings are kept: down to 1R
// for the Pultec's 430R hi-cut series resistor, up to 10M for the transistor
// preamp's bias network. The range this formatter is PROVEN over is the union,
// and the tests assert both boundaries.
const MIN_OHMS = 1
const MAX_OHMS_EXCLUSIVE = 1e7

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
  if (!Number.isFinite(ohms) || ohms < MIN_OHMS || ohms >= MAX_OHMS_EXCLUSIVE) {
    throw new Error(
      `resistance ${ohms}R on "${id}" is outside the range this formatter has been proven ` +
        "over (1R up to but not including 10M). Extend lib/kicad/value-notation.ts with a test " +
        "rather than letting it guess a spelling.",
    )
  }
  // Three spellings, one per decade band. Sub-kilohm parts are spelled in ohms,
  // as the reference documentation spells them ("R1 430R" in
  // reference/pultec/values.md): dividing them by 1000 would produce ".43K",
  // which no schematic writes and which reconciles as a value delta against a
  // board built from that documentation.
  if (ohms < 1000) return `${decimal(ohms)}R`
  return ohms < 1e6 ? `${decimal(ohms / 1000)}K` : `${decimal(ohms / 1e6)}M`
}

const MIN_HENRIES = 1e-6
const MAX_HENRIES = 100

/**
 * Inductance as a netlist spells it.
 *
 * The boundary is one henry rather than the capacitance formatter's decade
 * split, because every Pultec value is between 100mH and 2H and a single
 * boundary there keeps both spellings free of a leading decimal point: 0.45H
 * would render as ".45H" through `decimal`, which strips the leading zero.
 */
function inductanceText(henries: number, id: string): string {
  if (!Number.isFinite(henries) || henries < MIN_HENRIES || henries > MAX_HENRIES) {
    throw new Error(
      `inductance ${henries}H on "${id}" is outside the range this formatter has been proven ` +
        "over (1uH to 100H). Extend lib/kicad/value-notation.ts with a test rather than " +
        "letting it guess a spelling.",
    )
  }
  return henries < 1 ? `${decimal(henries * 1000)}mH` : `${decimal(henries)}H`
}

/** "Connector_Generic:Conn_01x05" -> "Conn_01x05". */
function symbolPartName(symbol: string): string {
  const colon = symbol.indexOf(":")
  return colon === -1 ? symbol : symbol.slice(colon + 1)
}

/**
 * Whether a component's parameters carry a numeric electrical quantity.
 *
 * This replaces a hardcoded list of kinds that had no formatter. A list has to
 * be edited whenever a kind gains a quantity, and the failure mode of
 * forgetting is silent: the part's IDENTITY goes into the field meant to hold
 * its VALUE - an inductor's part number where its inductance belongs.
 *
 * THE LIST IT REPLACED HAD ONE ENTRY LEFT - `inductor` - and this branch adds
 * the inductance formatter that empties it. An empty set kept for future kinds
 * is the stub this project deletes rather than leaves, so the rule below takes
 * its place and asks the parameters directly.
 *
 * ITS REACH IS TOP-LEVEL NUMBERS, and no further. A quantity represented
 * structurally - a tuple, or an object like `taper` - is invisible to it and
 * would fall through to the mpn branch exactly as a forgotten list entry did.
 * That covers every kind in `lib/model/parameters.ts` today, which is why it is
 * worth having; it is not a general guarantee, and a kind that carries a
 * structured quantity needs a branch here rather than trusting this.
 *
 * A switch is the case that shows the shape is right: `positions` and
 * `contacts` are topology, not quantities, so a switch has no value to derive
 * and its identity is legitimately what the value field holds.
 */
function hasNumericQuantity(component: Component): boolean {
  return Object.values(component.parameters).some((value) => typeof value === "number")
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
  if (component.kind === "resistor" || component.kind === "potentiometer") {
    const ohms: unknown = Reflect.get(component.parameters, "ohms")
    if (typeof ohms !== "number") {
      throw new Error(`${component.kind} "${component.id}" has no numeric ohms parameter`)
    }
    return resistanceText(ohms, component.id)
  }
  if (component.kind === "inductor") {
    const henries: unknown = Reflect.get(component.parameters, "henries")
    if (typeof henries !== "number") {
      throw new Error(`inductor "${component.id}" has no numeric henries parameter`)
    }
    return inductanceText(henries, component.id)
  }
  if (hasNumericQuantity(component)) {
    throw new Error(
      `component "${component.id}" (kind "${component.kind}") carries a numeric electrical ` +
        "parameter this formatter does not handle, so its value cannot come from an mpn or " +
        "symbol fallback either - that would silently swap the part's identity in for its " +
        "electrical value. Add a formatter for this kind, proven with a test, before lowering " +
        "it to a netlist.",
    )
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
