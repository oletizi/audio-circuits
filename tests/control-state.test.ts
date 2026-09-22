import { test, expect } from "bun:test"
import { resolveNetwork } from "../lib/model/control-state.ts"
import type { ControlState } from "../lib/model/control-state.ts"
import type { PassiveNetwork } from "../lib/model/topology.ts"

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
  if (lower?.kind !== "resistor") throw new Error("P1.ccw-wiper must resolve to a resistor")
  if (upper?.kind !== "resistor") throw new Error("P1.wiper-cw must resolve to a resistor")
  expect(lower.kind).toBe("resistor")
  expect(lower.parameters.ohms).toBeCloseTo(5000, 9)
  expect(upper.parameters.ohms).toBeCloseTo(5000, 9)
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

test("rewrites ports through the canonical net representative after a switch merge", () => {
  // S1's "a" contact unions "out" (a port net) with "sel_a" (not a port net). The
  // canonical representative must remain "out" - not "sel_a" - or resolved.ports.output
  // would silently rename an external port.
  const resolved = resolveNetwork(physical, midpoint)
  expect(resolved.ports.input).toBe("in")
  expect(resolved.ports.output).toBe("out")
  expect(resolved.ports.ground).toBe("0")
})

test("a contact shorting a net to ground keeps ground as the canonical representative", () => {
  const groundShort: PassiveNetwork = {
    ports: { input: "in", output: "out", ground: "0" },
    elements: [
      { ref: "R1", kind: "resistor", pins: { a: "in", b: "mid" }, parameters: { ohms: 1000 } },
      { ref: "S3", kind: "switch", pins: { common: "0", thru: "mid" },
        parameters: { positions: ["on"], contacts: { on: [["common", "thru"]] } } },
      { ref: "R2", kind: "resistor", pins: { a: "mid", b: "out" }, parameters: { ohms: 1000 } },
    ],
  }
  const resolved = resolveNetwork(groundShort, { potPositions: {}, switchPositions: { S3: "on" } })
  expect(resolved.ports.ground).toBe("0")
  const r1 = resolved.elements.find(e => e.ref === "R1")
  expect(r1?.pins.b).toBe("0")
})

test("rejects a switch position with no contacts entry", () => {
  // Declares only the ports it actually connects: `resolveNetwork` now runs
  // `validateNetwork` first, which rejects a port landing on a net no element touches.
  const missingContacts: PassiveNetwork = {
    ports: { output: "out" },
    elements: [
      { ref: "S9", kind: "switch", pins: { common: "out", a: "sel_a", b: "sel_b" },
        parameters: { positions: ["a", "b"], contacts: { a: [["common", "a"]] } } },
    ],
  }
  expect(() => resolveNetwork(missingContacts, { potPositions: {}, switchPositions: { S9: "b" } }))
    .toThrow("Missing switch contacts: S9=b")
})

test("rejects a pot missing a declared terminal", () => {
  // R9 exists only so the declared ground port lands on a net an element touches, which
  // `validateNetwork` requires, and so `netPreference` finds the ground port it is told
  // to use. The pot's missing `cw` terminal is still what this test exercises.
  const missingTerminal: PassiveNetwork = {
    ports: { input: "in", output: "out", ground: "0" },
    elements: [
      { ref: "P9", kind: "potentiometer", pins: { ccw: "in", wiper: "out" },
        parameters: { ohms: 10000, taper: { type: "linear" } } },
      { ref: "R9", kind: "resistor", pins: { a: "out", b: "0" }, parameters: { ohms: 1000 } },
    ],
  }
  expect(() => resolveNetwork(missingTerminal, { potPositions: { P9: 0.5 }, switchPositions: {} }))
    .toThrow("Unknown pot pin: P9.cw")
})

test("rejects a passthrough element without exactly two pins keyed a and b", () => {
  // R8 exists only so the declared ground port lands on a connected net; R9's third pin
  // is what this test exercises.
  const threePin: PassiveNetwork = {
    ports: { input: "in", output: "out", ground: "0" },
    elements: [
      { ref: "R9", kind: "resistor", pins: { a: "in", b: "mid", c: "out" }, parameters: { ohms: 1000 } },
      { ref: "R8", kind: "resistor", pins: { a: "out", b: "0" }, parameters: { ohms: 1000 } },
    ],
  }
  expect(() => resolveNetwork(threePin, { potPositions: {}, switchPositions: {} }))
    .toThrow(/Element does not have exactly two pins keyed a and b: R9/)
})

test("an unconnected port is diagnosed by the topology validator, not the union-find", () => {
  // Before resolveNetwork called validateNetwork, this surfaced as the union-find's
  // "Unknown ... member: mid" from a module that has no idea what a port is.
  const unconnectedPort: PassiveNetwork = {
    ports: { input: "in", output: "mid", ground: "0" },
    elements: [
      { ref: "R1", kind: "resistor", pins: { a: "in", b: "0" }, parameters: { ohms: 1000 } },
    ],
  }
  expect(() => resolveNetwork(unconnectedPort, { potPositions: {}, switchPositions: {} }))
    .toThrow("Unconnected port: output")
})

test("refuses a network that declares no ground port instead of silently reordering nets", () => {
  // netPreference is told which port key carries the reference node; an absent one
  // throws rather than quietly dropping the ground rule from the tie-break.
  const noGround: PassiveNetwork = {
    ports: { input: "in", output: "out" },
    elements: [
      { ref: "R1", kind: "resistor", pins: { a: "in", b: "out" }, parameters: { ohms: 1000 } },
    ],
  }
  expect(() => resolveNetwork(noGround, { potPositions: {}, switchPositions: {} }))
    .toThrow("Missing ground port: ground")
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
