/**
 * The h7-pedal's output stages, `out` (h7 pedal pages plan, Task 10; inventory section 1.3 B11): per
 * channel C_A+ and C_A-, the difference amplifier's R_D1, R_D2, R_FO with C_FO and R_GO with C_GO to
 * this channel's VMID_x, R_S after the feedback tap, C_OUT, C_DC (+ toward the op-amp) onto FX_OUT_x,
 * R_B, and the output test pad with its GND pad; U_OUT, one whole OPA1688 dual on VIN_A, A = L and
 * B = R, with its V+ decoupling. Each expectation is written from the cited lines; the leg
 * assignment is checked against AIO-15's codec pin numbers.
 */
import { describe, expect, test } from "bun:test"
import { outBlock } from "../../circuits/h7-platform/pedal/out.ts"
import { codecBlock } from "../../circuits/h7-platform/pedal/codec.ts"
import { provenanceProblems } from "./h7-pedal-provenance.ts"
import { expectBlock, expectPorts, type Cite, type PartExpectation } from "./h7-pedal-expect.ts"

const C164: Cite = ["schematic-checklist.md:164", "R_D1 = R_D2 20.0 kΩ 0.1 %; R_FO = R_GO 19.1 kΩ 0.1 % 25 ppm; C_FO = C_GO 47 pF C0G ±2 % across R_FO and R_GO"]
const C165: Cite = ["schematic-checklist.md:165", "VOUTx+ → C_A+ → R_D1 → inverting input; VOUTx− → C_A− → R_D2 → non-inverting input"]
const C166: Cite = ["schematic-checklist.md:166", "R_S 100 Ω after the feedback tap; C_OUT 220 pF C0G from the R_S/C_DC node to GND"]
const C167: Cite = ["schematic-checklist.md:167", "C_DC 22 µF 25 V aluminium, + toward the op-amp, then FX_OUT_x"]
const PADS = "decisions.md:1954"

function channel(x: "L" | "R"): PartExpectation[] {
  const lc = x.toLowerCase()
  const ap = `OUT_AP_${x}`
  const am = `OUT_AM_${x}`
  const inv = `OUT_INV_${x}`
  const ni = `OUT_NI_${x}`
  const oa = `OUT_OA_${x}`
  const s = `OUT_S_${x}`
  const fx = `FX_OUT_${x}`
  const vmid = `VMID_${x}`
  const ca: Cite = ["schematic-checklist.md:163", "C_A+ and C_A− 10 µF 50 V X7R, one in series with each DAC leg"]
  return [
    { id: `c_ap_${lc}`, kind: "capacitor", value: 10e-6, pins: { a: `VOUT${x}+`, b: ap }, cites: [ca, C165] },
    { id: `c_am_${lc}`, kind: "capacitor", value: 10e-6, pins: { a: `VOUT${x}-`, b: am }, cites: [ca, C165] },
    { id: `r_d1_${lc}`, kind: "resistor", value: 20.0e3, pins: { a: ap, b: inv }, cites: [C164, C165] },
    { id: `r_d2_${lc}`, kind: "resistor", value: 20.0e3, pins: { a: am, b: ni }, cites: [C164, C165] },
    { id: `r_fo_${lc}`, kind: "resistor", value: 19.1e3, pins: { a: inv, b: oa }, cites: [C164, ["analog.md:198", "R_F = R_G = **19.1 kΩ**"]] },
    { id: `c_fo_${lc}`, kind: "capacitor", value: 47e-12, pins: { a: inv, b: oa }, cites: [C164] },
    {
      id: `r_go_${lc}`, kind: "resistor", value: 19.1e3, pins: { a: ni, b: vmid },
      cites: [C164, ["schematic-checklist.md:164", "R_GO returns to **this channel's** VMID_x"], ["analog.md:198", "R_G returns to VMID_x"]],
    },
    { id: `c_go_${lc}`, kind: "capacitor", value: 47e-12, pins: { a: ni, b: vmid }, cites: [C164] },
    { id: `r_s_${lc}`, kind: "resistor", value: 100, pins: { a: oa, b: s }, cites: [C166, ["analog.md:211", "**R_S 100 Ω** in series after the feedback tap"]] },
    { id: `c_out_${lc}`, kind: "capacitor", value: 220e-12, pins: { a: s, b: "GND" }, cites: [C166, ["analog.md:211", "**C_O 220 pF C0G** from the R_S/C_DC node to GND"]] },
    {
      id: `c_dc_${lc}`, kind: "capacitor", value: 22e-6, pins: { a: s, b: fx }, mpn: "EEE-FT1E220AR", symbol: "Device:C_Polarized",
      cites: [C167, ["analog.md:207", "**C_DC 22 µF 25 V aluminium electrolytic**, + toward the op-amp, Panasonic EEE-FT1E220AR"]],
    },
    {
      id: `r_b_${lc}`, kind: "resistor", value: 100e3, pins: { a: fx, b: "GND" },
      cites: [["schematic-checklist.md:167", "R_B 100 kΩ bleed from FX_OUT_x to GND"], ["analog.md:207", "**R_B 100 kΩ** holds the jack at 0 V DC"]],
    },
    {
      id: `tp_out_${lc}`, kind: "connector", pins: { "1": fx }, symbol: "Connector:TestPoint",
      cites: [[PADS, "an output pad on each FX_OUT_x"], ["schematic-checklist.md:167", "an output test pad on FX_OUT_x"]],
    },
    {
      id: `tp_out_${lc}_gnd`, kind: "connector", pins: { "1": "GND" }, symbol: "Connector:TestPoint",
      cites: [[PADS, "each with a GND pad beside it"], ["schematic-checklist.md:167", "with a GND pad beside it"]],
    },
  ]
}

const DECOUPLE: Cite = ["schematic-checklist.md:132", "V+ pin (8) with 100 nF + 10 µF 50 V to GND"]

const OUT: readonly PartExpectation[] = [
  ...channel("L"),
  ...channel("R"),
  {
    id: "u_out", kind: "opamp", mpn: "OPA1688IDR",
    pins: {
      "v+": "VIN_A", "v-": "GND",
      "A/in+": "OUT_NI_L", "A/in-": "OUT_INV_L", "A/out": "OUT_OA_L",
      "B/in+": "OUT_NI_R", "B/in-": "OUT_INV_R", "B/out": "OUT_OA_R",
    },
    cites: [
      ["schematic-checklist.md:164", "U_OUT, an OPA1688 difference amplifier on VIN_A"], ["schematic-checklist.md:149", "channel A = L and B = R"],
      ["schematic-checklist.md:132", "V− (4) on GND"], ["parts.md:105", "OPA1688IDR"],
    ],
  },
  { id: "c_uout_hf", kind: "capacitor", value: 100e-9, pins: { a: "VIN_A", b: "GND" }, cites: [DECOUPLE] },
  {
    id: "c_uout_bulk", kind: "capacitor", value: 10e-6, pins: { a: "VIN_A", b: "GND" }, mpn: "CL31B106KBHNNNE",
    cites: [DECOUPLE, ["parts.md:57", "the op-amp decoupling"]],
  },
]

/** The net on a component's pin (`a` or a dual's `A/in-`), or "(absent)". */
function netOn(id: string, pin: string, net: ReturnType<typeof outBlock>): string {
  const c = net.components.find((x) => x.id === id)
  const [unit, name] = pin.includes("/") ? pin.split("/") : [undefined, pin]
  const u = unit === undefined ? c?.units[0] : c?.units.find((x) => x.name === unit)
  const conn = u?.pins[name ?? ""] ?? c?.pins[name ?? ""]
  return conn?.kind === "net" ? conn.net : "(absent)"
}

describe("out (B11)", () => {
  test("every component cites a file:line or a ruling id that resolves", () => {
    expect(outBlock().components.flatMap(provenanceProblems)).toEqual([])
  })
  test("its parts, values, nets and MPNs, each against its cited line", () => {
    expectBlock(outBlock(), OUT)
  })
  test("its ports: VOUTL+/-, VOUTR+/-, VMID_L/R, FX_OUT_L/R, VIN_A and GND", () => {
    expectPorts(outBlock(), ["VOUTL+", "VOUTL-", "VOUTR+", "VOUTR-", "VMID_L", "VMID_R", "FX_OUT_L", "FX_OUT_R", "VIN_A", "GND"])
  })
  test("U_OUT is one whole dual: unit A drives FX_OUT_L's chain and unit B FX_OUT_R's (schematic-checklist.md:149)", () => {
    const u = outBlock().components.find((c) => c.id === "u_out")
    expect(u?.units.map((x) => [x.name, x.pins.out])).toEqual([
      ["A", { kind: "net", net: "OUT_OA_L" }],
      ["B", { kind: "net", net: "OUT_OA_R" }],
    ])
  })
  test("leg assignment (AIO-15, schematic-checklist.md:165): codec pins 20 and 18 reach the inverting inputs, 19 and 17 the non-inverting", () => {
    const out = outBlock()
    const codec = codecBlock()
    const pinNet = (pin: string): string => netOn("u_codec", pin, codec)
    // Left: pin 20 inverting, pin 19 non-inverting; right: pin 18 inverting, pin 17 non-inverting.
    const legs: readonly (readonly [string, string, string, string])[] = [
      ["20", "c_ap_l", "r_d1_l", "A/in-"], ["19", "c_am_l", "r_d2_l", "A/in+"],
      ["18", "c_ap_r", "r_d1_r", "B/in-"], ["17", "c_am_r", "r_d2_r", "B/in+"],
    ]
    for (const [pin, cap, res, input] of legs) {
      expect([pin, netOn(cap, "a", out)]).toEqual([pin, pinNet(pin)])
      expect([pin, netOn(res, "a", out)]).toEqual([pin, netOn(cap, "b", out)])
      expect([pin, netOn("u_out", input, out)]).toEqual([pin, netOn(res, "b", out)])
    }
  })
  test("C_DC's + terminal (pin a, Device:C_Polarized pin 1) is toward the op-amp (schematic-checklist.md:167)", () => {
    for (const x of ["L", "R"]) expect(netOn(`c_dc_${x.toLowerCase()}`, "a", outBlock())).toBe(`OUT_S_${x}`)
  })
})
