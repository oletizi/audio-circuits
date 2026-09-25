/**
 * Transistor preamp lab board.
 *
 * One common-emitter 2N3904 stage whose bias network, collector load and
 * emitter bypass are reconfigured with jumpers and trim-pots, for the bench
 * sequence in docs/transistor-preamp/microphone-preamp-feedback-lab.md
 * (Builds 0, 1, 2A DC-coupled, and 2B).
 *
 * THIS IS A DESIGN, NOT A TRANSCRIPTION. The brief states the nominal stage
 * (80k/10k divider, 1.8k collector, 1.5k emitter, 9 V, 2N3904). Everything
 * around it is specified in
 * docs/superpowers/specs/2026-09-23-transistor-preamp-lab-design.md, which is
 * the authority for every part below. Values are bench starting points, not
 * design targets: a range that proves wrong is fixed by swapping a part.
 *
 * RHEOSTAT WIRING is described in ./parts.ts, which this board shares with
 * the collector-feedback board. Each adjustable bias leg also
 * has a fixed "floor" resistor in series, so no setting drives the base
 * directly from a rail, and a 2-pin jumper that takes the leg out entirely.
 *
 * THE EMITTER. One fixed 1.5k carries all the DC, so the bias never depends
 * on a pot. A separate AC branch (jumper, 220uF, 1k trim) sits beside it: at
 * audio frequencies the unbypassed resistance is roughly 1.5k || R_trim, from
 * fully bypassed (trim at 0) to fully unbypassed (jumper removed). The spec
 * section 3.3 records why this departs from the brief's series split.
 *
 * CAPACITORS ARE PLACEHOLDERS until the bench confirms them. The brief gives
 * no coupling or bypass values. Each electrolytic's + terminal is pin a
 * (pin 1 on Device:C_Polarized) and faces the higher DC node: BASE for the
 * input cap, COLLECTOR for the output cap, the emitter side for the bypass
 * cap, VCC for the decoupling cap. The 100uF supply decoupling cap is not in
 * the brief; it is a design choice.
 *
 * TEST POINTS on VCC, BASE, EMITTER, COLLECTOR, GND, IN_EXT and OUT give every
 * node the brief asks to measure a probe or clip point. BASE, EMITTER and
 * COLLECTOR are also ports, which keeps those canonical net names when a
 * fitted jumper merges a leg's internal net into them.
 */
import { circuit } from "../../lib/model/index.ts"
import type { Network, PartSpec } from "../../lib/model/index.ts"
import {
  HEADER_2, RESISTOR, addLeg, electrolytic, jumper, transistor2N3904, trim,
} from "./parts.ts"
import type { Leg } from "./parts.ts"

export type { Leg }
export { PIN_NUMBERS } from "./parts.ts"

export type LegName = "upper" | "feedback" | "lowerA" | "lowerB" | "collector" | "emitterBypass"

export const LEGS: Readonly<Record<LegName, Leg>> = {
  upper: {
    jumperId: "upper_bias_jumper",
    floor: { id: "upper_bias_floor", value: "47k" },
    trimId: "upper_bias_trim", trim: "50k",
  },
  feedback: {
    jumperId: "feedback_bias_jumper",
    floor: { id: "feedback_bias_floor", value: "470k" },
    trimId: "feedback_bias_trim", trim: "1M",
  },
  lowerA: {
    jumperId: "lower_bias_a_jumper",
    floor: { id: "lower_bias_a_floor", value: "4.7k" },
    trimId: "lower_bias_a_trim", trim: "10k",
  },
  lowerB: {
    jumperId: "lower_bias_b_jumper",
    floor: { id: "lower_bias_b_floor", value: "47k" },
    trimId: "lower_bias_b_trim", trim: "200k",
  },
  collector: {
    floor: { id: "collector_floor", value: "1k" },
    trimId: "collector_trim", trim: "2k",
  },
  emitterBypass: {
    jumperId: "emitter_bypass_jumper",
    trimId: "emitter_bypass_trim", trim: "1k",
  },
}

const VCC = "VCC"
const GND = "GND"
const IN_EXT = "IN_EXT"
const BASE = "BASE"
const EMITTER = "EMITTER"
const COLLECTOR = "COLLECTOR"
const OUT = "OUT"

const TEST_POINT: PartSpec = {
  footprint: "Connector_PinHeader_2.54mm:PinHeader_1x01_P2.54mm_Vertical",
  symbol: "Connector:TestPoint",
  electricallyInert: true,
}

export function transistorPreampLab(): Network {
  const builder = circuit()

  addLeg(builder, LEGS.upper, "UPPER", VCC, BASE)
  addLeg(builder, LEGS.feedback, "FEEDBACK", COLLECTOR, BASE)
  addLeg(builder, LEGS.lowerA, "LOWER_A", BASE, GND)
  addLeg(builder, LEGS.lowerB, "LOWER_B", BASE, GND)
  addLeg(builder, LEGS.collector, "COLLECTOR_LOAD", VCC, COLLECTOR)

  // Emitter: the fixed DC path, and beside it the jumpered AC bypass branch.
  builder.resistor("emitter_dc_resistor", "1.5k", { a: EMITTER, b: GND }, RESISTOR)
  const bypass = LEGS.emitterBypass
  if (bypass.jumperId === undefined) throw new Error("the emitter bypass leg must have a jumper")
  builder.add(jumper(bypass.jumperId, EMITTER, "BYPASS_JUMPED"))
  builder.capacitor("emitter_bypass_cap", "220uF", { a: "BYPASS_JUMPED", b: "BYPASS_CAP" },
    electrolytic("CP_Radial_D8.0mm_P3.50mm"))
  builder.add(trim(bypass.trimId, bypass.trim, "BYPASS_CAP", GND))

  builder
    .add(transistor2N3904("gain_transistor", BASE, COLLECTOR, EMITTER))
    .capacitor("input_coupling_cap", "10uF", { a: BASE, b: IN_EXT },
      electrolytic("CP_Radial_D5.0mm_P2.00mm"))
    .capacitor("output_coupling_cap", "10uF", { a: COLLECTOR, b: OUT },
      electrolytic("CP_Radial_D5.0mm_P2.00mm"))
    .capacitor("supply_decoupling_cap", "100uF", { a: VCC, b: GND },
      electrolytic("CP_Radial_D6.3mm_P2.50mm"))
    .connector("input_header", { "1": IN_EXT, "2": GND }, HEADER_2)
    .connector("output_header", { "1": OUT, "2": GND }, HEADER_2)
    .connector("power_header", { "1": VCC, "2": GND }, HEADER_2)
    .connector("vcc_test_point", { "1": VCC }, TEST_POINT)
    .connector("base_test_point", { "1": BASE }, TEST_POINT)
    .connector("emitter_test_point", { "1": EMITTER }, TEST_POINT)
    .connector("collector_test_point", { "1": COLLECTOR }, TEST_POINT)
    .connector("ground_test_point", { "1": GND }, TEST_POINT)
    .connector("input_test_point", { "1": IN_EXT }, TEST_POINT)
    .connector("output_test_point", { "1": OUT }, TEST_POINT)
    .port("input", IN_EXT)
    .port("output", OUT)
    .port("vcc", VCC)
    .port("ground", GND)
    .port("base", BASE)
    .port("emitter", EMITTER)
    .port("collector", COLLECTOR)

  return builder.done()
}

/** Semantic id -> KiCad reference designator. The only place the two vocabularies meet. */
export const DESIGNATORS: Readonly<Record<string, string>> = {
  upper_bias_jumper: "JP1", upper_bias_floor: "R1", upper_bias_trim: "RV1",
  feedback_bias_jumper: "JP2", feedback_bias_floor: "R2", feedback_bias_trim: "RV2",
  lower_bias_a_jumper: "JP3", lower_bias_a_floor: "R3", lower_bias_a_trim: "RV3",
  lower_bias_b_jumper: "JP4", lower_bias_b_floor: "R4", lower_bias_b_trim: "RV4",
  collector_floor: "R5", collector_trim: "RV5",
  emitter_dc_resistor: "R6",
  emitter_bypass_jumper: "JP5", emitter_bypass_cap: "C1", emitter_bypass_trim: "RV6",
  input_coupling_cap: "C2", output_coupling_cap: "C3", supply_decoupling_cap: "C4",
  gain_transistor: "Q1",
  input_header: "J1", output_header: "J2", power_header: "J3",
  vcc_test_point: "TP1", base_test_point: "TP2", emitter_test_point: "TP3",
  collector_test_point: "TP4", ground_test_point: "TP5", input_test_point: "TP6",
  output_test_point: "TP7",
}
