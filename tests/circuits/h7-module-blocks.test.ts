/**
 * The h7-module's blocks, one at a time (H7 module plan, Task 6): each validates on its own, stays
 * within a Letter page's 40 symbols (the MCU excepted, being one component), names symbols that
 * exist, numbers every pin as its symbol does, and carries what its source lines state.
 *
 * The board as a whole - the interface, the 3V3 sum, designators, pages - is
 * `tests/circuits/h7-module.test.ts`.
 */
import { describe, expect, test } from "bun:test"
import { NC } from "../../lib/model/index.ts"
import type { Component, Network } from "../../lib/model/index.ts"
import { MODULE_PIN_NUMBERS } from "../../circuits/h7-platform/module/build.ts"
import { mcuBlock } from "../../circuits/h7-platform/module/mcu.ts"
import { mcuDecouplingBlock } from "../../circuits/h7-platform/module/mcu-decoupling.ts"
import { vddaBlock } from "../../circuits/h7-platform/module/vdda.ts"
import { VDDA_RULED } from "../../circuits/h7-platform/vdda-noise.ts"
import { mcuNcPorts, mcuPinProblems, symbolProblems, withPin } from "./h7-module-checks.ts"

const BLOCKS: Readonly<Record<string, () => Network>> = {
  mcu: mcuBlock,
  decoupling: mcuDecouplingBlock,
  vdda: vddaBlock,
}

const MAX_SYMBOLS = 40

function only(network: Network, id: string): Component {
  const c = network.components.find((x) => x.id === id)
  if (c === undefined) throw new Error(`no component "${id}"`)
  return c
}

/** Net of each pin of a component, pin -> net or "NC". */
function netsOf(c: Component): Record<string, string> {
  return Object.fromEntries(c.units.flatMap((u) => Object.entries(u.pins)).map(([p, x]) => [p, x.kind === "net" ? x.net : "NC"]))
}

for (const [name, build] of Object.entries(BLOCKS)) {
  describe(`block ${name}`, () => {
    test("validates", () => {
      expect(() => build()).not.toThrow()
    })
    test(`holds at most ${MAX_SYMBOLS} symbols, or is the MCU alone`, () => {
      const n = build().components.length
      if (name === "mcu") expect(n).toBe(1)
      else expect(n).toBeLessThanOrEqual(MAX_SYMBOLS)
    })
    test("every part's symbol exists and every pin is the symbol's", () => {
      expect(build().components.flatMap((c) => symbolProblems(c, MODULE_PIN_NUMBERS))).toEqual([])
    })
    test("every part cites its source", () => {
      expect(build().components.filter((c) => (c.provenance?.source ?? "").length === 0).map((c) => c.id)).toEqual([])
    })
  })
}

describe("U_MCU", () => {
  const mcu = only(mcuBlock(), "u_mcu")

  test("all 176 pins have an entry, and each required pin is on the net its function implies", () => {
    expect(mcuPinProblems(mcu)).toEqual([])
  })

  test("a missing pin entry fails", () => {
    expect(mcuPinProblems(withPin(mcu, "1", undefined))).toEqual(["pin 1 (PE2) has no entry"])
  })

  test("control: PH5 (FMC_SDNWE) marked NC fails", () => {
    expect(mcuPinProblems(withPin(mcu, "46", NC))).toEqual(["pin 46 (PH5) must be on SDRAM_NWE, found NC"])
  })

  test("a required supply pin marked NC fails, and NC on a supply pin is refused", () => {
    expect(mcuPinProblems(withPin(mcu, "15", NC))).toEqual(["pin 15 (VDD) must be on 3V3_D, found NC"])
  })

  test("every other pin is an NC GPIO; the list is exact, so a newly used pin left NC shows here", () => {
    expect(mcuNcPorts(mcu)).toEqual([
      "PE2", "PE3", "PE4", "PE5", "PE6", "PI8", "PC13", "PC14", "PC15", "PI9", "PI10", "PI11", "PC3_C", "PH4",
      "PC5", "PB0", "PB2", "PB11", "PH6", "PH7", "PH8", "PH9", "PH10", "PH11", "PH12", "PB13", "PD12", "PD13",
      "PG3", "PG6", "PG7", "PC6", "PC7", "PA8", "PA9", "PA10", "PH13", "PH14", "PH15", "PI0", "PI1", "PI2",
      "PI3", "PA15", "PD3", "PD4", "PD5", "PD6", "PD7", "PG12", "PG13", "PG14", "PB3", "PI4", "PI5", "PI6", "PI7",
    ])
  })

  test("the block's ports are exactly the nets its used pins carry", () => {
    const net = mcuBlock()
    const used = [...new Set(Object.values(netsOf(only(net, "u_mcu"))).filter((n) => n !== "NC"))].sort()
    expect(Object.keys(net.ports).sort()).toEqual(used)
    // 52 internal nets (MODULE_PINS) + 31 interface signals + 3V3_D, GND, VSSA, VREF_A, VCAP, NRST, BOOT0.
    expect(used).toHaveLength(52 + 31 + 7)
  })
})

/** Each capacitor's value (farads) and its two nets, sorted, as "value a|b". */
function capacitors(network: Network): string[] {
  return network.components.filter((c) => c.kind === "capacitor").map((c) => {
    const f = Reflect.get(c.parameters, "farads")
    const nets = Object.values(netsOf(c)).sort().join("|")
    return `${typeof f === "number" ? f.toExponential(2) : "?"} ${nets}`
  }).sort()
}

function count(list: readonly string[], item: string): number {
  return list.filter((x) => x === item).length
}

describe("MCU decoupling (processor-and-memory.md :31, :136-141; CORE-01 to CORE-06)", () => {
  const net = mcuDecouplingBlock()
  const caps = capacitors(net)

  test("100 nF at each of the 14 VDD pins, at VDD33USB and at VBAT, all on 3V3_D", () => {
    expect(count(caps, "1.00e-7 3V3_D|GND")).toBe(14 + 1 + 1)
  })
  test("one 4.7 uF for the package and VDD33USB's 1 uF", () => {
    expect(count(caps, "4.70e-6 3V3_D|GND")).toBe(1)
    expect(count(caps, "1.00e-6 3V3_D|GND")).toBe(1)
  })
  test("2.2 uF on each VCAP pin, on the joined VCAP net", () => {
    expect(count(caps, "2.20e-6 GND|VCAP")).toBe(2)
    expect(caps).toHaveLength(20)
  })
  test("bench pads on VCAP and VDDA (VREF_A) each with a GND pad, and a pogo pad on BOOT0 (D15)", () => {
    const pads = net.components.filter((c) => c.kind === "connector").map((c) => netsOf(c)["1"] ?? "?").sort()
    expect(pads).toEqual(["BOOT0", "GND", "GND", "VCAP", "VREF_A"])
  })
})

describe("VDDA (processor-and-memory.md:138; CR-MODULE-VDDA-BANK; CORE-07, CORE-08)", () => {
  const net = vddaBlock()
  const value = (c: Component, key: string): number => {
    const v = Reflect.get(c.parameters, key)
    if (typeof v !== "number") throw new Error(`${c.id} has no ${key}`)
    return v
  }

  test("the bank's values equal Task 3's constant, each from VREF_A to VSSA", () => {
    const bank = net.components.filter((c) => c.id.startsWith("c_vdda_bank"))
    expect(bank.map((c) => value(c, "farads")).sort()).toEqual(VDDA_RULED.bank.map((b) => b.nominal_F).sort())
    for (const c of bank) expect(Object.values(netsOf(c)).sort()).toEqual(["VREF_A", "VSSA"])
  })
  test("the damping leg is the constant's R in series with its C, across the bank", () => {
    const r = only(net, "r_vdda_damp")
    const c = only(net, "c_vdda_damp")
    expect(value(r, "ohms")).toBe(VDDA_RULED.damping.r_ohm)
    expect(value(c, "farads")).toBe(VDDA_RULED.damping.c_F)
    const rNets = Object.values(netsOf(r))
    const node = rNets.find((n) => n !== "VREF_A") ?? "missing"
    expect(rNets).toContain("VREF_A")
    expect(Object.values(netsOf(c)).sort()).toEqual([node, "VSSA"].sort())
  })
  test("FB_VDDA feeds VREF_A from 3V3_D; R_VSSA joins VSSA to GND through 0 ohm", () => {
    expect(Object.values(netsOf(only(net, "fb_vdda"))).sort()).toEqual(["3V3_D", "VREF_A"])
    expect(only(net, "fb_vdda").part?.mpn).toBe("BLM21PG221SN1D")
    const rv = only(net, "r_vssa")
    expect(value(rv, "ohms")).toBe(0)
    expect(Object.values(netsOf(rv)).sort()).toEqual(["GND", "VSSA"])
  })
})
