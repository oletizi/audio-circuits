/**
 * The module's 3V3 capacitance (MODULE-BUCK-LOOP-STARTUP, the half this settles): every
 * capacitor the buck charges at start-up, at nominal, summed.
 *
 * Why it is a sum over a domain and not over the parts list: `power.md` :183 takes the module's
 * "whole 3V3 capacitance, <= 150 uF" (ruling R-50) for Q_MSW's switch-on figure, and `analog.md`
 * :298 says the VDDA bank counts toward it. The VDDA bank and damping leg sit behind FB_VDDA and
 * a 0.30 ohm resistor, so a sum over "capacitors on the 3V3 net" would miss 42.2 uF of them.
 *
 * The domain is found by topology (issue 31, finding 1): start from the 3V3 net and walk through
 * two-terminal resistors and inductors (a ferrite bead is an inductor in this model). Every net
 * reached is in the domain, and every capacitor with a pin on a domain net counts, once. The walk
 * stops at GND (a reference, not a node the buck charges), at an `ic`, connector or switch (the
 * walk never goes through an `ic`: the MCU's VCAP is charged by the MCU's internal regulator and
 * is out of the domain, and `domainNets` says so by omission), and at a capacitor (DC does not
 * pass it).
 *
 * Two deliberate over-counts, both in the safe direction for an upper bound: a capacitor with one
 * pin in the domain and the other on a net the walk reaches only because it crossed an inductor
 * (the buck's own L_BUCK reaches the SW node, so C_BST counts 100 nF) is counted at full value,
 * and every value is nominal, not derated.
 *
 * Refusals: a capacitor with no value; a component on a domain net that is neither a stop, a
 * walked resistor or inductor, a capacitor, nor listed with a reason in `knownNonCapacitive`
 * (a diode on 3V3 has junction capacitance this sum does not carry; it is refused until someone
 * states what to do with it).
 */
import type { Component, Network } from "../../lib/model/index.ts"

/** The module's 3V3 net: the contract's pin 38 net (module-interface.json, "3V3_D"). */
export const MODULE_3V3_NET = "3V3_D"

/** Ruling R-50: the module's whole 3V3 capacitance, an S2 module requirement. */
export const MODULE_3V3_LIMIT_F = 150e-6

const GROUND = "GND"

export interface CapacitanceEntry {
  readonly id: string
  readonly nominal_F: number
  /** The resistors and inductors walked through, in order, to reach this capacitor's nearest pin. */
  readonly via: readonly string[]
}

export interface ModuleCapacitance {
  readonly total_F: number
  readonly entries: readonly CapacitanceEntry[]
}

function pinNets(c: Component): readonly string[] {
  const nets: string[] = []
  for (const conn of [...Object.values(c.pins), ...c.units.flatMap((u) => Object.values(u.pins))]) {
    if (conn.kind === "net") nets.push(conn.net)
  }
  return nets
}

function farads(c: Component): number {
  const p = c.parameters
  if (!("farads" in p) || typeof p.farads !== "number" || !Number.isFinite(p.farads)) {
    throw new Error(`capacitor "${c.id}" is on the module's 3V3 domain and has no capacitance value: give it a "farads" parameter, because the 150 uF sum cannot skip it`)
  }
  return p.farads
}

/**
 * The capacitance the buck charges, found by walking from `rootNet` (default `MODULE_3V3_NET`) through
 * resistors and inductors. `knownNonCapacitive` maps a component id to the reason it is on a domain
 * net and carries no capacitance this sum should count.
 */
export function moduleCapacitance3v3(
  network: Network,
  knownNonCapacitive: Readonly<Record<string, string>> = {},
  rootNet: string = MODULE_3V3_NET,
): ModuleCapacitance {
  if (!network.components.some((c) => pinNets(c).includes(rootNet))) {
    throw new Error(`the network has no net "${rootNet}": the 3V3 capacitance walk starts there (MODULE_3V3_NET, the contract's 3V3_D); name the module's 3V3 net that, because a sum over no net would read 0 uF and pass`)
  }
  // net -> the walked parts that reached it
  const via = new Map<string, readonly string[]>([[rootNet, []]])
  const queue = [rootNet]
  while (queue.length > 0) {
    const net = queue.shift()
    if (net === undefined) break
    const here = via.get(net) ?? []
    for (const c of network.components) {
      if (c.kind !== "resistor" && c.kind !== "inductor") continue
      const nets = pinNets(c)
      if (!nets.includes(net)) continue
      for (const other of nets) {
        if (other === GROUND || via.has(other)) continue
        via.set(other, [...here, c.id])
        queue.push(other)
      }
    }
  }

  const entries: CapacitanceEntry[] = []
  for (const c of network.components) {
    const nets = pinNets(c).filter((n) => via.has(n) && n !== GROUND)
    if (nets.length === 0) continue
    switch (c.kind) {
      case "resistor":
      case "inductor":
      case "ic":
      case "connector":
      case "switch":
        break // walked through, or a stop
      case "capacitor": {
        const first = nets.map((n) => via.get(n) ?? []).sort((a, b) => a.length - b.length)[0] ?? []
        entries.push({ id: c.id, nominal_F: farads(c), via: first })
        break
      }
      default:
        if (knownNonCapacitive[c.id] === undefined) {
          throw new Error(`component "${c.id}" (${c.kind}) is on the module's 3V3 capacitance domain (net ${nets.join(", ")}) and the sum cannot say what capacitance it adds: if it carries none, list it in knownNonCapacitive with the reason; if it carries some, the sum needs its value, not a guess`)
        }
    }
  }
  return { total_F: entries.reduce((s, e) => s + e.nominal_F, 0), entries }
}

/**
 * Refuses a network whose 3V3 capacitance exceeds R-50's 150 uF. Takes and forwards both of
 * `moduleCapacitance3v3`'s optional parameters, so the sum it checks is the sum that function gives.
 */
export function assertModuleCapacitanceWithinLimit(
  network: Network,
  knownNonCapacitive: Readonly<Record<string, string>> = {},
  rootNet: string = MODULE_3V3_NET,
): ModuleCapacitance {
  const sum = moduleCapacitance3v3(network, knownNonCapacitive, rootNet)
  if (sum.total_F > MODULE_3V3_LIMIT_F) {
    const uF = (sum.total_F * 1e6).toFixed(2)
    throw new Error(`the module's 3V3 capacitance is ${uF} uF, over ruling R-50's 150 uF (power.md FIG-QMSW-TJ assumes it): remove capacitance or re-run Q_MSW's switch-on figure with the new total`)
  }
  return sum
}
