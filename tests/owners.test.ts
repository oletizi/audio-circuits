import { test, expect } from "bun:test"
import { partitionTopology } from "../lib/model/topology.ts"
import { net } from "../lib/model/types.ts"
import type { Network } from "../lib/model/types.ts"

const network: Network = {
  ports: { input: "in", output: "out", ground: "0" },
  components: [
    { id: "R1", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
      units: [{ name: "MAIN", pins: { a: net("in"), b: net("mid") } }] },
    { id: "C1", kind: "capacitor", parameters: { farads: 1e-6 }, pins: {},
      units: [{ name: "MAIN", pins: { a: net("mid"), b: net("0") } }] },
    { id: "L1", kind: "inductor", parameters: { henries: 0.1 }, pins: {},
      units: [{ name: "MAIN", pins: { a: net("mid"), b: net("out") } }] },
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
