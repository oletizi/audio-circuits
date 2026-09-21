import { test, expect } from "bun:test"
import { RootCircuit } from "@tscircuit/core"
import { PultecPassiveEq } from "../../modules/pultec-passive-eq/PultecPassiveEq.tsx"
import { toLabelledNetwork, netGroups } from "../../lib/export/circuit-json.ts"
import { assertSameTopology } from "../../lib/passives/topology.ts"
import { boardNetwork } from "../../reference/pultec/partition.ts"
import { COMPOSED_MAPPING, COMPOSED_PREFIX } from "./composed-mapping.ts"
import { overlappingComponents, misprintedValues } from "./schematic-overlap.ts"
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

/** The five module boards recomposed, which is what the composition must equal. */
function composedReference(): PassiveNetwork {
  const elements = [
    ...boardNetwork("low-cut").elements,
    ...boardNetwork("low-boost").elements,
    ...boardNetwork("hi-cut").elements,
    ...boardNetwork("hi-boost").elements,
    ...boardNetwork("mid").elements,
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

test("every join the mapping claims is a conductor that actually exists", () => {
  // Whenever two board nets map to one canonical net, the mapping is asserting
  // the boards are joined there. Nothing downstream can tell an asserted join
  // from a real one: the flattened network reads each group's canonical name by
  // lookup, so two UNJOINED nets both labelled "0" flatten to the same node and
  // every topology and AC assertion passes. This is the only check that looks
  // at the conductor. Driven off the mapping rather than a hand-written list,
  // so a join added tomorrow is covered the day it is written.
  const byCanonical = new Map<string, string[]>()
  for (const [boardNet, canonical] of Object.entries(MAPPING.netNames)) {
    const existing = byCanonical.get(canonical)
    if (existing) existing.push(boardNet)
    else byCanonical.set(canonical, [boardNet])
  }
  const claimed = [...byCanonical].filter(([, boardNets]) => boardNets.length > 1)
  // Ground, and the low-boost/hi-cut node. If this drops to nothing, the loop
  // below is vacuous and the test has stopped testing.
  expect(claimed.length).toBeGreaterThan(0)

  const groups = netGroups(render())
  for (const [canonical, boardNets] of claimed) {
    const containing = groups.filter(group => boardNets.some(net => group.includes(net)))
    expect(
      containing.length,
      `${canonical} is claimed by ${boardNets.sort().join(" and ")}, which are ` +
      `${containing.length} separate nodes on the board, not one`,
    ).toBe(1)
  }
})

test("no two components are drawn at the same spot", () => {
  // Same defect class Tasks 1 and 2 both shipped once each: a schematic
  // collision is invisible to every topology and value assertion above,
  // because the netlist is correct either way.
  expect(overlappingComponents(render())).toEqual([])
})

test("every printed value matches the value the part actually carries", () => {
  // tscircuit formats the display string separately from the simulated value,
  // and they can disagree: an inductor written `300mH` simulates as 0.3H and
  // prints "300H". Every other value assertion here reads the simulated side,
  // so nothing else in this suite can see it -- and the printed side is what a
  // reader orders parts from.
  expect(misprintedValues(render())).toEqual([])
})
