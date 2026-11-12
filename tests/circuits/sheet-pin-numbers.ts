/**
 * Canonical pin name -> KiCad pin number for one component of a committed Pultec page, by a declared
 * table or a refusal. Split out of `./sheet-model.ts` (which was over the 500-line limit; H7 module
 * plan, final review M9) without a change in behaviour; `./sheet-model.ts` applies a board's declared
 * per-component maps on top of these rules.
 */
import { POLE_PIN, rotaryPadOrder, SPDT_PINS, THROW_PINS, TOGGLE_SYMBOL } from "../../circuits/pultec/physical/parts.ts"
import type { Component, ComponentKind } from "../../lib/model/types.ts"

/**
 * Kinds whose canonical pin vocabulary IS the symbol's pins 1..n, in the order written here.
 *
 * **IT WAS `lib/schgen/rules/symbols.ts`'s POSITIONAL RULE** - that file is deleted with the
 * generator - **narrowed to the four kinds the five committed pages carry and with each kind's
 * vocabulary spelled out rather than read from
 * `lib/model/kinds.ts`.** That rule's `POSITIONAL_KINDS` also covered `photoresistor`, which no
 * Pultec board has; a kind absent here REFUSES, and widening the table is a deliberate edit.
 * Spelling the order out is the point of the entry - `potentiometer` is `ccw, wiper, cw` and
 * `Device:R_Potentiometer` numbers its lugs in exactly that order, which is a claim about the
 * symbol and not about the kind.
 *
 * **WHAT CHECKS IT IS THE NETLIST COMPARISON, which could have failed.** Every one of these pins
 * is on a net in the committed export of the page, under the number this table assigns it; a
 * wrong number here moves a pin to a net the drawing does not put it on, and
 * `compareSheetToModel`'s `netMembership` reports the pair. The five board guards run that
 * comparison and assert it is empty.
 */
const POSITIONAL_PINS: Partial<Readonly<Record<ComponentKind, readonly string[]>>> = {
  resistor: ["a", "b"],
  capacitor: ["a", "b"],
  inductor: ["a", "b"],
  potentiometer: ["ccw", "wiper", "cw"],
}

/** The canonical pin names of a single-unit part's sole unit, refusing rather than picking one. */
export function soleUnitPinNames(component: Component): readonly string[] {
  if (Object.keys(component.pins).length > 0) {
    throw new Error(
      `component "${component.id}" carries package pins [${Object.keys(component.pins).join(", ")}] ` +
        "and no rule here numbers them. No component of the five Pultec section boards has any - " +
        "every pin of every one of them is on its single unit - so a rule for them would be " +
        "written against nothing and checked by nothing. Add one, with the symbol pin numbers " +
        "read off the installed library and a test beside it, when a board needs it.",
    )
  }
  const unit = component.units[0]
  if (unit === undefined || component.units.length !== 1) {
    throw new Error(
      `component "${component.id}" has ${component.units.length} units, and the pin-number map ` +
        "compareSheetToModel takes is keyed by CANONICAL PIN NAME, so it cannot address two " +
        "units that name a pin the same way. A multi-unit part needs that map re-keyed by unit " +
        "before it can be compared; nothing is guessed, because a dual part's second section " +
        "silently taking the first's pin numbers is a wrong drawing that looks right.",
    )
  }
  return Object.keys(unit.pins)
}

/**
 * A rotary selector's pin numbers, plus the detents its circuit does not reach.
 *
 * **IT IS `switchOverride`'s DERIVATION IN `circuits/pultec/schematic/section-board.ts`, READING
 * THE SAME THREE TABLES**, and its refusals are the same refusals: a symbol with no recorded pole
 * or no recorded throws refuses by name rather than assuming pin 1 is the common, which is false
 * of both rotary symbols this circuit uses.
 *
 * **A DETENT THE CIRCUIT DOES NOT WIRE IS ENTERED UNDER ITS OWN PIN NUMBER AS ITS KEY**, which is
 * how `compareSheetToModel` is told about a declared no-connect: a number in the map that no
 * model pin claims becomes a one-member set in the model's partition, exactly as `kicad-cli`
 * exports `unconnected-(SW1-Pad12)` for `pultec-mid`'s unused twelfth position. The key is the
 * number because `ComponentOverride.ncPins` - the declaration this replaces - is keyed by number
 * too, and because a canonical name for a pin the circuit never names would be an invention.
 *
 * **AND `MP` IS DELIBERATELY ABSENT.** The four six-way selectors are drawn with
 * `Switch:SW_Rotary_1x6_MP`, whose mechanical mount lug is on no net in the model;
 * `lib/kicad/sheet-agreement.ts`'s own `MECHANICAL_PINS` table is what accounts for it, and its
 * absence from the model's pin numbering is the `pinIdentity` finding those four pages carry.
 * Putting it here would silence that finding rather than resolve it.
 */
function rotaryPinNumbers(component: Component, symbol: string): ReadonlyMap<string, string> {
  const pole = POLE_PIN[symbol]
  if (pole === undefined) {
    throw new Error(
      `no pole pin is recorded for the selector symbol "${symbol}" (component ` +
        `"${component.id}"). POLE_PIN in circuits/pultec/physical/parts.ts holds the two rotary ` +
        "symbols this circuit uses, each read off the installed Switch.kicad_sym. Add this " +
        "symbol with its pole pin read off the library the same way - do not assume pin 1, " +
        "which is a THROW in both symbols already recorded.",
    )
  }
  const detents = THROW_PINS[symbol]
  if (detents === undefined) {
    throw new Error(
      `no throw pins are recorded for the selector symbol "${symbol}" (component ` +
        `"${component.id}"). THROW_PINS in circuits/pultec/physical/parts.ts holds each rotary ` +
        "symbol's throw pins in detent order, read off the installed Switch.kicad_sym beside " +
        "POLE_PIN. Add this symbol the same way - do not assume the throws are pins 1..n, which " +
        "is true of the two symbols recorded there and is a fact about them rather than a KiCad " +
        "convention.",
    )
  }
  const [first, ...throws] = rotaryPadOrder(component)
  if (first !== "common") {
    throw new Error(
      `rotaryPadOrder("${component.id}") returned "${String(first)}" first, not "common", so the ` +
        "throws cannot be numbered from it. That function's contract is \"the common first, then " +
        "the throws in detent order\"; fix it in circuits/pultec/physical/parts.ts rather than " +
        "guessing here, because a throw numbered one position out is a wrong connection in a " +
        "drawing that looks right.",
    )
  }
  if (throws.length > detents.length) {
    throw new Error(
      `the selector "${component.id}" has ${throws.length} throws and ${symbol} draws only ` +
        `${detents.length} (THROW_PINS in circuits/pultec/physical/parts.ts), so there is no pin ` +
        "for every position. Either the selector gained a position without its symbol being " +
        "re-chosen, or THROW_PINS is stale against the installed library.",
    )
  }
  const out = new Map<string, string>([["common", pole]])
  throws.forEach((pad, index) => {
    const detent = detents[index]
    if (detent === undefined) throw new Error(`throw ${index} of "${component.id}" has no detent pin, which the length check above should have refused`)
    out.set(pad, detent)
  })
  for (const unused of detents.slice(throws.length)) {
    if (out.has(unused)) {
      throw new Error(
        `the selector "${component.id}" wires a pin named "${unused}", which is also the number ` +
          `of a detent of ${symbol} that this circuit does not reach. The unwired detents are ` +
          "entered under their own pin numbers as keys, so that collision would make one of the " +
          "two silently win. Re-key the unwired detents where this map is built.",
      )
    }
    out.set(unused, unused)
  }
  return out
}

/**
 * Canonical pin name -> KiCad pin number for one component, by a declared table or a refusal.
 *
 * Four cases and nothing else: a rotary selector, the SPDT mode toggle, a `connector` whose own
 * pin names are the symbol's pin numbers, and the positional kinds above. `part.symbolPins` is
 * REFUSED rather than honoured - no component of these five boards declares one, so that path
 * would be written against nothing and checked by nothing.
 */
export function pinNumbersFor(component: Component): ReadonlyMap<string, string> {
  if (component.part?.symbolPins !== undefined) {
    throw new Error(
      `component "${component.id}" declares part.symbolPins, and this builder does not read it. ` +
        "No component of the five Pultec section boards declares one, so honouring it here " +
        "would be an untested path on the one map whose errors are invisible - a wrong pin " +
        "number puts a net on a pin the drawing does not. Read it, with a test beside it, when " +
        "a board declares one.",
    )
  }
  const names = soleUnitPinNames(component)
  if (component.kind === "switch") {
    const symbol = component.part?.symbol
    if (symbol === undefined) {
      throw new Error(
        `the switch "${component.id}" declares no part.symbol, so there is no symbol to map its ` +
          "pins onto. Every off-board Pultec part gets one from symbolFor in " +
          "circuits/pultec/physical/parts.ts; a switch that reaches here without one means that " +
          "function stopped being applied, not that a symbol should be chosen here.",
      )
    }
    if (symbol !== TOGGLE_SYMBOL) return rotaryPinNumbers(component, symbol)
    const declared = Object.keys(SPDT_PINS)
    if (names.length !== declared.length || !names.every((n) => declared.includes(n))) {
      throw new Error(
        `the toggle "${component.id}" is drawn with ${symbol} and its pins are ` +
          `[${names.join(", ")}], where SPDT_PINS in circuits/pultec/physical/parts.ts maps ` +
          `[${declared.join(", ")}]. A partial map is not completed by a rule here: which of a ` +
          "three-pin toggle's terminals is the pole is the whole content of that table.",
      )
    }
    return new Map(Object.entries(SPDT_PINS))
  }
  if (component.kind === "connector") {
    const numeric = /^[1-9][0-9]*$/
    const unnumbered = names.filter((n) => !numeric.test(n))
    if (unnumbered.length > 0) {
      throw new Error(
        `the connector "${component.id}" names pins [${unnumbered.join(", ")}], which are not ` +
          "KiCad pin numbers, and a connector's pins are mapped here by taking the model's own " +
          'names as the symbol\'s numbers - the identity case `kind: "connector"`\'s open pin ' +
          "vocabulary usually is. Nothing is guessed: a connector's pin order is a property of " +
          "the part, and numbering these by position would put wires on whichever pins that " +
          "order happened to produce.",
      )
    }
    return new Map(names.map((n) => [n, n]))
  }
  const vocabulary = POSITIONAL_PINS[component.kind]
  if (vocabulary === undefined) {
    throw new Error(
      `no pin numbering is declared for component "${component.id}" of kind ` +
        `"${component.kind}". POSITIONAL_PINS in tests/circuits/sheet-pin-numbers.ts covers the four ` +
        "kinds the five committed Pultec pages carry, and the selectors and the junction headers " +
        "are handled above. Add this kind with the canonical order its symbol numbers 1..n, " +
        "read off the installed library. It is not defaulted: a pin number guessed from " +
        "iteration order is a wrong connection in a drawing that looks right.",
    )
  }
  if (names.length !== vocabulary.length || !vocabulary.every((n) => names.includes(n))) {
    throw new Error(
      `component "${component.id}" of kind "${component.kind}" has pins [${names.join(", ")}], ` +
        `where POSITIONAL_PINS declares the vocabulary [${vocabulary.join(", ")}]. The ` +
        "positional rule maps a kind's WHOLE vocabulary onto pins 1..n in order, so a component " +
        "carrying some other set of pins cannot be numbered by it - a partial match would " +
        "number the pins it recognised and leave the rest to be reported as missing from the " +
        "map, which is a confusing way to say the model and this table disagree about the kind.",
    )
  }
  return new Map(vocabulary.map((name, index) => [name, String(index + 1)]))
}
