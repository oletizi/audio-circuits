import { test, expect } from "bun:test"
import { validateNetwork } from "../../lib/model/validate.ts"
import { NC, net } from "../../lib/model/types.ts"
import type { Component, Network } from "../../lib/model/types.ts"

const resistor = (id: string, a: string, b: string): Component => ({
  id, kind: "resistor", parameters: { ohms: 1000 }, pins: {},
  units: [{ name: "MAIN", pins: { a: net(a), b: net(b) } }],
})

const twoResistors: Network = {
  components: [resistor("r1", "IN", "MID"), resistor("r2", "MID", "OUT")],
  ports: { IN: "IN", OUT: "OUT" },
}

test("a well-formed network validates", () => {
  expect(() => validateNetwork(twoResistors)).not.toThrow()
})

test("duplicate component ids are rejected", () => {
  const dup: Network = {
    components: [resistor("r1", "IN", "MID"), resistor("r1", "MID", "OUT")],
    ports: { IN: "IN", OUT: "OUT" },
  }
  expect(() => validateNetwork(dup)).toThrow(/duplicate component id "r1"/i)
})

test("a pin outside the kind's vocabulary is rejected", () => {
  const bad: Network = {
    components: [{
      id: "r1", kind: "resistor", parameters: { ohms: 1 }, pins: {},
      units: [{ name: "MAIN", pins: { a: net("IN"), wiper: net("OUT") } }],
    }],
    ports: { IN: "IN", OUT: "OUT" },
  }
  expect(() => validateNetwork(bad)).toThrow(/pin "wiper".*resistor/i)
})

test("a missing pin from the kind's vocabulary is rejected", () => {
  const bad: Network = {
    components: [{
      id: "r1", kind: "resistor", parameters: { ohms: 1 }, pins: {},
      units: [{ name: "MAIN", pins: { a: net("IN") } }],
    }],
    ports: { IN: "IN" },
  }
  expect(() => validateNetwork(bad)).toThrow(/missing pin "b"/i)
})

test("a net with only one component pin and no port is floating", () => {
  const floating: Network = {
    components: [resistor("r1", "IN", "DANGLE")],
    ports: { IN: "IN" },
  }
  expect(() => validateNetwork(floating)).toThrow(/net "DANGLE".*one component pin/i)
})

test("one component pin plus a declared port is valid", () => {
  const connectorLike: Network = {
    components: [{
      id: "j1", kind: "connector", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { "1": net("OUT") } }],
    }, resistor("r1", "IN", "OUT")],
    ports: { IN: "IN", OUT: "OUT" },
  }
  expect(() => validateNetwork(connectorLike)).not.toThrow()
})

test("an explicit no-connect is exempt from the floating rule", () => {
  const withNc: Network = {
    components: [{
      id: "u1", kind: "ic", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { "1": net("IN"), "2": net("OUT"), "3": NC } }],
    }, resistor("r1", "IN", "OUT")],
    ports: { IN: "IN", OUT: "OUT" },
  }
  expect(() => validateNetwork(withNc)).not.toThrow()
})

test("a net named nc is an ordinary net, not a no-connect", () => {
  const trap: Network = {
    components: [{
      id: "u1", kind: "ic", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { "1": net("nc") } }],
    }],
    ports: {},
  }
  expect(() => validateNetwork(trap)).toThrow(/net "nc".*one component pin/i)
})

test("a port naming a net no pin sits on is rejected", () => {
  const bad: Network = {
    components: [resistor("r1", "IN", "OUT")],
    ports: { IN: "IN", OUT: "OUT", SPARE: "NOWHERE" },
  }
  expect(() => validateNetwork(bad)).toThrow(/port "SPARE".*"NOWHERE"/i)
})

test("an open-vocabulary kind still rejects an empty pin map", () => {
  const bad: Network = {
    components: [{
      id: "u1", kind: "ic", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: {} }],
    }],
    ports: {},
  }
  expect(() => validateNetwork(bad)).toThrow(/declares no pins/i)
})
