/**
 * The pedal's input front ends (h7 pedal pages plan, Task 10; inventory section 1.3 B9;
 * CR-PEDAL-BLOCKS `in_fe`): each channel from the input relay's NO contact up to its follower, as
 * analog.md section 6 and schematic-checklist.md AIO-02 to AIO-07 state them. Per channel x = L, R:
 *
 * - R_RF 1.0 kOhm in series from FX_IN_x, then C_RF 100 pF C0G 50 V to GND (AIO-02,
 *   schematic-checklist.md:152; analog.md:167). The node is IN_RF_x (CR-PEDAL-TEST-PADS).
 * - R_PD 22 MOhm to GND on the jack side of C_IN (AIO-03, :153): on IN_RF_x, beside C_RF, as the
 *   section 4 diagram draws it (analog.md:124-126) and bypass-relay.md:122 has it ("held at 0 V DC by
 *   R_PD 22 MOhm and C_RF 100 pF" behind R_RF).
 * - C_IN 47 nF C0G 50 V 1206 from IN_RF_x to IN_AC_x (AIO-04, :154; analog.md:168).
 * - R_DIV1 1.50 MOhm 0.1 % from IN_AC_x to node T, IN_T_x, with C_COMP 110 pF C0G +/-2 % across it
 *   (AIO-05, :155); R_DIV2 1.00 MOhm 0.1 % from node T to this channel's VMID_x, and C_T 160 pF C0G
 *   +/-2 % from node T to GND (AIO-06, :156; analog.md:163, :172).
 * - U_IN, one whole OPA1688 dual, a unity follower per channel with its input at node T (AIO-07,
 *   :157; analog.md:172): A = L, B = R (schematic-checklist.md:149), each output on its inverting input
 *   and on IN_FOLLOW_x (CR-PEDAL-NETS). V+ on VIN_A, V- on GND, V+ decoupled by 100 nF + 10 uF 50 V to
 *   GND (PWR-11, :132; the 10 uF is parts.md:57's op-amp decoupling part).
 * - The input test pad on IN_RF_x, with a GND pad beside it (AIO-02; CR-PEDAL-TEST-PADS); drawn on
 *   this page (CR-PEDAL-ANALOG-READINGS).
 *
 * Block-private nets: IN_RF_x (CR-PEDAL-TEST-PADS), IN_AC_x and IN_T_x (CR-PEDAL-ANALOG-READINGS;
 * the documents call the second "node T"). MPNs are parts.md's where it gives one; the AIO rows name
 * only what v1 contained for the rest, and a schematic needs none (G245).
 */
import type { Network } from "../../../lib/model/index.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { C10U_50V, OPA1688 } from "../pedal-parts.ts"
import { TEST_PADS, testPad } from "../pedal-rulings.ts"
import { block, capacitor, dualOpamp, part, resistor } from "./build.ts"

const VIN_A = "VIN_A"
const GND = "GND"
const READINGS = "CR-PEDAL-ANALOG-READINGS"

/** One channel's nets: the documents' and CR-PEDAL-NETS' shared names, and the block-private nodes. */
function nets(x: "L" | "R") {
  return { fxIn: `FX_IN_${x}`, rf: `IN_RF_${x}`, ac: `IN_AC_${x}`, t: `IN_T_${x}`, vmid: `VMID_${x}`, follow: `IN_FOLLOW_${x}` }
}

function channel(x: "L" | "R") {
  const n = nets(x)
  const lc = x.toLowerCase()
  const inPad = testPad(`tp_in_${lc}`)
  const gndPad = testPad(`tp_in_${lc}_gnd`)
  return [
    resistor(`r_rf_${lc}`, "1.0k", n.fxIn, n.rf, RESISTOR, "schematic-checklist.md:152 (AIO-02, R_RF 1.0 kOhm in series from FX_IN_x); analog.md:167"),
    capacitor(`c_rf_${lc}`, "100p", n.rf, GND, CAPACITOR, "schematic-checklist.md:152 (AIO-02, C_RF 100 pF C0G 50 V to GND); analog.md:167 (OWN-02)"),
    resistor(`r_pd_${lc}`, "22M", n.rf, GND, RESISTOR,
      "schematic-checklist.md:153 (AIO-03, R_PD 22 MOhm to GND on the jack side of C_IN); analog.md:126 (on the R_RF/C_IN node); bypass-relay.md:122"),
    capacitor(`c_in_${lc}`, "47n", n.rf, n.ac, CAPACITOR, "schematic-checklist.md:154 (AIO-04, C_IN 47 nF C0G 50 V 1206); analog.md:168"),
    resistor(`r_div1_${lc}`, "1.50M", n.ac, n.t, RESISTOR, "schematic-checklist.md:155 (AIO-05, R_DIV1 1.50 MOhm 0.1 % from C_IN to node T); analog.md:163"),
    capacitor(`c_comp_${lc}`, "110p", n.ac, n.t, CAPACITOR, "schematic-checklist.md:155 (AIO-05, C_COMP 110 pF C0G +/-2 % across R_DIV1); analog.md:172"),
    resistor(`r_div2_${lc}`, "1.00M", n.t, n.vmid, RESISTOR, "schematic-checklist.md:156 (AIO-06, R_DIV2 1.00 MOhm 0.1 % from node T to this channel's VMID_x); analog.md:163"),
    capacitor(`c_t_${lc}`, "160p", n.t, GND, CAPACITOR, "schematic-checklist.md:156 (AIO-06, C_T 160 pF C0G +/-2 % from T to GND); analog.md:172"),
    part(inPad.id, "connector", { "1": inPad.net }, TEST_PADS.part, `CR-PEDAL-TEST-PADS (input pad on IN_RF_${x}; schematic-checklist.md:152, AIO-02); its page: ${READINGS}`),
    part(gndPad.id, "connector", { "1": gndPad.net }, TEST_PADS.part, `CR-PEDAL-TEST-PADS (the GND pad beside it; schematic-checklist.md:152); its page: ${READINGS}`),
  ]
}

export function inFeBlock(): Network {
  const l = nets("L")
  const r = nets("R")
  return block([
    ...channel("L"),
    ...channel("R"),
    dualOpamp("u_in", { "in+": l.t, "in-": l.follow, out: l.follow }, { "in+": r.t, "in-": r.follow, out: r.follow },
      { "v+": VIN_A, "v-": GND }, OPA1688,
      "schematic-checklist.md:157 (AIO-07, U_IN, an OPA1688 unity follower on VIN_A, input at node T); schematic-checklist.md:149 (channel A = L and B = R); " +
        "schematic-checklist.md:132 (V- on GND); output IN_FOLLOW_x: CR-PEDAL-NETS; parts.md:105"),
    capacitor("c_uin_hf", "100n", VIN_A, GND, CAPACITOR, "schematic-checklist.md:132 (PWR-11, V+ with 100 nF + 10 uF 50 V to GND)"),
    capacitor("c_uin_bulk", "10u", VIN_A, GND, C10U_50V, "schematic-checklist.md:132 (PWR-11, V+ with 100 nF + 10 uF 50 V to GND); parts.md:57 (the op-amp decoupling)"),
  ], [l.fxIn, r.fxIn, l.vmid, r.vmid, l.follow, r.follow, VIN_A, GND])
}
