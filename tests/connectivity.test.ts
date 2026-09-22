import { test, expect } from "bun:test"
import { lintConnectivity } from "../lib/passives/connectivity.ts"
import type { ResolvedNetwork } from "../lib/passives/control-state.ts"

const wellFormed: ResolvedNetwork = {
  ports: { input: "in", output: "out", ground: "0" },
  elements: [
    { ref: "R1", kind: "resistor", pins: { a: "in", b: "mid" }, parameters: { ohms: 1000 } },
    { ref: "C1", kind: "capacitor", pins: { a: "mid", b: "0" }, parameters: { farads: 1e-6 } },
    { ref: "L1", kind: "inductor", pins: { a: "mid", b: "out" }, parameters: { henries: 0.1 } },
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
    elements: [
      ...wellFormed.elements.slice(0, 2),
      { ref: "L1", kind: "inductor", pins: { a: "mjd", b: "out" }, parameters: { henries: 0.1 } },
    ],
  }
  const findings = lintConnectivity(typo)
  expect(findings).toContainEqual({ code: "singleton-net", net: "mjd", terminal: "L1.a" })
})

test("a declared open is not reported", () => {
  const withOpen: ResolvedNetwork = {
    ports: wellFormed.ports,
    elements: [
      ...wellFormed.elements,
      { ref: "C9", kind: "capacitor", pins: { a: "mid", b: "spare" }, parameters: { farads: 1e-9 } },
    ],
  }
  expect(lintConnectivity(withOpen, { declaredOpens: ["spare"] })).toEqual([])
  expect(lintConnectivity(withOpen)).toContainEqual({ code: "singleton-net", net: "spare", terminal: "C9.b" })
})

test("two internally well-formed islands are reported", () => {
  const split: ResolvedNetwork = {
    ports: { input: "in", output: "out", ground: "0" },
    elements: [
      { ref: "R1", kind: "resistor", pins: { a: "in", b: "0" }, parameters: { ohms: 1000 } },
      { ref: "R2", kind: "resistor", pins: { a: "out", b: "iso" }, parameters: { ohms: 1000 } },
      { ref: "C2", kind: "capacitor", pins: { a: "iso", b: "out" }, parameters: { farads: 1e-6 } },
    ],
  }
  const islands = lintConnectivity(split).filter(f => f.code === "disconnected-island")
  expect(islands).toHaveLength(1)
})
