import { test, expect } from "bun:test"
import { net } from "../../lib/model/types.ts"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { buildChecklist } from "../../tools/guide/checklist.ts"
import { buildGuideHtml, type GuideInput } from "../../tools/guide/guide.ts"
import { offBoardLabels } from "../../tools/guide/off-board.ts"
import type { PowerUpCheck } from "../../tools/guide/power-up.ts"
import { COMPONENTS, DUMP_TEXT, fixtureCircuit } from "./fixture.ts"

const DUMP = parseBoardDump(DUMP_TEXT)

function guideHtml(powerUpChecks: readonly PowerUpCheck[] | undefined = undefined): string {
  const circuit = fixtureCircuit(powerUpChecks)
  const edges = offBoardLabels(circuit)
  const input: GuideInput = {
    boardName: "test-board",
    generated: "2026-09-29",
    layoutPath: "boards/test-board/test.vrt",
    schematicPath: "circuits/test.kicad_sch",
    images: { designators: "<svg>designators</svg>", values: "<svg>values</svg>", copper: "<svg>copper</svg>" },
    checklist: buildChecklist(DUMP, circuit, edges),
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
  expect(rows[0]).toEqual(["Q1", "2N3904", "emitter E7, base D7, collector C7"])
  expect(rows[3]).toEqual(["C1", "10uF", "+ F6, - F10"])
  expect(rows[4]).toEqual(["W1", "I3", "I10"])
  expect(rows[5]).toEqual(["W2", "J5", "J7"])
  expect(rows[6]).toEqual(["J1", "Conn_01x02", "A2 INPUT, B2 GND"])
  expect(rows[7]).toEqual(["RV2", "25K", "H2 DRIVE ccw, I2 DRIVE wiper, J2 DRIVE cw"])
  expect(rows[8]).toEqual(["B1", "D9 to E9"])
  expect(rows[9]).toEqual(["1", "C5 and C6", "BASE | GND"])
  expect(rows[10]).toEqual(["2", "F8 and F9", "BASE | GND"])
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

test("a board that exports no power-up checks gets a section saying so", () => {
  const html = guideHtml()
  expect(html).toContain("This board declares no power-up checks")
  expect(html).not.toContain('class="power-up"')
})

test("declared power-up checks render with a blank for the reading", () => {
  const html = guideHtml([{ label: "Q1 collector", node: "OUT", expectedVolts: 12.345 }])
  expect(html).toContain(
    '<td>Q1 collector</td><td>OUT</td><td>12.35 V</td><td class="blank"></td>',
  )
  expect(html).not.toContain("declares no power-up checks")
})

test("a part that fits no checklist step is refused, naming it", () => {
  const withDiode = COMPONENTS.map((component) =>
    component.id === "gain_transistor"
      ? { ...component, kind: "diode" as const, units: [{ name: "MAIN", pins: { anode: net("A"), cathode: net("K") } }] }
      : component,
  )
  const circuit = fixtureCircuit(undefined, withDiode)
  expect(() => buildChecklist(DUMP, circuit, offBoardLabels(circuit))).toThrow(/part Q1 .*kind diode/)
})

test("a cut on a node with no stored net name is refused rather than printed", () => {
  const dump = parseBoardDump(DUMP_TEXT.replace("NODE 2 NAME GND", "NODE 2 NAME -"))
  const circuit = fixtureCircuit()
  expect(() => buildChecklist(dump, circuit, offBoardLabels(circuit))).toThrow(/stores no net name/)
})

test("a transistor or pot whose pin has no PIN_NUMBERS name is refused, not printed bare", () => {
  const circuit = { ...fixtureCircuit(), pinNumbers: { resistor: { a: "1", b: "2" } } }
  expect(() => buildChecklist(DUMP, circuit, [])).toThrow(
    /PIN_NUMBERS has no bjt entry naming pin 1/,
  )
})

test("every table has a header row that repeats on each printed page, and headings keep with them", () => {
  const html = guideHtml([{ label: "Q1 collector", node: "OUT", expectedVolts: 1 }])
  expect(html.match(/<table>/g)?.length).toBe(html.match(/<thead>/g)?.length)
  expect(html).toContain("thead { display: table-header-group; }")
  expect(html).toContain("break-after: avoid")
})
