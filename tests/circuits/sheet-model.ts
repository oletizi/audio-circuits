/**
 * **THE THREE ARGUMENTS `compareSheetToModel` NEEDS FOR ONE DRAFTED PULTEC PAGE, built without
 * reaching into `lib/schgen/` or `tools/schgen/` at all.**
 *
 * `tests/circuits/drafted-sheet.ts`'s `modelUnderTest` builds the same facts by running the
 * schematic generator's front half - `circuitSpecFrom`, `buildCircuit`, `annotate` - and that
 * whole path is deleted. What a model-versus-drawing comparison actually needs out of it is three
 * things, and none of them needs a generator: the board's `Network`, the KiCad reference each
 * component carries on the approved page, and the KiCad pin number each canonical pin sits on.
 * This module produces those three, from the board's own circuit module and from the pin tables
 * `circuits/pultec/physical/parts.ts` declares.
 *
 * **`tests/circuits/guard-equivalence.test.ts` IS WHAT SAYS IT IS THE SAME COMPARISON**, element
 * for element on all six of `SheetAgreement`'s lists across all five approved pages, against the
 * generator-backed path while both exist. Nothing here may be trusted on the strength of its
 * reasoning; that test is the measurement.
 *
 * ---
 *
 * **WHY THE DESIGNATORS ARE DERIVED BY A RULE AND NOT TRANSCRIBED, which is the one surprise in
 * this file.** `circuits/pultec/designators.ts`'s `pultecDesignator` is NOT the designator a
 * drafted page carries: it answers `SW_HI_CUT`, and the page - and its committed netlist export -
 * says `SW1`. The pages were annotated by `lib/schgen/lock/annotate.ts` from an EMPTY references
 * lock with nothing pinned, which assigns every part `<refPrefix><n>` in the circuit's part
 * order, counting per prefix from 1. Three facts make that reproducible here:
 *
 * | the generator's fact | where it comes from |
 * | --- | --- |
 * | part order | `schematicParts` is `network.components.map(...)`, so a part's order is its index in the network |
 * | the part's label | `SchematicAuthoring.designators`, which for these five boards is `pultecDesignator` applied to the component id |
 * | the part's `refPrefix` | `from-network.ts`'s `refPrefixOf`, the leading capitals of that label (`^[A-Z]+`) |
 *
 * So `C2a2` labels `C2A2`, prefixes `C`, and takes whichever `C<n>` its position in the network
 * earns it; `SI_HI_BOOST_RV_HI_BOOST.ccw-wiper` prefixes `SI` and becomes an `SI<n>`, which is
 * why the committed exports carry `SI1`..`SI6` for parts whose symbol is an ordinary `Device:R`.
 * **The rule is NOT read off the sheet being compared**: a designator map derived from the
 * netlist under test would make `componentIdentity` vacuous, which is the one list whose whole
 * job is to notice a part on one side and not the other.
 */

import fs from "node:fs"
import path from "node:path"
import { pultecDesignator } from "../../circuits/pultec/designators.ts"
import { pultecHiBoost } from "../../circuits/pultec/physical/hi-boost.ts"
import { pultecHiCut } from "../../circuits/pultec/physical/hi-cut.ts"
import { pultecLowBoost } from "../../circuits/pultec/physical/low-boost.ts"
import { pultecLowCut } from "../../circuits/pultec/physical/low-cut.ts"
import { pultecMid } from "../../circuits/pultec/physical/mid.ts"
import { POLE_PIN, rotaryPadOrder, SPDT_PINS, THROW_PINS, TOGGLE_SYMBOL } from "../../circuits/pultec/physical/parts.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import type { Component, ComponentKind, Network } from "../../lib/model/types.ts"

/** Everything `compareSheetToModel` takes besides the netlist export itself. */
export interface SheetModel {
  readonly network: Network
  /** Component id -> the KiCad reference the approved page carries for it. */
  readonly designators: ReadonlyMap<string, string>
  /** Component id -> (canonical pin name -> KiCad pin number). */
  readonly pinNumbers: ReadonlyMap<string, ReadonlyMap<string, string>>
}

/** One board whose `"sch"` is an approved page under `drafted/pultec/`. */
interface DraftedBoard {
  readonly board: string
  /** The circuit module, repository-relative, checked against the board's own manifest. */
  readonly module: string
  /** The exported builder's name, checked against the board's own manifest. */
  readonly exportName: string
  readonly build: () => Network
}

/**
 * The five boards, their builders, and the two claims about each that `declaredBoard` checks.
 *
 * **A STATIC TABLE, VERIFIED AGAINST `boards/<board>/perfboard.json` ON EVERY CALL.** The board's
 * own manifest is the authority for which circuit it is - `tools/schgen/board-sheets.ts` states
 * why, and a directory name says nothing about which TypeScript builds it - but a test file
 * cannot import a path it reads at run time without a dynamic import, and a dynamic import would
 * make a wrong path a timing failure rather than a named one. So the binding is written down and
 * CHECKED: the manifest's `circuit` and `export` must be the module and builder named here, or
 * the call refuses. A board re-pointed at another circuit fails loudly instead of being compared
 * against a model that is no longer its own.
 */
const BOARDS: readonly DraftedBoard[] = [
  { board: "pultec-hi-boost", module: "circuits/pultec/physical/hi-boost.ts", exportName: "pultecHiBoost", build: pultecHiBoost },
  { board: "pultec-hi-cut", module: "circuits/pultec/physical/hi-cut.ts", exportName: "pultecHiCut", build: pultecHiCut },
  { board: "pultec-low-boost", module: "circuits/pultec/physical/low-boost.ts", exportName: "pultecLowBoost", build: pultecLowBoost },
  { board: "pultec-low-cut", module: "circuits/pultec/physical/low-cut.ts", exportName: "pultecLowCut", build: pultecLowCut },
  { board: "pultec-mid", module: "circuits/pultec/physical/mid.ts", exportName: "pultecMid", build: pultecMid },
]

function manifestString(record: Record<string, unknown>, key: string, file: string): string {
  const value = record[key]
  if (typeof value !== "string") {
    throw new Error(`${file} must carry a string "${key}" field; it has ${JSON.stringify(record[key])}`)
  }
  return value
}

/** The board's entry, after checking the board's own manifest still names this circuit. */
function declaredBoard(board: string): DraftedBoard {
  const entry = BOARDS.find((b) => b.board === board)
  if (entry === undefined) {
    throw new Error(
      `no drafted-page model is declared for the board "${board}". The five boards with an ` +
        `approved page under drafted/pultec/ are [${BOARDS.map((b) => b.board).join(", ")}], and ` +
        "each is written down in BOARDS in tests/circuits/sheet-model.ts with its circuit " +
        "module and builder. It is not derived from the name: a board directory says nothing " +
        "about which TypeScript builds it, and guessing would compare a page against whichever " +
        "circuit happened to match.",
    )
  }
  const boardDir = path.join(moduleRepoRoot(), "boards", board)
  const file = path.join(boardDir, "perfboard.json")
  const json: unknown = JSON.parse(fs.readFileSync(file, "utf8"))
  if (typeof json !== "object" || json === null) throw new Error(`${file} is not a JSON object`)
  const record = json as Record<string, unknown>
  const declaredModule = path.relative(moduleRepoRoot(), path.resolve(boardDir, manifestString(record, "circuit", file)))
  const declaredExport = manifestString(record, "export", file)
  if (declaredModule !== entry.module || declaredExport !== entry.exportName) {
    throw new Error(
      `${file} says board "${board}" is built by ${declaredExport}() in ${declaredModule}, and ` +
        `BOARDS in tests/circuits/sheet-model.ts imports ${entry.exportName}() from ` +
        `${entry.module}. The manifest is the authority for which circuit a board is, so this ` +
        "table is stale: point it at the module the manifest names. It is not followed " +
        "automatically, because comparing the approved page against a circuit it was not drawn " +
        "from would report the whole board as a disagreement and tell nobody why.",
    )
  }
  return entry
}

/**
 * Kinds whose canonical pin vocabulary IS the symbol's pins 1..n, in the order written here.
 *
 * **IT IS `lib/schgen/rules/symbols.ts`'s POSITIONAL RULE, narrowed to the four kinds the five
 * approved pages carry and with each kind's vocabulary spelled out rather than read from
 * `lib/model/kinds.ts`.** That file's `POSITIONAL_KINDS` also covers `photoresistor`, which no
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
function soleUnitPinNames(component: Component): readonly string[] {
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
        `"${component.kind}". POSITIONAL_PINS in tests/circuits/sheet-model.ts covers the four ` +
        "kinds the five approved Pultec pages carry, and the selectors and the junction headers " +
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

/**
 * **PER BOARD, PER COMPONENT, A PIN MAP THE APPROVED PAGE DECLARES AND NO RULE DERIVES.** It
 * REPLACES the rule's answer for that one component on that one board, and nothing else.
 *
 * **ONE ENTRY, AND IT IS A FACT ABOUT A DRAWING THE OWNER LOOKED AT.** `R2` on `pultec-low-boost`
 * is drawn with its output end on the right, and the rule above puts it on the left. The owner,
 * 2026-10-27, on the generated sheet: *"what is odd is R1, which has an unnecessary hairpin to
 * the out label. And the out label is oddly far away. you could easily rotate R1 to get rid of
 * the hairpin."* `R2` carries net `out` on canonical pin `a`, which maps positionally to pin 1,
 * and the generator's `signalAxis` put the lower-numbered pin on the LEFT by what its own comment
 * calls *"an arbitrary stable choice rather than dressed up as semantics"* - so the OUTPUT end
 * sat away from the `out` label and the wire doubled back over itself, measured as 2 grid cells
 * back before 49 forward. Swapping which pin number carries `a` and `b` puts `out` on the far
 * side and the wire runs straight. **A resistor's two pins are interchangeable, so it is
 * electrically a no-op**, which is why the netlist comparison below passes either way about the
 * circuit and reports the one thing that did change: which pin of the symbol the wire lands on.
 *
 * **IT IS CARRIED HERE BECAUSE THE PAGE IS FROZEN AND ITS DECLARATION'S HOME IS NOT.** The map
 * was declared in `circuits/pultec/schematic/low-boost.ts`, which exists to feed the schematic
 * generator and is deleted with it; the drawn page, its sha256 and its committed export are not
 * going anywhere. Without this entry the guard would report two net disagreements on a page the
 * owner approved - the swap the generator was told to make.
 *
 * **AN ENTRY IS COMPLETE OR IT REFUSES**, which is the rule the declaration it replaces also
 * followed: *"A partial map is not completed by a rule here, because a map that covers some pins
 * is a statement that the author looked at all of them."* A stale entry - a board or a component
 * the network does not have - refuses too, rather than sitting here naming nothing.
 */
const DECLARED_PIN_NUMBERS: Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, string>>>>>> = {
  "pultec-low-boost": { R2: { a: "2", b: "1" } },
}

/** One component's pin numbers on one board: a declared map where there is one, else the rule. */
function pinNumbersOn(board: string, component: Component): ReadonlyMap<string, string> {
  const declared = DECLARED_PIN_NUMBERS[board]?.[component.id]
  if (declared === undefined) return pinNumbersFor(component)
  const names = soleUnitPinNames(component)
  const mapped = Object.keys(declared)
  if (names.length !== mapped.length || !names.every((n) => mapped.includes(n))) {
    throw new Error(
      `DECLARED_PIN_NUMBERS["${board}"]["${component.id}"] maps [${mapped.join(", ")}] and the ` +
        `component's pins are [${names.join(", ")}]. A declared map is not completed by the rule ` +
        "here: a map that covers some pins is a statement that whoever wrote it looked at all of " +
        "them. Fix the entry in tests/circuits/sheet-model.ts, or delete it if the drawing no " +
        "longer needs it.",
    )
  }
  return new Map(Object.entries(declared))
}

/** Every component a board's declared pin maps name must be a component of that board. */
function checkDeclaredPinNumbers(board: string, network: Network): void {
  const declared = DECLARED_PIN_NUMBERS[board]
  if (declared === undefined) return
  const present = new Set(network.components.map((c) => c.id))
  const unknown = Object.keys(declared).filter((id) => !present.has(id))
  if (unknown.length > 0) {
    throw new Error(
      `DECLARED_PIN_NUMBERS["${board}"] names component(s) [${unknown.join(", ")}], which are ` +
        "not in that board's network. The entry is stale, or it names a component of another " +
        "board. It is not ignored: an entry that names nothing is the one a reader would have " +
        "trusted to cover the part whose pin map is now coming from the rule instead.",
    )
  }
}

/** The leading capitals of a part's label - `from-network.ts`'s `refPrefixOf`. */
const REF_PREFIX = /^([A-Z]+)/

/**
 * The KiCad reference every component of `network` carries on its approved page.
 *
 * `<refPrefix><n>` in network order, counting per prefix from 1, which is what
 * `lib/schgen/lock/annotate.ts` assigns from an empty references lock with nothing pinned - see
 * the module header for the three facts that make it reproducible, and `guard-equivalence.test.ts`
 * for the measurement that it does reproduce it.
 */
export function sheetDesignators(network: Network): ReadonlyMap<string, string> {
  const used = new Map<string, number>()
  const out = new Map<string, string>()
  for (const component of network.components) {
    const label = pultecDesignator(component.id)
    const match = REF_PREFIX.exec(label)
    const prefix = match === null ? undefined : match[1]
    if (prefix === undefined) {
      throw new Error(
        `the label "${label}" (component "${component.id}") does not start with capital ` +
          "letters, so there is no reference prefix to count it under. pultecDesignator in " +
          "circuits/pultec/designators.ts already refuses a label that is not " +
          "^[A-Z][A-Z0-9_]*$, so reaching this means that check was weakened.",
      )
    }
    const n = (used.get(prefix) ?? 0) + 1
    used.set(prefix, n)
    out.set(component.id, `${prefix}${n}`)
  }
  return out
}

/** One drafted Pultec page's model, designators and pin numbers. */
export function modelForSheet(board: string): SheetModel {
  const network = declaredBoard(board).build()
  checkDeclaredPinNumbers(board, network)
  const pinNumbers = new Map<string, ReadonlyMap<string, string>>()
  for (const component of network.components) pinNumbers.set(component.id, pinNumbersOn(board, component))
  return { network, designators: sheetDesignators(network), pinNumbers }
}
