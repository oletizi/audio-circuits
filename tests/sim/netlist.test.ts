import { test, expect } from "bun:test"
import { toSpiceNetlist } from "../../lib/sim/netlist.ts"
import { runAcSweep } from "../../lib/sim/ac.ts"
import type { ResolvedNetwork } from "../../lib/passives/control-state.ts"
import type { SimulationEnvironment } from "../../lib/sim/netlist.ts"

const rc: ResolvedNetwork = {
  ports: { input: "in", output: "out", ground: "0" },
  elements: [
    { ref: "R1", kind: "resistor", pins: { a: "in", b: "out" }, parameters: { ohms: 1000 } },
    { ref: "C1", kind: "capacitor", pins: { a: "out", b: "0" }, parameters: { farads: 159.1549431e-9 } },
  ],
}

const environment: SimulationEnvironment = {
  source: { port: "input", amplitude: 1, seriesOhms: 0 },
  load: { port: "output", ohms: 1e12 },
  sweep: { pointsPerDecade: 20, startHz: 10, stopHz: 100000 },
  groundPort: "ground",
}

test("emits a deck that reproduces the analytic RC response", async () => {
  const [sweep] = await runAcSweep({ netlist: toSpiceNetlist(rc, environment), nodes: ["out"] })
  const corner = sweep.points.find(p => Math.abs(p.frequency - 1000) < 1e-6)
  if (!corner) throw new Error("No sweep point at 1 kHz")
  expect(Math.hypot(corner.real, corner.imaginary)).toBeCloseTo(0.707107, 5)
})

test("maps the declared ground port to SPICE node 0", () => {
  expect(toSpiceNetlist(rc, environment)).toContain("C1 out 0 ")
})

test("refuses a network whose ground port is not declared", () => {
  expect(() => toSpiceNetlist(rc, { ...environment, groundPort: "chassis" }))
    .toThrow("Ground port not present in network: chassis")
})

test("refuses a source or load port that the network does not expose", () => {
  expect(() => toSpiceNetlist(rc, { ...environment, load: { port: "sidechain", ohms: 1e12 } }))
    .toThrow("Load port not present in network: sidechain")
})

const resistiveDivider: ResolvedNetwork = {
  ports: { input: "sig", output: "sig", ground: "0" },
  elements: [],
}

const resistiveDividerEnvironment: SimulationEnvironment = {
  source: { port: "input", amplitude: 1, seriesOhms: 1000 },
  load: { port: "output", ohms: 3000 },
  sweep: { pointsPerDecade: 20, startHz: 10, stopHz: 100000 },
  groundPort: "ground",
}

test("wires the source's internal node and series resistor to reproduce a purely resistive divider", async () => {
  const deck = toSpiceNetlist(resistiveDivider, resistiveDividerEnvironment)

  // Node wiring is asserted directly so a swap of the source and series-resistor
  // nodes fails this test even if the divider's numeric result happened to coincide:
  // the source must sit on the internal node, and the series resistor must bridge
  // the internal node to the network's source node ("sig"), not the reverse.
  expect(deck).toMatch(/^V1 n_src_internal 0 AC /m)
  expect(deck).toMatch(/^RSRC n_src_internal sig /m)

  const [sweep] = await runAcSweep({ netlist: deck, nodes: ["sig"] })
  for (const point of sweep.points) {
    const magnitude = Math.hypot(point.real, point.imaginary)
    expect(magnitude).toBeCloseTo(0.75, 9)
  }
})

test("refuses a network whose net collides with the synthetic source-series internal node", () => {
  const colliding: ResolvedNetwork = {
    ports: { input: "in", output: "out", ground: "0" },
    elements: [
      { ref: "R1", kind: "resistor", pins: { a: "in", b: "n_src_internal" }, parameters: { ohms: 1000 } },
      { ref: "R2", kind: "resistor", pins: { a: "n_src_internal", b: "out" }, parameters: { ohms: 1000 } },
    ],
  }
  const collidingEnvironment: SimulationEnvironment = {
    source: { port: "input", amplitude: 1, seriesOhms: 50 },
    load: { port: "output", ohms: 1e12 },
    sweep: { pointsPerDecade: 20, startHz: 10, stopHz: 100000 },
    groundPort: "ground",
  }
  expect(() => toSpiceNetlist(colliding, collidingEnvironment))
    .toThrow('Net "n_src_internal" collides with the synthetic source-series internal node name "n_src_internal"')
})
