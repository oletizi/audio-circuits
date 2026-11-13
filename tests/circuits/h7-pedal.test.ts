/**
 * The h7 audio pedal board as a whole (h7 pedal pages plan, Task 5): the board's `make check` test
 * (`boards/h7-pedal`, kind "pcb"). Tasks 6, 8 and 10 extend it as each group's blocks land.
 *
 * What is held here: the board validates; its blocks are CR-PEDAL-BLOCKS' and each is in its group;
 * the interface block puts every contract signal on its contract net and every reserved pin NC;
 * the contract nets nothing on the pedal loads yet are exactly the root ports, each on one pad;
 * every component is in exactly one block and has exactly one designator; every component's
 * provenance cites a `file:line` or a ruling id that resolves (with a control); the shared net
 * names are CR-PEDAL-NETS' or their cited lines'; every part's symbol and pin numbers check; and
 * every block lowers to a page.
 */
import { describe, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { NC } from "../../lib/model/index.ts"
import { blockOf } from "../../lib/model/include.ts"
import type { Component, Connection, Network } from "../../lib/model/index.ts"
import { valueFor } from "../../lib/kicad/value-notation.ts"
import { loadContract } from "../../circuits/h7-platform/contract.ts"
import { checkInterface } from "../../circuits/h7-platform/interface-check.ts"
import { MODULE_SOCKET } from "../../circuits/h7-platform/parts.ts"
import { PEDAL_BLOCKS, PEDAL_GROUPS } from "../../circuits/h7-platform/pedal/build.ts"
import { SHARED_NETS, contractNet, sharedNet } from "../../circuits/h7-platform/pedal/nets.ts"
import { DATASHEET_PIN_NAMES } from "../../circuits/h7-platform/pedal-parts.ts"
import {
  AWAITING_NETS, DESIGNATORS, PAGE_GROUPS, PIN_NUMBERS, SOCKET_ONLY_NETS, UNDRAWN_CONNECTOR_NETS, drawingPages, h7Pedal,
} from "../../circuits/h7-platform/pedal-board.ts"
import { MIDI } from "../../circuits/h7-platform/pedal-population.ts"
import { provenanceProblems } from "./h7-pedal-provenance.ts"
import { symbolProblems } from "./h7-module-checks.ts"

const REPO = path.join(import.meta.dir, "../..")
const DECISIONS = fs.readFileSync(path.join(REPO, "docs/h7-platform/decisions.md"), "utf8")
const PEDAL = h7Pedal()
const SOCKETS = { J_MOD_A: "interface_j_mod_a", J_MOD_B: "interface_j_mod_b" }

function only(network: Network, id: string): Component {
  const c = network.components.find((x) => x.id === id)
  if (c === undefined) throw new Error(`the pedal has no "${id}"`)
  return c
}

function pinsOn(network: Network, net: string): number {
  return network.components
    .flatMap((c) => [...Object.values(c.pins), ...c.units.flatMap((u) => Object.values(u.pins))])
    .filter((x) => x.kind === "net" && x.net === net).length
}

/** The pedal with one socket pad's connection replaced: a control for the interface check. */
function withPad(id: string, pad: string, connection: Connection): Network {
  return {
    ...PEDAL,
    components: PEDAL.components.map((c) =>
      c.id !== id ? c : { ...c, units: c.units.map((u) => ({ ...u, pins: { ...u.pins, [pad]: connection } })) },
    ),
  }
}

/** The body of `### <id>` in decisions.md, up to the next heading. */
function entry(id: string): string {
  const lines = DECISIONS.split("\n")
  const start = lines.indexOf(`### ${id}`)
  if (start === -1 || lines.lastIndexOf(`### ${id}`) !== start) throw new Error(`decisions.md must have exactly one "### ${id}"`)
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => line.startsWith("#"))
  return rest.slice(0, end === -1 ? rest.length : end).join("\n")
}

describe("h7 pedal skeleton", () => {
  test("the board validates", () => {
    expect(() => h7Pedal()).not.toThrow()
  })

  test("CR-PEDAL-BLOCKS: 19 blocks in three groups and the interface, each built block one of them", () => {
    expect(PEDAL_BLOCKS).toHaveLength(19)
    expect(new Set(PEDAL_BLOCKS.map((b) => b.prefix)).size).toBe(19)
    expect([...new Set(PEDAL_BLOCKS.map((b) => b.group))].sort()).toEqual([...PEDAL_GROUPS].sort())
    const ruled = new Set(PEDAL_BLOCKS.map((b) => b.prefix))
    expect(PEDAL.blocks.map((b) => b.prefix).filter((p) => !ruled.has(p))).toEqual([])
    expect(PEDAL.blocks.map((b) => b.prefix).sort()).toEqual(Object.keys(PAGE_GROUPS).sort())
    const body = entry("CR-PEDAL-BLOCKS")
    expect(body).toContain("Controller ruling (the owner may override)")
    expect(body).toContain("Costs if wrong")
    for (const b of PEDAL_BLOCKS) expect([b.prefix, body.includes(`\`${b.prefix}\``)]).toEqual([b.prefix, true])
  })
})

describe("the interface block (J_MOD_A, J_MOD_B)", () => {
  test("every contract signal is on its contract net, and every reserved pin is NC (checkInterface, pedal)", () => {
    expect(checkInterface(PEDAL, "pedal", SOCKETS).mismatches).toEqual([])
  })

  test("pin by pin: 36 signal pins on their nets, pins 16-19 NC, each pad as the contract maps it", () => {
    let bound = 0
    let reserved = 0
    for (const cp of loadContract().pins) {
      const id = cp.pin <= 20 ? SOCKETS.J_MOD_A : SOCKETS.J_MOD_B
      const pad = String(cp.pin <= 20 ? cp.pin : cp.pin - 20)
      const found = only(PEDAL, id).units[0]?.pins[pad]
      if (cp.signal === null) {
        expect([cp.pin, found]).toEqual([cp.pin, NC])
        reserved += 1
      } else {
        expect([cp.pin, found]).toEqual([cp.pin, { kind: "net", net: cp.signal }])
        bound += 1
      }
    }
    expect([bound, reserved]).toEqual([36, 4])
  })

  test("control: a reserved pin given a net fails, and a signal pin on the wrong net fails", () => {
    expect(checkInterface(withPad(SOCKETS.J_MOD_A, "17", { kind: "net", net: "GND" }), "pedal", SOCKETS).mismatches)
      .toEqual(['contract pin 17 (J_MOD_A pad 17): reserved pin must be nc on a pedal, found "GND"'])
    expect(checkInterface(withPad(SOCKETS.J_MOD_A, "8", { kind: "net", net: "LED1" }), "pedal", SOCKETS).mismatches)
      .toEqual(['contract pin 8 (J_MOD_A pad 8): expected net "RELAY_EN", found "LED1"'])
  })

  test("the sockets are the pedal's female part, Mill-Max 801-43-020-10-012000 (parts.md:158, R-61)", () => {
    expect(only(PEDAL, SOCKETS.J_MOD_A).part).toEqual(MODULE_SOCKET)
    expect(only(PEDAL, SOCKETS.J_MOD_B).part).toEqual(MODULE_SOCKET)
  })

  test("pads 20 and 40 are the one GND (architecture.md section 4.11 rule 9)", () => {
    expect(only(PEDAL, SOCKETS.J_MOD_A).units[0]?.pins["20"]).toEqual({ kind: "net", net: "GND" })
    expect(only(PEDAL, SOCKETS.J_MOD_B).units[0]?.pins["20"]).toEqual({ kind: "net", net: "GND" })
  })
})

describe("contract nets nothing on the pedal loads yet", () => {
  test("with the pedal nets awaiting their other block, are exactly the root ports, and each is on one pad and nothing else", () => {
    expect(Object.keys(PEDAL.ports).sort()).toEqual([...SOCKET_ONLY_NETS, ...AWAITING_NETS, ...UNDRAWN_CONNECTOR_NETS].sort())
    for (const net of SOCKET_ONLY_NETS) {
      expect([net, PEDAL.ports[net], pinsOn(PEDAL, net)]).toEqual([net, net, 1])
    }
  })
  test("include the five spares for good, which carry no pedal-board load (architecture.md:181)", () => {
    for (const net of ["SPARE1", "SPARE2", "SPARE3", "SPARE4", "SPARE5"]) expect(SOCKET_ONLY_NETS).toContain(net)
  })
  test("every other contract net has two or more members (until a group loads it, two socket pads can be its only members)", () => {
    const signals = [...new Set(loadContract().pins.flatMap((p) => (p.signal === null ? [] : [p.signal])))]
    for (const net of signals.filter((s) => !SOCKET_ONLY_NETS.includes(s))) {
      expect([net, pinsOn(PEDAL, net) >= 2]).toEqual([net, true])
    }
  })
})

describe("pedal nets awaiting their other block (CR-PEDAL-NETS)", () => {
  const built = new Set(PEDAL.blocks.map((b) => b.prefix))
  test("each is a shared net on exactly one pin, which a block not yet built will load", () => {
    for (const net of AWAITING_NETS) {
      expect([net, PEDAL.ports[net], pinsOn(PEDAL, net)]).toEqual([net, net, 1])
      expect([net, sharedNet(net).blocks.some((b) => !built.has(b))]).toEqual([net, true])
    }
  })
})

describe("nets running on to a connector no source names (CR-PEDAL-DIGITAL-READINGS, CR-PEDAL-MIDI)", () => {
  test("are exactly the MIDI OUT loop's two nets, each a port of the board reached only by midi_i2c", () => {
    expect([...UNDRAWN_CONNECTOR_NETS].sort()).toEqual([MIDI.loopNets.pin4, MIDI.loopNets.pin5].sort())
    for (const net of UNDRAWN_CONNECTOR_NETS) {
      expect(PEDAL.ports[net]).toBe(net)
      const on = PEDAL.components.filter((c) => [...Object.values(c.pins), ...c.units.flatMap((u) => Object.values(u.pins))]
        .some((x) => x.kind === "net" && x.net === net))
      expect([net, [...new Set(on.map((c) => blockOf(PEDAL, c.id)))]]).toEqual([net, ["midi_i2c"]])
    }
  })
})

/** Root net -> the built blocks whose parts sit on it. */
function blocksOn(network: Network): ReadonlyMap<string, ReadonlySet<string>> {
  const out = new Map<string, Set<string>>()
  for (const c of network.components) {
    const prefix = blockOf(network, c.id)
    if (prefix === null) continue
    for (const conn of [...Object.values(c.pins), ...c.units.flatMap((u) => Object.values(u.pins))]) {
      if (conn.kind !== "net") continue
      const set = out.get(conn.net) ?? new Set<string>()
      set.add(prefix)
      out.set(conn.net, set)
    }
  }
  return out
}

describe("shared nets reach the blocks section 1.2 lists, and no others (built blocks)", () => {
  const built = new Set(PEDAL.blocks.map((b) => b.prefix))
  const reach = blocksOn(PEDAL)
  test("the power group is built: entry, pf, modsw, prail, ldo_vmid", () => {
    for (const b of ["entry", "pf", "modsw", "prail", "ldo_vmid"]) expect([b, built.has(b)]).toEqual([b, true])
  })
  test("the digital and controls group is built: codec_sup, codec, sai_iso, expr_ref, controls_a, controls_b, fsw_led, usb, midi_i2c", () => {
    for (const b of ["codec_sup", "codec", "sai_iso", "expr_ref", "controls_a", "controls_b", "fsw_led", "usb", "midi_i2c"]) {
      expect([b, built.has(b)]).toEqual([b, true])
    }
  })
  test("3V3_D, VREF_A, 3V3_CODEC, 5V_A_CODEC and PF_TRIP: the inventory's section 1.2 lists, as SHARED_NETS carries them", () => {
    expect(sharedNet("3V3_D").blocks).toEqual(["sai_iso", "controls_a", "controls_b", "fsw_led", "usb", "midi_i2c", "interface"])
    expect(sharedNet("VREF_A").blocks).toEqual(["expr_ref", "controls_a", "controls_b", "interface"])
    expect(sharedNet("3V3_CODEC").blocks).toEqual(["codec_sup", "codec", "sai_iso"])
    expect(sharedNet("5V_A_CODEC").blocks).toEqual(["ldo_vmid", "codec_sup", "codec"])
    expect(sharedNet("PF_TRIP").blocks).toEqual(["pf", "modsw", "prail", "codec_sup", "jacks_byp"])
  })
  test("VIN_A, VIN_MOD, 5V_A and 3V3_P: the inventory's section 1.2 lists, as SHARED_NETS carries them", () => {
    expect(sharedNet("VIN_A").blocks).toEqual(["entry", "ldo_vmid", "in_fe", "out"])
    expect(sharedNet("VIN_MOD").blocks).toEqual(["modsw", "prail", "interface"])
    expect(sharedNet("5V_A").blocks).toEqual(["pf", "ldo_vmid", "adc_drv"])
    expect(sharedNet("3V3_P").blocks).toEqual(["prail", "jacks_byp", "fsw_led", "midi_i2c"])
  })
  test("every shared net reaches exactly its listed blocks that are built", () => {
    for (const n of SHARED_NETS) {
      const want = n.blocks.filter((b) => built.has(b)).sort()
      const got = [...(reach.get(n.net) ?? new Set<string>())].sort()
      expect([n.net, got]).toEqual([n.net, want])
    }
  })
})

describe("blocks and designators", () => {
  test("every component is in exactly one block", () => {
    const counts = new Map<string, number>()
    for (const b of PEDAL.blocks) for (const id of b.componentIds) counts.set(id, (counts.get(id) ?? 0) + 1)
    expect(PEDAL.components.filter((c) => counts.get(c.id) !== 1).map((c) => c.id)).toEqual([])
    expect(PEDAL.components.filter((c) => blockOf(PEDAL, c.id) === null).map((c) => c.id)).toEqual([])
  })
  test("every component has exactly one designator, and no designator is used twice", () => {
    expect(Object.keys(DESIGNATORS).sort()).toEqual(PEDAL.components.map((c) => c.id).sort())
    const refs = Object.values(DESIGNATORS)
    expect(new Set(refs).size).toBe(refs.length)
  })
})

describe("provenance (Review Focus 4)", () => {
  test("every component cites a file:line or a ruling id, and every citation resolves", () => {
    expect(PEDAL.components.flatMap(provenanceProblems)).toEqual([])
  })
  const probe: Component = {
    id: "test_only_probe", kind: "resistor", parameters: { ohms: 1e3 }, pins: {},
    units: [{ name: "MAIN", pins: { a: { kind: "net", net: "A" }, b: { kind: "net", net: "B" } } }],
    provenance: { source: "" },
  }
  test("control: a component with an empty provenance fails", () => {
    expect(provenanceProblems(probe)).toEqual(['test_only_probe: provenance "" cites no file:line and no ruling id'])
  })
  test("control: a component with no provenance at all fails", () => {
    const bare: Component = { id: probe.id, kind: probe.kind, parameters: probe.parameters, pins: probe.pins, units: probe.units }
    expect(provenanceProblems(bare)).toEqual(['test_only_probe: provenance "" cites no file:line and no ruling id'])
  })
  test("control: a line past the end of a file, and a ruling that is not a heading, each fail", () => {
    expect(provenanceProblems({ ...probe, provenance: { source: "parts.md:99999; CR-PEDAL-NO-SUCH-RULING" } })).toEqual([
      expect.stringContaining("test_only_probe: cites parts.md:99999, past the file's"),
      "test_only_probe: cites ruling CR-PEDAL-NO-SUCH-RULING, which is not a heading in docs/h7-platform/decisions.md",
    ])
  })
  test("control: a sourced component passes", () => {
    expect(provenanceProblems({ ...probe, provenance: { source: "docs/h7-platform/parts.md:158; R-61" } })).toEqual([])
  })
})

describe("shared net names (inventory section 1.2; CR-PEDAL-NETS)", () => {
  test("a contract net is the contract's signal at its pin", () => {
    const pins = loadContract().pins
    for (const n of SHARED_NETS) {
      if (n.from.kind !== "contract") continue
      const pin = n.from.pin
      expect([n.net, pins.find((p) => p.pin === pin)?.signal]).toEqual([n.net, n.net])
    }
  })
  test("a document-named net appears, in the form the document writes it, on every line it cites", () => {
    for (const n of SHARED_NETS) {
      if (n.from.kind !== "document") continue
      for (const cite of n.from.lines) {
        const [file, line] = cite.split(":")
        const text = fs.readFileSync(path.join(REPO, file ?? ""), "utf8").split("\n")[Number(line) - 1] ?? ""
        expect([n.net, cite, text.includes(n.from.written)]).toEqual([n.net, cite, true])
      }
    }
  })
  test("every ruled net is named in CR-PEDAL-NETS, a controller ruling with its costs", () => {
    const body = entry("CR-PEDAL-NETS")
    expect(body).toContain("Controller ruling (the owner may override)")
    expect(body).toContain("Costs if wrong")
    const ruled = SHARED_NETS.filter((n) => n.from.kind === "ruling")
    expect(ruled.length).toBeGreaterThan(0)
    for (const n of ruled) expect([n.net, body.includes(`\`${n.net}\``)]).toEqual([n.net, true])
  })
  test("each net is listed once, and names only ruled blocks", () => {
    const names = SHARED_NETS.map((n) => n.net)
    expect(new Set(names).size).toBe(names.length)
    const ruled = new Set(PEDAL_BLOCKS.map((b) => b.prefix))
    for (const n of SHARED_NETS) for (const b of n.blocks) expect([n.net, b, ruled.has(b)]).toEqual([n.net, b, true])
  })
  test("every contract signal is a shared net carried by the interface block", () => {
    const signals = new Set(loadContract().pins.flatMap((p) => (p.signal === null ? [] : [p.signal])))
    for (const s of signals) {
      const n = SHARED_NETS.find((x) => x.net === s)
      expect([s, n?.from.kind, n?.blocks.includes("interface")]).toEqual([s, "contract", true])
    }
  })
  test("contractNet refuses a name the contract does not give", () => {
    expect(contractNet("RELAY_EN")).toBe("RELAY_EN")
    expect(() => contractNet("RELAY_ENABLE")).toThrow(/RELAY_ENABLE/)
  })
})

describe("symbols and pages", () => {
  test("every part names a symbol that exists and numbers every pin as the symbol does", () => {
    expect(PEDAL.components.flatMap((c) => symbolProblems(c, PIN_NUMBERS, DATASHEET_PIN_NAMES))).toEqual([])
  })
  test("every block lowers to a page, every part on exactly one page, at the model's value", () => {
    const pages = drawingPages()
    expect(pages.map((p) => p.block).sort()).toEqual(PEDAL.blocks.map((b) => b.prefix).sort())
    expect(pages.flatMap((p) => p.intent.parts.map((x) => x.ref)).sort()).toEqual(Object.values(DESIGNATORS).sort())
    const byRef = new Map(PEDAL.components.map((c): [string, Component] => [DESIGNATORS[c.id] ?? "?", c]))
    for (const p of pages) {
      for (const part of p.intent.parts) {
        const c = byRef.get(part.ref)
        if (c === undefined) throw new Error(`page ${p.block} draws ${part.ref}, which the model has no part for`)
        expect([part.ref, part.value]).toEqual([part.ref, valueFor(c)])
      }
    }
  })
})
