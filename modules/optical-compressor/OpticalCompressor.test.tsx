import { test, expect, beforeAll } from "bun:test"
import {
  renderCircuit,
  expectConnected,
  expectNotConnected,
  expectNoFloatingPins,
  expectNoFailedComponents,
  findComponent,
  type CircuitElement,
} from "../../lib/testing/circuit-assertions.ts"
import { OpticalCompressor } from "./OpticalCompressor.tsx"

// RENDER ONCE, SHARE ACROSS ALL TESTS.
//
// tscircuit's render cost is roughly QUADRATIC in component count -
// measured: 12 components 1.2s, 22 components 5.9s, 32 components 14.9s,
// 45 components 30.4s. The composed module has ~45 components, so one
// render costs ~30s. Rendering per-test across 8 tests would cost ~240s
// AND every individual test would blow past bun's 5s default per-test
// timeout and fail.
//
// Circuit JSON is immutable data, so sharing one render is safe. The
// beforeAll timeout must be generous - the render genuinely takes ~30s.
let el: CircuitElement[]

beforeAll(async () => {
  el = await renderCircuit(
    <board width="100mm" height="80mm">
      <OpticalCompressor name="CMP" vactrolFootprint="dip4" />
    </board>,
  )
}, 180000)

test("all five connectors are present", () => {
  for (const j of ["J_IN", "J_OUT", "J_PWR", "J_PEAK", "J_GAIN"]) {
    expect(findComponent(el, `CMP_${j}`)).toBeDefined()
  }
})

test("audio enters through J_IN and leaves through J_OUT", () => {
  expectConnected(el, "CMP_J_IN.P1", "CMP_C_IN.pin1")
  expectConnected(el, "CMP_J_OUT.P1", "CMP_C_OUT.pin2")
  expectConnected(el, "CMP_J_IN.P2", "CMP_J_OUT.P2")
})

test("supply enters raw and reaches the op-amps only via the Schottky", () => {
  expectConnected(el, "CMP_J_PWR.P1", "CMP_D_PROT.anode")
  expectConnected(el, "CMP_U1.VCC", "CMP_D_PROT.cathode")
  expectConnected(el, "CMP_U2.VCC", "CMP_D_PROT.cathode")
  // The raw input must not reach the op-amps directly.
  expectNotConnected(el, "CMP_J_PWR.P1", "CMP_U1.VCC")
})

test("GAIN pot is wired as a rheostat with the wiper tied to an end", () => {
  // Spec 10.1: an open wiper must not open the feedback loop.
  expectConnected(el, "CMP_J_GAIN.P2", "CMP_J_GAIN.P3")
  expectConnected(el, "CMP_J_GAIN.P2", "CMP_U1.INB_N")
  expectConnected(el, "CMP_J_GAIN.P1", "CMP_U1.OUTB")
})

test("PEAK REDUCTION is a divider: wiper NOT tied to either end", () => {
  // The revision-3 correction. Tying these would short the divider.
  expectNotConnected(el, "CMP_J_PEAK.P2", "CMP_J_PEAK.P1")
  expectNotConnected(el, "CMP_J_PEAK.P2", "CMP_J_PEAK.P3")
  // Bottom goes to VBIAS, wiper to the sidechain amp.
  expectConnected(el, "CMP_J_PEAK.P3", "CMP_TP_VBIAS.TP")
  expectConnected(el, "CMP_J_PEAK.P2", "CMP_U2.INA_P")
})

test("the vactrol bridges audio and sidechain without an electrical path", () => {
  expectConnected(el, "CMP_VACTROL.LDR_1", "CMP_R_SHUNT.pin2")
  expectConnected(el, "CMP_VACTROL.LED_A", "CMP_R_LED.pin2")
  expectNotConnected(el, "CMP_VACTROL.LDR_1", "CMP_VACTROL.LED_A")
})

test("the feedback loop is closed: makeup output reaches the LED driver", () => {
  // Makeup output feeds the PEAK REDUCTION divider top at J_PEAK.P1.
  expectConnected(el, "CMP_U1.OUTB", "CMP_J_PEAK.P1")
  expectConnected(el, "CMP_U2.OUTA", "CMP_C_SC.pin1")
  expectConnected(el, "CMP_C_DET.pin1", "CMP_R_B.pin1")
})

test("no component failed to be created and no pin is left floating", () => {
  // expectNoFailedComponents scans the WHOLE element array, so this one
  // call covers every component in the module - an invalid footprint
  // makes a component vanish from circuit JSON without throwing.
  expectNoFailedComponents(el)
  expectNoFloatingPins(el)
})

// This renders the ~45-component fixture a SECOND time (the module tests
// above share one render of their own), so it needs its own generous
// timeout - bun's default is 5s and this render takes ~30s.
test("the standalone fixture renders with no floating pins", async () => {
  const { default: fixture } = await import("./optical-compressor.circuit.tsx")
  const fixtureEl = await renderCircuit(fixture())
  expectNoFailedComponents(fixtureEl)
  expectNoFloatingPins(fixtureEl)
  expect(findComponent(fixtureEl, "CMP1_VACTROL")).toBeDefined()
}, 180000)
