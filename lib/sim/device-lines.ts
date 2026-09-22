/**
 * One component unit, lowered to one SPICE device line.
 *
 * This is the half of emission that answers "what does THIS part become?" -
 * which type letter, which argument order, which value or model, and which
 * kinds legitimately become nothing at all. `netlist.ts` owns the other half:
 * assembling a whole deck around these lines, with its source, rails, load and
 * analysis card.
 *
 * Split out of `netlist.ts` when that file outgrew this repository's file-size
 * guideline. The seam is the one that was already there in the comments: a
 * per-kind emission rule is a property of a kind, a part or a model, while a
 * deck's source and load are properties of a simulation environment.
 */
import type { ResolvedComponent, ResolvedUnit } from "../model/control-state.ts"
import { isSpicePrimitive, spicePinOrder } from "../model/kinds.ts"
import type { ComponentKind, Parameters } from "../model/types.ts"
import { deviceModel } from "./models/index.ts"
import type { DeviceModel } from "./models/index.ts"

/** Kinds emitted as a value-carrying element line: `<name> <nodes...> <value>`, with
 * the value read from a parameter. `photoresistor` is here because, until a behavioural
 * model replaces it, a photoresistor IS a plain resistance and must say so.
 */
type ValueKind = "resistor" | "capacitor" | "inductor" | "photoresistor"

/** Kinds emitted against a device model: `<name> <nodes...> <MODEL>`, where the model
 * is a `.model` line (diode, bjt) or a `.subckt` (opamp).
 */
type ModelKind = "diode" | "bjt" | "opamp"

/** Every kind this emitter turns into a device LINE. A kind outside this union either
 * has an explicit no-line rule of its own (`connector`, below) or reaches the dispatch's
 * final `else` and throws: a kind that silently stops being emitted leaves a complete,
 * well-formed, entirely wrong netlist.
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

/** Replaces any character outside [A-Za-z0-9] with "_". */
export function sanitize(name: string): string {
  return name.replace(/[^A-Za-z0-9]/g, "_")
}

/** The emitter's net-name-to-SPICE-node transform, exported so a caller that
 * wants to read a node back out of a simulation result can ask which node a
 * net became, rather than re-deriving (and eventually mis-deriving) the rule.
 * The ground net is NOT handled here: it emits as node 0, which only
 * `toSpiceNetlist` knows, because only it knows which net is ground.
 */
export function spiceNodeName(netName: string): string {
  return sanitize(netName)
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
export function reserveName(registry: Map<string, string>, name: string, ref: string): void {
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
export interface DeckState {
  readonly node: (net: string) => string
  readonly names: Map<string, string>
  readonly lines: string[]
  readonly modelTexts: Map<string, string>
  shorts: number
}

/** A connector contributes no device line - but ONLY when its part says it is
 * electrically inert, and it has to say so explicitly.
 *
 * The rule is deliberately NOT "connectors emit nothing". `kind: "connector"` covers a
 * screw terminal, whose terminals are just places a wire lands, and equally a switching
 * jack, whose contact opens when a plug is inserted. An unconditional inert branch would
 * emit a complete, well-formed deck with that switch silently removed - the same class
 * of silent drop the dispatch's final `else`, the unplaceable-pin check and the
 * no-units check all exist to prevent, and which this project has shipped three times.
 *
 * So inertness is a declared property of the concrete PART (`PartSpec.electricallyInert`),
 * and a connector that does not declare it is refused. `false` is refused too, with its
 * own message: a part that switches is not an inert connector, and the model already has
 * somewhere for it - `kind: "switch"`, whose contacts open and close under control state.
 *
 * The pins' nets are still registered even though nothing is emitted, so a net that
 * reaches the deck only through a connector still takes part in collision detection.
 */
function emitConnector(
  state: DeckState,
  component: ResolvedComponent,
  where: string,
  pins: Readonly<Record<string, string>>,
): void {
  const inert = component.part?.electricallyInert
  if (inert === undefined) {
    throw new Error(
      `${where}: kind "connector" needs its part to declare electricallyInert, and this one does ` +
        `not. A screw terminal or pin header is inert (electricallyInert: true) and emits no ` +
        `device line; a part whose contacts switch is not a connector and belongs in ` +
        `kind "switch". The emitter will not guess, because guessing "inert" is how a switching ` +
        `part disappears from a deck without any signal at all.`,
    )
  }
  if (!inert) {
    throw new Error(
      `${where}: part declares electricallyInert: false, so it is not an inert connector and ` +
        `this emitter has no rule for it. Model a part whose contacts open and close as ` +
        `kind "switch" with a control-state position.`,
    )
  }
  for (const netName of Object.values(pins)) state.node(netName)
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
export function emitUnit(state: DeckState, component: ResolvedComponent, unit: ResolvedUnit): void {
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
    // extreme, so this is a normal case, not an error.
    //
    // `photoresistor` is deliberately NOT converted: a light-dependent resistor
    // is never actually zero, so a zero there is a data defect rather than a
    // control extreme, and turning it into an ideal short would hide the defect
    // behind a plausible circuit. What makes leaving it loud rather than silent
    // is a mechanism two modules away, so name it here: ngspice does not reject
    // `Rldr a b 0`, it warns "Value of resistor rldr is too small, set to
    // 1.000000e-12" and carries on. That reaches the caller only because
    // `genuineErrors` in `lib/sim/ac.ts` is deny-by-default — it keeps every
    // non-empty line that does not start with "Note:", so `runAcSweep` throws on
    // the warning. That allowlist is documented as expected to grow; broadening
    // it to cover this warning would convert a zero-ohm LDR into a silent short.
    // `tests/sim/netlist.test.ts` pins the throw end-to-end so that broadening
    // goes red here rather than passing unnoticed.
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

  if (kind === "connector") {
    emitConnector(state, component, where, pins)
    return
  }

  // Required, not defensive. Without it a kind added later stops being emitted with no
  // signal at all, leaving a complete, well-formed, entirely wrong netlist.
  throw new Error(
    `${where}: kind "${kind}" has no SPICE emission rule in this emitter, so it cannot be emitted`,
  )
}
