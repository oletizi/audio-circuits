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
 * The junction footprint and symbol: a 1x05 header at 2.54mm, VERIFIED PRESENT
 * in KiCad's own library before being written here. Confirm with:
 *
 *   ls "/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints/\
 * Connector_PinHeader_2.54mm.pretty/PinHeader_1x05_P2.54mm_Vertical.kicad_mod"
 *   grep -n "symbol \"Conn_01x05\"" \
 *     "/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols/Connector_Generic.kicad_sym"
 *
 * The footprint is a landing, not a purchase: a plain header, a stacking
 * (long-tail) header, a ribbon socket or individual leads all press into the
 * same row of five holes. See the design doc's "The junction is a stacking
 * 2x05 bus" for why the pitch and the two-row-of-five shape (one of these
 * headers for signals, a second for grounds - see below) are what let the
 * five boards stack on a shared bus.
 *
 * MODELLED AS TWO 1x05 HEADERS, NOT ONE 2x05 PART. The hardware is one 2x05
 * header occupying one row-of-ten pin field; the model is two, because
 * `lib/kicad/import-string.ts` derives a VeroRoute import string only for the
 * families the pinned fork's `Src/CompTypes.h` actually has - `SIP<n>` from
 * `PinHeader_1x<n>_*` - and that fork has no two-row shape at 2.54mm row
 * pitch (`SIP` is one row; `DIP`'s real row spacing is 0.3in+, not 0.1in, so
 * mapping a 2.54mm 2x05 to it would be exactly the kind of footprint-name-
 * lies error this repository has shipped twice already; `BLOCK_100`/
 * `BLOCK_200` are single-row terminal blocks). Two `PinHeader_1x05` headers on
 * adjacent rows occupy the identical pin field a single 2x05 does - a ribbon
 * socket still mates across both, a stack still carries every net through -
 * so nothing physical is lost. What is lost is model tidiness: KiCad sees two
 * connectors where the hardware is one part, which matters only for a future
 * PCB footprint placement, out of scope for this stripboard design, and is
 * recorded here as a limitation rather than silently hidden.
 */
export const HEADER_1X05 =
  "Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical"

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
export function symbolFor(component: Component): string {
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
 * The junction's signal row: a 1x05 header carrying all five ladder nets, one
 * pin each, in the odd-pin order the design doc's pinout table gives them.
 *
 * THE PINOUT IS FIXED AND IDENTICAL ON EVERY BOARD, and does not vary with
 * which nets a given section's bare circuit touches - that uniformity is what
 * makes the junction a shared bus rather than a per-board connector, and what
 * lets any board host any absent section's stand-in group later. See the
 * design doc's "The junction is a stacking 2x05 bus" for why.
 *
 * `electricallyInert: true` is sound here on the ordinary grounds: every pin
 * names a DIFFERENT net, so there is nothing for the part to be accused of
 * joining even before the declaration is read.
 */
export function junctionSignalComponent(): Component {
  return {
    id: "junction_signals",
    kind: "connector",
    parameters: {},
    part: {
      symbol: "Connector_Generic:Conn_01x05",
      footprint: HEADER_1X05,
      electricallyInert: true,
    },
    pins: {},
    units: [{
      name: "MAIN",
      pins: {
        "1": net("in"), "2": net("hi_boost_out"), "3": net("lo_boost_in"),
        "4": net("out"), "5": net("0"),
      },
    }],
    provenance: { source: PHYSICAL_ONLY },
  }
}

/**
 * The junction's ground row: a second 1x05 header, every pin a ground return
 * interleaved beside the signal row above - these are high-impedance nodes
 * (47k-470k), and `in`/`out` sitting adjacent with nothing between them would
 * be a feedback path.
 *
 * `electricallyInert: true` here is the declaration the ruling turned on:
 * five pins on one net is not, by itself, evidence of a short - nets are
 * implied by pin references rather than declared, so five pins naming "0"
 * are already one net, not five nets this header has joined. What makes
 * projecting this header away sound is that the part conducts nothing beyond
 * what the net name already says, which only the declaration can state.
 */
export function junctionGroundComponent(): Component {
  return {
    id: "junction_grounds",
    kind: "connector",
    parameters: {},
    part: {
      symbol: "Connector_Generic:Conn_01x05",
      footprint: HEADER_1X05,
      electricallyInert: true,
    },
    pins: {},
    units: [{
      name: "MAIN",
      pins: {
        "1": net("0"), "2": net("0"), "3": net("0"), "4": net("0"), "5": net("0"),
      },
    }],
    provenance: { source: PHYSICAL_ONLY },
  }
}

/** Both junction rows, in the order they occupy on the board: signals then grounds. */
export function junctionComponents(): readonly [Component, Component] {
  return [junctionSignalComponent(), junctionGroundComponent()]
}

/**
 * The five nets the junction puts on every board, in the signal row's pin
 * order, regardless of which board is asking.
 *
 * RESTATED HERE RATHER THAN READ OFF THE COMPONENTS only because `sharedByFor`
 * and `portsOn` need bare net names, not a pin map. That restatement is a
 * second source of truth, so it does NOT rely on anybody keeping it in step by
 * hand: `tests/pultec/scaffold-boards.test.ts` asserts this list against the
 * nets `junctionSignalComponent()` and `junctionGroundComponent()` actually
 * carry, and against the signal row's own pin order.
 */
export const JUNCTION_NETS: readonly string[] = [
  "in", "hi_boost_out", "lo_boost_in", "out", "0",
]

/**
 * One section's OWN components, physicalized: footprints on the board-resident
 * parts, symbols on the off-board landings.
 *
 * This is the section's own circuit only. The stand-in groups for the other
 * four sections, and the junction, are added by
 * `circuits/pultec/physical/board.ts`, which is the module that knows which
 * groups a configuration carries.
 *
 * `partitionReference()`, NOT a configuration network: a configuration filters
 * nothing out, but the thing that would be tempting here - a network already
 * stripped of pots, switches and inductors - would leave the off-board branch
 * below unreachable and produce boards with no wire landings at all.
 */
export function ownComponents(owner: ModuleOwner): readonly Component[] {
  const owned = partitionReference().modules[owner]
  if (owned === undefined) {
    throw new Error(
      `no such module: ${owner}. Known modules: ` +
        `${Object.keys(partitionReference().modules).sort().join(", ")}. Module names come ` +
        "from circuits/pultec/partition.ts and are not defaulted.",
    )
  }
  return owned.map((component) =>
    OFF_BOARD.has(component.id)
      ? { ...component, part: { ...component.part, symbol: symbolFor(component) } }
      : { ...component, part: { ...component.part, footprint: footprintForKind(component) } })
}

/**
 * A board's ports: the junction nets its ELECTRICAL components touch.
 *
 * Call this with the board's electrical components and WITHOUT the junction.
 * The junction lands a pin on all five nets on every board, so including it
 * would declare a port for every net on every board - and a net whose only pin
 * belongs to the junction is physical-only: `projectPhysical` removes the
 * junction, after which nothing sits on that net at all, and `validateNetwork`
 * refuses a port naming a net nothing is on.
 *
 * Which nets those are therefore varies with the CONFIGURATION, not with a
 * per-board list: a board carrying hi-cut's and mid's stand-in groups touches
 * `hi_boost_out` and `in`, which the section alone never names. An earlier
 * revision passed a hand-written `crossingNets` array per section; it is
 * deleted rather than kept, because `JUNCTION_NETS` filtered by what the
 * components touch computes the same answer for the all-five configuration and
 * the right one for every other.
 */
export function portsOn(
  components: readonly Component[],
): Readonly<Record<string, string>> {
  const touched = new Set(components.flatMap(componentNets))
  return Object.fromEntries(
    JUNCTION_NETS.filter((netName) => touched.has(netName)).map((netName) => [netName, netName]),
  )
}

/** The pad order for one off-board component: the landing's pin order. */
export function padOrderFor(component: Component): readonly string[] {
  if (component.kind === "potentiometer") return POT_PAD_ORDER
  if (component.kind === "inductor") return TWO_PIN_PAD_ORDER
  if (component.kind === "switch") return rotaryPadOrder(component)
  throw new Error(
    `no pad order rule for off-board "${component.id}" of kind "${component.kind}". An ` +
      "off-board part's pads are the wire landings a builder solders to, so their order is " +
      "a per-kind fact that must be stated in circuits/pultec/physical/parts.ts rather than " +
      "defaulted to whatever order the pin map happens to iterate in.",
  )
}

/** Pad orders for the off-board components of a physicalized board. */
export function padOrdersFor(
  board: Network,
  offBoardIds: ReadonlySet<string>,
): Readonly<Record<string, readonly string[]>> {
  const orders: Record<string, readonly string[]> = {}
  for (const component of board.components) {
    if (!offBoardIds.has(component.id)) continue
    orders[component.id] = padOrderFor(component)
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
 * Every junction net mapped to the OTHER boards that touch it, for the wiring
 * guide's terminal-block table.
 *
 * Covers all five of `JUNCTION_NETS`, NOT just the nets this board's own
 * circuit happens to touch - the junction is identical on every board, so a
 * net this board doesn't use can still reach another board through it, and
 * reporting only this board's own crossing nets would print "no other board"
 * for a net that plainly does reach one (caught by reading the regenerated
 * low-cut guide: `in` and `lo_boost_in` are not this board's nets, but they
 * are hi-boost/mid's and low-boost's, and the guide must say so).
 *
 * Derived from `boundaryConductors()` rather than restated, so it cannot
 * disagree with the boundary the boards were actually split along. A net no
 * other board touches - the chassis ground on three of the five - maps to an
 * empty list rather than being absent, which is what lets the guide print "no
 * other board" instead of a blank cell that reads like missing data.
 */
export function sharedByFor(owner: ModuleOwner): Readonly<Record<string, readonly string[]>> {
  const boundaries = boundaryConductors()
  const shared: Record<string, readonly string[]> = {}
  for (const netName of JUNCTION_NETS) {
    const boundary = boundaries.find(candidate => candidate.net === netName)
    shared[netName] = boundary === undefined
      ? []
      : boundary.owners.filter(candidate => candidate !== owner)
  }
  return shared
}
