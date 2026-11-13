/**
 * The h7-pedal's digital rail block, `prail` (h7 pedal pages plan, Task 6; inventory section 1.3 B4):
 * U_PRAIL, "a TPS62933F with the module buck's network copied" (power.md:437), on VIN_MOD, with its
 * own input capacitors (2 x 10 uF + 100 nF), and its EN network from PF_ON with Q_PEN's reset.
 *
 * "Copied" covers the buck's own network as the module's power.md section 5.2 states it: RT floating,
 * the inductor, 3 x 22 uF + 100 nF out, the 32.4 k / 10.0 k feedback, C_SS 33 nF, C_BST 100 nF with
 * its 0 ohm R_BST. The module's input filter (L_FILT, C_BIN, the damping leg) is the module's own
 * input network (power.md:30), not the buck's, and U_PRAIL's input is stated separately (power.md:272).
 * Each expectation is written from the cited lines.
 */
import { describe, test } from "bun:test"
import { prailBlock } from "../../circuits/h7-platform/pedal/prail.ts"
import { expectBlock, expectPorts, type PartExpectation } from "./h7-pedal-expect.ts"

const COPIED: readonly [string, string] = ["power.md:437", "with the module buck's network copied"]
const P85 = "power.md:85"
const OUT = (id: string): PartExpectation => ({
  id, kind: "capacitor", value: 22e-6, pins: { a: "3V3_P", b: "GND" }, mpn: "CL31A226KAHNNNE",
  cites: [COPIED, ["power.md:377", "3 × 22 µF X5R 25 V 1206 (CL31A226KAHNNNE)"], ["parts.md:89", "U_PRAIL's output capacitors"]],
})
const IN10 = (id: string): PartExpectation => ({
  id, kind: "capacitor", value: 10e-6, pins: { a: "VIN_MOD", b: "GND" }, mpn: "CL31B106KBHNNNE",
  cites: [["power.md:272", "U_PRAIL's 2 × 10 µF + 100 nF"], ["parts.md:57", "U_PRAIL's input capacitors (10 µF 50 V X7R 1206)"]],
})
const PEN = (id: string): PartExpectation => ({
  id, kind: "capacitor", value: 4.7e-6, pins: { a: "PRAIL_EN", b: "GND" }, mpn: "CL31B475KBHNNNE",
  cites: [[P85, "into C_PEN, two 4.7 µF 50 V X7R in parallel"], [P85, "Q_PEN holds C_PEN at ≤ 0.5 mV"], ["parts.md:79", "CL31B475KBHNNNE"]],
})

const PRAIL: readonly PartExpectation[] = [
  {
    // TPS62933F: 1 RT, 2 EN, 3 VIN, 4 GND, 5 SW, 6 BST, 7 SS, 8 FB (PWR-06, the module buck's pin-level).
    id: "u_prail", kind: "ic",
    pins: { "1": "NC", "2": "PRAIL_EN", "3": "VIN_MOD", "4": "GND", "5": "PRAIL_SW", "6": "PRAIL_BST", "7": "PRAIL_SS", "8": "PRAIL_FB" },
    mpn: "TPS62933FDRLR",
    cites: [COPIED, ["power.md:437", "on VIN_MOD, RT floating"], ["schematic-checklist.md:124", "RT (pin 1) carries a no-connect flag"], ["parts.md:87", "TPS62933FDRLR"]],
  },
  IN10("c_pin1"), IN10("c_pin2"),
  {
    id: "c_pinhf", kind: "capacitor", value: 100e-9, pins: { a: "VIN_MOD", b: "GND" }, mpn: "CL21B104KBCNNNC",
    cites: [["power.md:272", "U_PRAIL's 2 × 10 µF + 100 nF"], ["parts.md:82", "U_PRAIL's input"]],
  },
  {
    id: "l_prail", kind: "inductor", value: 4.7e-6, pins: { a: "PRAIL_SW", b: "3V3_P" }, mpn: "74439346047",
    cites: [COPIED, ["power.md:376", "Würth 74439346047 (WE-XHMI 4.7 µH)"], ["parts.md:88", "74439346047"]],
  },
  OUT("c_pout1"), OUT("c_pout2"), OUT("c_pout3"),
  { id: "c_pout_hf", kind: "capacitor", value: 100e-9, pins: { a: "3V3_P", b: "GND" }, cites: [COPIED, ["power.md:377", "plus 100 nF"]] },
  {
    id: "r_fb_top", kind: "resistor", value: 32.4e3, pins: { a: "3V3_P", b: "PRAIL_FB" },
    cites: [COPIED, ["power.md:378", "32.4 kΩ over 10.0 kΩ"]],
  },
  {
    id: "r_fb_bottom", kind: "resistor", value: 10.0e3, pins: { a: "PRAIL_FB", b: "GND" },
    cites: [COPIED, ["power.md:378", "32.4 kΩ over 10.0 kΩ"]],
  },
  {
    id: "c_ss", kind: "capacitor", value: 33e-9, pins: { a: "PRAIL_SS", b: "GND" }, mpn: "CL10B333KB8NNNC",
    cites: [COPIED, ["power.md:379", "C_SS 33 nF"], ["parts.md:90", "U_PRAIL's soft-start capacitor (33 nF)"], ["circuits/h7-platform/module/power.ts:19", "C_SS 33 nF to GND"]],
  },
  {
    id: "r_bst", kind: "resistor", value: 0, pins: { a: "PRAIL_BST", b: "PRAIL_BST_CAP" },
    cites: [COPIED, ["power.md:380", "with a 0 Ω R_BST footprint"], ["circuits/h7-platform/module/power.ts:17", "BST -> R_BST -> C_BST -> SW"]],
  },
  {
    id: "c_bst", kind: "capacitor", value: 100e-9, pins: { a: "PRAIL_BST_CAP", b: "PRAIL_SW" },
    cites: [COPIED, ["power.md:380", "C_BST 100 nF"], ["circuits/h7-platform/module/power.ts:17", "BST -> R_BST -> C_BST -> SW"]],
  },
  {
    id: "r_pen", kind: "resistor", value: 150e3, pins: { a: "PF_ON", b: "PRAIL_EN" }, mpn: "0603WAF1503T5E",
    cites: [[P85, "U_PRAIL's EN follows PF_ON through R_PEN 150 kΩ"], ["parts.md:78", "0603WAF1503T5E"]],
  },
  {
    id: "r_penpd", kind: "resistor", value: 1.0e6, pins: { a: "PRAIL_EN", b: "GND" }, mpn: "0603WAF1004T5E",
    cites: [[P85, "against R_PENPD 1.00 MΩ to GND"], ["parts.md:81", "0603WAF1004T5E"]],
  },
  PEN("c_pen1"), PEN("c_pen2"),
  {
    id: "q_pen", kind: "ic", pins: { "1": "PF_TRIP", "2": "GND", "3": "PEN_D" }, mpn: "2N7002,215",
    cites: [[P85, "has its gate on PF_TRIP and its source on GND"], ["parts.md:85", "2N7002,215"]],
  },
  {
    id: "r_pens", kind: "resistor", value: 180, pins: { a: "PEN_D", b: "PRAIL_EN" }, mpn: "0603WAF1800T5E",
    cites: [[P85, "its drain reaches EN through R_PENS 180 Ω"], ["parts.md:80", "0603WAF1800T5E"]],
  },
]

describe("prail (B4)", () => {
  test("its parts, values, nets and MPNs, each against its cited line", () => {
    expectBlock(prailBlock(), PRAIL)
  })
  test("its ports: VIN_MOD, 3V3_P, PF_ON, PF_TRIP and GND", () => {
    expectPorts(prailBlock(), ["VIN_MOD", "3V3_P", "PF_ON", "PF_TRIP", "GND"])
  })
})
