/**
 * **THE TWO TABLES `lib/kicad/sheet-agreement.ts` CARRIES, CHECKED AGAINST THE LIBRARIES ON
 * DISK** - `SYMBOL_BY_KIND`, the by-kind symbol whitelist, and `MECHANICAL_PINS`, the mount-lug
 * table.
 *
 * **WHY THIS FILE EXISTS, AND IT IS NOT TIDINESS.** Both tables were carried into that module from
 * `lib/schgen/`, which this plan deletes - and so were the two tests that kept them from rotting.
 * `tests/schgen/rules/symbols.test.ts` resolved every lib id of the whitelist on every run;
 * `tests/schgen/ir/mechanical-pins.test.ts` resolved every key of the mechanical table, its own
 * comment saying *"throws if the key is a typo - that IS the assertion"*. **Both die with the
 * generator**, and until this file landed the copies had nothing. Three of the whitelist's four
 * entries - `capacitor`, `photoresistor`, `diode` - were exercised by no test at all, and the
 * module's header claimed the lib ids *"were resolved against the libraries on disk where it was
 * first written"*: past tense, with nothing re-running it. `CLAUDE.md`: *"a measurement goes in a
 * tool or a test that re-runs it, never in prose."*
 *
 * **IT READS THE INSTALLED LIBRARY THROUGH `./symbol-library-disk.ts`, NOT THROUGH
 * `lib/schgen/render/stock-symbols.ts`**, which is also being deleted. That helper refuses when no
 * library is present and does NOT skip, for the reason `tests/circuits/kicad-round-trip.ts` gives:
 * a green suite on a machine with no KiCad would be a check that looked like it had passed while
 * reading nothing, which is the one failure mode this workflow exists to prevent. The last test
 * below proves that refusal is live rather than taking it on trust.
 *
 * **EVERY ARM IS GENERIC OVER ITS TABLE, not written against today's entries.** A review of the
 * schgen original found its first version hard-coded the one rotary, so the tenth `_MP` symbol
 * would have been added with no check at all. That lesson is carried, not just its result.
 *
 * **ONE ASSERTION WAS MISSING UNTIL NOW, AND IT WAS THE ONE THAT MATTERED.** The original
 * `tests/schgen/ir/mechanical-pins.test.ts` arm 1 did not only resolve each listed pin against the
 * installed library (the test above already did that) - it also asserted, with its own
 * `endpointsAt`, that NO graphic stroke inside the symbol has an endpoint at that pin's body-side
 * connection point. That is the measurement `lib/kicad/sheet-agreement.ts`'s own header leans on:
 * pin TYPE cannot tell a mounting lug from an electrical pin (both `passive` on this symbol), so
 * the table is trustworthy only to the extent that every pin it lists is actually unreached by a
 * conductor. The port here uses `installedSymbolStrokeEndpoints`
 * (`./symbol-library-disk.ts`), built on `lib/kicad/symbol-library.ts`'s widened `symbolPins` /
 * `symbolStrokeSegments` / `strokeEndpointsAt` - the same geometry the original arm computed,
 * carried over rather than approximated.
 */
import { expect, test } from "bun:test"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { compareSheetToModel, MECHANICAL_PINS, SYMBOL_BY_KIND } from "../../lib/kicad/sheet-agreement.ts"
import { ALL_KINDS } from "../../lib/model/kinds.ts"
import { circuit } from "../../lib/model/index.ts"
import { net } from "../../lib/model/types.ts"
import type { Component } from "../../lib/model/types.ts"
import { installedSymbolPinNumbers, installedSymbolPins, installedSymbolStrokeEndpoints } from "./symbol-library-disk.ts"

test("the whitelist is exactly four kinds, and every lib id in it resolves on disk", () => {
  expect(ALL_KINDS.length, "a kind list nothing iterates is a check that cannot fail").toBe(11)
  const whitelisted = ALL_KINDS.filter((kind) => SYMBOL_BY_KIND[kind] !== undefined)
  expect(whitelisted).toEqual(["resistor", "capacitor", "photoresistor", "diode"])
  // Every entry is RESOLVED, and its pins are printed into the expectation so that all four are
  // exercised rather than merely counted - three of them had no test of any kind before this.
  const resolved = whitelisted.map((kind) => {
    const libId = SYMBOL_BY_KIND[kind]
    if (libId === undefined) throw new Error(`${kind} vanished from the whitelist mid-test`)
    return `${kind} -> ${libId} (pins ${installedSymbolPinNumbers(libId).join(", ")})`
  })
  expect(resolved).toEqual([
    "resistor -> Device:R (pins 1, 2)",
    "capacitor -> Device:C (pins 1, 2)",
    "photoresistor -> Device:R_Photo (pins 1, 2)",
    "diode -> Device:D (pins 1, 2)",
  ])
})

test("every mechanical-table entry names a resolvable symbol and pins that symbol really has, with NO stroke endpoint at that pin's body-side end", () => {
  const entries = Object.entries(MECHANICAL_PINS)
  expect(entries.length, "an empty table would make every loop below vacuous").toBeGreaterThan(0)
  for (const [libId, pins] of entries) {
    // Throws if the key is a typo - that IS the assertion, and it is the hole nothing else
    // closes: a misspelled SYMBOL name is a silent no-op everywhere else, because a table that
    // exempts a pin of a symbol nobody has simply never fires.
    const numbers = installedSymbolPinNumbers(libId)
    expect(pins.length, `${libId} has an empty pin list, which exempts nothing`).toBeGreaterThan(0)
    for (const number of pins) {
      expect(numbers.includes(number), `${libId} has no pin ${number}`).toBe(true)
      // Ported from tests/schgen/ir/mechanical-pins.test.ts arm 1: the geometric claim, not
      // merely the pin's existence. A pin reached by a stroke is wired into the symbol's own
      // drawing and is not isolated, whatever its declared electrical type says.
      expect(
        installedSymbolStrokeEndpoints(libId, number),
        `${libId} pin ${number} is reached by a stroke, so it is not isolated`,
      ).toBe(0)
    }
    // A table claiming EVERY pin of a symbol is mechanical would exempt a part entirely.
    expect(pins.length, `${libId} lists all of its own pins as mechanical`).toBeLessThan(numbers.length)
  }
})

test("the mechanical table carries only entries this repository has verified", () => {
  expect(Object.keys(MECHANICAL_PINS)).toEqual(["Switch:SW_Rotary_1x6_MP"])
  expect(MECHANICAL_PINS["Switch:SW_Rotary_1x6_MP"]).toEqual(["MP"])
})

/**
 * Ported from arm 1b of `tests/schgen/ir/mechanical-pins.test.ts`: the CONTRAST that makes the
 * zero above mean something. `passive` alone does not distinguish MP from an electrical pin - see
 * `lib/kicad/sheet-agreement.ts`'s own header - so this is the other half of the measurement,
 * pinned to the one symbol this repository has verified rather than generalised across the
 * table: a future entry's un-listed pins are not guaranteed to be drawn the same way this one's
 * are, and asserting that generally would be exactly the "inferred from stroke geometry" rule
 * that header already rejects as a general replacement for the whitelist.
 */
test("on Switch:SW_Rotary_1x6_MP specifically, all seven ELECTRICAL pins are reached by exactly one stroke endpoint - the contrast that makes MP's zero mean something", () => {
  const rotary = "Switch:SW_Rotary_1x6_MP"
  const pins = installedSymbolPins(rotary)
  const listed = new Set(MECHANICAL_PINS[rotary] ?? [])
  expect([...listed]).toEqual(["MP"])
  const mp = pins.find((p) => p.number === "MP")
  expect(mp?.name).toBe("")

  const electrical = pins.filter((p) => !listed.has(p.number))
  expect(electrical.map((p) => p.number)).toEqual(["1", "2", "3", "4", "5", "6", "7"])
  for (const p of electrical) {
    expect(installedSymbolStrokeEndpoints(rotary, p.number), `pin ${p.number}`).toBe(1)
  }
})

test("CONTROL: MP's own stroke-endpoint count is not what an electrical pin's is - the zero/one contrast above is a measurement, not a tautology true of any two pins", () => {
  const rotary = "Switch:SW_Rotary_1x6_MP"
  expect(installedSymbolStrokeEndpoints(rotary, "MP")).not.toBe(installedSymbolStrokeEndpoints(rotary, "1"))
})

/** A single-pole rotary drawn with `symbol`, wired to its pole and one throw. */
function selector(symbol: string): Component {
  return {
    id: "selector",
    kind: "switch",
    parameters: { positions: ["one", "two"], contacts: { one: [["pole", "t1"]], two: [] } },
    part: { symbol },
    pins: {},
    units: [{ name: "MAIN", pins: { pole: net("IN"), t1: net("OUT") } }],
  }
}

const BOARD = circuit()
  .resistor("r_in", "10k", { a: "IN", b: "OUT" })
  .add(selector("Switch:SW_Rotary_1x6_MP"))
  .port("input", "IN")
  .port("output", "OUT")
  .done()

const DESIGNATORS = new Map([["r_in", "R1"], ["selector", "SW1"]])
const PINS = new Map([
  ["r_in", new Map([["a", "1"], ["b", "2"]])],
  ["selector", new Map([["pole", "7"], ["t1", "1"]])],
])

/** The same sheet with NO node for the mount lug, which is what a stale table entry looks like. */
const NO_LUG = `(export (components
  (comp (ref "R1") (value "10K") (libsource (lib "Device") (part "R")))
  (comp (ref "SW1") (value "SW_Rotary_1x6_MP") (libsource (lib "Switch") (part "SW_Rotary_1x6_MP"))))
 (nets
  (net (name "IN") (node (ref "R1") (pin "1")) (node (ref "SW1") (pin "7")))
  (net (name "OUT") (node (ref "R1") (pin "2")) (node (ref "SW1") (pin "1")))))`

test("a table entry the drawn sheet has no pin for is REPORTED, not silently ignored", () => {
  // THE STALENESS CONTROL, carried over from arm 4 of the schgen original (which hid `MP` from the
  // resolver and asserted the validator named the stale entry). This module has no validator, so
  // the question is what its own output does: the table puts `SW1.MP` into the model's partition,
  // the sheet has no such node, and the disagreement surfaces. Were `mechanicalPinsOf` to return
  // nothing, this list would be EMPTY - which is why the assertion is on the message and not on
  // the mere presence of a problem.
  const out = compareSheetToModel(BOARD, DESIGNATORS, PINS, importNetlist(NO_LUG))
  expect(out.netMembership).toEqual(["the model connects [SW1.MP] and the schematic does not"])
})

test("resolving a symbol the installed library does not have refuses - so the arms above are not vacuous", () => {
  // Without this, "throws if the key is a typo - that IS the assertion" would be a claim about a
  // function nobody had watched refuse. `Device` is a real library, `R_NotAKicadSymbol` is not a
  // symbol in it, and the absent-LIBRARY case refuses one level down in `installedLibrary`.
  expect(() => installedSymbolPinNumbers("Device:R_NotAKicadSymbol")).toThrow(
    'symbol "Device:R_NotAKicadSymbol" is not in',
  )
  expect(() => installedSymbolPinNumbers("Device:R_NotAKicadSymbol")).toThrow(
    "An empty pin list returned here would make every claim about this symbol's pins pass for the wrong reason.",
  )
})
