/**
 * Unity-gain op-amp buffer.
 *
 * Transcribed from `modules/opamp-buffer/OpampBuffer.tsx`, the tscircuit
 * module this repository is retiring; that file is the sole authority for
 * every component, value and connection below, and this port was written by
 * reading it rather than from memory of what a buffer looks like. The module
 * is deleted in the same commit that adds this file, so its content is
 * recorded here where it is load-bearing.
 *
 * THE SOURCE MODULE'S PARTS, AND WHERE EACH ONE WENT
 *
 *   C_IN    100nF 0805   -> input_coupling_cap
 *   R_BIAS  100k  0805   -> input_bias_resistor
 *   U       TL072 soic8  -> buffer_amp (one section, unit "A")
 *   C_OUT   100nF 0805   -> output_coupling_cap
 *   C_VCC   100nF 0805   -> vcc_decoupling_cap
 *   C_VEE   100nF 0805   -> vee_decoupling_cap
 *   J_IN    ScrewTerminal2 -> the `input` and `ground` ports
 *   J_OUT   ScrewTerminal2 -> the `output` and `ground` ports
 *   J_PWR   ScrewTerminal3 -> the `vcc`, `ground` and `vee` ports
 *
 * The three screw terminals are the ONE deliberate departure from a
 * one-component-for-one-component transcription, and it is recorded rather
 * than quiet. In tscircuit a module's external interface has to be a physical
 * part, because tscircuit lays out a board; in this model an external
 * interface is a declared port (`Network.ports`), which is what ports are
 * for. The SPICE emitter also refuses `kind: "connector"` outright and by
 * design, so a buffer carrying its screw terminals as components could not be
 * simulated at all. The cost is real and is stated here so nobody discovers
 * it by surprise: a bill of materials generated from this network will not
 * list the three screw terminals. Whether connectors should become components
 * with an emission rule is a question for the plan, not for this file.
 *
 * The source module's props `inputCap`, `outputCap` and `biasResistor` are
 * not parameters here. Their defaults were 100nF, 100nF and 100k, and both
 * instantiations in the repository (`index.circuit.tsx` and
 * `modules/opamp-buffer/opamp-buffer.circuit.tsx`) passed none of them, so
 * the defaults are the only values the module was ever built with. They are
 * transcribed as literals; nothing is inferred.
 *
 * SUPPLY SEMANTICS: A GENUINE BIPOLAR SUPPLY, established from the wiring.
 * `J_PWR` is a three-terminal screw connector whose P1 sits on VCC, P2 on GND
 * and P3 on VEE - three distinct nets on three distinct terminals. VEE is
 * reached by nothing but that connector pin, its own decoupling capacitor to
 * ground, and the op-amp's V- pin: there is no divider, no reference buffer
 * and no tie to ground anywhere in the module, so VEE is neither a virtual
 * half-rail nor ground. Each rail carries its own 100nF decoupling capacitor
 * to ground, which is the arrangement of a split supply, not of a single
 * rail with a biased reference. The module's header comment says "+15V
 * typical" / "-15V typical" and happens to agree, but the wiring above is
 * the evidence.
 *
 * THE OP-AMP IS ONE SECTION OF A DUAL PACKAGE. The TL072 has two amplifiers;
 * the module wires only section A (pins 1/2/3) and leaves section B's inputs
 * (pins 5/6) and output (pin 7) unconnected. One unit is declared here, for
 * the section that is used. An unused op-amp section with floating inputs is
 * poor practice in a real build, but this is a faithful port, not a redesign,
 * so it is recorded and not fixed. Note that section B is simply UNDECLARED -
 * no pin here is an explicit no-connect, and this circuit authors no `NC`.
 *
 * TL072 pinout, transcribed from the `lib/chips/TL072.tsx` this commit
 * deletes (DIP-8 / SOIC-8): 1 OUTA, 2 INA_N, 3 INA_P, 4 VEE, 5 INB_P,
 * 6 INB_N, 7 OUTB, 8 VCC. That file also recorded a JLCPCB supplier part
 * number for the SOIC-8 part, C6961 (TL072CDT); `PartSpec` has no supplier
 * field, so it is written down here rather than lost.
 *
 * THE SPICE MODEL IS NOT A TL072 MODEL. `part.mpn` is "TL072" because the
 * part is a TL072. `spiceModel` is "GENERIC_OPAMP" because no redistributable
 * TL072 macromodel could be vendored (see lib/sim/models/GENERIC_OPAMP.spice
 * for the licence trail). Those are two different claims, and simulation
 * results from this circuit are properties of a generic amplifier, not
 * predictions about a TL072.
 */
import { circuit, net } from "../lib/model/index.ts"
import type { Network } from "../lib/model/index.ts"

/** Semantic id -> the source module's part name (the `${name}_X` suffix). The
 * module had no reference designators of its own; these are what it called
 * its parts, kept so the transcription can be checked against it. Designators
 * proper belong to KiCad. */
export const SOURCE_PART_NAMES: Readonly<Record<string, string>> = {
  input_coupling_cap: "C_IN",
  input_bias_resistor: "R_BIAS",
  buffer_amp: "U",
  output_coupling_cap: "C_OUT",
  vcc_decoupling_cap: "C_VCC",
  vee_decoupling_cap: "C_VEE",
}

/** Nets, named as the source module named them. `IN_EXT` is the one net the
 * module left unnamed: it drew `J_IN.P1 -> C_IN.pin1` as a bare trace, so it
 * needs a name here and gets one that says what it is - the external input,
 * ahead of the coupling capacitor, as distinct from the module's own `IN`
 * (which is the biased node after it). */
const IN_EXT = "IN_EXT"
const IN = "IN"
const FB = "FB"
const OUT = "OUT"
const VCC = "VCC"
const VEE = "VEE"
const GND = "GND"

export function opampBuffer(): Network {
  return circuit()
    // Signal path. C_IN.pin1/pin2 and R_BIAS.pin1/pin2 map to a/b in that
    // order, matching the two-terminal pin numbering the rest of this
    // repository uses (PIN_NUMBERS in circuits/pt2399-core.ts).
    .capacitor("input_coupling_cap", "100nF", { a: IN_EXT, b: IN }, { footprint: "0805" })
    .resistor("input_bias_resistor", "100k", { a: IN, b: GND }, { footprint: "0805" })

    // The op-amp. `add()` rather than a builder shorthand because the builder
    // has none for a multi-unit active device (see lib/model/builder.ts).
    //
    // The unity-gain wiring is the two entries on FB: the section's output and
    // its own inverting input sit on one net, so the feedback factor is 1 and
    // the closed-loop gain is the open-loop gain divided by one plus itself -
    // just under unity. The output coupling capacitor hangs off that same net.
    .add({
      id: "buffer_amp",
      kind: "opamp",
      parameters: {},
      part: {
        mpn: "TL072",
        footprint: "soic8",
        symbol: "Amplifier_Operational:TL072",
        symbolPins: { A: { "in+": "3", "in-": "2", out: "1" } },
      },
      pins: { "v+": net(VCC), "v-": net(VEE) },
      units: [
        {
          name: "A",
          pins: { "in+": net(IN), "in-": net(FB), out: net(FB) },
          spiceModel: "GENERIC_OPAMP",
        },
      ],
    })

    .capacitor("output_coupling_cap", "100nF", { a: FB, b: OUT }, { footprint: "0805" })

    // Supply decoupling, one capacitor per rail to ground.
    .capacitor("vcc_decoupling_cap", "100nF", { a: VCC, b: GND }, { footprint: "0805" })
    .capacitor("vee_decoupling_cap", "100nF", { a: VEE, b: GND }, { footprint: "0805" })

    // Ports: every net that leaves the module, which is every net the three
    // screw terminals touched.
    .port("input", IN_EXT)
    .port("output", OUT)
    .port("vcc", VCC)
    .port("vee", VEE)
    .port("ground", GND)

    .done()
}
