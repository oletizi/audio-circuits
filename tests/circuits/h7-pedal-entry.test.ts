/**
 * The h7-pedal's power entry block, `entry` (h7 pedal pages plan, Task 6; inventory section 1.3 B1):
 * the DC jack, FB_IN with C_SCH and C_PROTHF, the two Schottkys, the hold-up reservoir on VIN_A,
 * R_VBLD, and the power test pads on VIN, VIN_A and GND. Each expectation is written from the cited
 * lines (`h7-pedal-expect.ts`).
 */
import { describe, test } from "bun:test"
import { entryBlock } from "../../circuits/h7-platform/pedal/entry.ts"
import { expectBlock, expectPorts, type PartExpectation } from "./h7-pedal-expect.ts"

const BULK = (id: string): PartExpectation => ({
  id, kind: "capacitor", value: 100e-6, pins: { a: "VIN_A", b: "GND" }, mpn: "EEE-FK1V101P", symbol: "Device:C_Polarized",
  cites: [["power.md:29", "C_BULK and C_BULK2 to C_BULK4 on VIN_A"], ["power.md:113", "EEE-FK1V101P 100 µF 35 V aluminium"]],
})

/** 600 ohm at 100 MHz (Murata JENF243A_0091C-01 p. 1), as an inductance at that frequency: |Z| / (2 pi f). */
const FB_IN_HENRIES = 600 / (2 * Math.PI * 100e6)

const ENTRY: readonly PartExpectation[] = [
  {
    id: "j_dc", kind: "connector", pins: { "1": "GND", "2": "VIN" }, symbol: "Connector:Barrel_Jack",
    cites: [["schematic-checklist.md:117", "centre pin GND, sleeve +V"], ["decisions.md:1898", "Connector:Barrel_Jack"]],
  },
  {
    id: "fb_in", kind: "inductor", value: FB_IN_HENRIES, pins: { a: "VIN", b: "VIN_FB" }, mpn: "BLM31KN601SN1L",
    symbol: "Device:FerriteBead",
    cites: [["parts.md:58", "BLM31KN601SN1L"], ["decisions.md:1909", "runs from **VIN**"]],
  },
  {
    id: "c_sch", kind: "capacitor", value: 100e-9, pins: { a: "VIN", b: "GND" }, mpn: "CL21B104KBCNNNC",
    cites: [["parts.md:82", "C_SCH and C_PROTHF"], ["decisions.md:1910", "is on VIN"]],
  },
  {
    id: "c_prothf", kind: "capacitor", value: 100e-9, pins: { a: "VIN_A", b: "GND" }, mpn: "CL21B104KBCNNNC",
    cites: [["parts.md:82", "C_SCH and C_PROTHF"], ["decisions.md:1911", "is on VIN_A beside C_PROT"]],
  },
  {
    id: "d_ain", kind: "diode", pins: { anode: "VIN_FB", cathode: "VIN_A" }, mpn: "PMEG4030ER,115",
    cites: [["power.md:26", "D_AIN to the analog branch"], ["power.md:27", "**VIN_A**, the analog branch after D_AIN"], ["parts.md:55", "PMEG4030ER,115"], ["decisions.md:1909", "which takes the anodes of D_AIN and D_MIN"]],
  },
  {
    id: "d_min", kind: "diode", pins: { anode: "VIN_FB", cathode: "VIN_MSW" }, mpn: "PMEG4030ER,115",
    cites: [["power.md:26", "D_MIN to the module branch"], ["power.md:147", "between D_MIN and VIN_MOD"], ["parts.md:55", "PMEG4030ER,115"]],
  },
  BULK("c_bulk"), BULK("c_bulk2"), BULK("c_bulk3"), BULK("c_bulk4"),
  {
    id: "c_prot", kind: "capacitor", value: 10e-6, pins: { a: "VIN_A", b: "GND" }, mpn: "CL31B106KBHNNNE",
    cites: [["power.md:114", "CL31B106KBHNNNE 10 µF 50 V X7R (C_PROT"], ["parts.md:57", "C_PROT"]],
  },
  {
    id: "r_vbld", kind: "resistor", value: 10e3, pins: { a: "VIN", b: "GND" }, mpn: "1206W4F1002T5E",
    cites: [["power.md:121", "R_VBLD 10.0 kΩ on VIN"], ["parts.md:73", "1206W4F1002T5E"]],
  },
  { id: "tp_vin", kind: "connector", pins: { "1": "VIN" }, symbol: "Connector:TestPoint", cites: [["decisions.md:1948", "→ VIN"]] },
  { id: "tp_vin_a", kind: "connector", pins: { "1": "VIN_A" }, symbol: "Connector:TestPoint", cites: [["decisions.md:1949", "→ VIN_A"]] },
  { id: "tp_gnd", kind: "connector", pins: { "1": "GND" }, symbol: "Connector:TestPoint", cites: [["decisions.md:1951", "one GND pad"]] },
]

describe("entry (B1)", () => {
  test("its parts, values, nets and MPNs, each against its cited line", () => {
    expectBlock(entryBlock(), ENTRY)
  })
  test("its ports: VIN, VIN_A, VIN_MSW and GND", () => {
    expectPorts(entryBlock(), ["VIN", "VIN_A", "VIN_MSW", "GND"])
  })
})
