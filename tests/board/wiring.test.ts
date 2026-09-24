import { test, expect } from "bun:test"
import { wiringDocument } from "../../lib/board/wiring.ts"
import { PHYSICAL_ONLY } from "../../lib/board/physicalize.ts"
import { net } from "../../lib/model/types.ts"
import type { Component, Network } from "../../lib/model/types.ts"
import type { WiringInput } from "../../lib/board/wiring.ts"

const CAP: Component = {
  id: "C1",
  kind: "capacitor",
  parameters: { farads: 1e-7 },
  part: { footprint: "Capacitor_THT:C_Rect_L7.2mm_W2.5mm_P5.00mm" },
  pins: {},
  units: [{ name: "MAIN", pins: { a: net("IN"), b: net("T1") } }],
}

const POT: Component = {
  id: "RV_LEVEL",
  kind: "potentiometer",
  parameters: { ohms: 470000, taper: { type: "log", curveConstant: 4.8 } },
  part: { symbol: "Device:R_Potentiometer" },
  pins: {},
  units: [{ name: "MAIN", pins: { ccw: net("IN"), wiper: net("OUT"), cw: net("OUT") } }],
}

const SELECTOR: Component = {
  id: "SW_FREQ",
  kind: "switch",
  parameters: {
    positions: ["20Hz", "30Hz"],
    contacts: { "20Hz": [["common", "t1"]], "30Hz": [["common", "t2"]] },
    gang: "lo_freq",
  },
  part: { symbol: "Switch:SW_Rotary" },
  pins: {},
  units: [{ name: "MAIN", pins: { common: net("OUT"), t1: net("T1"), t2: net("T2") } }],
}

const MODE: Component = {
  id: "SW_MODE",
  kind: "switch",
  parameters: { positions: ["a", "b"], contacts: { a: [["common", "x"]], b: [["common", "y"]] } },
  part: { symbol: "Switch:SW_SPDT" },
  pins: {},
  units: [{ name: "MAIN", pins: { common: net("T2"), x: net("IN"), y: net("OUT") } }],
}

const BLOCK: Component = {
  id: "board_terminals",
  kind: "connector",
  parameters: {},
  part: {
    symbol: "Connector_Generic:Conn_01x03",
    footprint: "TerminalBlock_Phoenix:TerminalBlock_Phoenix_MKDS-1,5-3-5.08_1x03_P5.08mm_Horizontal",
    electricallyInert: true,
  },
  pins: {},
  units: [{ name: "MAIN", pins: { "1": net("IN"), "2": net("OUT"), "3": net("0") } }],
  provenance: { source: PHYSICAL_ONLY },
}

const NETWORK: Network = {
  ports: { IN: "IN", OUT: "OUT" },
  components: [CAP, POT, SELECTOR, MODE, BLOCK],
}

const INPUT: WiringInput = {
  boardName: "example",
  circuitPath: "circuits/pultec/example.ts",
  network: NETWORK,
  designators: {
    C1: "C1", RV_LEVEL: "RV_LEVEL", SW_FREQ: "SW_FREQ", SW_MODE: "SW_MODE",
    board_terminals: "board_terminals",
  },
  offBoard: new Set(["RV_LEVEL", "SW_FREQ", "SW_MODE"]),
  padOrder: {
    RV_LEVEL: ["ccw", "wiper", "cw"],
    SW_FREQ: ["common", "t1", "t2"],
    SW_MODE: ["common", "x", "y"],
  },
  sharedBy: { IN: ["hi-boost"], OUT: ["low-boost"], "0": [] },
}

test("the document names the board and the file it was generated from", () => {
  const doc = wiringDocument(INPUT)
  expect(doc).toContain("example")
  expect(doc).toContain("circuits/pultec/example.ts")
})

test("every off-board pad is listed with its number, terminal name and net", () => {
  const doc = wiringDocument(INPUT)
  // Pad numbers are 1-based positions in the declared pad order, which is what
  // the exporter emits and therefore what the layout shows.
  expect(doc).toMatch(/\|\s*1\s*\|\s*ccw\s*\|\s*—\s*\|\s*IN\s*\|/)
  expect(doc).toMatch(/\|\s*2\s*\|\s*wiper\s*\|\s*—\s*\|\s*OUT\s*\|/)
  expect(doc).toMatch(/\|\s*3\s*\|\s*cw\s*\|\s*—\s*\|\s*OUT\s*\|/)
})

test("pads that share a net are flagged as a deliberate tie, not a routing accident", () => {
  // RV_LEVEL's wiper and cw are both on OUT - the rheostat wiring. The board's
  // copper does the joining; what the builder must not do is "tidy" it away.
  const doc = wiringDocument(INPUT)
  const section = doc.slice(doc.indexOf("RV_LEVEL"))
  expect(section).toMatch(/2 \(wiper\) and 3 \(cw\) are one net/)
  expect(section).toMatch(/deliberate/)
})

test("a switch throw says which position selects it, not just its pin name", () => {
  // The low selectors name throws t1..t6, which is useless at a bench. The
  // frequency comes from `contacts`, so the guide cannot disagree with the
  // frequency tables the circuit is built from.
  const doc = wiringDocument(INPUT)
  const section = doc.slice(doc.indexOf("SW_FREQ"))
  expect(section).toMatch(/\|\s*2\s*\|\s*t1\s*\|\s*20Hz\s*\|/)
  expect(section).toMatch(/\|\s*3\s*\|\s*t2\s*\|\s*30Hz\s*\|/)
})

test("a common pad selects nothing, and says so rather than showing a stray position", () => {
  const doc = wiringDocument(INPUT)
  const section = doc.slice(doc.indexOf("SW_FREQ"))
  expect(section).toMatch(/\|\s*1\s*\|\s*common\s*\|\s*—\s*\|/)
})

test("a ganged selector says which other switch it shares a shaft with", () => {
  const doc = wiringDocument(INPUT)
  expect(doc).toMatch(/SW_FREQ[\s\S]*?lo_freq/)
})

test("an unganged switch carries no gang note", () => {
  const doc = wiringDocument(INPUT)
  const modeSection = doc.slice(doc.indexOf("SW_MODE"))
  expect(modeSection).not.toMatch(/one physical switch/i)
})

test("the terminal block is listed with the boards each net reaches", () => {
  const doc = wiringDocument(INPUT)
  expect(doc).toContain("board_terminals")
  expect(doc).toMatch(/hi-boost/)
  expect(doc).toMatch(/low-boost/)
})

test("a crossing net no other board touches says so rather than showing a blank", () => {
  const doc = wiringDocument(INPUT)
  // Net "0" is the chassis landing here: physical-only, reaching no other board.
  expect(doc).not.toMatch(/\|\s*3\s*\|\s*0\s*\|\s*\|/)
})

test("on-board parts are listed with the value to fit and what they sit between", () => {
  // These were once omitted, on the reasoning that the layout already shows
  // where they go. That failed the one person the guide is for: somebody doing
  // the layout holds a bag of parts and a board full of designators, and the
  // layout does not say that C1 is 100nF.
  const doc = wiringDocument(INPUT)
  expect(doc).toMatch(/\|\s*C1\s*\|\s*100nF\s*\|/)
  expect(doc).toMatch(/\|\s*C1\s*\|[^|]*\|[^|]*IN[^|]*\|/)
})

test("a net a selector switches is labelled with the position, not just the net name", () => {
  // `T1` says nothing at a bench; the selector knows that net as "20Hz". The
  // label comes from the switch's own contacts, so it cannot disagree with the
  // frequency tables the circuit is built from.
  const doc = wiringDocument(INPUT)
  const onBoard = doc.slice(doc.indexOf("## On the board"), doc.indexOf("## Panel parts"))
  expect(onBoard).toContain("T1 (20Hz)")
})

test("the three kinds of connection are named in plain language", () => {
  // The question that prompted this: "what are the board_terminals for?" The
  // answer must be in the document, not inferable from a heading.
  const doc = wiringDocument(INPUT)
  expect(doc).toMatch(/place and solder/)
  expect(doc).toMatch(/NOT on the board/)
  expect(doc).toMatch(/leave this board for the OTHER boards/)
})

test("a component with no declared pad order refuses rather than guessing", () => {
  const broken: WiringInput = { ...INPUT, padOrder: { RV_LEVEL: ["ccw", "wiper", "cw"] } }
  expect(() => wiringDocument(broken)).toThrow(/SW_FREQ/)
})

test("generation is deterministic", () => {
  expect(wiringDocument(INPUT)).toBe(wiringDocument(INPUT))
})
