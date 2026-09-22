/**
 * Optical compressor: sidechain amplifier, detector, LED driver and sense
 * resistor - plus the VBIAS buffer, which shares U2 with the sidechain
 * amplifier.
 *
 * Spec sections 8.5, 8.6, 8.7 and 8.8, plus `J_PEAK` and its wiper failsafe from
 * section 10.1, U2's section assignment and local decoupling from section 8.1.
 * The authority for every component, value and connection is
 * `docs/superpowers/specs/2026-09-21-optical-compressor-design.md`. All three of
 * revision 3's circuit changes land in this file, and each is transcribed at its
 * CORRECTED value: R_E = 1 kOhm (new in revision 3, section 8.7), C_DET = 4.7 uF
 * (down from revision 2's 10 uF, section 8.6), and the 1 MOhm wiper-to-VBIAS
 * failsafe on PEAK REDUCTION (section 10.1, replacing revision 2's
 * wiper-to-end rule, which would have shorted out the divider). R_LED is 3.3 kOhm,
 * revised from 4.7 kOhm in the same revision to pay for the 1.5 V now dropped
 * across R_E.
 *
 * WHY THE VBIAS BUFFER IS HERE AND NOT IN `power-section.ts`. Spec section 8.1
 * assigns U2 (control) section A to the sidechain amplifier and section B to the
 * VBIAS buffer. A component cannot be split across an `include()` boundary -
 * `include()` copies whole components - so U2 is declared once, here, and the
 * power section hands its unbuffered divider node across the boundary as the
 * `bias_raw` port. Only this buffer's output is VBIAS.
 *
 * ALL FOUR OP-AMP SECTIONS ACROSS THE TWO PACKAGES ARE USED, so none is left
 * floating and this circuit authors no no-connect. Section 8.1's reason for
 * splitting them this way is recorded there: keeping the sidechain amplifier out
 * of the audio package separates a transient-rich, rectifier-loaded stage from
 * the two clean audio stages.
 *
 * THE PEAK REDUCTION POT IS NOT A BOARD PART. Section 10 states that both panel
 * potentiometers connect through explicit module terminals, so `J_PEAK` is what
 * this block declares. Section 10.1 is emphatic that PEAK REDUCTION is a
 * three-terminal divider and that tying its wiper to either end - revision 2's
 * rule - would short out part of the divider and destroy the control; the
 * revision-3 treatment is a 1 MOhm resistor from wiper to VBIAS, so an open
 * wiper settles at VBIAS and produces zero detector drive.
 *
 * THE VACTROL LED HAS NO SPICE MODEL, DELIBERATELY. `vactrol_led` declares no
 * `spiceModel`, so any deck containing this block throws at emission naming it.
 * No LED model is registered, and the alternative would be the registered
 * 1N4148 - a silicon signal diode which, as
 * `docs/decisions/2026-09-22-vactrol-model-is-an-assumption.md` records from
 * measurement, understates the forward drop by roughly 0.87 V against the
 * 1.5 V section 8.7.2 assumes, while the whole V_CE allocation in that budget is
 * 0.74 V. A stand-in that flattering does not belong in the circuit model.
 * `lib/sim/models/vactrol.ts` exists for hand-built DC decks that want to state
 * a forward voltage explicitly, and it is not reachable from a `Network`.
 *
 * NOTHING HERE MAY BE READ AS A CLAIM ABOUT WHAT THIS STAGE DOES. Not driver
 * bias - V_CE, headroom, rail-budget margin, "the 2N3904 stays out of
 * saturation" - nor any validation or refutation of section 8.7.2's budget
 * table; not R_LED's value; not LED current; and not compression behaviour of
 * any kind. Those are section 12.2's bench measurements, and section 12.2 item 8
 * says outright that threshold 2 "cannot be predicted reliably without the
 * selected transistor and vactrol in circuit". The values below are the spec's
 * targets, transcribed.
 */
import { circuit, net } from "../../../lib/model/index.ts"
import type { Network } from "../../../lib/model/index.ts"
import { INERT_TERMINAL } from "./inert-terminal.ts"

const MAKEUP_OUT = "MAKEUP_OUT"
const SC_IN = "SC_IN"
const SC_FB = "SC_FB"
const SC_OUT = "SC_OUT"
const DET_RECT = "DET_RECT"
const DET = "DET"
const Q_BASE = "Q_BASE"
const Q_COLLECTOR = "Q_COLLECTOR"
const Q_EMITTER = "Q_EMITTER"
const LED_K = "LED_K"
const LED_A = "LED_A"
const VBIAS = "VBIAS"
const VBIAS_RAW = "VBIAS_RAW"
const RAIL = "+9V_PROTECTED"
const GND = "GND"

export function sidechain(): Network {
  return circuit()
    // Spec section 10.1: J_PEAK's pins are TOP, WIPER and BOTTOM - the third is
    // NOT called VBIAS, deliberately, because naming a physical terminal after
    // the net it lands on conflates two things the schematic keeps separate.
    // Section 8.5: TOP comes from the makeup-amplifier output before the final
    // output coupling capacitor, BOTTOM goes to VBIAS so the wiper varies only
    // the AC component around the shared bias point.
    .connector(
      "peak_terminal",
      { TOP: MAKEUP_OUT, WIPER: SC_IN, BOTTOM: VBIAS },
      INERT_TERMINAL,
    )
    // Section 10.1's revision-3 failsafe: against the 100 kOhm pot this perturbs
    // the control law by roughly a tenth of its own contribution while
    // guaranteeing that an open wiper settles at VBIAS.
    .resistor("peak_wiper_failsafe_resistor", "1M", { a: SC_IN, b: VBIAS })

    // U2. Section A is section 8.5's non-inverting sidechain amplifier; section
    // B is section 8.1's VBIAS buffer, wired unity-gain with its output on its
    // own inverting input. The supply pins are on the component, so both
    // sections share one package's rails. See `audio-path.ts` for why the part
    // is a TL072H, why the model is generic, and why no footprint, symbol or pin
    // numbering is asserted.
    .add({
      id: "control_opamp",
      kind: "opamp",
      parameters: {},
      part: { mpn: "TL072H" },
      pins: { "v+": net(RAIL), "v-": net(GND) },
      units: [
        {
          name: "A",
          pins: { "in+": net(SC_IN), "in-": net(SC_FB), out: net(SC_OUT) },
          spiceModel: "GENERIC_OPAMP",
        },
        {
          name: "B",
          pins: { "in+": net(VBIAS_RAW), "in-": net(VBIAS), out: net(VBIAS) },
          spiceModel: "GENERIC_OPAMP",
        },
      ],
    })

    // Section 8.5: "R_BIAS = 10 kOhm from the inverting input to VBIAS;
    // R_FEEDBACK = 100 kOhm; and nominal voltage gain 1 + 100k / 10k = 11."
    .resistor("amplifier_bias_resistor", "10k", { a: SC_FB, b: VBIAS })
    .resistor("amplifier_feedback_resistor", "100k", { a: SC_FB, b: SC_OUT })

    // Section 8.6: "AC-couple the VBIAS-centered sidechain-amplifier output
    // through a 1 uF capacitor into a ground-referenced 1N4148 half-wave
    // rectifier... If a polarized capacitor is used, its positive terminal faces
    // the op-amp" - so pin `a` is the op-amp side. The coupling capacitor is
    // what stops the ~4.35 V bias holding the LED driver on continuously.
    //
    // RAISED AND DELIBERATELY NOT FIXED: the net between this capacitor and the
    // rectifier's anode (DET_RECT) is touched by exactly those two pins, so it
    // has no resistive DC return - the diode conducts one way only. That is a
    // faithful transcription, because section 8.6 names exactly one diode, and
    // inventing a bleed path the spec does not describe is what this
    // transcription must not do. It is a question for the spec's author, not a
    // defect to patch here.
    //
    // THE CONSEQUENCE, MEASURED RATHER THAN PREDICTED. An earlier version of
    // this comment said an operating point would not solve. It does. Patching
    // `vactrol_led` to the registered 1N4148 in a scratchpad probe, emitting
    // this block through `resolveNetwork` + `toSpiceNetlist` and swapping the
    // `.ac` card for `.op`, the deck SOLVES: with the rail at 8.7 V,
    // DET_RECT = 4.147e-7 V, DET = 4.147e-7 V, Q_BASE = 4.562e-7 V,
    // Q_COLLECTOR = 8.6998 V, LED_A = 8.7000 V; driving bias_raw at 4.35 V as
    // well gives VBIAS = 4.34957 V and the same detector figures.
    //
    // What the missing DC return costs is not solvability but MEANING: DET_RECT
    // is held by the engine's GMIN, not by the circuit. Measured by varying it -
    // gmin 1e-15 puts DET_RECT at 8.504e-10 V, the engine default at
    // 4.147e-7 V, gmin 1e-9 at 4.105e-4 V. The node tracks the solver setting
    // over five orders of magnitude, so any bias figure read at DET_RECT (or at
    // DET, which follows it) is an artifact of the solver and not a property of
    // this design. The engine does still refuse a genuinely floating node: the
    // same probe on a capacitor whose far end touches nothing else throws
    // "singular matrix: check node dangling".
    .capacitor("detector_coupling_cap", "1uF", { a: SC_OUT, b: DET_RECT })
    .add({
      id: "detector_rectifier_diode",
      kind: "diode",
      parameters: {},
      part: { mpn: "1N4148" },
      pins: {},
      units: [
        {
          name: "MAIN",
          pins: { anode: net(DET_RECT), cathode: net(DET) },
          // The one model here that names the part actually fitted. Its
          // provenance is in `lib/sim/models/index.ts`.
          spiceModel: "1N4148",
        },
      ],
    })

    // Section 8.6's detector network, at revision 3's values. Both parts "must
    // be independently bypassable or depopulatable", which is a layout
    // requirement rather than a connectivity one and is recorded here rather
    // than modelled.
    .capacitor("detector_cap", "4.7uF", { a: DET, b: GND })
    .resistor("release_resistor", "100k", { a: DET, b: GND })

    // Section 8.7's driver, with the revision-3 emitter degeneration. Section
    // 8.7.1 is explicit that R_E is not optional: without it the entire LED
    // sweep occupies 0.05-0.15 V of detector voltage and the stage behaves as a
    // near-switch.
    .resistor("driver_base_resistor", "10k", { a: DET, b: Q_BASE })
    .resistor("driver_base_pulldown_resistor", "100k", { a: Q_BASE, b: GND })
    .add({
      id: "led_driver_transistor",
      kind: "bjt",
      parameters: {},
      part: { mpn: "2N3904" },
      pins: {},
      units: [
        {
          name: "MAIN",
          pins: {
            base: net(Q_BASE),
            collector: net(Q_COLLECTOR),
            emitter: net(Q_EMITTER),
          },
          spiceModel: "2N3904",
        },
      ],
    })
    .resistor("driver_emitter_resistor", "1k", { a: Q_EMITTER, b: GND })

    // Section 8.8: "a 10 Ohm sense resistor in series with the LED (between the
    // transistor collector and the vactrol LED cathode)", so LED current is
    // measurable at 10 mV/mA without desoldering.
    .resistor("led_sense_resistor", "10R", { a: Q_COLLECTOR, b: LED_K })

    // The vactrol's LED half. Its LDR half is in `audio-path.ts` and shares no
    // net with it. See the header for why it declares no SPICE model.
    .add({
      id: "vactrol_led",
      kind: "diode",
      parameters: {},
      pins: {},
      units: [{ name: "MAIN", pins: { anode: net(LED_A), cathode: net(LED_K) } }],
    })

    // Section 8.7.2: "R_LED = 3.3 kOhm, revised from 4.7 kOhm to account for the
    // 1.5 V now dropped across R_E", from the anode to the protected rail.
    .resistor("led_current_limit_resistor", "3.3k", { a: RAIL, b: LED_A })

    // Section 8.1's local decoupling for this package.
    .capacitor("supply_decoupling_cap", "100nF", { a: RAIL, b: GND })

    // Ports. Ground is spelled exactly `ground`. `bias_raw` is the unbuffered
    // divider node this block's buffer reads; `bias` is that buffer's output,
    // which is also J_PEAK's BOTTOM terminal; `makeup_output` is the audio
    // path's makeup output, which J_PEAK's TOP terminal taps; `peak_wiper` is
    // the pot's wiper terminal, which leaves the module through J_PEAK.
    .port("ground", GND)
    .port("rail", RAIL)
    .port("bias", VBIAS)
    .port("bias_raw", VBIAS_RAW)
    .port("makeup_output", MAKEUP_OUT)
    .port("peak_wiper", SC_IN)

    .done()
}
