import { test, expect } from "bun:test"
import {
  transistorPreampLab, DESIGNATORS, PIN_NUMBERS, LEGS,
} from "../../circuits/transistor-preamp/index.ts"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import { validateNetwork } from "../../lib/model/validate.ts"
import type { Component } from "../../lib/model/types.ts"

function byId(id: string): Component {
  const found = transistorPreampLab().components.find((c) => c.id === id)
  if (found === undefined) throw new Error(`the lab board declares no "${id}"`)
  return found
}

function netOf(component: Component, pin: string): string {
  const connection = component.units[0]?.pins[pin]
  if (connection === undefined || connection.kind !== "net") {
    throw new Error(`"${component.id}" pin "${pin}" is not on a net`)
  }
  return connection.net
}

test("the lab board validates, and every part has exactly one designator", () => {
  const network = transistorPreampLab()
  expect(() => validateNetwork(network)).not.toThrow()
  expect(network.components.map((c) => c.id).sort()).toEqual(Object.keys(DESIGNATORS).sort())
  const designators = Object.values(DESIGNATORS)
  expect(new Set(designators).size).toBe(designators.length)
  expect(network.components.length).toBe(32)
})

test("every part names a symbol and a footprint", () => {
  for (const component of transistorPreampLab().components) {
    expect(component.part?.symbol).toBeDefined()
    expect(component.part?.footprint).toBeDefined()
  }
})

test("every trim-pot is a rheostat: its wiper is strapped to its cw end", () => {
  for (const leg of Object.values(LEGS)) {
    const trim = byId(leg.trimId)
    expect(netOf(trim, "wiper")).toBe(netOf(trim, "cw"))
    expect(netOf(trim, "ccw")).not.toBe(netOf(trim, "cw"))
  }
})

test("each electrolytic's + terminal (pin a) faces the higher DC node", () => {
  expect(netOf(byId("input_coupling_cap"), "a")).toBe("BASE")
  expect(netOf(byId("output_coupling_cap"), "a")).toBe("COLLECTOR")
  expect(netOf(byId("emitter_bypass_cap"), "a")).toBe("BYPASS_JUMPED")
  expect(netOf(byId("supply_decoupling_cap"), "a")).toBe("VCC")
})

test("the board lowers to a VeroRoute netlist with the new fixed-shape types", () => {
  const lowered = toImportedNetlist(transistorPreampLab(), DESIGNATORS, PIN_NUMBERS)
  const typeOf = (designator: string): string | undefined =>
    lowered.components.find((c) => c.designator === designator)?.footprint
  expect(typeOf("Q1")).toBe("TO92")
  expect(typeOf("RV2")).toBe("TRIM_3006P")
  expect(typeOf("TP1")).toBe("SIP1")
  expect(typeOf("JP1")).toBe("SIP2")
})
