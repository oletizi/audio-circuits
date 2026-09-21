import { test, expect } from "bun:test"
import { RootCircuit } from "@tscircuit/core"
import { PultecHiCut } from "../../modules/pultec-hi-cut/PultecHiCut.tsx"
import { toLabelledNetwork } from "../../lib/export/circuit-json.ts"
import { assertSameTopology } from "../../lib/passives/topology.ts"
import { boardNetwork } from "../../reference/pultec/partition.ts"
import type { ExportMapping } from "../../lib/export/circuit-json.ts"

const MAPPING: ExportMapping = {
  componentNames: {
    HC_C24: "C24", HC_C25: "C25", HC_C26: "C26", HC_C27: "C27", HC_C28: "C28",
    HC_C29: "C29", HC_C30: "C30", HC_C31: "C31", HC_C32: "C32", HC_C33: "C33",
    HC_R1: "R1",
  },
  netNames: {
    HC_SECTION: "lo_boost_in",
    HC_WIPER: "j4_p2",
    HC_SEL_COMMON: "j3_p1",
    HC_SEL_3kHz: "j12_p1",
    HC_SEL_4kHz: "j12_p2",
    HC_SEL_5kHz: "j12_p3",
    HC_SEL_8kHz: "j12_p4",
    HC_SEL_10kHz: "j12_p5",
    HC_SEL_16kHz: "j12_p6",
  },
  pinNames: { pin1: "a", pin2: "b" },
  ports: {
    lo_boost_in: "lo_boost_in", j4_p2: "j4_p2", j3_p1: "j3_p1",
    j12_p1: "j12_p1", j12_p2: "j12_p2", j12_p3: "j12_p3",
    j12_p4: "j12_p4", j12_p5: "j12_p5", j12_p6: "j12_p6",
  },
}

function render() {
  const circuit = new RootCircuit()
  circuit.add(
    <board width="70mm" height="40mm">
      <PultecHiCut name="HC" />
    </board>,
  )
  circuit.render()
  return circuit.getCircuitJson()
}

test("the rendered module equals the reference hi cut board", () => {
  assertSameTopology(boardNetwork("hi-cut"), toLabelledNetwork(render(), MAPPING))
})

test("the module emits no dangling pins", () => {
  expect(
    render().filter(e => e.type === "source_pin_missing_trace_warning"),
  ).toHaveLength(0)
})

test("the four doubled positions each carry both capacitors", () => {
  // "Spaces on the PCB for up to two capacitors per boost/cut frequency".
  const exported = toLabelledNetwork(render(), MAPPING)
  const on = (net: string) =>
    exported.elements
      .filter(e => Object.values(e.pins).includes(net))
      .map(e => e.ref)
      .sort()
  expect(on("j12_p1")).toEqual(["C24", "C30"])
  expect(on("j12_p2")).toEqual(["C25", "C31"])
  expect(on("j12_p4")).toEqual(["C27", "C32"])
  expect(on("j12_p5")).toEqual(["C28", "C33"])
  // And the two single positions are genuinely single.
  expect(on("j12_p3")).toEqual(["C26"])
  expect(on("j12_p6")).toEqual(["C29"])
})
