/**
 * A small hand-written board for the guide and packet tests, in the pinned
 * fork's `--dump-board` grammar, with the circuit facts that go with it: a
 * transistor, a resistor, a trim-pot, an electrolytic, an input header, a
 * panel pot on a 3-pin header, two wires, two cuts (listed out of reading
 * order) and a solder bridge.
 */
import { net, type Component } from "../../lib/model/types.ts"
import { boardCircuitFrom, type BoardCircuit } from "../../tools/guide/circuit.ts"
import type { PowerUpChecks } from "../../tools/guide/power-up.ts"

export const DUMP_TEXT = [
  "PART Q1 TO92 2N3904 AT 2,6 SPAN 1",
  "PART R1 RESISTOR 10K AT 2,3 SPAN 1",
  "PART RV1 TRIM_FLAT 50K AT 6,10 SPAN 3",
  "PART C1 CAP_ELECTRO_200 10uF AT 5,5 SPAN 3",
  "PART J1 SIP2 Conn_01x02 AT 0,0 SPAN 1",
  "PART RV2 SIP3 25K AT 7,0 SPAN 1",
  "NODE 1 NAME IN_EXT J1.1 C1.2",
  "NODE 2 NAME GND J1.2 R1.2 RV2.1",
  "NODE 3 NAME BASE C1.1 Q1.2 R1.1",
  "NODE 4 NAME DRIVE_WIPER RV2.2",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "CUT 5,7,3 5,8,2",
  "CUT 2,4,3 2,5,2",
  "SOLDER 3,8 4,8",
  "WIRE Wire9 AT 9,4 ENDS 9,4,2,2 9,6,2,2",
  "WIRE Wire2 AT 8,2 ENDS 8,2,2,2 8,9,2,2",
  "GRID 11 12",
  "PIN Q1 1 AT 4,6",
  "PIN Q1 2 AT 3,6",
  "PIN Q1 3 AT 2,6",
  "PIN R1 1 AT 2,3",
  "PIN R1 2 AT 6,3",
  "PIN RV1 1 AT 6,10",
  "PIN RV1 2 AT 7,11",
  "PIN RV1 3 AT 8,10",
  "PIN C1 1 AT 5,5",
  "PIN C1 2 AT 5,9",
  "PIN J1 1 AT 0,1",
  "PIN J1 2 AT 1,1",
  "PIN RV2 1 AT 7,1",
  "PIN RV2 2 AT 8,1",
  "PIN RV2 3 AT 9,1",
  "",
].join("\n")

const HEADER = "Connector_PinHeader_2.54mm:PinHeader_1x03_P2.54mm_Vertical"

function pot(id: string, footprint: string, ccw: string, wiper: string, cw: string): Component {
  return {
    id, kind: "potentiometer", parameters: {}, part: { footprint }, pins: {},
    units: [{ name: "MAIN", pins: { ccw: net(ccw), wiper: net(wiper), cw: net(cw) } }],
  }
}

function twoPin(id: string, kind: "resistor" | "capacitor", a: string, b: string): Component {
  return { id, kind, parameters: {}, pins: {}, units: [{ name: "MAIN", pins: { a: net(a), b: net(b) } }] }
}

export const COMPONENTS: readonly Component[] = [
  {
    id: "gain_transistor", kind: "bjt", parameters: {}, pins: {},
    units: [{ name: "MAIN", pins: { emitter: net("GND"), base: net("BASE"), collector: net("OUT") } }],
  },
  twoPin("bias_resistor", "resistor", "BASE", "GND"),
  pot("gain_trim", "Potentiometer_THT:Potentiometer_Runtron_RM-065_Vertical", "BASE", "GND", "GND"),
  twoPin("input_cap", "capacitor", "BASE", "IN_EXT"),
  {
    id: "input_header", kind: "connector", parameters: {}, pins: {},
    units: [{ name: "MAIN", pins: { "1": net("IN_EXT"), "2": net("GND") } }],
  },
  pot("drive_pot", HEADER, "GND", "DRIVE_WIPER", "DRIVE_TOP"),
]

export const DESIGNATORS: Readonly<Record<string, string>> = {
  gain_transistor: "Q1", bias_resistor: "R1", gain_trim: "RV1", input_cap: "C1",
  input_header: "J1", drive_pot: "RV2",
}

export const PIN_NUMBERS = {
  resistor: { a: "1", b: "2" },
  capacitor: { a: "1", b: "2" },
  potentiometer: { ccw: "1", wiper: "2", cw: "3" },
  bjt: { emitter: "1", base: "2", collector: "3" },
}

export function fixtureCircuit(
  powerUpChecks: PowerUpChecks | undefined = undefined,
  components: readonly Component[] = COMPONENTS,
): BoardCircuit {
  return boardCircuitFrom({ components, ports: { input: "IN_EXT" } }, DESIGNATORS, PIN_NUMBERS, powerUpChecks)
}
