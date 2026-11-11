/**
 * The h7 bring-up carrier model (H7 carrier plan, Task 5), its interface against the 40-pin
 * contract, its symbols and pin numbers against the KiCad libraries on disk, and its worst-case
 * draw on the two module rails in every supported state.
 *
 * This is also the board's `make check` test (`boards/h7-carrier`, kind "pcb").
 */
import { describe, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import type { Network } from "../../lib/model/index.ts"
import { pinNumberFor } from "../../lib/kicad/from-network.ts"
import { librarySymbols, splitLibId, symbolPins } from "../../lib/kicad/symbol-library.ts"
import { installedSymbolNames, installedSymbolPins } from "../kicad/symbol-library-disk.ts"
import { checkInterface } from "../../circuits/h7-platform/interface-check.ts"
import {
  DESIGNATORS, PIN_NUMBERS, drawingIntent, h7Carrier,
} from "../../circuits/h7-platform/carrier-board.ts"
import { DATASHEET_PIN_NAMES, FUSE_HOLD_CURRENT_A, PROJECT_SYMBOL_LIBRARY } from "../../circuits/h7-platform/parts.ts"
import { railDraw } from "../../circuits/h7-platform/rail-budget.ts"
import type { CarrierState } from "../../circuits/h7-platform/rail-budget.ts"

const PROJECT_NICKNAME = "h7-platform"

/** A symbol's pins, number -> name: the project library for `h7-platform:`, the installed KiCad otherwise. */
function pinsOf(libId: string): ReadonlyMap<string, string> {
  const { library, name } = splitLibId(libId)
  if (library === PROJECT_NICKNAME) {
    const block = librarySymbols(fs.readFileSync(PROJECT_SYMBOL_LIBRARY, "utf8")).get(name)
    if (block === undefined) throw new Error(`${PROJECT_SYMBOL_LIBRARY} defines no symbol "${name}"`)
    return new Map(symbolPins(block).map((p) => [p.number, p.name]))
  }
  return new Map(installedSymbolPins(libId).map((p) => [p.number, p.name]))
}

function allPinNames(c: Network["components"][number]): string[] {
  return [...Object.keys(c.pins), ...c.units.flatMap((u) => Object.keys(u.pins))]
}

const STATES: readonly CarrierState[] = [false, true].flatMap((dummy3v3d) =>
  [false, true].flatMap((dummyVrefA) =>
    [false, true].map((usbEnabled) => ({ dummy3v3d, dummyVrefA, usbEnabled }))))

describe("h7 bring-up carrier", () => {
  test("the carrier validates", () => {
    expect(() => h7Carrier()).not.toThrow()
  })

  test("the carrier's interface matches the contract", () => {
    const report = checkInterface(h7Carrier(), "carrier", { J_MOD_A: "j_mod_a", J_MOD_B: "j_mod_b" })
    expect(report.mismatches).toEqual([])
  })

  test("every component has a unique designator", () => {
    const ids = h7Carrier().components.map((c) => c.id).sort()
    expect(Object.keys(DESIGNATORS).sort()).toEqual(ids)
    const refs = Object.values(DESIGNATORS)
    expect(new Set(refs).size).toBe(refs.length)
  })

  test("every part names a symbol that exists in the installed KiCad libraries", () => {
    for (const c of h7Carrier().components) {
      const symbol = c.part?.symbol
      if (symbol === undefined) throw new Error(`component "${c.id}" has no part.symbol`)
      const { library, name } = splitLibId(symbol)
      if (library === PROJECT_NICKNAME) {
        // Spec C4: the project symbol, shown drawable by tests/circuits/h7-project-symbol.test.ts.
        expect(fs.readFileSync(PROJECT_SYMBOL_LIBRARY, "utf8")).toContain(`(symbol "${name}"`)
        continue
      }
      expect(installedSymbolNames(symbol).has(name)).toBe(true)
    }
  })

  test("every pin number names the symbol pin it claims", () => {
    let checked = 0
    for (const c of h7Carrier().components) {
      const symbol = c.part?.symbol ?? ""
      const pins = pinsOf(symbol)
      const numbers = allPinNames(c).map((pin) => pinNumberFor(c, pin, PIN_NUMBERS))
      // Every model pin lands on a symbol pin, and every symbol pin is listed by the model.
      expect([...numbers].sort()).toEqual([...pins.keys()].sort())
      if (c.kind === "ic") {
        const names = DATASHEET_PIN_NAMES[symbol]
        if (names === undefined) throw new Error(`no datasheet pin names recorded for ${symbol} (${c.id})`)
        for (const n of numbers) expect(`${n}=${pins.get(n)}`).toBe(`${n}=${names[n]}`)
      }
      checked += numbers.length
    }
    expect(checked).toBeGreaterThan(80)
  })

  test("every supported state keeps each rail within its limit", () => {
    expect(STATES).toHaveLength(8)
    const network = h7Carrier()
    for (const s of STATES) {
      expect(railDraw(network, "3V3_D", s)).toBeLessThanOrEqual(0.025)
      expect(railDraw(network, "VREF_A", s)).toBeLessThanOrEqual(0.010)
    }
  })

  test("dummy fitted with USB enabled is within the 3V3_D limit", () => {
    const network = h7Carrier()
    const worst = railDraw(network, "3V3_D", { dummy3v3d: true, dummyVrefA: true, usbEnabled: true })
    const usbOff = railDraw(network, "3V3_D", { dummy3v3d: true, dummyVrefA: true, usbEnabled: false })
    expect(worst).toBeLessThanOrEqual(0.025)
    expect(worst).toBeGreaterThan(usbOff)
  })

  test("a dummy load is read from the network, not a constant", () => {
    const network = h7Carrier()
    const s: CarrierState = { dummy3v3d: true, dummyVrefA: true, usbEnabled: false }
    const halved: Network = {
      ...network,
      components: network.components.map((c) =>
        c.id === "r_dummy_vref_a" && c.kind === "resistor" ? { ...c, parameters: { ohms: 714 } } : c),
    }
    expect(railDraw(halved, "VREF_A", s)).toBeLessThan(railDraw(network, "VREF_A", s) * 0.6)
  })

  test("a rail load with no stated current refuses", () => {
    const network = h7Carrier()
    const extended: Network = {
      ...network,
      components: [...network.components, {
        id: "unbudgeted_load", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: { kind: "net", net: "3V3_D" }, b: { kind: "net", net: "GND" } } }],
      }],
    }
    expect(() => railDraw(extended, "3V3_D", { dummy3v3d: false, dummyVrefA: false, usbEnabled: false }))
      .toThrow(/unbudgeted_load/)
  })

  test("the fuse's hold rating is its value on the drawing", () => {
    const fuseRef = DESIGNATORS["f_vin"]
    const fuse = drawingIntent().parts.find((p) => p.ref === fuseRef)
    if (fuse === undefined) throw new Error(`the intent has no part ${fuseRef} for f_vin`)
    expect(fuse.libId).toBe("Device:Fuse")
    expect(fuse.value).toContain(`${FUSE_HOLD_CURRENT_A}A`)
  })

  test("the USBLC6-2SC6 pin names agree with schematic-checklist.md USB-04", () => {
    const checklist = fs.readFileSync(path.join(import.meta.dir, "../../docs/h7-platform/schematic-checklist.md"), "utf8")
    const usb04 = checklist.split("\n").find((line) => line.includes("**USB-04**"))
    if (usb04 === undefined) throw new Error("schematic-checklist.md has no USB-04 line")
    const names = DATASHEET_PIN_NAMES["Power_Protection:USBLC6-2SC6"] ?? {}
    // USB-04: "D+ and D- through I/O1 (pins 1<->6) and I/O2 (pins 3<->4); pin 2 GND ...; pin 5 to VBUS".
    expect(usb04).toContain("I/O1 (pins 1\u21946)")
    expect(usb04).toContain("I/O2 (pins 3\u21944)")
    expect(usb04).toContain("pin 2 GND")
    expect(usb04).toContain("pin 5 to VBUS")
    expect(names).toEqual({ "1": "I/O1", "2": "GND", "3": "I/O2", "4": "I/O2", "5": "VBUS", "6": "I/O1" })
  })

  test("the intent lowers", () => {
    const intent = drawingIntent()
    expect(intent.parts).toHaveLength(h7Carrier().components.length)
    const claimed = [...intent.nets.flatMap((n) => n.pins), ...intent.noConnect]
    expect(new Set(claimed).size).toBe(claimed.length)
  })

  test("the project symbol library path is the committed one", () => {
    expect(path.basename(PROJECT_SYMBOL_LIBRARY)).toBe("h7-platform.kicad_sym")
    expect(fs.existsSync(PROJECT_SYMBOL_LIBRARY)).toBe(true)
  })
})
