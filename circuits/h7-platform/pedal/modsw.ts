/**
 * The pedal's module load switch (h7 pedal pages plan, Task 6; inventory section 1.3 B3;
 * CR-PEDAL-BLOCKS `modsw`). power.md section 3.5 (R-38, R-41, R-42, R-49):
 *
 * - Q_MSW, AOD4185 P-MOSFET, "between D_MIN and VIN_MOD" (power.md:147): source on VIN_MSW
 *   (CR-PEDAL-NETS, D_MIN's cathode), drain on VIN_MOD, the side that "rises" (power.md:148).
 *   Numbered 1 G, 2 D, 3 S (CR-PEDAL-SYMBOL-AOD4185).
 * - Gate network: R_MSWT 15.0 kOhm source to gate; R_MSWB 4.30 kOhm gate to Q_MSWD's drain; Q_MSWD
 *   (AO3400A) gate on PF_ON (power.md:147). Q_MSWD's source is GND: the documents do not write it, and
 *   power.md:156 computes the gate current as (VS - 1.7 V) / R_MSWB, which puts R_MSWB's far end at
 *   0 V when Q_MSWD is on.
 * - Soft start: C_SS 2.2 uF from the drain to node X, D_SS from X to the gate (anode X), R_SSR 15.0
 *   kOhm from the source to X (power.md:148).
 * - Plug-in gate hold: C_GS 220 nF from the source to D_GS, D_GS's cathode on the gate, R_GSB 470 kOhm
 *   across C_GS (power.md:151).
 * - Discharge: Q_VDIS (AO3400A, gate PF_TRIP) with R_VDIS 10.0 ohm "discharges VIN_MOD while tripped"
 *   (power.md:150), its source on GND (the discharge is tau = 10 ohm x 220 uF to 0 V, power.md:162).
 *   The documents do not say which of the two series parts sits on VIN_MOD; R_VDIS is drawn there and
 *   Q_VDIS's drain on the inner node VDIS_D. The two orders are the same circuit.
 * - Test pad on VIN_MOD (CR-PEDAL-TEST-PADS, "Added: VIN_MOD").
 *
 * AO3400A and 2N7002 numbering: 1 G, 2 S, 3 D (CR-PEDAL-SYMBOL-AO3400A). Block-private nets: MSW_G
 * (Q_MSW's gate), MSW_X (the documents' node X), MSW_GH (C_GS to D_GS), MSWD_D, VDIS_D.
 */
import type { Network, PartSpec } from "../../../lib/model/index.ts"
import { CAPACITOR, RESISTOR, TEST_POINT } from "../parts.ts"
import { AO3400A, AOD4185, BAS116H } from "../pedal-parts.ts"
import { block, capacitor, diode, part, resistor } from "./build.ts"
import { contractNet } from "./nets.ts"

const withMpn = (base: PartSpec, mpn: string): PartSpec => ({ ...base, mpn })

const VIN_MSW = "VIN_MSW"
const VIN_MOD = contractNet("VIN_MOD")
const PF_ON = "PF_ON"
const PF_TRIP = "PF_TRIP"
const GND = "GND"
const G = "MSW_G"
const X = "MSW_X"
const GH = "MSW_GH"
const MSWD_D = "MSWD_D"
const VDIS_D = "VDIS_D"

const SW = "power.md:147 (R-38, R-41)"
const SS = "power.md:148 (soft start; R-41)"
const HOLD = "power.md:151 (plug-in gate hold; R-49)"
const DIS = "power.md:150 (discharge; R-42)"
const R15K = withMpn(RESISTOR, "0603WAF1502T5E")

export function modswBlock(): Network {
  return block([
    part("q_msw", "ic", { "1": G, "2": VIN_MOD, "3": VIN_MSW }, AOD4185,
      `${SW}: Q_MSW between D_MIN and VIN_MOD; CR-PEDAL-NETS (VIN_MSW at its source); power.md:148 (the drain rises); parts.md:62`),
    resistor("r_mswt", "15.0k", VIN_MSW, G, R15K, `${SW}: R_MSWT source to gate; parts.md:75`),
    resistor("r_mswb", "4.30k", G, MSWD_D, withMpn(RESISTOR, "0603WAF4301T5E"), `${SW}: R_MSWB gate to Q_MSWD; parts.md:76`),
    part("q_mswd", "ic", { "1": PF_ON, "2": GND, "3": MSWD_D }, AO3400A,
      `${SW}: Q_MSWD gate on PF_ON; parts.md:61; source on GND per power.md:156 (gate current (VS - 1.7 V) / R_MSWB)`),
    capacitor("c_ss", "2.2u", VIN_MOD, X, withMpn(CAPACITOR, "CL31B225KBHNNNE"), `${SS}: C_SS from the drain to node X; parts.md:77`),
    diode("d_ss", X, G, BAS116H, `${SS}: D_SS from X to the gate; parts.md:64`),
    resistor("r_ssr", "15.0k", VIN_MSW, X, R15K, `${SS}: R_SSR from the source to X; parts.md:75`),
    capacitor("c_gs", "220n", VIN_MSW, GH, withMpn(CAPACITOR, "CL21B224KBFNNNE"), `${HOLD}: C_GS from the source to D_GS; parts.md:65`),
    diode("d_gs", GH, G, BAS116H, `${HOLD}: D_GS cathode on the gate; parts.md:64`),
    resistor("r_gsb", "470k", VIN_MSW, GH, withMpn(RESISTOR, "0603WAF4703T5E"), `${HOLD}: R_GSB across C_GS; parts.md:66`),
    part("q_vdis", "ic", { "1": PF_TRIP, "2": GND, "3": VDIS_D }, AO3400A,
      `${DIS}: Q_VDIS gate PF_TRIP; parts.md:61; source on GND per power.md:162 (tau = 10 ohm x 220 uF)`),
    resistor("r_vdis", "10.0", VIN_MOD, VDIS_D, withMpn(RESISTOR, "CRCW201010R0FKEFHP"),
      `${DIS}: R_VDIS 10.0 ohm discharges VIN_MOD; parts.md:63; series order drawn, not stated (module comment)`),
    part("tp_vin_mod", "connector", { "1": VIN_MOD }, TEST_POINT, "CR-PEDAL-TEST-PADS (Added: VIN_MOD)"),
  ], [VIN_MSW, VIN_MOD, PF_ON, PF_TRIP, GND])
}
