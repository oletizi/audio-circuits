/**
 * THE GUARD OVER `netclass_patterns` IN `circuits/pt2399-core/pt2399-core.kicad_pro`.
 *
 * WHAT GOES WRONG WITHOUT IT. That project declared `Power` at 0.5 mm with an
 * EMPTY pattern list, so no net was in it and the supply rails would have routed
 * at the 0.3 mm `Default` width. `tools/pcb/fab-standard.ts` passed, because it
 * compares class DEFINITIONS; DRC passed, because 0.3 mm clears the 0.25 mm
 * floor. Nothing in this repository was red. Deleting the patterns again turns
 * this file red, which is the whole point of it.
 *
 * THE RESOLUTION IS MEASURED THROUGH `pcbnew`, never read back out of the JSON -
 * a `.kicad_pro` holding a pattern is the matcher's input, not its output. See
 * `tools/pcb/netclass-survey.ts`'s header, including why a composite class name
 * makes the obvious equality assertion fail on a CORRECT board.
 *
 * REAL KICAD, AND NO SKIP. This runs the bundled interpreter against the
 * committed board. If KiCad is missing it FAILS rather than skipping, as
 * `tests/pcb/drc.test.ts`'s integration tests do: a silent skip here is the
 * false green this file exists to prevent.
 */
import { test, expect } from "bun:test"
import path from "node:path"
import { surveyNetClasses, classesOf, isInClass } from "../../tools/pcb/netclass-survey.ts"
import { verifyFabStandard } from "../../tools/pcb/fab-standard.ts"

const CIRCUIT = path.resolve(import.meta.dir, "../../circuits/pt2399-core")
const BOARD = path.join(CIRCUIT, "pt2399-core.kicad_pcb")
const PROJECT = path.join(CIRCUIT, "pt2399-core.kicad_pro")

/** The rails the standard wants on power track, spelled as the exported netlist spells them. */
const POWER_NETS = ["+5V", "GND"] as const

test("the composite class name is split, not compared whole", () => {
  // KiCad 10 resolves a matched net to "<matched>,<base>". The parse is unit
  // tested here so the assertions below cannot pass for the wrong reason.
  expect(classesOf("Power,Default")).toEqual(["Power", "Default"])
  expect(classesOf("Default")).toEqual(["Default"])
})

test("INTEGRATION, real pcbnew: the supply rails resolve into Power and no other net does", () => {
  const survey = surveyNetClasses(BOARD)

  for (const rail of POWER_NETS) {
    expect(isInClass(survey, rail, "Power")).toBe(true)
    // The base class is still in the composite - a matched net does not leave it.
    expect(isInClass(survey, rail, "Default")).toBe(true)
  }

  // THE OVER-MATCH HALF. A pattern of "+5V" could be read as a wildcard or a
  // prefix by a matcher nobody has tested, which would put signal nets on power
  // track silently. Every remaining net is asserted out of Power by name.
  const others = Object.keys(survey.nets).filter((name) => !POWER_NETS.includes(name as (typeof POWER_NETS)[number]))
  expect(others.length).toBeGreaterThan(0)
  for (const net of others) {
    expect({ net, classes: survey.nets[net] }).toEqual({ net, classes: ["Default"] })
  }

  // Both rails were found, so the loop above was not vacuous on a renamed net.
  for (const rail of POWER_NETS) expect(Object.keys(survey.nets)).toContain(rail)
})

test("INTEGRATION, real pcbnew: the two classes carry the fabrication standard's widths", () => {
  const survey = surveyNetClasses(BOARD)
  expect(survey.classes["Power"]).toEqual({ trackWidthMm: 0.5, clearanceMm: 0.25, viaDiameterMm: 0.8 })
  expect(survey.classes["Default"]).toEqual({ trackWidthMm: 0.3, clearanceMm: 0.25, viaDiameterMm: 0.8 })
})

test("adding the patterns did not disturb the class definitions the fabrication gate checks", () => {
  // verifyFabStandard throws a DrcRefusal on any drift; reaching the next line is the acceptance.
  verifyFabStandard(PROJECT)
})

test("a net the board does not have has no answer, rather than a false", () => {
  const survey = surveyNetClasses(BOARD)
  expect(() => isInClass(survey, "+12V", "Power")).toThrow(/no net named "\+12V"/)
})
