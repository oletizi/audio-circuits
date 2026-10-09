import { test, expect } from "bun:test"
import { readFileSync } from "node:fs"
import { footprintForKind, junctionComponent } from "../../circuits/pultec/physical/parts.ts"
import type { Component } from "../../lib/model/types.ts"

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

test("every board's junction carries all five ladder nets with interleaved grounds", () => {
  const junction = junctionComponent()
  expect(junction.part?.footprint).toBe("Connector_PinHeader_2.54mm:PinHeader_2x05_P2.54mm_Vertical")
  expect(junction.part?.symbol).toBe("Connector_Generic:Conn_02x05_Odd_Even")
  const pins = junction.units[0]!.pins
  const netAt = (pin: string): string => {
    const connection = pins[pin]
    if (connection === undefined || connection.kind !== "net") {
      throw new Error(`junction pin ${pin} is not on a net`)
    }
    return connection.net
  }
  expect([netAt("1"), netAt("3"), netAt("5"), netAt("7"), netAt("9")])
    .toEqual(["in", "hi_boost_out", "lo_boost_in", "out", "0"])
  for (const even of ["2", "4", "6", "8", "10"]) expect(netAt(even), even).toBe("0")
})

test("the junction is electrically inert, so projectPhysical keeps its guarantee", () => {
  expect(junctionComponent().part?.electricallyInert).toBe(true)
})

test("no board models its junction as a terminal block any more", () => {
  // TERMINAL_BLOCK_3 was 5.08mm and asserted a connector type. The 2x05 asserts
  // holes and nets, so ribbon, leads, direct solder or a stacking header are all
  // build-time choices on one pattern.
  const source = readFileSync("circuits/pultec/physical/parts.ts", "utf8")
  expect(source).not.toContain("TERMINAL_BLOCK_3")
  expect(source).not.toContain("TerminalBlock_Phoenix")
})
