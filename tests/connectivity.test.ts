import { test, expect } from "bun:test"
import { lintConnectivity } from "../lib/model/connectivity.ts"
import type { ResolvedNetwork } from "../lib/model/control-state.ts"

const wellFormed: ResolvedNetwork = {
  ports: { input: "in", output: "out", ground: "0" },
  components: [
    { id: "R1", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
      units: [{ name: "MAIN", pins: { a: "in", b: "mid" } }] },
    { id: "C1", kind: "capacitor", parameters: { farads: 1e-6 }, pins: {},
      units: [{ name: "MAIN", pins: { a: "mid", b: "0" } }] },
    { id: "L1", kind: "inductor", parameters: { henries: 0.1 }, pins: {},
      units: [{ name: "MAIN", pins: { a: "mid", b: "out" } }] },
  ],
}

test("a well-formed network produces no findings", () => {
  expect(lintConnectivity(wellFormed)).toEqual([])
})

test("external ports are not reported as singletons", () => {
  // "in" and "out" each touch exactly one element terminal, which is correct.
  expect(lintConnectivity(wellFormed).filter(f => f.code === "singleton-net")).toEqual([])
})

test("an accidental singleton net is reported", () => {
  const typo: ResolvedNetwork = {
    ports: wellFormed.ports,
    components: [
      ...wellFormed.components.slice(0, 2),
      { id: "L1", kind: "inductor", parameters: { henries: 0.1 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "mjd", b: "out" } }] },
    ],
  }
  const findings = lintConnectivity(typo)
  expect(findings).toContainEqual({ code: "singleton-net", net: "mjd", terminal: "L1.a" })
})

test("a declared open is not reported", () => {
  const withOpen: ResolvedNetwork = {
    ports: wellFormed.ports,
    components: [
      ...wellFormed.components,
      { id: "C9", kind: "capacitor", parameters: { farads: 1e-9 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "mid", b: "spare" } }] },
    ],
  }
  expect(lintConnectivity(withOpen, { declaredOpens: ["spare"] })).toEqual([])
  expect(lintConnectivity(withOpen)).toContainEqual({ code: "singleton-net", net: "spare", terminal: "C9.b" })
})

test("two internally well-formed islands are reported", () => {
  const split: ResolvedNetwork = {
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "R1", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "in", b: "0" } }] },
      { id: "R2", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "out", b: "iso" } }] },
      { id: "C2", kind: "capacitor", parameters: { farads: 1e-6 }, pins: {},
        units: [{ name: "MAIN", pins: { a: "iso", b: "out" } }] },
    ],
  }
  const islands = lintConnectivity(split).filter(f => f.code === "disconnected-island")
  expect(islands).toHaveLength(1)
})
