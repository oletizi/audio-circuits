import { test, expect } from "bun:test"
import {
  renderCircuit,
  expectConnected,
  expectNotConnected,
  expectComponentValue,
  expectNoFailedComponents,
  expectNoFloatingPins,
  findNet,
} from "../../../lib/testing/circuit-assertions.ts"
import { PowerSection } from "./PowerSection.tsx"

const render = () =>
  renderCircuit(
    <board width="60mm" height="60mm">
      <PowerSection name="CMP" />
      {/* U2 section A is consumed by the sidechain; terminate it here so
          the part can be tested in isolation without floating pins. */}
      <trace from=".CMP_U2 > .INA_P" to={"net.CMP_VBIAS"} />
      <trace from=".CMP_U2 > .INA_N" to={"net.CMP_VBIAS"} />
      <trace from=".CMP_U2 > .OUTA" to={"net.CMP_SC_OUT"} />
      <net name="CMP_SC_OUT" />
      <resistor name="LOAD" resistance="100k" footprint="0805" />
      <trace from=".LOAD > .pin1" to="net.CMP_SC_OUT" />
      <trace from=".LOAD > .pin2" to="net.CMP_GND" />
    </board>,
  )

test("reverse-polarity diode sits between raw and protected rails", async () => {
  const el = await render()
  // Guards against a component silently failing to be created (e.g. an
  // invalid footprinter string) - such a component is simply absent from
  // circuit JSON with no thrown exception, so it must be checked for
  // explicitly rather than relying on a by-name assertion to happen to
  // catch it. This scans the ENTIRE circuit-JSON element array, so it
  // also covers components this file never names directly, such as
  // CMP_C_BIAS_HF, CMP_TP_9V and CMP_TP_GND.
  expectNoFailedComponents(el)
  // Bulk reservoir sits on the PROTECTED side of the Schottky (spec 8.1):
  // under reverse polarity the diode blocks and C_BULK must never see the
  // fault directly, and the rail that actually feeds the op-amps and LED
  // chain needs the 47uF reservoir, not just 100nF.
  expectConnected(el, "CMP_D_PROT.cathode", "CMP_C_BULK.pin1")
  expectNotConnected(el, "CMP_D_PROT.anode", "CMP_C_BULK.pin1")
  // Schottky cathode feeds the protected rail, not the raw input.
  expectConnected(el, "CMP_D_PROT.cathode", "CMP_C_HF.pin1")
})

test("bias divider is two 47k resistors to a buffered midpoint", async () => {
  const el = await render()
  expectComponentValue(el, "CMP_R_BIAS1", "resistance", 47_000)
  expectComponentValue(el, "CMP_R_BIAS2", "resistance", 47_000)
  expectConnected(el, "CMP_R_BIAS1.pin2", "CMP_R_BIAS2.pin1")
  // Divider midpoint is VBIAS_RAW and drives the buffer's + input.
  expectConnected(el, "CMP_R_BIAS1.pin2", "CMP_U2.INB_P")
})

test("VBIAS buffer is unity gain and VBIAS is the buffer output", async () => {
  const el = await render()
  expectConnected(el, "CMP_U2.OUTB", "CMP_U2.INB_N")
  expectConnected(el, "CMP_U2.OUTB", "CMP_TP_VBIAS.TP")
})

test("divider midpoint is bypassed but is NOT the VBIAS net", async () => {
  const el = await render()
  // C_BIAS bypasses VBIAS_RAW, the unbuffered node.
  expectConnected(el, "CMP_C_BIAS.pin1", "CMP_U2.INB_P")
  expectComponentValue(el, "CMP_C_BIAS", "capacitance", 47e-6)
  // Loads must hang off the buffered node, so the two nets are distinct.
  expect(findNet(el, "CMP_VBIAS")).toBeDefined()
  expect(findNet(el, "CMP_VBIAS_RAW")).toBeDefined()
  // Not merely distinct net entries - actually electrically isolated. If
  // these ever short, every load in the module ends up on the divider's
  // 23.5k source impedance instead of the buffer's near-zero output
  // impedance, and the compressor would modulate its own bias reference.
  expectNotConnected(el, "CMP_U2.INB_P", "CMP_TP_VBIAS.TP")
})

test("U2 is powered from the protected rail and decoupled", async () => {
  const el = await render()
  expectConnected(el, "CMP_U2.VCC", "CMP_C_U2_DEC.pin1")
  expectConnected(el, "CMP_U2.VCC", "CMP_D_PROT.cathode")
  expectConnected(el, "CMP_U2.GND", "CMP_C_U2_DEC.pin2")
  expectComponentValue(el, "CMP_C_U2_DEC", "capacitance", 100e-9)
})

test("no pin is left floating", async () => {
  const el = await render()
  expectNoFloatingPins(el)
})
