import { test, expect } from "bun:test"
import { assertSameTopology, partitionTopology } from "../lib/passives/topology.ts"
import type { MutablePassiveNetwork } from "../lib/passives/mutable.ts"

// Synthetic bridge: deliberately NOT a Pultec transcription or acceptance fixture.
const reference: MutablePassiveNetwork = {
  ports: { input: "in", output: "out", ground: "0" },
  elements: [
    { ref: "R1", kind: "resistor", pins: { a: "in", b: "out" }, parameters: { ohms: 1000 } },
    { ref: "C1", kind: "capacitor", pins: { a: "in", b: "0" }, parameters: { farads: 1e-6 } },
    { ref: "P1", kind: "potentiometer", pins: { cw: "out", wiper: "in", ccw: "0" },
      parameters: { ohms: 10000, taper: { type: "log", curveConstant: 4.8 } } },
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
  ["changed taper", n => {
    const p = n.elements[2]
    if (p.kind !== "potentiometer") throw new Error("fixture element 2 must be a potentiometer")
    p.parameters.taper = { type: "linear" }
  }],
  ["changed value", n => {
    const r = n.elements[0]
    if (r.kind !== "resistor") throw new Error("fixture element 0 must be a resistor")
    r.parameters.ohms = 600
  }],
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

test("provenance edits are not rewiring", () => {
  const annotated: MutablePassiveNetwork = structuredClone(reference)
  annotated.elements[0].provenance = { source: "synthetic fixture", note: "added after transcription review" }
  expect(() => assertSameTopology(reference, annotated)).not.toThrow()
})

test("an explicitly-undefined optional field canonicalizes identically to an absent one", () => {
  const explicit: MutablePassiveNetwork = structuredClone(reference)
  explicit.elements[0].provenance = undefined
  expect(() => assertSameTopology(reference, explicit)).not.toThrow()
})
