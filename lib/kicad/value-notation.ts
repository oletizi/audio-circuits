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

/** A capacitance as the netlist spells it ("22pF", ".1uF", "10uF"). `id` names the
 * thing being formatted in the refusal. Exported for the parts list's "Needs" column. */
export function capacitanceText(farads: number, id: string): string {
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

/** A resistance as the netlist spells it ("0R", "22R", "4.7K", "1M"). `id` names the thing
 * being formatted in the refusal. Exported for the parts list's "Needs" column. */
export function resistanceText(ohms: number, id: string): string {
  // EXACTLY ZERO IS A WIRE LINK, and it is admitted as its own case rather than by
  // lowering MIN_OHMS. A stand-in derived at a control's end stop contains ideal shorts
  // as components (see lib/board/scaffold/reduce.ts: "ideal shorts are components, never
  // node merges"), so a section board carries 0R resistors - a jumper, a 0R part, or a
  // length of wire across two pads, all of which every vendor spells "0R". Lowering
  // MIN_OHMS to 0 instead would also admit 0.5R as ".5R", a spelling nothing here has
  // been checked against, so the band between 0 and 1R stays refused.
  if (ohms === 0) return "0R"
  if (!Number.isFinite(ohms) || ohms < MIN_OHMS || ohms >= MAX_OHMS_EXCLUSIVE) {
    throw new Error(
      `resistance ${ohms}R on "${id}" is outside the range this formatter has been proven ` +
        "over (1R up to but not including 10M). Extend lib/kicad/value-notation.ts with a test " +
        "rather than letting it guess a spelling.",
    )
  }
  // Three spellings, one per decade band. Sub-kilohm parts are spelled in ohms,
  // as the reference documentation spells them ("R1 430R" in
  // docs/pultec/values.md): dividing them by 1000 would produce ".43K",
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
 * **WHETHER A PART'S VALUE FIELD IS NOTHING BUT ITS SYMBOL'S OWN PART NAME** - the other half of
 * `valueFor`'s last step, asked by the drawing side.
 *
 * **WHY IT EXISTS.** `lib/schgen/render/field-placement.ts` refuses a block when a unit's
 * Reference AND Value cannot both be printed somewhere adjacent to it, and the `Value` of a part
 * with no electrical parameter is whatever `valueFor` fell through to - for
 * `Jumper:Jumper_2_Open` that is the thirteen-character string `Jumper_2_Open`, a text box about
 * seven times wider than the jumper's own body (`docs/known-gaps.md` **G232**). That text repeats
 * the symbol: the glyph already draws a two-pin open jumper, so demanding adjacent room for a
 * second copy of its name is what blocks the drawing, and the value is therefore emitted and
 * marked hidden rather than placed. The owner's question that dissolved three rounds of routing
 * around it is quoted in `tests/schgen/render/hidden-value-fields.test.ts`.
 *
 * **IT IS DERIVED FROM THE SAME DISTINCTION `valueFor` MAKES AND NOT A SECOND ONE.** That
 * function's steps are: an electrical formatter per kind, then `part.mpn`, then the part name of
 * `part.symbol`. This asks whether the string in hand IS that last step's answer - so it is keyed
 * on the symbol, never on the value's LENGTH, never on a substring like "Jumper", and never on a
 * whitelist of kinds. Any of those three would be a guess where a real distinction exists.
 *
 * **ITS ONE DEVIATION FROM "WHICH BRANCH PRODUCED IT", STATED BECAUSE IT IS REAL.** It reads the
 * VALUE, not the branch, so a genuine `mpn` spelled exactly as the symbol's part name answers
 * true - `mpn: "PT2399"` drawn with `Audio:PT2399` is that case and it is live in this repository.
 * Hiding it loses nothing a reader needs, because the field is a verbatim repeat of the symbol
 * name either way; what it costs is that the two cases cannot be told apart here. Carrying the
 * branch instead would mean a new field on `PartSpec` and `IrPart`, and therefore an edit at every
 * site that builds one - **49 of them across 29 files** (`grep -rn "refPrefix:" lib tools tests
 * circuits | grep -v "readonly refPrefix"`). `docs/known-gaps.md` **G257** records the choice, the
 * cost and what would settle it, and `tests/kicad/value-notation.test.ts` asserts the deviation
 * rather than leaving it as prose.
 *
 * `symbol` is the RESOLVED lib id the part is drawn with - the same thing `from-network.ts`'s
 * `valueOf` hands `valueFor`, so the two see one symbol and cannot disagree.
 */
export function valueIsSymbolPartName(symbol: string, value: string): boolean {
  return value === symbolPartName(symbol)
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
  // `photoresistor` was added by Task 9 of the M1 schematic-authoring plan, which is the first
  // consumer to ask: `circuits/optical-compressor/` holds the one photoresistor in the repository
  // and `circuitSpecFrom` needs a value field for it. This is the deliberate one-line extension
  // with a test beside it that the refusal below asks for, and it is NOT a silent widening.
  //
  // **WHAT THE NUMBER MEANS IS NARROWER THAN "THE PART'S VALUE", AND THAT LIMIT IS REAL.**
  // `parameters.ohms` on that part is annotated *"1 MOhm is the section 6.2 DARK endpoint"* - one
  // operating point of a part whose whole function is that its resistance moves - so the field
  // will read "1M" where a hand-drawn sheet would more likely carry the vactrol's part number.
  // The model has no mpn for it (spec section 9 names no part), so there is nothing truer to put
  // there; `docs/known-gaps.md` **G157** records the gap and its criterion.
  if (component.kind === "resistor" || component.kind === "potentiometer" || component.kind === "photoresistor") {
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
