/**
 * Optical compressor: power entry, protection, reservoir and the VBIAS divider.
 *
 * Spec section 8.1, plus `J_PWR` from section 10.1. The authority for every
 * component, value and connection here is
 * `docs/superpowers/specs/2026-09-21-optical-compressor-design.md`, read while
 * writing this file - not memory of what a pedal power section usually looks
 * like. Where the spec gives a revision-3 correction, the corrected value is the
 * one transcribed; revision 3's three circuit changes all land in
 * `sidechain.ts`, not here.
 *
 * WHAT THIS BLOCK DOES NOT CONTAIN, AND WHY.
 *
 * The VBIAS BUFFER is in `sidechain.ts`, although spec section 8.1 describes it
 * here. Section 8.1 assigns it to U2 section B, and U2 section A is the
 * sidechain amplifier; one component cannot be split across an `include()`
 * boundary, because `include()` copies whole components. So U2 is declared once,
 * in the block that holds the rest of it, and this block hands the unbuffered
 * divider node across the boundary through its `bias_raw` port. Only the
 * buffer's output is VBIAS; the node this block produces is VBIAS_RAW, and
 * section 8.1 is explicit that audio bias returns, the LDR shunt and the op-amp
 * gain-setting resistors connect to the former and never to the latter.
 *
 * The PER-PACKAGE 100 nF DECOUPLING capacitors that section 8.1 also specifies
 * sit with their packages, in `audio-path.ts` and `sidechain.ts`. Section 8.1
 * asks for them "directly between +9V_PROTECTED and ground" at each op-amp, so
 * placing them beside the package they decouple is the transcription; the rail
 * reaches them as a bound port, like every other net crossing a boundary.
 *
 * THE SCHOTTKY HAS NO SPICE MODEL, DELIBERATELY. `reverse_polarity_diode` is a
 * 1N5817 and declares no `spiceModel`, because no 1N5817 model is registered in
 * `lib/sim/models/` and none is invented here. Any deck containing this block
 * therefore throws at emission, naming this component. That is the intended
 * outcome: the only registered diode is a 1N4148, a silicon signal diode whose
 * drop is roughly 0.3 V higher than a Schottky's, and substituting it would move
 * the protected rail - the very quantity this diode exists to set, and the one
 * the module's whole bias budget is stated against (spec section 6.1.3). The
 * operating-point deck that measures VBIAS states the 8.7 V protected rail
 * directly instead, which is where section 6.1.3 already puts it.
 */
import { circuit, net } from "../../../lib/model/index.ts"
import type { Network, PartSpec } from "../../../lib/model/index.ts"

/** Spec section 10.1's connectors are screw terminals and pot headers - each
 * terminal is simply a place a wire lands, with no internal electrical
 * relationship of any kind - so each declares `electricallyInert`. The emitter
 * requires the declaration and will not guess it, because guessing "inert" is
 * how a switching part would disappear from a deck silently. There are no jacks
 * in this circuit and no switching behaviour is modelled.
 *
 * No footprint and no mpn: the spec names the connectors and their pins and
 * says nothing about packaging, and inventing either would be fabricated data. */
const INERT_TERMINAL: PartSpec = { electricallyInert: true }

const SUPPLY_RAW = "+9V_RAW"
const RAIL = "+9V_PROTECTED"
const BIAS_RAW = "VBIAS_RAW"
const GND = "GND"

export function powerSection(): Network {
  return circuit()
    // Spec section 10.1: J_PWR carries the pedal supply in. Pin names are the
    // connector's own, which is what `kind: "connector"`'s open vocabulary is for.
    .connector("power_terminal", { "+9V_RAW": SUPPLY_RAW, GND: GND }, INERT_TERMINAL)

    // Section 8.1: "Use a series 1N5817 Schottky diode between +9V_RAW and
    // +9V_PROTECTED, followed by 47 uF bulk capacitance and 100 nF
    // high-frequency bypassing to ground." See the header for why this diode
    // carries no SPICE model.
    .add({
      id: "reverse_polarity_diode",
      kind: "diode",
      parameters: {},
      part: { mpn: "1N5817" },
      pins: {},
      units: [{ name: "MAIN", pins: { anode: net(SUPPLY_RAW), cathode: net(RAIL) } }],
    })
    .capacitor("supply_reservoir_cap", "47uF", { a: RAIL, b: GND })
    .capacitor("supply_bypass_cap", "100nF", { a: RAIL, b: GND })

    // Section 8.1: "Generate VBIAS with two 47 kOhm resistors from
    // +9V_PROTECTED to ground. Bypass the divider midpoint with 47 uF in
    // parallel with 100 nF, then buffer it with one op-amp section."
    .resistor("bias_divider_upper", "47k", { a: RAIL, b: BIAS_RAW })
    .resistor("bias_divider_lower", "47k", { a: BIAS_RAW, b: GND })
    .capacitor("bias_reservoir_cap", "47uF", { a: BIAS_RAW, b: GND })
    .capacitor("bias_bypass_cap", "100nF", { a: BIAS_RAW, b: GND })

    // Ports. Ground is spelled exactly `ground`: that is the port key the net
    // preference rule requires, and it throws rather than falling back to a
    // tie-break when it is absent.
    .port("ground", GND)
    .port("rail", RAIL)
    .port("bias_raw", BIAS_RAW)
    .port("supply_input", SUPPLY_RAW)

    .done()
}
