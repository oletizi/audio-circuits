import { test, expect } from "bun:test"
import { assertSameTopology, partitionTopology } from "../lib/model/topology.ts"
import { net } from "../lib/model/types.ts"
import type { PotentiometerComponent, ResistorComponent } from "../lib/model/types.ts"
import type { Mutable, MutableNetwork } from "../lib/model/mutable.ts"

// `Component` keeps `kind` and `parameters` as independent fields, so narrowing a
// mutation fixture's element on `kind` alone does not narrow `parameters` with it -
// these give the mutation table something to narrow into.
function isMutablePotentiometer(
  c: MutableNetwork["components"][number],
): c is Mutable<PotentiometerComponent> {
  return c.kind === "potentiometer"
}
function isMutableResistor(
  c: MutableNetwork["components"][number],
): c is Mutable<ResistorComponent> {
  return c.kind === "resistor"
}

// Synthetic bridge: deliberately NOT a Pultec transcription or acceptance fixture.
const reference: MutableNetwork = {
  ports: { input: "in", output: "out", ground: "0" },
  components: [
    { id: "R1", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
      units: [{ name: "MAIN", pins: { a: net("in"), b: net("out") } }] },
    { id: "C1", kind: "capacitor", parameters: { farads: 1e-6 }, pins: {},
      units: [{ name: "MAIN", pins: { a: net("in"), b: net("0") } }] },
    { id: "P1", kind: "potentiometer",
      parameters: { ohms: 10000, taper: { type: "log", curveConstant: 4.8 } }, pins: {},
      units: [{ name: "MAIN", pins: { cw: net("out"), wiper: net("in"), ccw: net("0") } }] },
  ],
}
const ownership: Record<string, string> = { R1: "lf", C1: "lf", P1: "hf" }

test("physical partition preserves topology and exposes all shared nets", () => {
  const split = partitionTopology(reference, ownership)
  expect(split.boundaryNets).toEqual(["0", "in", "out"].map(netName => ({ net: netName, owners: ["hf", "lf"] })))
  assertSameTopology(reference, { ports: split.ports, components: Object.values(split.modules).flat().reverse() })
})

const mutations: readonly (readonly [string, (n: MutableNetwork) => void])[] = [
  ["changed shared node", n => { n.components[2].units[0].pins.wiper = net("out") }],
  ["changed taper", n => {
    const p = n.components[2]
    if (!isMutablePotentiometer(p)) throw new Error("fixture component 2 must be a potentiometer")
    p.parameters.taper = { type: "linear" }
  }],
  ["changed value", n => {
    const r = n.components[0]
    if (!isMutableResistor(r)) throw new Error("fixture component 0 must be a resistor")
    r.parameters.ohms = 600
  }],
  ["missing component", n => { n.components.pop() }],
  ["extra termination", n => { n.components.push({ ...n.components[0], id: "R2" }) }],
  ["swapped external ports", n => { n.ports.input = "out"; n.ports.output = "in" }],
]

for (const [name, mutate] of mutations) {
  test(`rejects ${name}`, () => {
    const candidate: MutableNetwork = structuredClone(reference)
    mutate(candidate)
    expect(() => assertSameTopology(reference, candidate)).toThrow()
  })
}

test("rejects duplicate reference", () => {
  // A bare .toThrow() here would also pass on the unrelated "external ports
  // differ" fall-through (nothing else in assertSameTopology's per-component
  // diff names a same-id, same-shape duplicate). Assert the specific message
  // validateNetwork raises, so this test can only pass for the right reason.
  const candidate: MutableNetwork = structuredClone(reference)
  candidate.components.push(candidate.components[0])
  expect(() => assertSameTopology(reference, candidate)).toThrow(/duplicate component id "R1"/)
})

test("names the component that was rewired", () => {
  const candidate: MutableNetwork = structuredClone(reference)
  candidate.components[0].units[0].pins.b = net("0")
  expect(() => assertSameTopology(reference, candidate)).toThrow("R1 differs")
})

test("names a missing component", () => {
  const candidate: MutableNetwork = structuredClone(reference)
  candidate.components.pop()
  expect(() => assertSameTopology(reference, candidate)).toThrow("P1 is missing")
})

test("requires exactly one owner for every reference", () => {
  expect(() => partitionTopology(reference, { R1: "lf" })).toThrow("Missing owner")
  expect(() => partitionTopology(reference, { ...ownership, R2: "hf" })).toThrow("Unknown reference")
})

test("provenance edits are not rewiring", () => {
  const annotated: MutableNetwork = structuredClone(reference)
  annotated.components[0].provenance = { source: "synthetic fixture", note: "added after transcription review" }
  expect(() => assertSameTopology(reference, annotated)).not.toThrow()
})

test("an explicitly-undefined optional field canonicalizes identically to an absent one", () => {
  const explicit: MutableNetwork = structuredClone(reference)
  explicit.components[0].provenance = undefined
  expect(() => assertSameTopology(reference, explicit)).not.toThrow()
})
