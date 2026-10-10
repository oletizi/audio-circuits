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

/**
 * A pin header, beside the screw terminal above.
 *
 * BOTH ARE NEEDED, and their absence hid a real defect: `BLOCK` really is a Phoenix
 * screw terminal, so a guide that called EVERY `kind: "connector"` a "terminal block"
 * passed this suite while labelling the Pultec junction - a `PinHeader_1x05` - as a part
 * the design doc rules out in terms ("A 1x05 screw terminal does NOT fit"). The kind
 * cannot tell these two apart; only the footprint can, so the suite has to hold one of
 * each.
 */
const HEADER: Component = {
  id: "stack_header",
  kind: "connector",
  parameters: {},
  part: {
    symbol: "Connector_Generic:Conn_01x02",
    footprint: "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical",
    electricallyInert: true,
  },
  pins: {},
  units: [{ name: "MAIN", pins: { "1": net("T1"), "2": net("T2") } }],
  provenance: { source: PHYSICAL_ONLY },
}

const NETWORK: Network = {
  ports: { IN: "IN", OUT: "OUT" },
  components: [CAP, POT, SELECTOR, MODE, BLOCK, HEADER],
}

const INPUT: WiringInput = {
  boardName: "example",
  circuitPath: "circuits/pultec/example.ts",
  network: NETWORK,
  designators: {
    C1: "C1", RV_LEVEL: "RV_LEVEL", SW_FREQ: "SW_FREQ", SW_MODE: "SW_MODE",
    board_terminals: "board_terminals", stack_header: "stack_header",
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

test("a connector is named by what it IS, not by its kind", () => {
  // The defect this closes: every connector was called a "terminal block", so the
  // Pultec junction - a 2.54mm pin header, and the design doc rejects a screw terminal
  // there because its body overhangs the second row - told a builder to buy the wrong
  // part. The name comes off the footprint, which is the only thing that knows.
  const doc = wiringDocument(INPUT)
  expect(doc).toContain("### stack_header — 1x02 pin header, 2.54mm pitch")
  expect(doc).toContain("### board_terminals — terminal block")
  const headerSection = doc.slice(doc.indexOf("### stack_header"))
  expect(headerSection).not.toContain("terminal block")
})

test("a connector whose footprint names no known family refuses rather than guessing", () => {
  const unknown: Component = {
    ...HEADER,
    id: "mystery",
    part: { footprint: "Connector_Nonexistent:Whatever_1x02", electricallyInert: true },
  }
  const input: WiringInput = {
    ...INPUT,
    network: { ...NETWORK, components: [CAP, POT, SELECTOR, MODE, BLOCK, unknown] },
    designators: { ...INPUT.designators, mystery: "mystery" },
  }
  expect(() => wiringDocument(input)).toThrow(/mystery/)
  expect(() => wiringDocument(input)).toThrow(/Connector_Nonexistent/)
})

/**
 * Two single-row headers declared to be rows of ONE pin field, as the Pultec junction
 * is: see `JUNCTION_FIELD` in `circuits/pultec/physical/parts.ts`.
 *
 * WHAT THESE PIN. The guide used to name each row by its footprint - accurate - and say
 * nothing about the part, so a builder ordered two plain vertical headers and could not
 * stack the boards the junction is a shared bus for. The note the field produces is the
 * fix, and these check it says what somebody at a supplier needs: one part, its whole
 * size, and long tails.
 */
const FIELD_ROWS: readonly Component[] = ["row_a", "row_b"].map((id) => ({
  ...HEADER,
  id,
  part: {
    symbol: "Connector_Generic:Conn_01x02",
    footprint: "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical",
    electricallyInert: true,
    pinField: { name: "junction", mating: "stacking" },
  },
}))

function withFieldRows(rows: readonly Component[]): WiringInput {
  return {
    ...INPUT,
    network: { ...NETWORK, components: [CAP, POT, SELECTOR, MODE, BLOCK, ...rows] },
    designators: {
      ...INPUT.designators,
      ...Object.fromEntries(rows.map((row) => [row.id, row.id.toUpperCase()])),
    },
  }
}

test("rows of one pin field are named as one part to order, with its whole size", () => {
  const doc = wiringDocument(withFieldRows(FIELD_ROWS))
  const terminals = doc.slice(doc.indexOf("## Board terminals"))
  // The size and pin count are read off the rows' own footprints, so a field that grew
  // a row or changed pitch changes these words rather than outliving them.
  expect(terminals).toContain("ONE 2x02 pin field")
  expect(terminals).toContain("4-pin field at 2.54mm pitch")
  expect(terminals).toContain("LONG-TAIL (stacking) header")
  // Both rows are named by the designator their own heading uses, so the note points at
  // the two tables below it rather than at ids nothing else in the guide shows.
  expect(terminals).toContain("`ROW_A` and `ROW_B`")
  // And the thing not to buy is said outright: that is the order a builder would place
  // from the headings alone.
  expect(terminals).toContain("2 plain vertical 1x02 headers")
})

test("a board whose connectors declare no pin field carries no field note", () => {
  // `INPUT`'s header is a lone 1x02 that no other part shares a field with, so there is
  // nothing to say and the guide says nothing - rather than a paragraph about stacking
  // appearing over every pin header in the repository.
  const doc = wiringDocument(INPUT)
  expect(doc).not.toContain("pin field")
})

test("a pin field with one row refuses: it describes no split", () => {
  const [only] = FIELD_ROWS
  expect(only).toBeDefined()
  expect(() => wiringDocument(withFieldRows([only!]))).toThrow(/only one row/)
  expect(() => wiringDocument(withFieldRows([only!]))).toThrow(/row_a/)
})

test("rows of a pin field that disagree about shape refuse rather than taking the first", () => {
  const [first, second] = FIELD_ROWS
  expect(first).toBeDefined()
  const longer: Component = {
    ...second!,
    part: { ...second!.part, footprint: "Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical" },
  }
  const input = withFieldRows([first!, longer])
  // Describing the field by the first row would print a size no part has, which is the
  // same wrong-part-to-order defect one level up.
  expect(() => wiringDocument(input)).toThrow(/different shapes/)
  expect(() => wiringDocument(input)).toThrow(/1x02 at 2.54mm and row_b is 1x05/)
})

test("a pin field row that is not a pin header refuses", () => {
  const [first, second] = FIELD_ROWS
  const screw: Component = {
    ...second!,
    part: { ...second!.part, footprint: BLOCK.part!.footprint! },
  }
  expect(() => wiringDocument(withFieldRows([first!, screw]))).toThrow(/is not a pin header/)
})

test("a pin field row that is already a multi-row header refuses", () => {
  const [first, second] = FIELD_ROWS
  const twoRow: Component = {
    ...second!,
    part: { ...second!.part, footprint: "Connector_PinHeader_2.54mm:PinHeader_2x05_P2.54mm_Vertical" },
  }
  expect(() => wiringDocument(withFieldRows([first!, twoRow]))).toThrow(/already a multi-row field/)
})

test("a connector with no footprint refuses: the kind cannot say what the part is", () => {
  const bare: Component = { ...HEADER, id: "bare", part: { electricallyInert: true } }
  const input: WiringInput = {
    ...INPUT,
    network: { ...NETWORK, components: [CAP, POT, SELECTOR, MODE, BLOCK, bare] },
    designators: { ...INPUT.designators, bare: "bare" },
  }
  expect(() => wiringDocument(input)).toThrow(/no footprint/)
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

test("a board with no stand-in groups carries no stand-in section", () => {
  // pt2399-core and the transistor-preamp boards hold no positions for absent
  // sections, so the section would be a heading over the word "None". The five Pultec
  // section boards DO declare one - see tests/board/scaffold-wiring.test.ts, which
  // checks it against the configuration networks it describes.
  const doc = wiringDocument(INPUT)
  expect(doc).not.toContain("## Stand-in groups")
  expect(doc).toContain("There are three kinds of thing here")
})
