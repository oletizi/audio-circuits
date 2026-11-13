/**
 * The h7-pedal's codec, `codec` (h7 pedal pages plan, Task 8; inventory section 1.3 B7): the
 * PCM3060 with its three decoupling pairs, its MODE, FMT and DEMP straps, IFMD to its VDD, and the
 * 33 ohm series resistors on BCK, LRCK and DOUT. The not-fitted positions (CODEC-06's MODE 0 ohm,
 * CODEC-09's pull-up, CODEC-10's two links) are not modelled (CR-PEDAL-POPULATION); the
 * default-population check and its controls are `h7-pedal-population.test.ts`. Each expectation is
 * written from the cited lines.
 */
import { describe, expect, test } from "bun:test"
import type { Component } from "../../lib/model/index.ts"
import { codecBlock } from "../../circuits/h7-platform/pedal/codec.ts"
import { PCM3060_VALUES } from "../../circuits/h7-platform/pedal-rulings.ts"
import { expectBlock, expectPorts, type PartExpectation } from "./h7-pedal-expect.ts"

const C88 = "schematic-checklist.md:88"
const C92 = "schematic-checklist.md:92"
const C106 = "schematic-checklist.md:106"
const A486 = "analog.md:486"
const SERIES = "decisions.md:2203"

const CODEC: readonly PartExpectation[] = [
  {
    // PCM3060 TSSOP-28, numbered as SLAS533B p. 7 (pedal-pin-tables.ts).
    id: "u_codec", kind: "ic", mpn: "PCM3060PWR",
    pins: {
      "1": "CODEC_FMT", "2": "CODEC_DEMP", "3": "DOUT_PIN", "4": "LRCK_PIN", "5": "BCK_PIN", "6": "XO_OUT", "7": "3V3_CODEC",
      "8": "GND", "9": "XO_OUT", "10": "BCK_PIN", "11": "LRCK_PIN", "12": "DIN_CODEC", "13": "NC", "14": "NC",
      "15": "CODEC_RST_N", "16": "GND", "17": "VOUTR-", "18": "VOUTR+", "19": "VOUTL-", "20": "VOUTL+", "21": "CODEC_VCOM",
      "22": "GND", "23": "GND", "24": "5V_A_CODEC", "25": "VINL", "26": "VINR", "27": "3V3_CODEC", "28": "CODEC_MODE",
    },
    cites: [
      [C88, "VCC (pin 24) from 5V_A through the 0 Ω position of PWR-15"], ["power.md:489", "`5V_A_CODEC` joined to 5V_A"],
      ["analog.md:370", "the PCM3060's VDD"], ["analog.md:370", "on the net 3V3_CODEC"],
      ["schematic-checklist.md:93", "AGND1 (23), AGND2 (22), SGND (16) and DGND (8) all on the one GND net"],
      ["schematic-checklist.md:94", "RST (pin 15) from the local reset"], ["analog.md:407", "on CODEC_RST_N (PCM3060 pin 15)"],
      ["schematic-checklist.md:99", "MS/ADR/IFMD (pin 27) to the codec's VDD"],
      [C106, "SCKI1 (6) and SCKI2 (9) from the 12.288 MHz oscillator"], [C106, "ZEROL (14) and ZEROR (13) left open"],
      [C106, "DIN (12) from the socket through the isolation"], ["architecture.md:213", "BCK1/BCK2 tied and LRCK1/LRCK2 tied"],
      ["schematic-checklist.md:110", "VOUTL+ (20)"], ["schematic-checklist.md:110", "VINL (25) and VINR (26) from the ADC drivers"],
      ["parts.md:96", "PCM3060PWR"],
    ],
  },
  { id: "c_vcc_hf", kind: "capacitor", value: 100e-9, pins: { a: "5V_A_CODEC", b: "GND" }, cites: [[C88, "with 100 nF + 10 µF to AGND at the pin"]] },
  { id: "c_vcc_bulk", kind: "capacitor", value: 10e-6, pins: { a: "5V_A_CODEC", b: "GND" }, cites: [[C88, "with 100 nF + 10 µF to AGND at the pin"]] },
  { id: "c_vdd_hf", kind: "capacitor", value: 100e-9, pins: { a: "3V3_CODEC", b: "GND" }, cites: [[C88, "VDD (pin 7) with 100 nF + 10 µF to DGND (pin 8) at the pin"]] },
  { id: "c_vdd_bulk", kind: "capacitor", value: 10e-6, pins: { a: "3V3_CODEC", b: "GND" }, cites: [[C88, "VDD (pin 7) with 100 nF + 10 µF to DGND (pin 8) at the pin"]] },
  {
    id: "c_vcom_hf", kind: "capacitor", value: 100e-9, pins: { a: "CODEC_VCOM", b: "GND" },
    cites: [[C92, "VCOM (pin 21): 100 nF + 10 µF to AGND at the pin"], [C92, "**No other connection to VCOM**"]],
  },
  {
    id: "c_vcom_bulk", kind: "capacitor", value: 10e-6, pins: { a: "CODEC_VCOM", b: "GND" },
    cites: [[C92, "VCOM (pin 21): 100 nF + 10 µF to AGND at the pin"], [C92, "**No other connection to VCOM**"]],
  },
  { id: "r_mode", kind: "resistor", value: 220e3, pins: { a: "CODEC_MODE", b: "GND" }, cites: [["schematic-checklist.md:98", "MODE (pin 28): **220 kΩ ± 5 % to DGND**"]] },
  { id: "r_fmt", kind: "resistor", value: 4.7e3, pins: { a: "CODEC_FMT", b: "3V3_CODEC" }, cites: [["schematic-checklist.md:103", "MC/SCL/FMT (pin 1): **4.7 kΩ to VDD**"]] },
  { id: "r_demp", kind: "resistor", value: 4.7e3, pins: { a: "CODEC_DEMP", b: "GND" }, cites: [["schematic-checklist.md:104", "MD/SDA/DEMP (pin 2): **4.7 kΩ to DGND**"]] },
  { id: "r_bck", kind: "resistor", value: 33, pins: { a: "BCK_PIN", b: "BCK_CODEC" }, cites: [[A486, "**33 Ω on BCK, LRCK and DOUT** at the codec"], [SERIES, "to BCK_CODEC and LRCK_CODEC"]] },
  { id: "r_lrck", kind: "resistor", value: 33, pins: { a: "LRCK_PIN", b: "LRCK_CODEC" }, cites: [[A486, "**33 Ω on BCK, LRCK and DOUT** at the codec"], [SERIES, "to BCK_CODEC and LRCK_CODEC"]] },
  { id: "r_dout", kind: "resistor", value: 33, pins: { a: "DOUT_PIN", b: "DOUT_CODEC" }, cites: [[A486, "**33 Ω on BCK, LRCK and DOUT** at the codec"], [SERIES, "DOUT (3) through its 33 Ω to DOUT_CODEC"]] },
]

function on(c: Component | undefined, pin: string): string | undefined {
  const conn = c?.units[0]?.pins[pin]
  return conn?.kind === "net" ? conn.net : conn?.kind
}

describe("codec (B7)", () => {
  test("its parts, values and nets, each against its cited line; the not-fitted positions not modelled", () => {
    expectBlock(codecBlock(), CODEC)
  })
  test("its ports: the codec rails, reset, clock, the codec-side SAI nets and the analog in and out nets", () => {
    expectPorts(codecBlock(), [
      "5V_A_CODEC", "3V3_CODEC", "CODEC_RST_N", "XO_OUT", "BCK_CODEC", "LRCK_CODEC", "DOUT_CODEC", "DIN_CODEC",
      "VINL", "VINR", "VOUTL+", "VOUTL-", "VOUTR+", "VOUTR-", "GND",
    ])
  })
  test("the PCM3060's straps and decoupling are CR-PEDAL-PCM3060-VALUES' (schematic-checklist.md:88-105)", () => {
    const n = codecBlock()
    const part = (id: string): Component | undefined => n.components.find((c) => c.id === id)
    const ohms = (id: string): number | undefined => {
      const p = part(id)?.parameters
      return p !== undefined && "ohms" in p ? p.ohms : undefined
    }
    const farads = (id: string): number | undefined => {
      const p = part(id)?.parameters
      return p !== undefined && "farads" in p ? p.farads : undefined
    }
    const codec = part("u_codec")
    expect(ohms("r_mode")).toBe(PCM3060_VALUES.modeToGndOhm)
    expect(ohms("r_fmt")).toBe(PCM3060_VALUES.fmtToVddOhm)
    expect(ohms("r_demp")).toBe(PCM3060_VALUES.dempToGndOhm)
    expect(on(codec, "27")).toBe(PCM3060_VALUES.ifmd)
    // FMT's pull-up and IFMD go to the codec's own VDD, pin 7's net.
    expect(on(part("r_fmt"), "b")).toBe(on(codec, "7"))
    expect(on(codec, "27")).toBe(on(codec, "7"))
    // Each decoupling pair at its pin, to the one GND (pin 8's net).
    const pairs: readonly (readonly [string, string, string, readonly number[]])[] = [
      ["24", "c_vcc_hf", "c_vcc_bulk", PCM3060_VALUES.decoupling.vcc],
      ["7", "c_vdd_hf", "c_vdd_bulk", PCM3060_VALUES.decoupling.vdd],
      ["21", "c_vcom_hf", "c_vcom_bulk", PCM3060_VALUES.decoupling.vcom],
    ]
    for (const [pin, hf, bulk, values] of pairs) {
      expect([pin, farads(hf), farads(bulk)]).toEqual([pin, values[0], values[1]])
      for (const id of [hf, bulk]) expect([id, on(part(id), "a"), on(part(id), "b")]).toEqual([id, on(codec, pin), on(codec, "8")])
    }
    // VCOM carries its two capacitors and nothing else (CODEC-03).
    const vcom = on(codec, "21")
    const onVcom = n.components.filter((c) => c.units.some((u) => Object.values(u.pins).some((x) => x.kind === "net" && x.net === vcom)))
    expect(onVcom.map((c) => c.id).sort()).toEqual(["c_vcom_bulk", "c_vcom_hf", "u_codec"])
  })
})
