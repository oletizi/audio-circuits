import { test, expect } from "bun:test"
import { net } from "../../lib/model/types.ts"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { buildChecklist } from "../../tools/guide/checklist.ts"
import { buildGuideHtml, type GuideInput, type GuideSchematic } from "../../tools/guide/guide.ts"
import { offBoardLabels } from "../../tools/guide/off-board.ts"
import type { PowerUpChecks } from "../../tools/guide/power-up.ts"
import { COMPONENTS, DUMP_TEXT, fixtureCircuit } from "./fixture.ts"

const DUMP = parseBoardDump(DUMP_TEXT)

const PRINTED_SCHEMATIC: GuideSchematic = { kind: "printed", path: "circuits/test.kicad_sch" }

const NO_SCHEMATIC: GuideSchematic = {
  kind: "none",
  declarationPath: "boards/test-board/perfboard.json",
  circuitPath: "circuits/test.ts",
}

function guideHtml(
  powerUpChecks: PowerUpChecks | undefined = undefined,
  schematic: GuideSchematic = PRINTED_SCHEMATIC,
): string {
  const circuit = fixtureCircuit(powerUpChecks)
  const edges = offBoardLabels(circuit)
  const input: GuideInput = {
    boardName: "test-board",
    generated: "2026-09-29",
    layoutPath: "boards/test-board/test.vrt",
    schematic,
    images: { designators: "<svg>designators</svg>", values: "<svg>values</svg>", copper: "<svg>copper</svg>" },
    checklist: buildChecklist(DUMP, circuit, edges, [], new Map()),
    powerUpChecks: circuit.powerUpChecks,
  }
  return buildGuideHtml(input)
}

/** Each checklist row's cells, in document order. */
function itemRows(html: string): string[][] {
  return [...html.matchAll(/<tr class="item">(.*?)<\/tr>/g)].map((match) =>
    [...(match[1] ?? "").matchAll(/<td>(.*?)<\/td>/g)].map((cell) => cell[1] ?? ""),
  )
}

test("the checklist lists every part, wire, bridge and cut in the operator's order", () => {
  const firstCells = itemRows(guideHtml()).map((row) => row[0])
  expect(firstCells).toEqual(["Q1", "R1", "RV1", "C1", "W1", "W2", "J1", "RV2", "B1", "1", "2"])
})

test("every checklist item carries a printed checkbox", () => {
  const rows = [...guideHtml().matchAll(/<tr class="item">(.*?)<\/tr>/g)]
  expect(rows.length).toBe(11)
  for (const row of rows) expect(row[0]).toContain('<span class="box"')
})

test("the step headings come in the operator's order of operations", () => {
  const headings = [...guideHtml().matchAll(/<h3>\d+\. (.*?)<\/h3>/g)].map((match) => match[1])
  expect(headings).toEqual([
    "ICs and transistors",
    "Resistors and trim-pots",
    "Capacitors",
    "Wire links",
    "Wire-to-board junctions",
    "Solder bridges",
    "Cuts",
  ])
})

test("parts give value and leads; wires, bridges and cuts give their holes; cuts their nets", () => {
  const rows = itemRows(guideHtml())
  // THE FOURTH CELL ON EVERY PART ROW IS THE MOUNTING, and these rows cover
  // three of the column's four answers by the fixture's own data rather than by
  // coincidence: Q1's component records no footprint, which is the ordinary case
  // for a part VeroRoute expands into pads; C1's is a radial can, one mounting
  // because both leads leave the same face; J1's 1x02 header and RV2's 3-pin
  // field are rigid, so there is nothing to decide there either. R1's row is the
  // axial family with two mountings and is asserted in the tests below, where
  // the span is what varies, and the fourth answer - no recorded span - has its
  // own test after them.
  expect(rows[0]).toEqual([
    "Q1", "2N3904", "emitter E7, base D7, collector C7",
    "unknown: the circuit records no footprint for this part",
  ])
  expect(rows[3]).toEqual(["C1", "10uF", "+ F6, - F10", "one mounting"])
  expect(rows[4]).toEqual(["W1", "I3", "I10"])
  expect(rows[5]).toEqual(["W2", "J5", "J7"])
  expect(rows[6]).toEqual(["J1", "2-pin header", "A2 INPUT, B2 GND", "one mounting"])
  expect(rows[7]).toEqual([
    "RV2", "3-pin header (25K pot, off-board)",
    "H2 DRIVE ccw, I2 DRIVE wiper, J2 DRIVE cw", "one mounting",
  ])
  expect(rows[8]).toEqual(["B1", "D9 to E9"])
  expect(rows[9]).toEqual(["1", "C5 and C6", "BASE | GND"])
  expect(rows[10]).toEqual(["2", "F8 and F9", "BASE | GND"])
})

test("a resistor at a span its body fits between is not told to stand on end", () => {
  // R1's holes are rows 2 and 6 of column 3, so it spans 5 - which is exactly
  // the MBB0207's flat floor, and the floor is read rather than restated here:
  // `Mmin. 10.0` rounds up to 4 grid steps, and 4 steps is 5 holes
  // (`lib/kicad/grid.ts`). At the floor the body fits, so nothing is required of
  // the builder, and the cell says that rather than shouting.
  const rows = itemRows(guideHtml())
  expect(rows[1]).toEqual(["R1", "10K", "C4, G4", "flat ok"])
})

test("a resistor compressed below its flat floor is told to STAND ON END", () => {
  // THE CASE THE WHOLE COLUMN EXISTS FOR, and the owner's own board is this
  // shape: *"It's standard practice to stand resistors on end when their holes
  // are next to each other."* R1's second lead is moved from row 6 to row 4, so
  // it spans 3 holes against a flat floor of 5 - his hand-laid low-boost's R2 to
  // the hole. The dump is modified rather than the fixture, so every other row
  // above is unaffected and what varies between this test and the one before it
  // is one lead position.
  const dump = parseBoardDump(DUMP_TEXT.replace("PIN R1 2 AT 6,3", "PIN R1 2 AT 4,3"))
  const circuit = fixtureCircuit()
  const resistors = buildChecklist(dump, circuit, offBoardLabels(circuit), [], new Map()).find(
    (section) => section.title === "Resistors and trim-pots",
  )
  expect(resistors?.columns).toEqual(["Part", "Value", "Leads", "Mounting"])
  expect(resistors?.rows.find((row) => row[0] === "R1")).toEqual([
    "R1", "10K", "C4, E4", "STAND ON END",
  ])
})

test("a footprint with no recorded span says so in the cell rather than leaving it blank", () => {
  // THE FOURTH ANSWER, and an empty cell is what it must never be: a builder
  // reading nothing where an instruction belongs cannot tell "no mounting is
  // required of you" from "nobody worked it out". `pt2399-core` is this case
  // live - twelve disc ceramics and two phi5 cans whose lead length is in
  // `UNSOURCED` with what is missing from each - so the resistor is refitted
  // here with one of those footprints rather than with an invented name.
  const circuit = fixtureCircuit(undefined, [
    ...COMPONENTS.filter((component) => component.id !== "bias_resistor"),
    {
      id: "bias_resistor", kind: "resistor", parameters: {},
      part: { footprint: "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm" }, pins: {},
      units: [{ name: "MAIN", pins: { a: net("BASE"), b: net("GND") } }],
    },
  ])
  const resistors = buildChecklist(DUMP, circuit, offBoardLabels(circuit), [], new Map()).find(
    (section) => section.title === "Resistors and trim-pots",
  )
  expect(resistors?.rows.find((row) => row[0] === "R1")?.[3])
    .toBe("unknown: no lead span recorded (lib/kicad/lead-span.ts)")
})

test("a header's Value names what goes in its holes, its pin count read from the dump's PIN lines", () => {
  // Three PIN lines for J1 where its type still says SIP2: the count comes from PIN, not the type.
  const dump = parseBoardDump(DUMP_TEXT.replace("PIN J1 2 AT 1,1", "PIN J1 2 AT 1,1\nPIN J1 3 AT 2,1"))
  const circuit = fixtureCircuit()
  const junctions = buildChecklist(dump, circuit, offBoardLabels(circuit), [], new Map()).find((s) => s.title === "Wire-to-board junctions")
  expect(junctions?.rows.map((row) => row[1])).toEqual(["3-pin header", "3-pin header (25K pot, off-board)"])
})

test("the header, then the three images, then the checklist", () => {
  const html = guideHtml()
  const at = (needle: string): number => {
    const index = html.indexOf(needle)
    expect(index).toBeGreaterThan(-1)
    return index
  }
  expect(at("boards/test-board/test.vrt")).toBeLessThan(at("<svg>designators</svg>"))
  expect(at("<svg>designators</svg>")).toBeLessThan(at("<svg>values</svg>"))
  expect(at("<svg>values</svg>")).toBeLessThan(at("<svg>copper</svg>"))
  expect(at("<svg>copper</svg>")).toBeLessThan(at("Build checklist"))
  expect(at("Build checklist")).toBeLessThan(at("Power-up checks"))
  expect(html).toContain("size: letter")
})

test("a packet with no schematic says so on page one, before the first image", () => {
  // THE WHOLE POINT OF THE "none" SHAPE: a reader holding the paper must not be
  // able to read a four-page packet as a five-page one with a page missing. So
  // the statement is asserted to be IN THE PRINTED HTML and to come before any
  // layout image - not merely present somewhere in the document.
  const html = guideHtml(undefined, NO_SCHEMATIC)
  const at = (needle: string): number => {
    const index = html.indexOf(needle)
    expect({ needle, found: index > -1 }).toEqual({ needle, found: true })
    return index
  }
  expect(at("No schematic in this packet")).toBeLessThan(at("<svg>designators</svg>"))
  expect(html).toContain("no schematic page has gone missing from it")
  expect(html).toContain("there is no schematic for test-board to print")
  expect(html).toContain("boards/test-board/perfboard.json")
  expect(html).toContain("circuits/test.ts")
  expect(html).toContain("make guide")
  expect(html).toContain('<dt>Schematic</dt><dd>none - see &quot;No schematic in this packet&quot; below</dd>')
})

test("a packet that does print a schematic carries no no-schematic notice", () => {
  // The other half of the guard: a false alarm on a complete packet would
  // devalue the notice everywhere it IS true.
  const html = guideHtml()
  expect(html).not.toContain("No schematic in this packet")
  expect(html).not.toContain('class="notice"')
  expect(html).toContain("<dt>Schematic</dt><dd>circuits/test.kicad_sch</dd>")
})

test("a board that exports no power-up checks gets a section saying so", () => {
  const html = guideHtml()
  expect(html).toContain("This board declares no power-up checks")
  expect(html).not.toContain('class="power-up"')
})

test("declared power-up checks render with a blank for the reading, and the conditions above the table", () => {
  const html = guideHtml({
    conditions: "Supply 24 V, at START.",
    checks: [{ label: "Q1 collector", node: "OUT", expectedVolts: 12.345 }],
  })
  expect(html).toContain(
    '<td>Q1 collector</td><td>OUT</td><td>12.35 V</td><td class="blank"></td>',
  )
  expect(html).toContain('<p class="conditions">Supply 24 V, at START.</p>')
  expect(html).not.toContain("declares no power-up checks")
})

test("a part that fits no checklist step is refused, naming it", () => {
  const withDiode = COMPONENTS.map((component) =>
    component.id === "gain_transistor"
      ? { ...component, kind: "diode" as const, units: [{ name: "MAIN", pins: { anode: net("A"), cathode: net("K") } }] }
      : component,
  )
  const circuit = fixtureCircuit(undefined, withDiode)
  expect(() => buildChecklist(DUMP, circuit, offBoardLabels(circuit), [], new Map())).toThrow(/part Q1 .*kind diode/)
})

test("a cut on a node with no stored net name is refused rather than printed", () => {
  const dump = parseBoardDump(DUMP_TEXT.replace("NODE 2 NAME GND", "NODE 2 NAME -"))
  const circuit = fixtureCircuit()
  expect(() => buildChecklist(dump, circuit, offBoardLabels(circuit), [], new Map())).toThrow(/stores no net name/)
})

test("a transistor or pot whose pin has no PIN_NUMBERS name is refused, not printed bare", () => {
  const circuit = { ...fixtureCircuit(), pinNumbers: { resistor: { a: "1", b: "2" } } }
  expect(() => buildChecklist(DUMP, circuit, [], [], new Map())).toThrow(
    /PIN_NUMBERS has no bjt entry naming pin 1/,
  )
})

test("every table has a header row that repeats on each printed page, and headings keep with them", () => {
  const html = guideHtml({ conditions: "at START", checks: [{ label: "Q1 collector", node: "OUT", expectedVolts: 1 }] })
  expect(html.match(/<table>/g)?.length).toBe(html.match(/<thead>/g)?.length)
  expect(html).toContain("thead { display: table-header-group; }")
  expect(html).toContain("break-after: avoid")
})
