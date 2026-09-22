import { test, expect } from "bun:test"
import { partitionTopology } from "../lib/passives/topology.ts"
import type { PassiveNetwork } from "../lib/passives/topology.ts"

const network: PassiveNetwork = {
  ports: { input: "in", output: "out", ground: "0" },
  elements: [
    { ref: "R1", kind: "resistor", pins: { a: "in", b: "mid" }, parameters: { ohms: 1000 } },
    { ref: "C1", kind: "capacitor", pins: { a: "mid", b: "0" }, parameters: { farads: 1e-6 } },
    { ref: "L1", kind: "inductor", pins: { a: "mid", b: "out" }, parameters: { henries: 0.1 } },
  ],
}

test("a one-character owner typo is rejected when the owner set is declared", () => {
  expect(() => partitionTopology(network, { R1: "lf", C1: "1f", L1: "hf" }, { allowedOwners: ["lf", "hf"] }))
    .toThrow("Unknown owner: 1f")
})

test("the typo is otherwise invisible in the derived boundary nets", () => {
  const intended = partitionTopology(network, { R1: "lf", C1: "lf", L1: "hf" })
  const typo = partitionTopology(network, { R1: "lf", C1: "1f", L1: "hf" })
  expect(Object.keys(typo.modules)).toHaveLength(3)
  expect(typo.boundaryNets.map(b => b.net)).toEqual(intended.boundaryNets.map(b => b.net))
})

test("a declared owner set still accepts a correct map", () => {
  const split = partitionTopology(network, { R1: "lf", C1: "lf", L1: "hf" }, { allowedOwners: ["lf", "hf"] })
  expect(Object.keys(split.modules).sort()).toEqual(["hf", "lf"])
})
