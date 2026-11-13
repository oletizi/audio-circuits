/**
 * The h7-pedal's power-fail block, `pf` (h7 pedal pages plan, Task 6; inventory section 1.3 B2):
 * U_PF at VIN with its sense divider, clamp, SENSE filter, CT capacitor and decoupling; PF_OK's
 * pull-up; U_PFINV making PF_TRIP (gate 1) and re-inverting it to PF_ON (gate 2), with its
 * decoupling and the two pull-downs. Each expectation is written from the cited lines.
 */
import { describe, test } from "bun:test"
import { pfBlock } from "../../circuits/h7-platform/pedal/pf.ts"
import { expectBlock, expectPorts, type PartExpectation } from "./h7-pedal-expect.ts"

const P121 = "power.md:121"

const PF: readonly PartExpectation[] = [
  {
    // TPS3808G01 DBV: 1 RESET, 2 GND, 3 MR, 4 CT, 5 SENSE, 6 VDD (pedal-pin-tables.ts, SBVS050N Table 5-1).
    id: "u_pf", kind: "ic", pins: { "1": "PF_OK", "2": "GND", "3": "5V_A", "4": "PF_CT", "5": "PF_SENSE", "6": "5V_A" },
    mpn: "TPS3808G01DBVR",
    cites: [[P121, "VDD and MR are on 5V_A"], ["power.md:142", "U_PF's RESET drives only PF_OK"], ["parts.md:59", "TPS3808G01DBVR"]],
  },
  {
    id: "r_pft1", kind: "resistor", value: 13.0e3, pins: { a: "VIN", b: "PF_CLAMP" }, mpn: "RT0603BRD0713KL",
    cites: [[P121, "R_PFT1 13.0 kΩ from VIN to a clamp node"], ["parts.md:67", "RT0603BRD0713KL"]],
  },
  {
    id: "r_pft2", kind: "resistor", value: 174e3, pins: { a: "PF_CLAMP", b: "PF_SENSE" }, mpn: "RT0603BRD07174KL",
    cites: [[P121, "R_PFT2 174 kΩ from the clamp node to SENSE"], ["parts.md:68", "RT0603BRD07174KL"]],
  },
  {
    id: "r_pfb", kind: "resistor", value: 10.0e3, pins: { a: "PF_SENSE", b: "GND" }, mpn: "RT0603BRD0710KL",
    cites: [[P121, "R_PFB 10.0 kΩ to GND"], ["parts.md:69", "RT0603BRD0710KL"]],
  },
  {
    id: "d_pfcl", kind: "diode", pins: { anode: "GND", cathode: "PF_CLAMP" }, mpn: "BAS116H,115",
    cites: [[P121, "D_PFCL (BAS116H) from GND to the clamp node"], ["parts.md:64", "BAS116H,115"]],
  },
  {
    id: "c_pfs", kind: "capacitor", value: 1e-9, pins: { a: "PF_SENSE", b: "GND" }, mpn: "CL10C102JB8NNNC",
    cites: [[P121, "C_PFS 1 nF at SENSE"], ["parts.md:70", "CL10C102JB8NNNC"], ["decisions.md:2164", "bypass capacitor on the SENSE input"]],
  },
  {
    id: "c_pf", kind: "capacitor", value: 100e-9, pins: { a: "5V_A", b: "GND" }, mpn: "CL10B104KB8NNNC",
    cites: [["parts.md:71", "U_PF VDD decoupling, C_PF (100 nF"]],
  },
  {
    id: "c_pfct", kind: "capacitor", value: 47e-9, pins: { a: "PF_CT", b: "GND" }, mpn: "C1206N473J050T",
    cites: [["power.md:149", "C_PFCT 47 nF C0G on U_PF's CT"], ["parts.md:72", "C1206N473J050T"], ["decisions.md:2163", "connecting a capacitor between CT and GND"]],
  },
  {
    id: "r_pfpu", kind: "resistor", value: 100e3, pins: { a: "PF_OK", b: "5V_A" }, mpn: "0603WAF1003T5E",
    cites: [["bypass-relay.md:184", "with R_PFPU 100 kΩ to 5V_A"], ["parts.md:74", "R_PFPU"]],
  },
  {
    // SN74LVC2G14 DBV: 1 1A, 2 GND, 3 2A, 4 2Y, 5 VCC, 6 1Y. Channel A (gate 1) makes PF_TRIP; B re-inverts it to PF_ON.
    id: "u_pfinv", kind: "ic", pins: { "1": "PF_OK", "2": "GND", "3": "PF_TRIP", "4": "PF_ON", "5": "5V_A", "6": "PF_TRIP" },
    mpn: "SN74LVC2G14DBVR",
    cites: [["bypass-relay.md:185", "channel A makes **PF_TRIP**"], ["bypass-relay.md:185", "channel B re-inverts PF_TRIP into **PF_ON**"], ["parts.md:60", "SN74LVC2G14DBVR"], ["decisions.md:2151", "U_PFINV's channel A is gate 1 and channel B gate 2"]],
  },
  {
    id: "c_pfinv", kind: "capacitor", value: 100e-9, pins: { a: "5V_A", b: "GND" }, mpn: "GRM188R71H104KA93D",
    cites: [["bypass-relay.md:185", "an SN74LVC2G14 dual Schmitt inverter on 5V_A with 100 nF"], ["parts.md:104", "C_PFINV"]],
  },
  {
    id: "r_pftpd", kind: "resistor", value: 100e3, pins: { a: "PF_TRIP", b: "GND" }, mpn: "0603WAF1003T5E",
    cites: [["bypass-relay.md:186", "hold PF_TRIP and PF_ON low"], ["parts.md:74", "PF_TRIP and PF_ON pull-downs"]],
  },
  {
    id: "r_pfonpd", kind: "resistor", value: 100e3, pins: { a: "PF_ON", b: "GND" }, mpn: "0603WAF1003T5E",
    cites: [["bypass-relay.md:186", "hold PF_TRIP and PF_ON low"], ["parts.md:74", "PF_TRIP and PF_ON pull-downs"]],
  },
]

describe("pf (B2)", () => {
  test("its parts, values, nets and MPNs, each against its cited line", () => {
    expectBlock(pfBlock(), PF)
  })
  test("its ports: VIN, 5V_A, PF_TRIP, PF_ON and GND", () => {
    expectPorts(pfBlock(), ["VIN", "5V_A", "PF_TRIP", "PF_ON", "GND"])
  })
})
