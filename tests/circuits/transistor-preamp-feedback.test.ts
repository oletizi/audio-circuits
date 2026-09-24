import { test, expect } from "bun:test"
import {
  transistorPreampFeedback, DESIGNATORS, PIN_NUMBERS, FEEDBACK_LEGS, START, controlStateFor,
  schematicNotes,
} from "../../circuits/transistor-preamp/feedback-board.ts"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { validateNetwork } from "../../lib/model/validate.ts"
import type { Component } from "../../lib/model/types.ts"
import { resolveNetwork } from "../../lib/model/control-state.ts"
import { spiceNodeName, toSpiceOperatingPointNetlist } from "../../lib/sim/netlist.ts"
import type { SimulationEnvironment } from "../../lib/sim/netlist.ts"
import { runOperatingPoint } from "../../lib/sim/operating-point.ts"
import { acSweepOf } from "../sim/helpers.ts"
import { expectSameCircuit, kicadRoundTrip } from "./kicad-round-trip.ts"
import type { BoardUnderTest } from "./kicad-round-trip.ts"

function byId(id: string): Component {
  const found = transistorPreampFeedback().components.find((c) => c.id === id)
  if (found === undefined) throw new Error(`the feedback board declares no "${id}"`)
  return found
}

function netOf(component: Component, pin: string): string {
  const connection = component.units[0]?.pins[pin]
  if (connection === undefined || connection.kind !== "net") {
    throw new Error(`"${component.id}" pin "${pin}" is not on a net`)
  }
  return connection.net
}

test("the feedback board validates: 16 parts, each with one designator, and no jumpers", () => {
  const network = transistorPreampFeedback()
  expect(() => validateNetwork(network)).not.toThrow()
  expect(network.components.map((c) => c.id).sort()).toEqual(Object.keys(DESIGNATORS).sort())
  const designators = Object.values(DESIGNATORS)
  expect(new Set(designators).size).toBe(designators.length)
  // 3 legs of floor + trim (6), emitter resistor, bypass cap + trim (2),
  // 3 other caps, the transistor, 3 headers.
  expect(network.components.length).toBe(16)
  expect(network.components.filter((c) => c.kind === "switch")).toEqual([])
  expect(network.components.filter((c) => c.kind === "potentiometer").length).toBe(4)
})

test("the bias comes from the collector: feedback leg collector-to-base, no leg from VCC to base", () => {
  expect(netOf(byId("feedback_floor"), "a")).toBe("COLLECTOR")
  expect(netOf(byId("feedback_trim"), "wiper")).toBe("BASE")
  const vccToBase = transistorPreampFeedback().components.filter((c) => {
    const nets = Object.values(c.units[0]?.pins ?? {}).flatMap((p) => p.kind === "net" ? [p.net] : [])
    return nets.includes("VCC") && nets.includes("BASE")
  })
  expect(vccToBase).toEqual([])
})

test("every trim-pot is a rheostat: its wiper is strapped to its cw end", () => {
  for (const leg of Object.values(FEEDBACK_LEGS)) {
    const trim = byId(leg.trimId)
    expect(netOf(trim, "wiper")).toBe(netOf(trim, "cw"))
    expect(netOf(trim, "ccw")).not.toBe(netOf(trim, "cw"))
  }
})

test("each electrolytic's + terminal (pin a) faces the higher DC node", () => {
  expect(netOf(byId("input_coupling_cap"), "a")).toBe("BASE")
  expect(netOf(byId("output_coupling_cap"), "a")).toBe("COLLECTOR")
  expect(netOf(byId("emitter_bypass_cap"), "a")).toBe("EMITTER")
  expect(netOf(byId("supply_decoupling_cap"), "a")).toBe("VCC")
})

test("the board lowers to a VeroRoute netlist", () => {
  const lowered = toImportedNetlist(transistorPreampFeedback(), DESIGNATORS, PIN_NUMBERS)
  const typeOf = (designator: string): string | undefined =>
    lowered.components.find((c) => c.designator === designator)?.footprint
  expect(typeOf("Q1")).toBe("TO92")
  expect(typeOf("RV1")).toBe("TRIM_FLAT")
  expect(typeOf("J1")).toBe("SIP2")
})

test("the starting settings are the brief's first 2B trial, and show the pot-only values", () => {
  expect(() => resolveNetwork(transistorPreampFeedback(), controlStateFor(START))).not.toThrow()
  const text = schematicNotes().join("\n")
  expect(text).toContain("RV1 leg 470k (trim 0)")
  expect(text).toContain("RV2 leg 150k (trim 103k)")
})

/** Sanity bounds, not predictions: 1 V AC ideal source, the brief's 100k load and 9 V. */
const ENVIRONMENT: SimulationEnvironment = {
  source: { port: "input", amplitude: 1, seriesOhms: 0 },
  load: { port: "output", ohms: 100_000 },
  supplies: [{ port: "vcc", volts: 9 }],
  sweep: { pointsPerDecade: 10, startHz: 100, stopHz: 10_000 },
  groundPort: "ground",
}

test("at the starting settings the transistor is biased into its active region", async () => {
  const deck = toSpiceOperatingPointNetlist(
    resolveNetwork(transistorPreampFeedback(), controlStateFor(START)), ENVIRONMENT)
  const [emitter, collector] = [spiceNodeName("EMITTER"), spiceNodeName("COLLECTOR")]
  const v = await runOperatingPoint({ netlist: deck, nodes: [emitter, collector] })
  const ve = v[emitter]
  const vc = v[collector]
  if (ve === undefined || vc === undefined) throw new Error("operating point is missing a node")
  expect(ve / 1500).toBeGreaterThan(1e-4)
  expect(vc - ve).toBeGreaterThan(1)
})

test("at the starting settings the stage inverts with gain greater than one at 1 kHz", async () => {
  const sweep = await acSweepOf(transistorPreampFeedback(), controlStateFor(START), ENVIRONMENT)
  const nearest = [...sweep.points].sort(
    (a, b) => Math.abs(a.frequency - 1000) - Math.abs(b.frequency - 1000))[0]
  if (nearest === undefined) throw new Error("the sweep returned no points")
  const gain = Math.hypot(nearest.real, nearest.imaginary)
  const phase = (Math.atan2(nearest.imaginary, nearest.real) * 180) / Math.PI
  expect(gain).toBeGreaterThan(1)
  expect(Math.abs(phase)).toBeGreaterThan(135)
})

const FEEDBACK_BOARD: BoardUnderTest = {
  network: transistorPreampFeedback(), designators: DESIGNATORS, pinNumbers: PIN_NUMBERS,
  notes: schematicNotes(),
}

test("KiCad reads the generated stub as the same circuit", () => {
  expectSameCircuit(kicadRoundTrip(FEEDBACK_BOARD, "feedback-board"), FEEDBACK_BOARD)
}, 30_000)

test("the schematic's netlist export describes the same circuit as the model", async () => {
  expectSameCircuit(
    importNetlist(await Bun.file("tests/fixtures/transistor-preamp-feedback.net").text()),
    FEEDBACK_BOARD)
})
