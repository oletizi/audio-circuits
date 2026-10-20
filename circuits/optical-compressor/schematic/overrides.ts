/**
 * The eleven per-component overrides of `./authoring.ts`, split out for size.
 *
 * **THIS CIRCUIT IS THE WORST CASE AND THAT IS WHY IT IS THE MEASUREMENT.** All 37 of its
 * components declare NO symbol, no footprint and no pin numbering in the circuit model -
 * `docs/known-gaps.md` **G118** measured 0 of 37 - because the spec it is transcribed from names
 * parts and pins and *"says nothing about packaging, and inventing either would be fabricated
 * data"* (`parts/inert-terminal.ts`). `symbolForKind` answers for 26 of the 37; these eleven are
 * the residue, and every one of them carries the reason it is a residue.
 *
 * **FOUR OF THE ELEVEN NAME A DISCRETE PART, AND THREE OF THOSE FOUR ARE NAMED BY THE MODEL
 * ALREADY - WHICH IS THE FINDING.** `symbolForKind(kind, parameters)` takes the kind and the
 * parameters and NOT the part, so it answers `diode` with `Device:D` and cannot see that this
 * circuit declares `part.mpn: "1N5817"` on one of them, `"1N4148"` on another and `"2N3904"` on
 * the transistor - and that the installed library holds `Diode:1N5817`, `Diode:1N4148` and
 * `Transistor_BJT:2N3904` under those exact names. The mpn is in the model; the rule's signature
 * cannot reach it. `docs/known-gaps.md` **G156** records that, and records the vactrol LED as the
 * one of the four the model genuinely does not name.
 *
 * Every lib id below was resolved against the installed libraries before it was written, and
 * `tests/schgen/authoring-complete.test.ts` resolves all of them on every run.
 */

import type { ComponentOverride } from "../../../lib/schgen/authoring.ts"

/**
 * **WHY `Amplifier_Operational:TL072` FOR A PART THE MODEL CALLS A TL072H.**
 * `Amplifier_Operational:TL072H` does not exist in the installed library - checked, not assumed -
 * and `TL071`, `TL072` and `TL074` are the only TL07x symbols it has. `TL072`'s own Description
 * property reads *"Dual Low-Noise JFET-Input Operational Amplifiers, DIP-8/SOIC-8"*, which is the
 * claim being made here and the whole of it: a dual op-amp glyph in the standard eight-pin dual
 * pinout, with two amplifier units and a third unit carrying V+ and V-. It is NOT a claim that a
 * TL072H and a TL072 are interchangeable parts; `part.mpn` stays TL072H in the model and reaches
 * the drawing's value field, and the SPICE model was already GENERIC_OPAMP for reasons
 * `parts/audio-path.ts` records. **Nobody here has checked a TL072H datasheet against this
 * pinout**, which is recorded in **G156** rather than left as an assumption wearing a citation.
 *
 * The pin numbering is read off the symbol: unit 1 is pins 1 (output), 2 (-) and 3 (+); unit 2 is
 * 5 (+), 6 (-) and 7 (output); the package pins 4 (V-) and 8 (V+) need no entry because
 * `PIN_NAME_ALIASES` in `lib/schgen/rules/symbols.ts` maps `v+`/`v-` by the symbol's own pin
 * names.
 */
const TL072_SECTIONS = {
  A: { "in+": "3", "in-": "2", out: "1" },
  B: { "in+": "5", "in-": "6", out: "7" },
} as const

const NO_PACKAGING =
  "parts/inert-terminal.ts declares one PartSpec for every connector in this circuit, with " +
  "electricallyInert and nothing else: \"the spec names the connectors and their pins and says " +
  "nothing about packaging, and inventing either would be fabricated data\". So the symbol and " +
  "the pin numbering are declared here; the pin SIDES are not, because a pin's side is read from " +
  "the library on every path (G155)."

export const OPTICAL_COMPRESSOR_OVERRIDES: Readonly<Record<string, ComponentOverride>> = {
  power_power_terminal: {
    symbol: "Connector_Generic:Conn_01x02",
    symbolPins: { MAIN: { "+9V_RAW": "1", GND: "2" } },
    why:
      `J_PWR, spec section 10.1: two ways, pins named +9V_RAW and GND in that order. ${NO_PACKAGING}`,
  },
  power_reverse_polarity_diode: {
    symbol: "Diode:1N5817",
    why:
      "spec section 8.1's series reverse-polarity protection is a 1N5817, the model declares " +
      "part.mpn \"1N5817\" for it, and Diode:1N5817 is in the installed library under that exact " +
      "name. symbolForKind takes (kind, parameters) and so cannot see the mpn; it would answer " +
      "Device:D, which is correct for the kind and loses the part - a reader of the sheet should " +
      "see a Schottky where the design specifies one. The pin numbering needs no entry - the " +
      "symbol names its pins K and A and PIN_NAME_ALIASES maps cathode/anode onto them - and the " +
      "sides come from the symbol (pin 1 left, pin 2 right). G156 records that an mpn the model " +
      "already carries reaches the drawing through an authoring file.",
  },
  audio_input_terminal: {
    symbol: "Connector_Generic:Conn_01x02",
    symbolPins: { MAIN: { IN: "1", GND: "2" } },
    why: `J_IN, spec section 10.1: "AC-coupled audio input", pins IN and GND. ${NO_PACKAGING}`,
  },
  audio_signal_opamp: {
    symbol: "Amplifier_Operational:TL072",
    symbolPins: TL072_SECTIONS,
    why:
      "U1, spec section 8.1: a dual op-amp package with section A the input buffer (8.2) and " +
      "section B the makeup amplifier (8.4). The model declares mpn TL072H and no symbol; " +
      "symbolForKind refuses `opamp` because the symbol IS the package and decides how many " +
      "units get placed. See the TL072_SECTIONS comment in this file for what the symbol choice " +
      "does and does not claim, and G156 for what is unverified about it.",
  },
  audio_gain_terminal: {
    symbol: "Connector_Generic:Conn_01x03",
    symbolPins: { MAIN: { TOP: "1", WIPER: "2", BOTTOM: "3" } },
    why:
      "J_GAIN, spec section 10.1: three ways for an off-board pot, pins TOP, WIPER and BOTTOM, " +
      "mapped onto 1/2/3 - the order a 1x03 header's pads are numbered in and the order a pot's " +
      `own terminals are numbered in (wiper on 2). ${NO_PACKAGING}`,
  },
  audio_output_terminal: {
    symbol: "Connector_Generic:Conn_01x02",
    symbolPins: { MAIN: { OUT: "1", GND: "2" } },
    why: `J_OUT, spec section 10.1: two ways, pins OUT and GND. ${NO_PACKAGING}`,
  },
  sidechain_peak_terminal: {
    symbol: "Connector_Generic:Conn_01x03",
    symbolPins: { MAIN: { TOP: "1", WIPER: "2", BOTTOM: "3" } },
    why:
      "J_PEAK, spec section 10.1: three ways, pins TOP, WIPER and BOTTOM - and parts/sidechain.ts " +
      "records that the third is deliberately NOT called VBIAS although it lands on it, so the " +
      `numbering follows the terminal names rather than the nets. ${NO_PACKAGING}`,
  },
  sidechain_control_opamp: {
    symbol: "Amplifier_Operational:TL072",
    symbolPins: TL072_SECTIONS,
    why:
      "U2, spec section 8.1: section A is the sidechain amplifier (8.5) and section B the VBIAS " +
      "buffer (8.1) - the allocation that forces the buffer to be declared in parts/sidechain.ts " +
      "although it belongs to the power section by function, because a component is atomic with " +
      "respect to include(). Same symbol reasoning as audio_signal_opamp.",
  },
  sidechain_detector_rectifier_diode: {
    symbol: "Diode:1N4148",
    why:
      "spec section 8.6's half-wave rectifier is a 1N4148, the model declares part.mpn " +
      "\"1N4148\" for it, and Diode:1N4148 is in the installed library under that name. Same " +
      "reasoning as power_reverse_polarity_diode: Device:D is correct for the kind and loses the " +
      "part the model already names (G156).",
  },
  sidechain_led_driver_transistor: {
    symbol: "Transistor_BJT:2N3904",
    why:
      "spec section 8.7's low-side LED driver is a 2N3904 and the model declares part.mpn " +
      "\"2N3904\" for it. symbolForKind refuses `bjt` because NPN and PNP are drawn with " +
      "different symbols and the KIND cannot tell them apart - and its signature cannot reach " +
      "the mpn that can. Transistor_BJT:2N3904 is the symbol " +
      "circuits/transistor-preamp/parts.ts already uses for the same device; its pins are named " +
      "E, B and C, so PIN_NAME_ALIASES maps emitter/base/collector onto 1/2/3 and no pin map is " +
      "needed here (G156).",
  },
  sidechain_vactrol_led: {
    symbol: "Device:LED",
    why:
      "spec sections 8.7 and 9: this is the vactrol's LED, and it is the ONE discrete part in " +
      "this circuit the model does not name - no part.mpn, and parts/sidechain.ts records that " +
      "no SPICE model exists for it either. symbolForKind would " +
      "answer Device:D, which would draw an LED as a plain diode in a sheet a person has to read " +
      "and believe. Device:LED has the same K/A pin names, so no pin map is needed (G156).",
  },
}
