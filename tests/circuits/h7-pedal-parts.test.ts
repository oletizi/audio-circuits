/**
 * The pedal's part specs and symbols (h7 pedal pages plan, Task 2): every `ic`, `diode` and `opamp`
 * part's symbol matches its data sheet by pin name, number AND electrical type
 * (CR-PEDAL-PIN-MATCH); every multi-unit part numbers every unit; every part cites its source; the
 * project symbols are what their generator makes, and no installed symbol would have done.
 *
 * Independent cross-check of the transcriptions: each project symbol is compared with the stock
 * symbol it is made from, and the differences are asserted pin by pin. KiCad's librarians read the
 * same data sheets independently, so a slip in a table here shows up as an extra difference.
 */
import { describe, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { splitLibId } from "../../lib/kicad/symbol-library.ts"
import { PROJECT_SYMBOL_LIBRARY } from "../../circuits/h7-platform/parts.ts"
import { PEDAL_PIN_TABLES } from "../../circuits/h7-platform/pedal-pin-tables.ts"
import {
  DATASHEET_PIN_NAMES, DATASHEET_PIN_TYPES, PEDAL_PARTS, POTENTIOMETER_PIN_NUMBERS, TLV803EA29,
} from "../../circuits/h7-platform/pedal-parts.ts"
import { installedSymbolNames, installedSymbolPins } from "../kicad/symbol-library-disk.ts"
import { pinMismatches, pinTableOf, scanInstalled, unitPinsOf } from "./h7-pedal-symbols.ts"
import { PEDAL_PROJECT_SYMBOLS, committedSymbol, projectSymbolText } from "./h7-pedal-project-symbols.ts"

const CHECKED_KINDS = new Set(["ic", "diode", "opamp"])
const REPO = path.join(import.meta.dir, "../..")

function tableFor(key: string): Readonly<Record<string, { readonly name: string; readonly type: string }>> {
  const table = PEDAL_PIN_TABLES[key]
  if (table === undefined) throw new Error(`PEDAL_PIN_TABLES has no "${key}"`)
  return table.pins
}

describe("pedal part symbols", () => {
  test("every pedal part's symbol exists, stock on disk or in the project library", () => {
    expect(Object.keys(PEDAL_PARTS).length).toBeGreaterThanOrEqual(30)
    const library = fs.readFileSync(PROJECT_SYMBOL_LIBRARY, "utf8")
    for (const [key, entry] of Object.entries(PEDAL_PARTS)) {
      const symbol = entry.part.symbol
      if (symbol === undefined) throw new Error(`pedal part ${key} has no symbol`)
      const { library: nickname, name } = splitLibId(symbol)
      if (nickname === "h7-platform") expect(library).toContain(`(symbol "${name}"`)
      else expect(installedSymbolNames(symbol).has(name)).toBe(true)
    }
  })

  test("every ic, diode and op-amp part's symbol matches its data sheet by name, number and type", () => {
    let checked = 0
    for (const [key, entry] of Object.entries(PEDAL_PARTS)) {
      if (!CHECKED_KINDS.has(entry.kind)) continue
      const symbol = entry.part.symbol
      if (symbol === undefined) throw new Error(`pedal part ${key} has no symbol`)
      if (entry.table === undefined) throw new Error(`pedal part ${key} (${entry.kind}) names no data sheet table`)
      expect({ key, mismatches: pinMismatches(tableFor(entry.table), pinTableOf(symbol)) }).toEqual({ key, mismatches: [] })
      checked++
    }
    expect(checked).toBe(28)
  })

  test("the exported per-symbol tables agree with the part tables they come from", () => {
    for (const entry of Object.values(PEDAL_PARTS)) {
      const symbol = entry.part.symbol
      if (entry.table === undefined || symbol === undefined) continue
      const pins = tableFor(entry.table)
      expect(DATASHEET_PIN_NAMES[symbol]).toEqual(Object.fromEntries(Object.entries(pins).map(([n, p]) => [n, p.name])))
      expect(DATASHEET_PIN_TYPES[symbol]).toEqual(Object.fromEntries(Object.entries(pins).map(([n, p]) => [n, p.type])))
    }
  })

  test("control: TPS3839DBZ, the module's old stand-in, is rejected for U_CRST on its pin-2 type", () => {
    // The pedal's U_CRST is TLV803EA29DBZR (parts.md, "Codec local reset supervisor, U_CRST").
    const parts = fs.readFileSync(path.join(REPO, "docs/h7-platform/parts.md"), "utf8")
    const row = parts.split("\n").find((l) => l.includes("U_CRST"))
    expect(row).toContain("| TLV803EA29DBZR |")
    expect(TLV803EA29.mpn).toBe("TLV803EA29DBZR")
    expect(pinMismatches(tableFor("TLV803EA29"), pinTableOf("Power_Supervisor:TPS3839DBZ")))
      .toEqual(["2: type output, data sheet open_collector"])
    expect(pinMismatches(tableFor("TLV803EA29"), pinTableOf(TLV803EA29.symbol ?? ""))).toEqual([])
  })

  test("every multi-unit part declares symbolPins covering every unit of its symbol, once", () => {
    let multi = 0
    for (const [key, entry] of Object.entries(PEDAL_PARTS)) {
      const symbol = entry.part.symbol
      if (symbol === undefined) throw new Error(`pedal part ${key} has no symbol`)
      const units = unitPinsOf(symbol).filter((u) => u.unit > 0)
      if (units.length <= 1) continue
      multi++
      const declared = entry.part.symbolPins
      if (declared === undefined) throw new Error(`pedal part ${key}: ${symbol} has ${units.length} units and no symbolPins`)
      const entries = Object.values(declared).map((e) => [...Object.values(e)].sort())
      const symbolUnits = units.map((u) => u.pins.map((p) => p.number).sort())
      // Each symbolPins entry is exactly one unit's pins, and every unit is some entry.
      expect([...entries].sort()).toEqual([...symbolUnits].sort())
      expect(entries.flat().length).toBe(new Set(entries.flat()).size)
    }
    expect(multi).toBe(2)
  })

  test("every part's provenance cites a data sheet (document, revision, page) or a docs/h7-platform line", () => {
    const sheet = /(rev\.?|Rev|v\.\d|Ver)[\s\S]*\bpp?\. \d+/
    const docLine = /docs\/h7-platform\/[\w.-]+\.md:\d+/
    for (const [key, entry] of Object.entries(PEDAL_PARTS)) {
      const cited = sheet.test(entry.provenance) || docLine.test(entry.provenance)
      expect({ key, cited }).toEqual({ key, cited: true })
      for (const m of entry.provenance.matchAll(/docs\/h7-platform\/([\w.-]+\.md):(\d+)/g)) {
        const lines = fs.readFileSync(path.join(REPO, "docs/h7-platform", m[1] ?? ""), "utf8").split("\n")
        expect(lines.length).toBeGreaterThanOrEqual(Number(m[2]))
      }
      if (entry.table !== undefined) expect(PEDAL_PIN_TABLES[entry.table]?.source).toMatch(sheet)
    }
  })
})

describe("pedal project symbols", () => {
  test("the committed project symbols are what their generator makes from the stock symbols", () => {
    const library = fs.readFileSync(PROJECT_SYMBOL_LIBRARY, "utf8")
    for (const spec of PEDAL_PROJECT_SYMBOLS) {
      expect({ name: spec.name, same: committedSymbol(library, spec.name) === projectSymbolText(spec) })
        .toEqual({ name: spec.name, same: true })
    }
  })

  test("each differs from its stock base only where the data sheet does", () => {
    const expected: Readonly<Record<string, readonly string[]>> = {
      PCM3060PW: ["21: type output, data sheet passive", "27: name \"~{MS}/AD/IFMD\", data sheet \"~{MS}/ADR/IFMD\""],
      OPA1688xD: [
        "1: name \"\", data sheet \"OUT A\"", "2: name \"-\", data sheet \"-IN A\"", "3: name \"+\", data sheet \"+IN A\"",
        "5: name \"+\", data sheet \"+IN B\"", "6: name \"-\", data sheet \"-IN B\"", "7: name \"\", data sheet \"OUT B\"",
      ],
      SN74LVC3G34DCT: [
        "1: name \"\", data sheet \"1A\"", "2: name \"\", data sheet \"3Y\"", "3: name \"\", data sheet \"2A\"",
        "5: name \"\", data sheet \"2Y\"", "6: name \"\", data sheet \"3A\"", "7: name \"\", data sheet \"1Y\"",
      ],
      SN74LVC1G34DBV: ["2: name \"\", data sheet \"A\"", "4: name \"\", data sheet \"Y\""],
      SN74LVC1G07DBV: ["2: name \"\", data sheet \"A\"", "4: name \"\", data sheet \"Y\""],
      TPS3808G01DBV: ["1: type output, data sheet open_collector"],
      // The stock TPS7A41, TPS7A24-like and LM66100 symbols hide the pins they mark NC; the project
      // symbols show them. Pin 9 (PowerPAD) is hidden on both, stacked under GND.
      TPS7A4901DGN: [
        "3: type no_connect, data sheet free", "3: hidden on the symbol, shown in the table", "6: name \"NC\", data sheet \"NR/SS\"",
        "6: type no_connect, data sheet passive", "6: hidden on the symbol, shown in the table", "7: name \"NC\", data sheet \"DNC\"", "7: hidden on the symbol, shown in the table",
        "9: name \"GND\", data sheet \"PowerPAD\"",
      ],
      TPS7A2433DBV: ["4: type no_connect, data sheet free", "4: hidden on the symbol, shown in the table"],
      LM66100DCK: ["4: name \"NC\", data sheet \"N/C\"", "4: type no_connect, data sheet free", "4: hidden on the symbol, shown in the table"],
      "MCP6001T-OT": [
        "1: name \"\", data sheet \"VOUT\"", "2: name \"V-\", data sheet \"VSS\"", "3: name \"+\", data sheet \"VIN+\"",
        "4: name \"-\", data sheet \"VIN-\"", "5: name \"V+\", data sheet \"VDD\"",
      ],
      PESD12VL1BA: ["1: name \"A1\", data sheet \"K1\"", "2: name \"A2\", data sheet \"K2\""],
    }
    expect(PEDAL_PROJECT_SYMBOLS.map((s) => s.name).sort()).toEqual(Object.keys(expected).sort())
    for (const spec of PEDAL_PROJECT_SYMBOLS) {
      expect({ name: spec.name, diff: pinMismatches(tableFor(spec.table), pinTableOf(spec.base)) })
        .toEqual({ name: spec.name, diff: [...(expected[spec.name] ?? [])] })
    }
  })

  test("no installed symbol matches any project-symbol part by name, number and type", () => {
    const keys = [...PEDAL_PROJECT_SYMBOLS.map((s) => s.table), "TLV803EA29"]
    const tables = Object.fromEntries(keys.map((k) => [k, tableFor(k)]))
    // Positive control: the same scan finds the stock symbols the stock-symbol parts use.
    const controls = { SN74LVC2G14: tableFor("SN74LVC2G14"), SG_210STF: tableFor("SG_210STF") }
    const scan = scanInstalled({ ...tables, ...controls })
    expect(scan.compared).toBeGreaterThan(20_000)
    for (const key of keys) expect({ key, found: scan.matches.get(key) }).toEqual({ key, found: [] })
    expect(scan.matches.get("SN74LVC2G14")).toContain("74xGxx:SN74LVC2G14DBV")
    expect(scan.matches.get("SG_210STF")).toContain("Oscillator:SG-5032CAN")
    // The oscillator's own symbol differs only in the case of pin 4 (CR-PEDAL-SYMBOL-SG-210STF).
    expect(pinMismatches(tableFor("SG_210STF"), pinTableOf("Oscillator:SG-210STF"))).toEqual(["4: name \"Vcc\", data sheet \"VCC\""])
  }, 180_000)
})

describe("CR-PEDAL-PIN-MATCH", () => {
  test("the hidden flag is compared: a hidden pin the table shows, or a hidden power_in, mismatches", () => {
    const table = { "1": { name: "VDD", type: "power_in" }, "2": { name: "GND", type: "power_in" } }
    const shown = new Map([["1", { name: "VDD", type: "power_in", hidden: false }], ["2", { name: "GND", type: "power_in", hidden: false }]])
    expect(pinMismatches(table, shown)).toEqual([])
    const hiddenSupply = new Map([...shown, ["1", { name: "VDD", type: "power_in", hidden: true }]])
    expect(pinMismatches(table, hiddenSupply)).toEqual(["1: hidden on the symbol, shown in the table"])
    // On disk: the stock TPS7A24-like base hides pin 4, which the TPS7A2433's table shows.
    expect(pinTableOf("Regulator_Linear:TLV70033_SOT23-5").get("4")?.hidden).toBe(true)
    expect(pinTableOf("h7-platform:TPS7A2433DBV").get("4")?.hidden).toBe(false)
    // And the one ruled hidden pin reads as hidden on the project symbol.
    expect(pinTableOf("h7-platform:TPS7A4901DGN").get("9")?.hidden).toBe(true)
  })

  test("the type rule's clauses that need no I/O column predict every table entry they reach", () => {
    // Clauses 1-4 of CR-PEDAL-PIN-MATCH, applied in order from facts the tables carry (the part's kind
    // and the pin's name). Clauses 5-7 read the data sheet's I/O column and description, which the
    // tables do not record, so those pins are counted and left to the per-part citations.
    const discrete = new Set(["G6K_2F_Y", "USBLC6_2SC6", "PESD12VL1BA", "AO3400A", "AO3401A", "FET_2N7002", "AOD4185"])
    const supply = new Set(["GND", "AGND1", "AGND2", "DGND", "SGND", "VCC", "VDD", "VSS", "V+", "V-", "IN", "VIN"])
    const regulatorOut = new Set(["TPS7A4901", "TPS7A2433", "LM66100"])
    let decided = 0
    let undecided = 0
    for (const [key, entry] of Object.entries(PEDAL_PARTS)) {
      if (entry.table === undefined) continue
      for (const [n, pin] of Object.entries(tableFor(entry.table))) {
        let want: string | undefined
        if (entry.kind === "diode" || discrete.has(entry.table)) want = pin.name === "G" ? "input" : "passive"
        else if (supply.has(pin.name.replace(/_\{([^}]*)\}/g, "$1"))) want = "power_in"
        else if (regulatorOut.has(entry.table) && /OUT$/.test(pin.name)) want = "power_out"
        else if (pin.name === "NC" || pin.name === "N/C") want = "free"
        else if (pin.name === "DNC") want = "no_connect"
        if (want === undefined) { undecided++; continue }
        decided++
        expect({ key, pin: n, type: pin.type }).toEqual({ key, pin: n, type: want })
      }
    }
    expect(decided).toBeGreaterThan(80)
    expect(undecided).toBeGreaterThan(0)
  })
})

describe("CR-PEDAL-KINDS", () => {
  test("the potentiometer's ends: ccw pin 1 (drawn at the top), wiper pin 2 (the side arrow), cw pin 3", () => {
    const pins = installedSymbolPins("Device:R_Potentiometer")
    const at = (n: string): string => {
      const pin = pins.find((p) => p.number === n)
      if (pin === undefined) throw new Error(`Device:R_Potentiometer has no pin ${n}`)
      return `${pin.x},${pin.y},${pin.angle}`
    }
    // Library frame, y up: pin 1 at the top end of the body, pin 3 at the bottom, pin 2 to the side.
    expect([at("1"), at("2"), at("3")]).toEqual(["0,3.81,270", "3.81,0,180", "0,-3.81,90"])
    expect(POTENTIOMETER_PIN_NUMBERS).toEqual({ ccw: "1", wiper: "2", cw: "3" })
  })

  test("every diode symbol the pedal uses has pin 1 the cathode and pin 2 the anode", () => {
    for (const entry of Object.values(PEDAL_PARTS)) {
      if (entry.kind !== "diode") continue
      const pins = pinTableOf(entry.part.symbol ?? "")
      expect([pins.get("1")?.name, pins.get("2")?.name]).toEqual(["K", "A"])
    }
  })
})
