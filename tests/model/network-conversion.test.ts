import { test, expect } from "bun:test"
import { assertSameTopology } from "../../lib/model/topology.ts"
import { net } from "../../lib/model/types.ts"
import type { Component, Network } from "../../lib/model/types.ts"

const r = (id: string, a: string, b: string, ohms: number): Component => ({
  id, kind: "resistor", parameters: { ohms }, pins: {},
  units: [{ name: "MAIN", pins: { a: net(a), b: net(b) } }],
})

const divider: Network = {
  components: [r("top", "IN", "MID", 1000), r("bottom", "MID", "GND", 1000)],
  ports: { IN: "IN", GND: "GND" },
}

test("a network is the same topology as itself", () => {
  expect(() => assertSameTopology(divider, divider)).not.toThrow()
})

test("provenance is metadata and does not affect topology", () => {
  const withProv: Network = {
    ...divider,
    // Provenance is { source, location?, note?, unresolved? } — see
    // lib/model/parameters.ts. There is no `line` field.
    components: divider.components.map((c) => ({
      ...c, provenance: { source: "test", location: "fixture" },
    })),
  }
  expect(() => assertSameTopology(divider, withProv)).not.toThrow()
})

test("a different component value is a different topology", () => {
  const changed: Network = {
    components: [r("top", "IN", "MID", 2200), r("bottom", "MID", "GND", 1000)],
    ports: { IN: "IN", GND: "GND" },
  }
  expect(() => assertSameTopology(divider, changed)).toThrow()
})

test("a rewired pin is a different topology", () => {
  // r1's b pin moves from net B to net C. Every net keeps at least two pins on
  // both sides (A={r1.a,r2.a}, B={r1.b,r2.b,r3.a,r4.a}, C={r3.b,r4.b} vs.
  // A={r1.a,r2.a}, B={r2.b,r3.a,r4.a}, C={r1.b,r3.b,r4.b}), so both networks are
  // independently well-formed and the only difference is where r1.b sits - not
  // an incidental floating net that would throw for the wrong reason.
  const base: Network = {
    components: [
      r("r1", "A", "B", 1000),
      r("r2", "A", "B", 1000),
      r("r3", "B", "C", 1000),
      r("r4", "B", "C", 1000),
    ],
    ports: { A: "A", C: "C" },
  }
  const rewired: Network = {
    components: [
      r("r1", "A", "C", 1000),
      r("r2", "A", "B", 1000),
      r("r3", "B", "C", 1000),
      r("r4", "B", "C", 1000),
    ],
    ports: { A: "A", C: "C" },
  }
  expect(() => assertSameTopology(base, rewired)).toThrow(/r1 differs/)
})

test("a no-connect is not the same as a net named nc", () => {
  // r_a and r_b give net "nc" two real component pins in BOTH networks, so
  // "nc" is well-formed on its own merits either way - the difference the test
  // is named for is the only thing that can make assertSameTopology throw.
  const withNc: Network = {
    components: [
      { id: "u", kind: "ic", parameters: {}, pins: {},
        units: [{ name: "MAIN", pins: { "1": net("IN"), "2": { kind: "nc" } } }] },
      r("r_a", "nc", "GND", 1000),
      r("r_b", "nc", "GND", 1000),
      r("load", "IN", "GND", 1000),
    ],
    ports: { IN: "IN", GND: "GND" },
  }
  const withNetNamedNc: Network = {
    components: [
      { id: "u", kind: "ic", parameters: {}, pins: {},
        units: [{ name: "MAIN", pins: { "1": net("IN"), "2": net("nc") } }] },
      r("r_a", "nc", "GND", 1000),
      r("r_b", "nc", "GND", 1000),
      r("load", "IN", "GND", 1000),
    ],
    ports: { IN: "IN", GND: "GND" },
  }
  expect(() => assertSameTopology(withNc, withNetNamedNc)).toThrow(/u differs/)
})
