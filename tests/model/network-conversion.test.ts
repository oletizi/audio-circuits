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
  const rewired: Network = {
    components: [r("top", "IN", "ELSEWHERE", 1000), r("bottom", "MID", "GND", 1000)],
    ports: { IN: "IN", GND: "GND" },
  }
  expect(() => assertSameTopology(divider, rewired)).toThrow()
})

test("a no-connect is not the same as a net named nc", () => {
  const withNc: Network = {
    components: [{
      id: "u", kind: "ic", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { "1": net("IN"), "2": { kind: "nc" } } }],
    }, r("load", "IN", "GND", 1000)],
    ports: { IN: "IN", GND: "GND" },
  }
  const withNetNamedNc: Network = {
    components: [{
      id: "u", kind: "ic", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { "1": net("IN"), "2": net("nc") } }],
    }, r("load", "IN", "GND", 1000)],
    ports: { IN: "IN", GND: "GND" },
  }
  expect(() => assertSameTopology(withNc, withNetNamedNc)).toThrow()
})
