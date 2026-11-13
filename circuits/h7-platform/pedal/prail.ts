/**
 * The pedal digital rail 3V3_P (h7 pedal pages plan, Task 6; inventory section 1.3 B4;
 * CR-PEDAL-BLOCKS `prail`). U_PRAIL is "a TPS62933F with the module buck's network copied: 3.392 V
 * nominal, 3.274-3.513 V, on VIN_MOD, RT floating, EN as EC-QPEN-RESET" (power.md:437; R-25).
 *
 * "Copied" is the buck's own network as power.md section 5.2 states it for the module, by
 * CR-PEDAL-POWER-READINGS: RT
 * floating (PWR-06 pin-level: RT pin 1 no-connect, schematic-checklist.md:124); L 4.7 uH WE-XHMI
 * (power.md:376; parts.md:88); 3 x 22 uF X5R 25 V plus 100 nF out (power.md:377; parts.md:89); feedback
 * 32.4 kOhm over 10.0 kOhm (power.md:378); C_SS 33 nF from SS to GND (power.md:379; parts.md:90);
 * C_BST 100 nF with a 0 ohm R_BST footprint (power.md:380). The bootstrap's series order (BST, R_BST,
 * C_BST, SW) and C_SS's GND end are the pedals checklist's PWR-06 and v1 verification, at 5b926d0,
 * quoted in CR-PEDAL-POWER-READINGS. The module's input filter (L_FILT, C_BIN1/2, C_BINHF, the damping leg) is the module's own
 * input network (power.md:30), not the buck's: U_PRAIL's input is stated separately, 2 x 10 uF + 100 nF
 * on VIN_MOD (power.md:272; parts.md:57, :82).
 *
 * EN (EC-QPEN-RESET, power.md:85; R-44, R-45, R-52, R-58): R_PEN 150 kOhm from PF_ON to EN, R_PENPD
 * 1.00 MOhm EN to GND, C_PEN two 4.7 uF in parallel on EN to GND (Q_PEN "holds C_PEN at <= 0.5 mV", so
 * its other end is GND, CR-PEDAL-POWER-READINGS); Q_PEN 2N7002 gate PF_TRIP, source GND, drain through R_PENS 180 ohm to EN.
 *
 * Block-private nets: PRAIL_EN, PRAIL_SW, PRAIL_BST, PRAIL_BST_CAP, PRAIL_SS, PRAIL_FB, PEN_D.
 * 2N7002 numbering 1 G, 2 S, 3 D (pedal-pin-tables.ts, Nexperia Table 2).
 */
import { NC } from "../../../lib/model/index.ts"
import type { Network, PartSpec } from "../../../lib/model/index.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { FET_2N7002, PRAIL_INDUCTOR, TPS62933F } from "../pedal-parts.ts"
import { block, capacitor, inductor, part, resistor } from "./build.ts"
import { contractNet } from "./nets.ts"

const withMpn = (base: PartSpec, mpn: string): PartSpec => ({ ...base, mpn })

const VIN_MOD = contractNet("VIN_MOD")
const V3P = "3V3_P"
const PF_ON = "PF_ON"
const PF_TRIP = "PF_TRIP"
const GND = "GND"
const EN = "PRAIL_EN"
const SW = "PRAIL_SW"
const BST = "PRAIL_BST"
const BST_CAP = "PRAIL_BST_CAP"
const SS = "PRAIL_SS"
const FB = "PRAIL_FB"
const PEN_D = "PEN_D"

const COPIED = "power.md:437 (the module buck's network copied; R-25)"
const BOOTSTRAP = "CR-PEDAL-POWER-READINGS; https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/boards/v1/VERIFICATION.md#L739 (BST -> R_BST -> C_BST -> SW)"
const SS_GND = "CR-PEDAL-POWER-READINGS; https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/SCHEMATIC-CHECKLIST.md#L110 (PWR-06, SS/PG (7) C_SS 33 nF to GND)"
const IN = "power.md:272 (U_PRAIL's 2 x 10 uF + 100 nF on VIN_MOD)"
const ENS = "power.md:85 (EC-QPEN-RESET; R-44, R-58)"
const C_IN = withMpn(CAPACITOR, "CL31B106KBHNNNE")
const C_OUT = withMpn(CAPACITOR, "CL31A226KAHNNNE")
const C_PEN = withMpn(CAPACITOR, "CL31B475KBHNNNE")

export function prailBlock(): Network {
  return block([
    part("u_prail", "ic", { "1": NC, "2": EN, "3": VIN_MOD, "4": GND, "5": SW, "6": BST, "7": SS, "8": FB }, TPS62933F,
      `${COPIED}: on VIN_MOD, RT floating; CR-PEDAL-POWER-READINGS (the scope of copied); schematic-checklist.md:124 (pin-level, RT no-connect); parts.md:87`),
    capacitor("c_pin1", "10u", VIN_MOD, GND, C_IN, `${IN}; parts.md:57`),
    capacitor("c_pin2", "10u", VIN_MOD, GND, C_IN, `${IN}; parts.md:57`),
    capacitor("c_pinhf", "100n", VIN_MOD, GND, withMpn(CAPACITOR, "CL21B104KBCNNNC"), `${IN}; parts.md:82`),
    inductor("l_prail", "4.7u", SW, V3P, PRAIL_INDUCTOR, `${COPIED}; power.md:376 (74439346047, 4.7 uH); parts.md:88`),
    capacitor("c_pout1", "22u", V3P, GND, C_OUT, `${COPIED}; power.md:377 (3 x 22 uF X5R 25 V 1206); parts.md:89`),
    capacitor("c_pout2", "22u", V3P, GND, C_OUT, `${COPIED}; power.md:377 (3 x 22 uF X5R 25 V 1206); parts.md:89`),
    capacitor("c_pout3", "22u", V3P, GND, C_OUT, `${COPIED}; power.md:377 (3 x 22 uF X5R 25 V 1206); parts.md:89`),
    capacitor("c_pout_hf", "100n", V3P, GND, CAPACITOR, `${COPIED}; power.md:377 (plus 100 nF)`),
    resistor("r_fb_top", "32.4k", V3P, FB, RESISTOR, `${COPIED}; power.md:378 (32.4 kOhm over 10.0 kOhm, 1 %)`),
    resistor("r_fb_bottom", "10.0k", FB, GND, RESISTOR, `${COPIED}; power.md:378 (32.4 kOhm over 10.0 kOhm, 1 %)`),
    capacitor("c_ss", "33n", SS, GND, withMpn(CAPACITOR, "CL10B333KB8NNNC"),
      `${COPIED}; power.md:379 (C_SS 33 nF, SS must not float); parts.md:90; to GND: ${SS_GND}`),
    resistor("r_bst", "0", BST, BST_CAP, RESISTOR, `${COPIED}; power.md:380 (0 ohm R_BST footprint); order: ${BOOTSTRAP}`),
    capacitor("c_bst", "100n", BST_CAP, SW, CAPACITOR, `${COPIED}; power.md:380 (C_BST 100 nF); order: ${BOOTSTRAP}`),
    resistor("r_pen", "150k", PF_ON, EN, withMpn(RESISTOR, "0603WAF1503T5E"), `${ENS}: EN follows PF_ON through R_PEN; parts.md:78`),
    resistor("r_penpd", "1.00M", EN, GND, withMpn(RESISTOR, "0603WAF1004T5E"), `${ENS}: R_PENPD to GND (R-45); parts.md:81`),
    capacitor("c_pen1", "4.7u", EN, GND, C_PEN, `${ENS}: C_PEN, two 4.7 uF in parallel, to GND (CR-PEDAL-POWER-READINGS); parts.md:79`),
    capacitor("c_pen2", "4.7u", EN, GND, C_PEN, `${ENS}: C_PEN, two 4.7 uF in parallel, to GND (CR-PEDAL-POWER-READINGS); parts.md:79`),
    part("q_pen", "ic", { "1": PF_TRIP, "2": GND, "3": PEN_D }, FET_2N7002, `${ENS}: Q_PEN gate PF_TRIP, source GND; parts.md:85`),
    resistor("r_pens", "180", PEN_D, EN, withMpn(RESISTOR, "0603WAF1800T5E"), `${ENS}: drain to EN through R_PENS (R-52); parts.md:80`),
  ], [VIN_MOD, V3P, PF_ON, PF_TRIP, GND])
}
