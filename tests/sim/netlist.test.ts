import { test, expect } from "bun:test"
import { toSpiceNetlist } from "../../lib/sim/netlist.ts"
import { runAcSweep } from "../../lib/sim/ac.ts"
import type { ResolvedNetwork } from "../../lib/model/control-state.ts"
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
    .toThrow("Net collides with the synthetic source-series internal node n_src_internal: n_src_internal")
})

/** The emitted-node registry. `sanitize` maps every non-alphanumeric character to "_",
 * and ngspice case-folds node names, so several distinct labelled nets can land on one
 * SPICE node. Silently shorting them is a false PASS in a validation gate: both sides of
 * an unsplit-versus-composed comparison run through the same lossy transform, so the
 * comparison would agree while both decks describe a circuit the model does not.
 */
const collisionEnvironment: SimulationEnvironment = {
  source: { port: "input", amplitude: 1, seriesOhms: 0 },
  load: { port: "output", ohms: 1e12 },
  sweep: { pointsPerDecade: 20, startHz: 10, stopHz: 100000 },
  groundPort: "ground",
}

test("refuses two nets that differ only in punctuation and would emit as one node", () => {
  const punctuationCollision: ResolvedNetwork = {
    ports: { input: "in", output: "out", ground: "0" },
    elements: [
      { ref: "R1", kind: "resistor", pins: { a: "in", b: "lf.mid" }, parameters: { ohms: 1000 } },
      { ref: "R2", kind: "resistor", pins: { a: "lf-mid", b: "out" }, parameters: { ohms: 1000 } },
    ],
  }
  expect(() => toSpiceNetlist(punctuationCollision, collisionEnvironment))
    .toThrow("Emitted netlist node collision on lf_mid between nets: lf.mid and lf-mid")
})

test("refuses two nets that differ only in case, which ngspice folds together", () => {
  const caseCollision: ResolvedNetwork = {
    ports: { input: "in", output: "out", ground: "0" },
    elements: [
      { ref: "R1", kind: "resistor", pins: { a: "in", b: "LF_MID" }, parameters: { ohms: 1000 } },
      { ref: "R2", kind: "resistor", pins: { a: "lf_mid", b: "out" }, parameters: { ohms: 1000 } },
    ],
  }
  expect(() => toSpiceNetlist(caseCollision, collisionEnvironment))
    .toThrow("Emitted netlist node collision on lf_mid between nets: LF_MID and lf_mid")
})

test("refuses a non-ground net named 0, which SPICE reserves for the reference node", () => {
  const groundImpostor: ResolvedNetwork = {
    ports: { input: "in", output: "out", ground: "gnd" },
    elements: [
      { ref: "R1", kind: "resistor", pins: { a: "in", b: "0" }, parameters: { ohms: 1000 } },
      { ref: "R2", kind: "resistor", pins: { a: "0", b: "out" }, parameters: { ohms: 1000 } },
      { ref: "R3", kind: "resistor", pins: { a: "out", b: "gnd" }, parameters: { ohms: 1000 } },
    ],
  }
  expect(() => toSpiceNetlist(groundImpostor, collisionEnvironment))
    .toThrow("Non-ground net emits as the SPICE reference node 0: 0")
})

test("refuses two element references that emit as the same component name", () => {
  // "1" is not prefixed with "R" in the source model but becomes "R1" once the emitter
  // applies the type letter, colliding with the element already named "R1".
  const nameCollision: ResolvedNetwork = {
    ports: { input: "in", output: "out", ground: "0" },
    elements: [
      { ref: "R1", kind: "resistor", pins: { a: "in", b: "mid" }, parameters: { ohms: 1000 } },
      { ref: "1", kind: "resistor", pins: { a: "mid", b: "out" }, parameters: { ohms: 2000 } },
    ],
  }
  expect(() => toSpiceNetlist(nameCollision, collisionEnvironment))
    .toThrow("Emitted netlist name collision on R1 between refs: R1 and 1")
})
