/**
 * +9 V LA-2A-inspired optical compressor: the whole module, composed.
 *
 * Transcribed from `docs/superpowers/specs/2026-09-21-optical-compressor-design.md`
 * (revision 3), which is the sole authority for every component, value and
 * connection in this directory. Where that spec gives a revision-3 correction,
 * the CORRECTED value is the one carried across: R_E = 1 kOhm, C_DET = 4.7 uF,
 * R_LED = 3.3 kOhm, and a 1 MOhm wiper-to-VBIAS failsafe on PEAK REDUCTION in
 * place of revision 2's wiper-to-end rule. Each block records the sections it
 * came from and what it deliberately did not carry across.
 *
 * THE COMPOSITION, AND WHY IT IS THE POINT. The module is three blocks joined by
 * `include()`, not one flat function. `include()` prefixes every net inside an
 * included block EXCEPT the ones its declared ports name, which are bound to the
 * parent's nets here. THERE ARE NO IMPLICIT GLOBAL NETS: ground, the protected
 * rail, VBIAS and VBIAS_RAW are not special, and each crosses a boundary only
 * because a port declares it and this file binds it. Leaving one unbound is an
 * error rather than a default, so a rail that should be shared and is not
 * becomes a loud construction error instead of a quiet simulation result.
 *
 * HOW THE SPEC'S SECTIONS MAP ONTO THE THREE FILES:
 *
 *   parts/power-section.ts  section 8.1 power entry, protection, reservoir and
 *                           the VBIAS divider; J_PWR from section 10.1
 *   parts/audio-path.ts     sections 8.2, 8.3, 8.4; J_IN, J_OUT and J_GAIN from
 *                           section 10.1; U1's local decoupling from 8.1
 *   parts/sidechain.ts      sections 8.5, 8.6, 8.7, 8.8; J_PEAK and its wiper
 *                           failsafe from 10.1; U2's local decoupling from 8.1
 *
 * with ONE deliberate departure from that reading: section 8.1's VBIAS BUFFER is
 * declared in `sidechain.ts`, because section 8.1 assigns it to U2 section B
 * while U2 section A is the sidechain amplifier, and a component cannot be split
 * across an `include()` boundary. The power section hands the unbuffered divider
 * node across as `bias_raw` instead. That is file organisation, not a public
 * surface: spec section 11.1 draws the same distinction, and section 4's
 * prohibition on premature module extraction is about modules, not files.
 *
 * WHAT NO RESULT FROM THIS CIRCUIT MAY CLAIM. Gain reduction, threshold, ratio,
 * release or any other compression behaviour; driver bias of any kind, including
 * V_CE, headroom, rail-budget margin and any validation or refutation of section
 * 8.7.2's budget table; R_LED's value; or LED current. The reasons are in
 * `parts/sidechain.ts` and in
 * `docs/decisions/2026-09-22-vactrol-model-is-an-assumption.md`. The vactrol's
 * transfer law is an interpolation this project invented between the two
 * endpoints section 6.2 states, and section 4 names a calibrated gain-reduction
 * law among the design's non-goals. The one behavioural property asserted
 * anywhere against this circuit is VBIAS, which section 6.1.3 states as a target.
 *
 * TWO DEVICE MODELS THIS REPOSITORY DOES NOT HAVE. The 1N5817 protection diode
 * and the vactrol LED both declare no `spiceModel`, so a SPICE deck containing
 * either throws at emission naming the component. Nothing is substituted: both
 * blocks explain what the substitution would have cost.
 *
 * TWO SPEC SECTIONS DELIBERATELY NOT CARRIED ACROSS, named here because a module
 * claiming the spec as its sole authority has to state what it declined:
 *
 *  - SECTION 10's `OpticalCompressorProps` - the settable `shuntResistance`,
 *    `emitterResistance`, `detectorCapacitance`, `releaseResistance` and the
 *    rest, which section 10 says the section 12.2 bench protocol cannot run
 *    without. That interface is tscircuit-era surface: a component with props,
 *    defaults and layout coordinates. A circuit here is a zero-argument function
 *    returning a `Network`, and the spec's provisional values - which section 10
 *    says its defaults match - are transcribed as literals, the way
 *    `circuits/opamp-buffer.ts` transcribes the props its source module was only
 *    ever built with. A sweep over R_E or C_DET would want parameterisation
 *    back; that is a decision for whoever runs the bench protocol, not one to
 *    pre-empt here.
 *  - SECTION 10.2's TEST POINTS. Every node they name is already a net in this
 *    model, though only four of the ten are declared ports (OUT_PRE via
 *    `makeup_output`, +9V_PROTECTED via `rail`, VBIAS via `bias`, GND via
 *    `ground`); the other six - BUF_OUT, GR, SC_OUT, DET, Q_COLLECTOR and
 *    LED_K - are block-prefixed nets inside the composition. Either way a test
 *    point is a pad and a silkscreen label, which is PCB surface this model
 *    does not carry at all.
 */
import { circuit } from "../../lib/model/index.ts"
import type { Network } from "../../lib/model/index.ts"
import { powerSection } from "./parts/power-section.ts"
import { audioPath } from "./parts/audio-path.ts"
import { sidechain } from "./parts/sidechain.ts"

/** The module's own nets - the ones the parent owns, because a block's port
 * binds to them. Every other net in the composed network belongs to one block
 * and carries that block's prefix. */
const GND = "GND"
const SUPPLY_RAW = "+9V_RAW"
const RAIL = "+9V_PROTECTED"
const VBIAS = "VBIAS"
const VBIAS_RAW = "VBIAS_RAW"
const IN_EXT = "IN_EXT"
const OUT = "OUT"
const OUT_PRE = "OUT_PRE"
const MAKEUP_FB = "MAKEUP_FB"
const SC_IN = "SC_IN"

/** Composed component id -> what the spec calls that part, and the section that
 * states it. The spec names most of its parts (R_SHUNT, C_DET, J_PEAK) rather
 * than giving reference designators, and ids here are semantic, so this is where
 * the two vocabularies meet - the same role `DESIGNATORS` plays in
 * `circuits/pt2399-core.ts`, for a source that has designators. */
export const SPEC_NAMES: Readonly<Record<string, string>> = {
  power_power_terminal: "J_PWR (10.1)",
  power_reverse_polarity_diode: "series 1N5817 reverse-polarity protection (8.1)",
  power_supply_reservoir_cap: "47 uF bulk capacitance (8.1)",
  power_supply_bypass_cap: "100 nF high-frequency bypass (8.1)",
  power_bias_divider_upper: "upper 47k of the VBIAS divider (8.1)",
  power_bias_divider_lower: "lower 47k of the VBIAS divider (8.1)",
  power_bias_reservoir_cap: "47 uF divider-midpoint bypass (8.1)",
  power_bias_bypass_cap: "100 nF divider-midpoint bypass (8.1)",

  audio_input_terminal: "J_IN (10.1)",
  audio_input_coupling_cap: "100 nF input coupling capacitor (8.2)",
  audio_input_bias_resistor: "1 MOhm input-bias resistor (8.2)",
  audio_signal_opamp: "U1 audio package: A input buffer, B makeup amplifier (8.1)",
  audio_attenuator_series_resistor: "R_SHUNT (8.3)",
  audio_attenuator_photocell: "vactrol LDR (8.3, 9)",
  audio_makeup_gain_resistor: "R_GROUND, inverting input to VBIAS (7.2, 8.4)",
  audio_gain_terminal: "J_GAIN (10.1)",
  audio_output_coupling_cap: "2.2 uF output coupling capacitor (8.4)",
  audio_output_pulldown_resistor: "100 kOhm output pulldown (8.4)",
  audio_output_terminal: "J_OUT (10.1)",
  audio_supply_decoupling_cap: "U1 local 100 nF decoupling (8.1)",

  sidechain_peak_terminal: "J_PEAK (10.1)",
  sidechain_peak_wiper_failsafe_resistor: "1 MOhm wiper-to-VBIAS failsafe (10.1)",
  sidechain_control_opamp: "U2 control package: A sidechain amplifier, B VBIAS buffer (8.1)",
  sidechain_amplifier_bias_resistor: "R_BIAS (8.5)",
  sidechain_amplifier_feedback_resistor: "R_FEEDBACK (8.5)",
  sidechain_detector_coupling_cap: "1 uF sidechain coupling capacitor (8.6)",
  sidechain_detector_rectifier_diode: "1N4148 half-wave rectifier (8.6)",
  sidechain_detector_cap: "C_DET (8.6)",
  sidechain_release_resistor: "R_REL (8.6)",
  sidechain_driver_base_resistor: "R_B (8.6, 8.7)",
  sidechain_driver_base_pulldown_resistor: "100 kOhm base-to-ground pulldown (8.7)",
  sidechain_led_driver_transistor: "2N3904 low-side LED driver (8.7)",
  sidechain_driver_emitter_resistor: "R_E (8.7)",
  sidechain_led_sense_resistor: "10 Ohm LED sense resistor (8.8)",
  sidechain_vactrol_led: "vactrol LED (8.7, 9)",
  sidechain_led_current_limit_resistor: "R_LED (8.7.2)",
  sidechain_supply_decoupling_cap: "U2 local 100 nF decoupling (8.1)",
}

/** Which composed components make up spec section 8.1's VBIAS reference network.
 *
 * Exported because the operating-point deck that measures VBIAS is hand-built -
 * `toSpiceNetlist` requires a sweep and emits `.ac` unconditionally, so there is
 * no `.op` path through it - and that deck reads its element values and node
 * names out of this network rather than carrying its own copies. Naming the
 * three parts here keeps the deck from guessing at ids. */
export interface BiasReference {
  readonly dividerUpper: string
  readonly dividerLower: string
  readonly bufferComponent: string
  readonly bufferUnit: string
}

export const BIAS_REFERENCE: BiasReference = {
  dividerUpper: "power_bias_divider_upper",
  dividerLower: "power_bias_divider_lower",
  bufferComponent: "sidechain_control_opamp",
  bufferUnit: "B",
}

export function opticalCompressor(): Network {
  return circuit()
    .include("power", powerSection(), {
      ground: GND,
      rail: RAIL,
      bias_raw: VBIAS_RAW,
      supply_input: SUPPLY_RAW,
    })
    .include("audio", audioPath(), {
      ground: GND,
      rail: RAIL,
      bias: VBIAS,
      input: IN_EXT,
      output: OUT,
      makeup_output: OUT_PRE,
      gain_return: MAKEUP_FB,
    })
    .include("sidechain", sidechain(), {
      ground: GND,
      rail: RAIL,
      bias: VBIAS,
      bias_raw: VBIAS_RAW,
      makeup_output: OUT_PRE,
      peak_wiper: SC_IN,
    })

    // The module's external interface. Audio in and out, the supply, and the
    // three nets the two panel-pot connectors land on - the pots themselves are
    // external controls (section 10), so the module's boundary is the connector,
    // and the nets it carries have to be nameable from outside.
    //
    // `rail` is the one port here that does not leave the module through a
    // connector. It is declared because it is the node a simulation environment
    // has to drive and the node the hand-built bias deck names: section 6.1.3
    // states the module's numbers against the PROTECTED rail, and no 1N5817
    // model exists to derive it from `supply_input`.
    .port("input", IN_EXT)
    .port("output", OUT)
    .port("ground", GND)
    .port("supply_input", SUPPLY_RAW)
    .port("rail", RAIL)
    .port("bias", VBIAS)
    .port("makeup_output", OUT_PRE)
    .port("gain_return", MAKEUP_FB)
    .port("peak_wiper", SC_IN)

    .done()
}
