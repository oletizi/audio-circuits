import { test, expect } from "bun:test"
import { RootCircuit } from "@tscircuit/core"
import { PultecPassiveEq } from "../../modules/pultec-passive-eq/PultecPassiveEq.tsx"
import { toLabelledNetwork } from "../../lib/export/circuit-json.ts"
import { assertSameTopology } from "../../lib/passives/topology.ts"
import { boardNetwork } from "../../reference/pultec/partition.ts"
import { COMPOSED_MAPPING, COMPOSED_PREFIX } from "./composed-mapping.ts"
import type { ExportMapping } from "../../lib/export/circuit-json.ts"
import type { PassiveNetwork } from "../../lib/passives/topology.ts"

const P = COMPOSED_PREFIX
const MAPPING = COMPOSED_MAPPING

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
