/**
 * PT2399 delay core.
 *
 * Transcribed from the netlist of a unit that was built and works. The
 * authority for this transcription is `tests/fixtures/pt2399-core-veroroute.net`
 * - the EESchema legacy netlist VeroRoute consumed to lay out the perfboard
 * that was actually built.
 * Every component, value and connection below comes from that file, read
 * with `importLegacyNetlist`, not from memory or a PT2399 datasheet.
 * Component footprints are transcribed from `tests/fixtures/pt2399-core.net`,
 * the checked-in modern netlist of the built unit. C2's footprint was
 * briefly inflated to a larger radial body (`CP_Radial_D8.0mm_P3.50mm`) to
 * buy pad span, back when the VeroRoute fork could not yet stretch a
 * radial electrolytic's leads to fit a smaller-diameter part across wider
 * perfboard holes. The operator later corrected the schematic once the fork
 * gained lead-stretching for electrolytics, and the modern netlist now
 * carries C2's true footprint, `CP_Radial_D5.0mm_P2.00mm`. The board
 * (`boards/pt2399-core/`) carries `PART C2 CAP_ELECTRO_200`, confirming the
 * corrected footprint is what was actually built - the truthful footprint
 * belongs here, not the larger body some earlier reader might be tempted to
 * "helpfully" restore.
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
    .capacitor("supply_bypass_local", ".1uF", { a: "+5V", b: "GND" },
      { footprint: "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm" })
    .capacitor("supply_bulk", "100uF", { a: "+5V", b: "GND" },
      { footprint: "Capacitor_THT:CP_Radial_D5.0mm_P2.00mm" })

    // PT2399 reference and internal-oscillator bypassing.
    .capacitor("reference_bypass", "47uF", { a: "Net-(U1-REF)", b: "GND" },
      { footprint: "Capacitor_THT:CP_Radial_D6.3mm_P2.50mm" })
    .capacitor("oscillator_cc0_bypass", ".1uF", { a: "Net-(U1-CC0)", b: "GND" },
      { footprint: "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm" })
    .capacitor("oscillator_cc1_bypass", ".1uF", { a: "Net-(U1-CC1)", b: "GND" },
      { footprint: "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm" })

    // Input path.
    .capacitor("input_coupling_cap", "4.7uF", { a: "Net-(C7-Pad1)", b: "INPUT" },
      { footprint: "Capacitor_THT:CP_Radial_D5.0mm_P2.50mm" })
    .resistor("input_bias_resistor", "100K", { a: "INPUT", b: "GND" },
      { footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal" })
    .resistor("input_mix_resistor", "15K", { a: "Net-(C8-Pad2)", b: "Net-(C7-Pad1)" },
      { footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal" })

    // LPF1 summing/filter node (Net-(C8-Pad2)).
    .capacitor("lpf1_node_filter_cap", "5600pF", { a: "GND", b: "Net-(C8-Pad2)" },
      { footprint: "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm" })
    .resistor("lpf1_input_resistor", "10K", { a: "Net-(C8-Pad2)", b: "Net-(U1-LPF1-IN)" },
      { footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal" })
    .resistor("lpf1_feedback_resistor", "15K", { a: "Net-(C8-Pad2)", b: "Net-(U1-LPF1-OUT)" },
      { footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal" })
    .capacitor("lpf1_feedback_cap", "560pF", { a: "Net-(U1-LPF1-IN)", b: "Net-(U1-LPF1-OUT)" },
      { footprint: "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm" })

    // LPF2 / regeneration node (Net-(C12-Pad1)).
    .capacitor("regen_node_filter_cap", "5600pF", { a: "Net-(C12-Pad1)", b: "GND" },
      { footprint: "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm" })
    .resistor("regen_feedback_resistor", "15K", { a: "Net-(U1-LPF2-OUT)", b: "Net-(C12-Pad1)" },
      { footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal" })
    .resistor("regen_input_resistor", "10K", { a: "Net-(C12-Pad1)", b: "Net-(U1-LPF2-IN)" },
      { footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal" })
    .resistor("op2_mix_resistor", "15K", { a: "Net-(U1-OP2-OUT)", b: "Net-(C12-Pad1)" },
      { footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal" })
    .capacitor("lpf2_feedback_cap", "560pF", { a: "Net-(U1-LPF2-IN)", b: "Net-(U1-LPF2-OUT)" },
      { footprint: "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm" })

    // Op-amp feedback caps.
    .capacitor("op1_feedback_cap", ".1uF", { a: "Net-(U1-OP1-OUT)", b: "Net-(U1-OP1-IN)" },
      { footprint: "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm" })
    .capacitor("op2_feedback_cap", ".1uF", { a: "Net-(U1-OP2-IN)", b: "Net-(U1-OP2-OUT)" },
      { footprint: "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm" })

    // Output path.
    .resistor("output_mix_resistor", "2.7K", { a: "Net-(C10-Pad1)", b: "Net-(U1-LPF2-OUT)" },
      { footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal" })
    .capacitor("output_node_filter_cap", ".01uF", { a: "Net-(C10-Pad1)", b: "GND" },
      { footprint: "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm" })
    .capacitor("output_coupling_cap", "10uF", { a: "Net-(C10-Pad1)", b: "OUTPUT" },
      { footprint: "Capacitor_THT:CP_Radial_D5.0mm_P2.50mm" })

    // The delay IC. Pin names are the PT2399's pin numbers, as strings.
    // "PT2399" is a genuine manufacturer part number (Princeton Technology),
    // so it belongs in part.mpn; "Audio:PT2399" is the KiCad symbol library
    // id the modern netlist's (libsource (lib "Audio") (part "PT2399"))
    // records for U1.
    .ic(
      "delay_ic",
      {
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
      },
      { mpn: "PT2399", symbol: "Audio:PT2399", footprint: "Package_DIP:DIP-16_W7.62mm" },
    )

    // The external header. Pin names are the connector's pin numbers, as strings.
    // "Conn_01x05" is a KiCad generic-connector *symbol* name, not a
    // manufacturer part number - there is no genuine MPN for a generic
    // 5-pin header, so it belongs in part.symbol, not part.mpn.
    // "Connector_Generic:Conn_01x05" is the KiCad symbol library id the
    // modern netlist's (libsource (lib "Connector_Generic") (part
    // "Conn_01x05")) records for J1.
    .connector(
      "power_signal_header",
      {
        "1": "+5V",
        "2": "GND",
        "3": "VCO",
        "4": "OUTPUT",
        "5": "INPUT",
      },
      { symbol: "Connector_Generic:Conn_01x05", footprint: "Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical" },
    )

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
