import { test, expect } from "bun:test"
import { RootCircuit } from "@tscircuit/core"
import { PultecLowCut } from "../../modules/pultec-low-cut/PultecLowCut.tsx"
import { toLabelledNetwork } from "../../lib/export/circuit-json.ts"
import { assertSameTopology } from "../../lib/passives/topology.ts"
import { boardNetwork } from "../../reference/pultec/partition.ts"
import type { ExportMapping } from "../../lib/export/circuit-json.ts"

/** Maps what the module emits onto the reference's canonical identifiers.
 *
 * This is the whole point of the exercise: the module is free to name things
 * for its own convenience, and the mapping is what asserts those names mean the
 * reference's components and nodes. An unmapped component or net throws rather
 * than passing through.
 */
const MAPPING: ExportMapping = {
  componentNames: {
    LC_C1: "C1", LC_C2: "C2", LC_C3: "C3", LC_C4: "C4",
    LC_C5: "C5", LC_C6: "C6", LC_C7: "C7",
  },
  netNames: {
    LC_IN: "hi_boost_out",
    LC_SEL_20Hz: "j5_p1",
    LC_SEL_30Hz: "j5_p2",
    LC_SEL_60Hz: "j5_p3",
    LC_SEL_100Hz: "j5_p4",
    LC_SEL_150Hz: "j5_p5",
    LC_SEL_200Hz: "j5_p6",
  },
  pinNames: { pin1: "a", pin2: "b" },
  ports: {
    hi_boost_out: "hi_boost_out",
    j5_p1: "j5_p1", j5_p2: "j5_p2", j5_p3: "j5_p3",
    j5_p4: "j5_p4", j5_p5: "j5_p5", j5_p6: "j5_p6",
  },
}

function render(swapSixtyHertz = false) {
  const circuit = new RootCircuit()
  circuit.add(
    <board width="60mm" height="40mm">
      <PultecLowCut name="LC" />
    </board>,
  )
  circuit.render()
  return circuit.getCircuitJson()
}

test("the rendered module equals the reference low cut board", () => {
  const exported = toLabelledNetwork(render(), MAPPING)
  assertSameTopology(boardNetwork("low-cut"), exported)
})

test("the module emits no dangling pins", () => {
  const warnings = render().filter(
    element => element.type === "source_pin_missing_trace_warning",
  )
  expect(warnings).toHaveLength(0)
})

test("the 60 Hz position really does carry two capacitors", () => {
  // The documentation's one exception. If a future edit "tidies" C7 away, the
  // topology comparison above fails, but this says why in one line.
  const exported = toLabelledNetwork(render(), MAPPING)
  const onSixty = exported.elements.filter(e => Object.values(e.pins).includes("j5_p3"))
  expect(onSixty.map(e => e.ref).sort()).toEqual(["C3", "C7"])
})

test("an unmapped component is refused rather than silently passed through", () => {
  const partial: ExportMapping = {
    ...MAPPING,
    componentNames: { ...MAPPING.componentNames, LC_C7: undefined as unknown as string },
  }
  expect(() => toLabelledNetwork(render(), partial)).toThrow("Unmapped component: LC_C7")
})
