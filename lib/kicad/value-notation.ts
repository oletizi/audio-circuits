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
// The sub-ohm band, spelled in RKM ("0R22"), was added for the h7 module's two damping resistors
// (0.22 ohm, power.md:270; 0.30 ohm, CR-MODULE-VDDA-BANK). Its floor is the smallest value tested.
const MIN_SUB_OHMS = 0.1

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
  // been checked against. The band from 100mR up to 1R is admitted below, in RKM ("0R22"),
  // by CR-MODULE-SUBOHM-RKM; the band between 0 and 100mR stays refused.
  if (ohms === 0) return "0R"
  if (!Number.isFinite(ohms) || ohms < MIN_SUB_OHMS || ohms >= MAX_OHMS_EXCLUSIVE) {
    throw new Error(
      `resistance ${ohms}R on "${id}" is outside the range this formatter has been proven ` +
        "over (100mR up to but not including 10M). Extend lib/kicad/value-notation.ts with a test " +
        "rather than letting it guess a spelling.",
    )
  }
  // BELOW ONE OHM THE SPELLING IS RKM (IEC 60062), "0R22": `decimal` would strip the leading zero
  // and give ".22R", which no vendor writes, and `parseValue` reads "0R22" back as 0.22.
  // Known limitation (H7 module plan, Task 6 review): `.slice(2)` assumes `String` prints the number
  // with a "0." prefix. That holds over the proven range [MIN_SUB_OHMS, 1), where every number prints
  // as "0.xxx"; a value that printed in exponent form would be mangled. Widening MIN_SUB_OHMS below
  // 1e-6 (where exponent form starts) needs this rewritten, with a test.
  if (ohms < MIN_OHMS) return `0R${String(Number(ohms.toPrecision(10))).slice(2)}`
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

/** The symbols a ferrite bead is drawn with; a part on one of them is valued by its impedance. */
const BEAD_SYMBOLS: ReadonlySet<string> = new Set(["Device:FerriteBead", "Device:FerriteBead_Small"])

/**
 * A ferrite bead's value field: its rated impedance at its rating frequency, "220R@100MHz".
 *
 * **WHY NOT HENRIES.** A bead is an `inductor` in the model so a DC walk (the h7 module's 3V3
 * capacitance sum) crosses it, but its datasheet rates it by impedance at a frequency, and any
 * inductance the model carries is an analysis figure (the h7 module's FB_VDDA carries a lower
 * bound), not a part value. Printing it would put a bound on the page as a rating.
 *
 * **THE SPELLING.** No installed KiCad symbol or footprint library carries a bead with an impedance
 * value (the stock `Device:FerriteBead` and `Device:FerriteBead_Small` take their symbol name as
 * Value; searched for "@100MHz" and "Ohm@" across the installed symbols and footprints, no match).
 * So the form is chosen here: the impedance in this module's resistance spelling, then "@" and the
 * frequency in MHz, the way bead datasheets state the rating ("220 ohm at 100 MHz"). Only whole MHz
 * is proven; anything else refuses.
 */
function beadImpedanceText(component: Component): string {
  const rating = component.part?.beadImpedance
  if (rating === undefined) {
    throw new Error(
      `ferrite bead "${component.id}" (symbol ${component.part?.symbol ?? "?"}) has no part.beadImpedance. ` +
        "A bead's value is its rated impedance at a frequency, from its datasheet; it is never drawn " +
        "with henries, so state the rating in its part spec rather than leaving the value to a guess.",
    )
  }
  const mhz = rating.hertz / 1e6
  if (!Number.isInteger(mhz) || mhz <= 0) {
    throw new Error(`ferrite bead "${component.id}": rating frequency ${rating.hertz}Hz is not a whole number of MHz, the only spelling this formatter has been proven over`)
  }
  return `${resistanceText(rating.ohms, component.id)}@${mhz}MHz`
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
 * **WHY IT EXISTS, AND IT HAS NO PRODUCTION CALLER SINCE THE SCHEMATIC GENERATOR WAS DELETED**
 * (Task 9 of `docs/superpowers/plans/2026-10-30-remove-schgen.md`). Its one reader was
 * `lib/schgen/render/field-placement.ts`; today the only caller is
 * `tests/kicad/value-notation.test.ts`. It is kept rather than deleted because the distinction it
 * draws is a property of `valueFor` and of KiCad, not of any placer - the next thing that has to
 * decide whether a `Value` field is worth printing needs exactly this question answered - but
 * **that is a judgement to revisit and not a dependency: nothing breaks if it goes.** The
 * paragraphs below are its original reasoning, in the tense it was written in.
 *
 * `lib/schgen/render/field-placement.ts` refused a block when a unit's
 * Reference AND Value could not both be printed somewhere adjacent to it, and the `Value` of a
 * part with no electrical parameter is whatever `valueFor` fell through to - for
 * `Jumper:Jumper_2_Open` that is the thirteen-character string `Jumper_2_Open`, a text box about
 * seven times wider than the jumper's own body (`docs/known-gaps.md` **G232**). That text repeats
 * the symbol: the glyph already draws a two-pin open jumper, so demanding adjacent room for a
 * second copy of its name is what blocks the drawing, and the value is therefore emitted and
 * marked hidden rather than placed. The owner's question that dissolved three rounds of routing
 * around it - *"has it occurred to you that extremely long labels are pathological?"* - was
 * quoted in the generator's own `hidden-value-fields.test.ts`, deleted with it.
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
 * branch instead would mean a new field on `PartSpec`, and therefore an edit at every site that
 * builds one - `grep -rn "part: {" lib tools tests circuits` counts them.
 *
 * **THE FIGURE THAT STOOD HERE IS DELETED RATHER THAN CORRECTED, AND ITS OWN DISPROOF WAS PRINTED
 * BESIDE IT.** It read *"49 of them across 29 files"* and handed the reader
 * `grep -rn "refPrefix:" lib tools tests circuits | grep -v "readonly refPrefix"` to check it
 * with. That grep returns **this comment and nothing else**: `refPrefix` was a field of `IrPart`,
 * which went with `lib/schgen/ir/`, so the command measured a vocabulary this repository no longer
 * has while the number beside it described a tree that no longer exists. `CLAUDE.md`: a
 * measurement goes in a tool or a test that re-runs it, never in prose - so the command above
 * stands without an answer written next to it.
 *
 * `docs/known-gaps.md` **G257** records the choice, the cost and what would settle it, and
 * `tests/kicad/value-notation.test.ts` asserts the deviation rather than leaving it as prose.
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
  // The beadImpedance refusal comes first, ahead of every early return below: a resistor or a
  // capacitor carrying a rated impedance would otherwise be formatted from its own parameter and the
  // stray rating silently ignored (H7 module plan, Task 6 review). Refuse rather than guess.
  const isBead = component.kind === "inductor" && BEAD_SYMBOLS.has(component.part?.symbol ?? "")
  if (component.part?.beadImpedance !== undefined && !isBead) {
    throw new Error(
      `component "${component.id}" states part.beadImpedance but is not an inductor on ${[...BEAD_SYMBOLS].join(" or ")}; ` +
        "a rated impedance is a ferrite bead's value and nothing else's. Remove it from the part, or " +
        "draw the part as a bead (an inductor on one of those symbols).",
    )
  }
  const stated = component.part?.value
  if (stated !== undefined) {
    if (hasNumericQuantity(component)) {
      throw new Error(
        `component "${component.id}" (kind "${component.kind}") states part.value "${stated}", but its ` +
          "value is derived from its parameters. Two sources for one value field could disagree, so " +
          "part.value is only for a kind that carries no electrical quantity.",
      )
    }
    if (stated.trim() === "") throw new Error(`component "${component.id}" states an empty part.value`)
    return stated
  }
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
  if (isBead) return beadImpedanceText(component)
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
