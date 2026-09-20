import { test, expect } from "bun:test"
import { assertSameTopology, partitionTopology } from "../lib/passives/topology.ts"
import type { MutablePassiveNetwork } from "../lib/passives/mutable.ts"

// Synthetic bridge: deliberately NOT a Pultec transcription or acceptance fixture.
const reference: MutablePassiveNetwork = {
  ports: { input: "in", output: "out", ground: "0" },
  elements: [
    { ref: "R1", kind: "resistor", pins: { a: "in", b: "out" }, parameters: { ohms: "1000" } },
    { ref: "C1", kind: "capacitor", pins: { a: "in", b: "0" }, parameters: { farads: "1e-6" } },
    { ref: "P1", kind: "potentiometer", pins: { cw: "out", wiper: "in", ccw: "0" }, parameters: { ohms: "10000", taper: "log" } },
  ],
}
const ownership: Record<string, string> = { R1: "lf", C1: "lf", P1: "hf" }

test("physical partition preserves topology and exposes all shared nets", () => {
  const split = partitionTopology(reference, ownership)
  expect(split.boundaryNets).toEqual(["0", "in", "out"].map(net => ({ net, owners: ["hf", "lf"] })))
  assertSameTopology(reference, { ports: split.ports, elements: Object.values(split.modules).flat().reverse() })
})

const mutations: readonly (readonly [string, (n: MutablePassiveNetwork) => void])[] = [
  ["changed shared node", n => { n.elements[2].pins.wiper = "out" }],
  ["changed taper", n => { n.elements[2].parameters.taper = "linear" }],
  ["changed value", n => { n.elements[0].parameters.ohms = "600" }],
  ["missing component", n => { n.elements.pop() }],
  ["extra termination", n => { n.elements.push({ ...n.elements[0], ref: "R2" }) }],
  ["duplicate reference", n => { n.elements.push(n.elements[0]) }],
  ["swapped external ports", n => { n.ports.input = "out"; n.ports.output = "in" }],
]

for (const [name, mutate] of mutations) {
  test(`rejects ${name}`, () => {
    const candidate: MutablePassiveNetwork = structuredClone(reference)
    mutate(candidate)
    expect(() => assertSameTopology(reference, candidate)).toThrow()
  })
}

test("requires exactly one owner for every reference", () => {
  expect(() => partitionTopology(reference, { R1: "lf" })).toThrow("Missing owner")
  expect(() => partitionTopology(reference, { ...ownership, R2: "hf" })).toThrow("Unknown reference")
})
