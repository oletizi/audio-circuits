/**
 * WHICH KiCad SYMBOL A KIND IS DRAWN WITH, AND HOW ITS CANONICAL PINS LINE UP WITH THAT SYMBOL'S
 * PIN NUMBERS.
 *
 * Hand-written for Task 9 of the M1 schematic-authoring plan. Spec §5.4 asks whether a passive's
 * symbol is declared per part or derived from its kind and says §1.5's authority order does not
 * settle it; `docs/known-gaps.md` **G99** measured the cost of leaving it unanswered (*"low - a
 * fixed per-kind map sufficed"*, which is the one invention of the five it calls cheap). The
 * answer here is the one `lib/model/kinds.ts` already gives for pin vocabulary: **by kind, with a
 * per-component override that carries its reason.**
 *
 * **THIS IS A WHITELIST THAT REFUSES LOUDLY, NOT A GENERAL RULE THAT ACCEPTS A GUESS**
 * (`CLAUDE.md`). Four kinds are in it, and each one is in it because the symbol claims exactly
 * what the MODEL claims and no more:
 *
 * | kind | symbol | why the kind alone settles it |
 * | --- | --- | --- |
 * | `resistor` | `Device:R` | a resistor is a resistor |
 * | `capacitor` | `Device:C` | **polarity is not in this model.** `CapacitorParameters` is `{ farads }` and nothing else, so `Device:C` - the non-polarised glyph - claims exactly what the model does. A polarised part is a PART fact and says so itself, as `circuits/transistor-preamp/parts.ts`'s `electrolytic()` does with `Device:C_Polarized` |
 * | `photoresistor` | `Device:R_Photo` | likewise |
 * | `diode` | `Device:D` | a plain diode. **An LED or a Schottky is a part fact the model has no slot for**, so it reaches the drawing through an override with its reason, not through a rule that reads a part number out of a kind |
 *
 * **EVERY LIB ID ABOVE WAS RESOLVED AGAINST THE LIBRARIES ON DISK BEFORE IT WAS WRITTEN HERE**,
 * through `createResolver(symbolLibraries(...))`, which is the same path `tools/schgen/symbol-census.ts`
 * uses. `CLAUDE.md`: *"A KiCad footprint name is checkable - the libraries are on disk. Do not
 * write one from memory; this repository has twice shipped a footprint that does not exist."*
 * `tests/schgen/rules/symbols.test.ts` resolves all four on every run, so the claim cannot rot.
 * **Three of the four are pinned by nothing** - only `Device:R` is in `VENDORED_SYMBOLS` - so a
 * drawing using them is a function of the installed KiCad; that is G118's finding widened, and it
 * is recorded rather than quietly accepted.
 *
 * **EVERY OTHER KIND REFUSES, each with the reason the kind cannot answer.** An empty whitelist
 * that refuses loudly beats a general rule that quietly accepts a guess, and the kinds left out
 * are left out because a symbol choice for them is a claim about a PART: which package an op-amp
 * is in, how many ways a connector has, whether a transistor is NPN or PNP, whether a pot is a
 * panel control or a board trimmer.
 */

import { hasOpenVocabulary, unitPins } from "../../model/kinds.ts"
import { headOf } from "../render/sexpr-write.ts"
import type { ComponentKind, Parameters } from "../../model/types.ts"
import type { LibSymbol } from "../render/library.ts"

/** Per kind, the reviewed symbol. Circuit-independent, and reviewed before any artifact exists. */
const SYMBOL_BY_KIND: Partial<Readonly<Record<ComponentKind, string>>> = {
  resistor: "Device:R",
  capacitor: "Device:C",
  photoresistor: "Device:R_Photo",
  diode: "Device:D",
}

/** Why each kind NOT in the whitelist is not in it. A refusal that only says "no" teaches nothing. */
const NO_RULE_BECAUSE: Readonly<Record<string, string>> = {
  inductor:
    "an inductor's symbol depends on its core (Device:L, Device:L_Core_Ferrite, Device:L_Iron) " +
    "and `InductorParameters` carries henries and taps, neither of which says which. The Pultec " +
    "inductors are the circuits that will need this; add the entry with a test beside it rather " +
    "than widening it silently.",
  bjt:
    "NPN and PNP are drawn with different symbols and `Component` has no slot that distinguishes " +
    "them - `kind: \"bjt\"` covers both. Declare `part.symbol` on the component (as " +
    "`circuits/transistor-preamp/parts.ts` does with Transistor_BJT:2N3904) or override it.",
  potentiometer:
    "Device:R_Potentiometer and Device:R_Potentiometer_Trim are the panel control and the board " +
    "trimmer, and `PotentiometerParameters` (ohms, taper) does not say which one is fitted. That " +
    "is a part fact; declare it on the part.",
  opamp:
    "an op-amp symbol is a PACKAGE: Amplifier_Operational:TL072 is a dual with a separate power " +
    "unit, and a single or a quad has a different unit count, so the symbol decides how many " +
    "units get placed. The kind cannot know the package.",
  switch:
    "`kind: \"switch\"` spans a jumper shunt, an SPST, a rotary selector and a switching jack, " +
    "with pin counts from two upwards, and `SwitchParameters` describes contacts rather than a " +
    "drawn part. Declare the symbol on the part (Jumper:Jumper_2_Open for a two-pin shunt).",
  ic:
    "an IC's symbol IS its part number. There is nothing for a rule to derive from.",
  connector:
    "a connector's symbol carries its way count (Connector_Generic:Conn_01x02 through _01x05, " +
    "Connector:TestPoint for a probe pad), and the way count is a property of the part. Note " +
    "that the model's own pin COUNT is not taken as evidence here: a five-entry pin record is " +
    "equally a 1x05 header, one row of a 2x05 field, or a jack with a switching contact.",
}

/**
 * The reviewed symbol for `kind`, or a refusal naming what the kind could not answer.
 *
 * `parameters` is read only by the refusal, and that is deliberate rather than an oversight:
 * nothing in `lib/model/parameters.ts` discriminates a symbol - not capacitor polarity, not an
 * inductor's core, not a pot's body, not a transistor's polarity - so a rule that consulted them
 * would be reading a part fact out of an electrical quantity. The refusal prints them so a reader
 * can see exactly what WAS known at the call site.
 */
export function symbolForKind(kind: ComponentKind, parameters: Parameters): string {
  const symbol = SYMBOL_BY_KIND[kind]
  if (symbol !== undefined) return symbol
  throw new Error(noSymbolRefusal(kind, parameters, null))
}

/**
 * The refusal text for a kind with no rule, with `what` naming the component when the caller
 * knows it.
 *
 * **WHY A SEPARATE FUNCTION RATHER THAN A `catch` THAT ADDS THE NAME.** A perturbation found this:
 * adding a `switch` to a fixture produced a refusal that named the kind, the parameters and the
 * reason, and NOT the component - so a reader of a 37-part circuit was told that "a switch" had no
 * symbol and had to go and find which one. `symbolForKind`'s signature is fixed by Task 9's brief
 * and takes no name, so the text is built here and both callers use it: `symbolForKind` with no
 * name, and `symbolChoiceFor` in `../from-network.ts` with the component's id. Enriching a caught
 * message instead would make a refusal's wording part of a control path.
 */
export function noSymbolRefusal(kind: ComponentKind, parameters: Parameters, what: string | null): string {
  const because = NO_RULE_BECAUSE[kind]
  if (because === undefined) {
    return (
      `no symbol rule for kind "${kind}", and no reason is recorded for its absence either. ` +
      "Every kind outside SYMBOL_BY_KIND needs an entry in NO_RULE_BECAUSE in " +
      "lib/schgen/rules/symbols.ts saying what the kind cannot answer; " +
      "tests/schgen/rules/symbols.test.ts sweeps ALL_KINDS and requires one or the other."
    )
  }
  const subject = what === null ? `kind "${kind}"` : `${what} (kind "${kind}")`
  return (
    `no symbol is derived for ${subject} (parameters: ${JSON.stringify(parameters)}): ` +
    `${because} Nothing is guessed: declare \`part.symbol\` on the component, or declare a ` +
    "`symbol` override with a non-blank `why` in this circuit's schematic authoring file. " +
    `Kinds with a rule: ${Object.keys(SYMBOL_BY_KIND).join(", ")}.`
  )
}

/** True when `symbolForKind` answers for `kind`, without using a refusal as a predicate. */
export function kindStatesItsSymbol(kind: ComponentKind): boolean {
  return SYMBOL_BY_KIND[kind] !== undefined
}

/**
 * Per kind, the symbol pin NAME each canonical pin is. Read out of the library, not remembered:
 * `Transistor_BJT:2N3904` names its pins E, B, C at numbers 1, 2, 3, and `Device:D`,
 * `Device:D_Schottky` and `Device:LED` all name theirs K and A at numbers 1 and 2.
 *
 * **AN OP-AMP'S UNIT PINS ARE DELIBERATELY ABSENT.** `Amplifier_Operational:TL072` names its
 * inputs "-" and "+" and its OUTPUT "" - the empty string - so matching an output by name would
 * have to match the one pin whose name is empty, which is also how every pin of `Device:R` is
 * named. The package pins V+ and V- are unambiguous and are here; a unit's in+/in-/out come from
 * a declared `symbolPins` map, which `circuits/opamp-buffer.ts` already carries.
 */
const PIN_NAME_ALIASES: Partial<Readonly<Record<ComponentKind, Readonly<Record<string, string>>>>> = {
  diode: { anode: "A", cathode: "K" },
  bjt: { base: "B", collector: "C", emitter: "E" },
  opamp: { "v+": "V+", "v-": "V-" },
}

/**
 * Kinds whose canonical vocabulary maps onto pin numbers 1..n IN ORDER.
 *
 * Stated per kind rather than as a general rule, because the general rule is WRONG for `bjt`:
 * `unitPins("bjt")` is base, collector, emitter and `Transistor_BJT:2N3904`'s pins 1, 2, 3 are
 * E, B, C, so a positional map would silently swap two terminals of every transistor. `bjt` is
 * resolved by pin NAME above instead, which the library states.
 *
 * The two circuits that already write this mapping down agree with it and are where it comes
 * from: `PIN_NUMBERS` in `circuits/pt2399-core/pt2399-core.ts` (resistor and capacitor a:1 b:2)
 * and in `circuits/transistor-preamp/parts.ts` (the same, plus potentiometer ccw:1 wiper:2 cw:3,
 * annotated *"Device:R_Potentiometer_Trim and the Runtron RM-065 footprint both put the wiper on
 * pin 2"*).
 */
const POSITIONAL_KINDS: readonly ComponentKind[] = [
  "resistor",
  "capacitor",
  "inductor",
  "photoresistor",
  "potentiometer",
]

export interface PinNumberRequest {
  readonly kind: ComponentKind
  readonly symbol: LibSymbol
  /** The canonical pin names to resolve, exactly as the model names them. */
  readonly names: readonly string[]
  /** What a refusal names, e.g. `audio_signal_opamp unit A`. */
  readonly what: string
}

function identityMap(r: PinNumberRequest): ReadonlyMap<string, string> | null {
  const numbers = new Set(r.symbol.pins.map((p) => p.number))
  if (r.names.length === 0 || !r.names.every((n) => numbers.has(n))) return null
  return new Map(r.names.map((n) => [n, n]))
}

function aliasMap(r: PinNumberRequest): ReadonlyMap<string, string> | null {
  const aliases = PIN_NAME_ALIASES[r.kind]
  if (aliases === undefined || r.names.length === 0) return null
  const out = new Map<string, string>()
  for (const name of r.names) {
    const wanted = aliases[name]
    if (wanted === undefined) return null
    const hits = r.symbol.pins.filter((p) => p.name === wanted)
    const only = hits.length === 1 ? hits[0] : undefined
    if (only === undefined) return null
    out.set(name, only.number)
  }
  return out
}

function positionalMap(r: PinNumberRequest): ReadonlyMap<string, string> | null {
  if (!POSITIONAL_KINDS.includes(r.kind)) return null
  const vocabulary = unitPins(r.kind)
  if (vocabulary.length !== r.names.length) return null
  if (!vocabulary.every((n) => r.names.includes(n))) return null
  const expected = vocabulary.map((_n, i) => String(i + 1))
  const actual = r.symbol.pins.map((p) => p.number)
  if (actual.length !== expected.length || !expected.every((n, i) => actual[i] === n)) return null
  return new Map(vocabulary.map((n, i) => [n, String(i + 1)]))
}

/**
 * Canonical pin name -> KiCad pin number, by a reviewed rule, or a refusal naming everything a
 * reader needs to write the `symbolPins` map by hand.
 *
 * Three rules, tried in order, every one of them a whitelist:
 *
 * 1. **identity** - the model's own pin names ARE pin numbers of the symbol. This is the
 *    open-vocabulary case (`ic`, `connector`, `switch`): `pt2399-core`'s PT2399 names its pins
 *    "1".."16" and `Audio:PT2399` numbers them 1..16, so there is nothing to map;
 * 2. **by symbol pin name** - `PIN_NAME_ALIASES` above, which the library itself states;
 * 3. **positional** - `POSITIONAL_KINDS` above, and only when the symbol's pins are exactly
 *    1..n in order, so a symbol numbered any other way refuses rather than being renumbered.
 *
 * A MULTI-UNIT symbol's unit pins never reach here: `from-network.ts` requires a declared
 * `symbolPins` map for those, because which model unit is which symbol unit is a claim no rule
 * can make from the model (a model listing its sections ["B", "A"] is legal).
 */
export function canonicalPinNumbers(r: PinNumberRequest): ReadonlyMap<string, string> {
  const resolved = identityMap(r) ?? aliasMap(r) ?? positionalMap(r)
  if (resolved !== null) return resolved
  const pins = r.symbol.pins.map((p) => `${p.number}${p.name === "" ? "" : `:${p.name}`}`).join(" ")
  throw new Error(
    `${r.what}: no reviewed rule maps the pins [${r.names.join(", ")}] of a "${r.kind}" onto ` +
      `${r.symbol.libId}, whose pins are [${pins}]. Tried: the model's names as pin numbers ` +
      `(the ${hasOpenVocabulary(r.kind) ? "usual" : "not applicable"} case for this kind), the ` +
      "symbol's own pin names through PIN_NAME_ALIASES, and position against the kind's " +
      "vocabulary for POSITIONAL_KINDS - all in lib/schgen/rules/symbols.ts. Nothing is " +
      "guessed, because a wrong pin number is electrically wrong in a drawing that looks " +
      "right. Declare `part.symbolPins` on the component, or a `symbolPins` override with a " +
      "non-blank `why` in this circuit's schematic authoring file.",
  )
}

/**
 * The reference prefix a symbol declares for itself, from its `Reference` property.
 *
 * Read out of the library rather than tabulated here, which makes a declared designator
 * CHECKABLE: `Device:R_Potentiometer_Trim` says "RV", `Connector:TestPoint` says "TP",
 * `Jumper:Jumper_2_Open` says "JP", and a designator declared as "R5" on a trim-pot disagrees
 * with the symbol KiCad would annotate. `tests/schgen/authoring-complete.test.ts` holds every
 * part of the four parity circuits to it.
 */
export function symbolRefPrefix(symbol: LibSymbol): string {
  for (const item of symbol.node.items) {
    if (item.kind !== "list" || headOf(item) !== "property") continue
    const key = item.items[1]
    const value = item.items[2]
    if (key === undefined || key.kind !== "atom" || key.text !== "Reference") continue
    if (value === undefined || value.kind !== "atom") continue
    const prefix = value.text.replace(/\?+$/, "")
    if (prefix === "") break
    return prefix
  }
  throw new Error(
    `${symbol.libId} declares no usable "Reference" property, so there is no reference prefix to ` +
      "check a declared designator against. Every KiCad library symbol carries one; a symbol " +
      "without it is either malformed or not a placeable symbol.",
  )
}
