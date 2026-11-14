/**
 * The h7-pedal's jacks and bypass relays, `jacks_byp` (h7 pedal pages plan, Task 10; inventory
 * section 1.3 B12): the four audio jacks with the right input's tip-normal on the left tip, the four
 * jack ESD diodes, K_BYP_IN and K_BYP_OUT with bypass-relay.md:97's pin map, Q_BYP and its gate
 * network (R_RELAY_EN, R_BPD, Q_PFG), and each coil's 1N4148W + BZT52C12 suppressor. Each expectation
 * is written from the cited lines; the relays' pins are also read from bypass-relay.md:97-101 itself.
 */
import fs from "node:fs"
import path from "node:path"
import { describe, expect, test } from "bun:test"
import type { Network } from "../../lib/model/index.ts"
import { jacksBypBlock } from "../../circuits/h7-platform/pedal/jacks-byp.ts"
import { provenanceProblems } from "./h7-pedal-provenance.ts"
import { expectBlock, expectPorts, type Cite, type PartExpectation } from "./h7-pedal-expect.ts"

const BYPASS = fs.readFileSync(path.join(import.meta.dir, "../../docs/h7-platform/bypass-relay.md"), "utf8").split("\n")
const line = (n: number): string => BYPASS[n - 1] ?? ""

const JACK: Cite = ["parts.md:133", "NMJ6HCD2"]
const SLEEVE: Cite = ["decisions.md:2265", "The audio jacks' sleeves are on GND."]
const NORMALS: Cite = ["decisions.md:2266", "The left input jack's TN is not connected"]
const ESD: Cite = ["schematic-checklist.md:171", "four PESD12VL1BA,115, input diodes on IN_TIP_x and output diodes on OUT_JACK_x"]
const ESD_PINS: Cite = ["decisions.md:2267", "Each jack PESD12VL1BA has pin 1 on its jack net and pin 2 on GND"]
const MAP: Cite = ["bypass-relay.md:97", "**1 = coil +, 8 = coil −; 3 and 6 = COM; 2 and 7 = NC (break); 4 and 5 = NO (make).**"]
const COILS: Cite = ["bypass-relay.md:101", "pin 1 of both relays on 3V3_P; pin 8 of both on RELAY_DRV"]
const SUPPRESSOR: Cite = ["bypass-relay.md:102", "1N4148W anode on RELAY_DRV (coil pin 8), its cathode to the BZT52C12 cathode, the Zener's anode on 3V3_P (coil pin 1)"]
const SUP_NETS: Cite = ["decisions.md:2269", "The two coil suppressors sit on the same two nets."]

const NC = "NC"

function suppressor(coil: "in" | "out"): PartExpectation[] {
  const mid = coil === "in" ? "SUP_IN" : "SUP_OUT"
  return [
    {
      id: `d_bf_${coil}`, kind: "diode", pins: { anode: "RELAY_DRV", cathode: mid }, mpn: "1N4148W-7-F",
      cites: [SUPPRESSOR, SUP_NETS, ["bypass-relay.md:244", "D_BF_IN, D_BF_OUT | Diodes 1N4148W-7-F"], ["parts.md:124", "1N4148W-7-F"]],
    },
    {
      id: `d_bz_${coil}`, kind: "diode", pins: { anode: "3V3_P", cathode: mid }, mpn: "BZT52C12-7-F",
      cites: [SUPPRESSOR, SUP_NETS, ["bypass-relay.md:245", "D_BZ_IN, D_BZ_OUT | Diodes BZT52C12-7-F"], ["parts.md:125", "BZT52C12-7-F"]],
    },
  ]
}

const JACKS_BYP: readonly PartExpectation[] = [
  {
    id: "j_in_l", kind: "switch", mpn: "NMJ6HCD2", pins: { T: "IN_TIP_L", R: NC, S: "GND", TN: NC, RN: NC, SN: NC },
    cites: [["schematic-checklist.md:151", "Two input jacks used as TS (R, RN and SN open)"], ["bypass-relay.md:90", "Input jack tip, its jack ESD diode, **K_BYP_IN COM**"], JACK, SLEEVE, NORMALS],
  },
  {
    id: "j_in_r", kind: "switch", mpn: "NMJ6HCD2", pins: { T: "IN_TIP_R", R: NC, S: "GND", TN: "IN_TIP_L", RN: NC, SN: NC },
    cites: [
      ["schematic-checklist.md:151", "the **right input's tip-normal contact connects to the left tip net**"],
      ["bypass-relay.md:125", "The right input's tip-normal contact joins IN_TIP_R to IN_TIP_L with no plug in the right input"], JACK, SLEEVE, NORMALS,
    ],
  },
  {
    id: "j_out_l", kind: "switch", mpn: "NMJ6HCD2", pins: { T: "OUT_JACK_L", R: NC, S: "GND", TN: NC, RN: NC, SN: NC },
    cites: [["schematic-checklist.md:168", "Two output jacks used as TS (TN, R, RN and SN open)"], ["bypass-relay.md:94", "Output jack tip, its jack ESD diode, **K_BYP_OUT COM**"], JACK, SLEEVE],
  },
  {
    id: "j_out_r", kind: "switch", mpn: "NMJ6HCD2", pins: { T: "OUT_JACK_R", R: NC, S: "GND", TN: NC, RN: NC, SN: NC },
    cites: [["schematic-checklist.md:168", "Two output jacks used as TS (TN, R, RN and SN open)"], ["bypass-relay.md:94", "Output jack tip, its jack ESD diode, **K_BYP_OUT COM**"], JACK, SLEEVE],
  },
  ...(["IN_TIP_L", "IN_TIP_R", "OUT_JACK_L", "OUT_JACK_R"] as const).map((net): PartExpectation => ({
    id: `d_esd_${net.startsWith("IN") ? "in" : "out"}_${net.endsWith("L") ? "l" : "r"}`, kind: "ic", pins: { "1": net, "2": "GND" },
    mpn: "PESD12VL1BA,115", cites: [ESD, ESD_PINS, ["parts.md:107", "PESD12VL1BA,115"]],
  })),
  {
    id: "k_byp_in", kind: "ic", mpn: "G6K-2F-Y DC3",
    pins: { "1": "3V3_P", "2": "BYP_L", "3": "IN_TIP_L", "4": "FX_IN_L", "5": "FX_IN_R", "6": "IN_TIP_R", "7": "BYP_R", "8": "RELAY_DRV" },
    cites: [MAP, ["bypass-relay.md:99", "**K_BYP_IN:** pole A pin 3 = IN_TIP_L, pin 2 = BYP_L, pin 4 = FX_IN_L; pole B pin 6 = IN_TIP_R, pin 7 = BYP_R, pin 5 = FX_IN_R."], COILS, ["parts.md:122", "G6K-2F-Y DC3"]],
  },
  {
    id: "k_byp_out", kind: "ic", mpn: "G6K-2F-Y DC3",
    pins: { "1": "3V3_P", "2": "BYP_L", "3": "OUT_JACK_L", "4": "FX_OUT_L", "5": "FX_OUT_R", "6": "OUT_JACK_R", "7": "BYP_R", "8": "RELAY_DRV" },
    cites: [MAP, ["bypass-relay.md:100", "**K_BYP_OUT:** pole A pin 3 = OUT_JACK_L, pin 2 = BYP_L, pin 4 = FX_OUT_L; pole B pin 6 = OUT_JACK_R, pin 7 = BYP_R, pin 5 = FX_OUT_R."], COILS, ["parts.md:122", "G6K-2F-Y DC3"]],
  },
  {
    // AO3400A: 1 G, 2 S, 3 D (CR-PEDAL-SYMBOL-AO3400A).
    id: "q_byp", kind: "ic", mpn: "AO3400A", pins: { "1": "RELAY_GATE", "2": "GND", "3": "RELAY_DRV" },
    cites: [["bypass-relay.md:112", "RELAY_DRV - Q_BYP drain     Q_BYP: AO3400A, source GND"], ["bypass-relay.md:95", "Coil pin 8 of both relays, Q_BYP drain"], ["parts.md:123", "AO3400A"]],
  },
  {
    id: "r_relay_en", kind: "resistor", value: 3.9e3, pins: { a: "RELAY_EN", b: "RELAY_GATE" },
    cites: [["bypass-relay.md:113", "gate <- R_RELAY_EN 3.9k <- RELAY_EN (pin 8, PG10)"], ["bypass-relay.md:242", "| R_RELAY_EN | 3.9 kΩ 1 % |"]],
  },
  {
    id: "r_bpd", kind: "resistor", value: 15.0e3, pins: { a: "RELAY_GATE", b: "GND" },
    cites: [["bypass-relay.md:114", "gate - R_BPD 15.0k - GND"], ["bypass-relay.md:243", "| R_BPD | 15.0 kΩ 1 % |"]],
  },
  {
    id: "q_pfg", kind: "ic", mpn: "AO3400A", pins: { "1": "PF_TRIP", "2": "GND", "3": "RELAY_GATE" },
    cites: [["bypass-relay.md:115", "gate - Q_PFG drain (gate PF_TRIP), source GND"], ["bypass-relay.md:246", "| Q_PFG | AO3400A | the power-fail override, drain on the gate"], ["parts.md:61", "Q_PFG"]],
  },
  ...suppressor("in"),
  ...suppressor("out"),
]

/** The net on `id`'s pin, or "NC" / "(absent)". */
function netOn(net: Network, id: string, pin: string): string {
  const conn = net.components.find((c) => c.id === id)?.units[0]?.pins[pin]
  if (conn === undefined) return "(absent)"
  return conn.kind === "net" ? conn.net : "NC"
}

/** bypass-relay.md:97's terminal roles, read from the line: pin -> "coil +", "coil −", "COM", "NC" or "NO". */
function rolesFromLine97(): Readonly<Record<string, string>> {
  const text = line(97)
  const roles: Record<string, string> = {}
  for (const m of text.matchAll(/(\d) = (coil [+−])/g)) roles[m[1] ?? ""] = m[2] ?? ""
  for (const m of text.matchAll(/(\d) and (\d) = (COM|NC|NO)/g)) {
    roles[m[1] ?? ""] = m[3] ?? ""
    roles[m[2] ?? ""] = m[3] ?? ""
  }
  return roles
}

/** bypass-relay.md:99 or :100's "pin N = NET" pairs. */
function pinsFromLine(n: number): Readonly<Record<string, string>> {
  return Object.fromEntries([...line(n).matchAll(/pin (\d) = (\w+)/g)].map((m) => [m[1] ?? "", m[2] ?? ""]))
}

describe("jacks_byp (B12)", () => {
  test("every component cites a file:line or a ruling id that resolves", () => {
    expect(jacksBypBlock().components.flatMap(provenanceProblems)).toEqual([])
  })
  test("its parts, values, nets and MPNs, each against its cited line", () => {
    expectBlock(jacksBypBlock(), JACKS_BYP)
  })
  test("its ports: FX_IN_L/R, FX_OUT_L/R, RELAY_EN, PF_TRIP, 3V3_P and GND", () => {
    expectPorts(jacksBypBlock(), ["FX_IN_L", "FX_IN_R", "FX_OUT_L", "FX_OUT_R", "RELAY_EN", "PF_TRIP", "3V3_P", "GND"])
  })

  test("the relay pin map against bypass-relay.md:97: every terminal's role, as the line states it, on the net its role takes", () => {
    const roles = rolesFromLine97()
    expect(roles).toEqual({ "1": "coil +", "8": "coil −", "3": "COM", "6": "COM", "2": "NC", "7": "NC", "4": "NO", "5": "NO" })
    const b = jacksBypBlock()
    const expected: Readonly<Record<string, (relay: "in" | "out", x: "L" | "R") => string>> = {
      "coil +": () => "3V3_P",
      "coil −": () => "RELAY_DRV",
      COM: (relay, x) => (relay === "in" ? `IN_TIP_${x}` : `OUT_JACK_${x}`),
      NC: (_relay, x) => `BYP_${x}`,
      NO: (relay, x) => (relay === "in" ? `FX_IN_${x}` : `FX_OUT_${x}`),
    }
    // Pole A (pins 2, 3, 4) is L; pole B (5, 6, 7) is R (bypass-relay.md:99-100).
    const pole = (pin: string): "L" | "R" => (["2", "3", "4"].includes(pin) ? "L" : "R")
    for (const relay of ["in", "out"] as const) {
      for (const [pin, role] of Object.entries(roles)) {
        const want = expected[role]?.(relay, pole(pin)) ?? "(no role)"
        expect([relay, pin, role, netOn(b, `k_byp_${relay}`, pin)]).toEqual([relay, pin, role, want])
      }
    }
  })

  test("each relay's pins as bypass-relay.md:99-101 list them, read from the lines", () => {
    const b = jacksBypBlock()
    const fromLines: readonly (readonly [string, number])[] = [["k_byp_in", 99], ["k_byp_out", 100]]
    for (const [id, n] of fromLines) {
      const listed = pinsFromLine(n)
      expect(Object.keys(listed).sort()).toEqual(["2", "3", "4", "5", "6", "7"])
      for (const [pin, net] of Object.entries(listed)) expect([id, pin, netOn(b, id, pin)]).toEqual([id, pin, net])
      expect(line(101)).toContain("pin 1 of both relays on 3V3_P; pin 8 of both on RELAY_DRV")
      expect([id, netOn(b, id, "1"), netOn(b, id, "8")]).toEqual([id, "3V3_P", "RELAY_DRV"])
    }
  })

  test("the right input's tip-normal joins IN_TIP_R to IN_TIP_L with no plug, and no other normal is a modelled contact", () => {
    const b = jacksBypBlock()
    const contacts = (id: string): unknown => {
      const p = b.components.find((c) => c.id === id)?.parameters
      return p !== undefined && "contacts" in p ? p.contacts : undefined
    }
    expect(contacts("j_in_r")).toEqual({ "no plug": [["T", "TN"]], "plug in": [] })
    for (const id of ["j_in_l", "j_out_l", "j_out_r"]) expect([id, contacts(id)]).toEqual([id, { "no plug": [], "plug in": [] }])
  })
})
