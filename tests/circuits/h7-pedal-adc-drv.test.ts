/**
 * The h7-pedal's ADC drivers, `adc_drv` (h7 pedal pages plan, Task 10; inventory section 1.3 B10):
 * per channel C_AC (+ toward U_IN), R_IN, U_ADC's feedback R_FA with C_FA, the VBIAS_x divider and
 * its node capacitor, and R_O with C_VIN at the codec pin; U_ADC, one whole OPA1688 dual on 5V_A,
 * A = L and B = R, with its V+ decoupling. Each expectation is written from the cited lines.
 */
import { describe, expect, test } from "bun:test"
import { adcDrvBlock } from "../../circuits/h7-platform/pedal/adc-drv.ts"
import { provenanceProblems } from "./h7-pedal-provenance.ts"
import { expectBlock, expectPorts, type Cite, type PartExpectation } from "./h7-pedal-expect.ts"

const C158: Cite = ["schematic-checklist.md:158", "C_AC 22 µF 25 V aluminium, + toward U_IN, then R_IN 10.0 kΩ 1 % to U_ADC's inverting input"]
const C159: Cite = ["schematic-checklist.md:159", "R_FA 10.0 kΩ 1 % ∥ C_FA 47 pF C0G"]
const C160: Cite = ["schematic-checklist.md:160", "2 × 2.00 kΩ 0.1 % from 5V_A to GND with 10 µF X7R at the node, one node per channel"]
const C162: Cite = ["schematic-checklist.md:162", "U_ADC's output through R_O 100 Ω to VINL/VINR, with C_VIN 2.2 nF C0G to GND at the codec pin"]

function channel(x: "L" | "R"): PartExpectation[] {
  const lc = x.toLowerCase()
  const ac = `ADC_AC_${x}`
  const inv = `ADC_INV_${x}`
  const out = `ADC_OUT_${x}`
  const vbias = `VBIAS_${x}`
  return [
    {
      id: `c_ac_${lc}`, kind: "capacitor", value: 22e-6, pins: { a: `IN_FOLLOW_${x}`, b: ac }, mpn: "EEE-FT1E220AR", symbol: "Device:C_Polarized",
      cites: [C158, ["analog.md:176", "**C2 22 µF 25 V aluminium electrolytic** (+ toward U_IN"], ["parts.md:108", "EEE-FT1E220AR"]],
    },
    { id: `r_in_${lc}`, kind: "resistor", value: 10.0e3, pins: { a: ac, b: inv }, cites: [C158, ["analog.md:176", "**R_IN = R_F = 10.0 kΩ 1 %**"]] },
    { id: `r_fa_${lc}`, kind: "resistor", value: 10.0e3, pins: { a: inv, b: out }, cites: [C159, ["analog.md:176", "**R_IN = R_F = 10.0 kΩ 1 %**"]] },
    { id: `c_fa_${lc}`, kind: "capacitor", value: 47e-12, pins: { a: inv, b: out }, cites: [C159, ["analog.md:176", "**C_F 47 pF C0G**"]] },
    { id: `r_vbias_top_${lc}`, kind: "resistor", value: 2.0e3, pins: { a: "5V_A", b: vbias }, cites: [C160, ["analog.md:159", "2 × 2.00 kΩ 0.1 % from 5V_A to GND with 10 µF X7R"]] },
    { id: `r_vbias_bot_${lc}`, kind: "resistor", value: 2.0e3, pins: { a: vbias, b: "GND" }, cites: [C160, ["analog.md:159", "2 × 2.00 kΩ 0.1 % from 5V_A to GND with 10 µF X7R"]] },
    {
      id: `c_vbias_${lc}`, kind: "capacitor", value: 10e-6, pins: { a: vbias, b: "GND" },
      cites: [C160, ["decisions.md:2262", "Each VBIAS_x node capacitor goes from the node to GND"]],
    },
    { id: `r_o_${lc}`, kind: "resistor", value: 100, pins: { a: out, b: `VIN${x}` }, cites: [C162, ["analog.md:176", "**R_O 100 Ω** with **2.2 nF C0G** to GND at the pin"], ["decisions.md:2264", "R_O is modelled"]] },
    { id: `c_vin_${lc}`, kind: "capacitor", value: 2.2e-9, pins: { a: `VIN${x}`, b: "GND" }, cites: [C162] },
  ]
}

const DECOUPLE: Cite = ["schematic-checklist.md:132", "V+ pin (8) with 100 nF + 10 µF 50 V to GND, including U_ADC on 5V_A"]

const ADC_DRV: readonly PartExpectation[] = [
  ...channel("L"),
  ...channel("R"),
  {
    id: "u_adc", kind: "opamp", mpn: "OPA1688IDR",
    pins: {
      "v+": "5V_A", "v-": "GND",
      "A/in+": "VBIAS_L", "A/in-": "ADC_INV_L", "A/out": "ADC_OUT_L",
      "B/in+": "VBIAS_R", "B/in-": "ADC_INV_R", "B/out": "ADC_OUT_R",
    },
    cites: [
      ["schematic-checklist.md:159", "U_ADC, an OPA1688 inverting stage on **5V_A**"], ["schematic-checklist.md:160", "U_ADC's non-inverting input on VBIAS_x"],
      ["schematic-checklist.md:149", "channel A = L and B = R"], ["schematic-checklist.md:132", "V− (4) on GND"], ["parts.md:105", "OPA1688IDR"],
    ],
  },
  { id: "c_uadc_hf", kind: "capacitor", value: 100e-9, pins: { a: "5V_A", b: "GND" }, cites: [DECOUPLE] },
  {
    id: "c_uadc_bulk", kind: "capacitor", value: 10e-6, pins: { a: "5V_A", b: "GND" }, mpn: "CL31B106KBHNNNE",
    cites: [DECOUPLE, ["parts.md:57", "the op-amp decoupling"], ["decisions.md:2263", "U_ADC's 10 µF decoupling is parts.md's op-amp decoupling part"]],
  },
]

describe("adc_drv (B10)", () => {
  test("every component cites a file:line or a ruling id that resolves", () => {
    expect(adcDrvBlock().components.flatMap(provenanceProblems)).toEqual([])
  })
  test("its parts, values, nets and MPNs, each against its cited line", () => {
    expectBlock(adcDrvBlock(), ADC_DRV)
  })
  test("its ports: IN_FOLLOW_L/R, VINL, VINR, 5V_A and GND", () => {
    expectPorts(adcDrvBlock(), ["IN_FOLLOW_L", "IN_FOLLOW_R", "VINL", "VINR", "5V_A", "GND"])
  })
  test("U_ADC is one whole dual: unit A drives VINL's R_O and unit B VINR's (schematic-checklist.md:149), numbered by its own symbolPins", () => {
    const u = adcDrvBlock().components.find((c) => c.id === "u_adc")
    expect(u?.units.map((x) => [x.name, x.pins.out])).toEqual([
      ["A", { kind: "net", net: "ADC_OUT_L" }],
      ["B", { kind: "net", net: "ADC_OUT_R" }],
    ])
    expect(u?.part?.symbolPins?.A?.out).toBe("1")
    expect(u?.part?.symbolPins?.B?.out).toBe("7")
  })
  test("C_AC's + terminal (pin a, Device:C_Polarized pin 1) is toward U_IN (schematic-checklist.md:158)", () => {
    for (const x of ["L", "R"]) {
      const c = adcDrvBlock().components.find((p) => p.id === `c_ac_${x.toLowerCase()}`)
      expect(c?.units[0]?.pins.a).toEqual({ kind: "net", net: `IN_FOLLOW_${x}` })
    }
  })
})
