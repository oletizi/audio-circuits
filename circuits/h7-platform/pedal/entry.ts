/**
 * The pedal's power entry (h7 pedal pages plan, Task 6; inventory section 1.3 B1; CR-PEDAL-BLOCKS
 * `entry`). Split spec section 7.4 as power.md section 1 draws it (power.md:46-63):
 *
 * - J_DC, the DC jack: CR-PEDAL-DC-JACK, a generic `Connector:Barrel_Jack` with no MPN, centre pin
 *   (1) GND, sleeve (2) VIN, "centre pin GND, sleeve +V" (schematic-checklist.md:117, PWR-01).
 * - FB_IN between the jack node VIN and VIN_FB, the node both Schottkys' anodes take; C_SCH on VIN,
 *   C_PROTHF on VIN_A beside C_PROT (CR-PEDAL-FB-IN). FB_IN is an `inductor` (CR-PEDAL-KINDS'
 *   FERRITE_IN), which must carry henries, and no document gives FB_IN an inductance: CR-PEDAL-FB-IN
 *   gives it 3 uH, the hot-plug grid's upper bound (power.md:295), `FB_IN_POSITION.modelHenries`. The
 *   page draws the rating, 600 ohm at 100 MHz, not henries (CR-MODULE-BEAD-VALUE; `valueFor`).
 * - D_AIN from VIN_FB to VIN_A and D_MIN from VIN_FB to VIN_MSW, one PMEG4030ER per branch
 *   (power.md:26-27, R-35; schematic-checklist.md:118, PWR-02). VIN_MSW is CR-PEDAL-NETS' name for
 *   the module branch between D_MIN and Q_MSW.
 * - The hold-up reservoir on VIN_A: C_BULK, C_BULK2-4, 100 uF 35 V aluminium, + on VIN_A
 *   (power.md:29, :113; R-35, R-40), and C_PROT 10 uF 50 V X7R (power.md:114).
 * - R_VBLD 10.0 kOhm on VIN "so VIN falls after a plug pull" (power.md:121, R-36): a bleeder, VIN to GND.
 * - Test pads (CR-PEDAL-TEST-PADS): VIN, VIN_A, and the one GND pad, which sits with the power pads.
 *
 * NOT HERE: the chassis-bond pad, which is layout (CR-PEDAL-CHASSIS-PAD).
 */
import type { Network, PartSpec } from "../../../lib/model/index.ts"
import { CAPACITOR, RESISTOR, TEST_POINT } from "../parts.ts"
import { BULK_CAPACITOR, FERRITE_IN, PMEG4030ER } from "../pedal-parts.ts"
import { DC_JACK, FB_IN_POSITION } from "../pedal-rulings.ts"
import { block, capacitor, diode, inductor, part, resistor } from "./build.ts"

const withMpn = (base: PartSpec, mpn: string): PartSpec => ({ ...base, mpn })
const C_HF = withMpn(CAPACITOR, "CL21B104KBCNNNC")
const C_PROT = withMpn(CAPACITOR, "CL31B106KBHNNNE")
const R_VBLD = withMpn(RESISTOR, "1206W4F1002T5E")

const VIN = "VIN"
const VIN_A = "VIN_A"
const VIN_MSW = "VIN_MSW"
const GND = "GND"
const VIN_FB = FB_IN_POSITION.diodeAnodes

const JACK = `${DC_JACK.ruling}; schematic-checklist.md:117 (PWR-01, centre pin GND, sleeve +V); power.md:47`
const FB = `${FB_IN_POSITION.ruling}; power.md:28`
const BULK = "power.md:29 (C_BULK and C_BULK2 to C_BULK4 on VIN_A; R-35, R-40); power.md:113 (EEE-FK1V101P 100 uF 35 V); parts.md:56"
const PADS = "CR-PEDAL-TEST-PADS"

export function entryBlock(): Network {
  return block([
    part("j_dc", "connector", { "1": DC_JACK.pins["1"], "2": DC_JACK.pins["2"] }, DC_JACK.part, JACK),
    inductor("fb_in", FB_IN_POSITION.modelHenries, FB_IN_POSITION.ferrite.a, FB_IN_POSITION.ferrite.b, FERRITE_IN,
      `${FB}; parts.md:58 (BLM31KN601SN1L); model inductance 3 uH, power.md:295 (the hot-plug grid's 0-3 uH)`),
    capacitor("c_sch", "100n", FB_IN_POSITION.cSch, GND, C_HF, `${FB}; parts.md:82 (C_SCH, 100 nF 50 V X7R 0805)`),
    capacitor("c_prothf", "100n", FB_IN_POSITION.cProtHf, GND, C_HF, `${FB}; parts.md:82 (C_PROTHF, 100 nF 50 V X7R 0805)`),
    diode("d_ain", VIN_FB, VIN_A, PMEG4030ER, `power.md:26 (D_AIN to the analog branch, R-35); power.md:27 (VIN_A after D_AIN); parts.md:55; ${FB} (anodes on VIN_FB)`),
    diode("d_min", VIN_FB, VIN_MSW, PMEG4030ER, `power.md:26 (D_MIN to the module branch, R-35); power.md:147 (Q_MSW between D_MIN and VIN_MOD); parts.md:55; CR-PEDAL-NETS (VIN_MSW); ${FB}`),
    capacitor("c_bulk", "100u", VIN_A, GND, BULK_CAPACITOR, BULK),
    capacitor("c_bulk2", "100u", VIN_A, GND, BULK_CAPACITOR, BULK),
    capacitor("c_bulk3", "100u", VIN_A, GND, BULK_CAPACITOR, BULK),
    capacitor("c_bulk4", "100u", VIN_A, GND, BULK_CAPACITOR, BULK),
    capacitor("c_prot", "10u", VIN_A, GND, C_PROT, "power.md:114 (C_PROT, CL31B106KBHNNNE 10 uF 50 V X7R, on VIN_A); parts.md:57"),
    resistor("r_vbld", "10.0k", VIN, GND, R_VBLD, "power.md:121 (R_VBLD 10.0 kOhm on VIN so VIN falls after a plug pull; R-36); parts.md:73"),
    part("tp_vin", "connector", { "1": VIN }, TEST_POINT, `${PADS} (VIN before the Schottky -> VIN)`),
    part("tp_vin_a", "connector", { "1": VIN_A }, TEST_POINT, `${PADS} (VIN_PROT -> VIN_A)`),
    part("tp_gnd", "connector", { "1": GND }, TEST_POINT, `${PADS} (the one GND pad)`),
  ], [VIN, VIN_A, VIN_MSW, GND])
}
