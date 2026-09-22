import { test, expect } from "bun:test"
import { resolveNetwork } from "../lib/model/control-state.ts"
import type { ControlState } from "../lib/model/control-state.ts"
import { net } from "../lib/model/types.ts"
import type { Network, SwitchComponent } from "../lib/model/types.ts"

// `Component` keeps `kind` and `parameters` as independent fields, so narrowing on
// `kind` alone does not narrow `parameters` with it.
function isSwitchComponent(c: Network["components"][number]): c is SwitchComponent {
  return c.kind === "switch"
}

const NO_CONTROLS: ControlState = { potPositions: {}, switchPositions: {} }

const physical: Network = {
  ports: { input: "in", output: "out", ground: "0" },
  components: [
    { id: "P1", kind: "potentiometer",
      parameters: { ohms: 10000, taper: { type: "linear" } }, pins: {},
      units: [{ name: "MAIN", pins: { ccw: net("in"), wiper: net("out"), cw: net("0") } }] },
    { id: "S1", kind: "switch",
      parameters: { positions: ["a", "b"], contacts: { a: [["common", "a"]], b: [["common", "b"]] } }, pins: {},
      units: [{ name: "MAIN", pins: { common: net("out"), a: net("sel_a"), b: net("sel_b") } }] },
    { id: "C1", kind: "capacitor", parameters: { farads: 1e-8 }, pins: {},
      units: [{ name: "MAIN", pins: { a: net("sel_a"), b: net("0") } }] },
    { id: "C2", kind: "capacitor", parameters: { farads: 2e-8 }, pins: {},
      units: [{ name: "MAIN", pins: { a: net("sel_b"), b: net("0") } }] },
  ],
}

const midpoint: ControlState = { potPositions: { P1: 0.5 }, switchPositions: { S1: "a" } }

test("expands a linear pot into two resistors summing to its total", () => {
  const resolved = resolveNetwork(physical, midpoint)
  const lower = resolved.components.find(c => c.id === "P1.ccw-wiper")
  const upper = resolved.components.find(c => c.id === "P1.wiper-cw")
  if (lower?.kind !== "resistor") throw new Error("P1.ccw-wiper must resolve to a resistor")
  if (upper?.kind !== "resistor") throw new Error("P1.wiper-cw must resolve to a resistor")
  // `parameters` is independent of `kind` (see control-state.ts's own comment on
  // `Component`), so narrowing `kind` above does not narrow `parameters` with it; the
  // `in` check does.
  if (!("ohms" in lower.parameters) || !("ohms" in upper.parameters)) {
    throw new Error("resolved pot sections must carry ohms")
  }
  expect(lower.kind).toBe("resistor")
  expect(lower.parameters.ohms).toBeCloseTo(5000, 9)
  expect(upper.parameters.ohms).toBeCloseTo(5000, 9)
})

test("a closed switch contact merges its two nets", () => {
  const resolved = resolveNetwork(physical, midpoint)
  const c1 = resolved.components.find(c => c.id === "C1")
  const wiperCw = resolved.components.find(c => c.id === "P1.wiper-cw")
  expect(c1?.units[0]?.pins.a).toBe(wiperCw?.units[0]?.pins.a)
  expect(resolved.components.some(c => c.id === "S1")).toBe(false)
})

test("an open switch contact leaves its net unmerged", () => {
  const resolved = resolveNetwork(physical, midpoint)
  const c2 = resolved.components.find(c => c.id === "C2")
  expect(c2?.units[0]?.pins.a).toBe("sel_b")
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
  const groundShort: Network = {
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "R1", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: net("in"), b: net("mid") } }] },
      { id: "S3", kind: "switch",
        parameters: { positions: ["on"], contacts: { on: [["common", "thru"]] } }, pins: {},
        units: [{ name: "MAIN", pins: { common: net("0"), thru: net("mid") } }] },
      { id: "R2", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: net("mid"), b: net("out") } }] },
    ],
  }
  const resolved = resolveNetwork(groundShort, { potPositions: {}, switchPositions: { S3: "on" } })
  expect(resolved.ports.ground).toBe("0")
  const r1 = resolved.components.find(c => c.id === "R1")
  expect(r1?.units[0]?.pins.b).toBe("0")
})

test("rejects a switch position with no contacts entry", () => {
  // Declares only the ports it actually connects: `resolveNetwork` now runs its
  // structural well-formedness check first, which rejects a port landing on a net no
  // component touches.
  const missingContacts: Network = {
    ports: { output: "out" },
    components: [
      { id: "S9", kind: "switch",
        parameters: { positions: ["a", "b"], contacts: { a: [["common", "a"]] } }, pins: {},
        units: [{ name: "MAIN", pins: { common: net("out"), a: net("sel_a"), b: net("sel_b") } }] },
    ],
  }
  expect(() => resolveNetwork(missingContacts, { potPositions: {}, switchPositions: { S9: "b" } }))
    .toThrow("Missing switch contacts: S9=b")
})

test("rejects a pot missing a declared terminal", () => {
  // R9 exists only so the declared ground port lands on a net a component touches, which
  // the structural check requires, and so `netPreference` finds the ground port it is
  // told to use. The pot's missing `cw` terminal is still what this test exercises.
  const missingTerminal: Network = {
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "P9", kind: "potentiometer",
        parameters: { ohms: 10000, taper: { type: "linear" } }, pins: {},
        units: [{ name: "MAIN", pins: { ccw: net("in"), wiper: net("out") } }] },
      { id: "R9", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: net("out"), b: net("0") } }] },
    ],
  }
  expect(() => resolveNetwork(missingTerminal, { potPositions: { P9: 0.5 }, switchPositions: {} }))
    .toThrow("Unknown pot pin: P9.cw")
})

test("an unconnected port is diagnosed by the topology validator, not the union-find", () => {
  // Before resolveNetwork validated structure first, this surfaced as the union-find's
  // "Unknown ... member: mid" from a module that has no idea what a port is.
  const unconnectedPort: Network = {
    ports: { input: "in", output: "mid", ground: "0" },
    components: [
      { id: "R1", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: net("in"), b: net("0") } }] },
    ],
  }
  expect(() => resolveNetwork(unconnectedPort, { potPositions: {}, switchPositions: {} }))
    .toThrow("Unconnected port: output")
})

test("refuses a network that declares no ground port instead of silently reordering nets", () => {
  // netPreference is told which port key carries the reference node; an absent one
  // throws rather than quietly dropping the ground rule from the tie-break.
  const noGround: Network = {
    ports: { input: "in", output: "out" },
    components: [
      { id: "R1", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: net("in"), b: net("out") } }] },
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
  const ganged: Network = {
    ports: physical.ports,
    components: [
      ...physical.components,
      { id: "S2", kind: "switch",
        parameters: {
          positions: ["a", "b"], contacts: { a: [["common", "a"]], b: [["common", "b"]] }, gang: "freq",
        },
        pins: {},
        units: [{ name: "MAIN", pins: { common: net("in"), a: net("sel_a"), b: net("sel_b") } }] },
    ],
  }
  const gangedPhysical: Network = {
    ports: ganged.ports,
    components: ganged.components.map(c =>
      c.id === "S1" && isSwitchComponent(c)
        ? { ...c, parameters: { ...c.parameters, gang: "freq" } }
        : c),
  }
  expect(() => resolveNetwork(gangedPhysical, { potPositions: { P1: 0.5 }, switchPositions: { S1: "a", S2: "b" } }))
    .toThrow("Ganged switches disagree: freq")
})

test("a switch's unit pin colliding with a package pin of the same name is rejected", () => {
  // `terminals()` merges a pot/switch's package pins and its single unit's pins with a
  // spread; a same-named unit pin would otherwise silently shadow the package pin
  // instead of raising a collision. General (non-pot/switch) components no longer go
  // through this merge at all - Task 3 stopped resolution flattening package pins into
  // units - so this now has to be exercised through a switch, not a plain resistor.
  const collision: Network = {
    // `ground` is required by `netPreference` regardless of what this test exercises
    // (see "refuses a network that declares no ground port" below); reusing "in" keeps
    // the fixture minimal.
    ports: { input: "in", output: "out", ground: "in" },
    components: [{
      id: "s1", kind: "switch",
      parameters: { positions: ["a"], contacts: { a: [["common", "a"]] } },
      pins: { common: net("SHADOW") },
      units: [{ name: "MAIN", pins: { common: net("in"), a: net("out") } }],
    }],
  }
  expect(() => resolveNetwork(collision, { potPositions: {}, switchPositions: { s1: "a" } }))
    .toThrow(/pin "common" collides with a package pin/)
})

test("an active device passes through resolution with its structure intact", () => {
  const network: Network = {
    components: [{
      id: "amp", kind: "opamp", parameters: {},
      pins: { "v+": net("VCC"), "v-": net("VEE") },
      units: [{ name: "A", pins: { "in+": net("IN"), "in-": net("FB"), out: net("OUT") } }],
    }, {
      id: "fb", kind: "resistor", parameters: { ohms: 10000 },
      pins: {}, units: [{ name: "MAIN", pins: { a: net("OUT"), b: net("FB") } }],
    }],
    // `ground` is required by `netPreference` regardless of what this test exercises;
    // VEE (the negative supply) is a reasonable stand-in.
    ports: { IN: "IN", VCC: "VCC", VEE: "VEE", OUT: "OUT", ground: "VEE" },
  }
  const amp = resolveNetwork(network, NO_CONTROLS).components.find((c) => c.id === "amp")
  // Package pins stay on the COMPONENT. They are not merged into the unit.
  expect(amp?.pins).toEqual({ "v+": "VCC", "v-": "VEE" })
  expect(amp?.units).toHaveLength(1)
  expect(amp?.units[0]?.pins).toEqual({ "in+": "IN", "in-": "FB", out: "OUT" })
})

test("a dual package stays ONE component with two units", () => {
  const dual: Network = {
    components: [{
      id: "amp", kind: "opamp", parameters: {},
      pins: { "v+": net("VCC"), "v-": net("VEE") },
      units: [
        { name: "A", pins: { "in+": net("A_IN"), "in-": net("A_FB"), out: net("A_OUT") } },
        { name: "B", pins: { "in+": net("B_IN"), "in-": net("B_FB"), out: net("B_OUT") } },
      ],
    }],
    ports: {
      VCC: "VCC", VEE: "VEE", A_IN: "A_IN", A_FB: "A_FB", A_OUT: "A_OUT",
      B_IN: "B_IN", B_FB: "B_FB", B_OUT: "B_OUT",
      // Required by `netPreference` regardless of what this test exercises.
      ground: "VEE",
    },
  }
  const resolved = resolveNetwork(dual, NO_CONTROLS)
  expect(resolved.components).toHaveLength(1)
  expect(resolved.components[0]?.units.map((u) => u.name)).toEqual(["A", "B"])
})

test("a no-connect is omitted from resolved pins, not rendered as a net name", () => {
  const withNc: Network = {
    components: [{
      id: "u", kind: "ic", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { "1": net("IN"), "2": { kind: "nc" } } }],
    }, {
      id: "load", kind: "resistor", parameters: { ohms: 1000 },
      pins: {}, units: [{ name: "MAIN", pins: { a: net("IN"), b: net("GND") } }],
    }],
    // `ground` is required by `netPreference` regardless of what this test exercises.
    ports: { IN: "IN", GND: "GND", ground: "GND" },
  }
  const u = resolveNetwork(withNc, NO_CONTROLS).components.find((c) => c.id === "u")
  expect(u?.units[0]?.pins).toEqual({ "1": "IN" })
  expect(Object.keys(u?.units[0]?.pins ?? {})).not.toContain("2")
})

test("a potentiometer still resolves into two resistors", () => {
  // Reuses the assertions from "expands a linear pot into two resistors summing to its
  // total" above verbatim in substance (same fixture, same 5000/5000 split at the
  // midpoint), proving the generalisation changed nothing for a kind that already
  // resolved.
  const resolved = resolveNetwork(physical, midpoint)
  const lower = resolved.components.find(c => c.id === "P1.ccw-wiper")
  const upper = resolved.components.find(c => c.id === "P1.wiper-cw")
  if (lower?.kind !== "resistor") throw new Error("P1.ccw-wiper must resolve to a resistor")
  if (upper?.kind !== "resistor") throw new Error("P1.wiper-cw must resolve to a resistor")
  if (!("ohms" in lower.parameters) || !("ohms" in upper.parameters)) {
    throw new Error("resolved pot sections must carry ohms")
  }
  expect(lower.parameters.ohms).toBeCloseTo(5000, 9)
  expect(upper.parameters.ohms).toBeCloseTo(5000, 9)
})
