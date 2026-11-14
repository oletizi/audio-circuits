/**
 * The pedal's output stages (h7 pedal pages plan, Task 10; inventory section 1.3 B11;
 * CR-PEDAL-BLOCKS `out`): each channel from the codec's differential output to the output relay's
 * NO contact, as analog.md section 7 and schematic-checklist.md AIO-13 to AIO-17 state them. Per
 * channel x = L, R:
 *
 * - C_A+ and C_A- 10 uF 50 V X7R, one in series with each DAC leg (AIO-13, schematic-checklist.md:163;
 *   analog.md:197).
 * - U_OUT's difference amplifier (AIO-14, :164; analog.md:198): R_D1 = R_D2 20.0 kOhm 0.1 %,
 *   R_FO = R_GO 19.1 kOhm 0.1 % 25 ppm, C_FO = C_GO 47 pF C0G +/-2 % across R_FO and R_GO, R_GO (and
 *   C_GO) returning to this channel's VMID_x.
 * - The leg assignment (AIO-15, :165): VOUTx+ -> C_A+ -> R_D1 -> inverting input, VOUTx- -> C_A- ->
 *   R_D2 -> non-inverting input; left codec pin 20 (VOUTL+) inverting and 19 (VOUTL-) non-inverting,
 *   right 18 and 17. The stage inverts, so firmware passes samples unnegated (analog.md:198).
 * - R_S 100 Ohm after the feedback tap, then C_OUT 220 pF C0G from the R_S/C_DC node to GND (AIO-16,
 *   :166; analog.md:211, where C_OUT is "C_O").
 * - C_DC 22 uF 25 V aluminium, + toward the op-amp, onto FX_OUT_x; R_B 100 kOhm from FX_OUT_x to GND;
 *   the output test pad on FX_OUT_x with a GND pad beside it (AIO-17, :167; analog.md:207; parts.md:108;
 *   CR-PEDAL-TEST-PADS, drawn on this page by CR-PEDAL-ANALOG-READINGS).
 * - U_OUT, one whole OPA1688 dual on VIN_A (AIO-14): A = L, B = R (schematic-checklist.md:149). V- on
 *   GND, V+ decoupled by 100 nF + 10 uF 50 V to GND (PWR-11, :132; parts.md:57).
 *
 * VOUTL+, VOUTL-, VOUTR+, VOUTR- are CR-PEDAL-NETS' spelling of the codec's output pins, shared with
 * the `codec` block. Block-private nets: OUT_AP_x, OUT_AM_x, OUT_INV_x, OUT_NI_x, OUT_OA_x and
 * OUT_S_x (CR-PEDAL-ANALOG-READINGS). MPNs are parts.md's where it gives one (G245).
 */
import type { Network } from "../../../lib/model/index.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { COUPLING_CAPACITOR, OPA1688 } from "../pedal-parts.ts"
import { TEST_PADS, testPad } from "../pedal-rulings.ts"
import { block, capacitor, dualOpamp, part, resistor, withMpn } from "./build.ts"

const VIN_A = "VIN_A"
const GND = "GND"
const READINGS = "CR-PEDAL-ANALOG-READINGS"
const C10U_50V = withMpn(CAPACITOR, "CL31B106KBHNNNE")

function nets(x: "L" | "R") {
  return {
    plus: `VOUT${x}+`, minus: `VOUT${x}-`, ap: `OUT_AP_${x}`, am: `OUT_AM_${x}`, inv: `OUT_INV_${x}`, ni: `OUT_NI_${x}`,
    oa: `OUT_OA_${x}`, s: `OUT_S_${x}`, fx: `FX_OUT_${x}`, vmid: `VMID_${x}`,
  }
}


function channel(x: "L" | "R") {
  const n = nets(x)
  const lc = x.toLowerCase()
  const CA = "schematic-checklist.md:163 (AIO-13, C_A+ and C_A- 10 uF 50 V X7R, one in series with each DAC leg); analog.md:197"
  const LEGS = "schematic-checklist.md:165 (AIO-15, VOUTx+ -> C_A+ -> R_D1 -> inverting input; VOUTx- -> C_A- -> R_D2 -> non-inverting input); analog.md:198"
  const AMP = "schematic-checklist.md:164 (AIO-14, R_D1 = R_D2 20.0 kOhm 0.1 %; R_FO = R_GO 19.1 kOhm 0.1 % 25 ppm; C_FO = C_GO 47 pF C0G across R_FO and R_GO)"
  const outPad = testPad(`tp_out_${lc}`)
  const gndPad = testPad(`tp_out_${lc}_gnd`)
  return [
    capacitor(`c_ap_${lc}`, "10u", n.plus, n.ap, CAPACITOR, `${CA}; ${LEGS}`),
    capacitor(`c_am_${lc}`, "10u", n.minus, n.am, CAPACITOR, `${CA}; ${LEGS}`),
    resistor(`r_d1_${lc}`, "20.0k", n.ap, n.inv, RESISTOR, `${AMP}; ${LEGS}`),
    resistor(`r_d2_${lc}`, "20.0k", n.am, n.ni, RESISTOR, `${AMP}; ${LEGS}`),
    resistor(`r_fo_${lc}`, "19.1k", n.inv, n.oa, RESISTOR, `${AMP}; analog.md:198`),
    capacitor(`c_fo_${lc}`, "47p", n.inv, n.oa, CAPACITOR, `${AMP}; analog.md:198`),
    resistor(`r_go_${lc}`, "19.1k", n.ni, n.vmid, RESISTOR, `${AMP}, R_GO returns to this channel's VMID_x; analog.md:198`),
    capacitor(`c_go_${lc}`, "47p", n.ni, n.vmid, CAPACITOR, `${AMP}; analog.md:198`),
    resistor(`r_s_${lc}`, "100", n.oa, n.s, RESISTOR, "schematic-checklist.md:166 (AIO-16, R_S 100 Ohm after the feedback tap); analog.md:211"),
    capacitor(`c_out_${lc}`, "220p", n.s, GND, CAPACITOR, "schematic-checklist.md:166 (AIO-16, C_OUT 220 pF C0G from the R_S/C_DC node to GND); analog.md:211"),
    capacitor(`c_dc_${lc}`, "22u", n.s, n.fx, COUPLING_CAPACITOR,
      "schematic-checklist.md:167 (AIO-17, C_DC 22 uF 25 V aluminium, + toward the op-amp, then FX_OUT_x); analog.md:207; parts.md:108 (EEE-FT1E220AR)"),
    resistor(`r_b_${lc}`, "100k", n.fx, GND, RESISTOR, "schematic-checklist.md:167 (AIO-17, R_B 100 kOhm bleed from FX_OUT_x to GND); analog.md:207"),
    part(outPad.id, "connector", { "1": outPad.net }, TEST_PADS.part, `CR-PEDAL-TEST-PADS (output pad on FX_OUT_${x}; schematic-checklist.md:167, AIO-17); its page: ${READINGS}`),
    part(gndPad.id, "connector", { "1": gndPad.net }, TEST_PADS.part, `CR-PEDAL-TEST-PADS (the GND pad beside it; schematic-checklist.md:167); its page: ${READINGS}`),
  ]
}

export function outBlock(): Network {
  const l = nets("L")
  const r = nets("R")
  return block([
    ...channel("L"),
    ...channel("R"),
    dualOpamp("u_out", { "in+": l.ni, "in-": l.inv, out: l.oa }, { "in+": r.ni, "in-": r.inv, out: r.oa },
      { "v+": VIN_A, "v-": GND }, OPA1688,
      "schematic-checklist.md:164 (AIO-14, U_OUT, an OPA1688 difference amplifier on VIN_A); schematic-checklist.md:149 (channel A = L and B = R); " +
        "schematic-checklist.md:132 (V- on GND); parts.md:105"),
    capacitor("c_uout_hf", "100n", VIN_A, GND, CAPACITOR, "schematic-checklist.md:132 (PWR-11, V+ with 100 nF + 10 uF 50 V to GND)"),
    capacitor("c_uout_bulk", "10u", VIN_A, GND, C10U_50V, "schematic-checklist.md:132 (PWR-11, V+ with 100 nF + 10 uF 50 V to GND); parts.md:57 (the op-amp decoupling)"),
  ], [l.plus, l.minus, r.plus, r.minus, l.vmid, r.vmid, l.fx, r.fx, VIN_A, GND])
}
