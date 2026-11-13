/**
 * The pedal's expression input and its VREF_A loads (h7 pedal pages plan, Task 8; inventory section
 * 1.3 B13; CR-PEDAL-BLOCKS `expr_ref`), as analog.md sections 9.6, 10 and 11 state them:
 *
 * - J_EXP, the Neutrik NMJ6HCD2 TRS with a ring-normal contact: ring = reference, tip = wiper, sleeve
 *   = GND (CTL-09, schematic-checklist.md:197; parts.md:133). Pins as CR-PEDAL-DIGITAL-READINGS draws
 *   them: T, R, S on their nets, RN the ring-normal, TN and SN not connected; with no plug RN touches R
 *   (analog.md:340).
 * - Two PESD12VL1BA, on the tip at the jack side of R_TIP and on the ring at the jack side of the ring
 *   reference, each to GND (CTL-10, schematic-checklist.md:201; parts.md:107); pin 1 on the line
 *   (CR-PEDAL-DIGITAL-READINGS).
 * - The back-feed blocking network (R-17, R-19; analog.md:307-314): U_REFBLK LM66100 with VIN on
 *   VREF_A, ST and N/C to GND, VOUT on REF_OUT; Q_REFEN 2N7002, source to GND, drain on CE, gate from
 *   VREF_A through R_ENG 100 kOhm; R_CE 100 kOhm from VOUT to CE; D_RCLAMP PMEG4005AEA, cathode on
 *   REF_OUT, anode GND; R_REF 3.30 kOhm 1206 from REF_OUT to the ring (parts.md:109-114).
 * - 100 nF X7R at the ring to GND (analog.md:331).
 * - The tip: R_TIP 22.0 kOhm in series, then 1 nF C0G and 10 MOhm to GND, R_EXPIN 2.2 MOhm and U_EXP,
 *   an MCP6001 follower on VREF_A with 100 nF at its VDD (CTL-08, schematic-checklist.md:196;
 *   analog.md:311, :335), then 1.00 kOhm and 100 nF X7R to EXPR_TIP (analog.md:339). The follower's
 *   feedback, VSS on GND and the order of the output filter are CR-PEDAL-DIGITAL-READINGS'.
 * - Plug detect: ring-normal, 1 kOhm, EXPR_DETECT, with 100 kOhm to GND (analog.md:340), the 100 kOhm
 *   at the pin (CR-PEDAL-DIGITAL-READINGS).
 * - HW_REV: CR-PEDAL-HW-REV's revision 1 divider from VREF_A to GND with 100 nF at the pin
 *   (analog.md:347, :351), read from `HW_REV_STRAP`.
 *
 * Block-private nets are named for their node: EXP_TIP_J (the jack's tip), EXP_RING, EXP_RN,
 * EXP_TIP_RC (after R_TIP), EXP_IN (U_EXP's input), EXP_BUF (its output), REF_OUT, REF_CE, REF_ENG.
 */
import { NC } from "../../../lib/model/index.ts"
import type { Network } from "../../../lib/model/index.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { FET_2N7002, LM66100, MCP6001, NMJ6HCD2, PESD12VL1BA, PMEG4005AEA } from "../pedal-parts.ts"
import { HW_REV_STRAP } from "../pedal-rulings.ts"
import { block, capacitor, diode, part, resistor, singleOpamp, switchingPart, withMpn } from "./build.ts"
import { contractNet } from "./nets.ts"

const VREF_A = contractNet("VREF_A")
const EXPR_TIP = contractNet("EXPR_TIP")
const EXPR_DETECT = contractNet("EXPR_DETECT")
const HW_REV = contractNet(HW_REV_STRAP.pin)
const GND = "GND"
const TIP_J = "EXP_TIP_J"
const RING = "EXP_RING"
const RN = "EXP_RN"
const TIP_RC = "EXP_TIP_RC"
const EXP_IN = "EXP_IN"
const EXP_BUF = "EXP_BUF"
const REF_OUT = "REF_OUT"
const REF_CE = "REF_CE"
const REF_ENG = "REF_ENG"

const READINGS = "CR-PEDAL-DIGITAL-READINGS"
const BLOCK = (line: number, what: string): string => `analog.md:${line} (${what}; the blocking network, R-17, R-19)`
const TIP = "schematic-checklist.md:196 (CTL-08)"

export function exprRefBlock(): Network {
  return block([
    switchingPart("j_exp", { T: TIP_J, R: RING, S: GND, RN, TN: NC, SN: NC }, { "no plug": [["R", "RN"]], "plug in": [] }, NMJ6HCD2,
      `schematic-checklist.md:197 (CTL-09, ring = reference, tip = wiper, sleeve = GND); analog.md:340 (ring-normal); parts.md:133; pins and contacts: ${READINGS}`),
    part("d_esd_tip", "ic", { "1": TIP_J, "2": GND }, PESD12VL1BA, `schematic-checklist.md:201 (CTL-10, tip, jack side of R_TIP; OWN-03); parts.md:107; orientation: ${READINGS}`),
    part("d_esd_ring", "ic", { "1": RING, "2": GND }, PESD12VL1BA, `schematic-checklist.md:201 (CTL-10, ring, jack side of the ring reference); parts.md:107; orientation: ${READINGS}`),
    part("u_refblk", "ic", { "1": VREF_A, "2": GND, "3": REF_CE, "4": GND, "5": GND, "6": REF_OUT }, LM66100,
      `${BLOCK(307, "U_REFBLK VIN on VREF_A, VOUT to R_REF")}; analog.md:314 (ST and N/C to GND); parts.md:109`),
    part("q_refen", "ic", { "1": REF_ENG, "2": GND, "3": REF_CE }, FET_2N7002,
      `${BLOCK(309, "Q_REFEN drain on CE, S to GND")}; analog.md:310 (gate from R_ENG); parts.md:110`),
    resistor("r_eng", "100k", VREF_A, REF_ENG, RESISTOR, `${BLOCK(310, "R_ENG 100 kOhm from VREF_A to Q_REFEN's gate")}; parts.md:111`),
    resistor("r_ce", "100k", REF_OUT, REF_CE, RESISTOR, `${BLOCK(308, "CE through R_CE 100 kOhm to the VOUT node")}; analog.md:320; parts.md:111`),
    diode("d_rclamp", GND, REF_OUT, PMEG4005AEA, `${BLOCK(310, "D_RCLAMP cathode at the VOUT node, anode GND")}; parts.md:113`),
    resistor("r_ref", "3.30k", REF_OUT, RING, withMpn(RESISTOR, "1206W4F3301T5E"), `${BLOCK(307, "R_REF 3.30 kOhm to the ring")}; parts.md:114`),
    capacitor("c_ring", "100n", RING, GND, CAPACITOR, "analog.md:331 (100 nF X7R at the ring to GND)"),
    resistor("r_tip", "22.0k", TIP_J, TIP_RC, RESISTOR, `${TIP}: R_TIP 22.0 kOhm in series; analog.md:311`),
    capacitor("c_tip", "1n", TIP_RC, GND, CAPACITOR, `${TIP}: 1 nF C0G and 10 MOhm to GND; analog.md:335`),
    resistor("r_tip_pd", "10M", TIP_RC, GND, RESISTOR, `${TIP}: 1 nF C0G and 10 MOhm to GND; analog.md:335`),
    resistor("r_expin", "2.2M", TIP_RC, EXP_IN, RESISTOR, "analog.md:311 (R_EXPIN 2.2 MOhm to U_EXP IN+); analog.md:322; parts.md:112"),
    singleOpamp("u_exp", { "in+": EXP_IN, "in-": EXP_BUF, out: EXP_BUF }, { "v+": VREF_A, "v-": GND }, MCP6001,
      `${TIP}: U_EXP on VREF_A, SOT-23-5 pinout; analog.md:335 (an MCP6001 follower; D19); follower and VSS: ${READINGS}; parts.md:106`),
    capacitor("c_exp", "100n", VREF_A, GND, CAPACITOR, `${TIP}: 100 nF at its VDD pin; to GND: ${READINGS}`),
    resistor("r_exp_out", "1.00k", EXP_BUF, EXPR_TIP, RESISTOR, `analog.md:339 (1.00 kOhm and 100 nF X7R to EXPR_TIP); order: ${READINGS}`),
    capacitor("c_exp_out", "100n", EXPR_TIP, GND, CAPACITOR, `analog.md:339 (1.00 kOhm and 100 nF X7R to EXPR_TIP); order: ${READINGS}`),
    resistor("r_det", "1k", RN, EXPR_DETECT, RESISTOR, "analog.md:340 (ring-normal, 1 kOhm, EXPR_DETECT)"),
    resistor("r_det_pd", "100k", EXPR_DETECT, GND, RESISTOR, `analog.md:340 (with 100 kOhm to GND); at the pin: ${READINGS}`),
    resistor("r_hwrev_top", HW_REV_STRAP.topOhm, HW_REV_STRAP.top, HW_REV, RESISTOR, "analog.md:347 (HW_REV divider from VREF_A to GND); analog.md:351 (revision 1); CR-PEDAL-HW-REV"),
    resistor("r_hwrev_bottom", HW_REV_STRAP.bottomOhm, HW_REV, GND, RESISTOR, "analog.md:347; analog.md:351 (revision 1); CR-PEDAL-HW-REV"),
    capacitor("c_hwrev", HW_REV_STRAP.pinCapF, HW_REV, GND, CAPACITOR, "analog.md:347 (100 nF at the pin, contract pin 29); CR-PEDAL-HW-REV"),
  ], [VREF_A, EXPR_TIP, HW_REV, EXPR_DETECT, GND])
}
