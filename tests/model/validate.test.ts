import { test, expect } from "bun:test"
import { validateNetwork } from "../../lib/model/validate.ts"
import { NC, net } from "../../lib/model/types.ts"
import type { Component, Network } from "../../lib/model/types.ts"

const resistor = (id: string, a: string, b: string): Component => ({
  id, kind: "resistor", parameters: { ohms: 1000 }, pins: {},
  units: [{ name: "MAIN", pins: { a: net(a), b: net(b) } }],
})

const opamp = (id: string, inp: string, inm: string, out: string, vp: string, vm: string): Component => ({
  id, kind: "opamp", parameters: {}, pins: { "v+": net(vp), "v-": net(vm) },
  units: [{ name: "MAIN", pins: { "in+": net(inp), "in-": net(inm), out: net(out) } }],
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
    }],
    ports: { OUT: "OUT" },
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

// Finding 1: Package-pin walk coverage tests
test("opamp with valid package pins is accepted", () => {
  const valid: Network = {
    components: [opamp("u1", "IN+", "IN-", "OUT", "VCC", "GND"), resistor("r1", "OUT", "GND")],
    ports: { "IN+": "IN+", "IN-": "IN-", OUT: "OUT", VCC: "VCC", GND: "GND" },
  }
  expect(() => validateNetwork(valid)).not.toThrow()
})

test("opamp missing required package pin is rejected", () => {
  const bad: Network = {
    components: [{
      id: "u1", kind: "opamp", parameters: {}, pins: { "v+": net("VCC") },
      units: [{ name: "MAIN", pins: { "in+": net("IN+"), "in-": net("IN-"), out: net("OUT") } }],
    }],
    ports: { "IN+": "IN+", "IN-": "IN-", OUT: "OUT", VCC: "VCC" },
  }
  expect(() => validateNetwork(bad)).toThrow(/missing package pin "v-"/i)
})

test("opamp with extra package pin is rejected", () => {
  const bad: Network = {
    components: [{
      id: "u1", kind: "opamp", parameters: {}, pins: { "v+": net("VCC"), "v-": net("GND"), vcc: net("VCC") },
      units: [{ name: "MAIN", pins: { "in+": net("IN+"), "in-": net("IN-"), out: net("OUT") } }],
    }],
    ports: { "IN+": "IN+", "IN-": "IN-", OUT: "OUT", VCC: "VCC", GND: "GND" },
  }
  expect(() => validateNetwork(bad)).toThrow(/package pin "vcc".*opamp/i)
})

test("opamp package pin on floating net is rejected", () => {
  const floating: Network = {
    components: [opamp("u1", "IN+", "IN-", "OUT", "VFLOAT", "GND"), resistor("r1", "OUT", "GND")],
    ports: { "IN+": "IN+", "IN-": "IN-", OUT: "OUT", GND: "GND" },
  }
  expect(() => validateNetwork(floating)).toThrow(/net "VFLOAT".*one component pin/i)
})

// Finding 3: Missing validation tests
test("component with empty id is rejected", () => {
  const bad: Network = {
    components: [{
      id: "", kind: "resistor", parameters: { ohms: 1 }, pins: {},
      units: [{ name: "MAIN", pins: { a: net("A"), b: net("B") } }],
    }],
    ports: { A: "A", B: "B" },
  }
  expect(() => validateNetwork(bad)).toThrow(/component id must not be empty/i)
})

test("component with empty units array is rejected", () => {
  const bad: Network = {
    components: [{
      id: "r1", kind: "resistor", parameters: { ohms: 1 }, pins: {},
      units: [],
    }],
    ports: {},
  }
  expect(() => validateNetwork(bad)).toThrow(/declares no units/i)
})

test("component with duplicate unit names is rejected", () => {
  const bad: Network = {
    components: [{
      id: "u1", kind: "ic", parameters: {}, pins: {},
      units: [
        { name: "A", pins: { "1": net("X") } },
        { name: "A", pins: { "2": net("Y") } },
      ],
    }],
    ports: { X: "X", Y: "Y" },
  }
  expect(() => validateNetwork(bad)).toThrow(/duplicate unit "A"/i)
})

// `Component.kind` and `Component.parameters` are independent fields, so
// {kind: "resistor", parameters: {}} typechecks clean - nothing statically ties
// a kind to its required parameter fields. One test per kind proves
// checkParameters catches the mismatch at construction instead of letting it
// crash downstream (the SPICE emitter, in practice) with no name attached.
test("a resistor without ohms is rejected", () => {
  const bad: Network = {
    components: [{
      id: "r1", kind: "resistor", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { a: net("A"), b: net("B") } }],
    }],
    ports: { A: "A", B: "B" },
  }
  expect(() => validateNetwork(bad)).toThrow(/missing parameter "ohms".*resistor/i)
})

test("a capacitor without farads is rejected", () => {
  const bad: Network = {
    components: [{
      id: "c1", kind: "capacitor", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { a: net("A"), b: net("B") } }],
    }],
    ports: { A: "A", B: "B" },
  }
  expect(() => validateNetwork(bad)).toThrow(/missing parameter "farads".*capacitor/i)
})

test("an inductor without henries is rejected", () => {
  const bad: Network = {
    components: [{
      id: "l1", kind: "inductor", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { a: net("A"), b: net("B") } }],
    }],
    ports: { A: "A", B: "B" },
  }
  expect(() => validateNetwork(bad)).toThrow(/missing parameter "henries".*inductor/i)
})

test("a potentiometer without ohms is rejected", () => {
  const bad: Network = {
    components: [{
      id: "p1", kind: "potentiometer", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { ccw: net("A"), wiper: net("B"), cw: net("C") } }],
    }],
    ports: { A: "A", B: "B", C: "C" },
  }
  expect(() => validateNetwork(bad)).toThrow(/missing parameter "ohms".*potentiometer/i)
})

test("a potentiometer without a taper is rejected", () => {
  // {ohms: 1000} alone happens to satisfy ResistorParameters, a legal member of
  // the Parameters union regardless of this component's kind - exactly the gap
  // this check exists to close - so it typechecks as a `potentiometer` missing
  // only `taper`, exercising checkParameters' second required field.
  const bad: Network = {
    components: [{
      id: "p1", kind: "potentiometer", parameters: { ohms: 1000 }, pins: {},
      units: [{ name: "MAIN", pins: { ccw: net("A"), wiper: net("B"), cw: net("C") } }],
    }],
    ports: { A: "A", B: "B", C: "C" },
  }
  expect(() => validateNetwork(bad)).toThrow(/missing parameter "taper".*potentiometer/i)
})

test("a switch without positions is rejected", () => {
  const bad: Network = {
    components: [{
      id: "s1", kind: "switch", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { common: net("A"), thru: net("B") } }],
    }],
    ports: { A: "A", B: "B" },
  }
  expect(() => validateNetwork(bad)).toThrow(/missing parameter "positions".*switch/i)
})
