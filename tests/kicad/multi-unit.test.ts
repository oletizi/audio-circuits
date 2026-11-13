// Spec C6: a package with more than one unit lowers to KiCad pin numbers without loss. Each
// unit's canonical pins resolve through `part.symbolPins[<unit>]` and the package's shared pins
// through `part.symbolPins.package`, under one reference, on every lowering path: the netlist
// writer (`toImportedNetlist`), the copperhead intent (`intentFromNetwork`), the pin-number map the
// sheet comparison takes (`pinNumbersFromTable`) and that comparison itself (`compareSheetToModel`).
//
// The end-to-end proof is the drafted fixture `tests/fixtures/dual-opamp-board/`: a fresh
// `kicad-cli` export of its committed page agrees with the model, and two negative controls - A's
// and B's mappings swapped, and A's mapping duplicated onto B - each fail it.
import { describe, expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { everyPin, pinNumberFor, pinNumbersFromTable, toImportedNetlist } from "../../lib/kicad/from-network.ts"
import { importNetlist, KICAD_CLI, type ImportedNetlist } from "../../lib/kicad/netlist.ts"
import { compareSheetToModel } from "../../lib/kicad/sheet-agreement.ts"
import { symbolPins, symbolStrokeSegments, type SymbolUnitPins } from "../../lib/kicad/symbol-library.ts"
import { circuit, net } from "../../lib/model/index.ts"
import type { Component, Network, PartSpec } from "../../lib/model/index.ts"
import { intentFromNetwork } from "../../tools/draught/intent-from-network.ts"
import { defaultKicadCliExists, defaultRunExport } from "../../tools/perfboard/netlist-sync.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { pinNumbersFor } from "../circuits/sheet-pin-numbers.ts"
import { DESIGNATORS, DUAL_OPAMP, PIN_NUMBERS, dualOpampBoard, drawingIntent } from "../fixtures/dual-opamp-board/dual-opamp-board.ts"
import { installedFlattenedSymbol, installedSymbolUnitPins } from "./symbol-library-disk.ts"

const SHEET = path.join(moduleRepoRoot(), "tests", "fixtures", "dual-opamp-board", "drafted", "dual-opamp-board.kicad_sch")

/** The pin of one stock unit whose library name is `name` (the TL072's `+`, `-`, `V+`, `V-`). */
function numberNamed(unit: SymbolUnitPins, name: string): string {
  const found = unit.pins.filter((p) => p.name === name)
  const only = found[0]
  if (found.length !== 1 || only === undefined) throw new Error(`unit ${unit.unit} has ${found.length} pins named "${name}"`)
  return only.number
}

/** The one output-typed pin of a stock unit - the TL072 leaves its output pins unnamed. */
function outputOf(unit: SymbolUnitPins): string {
  const found = unit.pins.filter((p) => p.type === "output")
  const only = found[0]
  if (found.length !== 1 || only === undefined) throw new Error(`unit ${unit.unit} has ${found.length} output pins`)
  return only.number
}

function unitNumbered(units: readonly SymbolUnitPins[], n: number): SymbolUnitPins {
  const unit = units.find((u) => u.unit === n)
  if (unit === undefined) throw new Error(`no unit ${n}; units: ${units.map((u) => u.unit).join(", ")}`)
  return unit
}

/** The dual's pin numbers as the installed symbol states them, unit by unit - never typed in. */
function stockDualNumbers(): Readonly<Record<string, Readonly<Record<string, string>>>> {
  const symbol = DUAL_OPAMP.symbol
  if (symbol === undefined) throw new Error("DUAL_OPAMP names no symbol")
  const units = installedSymbolUnitPins(symbol)
  expect(units.map((u) => u.unit)).toEqual([1, 2, 3])
  const section = (n: number): Record<string, string> => {
    const unit = unitNumbered(units, n)
    return { "in+": numberNamed(unit, "+"), "in-": numberNamed(unit, "-"), out: outputOf(unit) }
  }
  const supply = unitNumbered(units, 3)
  return { A: section(1), B: section(2), package: { "v+": numberNamed(supply, "V+"), "v-": numberNamed(supply, "V-") } }
}

/** The fixture with the dual's `symbolPins` replaced, every other fact unchanged. */
function withDualPins(symbolPinsTable: PartSpec["symbolPins"]): Network {
  const network = dualOpampBoard()
  const components = network.components.map((c): Component => {
    if (c.id !== "dual_amp") return c
    const part: PartSpec = { ...c.part, symbolPins: symbolPinsTable }
    return { ...c, part }
  })
  return { ...network, components }
}

function freshExport(): ImportedNetlist {
  if (!defaultKicadCliExists(KICAD_CLI)) {
    throw new Error(`kicad-cli not found at ${KICAD_CLI}. Install KiCad or set KICAD_CLI; this test does not skip.`)
  }
  if (!fs.existsSync(SHEET)) throw new Error(`the drafted fixture is not at ${SHEET}; its replay makes it`)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dual-opamp-export-"))
  try {
    const out = path.join(dir, "dual-opamp-board.net")
    defaultRunExport(KICAD_CLI, SHEET, out, moduleRepoRoot())
    return importNetlist(fs.readFileSync(out, "utf8"))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function compare(network: Network, exported: ImportedNetlist): ReturnType<typeof compareSheetToModel> {
  return compareSheetToModel(network, new Map(Object.entries(DESIGNATORS)), pinNumbersFromTable(network, PIN_NUMBERS), exported)
}

describe("multi-unit packages (spec C6)", () => {
  test("both sections of a dual lower to distinct pins under one reference", () => {
    const stock = stockDualNumbers()
    // The fixture's table is the installed symbol's, unit by unit.
    expect(DUAL_OPAMP.symbolPins).toEqual(stock)
    // And the installed symbol is the standard dual pinout the brief expects.
    expect(stock).toEqual({
      A: { "in+": "3", "in-": "2", out: "1" },
      B: { "in+": "5", "in-": "6", out: "7" },
      package: { "v+": "8", "v-": "4" },
    })
    const network = dualOpampBoard()

    // The sheet comparison's pin-number map: eight distinct numbers, unit pins keyed by unit.
    const numbers = pinNumbersFromTable(network, PIN_NUMBERS).get("dual_amp")
    expect(numbers === undefined ? undefined : Object.fromEntries(numbers)).toEqual({
      "v+": "8", "v-": "4",
      "A/in+": "3", "A/in-": "2", "A/out": "1",
      "B/in+": "5", "B/in-": "6", "B/out": "7",
    })

    // The copperhead intent: one part, U1, and each section's nets on its own pins.
    const intent = drawingIntent()
    expect(intent.parts.filter((p) => p.ref === "U1")).toHaveLength(1)
    const netPins = Object.fromEntries(intent.nets.map((n) => [n.name, n.pins]))
    expect(netPins).toEqual({
      IN_A: ["J1.1", "U1.3"],
      OUT_A: ["J1.2", "U1.1", "U1.2"],
      IN_B: ["J1.3", "U1.5"],
      OUT_B: ["J1.4", "U1.6", "U1.7"],
      VCC: ["J1.5", "U1.8"],
      VEE: ["J1.6", "U1.4"],
    })

    // The netlist writer: the same, under one designator and one MPN.
    const dual = circuit()
      .add({
        id: "dual_amp", kind: "opamp", parameters: {},
        part: { ...DUAL_OPAMP, footprint: "Package_DIP:DIP-8_W7.62mm" },
        pins: { "v+": net("VCC"), "v-": net("VEE") },
        units: [
          { name: "A", pins: { "in+": net("IN_A"), "in-": net("OUT_A"), out: net("OUT_A") } },
          { name: "B", pins: { "in+": net("IN_B"), "in-": net("OUT_B"), out: net("OUT_B") } },
        ],
      })
      .port("in_a", "IN_A").port("out_a", "OUT_A").port("in_b", "IN_B").port("out_b", "OUT_B")
      .port("vcc", "VCC").port("vee", "VEE")
      .done()
    const lowered = toImportedNetlist(dual, { dual_amp: "U1" }, PIN_NUMBERS)
    expect(lowered.components).toEqual([{ designator: "U1", value: "TL072", footprint: expect.any(String) }])
    expect(lowered.nets).toEqual({
      IN_A: ["U1.3"], OUT_A: ["U1.1", "U1.2"], IN_B: ["U1.5"], OUT_B: ["U1.6", "U1.7"], VCC: ["U1.8"], VEE: ["U1.4"],
    })
  })

  test("a fresh kicad-cli export of the drafted fixture agrees with the model", () => {
    const result = compare(dualOpampBoard(), freshExport())
    expect(result.componentIdentity).toEqual([])
    expect(result.netMembership).toEqual([])
    expect(result.pinIdentity).toEqual([])
    expect(result.values).toEqual([])
  })

  test("control: swapping A's and B's mapping fails the round trip", () => {
    const table = DUAL_OPAMP.symbolPins
    if (table === undefined) throw new Error("DUAL_OPAMP declares no symbolPins")
    const swapped = compare(withDualPins({ ...table, A: table["B"] ?? {}, B: table["A"] ?? {} }), freshExport())
    expect(swapped.netMembership).not.toEqual([])
  })

  test("control: duplicating A's mapping onto B fails the round trip", () => {
    const table = DUAL_OPAMP.symbolPins
    if (table === undefined) throw new Error("DUAL_OPAMP declares no symbolPins")
    const exported = freshExport()
    expect(() => compare(withDualPins({ ...table, B: table["A"] ?? {} }), exported)).toThrow(/pin "3"|pin number "3"/)
  })

  test("a multi-unit component with no symbolPins refuses", () => {
    const network = withDualPins(undefined)
    const named = /"dual_amp".*units A, B.*symbolPins/s
    expect(() => pinNumbersFromTable(network, PIN_NUMBERS)).toThrow(named)
    expect(() => intentFromNetwork(network, DESIGNATORS, PIN_NUMBERS, { group: "g", netKinds: {} })).toThrow(named)
    const dual = network.components.find((c) => c.id === "dual_amp")
    if (dual === undefined) throw new Error("no dual_amp")
    expect(() => pinNumberFor(dual, "v+", PIN_NUMBERS)).toThrow(named)
    expect(() => pinNumbersFor(dual)).toThrow(named)
  })

  test("a symbolPins table that misses a unit pin, or names one the unit lacks, refuses", () => {
    const table = DUAL_OPAMP.symbolPins
    if (table === undefined) throw new Error("DUAL_OPAMP declares no symbolPins")
    expect(() => pinNumbersFromTable(withDualPins({ ...table, B: { "in+": "5", "in-": "6" } }), PIN_NUMBERS))
      .toThrow(/unit "B" pin "out"/)
    expect(() => pinNumbersFromTable(withDualPins({ ...table, B: { ...table["B"], extra: "9" } }), PIN_NUMBERS))
      .toThrow(/"extra"/)
    expect(() => pinNumbersFromTable(withDualPins({ A: table["A"] ?? {}, B: table["B"] ?? {} }), PIN_NUMBERS))
      .toThrow(/package pin "v\+"/)
  })

  test("everyPin and the sheet-pin builder key a multi-unit part's unit pins by unit", () => {
    const dual = dualOpampBoard().components.find((c) => c.id === "dual_amp")
    if (dual === undefined) throw new Error("no dual_amp")
    expect([...everyPin(dual)].sort()).toEqual(["A/in+", "A/in-", "A/out", "B/in+", "B/in-", "B/out", "v+", "v-"])
    expect(Object.fromEntries(pinNumbersFor(dual))).toEqual(Object.fromEntries(pinNumbersFromTable(dualOpampBoard(), PIN_NUMBERS).get("dual_amp") ?? []))
  })

  test("symbolPins reads a 3-unit stock symbol unit by unit", () => {
    // OPA2197xD is used for the mechanism only; its fitness as the OPA1688's symbol is Task 2's.
    const units = installedSymbolUnitPins("Amplifier_Operational:OPA2197xD")
    expect(units.map((u) => ({ unit: u.unit, pins: u.pins.map((p) => `${p.number} ${p.name} ${p.type}`) }))).toEqual([
      { unit: 1, pins: ["1  output", "2 - input", "3 + input"] },
      { unit: 2, pins: ["5 + input", "6 - input", "7  output"] },
      { unit: 3, pins: ["4 V- power_in", "8 V+ power_in"] },
    ])
    // The flat reader and the stroke reader still refuse a multi-unit block, each saying why.
    const block = installedFlattenedSymbol("Amplifier_Operational:OPA2197xD")
    expect(() => symbolPins(block)).toThrow(/multi-unit.*symbolUnitPins/s)
    expect(() => symbolStrokeSegments(block)).toThrow(/multi-unit.*nothing on the drawing path/s)
  })
})
