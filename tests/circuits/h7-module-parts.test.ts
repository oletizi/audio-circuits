/**
 * The processor module's part choices (H7 module plan, Task 4): each part's KiCad symbol under
 * spec C4, the datasheet pin tables the two C4 decisions rest on (W9825G6KH, TLV803E), the
 * controller rulings that fix values, and the module's 3V3 capacitance sum (ruling R-50).
 *
 * The datasheet tables below are transcribed from the documents named beside each, read as PDFs
 * (not from memory), independently of `circuits/h7-platform/module-parts.ts`.
 */
import { describe, expect, test } from "bun:test"
import fs from "node:fs"
import { circuit } from "../../lib/model/index.ts"
import type { Component, Network } from "../../lib/model/index.ts"
import { librarySymbols, splitLibId, symbolPins } from "../../lib/kicad/symbol-library.ts"
import { installedSymbolNames, installedSymbolPins } from "../kicad/symbol-library-disk.ts"
import { loadPinData, portName } from "../../circuits/h7-platform/st-pin-data.ts"
import { PROJECT_SYMBOL_LIBRARY } from "../../circuits/h7-platform/parts.ts"
import { VDDA_RULED } from "../../circuits/h7-platform/vdda-noise.ts"
import {
  DATASHEET_PIN_NAMES, DFU_ESD_WIRING, DFU_VBUS_CAP_F, ID_STRAP, HSE_LOAD_CAP_F, MODULE_PARTS, SDRAM,
  SUPERVISOR, SWD_HEADER_CONNECTIONS, SWD_HEADER_SYMBOL,
} from "../../circuits/h7-platform/module-parts.ts"
import {
  MODULE_3V3_LIMIT_F, MODULE_3V3_NET, assertModuleCapacitanceWithinLimit, moduleCapacitance3v3,
} from "../../circuits/h7-platform/module-3v3-budget.ts"

/** Winbond W9825G6KH Rev. A04 (20 Mar 2017) p. 4 section 4 Pin Configuration and p. 5 section 5; the
 * overbarred names (WE, CAS, RAS, CS) are overbarred in the p. 4 figure, written ~{} as KiCad does. */
const W9825G6KH: Readonly<Record<string, string>> = {
  "1": "VDD", "2": "DQ0", "3": "VDDQ", "4": "DQ1", "5": "DQ2", "6": "VSSQ", "7": "DQ3", "8": "DQ4",
  "9": "VDDQ", "10": "DQ5", "11": "DQ6", "12": "VSSQ", "13": "DQ7", "14": "VDD", "15": "LDQM",
  "16": "~{WE}", "17": "~{CAS}", "18": "~{RAS}", "19": "~{CS}", "20": "BS0", "21": "BS1",
  "22": "A10/AP", "23": "A0", "24": "A1", "25": "A2", "26": "A3", "27": "VDD", "28": "VSS",
  "29": "A4", "30": "A5", "31": "A6", "32": "A7", "33": "A8", "34": "A9", "35": "A11", "36": "A12",
  "37": "CKE", "38": "CLK", "39": "UDQM", "40": "NC", "41": "VSS", "42": "DQ8", "43": "VDDQ",
  "44": "DQ9", "45": "DQ10", "46": "VSSQ", "47": "DQ11", "48": "DQ12", "49": "VDDQ", "50": "DQ13",
  "51": "DQ14", "52": "VSSQ", "53": "DQ15", "54": "VSS",
}

/** TI SLVSES2J (rev. May 2021) p. 5 Table 6-1, column "DCK, DBZ" (a part number with no R or V
 * pinout letter before DBZ, here TLV803EA30DBZR; p. 4 Figure 6-1, "Pin 1 = GND"; section 12.1
 * Table 12-1's worked example TLV803EA29DBZR reads "Pin 1 = GND"). RESET is overbarred (active low). */
const TLV803E_DBZ: Readonly<Record<string, string>> = { "1": "GND", "2": "~{RESET}", "3": "VDD" }

function pinsOf(libId: string): ReadonlyMap<string, string> {
  const { library, name } = splitLibId(libId)
  if (library === "h7-platform") {
    const block = librarySymbols(fs.readFileSync(PROJECT_SYMBOL_LIBRARY, "utf8")).get(name)
    if (block === undefined) throw new Error(`${PROJECT_SYMBOL_LIBRARY} defines no symbol "${name}"`)
    return new Map(symbolPins(block).map((p) => [p.number, p.name]))
  }
  return new Map(installedSymbolPins(libId).map((p) => [p.number, p.name]))
}

function mismatches(table: Readonly<Record<string, string>>, libId: string): string[] {
  const pins = pinsOf(libId)
  const numbers = new Set([...Object.keys(table), ...pins.keys()])
  return [...numbers].filter((n) => table[n] !== pins.get(n)).sort((a, b) => Number(a) - Number(b))
}

describe("module part symbols", () => {
  test("every module part's symbol exists, stock on disk or in the project library", () => {
    expect(Object.keys(MODULE_PARTS).length).toBeGreaterThanOrEqual(12)
    for (const [role, part] of Object.entries(MODULE_PARTS)) {
      if (part.symbol === undefined) throw new Error(`module part ${role} has no symbol`)
      const { library, name } = splitLibId(part.symbol)
      if (library === "h7-platform") {
        expect(fs.readFileSync(PROJECT_SYMBOL_LIBRARY, "utf8")).toContain(`(symbol "${name}"`)
      } else {
        expect(installedSymbolNames(part.symbol).has(name)).toBe(true)
      }
    }
  })

  test("the SDRAM: no stock Memory_RAM symbol matches the W9825G6KH datasheet, so a project symbol is used", () => {
    // CR-MODULE-SDRAM-SYMBOL: C4 allows a stock symbol only on a pin-for-pin match, 54 pins by name and
    // number, and that is a condition on the whole library, so every Memory_RAM symbol is compared.
    const library = "Memory_RAM"
    const names = [...installedSymbolNames(`${library}:x`)]
    expect(names.length).toBeGreaterThan(50)
    // A multi-unit symbol (which `symbolPins` refuses) splits its pins across drawn units, so it is not the
    // one 54-pin body C4 compares; each such symbol is counted here and left out of the pin comparison.
    const multiUnit = names.filter((n) => {
      try { pinsOf(`${library}:${n}`); return false } catch (e) { return e instanceof Error && /multi-unit/.test(e.message) }
    })
    expect(multiUnit.length).toBeGreaterThan(0)
    const matching = names.filter((n) => !multiUnit.includes(n) && mismatches(W9825G6KH, `${library}:${n}`).length === 0)
    expect(matching).toEqual([])
    // The closest candidates and where they differ.
    expect(mismatches(W9825G6KH, `${library}:MT48LC16M16A2TG`)).toEqual(["15", "20", "21", "22", "39"])
    for (const n of ["W9812G6KH-5", "W9812G6KH-6", "W9812G6KH-6I", "W9812G6KH-75"]) {
      expect(mismatches(W9825G6KH, `${library}:${n}`)).toEqual(["36"])
    }
    expect(pinsOf(`${library}:W9812G6KH-6I`).get("36")).toBe("NC")
    expect(SDRAM.symbol).toBe("h7-platform:W9825G6KH")
    expect(SDRAM.mpn).toBe("W9825G6KH-6I")
    expect(mismatches(W9825G6KH, "h7-platform:W9825G6KH")).toEqual([])
  })

  test("the supervisor: the first Power_Supervisor symbol matching the TLV803E pin table is used", () => {
    // CR-MODULE-SUPERVISOR-SYMBOL: library order, exact name and number.
    const library = "Power_Supervisor"
    const matching = [...installedSymbolNames(`${library}:x`)]
      .filter((name) => mismatches(TLV803E_DBZ, `${library}:${name}`).length === 0)
    expect(matching[0]).toBe("TPS3839DBZ")
    expect(SUPERVISOR.symbol).toBe(`${library}:${matching[0]}`)
    expect(SUPERVISOR.mpn).toBe("TLV803EA30DBZR")
  })

  test("the recorded datasheet pin names agree with every ic symbol", () => {
    let checked = 0
    for (const [symbol, names] of Object.entries(DATASHEET_PIN_NAMES)) {
      expect(mismatches(names, symbol)).toEqual([])
      checked += Object.keys(names).length
    }
    expect(checked).toBe(54 + 3 + 8 + 8 + 6)
    expect(Object.keys(DATASHEET_PIN_NAMES)).toContain("Power_Supervisor:TPS3839DBZ")
    expect(Object.keys(DATASHEET_PIN_NAMES)).toContain("h7-platform:W9825G6KH")
  })

  test("the MCU symbol's pin numbers are ST's LQFP-176 positions", () => {
    const symbol = MODULE_PARTS["mcu"]?.symbol
    if (symbol === undefined) throw new Error("no MCU part")
    const pins = pinsOf(symbol)
    for (const p of loadPinData().pins) {
      const name = pins.get(String(p.position))
      if (name === undefined) throw new Error(`symbol has no pin ${p.position} (${p.name})`)
      expect(name.startsWith(portName(p)) || name === p.name).toBe(true)
    }
    expect(pins.size).toBe(176)
  })
})

describe("controller rulings", () => {
  test("CR-MODULE-USB-ESD: D+ and D- as USB-04 wires them, VBUS pin to the socket's VBUS", () => {
    // USB-04 (schematic-checklist.md): D+ and D- through I/O1 (pins 1-6) and I/O2 (pins 3-4), pin 2
    // GND, pin 5 VBUS with 100 nF to GND at the part.
    expect(DFU_ESD_WIRING).toEqual({
      "1": "DFU_CONN_DP", "6": "DFU_USB_DP", "3": "DFU_CONN_DM", "4": "DFU_USB_DM", "2": "GND", "5": "DFU_VBUS",
    })
    expect(DFU_VBUS_CAP_F).toBe(100e-9)
    expect(MODULE_PARTS["dfuEsd"]?.symbol).toBe("Power_Protection:USBLC6-2SC6")
  })

  test("CR-MODULE-ID-STRAP-VALUES: the HW_REV scheme's revision 1 row", () => {
    // analog.md section 11 table, revision 1: R_top 20.0 kohm, R_bot 2.49 kohm, ratio 0.1107, code 453.
    expect(ID_STRAP.topOhm).toBe(20000)
    expect(ID_STRAP.bottomOhm).toBe(2490)
    expect(ID_STRAP.bottomOhm / (ID_STRAP.topOhm + ID_STRAP.bottomOhm)).toBeCloseTo(0.1107, 4)
    expect(ID_STRAP.pinCapF).toBe(100e-9)
  })

  test("the HSE load capacitors are 8 pF each (processor-and-memory.md section 3)", () => {
    expect(HSE_LOAD_CAP_F).toBe(8e-12)
  })

  test("the SWD header transcribes USB-06 onto Conn_ARM_JTAG_SWD_10", () => {
    expect(SWD_HEADER_SYMBOL).toBe("Connector:Conn_ARM_JTAG_SWD_10")
    const names = pinsOf(SWD_HEADER_SYMBOL)
    expect([...names.keys()].sort((a, b) => Number(a) - Number(b)))
      .toEqual(Object.keys(SWD_HEADER_CONNECTIONS).sort((a, b) => Number(a) - Number(b)))
    const net = (n: string): string => {
      const c = SWD_HEADER_CONNECTIONS[n]
      if (c === undefined) throw new Error(`no connection for pin ${n}`)
      return c.kind === "net" ? c.net : "nc"
    }
    // USB-06: 1 VTref = module 3V3; 2 SWDIO; 3, 5 GND; 4 SWCLK; 6 SWO nc; 7 key nc; 8 nc; 9 GNDDetect GND; 10 NRST.
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => net(String(n)))).toEqual([
      MODULE_3V3_NET, "SWDIO", "GND", "SWCLK", "GND", "nc", "nc", "nc", "GND", "NRST",
    ])
  })
})

/** A small module-shaped fixture: the output cap, FB_VDDA with the ruled bank and leg, an MCU whose
 * VCAP the MCU's own regulator charges, and a cap reachable only from GND. */
function fixture(): ReturnType<typeof circuit> {
  const b = circuit()
    .capacitor("c_bout", "22u", { a: MODULE_3V3_NET, b: "GND" })
    .inductor("fb_vdda", "1u", { a: MODULE_3V3_NET, b: "VDDA" })
    .resistor("r_damp", "0.3", { a: "VDDA", b: "DAMP" })
    .capacitor("c_damp", "22u", { a: "DAMP", b: "GND" })
    .ic("mcu", { VDD: MODULE_3V3_NET, VDDA: "VDDA", VCAP: "VCAP", VSS: "GND" })
    .capacitor("c_vcap", "2u2", { a: "VCAP", b: "GND" })
    .capacitor("c_gnd_only", "47u", { a: "GND", b: "ISOLATED" })
    .resistor("r_isolated", "1k", { a: "ISOLATED", b: "GND" })
    // A pull-down from a domain net to GND (as the feedback divider, BOOT0's 4.7k and the strap's bottom
    // resistor are): without the walk's GND stop, GND joins the domain and r_isolated leads on to
    // ISOLATED, so c_gnd_only (and every capacitor to GND) would count.
    .resistor("r_pull", "10k", { a: "VDDA", b: "GND" })
  VDDA_RULED.bank.forEach((c, i) =>
    b.capacitor(`c_vdda_${i}`, `${c.nominal_F}`, { a: "VDDA", b: "GND" }))
  return b
}

function withLoad(...extra: readonly Component[]): Network {
  const base = fixture().done()
  return { ...base, components: [...base.components, ...extra] }
}

function cap(id: string, farads: number, a: string, b: string): Component {
  return {
    id, kind: "capacitor", parameters: { farads }, pins: {},
    units: [{ name: "MAIN", pins: { a: { kind: "net", net: a }, b: { kind: "net", net: b } } }],
  }
}

describe("the 3V3 capacitance sum", () => {
  const BASE_F = 22e-6 + 22e-6 + 2 * 10e-6 + 2 * 100e-9

  test("it counts the output cap, the bank and the leg through the bead and the 0.30 ohm resistor", () => {
    const sum = moduleCapacitance3v3(fixture().done())
    expect(sum.total_F).toBeCloseTo(BASE_F, 12)
    const byId = new Map(sum.entries.map((e) => [e.id, e]))
    expect(byId.get("c_bout")?.via).toEqual([])
    expect(byId.get("c_damp")?.via).toEqual(["fb_vdda", "r_damp"])
    expect(byId.get("c_vdda_0")?.via).toEqual(["fb_vdda"])
    expect(sum.total_F).toBeLessThanOrEqual(MODULE_3V3_LIMIT_F)
    expect(() => assertModuleCapacitanceWithinLimit(fixture().done())).not.toThrow()
  })

  test("the VDDA bank and leg of CR-MODULE-VDDA-BANK are 42.2 uF of it", () => {
    const sum = moduleCapacitance3v3(fixture().done())
    const vdda = sum.entries.filter((e) => e.via.includes("fb_vdda")).reduce((s, e) => s + e.nominal_F, 0)
    expect(vdda).toBeCloseTo(42.2e-6, 12)
  })

  test("the walk stops at GND and at an ic: VCAP and a GND-only cap are not counted", () => {
    const sum = moduleCapacitance3v3(fixture().done())
    const ids = sum.entries.map((e) => e.id)
    expect(ids).not.toContain("c_vcap")
    expect(ids).not.toContain("c_gnd_only")
    // A cap reached only through an ic: the ic's output net carries 10 uF the buck does not charge.
    const thruIc = withLoad(
      { id: "u_x", kind: "ic", parameters: {}, pins: {}, units: [{ name: "MAIN", pins: {
        IN: { kind: "net", net: MODULE_3V3_NET }, OUT: { kind: "net", net: "X_OUT" } } }] },
      cap("c_x_out", 10e-6, "X_OUT", "GND"))
    expect(moduleCapacitance3v3(thruIc).total_F).toBeCloseTo(BASE_F, 12)
  })

  test("a capacitor behind a ferrite bead counts", () => {
    const behind = withLoad(
      { id: "fb_x", kind: "inductor", parameters: { henries: 1e-6 }, pins: {}, units: [{ name: "MAIN", pins: {
        a: { kind: "net", net: MODULE_3V3_NET }, b: { kind: "net", net: "FAR_L" } } }] },
      cap("c_far_l", 33e-6, "FAR_L", "GND"))
    const sum = moduleCapacitance3v3(behind)
    expect(sum.total_F).toBeCloseTo(BASE_F + 33e-6, 12)
    expect(sum.entries.find((e) => e.id === "c_far_l")?.via).toEqual(["fb_x"])
    const big = withLoad(...behind.components.filter((c) => c.id === "fb_x"), cap("c_far_l", 100e-6, "FAR_L", "GND"))
    expect(() => assertModuleCapacitanceWithinLimit(big)).toThrow(/150/)
  })

  test("a capacitor behind a series resistor counts", () => {
    const behind = withLoad(
      { id: "r_x", kind: "resistor", parameters: { ohms: 100 }, pins: {}, units: [{ name: "MAIN", pins: {
        a: { kind: "net", net: MODULE_3V3_NET }, b: { kind: "net", net: "FAR_R" } } }] },
      cap("c_far_r", 33e-6, "FAR_R", "GND"))
    const sum = moduleCapacitance3v3(behind)
    expect(sum.total_F).toBeCloseTo(BASE_F + 33e-6, 12)
    expect(sum.entries.find((e) => e.id === "c_far_r")?.via).toEqual(["r_x"])
    const big = withLoad(...behind.components.filter((c) => c.id === "r_x"), cap("c_far_r", 100e-6, "FAR_R", "GND"))
    expect(() => assertModuleCapacitanceWithinLimit(big)).toThrow(/150/)
  })

  test("a capacitor with both pins in the domain counts once", () => {
    const both = withLoad(cap("c_bst", 100e-9, MODULE_3V3_NET, "VDDA"))
    expect(moduleCapacitance3v3(both).entries.filter((e) => e.id === "c_bst")).toHaveLength(1)
  })

  test("the capacitance sum fails above 150 uF", () => {
    expect(() => assertModuleCapacitanceWithinLimit(withLoad(cap("c_extra", 100e-6, MODULE_3V3_NET, "GND"))))
      .toThrow(/150/)
  })

  test("the capacitance sum refuses an uncounted part on 3V3", () => {
    const diode: Component = {
      id: "d_tvs", kind: "diode", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { anode: { kind: "net", net: "GND" }, cathode: { kind: "net", net: MODULE_3V3_NET } } }],
    }
    expect(() => moduleCapacitance3v3(withLoad(diode))).toThrow(/d_tvs/)
    // Listed with a reason, it is a known non-capacitive load and is carried across.
    expect(moduleCapacitance3v3(withLoad(diode), { d_tvs: "test: stated as 0 pF" }).total_F)
      .toBeCloseTo(BASE_F, 12)
  })

  test("a capacitor with no value refuses", () => {
    const valueless: Component = {
      id: "c_blank", kind: "capacitor", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { a: { kind: "net", net: MODULE_3V3_NET }, b: { kind: "net", net: "GND" } } }],
    }
    expect(() => moduleCapacitance3v3(withLoad(valueless))).toThrow(/c_blank/)
  })

  test("a network with no 3V3 net refuses", () => {
    const none = circuit().capacitor("c1", "1u", { a: "A", b: "GND" }).resistor("r1", "1k", { a: "A", b: "GND" }).done()
    expect(() => moduleCapacitance3v3(none)).toThrow(new RegExp(MODULE_3V3_NET))
  })
})
