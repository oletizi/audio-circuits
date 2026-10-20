/**
 * `lib/schgen/rules/symbols.ts`: the by-kind symbol whitelist, the canonical-pin rules, and the
 * reference prefix read off a symbol.
 *
 * Hand-written for Task 9 of the M1 schematic-authoring plan. **Every lib id the whitelist names
 * is RESOLVED here against the libraries on disk**, which is what keeps `CLAUDE.md`'s rule - *"a
 * KiCad footprint name is checkable … do not write one from memory; this repository has twice
 * shipped a footprint that does not exist"* - from decaying into a claim in a comment.
 */

import { test, expect } from "bun:test"
import { ALL_KINDS } from "../../../lib/model/kinds.ts"
import { canonicalPinNumbers, kindStatesItsSymbol, noSymbolRefusal, symbolForKind, symbolRefPrefix } from "../../../lib/schgen/rules/symbols.ts"
import { createResolver } from "../../../lib/schgen/render/library.ts"
import { symbolLibraries } from "../../../lib/schgen/render/stock-symbols.ts"

const resolver = createResolver(
  symbolLibraries(["Device", "Transistor_BJT", "Amplifier_Operational", "Audio", "Connector_Generic", "Connector", "Jumper", "Diode"]),
)

test("every kind either has a reviewed symbol or refuses with a stated reason", () => {
  expect(ALL_KINDS.length, "a kind list nothing iterates is a check that cannot fail").toBe(11)
  const silent: string[] = []
  for (const kind of ALL_KINDS) {
    if (kindStatesItsSymbol(kind)) continue
    try {
      symbolForKind(kind, {})
      silent.push(`${kind}: returned a symbol although kindStatesItsSymbol says it has none`)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      if (!message.includes("no symbol is derived for kind")) silent.push(`${kind}: ${message}`)
    }
  }
  expect(silent).toEqual([])
})

test("the whitelist is exactly four kinds, and every lib id in it resolves on disk", () => {
  const whitelisted = ALL_KINDS.filter(kindStatesItsSymbol)
  expect(whitelisted).toEqual(["resistor", "capacitor", "photoresistor", "diode"])
  const resolved = whitelisted.map((kind) => {
    const libId = symbolForKind(kind, {})
    return `${kind} -> ${libId} (${resolver.resolve(libId).pins.length} pins)`
  })
  expect(resolved).toEqual([
    "resistor -> Device:R (2 pins)",
    "capacitor -> Device:C (2 pins)",
    "photoresistor -> Device:R_Photo (2 pins)",
    "diode -> Device:D (2 pins)",
  ])
})

test("a kind with no rule names the kind, the parameters and what to do instead", () => {
  expect(() => symbolForKind("opamp", {})).toThrow(/no symbol is derived for kind "opamp"/)
  // And when the caller knows which component it is, the refusal says so - the gap a Step 7
  // perturbation found, since "a switch has no symbol" leaves a reader of a 37-part circuit to go
  // and find which switch.
  expect(noSymbolRefusal("switch", {}, 'component "a_bypass_jumper"'))
    .toContain('no symbol is derived for component "a_bypass_jumper" (kind "switch")')
  expect(() => symbolForKind("opamp", {})).toThrow(/an op-amp symbol is a PACKAGE/)
  expect(() => symbolForKind("potentiometer", { ohms: 10000, taper: { type: "linear" } }))
    .toThrow(/"ohms":10000/)
  expect(() => symbolForKind("connector", {})).toThrow(/part\.symbol/)
})

test("the model's own pin names ARE pin numbers for an open-vocabulary part", () => {
  const pt2399 = resolver.resolve("Audio:PT2399")
  const names = pt2399.pins.map((p) => p.number)
  const map = canonicalPinNumbers({ kind: "ic", symbol: pt2399, names, what: "U1" })
  expect([...map]).toEqual(names.map((n) => [n, n]))
})

test("a diode's and a transistor's canonical pins come from the symbol's own pin names", () => {
  const diode = canonicalPinNumbers({
    kind: "diode",
    symbol: resolver.resolve("Device:D"),
    names: ["anode", "cathode"],
    what: "D1",
  })
  expect([...diode].sort()).toEqual([
    ["anode", "2"],
    ["cathode", "1"],
  ])
  // THE CASE A POSITIONAL RULE WOULD GET WRONG: unitPins("bjt") is base, collector, emitter and
  // Transistor_BJT:2N3904's pins 1, 2, 3 are E, B, C.
  const bjt = canonicalPinNumbers({
    kind: "bjt",
    symbol: resolver.resolve("Transistor_BJT:2N3904"),
    names: ["base", "collector", "emitter"],
    what: "Q1",
  })
  expect([...bjt].sort()).toEqual([
    ["base", "2"],
    ["collector", "3"],
    ["emitter", "1"],
  ])
})

test("an op-amp's package pins come from the symbol's names and its unit pins do not", () => {
  const tl072 = resolver.resolve("Amplifier_Operational:TL072")
  const pkg = canonicalPinNumbers({ kind: "opamp", symbol: tl072, names: ["v+", "v-"], what: "U1" })
  expect([...pkg].sort()).toEqual([
    ["v+", "8"],
    ["v-", "4"],
  ])
  // `out` is named "" in this symbol, so there is deliberately no alias for a unit's pins and the
  // refusal says so rather than matching the one empty name.
  expect(() => canonicalPinNumbers({ kind: "opamp", symbol: tl072, names: ["in+", "in-", "out"], what: "U1 unit A" }))
    .toThrow(/no reviewed rule maps the pins \[in\+, in-, out\]/)
})

test("a two-pin passive and a three-pin pot map positionally onto 1..n", () => {
  for (const [kind, libId] of [
    ["resistor", "Device:R"],
    ["capacitor", "Device:C"],
    ["capacitor", "Device:C_Polarized"],
    ["photoresistor", "Device:R_Photo"],
    ["inductor", "Device:L"],
  ] as const) {
    const map = canonicalPinNumbers({ kind, symbol: resolver.resolve(libId), names: ["a", "b"], what: libId })
    expect([...map], libId).toEqual([
      ["a", "1"],
      ["b", "2"],
    ])
  }
  const pot = canonicalPinNumbers({
    kind: "potentiometer",
    symbol: resolver.resolve("Device:R_Potentiometer_Trim"),
    names: ["ccw", "wiper", "cw"],
    what: "RV1",
  })
  expect([...pot]).toEqual([
    ["ccw", "1"],
    ["wiper", "2"],
    ["cw", "3"],
  ])
})

test("a symbol whose pins are not numbered 1..n refuses rather than being renumbered", () => {
  // Conn_01x05's pins ARE 1..5, so the positional rule would accept it for a five-name
  // vocabulary; a two-name resistor vocabulary against it must refuse on the count.
  expect(() =>
    canonicalPinNumbers({
      kind: "resistor",
      symbol: resolver.resolve("Connector_Generic:Conn_01x05"),
      names: ["a", "b"],
      what: "R1 on the wrong symbol",
    }),
  ).toThrow(/no reviewed rule maps the pins \[a, b\] of a "resistor" onto Connector_Generic:Conn_01x05/)
})

test("a symbol's reference prefix is read off its own Reference property", () => {
  const prefixes = [
    "Device:R",
    "Device:C_Polarized",
    "Device:R_Potentiometer_Trim",
    "Device:LED",
    "Transistor_BJT:2N3904",
    "Amplifier_Operational:TL072",
    "Connector_Generic:Conn_01x03",
    "Connector:TestPoint",
    "Jumper:Jumper_2_Open",
    "Diode:1N5817",
  ].map((libId) => `${libId} -> ${symbolRefPrefix(resolver.resolve(libId))}`)
  expect(prefixes).toEqual([
    "Device:R -> R",
    "Device:C_Polarized -> C",
    "Device:R_Potentiometer_Trim -> RV",
    "Device:LED -> D",
    "Transistor_BJT:2N3904 -> Q",
    "Amplifier_Operational:TL072 -> U",
    "Connector_Generic:Conn_01x03 -> J",
    "Connector:TestPoint -> TP",
    "Jumper:Jumper_2_Open -> JP",
    "Diode:1N5817 -> D",
  ])
})
