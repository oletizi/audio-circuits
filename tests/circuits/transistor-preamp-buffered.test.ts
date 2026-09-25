import { test, expect } from "bun:test"
import {
  transistorPreampBuffered, DESIGNATORS, PIN_NUMBERS, schematicNotes,
} from "../../circuits/transistor-preamp/buffered-board.ts"
import {
  transistorPreampFeedback, START, controlStateFor,
} from "../../circuits/transistor-preamp/feedback-board.ts"
import * as feedbackBoard from "../../circuits/transistor-preamp/feedback-board.ts"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { validateNetwork } from "../../lib/model/validate.ts"
import type { Component, Network } from "../../lib/model/types.ts"
import { resolveNetwork } from "../../lib/model/control-state.ts"
import { spiceNodeName, toSpiceOperatingPointNetlist } from "../../lib/sim/netlist.ts"
import type { SimulationEnvironment } from "../../lib/sim/netlist.ts"
import { runOperatingPoint } from "../../lib/sim/operating-point.ts"
import { acSweepOf } from "../sim/helpers.ts"
import { expectSameCircuit, kicadRoundTrip } from "./kicad-round-trip.ts"
import type { BoardUnderTest } from "./kicad-round-trip.ts"

function byId(network: Network, id: string): Component {
  const found = network.components.find((c) => c.id === id)
  if (found === undefined) throw new Error(`no "${id}"`)
  return found
}

function netOf(component: Component, pin: string): string {
  const connection = component.units[0]?.pins[pin]
  if (connection === undefined || connection.kind !== "net") {
    throw new Error(`"${component.id}" pin "${pin}" is not on a net`)
  }
  return connection.net
}

test("the buffered board validates: 21 parts, each with one designator", () => {
  const network = transistorPreampBuffered()
  expect(() => validateNetwork(network)).not.toThrow()
  expect(network.components.map((c) => c.id).sort()).toEqual(Object.keys(DESIGNATORS).sort())
  const designators = Object.values(DESIGNATORS)
  expect(new Set(designators).size).toBe(designators.length)
  // The feedback board's 16, plus the follower: Q2, R5, R6, R7 and C5.
  expect(network.components.length).toBe(21)
})

test("stage 1 is the feedback board's, part for part and designator for designator", () => {
  const buffered = transistorPreampBuffered()
  for (const [id, designator] of Object.entries(feedbackBoard.DESIGNATORS)) {
    expect(DESIGNATORS[id]).toBe(designator)
    const component = byId(buffered, id)
    expect(component.part).toEqual(byId(transistorPreampFeedback(), id).part)
  }
})

test("the collector couples into the follower's base, and the follower's emitter drives OUT", () => {
  const network = transistorPreampBuffered()
  expect(netOf(byId(network, "output_coupling_cap"), "a")).toBe("COLLECTOR")
  expect(netOf(byId(network, "output_coupling_cap"), "b")).toBe("BUFFER_BASE")
  const follower = byId(network, "buffer_transistor")
  expect(netOf(follower, "base")).toBe("BUFFER_BASE")
  expect(netOf(follower, "collector")).toBe("VCC")
  expect(netOf(follower, "emitter")).toBe("BUFFER_EMITTER")
  expect(netOf(byId(network, "buffer_output_cap"), "a")).toBe("BUFFER_EMITTER")
  expect(netOf(byId(network, "buffer_output_cap"), "b")).toBe("OUT")
})

test("the board lowers to a VeroRoute netlist", () => {
  const lowered = toImportedNetlist(transistorPreampBuffered(), DESIGNATORS, PIN_NUMBERS)
  const typeOf = (designator: string): string | undefined =>
    lowered.components.find((c) => c.designator === designator)?.footprint
  expect(typeOf("Q2")).toBe("TO92")
  expect(typeOf("C5")).toBe("CAP_ELECTRO_200")
})

test("the schematic notes carry stage 1's settings and say what the follower is for", () => {
  const text = schematicNotes().join("\n")
  expect(text).toContain("RV1 leg 470k (trim 0)")
  expect(text).toMatch(/follower/i)
})

function environment(loadOhms: number): SimulationEnvironment {
  return {
    source: { port: "input", amplitude: 1, seriesOhms: 0 },
    load: { port: "output", ohms: loadOhms },
    supplies: [{ port: "vcc", volts: 9 }],
    sweep: { pointsPerDecade: 10, startHz: 100, stopHz: 10_000 },
    groundPort: "ground",
  }
}

async function gainAt1k(network: Network, loadOhms: number): Promise<{ gain: number; phase: number }> {
  const sweep = await acSweepOf(network, controlStateFor(START), environment(loadOhms))
  const nearest = [...sweep.points].sort(
    (a, b) => Math.abs(a.frequency - 1000) - Math.abs(b.frequency - 1000))[0]
  if (nearest === undefined) throw new Error("the sweep returned no points")
  return {
    gain: Math.hypot(nearest.real, nearest.imaginary),
    phase: (Math.atan2(nearest.imaginary, nearest.real) * 180) / Math.PI,
  }
}

test("at the starting settings both transistors are biased into their active regions", async () => {
  const deck = toSpiceOperatingPointNetlist(
    resolveNetwork(transistorPreampBuffered(), controlStateFor(START)), environment(100_000))
  const nodes = ["EMITTER", "COLLECTOR", "BUFFER_EMITTER", "VCC"].map(spiceNodeName)
  const v = await runOperatingPoint({ netlist: deck, nodes })
  const [ve1, vc1, ve2, vcc] = nodes.map((n) => v[n])
  if (ve1 === undefined || vc1 === undefined || ve2 === undefined || vcc === undefined) {
    throw new Error("operating point is missing a node")
  }
  expect(ve1 / 1500).toBeGreaterThan(1e-4)
  expect(vc1 - ve1).toBeGreaterThan(1)
  // The follower's collector is VCC itself: its VCE is VCC - VE2.
  expect(ve2 / 1500).toBeGreaterThan(1e-4)
  expect(vcc - ve2).toBeGreaterThan(1)
})

test("the buffered stage still inverts with gain greater than one at 1 kHz", async () => {
  const { gain, phase } = await gainAt1k(transistorPreampBuffered(), 100_000)
  expect(gain).toBeGreaterThan(1)
  expect(Math.abs(phase)).toBeGreaterThan(135)
})

test("into a 2k load the buffered output holds its level; the unbuffered stage's does not", async () => {
  const buffered = (await gainAt1k(transistorPreampBuffered(), 2_000)).gain /
    (await gainAt1k(transistorPreampBuffered(), 100_000)).gain
  const unbuffered = (await gainAt1k(transistorPreampFeedback(), 2_000)).gain /
    (await gainAt1k(transistorPreampFeedback(), 100_000)).gain
  expect(buffered).toBeGreaterThan(0.9)
  expect(unbuffered).toBeLessThan(0.7)
})

const BUFFERED_BOARD: BoardUnderTest = {
  network: transistorPreampBuffered(), designators: DESIGNATORS, pinNumbers: PIN_NUMBERS,
  notes: schematicNotes(),
}

test("KiCad reads the generated stub as the same circuit", () => {
  expectSameCircuit(kicadRoundTrip(BUFFERED_BOARD, "buffered-board"), BUFFERED_BOARD)
}, 30_000)
