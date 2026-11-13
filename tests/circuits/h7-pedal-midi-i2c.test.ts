/**
 * The h7-pedal's MIDI and I2C block, `midi_i2c` (h7 pedal pages plan, Task 8; inventory section 1.3
 * B17): R-26's MIDI OUT driver and switch up to MIDI_PIN4 and MIDI_PIN5 (U_MIDIDRV with its 100 nF,
 * R_TXPU, Q_MIDI, R_MGP, RA four in parallel, RC); USB-08's not-fitted MIDI header; the I2C expansion
 * pull-ups; and the 3V3_D test pad. Left out, by CR-PEDAL-MIDI and CR-PEDAL-I2C-EXPANSION: the
 * connector carrying MIDI pins 4 and 5 with its CA-033 ferrites (MIDI-OUT-CONNECTOR), the MIDI IN
 * receiver (MIDI-IN-RECEIVER-STOCK) and any I2C expansion connector (I2C-EXPANSION-CONNECTOR). Each
 * expectation is written from the cited lines.
 */
import { describe, expect, test } from "bun:test"
import { midiI2cBlock } from "../../circuits/h7-platform/pedal/midi-i2c.ts"
import { MIDI, NOT_FITTED_CONNECTORS } from "../../circuits/h7-platform/pedal-population.ts"
import { expectBlock, expectPorts, type PartExpectation } from "./h7-pedal-expect.ts"

const P460 = "power.md:460"
const P413 = "power.md:413"

const RA = [1, 2, 3, 4].map((k): PartExpectation => ({
  id: `r_ra${k}`, kind: "resistor", value: 130, mpn: "1206W4F1300T5E", pins: { a: "MIDI_DRAIN", b: "MIDI_PIN4" },
  cites: [[P460, "its drain to RA (four 130 Ω ±1 % 1206 in parallel, C17914) and then MIDI pin 4"], ["parts.md:143", "1206W4F1300T5E"], ["decisions.md:2053", "**MIDI_PIN4**"]],
}))

const MIDI_I2C: readonly PartExpectation[] = [
  {
    // SN74LVC1G07 DBV: 1 NC, 2 A, 3 GND, 4 Y (open drain), 5 VCC (pedal-pin-tables.ts, SCES296AG).
    id: "u_mididrv", kind: "ic", mpn: "SN74LVC1G07DBVR", pins: { "1": "NC", "2": "MIDI_UART_TX", "3": "GND", "4": "MIDI_GATE", "5": "3V3_D" },
    cites: [[P460, "pulled low by U_MIDIDRV's open-drain output (SN74LVC1G07 on 3V3_D, driven by MIDI_UART_TX)"], ["parts.md:139", "SN74LVC1G07DBVR"]],
  },
  {
    id: "c_mididrv", kind: "capacitor", value: 100e-9, pins: { a: "3V3_D", b: "GND" },
    cites: [["decisions.md:1936", "U_MIDIDRV, SN74LVC1G07DBVR, on 3V3_D"], ["decisions.md:2056", "U_MIDIDRV's decoupling is"]],
  },
  {
    id: "r_txpu", kind: "resistor", value: 18e3, mpn: "0603WAF1802T5E", pins: { a: "MIDI_UART_TX", b: "3V3_D" },
    cites: [["decisions.md:1022", "R_TXPU 18.0 kΩ ±1 % from MIDI_UART_TX to 3V3_D"], ["parts.md:140", "0603WAF1802T5E"]],
  },
  {
    // AO3401A: 1 G, 2 S, 3 D (CR-PEDAL-SYMBOL-AO3400A).
    id: "q_midi", kind: "ic", mpn: "AO3401A", pins: { "1": "MIDI_GATE", "2": "3V3_P", "3": "MIDI_DRAIN" },
    cites: [[P460, "a high-side P-MOSFET with its source on 3V3_P"], ["parts.md:141", "AO3401A"]],
  },
  {
    id: "r_mgp", kind: "resistor", value: 160, mpn: "1206W4F1600T5E", pins: { a: "MIDI_GATE", b: "3V3_P" },
    cites: [[P460, "Its gate is pulled up to 3V3_P by R_MGP 160 Ω ±1 % 1206 (C17919)"], ["parts.md:142", "1206W4F1600T5E"]],
  },
  ...RA,
  {
    id: "r_rc", kind: "resistor", value: 10, mpn: "1206W4F100JT5E", pins: { a: "MIDI_PIN5", b: "GND" },
    cites: [[P460, "pin 5 through RC 10 Ω ±1 % 1206 (C17903) to GND"], ["parts.md:144", "1206W4F100JT5E"], ["decisions.md:2053", "**MIDI_PIN5**"]],
  },
  {
    id: "j_midi", kind: "connector", symbol: "Connector_Generic:Conn_01x04", pins: { "1": "3V3_D", "2": "MIDI_UART_TX", "3": "MIDI_UART_RX", "4": "GND" },
    cites: [["schematic-checklist.md:217", "1 = 3V3_D, 2 = MIDI_UART_TX, 3 = MIDI_UART_RX, 4 = GND"], ["decisions.md:2052", "The header is modelled and drawn, not fitted"]],
  },
  {
    id: "r_scl_pu", kind: "resistor", value: 2.4e3, mpn: "0603WAF2401T5E", pins: { a: "EXP_I2C_SCL", b: "3V3_D" },
    cites: [[P413, "**2.40 kΩ ±1 %** (Uniroyal 0603WAF2401T5E, C22940) on the pedal only"], ["architecture.md:342", "On pins 12/13, to 3V3_D"]],
  },
  {
    id: "r_sda_pu_exp", kind: "resistor", value: 2.4e3, mpn: "0603WAF2401T5E", pins: { a: "EXP_I2C_SDA", b: "3V3_D" },
    cites: [[P413, "**2.40 kΩ ±1 %** (Uniroyal 0603WAF2401T5E, C22940) on the pedal only"], ["architecture.md:342", "On pins 12/13, to 3V3_D"]],
  },
  {
    id: "tp_3v3_d", kind: "connector", symbol: "Connector:TestPoint", pins: { "1": "3V3_D" },
    cites: [["decisions.md:1951", "**3V3_D** → 3V3_D"], ["decisions.md:2210", "is drawn on the `midi_i2c` page"]],
  },
]

describe("midi_i2c (B17)", () => {
  test("its parts, values and nets, each against its cited line; the undrawn MIDI and I2C parts left out", () => {
    expectBlock(midiI2cBlock(), MIDI_I2C)
  })
  test("its ports: both rails, the four contract nets, the two MIDI loop nets and GND", () => {
    expectPorts(midiI2cBlock(), [
      "3V3_D", "3V3_P", "MIDI_UART_TX", "MIDI_UART_RX", "EXP_I2C_SCL", "EXP_I2C_SDA", MIDI.loopNets.pin4, MIDI.loopNets.pin5, "GND",
    ])
  })
  test("the header is CR-PEDAL-POPULATION's not-fitted connector, pin for pin", () => {
    const header = NOT_FITTED_CONNECTORS.find((c) => c.id === "j_midi")
    const j = midiI2cBlock().components.find((c) => c.id === "j_midi")
    expect(j?.part).toEqual(header?.part)
    expect(Object.fromEntries(Object.entries(j?.units[0]?.pins ?? {}).map(([k, v]) => [k, v.kind === "net" ? v.net : "NC"]))).toEqual({ ...header?.pins })
  })
})
