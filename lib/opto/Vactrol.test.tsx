import { test, expect } from "bun:test"
import {
  renderCircuit,
  findComponent,
  expectConnected,
  expectNotConnected,
} from "../testing/circuit-assertions.ts"
import { Vactrol } from "./Vactrol.tsx"

const fixture = (
  <board width="20mm" height="20mm">
    <Vactrol name="VT1" footprint="dip4" />
    <resistor name="R_LED" resistance="3.3k" footprint="0805" />
    <resistor name="R_SHUNT" resistance="22k" footprint="0805" />
    <net name="V9" />
    <net name="GND" />
    <net name="SIG" />
    <trace from=".R_LED > .pin1" to="net.V9" />
    <trace from=".R_LED > .pin2" to=".VT1 > .LED_A" />
    <trace from=".VT1 > .LED_K" to="net.GND" />
    <trace from=".R_SHUNT > .pin1" to="net.SIG" />
    <trace from=".R_SHUNT > .pin2" to=".VT1 > .LDR_1" />
    <trace from=".VT1 > .LDR_2" to="net.GND" />
  </board>
)

test("Vactrol exposes four semantic pins", async () => {
  const el = await renderCircuit(fixture)
  expect(findComponent(el, "VT1")).toBeDefined()
  expectConnected(el, "VT1.LED_A", "R_LED.pin2")
  expectConnected(el, "VT1.LDR_1", "R_SHUNT.pin2")
})

test("LED and LDR sides are electrically isolated", async () => {
  const el = await renderCircuit(fixture)
  // The defining property of the part: no electrical path between sides.
  expectNotConnected(el, "VT1.LED_A", "VT1.LDR_1")
  expectNotConnected(el, "VT1.LED_A", "VT1.LDR_2")
  expectNotConnected(el, "VT1.LED_K", "VT1.LDR_1")
})

test("footprint is required at the type level", () => {
  // Compile-time contract. If this file type-checks with the line below
  // uncommented, the required-footprint guarantee has regressed.
  // @ts-expect-error - footprint is required and must not have a default
  const bad = <Vactrol name="VT2" />
  expect(bad).toBeDefined()
})
