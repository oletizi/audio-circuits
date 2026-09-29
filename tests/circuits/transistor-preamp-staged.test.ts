import { test, expect } from "bun:test"
import {
  transistorPreampStaged, DESIGNATORS, PIN_NUMBERS, START, controlStateFor, schematicNotes,
} from "../../circuits/transistor-preamp/staged-board.ts"
import type { StagedSetting } from "../../circuits/transistor-preamp/staged-board.ts"
import * as buffered from "../../circuits/transistor-preamp/buffered-board.ts"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import { validateNetwork } from "../../lib/model/validate.ts"
import type { Component, Network } from "../../lib/model/types.ts"
import { resolveNetwork } from "../../lib/model/control-state.ts"
import { spiceNodeName, toSpiceNetlist, toSpiceOperatingPointNetlist } from "../../lib/sim/netlist.ts"
import type { SimulationEnvironment } from "../../lib/sim/netlist.ts"
import { runAcSweep } from "../../lib/sim/ac.ts"
import { runOperatingPoint } from "../../lib/sim/operating-point.ts"
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

function twoPin(network: Network, id: string): readonly [string, string] {
  const component = byId(network, id)
  return [netOf(component, "a"), netOf(component, "b")]
}

test("the staged board validates: 34 parts, the buffered board's ids and designators unchanged", () => {
  const network = transistorPreampStaged()
  expect(() => validateNetwork(network)).not.toThrow()
  expect(network.components.map((c) => c.id).sort()).toEqual(Object.keys(DESIGNATORS).sort())
  const designators = Object.values(DESIGNATORS)
  expect(new Set(designators).size).toBe(designators.length)
  expect(network.components.length).toBe(34)
  for (const [id, designator] of Object.entries(buffered.DESIGNATORS)) {
    expect(DESIGNATORS[id]).toBe(designator)
  }
})

test("DRIVE and TRANSFORMER DRIVE are each wired cap - pot - cap, with + terminals on the biased side", () => {
  const n = transistorPreampStaged()
  expect(twoPin(n, "output_coupling_cap")).toEqual(["COLLECTOR", "DRIVE_TOP"])
  const drive = byId(n, "drive_pot")
  expect([netOf(drive, "ccw"), netOf(drive, "wiper"), netOf(drive, "cw")]).toEqual(["GND", "DRIVE_WIPER", "DRIVE_TOP"])
  expect(twoPin(n, "drive_coupling_cap")).toEqual(["Q3_BASE", "DRIVE_WIPER"])
  expect(twoPin(n, "q3_output_cap")).toEqual(["Q3_COLLECTOR", "TRANSFORMER_DRIVE_TOP"])
  const level = byId(n, "transformer_drive_pot")
  expect([netOf(level, "ccw"), netOf(level, "wiper"), netOf(level, "cw")])
    .toEqual(["GND", "TRANSFORMER_DRIVE_WIPER", "TRANSFORMER_DRIVE_TOP"])
  expect(twoPin(n, "buffer_input_cap")).toEqual(["BUFFER_BASE", "TRANSFORMER_DRIVE_WIPER"])
})

test("CHARACTER is a rheostat in a bypass branch beside R11, which alone carries Q3's emitter DC", () => {
  const n = transistorPreampStaged()
  expect(twoPin(n, "character_bypass_cap")).toEqual(["Q3_EMITTER", "CHARACTER_CAP"])
  expect(twoPin(n, "character_floor")).toEqual(["CHARACTER_CAP", "CHARACTER_FLOOR"])
  const character = byId(n, "character_pot")
  expect([netOf(character, "ccw"), netOf(character, "wiper"), netOf(character, "cw")])
    .toEqual(["CHARACTER_FLOOR", "GND", "GND"])
  const emitterToGround = n.components.filter((c) => c.kind === "resistor" &&
    [netOf(c, "a"), netOf(c, "b")].sort().join() === ["GND", "Q3_EMITTER"].sort().join())
  expect(emitterToGround.map((c) => c.id)).toEqual(["q3_emitter_resistor"])
})

test("the board lowers to a VeroRoute netlist: panel pots on 3-pin headers", () => {
  const lowered = toImportedNetlist(transistorPreampStaged(), DESIGNATORS, PIN_NUMBERS)
  const typeOf = (designator: string): string | undefined =>
    lowered.components.find((c) => c.designator === designator)?.footprint
  expect(typeOf("Q3")).toBe("TO92")
  for (const pot of ["RV5", "RV6", "RV7"]) expect(typeOf(pot)).toBe("SIP3")
  expect(typeOf("C7")).toBe("CAP_ELECTRO_400")
})

test("the schematic notes name the three panel controls", () => {
  const text = schematicNotes().join("\n")
  for (const control of ["DRIVE (RV5)", "CHARACTER (RV6)", "TRANSFORMER DRIVE (RV7)"]) expect(text).toContain(control)
})

const ENVIRONMENT: SimulationEnvironment = {
  source: { port: "input", amplitude: 1, seriesOhms: 0 },
  load: { port: "output", ohms: 10_000 },
  supplies: [{ port: "vcc", volts: 24 }],
  sweep: { pointsPerDecade: 20, startHz: 5, stopHz: 100_000 },
  groundPort: "ground",
}

test("at 24 V all three transistors are active and Q3's collector is centred", async () => {
  const deck = toSpiceOperatingPointNetlist(resolveNetwork(transistorPreampStaged(), controlStateFor(START)), ENVIRONMENT)
  const names = ["EMITTER", "COLLECTOR", "Q3_EMITTER", "Q3_COLLECTOR", "BUFFER_EMITTER"]
  const nodes = names.map(spiceNodeName)
  const v = await runOperatingPoint({ netlist: deck, nodes })
  const [ve1, vc1, ve3, vc3, ve2] = nodes.map((n) => v[n])
  if (ve1 === undefined || vc1 === undefined || ve3 === undefined || vc3 === undefined || ve2 === undefined) {
    throw new Error("operating point is missing a node")
  }
  expect(ve1 / 1500).toBeGreaterThan(1e-4)
  expect(vc1 - ve1).toBeGreaterThan(1)
  expect(ve3 / 1200).toBeGreaterThan(1e-4)
  expect(vc3 - ve3).toBeGreaterThan(1)
  expect(ve2 / 1500).toBeGreaterThan(1e-4)
  expect(24 - ve2).toBeGreaterThan(1)
  const centred = (vc3 - ve3) / (24 - ve3)
  expect(centred).toBeGreaterThan(0.4)
  expect(centred).toBeLessThan(0.6)
})

interface Reading { readonly gain: number; readonly phase: number }

async function readAt(setting: StagedSetting, names: readonly string[], hz: number): Promise<Record<string, Reading>> {
  const deck = toSpiceNetlist(resolveNetwork(transistorPreampStaged(), controlStateFor(setting)), ENVIRONMENT)
  const sweeps = await runAcSweep({ netlist: deck, nodes: names.map(spiceNodeName) })
  const out: Record<string, Reading> = {}
  for (const name of names) {
    const sweep = sweeps.find((s) => s.node.toLowerCase() === spiceNodeName(name).toLowerCase())
    const p = [...(sweep?.points ?? [])].sort(
      (a, b) => Math.abs(Math.log(a.frequency / hz)) - Math.abs(Math.log(b.frequency / hz)))[0]
    if (p === undefined) throw new Error(`no sweep at ${name}`)
    out[name] = { gain: Math.hypot(p.real, p.imaginary), phase: (Math.atan2(p.imaginary, p.real) * 180) / Math.PI }
  }
  return out
}

function gainOf(readings: Record<string, Reading>, name: string): number {
  const r = readings[name]
  if (r === undefined) throw new Error(`no reading at ${name}`)
  return r.gain
}

test("CHARACTER sets Q3's gain: falling as its resistance rises, over at least 10:1", async () => {
  const q3Gains: number[] = []
  for (const character of ["22", "272", "1022"]) {
    const r = await readAt({ ...START, character }, ["Q3_BASE", "Q3_COLLECTOR"], 1000)
    q3Gains.push(gainOf(r, "Q3_COLLECTOR") / gainOf(r, "Q3_BASE"))
  }
  const [low, mid, high] = q3Gains
  if (low === undefined || mid === undefined || high === undefined) throw new Error("missing gains")
  expect(low).toBeGreaterThan(mid)
  expect(mid).toBeGreaterThan(high)
  expect(low / high).toBeGreaterThanOrEqual(10)
})

test("DRIVE and TRANSFORMER DRIVE each raise the level into the next stage as they turn up", async () => {
  const drive: number[] = []
  const transformer: number[] = []
  for (const position of [0.1, 0.5, 0.9]) {
    drive.push(gainOf(await readAt({ ...START, drive: position }, ["Q3_BASE"], 1000), "Q3_BASE"))
    transformer.push(gainOf(await readAt({ ...START, transformerDrive: position }, ["BUFFER_BASE"], 1000), "BUFFER_BASE"))
  }
  for (const series of [drive, transformer]) {
    const [a, b, c] = series
    if (a === undefined || b === undefined || c === undefined) throw new Error("missing readings")
    expect(a).toBeLessThan(b)
    expect(b).toBeLessThan(c)
  }
})

test("Q3 and its networks cost less than 0.5 dB at 20 Hz", async () => {
  const ratio = async (hz: number) => {
    const r = await readAt(START, ["COLLECTOR", "OUT"], hz)
    return gainOf(r, "OUT") / gainOf(r, "COLLECTOR")
  }
  expect((await ratio(20)) / (await ratio(1000))).toBeGreaterThan(0.944)
})

test("the chain is non-inverting at 1 kHz", async () => {
  const r = await readAt(START, ["OUT"], 1000)
  const out = r["OUT"]
  if (out === undefined) throw new Error("no output reading")
  expect(Math.abs(out.phase)).toBeLessThan(45)
})

const STAGED_BOARD: BoardUnderTest = {
  network: transistorPreampStaged(), designators: DESIGNATORS, pinNumbers: PIN_NUMBERS,
  notes: schematicNotes(),
}

test("KiCad reads the generated stub as the same circuit", () => {
  expectSameCircuit(kicadRoundTrip(STAGED_BOARD, "staged-board"), STAGED_BOARD)
}, 30_000)
