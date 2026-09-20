import type { ResolvedElement, ResolvedNetwork } from "../passives/control-state.ts"

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

const PREFIX: Readonly<Record<ResolvedElement["kind"], string>> = {
  resistor: "R",
  capacitor: "C",
  inductor: "L",
}

/** Synthetic component/net names the emitter itself introduces. Kept visually distinct
 * from anything `sanitize` would produce from a user ref so a collision is unlikely, and
 * always run through the same collision registry as element-derived names so a collision
 * that does occur is caught rather than silently overwriting a line.
 */
const LOAD_RESISTOR_NAME = "RLOAD"
const LOAD_CAPACITOR_NAME = "CLOAD"
const SERIES_RESISTOR_NAME = "RSRC"
const SOURCE_INTERNAL_NODE = "n_src_internal"

/** Replaces any character outside [A-Za-z0-9] with "_". */
function sanitize(name: string): string {
  return name.replace(/[^A-Za-z0-9]/g, "_")
}

function resolvePort(network: ResolvedNetwork, portKey: string, label: string): string {
  const net = network.ports[portKey]
  if (net === undefined) throw new Error(`${label} port not present in network: ${portKey}`)
  return net
}

/** Every net equal to the declared ground net emits as SPICE node 0. */
function resolveNet(net: string, groundNet: string): string {
  return net === groundNet ? "0" : sanitize(net)
}

/** Applies the type-letter prefix only when the sanitized ref does not already begin
 * with the correct type letter, case-insensitively. `R1` stays `R1`; `P1.ccw-wiper`
 * (a resolved pot section) becomes `RP1_ccw_wiper`.
 */
function elementName(kind: ResolvedElement["kind"], ref: string): string {
  const sanitized = sanitize(ref)
  const letter = PREFIX[kind]
  if (sanitized.charAt(0).toUpperCase() === letter) return sanitized
  return `${letter}${sanitized}`
}

function valueOf(element: ResolvedElement): string {
  if (element.kind === "resistor") return element.parameters.ohms.toExponential(12)
  if (element.kind === "capacitor") return element.parameters.farads.toExponential(12)
  return element.parameters.henries.toExponential(12)
}

/** Registers an emitted component name against the ref that produced it, throwing
 * naming both refs when two distinct refs collide on the same emitted name.
 */
function reserveName(registry: Map<string, string>, name: string, ref: string): void {
  const existing = registry.get(name)
  if (existing !== undefined && existing !== ref) {
    throw new Error(`Emitted netlist name collision on "${name}" between refs "${existing}" and "${ref}"`)
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

  const node = (net: string): string => resolveNet(net, groundNet)
  const names = new Map<string, string>()
  const lines: string[] = ["Pultec modularize AC network"]

  const seriesOhms = environment.source.seriesOhms
  const sourceOutputNode = seriesOhms !== 0 ? SOURCE_INTERNAL_NODE : node(sourceNet)
  lines.push(`V1 ${sourceOutputNode} 0 AC ${environment.source.amplitude.toExponential(12)}`)
  if (seriesOhms !== 0) {
    reserveName(names, SERIES_RESISTOR_NAME, "source series resistor")
    lines.push(`${SERIES_RESISTOR_NAME} ${sourceOutputNode} ${node(sourceNet)} ${seriesOhms.toExponential(12)}`)
  }

  for (const element of network.elements) {
    const name = elementName(element.kind, element.ref)
    reserveName(names, name, element.ref)
    lines.push(`${name} ${node(element.pins.a)} ${node(element.pins.b)} ${valueOf(element)}`)
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
