import { test, expect } from "bun:test"
import { readFileSync } from "node:fs"
import {
  footprintForKind,
  junctionGroundComponent,
  junctionSignalComponent,
} from "../../circuits/pultec/physical/parts.ts"
import type { Component } from "../../lib/model/types.ts"

/** The net a pin names, or a thrown error if it is not on one. */
function netAtPin(component: Component, pin: string): string {
  const connection = component.units[0]!.pins[pin]
  if (connection === undefined || connection.kind !== "net") {
    throw new Error(`"${component.id}" pin ${pin} is not on a net`)
  }
  return connection.net
}

function capacitor(farads: number): Component {
  return {
    id: "c_test",
    kind: "capacitor",
    parameters: { farads },
    pins: {},
    units: [{ name: "MAIN", pins: {} }],
  }
}

test("footprintForKind refuses a capacitance below FILM_BY_FARADS' floor", () => {
  expect(() => footprintForKind(capacitor(100e-12))).toThrow(/no film footprint is recorded/)
})

test("footprintForKind refuses a capacitance above FILM_BY_FARADS' ceiling", () => {
  // The bug this guards: the table matched `farads >= threshold` in descending
  // order with no upper bound, so 470nF, 1uF and 10uF all silently returned the
  // 330nF footprint instead of refusing.
  for (const farads of [470e-9, 1e-6, 10e-6]) {
    expect(() => footprintForKind(capacitor(farads)), `${farads}F`).toThrow(
      /no film footprint is recorded/,
    )
  }
})

test("footprintForKind accepts the recorded ceiling value itself", () => {
  expect(footprintForKind(capacitor(330e-9))).toBe("Capacitor_THT:C_Rect_L7.2mm_W3.5mm_P5.00mm")
})

test("footprintForKind accepts the recorded floor value itself", () => {
  expect(footprintForKind(capacitor(470e-12))).toBe("Capacitor_THT:C_Rect_L7.2mm_W4.5mm_P5.00mm")
})

test("every board's junction carries all five ladder nets, one per signal-row pin", () => {
  // Ruling 2026-10-09: modelled as two 1x05 headers (no verified VeroRoute
  // shape for a 2.54mm 2x05 exists), occupying the same pin field a 2x05
  // would. The signal row carries the odd-pin nets from the design doc's
  // pinout table, in order.
  const signals = junctionSignalComponent()
  expect(signals.part?.footprint).toBe("Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical")
  expect(signals.part?.symbol).toBe("Connector_Generic:Conn_01x05")
  expect(["1", "2", "3", "4", "5"].map((pin) => netAtPin(signals, pin)))
    .toEqual(["in", "hi_boost_out", "lo_boost_in", "out", "0"])
})

test("the junction's ground row interleaves a return beside each signal pin", () => {
  const grounds = junctionGroundComponent()
  expect(grounds.part?.footprint).toBe("Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical")
  expect(grounds.part?.symbol).toBe("Connector_Generic:Conn_01x05")
  for (const pin of ["1", "2", "3", "4", "5"]) expect(netAtPin(grounds, pin), pin).toBe("0")
})

test("both junction rows are electrically inert, so projectPhysical keeps its guarantee", () => {
  expect(junctionSignalComponent().part?.electricallyInert).toBe(true)
  expect(junctionGroundComponent().part?.electricallyInert).toBe(true)
})

test("no board models its junction as a terminal block or a single 2x05 part any more", () => {
  // TERMINAL_BLOCK_3 was 5.08mm and asserted a connector type. A 2x05 header
  // was tried next and rejected by ruling (no verified VeroRoute import
  // string for a two-row 2.54mm shape) in favour of two 1x05 rows.
  const source = readFileSync("circuits/pultec/physical/parts.ts", "utf8")
  expect(source).not.toContain("TERMINAL_BLOCK_3")
  expect(source).not.toContain("TerminalBlock_Phoenix")
  expect(source).not.toContain("PinHeader_2x05")
  expect(source).not.toContain("Conn_02x05_Odd_Even")
})
