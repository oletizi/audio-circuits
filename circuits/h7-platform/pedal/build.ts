/**
 * The vocabulary every h7-pedal block file is written in (h7 pedal pages plan, Task 5).
 *
 * THE BLOCKS (controller ruling CR-PEDAL-BLOCKS, decisions.md; the owner may override). The source
 * inventory's section 1.1 list (`docs/superpowers/plans/2026-11-12-h7-pedal-pages-inventory.md`),
 * with its `controls` split into `controls_a` (positions 1-3) and `controls_b` (positions 4-6): 19
 * blocks, one page each. Each block is one function, so every OPA1688 dual stays whole in its block,
 * channel A = L and B = R (schematic-checklist.md:149). The groups are the plan's: Task 6 models the
 * power group, Task 8 the digital and controls group, Task 10 the analog group; the interface block
 * is Task 5's. `pedal-board.ts` includes a block only once its task has built it.
 *
 * THE COMPONENT HELPERS are the module's (`../module/build.ts`), re-exported so that the pedal's
 * blocks are written in the same words and a block port is named by the net it carries, for the
 * reason that file gives. Kinds the module never needed are added here by the task that needs them.
 */
import type { PinNumbers } from "../../../lib/kicad/from-network.ts"
import type { Component, Connection, PartSpec } from "../../../lib/model/index.ts"
import { parseValue } from "../../../lib/model/units.ts"
import { MODULE_PIN_NUMBERS, type Pins } from "../module/build.ts"
import { POTENTIOMETER_PIN_NUMBERS } from "../pedal-parts.ts"

export { block, capacitor, inductor, part, pushButton, resistor } from "../module/build.ts"
export type { Pins } from "../module/build.ts"

const net = (name: string): { readonly kind: "net"; readonly net: string } => ({ kind: "net", net: name })

/** The USB-C receptacle's lettered pins, read from the module's map rather than retyped. */
function receptaclePins(): Readonly<Record<string, string>> {
  const pins = MODULE_PIN_NUMBERS.connector
  if (pins === undefined) {
    throw new Error(
      "circuits/h7-platform/module/build.ts MODULE_PIN_NUMBERS has no connector map; the pedal numbers its USB-C " +
        "receptacle's lettered pins from it (CR-PEDAL-USB-C). Not defaulted, because a lettered pin has no number of its own.",
    )
  }
  return pins
}

function pinsOf(pins: Pins): Record<string, Connection> {
  return Object.fromEntries(Object.entries(pins).map(([pin, c]) => [pin, typeof c === "string" ? net(c) : c]))
}

/**
 * An `ic` whose package has more than one unit (Task 1, spec C6): one model unit per symbol unit,
 * each numbered through the part's own `symbolPins`. An `ic` declares no package pins
 * (`lib/model/kinds.ts`), so a supply unit is a unit like the others (CR-PEDAL-DIGITAL-READINGS,
 * for U_ISO_M).
 */
export function multiUnitIc(id: string, units: Readonly<Record<string, Pins>>, spec: PartSpec, source: string): Component {
  return {
    id, kind: "ic", parameters: {}, part: spec, pins: {},
    units: Object.entries(units).map(([name, pins]) => ({ name, pins: pinsOf(pins) })), provenance: { source },
  }
}

/** A single op-amp: one section and its supply pins, numbered by `PEDAL_PIN_NUMBERS.opamp`. */
export function singleOpamp(
  id: string, s: OpampSection, supply: { readonly "v+": string; readonly "v-": string }, spec: PartSpec, source: string,
): Component {
  return {
    id, kind: "opamp", parameters: {}, part: spec,
    pins: { "v+": net(supply["v+"]), "v-": net(supply["v-"]) },
    units: [{ name: "MAIN", pins: { "in+": net(s["in+"]), "in-": net(s["in-"]), out: net(s.out) } }], provenance: { source },
  }
}

/** A linear potentiometer, pins ccw, wiper and cw (numbered by `POTENTIOMETER_PIN_NUMBERS`, CR-PEDAL-KINDS). */
export function potentiometer(
  id: string, value: string, pins: { readonly ccw: string; readonly wiper: string; readonly cw: string }, spec: PartSpec, source: string,
): Component {
  return {
    id, kind: "potentiometer", parameters: { ohms: parseValue(value), taper: { type: "linear" } }, part: spec, pins: {},
    units: [{ name: "MAIN", pins: pinsOf(pins) }], provenance: { source },
  }
}

/** A switching part (a switching jack): its pins, and the pin pairs each named position joins. */
export function switchingPart(
  id: string, pins: Pins, contacts: Readonly<Record<string, readonly (readonly [string, string])[]>>, spec: PartSpec, source: string,
): Component {
  return {
    id, kind: "switch", parameters: { positions: Object.keys(contacts), contacts }, part: spec, pins: {},
    units: [{ name: "MAIN", pins: pinsOf(pins) }], provenance: { source },
  }
}

/** A two-terminal diode (kind `diode`, pins `anode` and `cathode`; numbered by `PEDAL_PIN_NUMBERS.diode`). */
export function diode(id: string, anode: string, cathode: string, spec: PartSpec, source: string): Component {
  return {
    id, kind: "diode", parameters: {}, part: spec, pins: {},
    units: [{ name: "MAIN", pins: { anode: net(anode), cathode: net(cathode) } }], provenance: { source },
  }
}

/** One op-amp section's three pins, by net. */
export interface OpampSection {
  readonly "in+": string
  readonly "in-": string
  readonly out: string
}

/**
 * A whole dual op-amp: sections A and B and the package's supply pins, numbered through the part's
 * own `symbolPins` (Task 1; `lib/kicad/unit-pins.ts`), because a per-kind table cannot tell the two
 * sections apart. Channel A = L and B = R (schematic-checklist.md:149).
 */
export function dualOpamp(
  id: string, a: OpampSection, b: OpampSection, supply: { readonly "v+": string; readonly "v-": string },
  spec: PartSpec, source: string,
): Component {
  const section = (s: OpampSection) => ({ "in+": net(s["in+"]), "in-": net(s["in-"]), out: net(s.out) })
  return {
    id, kind: "opamp", parameters: {}, part: spec,
    pins: { "v+": net(supply["v+"]), "v-": net(supply["v-"]) },
    units: [{ name: "A", pins: section(a) }, { name: "B", pins: section(b) }], provenance: { source },
  }
}

export const PEDAL_GROUPS = ["power", "digital and controls", "analog", "interface"] as const
export type PedalGroup = (typeof PEDAL_GROUPS)[number]

export interface PedalBlock {
  /** The block's prefix: its component ids start `<prefix>_`, and its page is named by it. */
  readonly prefix: string
  readonly group: PedalGroup
  /** The function, in the inventory's section 1.1 words. */
  readonly function: string
}

/** CR-PEDAL-BLOCKS: the 19 blocks, in the inventory's order. */
export const PEDAL_BLOCKS: readonly PedalBlock[] = [
  { prefix: "entry", group: "power", function: "DC jack, reverse-polarity Schottkys, input filter, hold-up reservoir on VIN_A, VIN bleeder" },
  { prefix: "pf", group: "power", function: "power-fail supervisor at VIN, sense divider, inverter making PF_TRIP / PF_ON" },
  { prefix: "modsw", group: "power", function: "module load switch Q_MSW onto VIN_MOD, its soft start, gate hold, VIN_MOD discharge (Q_VDIS)" },
  { prefix: "prail", group: "power", function: "3V3_P buck U_PRAIL and its EN delay / Q_PEN reset" },
  { prefix: "ldo_vmid", group: "power", function: "5V_A LDO, R_5VA link, VMID divider and U_VMID (whole dual)" },
  { prefix: "codec_sup", group: "digital and controls", function: "codec domain supply, oscillator, local reset (U_CVDD, D_CVCL, R_CBLD, U_XO, U_CRST, Q_PFR)" },
  { prefix: "codec", group: "digital and controls", function: "PCM3060, its straps, decoupling, 33 ohm series resistors" },
  { prefix: "sai_iso", group: "digital and controls", function: "SAI domain isolation buffers, biases, 470 ohm module-side resistors" },
  { prefix: "in_fe", group: "analog", function: "input front ends L/R up to the follower (U_IN, whole dual)" },
  { prefix: "adc_drv", group: "analog", function: "ADC drivers L/R (U_ADC, whole dual), VBIAS nodes, codec-pin RC" },
  { prefix: "out", group: "analog", function: "output difference amps L/R (U_OUT, whole dual), DC block, bleed" },
  { prefix: "jacks_byp", group: "analog", function: "four audio jacks, jack ESD, two bypass relays, coil drive, suppressors, Q_PFG" },
  { prefix: "expr_ref", group: "digital and controls", function: "expression jack and ESD, VREF_A blocking network, ring reference, tip chain, U_EXP, plug detect, HW_REV strap" },
  { prefix: "controls_a", group: "digital and controls", function: "control positions 1-3 (pot and button fits)" },
  { prefix: "controls_b", group: "digital and controls", function: "control positions 4-6 (pot and button fits)" },
  { prefix: "fsw_led", group: "digital and controls", function: "two footswitch inputs, two LEDs with MOSFET switches" },
  { prefix: "usb", group: "digital and controls", function: "pedal USB-C, CC resistors, ESD, shield RC, USB isolation switch, VBUS sense divider" },
  { prefix: "midi_i2c", group: "digital and controls", function: "MIDI OUT driver and high-side switch, MIDI header (not fitted), I2C pull-ups" },
  { prefix: "interface", group: "interface", function: "J_MOD_A, J_MOD_B module sockets" },
]

/**
 * Pin numbers by kind, for `intentFromNetwork` and the symbol checks. Only what the built blocks
 * need: the sockets', test pads', DC jack's and every `ic`'s pins are already their symbol's pin
 * numbers. Task 6 added the two-terminal kinds: `Device:R`, `Device:C`, `Device:C_Polarized` (pin 1
 * the + terminal, so a polarised capacitor's `a` is its + side), `Device:FerriteBead`, each numbered
 * 1 and 2; and the diode, cathode 1 and anode 2 (CR-PEDAL-KINDS; PMEG4030ER v.4 and BAS116H Rev. 3
 * Table 2, `pedal-pin-tables.ts`). The dual op-amps are numbered from their own `symbolPins`. Task 8
 * added: the pot, by `POTENTIOMETER_PIN_NUMBERS` (CR-PEDAL-KINDS); the one single op-amp, U_EXP,
 * MCP6001 SOT-23-5 (1 VOUT, 2 VSS, 3 VIN+, 4 VIN-, 5 VDD; DS20001733L Table 3-1, `pedal-pin-tables.ts`;
 * schematic-checklist.md:196); the USB-C receptacle's lettered pins, the module's own map; and the
 * switching jack's lettered pins (`Connector_Audio:NMJ6HCD2`, numbered T, R, S, TN, RN, SN on disk).
 * Each is checked by the board test's symbol check.
 */
export const PEDAL_PIN_NUMBERS: PinNumbers = {
  resistor: { a: "1", b: "2" },
  capacitor: { a: "1", b: "2" },
  inductor: { a: "1", b: "2" },
  diode: { cathode: "1", anode: "2" },
  potentiometer: POTENTIOMETER_PIN_NUMBERS,
  opamp: { out: "1", "v-": "2", "in+": "3", "in-": "4", "v+": "5" },
  connector: receptaclePins(),
  switch: { T: "T", R: "R", S: "S", TN: "TN", RN: "RN", SN: "SN" },
}
