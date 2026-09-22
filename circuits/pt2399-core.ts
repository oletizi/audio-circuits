/**
 * PT2399 delay core.
 *
 * Transcribed from the netlist of a unit that was built and works (pedals
 * repository, pt2399/pt2399-core). The authority for this transcription is
 * `tests/fixtures/pt2399-core-veroroute.net` - the EESchema legacy netlist
 * VeroRoute consumed to lay out the perfboard that was actually built.
 * Every component, value and connection below comes from that file, read
 * with `importLegacyNetlist`, not from memory or a PT2399 datasheet.
 *
 * Semantic ids describe each part's role, inferred from which nets it sits
 * on (including the PT2399's own symbol-derived pin labels, e.g.
 * "U1-LPF1-IN", which are themselves part of the transcribed data).
 * DESIGNATORS maps ids to the schematic's reference designators; that
 * mapping belongs to KiCad, not to this circuit, and exists only so the
 * verification test can compare the two.
 *
 * Net names are copied verbatim from the netlist, including KiCad's
 * auto-generated "Net-(...)" names and the "unconnected-(...)" placeholder
 * net KiCad assigns to a floating symbol pin (U1 pin 5 / CLK_O here). That
 * placeholder net has exactly one member, so - like every other net that
 * leaves the board - it needs a declared port to satisfy validation; the
 * port does not imply the pin does anything off-board, only that the
 * netlist shows it on a net rather than showing no connection at all.
 */
import { circuit } from "../lib/model/index.ts"
import type { Network } from "../lib/model/index.ts"

/** Semantic id -> the built unit's reference designator. */
export const DESIGNATORS: Readonly<Record<string, string>> = {
  supply_bypass_local: "C1",
  supply_bulk: "C2",
  reference_bypass: "C3",
  oscillator_cc1_bypass: "C4",
  oscillator_cc0_bypass: "C5",
  lpf1_feedback_cap: "C6",
  input_coupling_cap: "C7",
  lpf1_node_filter_cap: "C8",
  output_node_filter_cap: "C9",
  output_coupling_cap: "C10",
  lpf2_feedback_cap: "C11",
  regen_node_filter_cap: "C12",
  op2_feedback_cap: "C13",
  op1_feedback_cap: "C14",
  lpf1_input_resistor: "R1",
  lpf1_feedback_resistor: "R2",
  input_mix_resistor: "R3",
  input_bias_resistor: "R4",
  output_mix_resistor: "R5",
  regen_feedback_resistor: "R6",
  regen_input_resistor: "R7",
  op2_mix_resistor: "R8",
  delay_ic: "U1",
  power_signal_header: "J1",
}

/** Canonical pin -> KiCad pin number, per kind. Two-terminal passives are 1/2. */
export const PIN_NUMBERS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  resistor: { a: "1", b: "2" },
  capacitor: { a: "1", b: "2" },
}

export function pt2399Core(): Network {
  return circuit()
    // Supply decoupling.
    .capacitor("supply_bypass_local", ".1uF", { a: "+5V", b: "GND" })
    .capacitor("supply_bulk", "100uF", { a: "+5V", b: "GND" })

    // PT2399 reference and internal-oscillator bypassing.
    .capacitor("reference_bypass", "47uF", { a: "Net-(U1-REF)", b: "GND" })
    .capacitor("oscillator_cc0_bypass", ".1uF", { a: "Net-(U1-CC0)", b: "GND" })
    .capacitor("oscillator_cc1_bypass", ".1uF", { a: "Net-(U1-CC1)", b: "GND" })

    // Input path.
    .capacitor("input_coupling_cap", "4.7uF", { a: "Net-(C7-Pad1)", b: "INPUT" })
    .resistor("input_bias_resistor", "100K", { a: "INPUT", b: "GND" })
    .resistor("input_mix_resistor", "15K", { a: "Net-(C8-Pad2)", b: "Net-(C7-Pad1)" })

    // LPF1 summing/filter node (Net-(C8-Pad2)).
    .capacitor("lpf1_node_filter_cap", "5600pF", { a: "GND", b: "Net-(C8-Pad2)" })
    .resistor("lpf1_input_resistor", "10K", { a: "Net-(C8-Pad2)", b: "Net-(U1-LPF1-IN)" })
    .resistor("lpf1_feedback_resistor", "15K", { a: "Net-(C8-Pad2)", b: "Net-(U1-LPF1-OUT)" })
    .capacitor("lpf1_feedback_cap", "560pF", { a: "Net-(U1-LPF1-IN)", b: "Net-(U1-LPF1-OUT)" })

    // LPF2 / regeneration node (Net-(C12-Pad1)).
    .capacitor("regen_node_filter_cap", "5600pF", { a: "Net-(C12-Pad1)", b: "GND" })
    .resistor("regen_feedback_resistor", "15K", { a: "Net-(U1-LPF2-OUT)", b: "Net-(C12-Pad1)" })
    .resistor("regen_input_resistor", "10K", { a: "Net-(C12-Pad1)", b: "Net-(U1-LPF2-IN)" })
    .resistor("op2_mix_resistor", "15K", { a: "Net-(U1-OP2-OUT)", b: "Net-(C12-Pad1)" })
    .capacitor("lpf2_feedback_cap", "560pF", { a: "Net-(U1-LPF2-IN)", b: "Net-(U1-LPF2-OUT)" })

    // Op-amp feedback caps.
    .capacitor("op1_feedback_cap", ".1uF", { a: "Net-(U1-OP1-OUT)", b: "Net-(U1-OP1-IN)" })
    .capacitor("op2_feedback_cap", ".1uF", { a: "Net-(U1-OP2-IN)", b: "Net-(U1-OP2-OUT)" })

    // Output path.
    .resistor("output_mix_resistor", "2.7K", { a: "Net-(C10-Pad1)", b: "Net-(U1-LPF2-OUT)" })
    .capacitor("output_node_filter_cap", ".01uF", { a: "Net-(C10-Pad1)", b: "GND" })
    .capacitor("output_coupling_cap", "10uF", { a: "Net-(C10-Pad1)", b: "OUTPUT" })

    // The delay IC. Pin names are the PT2399's pin numbers, as strings.
    .ic("delay_ic", {
      "1": "+5V",
      "2": "Net-(U1-REF)",
      "3": "GND",
      "4": "GND",
      "5": "unconnected-(U1-CLK_O-Pad5)",
      "6": "VCO",
      "7": "Net-(U1-CC1)",
      "8": "Net-(U1-CC0)",
      "9": "Net-(U1-OP1-OUT)",
      "10": "Net-(U1-OP1-IN)",
      "11": "Net-(U1-OP2-IN)",
      "12": "Net-(U1-OP2-OUT)",
      "13": "Net-(U1-LPF2-IN)",
      "14": "Net-(U1-LPF2-OUT)",
      "15": "Net-(U1-LPF1-OUT)",
      "16": "Net-(U1-LPF1-IN)",
    })

    // The external header. Pin names are the connector's pin numbers, as strings.
    .connector("power_signal_header", {
      "1": "+5V",
      "2": "GND",
      "3": "VCO",
      "4": "OUTPUT",
      "5": "INPUT",
    })

    // Ports: every net that leaves the board, plus the floating CLK_O pin's
    // placeholder net (a single-pin net needs one to satisfy validation - see
    // the module comment above).
    .port("vcc", "+5V")
    .port("gnd", "GND")
    .port("vco", "VCO")
    .port("output", "OUTPUT")
    .port("input", "INPUT")
    .port("clk_o_unused", "unconnected-(U1-CLK_O-Pad5)")

    .done()
}
