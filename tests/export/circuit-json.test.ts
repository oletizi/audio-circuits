import { test, expect } from "bun:test"
import { renderTwoModule, renderUnnamedNetFixture } from "./fixtures/two-module.tsx"
import { toLabelledNetwork } from "../../lib/export/circuit-json.ts"
import { assertSameTopology } from "../../lib/passives/topology.ts"
import type { ExportMapping } from "../../lib/export/circuit-json.ts"
import type { PassiveNetwork } from "../../lib/passives/topology.ts"

const mapping: ExportMapping = {
  componentNames: { LF_R1: "R1", LF_C1: "C1", HF_L1: "L1" },
  netNames: { MID: "mid", GND: "0", IN: "in", OUT: "out" },
  ports: { input: "in", output: "out", ground: "0" },
}

const expected: PassiveNetwork = {
  ports: { input: "in", output: "out", ground: "0" },
  elements: [
    { ref: "C1", kind: "capacitor", pins: { pin1: "mid", pin2: "0" }, parameters: { farads: 1e-7 } },
    { ref: "L1", kind: "inductor", pins: { pin1: "mid", pin2: "out" }, parameters: { henries: 0.1 } },
    { ref: "R1", kind: "resistor", pins: { pin1: "in", pin2: "mid" }, parameters: { ohms: 1000 } },
  ],
}

test("flattens emitted connectivity to canonical reference names", () => {
  assertSameTopology(expected, toLabelledNetwork(renderTwoModule(), mapping))
})

test("normalizes inductance, which tscircuit emits as an unparsed string", () => {
  const network = toLabelledNetwork(renderTwoModule(), mapping)
  const inductor = network.elements.find(e => e.ref === "L1")
  if (inductor?.kind !== "inductor") throw new Error("L1 missing from export")
  expect(inductor.parameters.henries).toBeCloseTo(0.1, 12)
})

test("refuses a component with no canonical mapping", () => {
  expect(() => toLabelledNetwork(renderTwoModule(), { ...mapping, componentNames: { LF_R1: "R1" } }))
    .toThrow("Unmapped component: LF_C1")
})

test("refuses a connected group with no named net and no derived fallback", () => {
  const unnamedNetMapping: ExportMapping = {
    componentNames: { A_R1: "RA1", A_R2: "RA2" },
    netNames: { IN: "in", OUT: "out" },
    ports: { input: "in", output: "out" },
  }
  expect(() => toLabelledNetwork(renderUnnamedNetFixture(), unnamedNetMapping))
    .toThrow("Unnamed net group: A_R1.pin2, A_R2.pin1")
})
