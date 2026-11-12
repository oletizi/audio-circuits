/**
 * The small vocabulary every h7-module block file is written in: a component with its source,
 * and a block (a `Network` whose ports are named by the nets they carry).
 *
 * Why a port is named by its net: a block's port name is the text its page carries for that net
 * and the root sheet's pin name (`tools/draught/drawing-pages.ts`). The module's shared nets are
 * the contract's names and the module pin map's names (`module-pins.ts`), so a block that called
 * its `3V3_D` port anything else would draw one net under two names.
 */
import { circuit } from "../../../lib/model/index.ts"
import type { Component, Connection, Network, PartSpec } from "../../../lib/model/index.ts"
import { parseValue } from "../../../lib/model/units.ts"

export type Pins = Readonly<Record<string, string | Connection>>

/**
 * Pin numbers by kind, for `intentFromNetwork` and the symbol checks. Every `ic`, header, test pad
 * and switch pin in the module is already named by its symbol's pin number; the two-terminal
 * passives (`Device:R`, `Device:C`, `Device:C_Polarized`, `Device:L`, `Device:FerriteBead`, each
 * numbered 1 and 2) and the USB-C receptacle's lettered pins need an entry. For `C_Polarized`, pin 1
 * is the + terminal, so a polarised capacitor's `a` is its + side.
 */
export const MODULE_PIN_NUMBERS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  resistor: { a: "1", b: "2" },
  capacitor: { a: "1", b: "2" },
  inductor: { a: "1", b: "2" },
  connector: Object.fromEntries(
    ["A1", "A4", "A5", "A6", "A7", "A8", "A9", "A12", "B1", "B4", "B5", "B6", "B7", "B8", "B9", "B12", "SH"]
      .map((pin) => [pin, pin]),
  ),
}

function connection(value: string | Connection): Connection {
  return typeof value === "string" ? { kind: "net", net: value } : value
}

function unitPins(pins: Pins): Record<string, Connection> {
  return Object.fromEntries(Object.entries(pins).map(([pin, c]) => [pin, connection(c)]))
}

/** A number is taken as-is (a constant computed elsewhere, e.g. `VDDA_RULED`); a string is parsed. */
function quantity(value: number | string): number {
  return typeof value === "number" ? value : parseValue(value)
}

export function resistor(id: string, value: number | string, a: string, b: string, part: PartSpec, source: string): Component {
  return { id, kind: "resistor", parameters: { ohms: quantity(value) }, part, pins: {}, units: [{ name: "MAIN", pins: unitPins({ a, b }) }], provenance: { source } }
}

export function capacitor(id: string, value: number | string, a: string, b: string, part: PartSpec, source: string): Component {
  return { id, kind: "capacitor", parameters: { farads: quantity(value) }, part, pins: {}, units: [{ name: "MAIN", pins: unitPins({ a, b }) }], provenance: { source } }
}

export function inductor(id: string, value: number | string, a: string, b: string, part: PartSpec, source: string): Component {
  return { id, kind: "inductor", parameters: { henries: quantity(value) }, part, pins: {}, units: [{ name: "MAIN", pins: unitPins({ a, b }) }], provenance: { source } }
}

/** An `ic` or a `connector`: its pins are the symbol's pin numbers (or a receptacle's letters). */
export function part(id: string, kind: "ic" | "connector", pins: Pins, spec: PartSpec, source: string): Component {
  return { id, kind, parameters: {}, part: spec, pins: {}, units: [{ name: "MAIN", pins: unitPins(pins) }], provenance: { source } }
}

/** A momentary push button, pins 1 and 2: pressed joins them, released joins nothing. */
export function pushButton(id: string, one: string, two: string, spec: PartSpec, source: string): Component {
  return {
    id, kind: "switch",
    parameters: { positions: ["released", "pressed"], contacts: { released: [], pressed: [["1", "2"]] } },
    part: spec, pins: {}, units: [{ name: "MAIN", pins: unitPins({ "1": one, "2": two }) }], provenance: { source },
  }
}

/** The block: its parts, and one port per shared net, named by that net. Validates (`done()`). */
export function block(components: readonly Component[], ports: readonly string[]): Network {
  const b = circuit()
  for (const c of components) b.add(c)
  for (const p of ports) b.port(p, p)
  return b.done()
}
