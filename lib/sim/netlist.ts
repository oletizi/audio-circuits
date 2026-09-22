import type { ResolvedComponent, ResolvedNetwork, ResolvedUnit } from "../model/control-state.ts"
import { isSpicePrimitive, spicePinOrder } from "../model/kinds.ts"
import type { ComponentKind, Parameters } from "../model/types.ts"
import { deviceModel } from "./models/index.ts"
import type { DeviceModel } from "./models/index.ts"

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

/** Kinds emitted as a value-carrying element line: `<name> <nodes...> <value>`, with
 * the value read from a parameter. `photoresistor` is here because, until a behavioural
 * model replaces it, a photoresistor IS a plain resistance and must say so.
 */
type ValueKind = "resistor" | "capacitor" | "inductor" | "photoresistor"

/** Kinds emitted against a device model: `<name> <nodes...> <MODEL>`, where the model
 * is a `.model` line (diode, bjt) or a `.subckt` (opamp).
 */
type ModelKind = "diode" | "bjt" | "opamp"

/** Every kind this emitter knows how to turn into a device line. A kind outside this
 * union reaches the dispatch's final `else` and throws: a kind that silently stops
 * being emitted leaves a complete, well-formed, entirely wrong netlist.
 */
type EmittedKind = ValueKind | ModelKind

function isValueKind(kind: ComponentKind): kind is ValueKind {
  return kind === "resistor" || kind === "capacitor" || kind === "inductor" || kind === "photoresistor"
}

function isModelKind(kind: ComponentKind): kind is ModelKind {
  return kind === "diode" || kind === "bjt" || kind === "opamp"
}

const PREFIX: Readonly<Record<EmittedKind, string>> = {
  resistor: "R",
  capacitor: "C",
  inductor: "L",
  photoresistor: "R",
  diode: "D",
  bjt: "Q",
  opamp: "X",
}

const VALUE_FIELD: Readonly<Record<ValueKind, string>> = {
  resistor: "ohms",
  capacitor: "farads",
  inductor: "henries",
  photoresistor: "ohms",
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
function elementName(kind: EmittedKind, ref: string): string {
  const sanitized = sanitize(ref)
  const letter = PREFIX[kind]
  if (sanitized.charAt(0).toUpperCase() === letter) return sanitized
  return `${letter}${sanitized}`
}

function valueOf(kind: ValueKind, parameters: Parameters, ref: string): number {
  return numericParameter(parameters, VALUE_FIELD[kind], ref)
}

/** The ref a unit's emitted element name is built from. A multi-section package emits
 * one device line per unit, so the name must distinguish them: `X<id>_<unitName>`. A
 * single-unit component keeps its bare id, so `MAIN` never appears in a deck.
 */
function unitRef(component: ResolvedComponent, unit: ResolvedUnit): string {
  return component.units.length === 1 ? component.id : `${component.id}_${unit.name}`
}

/** Every pin visible to one unit: the component's package pins merged with the unit's
 * own. That is how a dual op-amp's two sections share one supply. The unit's pins are
 * spread second, so a unit pin wins over a package pin of the same name - asserted by
 * construction rather than left to the caller's key ordering.
 */
function visiblePins(
  component: ResolvedComponent,
  unit: ResolvedUnit,
): Readonly<Record<string, string>> {
  return { ...component.pins, ...unit.pins }
}

/** A unit's device model, or a throw naming the component and unit. A device line
 * without a model is never emitted bare: `D1 a b` with no model is a different circuit,
 * not a partially-specified one.
 */
function unitModel(component: ResolvedComponent, unit: ResolvedUnit, where: string): DeviceModel {
  const name = unit.spiceModel
  if (name === undefined) {
    throw new Error(
      `${where}: kind "${component.kind}" is emitted against a device model, but the unit declares no SPICE model`,
    )
  }
  return deviceModel(name)
}

/** The argument order for a subcircuit-backed unit, taken from the model entry rather
 * than the kind (spec 3.5: two macromodels of one kind may order their pins differently).
 */
function modelPinOrder(model: DeviceModel, where: string): readonly string[] {
  const order = model.pinOrder
  if (order === undefined) {
    throw new Error(
      `${where}: model "${model.name}" is instantiated as a subcircuit but declares no pinOrder, ` +
        `so its argument order is unknown`,
    )
  }
  return order
}

/** The emitted nodes for one device line, in argument order.
 *
 * Both directions are errors, and neither is ever papered over:
 * - a connected pin the order does not name cannot be placed. Dropping it would emit a
 *   complete, well-formed deck with a net missing and no signal at all - a bug this
 *   project has already shipped once and had caught in review.
 * - a pin the order names but the unit does not connect would shift every later
 *   argument left, silently rewiring the device.
 */
function orderedNodes(
  order: readonly string[],
  pins: Readonly<Record<string, string>>,
  where: string,
  orderSource: string,
  node: (net: string) => string,
): readonly string[] {
  for (const pin of Object.keys(pins)) {
    if (!order.includes(pin)) {
      throw new Error(
        `${where}: pin "${pin}" is connected but ${orderSource} does not name it ` +
          `(order: ${order.join(", ")}). An unplaceable pin is an error, never a silent omission.`,
      )
    }
  }
  return order.map(pin => {
    if (!Object.prototype.hasOwnProperty.call(pins, pin)) {
      throw new Error(
        `${where}: pin "${pin}" is named by ${orderSource} but is not connected (order: ${order.join(", ")})`,
      )
    }
    return node(pins[pin])
  })
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

/** The deck under construction, threaded through per-unit emission: the node registry
 * (as a closure over the ground net), the component-name registry, the emitted lines,
 * the device-model text the deck references, and the running count of synthesized
 * zero-volt shorts.
 */
interface DeckState {
  readonly node: (net: string) => string
  readonly names: Map<string, string>
  readonly lines: string[]
  readonly modelTexts: Map<string, string>
  shorts: number
}

/** Emits ONE device line, for one unit of one component - the lowering a multi-section
 * package needs: N units produce N lines, each seeing that unit's pins merged with the
 * component's package pins.
 *
 * Argument order comes from one of two places, and the split is deliberate (spec 3.5):
 * a kind emitted as a SPICE PRIMITIVE takes its order from the kind, because SPICE
 * fixes it; a subcircuit-backed kind takes its order from the model entry, because two
 * macromodels of one kind may order their pins differently.
 */
function emitUnit(state: DeckState, component: ResolvedComponent, unit: ResolvedUnit): void {
  const kind = component.kind
  const where = `component "${component.id}" unit "${unit.name}"`
  const ref = unitRef(component, unit)
  const pins = visiblePins(component, unit)
  const kindOrderSource = `the SPICE argument order for kind "${kind}"`

  if (isValueKind(kind)) {
    const value = valueOf(kind, component.parameters, component.id)
    const [a, b] = orderedNodes(spicePinOrder(kind), pins, where, kindOrderSource, state.node)
    // A zero-ohm element is an ideal short, which SPICE cannot express as a
    // resistor — ngspice silently substitutes 1e-12 and warns. The standard
    // idiom is a zero-volt source, which is exact rather than approximate.
    // Resolved potentiometer sections are legitimately zero at a control
    // extreme, so this is a normal case, not an error. `photoresistor` is
    // deliberately not included: a light-dependent resistor is never actually
    // zero, so a zero there is a data defect that should reach the simulator
    // and be complained about, not be quietly turned into an ideal short.
    if (kind === "resistor" && value === 0) {
      // Both ends already on one node: the short is implicit and emitting a
      // source across it would be a shorted VSRC, which ngspice rejects.
      if (a === b) return
      const shortName = `VSHORT${state.shorts++}`
      reserveName(state.names, shortName, ref)
      state.lines.push(`${shortName} ${a} ${b} DC 0`)
      return
    }
    const name = elementName(kind, ref)
    reserveName(state.names, name, ref)
    state.lines.push(`${name} ${a} ${b} ${value.toExponential(12)}`)
    return
  }

  if (isModelKind(kind)) {
    const model = unitModel(component, unit, where)
    state.modelTexts.set(model.name, model.spice)
    const primitive = isSpicePrimitive(kind)
    const order = primitive ? spicePinOrder(kind) : modelPinOrder(model, where)
    const orderSource = primitive ? kindOrderSource : `model "${model.name}"'s pin order`
    const args = orderedNodes(order, pins, where, orderSource, state.node)
    const name = elementName(kind, ref)
    reserveName(state.names, name, ref)
    state.lines.push(`${name} ${args.join(" ")} ${model.name}`)
    return
  }

  // Required, not defensive. Without it a kind added later stops being emitted with no
  // signal at all, leaving a complete, well-formed, entirely wrong netlist.
  throw new Error(
    `${where}: kind "${kind}" has no SPICE emission rule in this emitter, so it cannot be emitted`,
  )
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
  lines.push(`V1 ${sourceOutputNode} 0 AC ${environment.source.amplitude.toExponential(12)}`)
  if (seriesOhms !== 0) {
    reserveName(names, SERIES_RESISTOR_NAME, "source series resistor")
    lines.push(`${SERIES_RESISTOR_NAME} ${sourceOutputNode} ${node(sourceNet)} ${seriesOhms.toExponential(12)}`)
  }

  const modelTexts = new Map<string, string>()
  const state: DeckState = { node, names, lines, modelTexts, shorts: 0 }
  for (const component of network.components) {
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
