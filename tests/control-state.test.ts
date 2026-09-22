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

/** Sections of a pot with the given taper, at the given wiper fraction. */
function potSections(
  taper: { readonly type: "linear" } | { readonly type: "log"; readonly curveConstant: number },
  fraction: number,
): { readonly lower: number; readonly upper: number } {
  const network: Network = {
    ports: { input: "in", output: "out", ground: "0" },
    components: [
      { id: "P1", kind: "potentiometer", parameters: { ohms: 10000, taper }, pins: {},
        units: [{ name: "MAIN", pins: { ccw: net("in"), wiper: net("out"), cw: net("0") } }] },
      { id: "R1", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: net("out"), b: net("0") } }] },
    ],
  }
  const resolved = resolveNetwork(network, { potPositions: { P1: fraction }, switchPositions: {} })
  const read = (id: string): number => {
    const section = resolved.components.find(c => c.id === id)
    if (section === undefined || !("ohms" in section.parameters)) {
      throw new Error(`resolved pot section missing or carrying no ohms: ${id}`)
    }
    return section.parameters.ohms
  }
  return { lower: read("P1.ccw-wiper"), upper: read("P1.wiper-cw") }
}

test("a logarithmic pot follows its curve constant, not a straight line", () => {
  // `taperFraction`'s log branch was entirely untested: replacing the whole
  // function body with `return f` - every taper linear - left the suite green.
  // The reference network only ever resolves at the extremes, where every curve
  // agrees exactly, so the coverage has to come from a mid-position case here.
  //
  // Expected values from the law the branch implements,
  // (exp(k*f) - 1) / (exp(k) - 1) at k = 4.8, computed independently of the
  // implementation: 0.01925241792790118 at f = 0.25, 0.08317269649392238 at
  // f = 0.5, 0.2953954950670035 at f = 0.75.
  const taper = { type: "log", curveConstant: 4.8 } as const
  for (const [fraction, expectedLower] of [
    [0.25, 192.5241792790118],
    [0.5, 831.7269649392238],
    [0.75, 2953.954950670035],
  ] as const) {
    const { lower, upper } = potSections(taper, fraction)
    expect(lower, `log taper at ${fraction}`).toBeCloseTo(expectedLower, 9)
    // The two sections still sum to the pot's total, as they do for a linear one.
    expect(lower + upper).toBeCloseTo(10000, 9)
    // And the log curve is NOWHERE near the linear one in mid-travel, which is
    // what makes a linear substitution visible rather than a rounding question.
    expect(Math.abs(lower - 10000 * fraction)).toBeGreaterThan(1000)
  }
})

test("every taper agrees exactly at the extremes", () => {
  // Why the reference network can resolve a log pot without the curve constant
  // mattering: at fraction 0 and 1 the log branch returns exactly 0 and 1, the
  // same as the linear branch. Asserted rather than assumed, because
  // `reference/pultec/three-band.ts` records an UNVALIDATED curve constant and
  // rests on precisely this.
  for (const taper of [
    { type: "linear" } as const,
    { type: "log", curveConstant: 4.8 } as const,
  ]) {
    expect(potSections(taper, 0).lower).toBe(0)
    expect(potSections(taper, 1).lower).toBe(10000)
  }
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
  //
  // WHICH MECHANISM ACTUALLY FIRES HERE HAS CHANGED. `validatePhysicalNetwork` now runs
  // `assertNoPackagePinShadowing` over every component first, so this throw comes from
  // the input contract and `terminals()`'s own check is dead on this path. Measured:
  // with the `validatePhysicalNetwork` call deleted from `resolveNetwork`, this test
  // still passes - which it can only do if `terminals()` threw instead. Both messages
  // match the pattern below deliberately, so the test asserts the RULE rather than
  // which layer happened to enforce it.
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

test("a package-pin collision is refused before resolution can produce a network", () => {
  // THE PATH THAT ACTUALLY LOST A NET. `resolveNetwork` never calls
  // `validateNetwork`, so a hand-built `Network` literal - which is how most of
  // this file's fixtures and any non-builder caller construct one - used to
  // reach the emitter with the collision intact. Measured before
  // `validatePhysicalNetwork` enforced the rule, on exactly this network:
  // `resolveNetwork` + `toSpiceNetlist` SUCCEEDED and emitted
  //
  //     Xu1 IN OUT OUT LOST 0 GENERIC_OPAMP
  //
  // with the package's `VCC` nowhere on the line. The unit's `v+` took the
  // supply argument position and the package's net was silently dropped.
  //
  // `opamp` rather than a switch because a switch is caught either way; this is
  // the multi-pin, model-backed shape whose loss reaches a deck.
  const collision: Network = {
    ports: { ground: "GND", input: "IN", output: "OUT" },
    components: [
      {
        id: "u1", kind: "opamp", parameters: {}, part: { mpn: "X" },
        pins: { "v+": net("VCC"), "v-": net("GND") },
        units: [{
          name: "MAIN",
          pins: { "in+": net("IN"), "in-": net("OUT"), out: net("OUT"), "v+": net("LOST") },
          spiceModel: "GENERIC_OPAMP",
        }],
      },
      { id: "r1", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: net("OUT"), b: net("GND") } }] },
      { id: "r2", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: net("IN"), b: net("GND") } }] },
      { id: "r3", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: net("VCC"), b: net("GND") } }] },
      { id: "r4", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
        units: [{ name: "MAIN", pins: { a: net("LOST"), b: net("GND") } }] },
    ],
  }
  // Names the component, the unit and the pin, so a failure says which of the
  // four a reader has to go and look at.
  expect(() => resolveNetwork(collision, NO_CONTROLS))
    .toThrow(/component "u1" unit "MAIN": pin "v\+" collides with a package pin/)
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

test("a no-connect PACKAGE pin is omitted from resolved pins, not rendered as a net name", () => {
  // `reducePins` is shared between package pins and unit pins; the previous test only
  // exercised it on a unit pin. A package pin is a separate map on `ResolvedComponent`
  // (Finding 1: it is not merged with the unit's), so it needs its own coverage.
  const withNc: Network = {
    components: [{
      id: "amp", kind: "opamp", parameters: {},
      pins: { "v+": net("VCC"), "v-": { kind: "nc" } },
      units: [{ name: "A", pins: { "in+": net("IN"), "in-": net("FB"), out: net("OUT") } }],
    }],
    ports: { VCC: "VCC", IN: "IN", FB: "FB", OUT: "OUT", ground: "VCC" },
  }
  const amp = resolveNetwork(withNc, NO_CONTROLS).components.find((c) => c.id === "amp")
  expect(amp?.pins).toEqual({ "v+": "VCC" })
  expect(Object.keys(amp?.pins ?? {})).not.toContain("v-")
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
