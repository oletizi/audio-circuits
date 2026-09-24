/**
 * What the Pultec boards are built from: footprints, designators and pad
 * orders, shared across the five board modules.
 *
 * THE FOOTPRINT HERE IS A NAME, NOT A CHOICE YET. Every capacitor points at one
 * film footprint, and `FILM_CAPACITOR_IMPORT_STRINGS` in
 * `lib/kicad/import-string.ts` is empty, so every board refuses at export until
 * a real capacitor family has been chosen and entered there. That refusal is
 * the point: an empty whitelist says "nobody has picked a part" out loud, where
 * a derived guess would quietly produce a board built around the wrong body.
 */
import type { Component, Network } from "../../lib/model/types.ts"
import { net } from "../../lib/model/types.ts"
import { PHYSICAL_ONLY } from "../../lib/board/physicalize.ts"
import { OFF_BOARD } from "../../reference/pultec/off-board.ts"
import { partitionReference } from "../../reference/pultec/partition.ts"
import type { ModuleOwner } from "../../reference/pultec/partition.ts"

/** Placeholder until a capacitor family is chosen - see the module comment. */
export const FILM_CAPACITOR = "Capacitor_THT:C_Rect_L7.2mm_W3.5mm_P5.00mm"

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

/** Every net a component's package pins and unit pins name. A no-connect names none. */
function componentNets(component: Component): readonly string[] {
  const nets: string[] = []
  for (const group of [component.pins, ...component.units.map((unit) => unit.pins)]) {
    for (const connection of Object.values(group)) {
      if (connection.kind === "net") nets.push(connection.net)
    }
  }
  return nets
}

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
  if (component.kind === "capacitor") return FILM_CAPACITOR
  if (component.kind === "resistor") return AXIAL_RESISTOR
  throw new Error(
    `no footprint is defined for on-board component "${component.id}" of kind ` +
      `"${component.kind}". Every on-board part needs one; if this part should be off the ` +
      "board, add it to reference/pultec/off-board.ts instead.",
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
    part: { footprint: TERMINAL_BLOCK_3, electricallyInert: true },
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
