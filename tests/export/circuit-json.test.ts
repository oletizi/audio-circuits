import { test, expect } from "bun:test"
import {
  renderTwoModule,
  renderUnnamedNetFixture,
  renderConflictingNetsFixture,
  renderDanglingPinFixture,
} from "./fixtures/two-module.tsx"
import { toLabelledNetwork } from "../../lib/export/circuit-json.ts"
import { assertSameTopology } from "../../lib/passives/topology.ts"
import { resolveNetwork } from "../../lib/passives/control-state.ts"
import { toSpiceNetlist } from "../../lib/sim/netlist.ts"
import type { ExportMapping } from "../../lib/export/circuit-json.ts"
import type { PassiveNetwork } from "../../lib/passives/topology.ts"

/** tscircuit names a two-terminal passive's ports `pin1`/`pin2`; `resolveNetwork`
 * requires `a`/`b`. `pinNames` is the mapping that joins those two seams.
 */
const PIN_NAMES = { pin1: "a", pin2: "b" } as const

const mapping: ExportMapping = {
  componentNames: { LF_R1: "R1", LF_C1: "C1", HF_L1: "L1" },
  netNames: { MID: "mid", GND: "0", IN: "in", OUT: "out" },
  pinNames: PIN_NAMES,
  ports: { input: "in", output: "out", ground: "0" },
}

const expected: PassiveNetwork = {
  ports: { input: "in", output: "out", ground: "0" },
  elements: [
    { ref: "C1", kind: "capacitor", pins: { a: "mid", b: "0" }, parameters: { farads: 1e-7 } },
    { ref: "L1", kind: "inductor", pins: { a: "mid", b: "out" }, parameters: { henries: 0.1 } },
    { ref: "R1", kind: "resistor", pins: { a: "in", b: "mid" }, parameters: { ohms: 1000 } },
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
    pinNames: PIN_NAMES,
    ports: { input: "in", output: "out" },
  }
  expect(() => toLabelledNetwork(renderUnnamedNetFixture(), unnamedNetMapping))
    .toThrow("Unnamed net group: A_R1.pin2, A_R2.pin1")
})

test("refuses a group where two different named nets have been shorted together", () => {
  const conflictingNetsMapping: ExportMapping = {
    componentNames: { B_R1: "RB1" },
    netNames: { ALPHA: "alpha", BETA: "beta" },
    pinNames: PIN_NAMES,
    ports: {},
  }
  expect(() => toLabelledNetwork(renderConflictingNetsFixture(), conflictingNetsMapping))
    .toThrow("Conflicting nets in group: ALPHA, BETA")
})

test("refuses a net with no canonical mapping", () => {
  const { GND: _dropped, ...netNamesWithoutGnd } = mapping.netNames
  expect(() => toLabelledNetwork(renderTwoModule(), { ...mapping, netNames: netNamesWithoutGnd }))
    .toThrow("Unmapped net: GND")
})

test("rejects a dangling pin instead of exporting a partial network", () => {
  const danglingPinMapping: ExportMapping = {
    componentNames: { A_R1: "RA1" },
    netNames: { ALPHA: "alpha" },
    pinNames: PIN_NAMES,
    ports: {},
  }
  expect(() => toLabelledNetwork(renderDanglingPinFixture(), danglingPinMapping))
    .toThrow("Dangling pins: A_R1.pin2")
})

test("a single miswired trace fails the comparison and names the component", () => {
  const miswired = toLabelledNetwork(renderTwoModule(true), mapping)
  expect(() => assertSameTopology(expected, miswired)).toThrow("C1")
})

test("refuses an emitted port with no canonical pin mapping", () => {
  // Passing tscircuit's raw port name through instead would build a network keyed
  // pin1/pin2, which resolveNetwork rejects later and further from the cause.
  expect(() => toLabelledNetwork(renderTwoModule(), { ...mapping, pinNames: { pin1: "a" } }))
    .toThrow(/^Unmapped pin: (LF_R1|LF_C1|HF_L1)\.pin2$/)
})

test("carries a rendered tscircuit board through export, resolve and netlist emission", () => {
  // The end-to-end seam: circuit JSON -> labelled network -> resolved network ->
  // SPICE deck. Before pinNames existed there was no supported route across it, because
  // the export adapter emitted pin1/pin2 and resolveNetwork requires a/b.
  const labelled = toLabelledNetwork(renderTwoModule(), mapping)
  const resolved = resolveNetwork(labelled, { potPositions: {}, switchPositions: {} })
  const deck = toSpiceNetlist(resolved, {
    source: { port: "input", amplitude: 1, seriesOhms: 0 },
    load: { port: "output", ohms: 1e6 },
    sweep: { pointsPerDecade: 10, startHz: 10, stopHz: 100000 },
    groundPort: "ground",
  })

  expect(deck).toMatch(/^V1 in 0 AC /m)
  expect(deck).toMatch(/^R1 in mid 1\.000000000000e\+3$/m)
  expect(deck).toMatch(/^C1 mid 0 1\.000000000000e-7$/m)
  expect(deck).toMatch(/^L1 mid out 1\.000000000000e-1$/m)
  expect(deck).toMatch(/^RLOAD out 0 /m)
  expect(deck.trimEnd().endsWith(".end")).toBe(true)
})
