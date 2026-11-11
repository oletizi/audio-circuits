/**
 * The h7 bring-up carrier, cut one: the module sockets, every contract pin broken out, the probe
 * test points, the dummy loads, the VIN entry and the USB path. Model-authoritative: a drawing is
 * derived from this file (TOOLING.md step 0).
 *
 * AUTHORITIES. `docs/h7-platform/architecture.md` section 7 (line 356, the carrier's contents) and
 * `docs/h7-platform/parts.md`; the 40-pin contract `module-interface.json` for every socket pad's
 * net; `decisions.md` R-14 for the USB isolation switch and its enable pull-up; and the carrier's
 * controller rulings in `decisions.md` (CR-CARRIER-*), each named beside what it decides. Every
 * component carries its source in `provenance`.
 *
 * NOT CARRIED, deliberately:
 * - the codec loopback on the SAI2 pins (architecture.md:356), whose form is undecided (open item
 *   CARRIER-LOOPBACK-FORM); the four SAI nets reach only their breakout pins and test points;
 * - anything from the codec domain, including the SAI domain isolation (plan sequence step 5);
 * - the failsafe-protection half of the interface check: the model has no part-role field, so
 *   `checkInterface` lists the failsafe-required pins as unchecked (open item CONTRACT-MODEL-CHECK).
 */
import { circuit, NC } from "../../lib/model/index.ts"
import type { Component, Connection, Network, PartSpec } from "../../lib/model/index.ts"
import { parseValue } from "../../lib/model/units.ts"
import { loadContract } from "./contract.ts"
import {
  BREAKOUT_HEADER, CAPACITOR, FUSE, HEADER_2, MODULE_SOCKET, RESISTOR, TEST_POINT, USB_C_RECEPTACLE,
  USB_ESD, USB_SWITCH,
} from "./parts.ts"

export { RAIL_LOADS } from "./rail-budget.ts"
// The project symbol library this circuit draws from (spec C4); `make draw` reads this export
// (tools/draught/draw-intent.ts projectSymbolLibrariesFor) and names it in the draft's sym-lib-table.
export { PROJECT_SYMBOL_LIBRARY } from "./parts.ts"
// A cycle with carrier-board.drawing.ts, which imports h7Carrier and DESIGNATORS from here. It
// is safe for the reason circuits/transistor-preamp/staged-board.ts gives: a re-export is only
// evaluated when drawingIntent() is called.
export { drawingIntent } from "./carrier-board.drawing.ts"

/**
 * Pin numbers by kind, for `intentFromNetwork`. Every `ic`, connector and switch pin in this model
 * is already named by its symbol's pin number, so only the two-terminal passives and the USB-C
 * receptacle's lettered pins need an entry; one table serves every part of a kind without two
 * parts needing different numbers for one name.
 */
export const PIN_NUMBERS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  resistor: { a: "1", b: "2" },
  capacitor: { a: "1", b: "2" },
  connector: Object.fromEntries(
    ["A1", "A4", "A5", "A6", "A7", "A8", "A9", "A12", "B1", "B4", "B5", "B6", "B7", "B8", "B9", "B12", "SH"]
      .map((pin) => [pin, pin]),
  ),
}

/** Component id -> reference designator. */
export const DESIGNATORS: Readonly<Record<string, string>> = {
  j_mod_a: "J1", j_mod_b: "J2", brk_a: "J3", brk_b: "J4",
  j_vin: "J5", j_usb: "J6", j_dummy_3v3d: "J7", j_dummy_vref_a: "J8",
  f_vin: "F1", u_usbsw: "U1", u_esd: "U2",
  r_usben: "R1", r_vbus_top: "R2", r_vbus_bot: "R3", r_cc1: "R4", r_cc2: "R5", r_shld: "R6",
  r_dummy_3v3d: "R7", r_dummy_vref_a: "R8",
  c_usbsw: "C1", c_shld: "C2", c_vbus: "C3", c_vbus_sense: "C4",
  tp_vin_mod: "TP1", tp_3v3d: "TP2", tp_vref_a: "TP3", tp_gnd: "TP4",
  tp_codec_dout: "TP5", tp_codec_din: "TP6", tp_codec_lrck: "TP7", tp_codec_bck: "TP8",
}

type Pins = Readonly<Record<string, string | Connection>>

function connection(value: string | Connection): Connection {
  return typeof value === "string" ? { kind: "net", net: value } : value
}

/** A resistor or capacitor takes its value; every other kind here has none, and refuses one. */
function parametersFor(id: string, kind: Component["kind"], value: string | undefined): Component["parameters"] {
  if (kind === "resistor" || kind === "capacitor") {
    if (value === undefined) throw new Error(`${kind} "${id}" has no value; a passive's value is its identity on the page`)
    return kind === "resistor" ? { ohms: parseValue(value) } : { farads: parseValue(value) }
  }
  if (value !== undefined) throw new Error(`"${id}" (kind ${kind}) was given value "${value}", which this kind has no parameter for`)
  return {}
}

function make(
  id: string, kind: Component["kind"], pins: Pins, part: PartSpec, source: string, value?: string,
): Component {
  const unitPins = Object.fromEntries(Object.entries(pins).map(([pin, c]) => [pin, connection(c)]))
  const parameters = parametersFor(id, kind, value)
  return { id, kind, parameters, part, pins: {}, units: [{ name: "MAIN", pins: unitPins }], provenance: { source } }
}

/** Contract pin -> net: the contract's signal, or RESERVED_<pin> on the carrier (spec G4 exception). */
function contractNets(): ReadonlyMap<number, string> {
  const nets = new Map<number, string>()
  for (const cp of loadContract().pins) {
    if (cp.signal !== null) nets.set(cp.pin, cp.signal)
    else if (cp.category === "reservedCompatibility") nets.set(cp.pin, `RESERVED_${cp.pin}`)
    else throw new Error(`contract pin ${cp.pin} (category "${cp.category}") has no signal, and only reserved pins may lack one`)
  }
  return nets
}

/** Pads "1".."20" of one 1 x 20 part, pad n on contract pin n + offset. */
function rowPins(nets: ReadonlyMap<number, string>, offset: number): Pins {
  const pins: Record<string, string> = {}
  for (let pad = 1; pad <= 20; pad++) {
    const net = nets.get(pad + offset)
    if (net === undefined) throw new Error(`the contract has no pin ${pad + offset}`)
    pins[String(pad)] = net
  }
  return pins
}

const SOCKET_SRC = "parts.md:158 (R-61); pad nets from module-interface.json; architecture.md section 4.2"
const BREAKOUT_SRC = "controller ruling CR-CARRIER-BREAKOUT; architecture.md:356"
const TP_SRC = "architecture.md:356 (test points on VIN_MOD, 3V3_D, VREF_A, GND and the SAI nets); ruling CR-CARRIER-TEST-POINTS"

function sockets(nets: ReadonlyMap<number, string>): Component[] {
  return [
    make("j_mod_a", "connector", rowPins(nets, 0), MODULE_SOCKET, SOCKET_SRC),
    make("j_mod_b", "connector", rowPins(nets, 20), MODULE_SOCKET, SOCKET_SRC),
    make("brk_a", "connector", rowPins(nets, 0), BREAKOUT_HEADER, BREAKOUT_SRC),
    make("brk_b", "connector", rowPins(nets, 20), BREAKOUT_HEADER, BREAKOUT_SRC),
  ]
}

function testPoints(): Component[] {
  const points: readonly (readonly [string, string])[] = [
    ["tp_vin_mod", "VIN_MOD"], ["tp_3v3d", "3V3_D"], ["tp_vref_a", "VREF_A"], ["tp_gnd", "GND"],
    ["tp_codec_dout", "CODEC_DOUT"], ["tp_codec_din", "CODEC_DIN"],
    ["tp_codec_lrck", "CODEC_LRCK"], ["tp_codec_bck", "CODEC_BCK"],
  ]
  return points.map(([id, net]) => make(id, "connector", { "1": net }, TEST_POINT, TP_SRC))
}

function powerEntry(): Component[] {
  const vin = "controller ruling CR-CARRIER-VIN; architecture.md:356 (a current-limited VIN entry, with a fuse)"
  const dummy = "controller ruling CR-CARRIER-DUMMY-LOADS; architecture.md:356 (dummy loads at the contract limits, fitted by jumper)"
  return [
    // Pin 1 is the supply's positive, pin 2 its return.
    make("j_vin", "connector", { "1": "VIN_IN", "2": "GND" }, HEADER_2, vin),
    make("f_vin", "ic", { "1": "VIN_IN", "2": "VIN_MOD" }, FUSE, `${vin}; hold 0.75 A from power.md:246 and power.md:240`),
    make("j_dummy_3v3d", "connector", { "1": "3V3_D", "2": "DUMMY_3V3D" }, HEADER_2, dummy),
    make("r_dummy_3v3d", "resistor", { a: "DUMMY_3V3D", b: "GND" }, RESISTOR, `${dummy}; 147 ohm 1 % 1206`, "147"),
    make("j_dummy_vref_a", "connector", { "1": "VREF_A", "2": "DUMMY_VREF_A" }, HEADER_2, dummy),
    make("r_dummy_vref_a", "resistor", { a: "DUMMY_VREF_A", b: "GND" }, RESISTOR, `${dummy}; 357 ohm 1 % 0805`, "357"),
  ]
}

function usbPath(): Component[] {
  const r14 = "decisions.md R-14; parts.md:145; architecture.md:258"
  const usbc = "controller ruling CR-CARRIER-USB-C"
  return [
    // Switch: D-/D+ (7/8) to contract pins 36/37; S (9) to GND selects port 1 (SCDS220M Table 7-1,
    // ruling CR-CARRIER-USBSW-SELECT); port 2 unused; OE (6) is USB_EN_N, pin 11.
    make("u_usbsw", "ic", {
      "1": "USB_C_DP", "2": "USB_C_DM", "3": NC, "4": NC, "5": "GND",
      "6": "USB_EN_N", "7": "USB_DM", "8": "USB_DP", "9": "GND", "10": "3V3_D",
    }, USB_SWITCH, `${r14}; S and port 2: ruling CR-CARRIER-USBSW-SELECT`),
    make("r_usben", "resistor", { a: "3V3_D", b: "USB_EN_N" }, RESISTOR, `${r14} (R_USBEN 10.0 kOhm 1 %)`, "10.0k"),
    make("c_usbsw", "capacitor", { a: "3V3_D", b: "GND" }, CAPACITOR, "TI SCDS220M p. 15 section 8.3 (a bypass capacitor at VCC); 100 nF per the plan's Task 5 (USB path)", "100n"),
    // ESD, as the pedal fits it (schematic-checklist.md:213 USB-04): D+ through I/O1 (pins 1 and 6),
    // D- through I/O2 (pins 3 and 4), pin 2 GND, pin 5 VBUS with C_VBUS 100 nF to GND.
    make("u_esd", "ic", {
      "1": "USB_C_DP", "2": "GND", "3": "USB_C_DM", "4": "USB_C_DM", "5": "VBUS", "6": "USB_C_DP",
    }, USB_ESD, "parts.md:146 (D10); schematic-checklist.md:213 USB-04; controller ruling CR-CARRIER-ESD"),
    make("c_vbus", "capacitor", { a: "VBUS", b: "GND" }, CAPACITOR,
      "schematic-checklist.md:213 USB-04 (C_VBUS 100 nF X7R 50 V at the USBLC6-2 pin 5); controller ruling CR-CARRIER-ESD", "100n"),
    make("j_usb", "connector", {
      A1: "GND", A4: "VBUS", A5: "USB_CC1", A6: "USB_C_DP", A7: "USB_C_DM", A8: NC, A9: "VBUS", A12: "GND",
      B1: "GND", B4: "VBUS", B5: "USB_CC2", B6: "USB_C_DP", B7: "USB_C_DM", B8: NC, B9: "VBUS", B12: "GND",
      SH: "USB_SHIELD",
    }, USB_C_RECEPTACLE, usbc),
    make("r_cc1", "resistor", { a: "USB_CC1", b: "GND" }, RESISTOR, `${usbc}; processor-and-memory.md:267 (5.1 kOhm Rd)`, "5.1k"),
    make("r_cc2", "resistor", { a: "USB_CC2", b: "GND" }, RESISTOR, `${usbc}; processor-and-memory.md:267 (5.1 kOhm Rd)`, "5.1k"),
    make("r_shld", "resistor", { a: "USB_SHIELD", b: "GND" }, RESISTOR, `${usbc}; schematic-checklist.md:214 USB-05 (R_SHLD 1 MOhm)`, "1M"),
    make("c_shld", "capacitor", { a: "USB_SHIELD", b: "GND" }, CAPACITOR, `${usbc}; schematic-checklist.md:214 USB-05 (C_SHLD 4.7 nF 2 kV)`, "4.7n"),
    // VBUS-HOTPLUG (R-57) applies to this divider: with the module unpowered, a host VBUS ring to
    // 11.11 V would put PA1 at 7.00 V (analog.md FIG-VBUS-HOTPLUG). c_vbus_sense is R-57's option,
    // on USB_VBUS_SENSE itself; c_vbus above is the USBLC6-2's VBUS-to-GND bypass and is not it.
    // vbus-sense.ts states the windows it covers. STILL OPEN, not cleared for physical bring-up:
    // whether a real host and cable stay inside those windows (issue 30; CR-CARRIER-VBUS-SENSE-CAP).
    make("r_vbus_top", "resistor", { a: "VBUS", b: "USB_VBUS_SENSE" }, RESISTOR,
      "controller ruling CR-CARRIER-VBUS-SENSE; architecture.md:257 (12.0 kOhm over 20.0 kOhm, 1 %)", "12.0k"),
    make("r_vbus_bot", "resistor", { a: "USB_VBUS_SENSE", b: "GND" }, RESISTOR,
      "controller ruling CR-CARRIER-VBUS-SENSE; architecture.md:257 (12.0 kOhm over 20.0 kOhm, 1 %)", "20.0k"),
    make("c_vbus_sense", "capacitor", { a: "USB_VBUS_SENSE", b: "GND" }, CAPACITOR,
      "controller ruling CR-CARRIER-VBUS-SENSE-CAP; R-57's option (parts.md:177, 100 nF X7R, C1591); analog.md FIG-VBUS-HOTPLUG; issue 30", "100n"),
  ]
}

/** The carrier. Contract pins 20 and 40 are both net GND, which joins AGND and DGND (architecture.md section 8, item 10). */
export function h7Carrier(): Network {
  const builder = circuit()
  for (const component of [...sockets(contractNets()), ...testPoints(), ...powerEntry(), ...usbPath()]) {
    builder.add(component)
  }
  return builder.done()
}
