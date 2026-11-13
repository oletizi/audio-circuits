/**
 * The h7-pedal's expression input and VREF_A reference loads, `expr_ref` (h7 pedal pages plan, Task
 * 8; inventory section 1.3 B13): the TRS jack with its two ESD diodes; the ring reference through the
 * back-feed blocking network (U_REFBLK, Q_REFEN, R_ENG, R_CE, D_RCLAMP) and R_REF, with 100 nF at the
 * ring; the tip chain into U_EXP and on to EXPR_TIP; the plug detect; and the HW_REV strap. Each
 * expectation is written from the cited lines; the HW_REV divider is checked against Task 3's constant.
 */
import { describe, expect, test } from "bun:test"
import type { Component } from "../../lib/model/index.ts"
import { exprRefBlock } from "../../circuits/h7-platform/pedal/expr-ref.ts"
import { HW_REV_STRAP } from "../../circuits/h7-platform/pedal-rulings.ts"
import { expectBlock, expectPorts, type PartExpectation } from "./h7-pedal-expect.ts"

const DIAGRAM = (line: number) => `analog.md:${line}`
const A314 = "analog.md:314"
const A335 = "analog.md:335"
const A340 = "analog.md:340"
const C196 = "schematic-checklist.md:196"
const C201 = "schematic-checklist.md:201"
const JACK = "decisions.md:2204"
const PESD = "decisions.md:2206"
const FOLLOW = "decisions.md:2207"

const EXPR_REF: readonly PartExpectation[] = [
  {
    // Connector_Audio:NMJ6HCD2, pins numbered T, R, S, TN, RN, SN on disk.
    id: "j_exp", kind: "switch", mpn: "NMJ6HCD2",
    pins: { T: "EXP_TIP_J", R: "EXP_RING", S: "GND", RN: "EXP_RN", TN: "NC", SN: "NC" },
    cites: [
      ["schematic-checklist.md:197", "TRS with a ring-normal contact, convention ring = reference, tip = wiper, sleeve = GND"],
      [A340, "the jack has a ring-normal contact"], [JACK, "TN and SN are not connected"], ["parts.md:133", "NMJ6HCD2"],
    ],
  },
  {
    id: "d_esd_tip", kind: "ic", mpn: "PESD12VL1BA,115", pins: { "1": "EXP_TIP_J", "2": "GND" },
    cites: [[C201, "on the tip on the jack side of R_TIP"], [PESD, "pin 1 on the protected line and pin 2 on GND"], ["parts.md:107", "PESD12VL1BA,115"]],
  },
  {
    id: "d_esd_ring", kind: "ic", mpn: "PESD12VL1BA,115", pins: { "1": "EXP_RING", "2": "GND" },
    cites: [[C201, "on the ring on the jack side of the ring reference"], [PESD, "pin 1 on the protected line and pin 2 on GND"], ["parts.md:107", "PESD12VL1BA,115"]],
  },
  {
    // LM66100 DCK: 1 VIN, 2 GND, 3 CE (bar), 4 N/C, 5 ST, 6 VOUT (pedal-pin-tables.ts, SLVSEZ8A).
    id: "u_refblk", kind: "ic", mpn: "LM66100DCKR",
    pins: { "1": "VREF_A", "2": "GND", "3": "REF_CE", "4": "GND", "5": "GND", "6": "REF_OUT" },
    cites: [[DIAGRAM(307), "U_REFBLK LM66100 VIN"], [DIAGRAM(308), "CE"], [A314, "ST and N/C to GND"], ["parts.md:109", "LM66100DCKR"]],
  },
  {
    // 2N7002: 1 G, 2 S, 3 D.
    id: "q_refen", kind: "ic", mpn: "2N7002,215", pins: { "1": "REF_ENG", "2": "GND", "3": "REF_CE" },
    cites: [[DIAGRAM(309), "Q_REFEN 2N7002 D"], [DIAGRAM(309), "(S to GND)"], [DIAGRAM(310), "Q_REFEN gate"], ["parts.md:110", "2N7002,215"]],
  },
  { id: "r_eng", kind: "resistor", value: 100e3, pins: { a: "VREF_A", b: "REF_ENG" }, cites: [[DIAGRAM(310), "R_ENG 100 kΩ"], ["parts.md:111", "R_ENG and R_CE (100 kΩ)"]] },
  { id: "r_ce", kind: "resistor", value: 100e3, pins: { a: "REF_OUT", b: "REF_CE" }, cites: [[DIAGRAM(308), "R_CE 100 kΩ"], ["analog.md:320", "which drops 0.74 V across R_CE"]] },
  {
    id: "d_rclamp", kind: "diode", mpn: "PMEG4005AEA,115", pins: { anode: "GND", cathode: "REF_OUT" },
    cites: [[DIAGRAM(310), "D_RCLAMP PMEG4005AEA cathode (anode GND)"], ["parts.md:113", "PMEG4005AEA,115"]],
  },
  {
    id: "r_ref", kind: "resistor", value: 3.3e3, mpn: "1206W4F3301T5E", pins: { a: "REF_OUT", b: "EXP_RING" },
    cites: [[DIAGRAM(307), "R_REF 3.30 kΩ"], ["parts.md:114", "1206W4F3301T5E"]],
  },
  { id: "c_ring", kind: "capacitor", value: 100e-9, pins: { a: "EXP_RING", b: "GND" }, cites: [["analog.md:331", "**100 nF X7R** at the ring to GND"]] },
  { id: "r_tip", kind: "resistor", value: 22e3, pins: { a: "EXP_TIP_J", b: "EXP_TIP_RC" }, cites: [[DIAGRAM(311), "R_TIP 22 kΩ"], [C196, "R_TIP 22.0 kΩ in series"]] },
  { id: "c_tip", kind: "capacitor", value: 1e-9, pins: { a: "EXP_TIP_RC", b: "GND" }, cites: [[C196, "1 nF C0G and 10 MΩ to GND"]] },
  { id: "r_tip_pd", kind: "resistor", value: 10e6, pins: { a: "EXP_TIP_RC", b: "GND" }, cites: [[C196, "1 nF C0G and 10 MΩ to GND"]] },
  { id: "r_expin", kind: "resistor", value: 2.2e6, pins: { a: "EXP_TIP_RC", b: "EXP_IN" }, cites: [[DIAGRAM(311), "R_EXPIN 2.2 MΩ"], ["parts.md:112", "R_EXPIN (2.2 MΩ)"]] },
  {
    // MCP6001 SOT-23-5: 1 VOUT, 2 VSS, 3 VIN+, 4 VIN-, 5 VDD (schematic-checklist.md:196).
    id: "u_exp", kind: "opamp", mpn: "MCP6001T-I/OT",
    pins: { "v+": "VREF_A", "v-": "GND", "in+": "EXP_IN", "in-": "EXP_BUF", out: "EXP_BUF" },
    cites: [[DIAGRAM(311), "U_EXP IN+ (U_EXP VDD on VREF_A)"], [A335, "an MCP6001 follower supplied from VREF_A"], [FOLLOW, "**U_EXP is a unity follower**"], ["parts.md:106", "MCP6001T-I/OT"]],
  },
  { id: "c_exp", kind: "capacitor", value: 100e-9, pins: { a: "VREF_A", b: "GND" }, cites: [[C196, "with 100 nF at its VDD pin"], ["decisions.md:2199", "U_EXP's 100 nF at VDD"]] },
  { id: "r_exp_out", kind: "resistor", value: 1e3, pins: { a: "EXP_BUF", b: "EXPR_TIP" }, cites: [["analog.md:339", "1.00 kΩ and 100 nF X7R to EXPR_TIP (pin 28)"], [FOLLOW, "the 1.00 kΩ from the output to EXPR_TIP"]] },
  { id: "c_exp_out", kind: "capacitor", value: 100e-9, pins: { a: "EXPR_TIP", b: "GND" }, cites: [["analog.md:339", "1.00 kΩ and 100 nF X7R to EXPR_TIP (pin 28)"], [FOLLOW, "the 100 nF from EXPR_TIP to GND"]] },
  { id: "r_det", kind: "resistor", value: 1e3, pins: { a: "EXP_RN", b: "EXPR_DETECT" }, cites: [[A340, "ring-normal → **1 kΩ** → EXPR_DETECT (pin 30)"]] },
  { id: "r_det_pd", kind: "resistor", value: 100e3, pins: { a: "EXPR_DETECT", b: "GND" }, cites: [[A340, "with **100 kΩ** to GND"], ["decisions.md:2205", "goes from the pin to GND, after the 1 kΩ"]] },
  {
    id: "r_hwrev_top", kind: "resistor", value: 20e3, pins: { a: "VREF_A", b: "HW_REV" },
    cites: [["analog.md:347", "runs from **VREF_A** to GND"], ["analog.md:351", "| 1 | 20.0 kΩ | 2.49 kΩ |"], ["decisions.md:1966", "revisions 1 to 8"]],
  },
  {
    id: "r_hwrev_bottom", kind: "resistor", value: 2.49e3, pins: { a: "HW_REV", b: "GND" },
    cites: [["analog.md:347", "runs from **VREF_A** to GND"], ["analog.md:351", "| 1 | 20.0 kΩ | 2.49 kΩ |"]],
  },
  { id: "c_hwrev", kind: "capacitor", value: 100e-9, pins: { a: "HW_REV", b: "GND" }, cites: [["analog.md:347", "with **100 nF** at the pin (contract pin 29, PA5)"]] },
]

function value(c: Component | undefined): number | undefined {
  if (c === undefined) return undefined
  const p = c.parameters
  if ("ohms" in p) return p.ohms
  if ("farads" in p) return p.farads
  return undefined
}

describe("expr_ref (B13)", () => {
  test("its parts, values and nets, each against its cited line", () => {
    expectBlock(exprRefBlock(), EXPR_REF)
  })
  test("its ports: VREF_A, EXPR_TIP, HW_REV, EXPR_DETECT and GND", () => {
    expectPorts(exprRefBlock(), ["VREF_A", "EXPR_TIP", "HW_REV", "EXPR_DETECT", "GND"])
  })
  test("the HW_REV divider is CR-PEDAL-HW-REV's revision 1 (HW_REV_STRAP)", () => {
    const n = exprRefBlock()
    const part = (id: string) => n.components.find((c) => c.id === id)
    expect(value(part("r_hwrev_top"))).toBe(HW_REV_STRAP.topOhm)
    expect(value(part("r_hwrev_bottom"))).toBe(HW_REV_STRAP.bottomOhm)
    expect(value(part("c_hwrev"))).toBe(HW_REV_STRAP.pinCapF)
    expect(part("r_hwrev_top")?.units[0]?.pins.a).toEqual({ kind: "net", net: HW_REV_STRAP.top })
    expect(part("r_hwrev_top")?.units[0]?.pins.b).toEqual({ kind: "net", net: HW_REV_STRAP.pin })
  })
  test("the jack's ring-normal touches the ring with no plug, and nothing with a plug in (analog.md:340)", () => {
    const jack = exprRefBlock().components.find((c) => c.id === "j_exp")
    expect(jack?.parameters).toEqual({ positions: ["no plug", "plug in"], contacts: { "no plug": [["R", "RN"]], "plug in": [] } })
  })
})
