import { test, expect } from "bun:test"
import { RootCircuit } from "@tscircuit/core"
import { PultecLowBoost } from "../../modules/pultec-low-boost/PultecLowBoost.tsx"
import { toLabelledNetwork } from "../../lib/export/circuit-json.ts"
import { assertSameTopology } from "../../lib/passives/topology.ts"
import { boardNetwork } from "../../reference/pultec/partition.ts"
import type { ExportMapping } from "../../lib/export/circuit-json.ts"

const MAPPING: ExportMapping = {
  componentNames: {
    LB_C18: "C18", LB_C19: "C19", LB_C20: "C20",
    LB_C21: "C21", LB_C22: "C22", LB_C23: "C23",
    LB_R2: "R2",
  },
  netNames: {
    LB_GND: "0",
    LB_OUT: "out",
    LB_SECTION_IN: "lo_boost_in",
    LB_SEL_20Hz: "j10_p1",
    LB_SEL_30Hz: "j10_p2",
    LB_SEL_60Hz: "j10_p3",
    LB_SEL_100Hz: "j10_p4",
    LB_SEL_150Hz: "j10_p5",
    LB_SEL_200Hz: "j10_p6",
  },
  pinNames: { pin1: "a", pin2: "b" },
  ports: {
    "0": "0", out: "out", lo_boost_in: "lo_boost_in",
    j10_p1: "j10_p1", j10_p2: "j10_p2", j10_p3: "j10_p3",
    j10_p4: "j10_p4", j10_p5: "j10_p5", j10_p6: "j10_p6",
  },
}

function render() {
  const circuit = new RootCircuit()
  circuit.add(
    <board width="60mm" height="40mm">
      <PultecLowBoost name="LB" />
    </board>,
  )
  circuit.render()
  return circuit.getCircuitJson()
}

test("the rendered module equals the reference low boost board", () => {
  assertSameTopology(boardNetwork("low-boost"), toLabelledNetwork(render(), MAPPING))
})

test("the module emits no dangling pins", () => {
  expect(
    render().filter(e => e.type === "source_pin_missing_trace_warning"),
  ).toHaveLength(0)
})

test("carries no inductors, whatever the source repository's specs say", () => {
  // Three documents there specify four hand-wound coils for this section,
  // totalling roughly $161 and 12-16 hours. The Pultec low network is an RC
  // shelf. See unresolved item 6.
  const inductors = render().filter(
    e => e.type === "source_component" && e.ftype === "simple_inductor",
  )
  expect(inductors).toHaveLength(0)
})
