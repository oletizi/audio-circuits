/**
 * A resolved network plus a declared simulation environment, assembled into a
 * complete SPICE deck.
 *
 * This file owns the DECK: its source, its DC rails, its load, its node and
 * element-name registries, the model texts it has to carry, and its analysis
 * card. What any one component BECOMES is `device-lines.ts`'s job, and the two
 * meet at `emitUnit` and the `DeckState` it writes into.
 */
import type { ResolvedNetwork } from "../model/control-state.ts"
import { emitUnit, reserveName, sanitize, spiceNodeName } from "./device-lines.ts"
import type { DeckState } from "./device-lines.ts"

/** Re-exported from `device-lines.ts`, where the net-name-to-node rule lives beside
 * the rest of the emitted-name handling. A consumer holding a deck wants it from the
 * module that produced the deck, so the name stays reachable here. */
export { spiceNodeName }

export interface SourceModel {
  /** Port name in the network's ports map. */
  readonly port: string
  readonly amplitude: number
  readonly seriesOhms: number
}

export interface LoadModel {
  readonly port: string
  readonly ohms: number
  readonly farads?: number
}

export interface SweepModel {
  readonly pointsPerDecade: number
  readonly startHz: number
  readonly stopHz: number
}

/** A DC supply rail the deck drives, named by the port that carries it.
 *
 * Required because an active device's supply pins have to come from somewhere.
 * A rail whose only elements are decoupling capacitors and an op-amp's supply
 * pins has no DC path to the reference node, and ngspice refuses the whole
 * analysis with "singular matrix: check node <rail>" - measured, see
 * lib/sim/models/GENERIC_OPAMP.spice. The circuit is not wrong in that case;
 * the deck is simply missing the power supply that the circuit's power
 * connector would be wired to, and a simulation environment is exactly where
 * that belongs.
 */
export interface SupplyModel {
  /** Port name in the network's ports map. */
  readonly port: string
  readonly volts: number
}

export interface SimulationEnvironment {
  readonly source: SourceModel
  readonly load: LoadModel
  /** DC rails the deck drives. Required, never defaulted: a deck with no
   * supplies is a deliberate `[]`, not an omission. */
  readonly supplies: readonly SupplyModel[]
  readonly sweep: SweepModel
  /** Port name carrying the reference node; becomes SPICE node 0. */
  readonly groundPort: string
}

/** Synthetic component/net names the emitter itself introduces. `LOAD_RESISTOR_NAME`,
 * `LOAD_CAPACITOR_NAME`, and `SERIES_RESISTOR_NAME` are component names, checked against
 * the component-name registry so a collision is caught rather than silently overwriting
 * a line. `SOURCE_INTERNAL_NODE` is a net name, a different SPICE namespace, and is
 * pre-seeded into the node registry (when a series resistor makes it a real node) so a
 * network net that emits as the same node collides loudly through the same path as any
 * other node collision.
 */
const SOURCE_NAME = "V1"
const LOAD_RESISTOR_NAME = "RLOAD"
const LOAD_CAPACITOR_NAME = "CLOAD"
const SERIES_RESISTOR_NAME = "RSRC"
const SOURCE_INTERNAL_NODE = "n_src_internal"


/** What produced an emitted SPICE node name. `synthetic` marks a node the emitter
 * introduced itself rather than one derived from a net in the network, so a collision
 * against it can name the synthetic node in its message.
 */
interface NodeOrigin {
  readonly raw: string
  readonly synthetic: boolean
}

function resolvePort(network: ResolvedNetwork, portKey: string, label: string): string {
  const net = network.ports[portKey]
  if (net === undefined) throw new Error(`${label} port not present in network: ${portKey}`)
  return net
}

/** Every net equal to the declared ground net emits as SPICE node 0. Every other net is
 * sanitized and registered, because `sanitize` is lossy: `lf.mid` and `lf-mid` are
 * distinct nets that both emit as `lf_mid`, and without a registry SPICE would silently
 * short them into one node. That is a false PASS in a validation gate — both sides of an
 * unsplit-versus-composed comparison run through the same lossy transform, so the
 * comparison would agree while both decks describe a circuit the labelled model does not.
 *
 * The registry is keyed on the LOWERCASED emitted node because ngspice case-folds node
 * names, so `LF_MID` and `lf_mid` are also one node to the simulator.
 *
 * A non-ground net that sanitizes to `0` is rejected outright: SPICE reserves node 0 for
 * the reference node, so emitting it would silently tie that net to ground.
 */
function registerNode(nodes: Map<string, NodeOrigin>, rawNet: string, groundNet: string): string {
  if (rawNet === groundNet) return "0"
  const emitted = sanitize(rawNet)
  if (emitted === "0") {
    throw new Error(`Non-ground net emits as the SPICE reference node 0: ${rawNet}`)
  }
  const key = emitted.toLowerCase()
  const existing = nodes.get(key)
  if (existing?.synthetic) {
    // Checked before the raw-name comparison: a net literally named `n_src_internal`
    // matches the synthetic entry's raw name exactly and would otherwise slip through.
    throw new Error(
      `Net collides with the synthetic source-series internal node ${SOURCE_INTERNAL_NODE}: ${rawNet}`,
    )
  }
  if (existing !== undefined && existing.raw !== rawNet) {
    throw new Error(`Emitted netlist node collision on ${emitted} between nets: ${existing.raw} and ${rawNet}`)
  }
  nodes.set(key, { raw: rawNet, synthetic: false })
  return emitted
}

/** Turns a resolved network plus an explicitly declared simulation environment into a
 * complete SPICE deck: title line, source (with optional series resistor), one device
 * line per component unit, load, the text of every device model the deck references,
 * the `.ac` line, and `.end`. Source and load models are required inputs and are never
 * defaulted.
 */
export function toSpiceNetlist(network: ResolvedNetwork, environment: SimulationEnvironment): string {
  const groundNet = resolvePort(network, environment.groundPort, "Ground")
  const sourceNet = resolvePort(network, environment.source.port, "Source")
  const loadNet = resolvePort(network, environment.load.port, "Load")

  const nodes = new Map<string, NodeOrigin>()
  const node = (net: string): string => registerNode(nodes, net, groundNet)
  const names = new Map<string, string>()
  const lines: string[] = ["Pultec modularize AC network"]

  const seriesOhms = environment.source.seriesOhms
  if (seriesOhms !== 0) {
    nodes.set(SOURCE_INTERNAL_NODE.toLowerCase(), { raw: SOURCE_INTERNAL_NODE, synthetic: true })
  }
  const sourceOutputNode = seriesOhms !== 0 ? SOURCE_INTERNAL_NODE : node(sourceNet)
  // Registered like any other emitted element name: the supply rails below are
  // also `V` lines named from their port, so "V1" has to be taken rather than
  // merely conventional, or a supply on a port named "1" would silently
  // duplicate the source line.
  reserveName(names, SOURCE_NAME, "AC source")
  lines.push(`${SOURCE_NAME} ${sourceOutputNode} 0 AC ${environment.source.amplitude.toExponential(12)}`)
  if (seriesOhms !== 0) {
    reserveName(names, SERIES_RESISTOR_NAME, "source series resistor")
    lines.push(`${SERIES_RESISTOR_NAME} ${sourceOutputNode} ${node(sourceNet)} ${seriesOhms.toExponential(12)}`)
  }

  // DC rails, before any device line that references them. A rail is named for
  // its port so the deck reads back to the environment that asked for it, and
  // is registered in the component-name registry like every other element, so
  // a collision with a network component is caught rather than silently
  // overwriting a line.
  const suppliedPorts = new Set<string>()
  for (const supply of environment.supplies) {
    if (suppliedPorts.has(supply.port)) {
      throw new Error(`Duplicate supply port: ${supply.port}`)
    }
    suppliedPorts.add(supply.port)
    const supplyNet = resolvePort(network, supply.port, "Supply")
    if (supplyNet === groundNet) {
      throw new Error(
        `Supply port "${supply.port}" names the ground net "${groundNet}", which would emit a ` +
          `voltage source shorted across node 0`,
      )
    }
    // A rail landing on the signal source's net or the measured net is refused. The
    // source case is loud on its own (two voltage sources on one node, which ngspice
    // rejects), but the LOAD case is worse than an error: the measured node would be
    // held by an ideal DC source whose AC value is zero, so every gain in the sweep
    // reads exactly 0 with no error raised anywhere. A wrong number is the one outcome
    // this emitter must never produce quietly.
    if (supplyNet === sourceNet) {
      throw new Error(
        `Supply port "${supply.port}" names the source net "${sourceNet}", so the rail and the ` +
          `signal source would both drive one node`,
      )
    }
    if (supplyNet === loadNet) {
      throw new Error(
        `Supply port "${supply.port}" names the load net "${loadNet}", so the measured node would ` +
          `be held by a DC rail and every measured response would read zero`,
      )
    }
    const supplyName = `V${sanitize(supply.port).toUpperCase()}`
    reserveName(names, supplyName, `supply port ${supply.port}`)
    lines.push(`${supplyName} ${node(supplyNet)} 0 DC ${supply.volts.toExponential(12)}`)
  }

  const modelTexts = new Map<string, string>()
  const state: DeckState = { node, names, lines, modelTexts, shorts: 0 }
  for (const component of network.components) {
    // A component with no units contributes no device line at all, which is the same
    // hazard the kind dispatch's final `else` guards against: it would vanish from the
    // deck with no signal. `control-state.ts` and `validate.ts` both reject it upstream,
    // but a hand-built ResolvedNetwork (every fixture in the netlist tests is one) does
    // not pass through either, so the emitter refuses it where it would do the damage.
    if (component.units.length === 0) {
      throw new Error(`component "${component.id}": declares no units, so it would emit no device line`)
    }
    for (const unit of component.units) emitUnit(state, component, unit)
  }

  reserveName(names, LOAD_RESISTOR_NAME, "load resistor")
  lines.push(`${LOAD_RESISTOR_NAME} ${node(loadNet)} 0 ${environment.load.ohms.toExponential(12)}`)
  if (environment.load.farads !== undefined) {
    reserveName(names, LOAD_CAPACITOR_NAME, "load capacitor")
    lines.push(`${LOAD_CAPACITOR_NAME} ${node(loadNet)} 0 ${environment.load.farads.toExponential(12)}`)
  }

  // Every model the deck references, once each. A device line naming a model the deck
  // does not define is not a partially-specified deck, it is an unsimulatable one, so
  // the model text travels with the line that needs it rather than being left to the
  // caller to remember.
  for (const text of modelTexts.values()) lines.push(text.trimEnd())

  lines.push(`.ac dec ${environment.sweep.pointsPerDecade} ${environment.sweep.startHz} ${environment.sweep.stopHz}`)
  lines.push(".end")

  return `${lines.join("\n")}\n`
}
