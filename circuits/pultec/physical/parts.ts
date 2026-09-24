/**
 * What the Pultec boards are built from: footprints, designators and pad
 * orders, shared across the five board modules.
 *
 * The capacitor family is TDK/EPCOS B32529 (63V) for 1nF-330nF, plus one WIMA
 * FKP2 for the single 470pF below B32529's floor - see
 * `docs/pultec/capacitor-selection.md` for the selection and
 * `FILM_CAPACITOR_IMPORT_STRINGS` in `lib/kicad/import-string.ts` for the
 * footprints' VeroRoute import strings.
 */
import type { Component, Network } from "../../../lib/model/types.ts"
import { net } from "../../../lib/model/types.ts"
import { componentNets } from "../../../lib/model/topology.ts"
import { PHYSICAL_ONLY } from "../../../lib/board/physicalize.ts"
import { OFF_BOARD } from "../off-board.ts"
import { boundaryConductors, partitionReference } from "../partition.ts"
import type { ModuleOwner } from "../partition.ts"

/**
 * Capacitance (farads) -> KiCad footprint, largest threshold first.
 *
 * THE 470pF ENTRY IS BELOW ITS OWN RANGE, NOT ABOVE. A table with only a "1nF
 * and up" entry would let 470pF fall through the bottom and throw, or - worse -
 * silently match nothing. Its 4.5mm body (WIMA FKP2, below B32529's 1nF floor)
 * is also wider than the 3.5mm 330nF top of the range, so it cannot share that
 * entry either; it needs its own threshold at its own value.
 *
 * See docs/pultec/capacitor-selection.md section 7 for the value-to-footprint
 * map this table encodes.
 */
const FILM_BY_FARADS: readonly (readonly [number, string])[] = [
  // TDK/EPCOS B32529, 63V, 330nF: 3.0mm body, deliberately oversize on the
  // 3.5mm-wide footprint (no W3.0 footprint exists without naming the wrong
  // manufacturer - see docs/pultec/capacitor-selection.md section 7). Three
  // strip rows either way.
  [330e-9, "Capacitor_THT:C_Rect_L7.2mm_W3.5mm_P5.00mm"],
  // TDK/EPCOS B32529, 63V, 1nF-220nF: body 2.5mm wide, one strip row.
  [1e-9, "Capacitor_THT:C_Rect_L7.2mm_W2.5mm_P5.00mm"],
  // WIMA FKP2, 63V, 470pF: body 4.5mm wide, three strip rows.
  [470e-12, "Capacitor_THT:C_Rect_L7.2mm_W4.5mm_P5.00mm"],
]

/**
 * The largest capacitance `FILM_BY_FARADS` has a recorded footprint for
 * (330nF, TDK/EPCOS B32529). B32529 catalogues up to 2.2uF, but nobody has
 * read that part's body width off a datasheet yet - see
 * `docs/pultec/capacitor-selection.md` section 7, which stops at 330nF - so a
 * larger value must refuse rather than silently borrow the 330nF footprint.
 */
const FILM_MAX_FARADS = 330e-9

/** The film footprint for a capacitor's value, from `FILM_BY_FARADS`. */
function filmFootprint(component: Component): string {
  const farads: unknown = Reflect.get(component.parameters, "farads")
  if (typeof farads !== "number") {
    throw new Error(`capacitor "${component.id}" has no numeric farads parameter`)
  }
  if (farads > FILM_MAX_FARADS) {
    throw new Error(
      `no film footprint is recorded for ${farads}F ("${component.id}"): it is above ` +
        `${FILM_MAX_FARADS}F, the largest value FILM_BY_FARADS has a footprint for. Add its ` +
        "value to FILM_BY_FARADS in circuits/pultec/parts.ts, with the footprint of the part " +
        "you are actually fitting - read its body width off a datasheet first.",
    )
  }
  for (const [threshold, footprint] of FILM_BY_FARADS) {
    if (farads >= threshold) return footprint
  }
  throw new Error(
    `no film footprint is recorded for ${farads}F ("${component.id}"). Add its value to ` +
      "FILM_BY_FARADS in circuits/pultec/parts.ts, with the footprint of the part you are " +
      "actually fitting.",
  )
}

export const AXIAL_RESISTOR =
  "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal"

/**
 * A three-way 5.08mm terminal block: this board's crossing nets plus ground.
 *
 * VERIFIED PRESENT in KiCad's own library before being written here - the first
 * draft of this plan invented a plausible name that does not exist. Confirm with:
 *
 *   ls "/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints/\
 * TerminalBlock_Phoenix.pretty/TerminalBlock_Phoenix_MKDS-1,5-3-5.08_1x03_P5.08mm_Horizontal.kicad_mod"
 *
 * The block is a landing, not a purchase: 5.08mm pitch means a screw terminal can
 * be fitted over those holes, a header pressed into them, or a wire soldered
 * straight in. Any other 1x03 part at 5.00mm or 5.08mm substitutes without
 * changing the layout.
 */
export const TERMINAL_BLOCK_3 =
  "TerminalBlock_Phoenix:TerminalBlock_Phoenix_MKDS-1,5-3-5.08_1x03_P5.08mm_Horizontal"

/** Symbols for the off-board parts, so their netlist value field is not empty. */
export const ROTARY_SYMBOL = "Switch:SW_Rotary"
export const TOGGLE_SYMBOL = "Switch:SW_SPDT"
export const POT_SYMBOL = "Device:R_Potentiometer"
export const INDUCTOR_SYMBOL = "Device:L"

/** A pot's lugs, in the order a panel-mount part numbers them. */
export const POT_PAD_ORDER: readonly string[] = ["ccw", "wiper", "cw"]

/** A two-terminal off-board part: the inductors. */
export const TWO_PIN_PAD_ORDER: readonly string[] = ["a", "b"]

/**
 * A rotary selector's pads: the common first, then the throws in detent order.
 *
 * Detent order is the order the throws appear in the component's own pins,
 * which the reference builds from its frequency tables, so this derives it
 * rather than restating a list that could disagree with them.
 */
export function rotaryPadOrder(component: Component): readonly string[] {
  const unit = component.units[0]
  if (unit === undefined) throw new Error(`component "${component.id}" has no unit`)
  const pins = Object.keys(unit.pins)
  if (!pins.includes("common")) {
    throw new Error(`rotary "${component.id}" has no "common" pin; its pins are ${pins.join(", ")}`)
  }
  return ["common", ...pins.filter((pin) => pin !== "common")]
}

/** The footprint an on-board component gets, by kind. */
export function footprintForKind(component: Component): string {
  if (component.kind === "capacitor") return filmFootprint(component)
  if (component.kind === "resistor") return AXIAL_RESISTOR
  throw new Error(
    `no footprint is defined for on-board component "${component.id}" of kind ` +
      `"${component.kind}". Every on-board part needs one; if this part should be off the ` +
      "board, add it to circuits/pultec/off-board.ts instead.",
  )
}

/** The symbol an off-board component's value field takes, by kind. */
function symbolFor(component: Component): string {
  if (component.kind === "potentiometer") return POT_SYMBOL
  if (component.kind === "inductor") return INDUCTOR_SYMBOL
  if (component.kind === "switch") {
    const unit = component.units[0]
    if (unit === undefined) throw new Error(`switch "${component.id}" has no unit`)
    return Object.keys(unit.pins).length > 3 ? ROTARY_SYMBOL : TOGGLE_SYMBOL
  }
  throw new Error(`no symbol is defined for off-board component "${component.id}"`)
}

/**
 * One physicalized board: the module's components with footprints or symbols
 * attached, plus the terminal block that carries its crossing nets.
 *
 * `crossingNets` is in pin order and always ends with "0". Ground is on every
 * board, including the three where it is not in the signal topology, because a
 * board with panel wiring and no ground landing gets an improvised wire
 * soldered to it later.
 */
export function physicalizedBoard(owner: ModuleOwner, crossingNets: readonly string[]): Network {
  // partitionReference(), NOT boardNetwork(). boardNetwork filters out everything
  // that is not board-resident, which after Task 5 means every pot, switch and
  // inductor - exactly the components this design keeps in the network and marks
  // off-board so their PADS pads become the wire landings. Building from
  // boardNetwork would leave the off-board branch below unreachable and produce
  // boards with no landings at all.
  const owned = partitionReference().modules[owner]
  if (owned === undefined) throw new Error(`no such module: ${owner}`)
  const components: Component[] = owned.map((component) =>
    OFF_BOARD.has(component.id)
      ? { ...component, part: { ...component.part, symbol: symbolFor(component) } }
      : { ...component, part: { ...component.part, footprint: footprintForKind(component) } })

  // A board's ports are the crossing nets its own electrical components touch.
  // The rest of `crossingNets` - the chassis ground on the three boards where
  // ground is not in the signal topology - exist only because the terminal block
  // puts a pin on them. They are physical-only, and must NOT be declared ports:
  // `projectPhysical` removes the block, after which no pin sits on them at all,
  // and `validateNetwork` refuses a port naming a net nothing is on.
  //
  // This is not a second description of the interface competing with the block.
  // Both come from the same `crossingNets` array; the block realises it in
  // copper, and these ports are what remains of it once the copper is projected
  // away.
  const touched = new Set(components.flatMap(componentNets))
  const ports = Object.fromEntries(
    crossingNets.filter((netName) => touched.has(netName)).map((netName) => [netName, netName]),
  )

  const pins: Record<string, ReturnType<typeof net>> = {}
  crossingNets.forEach((netName, index) => { pins[String(index + 1)] = net(netName) })

  components.push({
    id: "board_terminals",
    kind: "connector",
    parameters: {},
    part: { symbol: "Connector_Generic:Conn_01x03", footprint: TERMINAL_BLOCK_3, electricallyInert: true },
    pins: {},
    units: [{ name: "MAIN", pins }],
    provenance: { source: PHYSICAL_ONLY },
  })

  return { ports, components }
}

/** Pad orders for every off-board component on a physicalized board. */
export function padOrdersFor(board: Network): Readonly<Record<string, readonly string[]>> {
  const orders: Record<string, readonly string[]> = {}
  for (const component of board.components) {
    if (!OFF_BOARD.has(component.id)) continue
    if (component.kind === "potentiometer") orders[component.id] = POT_PAD_ORDER
    else if (component.kind === "inductor") orders[component.id] = TWO_PIN_PAD_ORDER
    else if (component.kind === "switch") orders[component.id] = rotaryPadOrder(component)
    else throw new Error(`no pad order rule for off-board "${component.id}"`)
  }
  return orders
}

/** Designators: the reference ids are netlist-derived and already designator-shaped. */
export function designatorsFor(board: Network): Readonly<Record<string, string>> {
  const designators: Record<string, string> = {}
  for (const component of board.components) designators[component.id] = component.id
  return designators
}

/** Two-terminal passives number 1/2; connectors number themselves. */
export const PASSIVE_PIN_NUMBERS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  resistor: { a: "1", b: "2" },
  capacitor: { a: "1", b: "2" },
}

/**
 * Each crossing net mapped to the OTHER boards that touch it, for the wiring
 * guide's terminal-block table.
 *
 * Derived from `boundaryConductors()` rather than restated, so it cannot
 * disagree with the boundary the boards were actually split along. A net no
 * other board touches - the chassis ground on three of the five - maps to an
 * empty list rather than being absent, which is what lets the guide print "no
 * other board" instead of a blank cell that reads like missing data.
 */
export function sharedByFor(
  owner: ModuleOwner,
  crossingNets: readonly string[],
): Readonly<Record<string, readonly string[]>> {
  const boundaries = boundaryConductors()
  const shared: Record<string, readonly string[]> = {}
  for (const netName of crossingNets) {
    const boundary = boundaries.find(candidate => candidate.net === netName)
    shared[netName] = boundary === undefined
      ? []
      : boundary.owners.filter(candidate => candidate !== owner)
  }
  return shared
}
