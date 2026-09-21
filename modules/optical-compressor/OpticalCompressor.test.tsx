import { test, expect, beforeAll } from "bun:test"
import {
  renderCircuit,
  expectConnected,
  expectNotConnected,
  expectNoFloatingPins,
  expectNoFailedComponents,
  expectComponentValue,
  findComponent,
  type CircuitElement,
} from "../../lib/testing/circuit-assertions.ts"
import {
  computeSchematicMetrics,
  formatMetrics,
  isRailLabel,
} from "../../lib/testing/schematic-metrics.ts"
import {
  assertSchematicReadable,
  remainingGap,
  DECLARED_LABELS,
} from "../../lib/testing/schematic-standards.ts"
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
  expectConnected(el, "CMP_J_GAIN.WIPER", "CMP_J_GAIN.BOTTOM")
  expectConnected(el, "CMP_J_GAIN.WIPER", "CMP_U1.INB_N")
  expectConnected(el, "CMP_J_GAIN.TOP", "CMP_U1.OUTB")
})

test("PEAK REDUCTION is a divider: wiper NOT tied to either end", () => {
  // The revision-3 correction. Tying these would short the divider.
  expectNotConnected(el, "CMP_J_PEAK.WIPER", "CMP_J_PEAK.TOP")
  expectNotConnected(el, "CMP_J_PEAK.WIPER", "CMP_J_PEAK.BOTTOM")
  // Bottom goes to VBIAS, wiper to the sidechain amp.
  expectConnected(el, "CMP_J_PEAK.BOTTOM", "CMP_TP_VBIAS.TP")
  expectConnected(el, "CMP_J_PEAK.WIPER", "CMP_U2.INA_P")
})

test("the vactrol bridges audio and sidechain without an electrical path", () => {
  expectConnected(el, "CMP_VACTROL.LDR_1", "CMP_R_SHUNT.pin2")
  expectConnected(el, "CMP_VACTROL.LED_A", "CMP_R_LED.pin2")
  // All four LED-to-LDR cross-pairs, not just one - see Vactrol.test.tsx
  // for the blind spot this guards against: two pins sharing a net
  // externally would make one pair unassertable while the others still
  // looked clean.
  expectNotConnected(el, "CMP_VACTROL.LED_A", "CMP_VACTROL.LDR_1")
  expectNotConnected(el, "CMP_VACTROL.LED_A", "CMP_VACTROL.LDR_2")
  expectNotConnected(el, "CMP_VACTROL.LED_K", "CMP_VACTROL.LDR_1")
  expectNotConnected(el, "CMP_VACTROL.LED_K", "CMP_VACTROL.LDR_2")
})

test("the feedback loop is closed: makeup output reaches the LED driver", () => {
  // Makeup output feeds the PEAK REDUCTION divider top at J_PEAK.TOP.
  expectConnected(el, "CMP_U1.OUTB", "CMP_J_PEAK.TOP")
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

// Proves optional prop pass-through actually reaches the intended
// component. All 53 existing tests pass with EVERY optional prop left at
// its default, so a bug that transposes two props at the OpticalCompressor
// call site - most dangerously sidechainGainResistance and
// sidechainBiasResistance, whose names read backwards relative to what
// they feed (see Sidechain.tsx: sidechainGainResistance -> R_SC_F, the
// FEEDBACK resistor; sidechainBiasResistance -> R_SC_G, the resistor to
// VBIAS) - would go undetected. Every value below is distinct from every
// other value and from every default, so a transposition of any two props
// is guaranteed to fail at least one assertion.
//
// This is its own render, separate from the shared beforeAll above: a
// second ~51-component render costs ~8s, comfortably past bun's 5s default
// per-test timeout, so it needs the same explicit 180000ms timeout as the
// fixture test below.
test(
  "every optional prop lands on its intended component with a non-default value",
  async () => {
    const propsEl = await renderCircuit(
      <board width="100mm" height="80mm">
        <OpticalCompressor
          name="CMP"
          vactrolFootprint="dip4"
          shuntResistance="33k"
          inputCap="220nF"
          outputCap="4.7uF"
          detectorCapacitance="6.8uF"
          releaseResistance="220k"
          ledResistance="2.2k"
          emitterResistance="1.5k"
          sidechainGainResistance="47k"
          sidechainBiasResistance="15k"
          sidechainCouplingCap="2.2uF"
        />
      </board>,
    )
    expectNoFailedComponents(propsEl)

    // AudioPath
    expectComponentValue(propsEl, "CMP_R_SHUNT", "resistance", 33_000)
    expectComponentValue(propsEl, "CMP_C_IN", "capacitance", 220e-9)
    expectComponentValue(propsEl, "CMP_C_OUT", "capacitance", 4.7e-6)

    // Sidechain
    expectComponentValue(propsEl, "CMP_C_DET", "capacitance", 6.8e-6)
    expectComponentValue(propsEl, "CMP_R_REL", "resistance", 220_000)
    expectComponentValue(propsEl, "CMP_R_LED", "resistance", 2_200)
    expectComponentValue(propsEl, "CMP_R_E", "resistance", 1_500)
    // sidechainGainResistance feeds R_SC_F (the feedback resistor);
    // sidechainBiasResistance feeds R_SC_G (the resistor to VBIAS). A
    // transposition of these two props would swap these two values.
    expectComponentValue(propsEl, "CMP_R_SC_F", "resistance", 47_000)
    expectComponentValue(propsEl, "CMP_R_SC_G", "resistance", 15_000)
    expectComponentValue(propsEl, "CMP_C_SC", "capacitance", 2.2e-6)
  },
  180000,
)

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

// --- Schematic readability -------------------------------------------------
//
// A human must review this schematic and lay out the board from it, so
// legibility is a functional requirement and is asserted here with the same
// force as connectivity. See docs/SCHEMATIC-STANDARDS.md.

test("schematic meets its readability ceiling and does not regress", () => {
  const m = computeSchematicMetrics(el, {
    declared: DECLARED_LABELS["optical-compressor"],
  })
  console.log(formatMetrics(m))
  console.log("\n" + remainingGap(m, (t) => isRailLabel(t)))
  assertSchematicReadable("optical-compressor", m, (t) => isRailLabel(t), formatMetrics)
})

test("the readability assertion actually fires when a limit is exceeded", () => {
  // A guard nobody has watched trip is not a verified guard.
  const m = computeSchematicMetrics(el, {
    declared: DECLARED_LABELS["optical-compressor"],
  })
  const inflated = { ...m, wireCrossings: m.wireCrossings + 1000 }
  expect(() =>
    assertSchematicReadable("optical-compressor", inflated, (t) => isRailLabel(t), formatMetrics),
  ).toThrow(/REGRESSION|readability failed/)
})
