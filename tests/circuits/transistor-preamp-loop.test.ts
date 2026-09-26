import { test, expect } from "bun:test"
import {
  transistorPreampLoop, DESIGNATORS, PIN_NUMBERS, LOOP_LEG, START, controlStateFor, schematicNotes,
} from "../../circuits/transistor-preamp/loop-board.ts"
import type { LoopSetting } from "../../circuits/transistor-preamp/loop-board.ts"
import * as buffered from "../../circuits/transistor-preamp/buffered-board.ts"
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

/** The board with C6 lifted: how the operator opens the loop on the bench. */
function openLoop(): Network {
  const closed = transistorPreampLoop()
  return { ...closed, components: closed.components.filter((c) => c.id !== "loop_feedback_cap") }
}

test("the loop board validates: 25 parts, the buffered board's plus four, designators unchanged", () => {
  const network = transistorPreampLoop()
  expect(() => validateNetwork(network)).not.toThrow()
  expect(network.components.map((c) => c.id).sort()).toEqual(Object.keys(DESIGNATORS).sort())
  const designators = Object.values(DESIGNATORS)
  expect(new Set(designators).size).toBe(designators.length)
  expect(network.components.length).toBe(25)
  for (const [id, designator] of Object.entries(buffered.DESIGNATORS)) {
    expect(DESIGNATORS[id]).toBe(designator)
  }
  expect([DESIGNATORS["input_resistor"], DESIGNATORS["loop_feedback_floor"],
    DESIGNATORS["loop_feedback_trim"], DESIGNATORS["loop_feedback_cap"]]).toEqual(["R8", "R9", "RV5", "C6"])
})

test("R8 sits between the input header and C2; the loop runs from Q2's emitter through C6, R9, RV5 to Q1's base", () => {
  const network = transistorPreampLoop()
  const header = netOf(byId(network, "input_header"), "1")
  expect(netOf(byId(network, "input_resistor"), "a")).toBe(header)
  expect(netOf(byId(network, "input_resistor"), "b")).toBe("IN_EXT")
  expect(netOf(byId(network, "loop_feedback_cap"), "a")).toBe("BUFFER_EMITTER")
  const capOut = netOf(byId(network, "loop_feedback_cap"), "b")
  expect(netOf(byId(network, "loop_feedback_floor"), "a")).toBe(capOut)
  const trim = byId(network, "loop_feedback_trim")
  expect(netOf(trim, "ccw")).toBe(netOf(byId(network, "loop_feedback_floor"), "b"))
  expect(netOf(trim, "wiper")).toBe("BASE")
  expect(netOf(trim, "cw")).toBe("BASE")
})

test("the board lowers to a VeroRoute netlist", () => {
  const lowered = toImportedNetlist(transistorPreampLoop(), DESIGNATORS, PIN_NUMBERS)
  const typeOf = (designator: string): string | undefined =>
    lowered.components.find((c) => c.designator === designator)?.footprint
  expect(typeOf("RV5")).toBe("TRIM_FLAT")
  expect(typeOf("C6")).toBe("CAP_ELECTRO_200")
})

test("the schematic notes give the loop's starting setting and how to open it", () => {
  const text = schematicNotes().join("\n")
  expect(text).toContain(`RV5 leg ${START.loop}`)
  expect(text).toMatch(/lift C6/i)
})

function environment(loadOhms: number, stopHz: number): SimulationEnvironment {
  return {
    source: { port: "input", amplitude: 1, seriesOhms: 0 },
    load: { port: "output", ohms: loadOhms },
    supplies: [{ port: "vcc", volts: 9 }],
    sweep: { pointsPerDecade: 20, startHz: 1, stopHz },
    groundPort: "ground",
  }
}

interface Point { readonly f: number; readonly g: number; readonly ph: number }

async function response(network: Network, setting: LoopSetting): Promise<readonly Point[]> {
  const sweep = await acSweepOf(network, controlStateFor(setting), environment(100_000, 10_000_000))
  return sweep.points.map((p) => ({
    f: p.frequency, g: Math.hypot(p.real, p.imaginary), ph: (Math.atan2(p.imaginary, p.real) * 180) / Math.PI,
  }))
}

function at1k(points: readonly Point[]): Point {
  const nearest = [...points].sort((a, b) => Math.abs(Math.log(a.f / 1000)) - Math.abs(Math.log(b.f / 1000)))[0]
  if (nearest === undefined) throw new Error("the sweep returned no points")
  return nearest
}

function upperCorner(points: readonly Point[]): number {
  const mid = at1k(points).g
  const corner = points.find((p) => p.f > 1000 && p.g < mid / Math.SQRT2)
  if (corner === undefined) throw new Error("no upper -3 dB point below 10 MHz")
  return corner.f
}

test("the loop leaves the DC operating point where the buffered board has it", async () => {
  const nodes = ["BASE", "EMITTER", "COLLECTOR", "BUFFER_EMITTER"].map(spiceNodeName)
  const read = async (network: Network, state: ReturnType<typeof controlStateFor>) => {
    const deck = toSpiceOperatingPointNetlist(resolveNetwork(network, state), environment(100_000, 10_000))
    return runOperatingPoint({ netlist: deck, nodes })
  }
  const loop = await read(transistorPreampLoop(), controlStateFor(START))
  const plain = await read(buffered.transistorPreampBuffered(), buffered.controlStateFor(buffered.START))
  for (const node of nodes) {
    const a = loop[node]
    const b = plain[node]
    if (a === undefined || b === undefined) throw new Error(`missing ${node}`)
    expect(Math.abs(a - b) / b).toBeLessThan(0.01)
  }
})

test("closing the loop lowers the gain, keeps it inverting, and widens the bandwidth", async () => {
  const closed = await response(transistorPreampLoop(), START)
  const open = await response(openLoop(), START)
  expect(Math.abs(at1k(closed).ph)).toBeGreaterThan(135)
  expect(at1k(closed).g).toBeLessThan(0.8 * at1k(open).g)
  expect(upperCorner(closed)).toBeGreaterThan(upperCorner(open))
})

test("turning the loop leg up raises the closed-loop gain", async () => {
  const gains: number[] = []
  for (const loop of ["33k", "68k", "150k"]) {
    gains.push(at1k(await response(transistorPreampLoop(), { ...START, loop })).g)
  }
  expect(gains[0] ?? 0).toBeLessThan(gains[1] ?? 0)
  expect(gains[1] ?? 0).toBeLessThan(gains[2] ?? 0)
})

test("no peaking from 1 Hz to 10 MHz at either end of the loop trim (a stability sanity bound)", async () => {
  for (const loop of ["22k", "222k"]) {
    const points = await response(transistorPreampLoop(), { ...START, loop })
    const mid = at1k(points).g
    for (const p of points) expect(p.g).toBeLessThan(1.1 * mid)
  }
})

const LOOP_BOARD: BoardUnderTest = {
  network: transistorPreampLoop(), designators: DESIGNATORS, pinNumbers: PIN_NUMBERS,
  notes: schematicNotes(),
}

test("KiCad reads the generated stub as the same circuit", () => {
  expectSameCircuit(kicadRoundTrip(LOOP_BOARD, "loop-board"), LOOP_BOARD)
}, 30_000)

test("LOOP_LEG spans about 22k to 222k", () => {
  expect(LOOP_LEG.floor?.value).toBe("22k")
  expect(LOOP_LEG.trim).toBe("200k")
})
