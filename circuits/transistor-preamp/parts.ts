/**
 * Parts and builders shared by the transistor preamp boards (the lab board and
 * the collector-feedback board), so both declare their resistors, trim-pots,
 * capacitors, headers and transistor the same way.
 *
 * RHEOSTAT WIRING. Every trim-pot has its wiper strapped to its cw end, with
 * ccw on one node of the leg and wiper+cw on the other. The leg resistance is
 * position x R_trim, rising clockwise. The strap sets the failure mode: an
 * open wiper leaves the whole element in circuit, so every leg fails to its
 * MAXIMUM resistance - never open, never zero.
 */
import { net } from "../../lib/model/index.ts"
import type { Builder, Component, PartSpec } from "../../lib/model/index.ts"
import { parseValue } from "../../lib/model/units.ts"

/** One adjustable leg: an optional jumper, an optional fixed "floor" resistor
 * in series, and a trim-pot wired as a rheostat. */
export interface Leg {
  readonly trimId: string
  /** The trim-pot's full value, e.g. "50k". */
  readonly trim: string
  /** Fixed resistor in series with the trim; absent where the leg has none. */
  readonly floor?: { readonly id: string; readonly value: string }
  /** The jumper that takes the leg out of circuit; absent where the leg is always in. */
  readonly jumperId?: string
}

export const RESISTOR: PartSpec = {
  footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal",
  symbol: "Device:R",
}

/** The operator's parts: Runtron RM-065 style single-turn carbon trimmers,
 * top-adjust, about 6.4 x 7.5 mm (value code on the rotor, e.g. "504" = 500k). */
export const TRIM: PartSpec = {
  mpn: "RM-065",
  footprint: "Potentiometer_THT:Potentiometer_Runtron_RM-065_Vertical",
  symbol: "Device:R_Potentiometer_Trim",
}

export const HEADER_2: PartSpec = {
  footprint: "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical",
  symbol: "Connector_Generic:Conn_01x02",
  electricallyInert: true,
}

/** Can sizes are typical for the value, not measured; `perfboard check` reports a
 * mismatch against the physical part, which is resolved against the part. */
export function electrolytic(footprint: string): PartSpec {
  return { footprint: `Capacitor_THT:${footprint}`, symbol: "Device:C_Polarized" }
}

/** A trim-pot wired as a rheostat: ccw on `from`, wiper and cw strapped on `to`. */
export function trim(id: string, value: string, from: string, to: string): Component {
  return {
    id, kind: "potentiometer",
    parameters: { ohms: parseValue(value), taper: { type: "linear" } },
    part: TRIM,
    pins: {},
    units: [{ name: "MAIN", pins: { ccw: net(from), wiper: net(to), cw: net(to) } }],
  }
}

/** A 2-pin header and shunt: fitted shorts its pins, removed shorts nothing. */
export function jumper(id: string, a: string, b: string): Component {
  return {
    id, kind: "switch",
    parameters: { positions: ["fitted", "removed"], contacts: { fitted: [["1", "2"]], removed: [] } },
    part: {
      footprint: "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical",
      symbol: "Jumper:Jumper_2_Open",
    },
    pins: {},
    units: [{ name: "MAIN", pins: { "1": net(a), "2": net(b) } }],
  }
}

/** One adjustable leg from `from` to `to`: jumper, then floor, then trim, each where present. */
export function addLeg(builder: Builder, leg: Leg, netPrefix: string, from: string, to: string): void {
  let node = from
  if (leg.jumperId !== undefined) {
    const next = `${netPrefix}_JUMPED`
    builder.add(jumper(leg.jumperId, node, next))
    node = next
  }
  if (leg.floor !== undefined) {
    const next = `${netPrefix}_FLOOR`
    builder.resistor(leg.floor.id, leg.floor.value, { a: node, b: next }, RESISTOR)
    node = next
  }
  builder.add(trim(leg.trimId, leg.trim, node, to))
}

/** A 2N3904, ideally fitted in a socket so devices can be swapped. */
export function transistor2N3904(id: string, base: string, collector: string, emitter: string): Component {
  return {
    id, kind: "bjt", parameters: {},
    part: {
      mpn: "2N3904",
      footprint: "Package_TO_SOT_THT:TO-92_Inline",
      symbol: "Transistor_BJT:2N3904",
    },
    pins: {},
    units: [{
      name: "MAIN",
      pins: { base: net(base), collector: net(collector), emitter: net(emitter) },
      spiceModel: "2N3904",
    }],
  }
}

/**
 * Canonical pin -> KiCad symbol/footprint pin number, by kind. Jumpers,
 * headers and test points already name their pins by number.
 *
 * bjt: Transistor_BJT:2N3904 and Package_TO_SOT_THT:TO-92_Inline are both
 * E-B-C, pins 1-2-3. potentiometer: Device:R_Potentiometer_Trim and the
 * Runtron RM-065 footprint both put the wiper on pin 2.
 */
export const PIN_NUMBERS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  resistor: { a: "1", b: "2" },
  capacitor: { a: "1", b: "2" },
  potentiometer: { ccw: "1", wiper: "2", cw: "3" },
  bjt: { emitter: "1", base: "2", collector: "3" },
}
