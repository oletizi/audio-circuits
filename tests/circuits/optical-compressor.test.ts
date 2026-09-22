import { test, expect } from "bun:test"
import {
  BIAS_REFERENCE,
  opticalCompressor,
  SPEC_NAMES,
} from "../../circuits/optical-compressor/index.ts"
import { audioPath } from "../../circuits/optical-compressor/parts/audio-path.ts"
import { sidechain } from "../../circuits/optical-compressor/parts/sidechain.ts"
import { validateNetwork } from "../../lib/model/validate.ts"
import { parseValue } from "../../lib/model/units.ts"
import type { Network } from "../../lib/model/types.ts"
import type { SimulationEnvironment } from "../../lib/sim/netlist.ts"
import { runOperatingPoint } from "../../lib/sim/operating-point.ts"
import { deckFor, NO_CONTROLS } from "../sim/helpers.ts"
import { biasDeck, PROTECTED_RAIL_VOLTS } from "./optical-compressor-bias-deck.ts"
import {
  componentById,
  elementLine,
  lastField,
  netOfPin,
  netsTouched,
  ohmsOf,
  packageNet,
  parameterOf,
  withResistance,
} from "./network-probes.ts"

const compressor: Network = opticalCompressor()

test("the composed compressor validates and carries every transcribed part", () => {
  expect(() => validateNetwork(compressor)).not.toThrow()

  const kinds = compressor.components.map(c => c.kind)
  const count = (kind: string): number => kinds.filter(k => k === kind).length
  expect(count("resistor")).toBe(15)
  expect(count("capacitor")).toBe(10)
  expect(count("diode")).toBe(3)
  expect(count("bjt")).toBe(1)
  expect(count("opamp")).toBe(2)
  expect(count("photoresistor")).toBe(1)
  // Spec section 10.1's five connectors, and no others.
  expect(count("connector")).toBe(5)
  // The total as well as the per-kind tally: a per-kind count alone would
  // survive an extra component of some kind nobody thought to count.
  expect(compressor.components.length).toBe(37)

  // Every component maps to a name the spec itself uses, and every name the map
  // records belongs to a component - so neither list can drift from the other.
  expect(compressor.components.map(c => c.id).sort()).toEqual(Object.keys(SPEC_NAMES).sort())
})

test("include() prefixes every id with its block, and nothing escapes unprefixed", () => {
  // The composition evidence this task exists to produce, at its most basic:
  // three blocks went in, and every component came out carrying the block it
  // came from.
  const prefixes = ["power_", "audio_", "sidechain_"]
  for (const component of compressor.components) {
    expect(prefixes.some(p => component.id.startsWith(p)), component.id).toBe(true)
  }
  expect(compressor.components.filter(c => c.id.startsWith("power_")).length).toBe(8)
  expect(compressor.components.filter(c => c.id.startsWith("audio_")).length).toBe(12)
  expect(compressor.components.filter(c => c.id.startsWith("sidechain_")).length).toBe(17)
})

test("the rails cross block boundaries as ONE net, bound by the parent", () => {
  // There are no implicit global nets, so this is the property that a rail which
  // should be shared actually is. Each pin below sits in a DIFFERENT block, and
  // the only thing that can have brought them onto one net is the parent's
  // explicit port binding. Had a port been left unbound, include() would have
  // thrown; had one been bound to the wrong parent net, these would differ.
  const rail = compressor.ports["rail"]
  const ground = compressor.ports["ground"]
  const bias = compressor.ports["bias"]

  expect(packageNet(compressor, "audio_signal_opamp", "v+")).toBe(rail)
  expect(packageNet(compressor, "sidechain_control_opamp", "v+")).toBe(rail)
  expect(netOfPin(compressor, "power_bias_divider_upper", "MAIN", "a")).toBe(rail)
  expect(netOfPin(compressor, "sidechain_led_current_limit_resistor", "MAIN", "a")).toBe(rail)

  expect(packageNet(compressor, "audio_signal_opamp", "v-")).toBe(ground)
  expect(packageNet(compressor, "sidechain_control_opamp", "v-")).toBe(ground)
  expect(netOfPin(compressor, "power_bias_divider_lower", "MAIN", "b")).toBe(ground)

  // VBIAS is generated in the sidechain block (U2 section B buffers it) and
  // consumed in the audio path; VBIAS_RAW runs the other way, from the power
  // block's divider into that same buffer's non-inverting input.
  expect(netOfPin(compressor, "audio_input_bias_resistor", "MAIN", "b")).toBe(bias)
  expect(netOfPin(compressor, "sidechain_control_opamp", "B", "out")).toBe(bias)
  expect(netOfPin(compressor, "sidechain_control_opamp", "B", "in+"))
    .toBe(netOfPin(compressor, "power_bias_divider_upper", "MAIN", "b"))

  // The sidechain is fed from the makeup output, which lives in the audio path.
  expect(netOfPin(compressor, "sidechain_peak_terminal", "MAIN", "TOP"))
    .toBe(netOfPin(compressor, "audio_signal_opamp", "B", "out"))

  // And the negative case: none of these is the same net as any other. A test
  // that only compared each rail against itself would pass for a circuit that
  // had tied VBIAS to the rail.
  expect(new Set([rail, ground, bias]).size).toBe(3)
})

test("both op-amp packages declare two sections sharing one package's supply pins", () => {
  // Spec section 8.1 assigns all four sections across two packages, so this is
  // the first circuit in the project where a component declares TWO units
  // sharing one package's supply pins - the case the per-unit lowering was
  // built for, which until now only synthetic fixtures exercised.
  for (const id of ["audio_signal_opamp", "sidechain_control_opamp"]) {
    const amp = componentById(compressor, id)
    expect(amp.units.map(u => u.name).sort(), id).toEqual(["A", "B"])
    // The supply pins are on the PACKAGE, not in either unit: that is what
    // "sharing" means here, and it is what the emitter's merge relies on.
    expect(Object.keys(amp.pins).sort(), id).toEqual(["v+", "v-"])
    for (const unit of amp.units) {
      expect(Object.keys(unit.pins).sort(), `${id}.${unit.name}`).toEqual(["in+", "in-", "out"])
      expect(unit.spiceModel, `${id}.${unit.name}`).toBe("GENERIC_OPAMP")
    }
    // The part is a TL072H and the model is generic. Two different claims, and
    // no result from this circuit predicts TL072H behaviour.
    expect(amp.part?.mpn, id).toBe("TL072H")
  }

  // All four sections are used, so none is left floating (spec section 8.1).
  const sections = compressor.components
    .filter(c => c.kind === "opamp")
    .flatMap(c => c.units)
  expect(sections.length).toBe(4)
})

/**
 * Source, load, supply and sweep for the AUDIO PATH BLOCK, emitted but never
 * run. Every assertion made against this deck is about the emitted TEXT - which
 * device lines appear and which nodes they carry - so no number here is a
 * modelling claim about the circuit's response. The block is not simulatable as
 * it stands in any case: the GAIN pot is a panel control outside the module
 * (spec section 10), so the makeup amplifier's feedback path is open until one
 * is connected.
 */
const AUDIO_PATH_ENVIRONMENT: SimulationEnvironment = {
  source: { port: "input", amplitude: 1, seriesOhms: 0 },
  load: { port: "output", ohms: 1e12 },
  supplies: [{ port: "rail", volts: PROTECTED_RAIL_VOLTS }],
  sweep: { pointsPerDecade: 20, startHz: 10, stopHz: 100_000 },
  groundPort: "ground",
}

test("a two-section package emits one device line per section, on the same supply nets", () => {
  const deck = deckFor(audioPath(), NO_CONTROLS, AUDIO_PATH_ENVIRONMENT)
  const lines = deck.split("\n").filter(line => line.startsWith("Xsignal_opamp"))
  expect(lines).toHaveLength(2)

  // Argument order is the model's pinOrder: in+, in-, out, v+, v-. Section A is
  // the unity-gain input buffer, section B the makeup amplifier.
  expect(lines[0]).toBe("Xsignal_opamp_A IN BUF_OUT BUF_OUT _9V_PROTECTED 0 GENERIC_OPAMP")
  expect(lines[1]).toBe("Xsignal_opamp_B GR MAKEUP_FB OUT_PRE _9V_PROTECTED 0 GENERIC_OPAMP")

  // The property the per-unit lowering exists for, asserted rather than read
  // off: both lines carry the SAME two supply nodes, which came from the
  // package rather than from either unit.
  const supplyArgs = (line: string): string => line.split(" ").slice(4, 6).join(" ")
  expect(supplyArgs(lines[0])).toBe(supplyArgs(lines[1]))
  expect(supplyArgs(lines[0])).toBe("_9V_PROTECTED 0")
})

test("all five connectors declare themselves electrically inert", () => {
  // The emitter refuses a connector that does not declare it, and refuses
  // `false` with its own message: a part whose contacts switch is not an inert
  // connector. Spec section 10.1's five are screw terminals and pot headers,
  // and there are no jacks in this circuit.
  const connectors = compressor.components.filter(c => c.kind === "connector")
  expect(connectors.length).toBe(5)
  for (const connector of connectors) {
    expect(connector.part?.electricallyInert, connector.id).toBe(true)
  }
  expect(connectors.map(c => c.id).sort()).toEqual([
    "audio_gain_terminal",
    "audio_input_terminal",
    "audio_output_terminal",
    "power_power_terminal",
    "sidechain_peak_terminal",
  ])
})

test("the three revision-3 corrections are the values transcribed", () => {
  // Spec section 0 lists these as revision 3's circuit changes, and each has a
  // superseded revision-2 value that a transcription from memory would land on.
  expect(parameterOf(compressor, "sidechain_driver_emitter_resistor", "ohms"))
    .toBe(parseValue("1k"))
  expect(parameterOf(compressor, "sidechain_detector_cap", "farads"))
    .toBe(parseValue("4.7uF"))
  expect(parameterOf(compressor, "sidechain_peak_wiper_failsafe_resistor", "ohms"))
    .toBe(parseValue("1M"))
  // R_LED came down to 3.3k in the same revision, to pay for the 1.5 V now
  // dropped across R_E (spec section 8.7.2).
  expect(parameterOf(compressor, "sidechain_led_current_limit_resistor", "ohms"))
    .toBe(parseValue("3.3k"))
})

test("every transcribed value matches the value the spec states", () => {
  const expected: readonly (readonly [string, "ohms" | "farads", string])[] = [
    ["power_bias_divider_upper", "ohms", "47k"],
    ["power_bias_divider_lower", "ohms", "47k"],
    ["power_supply_reservoir_cap", "farads", "47uF"],
    ["power_supply_bypass_cap", "farads", "100nF"],
    ["power_bias_reservoir_cap", "farads", "47uF"],
    ["power_bias_bypass_cap", "farads", "100nF"],
    ["audio_input_coupling_cap", "farads", "100nF"],
    ["audio_input_bias_resistor", "ohms", "1M"],
    ["audio_attenuator_series_resistor", "ohms", "22k"],
    ["audio_makeup_gain_resistor", "ohms", "10k"],
    ["audio_output_coupling_cap", "farads", "2.2uF"],
    ["audio_output_pulldown_resistor", "ohms", "100k"],
    ["audio_supply_decoupling_cap", "farads", "100nF"],
    ["sidechain_amplifier_bias_resistor", "ohms", "10k"],
    ["sidechain_amplifier_feedback_resistor", "ohms", "100k"],
    ["sidechain_detector_coupling_cap", "farads", "1uF"],
    ["sidechain_release_resistor", "ohms", "100k"],
    ["sidechain_driver_base_resistor", "ohms", "10k"],
    ["sidechain_driver_base_pulldown_resistor", "ohms", "100k"],
    ["sidechain_led_sense_resistor", "ohms", "10R"],
    ["sidechain_supply_decoupling_cap", "farads", "100nF"],
  ]
  for (const [id, field, value] of expected) {
    expect(parameterOf(compressor, id, field), id).toBe(parseValue(value))
  }
})

test("the photocell carries a resistance at a stated operating point", () => {
  // Spec section 6.2 states two endpoints and no curve. The dark endpoint is the
  // one this circuit declares, because it is the state in which the module's own
  // DC operating point is defined, and 1 MOhm is the section 6.2 REQUIREMENT -
  // a selection window, not a measurement of any part.
  expect(parameterOf(compressor, "audio_attenuator_photocell", "ohms")).toBe(parseValue("1M"))
})

test("the vactrol's two halves share no net", () => {
  // Spec section 9: there is no electrical control connection between the LED
  // and the LDR, and inventing one would destroy the isolation that defines the
  // part. The two halves are separate components here BECAUSE of that, and this
  // is what keeps them separate.
  const led = new Set(netsTouched(componentById(compressor, "sidechain_vactrol_led")))
  const ldr = netsTouched(componentById(compressor, "audio_attenuator_photocell"))
  for (const netName of ldr) expect(led.has(netName), netName).toBe(false)
})

test("the compressor authors no no-connect pin", () => {
  // The Task 1 carry-forward says the harness's handling of an explicit
  // no-connect must be falsified by the first circuit that authors one. This
  // circuit does not: spec section 8.1 uses all four op-amp sections, so nothing
  // is left floating and nothing is marked NC. The obligation is therefore still
  // open, and this assertion is what keeps it from being quietly considered
  // discharged here.
  for (const component of compressor.components) {
    for (const connection of Object.values(component.pins)) {
      expect(connection.kind, component.id).toBe("net")
    }
    for (const unit of component.units) {
      for (const connection of Object.values(unit.pins)) {
        expect(connection.kind, `${component.id}.${unit.name}`).toBe("net")
      }
    }
  }
})

test("the module's whole external interface is declared as ports", () => {
  expect(compressor.ports).toEqual({
    input: "IN_EXT",
    output: "OUT",
    ground: "GND",
    supply_input: "+9V_RAW",
    rail: "+9V_PROTECTED",
    bias: "VBIAS",
    makeup_output: "OUT_PRE",
    gain_return: "MAKEUP_FB",
    peak_wiper: "SC_IN",
  })
})

/**
 * The two device models this circuit needs and this repository does not have.
 *
 * Both throw at emission naming the component that needs one, which is the
 * outcome this project wants: a missing model is missing capability, and the
 * alternative - substituting a model of some other part that happens to be
 * registered - would quietly change the very numbers each part exists to set.
 * A 1N4148 standing in for the 1N5817 would move the protected rail - a silicon
 * signal junction does not drop the 0.2-0.4 V spec section 8.1 budgets for this
 * Schottky - and the protected rail is what the VBIAS assertion below rests on.
 *
 * These assertions are here so that a later fallback goes red rather than
 * passing unnoticed.
 */
test("a deck needing an unregistered model throws, naming the component", () => {
  const composedEnvironment: SimulationEnvironment = {
    source: { port: "input", amplitude: 1, seriesOhms: 0 },
    load: { port: "output", ohms: 1e12 },
    supplies: [{ port: "supply_input", volts: 9 }],
    sweep: { pointsPerDecade: 20, startHz: 10, stopHz: 100_000 },
    groundPort: "ground",
  }
  expect(() => deckFor(compressor, NO_CONTROLS, composedEnvironment))
    .toThrow(/power_reverse_polarity_diode.*declares no SPICE model/s)

  const sidechainEnvironment: SimulationEnvironment = {
    source: { port: "makeup_output", amplitude: 1, seriesOhms: 0 },
    load: { port: "peak_wiper", ohms: 1e12 },
    supplies: [{ port: "rail", volts: PROTECTED_RAIL_VOLTS }],
    sweep: { pointsPerDecade: 20, startHz: 10, stopHz: 100_000 },
    groundPort: "ground",
  }
  expect(() => deckFor(sidechain(), NO_CONTROLS, sidechainEnvironment))
    .toThrow(/vactrol_led.*declares no SPICE model/s)
})

/**
 * The one behavioural claim this task makes, and the only one the spec states a
 * target for.
 *
 * WHAT IS ASSERTED, AND WHERE IT COMES FROM. Spec section 8.1 builds VBIAS from
 * two 47 kOhm resistors across the protected rail, buffered by one op-amp
 * section; section 6.1.3 states the rail at about 8.7 V and VBIAS at about
 * 4.35 V. 4.35 V is transcribed from the spec, not measured here and then
 * written down.
 *
 * WHY THE TOLERANCE IS 25 mV. It has to be loose enough to survive the op-amp
 * model's finite gain and tight enough that a wrong divider cannot slip through.
 * GENERIC_OPAMP's open-loop gain is 1e4, so a correctly wired follower sits
 * 1/(1+A) = 435 microvolts below its input - 57x inside the band.
 *
 * WHAT THE BAND DOES AND DOES NOT CATCH, stated as a window rather than as
 * examples. 25 mV around 4.35 V admits either divider leg being wrong by about
 * +/-1.15% (VBIAS moves by about 2.175 V per unit fractional error in one leg),
 * so it catches every E12 and E24 neighbour of 47k - 43k puts VBIAS at 4.54 V
 * and 39k at 4.75 V, roughly 8x and 16x outside - and it does NOT catch an E96
 * neighbour: a 47.5k upper leg lands 23.0 mV out and passes. That is deliberate.
 * A band tight enough to reject 47.5k would be tighter than a 1% resistor's own
 * tolerance, so it would reject correct circuits built from real parts. THAT
 * CLAUSE CARRIES THE ARGUMENT ON ITS OWN, and it is the only one that does:
 * rejecting 47.5k needs a band just under 23.0 mV, which is still 53x the
 * 435 microvolt finite-gain signature against 57x at 25 mV, so tightening would
 * not eat the margin the sided half below depends on. The band is sized for a
 * wrong VALUE, not for a part's tolerance. Step 6's falsification run is the
 * measured version of this argument.
 *
 * WHY IT IS ALSO ONE-SIDED. A two-sided band around 4.35 V is blind to the
 * wiring error that matters most in a follower. Transpose the buffer's inputs
 * and the loop becomes positive feedback: the gain is A/(A-1) rather than
 * A/(1+A), so VBIAS lands 435 microvolts ABOVE the divider midpoint instead of
 * below it. Both sit deep inside any sane band, and tightening it does not help
 * because a tighter band is still two-sided. Only the SIGN separates them, so
 * the buffered output is also asserted strictly below the unbuffered node it
 * follows - which is the comparison that carries the polarity, rather than a
 * comparison against the nominal figure.
 *
 * WHAT THIS IS CONDITIONAL ON. The deck is spec section 8.1's reference network
 * alone - the divider and its buffer, unloaded, with the rail stated by hand at
 * 8.7 V because no 1N5817 model exists to derive it from. It says nothing about
 * VBIAS in the loaded, powered-up module, and nothing about the section 8.1
 * power-up ramp, which is a transient property of capacitors this deck omits.
 */
test("the isolated VBIAS divider and buffer produce the specified half-rail, below the unbuffered node", async () => {
  const deck = biasDeck(compressor)
  const v = await runOperatingPoint({
    netlist: deck.netlist,
    nodes: [deck.biasNode, deck.unbufferedNode],
  })
  const bias = v[deck.biasNode]
  const unbuffered = v[deck.unbufferedNode]
  const nominal = PROTECTED_RAIL_VOLTS / 2

  expect(
    Math.abs(bias - nominal),
    `node ${deck.biasNode} (VBIAS) sits at ${bias} V, not within 25 mV of the ${nominal} V ` +
      `half-rail spec section 6.1.3 states; node ${deck.unbufferedNode} (VBIAS_RAW) reads ${unbuffered} V`,
  ).toBeLessThanOrEqual(0.025)

  expect(
    bias,
    `node ${deck.biasNode} (VBIAS) reads ${bias} V, which is NOT strictly below node ` +
      `${deck.unbufferedNode} (VBIAS_RAW) at ${unbuffered} V - a follower whose inputs are ` +
      `transposed lands above the node it follows`,
  ).toBeLessThan(unbuffered)
})

/**
 * The property that makes the assertion above falsifiable: the divider values in
 * the deck come out of the composed network. A deck with them hard-coded would
 * keep reporting 4.35 V after someone changed a divider resistor in the circuit,
 * so the VBIAS assertion would be unfalsifiable by precisely the edit that ought
 * to falsify it.
 *
 * WHAT THIS TEST DELIBERATELY DOES NOT DO. An earlier version asserted
 * `toContain("4.700000000000e+4")` and four other literals. Every one of those
 * passes identically against a deck with all five values typed into the string,
 * so the test's name was a claim its assertions did not establish. Literals are
 * gone: the expected value is read out of the circuit, and a COPY of the circuit
 * with a different divider is emitted and required to produce a different deck.
 * Hard-code the divider inside `biasDeck` and the second half goes red.
 *
 * It is NOT red when the CIRCUIT's divider value changes, and that is correct
 * rather than a gap: a test that went red then would be asserting the circuit's
 * value, which is what "every transcribed value matches the value the spec
 * states" is for, and it would have to be edited on every value change - which
 * is the literal-shaped defect this rewrite removes. Sensitivity to the
 * circuit's value lives in that test and in the VBIAS assertion above, both of
 * which do go red; see the task report's Fix 1 runs.
 */
test("the bias deck is built from the circuit, not from numbers typed into it", () => {
  const deck = biasDeck(compressor)

  // Half one: what the deck emits for each divider leg is what the CIRCUIT
  // declares for it. The expected value is read out of the network, so there is
  // no literal here to keep in step with anything.
  for (const id of [BIAS_REFERENCE.dividerUpper, BIAS_REFERENCE.dividerLower]) {
    const line = elementLine(deck.netlist, `R${id}`)
    expect(lastField(line, id), id).toBe(ohmsOf(compressor, id).toExponential(12))
  }

  // Half two: a DIFFERENT circuit produces a DIFFERENT deck. This is the half a
  // hard-coded deck fails - it would emit the same text for both circuits.
  // The mutated value is derived from the circuit's own, so it can never
  // collide with whatever the circuit happens to declare.
  const changed = ohmsOf(compressor, BIAS_REFERENCE.dividerUpper) * 3
  const mutated = biasDeck(withResistance(compressor, BIAS_REFERENCE.dividerUpper, changed))
  // Compared line by line rather than whole-netlist, so a failure prints the one
  // element line that did not move instead of two full decks.
  expect(elementLine(mutated.netlist, `R${BIAS_REFERENCE.dividerUpper}`))
    .not.toBe(elementLine(deck.netlist, `R${BIAS_REFERENCE.dividerUpper}`))
  expect(lastField(elementLine(mutated.netlist, `R${BIAS_REFERENCE.dividerUpper}`), "mutated"))
    .toBe(changed.toExponential(12))
  // ...and only that leg moved, so the deck follows the circuit element by
  // element rather than regenerating something loosely similar.
  expect(elementLine(mutated.netlist, `R${BIAS_REFERENCE.dividerLower}`))
    .toBe(elementLine(deck.netlist, `R${BIAS_REFERENCE.dividerLower}`))

  // The rail is the one number the deck states by hand, and it says where it
  // came from in its own text - the duplication Defect A forces, made visible
  // to whoever reads the deck rather than only to whoever reads this file.
  expect(deck.netlist).toContain(PROTECTED_RAIL_VOLTS.toExponential(12))
  expect(deck.netlist).toContain("spec section 6.1.3")
  expect(deck.netlist).toMatch(/^\.op$/m)
})
