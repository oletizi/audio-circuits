/**
 * The module's power (H7 module plan, Task 6): VIN_MOD through L_FILT and the buck input network
 * to the TPS62933F buck and its output, 3V3_D (power.md section 4.1, 4.2 and 5.2; parts.md:36-45;
 * schematic-checklist.md PWR-05 to PWR-07).
 *
 * - Input network, ruling R-48, unchanged (power.md:270): L_FILT 4.7 uH from VIN_MOD to VIN_BUCK
 *   ("the module buck's VIN after L_FILT", power.md:313); C_BIN1 and C_BIN2 10 uF and C_BINHF
 *   100 nF on VIN_BUCK; and R_DAMP 0.22 ohm with C_DAMP 47 uF aluminium "in series from VIN_BUCK
 *   to GND" (PWR-05), C_DAMP's + terminal on the damping node. No other part ahead of L_FILT
 *   (power.md:270, ruling CR-MODULE-VIN-PROTECTION) but the EN divider.
 * - EN from VIN_MOD: R_UV1 18.0 kOhm to EN, R_UV2 4.30 kOhm to GND (power.md:256; R-47, D24).
 * - U_BUCK pins as PWR-06: RT (1) no-connect (RT floating, 500 kHz, power.md:374), EN (2),
 *   VIN (3) = VIN_BUCK, GND (4), SW (5) to L_BUCK, BST (6), SS (7), FB (8).
 * - Bootstrap: C_BST 100 nF with a 0 ohm R_BST footprint (power.md:380). The series order is the
 *   source checklist's: "BST (6) C_BST 100 nF ... to SW through a 0 ohm R_BST footprint" (pedals
 *   SCHEMATIC-CHECKLIST.md:110 @5b926d0, the PWR-06 this repository's PWR-06 carries), read in the
 *   pedals v1 VERIFICATION.md:739 @5b926d0 as "BST -> R_BST -> C_BST -> SW".
 * - Soft start: C_SS 33 nF from SS to GND, SS must not float (power.md:379; pedals
 *   SCHEMATIC-CHECKLIST.md:110 @5b926d0, "SS/PG (7) C_SS 33 nF to GND").
 * - L_BUCK 4.7 uH from SW to 3V3_D; C_BOUT1 to C_BOUT3 22 uF plus 100 nF on 3V3_D (power.md:376-377;
 *   PWR-07).
 * - Feedback 32.4 kOhm from 3V3_D to FB over 10.0 kOhm to GND (power.md:378; PWR-06).
 *
 * MPNs are parts.md's; the capacitors' and resistors' symbols are `Device:C` and `Device:R`.
 */
import { NC } from "../../../lib/model/index.ts"
import type { Network, PartSpec } from "../../../lib/model/index.ts"
import { BUCK, BUCK_INDUCTOR, DAMPING_CAPACITOR, INPUT_FILTER_INDUCTOR } from "../module-parts.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { block, capacitor, inductor, part, resistor } from "./build.ts"
import { NET_3V3, NET_GND, NET_VIN_MOD } from "./nets.ts"

const withMpn = (base: PartSpec, mpn: string): PartSpec => ({ ...base, mpn })
/** parts.md:42 (C_BIN1/C_BIN2), :43 (C_BINHF), :38 (C_BOUT1-3), :39 (C_SS), :44-45 (R_UV1, R_UV2). */
const C_BIN = withMpn(CAPACITOR, "CL31B106KBHNNNE")
const C_BINHF = withMpn(CAPACITOR, "CL21B104KBCNNNC")
const C_BOUT = withMpn(CAPACITOR, "CL31A226KAHNNNE")
const C_SS = withMpn(CAPACITOR, "CL10B333KB8NNNC")
const R_UV1 = withMpn(RESISTOR, "0603WAF1802T5E")
const R_UV2 = withMpn(RESISTOR, "0603WAF4301T5E")

/** This block's own nets. */
const VIN_BUCK = "VIN_BUCK"
const DAMP = "DAMP"
const EN = "EN"
const SW = "SW"
const BST = "BST"
const BST_CAP = "BST_CAP"
const SS = "SS"
const FB = "FB"

const R48 = "power.md:270 (ruling R-48, the input network unchanged); PWR-05"
const BUCK_SRC = "power.md:370-382 (section 5.2); PWR-06"

export function powerBlock(): Network {
  return block([
    inductor("l_filt", "4.7u", NET_VIN_MOD, VIN_BUCK, INPUT_FILTER_INDUCTOR, `${R48}; parts.md:40 (L_FILT 74404054047); power.md:313 (the buck's VIN after L_FILT)`),
    capacitor("c_bin1", "10u", VIN_BUCK, NET_GND, C_BIN, `${R48}; parts.md:42 (C_BIN1, 10 uF 50 V X7R)`),
    capacitor("c_bin2", "10u", VIN_BUCK, NET_GND, C_BIN, `${R48}; parts.md:42 (C_BIN2, 10 uF 50 V X7R)`),
    capacitor("c_binhf", "100n", VIN_BUCK, NET_GND, C_BINHF, `${R48}; parts.md:43 (C_BINHF, 100 nF 50 V X7R)`),
    resistor("r_damp", "0.22", VIN_BUCK, DAMP, RESISTOR, `${R48} (R_DAMP 0.22 ohm 1 % 0805 with C_DAMP in series from VIN_BUCK to GND)`),
    capacitor("c_damp", "47u", DAMP, NET_GND, DAMPING_CAPACITOR, `${R48}; parts.md:41 (C_DAMP EEE-FK1V470P, 47 uF 35 V aluminium); + on the damping node`),
    resistor("r_uv1", "18.0k", NET_VIN_MOD, EN, R_UV1, "power.md:256 (R_UV1 18.0 kOhm from VIN_MOD to EN; R-47, D24); parts.md:44"),
    resistor("r_uv2", "4.30k", EN, NET_GND, R_UV2, "power.md:256 (R_UV2 4.30 kOhm to GND; R-47); parts.md:45"),
    part("u_buck", "ic", {
      "1": NC, "2": EN, "3": VIN_BUCK, "4": NET_GND, "5": SW, "6": BST, "7": SS, "8": FB,
    }, BUCK, `parts.md:36 (U_BUCK, TPS62933FDRLR, D5); ${BUCK_SRC} (pin-level: RT no-connect, VIN = VIN_BUCK, SW to L_BUCK)`),
    resistor("r_bst", "0", BST, BST_CAP, RESISTOR, "power.md:380 (a 0 ohm R_BST footprint); pedals SCHEMATIC-CHECKLIST.md:110 @5b926d0 (BST to SW through C_BST and R_BST)"),
    capacitor("c_bst", "100n", BST_CAP, SW, CAPACITOR, "power.md:380 (C_BST 100 nF >= 16 V X7R); pedals SCHEMATIC-CHECKLIST.md:110 @5b926d0 (to SW)"),
    capacitor("c_ss", "33n", SS, NET_GND, C_SS, "power.md:379 (C_SS 33 nF, CL10B333KB8NNNC; SS must not float); parts.md:39; pedals SCHEMATIC-CHECKLIST.md:110 @5b926d0 (to GND)"),
    inductor("l_buck", "4.7u", SW, NET_3V3, BUCK_INDUCTOR, `${BUCK_SRC} (L_BUCK 74439346047, 4.7 uH); parts.md:37; PWR-07`),
    capacitor("c_bout1", "22u", NET_3V3, NET_GND, C_BOUT, "power.md:377 (3 x 22 uF X5R 25 V 1206); parts.md:38; PWR-07"),
    capacitor("c_bout2", "22u", NET_3V3, NET_GND, C_BOUT, "power.md:377 (3 x 22 uF X5R 25 V 1206); parts.md:38; PWR-07"),
    capacitor("c_bout3", "22u", NET_3V3, NET_GND, C_BOUT, "power.md:377 (3 x 22 uF X5R 25 V 1206); parts.md:38; PWR-07"),
    capacitor("c_bout_hf", "100n", NET_3V3, NET_GND, CAPACITOR, "power.md:377 (plus 100 nF); PWR-07"),
    resistor("r_fb_top", "32.4k", NET_3V3, FB, RESISTOR, "power.md:378 (32.4 kOhm over 10.0 kOhm, 1 %); PWR-06 (R_FBT)"),
    resistor("r_fb_bottom", "10.0k", FB, NET_GND, RESISTOR, "power.md:378 (32.4 kOhm over 10.0 kOhm, 1 %); PWR-06 (R_FBB)"),
  ], [NET_VIN_MOD, NET_3V3, NET_GND])
}
