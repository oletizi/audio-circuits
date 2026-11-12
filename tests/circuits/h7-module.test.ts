/**
 * The h7 processor module as a whole (H7 module plan, Task 6): the board's `make check` test
 * (`boards/h7-module`, kind "pcb"). Each block on its own is `./h7-module-blocks.test.ts`.
 *
 * What is held here: the module validates; its headers match the 40-pin contract (G4); all 176 MCU
 * pins are accounted for, every required pin on its net, and only unused GPIOs NC; every component
 * is in exactly one block and has exactly one designator; the 3V3 capacitance sum is within R-50's
 * 150 uF; the VDDA values are Task 3's constant; every symbol and pin number checks; every block page
 * lowers, within 40 symbols except the MCU's.
 */
import { describe, expect, test } from "bun:test"
import { NC } from "../../lib/model/index.ts"
import { blockOf } from "../../lib/model/include.ts"
import type { Component, Network } from "../../lib/model/index.ts"
import { valueFor } from "../../lib/kicad/value-notation.ts"
import { checkInterface } from "../../circuits/h7-platform/interface-check.ts"
import { assertModuleCapacitanceWithinLimit, moduleCapacitance3v3 } from "../../circuits/h7-platform/module-3v3-budget.ts"
import { DESIGNATORS, PAGE_GROUPS, PIN_NUMBERS, drawingPages, h7Module } from "../../circuits/h7-platform/module-board.ts"
import { VDDA_RULED } from "../../circuits/h7-platform/vdda-noise.ts"
import { EXPECTED_NC_PORTS, mcuNcPorts, mcuPinProblems, symbolProblems, withPin } from "./h7-module-checks.ts"

const MODULE = h7Module()

function only(id: string): Component {
  const c = MODULE.components.find((x) => x.id === id)
  if (c === undefined) throw new Error(`the module has no "${id}"`)
  return c
}

function netsOf(c: Component): string[] {
  return c.units.flatMap((u) => Object.values(u.pins)).map((x) => (x.kind === "net" ? x.net : "NC")).sort()
}

function number(c: Component, key: string): number {
  const v = Reflect.get(c.parameters, key)
  if (typeof v !== "number") throw new Error(`${c.id} has no ${key}`)
  return v
}

describe("h7 module", () => {
  test("the module validates", () => {
    expect(() => h7Module()).not.toThrow()
  })

  test("the module's headers match the contract (G4)", () => {
    const report = checkInterface(MODULE, "module", { J_MOD_A: "interface_j_mod_a", J_MOD_B: "interface_j_mod_b" })
    expect(report.mismatches).toEqual([])
    // The module side carries no protection part: these are the pedal's (architecture.md section 4.8).
    expect(report.protectionUnchecked).toEqual([31, 32, 33, 34, 35, 36, 37])
  })
})

describe("U_MCU's 176 pins", () => {
  const mcu = only("mcu_u_mcu")
  test("every pin has an entry, and every required pin is on the net its function implies", () => {
    expect(mcuPinProblems(mcu)).toEqual([])
  })
  test("a missing pin entry fails", () => {
    expect(mcuPinProblems(withPin(mcu, "176", undefined))).toEqual(["pin 176 (PI7) has no entry"])
  })
  test("control: PH5 (FMC_SDNWE) marked NC fails", () => {
    expect(mcuPinProblems(withPin(mcu, "46", NC))).toEqual(["pin 46 (PH5) must be on SDRAM_NWE, found NC"])
  })
  test("an interface pin (PB12, SPARE1) marked NC fails", () => {
    expect(mcuPinProblems(withPin(mcu, "92", NC))).toEqual(["pin 92 (PB12) must be on SPARE1, found NC"])
  })
  test("a GPIO nothing uses but given a net fails", () => {
    expect(mcuPinProblems(withPin(mcu, "1", { kind: "net", net: "GND" }))).toEqual(["pin 1 (PE2) serves no function and must be NC (CORE-27), found GND"])
  })
  test("every other pin is an NC GPIO, listed exactly", () => {
    expect(mcuNcPorts(mcu)).toEqual([...EXPECTED_NC_PORTS])
  })
  test("VSSA is joined to GND through the 0 ohm and nothing else", () => {
    const onVssa = MODULE.components.filter((c) => c.kind !== "ic" && netsOf(c).includes("VSSA") && netsOf(c).includes("GND"))
    expect(onVssa.map((c) => c.id)).toEqual(["vdda_r_vssa"])
    expect(number(only("vdda_r_vssa"), "ohms")).toBe(0)
  })
})

describe("blocks and designators", () => {
  test("every component is in exactly one block", () => {
    const counts = new Map<string, number>()
    for (const b of MODULE.blocks) for (const id of b.componentIds) counts.set(id, (counts.get(id) ?? 0) + 1)
    expect(MODULE.components.filter((c) => counts.get(c.id) !== 1).map((c) => c.id)).toEqual([])
    expect(MODULE.components.filter((c) => blockOf(MODULE, c.id) === null)).toEqual([])
  })
  test("every component has exactly one designator, and no designator is used twice", () => {
    expect(Object.keys(DESIGNATORS).sort()).toEqual(MODULE.components.map((c) => c.id).sort())
    const refs = Object.values(DESIGNATORS)
    expect(new Set(refs).size).toBe(refs.length)
  })
  test("twelve blocks, each a page with a caption", () => {
    expect(MODULE.blocks.map((b) => b.prefix).sort()).toEqual(Object.keys(PAGE_GROUPS).sort())
    expect(MODULE.blocks).toHaveLength(12)
    expect(MODULE.components).toHaveLength(94)
  })
  test("no block holds more than 40 symbols, except the MCU, which is one", () => {
    for (const b of MODULE.blocks) {
      if (b.prefix === "mcu") expect(b.componentIds).toEqual(["mcu_u_mcu"])
      else expect([b.prefix, b.componentIds.length <= 40]).toEqual([b.prefix, true])
    }
  })
})

describe("the 3V3 capacitance (R-50, CR-MODULE-3V3-SUM)", () => {
  test("the sum is within 150 uF: 116.8 uF over 39 capacitors", () => {
    const sum = assertModuleCapacitanceWithinLimit(MODULE)
    expect(sum.total_F * 1e6).toBeCloseTo(116.8, 6)
    expect(sum.entries).toHaveLength(39)
  })
  test("the VDDA bank and damping leg are 42.2 uF of it, behind FB_VDDA", () => {
    const vdda = moduleCapacitance3v3(MODULE).entries.filter((e) => e.via[0] === "vdda_fb_vdda" && e.id.startsWith("vdda_"))
    expect(vdda.reduce((s, e) => s + e.nominal_F, 0) * 1e6).toBeCloseTo(42.2, 9)
  })
  test("VCAP, BOOT0's capacitor, the HSE load caps, C_SS and the input network are outside the domain", () => {
    const ids = moduleCapacitance3v3(MODULE).entries.map((e) => e.id)
    for (const id of ["decoupling_c_vcap1", "reset_boot_c_boot0", "clock_c_hse_in", "power_c_ss", "power_c_bin1", "power_c_damp", "usb_dfu_c_vbus", "usb_dfu_c_shld"]) {
      expect([id, ids.includes(id)]).toEqual([id, false])
    }
  })
})

describe("VIN_MOD's capacitance as built (MODULE-POWER-PARTS-TO-MODEL; power.md:243)", () => {
  test("the input network is 67.1 uF nominal and 78.5 uF at most (aluminium +20 %, ceramics +10 %)", () => {
    // Every capacitor on the VIN side of the buck: on VIN_MOD or on the block's VIN_BUCK and damping nets.
    const vinSide = new Set(["VIN_MOD", "power_VIN_BUCK", "power_DAMP"])
    const caps = MODULE.components.filter((c) => c.kind === "capacitor" && netsOf(c).some((n) => vinSide.has(n)))
    expect(caps.map((c) => c.id).sort()).toEqual(["power_c_bin1", "power_c_bin2", "power_c_binhf", "power_c_damp"])
    const nominal = caps.reduce((s, c) => s + number(c, "farads"), 0)
    const most = caps.reduce((s, c) => s + number(c, "farads") * (c.id === "power_c_damp" ? 1.2 : 1.1), 0)
    expect(nominal * 1e6).toBeCloseTo(67.1, 9)
    expect(most * 1e6).toBeCloseTo(78.51, 9)
  })
})

describe("VDDA against Task 3's constant", () => {
  test("bank and leg values equal VDDA_RULED", () => {
    const bank = MODULE.components.filter((c) => c.id.startsWith("vdda_c_vdda_bank")).map((c) => number(c, "farads")).sort()
    expect(bank).toEqual(VDDA_RULED.bank.map((b) => b.nominal_F).sort())
    expect(number(only("vdda_r_vdda_damp"), "ohms")).toBe(VDDA_RULED.damping.r_ohm)
    expect(number(only("vdda_c_vdda_damp"), "farads")).toBe(VDDA_RULED.damping.c_F)
  })
  test("FB_VDDA is drawn with its rated impedance, not the analysis inductance (CR-MODULE-BEAD-VALUE)", () => {
    expect(valueFor(only("vdda_fb_vdda"))).toBe("220R@100MHz")
  })
})

describe("symbols and pin numbers", () => {
  test("every part names a symbol that exists and numbers every pin as the symbol does", () => {
    expect(MODULE.components.flatMap((c) => symbolProblems(c, PIN_NUMBERS))).toEqual([])
  })
})

describe("pages (design change C3)", () => {
  test("every block lowers to a page, every part on exactly one page", () => {
    const pages = drawingPages()
    expect(pages.map((p) => p.block).sort()).toEqual(MODULE.blocks.map((b) => b.prefix).sort())
    const refs = pages.flatMap((p) => p.intent.parts.map((x) => x.ref))
    expect(refs.sort()).toEqual(Object.values(DESIGNATORS).sort())
  })
  test("no page draws a part's value differently from the model", () => {
    const byRef = new Map(MODULE.components.map((c): [string, Network["components"][number]] => [DESIGNATORS[c.id] ?? "?", c]))
    for (const p of drawingPages()) {
      for (const part of p.intent.parts) {
        const c = byRef.get(part.ref)
        if (c === undefined) throw new Error(`page ${p.block} draws ${part.ref}, which the model has no part for`)
        expect([part.ref, part.value]).toEqual([part.ref, valueFor(c)])
      }
    }
  })
})
