/**
 * THE SERIALIZATION IS A CONTRACT, AND THESE ARE THE TWO HALVES OF `docs/known-gaps.md` **G95**.
 *
 * Hand-written for Task 12 of the M1 schematic-authoring plan.
 *
 * **The half that matters most is the SECOND one.** G95 measured that three shuffles of one
 * netlist - same components, same nets, same partition - give three distinct drawings out of three
 * on 4 of 4 circuits: *"reordering the `.capacitor(...)` calls in a circuit file would change
 * every generated schematic."* So the manifest and the baseline must hash the serialized INPUT and
 * never the `Network`'s content, because a content hash *"would certify two different drawings
 * under one input hash, which is exactly the failure the manifest exists to prevent."* The test
 * named `two declaration orders of one circuit serialize differently` is that sentence made into
 * a check that can fail.
 *
 * **The pinned string is why the first half is a check at all.** "Serializing the same input twice
 * is byte-identical" cannot detect a reordering of the serializer's own declared key lists - both
 * halves of the comparison move together - so it would pass a perturbation that changes every
 * hashed byte in the repository. The golden below is what goes red. `docs/known-gaps.md`
 * **G184** records that the Task 12 brief's Step 9 names the test that cannot fail for it.
 */

import { expect, test } from "bun:test"
import { elkInputOf } from "../../../lib/schgen/elk/graph.ts"
import { serializeElkInput } from "../../../lib/schgen/elk/serialize.ts"
import { autoBlock, dividerSubgraph } from "./fixtures.ts"
import { res } from "../__fixtures__/circuits.ts"
import type { ElkNode } from "elkjs/lib/elk-api.js"

test("two serializations of one input are byte-identical", () => {
  const { graph } = elkInputOf(dividerSubgraph())
  expect(serializeElkInput(graph)).toBe(serializeElkInput(graph))
})

test("elkInputOf's own `serialized` is that same string", () => {
  const input = elkInputOf(dividerSubgraph())
  expect(input.serialized).toBe(serializeElkInput(input.graph))
})

/**
 * **THE CONTRACT, BYTE FOR BYTE.** One resistor between a supply rail and a ground rail: a unit
 * node sized from `Fix:R`'s own unit box, its two pins as fixed-position ports on the sides the
 * symbol's pin angles put them, and a zero-size boundary node per rail.
 *
 * If this string changes, every hash in the generation manifest and every baseline taken against
 * it changes with it. That is a deliberate act, not a refactor: update it here, in the same change
 * that changes the serializer or the graph, and say why.
 */
const ONE_RESISTOR =
  '{"id":"B","layoutOptions":{"elk.algorithm":"layered","elk.direction":"RIGHT",' +
  '"elk.edgeRouting":"ORTHOGONAL","elk.layered.spacing.nodeNodeBetweenLayers":"5080",' +
  '"elk.spacing.nodeNode":"2540"},"children":[{"id":"R_A:1","width":2032,"height":7620,' +
  '"layoutOptions":{"elk.portConstraints":"FIXED_POS"},"ports":[{"id":"R_A:1#1","x":1016,"y":0,' +
  '"width":0,"height":0,"layoutOptions":{"elk.port.side":"NORTH"}},{"id":"R_A:1#2","x":1016,' +
  '"y":7620,"width":0,"height":0,"layoutOptions":{"elk.port.side":"SOUTH"}}]},' +
  '{"id":"port:3V3","width":0,"height":0,"layoutOptions":{"elk.portConstraints":"FIXED_POS"}},' +
  '{"id":"port:GND","width":0,"height":0,"layoutOptions":{"elk.portConstraints":"FIXED_POS"}}],' +
  '"edges":[{"id":"3V3:0","sources":["R_A:1#1"],"targets":["port:3V3"]},' +
  '{"id":"GND:0","sources":["R_A:1#2"],"targets":["port:GND"]}]}'

test("the declared key order is pinned to the byte", () => {
  expect(elkInputOf(autoBlock([res("R_A", "3V3", "GND")])).serialized).toBe(ONE_RESISTOR)
})

/**
 * G95, as a check. The two circuits hold the same two components on the same three nets in the
 * same single block; only the order the parts are declared in differs.
 */
test("two declaration orders of one circuit serialize differently", () => {
  const a = res("R_A", "3V3", "MID")
  const b = res("R_B", "MID", "GND")
  const forward = elkInputOf(autoBlock([a, b])).serialized
  const reversed = elkInputOf(autoBlock([b, a])).serialized
  expect(forward).not.toBe(reversed)
  // Same components, same nets, same partition: it is the ORDER that moved, and nothing else.
  expect([...forward].sort().join("")).toBe([...reversed].sort().join(""))
})

test("layoutOptions keys serialize sorted, so insertion order cannot move a hash", () => {
  const one: ElkNode = { id: "n", layoutOptions: { b: "2", a: "1" } }
  const other: ElkNode = { id: "n", layoutOptions: { a: "1", b: "2" } }
  expect(serializeElkInput(one)).toBe(serializeElkInput(other))
  expect(serializeElkInput(one)).toBe('{"id":"n","layoutOptions":{"a":"1","b":"2"}}')
})

test("a field the serializer declares no key order for refuses rather than vanishing", () => {
  const labelled: ElkNode = { id: "n", labels: [{ text: "x" }] }
  expect(() => serializeElkInput(labelled)).toThrow(/declares no key order/)
  // An empty list is not a carried field, so it does not refuse.
  expect(serializeElkInput({ id: "n", labels: [] })).toBe('{"id":"n"}')
})
