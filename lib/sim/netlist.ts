import type { ResolvedNetwork } from "../model/control-state.ts"
import { twoPinElements } from "../model/resolved-two-pin.ts"
import type { ComponentKind, Parameters } from "../model/types.ts"

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

export interface SimulationEnvironment {
  readonly source: SourceModel
  readonly load: LoadModel
  readonly sweep: SweepModel
  /** Port name carrying the reference node; becomes SPICE node 0. */
  readonly groundPort: string
}

/** This emitter predates active devices and only knows how to emit two-terminal
 * passives (see `resolved-two-pin.ts`). Active-device emission - unit lowering,
 * subcircuit `X` lines, device models - is a later task's job, not this one's.
 */
type PassiveKind = "resistor" | "capacitor" | "inductor"

function isPassiveKind(kind: ComponentKind): kind is PassiveKind {
  return kind === "resistor" || kind === "capacitor" || kind === "inductor"
}

const PREFIX: Readonly<Record<PassiveKind, string>> = {
  resistor: "R",
  capacitor: "C",
  inductor: "L",
}

const VALUE_FIELD: Readonly<Record<PassiveKind, string>> = {
  resistor: "ohms",
  capacitor: "farads",
  inductor: "henries",
}

/** `Parameters` is not tied to `kind` (see `validate.ts`'s `checkParameters` for why),
 * so a numeric parameter is read generically rather than narrowed with a cast.
 */
function numericParameter(parameters: Parameters, field: string, ref: string): number {
  const value: unknown = Reflect.get(parameters, field)
  if (typeof value !== "number") {
    throw new Error(`component "${ref}": missing or non-numeric parameter "${field}"`)
  }
  return value
}

/** Synthetic component/net names the emitter itself introduces. `LOAD_RESISTOR_NAME`,
 * `LOAD_CAPACITOR_NAME`, and `SERIES_RESISTOR_NAME` are component names, checked against
 * the component-name registry so a collision is caught rather than silently overwriting
 * a line. `SOURCE_INTERNAL_NODE` is a net name, a different SPICE namespace, and is
 * pre-seeded into the node registry (when a series resistor makes it a real node) so a
 * network net that emits as the same node collides loudly through the same path as any
 * other node collision.
 */
const LOAD_RESISTOR_NAME = "RLOAD"
const LOAD_CAPACITOR_NAME = "CLOAD"
const SERIES_RESISTOR_NAME = "RSRC"
const SOURCE_INTERNAL_NODE = "n_src_internal"

/** Replaces any character outside [A-Za-z0-9] with "_". */
function sanitize(name: string): string {
  return name.replace(/[^A-Za-z0-9]/g, "_")
}

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

/** Applies the type-letter prefix only when the sanitized ref does not already begin
 * with the correct type letter, case-insensitively. `R1` stays `R1`; `P1.ccw-wiper`
 * (a resolved pot section) becomes `RP1_ccw_wiper`.
 */
function elementName(kind: PassiveKind, ref: string): string {
  const sanitized = sanitize(ref)
  const letter = PREFIX[kind]
  if (sanitized.charAt(0).toUpperCase() === letter) return sanitized
  return `${letter}${sanitized}`
}

function valueOf(kind: PassiveKind, parameters: Parameters, ref: string): number {
  return numericParameter(parameters, VALUE_FIELD[kind], ref)
}

/** Registers an emitted component name against the ref that produced it, throwing
 * naming both refs when two distinct refs collide on the same emitted name.
 */
function reserveName(registry: Map<string, string>, name: string, ref: string): void {
  const existing = registry.get(name)
  if (existing !== undefined && existing !== ref) {
    throw new Error(`Emitted netlist name collision on ${name} between refs: ${existing} and ${ref}`)
  }
  registry.set(name, ref)
}

/** Turns a resolved passive network plus an explicitly declared simulation environment
 * into a complete SPICE deck: title line, source (with optional series resistor),
 * element lines, load, `.ac` line, and `.end`. Source and load models are required
 * inputs and are never defaulted.
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
  lines.push(`V1 ${sourceOutputNode} 0 AC ${environment.source.amplitude.toExponential(12)}`)
  if (seriesOhms !== 0) {
    reserveName(names, SERIES_RESISTOR_NAME, "source series resistor")
    lines.push(`${SERIES_RESISTOR_NAME} ${sourceOutputNode} ${node(sourceNet)} ${seriesOhms.toExponential(12)}`)
  }

  let shorts = 0
  for (const element of twoPinElements(network)) {
    const ref = element.component.id
    const kind = element.component.kind
    if (!isPassiveKind(kind)) {
      throw new Error(`Component kind not supported by this netlist emitter yet: ${kind} (${ref})`)
    }
    const value = valueOf(kind, element.component.parameters, ref)
    // A zero-ohm element is an ideal short, which SPICE cannot express as a
    // resistor — ngspice silently substitutes 1e-12 and warns. The standard
    // idiom is a zero-volt source, which is exact rather than approximate.
    // Resolved potentiometer sections are legitimately zero at a control
    // extreme, so this is a normal case, not an error.
    if (kind === "resistor" && value === 0) {
      const a = node(element.pins.a)
      const b = node(element.pins.b)
      // Both ends already on one node: the short is implicit and emitting a
      // source across it would be a shorted VSRC, which ngspice rejects.
      if (a === b) continue
      const name = `VSHORT${shorts++}`
      reserveName(names, name, ref)
      lines.push(`${name} ${a} ${b} DC 0`)
      continue
    }
    const name = elementName(kind, ref)
    reserveName(names, name, ref)
    lines.push(`${name} ${node(element.pins.a)} ${node(element.pins.b)} ${value.toExponential(12)}`)
  }

  reserveName(names, LOAD_RESISTOR_NAME, "load resistor")
  lines.push(`${LOAD_RESISTOR_NAME} ${node(loadNet)} 0 ${environment.load.ohms.toExponential(12)}`)
  if (environment.load.farads !== undefined) {
    reserveName(names, LOAD_CAPACITOR_NAME, "load capacitor")
    lines.push(`${LOAD_CAPACITOR_NAME} ${node(loadNet)} 0 ${environment.load.farads.toExponential(12)}`)
  }

  lines.push(`.ac dec ${environment.sweep.pointsPerDecade} ${environment.sweep.startHz} ${environment.sweep.stopHz}`)
  lines.push(".end")

  return `${lines.join("\n")}\n`
}
