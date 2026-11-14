/**
 * The pedal's ADC drivers (h7 pedal pages plan, Task 10; inventory section 1.3 B10;
 * CR-PEDAL-BLOCKS `adc_drv`): each channel from its follower's output to the codec's analog input, as
 * analog.md sections 6.1 and 6.5 and schematic-checklist.md AIO-08 to AIO-12 state them. Per
 * channel x = L, R:
 *
 * - C_AC 22 uF 25 V aluminium, + toward U_IN, from IN_FOLLOW_x (CR-PEDAL-NETS), then R_IN 10.0 kOhm
 *   1 % to U_ADC's inverting input (AIO-08, schematic-checklist.md:158; analog.md:176; the part is
 *   parts.md:108's EEE-FT1E220AR). `Device:C_Polarized` pin 1 is the + terminal, so `a` is.
 * - U_ADC's feedback R_FA 10.0 kOhm 1 % with C_FA 47 pF C0G across it (AIO-09, :159; analog.md:176).
 * - U_ADC's non-inverting input on VBIAS_x: 2 x 2.00 kOhm 0.1 % from 5V_A to GND with 10 uF X7R at
 *   the node, one node per channel (AIO-10, :160; analog.md:159); the capacitor to GND
 *   (CR-PEDAL-ANALOG-READINGS).
 * - R_O 100 Ohm from U_ADC's output to VINL or VINR, with C_VIN 2.2 nF C0G to GND at the codec pin,
 *   DC-coupled (AIO-12, :162; analog.md:176); AIO-11's "no series resistor at VINx" is read in
 *   CR-PEDAL-ANALOG-READINGS.
 * - U_ADC, one whole OPA1688 dual on 5V_A (AIO-09): A = L, B = R (schematic-checklist.md:149). V- on
 *   GND, V+ decoupled by 100 nF + 10 uF 50 V to GND (PWR-11, :132, "including U_ADC on 5V_A"); the
 *   10 uF part is CR-PEDAL-ANALOG-READINGS'.
 *
 * VINL and VINR are the codec's input pins' names (schematic-checklist.md:110), shared with the
 * `codec` block. Block-private nets: ADC_AC_x, ADC_INV_x, ADC_OUT_x (CR-PEDAL-ANALOG-READINGS) and
 * VBIAS_x (analog.md:159). MPNs are parts.md's where it gives one (G245).
 */
import type { Network } from "../../../lib/model/index.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { COUPLING_CAPACITOR, OPA1688 } from "../pedal-parts.ts"
import { block, capacitor, dualOpamp, resistor, withMpn } from "./build.ts"

const V5A = "5V_A"
const GND = "GND"
const READINGS = "CR-PEDAL-ANALOG-READINGS"
const C10U_50V = withMpn(CAPACITOR, "CL31B106KBHNNNE")

function nets(x: "L" | "R") {
  return { follow: `IN_FOLLOW_${x}`, ac: `ADC_AC_${x}`, inv: `ADC_INV_${x}`, out: `ADC_OUT_${x}`, vbias: `VBIAS_${x}`, vin: `VIN${x}` }
}

function channel(x: "L" | "R") {
  const n = nets(x)
  const lc = x.toLowerCase()
  const VBIAS = "schematic-checklist.md:160 (AIO-10, 2 x 2.00 kOhm 0.1 % from 5V_A to GND with 10 uF X7R at the node, one node per channel); analog.md:159"
  return [
    capacitor(`c_ac_${lc}`, "22u", n.follow, n.ac, COUPLING_CAPACITOR,
      "schematic-checklist.md:158 (AIO-08, C_AC 22 uF 25 V aluminium, + toward U_IN); analog.md:176; parts.md:108 (EEE-FT1E220AR)"),
    resistor(`r_in_${lc}`, "10.0k", n.ac, n.inv, RESISTOR, "schematic-checklist.md:158 (AIO-08, R_IN 10.0 kOhm 1 % to U_ADC's inverting input); analog.md:176"),
    resistor(`r_fa_${lc}`, "10.0k", n.inv, n.out, RESISTOR, "schematic-checklist.md:159 (AIO-09, R_FA 10.0 kOhm 1 %); analog.md:176 (R_IN = R_F = 10.0 kOhm)"),
    capacitor(`c_fa_${lc}`, "47p", n.inv, n.out, CAPACITOR, "schematic-checklist.md:159 (AIO-09, C_FA 47 pF C0G across R_FA); analog.md:176"),
    resistor(`r_vbias_top_${lc}`, "2.00k", V5A, n.vbias, RESISTOR, VBIAS),
    resistor(`r_vbias_bot_${lc}`, "2.00k", n.vbias, GND, RESISTOR, VBIAS),
    capacitor(`c_vbias_${lc}`, "10u", n.vbias, GND, CAPACITOR, `${VBIAS}; to GND: ${READINGS}`),
    resistor(`r_o_${lc}`, "100", n.out, n.vin, RESISTOR,
      `schematic-checklist.md:162 (AIO-12, U_ADC's output through R_O 100 Ohm to VINL/VINR); analog.md:176; AIO-11 read in ${READINGS}`),
    capacitor(`c_vin_${lc}`, "2.2n", n.vin, GND, CAPACITOR, "schematic-checklist.md:162 (AIO-12, C_VIN 2.2 nF C0G to GND at the codec pin); analog.md:176"),
  ]
}

export function adcDrvBlock(): Network {
  const l = nets("L")
  const r = nets("R")
  return block([
    ...channel("L"),
    ...channel("R"),
    dualOpamp("u_adc", { "in+": l.vbias, "in-": l.inv, out: l.out }, { "in+": r.vbias, "in-": r.inv, out: r.out },
      { "v+": V5A, "v-": GND }, OPA1688,
      "schematic-checklist.md:159 (AIO-09, U_ADC, an OPA1688 inverting stage on 5V_A); schematic-checklist.md:160 (non-inverting input on VBIAS_x); " +
        "schematic-checklist.md:149 (channel A = L and B = R); schematic-checklist.md:132 (V- on GND); parts.md:105"),
    capacitor("c_uadc_hf", "100n", V5A, GND, CAPACITOR, "schematic-checklist.md:132 (PWR-11, V+ with 100 nF + 10 uF 50 V to GND, including U_ADC on 5V_A)"),
    capacitor("c_uadc_bulk", "10u", V5A, GND, C10U_50V,
      `schematic-checklist.md:132 (PWR-11, including U_ADC on 5V_A); parts.md:57 (the op-amp decoupling); the part on 5V_A: ${READINGS}`),
  ], [l.follow, r.follow, l.vin, r.vin, V5A, GND])
}
