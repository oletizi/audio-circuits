/**
 * The h7-pedal's codec domain supply, `codec_sup` (h7 pedal pages plan, Task 8; inventory section 1.3
 * B6): U_CVDD making 3V3_CODEC from 5V_A_CODEC with its two 1 uF capacitors, D_CVCL and R_CBLD;
 * U_XO and C_XO; U_CRST, C_CRST and R_CRST on CODEC_RST_N; Q_PFR from PF_TRIP. R_RST_PD is not
 * fitted and so not modelled (CR-PEDAL-POPULATION). Each expectation is written from the cited lines.
 */
import { describe, test } from "bun:test"
import { codecSupBlock } from "../../circuits/h7-platform/pedal/codec-sup.ts"
import { expectBlock, expectPorts, type PartExpectation } from "./h7-pedal-expect.ts"

const A387 = "analog.md:387"
const A63 = "analog.md:63"
const A407 = "analog.md:407"
const DEC = "decisions.md:2199"

const CODEC_SUP: readonly PartExpectation[] = [
  {
    // TPS7A2433 DBV (fixed): 1 IN, 2 GND, 3 EN, 4 NC, 5 OUT (pedal-pin-tables.ts, SBVS386E Table 5-1).
    id: "u_cvdd", kind: "ic", pins: { "1": "5V_A_CODEC", "2": "GND", "3": "5V_A_CODEC", "4": "NC", "5": "3V3_CODEC" },
    mpn: "TPS7A2433DBVR",
    cites: [
      [A387, "IN on 5V_A_CODEC, OUT on 3V3_CODEC"], ["parts.md:98", "TPS7A2433DBVR"],
      ["decisions.md:2196", "**U_CVDD's EN is tied to its IN, 5V_A_CODEC.**"], ["decisions.md:2197", "**U_CVDD's pin 4 (NC) is left open.**"],
    ],
  },
  {
    id: "c_cvddin", kind: "capacitor", value: 1e-6, pins: { a: "5V_A_CODEC", b: "GND" }, mpn: "CL10B105KO8NNNC",
    cites: [[A387, "with C_CVDDIN and C_CVDDOUT 1 µF 16 V X7R"], ["parts.md:99", "CL10B105KO8NNNC"], [DEC, "C_CVDDIN and C_CVDDOUT"]],
  },
  {
    id: "c_cvddout", kind: "capacitor", value: 1e-6, pins: { a: "3V3_CODEC", b: "GND" }, mpn: "CL10B105KO8NNNC",
    cites: [[A387, "with C_CVDDIN and C_CVDDOUT 1 µF 16 V X7R"], ["parts.md:99", "CL10B105KO8NNNC"], [DEC, "C_CVDDIN and C_CVDDOUT"]],
  },
  {
    id: "d_cvcl", kind: "diode", pins: { anode: "3V3_CODEC", cathode: "5V_A_CODEC" }, mpn: "PMEG4005AEA,115",
    cites: [["analog.md:401", "anode on 3V3_CODEC, cathode on 5V_A_CODEC"], ["parts.md:100", "PMEG4005AEA,115"]],
  },
  {
    id: "r_cbld", kind: "resistor", value: 3.6e3, pins: { a: "3V3_CODEC", b: "GND" }, mpn: "0603WAF3601T5E",
    cites: [["analog.md:401", "0603WAF3601T5E, C22980)** to GND"], ["parts.md:101", "3V3_CODEC bleeder, R_CBLD"]],
  },
  {
    // SG-210STF: 1 ST (bar), 2 GND, 3 OUT, 4 VCC (pedal-pin-tables.ts, Epson pin map).
    id: "u_xo", kind: "ic", pins: { "1": "3V3_CODEC", "2": "GND", "3": "XO_OUT", "4": "3V3_CODEC" }, mpn: "X1G0041710019",
    cites: [
      ["analog.md:374", "on 3V3_CODEC with **C_XO 100 nF**"], ["analog.md:374", "tied to 3V3_CODEC"],
      ["analog.md:383", "on XO_OUT**, which drives SCKI1 and SCKI2"], ["parts.md:97", "X1G0041710019"],
    ],
  },
  {
    id: "c_xo", kind: "capacitor", value: 100e-9, pins: { a: "3V3_CODEC", b: "GND" }, mpn: "GRM188R71H104KA93D",
    cites: [["analog.md:374", "**C_XO 100 nF**"], ["parts.md:104", "C_XO, C_CRST"], [DEC, "C_XO (line 374)"]],
  },
  {
    // TLV803EA29 DBZ: 1 GND, 2 RESET (bar, open drain), 3 VDD (pedal-pin-tables.ts, SLVSES2J Table 6-1).
    id: "u_crst", kind: "ic", pins: { "1": "GND", "2": "CODEC_RST_N", "3": "3V3_CODEC" }, mpn: "TLV803EA29DBZR",
    cites: [[A407, "has its VDD on 3V3_CODEC"], [A407, "on CODEC_RST_N (PCM3060 pin 15)"], ["parts.md:102", "TLV803EA29DBZR"]],
  },
  {
    id: "c_crst", kind: "capacitor", value: 100e-9, pins: { a: "3V3_CODEC", b: "GND" }, mpn: "GRM188R71H104KA93D",
    cites: [[A407, "**C_CRST 100 nF**"], ["parts.md:104", "GRM188R71H104KA93D"], [DEC, "C_CRST (line 407)"]],
  },
  {
    id: "r_crst", kind: "resistor", value: 4.7e3, pins: { a: "CODEC_RST_N", b: "3V3_CODEC" }, mpn: "0603WAF4701T5E",
    cites: [[A63, "R_CRST 4.70 kΩ ±1 % (Uniroyal 0603WAF4701T5E, C23162) from CODEC_RST_N to 3V3_CODEC"], ["parts.md:103", "0603WAF4701T5E"]],
  },
  {
    // AO3400A: 1 G, 2 S, 3 D (CR-PEDAL-SYMBOL-AO3400A).
    id: "q_pfr", kind: "ic", pins: { "1": "PF_TRIP", "2": "GND", "3": "CODEC_RST_N" }, mpn: "AO3400A",
    cites: [[A63, "Q_PFR, an AO3400A whose drain is on CODEC_RST_N and whose gate is PF_TRIP"], ["decisions.md:2198", "**Q_PFR's source is on GND.**"]],
  },
]

describe("codec_sup (B6)", () => {
  test("its parts, values, nets and MPNs, each against its cited line; R_RST_PD not modelled", () => {
    expectBlock(codecSupBlock(), CODEC_SUP)
  })
  test("its ports: 5V_A_CODEC, 3V3_CODEC, CODEC_RST_N, PF_TRIP, XO_OUT and GND", () => {
    expectPorts(codecSupBlock(), ["5V_A_CODEC", "3V3_CODEC", "CODEC_RST_N", "PF_TRIP", "XO_OUT", "GND"])
  })
})
