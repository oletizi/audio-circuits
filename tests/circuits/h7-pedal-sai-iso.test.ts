/**
 * The h7-pedal's SAI domain isolation, `sai_iso` (h7 pedal pages plan, Task 8; inventory section 1.3
 * B8): U_ISO_M, the triple buffer on 3V3_D toward the module, with a 47 kohm bias to GND on each input
 * and 470 ohm between each output and its interface pin; U_ISO_C, the single buffer on 3V3_CODEC
 * toward the codec, with its 47 kohm bias; and each buffer's 100 nF. Each expectation is written from
 * the cited lines, and the directions and resistors are checked against INTERFACE-PARTS-TO-MODEL.
 */
import fs from "node:fs"
import path from "node:path"
import { describe, expect, test } from "bun:test"
import type { Component, Network } from "../../lib/model/index.ts"
import { saiIsoBlock } from "../../circuits/h7-platform/pedal/sai-iso.ts"
import { PEDAL_PIN_TABLES } from "../../circuits/h7-platform/pedal-pin-tables.ts"
import { SN74LVC1G34, SN74LVC3G34 } from "../../circuits/h7-platform/pedal-parts.ts"
import { expectBlock, expectPorts, type PartExpectation } from "./h7-pedal-expect.ts"

const A255 = "architecture.md:255"
const A256 = "architecture.md:256"
const OI45 = "open-items.md:45"
const BIAS = "47 kΩ bias to GND on each input"

const SAI_ISO: readonly PartExpectation[] = [
  {
    // SN74LVC3G34 DCT, keyed by gate (CR-PEDAL-SYMBOL-SN74LVC3G34): gate 1 1A/1Y, gate 2 2A/2Y, gate 3 3A/3Y; power GND, VCC.
    id: "u_iso_m", kind: "ic", mpn: "SN74LVC3G34DCTR",
    pins: {
      "1/A": "DOUT_CODEC", "1/Y": "ISO_DOUT", "2/A": "LRCK_CODEC", "2/Y": "ISO_LRCK", "3/A": "BCK_CODEC", "3/Y": "ISO_BCK",
      "power/GND": "GND", "power/VCC": "3V3_D",
    },
    cites: [
      [A255, "A triple buffer powered from the receiving side (3V3_D), TI SN74LVC3G34DCTR"], ["parts.md:115", "SN74LVC3G34DCTR"],
      ["decisions.md:2200", "\"32, 34, 35 (DOUT, LRCK, BCK)\""], ["decisions.md:2201", "fourth model unit, `power`"],
    ],
  },
  ...(["DOUT", "LRCK", "BCK"] as const).map((s): PartExpectation => ({
    id: `r_bias_${s.toLowerCase()}`, kind: "resistor", value: 47e3, pins: { a: `${s}_CODEC`, b: "GND" },
    cites: [[A255, BIAS], [OI45, "47 kΩ bias on each buffer input"]],
  })),
  ...(["DOUT", "LRCK", "BCK"] as const).map((s): PartExpectation => ({
    id: `r_iso_${s.toLowerCase()}`, kind: "resistor", value: 470, pins: { a: `ISO_${s}`, b: `CODEC_${s}` },
    cites: [[A255, "470 Ω 1 % between each output and its interface pin"], [OI45, "470 Ω between each to-module output and pins 32/34/35"]],
  })),
  {
    // SN74LVC1G34 DBV: 1 NC, 2 A, 3 GND, 4 Y, 5 VCC (pedal-pin-tables.ts, SCES519O Table 4-1).
    id: "u_iso_c", kind: "ic", mpn: "SN74LVC1G34DBVR", pins: { "1": "NC", "2": "CODEC_DIN", "3": "GND", "4": "DIN_CODEC", "5": "3V3_CODEC" },
    cites: [[A256, "A single buffer powered from the codec rail, TI SN74LVC1G34DBVR"], ["parts.md:116", "SN74LVC1G34DBVR"]],
  },
  {
    id: "r_bias_din", kind: "resistor", value: 47e3, pins: { a: "CODEC_DIN", b: "GND" },
    cites: [[A256, "47 kΩ bias on its input"], ["decisions.md:2202", "holds only with it to GND"]],
  },
  {
    id: "c_iso_m", kind: "capacitor", value: 100e-9, pins: { a: "3V3_D", b: "GND" },
    cites: [["decisions.md:1934", "U_ISO_M, SN74LVC3G34DCTR, on 3V3_D"], ["decisions.md:2199", "the three of [CR-PEDAL-LOGIC-DECOUPLING]"]],
  },
  {
    id: "c_iso_c", kind: "capacitor", value: 100e-9, pins: { a: "3V3_CODEC", b: "GND" },
    cites: [["decisions.md:1935", "U_ISO_C, SN74LVC1G34DBVR, on 3V3_CODEC"], ["decisions.md:2199", "the three of [CR-PEDAL-LOGIC-DECOUPLING]"]],
  },
]

/** Every (net, pin type) of a logic buffer, the type read from its data sheet table by symbol pin number. */
function pinTypes(c: Component, table: string): { readonly net: string; readonly type: string }[] {
  const types = PEDAL_PIN_TABLES[table]?.pins
  if (types === undefined) throw new Error(`no pin table ${table}`)
  const out: { net: string; type: string }[] = []
  for (const unit of c.units) {
    for (const [pin, conn] of Object.entries(unit.pins)) {
      const number = c.units.length > 1 ? c.part?.symbolPins?.[unit.name]?.[pin] : pin
      const type = number === undefined ? undefined : types[number]?.type
      if (conn.kind === "net" && type !== undefined) out.push({ net: conn.net, type })
    }
  }
  return out
}

function partsOn(n: Network, net: string, except: string): Component[] {
  return n.components.filter((c) => c.id !== except && c.units.some((u) => Object.values(u.pins).some((x) => x.kind === "net" && x.net === net)))
}

function other(c: Component, net: string): string | undefined {
  const nets = Object.values(c.units[0]?.pins ?? {}).flatMap((x) => (x.kind === "net" ? [x.net] : []))
  return nets.find((x) => x !== net)
}

function ohms(c: Component): number | undefined {
  return "ohms" in c.parameters ? c.parameters.ohms : undefined
}

describe("sai_iso (B8)", () => {
  test("its parts, values and nets, each against its cited line", () => {
    expectBlock(saiIsoBlock(), SAI_ISO)
  })
  test("its ports: both rails, the four codec-side nets, the four contract SAI nets and GND", () => {
    expectPorts(saiIsoBlock(), [
      "3V3_D", "3V3_CODEC", "BCK_CODEC", "LRCK_CODEC", "DOUT_CODEC", "DIN_CODEC", "CODEC_DOUT", "CODEC_DIN", "CODEC_LRCK", "CODEC_BCK", "GND",
    ])
  })
  test("directions and resistors against INTERFACE-PARTS-TO-MODEL's figures (open-items.md:45)", () => {
    const row = fs.readFileSync(path.join(import.meta.dir, "../../docs/h7-platform/open-items.md"), "utf8").split("\n")[44] ?? ""
    for (const figure of ["SN74LVC3G34DCTR on 3V3_D toward the module", "SN74LVC1G34DBVR on the codec rail toward the codec",
      "47 kΩ bias on each buffer input", "470 Ω between each to-module output and pins 32/34/35", "33 Ω at the codec"]) {
      expect([figure, row.includes(figure)]).toEqual([figure, true])
    }
    const n = saiIsoBlock()
    const isoM = n.components.find((c) => c.part?.mpn === SN74LVC3G34.mpn)
    const isoC = n.components.find((c) => c.part?.mpn === SN74LVC1G34.mpn)
    if (isoM === undefined || isoC === undefined) throw new Error("both buffers must be in sai_iso")
    // U_ISO_M on 3V3_D (the module's side) takes the codec-side nets in and drives toward pins 32, 34, 35.
    const m = pinTypes(isoM, "SN74LVC3G34")
    expect(m.filter((p) => p.type === "input").map((p) => p.net).sort()).toEqual(["BCK_CODEC", "DOUT_CODEC", "LRCK_CODEC"])
    expect(m.find((p) => p.type === "power_in" && p.net !== "GND")?.net).toBe("3V3_D")
    const toModule: readonly (readonly [string, string])[] = [["ISO_DOUT", "CODEC_DOUT"], ["ISO_LRCK", "CODEC_LRCK"], ["ISO_BCK", "CODEC_BCK"]]
    expect(m.filter((p) => p.type === "output").map((p) => p.net).sort()).toEqual(toModule.map(([out]) => out).sort())
    for (const [out, pin] of toModule) {
      const series = partsOn(n, out, isoM.id)
      expect([out, series.length, series[0]?.kind, series[0] === undefined ? undefined : ohms(series[0]), series[0] === undefined ? undefined : other(series[0], out)])
        .toEqual([out, 1, "resistor", 470, pin])
    }
    // U_ISO_C on 3V3_CODEC (the codec's side) takes pin 33 in and drives the codec's DIN.
    const c = pinTypes(isoC, "SN74LVC1G34")
    expect(c.filter((p) => p.type === "input").map((p) => p.net)).toEqual(["CODEC_DIN"])
    expect(c.filter((p) => p.type === "output").map((p) => p.net)).toEqual(["DIN_CODEC"])
    expect(c.find((p) => p.type === "power_in" && p.net !== "GND")?.net).toBe("3V3_CODEC")
    // Each buffer input carries exactly one 47 kohm, to GND, and no other part but its buffer.
    for (const input of ["DOUT_CODEC", "LRCK_CODEC", "BCK_CODEC", "CODEC_DIN"]) {
      const biases = partsOn(n, input, "").filter((x) => x.kind === "resistor")
      expect([input, biases.map((b) => [ohms(b), other(b, input)])]).toEqual([input, [[47e3, "GND"]]])
    }
  })
})
