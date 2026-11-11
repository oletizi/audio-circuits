/**
 * The carrier's USB_VBUS_SENSE node (contract pin 31, PA1) at a USB-C plug-in: the windows R-57's
 * sense-node capacitor holds PA1 under the unpowered FT limits, and the time a minimum VBUS takes to
 * reach VIH through it. Every value is read from the network; the bases are stated beside each
 * constant and are the ones analog.md FIG-VBUS-HOTPLUG and architecture.md section 4.8 (pin 31 row)
 * already use, so nothing here is derated twice.
 *
 * NOT SHOWN, and why the open item stays open: whether a real host and cable stay inside these
 * windows. A lossless ring is not a step held at its peak; FIG-VBUS-HOTPLUG says a ring spends only
 * part of each cycle near it, and no document read gives a host's source impedance or a cable's L
 * and R. VBUS-HOTPLUG closes on a host-and-cable model or the bring-up scope of PA1 (IF-PD-1-MEASURE).
 */
import type { CapacitorComponent, Component, Network, ResistorComponent } from "../../lib/model/types.ts"

/** VBUS held at the lossless-ring bound, 2 x 5.555 V (FIG-VBUS-HOTPLUG). */
export const VBUS_RING_BOUND_V = 11.11
/** vSafe5V maximum taken 1 % high, 5.50 V x 1.01 (architecture.md section 4.8, pin 31 row). */
export const VBUS_STEADY_MAX_V = 5.555
/** Lowest VBUS the divider must still read high at (architecture.md section 4.8, pin 31 row). */
export const VBUS_MIN_V = 4.35
/** PA1 input-high threshold the pin 31 row checks against. */
export const PA1_VIH_V = 2.52
/** The unpowered FT limits FIG-VBUS-HOTPLUG states windows for. */
export const PA1_LIMITS_V = [3.6, 4.0] as const
/** The divider resistors' tolerance (architecture.md:257, 1 %). */
const R_TOL = 0.01
/** R-57's least-effective ceramic: tolerance 0.9 x X7R over temperature 0.85 x DC bias 0.5. */
const C_LEAST_FACTOR = 0.9 * 0.85 * 0.5
/** The most a 10 % X7R part can be; temperature and bias only lower it. */
const C_MOST_FACTOR = 1.1

export interface HotplugWindow {
  /** The limit PA1 stays under, volts. */
  readonly limitV: number
  /** From the steady 5.555 V level (the shorter window, the one FIG-VBUS-HOTPLUG quotes), seconds. */
  readonly fromSteadyS: number
  /** From VBUS = 0 V at plug-in, seconds. */
  readonly fromZeroS: number
}

export interface VbusSenseAnalysis {
  /** Highest divider ratio, top -1 %, bottom +1 %. */
  readonly ratioMax: number
  /** Lowest divider ratio, top +1 %, bottom -1 %. */
  readonly ratioMin: number
  /** The sense capacitor at R-57's least-effective basis, farads. */
  readonly cLeastF: number
  /** Shortest time constant: the least Thevenin resistance over the tolerance corners x cLeastF. */
  readonly tauMinS: number
  /** Longest time constant: the most Thevenin resistance x the most capacitance. */
  readonly tauMaxS: number
  /** PA1 settled at the steady maximum VBUS, volts. */
  readonly steadyMaxV: number
  /** PA1 settled at the lowest VBUS, volts. */
  readonly steadyMinV: number
  readonly windows: readonly HotplugWindow[]
  /** Time from VBUS = VBUS_MIN_V applied to PA1 crossing VIH, on the longest time constant, seconds. */
  readonly detectS: number
}

function only(network: Network, id: string): Component {
  const c = network.components.find((x) => x.id === id)
  if (c === undefined) throw new Error(`vbus-sense: the network has no "${id}"; the analysis reads its value from the model`)
  return c
}

const isResistor = (c: Component): c is ResistorComponent => c.kind === "resistor"
const isCapacitor = (c: Component): c is CapacitorComponent => c.kind === "capacitor"

function ohms(network: Network, id: string): number {
  const c = only(network, id)
  if (!isResistor(c)) throw new Error(`vbus-sense: "${id}" is a ${c.kind}, not the divider resistor this reads`)
  return c.parameters.ohms
}

function farads(network: Network, id: string): number {
  const c = only(network, id)
  if (!isCapacitor(c)) throw new Error(`vbus-sense: "${id}" is a ${c.kind}, not the sense capacitor this reads`)
  return c.parameters.farads
}

const parallel = (a: number, b: number): number => (a * b) / (a + b)

/** Time for a first-order node rising from v0 toward vFinal to reach v. */
function riseTime(tau: number, v0: number, vFinal: number, v: number): number {
  if (!(v0 < v && v < vFinal)) throw new Error(`vbus-sense: ${v} V is not between the start ${v0} V and the final ${vFinal} V`)
  return tau * Math.log((vFinal - v0) / (vFinal - v))
}

/** The plug-in analysis of the carrier's sense node, from `r_vbus_top`, `r_vbus_bot` and `c_vbus_sense`. */
export function vbusSenseAnalysis(network: Network): VbusSenseAnalysis {
  const top = ohms(network, "r_vbus_top")
  const bot = ohms(network, "r_vbus_bot")
  const c = farads(network, "c_vbus_sense")
  const tops = [top * (1 - R_TOL), top * (1 + R_TOL)]
  const bots = [bot * (1 - R_TOL), bot * (1 + R_TOL)]
  const corners = tops.flatMap((t) => bots.map((b) => ({ ratio: b / (t + b), rth: parallel(t, b) })))
  const ratioMax = Math.max(...corners.map((k) => k.ratio))
  const ratioMin = Math.min(...corners.map((k) => k.ratio))
  const cLeastF = c * C_LEAST_FACTOR
  // Each bound takes its worst case independently of the other: the fastest rise pairs the least
  // Thevenin with the highest ratio even though no single corner has both.
  const tauMinS = Math.min(...corners.map((k) => k.rth)) * cLeastF
  const tauMaxS = Math.max(...corners.map((k) => k.rth)) * c * C_MOST_FACTOR
  const peak = VBUS_RING_BOUND_V * ratioMax
  const steadyMaxV = VBUS_STEADY_MAX_V * ratioMax
  const steadyMinV = VBUS_MIN_V * ratioMin
  const windows = PA1_LIMITS_V.map((limitV) => ({
    limitV,
    fromSteadyS: riseTime(tauMinS, steadyMaxV, peak, limitV),
    fromZeroS: riseTime(tauMinS, 0, peak, limitV),
  }))
  return {
    ratioMax, ratioMin, cLeastF, tauMinS, tauMaxS, steadyMaxV, steadyMinV, windows,
    detectS: riseTime(tauMaxS, 0, steadyMinV, PA1_VIH_V),
  }
}
