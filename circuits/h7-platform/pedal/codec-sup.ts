/**
 * The pedal's codec domain supply, oscillator and local reset (h7 pedal pages plan, Task 8; inventory
 * section 1.3 B6; CR-PEDAL-BLOCKS `codec_sup`), as analog.md section 13 states it (R-29, R-30, R-31,
 * R-37, on the owner-approved D20, D21, D22):
 *
 * - U_CVDD, TPS7A2433DBVR: IN on 5V_A_CODEC, OUT on 3V3_CODEC, with C_CVDDIN and C_CVDDOUT 1 uF 16 V
 *   X7R (analog.md:387; parts.md:98-99). EN tied to IN and pin 4 (NC) left open, from the data sheet
 *   (CR-PEDAL-DIGITAL-READINGS; TI SBVS386E p. 3 Table 5-1 and p. 11 section 7.3.1).
 * - D_CVCL, PMEG4005AEA, anode 3V3_CODEC, cathode 5V_A_CODEC, and R_CBLD 3.60 kOhm to GND (FIG-CVCL,
 *   analog.md:401; parts.md:100-101).
 * - U_XO, the SG-210STF 12.288 MHz, on 3V3_CODEC with C_XO 100 nF, ST tied to 3V3_CODEC
 *   (analog.md:374); its output is XO_OUT, which drives SCKI1 and SCKI2 (analog.md:383).
 * - U_CRST, TLV803EA29, VDD on 3V3_CODEC with C_CRST 100 nF, its open-drain RESET on CODEC_RST_N, with
 *   R_CRST 4.70 kOhm from CODEC_RST_N to 3V3_CODEC (EC-CODEC-RESET, analog.md:63, :407).
 * - Q_PFR, AO3400A: drain on CODEC_RST_N, gate PF_TRIP (analog.md:63); source on GND
 *   (CR-PEDAL-DIGITAL-READINGS, from analog.md:411).
 * - Every decoupling capacitor here goes from its rail to GND (CR-PEDAL-DIGITAL-READINGS).
 *
 * NOT MODELLED (CR-PEDAL-POPULATION, class 1): v1's R_RST_PD, 10 kOhm from CODEC_RST_N to GND
 * (analog.md:63, "v1's 10 kΩ pull-down R_RST_PD stays not fitted"; analog.md:411, R-53). Fitted it
 * would put the released RST across VIH, so it is never fitted, and the default build does not carry it.
 */
import { NC } from "../../../lib/model/index.ts"
import type { Network } from "../../../lib/model/index.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { AO3400A, PMEG4005AEA, SG_210STF, TLV803EA29, TPS7A2433 } from "../pedal-parts.ts"
import { block, capacitor, diode, part, resistor, withMpn } from "./build.ts"

const V5A_CODEC = "5V_A_CODEC"
const V3_CODEC = "3V3_CODEC"
const RST = "CODEC_RST_N"
const PF_TRIP = "PF_TRIP"
const XO_OUT = "XO_OUT"
const GND = "GND"

const READINGS = "CR-PEDAL-DIGITAL-READINGS"
const C1U = withMpn(CAPACITOR, "CL10B105KO8NNNC")
const C100N = withMpn(CAPACITOR, "GRM188R71H104KA93D")

export function codecSupBlock(): Network {
  return block([
    part("u_cvdd", "ic", { "1": V5A_CODEC, "2": GND, "3": V5A_CODEC, "4": NC, "5": V3_CODEC }, TPS7A2433,
      `analog.md:387 (U_CVDD, IN on 5V_A_CODEC, OUT on 3V3_CODEC; R-30, D22); parts.md:98; EN to IN and pin 4 open: ${READINGS} (TI SBVS386E p. 3 Table 5-1, p. 11 section 7.3.1)`),
    capacitor("c_cvddin", "1u", V5A_CODEC, GND, C1U, `analog.md:387 (C_CVDDIN 1 uF 16 V X7R); parts.md:99; to GND: ${READINGS}`),
    capacitor("c_cvddout", "1u", V3_CODEC, GND, C1U, `analog.md:387 (C_CVDDOUT 1 uF 16 V X7R); parts.md:99; to GND: ${READINGS}`),
    diode("d_cvcl", V3_CODEC, V5A_CODEC, PMEG4005AEA, "analog.md:401 (FIG-CVCL: D_CVCL anode on 3V3_CODEC, cathode on 5V_A_CODEC; R-30); parts.md:100"),
    resistor("r_cbld", "3.60k", V3_CODEC, GND, withMpn(RESISTOR, "0603WAF3601T5E"), "analog.md:401 (R_CBLD 3.60 kOhm to GND); parts.md:101"),
    part("u_xo", "ic", { "1": V3_CODEC, "2": GND, "3": XO_OUT, "4": V3_CODEC }, SG_210STF,
      "analog.md:374 (U_XO on 3V3_CODEC, ST tied to 3V3_CODEC; R-29); analog.md:383 (XO_OUT drives SCKI1 and SCKI2); parts.md:97"),
    capacitor("c_xo", "100n", V3_CODEC, GND, C100N, `analog.md:374 (C_XO 100 nF); parts.md:104; to GND: ${READINGS}`),
    part("u_crst", "ic", { "1": GND, "2": RST, "3": V3_CODEC }, TLV803EA29,
      "analog.md:407 (U_CRST VDD on 3V3_CODEC, open-drain RESET on CODEC_RST_N); analog.md:63 (EC-CODEC-RESET; R-31); parts.md:102"),
    capacitor("c_crst", "100n", V3_CODEC, GND, C100N, `analog.md:407 (C_CRST 100 nF); parts.md:104; to GND: ${READINGS}`),
    resistor("r_crst", "4.70k", RST, V3_CODEC, withMpn(RESISTOR, "0603WAF4701T5E"),
      "analog.md:63 (R_CRST 4.70 kOhm from CODEC_RST_N to 3V3_CODEC; R-40); parts.md:103"),
    part("q_pfr", "ic", { "1": PF_TRIP, "2": GND, "3": RST }, AO3400A,
      `analog.md:63 (Q_PFR, AO3400A, drain on CODEC_RST_N, gate PF_TRIP; R-37); source on GND: ${READINGS} (analog.md:411)`),
  ], [V5A_CODEC, V3_CODEC, RST, PF_TRIP, XO_OUT, GND])
}
