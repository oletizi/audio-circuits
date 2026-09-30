import { test, expect } from "bun:test"
import { net, type Component } from "../../lib/model/types.ts"
import { boardCircuitFrom } from "../../tools/perfboard/board-circuit.ts"
import { deriveNeeds } from "../../tools/bom/needs.ts"

const RESISTOR_FOOTPRINT = "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal"
const CAP_FOOTPRINT = "Capacitor_THT:CP_Radial_D5.0mm_P2.00mm"
const TRIMMER_FOOTPRINT = "Potentiometer_THT:Potentiometer_Runtron_RM-065_Vertical"
const PANEL_POT_FOOTPRINT = "Connector_PinHeader_2.54mm:PinHeader_1x03_P2.54mm_Vertical"
const HEADER_2_FOOTPRINT = "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical"
const TO92_FOOTPRINT = "Package_TO_SOT_THT:TO-92_Inline"

const BJT_PIN_NUMBERS = { bjt: { emitter: "1", base: "2", collector: "3" } }

function resistor(id: string, ohms: number, footprint: string = RESISTOR_FOOTPRINT): Component {
  return {
    id, kind: "resistor", parameters: { ohms }, part: { footprint }, pins: {},
    units: [{ name: "MAIN", pins: { a: net(`${id}_A`), b: net(`${id}_B`) } }],
  }
}

function bareResistor(id: string, ohms: number): Component {
  return {
    id, kind: "resistor", parameters: { ohms }, pins: {},
    units: [{ name: "MAIN", pins: { a: net(`${id}_A`), b: net(`${id}_B`) } }],
  }
}

function capacitor(id: string, farads: number): Component {
  return {
    id, kind: "capacitor", parameters: { farads }, part: { footprint: CAP_FOOTPRINT }, pins: {},
    units: [{ name: "MAIN", pins: { a: net(`${id}_A`), b: net(`${id}_B`) } }],
  }
}

function bjt(id: string): Component {
  return {
    id, kind: "bjt", parameters: {},
    part: { mpn: "2N3904", footprint: TO92_FOOTPRINT }, pins: {},
    units: [{ name: "MAIN", pins: { emitter: net("E"), base: net("B"), collector: net("C") } }],
  }
}

function pot(
  id: string, ohms: number, footprint: string, mpn: string | undefined = undefined,
): Component {
  return {
    id, kind: "potentiometer", parameters: { ohms, taper: { type: "linear" } },
    part: { footprint, ...(mpn !== undefined ? { mpn } : {}) }, pins: {},
    units: [{ name: "MAIN", pins: { ccw: net("A"), wiper: net("B"), cw: net("C") } }],
  }
}

function connector(id: string, footprint: string, symbol: string): Component {
  return {
    id, kind: "connector", parameters: {}, part: { footprint, symbol }, pins: {},
    units: [{ name: "MAIN", pins: { "1": net("X"), "2": net("Y") } }],
  }
}

function diode(id: string): Component {
  return {
    id, kind: "diode", parameters: {}, part: { footprint: "Diode_THT:D_5mm" }, pins: {},
    units: [{ name: "MAIN", pins: { a: net("A"), k: net("K") } }],
  }
}

test("groups identical requirements, sorts designators naturally and computes ratings", () => {
  const components: readonly Component[] = [
    resistor("bias_resistor", 100_000),
    resistor("load_resistor", 100_000),
    resistor("small_resistor", 1_000),
    capacitor("input_cap", 1e-5),
    bjt("gain_transistor"),
    pot("gain_trim", 50_000, TRIMMER_FOOTPRINT, "RM-065"),
    pot("drive_pot", 25_000, PANEL_POT_FOOTPRINT),
    connector("input_header", HEADER_2_FOOTPRINT, "Connector_Generic:Conn_01x02"),
  ]
  const designators: Readonly<Record<string, string>> = {
    bias_resistor: "R2", load_resistor: "R10", small_resistor: "R5",
    input_cap: "C3", gain_transistor: "Q1", gain_trim: "RV1", drive_pot: "RV5",
    input_header: "J1",
  }
  const circuit = boardCircuitFrom({ components, ports: {} }, designators, BJT_PIN_NUMBERS)
  const dissipation = new Map([
    ["bias_resistor", 0.01],
    ["load_resistor", 0.2],
    ["small_resistor", 0.05],
  ])

  const lines = deriveNeeds(circuit, 24, dissipation)
  const byKey = new Map(lines.map((line) => [line.key, line]))

  expect(lines).toHaveLength(8)

  const hundredK = byKey.get("resistor 100K R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal")
  expect(hundredK).toBeDefined()
  expect(hundredK?.designators).toEqual(["R2", "R10"])
  expect(hundredK?.quantity).toBe(2)
  expect(hundredK?.placement).toBe("on-board")
  expect(hundredK?.ohms).toBe(100_000)
  expect(hundredK?.physical).toEqual({ kind: "axial-resistor", body: "0207", leadSpacingMm: 10.16 })
  // minWatts is the group's max: max(2*0.01, 2*0.2) = 0.4
  expect(hundredK?.minWatts).toBeCloseTo(0.4)

  const oneK = byKey.get("resistor 1K R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal")
  expect(oneK?.designators).toEqual(["R5"])
  expect(oneK?.minWatts).toBeCloseTo(0.25)

  const cap = byKey.get("capacitor 10uF CP_Radial_D5.0mm_P2.00mm")
  expect(cap?.designators).toEqual(["C3"])
  expect(cap?.farads).toBe(1e-5)
  expect(cap?.minVolts).toBe(35) // rail 24 V x1.2 margin = 28.8, next standard rating is 35
  expect(cap?.physical).toEqual({ kind: "radial-electrolytic", maxDiameterMm: 5.0, leadSpacingMm: 2.0 })

  const transistor = byKey.get("bjt 2N3904 TO-92_Inline")
  expect(transistor?.designators).toEqual(["Q1"])
  expect(transistor?.mpn).toBe("2N3904")
  expect(transistor?.physical).toEqual({ kind: "to92", pinOrder: ["emitter", "base", "collector"] })

  const trimmer = byKey.get("potentiometer 50K linear RM-065 Potentiometer_Runtron_RM-065_Vertical")
  expect(trimmer?.designators).toEqual(["RV1"])
  expect(trimmer?.ohms).toBe(50_000)
  expect(trimmer?.taper).toBe("linear")
  expect(trimmer?.mpn).toBe("RM-065")
  expect(trimmer?.physical).toEqual({ kind: "trimmer", package: "RM-065" })

  const panelPotOffBoard = byKey.get("potentiometer 25K linear panel-pot")
  expect(panelPotOffBoard?.designators).toEqual(["RV5"])
  expect(panelPotOffBoard?.placement).toBe("off-board")
  expect(panelPotOffBoard?.ohms).toBe(25_000)
  expect(panelPotOffBoard?.taper).toBe("linear")
  expect(panelPotOffBoard?.physical).toEqual({ kind: "panel-pot" })

  const panelPotHeader = byKey.get("connector Conn_01x03 PinHeader_1x03_P2.54mm_Vertical")
  expect(panelPotHeader?.designators).toEqual(["RV5"])
  expect(panelPotHeader?.placement).toBe("on-board")
  expect(panelPotHeader?.physical).toEqual({ kind: "pin-header", pins: 3, pitchMm: 2.54 })

  const header = byKey.get("connector Conn_01x02 PinHeader_1x02_P2.54mm_Vertical")
  expect(header?.designators).toEqual(["J1"])
  expect(header?.placement).toBe("on-board")
  expect(header?.physical).toEqual({ kind: "pin-header", pins: 2, pitchMm: 2.54 })
})

test("a kind with no rule (e.g. a diode) throws naming the component and kind", () => {
  const components: readonly Component[] = [diode("clip_diode")]
  const circuit = boardCircuitFrom({ components, ports: {} }, { clip_diode: "D1" }, {})
  expect(() => deriveNeeds(circuit, 24, new Map())).toThrow(/"clip_diode"/)
  expect(() => deriveNeeds(circuit, 24, new Map())).toThrow(/diode/)
})

test("a component with no footprint throws", () => {
  const components: readonly Component[] = [bareResistor("bare_resistor", 100)]
  const circuit = boardCircuitFrom({ components, ports: {} }, { bare_resistor: "R1" }, {})
  expect(() => deriveNeeds(circuit, 24, new Map([["bare_resistor", 0.01]]))).toThrow(
    /"bare_resistor"/,
  )
})

test("a resistor missing from the dissipation map throws", () => {
  const components: readonly Component[] = [resistor("undissipated_resistor", 100)]
  const circuit = boardCircuitFrom({ components, ports: {} }, { undissipated_resistor: "R1" }, {})
  expect(() => deriveNeeds(circuit, 24, new Map())).toThrow(/"undissipated_resistor"/)
})
