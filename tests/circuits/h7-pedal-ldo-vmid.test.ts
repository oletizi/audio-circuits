/**
 * The h7-pedal's analog supply block, `ldo_vmid` (h7 pedal pages plan, Task 6; inventory section 1.3
 * B5): U_LDO making 5V_A from VIN_A with its feedback, CIN, COUT, CNR/SS and CFF; R_5VA to the codec's
 * VCC net; the VMID divider and its node capacitor; U_VMID, a whole OPA1688 dual, A -> VMID_L and
 * B -> VMID_R, each a unity follower fed through 10.0 kOhm, with its V+ decoupling; the 5V_A test pad.
 * Each expectation is written from the cited lines.
 */
import { describe, expect, test } from "bun:test"
import { ldoVmidBlock } from "../../circuits/h7-platform/pedal/ldo-vmid.ts"
import { expectBlock, expectPorts, type PartExpectation } from "./h7-pedal-expect.ts"

const P474 = "power.md:474"
const C129 = "schematic-checklist.md:129"

const LDO_VMID: readonly PartExpectation[] = [
  {
    // TPS7A4901 DGN: 1 OUT, 2 FB, 3 NC, 4 GND, 5 EN, 6 NR/SS, 7 DNC, 8 IN, 9 PowerPAD (pedal-pin-tables.ts).
    id: "u_ldo", kind: "ic",
    pins: { "1": "5V_A", "2": "LDO_FB", "3": "NC", "4": "GND", "5": "VIN_A", "6": "LDO_NR", "7": "NC", "8": "VIN_A", "9": "GND" },
    mpn: "TPS7A4901DGNR",
    cites: [
      [C129, "IN (8); EN (5) tied to IN; OUT (1) = 5V_A"], [C129, "**pin 7 (DNC) connected to nothing, not even GND**"],
      [C129, "NC (3) open or GND"], [C129, "GND (4) tied to the PowerPAD"], ["parts.md:86", "TPS7A4901DGNR"],
    ],
  },
  { id: "r_ldot", kind: "resistor", value: 32.4e3, pins: { a: "5V_A", b: "LDO_FB" }, cites: [[P474, "Feedback 32.4 kΩ over 10.0 kΩ"], [C129, "R_LDOT"]] },
  { id: "r_ldob", kind: "resistor", value: 10.0e3, pins: { a: "LDO_FB", b: "GND" }, cites: [[P474, "Feedback 32.4 kΩ over 10.0 kΩ"], [C129, "R_LDOB 10.0 kΩ"]] },
  {
    id: "c_lin", kind: "capacitor", value: 10e-6, pins: { a: "VIN_A", b: "GND" }, mpn: "CL31B106KBHNNNE",
    cites: [[P474, "CIN 10 µF 50 V"], ["parts.md:57", "C_LIN"]],
  },
  {
    id: "c_lout", kind: "capacitor", value: 10e-6, pins: { a: "5V_A", b: "GND" }, mpn: "CL31B106KOHNNNE",
    cites: [[P474, "COUT 10 µF"], ["parts.md:83", "C_LOUT (10 µF 16 V X7R 1206)"]],
  },
  {
    id: "c_nr", kind: "capacitor", value: 10e-9, pins: { a: "LDO_NR", b: "GND" }, mpn: "CL21B103KBANNNC",
    cites: [[P474, "CNR/SS 10 nF"], ["parts.md:84", "C_NR and C_FF (10 nF 50 V)"]],
  },
  {
    id: "c_ff", kind: "capacitor", value: 10e-9, pins: { a: "5V_A", b: "LDO_FB" }, mpn: "CL21B103KBANNNC",
    cites: [[P474, "CFF 10 nF"], ["parts.md:84", "C_NR and C_FF (10 nF 50 V)"]],
  },
  {
    id: "r_5va", kind: "resistor", value: 0, pins: { a: "5V_A", b: "5V_A_CODEC" },
    cites: [["power.md:489", "R_5VA, fitted in series between the LDO output and the codec VCC decoupling"], ["power.md:489", "`5V_A_CODEC` joined to 5V_A"], ["schematic-checklist.md:138", "An 0805 0 Ω, fitted"]],
  },
  {
    id: "r_vmid_top", kind: "resistor", value: 100e3, pins: { a: "VIN_A", b: "VMID" },
    cites: [["schematic-checklist.md:130", "2 × 100 kΩ 0.1 % 25 ppm/°C from VIN_A to GND"], ["power.md:488", "VMID = VIN_A / 2"]],
  },
  {
    id: "r_vmid_bottom", kind: "resistor", value: 100e3, pins: { a: "VMID", b: "GND" },
    cites: [["schematic-checklist.md:130", "2 × 100 kΩ 0.1 % 25 ppm/°C from VIN_A to GND"], ["power.md:488", "VMID = VIN_A / 2"]],
  },
  {
    id: "c_vmid", kind: "capacitor", value: 10e-6, pins: { a: "VMID", b: "GND" }, mpn: "CL31B106KBHNNNE",
    cites: [["analog.md:148", "with 10 µF 50 V X7R (CL31B106KBHNNNE) at the node"]],
  },
  {
    id: "r_vmid_in_l", kind: "resistor", value: 10.0e3, pins: { a: "VMID", b: "VMID_IN_L" },
    cites: [["schematic-checklist.md:131", "each input fed from the divider through 10.0 kΩ 1 %"]],
  },
  {
    id: "r_vmid_in_r", kind: "resistor", value: 10.0e3, pins: { a: "VMID", b: "VMID_IN_R" },
    cites: [["schematic-checklist.md:131", "each input fed from the divider through 10.0 kΩ 1 %"]],
  },
  {
    id: "u_vmid", kind: "opamp", mpn: "OPA1688IDR",
    pins: {
      "v+": "VIN_A", "v-": "GND",
      "A/in+": "VMID_IN_L", "A/in-": "VMID_L", "A/out": "VMID_L",
      "B/in+": "VMID_IN_R", "B/in-": "VMID_R", "B/out": "VMID_R",
    },
    cites: [
      ["schematic-checklist.md:131", "channel A to VMID_L and B to VMID_R, each a plain unity-gain follower"],
      ["power.md:33", "U_LDO (TPS7A49), 5V_A, U_VMID, op-amps | On VIN_A"], ["schematic-checklist.md:132", "V− (4) on GND"],
      ["parts.md:105", "OPA1688IDR"],
    ],
  },
  {
    id: "c_vmid_hf", kind: "capacitor", value: 100e-9, pins: { a: "VIN_A", b: "GND" },
    cites: [["schematic-checklist.md:132", "V+ pin (8) with 100 nF + 10 µF 50 V to GND"]],
  },
  {
    id: "c_vmid_bulk", kind: "capacitor", value: 10e-6, pins: { a: "VIN_A", b: "GND" }, mpn: "CL31B106KBHNNNE",
    cites: [["schematic-checklist.md:132", "V+ pin (8) with 100 nF + 10 µF 50 V to GND"], ["parts.md:57", "the op-amp decoupling"]],
  },
  { id: "tp_5v_a", kind: "connector", pins: { "1": "5V_A" }, symbol: "Connector:TestPoint", cites: [["decisions.md:1950", "**5V_A** → 5V_A"]] },
]

describe("ldo_vmid (B5)", () => {
  test("its parts, values, nets and MPNs, each against its cited line", () => {
    expectBlock(ldoVmidBlock(), LDO_VMID)
  })
  test("its ports: VIN_A, 5V_A, 5V_A_CODEC, VMID_L, VMID_R and GND", () => {
    expectPorts(ldoVmidBlock(), ["VIN_A", "5V_A", "5V_A_CODEC", "VMID_L", "VMID_R", "GND"])
  })
  test("U_VMID is one whole dual: unit A drives VMID_L and unit B VMID_R (schematic-checklist.md:131), numbered by its own symbolPins", () => {
    const u = ldoVmidBlock().components.find((c) => c.id === "u_vmid")
    expect(u?.units.map((x) => [x.name, x.pins.out])).toEqual([
      ["A", { kind: "net", net: "VMID_L" }],
      ["B", { kind: "net", net: "VMID_R" }],
    ])
    expect(u?.part?.symbolPins?.A?.out).toBe("1")
    expect(u?.part?.symbolPins?.B?.out).toBe("7")
  })
})
