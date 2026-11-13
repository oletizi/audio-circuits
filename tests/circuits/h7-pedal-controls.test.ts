/**
 * The h7-pedal's six control positions, `controls_a` (1-3) and `controls_b` (4-6) (h7 pedal pages
 * plan, Task 8; inventory section 1.3 B14; CR-PEDAL-BLOCKS). Per position n, both fits
 * (CR-PEDAL-POPULATION, variant positions): the pot RV_POSn from GND (ccw) to VREF_A (cw), its wiper
 * on POSn_NODE; the button SW_BTNn from POSn_NODE to POSn_BTN with R_PUn from 3V3_D; R_BTNn from
 * POSn_BTN to GND; R_POSn from the node to the contract pin POSn; C_POSn at the pin
 * (CR-PEDAL-CONTROL-NODE). Each expectation is written from the cited lines.
 */
import { describe, expect, test } from "bun:test"
import { controlsABlock, controlsBBlock } from "../../circuits/h7-platform/pedal/controls.ts"
import { VARIANT_POSITIONS } from "../../circuits/h7-platform/pedal-population.ts"
import { expectBlock, expectPorts, type PartExpectation } from "./h7-pedal-expect.ts"

const A364 = "analog.md:364"
const P417 = "power.md:417"
const M300 = "mechanical-and-controls.md:300"

function position(p: number): PartExpectation[] {
  const node = `POS${p}_NODE`
  const btn = `POS${p}_BTN`
  const pin = `POS${p}`
  return [
    {
      id: `rv_pos${p}`, kind: "potentiometer", value: 10e3, mpn: "RV16AF-41 B10K", pins: { ccw: "GND", wiper: node, cw: "VREF_A" },
      cites: [[A364, "a 10 kΩ linear pot (Alpha RV16AF-41 B10K) from VREF_A to GND"], ["decisions.md:1980", "**ccw = GND to cw = VREF_A**"], ["decisions.md:1977", "joins the pot's wiper"]],
    },
    {
      id: `r_pu${p}`, kind: "resistor", value: 10e3, pins: { a: "3V3_D", b: node },
      cites: [[P417, "R_PUn 10.0 kΩ to 3V3_D"], [M300, "R_PUn 10.0 kΩ to 3V3_D with a button"], ["decisions.md:1977", "R_PUn (10.0 kΩ from 3V3_D)"]],
    },
    {
      id: `sw_btn${p}`, kind: "switch", mpn: "TC-6610-17-100G", pins: { "1": node, "2": btn },
      cites: [["parts.md:132", "TC-6610-17-100G"], ["decisions.md:1977", "one side of the button"], ["decisions.md:1978", "The button's other side is **POSn_BTN**"]],
    },
    {
      id: `r_btn${p}`, kind: "resistor", value: 1e3, pins: { a: btn, b: "GND" },
      cites: [[P417, "R_BTNn 1.00 kΩ to GND"], [M300, "R_BTNn 1.00 kΩ always fitted"], ["decisions.md:1978", "which R_BTNn (1.00 kΩ) takes to GND"]],
    },
    {
      id: `r_pos${p}`, kind: "resistor", value: 10e3, pins: { a: node, b: pin },
      cites: [[A364, "its wiper through **R_POS 10.0 kΩ**"], [P417, "R_POSn 10.0 kΩ to the pin"], ["decisions.md:1979", "R_POSn (10.0 kΩ) runs to the contract pin **POSn**"]],
    },
    {
      id: `c_pos${p}`, kind: "capacitor", value: 100e-9, pins: { a: pin, b: "GND" },
      cites: [[A364, "to **C_POS 100 nF X7R** at the pin"], ["decisions.md:1979", "where C_POSn (100 nF) goes to GND"]],
    },
  ]
}

describe("controls_a and controls_b (B14)", () => {
  test("controls_a: positions 1-3, both fits each, against the cited lines", () => {
    expectBlock(controlsABlock(), [1, 2, 3].flatMap(position))
  })
  test("controls_b: positions 4-6, both fits each, against the cited lines", () => {
    expectBlock(controlsBBlock(), [4, 5, 6].flatMap(position))
  })
  test("ports: VREF_A, 3V3_D, GND and each block's three contract pins", () => {
    expectPorts(controlsABlock(), ["VREF_A", "3V3_D", "POS1", "POS2", "POS3", "GND"])
    expectPorts(controlsBBlock(), ["VREF_A", "3V3_D", "POS4", "POS5", "POS6", "GND"])
  })
  test("the ids are CR-PEDAL-POPULATION's variant-position ids, every one of them", () => {
    const ids = new Set([...controlsABlock().components, ...controlsBBlock().components].map((c) => c.id))
    for (const v of VARIANT_POSITIONS) {
      for (const id of [...v.potFit, ...v.buttonFit, ...v.alwaysFitted]) expect([id, ids.has(id)]).toEqual([id, true])
    }
    expect(ids.size).toBe(VARIANT_POSITIONS.length * 6)
  })
  test("the pots are linear (parts.md:131, 10 kohm linear)", () => {
    for (const c of [...controlsABlock().components, ...controlsBBlock().components].filter((x) => x.kind === "potentiometer")) {
      expect([c.id, "taper" in c.parameters ? c.parameters.taper : undefined]).toEqual([c.id, { type: "linear" }])
    }
  })
})
