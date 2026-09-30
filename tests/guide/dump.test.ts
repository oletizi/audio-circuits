import { test, expect } from "bun:test"
import { parseBoardDump, holeName } from "../../tools/guide/dump.ts"

/**
 * A small dump shaped like the pinned fork's `--dump-board` output (see
 * `.tools/veroroute-perfboard/Src/Headless_dump.cpp` and
 * `Headless_dump_pins.cpp` for the grammar, and
 * `.superpowers/sdd/2026-09-29-build-guide/staged-dump.txt` for a real one):
 * one resistor, one stretched electrolytic (its two leads land four columns
 * apart although its SPAN, the body's own footprint width, is 3 - SPAN is
 * never a lead span), one floating (unplaced) resistor, one placed wire, two
 * cuts and one solder bridge.
 */
const DUMP = [
  "PART R1 RESISTOR 10K AT 2,3 SPAN 1",
  "PART C1 CAP_ELECTRO_200 10uF AT 5,5 SPAN 3",
  "PART R2 RESISTOR 4K7 FLOATING SPAN 1",
  "NODE 1 NAME VCC R1.1 C1.1",
  "NODE 2 NAME GND R1.2 C1.2 R2.1",
  "NET_NAMES 2",
  "PIN_NAME_TABLES 0",
  "ROUTING_ENABLED 0",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "CUT 2,3,1 2,4,9",
  "CUT 5,5,1 5,6,9",
  "SOLDER 2,4 3,4",
  "DIAGS_MODE OFF",
  "WIRE W1 AT 8,8 ENDS 8,8,2,2 10,8,2,2",
  "GRID 20 30",
  "PIN R1 1 AT 2,3",
  "PIN R1 2 AT 2,4",
  "PIN C1 1 AT 5,5",
  "PIN C1 2 AT 5,9",
  "",
].join("\n")

test("GRID is parsed as the board size in holes", () => {
  expect(parseBoardDump(DUMP).grid).toEqual({ rows: 20, cols: 30 })
})

test("VERTICAL_STRIPS is parsed as a boolean", () => {
  expect(parseBoardDump(DUMP).verticalStrips).toBe(false)
  const vertical = DUMP.replace("VERTICAL_STRIPS 0", "VERTICAL_STRIPS 1")
  expect(parseBoardDump(vertical).verticalStrips).toBe(true)
})

test("every PART line is parsed, placed and floating alike, with SPAN kept but not used for position", () => {
  const parts = parseBoardDump(DUMP).parts
  expect(parts).toEqual([
    { ref: "R1", type: "RESISTOR", value: "10K", placement: { row: 2, col: 3 }, span: 1 },
    { ref: "C1", type: "CAP_ELECTRO_200", value: "10uF", placement: { row: 5, col: 5 }, span: 3 },
    { ref: "R2", type: "RESISTOR", value: "4K7", placement: "floating", span: 1 },
  ])
})

test("PIN lines are parsed by ref, and a stretched part's leads land where PIN says, not where SPAN implies", () => {
  const pins = parseBoardDump(DUMP).pins
  expect(pins["R1"]).toEqual([
    { pin: "1", row: 2, col: 3 },
    { pin: "2", row: 2, col: 4 },
  ])
  // C1's SPAN is 3 (its body footprint), but its leads are 4 columns apart -
  // the stretched-lead case the design calls out. Positions come only from PIN.
  expect(pins["C1"]).toEqual([
    { pin: "1", row: 5, col: 5 },
    { pin: "2", row: 5, col: 9 },
  ])
  // R2 is floating: it prints no PIN lines at all.
  expect(pins["R2"]).toBeUndefined()
})

test("WIRE lines are parsed by name with both ends as row/col pairs", () => {
  expect(parseBoardDump(DUMP).wires).toEqual([
    { name: "W1", ends: [{ row: 8, col: 8 }, { row: 10, col: 8 }] },
  ])
})

test("NODE lines are parsed into an id -> name map", () => {
  expect(parseBoardDump(DUMP).nodes).toEqual({ "1": "VCC", "2": "GND" })
})

test("CUT_STATE is parsed verbatim", () => {
  expect(parseBoardDump(DUMP).cutState).toBe("COMPUTED")
})

test("CUT lines are parsed as two noded hole positions each", () => {
  expect(parseBoardDump(DUMP).cuts).toEqual([
    { a: { row: 2, col: 3, nodeId: "1" }, b: { row: 2, col: 4, nodeId: "9" } },
    { a: { row: 5, col: 5, nodeId: "1" }, b: { row: 5, col: 6, nodeId: "9" } },
  ])
})

test("SOLDER lines are parsed as bridges: two hole positions, no node ids (the dump names none)", () => {
  expect(parseBoardDump(DUMP).bridges).toEqual([{ a: { row: 2, col: 4 }, b: { row: 3, col: 4 } }])
})

test("a dump lacking GRID while a part is placed refuses, naming the line and the fix", () => {
  const noGrid = DUMP.split("\n")
    .filter((line) => !line.startsWith("GRID "))
    .join("\n")
  expect(() => parseBoardDump(noGrid)).toThrow(/GRID/)
  expect(() => parseBoardDump(noGrid)).toThrow(/pinned/)
})

test("a dump lacking PIN lines while a part is placed refuses, naming the line and the fix", () => {
  const noPins = DUMP.split("\n")
    .filter((line) => !line.startsWith("PIN "))
    .join("\n")
  expect(() => parseBoardDump(noPins)).toThrow(/PIN/)
  expect(() => parseBoardDump(noPins)).toThrow(/pinned/)
})

test("a dump with every part floating needs no PIN lines (GRID, VERTICAL_STRIPS and CUT_STATE are always required)", () => {
  const allFloating = [
    "PART R2 RESISTOR 4K7 FLOATING SPAN 1",
    "NODE 1 NAME GND R2.1",
    "VERTICAL_STRIPS 0",
    "CUT_STATE NOT_APPLICABLE",
    "GRID 10 10",
    "",
  ].join("\n")
  const dump = parseBoardDump(allFloating)
  expect(dump.grid).toEqual({ rows: 10, cols: 10 })
  expect(dump.pins).toEqual({})
})

test("GRID, VERTICAL_STRIPS and CUT_STATE are always required, even on an all-floating board", () => {
  const base = [
    "PART R2 RESISTOR 4K7 FLOATING SPAN 1",
    "VERTICAL_STRIPS 0",
    "CUT_STATE NOT_APPLICABLE",
    "GRID 10 10",
    "",
  ]
  const without = (keyword: string): string =>
    base.filter((line) => !line.startsWith(`${keyword} `)).join("\n")
  expect(() => parseBoardDump(without("GRID"))).toThrow(/GRID/)
  expect(() => parseBoardDump(without("VERTICAL_STRIPS"))).toThrow(/VERTICAL_STRIPS/)
  expect(() => parseBoardDump(without("CUT_STATE"))).toThrow(/CUT_STATE/)
})

test("holeName gives lettered rows and numbered columns: 0 -> A, 25 -> Z, 26 -> AA", () => {
  expect(holeName(0, 0)).toBe("A1")
  expect(holeName(25, 0)).toBe("Z1")
  expect(holeName(26, 0)).toBe("AA1")
  expect(holeName(0, 11)).toBe("A12")
})
