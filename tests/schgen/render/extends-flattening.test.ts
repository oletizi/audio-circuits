import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { parse, type SList } from "../../../lib/kicad/sexpr.ts"
import { extractPins } from "../../../lib/schgen/render/lib-pins.ts"
import { fromParsed, type SListNode } from "../../../lib/schgen/render/sexpr-write.ts"
import { fixtureResolver } from "../__fixtures__/fixture-lib.ts"

/**
 * WHY `extends` FLATTENING IS NON-OPTIONAL: an unflattened copy of an
 * `(extends …)` symbol silently drops EVERY pin.
 *
 * Two assertions, and the second is the point. The first says the flattened
 * symbol carries its parent's pins. The second reads the same symbol
 * unflattened and asserts an **empty** pin list - which is what makes the
 * failure mode's silence visible, and therefore what makes the first
 * assertion a check rather than a happy path. A resolver that forgot to
 * flatten would not throw, would not warn, and would emit a symbol with no
 * connectable pins at all.
 *
 * **THE SUBJECT IS `Fix:OPAMP2X`, AND NOT THE BRIEF'S `Device:R_Small`.**
 * The Task 4 brief argues the point from KiCad's `R_Small`, `C_Small` and
 * `Conn_01x05`; all three are wrong for the KiCad this repository vendors
 * from. In KiCad 10.0.5's `Device.kicad_sym` exactly 5 of 536 top-level
 * symbols carry `(extends …)` and `R_Small` and `C_Small` are not among them
 * (`docs/known-gaps.md` **G117** records the measurement; Controller ruling
 * **R9** selects the substitute). `Fix:OPAMP2X` is `(extends "OPAMP2")` in
 * `tests/schgen/__fixtures__/symbols/Fix.kicad_sym`, which is checked into
 * this repository, so the test does not depend on which KiCad is installed -
 * and being a two-unit op-amp with a shared supply unit, it exercises unit
 * handling at the same time.
 *
 * **EVERY NUMBER BELOW WAS READ OFF THAT FILE, NOT OFF THE BRIEF.** `OPAMP2`
 * declares sub-symbols `OPAMP2_1_1` (pins 1, 2, 3 at length 2.54 mm),
 * `OPAMP2_2_1` (5, 6, 7 at 2.54 mm), `OPAMP2_3_1` (4, 8 at 3.81 mm) and the
 * De Morgan `OPAMP2_3_2` (4, 8 again, skipped as body style 2). `OPAMP2X`
 * declares three properties and NO sub-symbol of its own.
 */

const FIXTURE_LIB = path.join(import.meta.dir, "..", "__fixtures__", "symbols", "Fix.kicad_sym")

/** The top-level `(symbol "<name>" …)` of a parsed `.kicad_sym`, unflattened. */
function topSymbolOf(lib: SList, name: string): SListNode {
  const raw = lib.lists.find((l) => l.head === "symbol" && l.atoms[1]?.value === name)
  if (raw === undefined) {
    throw new Error(
      `${FIXTURE_LIB} has no top-level symbol "${name}". This test reads the fixture library ` +
        "directly so the unflattened half cannot accidentally be the flattened one; if the " +
        "fixture changed, re-read it rather than adjusting the expectation.",
    )
  }
  return fromParsed(raw)
}

const EVERY_PIN = ["1", "2", "3", "4", "5", "6", "7", "8"]

test("an extends symbol resolves with its parent's pins", () => {
  const resolver = fixtureResolver()
  const child = resolver.resolve("Fix:OPAMP2X")
  const parent = resolver.resolve("Fix:OPAMP2")
  expect(child.pins.map((p) => p.number)).toEqual(EVERY_PIN)
  // Not merely "eight pins": the same pins as the parent, in the same order,
  // at the same places - a flatten that invented a pin would pass the count.
  expect(child.pins).toEqual(parent.pins)
  expect(child.pins.every((p) => p.length > 0)).toBe(true)
  expect(child.unitCount).toBe(3)
})

test("a symbol that did NOT flatten has no pins, which is the failure this guards", () => {
  const unflattened = topSymbolOf(parse(fs.readFileSync(FIXTURE_LIB, "utf8")), "OPAMP2X")
  expect(extractPins(unflattened, "Fix:OPAMP2X", false)).toEqual([])
  // And the parent, read the same way, is where those pins actually live - so
  // the empty list above is about the child's own body, not about this reader.
  expect(
    extractPins(topSymbolOf(parse(fs.readFileSync(FIXTURE_LIB, "utf8")), "OPAMP2"), "Fix:OPAMP2", false)
      .map((p) => p.number),
  ).toEqual(EVERY_PIN)
})
