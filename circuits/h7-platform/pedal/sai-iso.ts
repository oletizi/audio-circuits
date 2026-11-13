/**
 * The pedal's SAI domain isolation (h7 pedal pages plan, Task 8; inventory section 1.3 B8;
 * CR-PEDAL-BLOCKS `sai_iso`), as architecture.md section 4.8 states the crossings (IF-PD-1; R-10):
 *
 * - Pins 32, 34, 35 (DOUT, LRCK, BCK), `pedal_codec_3v3` into `module_3v3`: U_ISO_M, a triple buffer
 *   powered from the receiving side (3V3_D), TI SN74LVC3G34DCTR, beside the codec; 47 kOhm bias to GND
 *   on each input; 470 ohm 1 % between each output and its interface pin, companion role
 *   `sai-module-series` (architecture.md:255; parts.md:115; R-10). Its gates take the signals in the
 *   order that line lists them, gate 1 DOUT, gate 2 LRCK, gate 3 BCK, and its supply pins are a fourth
 *   model unit, `power` (CR-PEDAL-DIGITAL-READINGS).
 * - Pin 33 (DIN), `module_3v3` into `pedal_codec_3v3`: U_ISO_C, a single buffer powered from the codec
 *   rail, TI SN74LVC1G34DBVR, with a 47 kOhm bias on its input (architecture.md:256; parts.md:116), to
 *   GND (CR-PEDAL-DIGITAL-READINGS). Its pin 1 is "No internal connection" (SCES519O Table 4-1): NC.
 * - Each buffer's 100 nF at VCC (CR-PEDAL-LOGIC-DECOUPLING), to GND.
 *
 * The codec-side nets (BCK_CODEC, LRCK_CODEC, DOUT_CODEC, DIN_CODEC) are CR-PEDAL-NETS'; the module-side
 * nets are the contract's (pins 32-35). ISO_DOUT, ISO_LRCK and ISO_BCK are U_ISO_M's outputs, ahead of
 * each 470 ohm. The 47 kOhm and 470 ohm have no MPN in the documents; a schematic needs none (G245).
 */
import { NC } from "../../../lib/model/index.ts"
import type { Network } from "../../../lib/model/index.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { SN74LVC1G34, SN74LVC3G34 } from "../pedal-parts.ts"
import { LOGIC_DECOUPLING } from "../pedal-rulings.ts"
import { block, capacitor, multiUnitIc, part, resistor } from "./build.ts"
import { contractNet } from "./nets.ts"

const V3D = "3V3_D"
const V3_CODEC = "3V3_CODEC"
const GND = "GND"
const READINGS = "CR-PEDAL-DIGITAL-READINGS"
const A255 = "architecture.md:255"

/** The three to-module signals, in architecture.md:255's order, each with its gate on U_ISO_M. */
const TO_MODULE = [
  { signal: "DOUT", gate: "1", codecNet: "DOUT_CODEC", out: "ISO_DOUT", pin: contractNet("CODEC_DOUT") },
  { signal: "LRCK", gate: "2", codecNet: "LRCK_CODEC", out: "ISO_LRCK", pin: contractNet("CODEC_LRCK") },
  { signal: "BCK", gate: "3", codecNet: "BCK_CODEC", out: "ISO_BCK", pin: contractNet("CODEC_BCK") },
] as const

function decouplingFarads(partName: "U_ISO_M" | "U_ISO_C"): number {
  const entry = LOGIC_DECOUPLING.parts.find((p) => p.part === partName)
  if (entry === undefined) {
    throw new Error(
      `CR-PEDAL-LOGIC-DECOUPLING (circuits/h7-platform/pedal-rulings.ts, LOGIC_DECOUPLING) has no entry for ${partName}; ` +
        "its decoupling value is that ruling's, and it is not defaulted here",
    )
  }
  return entry.farads
}

export function saiIsoBlock(): Network {
  const units = Object.fromEntries(TO_MODULE.map((s) => [s.gate, { A: s.codecNet, Y: s.out }]))
  return block([
    multiUnitIc("u_iso_m", { ...units, power: { GND, VCC: V3D } }, SN74LVC3G34,
      `${A255} (U_ISO_M, SN74LVC3G34DCTR on 3V3_D toward the module); parts.md:115; gate order and supply unit: ${READINGS}`),
    ...TO_MODULE.map((s) => resistor(`r_bias_${s.signal.toLowerCase()}`, "47k", s.codecNet, GND, RESISTOR,
      `${A255} (47 kOhm bias to GND on each input); open-items.md:45`)),
    ...TO_MODULE.map((s) => resistor(`r_iso_${s.signal.toLowerCase()}`, "470", s.out, s.pin, RESISTOR,
      `${A255} (470 ohm 1 % between each output and its interface pin, sai-module-series); R-10; open-items.md:45`)),
    part("u_iso_c", "ic", { "1": NC, "2": contractNet("CODEC_DIN"), "3": GND, "4": "DIN_CODEC", "5": V3_CODEC }, SN74LVC1G34,
      "architecture.md:256 (U_ISO_C, SN74LVC1G34DBVR on the codec rail toward the codec); parts.md:116"),
    resistor("r_bias_din", "47k", contractNet("CODEC_DIN"), GND, RESISTOR, `architecture.md:256 (47 kOhm bias on its input); to GND: ${READINGS}`),
    capacitor("c_iso_m", decouplingFarads("U_ISO_M"), V3D, GND, CAPACITOR, `CR-PEDAL-LOGIC-DECOUPLING (U_ISO_M, TI SCES366L p. 10 section 10); to GND: ${READINGS}`),
    capacitor("c_iso_c", decouplingFarads("U_ISO_C"), V3_CODEC, GND, CAPACITOR, `CR-PEDAL-LOGIC-DECOUPLING (U_ISO_C, TI SCES519O p. 15 section 8.3); to GND: ${READINGS}`),
  ], [
    V3D, V3_CODEC, "BCK_CODEC", "LRCK_CODEC", "DOUT_CODEC", "DIN_CODEC",
    contractNet("CODEC_DOUT"), contractNet("CODEC_DIN"), contractNet("CODEC_LRCK"), contractNet("CODEC_BCK"), GND,
  ])
}
