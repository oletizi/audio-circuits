/**
 * The h7-pedal's input front ends, `in_fe` (h7 pedal pages plan, Task 10; inventory section 1.3 B9):
 * per channel R_RF, C_RF, R_PD, C_IN, the compensated divider R_DIV1 / C_COMP / R_DIV2 / C_T, and
 * the input test pad with its GND pad; U_IN, one whole OPA1688 dual, A = L and B = R, each a unity
 * follower at node T, with its V+ decoupling. Each expectation is written from the cited lines.
 */
import { describe, expect, test } from "bun:test"
import { inFeBlock } from "../../circuits/h7-platform/pedal/in-fe.ts"
import { provenanceProblems } from "./h7-pedal-provenance.ts"
import { expectBlock, expectPorts, type Cite, type PartExpectation } from "./h7-pedal-expect.ts"

const PADS = "decisions.md:1954"

function channel(x: "L" | "R"): PartExpectation[] {
  const lc = x.toLowerCase()
  const rf = `IN_RF_${x}`
  const ac = `IN_AC_${x}`
  const t = `IN_T_${x}`
  const div: Cite = ["schematic-checklist.md:155", "R_DIV1 1.50 MΩ 0.1 % from C_IN to node T, with C_COMP 110 pF C0G ±2 % across it"]
  return [
    {
      id: `r_rf_${lc}`, kind: "resistor", value: 1.0e3, pins: { a: `FX_IN_${x}`, b: rf },
      cites: [["schematic-checklist.md:152", "R_RF 1.0 kΩ in series from FX_IN_x"], ["analog.md:167", "**R_RF 1.0 kΩ** in series from the tip"]],
    },
    {
      id: `c_rf_${lc}`, kind: "capacitor", value: 100e-12, pins: { a: rf, b: "GND" },
      cites: [["schematic-checklist.md:152", "C_RF 100 pF C0G 50 V to GND"]],
    },
    {
      id: `r_pd_${lc}`, kind: "resistor", value: 22e6, pins: { a: rf, b: "GND" },
      cites: [
        ["schematic-checklist.md:153", "R_PD 22 MΩ to GND on the jack side of C_IN"], ["analog.md:126", "R_PD 22M ──┘"],
        ["bypass-relay.md:122", "held at 0 V DC by R_PD 22 MΩ and C_RF 100 pF"],
      ],
    },
    {
      id: `c_in_${lc}`, kind: "capacitor", value: 47e-9, pins: { a: rf, b: ac },
      cites: [["schematic-checklist.md:154", "C_IN 47 nF C0G 50 V 1206"], ["analog.md:124", "R_RF 1k ─┬─ C_IN 47n ─ R1 1.50M"]],
    },
    { id: `r_div1_${lc}`, kind: "resistor", value: 1.5e6, pins: { a: ac, b: t }, cites: [div] },
    { id: `c_comp_${lc}`, kind: "capacitor", value: 110e-12, pins: { a: ac, b: t }, cites: [div] },
    {
      id: `r_div2_${lc}`, kind: "resistor", value: 1.0e6, pins: { a: t, b: `VMID_${x}` },
      cites: [["schematic-checklist.md:156", "R_DIV2 1.00 MΩ 0.1 % from node T to **this channel's** VMID_x"]],
    },
    {
      id: `c_t_${lc}`, kind: "capacitor", value: 160e-12, pins: { a: t, b: "GND" },
      cites: [["schematic-checklist.md:156", "C_T 160 pF C0G ±2 % from T to GND"]],
    },
    {
      id: `tp_in_${lc}`, kind: "connector", pins: { "1": rf }, symbol: "Connector:TestPoint",
      cites: [[PADS, "an input pad on each channel's R_RF/C_RF node"], ["schematic-checklist.md:152", "an input test pad on the R_RF/C_RF node"]],
    },
    {
      id: `tp_in_${lc}_gnd`, kind: "connector", pins: { "1": "GND" }, symbol: "Connector:TestPoint",
      cites: [[PADS, "each with a GND pad beside it"], ["schematic-checklist.md:152", "with a GND pad beside it"]],
    },
  ]
}

const DECOUPLE: Cite = ["schematic-checklist.md:132", "V+ pin (8) with 100 nF + 10 µF 50 V to GND"]

const IN_FE: readonly PartExpectation[] = [
  ...channel("L"),
  ...channel("R"),
  {
    id: "u_in", kind: "opamp", mpn: "OPA1688IDR",
    pins: {
      "v+": "VIN_A", "v-": "GND",
      "A/in+": "IN_T_L", "A/in-": "IN_FOLLOW_L", "A/out": "IN_FOLLOW_L",
      "B/in+": "IN_T_R", "B/in-": "IN_FOLLOW_R", "B/out": "IN_FOLLOW_R",
    },
    cites: [
      ["schematic-checklist.md:157", "U_IN, an OPA1688 unity follower on VIN_A (the analog branch rail), input at node T"],
      ["schematic-checklist.md:149", "channel A = L and B = R"], ["schematic-checklist.md:132", "V− (4) on GND"],
      ["decisions.md:2128","each channel's U_IN follower output, into C_AC's + terminal"], ["parts.md:105", "OPA1688IDR"],
    ],
  },
  { id: "c_uin_hf", kind: "capacitor", value: 100e-9, pins: { a: "VIN_A", b: "GND" }, cites: [DECOUPLE] },
  {
    id: "c_uin_bulk", kind: "capacitor", value: 10e-6, pins: { a: "VIN_A", b: "GND" }, mpn: "CL31B106KBHNNNE",
    cites: [DECOUPLE, ["parts.md:57", "the op-amp decoupling"]],
  },
]

describe("in_fe (B9)", () => {
  test("every component cites a file:line or a ruling id that resolves", () => {
    expect(inFeBlock().components.flatMap(provenanceProblems)).toEqual([])
  })
  test("its parts, values, nets and MPNs, each against its cited line", () => {
    expectBlock(inFeBlock(), IN_FE)
  })
  test("its ports: FX_IN_L/R, VMID_L/R, IN_FOLLOW_L/R, VIN_A and GND", () => {
    expectPorts(inFeBlock(), ["FX_IN_L", "FX_IN_R", "VMID_L", "VMID_R", "IN_FOLLOW_L", "IN_FOLLOW_R", "VIN_A", "GND"])
  })
  test("U_IN is one whole dual: unit A follows node T of L and unit B of R (schematic-checklist.md:149), numbered by its own symbolPins", () => {
    const u = inFeBlock().components.find((c) => c.id === "u_in")
    expect(u?.units.map((x) => [x.name, x.pins["in+"], x.pins.out])).toEqual([
      ["A", { kind: "net", net: "IN_T_L" }, { kind: "net", net: "IN_FOLLOW_L" }],
      ["B", { kind: "net", net: "IN_T_R" }, { kind: "net", net: "IN_FOLLOW_R" }],
    ])
    expect(u?.part?.symbolPins?.A?.["in+"]).toBe("3")
    expect(u?.part?.symbolPins?.B?.["in+"]).toBe("5")
  })
})
