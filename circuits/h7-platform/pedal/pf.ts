/**
 * The pedal's power-fail supervisor (h7 pedal pages plan, Task 6; inventory section 1.3 B2;
 * CR-PEDAL-BLOCKS `pf`). Split spec section 7.4 as power.md section 3.3 and bypass-relay.md section
 * 4.3 state it (R-36, R-37, R-40):
 *
 * - U_PF, TPS3808G01, senses VIN at the jack: R_PFT1 13.0 kOhm from VIN to the clamp node PF_CLAMP,
 *   R_PFT2 174 kOhm from it to SENSE, R_PFB 10.0 kOhm to GND, all 0.1 %; D_PFCL from GND to the clamp
 *   node; VDD and MR on 5V_A (power.md:121).
 * - C_PFS 1 nF "at SENSE" (power.md:121) and C_PFCT 47 nF "on U_PF's CT" (power.md:149): the other
 *   end of each is GND, which the documents do not write and the data sheet does
 *   (CR-PEDAL-POWER-DATASHEET-ENDS quotes it). TI SBVS050N (rev.
 *   August 2026), https://www.ti.com/lit/ds/symlink/tps3808.pdf, fetched 2026-11-13: p. 10 section 7.3,
 *   "connecting a capacitor between CT and GND allows the designer to select any reset delay period";
 *   section 7.3.1, "a from 1nF to 10nF bypass capacitor on the SENSE input" (Figure 7-1 draws it to
 *   ground). C_PF is U_PF's VDD decoupling (parts.md:71), 5V_A to GND (section 8.3, p. 15, "a 0.1-uF
 *   ceramic capacitor near the VDD pin").
 * - U_PF's open-drain RESET drives only PF_OK, pulled to 5V_A by R_PFPU 100 kOhm (power.md:142;
 *   bypass-relay.md:184).
 * - U_PFINV, SN74LVC2G14 on 5V_A with 100 nF: channel A makes PF_TRIP from PF_OK, channel B
 *   re-inverts PF_TRIP into PF_ON (bypass-relay.md:185). Channel A is gate 1 (1A pin 1, 1Y pin 6) and
 *   channel B gate 2 (2A pin 3, 2Y pin 4), by CR-PEDAL-POWER-READINGS.
 * - R_PFTPD and R_PFONPD, 100 kOhm, hold PF_TRIP and PF_ON low when U_PFINV's outputs float
 *   (bypass-relay.md:186): pull-downs to GND (parts.md:74).
 *
 * The block-private nets PF_OK (the documents' name), PF_CLAMP, PF_SENSE and PF_CT are named for the
 * node each is; PF_TRIP and PF_ON are shared (`nets.ts`).
 */
import type { Network, PartSpec } from "../../../lib/model/index.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { BAS116H, SN74LVC2G14, TPS3808G01 } from "../pedal-parts.ts"
import { block, capacitor, diode, part, resistor } from "./build.ts"

const withMpn = (base: PartSpec, mpn: string): PartSpec => ({ ...base, mpn })

const VIN = "VIN"
const V5A = "5V_A"
const GND = "GND"
const PF_TRIP = "PF_TRIP"
const PF_ON = "PF_ON"
const PF_OK = "PF_OK"
const PF_CLAMP = "PF_CLAMP"
const PF_SENSE = "PF_SENSE"
const PF_CT = "PF_CT"

const SUP = "power.md:121 (U_PF at VIN; R-36)"
const SBVS050N = "CR-PEDAL-POWER-DATASHEET-ENDS: TI SBVS050N (rev. August 2026) p. 10 section 7.3"
const R100K = withMpn(RESISTOR, "0603WAF1003T5E")

export function pfBlock(): Network {
  return block([
    part("u_pf", "ic", { "1": PF_OK, "2": GND, "3": V5A, "4": PF_CT, "5": PF_SENSE, "6": V5A }, TPS3808G01,
      `${SUP}: VDD and MR on 5V_A; power.md:142 (RESET drives only PF_OK; R-37); parts.md:59`),
    resistor("r_pft1", "13.0k", VIN, PF_CLAMP, withMpn(RESISTOR, "RT0603BRD0713KL"), `${SUP}: R_PFT1 from VIN to the clamp node; parts.md:67 (R-40)`),
    resistor("r_pft2", "174k", PF_CLAMP, PF_SENSE, withMpn(RESISTOR, "RT0603BRD07174KL"), `${SUP}: R_PFT2 from the clamp node to SENSE; parts.md:68`),
    resistor("r_pfb", "10.0k", PF_SENSE, GND, withMpn(RESISTOR, "RT0603BRD0710KL"), `${SUP}: R_PFB to GND; parts.md:69`),
    diode("d_pfcl", GND, PF_CLAMP, BAS116H, `${SUP}: D_PFCL from GND to the clamp node; parts.md:64 (R-40)`),
    capacitor("c_pfs", "1n", PF_SENSE, GND, withMpn(CAPACITOR, "CL10C102JB8NNNC"),
      `${SUP}: C_PFS 1 nF at SENSE; parts.md:70; to GND: ${SBVS050N}.1 (bypass capacitor on the SENSE input)`),
    capacitor("c_pf", "100n", V5A, GND, withMpn(CAPACITOR, "CL10B104KB8NNNC"), "parts.md:71 (U_PF VDD decoupling, C_PF 100 nF); TI SBVS050N p. 15 section 8.3"),
    capacitor("c_pfct", "47n", PF_CT, GND, withMpn(CAPACITOR, "C1206N473J050T"),
      `power.md:149 (C_PFCT 47 nF C0G on U_PF's CT; R-40); parts.md:72; to GND: ${SBVS050N} (a capacitor between CT and GND)`),
    resistor("r_pfpu", "100k", PF_OK, V5A, R100K, "bypass-relay.md:184 (R_PFPU 100 kOhm to 5V_A on PF_OK; R-37); parts.md:74"),
    part("u_pfinv", "ic", { "1": PF_OK, "2": GND, "3": PF_TRIP, "4": PF_ON, "5": V5A, "6": PF_TRIP }, SN74LVC2G14,
      "bypass-relay.md:185 (U_PFINV on 5V_A: channel A makes PF_TRIP, channel B re-inverts it to PF_ON; R-37, R-40); CR-PEDAL-POWER-READINGS (A = gate 1, B = gate 2); parts.md:60"),
    capacitor("c_pfinv", "100n", V5A, GND, withMpn(CAPACITOR, "GRM188R71H104KA93D"), "bypass-relay.md:185 (U_PFINV on 5V_A with 100 nF); parts.md:104 (C_PFINV)"),
    resistor("r_pftpd", "100k", PF_TRIP, GND, R100K, "bypass-relay.md:186 (R_PFTPD holds PF_TRIP low); parts.md:74"),
    resistor("r_pfonpd", "100k", PF_ON, GND, R100K, "bypass-relay.md:186 (R_PFONPD holds PF_ON low); parts.md:74"),
  ], [VIN, V5A, PF_TRIP, PF_ON, GND])
}
