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
import { sdramBlock } from "../../circuits/h7-platform/module/sdram.ts"
import { VDDA_RULED } from "../../circuits/h7-platform/vdda-noise.ts"
import { qspiBlock } from "../../circuits/h7-platform/module/qspi.ts"
import { clockBlock } from "../../circuits/h7-platform/module/clock.ts"
import { resetBootBlock } from "../../circuits/h7-platform/module/reset-boot.ts"
import { swdBlock } from "../../circuits/h7-platform/module/swd.ts"
import { idStrapBlock } from "../../circuits/h7-platform/module/id-strap.ts"
import { mcuNcPorts, mcuPinProblems, symbolProblems, withPin } from "./h7-module-checks.ts"

const BLOCKS: Readonly<Record<string, () => Network>> = {
  id_strap: idStrapBlock,
  swd: swdBlock,
  reset_boot: resetBootBlock,
  clock: clockBlock,
  qspi: qspiBlock,
  mcu: mcuBlock,
  decoupling: mcuDecouplingBlock,
  vdda: vddaBlock,
  sdram: sdramBlock,
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

describe("SDRAM (schematic-checklist.md CORE-19 to CORE-21; processor-and-memory.md:107, :210)", () => {
  const net = sdramBlock()

  test("every W9825G6KH pin is on CORE-19's net, supplies on 3V3_D and GND, pin 40 NC", () => {
    const want: Record<string, string> = { "40": "NC" }
    const put = (pins: readonly number[], nets: readonly string[]): void => pins.forEach((p, i) => { want[String(p)] = nets[i] ?? "?" })
    const range = (prefix: string, from: number, to: number): string[] => Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${from + i}`)
    put([23, 24, 25, 26, 29, 30, 31, 32, 33, 34, 22, 35, 36], range("SDRAM_A", 0, 12))
    put([2, 4, 5, 7, 8, 10, 11, 13, 42, 44, 45, 47, 48, 50, 51, 53], range("SDRAM_D", 0, 15))
    put([20, 21, 15, 39, 16, 17, 18, 19, 37, 38],
      ["SDRAM_BA0", "SDRAM_BA1", "SDRAM_NBL0", "SDRAM_NBL1", "SDRAM_NWE", "SDRAM_NCAS", "SDRAM_NRAS", "SDRAM_NE", "SDRAM_CKE", "SDRAM_CLK"])
    put([1, 14, 27, 3, 9, 43, 49], Array<string>(7).fill("3V3_D"))
    put([28, 41, 54, 6, 12, 46, 52], Array<string>(7).fill("GND"))
    expect(netsOf(only(net, "u_sdram"))).toEqual(want)
  })
  test("100 nF on each of the 7 VDD and VDDQ pins, and 10 k from SDRAM_NE to 3V3_D", () => {
    expect(count(capacitors(net), "1.00e-7 3V3_D|GND")).toBe(7)
    expect(capacitors(net)).toHaveLength(7)
    const r = only(net, "r_sdram_ne_pullup")
    expect(Reflect.get(r.parameters, "ohms")).toBe(10_000)
    expect(Object.values(netsOf(r)).sort()).toEqual(["3V3_D", "SDRAM_NE"])
  })
})

describe("QSPI flash (schematic-checklist.md CORE-23; processor-and-memory.md:258)", () => {
  const net = qspiBlock()
  test("W25Q128JVSIQ pins as CORE-23 lists them", () => {
    expect(netsOf(only(net, "u_flash"))).toEqual({
      "1": "FLASH_NCS", "2": "FLASH_IO1", "3": "FLASH_IO2", "4": "GND",
      "5": "FLASH_IO0", "6": "FLASH_CLK", "7": "FLASH_IO3", "8": "3V3_D",
    })
  })
  test("10 k pull-up on its chip select and 100 nF at VCC", () => {
    const r = only(net, "r_flash_ncs_pullup")
    expect(Reflect.get(r.parameters, "ohms")).toBe(10_000)
    expect(Object.values(netsOf(r)).sort()).toEqual(["3V3_D", "FLASH_NCS"])
    expect(capacitors(net)).toEqual(["1.00e-7 3V3_D|GND"])
  })
})

describe("HSE (processor-and-memory.md section 3; CORE-13, CORE-14; CR-MODULE-HSE-LOAD)", () => {
  const net = clockBlock()
  test("Y_HSE between HSE_IN (PH0) and HSE_OUT (PH1), both case pads to GND", () => {
    expect(netsOf(only(net, "y_hse"))).toEqual({ "1": "HSE_IN", "2": "GND", "3": "HSE_OUT", "4": "GND" })
    expect(only(net, "y_hse").part?.mpn).toBe("NX3225GA-25.000M-STD-CRG-2")
  })
  test("8 pF from each crystal pin to GND, and no series resistor", () => {
    expect(capacitors(net)).toEqual(["8.00e-12 GND|HSE_IN", "8.00e-12 GND|HSE_OUT"])
    expect(net.components.filter((c) => c.kind === "resistor")).toEqual([])
  })
})

describe("Reset and boot (processor-and-memory.md:264-265; CORE-10 to CORE-12)", () => {
  const net = resetBootBlock()
  const nets = (id: string): string[] => Object.values(netsOf(only(net, id))).sort()
  test("U_SUP: pin 1 GND, pin 2 RESET to NRST, pin 3 VDD on 3V3_D, with 100 nF from pin 3 to pin 1", () => {
    expect(netsOf(only(net, "u_sup"))).toEqual({ "1": "GND", "2": "NRST", "3": "3V3_D" })
    expect(only(net, "u_sup").part?.mpn).toBe("TLV803EA30DBZR")
    expect(nets("c_sup")).toEqual(["3V3_D", "GND"])
  })
  test("NRST: 10 k pull-up, 100 nF to GND, the RESET button to GND", () => {
    expect(Reflect.get(only(net, "r_nrst_pullup").parameters, "ohms")).toBe(10_000)
    expect(nets("r_nrst_pullup")).toEqual(["3V3_D", "NRST"])
    expect(nets("c_nrst")).toEqual(["GND", "NRST"])
    expect(nets("sw_reset")).toEqual(["GND", "NRST"])
  })
  test("BOOT0: 4.7 k pull-down, 100 nF to GND, the BOOT button to 3V3_D", () => {
    expect(Reflect.get(only(net, "r_boot0_pulldown").parameters, "ohms")).toBe(4_700)
    expect(nets("r_boot0_pulldown")).toEqual(["BOOT0", "GND"])
    expect(nets("c_boot0")).toEqual(["BOOT0", "GND"])
    expect(nets("sw_boot")).toEqual(["3V3_D", "BOOT0"])
    expect(capacitors(net)).toEqual(["1.00e-7 3V3_D|GND", "1.00e-7 BOOT0|GND", "1.00e-7 GND|NRST"])
  })
})

describe("SWD (processor-and-memory.md:266; USB-06; CR-MODULE-SWD-HEADER)", () => {
  const net = swdBlock()
  test("J_SWD is USB-06's pinout", () => {
    expect(netsOf(only(net, "j_swd"))).toEqual({
      "1": "3V3_D", "2": "SWDIO", "3": "GND", "4": "SWCLK", "5": "GND",
      "6": "NC", "7": "NC", "8": "NC", "9": "GND", "10": "NRST",
    })
  })
  test("pogo pads for SWDIO, SWCLK, NRST, the module's 3V3 and GND", () => {
    const pads = net.components.filter((c) => c.id.startsWith("tp_")).map((c) => netsOf(c)["1"] ?? "?").sort()
    expect(pads).toEqual(["3V3_D", "GND", "NRST", "SWCLK", "SWDIO"])
  })
})

describe("ID strap (processor-and-memory.md:277; CR-MODULE-ID-STRAP-PIN, CR-MODULE-ID-STRAP-VALUES)", () => {
  const net = idStrapBlock()
  const nets = (id: string): string[] => Object.values(netsOf(only(net, id))).sort()
  test("20.0 k from VDDA (VREF_A) to the strap pin, 2.49 k to GND, 100 nF at the pin", () => {
    expect(Reflect.get(only(net, "r_id_top").parameters, "ohms")).toBe(20_000)
    expect(nets("r_id_top")).toEqual(["MODULE_ID_STRAP", "VREF_A"])
    expect(Reflect.get(only(net, "r_id_bottom").parameters, "ohms")).toBe(2_490)
    expect(nets("r_id_bottom")).toEqual(["GND", "MODULE_ID_STRAP"])
    expect(capacitors(net)).toEqual(["1.00e-7 GND|MODULE_ID_STRAP"])
  })
})
