import { test, expect } from "bun:test"
import { RootCircuit } from "@tscircuit/core"
import { PultecPassiveEq } from "../../modules/pultec-passive-eq/PultecPassiveEq.tsx"
import { toLabelledNetwork } from "../../lib/export/circuit-json.ts"
import { assertSameTopology } from "../../lib/passives/topology.ts"
import { boardNetwork } from "../../reference/pultec/partition.ts"
import type { ExportMapping } from "../../lib/export/circuit-json.ts"
import type { PassiveNetwork } from "../../lib/passives/topology.ts"

const P = "EQ"

const MAPPING: ExportMapping = {
  componentNames: {
    [`${P}_LC_C1`]: "C1", [`${P}_LC_C2`]: "C2", [`${P}_LC_C3`]: "C3",
    [`${P}_LC_C4`]: "C4", [`${P}_LC_C5`]: "C5", [`${P}_LC_C6`]: "C6",
    [`${P}_LC_C7`]: "C7",
    [`${P}_LB_C18`]: "C18", [`${P}_LB_C19`]: "C19", [`${P}_LB_C20`]: "C20",
    [`${P}_LB_C21`]: "C21", [`${P}_LB_C22`]: "C22", [`${P}_LB_C23`]: "C23",
    [`${P}_LB_R2`]: "R2",
    [`${P}_HC_C24`]: "C24", [`${P}_HC_C25`]: "C25", [`${P}_HC_C26`]: "C26",
    [`${P}_HC_C27`]: "C27", [`${P}_HC_C28`]: "C28", [`${P}_HC_C29`]: "C29",
    [`${P}_HC_C30`]: "C30", [`${P}_HC_C31`]: "C31", [`${P}_HC_C32`]: "C32",
    [`${P}_HC_C33`]: "C33",
    [`${P}_HC_R1`]: "R1",
  },
  netNames: {
    [`${P}_LC_IN`]: "hi_boost_out",
    [`${P}_LC_SEL_20Hz`]: "j5_p1", [`${P}_LC_SEL_30Hz`]: "j5_p2",
    [`${P}_LC_SEL_60Hz`]: "j5_p3", [`${P}_LC_SEL_100Hz`]: "j5_p4",
    [`${P}_LC_SEL_150Hz`]: "j5_p5", [`${P}_LC_SEL_200Hz`]: "j5_p6",
    [`${P}_LB_GND`]: "0",
    [`${P}_LB_OUT`]: "out",
    // Both sides of the composition's single join map to the same node.
    [`${P}_LB_SECTION_IN`]: "lo_boost_in",
    [`${P}_HC_SECTION`]: "lo_boost_in",
    [`${P}_LB_SEL_20Hz`]: "j10_p1", [`${P}_LB_SEL_30Hz`]: "j10_p2",
    [`${P}_LB_SEL_60Hz`]: "j10_p3", [`${P}_LB_SEL_100Hz`]: "j10_p4",
    [`${P}_LB_SEL_150Hz`]: "j10_p5", [`${P}_LB_SEL_200Hz`]: "j10_p6",
    [`${P}_HC_WIPER`]: "j4_p2",
    [`${P}_HC_SEL_COMMON`]: "j3_p1",
    [`${P}_HC_SEL_3kHz`]: "j12_p1", [`${P}_HC_SEL_4kHz`]: "j12_p2",
    [`${P}_HC_SEL_5kHz`]: "j12_p3", [`${P}_HC_SEL_8kHz`]: "j12_p4",
    [`${P}_HC_SEL_10kHz`]: "j12_p5", [`${P}_HC_SEL_16kHz`]: "j12_p6",
  },
  pinNames: { pin1: "a", pin2: "b" },
  ports: { input: "hi_boost_out", output: "out", ground: "0" },
}

function render() {
  const circuit = new RootCircuit()
  circuit.add(
    <board width="90mm" height="90mm">
      <PultecPassiveEq name={P} />
    </board>,
  )
  circuit.render()
  return circuit.getCircuitJson()
}

/** The three module boards recomposed, which is what the composition must equal. */
function composedReference(): PassiveNetwork {
  const elements = [
    ...boardNetwork("low-cut").elements,
    ...boardNetwork("low-boost").elements,
    ...boardNetwork("hi-cut").elements,
  ]
  return { ports: MAPPING.ports, elements }
}

test("the composed board equals the reference partition recomposed", () => {
  assertSameTopology(composedReference(), toLabelledNetwork(render(), MAPPING))
})

test("composition adds conductors only, duplicating no component", () => {
  const exported = toLabelledNetwork(render(), MAPPING)
  const refs = exported.elements.map(e => e.ref)
  expect(new Set(refs).size).toBe(refs.length)
  expect(refs).toHaveLength(composedReference().elements.length)
})

test("the join really did merge the two sections onto one node", () => {
  const exported = toLabelledNetwork(render(), MAPPING)
  const onNode = exported.elements
    .filter(e => Object.values(e.pins).includes("lo_boost_in"))
    .map(e => e.ref)
    .sort()
  // R2 from low boost, and the whole hi cut bank, meet here.
  expect(onNode).toContain("R2")
  expect(onNode).toContain("C24")
  expect(onNode).toContain("C33")
})

test("the composition emits no dangling pins", () => {
  expect(
    render().filter(e => e.type === "source_pin_missing_trace_warning"),
  ).toHaveLength(0)
})

test("two nets that mean different nodes are still refused", () => {
  // The join is legitimate because both names map to one canonical net. Point
  // one of them somewhere else and the guard must fire.
  const shorted: ExportMapping = {
    ...MAPPING,
    netNames: { ...MAPPING.netNames, [`${P}_HC_SECTION`]: "out" },
  }
  expect(() => toLabelledNetwork(render(), shorted)).toThrow("Conflicting nets in group")
})
