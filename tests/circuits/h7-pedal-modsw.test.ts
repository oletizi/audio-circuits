/**
 * The h7-pedal's module load switch block, `modsw` (h7 pedal pages plan, Task 6; inventory section
 * 1.3 B3): Q_MSW between D_MIN (VIN_MSW) and VIN_MOD, its gate network and Q_MSWD, the soft start,
 * the plug-in gate hold, the VIN_MOD discharge Q_VDIS with R_VDIS, and the VIN_MOD test pad.
 * Each expectation is written from the cited lines.
 *
 * Q_MSW is a P-MOSFET whose source is the D_MIN side (R_MSWT runs "source to gate" from the D_MIN
 * side, power.md:147, and the drain is the side that "rises", power.md:148), numbered 1 G, 2 D, 3 S
 * (CR-PEDAL-SYMBOL-AOD4185). The AO3400A and 2N7002 are 1 G, 2 S, 3 D (CR-PEDAL-SYMBOL-AO3400A).
 */
import { describe, test } from "bun:test"
import { modswBlock } from "../../circuits/h7-platform/pedal/modsw.ts"
import { expectBlock, expectPorts, type PartExpectation } from "./h7-pedal-expect.ts"

const P147 = "power.md:147"
const P148 = "power.md:148"
const P150 = "power.md:150"
const P151 = "power.md:151"

const MODSW: readonly PartExpectation[] = [
  {
    id: "q_msw", kind: "ic", pins: { "1": "MSW_G", "2": "VIN_MOD", "3": "VIN_MSW" }, mpn: "AOD4185",
    cites: [[P147, "between D_MIN and VIN_MOD"], ["decisions.md:2127", "between D_MIN's cathode and Q_MSW's source"], ["parts.md:62", "AOD4185"]],
  },
  {
    id: "r_mswt", kind: "resistor", value: 15.0e3, pins: { a: "VIN_MSW", b: "MSW_G" }, mpn: "0603WAF1502T5E",
    cites: [[P147, "R_MSWT 15.0 kΩ source to gate"], ["parts.md:75", "0603WAF1502T5E"]],
  },
  {
    id: "r_mswb", kind: "resistor", value: 4.30e3, pins: { a: "MSW_G", b: "MSWD_D" }, mpn: "0603WAF4301T5E",
    cites: [[P147, "R_MSWB 4.30 kΩ gate to Q_MSWD"], ["parts.md:76", "0603WAF4301T5E"]],
  },
  {
    // Source on GND: the gate current is (VS - 1.7 V) / R_MSWB, R_MSWB's far end at 0 V (power.md:156).
    id: "q_mswd", kind: "ic", pins: { "1": "PF_ON", "2": "GND", "3": "MSWD_D" }, mpn: "AO3400A",
    cites: [[P147, "Q_MSWD (AO3400A, gate on PF_ON)"], ["power.md:156", "gate current (VS − 1.7 V) / R_MSWB"], ["decisions.md:2147", "**Q_MSWD's source on GND**"]],
  },
  {
    id: "c_ss", kind: "capacitor", value: 2.2e-6, pins: { a: "VIN_MOD", b: "MSW_X" }, mpn: "CL31B225KBHNNNE",
    cites: [[P148, "C_SS 2.2 µF 50 V X7R from the drain to a node X"], ["parts.md:77", "CL31B225KBHNNNE"]],
  },
  {
    id: "d_ss", kind: "diode", pins: { anode: "MSW_X", cathode: "MSW_G" }, mpn: "BAS116H,115",
    cites: [[P148, "D_SS (BAS116H) from X to the gate"], ["parts.md:64", "D_SS"]],
  },
  {
    id: "r_ssr", kind: "resistor", value: 15.0e3, pins: { a: "VIN_MSW", b: "MSW_X" }, mpn: "0603WAF1502T5E",
    cites: [[P148, "R_SSR 15.0 kΩ from the source to X"], ["parts.md:75", "R_SSR"]],
  },
  {
    id: "c_gs", kind: "capacitor", value: 220e-9, pins: { a: "VIN_MSW", b: "MSW_GH" }, mpn: "CL21B224KBFNNNE",
    cites: [[P151, "C_GS 220 nF from the source to D_GS"], ["parts.md:65", "CL21B224KBFNNNE"]],
  },
  {
    id: "d_gs", kind: "diode", pins: { anode: "MSW_GH", cathode: "MSW_G" }, mpn: "BAS116H,115",
    cites: [[P151, "D_GS (BAS116H, cathode on the gate)"], ["parts.md:64", "D_GS"]],
  },
  {
    id: "r_gsb", kind: "resistor", value: 470e3, pins: { a: "VIN_MSW", b: "MSW_GH" }, mpn: "0603WAF4703T5E",
    cites: [[P151, "R_GSB 470 kΩ across C_GS"], ["parts.md:66", "0603WAF4703T5E"]],
  },
  {
    // Source on GND: VIN_MOD discharges through 10 ohm alone, tau = 10 ohm x 220 uF (power.md:162).
    id: "q_vdis", kind: "ic", pins: { "1": "PF_TRIP", "2": "GND", "3": "VDIS_D" }, mpn: "AO3400A",
    cites: [[P150, "Q_VDIS (AO3400A, gate PF_TRIP)"], ["power.md:162", "τ = 10 Ω × 220 µF"], ["decisions.md:2146", "**Q_VDIS's source on GND**"]],
  },
  {
    id: "r_vdis", kind: "resistor", value: 10.0, pins: { a: "VIN_MOD", b: "VDIS_D" }, mpn: "CRCW201010R0FKEFHP",
    cites: [[P150, "R_VDIS 10.0 Ω Vishay CRCW201010R0FKEFHP"], [P150, "discharges VIN_MOD while tripped"], ["decisions.md:2145", "**R_VDIS on the VIN_MOD side.**"]],
  },
  { id: "tp_vin_mod", kind: "connector", pins: { "1": "VIN_MOD" }, symbol: "Connector:TestPoint", cites: [["decisions.md:1953", "**Added: VIN_MOD**"]] },
]

describe("modsw (B3)", () => {
  test("its parts, values, nets and MPNs, each against its cited line", () => {
    expectBlock(modswBlock(), MODSW)
  })
  test("its ports: VIN_MSW, VIN_MOD, PF_ON, PF_TRIP and GND", () => {
    expectPorts(modswBlock(), ["VIN_MSW", "VIN_MOD", "PF_ON", "PF_TRIP", "GND"])
  })
})
