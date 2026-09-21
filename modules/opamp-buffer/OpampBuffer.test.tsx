import { test, expect, beforeAll } from "bun:test"
import {
  renderCircuit,
  expectConnected,
  expectNoFailedComponents,
  findComponent,
  type CircuitElement,
} from "../../lib/testing/circuit-assertions.ts"
import {
  computeTier1,
  formatTier1,
} from "../../lib/testing/schematic-tier1.ts"
import {
  assertReadabilityGate,
  gateReport,
  RAIL_NETS,
} from "../../lib/testing/schematic-gate.ts"
import { OpampBuffer } from "./OpampBuffer.tsx"

// This module predates the optical compressor work and had NO tests at all.
// It is covered here because it shares lib/layout.ts, whose above()/below()
// inversion was fixed during that work — without a test, nothing would catch
// a regression in the shared helper.

let el: CircuitElement[]

beforeAll(async () => {
  el = await renderCircuit(
    <board width="40mm" height="30mm">
      <OpampBuffer name="BUF1" />
    </board>,
  )
}, 120000)

test("all components are created", () => {
  expectNoFailedComponents(el)
  for (const n of ["BUF1_U", "BUF1_C_IN", "BUF1_C_OUT", "BUF1_R_BIAS"]) {
    expect(findComponent(el, n)).toBeDefined()
  }
})

test("signal path runs input cap -> buffer -> output cap", () => {
  expectConnected(el, "BUF1_J_IN.P1", "BUF1_C_IN.pin1")
  expectConnected(el, "BUF1_C_IN.pin2", "BUF1_U.INA_P")
  expectConnected(el, "BUF1_C_OUT.pin2", "BUF1_J_OUT.P1")
})

test("section A is wired as a unity-gain follower", () => {
  expectConnected(el, "BUF1_U.OUTA", "BUF1_U.INA_N")
})

// --- Schematic readability -------------------------------------------------
// See docs/SCHEMATIC-STANDARDS.md.

test("TIER 1 readability gate: no regression against recorded baseline", () => {
  const t1 = computeTier1(el, { railNets: RAIL_NETS["opamp-buffer"] })
  console.log(formatTier1(t1))
  console.log("\n" + gateReport("opamp-buffer", t1))
  assertReadabilityGate("opamp-buffer", t1)
})
