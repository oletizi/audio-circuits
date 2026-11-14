/**
 * `symbolPinConnection` (draughting/pages/cross-page-drivers.ts) resolves a driver entry's KiCad
 * symbol pin number to the model's net by the drawing's own numbering (`pinNumberFor`), never by a
 * kind table alone (h7 pedal pages plan, Task 10 fix round 1, review I1 and M7; controller ruling).
 *
 * Probe on h7Pedal(): the three OPA1688 duals U17 (u_in), U18 (u_adc) and U19 (u_out) are numbered
 * from their own `symbolPins` (A out 1, in- 2, in+ 3; v- 4; B in+ 5, in- 6, out 7; v+ 8), which the
 * pedal's kind table for a single op-amp (out 1, v- 2, in+ 3, in- 4, v+ 5) would number wrongly on
 * pins 2, 4 and 5. A driver entry naming a dual's pin on the wrong net is refused, a resistor's `b`
 * resolves to Device:R pin 2, and an ambiguous number is reported as ambiguous.
 */
import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import type { Component } from "../../lib/model/index.ts"
import { REPO_ROOT, loadBoard } from "../../draughting/pages/board.ts"
import { checkCrossPageDrivers, libraryPin, symbolPinConnection } from "../../draughting/pages/cross-page-drivers.ts"

const board = await loadBoard(join(REPO_ROOT, "drafted/h7-platform/h7-pedal"))

function byRef(ref: string): Component {
  const id = Object.entries(board.designators).find(([, d]) => d === ref)?.[0]
  const c = board.network.components.find((x) => x.id === id)
  if (c === undefined) throw new Error(`h7Pedal() has no component with designator ${ref}`)
  return c
}

function netOf(ref: string, pin: string): string | null {
  const r = symbolPinConnection(board, byRef(ref), pin)
  if ("problem" in r) throw new Error(`${ref} pin ${pin}: ${r.problem}`)
  return r.net
}

describe("symbolPinConnection numbers a pin as the drawing does", () => {
  test("the duals' pins 2, 4 and 5 resolve to the nets their symbol puts them on", () => {
    expect([netOf("U17", "2"), netOf("U17", "4"), netOf("U17", "5")]).toEqual(["IN_FOLLOW_L", "GND", "in_fe_IN_T_R"])
    expect([netOf("U18", "2"), netOf("U18", "4"), netOf("U18", "5")]).toEqual(["adc_drv_ADC_INV_L", "GND", "adc_drv_VBIAS_R"])
    expect([netOf("U19", "2"), netOf("U19", "4"), netOf("U19", "5")]).toEqual(["out_OUT_INV_L", "GND", "out_OUT_NI_R"])
  })
  test("U18's other pins: 1 and 7 the outputs, 8 V+ on 5V_A", () => {
    expect([netOf("U18", "1"), netOf("U18", "7"), netOf("U18", "8")]).toEqual(["adc_drv_ADC_OUT_L", "adc_drv_ADC_OUT_R", "5V_A"])
  })
  test("a resistor's b is Device:R pin 2: R107's is on VINL", () => {
    expect(netOf("R107", "2")).toBe("VINL")
  })
  test("a pin number the part does not have is no such pin", () => {
    const r = symbolPinConnection(board, byRef("U18"), "9")
    expect("problem" in r ? r.problem : "").toContain('has no pin numbered "9"')
  })
  test("an ambiguous number is reported as ambiguous, by name", () => {
    const twoOnes = { ...board, pinNumbers: { ...board.pinNumbers, resistor: { a: "1", b: "1" } } }
    const r = symbolPinConnection(twoOnes, byRef("R107"), "1")
    expect("problem" in r ? r.problem : "").toBe('pin number "1" is ambiguous in the model: the drawing gives it to a, b')
  })
})

describe("checkCrossPageDrivers holds a dual's pin to its net", () => {
  const pinName = (ref: string, pin: string): string => libraryPin(board, byRef(ref).part?.symbol ?? "", pin)?.name ?? "(none)"
  test("control: a 5V_A entry naming U18 pin 5 (B's +IN, on VBIAS_R) is refused", () => {
    const entry = { net: "5V_A", block: "adc_drv", designator: "U18", pin: "5", pinName: pinName("U18", "5"), source: "test" }
    expect(() => checkCrossPageDrivers({ entries: [entry], ruling: "test" }, board)).toThrow("U18 pin 5 is on net adc_drv_VBIAS_R in the model, not on 5V_A")
  })
  test("a 5V_A entry naming U18 pin 8 (V+) passes the model check", () => {
    const entry = { net: "5V_A", block: "adc_drv", designator: "U18", pin: "8", pinName: pinName("U18", "8"), source: "test" }
    expect(() => checkCrossPageDrivers({ entries: [entry], ruling: "test" }, board)).not.toThrow()
  })
})
