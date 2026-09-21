import { test, expect } from "bun:test"
import {
  renderCircuit,
  expectConnected,
  expectNotConnected,
  expectComponentValue,
  expectNoFailedComponents,
  expectNoFloatingPins,
  findComponent,
} from "../../../lib/testing/circuit-assertions.ts"
import { Sidechain } from "./Sidechain.tsx"
import { TL072H } from "../../../lib/chips/TL072H.tsx"
import { Vactrol } from "../../../lib/opto/Vactrol.tsx"

const render = () =>
  renderCircuit(
    <board width="80mm" height="60mm">
      <Sidechain name="CMP" />
      {/* Stand-ins for the parts Sidechain references by name. */}
      <TL072H name="CMP_U2" />
      <Vactrol name="CMP_VACTROL" footprint="dip4" />
      <net name="CMP_9V_PROT" />
      <net name="CMP_VBIAS" />
      <net name="CMP_GND" />
      <trace from=".CMP_U2 > .VCC" to="net.CMP_9V_PROT" />
      <trace from=".CMP_U2 > .GND" to="net.CMP_GND" />
      <trace from=".CMP_U2 > .INB_P" to="net.CMP_VBIAS" />
      <trace from=".CMP_U2 > .INB_N" to="net.CMP_VBIAS" />
      <trace from=".CMP_U2 > .OUTB" to="net.CMP_VBIAS" />
      <trace from=".CMP_VACTROL > .LDR_1" to="net.CMP_VBIAS" />
      <trace from=".CMP_VACTROL > .LDR_2" to="net.CMP_VBIAS" />
    </board>,
  )

test("sidechain amp is non-inverting with gain 1 + 100k/10k", async () => {
  const el = await render()
  expectComponentValue(el, "CMP_R_SC_G", "resistance", 10_000)
  expectComponentValue(el, "CMP_R_SC_F", "resistance", 100_000)
  // Gain leg returns to VBIAS, feedback leg to the output: non-inverting.
  expectConnected(el, "CMP_R_SC_G.pin1", "CMP_U2.INA_N")
  expectConnected(el, "CMP_R_SC_F.pin1", "CMP_U2.INA_N")
  expectConnected(el, "CMP_R_SC_F.pin2", "CMP_U2.OUTA")
  // Signal enters the + input, confirming non-inverting (spec 8.6.2).
  expectConnected(el, "CMP_U2.INA_P", "CMP_R_PEAK_FAIL.pin1")
})

test("PEAK REDUCTION wiper has a 1M fail-safe to VBIAS, not a wiper tie", async () => {
  const el = await render()
  // Spec 10.1: an open wiper must settle at VBIAS (zero compression).
  expectComponentValue(el, "CMP_R_PEAK_FAIL", "resistance", 1_000_000)
  expectConnected(el, "CMP_R_PEAK_FAIL.pin2", "CMP_TP_VBIAS_SC.TP")
  // The 1M must be a resistor to VBIAS, not a short. If someone
  // "simplifies" it away the wiper collapses onto VBIAS and the control
  // stops working entirely.
  expectNotConnected(el, "CMP_R_PEAK_FAIL.pin1", "CMP_R_PEAK_FAIL.pin2")
  // Wiper drives the sidechain amp's + input (non-inverting).
  expectConnected(el, "CMP_R_PEAK_FAIL.pin1", "CMP_U2.INA_P")
})

test("detector is AC coupled into a half-wave rectifier", async () => {
  const el = await render()
  expectComponentValue(el, "CMP_C_SC", "capacitance", 1e-6)
  expectConnected(el, "CMP_C_SC.pin1", "CMP_U2.OUTA")
  // Diode anode takes the coupled signal; cathode charges the detector.
  expectConnected(el, "CMP_C_SC.pin2", "CMP_D_DET.anode")
  expectConnected(el, "CMP_D_DET.cathode", "CMP_C_DET.pin1")
  // Coupling cap must block the VBIAS-centred DC from the detector.
  expectNotConnected(el, "CMP_U2.OUTA", "CMP_C_DET.pin1")
})

test("detector cap is 4.7uF per revision 3, with a 100k release resistor", async () => {
  const el = await render()
  // Revision 2 specified 10uF; degeneration raised the discharge
  // impedance ~5x, so revision 3 uses 4.7uF. See spec 8.6.1.
  expectComponentValue(el, "CMP_C_DET", "capacitance", 4.7e-6)
  expectComponentValue(el, "CMP_R_REL", "resistance", 100_000)
  expectConnected(el, "CMP_C_DET.pin1", "CMP_R_REL.pin1")
  expectConnected(el, "CMP_C_DET.pin2", "CMP_TP_GND_SC.TP")
  expectConnected(el, "CMP_R_REL.pin2", "CMP_TP_GND_SC.TP")
})

test("driver has a 1k EMITTER RESISTOR - the revision 3 control-law fix", async () => {
  const el = await render()
  // Without this the control range is ~1 dB and the law is a switch.
  // See spec 6.1.2 and 8.7.1. This test is the regression guard.
  expectComponentValue(el, "CMP_R_E", "resistance", 1_000)
  expectConnected(el, "CMP_Q_LED.emitter", "CMP_R_E.pin1")
  expectConnected(el, "CMP_R_E.pin2", "CMP_TP_GND_SC.TP")
  // The emitter must NOT go straight to ground.
  expectNotConnected(el, "CMP_Q_LED.emitter", "CMP_TP_GND_SC.TP")
})

test("base is driven through 10k with a 100k pulldown", async () => {
  const el = await render()
  expectComponentValue(el, "CMP_R_B", "resistance", 10_000)
  expectComponentValue(el, "CMP_R_B_PD", "resistance", 100_000)
  expectConnected(el, "CMP_C_DET.pin1", "CMP_R_B.pin1")
  expectConnected(el, "CMP_R_B.pin2", "CMP_Q_LED.base")
  expectConnected(el, "CMP_R_B_PD.pin1", "CMP_Q_LED.base")
  expectConnected(el, "CMP_R_B_PD.pin2", "CMP_TP_GND_SC.TP")
})

test("LED chain is 3.3k limit, vactrol LED, 10R sense, collector", async () => {
  const el = await render()
  // R_LED is 3.3k, not 4.7k: 1.5 V now drops across R_E. Spec 8.7.2.
  expectComponentValue(el, "CMP_R_LED", "resistance", 3_300)
  expectComponentValue(el, "CMP_R_SENSE", "resistance", 10)
  expectConnected(el, "CMP_R_LED.pin2", "CMP_VACTROL.LED_A")
  expectConnected(el, "CMP_VACTROL.LED_K", "CMP_R_SENSE.pin1")
  expectConnected(el, "CMP_R_SENSE.pin2", "CMP_Q_LED.collector")
})

test("sense resistor is bracketed by test points so current is measurable", async () => {
  const el = await render()
  // Bench item 12.2.2 needs LED current without desoldering.
  expectConnected(el, "CMP_TP_SENSE_HI.TP", "CMP_R_SENSE.pin1")
  expectConnected(el, "CMP_TP_SENSE_LO.TP", "CMP_R_SENSE.pin2")
})

test("sidechain amp inverting input and output both carry test pads", async () => {
  const el = await render()
  // Spec 8.6.2: the withdrawn precision-rectifier option leaves test pads
  // at these two nodes so the topology can still be probed on the bench.
  expectConnected(el, "CMP_TP_SC_INV.TP", "CMP_U2.INA_N")
  expectConnected(el, "CMP_TP_SC_OUT.TP", "CMP_U2.OUTA")
})

test("transistor is an NPN", async () => {
  const el = await render()
  expect(findComponent(el, "CMP_Q_LED")?.ftype).toBe("simple_transistor")
})

test("no component silently fails to be created", async () => {
  const el = await render()
  // An invalid footprinter string makes a component vanish from circuit
  // JSON with no thrown exception - this scans the whole fixture.
  expectNoFailedComponents(el)
})

test("no pin is left floating", async () => {
  const el = await render()
  expectNoFloatingPins(el)
})
