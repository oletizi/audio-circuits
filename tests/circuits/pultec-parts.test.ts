import { test, expect } from "bun:test"
import { footprintForKind } from "../../circuits/pultec/physical/parts.ts"
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
