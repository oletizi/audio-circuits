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
 * auto-generated "Net-(...)" names.
 *
 * ONE CONNECTION IS DELIBERATELY NOT TRANSCRIBED, and this is the whole of
 * it: U1 pin 5 (CLK_O) is unused, and the netlist shows it on
 * "unconnected-(U1-CLK_O-Pad5)" - the placeholder name KiCad's exporter
 * gives a symbol pin with nothing on it. That name is the exporter saying
 * "no connection", so this model says the same thing the way the model has
 * for saying it: the pin is declared NC. There is no net to carry and no
 * port to declare.
 *
 * **IT WAS A PORT UNTIL 2026-10-24, and what the port claimed was false.** A
 * port in this model means a net that leaves the board; CLK_O leaves
 * nothing. The port existed so that the placeholder's one-member net would
 * satisfy validation, and the comment that stood here said in terms that it
 * "does not imply the pin does anything off-board" - a false declaration
 * with its falsehood documented beside it. It also only ever satisfied one
 * of the two validators: lib/schgen/ir/validate-nets.ts refused the board on
 * that net all the same. Both are gone.
 *
 * **SO THE MODEL'S NET SET IS NO LONGER THE EXPORT'S NET SET, by exactly one
 * net, and the comparison that checks them against each other knows about
 * that one pin and nothing wider.** tests/circuits/pt2399-core.test.ts keys
 * its tolerance on the pins THIS FILE declares NC - never on the shape of a
 * one-member net, which is also what a connection dropped by accident looks
 * like. docs/known-gaps.md G283 records the tolerance and what it refuses.
 */
import { circuit, NC } from "../../lib/model/index.ts"
import type { Network } from "../../lib/model/index.ts"
import type { BomConditions, BomConditionsExport } from "../../tools/bom/conditions.ts"

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
        // Unused. The netlist shows it on KiCad's "unconnected-(...)"
        // placeholder, which is the exporter's way of writing this.
        "5": NC,
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

    // Ports: every net that leaves the board. Five, which is J1's pin count.
    .port("vcc", "+5V")
    .port("gnd", "GND")
    .port("vco", "VCO")
    .port("output", "OUTPUT")
    .port("input", "INPUT")

    .done()
}

/**
 * **THE RAIL VOLTAGE THIS BOARD RUNS AT, declared once and read by both the conditions
 * below and the test that holds them to the model.** 5 V: the `+5V` net this
 * transcription carries on J1 pin 1, and the figure the owner's judgement below is a
 * statement about. `tests/circuits/pt2399-core.test.ts` asserts that the port the
 * conditions put this rail on is still the port whose net is named `+5V`, so the
 * declaration cannot drift from the circuit it describes.
 */
const RAIL_VOLTS = 5

/** The port the rail sits on. `railBoundResistorWatts` refuses a port this circuit does
 * not declare, which is what attaches the voltage above to the model rather than
 * leaving it floating beside it. */
const RAIL_PORT = "vcc"

/**
 * **THIS BOARD'S RESISTOR POWER RATING COMES FROM A RAIL BOUND, NOT FROM A SIMULATED
 * OPERATING POINT, and that is a narrower claim rather than an escape from one.** On a
 * single 5 V rail the worst case for any resistor is the whole rail across it, so
 * `P <= V^2 / R` is arithmetic - no source, no load and no SPICE model needed. The
 * owner, 2026-10-30, supplying the engineering judgement:
 *
 * > *"pt2399 is a 5 volt dsp chip. It doesn't need to be above 1/4 watt"*
 *
 * `tools/bom/rail-bound.ts` turns that claim into a check that can fail: it computes
 * the smallest resistance a 1/4 W part covers at the declared rail (200 ohms, which is
 * `requiredResistorWatts` read backwards rather than a number written down here) and
 * refuses by name any resistor below it. This board's smallest is `output_mix_resistor`
 * at 2.7K, 13.5 times the threshold, dissipating at most 9.3 mW. Raise the declared
 * rail far enough, or add a small resistor, and the declaration stops being true and
 * starts failing. `docs/research/2026-10-30-rail-bound-power.md` records the reasoning,
 * the margin, and both refusal arms firing.
 *
 * **WHY THE BOUND IS THE ROUTE: the simulation path is genuinely unavailable, not
 * merely unattempted.** This export REFUSED until 2026-10-30, and the measured
 * diagnosis behind that refusal is kept here because it is the evidence for the
 * sentence above. `deriveNeeds` requires a dissipation figure for every resistor - this
 * board has eight - and `resistorDissipation` supplies it by solving a DC operating
 * point. `[RAN 2026-10-30]`, each failure read from the run rather than inferred:
 *
 * 1. `resolveNetwork` refuses `Missing ground port: ground`. `GROUND_PORT_KEY` in
 *    `lib/model/net-preference.ts` is the literal `"ground"` and this circuit keys its
 *    reference port `"gnd"`. Still left alone, and now it costs nothing: the rail-bound
 *    path resolves no control state and runs no simulation, so it never asks.
 * 2. With the port renamed, `toSpiceOperatingPointNetlist` refuses
 *    `component "delay_ic" unit "MAIN": kind "ic" has no SPICE emission rule in this
 *    emitter`. **That was and is the real blocker**: the PT2399 is the only active
 *    device on the board, nothing in `lib/sim/models/` is a PT2399, and the DC solution
 *    every resistor's wattage would come from is a statement about its two internal
 *    op-amps. `docs/schematic/generation-prior-art-circuit-families.md` found both of
 *    these independently, before this.
 * 3. `environment.source` and `environment.load` have no basis here. Nothing in this
 *    repository records what drives `INPUT` or loads `OUTPUT` - there is no bench
 *    environment for it as there is for the staged preamp
 *    (`circuits/transistor-preamp/staged-environment.ts`) - and both the series and
 *    load resistances land in the deck and move the operating point. **The rail-bound
 *    arm carries neither, which is why it is a separate arm and not a flag**: a board
 *    taking it is never in a position to invent them.
 *
 * `tests/circuits/pt2399-core.test.ts` re-measures (1) and (2) against the live code,
 * so the day a PT2399 DC model lands this reasoning fails rather than going stale. At
 * that point the stronger claim is available and this board should take it: an
 * operating point is tighter than a rail bound everywhere.
 */
export const bomConditions: BomConditionsExport = (): BomConditions => {
  return {
    description:
      `Supply ${RAIL_VOLTS} V on "+5V" (J1 pin 1); no controls. Resistor power ratings are bounded ` +
      "by the rail, not simulated.",
    railBound: {
      supplies: [{ port: RAIL_PORT, volts: RAIL_VOLTS }],
      ratedWatts: 0.25,
      basis:
        'the owner, 2026-10-30: "pt2399 is a 5 volt dsp chip. It doesn\'t need to be above 1/4 watt"',
    },
    controlState: { potPositions: {}, switchPositions: {} },
  }
}

/** The rail the parts-list conditions bound this board's resistors by, exported so the
 * test that checks the declaration against the model reads the same two values the
 * declaration does rather than retyping them. */
export const BOM_RAIL: Readonly<{ port: string; volts: number }> = {
  port: RAIL_PORT,
  volts: RAIL_VOLTS,
}
