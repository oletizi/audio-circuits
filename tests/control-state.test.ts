import { test, expect } from "bun:test"
import { resolveNetwork } from "../lib/passives/control-state.ts"
import type { ControlState } from "../lib/passives/control-state.ts"
import type { PassiveNetwork } from "../lib/passives/topology.ts"

const physical: PassiveNetwork = {
  ports: { input: "in", output: "out", ground: "0" },
  elements: [
    { ref: "P1", kind: "potentiometer", pins: { ccw: "in", wiper: "out", cw: "0" },
      parameters: { ohms: 10000, taper: { type: "linear" } } },
    { ref: "S1", kind: "switch", pins: { common: "out", a: "sel_a", b: "sel_b" },
      parameters: { positions: ["a", "b"], contacts: { a: [["common", "a"]], b: [["common", "b"]] } } },
    { ref: "C1", kind: "capacitor", pins: { a: "sel_a", b: "0" }, parameters: { farads: 1e-8 } },
    { ref: "C2", kind: "capacitor", pins: { a: "sel_b", b: "0" }, parameters: { farads: 2e-8 } },
  ],
}

const midpoint: ControlState = { potPositions: { P1: 0.5 }, switchPositions: { S1: "a" } }

test("expands a linear pot into two resistors summing to its total", () => {
  const resolved = resolveNetwork(physical, midpoint)
  const lower = resolved.elements.find(e => e.ref === "P1.ccw-wiper")
  const upper = resolved.elements.find(e => e.ref === "P1.wiper-cw")
  expect(lower?.kind).toBe("resistor")
  expect(lower?.parameters.ohms).toBeCloseTo(5000, 9)
  expect(upper?.parameters.ohms).toBeCloseTo(5000, 9)
})

test("a closed switch contact merges its two nets", () => {
  const resolved = resolveNetwork(physical, midpoint)
  const c1 = resolved.elements.find(e => e.ref === "C1")
  expect(c1?.pins.a).toBe(resolved.elements.find(e => e.ref === "P1.wiper-cw")?.pins.a)
  expect(resolved.elements.some(e => e.ref === "S1")).toBe(false)
})

test("an open switch contact leaves its net unmerged", () => {
  const resolved = resolveNetwork(physical, midpoint)
  const c2 = resolved.elements.find(e => e.ref === "C2")
  expect(c2?.pins.a).toBe("sel_b")
})

test("rejects invalid or missing control settings instead of defaulting", () => {
  expect(() => resolveNetwork(physical, { potPositions: {}, switchPositions: { S1: "a" } }))
    .toThrow("Missing control setting: P1")
  expect(() => resolveNetwork(physical, { potPositions: { P1: 1.5 }, switchPositions: { S1: "a" } }))
    .toThrow("Pot position out of range: P1")
  expect(() => resolveNetwork(physical, { potPositions: { P1: 0.5 }, switchPositions: { S1: "c" } }))
    .toThrow("Unknown switch position: S1=c")
  expect(() => resolveNetwork(physical, { potPositions: { P1: 0.5, P9: 0.5 }, switchPositions: { S1: "a" } }))
    .toThrow("Unknown control reference: P9")
})

test("ganged switches must select the same position", () => {
  const ganged: PassiveNetwork = {
    ports: physical.ports,
    elements: [
      ...physical.elements,
      { ref: "S2", kind: "switch", pins: { common: "in", a: "sel_a", b: "sel_b" },
        parameters: { positions: ["a", "b"], contacts: { a: [["common", "a"]], b: [["common", "b"]] }, gang: "freq" } },
    ],
  }
  const gangedPhysical: PassiveNetwork = {
    ports: ganged.ports,
    elements: ganged.elements.map(e =>
      e.ref === "S1" && e.kind === "switch"
        ? { ...e, parameters: { ...e.parameters, gang: "freq" } }
        : e),
  }
  expect(() => resolveNetwork(gangedPhysical, { potPositions: { P1: 0.5 }, switchPositions: { S1: "a", S2: "b" } }))
    .toThrow("Ganged switches disagree: freq")
})
