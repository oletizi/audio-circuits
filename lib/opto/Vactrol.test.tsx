import { test, expect } from "bun:test"
import {
  renderCircuit,
  findComponent,
  expectConnected,
  expectNotConnected,
} from "../testing/circuit-assertions.ts"
import { Vactrol } from "./Vactrol.tsx"

// Each of the four pins must be on a distinct net energised through a real
// component. If LED_K and LDR_2 both went to GND they would share a net
// externally, and an internal short between exactly those pins would be
// undetectable. This mirrors the real circuit, where LED_K reaches the driver
// through a sense resistor and LDR_2 sits on VBIAS — neither is on ground.
const fixture = (
  <board width="20mm" height="20mm">
    <Vactrol name="VT1" footprint="dip4" />
    <resistor name="R_LED" resistance="3.3k" footprint="0805" />
    <resistor name="R_LED_RTN" resistance="10" footprint="0805" />
    <resistor name="R_SHUNT" resistance="22k" footprint="0805" />
    <resistor name="R_LDR_RTN" resistance="10k" footprint="0805" />
    <net name="V9" />
    <net name="GND" />
    <net name="SIG" />
    <net name="LED_RTN" />
    <net name="LDR_RTN" />
    <trace from=".R_LED > .pin1" to="net.V9" />
    <trace from=".R_LED > .pin2" to=".VT1 > .LED_A" />
    <trace from=".VT1 > .LED_K" to="net.LED_RTN" />
    <trace from=".R_LED_RTN > .pin1" to="net.LED_RTN" />
    <trace from=".R_LED_RTN > .pin2" to="net.GND" />
    <trace from=".R_SHUNT > .pin1" to="net.SIG" />
    <trace from=".R_SHUNT > .pin2" to=".VT1 > .LDR_1" />
    <trace from=".VT1 > .LDR_2" to="net.LDR_RTN" />
    <trace from=".R_LDR_RTN > .pin1" to="net.LDR_RTN" />
    <trace from=".R_LDR_RTN > .pin2" to="net.GND" />
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
  // Note: expectNotConnected also passes for a FLOATING pin, so these
  // assertions are only meaningful because the fixture energises every pin
  // on a distinct net through a real component.
  expectNotConnected(el, "VT1.LED_A", "VT1.LDR_1")
  expectNotConnected(el, "VT1.LED_A", "VT1.LDR_2")
  expectNotConnected(el, "VT1.LED_K", "VT1.LDR_1")
  expectNotConnected(el, "VT1.LED_K", "VT1.LDR_2")
})

test("the isolation fixture energises all four pins on distinct nets", async () => {
  const el = await renderCircuit(fixture)
  expectConnected(el, "VT1.LED_A", "R_LED.pin2")
  expectConnected(el, "VT1.LED_K", "R_LED_RTN.pin1")
  expectConnected(el, "VT1.LDR_1", "R_SHUNT.pin2")
  expectConnected(el, "VT1.LDR_2", "R_LDR_RTN.pin1")
  expectNotConnected(el, "VT1.LED_K", "VT1.LDR_2")
})

test("footprint is required at the type level", () => {
  // Compile-time contract. If this file type-checks with the line below
  // uncommented, the required-footprint guarantee has regressed.
  // @ts-expect-error - footprint is required and must not have a default
  const bad = <Vactrol name="VT2" />
  expect(bad).toBeDefined()
})
