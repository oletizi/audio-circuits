/**
 * Optical compressor: input buffer, optical attenuator and makeup amplifier.
 *
 * Spec sections 8.2, 8.3 and 8.4, plus `J_IN`, `J_OUT` and `J_GAIN` from section
 * 10.1 and U1's local decoupling from section 8.1. The authority for every
 * component, value and connection is
 * `docs/superpowers/specs/2026-09-21-optical-compressor-design.md`.
 *
 * U1 IS ONE COMPONENT WITH TWO UNITS. Spec section 8.1 assigns U1 (audio)
 * section A to the input buffer and section B to the makeup amplifier, so both
 * sections of this package are used and neither is left floating. The supply
 * pins sit on the COMPONENT rather than in either unit, which is what makes the
 * two sections share one package's rails; the emitter merges package pins into
 * each unit and lowers one unit to one device line.
 *
 * THE PART IS A TL072H AND THE MODEL IS GENERIC. Spec section 8.1 specifies a
 * TL072H - 4.5-40 V total supply, rail-to-rail output stage, which section 6.1.3
 * depends on at a 9 V rail - and warns explicitly against substituting this
 * repository's previous generic TL072 supplier part without verifying the exact
 * suffix. So `part.mpn` is "TL072H". `spiceModel` stays "GENERIC_OPAMP", for the
 * reason `circuits/opamp-buffer.ts` records: no redistributable TL072 (let alone
 * TL072H) macromodel could be vendored. The part and the model are separate
 * claims, and NO simulation result from this circuit predicts TL072H behaviour -
 * in particular GENERIC_OPAMP does not clip at its rails and has no supply
 * rejection, so nothing measured through it says anything about the swing
 * section 6.1.3 estimates.
 *
 * NO FOOTPRINT, SYMBOL OR PIN NUMBERING IS ASSERTED for the op-amp. The spec
 * gives the part number and its operating range and says nothing about package,
 * footprint, KiCad symbol or pinout, and this repository holds no verified
 * TL072H symbol. `circuits/opamp-buffer.ts` carries a TL072 pinout because it
 * transcribed one from a file that existed; there is nothing to transcribe here,
 * and inventing a footprint or a symbol id would be fabricated data reaching
 * fabrication output - the defect spec section 9 refuses for the vactrol and
 * this project refuses generally.
 *
 * THE GAIN POT IS NOT A BOARD PART. Spec section 10 states that the two panel
 * potentiometers "are external controls and connect through explicit module
 * terminals rather than being silently treated as board-mounted parts", so what
 * this block declares is `J_GAIN`, not a `potentiometer`. Section 10.1 requires
 * GAIN to be wired as a rheostat with its wiper tied to an end terminal, so an
 * intermittent wiper produces a bounded resistance rather than an open circuit
 * in the feedback path; WIPER and BOTTOM therefore land on one net here. WHICH
 * end terminal is "appropriate" fixes only the direction of rotation, and the
 * spec does not state it (section 7.1 leaves even the taper open), so nothing is
 * claimed about which way the control turns.
 *
 * THE PHOTOCELL'S RESISTANCE IS A STATED OPERATING POINT, NOT A CURVE. Spec
 * section 6.2 gives two endpoints - dark resistance at least 1 MOhm, illuminated
 * resistance at most 10.2 kOhm at the chosen maximum LED current - and no law
 * between them; section 4 names a calibrated gain-reduction law among the
 * design's non-goals. The value declared below is the DARK endpoint, 1 MOhm,
 * because that is the state in which the module's own DC operating point is
 * defined and because it is a selection REQUIREMENT the spec states, not a
 * measurement of any part. No gain, gain reduction, threshold, ratio or release
 * number may be taken from this circuit.
 */
import { circuit, net } from "../../../lib/model/index.ts"
import type { Network, PartSpec } from "../../../lib/model/index.ts"

/** See `power-section.ts`: spec section 10.1's connectors are inert, and the
 * emitter requires each to say so. No footprint or mpn is invented. */
const INERT_TERMINAL: PartSpec = { electricallyInert: true }

const IN_EXT = "IN_EXT"
const IN = "IN"
const BUF_OUT = "BUF_OUT"
const GR = "GR"
const MAKEUP_FB = "MAKEUP_FB"
const OUT_PRE = "OUT_PRE"
const OUT = "OUT"
const VBIAS = "VBIAS"
const RAIL = "+9V_PROTECTED"
const GND = "GND"

export function audioPath(): Network {
  return circuit()
    // Spec section 10.1: J_IN, "AC-coupled audio input", pins IN and GND.
    .connector("input_terminal", { IN: IN_EXT, GND: GND }, INERT_TERMINAL)

    // Section 8.2: "100 nF input coupling capacitor; 1 MOhm input-bias resistor
    // to VBIAS after the capacitor; nominal input impedance of 1 MOhm; and no
    // intentional voltage gain."
    .capacitor("input_coupling_cap", "100nF", { a: IN_EXT, b: IN })
    .resistor("input_bias_resistor", "1M", { a: IN, b: VBIAS })

    // U1. `add()` rather than a builder shorthand, because the builder has no
    // shorthand for a multi-unit active device.
    //
    // Section A is the unity-gain buffer of section 8.2: its output and its own
    // inverting input sit on one net, and the signal arrives at the
    // non-inverting one. Section B is the makeup amplifier of section 8.4: its
    // non-inverting input is "connected directly to the gain-reduction node",
    // with 10 kOhm from the inverting input to VBIAS and the GAIN pot in the
    // feedback path.
    .add({
      id: "signal_opamp",
      kind: "opamp",
      parameters: {},
      part: { mpn: "TL072H" },
      pins: { "v+": net(RAIL), "v-": net(GND) },
      units: [
        {
          name: "A",
          pins: { "in+": net(IN), "in-": net(BUF_OUT), out: net(BUF_OUT) },
          spiceModel: "GENERIC_OPAMP",
        },
        {
          name: "B",
          pins: { "in+": net(GR), "in-": net(MAKEUP_FB), out: net(OUT_PRE) },
          spiceModel: "GENERIC_OPAMP",
        },
      ],
    })

    // Section 8.3: "The buffered signal passes through R_SHUNT, initially
    // 22 kOhm, to the gain-reduction node. The vactrol LDR connects from that
    // node to VBIAS." The gain-reduction node is DC-biased at VBIAS through
    // R_SHUNT, so it has a defined operating point however high the LDR goes,
    // and section 8.3 forbids a coupling capacitor between the attenuator and
    // the makeup amplifier - both stages share the same VBIAS operating point.
    .resistor("attenuator_series_resistor", "22k", { a: BUF_OUT, b: GR })
    .add({
      id: "attenuator_photocell",
      kind: "photoresistor",
      // The vactrol's LDR half. Its LED half is in `sidechain.ts` and shares no
      // net with it: spec section 9 says there is no electrical control
      // connection between the two, and inventing one would destroy the
      // isolation that defines the part. 1 MOhm is the section 6.2 DARK
      // endpoint - see the header for why that operating point and no other.
      parameters: { ohms: 1e6 },
      pins: {},
      units: [{ name: "MAIN", pins: { a: net(GR), b: net(VBIAS) } }],
    })

    // Section 8.4 and section 7.2: gain = 1 + R_FEEDBACK / R_GROUND, with
    // R_GROUND = 10 kOhm to VBIAS and the 100 kOhm GAIN pot as R_FEEDBACK.
    .resistor("makeup_gain_resistor", "10k", { a: MAKEUP_FB, b: VBIAS })
    .connector(
      "gain_terminal",
      // Section 10.1: GAIN is a rheostat and its wiper is tied to an end
      // terminal, so WIPER and BOTTOM land on one net. An open wiper then leaves
      // a bounded resistance in the feedback path rather than an open circuit,
      // which would drive the makeup stage to maximum gain.
      { TOP: OUT_PRE, WIPER: MAKEUP_FB, BOTTOM: MAKEUP_FB },
      INERT_TERMINAL,
    )

    // Section 8.4: "2.2 uF output coupling capacitor followed by a 100 kOhm
    // output pulldown. If a polarized part is used, its positive terminal faces
    // the op-amp output" - so pin `a`, the first terminal, is the op-amp side.
    .capacitor("output_coupling_cap", "2.2uF", { a: OUT_PRE, b: OUT })
    .resistor("output_pulldown_resistor", "100k", { a: OUT, b: GND })
    .connector("output_terminal", { OUT: OUT, GND: GND }, INERT_TERMINAL)

    // Section 8.1: "Each op-amp package receives local 100 nF ceramic decoupling
    // directly between +9V_PROTECTED and ground."
    .capacitor("supply_decoupling_cap", "100nF", { a: RAIL, b: GND })

    // Ports. Ground is spelled exactly `ground`. `makeup_output` and
    // `gain_return` are the two nets the GAIN pot's terminals land on, and
    // `makeup_output` is also where the sidechain is tapped (section 8.5, before
    // the final output coupling capacitor).
    .port("ground", GND)
    .port("rail", RAIL)
    .port("bias", VBIAS)
    .port("input", IN_EXT)
    .port("output", OUT)
    .port("makeup_output", OUT_PRE)
    .port("gain_return", MAKEUP_FB)

    .done()
}
