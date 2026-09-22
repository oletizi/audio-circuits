/**
 * The hand-built `.op` deck for the compressor's VBIAS reference (spec 8.1).
 *
 * WHY IT IS HAND-BUILT. `toSpiceNetlist` cannot produce it. That emitter
 * requires a `sweep` in its environment and writes `.ac` unconditionally, so
 * there is no `.op` path through it; `runOperatingPoint` takes `{ netlist,
 * nodes }` and the netlist has to come from somewhere. This module is that
 * somewhere.
 *
 * WHAT IT READS FROM THE CIRCUIT, AND WHY THAT MATTERS. Every element value and
 * every node name below is READ OUT OF THE COMPOSED NETWORK, not typed here. A
 * deck with the divider values hard-coded would keep reporting 4.35 V after
 * someone changed a divider resistor in the circuit, so the bias assertion it
 * fed would be untestable by construction - it could not be falsified by the
 * only edit that should falsify it. The falsification run required by this
 * task's Step 6 is what pins that down.
 *
 * WHAT IS STATED BY HAND, AND WHERE IT CAME FROM. Exactly one number: the
 * protected rail, `PROTECTED_RAIL_VOLTS = 8.7`, from spec section 6.1.3 ("At a
 * nominal 9.0 V input the rail is about 8.7 V after the Schottky drop and VBIAS
 * is about 4.35 V"). `SimulationEnvironment.supplies` cannot reach a hand-built
 * deck, so the rail is restated here rather than declared there. That
 * duplication is known and accepted; `railStatedBy` records its source in the
 * deck text so a reader meets it there too.
 *
 * WHAT THE DECK DELIBERATELY OMITS, each for a stated reason:
 *
 *  - THE 1N5817 SCHOTTKY. No 1N5817 model is registered in `lib/sim/models/`,
 *    and none is invented here. Its drop is instead carried by the stated 8.7 V
 *    rail, which is where spec section 6.1.3 already put it.
 *  - THE RESERVOIR AND BYPASS CAPACITORS on the rail and on the divider
 *    midpoint. A capacitor is an open circuit in an operating-point analysis, so
 *    they change no bias voltage. They are transcribed in the circuit, which is
 *    where they belong; leaving them out of this deck changes nothing it
 *    reports. (Spec section 8.1's 2.5 s power-up ramp is a property OF those
 *    capacitors and is a transient claim - nothing here says anything about it.)
 *  - EVERY LOAD ON VBIAS. This deck is spec section 8.1's reference network
 *    alone: the divider and its buffer, unloaded. That is the condition the
 *    4.35 V figure is stated under, and it is the condition the assertion fed by
 *    this deck is conditional on. It is NOT a claim about VBIAS in the loaded,
 *    powered-up module.
 */
import { resolveNetwork } from "../../lib/model/control-state.ts"
import type { ResolvedComponent, ResolvedNetwork } from "../../lib/model/control-state.ts"
import type { Network } from "../../lib/model/types.ts"
import { deviceModel } from "../../lib/sim/models/index.ts"
import { spiceNodeName } from "../../lib/sim/netlist.ts"
import { BIAS_REFERENCE } from "../../circuits/optical-compressor/index.ts"
import { NO_CONTROLS } from "../sim/helpers.ts"

/** The protected rail, stated by hand. Spec section 6.1.3. */
export const PROTECTED_RAIL_VOLTS = 8.7

/** Where that number came from, carried into the deck text. */
const RAIL_STATED_BY = "spec section 6.1.3, nominal 9.0 V in, about 8.7 V after the Schottky"

export interface BiasDeck {
  /** Complete SPICE text, including its `.op` card and `.end`. */
  readonly netlist: string
  /** Emitted node for the buffered reference, VBIAS. */
  readonly biasNode: string
  /** Emitted node for the unbuffered divider midpoint, VBIAS_RAW. */
  readonly unbufferedNode: string
}

function componentById(resolved: ResolvedNetwork, id: string): ResolvedComponent {
  const found = resolved.components.find(c => c.id === id)
  if (!found) {
    throw new Error(
      `bias deck: the composed compressor declares no component "${id}", so the section 8.1 ` +
        `reference network cannot be assembled from it`,
    )
  }
  return found
}

/** A resolved two-pin element's ohms and its two nets. Throws rather than
 * defaulting: a divider resistor that is not a resistor, or has lost a pin, is a
 * defect in the circuit and this deck must not paper over it. */
function resistor(resolved: ResolvedNetwork, id: string): { ohms: number; a: string; b: string } {
  const found = componentById(resolved, id)
  if (found.kind !== "resistor") {
    throw new Error(`bias deck: component "${id}" is a ${found.kind}, not a resistor`)
  }
  const ohms: unknown = Reflect.get(found.parameters, "ohms")
  if (typeof ohms !== "number") {
    throw new Error(`bias deck: component "${id}" carries no numeric "ohms" parameter`)
  }
  if (found.units.length !== 1) {
    throw new Error(`bias deck: component "${id}" declares ${found.units.length} units, expected 1`)
  }
  const { a, b } = found.units[0].pins
  if (a === undefined || b === undefined) {
    throw new Error(`bias deck: component "${id}" does not connect both of its a/b pins`)
  }
  return { ohms, a, b }
}

function requirePort(resolved: ResolvedNetwork, port: string): string {
  const netName = resolved.ports[port]
  if (netName === undefined) {
    throw new Error(`bias deck: the composed compressor declares no "${port}" port`)
  }
  return netName
}

/** The one net two elements share, or a throw. Used to find the divider
 * midpoint from the circuit itself rather than from a net name typed here. */
function sharedNet(
  upper: { a: string; b: string },
  lower: { a: string; b: string },
): string {
  const shared = [upper.a, upper.b].filter(n => n === lower.a || n === lower.b)
  if (shared.length !== 1) {
    throw new Error(
      `bias deck: the two divider resistors share ${shared.length} nets (${shared.join(", ") || "none"}), ` +
        `so their midpoint is not identifiable. A divider is two resistors meeting at exactly one node.`,
    )
  }
  return shared[0]
}

/** The buffer's `.subckt` call, in its MODEL's declared pin order - never in an
 * order typed here, which would silently rewire the amplifier if the registry
 * ever changed.
 *
 * THIS MIRRORS THE PRODUCTION LOWERING, AND THE TWO MUST BE EDITED TOGETHER.
 * `lib/sim/device-lines.ts` owns three rules this function restates:
 * `visiblePins` (package pins spread first, the unit's own second, so a unit pin
 * wins a name collision), `unitModel` (a unit with no `spiceModel` is an error,
 * never a bare device line) and `modelPinOrder` (a subcircuit-backed unit's
 * argument order comes from the model entry, not from the kind). The duplication
 * is forced by Defect A - there is no `.op` route through `toSpiceNetlist`, so
 * this deck cannot travel the production path - and its cost is worth naming:
 * the only behavioural number this circuit produces does NOT go through that
 * path, so a regression in the spread order there would not move VBIAS here. */
function bufferLine(
  resolved: ResolvedNetwork,
  node: (net: string) => string,
): { line: string; modelSpice: string } {
  const component = componentById(resolved, BIAS_REFERENCE.bufferComponent)
  const unit = component.units.find(u => u.name === BIAS_REFERENCE.bufferUnit)
  if (!unit) {
    throw new Error(
      `bias deck: component "${component.id}" declares no unit "${BIAS_REFERENCE.bufferUnit}"`,
    )
  }
  const modelName = unit.spiceModel
  if (modelName === undefined) {
    throw new Error(
      `bias deck: component "${component.id}" unit "${unit.name}" declares no SPICE model`,
    )
  }
  const model = deviceModel(modelName)
  const order = model.pinOrder
  if (order === undefined) {
    throw new Error(`bias deck: model "${model.name}" declares no pinOrder`)
  }
  const pins: Readonly<Record<string, string>> = { ...component.pins, ...unit.pins }
  const args = order.map(pin => {
    const netName = pins[pin]
    if (netName === undefined) {
      throw new Error(
        `bias deck: "${component.id}" unit "${unit.name}" leaves pin "${pin}" unconnected, but ` +
          `model "${model.name}" names it in its pin order`,
      )
    }
    return node(netName)
  })
  return {
    line: `X${component.id}_${unit.name} ${args.join(" ")} ${model.name}`,
    modelSpice: model.spice.trimEnd(),
  }
}

/**
 * Assembles spec section 8.1's reference network - the two divider resistors and
 * the op-amp section that buffers their midpoint - into an operating-point deck,
 * with every value and node read out of `network`.
 */
export function biasDeck(network: Network): BiasDeck {
  const resolved = resolveNetwork(network, NO_CONTROLS)
  const groundNet = requirePort(resolved, "ground")
  const railNet = requirePort(resolved, "rail")
  const biasNet = requirePort(resolved, "bias")

  const upper = resistor(resolved, BIAS_REFERENCE.dividerUpper)
  const lower = resistor(resolved, BIAS_REFERENCE.dividerLower)
  const midNet = sharedNet(upper, lower)
  if (upper.a !== railNet && upper.b !== railNet) {
    throw new Error(
      `bias deck: "${BIAS_REFERENCE.dividerUpper}" does not touch the rail net "${railNet}"`,
    )
  }
  if (lower.a !== groundNet && lower.b !== groundNet) {
    throw new Error(
      `bias deck: "${BIAS_REFERENCE.dividerLower}" does not touch the ground net "${groundNet}"`,
    )
  }

  const node = (netName: string): string => (netName === groundNet ? "0" : spiceNodeName(netName))
  const buffer = bufferLine(resolved, node)

  const netlist = [
    "optical compressor VBIAS reference, spec section 8.1, hand-built operating point",
    `* Rail stated by hand at ${PROTECTED_RAIL_VOLTS} V: ${RAIL_STATED_BY}.`,
    "* Every other value and node is read out of the composed circuit.",
    "* Scope: the divider and its buffer, UNLOADED. Not a claim about the powered module.",
    `VRAIL ${node(railNet)} 0 DC ${PROTECTED_RAIL_VOLTS.toExponential(12)}`,
    `R${BIAS_REFERENCE.dividerUpper} ${node(upper.a)} ${node(upper.b)} ${upper.ohms.toExponential(12)}`,
    `R${BIAS_REFERENCE.dividerLower} ${node(lower.a)} ${node(lower.b)} ${lower.ohms.toExponential(12)}`,
    buffer.line,
    buffer.modelSpice,
    ".op",
    ".end",
  ].join("\n")

  return { netlist, biasNode: node(biasNet), unbufferedNode: node(midNet) }
}
