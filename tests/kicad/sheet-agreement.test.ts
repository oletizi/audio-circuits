/**
 * `compareSheetToModel` - the standalone sheet-to-model comparison that replaces
 * `lib/schgen/gates/round-trip.ts`.
 *
 * **EVERY ASSERTION HERE IS AN EXACT MESSAGE LIST, NEVER A COUNT.** A test asserting that a list
 * has one entry passes when the entry is the wrong one, and the five lists this module returns are
 * read by a human from a test failure. `toEqual` on the whole list is the only form of the claim
 * that says WHICH.
 *
 * **AND EVERY EMPTY LIST HAS A CONTROL BESIDE IT.** An empty problem list is the same shape
 * whether the comparison agreed or never looked; `agrees everywhere` below is paired with one
 * perturbation per list, each of which must make exactly that list non-empty. Two of this
 * repository's controls were recently found inert on the very thing they protected, so a control
 * that cannot fail is a defect rather than a formality.
 */
import { expect, test } from "bun:test"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { compareSheetToModel } from "../../lib/kicad/sheet-agreement.ts"
import { circuit } from "../../lib/model/index.ts"
import { net } from "../../lib/model/types.ts"
import type { Component } from "../../lib/model/types.ts"

const TWO_RESISTORS = circuit()
  .resistor("r_in", "10k", { a: "IN", b: "MID" })
  .resistor("r_out", "10k", { a: "MID", b: "OUT" })
  .port("input", "IN")
  .port("output", "OUT")
  .done()

const DESIGNATORS = new Map([["r_in", "R1"], ["r_out", "R2"]])
const PINS = new Map([
  ["r_in", new Map([["a", "1"], ["b", "2"]])],
  ["r_out", new Map([["a", "1"], ["b", "2"]])],
])

/**
 * The export of a sheet drawn exactly from `TWO_RESISTORS`.
 *
 * The values read `10K` and not `10k` because the model's value field is DERIVED from the
 * parameter by `lib/kicad/value-notation.ts` - `parseValue("10k")` is 10000 and `resistanceText`
 * spells that `10K`. A fixture spelling it `10k` is a value disagreement, which is what the
 * `values` test below uses on purpose.
 */
const AGREEING = `(export (components
  (comp (ref "R1") (value "10K"))
  (comp (ref "R2") (value "10K")))
 (nets
  (net (name "IN") (node (ref "R1") (pin "1")))
  (net (name "MID") (node (ref "R1") (pin "2")) (node (ref "R2") (pin "1")))
  (net (name "OUT") (node (ref "R2") (pin "2")))))`

test("a sheet drawn from the model agrees in all five lists", () => {
  const out = compareSheetToModel(TWO_RESISTORS, DESIGNATORS, PINS, importNetlist(AGREEING))
  expect(out).toEqual({
    componentIdentity: [],
    netMembership: [],
    pinIdentity: [],
    values: [],
    footprints: [],
  })
})

test("a reference in the schematic but not in the model is reported", () => {
  const exported = importNetlist(`(export (components
    (comp (ref "R1") (value "10k"))
    (comp (ref "R2") (value "10k"))
    (comp (ref "R9") (value "10k")))
   (nets
    (net (name "IN") (node (ref "R1") (pin "1")))
    (net (name "MID") (node (ref "R1") (pin "2")) (node (ref "R2") (pin "1")))
    (net (name "OUT") (node (ref "R2") (pin "2")))))`)
  const out = compareSheetToModel(TWO_RESISTORS, DESIGNATORS, PINS, exported)
  expect(out.componentIdentity).toEqual(["reference R9 is in the schematic but not in the model"])
})

test("a reference in the model but not in the schematic is reported", () => {
  const exported = importNetlist(`(export (components
    (comp (ref "R1") (value "10K")))
   (nets
    (net (name "IN") (node (ref "R1") (pin "1")))
    (net (name "MID") (node (ref "R1") (pin "2")))))`)
  const out = compareSheetToModel(TWO_RESISTORS, DESIGNATORS, PINS, exported)
  expect(out.componentIdentity).toEqual(["reference R2 is in the model but not in the schematic"])
})

test("an unannotated reference is reported as unannotated and not as a stranger", () => {
  const exported = importNetlist(`(export (components
    (comp (ref "R1") (value "10K"))
    (comp (ref "R2") (value "10K"))
    (comp (ref "R?") (value "10K")))
   (nets
    (net (name "IN") (node (ref "R1") (pin "1")))
    (net (name "MID") (node (ref "R1") (pin "2")) (node (ref "R2") (pin "1")))
    (net (name "OUT") (node (ref "R2") (pin "2")))))`)
  const out = compareSheetToModel(TWO_RESISTORS, DESIGNATORS, PINS, exported)
  expect(out.componentIdentity).toEqual(["reference R? in the schematic is unannotated"])
})

test("one pin moved between two nets is reported from both sides", () => {
  const exported = importNetlist(`(export (components
    (comp (ref "R1") (value "10K"))
    (comp (ref "R2") (value "10K")))
   (nets
    (net (name "IN") (node (ref "R1") (pin "1")))
    (net (name "MID") (node (ref "R1") (pin "2")))
    (net (name "OUT") (node (ref "R2") (pin "1")) (node (ref "R2") (pin "2")))))`)
  const out = compareSheetToModel(TWO_RESISTORS, DESIGNATORS, PINS, exported)
  expect(out.netMembership).toEqual([
    "the model connects [R1.2 R2.1] and the schematic does not",
    "the model connects [R2.2] and the schematic does not",
    "the schematic connects [R1.2] and the model does not",
    "the schematic connects [R2.1 R2.2] and the model does not",
  ])
})

test("a symbol pin the model does not declare is reported as a pin-numbering disagreement", () => {
  const exported = importNetlist(`(export (components
    (comp (ref "R1") (value "10K"))
    (comp (ref "R2") (value "10K")))
   (nets
    (net (name "IN") (node (ref "R1") (pin "1")))
    (net (name "MID") (node (ref "R1") (pin "2")) (node (ref "R2") (pin "1")))
    (net (name "OUT") (node (ref "R2") (pin "2")))
    (net (name "unconnected-(R1-Pad3)") (node (ref "R1") (pin "3")))))`)
  const out = compareSheetToModel(TWO_RESISTORS, DESIGNATORS, PINS, exported)
  expect(out.pinIdentity).toEqual(["R1 pin numbers: model [1, 2] vs schematic [1, 2, 3]"])
})

test("a value the sheet spells differently from the model is reported", () => {
  const exported = importNetlist(`(export (components
    (comp (ref "R1") (value "10K"))
    (comp (ref "R2") (value "22K")))
   (nets
    (net (name "IN") (node (ref "R1") (pin "1")))
    (net (name "MID") (node (ref "R1") (pin "2")) (node (ref "R2") (pin "1")))
    (net (name "OUT") (node (ref "R2") (pin "2")))))`)
  const out = compareSheetToModel(TWO_RESISTORS, DESIGNATORS, PINS, exported)
  expect(out.values).toEqual(['R2: the schematic says "22K" and the model says "10K"'])
})

const AXIAL = "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal"
const SMD = "Resistor_SMD:R_0805_2012Metric"

/** The same two resistors, with a footprint declared on the first one only. */
const ONE_FOOTPRINT = circuit()
  .resistor("r_in", "10k", { a: "IN", b: "MID" }, { footprint: AXIAL })
  .resistor("r_out", "10k", { a: "MID", b: "OUT" })
  .port("input", "IN")
  .port("output", "OUT")
  .done()

function withFootprints(first: string | null, second: string | null): string {
  const field = (f: string | null): string => (f === null ? "" : ` (footprint "${f}")`)
  return `(export (components
    (comp (ref "R1") (value "10K")${field(first)})
    (comp (ref "R2") (value "10K")${field(second)}))
   (nets
    (net (name "IN") (node (ref "R1") (pin "1")))
    (net (name "MID") (node (ref "R1") (pin "2")) (node (ref "R2") (pin "1")))
    (net (name "OUT") (node (ref "R2") (pin "2")))))`
}

test("a declared footprint the sheet disagrees with is reported", () => {
  const out = compareSheetToModel(ONE_FOOTPRINT, DESIGNATORS, PINS, importNetlist(withFootprints(SMD, null)))
  expect(out.footprints).toEqual([
    `R1: the schematic says footprint "${SMD}" and the model says "${AXIAL}"`,
  ])
})

test("a declared footprint the sheet carries no field for is reported as <none>", () => {
  const out = compareSheetToModel(ONE_FOOTPRINT, DESIGNATORS, PINS, importNetlist(withFootprints(null, null)))
  expect(out.footprints).toEqual([
    `R1: the schematic says footprint "<none>" and the model says "${AXIAL}"`,
  ])
})

test("a footprint the sheet agrees with is reported nowhere - the control for the two above", () => {
  const out = compareSheetToModel(ONE_FOOTPRINT, DESIGNATORS, PINS, importNetlist(withFootprints(AXIAL, SMD)))
  // R2 declares no footprint in the model, so the SMD field the sheet carries for it is compared
  // against nothing. That silence is the `footprintsUndeclared` case the module header warns is
  // not agreement, and this asserts it rather than leaving it undocumented.
  expect(out.footprints).toEqual([])
})

/** A single-pole rotary selector drawn with `symbol`, wired to one of its throws. */
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

function selectorBoard(symbol: string) {
  return circuit()
    .resistor("r_in", "10k", { a: "IN", b: "OUT" })
    .add(selector(symbol))
    .port("input", "IN")
    .port("output", "OUT")
    .done()
}

const SELECTOR_DESIGNATORS = new Map([["r_in", "R1"], ["selector", "SW1"]])

/** The export of a sheet drawn with a mount-lug rotary: `kicad-cli` gives `MP` its own net. */
const WITH_MOUNT_LUG = `(export (components
  (comp (ref "R1") (value "10K"))
  (comp (ref "SW1") (value "SW_Rotary_1x6_MP")))
 (nets
  (net (name "IN") (node (ref "R1") (pin "1")) (node (ref "SW1") (pin "7")))
  (net (name "OUT") (node (ref "R1") (pin "2")) (node (ref "SW1") (pin "1")))
  (net (name "unconnected-(SW1-MP)") (node (ref "SW1") (pin "MP")))))`

test("a mechanical mount lug is a one-member set on the model side, not a stray net", () => {
  const pins = new Map([
    ["r_in", new Map([["a", "1"], ["b", "2"]])],
    ["selector", new Map([["pole", "7"], ["t1", "1"]])],
  ])
  const out = compareSheetToModel(
    selectorBoard("Switch:SW_Rotary_1x6_MP"),
    SELECTOR_DESIGNATORS,
    pins,
    importNetlist(WITH_MOUNT_LUG),
  )
  expect(out.netMembership).toEqual([])
  // The lug is still absent from the model's PIN NUMBERING, and that is where the fact belongs:
  // the model carries seven pins and the sheet's symbol draws eight.
  expect(out.pinIdentity).toEqual(["SW1 pin numbers: model [1, 7] vs schematic [1, 7, MP]"])
})

test("a lug on a symbol the mechanical table does not list IS a stray net - the control above", () => {
  const pins = new Map([
    ["r_in", new Map([["a", "1"], ["b", "2"]])],
    ["selector", new Map([["pole", "7"], ["t1", "1"]])],
  ])
  const out = compareSheetToModel(
    selectorBoard("Switch:SW_Rotary_1x12"),
    SELECTOR_DESIGNATORS,
    pins,
    importNetlist(WITH_MOUNT_LUG),
  )
  expect(out.netMembership).toEqual(["the schematic connects [SW1.MP] and the model does not"])
})

/** The export of a sheet whose selector has one detent drawn and wired to nothing. */
const WITH_UNUSED_DETENT = `(export (components
  (comp (ref "R1") (value "10K"))
  (comp (ref "SW1") (value "SW_Rotary_1x12")))
 (nets
  (net (name "IN") (node (ref "R1") (pin "1")) (node (ref "SW1") (pin "13")))
  (net (name "OUT") (node (ref "R1") (pin "2")) (node (ref "SW1") (pin "1")))
  (net (name "unconnected-(SW1-Pad2)") (node (ref "SW1") (pin "2")))))`

test("a pin-number entry the model puts nothing on is a declared no-connect", () => {
  const pins = new Map([
    ["r_in", new Map([["a", "1"], ["b", "2"]])],
    ["selector", new Map([["pole", "13"], ["t1", "1"], ["t2", "2"]])],
  ])
  const out = compareSheetToModel(
    selectorBoard("Switch:SW_Rotary_1x12"),
    SELECTOR_DESIGNATORS,
    pins,
    importNetlist(WITH_UNUSED_DETENT),
  )
  expect(out.netMembership).toEqual([])
  expect(out.pinIdentity).toEqual([])
})

test("the same sheet with that entry dropped disagrees twice - the control for the test above", () => {
  const pins = new Map([
    ["r_in", new Map([["a", "1"], ["b", "2"]])],
    ["selector", new Map([["pole", "13"], ["t1", "1"]])],
  ])
  const out = compareSheetToModel(
    selectorBoard("Switch:SW_Rotary_1x12"),
    SELECTOR_DESIGNATORS,
    pins,
    importNetlist(WITH_UNUSED_DETENT),
  )
  expect(out.netMembership).toEqual(["the schematic connects [SW1.2] and the model does not"])
  // The pin numbers sort as STRINGS - "13" before "2" - which is how the module this replaces
  // sorted them too. Asserted as it is rather than numerically, because the two lists either side
  // of `vs` are compared to each other and a reader of the failure reads both.
  expect(out.pinIdentity).toEqual(["SW1 pin numbers: model [1, 13] vs schematic [1, 13, 2]"])
})

test("a component with no designator refuses by name rather than being skipped", () => {
  expect(() =>
    compareSheetToModel(TWO_RESISTORS, new Map([["r_in", "R1"]]), PINS, importNetlist(AGREEING)),
  ).toThrow(
    'component "r_out" has no entry in the designator map handed to compareSheetToModel, so ' +
      "nothing says which reference on the sheet is this part.",
  )
})

test("a component with no pin-number map refuses by name rather than being skipped", () => {
  const pins = new Map([["r_in", new Map([["a", "1"], ["b", "2"]])]])
  expect(() => compareSheetToModel(TWO_RESISTORS, DESIGNATORS, pins, importNetlist(AGREEING))).toThrow(
    'component "r_out" has no entry in the pin-number map handed to compareSheetToModel, so none ' +
      "of its pins can be named the way a netlist names them",
  )
})

test("a pin with no number refuses by name rather than silently leaving its net short", () => {
  const pins = new Map([
    ["r_in", new Map([["a", "1"]])],
    ["r_out", new Map([["a", "1"], ["b", "2"]])],
  ])
  expect(() => compareSheetToModel(TWO_RESISTORS, DESIGNATORS, pins, importNetlist(AGREEING))).toThrow(
    'component "r_in" unit "MAIN" pin "b" has no entry in the pin-number map handed to ' +
      "compareSheetToModel, so there is no KiCad pin number to compare it under.",
  )
})

test("two canonical pins on one number refuse rather than one overwriting the other", () => {
  const pins = new Map([
    ["r_in", new Map([["a", "1"], ["b", "1"]])],
    ["r_out", new Map([["a", "1"], ["b", "2"]])],
  ])
  expect(() => compareSheetToModel(TWO_RESISTORS, DESIGNATORS, pins, importNetlist(AGREEING))).toThrow(
    'component "r_in": pin number "1" is claimed by both unit "MAIN" pin "a" and unit "MAIN" ' +
      'pin "b". One symbol pin carries one net',
  )
})
