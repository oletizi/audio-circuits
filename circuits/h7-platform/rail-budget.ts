/**
 * The carrier's worst-case draw on the module's two output rails, per supported state.
 *
 * LIMITS. 3V3_D: 25 mA continuous, all loads together (docs/h7-platform/power.md:395, section 5.4).
 * VREF_A: 10 mA continuous (architecture.md:227). They bound the carrier's AGGREGATE draw, so
 * `railDraw` sums every component with a pin on the rail and REFUSES any that has no entry in
 * `RAIL_LOADS`, naming it: a load added to a rail without a stated current must not be left out
 * of the sum (plan review focus 6).
 *
 * RESISTOR CURRENTS are computed from the resistor's value READ FROM THE NETWORK, at -1 % and the
 * rails' 3.513 V maximum (power.md:378: the module buck's 3.274-3.513 V range; VREF_A is the same
 * 3V3 through the module's VDDA ferrite, architecture.md:227). No resistor value is copied here.
 *
 * Each entry takes the network as well as the state, because the value it reads lives there.
 * Every combination of the three state flags is supported (controller ruling CR-CARRIER-DUMMY-LOADS).
 */
import type { Component, Network } from "../../lib/model/index.ts"

export type Rail = "3V3_D" | "VREF_A"

export interface CarrierState {
  /** The 3V3_D dummy-load jumper is fitted. */
  readonly dummy3v3d: boolean
  /** The VREF_A dummy-load jumper is fitted. */
  readonly dummyVrefA: boolean
  /** Firmware holds USB_EN_N (OE) low, closing the USB isolation switch. */
  readonly usbEnabled: boolean
}

export interface RailLoad {
  /** Where the figure comes from. */
  readonly source: string
  /** Worst-case current in amps drawn from the rail by this component. */
  readonly amps: (state: CarrierState, network: Network) => number
}

/** power.md:378: the module buck's output maximum, 3.513 V. */
export const RAIL_MAX_V = 3.513
/** 1 % resistors at their low end. */
const RESISTOR_LOW = 0.99

/** TI SCDS220M p. 5, section 5.5 (VCC 3.6 V): I_CC max 30 uA, switch on or off, control inputs at VCC or GND. */
const TS3USB221_ICC_A = 30e-6
/** Same table: Delta-I_CC max 20 uA per control input at 1.8 V (VCC 3.6 V), allowed for both S and OE. */
const TS3USB221_DELTA_ICC_A = 20e-6
const TS3USB221_CONTROL_INPUTS = 2
/** Same table: I_IN, control inputs, +/-1 uA, the OE input current drawn through the pull-up. */
const TS3USB221_IIN_A = 1e-6

function connectionsOf(c: Component): [string, string][] {
  const out: [string, string][] = []
  for (const pins of [c.pins, ...c.units.map((u) => u.pins)]) {
    for (const [pin, conn] of Object.entries(pins)) if (conn.kind === "net") out.push([pin, conn.net])
  }
  return out
}

function component(network: Network, id: string): Component {
  const found = network.components.find((c) => c.id === id)
  if (found === undefined) throw new Error(`rail budget: component "${id}" is not in the network`)
  return found
}

function ohms(c: Component): number {
  const value: unknown = Reflect.get(c.parameters, "ohms")
  if (c.kind !== "resistor" || typeof value !== "number") {
    throw new Error(`rail budget: "${c.id}" is not a resistor with a numeric ohms value, so its current cannot be computed`)
  }
  return value
}

/** Worst-case current through a 1 % resistor across the full rail maximum. */
export function worstResistorAmps(resistorOhms: number): number {
  return RAIL_MAX_V / (resistorOhms * RESISTOR_LOW)
}

/**
 * The dummy resistor behind a jumper: the one resistor on the jumper's far net, whose other pin
 * is on GND. Refuses anything else, because a dummy load of any other shape is not what the
 * worst-case formula describes.
 */
export function dummyResistorBehind(network: Network, jumperId: string, rail: Rail): Component {
  const far = connectionsOf(component(network, jumperId)).filter(([, n]) => n !== rail).map(([, n]) => n)
  if (far.length !== 1) throw new Error(`rail budget: jumper "${jumperId}" must have exactly one pin off ${rail}, found ${far.length}`)
  const farNet = far[0] ?? ""
  const loads = network.components.filter((c) => c.id !== jumperId && connectionsOf(c).some(([, n]) => n === farNet))
  const only = loads[0]
  if (loads.length !== 1 || only === undefined) {
    throw new Error(`rail budget: net "${farNet}" behind jumper "${jumperId}" must hold exactly one resistor, found ${loads.map((c) => c.id).join(", ") || "none"}`)
  }
  const nets = connectionsOf(only).map(([, n]) => n).sort()
  if (only.kind !== "resistor" || nets.join(",") !== [farNet, "GND"].sort().join(",")) {
    throw new Error(`rail budget: "${only.id}" behind jumper "${jumperId}" must be a resistor from ${farNet} to GND`)
  }
  return only
}

const ZERO = (why: string): RailLoad => ({ source: why, amps: () => 0 })
const SOURCE = ZERO("the module socket: the rail's source, not a load")
const BREAKOUT = ZERO("a breakout header pin: no DC path on the carrier (it carries whatever a user clips on, which is outside this budget)")
const TEST_POINT = ZERO("a probe test point: no DC path")

function dummy(jumperId: string, rail: Rail, fitted: (s: CarrierState) => boolean): RailLoad {
  return {
    source: `the dummy load behind ${jumperId}: ${RAIL_MAX_V} V / (R x 0.99), R read from the network, when fitted (ruling CR-CARRIER-DUMMY-LOADS)`,
    amps: (s, n) => (fitted(s) ? worstResistorAmps(ohms(dummyResistorBehind(n, jumperId, rail))) : 0),
  }
}

export const RAIL_LOADS: Readonly<Record<Rail, Readonly<Record<string, RailLoad>>>> = {
  "3V3_D": {
    j_mod_b: SOURCE,
    brk_b: BREAKOUT,
    tp_3v3d: TEST_POINT,
    c_usbsw: ZERO("decoupling capacitor: no DC path"),
    u_usbsw: {
      source: "TS3USB221 I_CC 30 uA + Delta-I_CC 20 uA x 2 control inputs + I_IN 1 uA (SCDS220M p. 5, section 5.5), in every state: the switch is powered whenever 3V3_D is up",
      amps: () => TS3USB221_ICC_A + TS3USB221_DELTA_ICC_A * TS3USB221_CONTROL_INPUTS + TS3USB221_IIN_A,
    },
    r_usben: {
      source: `R_USBEN with OE held at 0 V when USB is enabled: ${RAIL_MAX_V} V / (R x 0.99), R read from the network (R-14: 0.35 mA); 0 otherwise, OE then sitting at 3V3_D`,
      amps: (s, n) => (s.usbEnabled ? worstResistorAmps(ohms(component(n, "r_usben"))) : 0),
    },
    j_dummy_3v3d: dummy("j_dummy_3v3d", "3V3_D", (s) => s.dummy3v3d),
  },
  VREF_A: {
    j_mod_b: SOURCE,
    brk_b: BREAKOUT,
    tp_vref_a: TEST_POINT,
    j_dummy_vref_a: dummy("j_dummy_vref_a", "VREF_A", (s) => s.dummyVrefA),
  },
}

/** The carrier's worst-case draw on `rail` in `state`, in amps. Refuses an unbudgeted load. */
export function railDraw(network: Network, rail: Rail, state: CarrierState): number {
  const table = RAIL_LOADS[rail]
  let total = 0
  for (const c of network.components) {
    if (!connectionsOf(c).some(([, n]) => n === rail)) continue
    const entry = table[c.id]
    if (entry === undefined) {
      throw new Error(
        `rail budget: component "${c.id}" has a pin on ${rail} but no RAIL_LOADS["${rail}"] entry. ` +
          "Every part on the rail must state its worst-case current (0 with a reason, if it draws none); " +
          "leaving it out would understate the aggregate the contract limit bounds.",
      )
    }
    total += entry.amps(state, network)
  }
  return total
}
