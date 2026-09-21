import { test, expect } from "bun:test"
import {
  renderCircuit,
  expectConnected,
  expectNotConnected,
  expectComponentValue,
  expectNoFailedComponents,
  expectNoFloatingPins,
} from "../../../lib/testing/circuit-assertions.ts"
import { AudioPath } from "./AudioPath.tsx"

const render = () =>
  renderCircuit(
    <board width="80mm" height="60mm">
      <AudioPath name="CMP" vactrolFootprint="dip4" />
      <net name="CMP_9V_PROT" />
      <net name="CMP_VBIAS" />
      <net name="CMP_GND" />
      {/* Stand-ins for the LED drive and pot that other parts supply. */}
      <resistor name="LED_DRV" resistance="3.3k" footprint="0805" />
      <trace from=".LED_DRV > .pin1" to="net.CMP_9V_PROT" />
      <trace from=".LED_DRV > .pin2" to=".CMP_VACTROL > .LED_A" />
      <trace from=".CMP_VACTROL > .LED_K" to="net.CMP_GND" />
      <resistor name="GAIN_POT" resistance="100k" footprint="0805" />
      <trace from=".GAIN_POT > .pin1" to="net.CMP_GAIN_FB" />
      <trace from=".GAIN_POT > .pin2" to="net.CMP_MAKEUP_OUT" />
    </board>,
  )

test("input is AC coupled and biased to VBIAS through 1M", async () => {
  const el = await render()
  // Guards against a component silently failing to be created (e.g. an
  // invalid footprinter string) - such a component is simply absent from
  // circuit JSON with no thrown exception. This scans the ENTIRE circuit
  // JSON element array, so it also covers components this file never
  // names directly.
  expectNoFailedComponents(el)
  expectComponentValue(el, "CMP_C_IN", "capacitance", 100e-9)
  expectComponentValue(el, "CMP_R_IN_BIAS", "resistance", 1_000_000)
  expectConnected(el, "CMP_C_IN.pin2", "CMP_R_IN_BIAS.pin1")
  expectConnected(el, "CMP_C_IN.pin2", "CMP_U1.INA_P")
  expectConnected(el, "CMP_R_IN_BIAS.pin2", "CMP_TP_VBIAS_CHK.TP")
})

test("input buffer is unity gain", async () => {
  const el = await render()
  expectConnected(el, "CMP_U1.OUTA", "CMP_U1.INA_N")
})

test("attenuator is R_SHUNT in series with the LDR shunting to VBIAS", async () => {
  const el = await render()
  expectComponentValue(el, "CMP_R_SHUNT", "resistance", 22_000)
  // Buffer output feeds R_SHUNT...
  expectConnected(el, "CMP_U1.OUTA", "CMP_R_SHUNT.pin1")
  // ...whose far end is the gain-reduction node, shunted by the LDR.
  expectConnected(el, "CMP_R_SHUNT.pin2", "CMP_VACTROL.LDR_1")
  expectConnected(el, "CMP_VACTROL.LDR_2", "CMP_TP_VBIAS_CHK.TP")
})

test("gain-reduction node drives the makeup amp with NO coupling cap", async () => {
  const el = await render()
  // Both stages share the VBIAS operating point, so they are DC coupled.
  expectConnected(el, "CMP_R_SHUNT.pin2", "CMP_U1.INB_P")
  expectConnected(el, "CMP_TP_GR.TP", "CMP_U1.INB_P")
})

test("makeup amp gain network returns to VBIAS, feedback goes to the pot", async () => {
  const el = await render()
  expectComponentValue(el, "CMP_R_MAKEUP_G", "resistance", 10_000)
  expectConnected(el, "CMP_R_MAKEUP_G.pin1", "CMP_U1.INB_N")
  expectConnected(el, "CMP_R_MAKEUP_G.pin2", "CMP_TP_VBIAS_CHK.TP")
  expectConnected(el, "CMP_U1.INB_N", "GAIN_POT.pin1")
})

test("output is AC coupled through 2.2uF with a 100k pulldown", async () => {
  const el = await render()
  expectComponentValue(el, "CMP_C_OUT", "capacitance", 2.2e-6)
  expectComponentValue(el, "CMP_R_OUT_PD", "resistance", 100_000)
  expectConnected(el, "CMP_U1.OUTB", "CMP_C_OUT.pin1")
  expectConnected(el, "CMP_C_OUT.pin2", "CMP_R_OUT_PD.pin1")
  expectConnected(el, "CMP_R_OUT_PD.pin2", "CMP_TP_GND_CHK.TP")
  // Output cap must isolate the biased node from the output net.
  expectNotConnected(el, "CMP_U1.OUTB", "CMP_R_OUT_PD.pin1")
})

test("LDR and LED sides remain isolated through the audio path", async () => {
  const el = await render()
  expectNotConnected(el, "CMP_VACTROL.LDR_1", "CMP_VACTROL.LED_A")
})

test("no pin is left floating", async () => {
  const el = await render()
  expectNoFloatingPins(el)
})
