import { test, expect } from "bun:test"
import { RootCircuit } from "@tscircuit/core"
import { PultecPassiveEq } from "../../modules/pultec-passive-eq/PultecPassiveEq.tsx"
import { toLabelledNetwork } from "../../lib/export/circuit-json.ts"
import { THREE_BAND_REFERENCE, controlState } from "../../reference/pultec/three-band.ts"
import { resolveNetwork } from "../../lib/passives/control-state.ts"
import { pruneFloatingBranches } from "../../lib/sim/prepare.ts"
import { toSpiceNetlist } from "../../lib/sim/netlist.ts"
import { runAcSweep } from "../../lib/sim/ac.ts"
import { compareResponses } from "../../lib/sim/compare.ts"
import { COMPOSED_MAPPING, COMPOSED_PREFIX } from "./composed-mapping.ts"
import type { SimulationEnvironment } from "../../lib/sim/netlist.ts"
import type { ControlState } from "../../lib/passives/control-state.ts"
import type { PassiveNetwork } from "../../lib/passives/topology.ts"
import type { AcSweep } from "../../lib/sim/ac.ts"

const ENVIRONMENT: SimulationEnvironment = {
  source: { port: "input", amplitude: 1, seriesOhms: 0 },
  load: { port: "output", ohms: 470_000 },
  sweep: { pointsPerDecade: 8, startHz: 20, stopHz: 20_000 },
  groundPort: "ground",
}

/** Tolerances are declared before any result is judged, as the plan requires.
 * The two networks are meant to be the same circuit reached by different
 * routes, so anything above numerical noise is a real difference. */
const TOLERANCE = { magnitudeDb: 1e-6, phaseDegrees: 1e-6 }

function renderComposition() {
  const circuit = new RootCircuit()
  circuit.add(
    <board width="90mm" height="90mm">
      <PultecPassiveEq name={COMPOSED_PREFIX} />
    </board>,
  )
  circuit.render()
  return circuit.getCircuitJson()
}

/** The composition as a simulatable network: the passives that came back from
 * tscircuit, plus the front-panel controls, which are not on any board. The
 * controls are taken from the reference unchanged — the claim under test is
 * about the boards and the wiring between them, not about the pots. */
function composedNetwork(): PassiveNetwork {
  const exported = toLabelledNetwork(renderComposition(), COMPOSED_MAPPING)
  // Pots, selectors and the hand-wound coil are all off-board parts reached
  // through screw terminals, so none of them come back from tscircuit.
  const controls = THREE_BAND_REFERENCE.elements.filter(
    element =>
      element.kind === "potentiometer"
      || element.kind === "switch"
      || element.kind === "inductor",
  )
  return {
    ports: THREE_BAND_REFERENCE.ports,
    elements: [...exported.elements, ...controls],
  }
}

async function sweepOf(network: PassiveNetwork, state: ControlState): Promise<AcSweep> {
  const { network: pruned } = pruneFloatingBranches(resolveNetwork(network, state))
  const [sweep] = await runAcSweep({
    netlist: toSpiceNetlist(pruned, ENVIRONMENT),
    nodes: ["out"],
  })
  return sweep
}

/** The control matrix: every low cut selector position, against both extremes
 * of the low boost level, with the hi cut section both in and out of circuit.
 * Pot settings stay at extremes because the LOG curve constant is unstated. */
const MATRIX: readonly { label: string; state: ControlState }[] = [
  ...["20Hz", "30Hz", "60Hz", "100Hz", "150Hz", "200Hz"].map(position => ({
    label: `lo frequency ${position}`,
    state: controlState(1, 0, 0, { loFrequency: position, hiFrequency: "5kHz" }, 1),
  })),
  {
    label: "lo boost engaged",
    state: controlState(0, 1, 0, { loFrequency: "20Hz", hiFrequency: "5kHz" }, 1),
  },
  {
    label: "hi cut engaged",
    state: controlState(0, 0, 0, { loFrequency: "60Hz", hiFrequency: "10kHz" }, 0),
  },
  {
    label: "everything at once",
    state: controlState(1, 1, 1, { loFrequency: "30Hz", hiFrequency: "3kHz" }, 0),
  },
]

test("composed modules reproduce the unsplit reference across the control matrix", async () => {
  const composed = composedNetwork()
  for (const { label, state } of MATRIX) {
    const reference = await sweepOf(THREE_BAND_REFERENCE, state)
    const candidate = await sweepOf(composed, state)
    const deviations = compareResponses(reference, candidate, TOLERANCE)
    if (deviations.length > 0) {
      throw new Error(
        `${label}: ${deviations.length} deviation(s), worst ` +
        `${Math.max(...deviations.map(d => Math.abs(d.magnitudeDb))).toExponential(3)} dB`,
      )
    }
  }
}, 300_000)

test("the matrix actually distinguishes settings, so agreement means something", async () => {
  // A comparison that passes because every state produces the same response
  // would be worthless. Two different settings must differ.
  const flat = await sweepOf(THREE_BAND_REFERENCE, MATRIX[0]!.state)
  const boosted = await sweepOf(THREE_BAND_REFERENCE, MATRIX[6]!.state)
  expect(compareResponses(flat, boosted, TOLERANCE).length).toBeGreaterThan(0)
}, 120_000)
