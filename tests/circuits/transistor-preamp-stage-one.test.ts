import { expect, test } from "bun:test"
import { circuit } from "../../lib/model/index.ts"
import type { Component, Network } from "../../lib/model/index.ts"
import { addFeedbackStage, TRIMMED_STAGE_ONE } from "../../circuits/transistor-preamp/feedback-board.ts"

function stageOne(legs: Parameters<typeof addFeedbackStage>[2]): Network {
  const builder = circuit()
  builder.port("input", "IN_EXT").port("out", "OUT")
  addFeedbackStage(builder, "OUT", legs)
  return builder.done()
}

function byId(network: Network, id: string): Component {
  const found = network.components.find((component) => component.id === id)
  if (found === undefined) throw new Error(`no component "${id}"`)
  return found
}

function nets(component: Component): readonly string[] {
  return component.units.flatMap((unit) =>
    Object.values(unit.pins).map((connection) => (connection.kind === "net" ? connection.net : "nc")))
}

test("the fixed variant has one resistor per leg and no trims", () => {
  const network = stageOne({ kind: "fixed", feedback: "820k", baseToGround: "270k", collector: "2.7k" })
  const ids = network.components.map((component) => component.id)
  expect(ids.filter((id) => id.endsWith("_trim") || id.endsWith("_floor"))).toEqual([])
  expect(nets(byId(network, "feedback_resistor"))).toEqual(["COLLECTOR", "BASE"])
  expect(nets(byId(network, "base_ground_resistor"))).toEqual(["BASE", "GND"])
  expect(nets(byId(network, "collector_resistor"))).toEqual(["VCC", "COLLECTOR"])
  expect(nets(byId(network, "emitter_bypass_cap"))).toEqual(["EMITTER", "GND"])
  expect(byId(network, "feedback_resistor").parameters).toEqual({ ohms: 820_000 })
  expect(byId(network, "base_ground_resistor").parameters).toEqual({ ohms: 270_000 })
  expect(byId(network, "collector_resistor").parameters).toEqual({ ohms: 2_700 })
})

test("the trimmed variant is today's stage 1, part for part", () => {
  const ids = stageOne(TRIMMED_STAGE_ONE).components.map((component) => component.id).sort()
  expect(ids).toEqual([
    "base_ground_floor", "base_ground_trim", "collector_floor", "collector_trim",
    "emitter_bypass_cap", "emitter_bypass_trim", "emitter_dc_resistor", "feedback_floor",
    "feedback_trim", "gain_transistor", "input_coupling_cap", "output_coupling_cap",
    "power_header", "supply_decoupling_cap",
  ])
})
